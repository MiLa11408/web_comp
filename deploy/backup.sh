#!/usr/bin/env bash
# 机忆书库 · 每日备份（数据库 + 内容）
# 安装：sudo cp deploy/backup.sh /opt/machine-memory/deploy/ && sudo chmod +x /opt/machine-memory/deploy/backup.sh
# 手动：APP_DIR=/opt/machine-memory /opt/machine-memory/deploy/backup.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/machine-memory}"
OUT_DIR="${OUT_DIR:-/opt/mm-backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
TS="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUT_DIR"
cd "$APP_DIR"

# SQLite 在 WAL 模式下不能直接拷贝，用 VACUUM INTO 生成一致性快照
node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('.data/app.db');db.exec(\"VACUUM INTO '$OUT_DIR/app-$TS.db'\");db.close();"

tar -czf "$OUT_DIR/content-$TS.tar.gz" content
tar -czf "$OUT_DIR/backup-$TS.tar.gz" -C "$OUT_DIR" "app-$TS.db" "content-$TS.tar.gz"
rm -f "$OUT_DIR/app-$TS.db" "$OUT_DIR/content-$TS.tar.gz"

# 只保留最近 KEEP_DAYS 天
find "$OUT_DIR" -name 'backup-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

echo "backup ok: $OUT_DIR/backup-$TS.tar.gz ($(du -h "$OUT_DIR/backup-$TS.tar.gz" | cut -f1))"
