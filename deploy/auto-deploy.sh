#!/usr/bin/env bash
# Auto-deploy pull-based untuk server Ubuntu (lihat catatan di bawah kenapa
# bukan GitHub Actions/webhook: server ini di LAN, runner GitHub tidak bisa
# SSH masuk, dan webhook GitHub juga tidak bisa menjangkau 192.168.x.x).
#
# Dipasang di crontab root server, berjalan tiap menit:
#   * * * * * flock -n /run/lelco-deploy.lock /bin/bash \
#       /home/faiz/monitoring-machine-apps-lelco/deploy/auto-deploy.sh \
#       >> /var/log/lelco-deploy.log 2>&1
#
# Alur: fetch origin/main -> kalau HEAD lokal beda -> git pull --ff-only ->
# docker compose up -d --build app. Hanya service app; db tidak disentuh,
# volume tidak disentuh. Migrasi & config:cache dijalankan entrypoint
# container saat start, jadi tidak perlu langkah tambahan di sini.
#
# Catatan perilaku yang disengaja:
# - --ff-only: kalau riwayat divergen, deploy GAGAL keras di log, bukan
#   merge diam-diam yang menyimpangkan server dari main.
# - .env.docker TIDAK ikut git (di .gitignore). Mengubah env di server tetap
#   butuh: docker compose up -d --force-recreate app.
# - Build gagal -> container lama tetap jalan (compose baru mengganti image
#   setelah build sukses), jadi push rusak tidak mematikan app yang hidup.
# - Rollback = git revert <sha> di laptop lalu push; poller akan menariknya.
set -euo pipefail

REPO=/home/faiz/monitoring-machine-apps-lelco
cd "$REPO"

git fetch origin main --quiet || { echo "[$(date '+%F %T')] fetch gagal (cek kredensial git server)"; exit 0; }

local_head=$(git rev-parse HEAD)
remote_head=$(git rev-parse origin/main)
if [ "$local_head" = "$remote_head" ]; then
    exit 0
fi

echo "[$(date '+%F %T')] deploy: $local_head -> $remote_head"
git pull --ff-only origin main
docker compose up -d --build app
docker image prune -f >/dev/null
echo "[$(date '+%F %T')] selesai: $(git rev-parse --short HEAD)"
