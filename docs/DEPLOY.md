# 部署说明 · 机忆书库（/ai/ 子路径，端口 3300）

本文对应服务器环境：**Ubuntu 22.04 / 24.04（或同类 Linux）+ nginx + systemd**。目标是把整站挂在 `<站点>/ai/`（HTTP 与 HTTPS 均可用），后端只监听 `127.0.0.1:3300`，由 nginx 反代。线上直接用 `http://150.158.1.111/ai/` 访问；`https://150.158.1.111/ai/` 同样可用，但证书为自签，浏览器会提示不安全。

> 前端所有请求已改为相对路径（`api/...`、`vendor/...`），因此 `/ai/` 子路径不需要改后端任何路由。`proxy_pass` 末尾的 `/` 是关键。

---

## 0. 服务器准备

```bash
# Node.js ≥ 22.5（node:sqlite 是内置模块）
node -v
# 若低于 22.5，用 nvm 安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 22
nvm alias default 22

# 依赖
apt-get update && apt-get install -y nginx rsync curl
```

## 1. 上传代码

代码仓库：`git@github.com:MiLa11408/web_comp.git`，项目在仓库的 `Explore/ai-library/` 下。

**方式 A：服务器 git clone（推荐）**

```bash
mkdir -p /opt/machine-memory
cd /opt
git clone git@github.com:MiLa11408/web_comp.git
ln -sfn /opt/web_comp/Explore/ai-library /opt/machine-memory   # 或直接把目录内容放到 /opt/machine-memory
```

**方式 B：本地 rsync（Windows 用 Git Bash）**

```bash
cd <本地仓库>/Explore/ai-library
chmod +x deploy/deploy.sh
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .data --exclude '*.log' \
  -e "ssh -i /e/下载download/1.pem" ./ root@<服务器IP>:/opt/machine-memory/
```

> 若 `rsync` 不可用：`scp -i <私钥> -r ./ root@<IP>:/opt/machine-memory/`（先手动排除 node_modules）。

## 2. 安装依赖

```bash
cd /opt/machine-memory
npm ci --omit=dev          # 运行时依赖：fastify / yaml（three、rapier 已本地 vendor）
mkdir -p .data
chown -R www-data:www-data .data
```

## 3. systemd

```bash
sudo cp deploy/machine-memory.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now machine-memory
sudo systemctl status machine-memory --no-pager
curl -fsS http://127.0.0.1:3300/api/health
```

看到 `{"ok":true,"chapters":...}` 即后端就绪。

日志：`journalctl -u machine-memory -f --no-pager`。

## 4. nginx 子路径 /ai/

把 `deploy/nginx-ai.conf` 的内容粘进站点 `server { ... }` 内（宝塔：网站 → 设置 → 配置文件），然后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

访问 `http://<域名或IP>/ai/`（无需面对自签证书警告）；`https://<域名或IP>/ai/` 也可用，但证书为自签。nginx 已配置 `/ai` → `/ai/` 的 301，避免相对路径解析错位。

### 4.1 当前线上拓扑（80 端口由 Docker 前端容器占用）

线上 `80` 不是宿主机 nginx，而是 Docker 容器 `dachuang-frontend`（另一个 Vue 项目，监听容器内 80）。宿主机 nginx 只监听 `443` 和 `8080`，因此 `http://…/ai/` 必须同时在两处反代：

```text
浏览器 → 容器 nginx(80) → 宿主机 nginx(8080) → 127.0.0.1:3300
```

宿主机 `/etc/nginx/sites-available/study-checkin` 的 `server` 块（443 + 8080）已 `include /etc/nginx/snippets/machine-memory.conf`，其中 `/ai/` 反代到 `3300`。容器内的 `127.0.0.1` 指容器自身，且 `3300` 只监听宿主机 `127.0.0.1`，所以容器里要用 Docker 网关访问宿主机 8080（网段/网关用 `docker network inspect dachuang_default` 确认，默认 `172.18.0.1`）。在容器 `/etc/nginx/conf.d/default.conf` 的 `location /` 之前加：

```nginx
location = /ai {
    return 301 /ai/;
}

location /ai/ {
    proxy_pass http://172.18.0.1:8080/ai/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;
    client_max_body_size 2m;
    # location 内出现 add_header 会取消 server 级响应头继承，故整套重写；
    # 书库 Rapier 需要 WebAssembly，CSP 必须放行 wasm。
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
}
```

应用与回滚：

```bash
# 应用（容器配置没有 bind mount，docker compose 重建后会丢失，需重贴）
sudo docker cp default.conf dachuang-frontend-1:/etc/nginx/conf.d/default.conf
sudo docker exec dachuang-frontend-1 nginx -t
sudo docker exec dachuang-frontend-1 nginx -s reload

# 回滚（备份在容器内与宿主机各一份）
sudo docker cp dachuang-frontend-1:/etc/nginx/conf.d/default.conf.bak-2026-11-07 /tmp/default.conf
sudo docker cp /tmp/default.conf dachuang-frontend-1:/etc/nginx/conf.d/default.conf
sudo docker exec dachuang-frontend-1 nginx -s reload
```

## 5. 验证清单

```bash
# 后端
curl -fsS http://127.0.0.1:3300/api/health
# 子路径（应返回书库 index.html，标题含「机忆书库」）
curl -fsS http://<域名或IP>/ai/ | grep -o '<title>[^<]*</title>'
# 子路径 API（应返回 {"ok":true,"chapters":384}）
curl -fsS http://<域名或IP>/ai/api/health
# 根路径不受影响（仍是原前端项目）
curl -fsS http://<域名或IP>/ | grep -o '<title>[^<]*</title>'
# gzip 生效检查：应出现 Content-Encoding: gzip
curl -sI -H 'Accept-Encoding: gzip' http://<域名或IP>/ai/app3d.js
curl -sI -H 'Accept-Encoding: gzip' http://<域名或IP>/ai/vendor/rapier.mjs
curl -sI -H 'Accept-Encoding: gzip' http://<域名或IP>/ai/api/books
```

HTTPS 仍可用：`curl -k https://<域名或IP>/ai/api/health`（自签证书，浏览器访问会提示不安全）。

浏览器验收：

1. 打开 `/ai/`，出现「入馆登记」门厅；访客可入馆，也可注册借书证。
2. 入馆后是 3D 阅览室；WASD 移动、鼠标拖动转视角、E 取书。
3. 电梯切层、2D 书架视图与 3D 楼层同步。
4. 「书轨」视图出现 5 条主线 + 7 条支线，站点可点开书，可点「发车」重放动画。
5. 检索、阅读三栏、右侧页边注锚点、右下角合书键正常。

## 6. 更新发布

```bash
# 服务器 git 方式
cd /opt/web_comp && git pull
sudo systemctl restart machine-memory

# 或本地一键（需 SERVER_HOST）
SERVER_HOST=root@<IP> SSH_KEY=/e/下载download/1.pem ./deploy/deploy.sh
```

`deploy.sh` 使用 `rsync --delete`，会保留远端 `.data/`（SQLite 用户数据）。

## 7. 备份与恢复

只需备份 `.data/app.db`（WAL 模式下同时备份 `app.db-wal`、`app.db-shm`）：

```bash
sudo systemctl stop machine-memory
sudo tar czf /root/machine-memory-$(date +%F).tgz -C /opt/machine-memory .data
sudo systemctl start machine-memory
```

内容（`content/`）随 git 版本管理，不入备份。

## 8. 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `/ai/api/...` 404 | `proxy_pass` 末尾少了 `/` | 改为 `http://127.0.0.1:3300/` |
| `http://…/ai/` 返回另一个 Vue 项目页面 | 80 端口的容器 nginx 未配置 `/ai/`，命中 SPA fallback | 按 4.1 在容器 `conf.d/default.conf` 加 `location /ai/` 后 reload |
| 页面能开但白屏 | 浏览器拿到 404 的 JS | 检查 `/ai/app3d.js`、`/ai/vendor/three.module.js` 是否 200 |
| `node:sqlite` 报错 | Node < 22.5 | `nvm install 22` 后重启服务 |
| 服务反复重启 | `.data` 无写权限 | `chown -R www-data:www-data /opt/machine-memory/.data` |
| 注册 429 | 触发限流 | 等 30 秒；生产可在 `server/src/auth.js` 调整阈值 |
| 端口被占 | 旧进程未退 | `ss -lntp \| grep 3300` 后 kill 对应 PID |

## 9. 安全与合规

- 生产环境用 systemd 里的 `HOST=127.0.0.1`，只让 nginx 访问 3300；同时用防火墙挡住 3300。
- 站点用 HTTPS；借书证口令在服务端哈希存储，Cookie 为 HttpOnly + SameSite=Lax。
- 注册/登录已有 IP 级限流（`server/src/auth.js`）。
- 内容里的外部来源链接均为论文/官方页面，站点本身不再二次分发素材。
