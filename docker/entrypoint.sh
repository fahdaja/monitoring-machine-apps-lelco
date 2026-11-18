#!/bin/sh
# Entry point container app. Dijalankan sekali tiap container start, lalu
# menyerahkan proses ke supervisord (php-fpm + nginx + schedule:work).
#
# POSIX sh, bukan bash: image Debian punya /bin/sh = dash dan bash tidak
# dipasang. Dockerfile juga membuang CR (\r) dari file ini supaya tetap jalan
# walau di-commit dari Windows.
set -e

cd /var/www/html

log() {
    printf '[entrypoint] %s\n' "$*"
}

# 1. APP_KEY ------------------------------------------------------------
# Tanpa key, encrypt cookie / session payload langsung gagal. Image sengaja
# tidak membawa .env (ada di .dockerignore), jadi key harus dari environment.
# Kalau kosong, dibuat sementara dan dicetak supaya lu bisa simpan ke
# .env.docker — kalau tidak, semua session/user login hangus tiap restart
# karena tiap container dapat key berbeda.
if [ -z "${APP_KEY}" ]; then
    APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    export APP_KEY
    log "PERINGATAN: APP_KEY kosong, key sementara dibuat."
    log "Simpan key ini di .env.docker supaya stabil: APP_KEY=${APP_KEY}"
fi

# 2. Tunggu database ----------------------------------------------------
# compose sudah pakai depends_on + healthcheck; loop ini tetap dipasang untuk
# skenario DB di luar container (DB_HOST=host.docker.internal / MySQL kantor).
DB_PORT="${DB_PORT:-3306}"

if [ "${DB_CONNECTION}" != "sqlite" ] && [ -z "${DB_HOST}" ]; then
    log "GAGAL: DB_HOST kosong. Copy .env.docker.example menjadi .env.docker,"
    log "isi APP_KEY + kredensial MySQL, lalu jalankan ulang."
    exit 1
fi

if [ "${DB_CONNECTION}" != "sqlite" ] && [ -n "${DB_HOST}" ]; then
    attempt=0
    until php -r '
        try {
            new PDO(sprintf("mysql:host=%s;port=%s;charset=utf8mb4",
                getenv("DB_HOST"), getenv("DB_PORT") ?: "3306"),
                getenv("DB_USERNAME"), getenv("DB_PASSWORD"));
        } catch (Throwable $e) {
            exit(1);
        }
    ' >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ "${attempt}" -ge 40 ]; then
            log "GAGAL: database tidak bisa dihubungi di ${DB_HOST}:${DB_PORT}."
            log "Cek DB_HOST/DB_USERNAME/DB_PASSWORD di .env.docker, dan pastikan MySQL jalan."
            exit 1
        fi
        log "Menunggu database ${DB_HOST}:${DB_PORT} ... (${attempt}/40)"
        sleep 3
    done
    log "Database terhubung."

    # 3. Migrasi ---------------------------------------------------------
    # --force wajib: tanpa ini artisan minta konfirmasi di mode non-interaktif
    # begitu ada migration yang terdengar destruktif.
    log "php artisan migrate --force"
    php artisan migrate --force --no-interaction
fi

# 4. Link disk public ---------------------------------------------------
# Foto bukti & gambar pertanyaan disimpan ke storage/app/public lalu disajikan
# lewat /storage (KanbanController & TaskController pakai Storage::url()).
# Volumedata terpasang di storage/app/public, jadi file lama tidak hilang.
if [ ! -e public/storage ]; then
    log "php artisan storage:link"
    php artisan storage:link --no-interaction || \
        log "storage:link dilewati (public/storage sudah ada atau tidak bisa dibuat)."
fi

# 5. Cache --------------------------------------------------------------
# route:cache SENGAJA tidak dipakai: /dashboard di routes/web.php masih closure
# dan route:cache menolak closure. config:cache cukup, dan selalu di-refresh di
# sini supaya perubahan environment compose langsung terlihat.
if [ "${APP_ENV}" = "production" ]; then
    php artisan config:cache --no-interaction >/dev/null
    php artisan route:clear --no-interaction >/dev/null
    php artisan view:cache --no-interaction >/dev/null
    log "Config & view di-cache (APP_ENV=production)."
else
    php artisan config:clear --no-interaction >/dev/null
    php artisan view:clear --no-interaction >/dev/null
    log "Cache dibersihkan (mode development)."
fi

log "Mulai php-fpm, nginx, dan schedule:work (tasks:generate 00:00, tasks:mark-due 00:01)."
exec "$@"
