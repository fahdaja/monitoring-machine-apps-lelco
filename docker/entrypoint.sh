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
# Mendukung PostgreSQL (pgsql) maupun MySQL (mysql).
DB_CONN="${DB_CONNECTION:-pgsql}"
if [ "${DB_CONN}" = "pgsql" ]; then
    DB_PORT="${DB_PORT:-5432}"
else
    DB_PORT="${DB_PORT:-3306}"
fi

if [ "${DB_CONN}" != "sqlite" ] && [ -z "${DB_HOST}" ]; then
    log "GAGAL: DB_HOST kosong. Copy .env.docker.example menjadi .env.docker,"
    log "isi APP_KEY + kredensial database, lalu jalankan ulang."
    exit 1
fi

# 2a. Penjaga konsistensi kredensial -------------------------------------
if [ "${DB_CONN}" = "pgsql" ]; then
    if [ -n "${POSTGRES_USER}" ] && [ "${DB_USERNAME}" != "${POSTGRES_USER}" ]; then
        log "PERINGATAN: DB_USERNAME='${DB_USERNAME}' tetapi POSTGRES_USER='${POSTGRES_USER}'."
    fi
    if [ -n "${POSTGRES_PASSWORD}" ] && [ "${DB_PASSWORD}" != "${POSTGRES_PASSWORD}" ]; then
        log "PERINGATAN: DB_PASSWORD dan POSTGRES_PASSWORD beda panjang (${#DB_PASSWORD} vs ${#POSTGRES_PASSWORD})."
    fi
    if [ -n "${POSTGRES_DB}" ] && [ "${DB_DATABASE}" != "${POSTGRES_DB}" ]; then
        log "PERINGATAN: DB_DATABASE='${DB_DATABASE}' tetapi POSTGRES_DB='${POSTGRES_DB}'."
    fi
elif [ -n "${MYSQL_USER}" ] || [ -n "${MYSQL_DATABASE}" ] || [ -n "${MYSQL_PASSWORD}" ]; then
    if [ "${DB_USERNAME}" != "${MYSQL_USER}" ]; then
        log "PERINGATAN: DB_USERNAME='${DB_USERNAME}' tetapi MYSQL_USER='${MYSQL_USER}'."
    fi
    if [ "${DB_PASSWORD}" != "${MYSQL_PASSWORD}" ]; then
        log "PERINGATAN: DB_PASSWORD dan MYSQL_PASSWORD beda panjang (${#DB_PASSWORD} vs ${#MYSQL_PASSWORD})."
    fi
    if [ "${DB_DATABASE}" != "${MYSQL_DATABASE}" ]; then
        log "PERINGATAN: DB_DATABASE='${DB_DATABASE}' tetapi MYSQL_DATABASE='${MYSQL_DATABASE}'."
    fi
fi

if [ "${DB_CONN}" != "sqlite" ] && [ -n "${DB_HOST}" ]; then
    attempt=0
    db_error=''
    until db_error=$(php -r '
        $conn = getenv("DB_CONNECTION") ?: "pgsql";
        $host = getenv("DB_HOST");
        $db   = getenv("DB_DATABASE");
        try {
            if ($conn === "pgsql") {
                $port = getenv("DB_PORT") ?: "5432";
                $dsn  = sprintf("pgsql:host=%s;port=%s;dbname=%s", $host, $port, $db ?: "postgres");
            } else {
                $port = getenv("DB_PORT") ?: "3306";
                $dsn  = sprintf("mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4", $host, $port, $db);
            }
            new PDO($dsn, getenv("DB_USERNAME"), getenv("DB_PASSWORD"));
        } catch (Throwable $e) {
            fwrite(STDERR, $e->getMessage());
            exit(1);
        }
    ' 2>&1); do
        attempt=$((attempt + 1))
        if [ "${attempt}" -ge 40 ]; then
            log "GAGAL: database (${DB_CONN}) tidak bisa dihubungi di ${DB_HOST}:${DB_PORT}."
            log "Pesan terakhir dari PDO: ${db_error}"
            exit 1
        fi
        log "Menunggu database ${DB_CONN} ${DB_HOST}:${DB_PORT} ... (${attempt}/40) - ${db_error}"
        sleep 3
    done
    log "Database ${DB_CONN} '${DB_DATABASE}' terhubung dan siap dipakai."

    # 3. Migrasi ---------------------------------------------------------
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

# 4b. Sertifikat SSL lokal untuk HTTPS (port 443) -----------------------
# Kalau user belum menaruh sertifikat sendiri (misal dari mkcert) di
# ./docker/certs/server.crt & server.key, buat self-signed cert otomatis
# dengan SAN sesuai IP/host dari APP_URL agar HTTPS langsung jalan.
CERT_DIR="/etc/nginx/certs"
CERT_FILE="${CERT_DIR}/server.crt"
KEY_FILE="${CERT_DIR}/server.key"
mkdir -p "${CERT_DIR}"

if [ ! -f "${CERT_FILE}" ] || [ ! -f "${KEY_FILE}" ]; then
    SAN="DNS:localhost,IP:127.0.0.1"
    APP_HOST=$(php -r '$h = parse_url(getenv("APP_URL") ?: "", PHP_URL_HOST); if ($h) echo $h;' 2>/dev/null || true)
    if [ -n "${APP_HOST}" ] && [ "${APP_HOST}" != "localhost" ] && [ "${APP_HOST}" != "127.0.0.1" ]; then
        case "${APP_HOST}" in
            *[!0-9.]*) SAN="${SAN},DNS:${APP_HOST}" ;;
            *)         SAN="${SAN},IP:${APP_HOST}" ;;
        esac
    fi
    if [ -n "${SSL_EXTRA_IP}" ]; then
        SAN="${SAN},IP:${SSL_EXTRA_IP}"
    fi

    log "Membuat sertifikat SSL lokal (SAN: ${SAN})..."
    openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
        -keyout "${KEY_FILE}" \
        -out "${CERT_FILE}" \
        -subj "/CN=${APP_HOST:-localhost}" \
        -addext "subjectAltName=${SAN}" >/dev/null 2>&1
    chmod 600 "${KEY_FILE}"
    chmod 644 "${CERT_FILE}"
    log "Sertifikat SSL tersimpan di ${CERT_DIR} (mount ./docker/certs agar persisten)."
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
