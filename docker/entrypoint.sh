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

# 2a. Penjaga konsistensi kredensial -------------------------------------
# Service app (DB_*) dan container db (MYSQL_*) membaca SATU file yang sama,
# jadi nilai yang berbeda berarti ada baris yang keliru ketik. Semua ini
# menyebabkan 1044/1045 yang pesannya menyesatkan karena MySQL sudah di-init
# dengan nilai lama (MYSQL_* hanya dibaca saat data dir kosong). Password tidak
# pernah dicetak ke log, hanya panjangnya. MYSQL_* kosong = database eksternal,
# tidak ada yang perlu dicocokkan.
if [ -n "${MYSQL_USER}" ] || [ -n "${MYSQL_DATABASE}" ] || [ -n "${MYSQL_PASSWORD}" ]; then
    if [ "${DB_USERNAME}" != "${MYSQL_USER}" ]; then
        log "PERINGATAN: DB_USERNAME='${DB_USERNAME}' tetapi MYSQL_USER='${MYSQL_USER}'."
        log "Container db membuat user '${MYSQL_USER}'; app login sebagai '${DB_USERNAME}' -> 1045."
    fi
    if [ "${DB_PASSWORD}" != "${MYSQL_PASSWORD}" ]; then
        log "PERINGATAN: DB_PASSWORD dan MYSQL_PASSWORD beda panjang (${#DB_PASSWORD} vs ${#MYSQL_PASSWORD})."
        log "App akan selalu ditolak MySQL kecuali password di file disamakan."
    fi
    if [ "${DB_DATABASE}" != "${MYSQL_DATABASE}" ]; then
        log "PERINGATAN: DB_DATABASE='${DB_DATABASE}' tetapi MYSQL_DATABASE='${MYSQL_DATABASE}'."
        log "Kalau '${DB_DATABASE}' belum pernah dibuat + diberi hak, query pertama app kena 1044."
    fi
fi

if [ "${DB_CONNECTION}" != "sqlite" ] && [ -n "${DB_HOST}" ]; then
    attempt=0
    db_error=''
    # Keluaran PHP sengaja ditangkap (bukan dibuang): pesan aslinya yang
    # membedakan DNS gagal vs connection refused vs Access denied, dan tanpa
    # itu semua orang cuma bisa nebak dari baris "GAGAL".
    until db_error=$(php -r '
        try {
            new PDO(sprintf("mysql:host=%s;port=%s;charset=utf8mb4",
                getenv("DB_HOST"), getenv("DB_PORT") ?: "3306"),
                getenv("DB_USERNAME"), getenv("DB_PASSWORD"));
        } catch (Throwable $e) {
            fwrite(STDERR, $e->getMessage());
            exit(1);
        }
    ' 2>&1); do
        attempt=$((attempt + 1))
        if [ "${attempt}" -ge 40 ]; then
            log "GAGAL: database tidak bisa dihubungi di ${DB_HOST}:${DB_PORT}."
            log "Pesan terakhir dari PDO/MySQL: ${db_error}"
            case "${db_error}" in
                *getaddrinfo*|*Name\ or\ service\ not\ known*)
                    log "Artinya: nama 'db' tidak resolve. Container db belum jalan atau"
                    log "app-nya di-up pakai --no-deps / beda project name."
                    ;;
                *Connection\ refused*)
                    log "Artinya: host ketemu tapi MySQL belum listen (crash / masih init)."
                    ;;
                *Access\ denied*)
                    log "Artinya: kredensial tidak cocok. Kalau volume db-data adalah warisan"
                    log "deploy lama, MYSQL_USER/MYSQL_PASSWORD di .env.docker DIABAIKAN oleh"
                    log "image mysql (hanya jalan saat data dir kosong). Cek docker compose logs db."
                    ;;
                *Unknown\ database*)
                    log "Artinya: database belum pernah dibuat (sama: MYSQL_DATABASE cuma saat init)."
                    ;;
            esac
            exit 1
        fi
        log "Menunggu database ${DB_HOST}:${DB_PORT} ... (${attempt}/40) - ${db_error}"
        sleep 3
    done
    log "Database terhubung."

    # Tahap dua: server hidup belum berarti database-nya boleh dipakai. Kesalahan
    # yang paling mahal adalah MYSQL_DATABASE beda nama dari DB_DATABASE: login
    # sukses, tapi semua query Laravel mati di error 1044 dengan stack trace
    # panjang yang tidak nunjukin akar masalahnya.
    if [ -n "${DB_DATABASE}" ]; then
        sel_error=$(php -r '
            try {
                new PDO(sprintf("mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4",
                    getenv("DB_HOST"), getenv("DB_PORT") ?: "3306", getenv("DB_DATABASE")),
                    getenv("DB_USERNAME"), getenv("DB_PASSWORD"));
            } catch (Throwable $e) {
                fwrite(STDERR, $e->getMessage());
                exit(1);
            }
        ' 2>&1) || {
            log "GAGAL: login berhasil, tapi database '${DB_DATABASE}' tidak bisa dipakai."
            log "Detail PDO: ${sel_error}"
            log "Penyebab paling umum: MYSQL_DATABASE di .env.docker tidak sama dengan"
            log "DB_DATABASE. Image mysql cuma membuat + memberi hak pada MYSQL_DATABASE,"
            log "dan itu pun hanya saat data dir volume masih kosong. Urutan benerin:"
            log "  1. samakan kedua nama di .env.docker"
            log "  2. docker compose down"
            log "  3. docker volume rm <project>_db-data   <-- isi database ikut terhapus"
            log "  4. docker compose up -d"
            exit 1
        }
        log "Database '${DB_DATABASE}' bisa dipakai oleh user '${DB_USERNAME}'."
    fi

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
