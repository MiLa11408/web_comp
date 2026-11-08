#!/usr/bin/env bash
# 机忆书库 · 修复 /ai/ 的 CSP 拦截内联事件
# 容器 nginx 默认 script-src 'self'，书库页面大量使用 onclick，登录按钮会完全无反应。
# 用法：在服务器上 sudo bash deploy/apply-ai-csp.sh
set -euo pipefail
C="${C:-dachuang-frontend-1}"
BAK="/opt/machine-memory/deploy/nginx-default.conf.bak"

sudo docker cp "$C:/etc/nginx/conf.d/default.conf" "$BAK"
sudo docker exec "$C" sed -i "s/script-src 'self' 'wasm-unsafe-eval'/script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'/" /etc/nginx/conf.d/default.conf
sudo docker exec "$C" nginx -t
sudo docker exec "$C" nginx -s reload
echo "已放行 /ai/ 的内联脚本；原配置备份在 $BAK"
sudo docker exec "$C" grep -n "wasm-unsafe-eval" /etc/nginx/conf.d/default.conf | tail -1
