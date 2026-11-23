# syntax=docker/dockerfile:1
#
# Image untuk aplikasi Lelco Form (Laravel + Inertia/React + MySQL).
#
#   docker compose up -d --build          # cara pakai utama
#   docker build -t lelco-form .          # build saja
#
# Kenapa strukturnya begini:
#   1. Build asset frontend TIDAK BISA cuma pakai Node. Plugin
#      @laravel/vite-plugin-wayfinder memanggil `php artisan wayfinder:generate`
#      (lihat vite.config.ts), jadi stage assets wajib punya PHP + vendor/.
#   2. laravel-vite-plugin/fonts mengunduh font dari Bunny.net saat build,
#      jadi stage assets butuh akses internet.
#   3. Kode dibake ke image (tidak bind-mount) supaya opcache & permission
#      sederhana. Data yang berubah di runtime cuma MySQL + storage/app/public.

########################  Stage 0: base PHP  ########################
FROM php:8.3-fpm AS php-base

# Lib ICU (ext intl) + libzip (ext zip). curl dipakai untuk HEALTHCHECK.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        unzip \
        libicu-dev \
        libzip-dev \
    && docker-php-ext-install -j"$(nproc)" intl zip pdo_mysql \
    && docker-php-ext-enable opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

########################  Stage 1: assets  ########################
FROM php-base AS assets

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1 \
    npm_config_audit=false \
    npm_config_fund=false

# Node biner dari image node:xxx di-link ke libstdc++6 & libatomic1. Image
# php:8.3-fpm tidak membawanya, jadi tanpa langkah ini `node -v` langsung
# gagal: error while loading shared libraries: libstdc++.so.6.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libstdc++6 libatomic1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Node 22 diambil dari image resmi. Keduanya Debian bookworm/glibc,
# jadi biner-nya aman di-copy silang (Vite 8 butuh Node >= 20.19 / 22.12).
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Layer dependency: lock file dulu, source belakangan, biar cache build kepakai.
# --no-scripts: vendor dipasang tanpa menyentuh artisan, karena source-nya
# belum ada. post-autoload-dump dijalankan di bawah setelah seluruh source masuk.
COPY composer.json composer.lock package.json package-lock.json ./
RUN composer install \
        --no-dev \
        --prefer-dist \
        --no-scripts \
        --no-progress \
        --no-interaction

COPY . .

# .dockerignore menyaring isi storage/ dan bootstrap/cache/, jadi folder yang
# cuma berisi .gitignore bisa tidak ikut ter-copy. composer dump-autoload di
# bawah menjalankan package:discover yang nulis bootstrap/cache/packages.php.
RUN mkdir -p \
        bootstrap/cache \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs

# .env dibuat DULU: composer dump-autoload memicu package:discover dan
# wayfinder:generate juga memanggil artisan, jadi aplikasi harus bisa boot.
# npm run build => vp build, dan di dalamnya wayfinder:generate dipanggil.
RUN cp .env.example .env \
    && composer dump-autoload --optimize --no-dev --no-interaction \
    && npm ci \
    && npm run build

# Buang semua yang cuma dibutuhkan saat build, jangan ikut ke image final.
# public/hot harus hilang: kalau ketinggalan, Laravel menganggap Vite dev
# server aktif dan browser minta asset ke localhost:5173 (halaman jadi putih).
RUN rm -rf node_modules .env public/hot

########################  Stage 2: runtime  ########################
FROM php-base AS app

RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /etc/nginx/certs

COPY docker/app.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/php-fpm-pool.conf /usr/local/etc/php-fpm.d/zz-app.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf

WORKDIR /var/www/html

# Source + vendor + public/build hasil stage assets.
COPY --from=assets /var/www/html ./
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Baris sed pertama membuang CR leftover kalau file di-commit dengan CRLF
# (Windows). Tanpa itu: /usr/bin/env: 'sh\r': No such file or directory.
# Folder storage dibuat ulang di sini supaya image tidak bergantung pada ada
# atau tidaknya folder itu di build context; entrypoint yang mengurus
# storage:link saat container start.
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p \
        storage/app/public \
        storage/app/private \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/framework/testing \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache public \
    && chmod -R 0775 storage bootstrap/cache

EXPOSE 80 443

# /up adalah health route bawaan (bootstrap/app.php -> health: '/up').
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://127.0.0.1/up || exit 1

ENV APP_ENV=production \
    TZ=Asia/Jakarta

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# File config di docker/supervisord.conf sudah menyetel nodaemon=true; ia
# MENIMPA config bawaan Debian karena versi aslinya tidak foreground dan akan
# membuat PID 1 keluar begitu supervisor daemonize.
CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
