# 部署说明 · 机忆书库（/ai/ 子路径，端口 3300）

本文对应服务器环境：**Ubuntu 22.04 / 24.04（或同类 Linux）+ nginx + systemd**。目标是把整站挂在 `https://<域名>/ai/`，后端只监听 `127.0.0.1:3300`，由 nginx 反代。

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

访问 `https://<域名>/ai/`。nginx 已配置 `/ai` → `/ai/` 的 301，避免相对路径解析错位。

## 5. 验证清单

```bash
# 后端
curl -fsS http://127.0.0.1:3300/api/health
# 子路径（应返回 index.html）
curl -fsS https://<域名>/ai/ | head -c 200
# 子路径 API
curl -fsS https://<域名>/ai/api/rail | head -c 200
```

浏览器验收：

1. 打开 `/ai/`，出现「入馆登记」门厅；访客可入馆，也可注册借书证。
2. 入馆后是 3D 阅览室；WASD 移动、鼠标拖动转视角、E 取书。
3. 电梯切层、2D 书架视图与 3D 楼层同步。
4. 「铁路线」视图出现 5 条主线 + 6 条支线，站点可点开书。
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
