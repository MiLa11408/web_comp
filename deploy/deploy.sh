#!/usr/bin/env bash
# 机忆书库 · 一键部署（在本地 Git Bash / WSL / Linux 上运行）
#
#   SERVER_HOST=ubuntu@1.2.3.4 SSH_KEY=~/.ssh/1.pem ./deploy/deploy.sh
#
# 可选环境变量：
#   SERVER_HOST  必填，服务器地址，例如 ubuntu@1.2.3.4（本服务器 root SSH 未开放）
#   SSH_KEY      私钥路径，默认 ~/.ssh/1.pem（Windows 可用 E:/下载download/1.pem）
#   REMOTE_DIR   远端项目目录，默认 /opt/machine-memory
#   SERVICE      systemd 服务名，默认 machine-memory
#   SKIP_INSTALL 设为 1 可跳过 npm ci
set -euo pipefail

SERVER_HOST="${SERVER_HOST:?请设置 SERVER_HOST，例如 SERVER_HOST=ubuntu@1.2.3.4 ./deploy/deploy.sh}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/1.pem}"
REMOTE_DIR="${REMOTE_DIR:-/opt/machine-memory}"
SERVICE="${SERVICE:-machine-memory}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new"

echo "→ 同步项目到 $SERVER_HOST:$REMOTE_DIR"
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .data \
  --exclude '*.log' --exclude '.scratch' \
  -e "$SSH" "$ROOT/" "$SERVER_HOST:$REMOTE_DIR/"

echo "→ 远端安装依赖并重启服务"
$SSH "$SERVER_HOST" "set -e
  cd '$REMOTE_DIR'
  mkdir -p .data
  if [ '${SKIP_INSTALL:-0}' != '1' ]; then npm ci --omit=dev; fi
  if [ -f /etc/systemd/system/$SERVICE.service ] || [ -f /lib/systemd/system/$SERVICE.service ]; then
    sudo systemctl restart '$SERVICE'
    sudo systemctl --no-pager status '$SERVICE' | head -n 12
  else
    echo '⚠ 未找到 systemd 单元 $SERVICE，请先按 docs/DEPLOY.md 安装 systemd 与 nginx 配置'
  fi
"

echo "→ 线上健康检查"
$SSH "$SERVER_HOST" "curl -fsS http://127.0.0.1:3300/api/health || true"
echo
echo "完成。浏览器访问：http(s)://<你的域名>/ai/"
