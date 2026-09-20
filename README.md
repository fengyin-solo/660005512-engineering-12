# 实时订单簿深度可视化与量化网格交易引擎

基于Vue 3 + FastAPI的量化交易工具，WebSocket行情推送、Canvas订单簿深度热力图、网格策略回测引擎。

## 目标用户
量化交易爱好者、金融工程学生、日交易员

## 技术栈
- 前端: Vue 3 + TypeScript + Vite + Pinia + Element Plus + ECharts
- 后端: Python FastAPI + NumPy + SQLite + WebSocket

## 核心功能
1. WebSocket实时行情推送：模拟股票tick级别数据流(买一/卖一/成交量/时间)
2. Canvas订单簿深度热力图：买卖盘口10档深度可视化，红绿双向柱状图
3. ECharts K线图+网格上下轨+持仓标记叠加渲染
4. 网格交易策略引擎：价格区间/网格数量/每格资金参数配置
5. 策略回测：逐笔模拟 + 持仓收益计算 + 夏普比率/最大回撤/胜率统计
6. 回测报告：收益率曲线、逐格成交记录、绩效指标汇总

## 本地开发联调流程（可重复执行）

行情通道与回测接口的地址、端口、代理口径统一由环境配置提供，代码与 Vite 配置中不再写死。前端与后端的环境变量写法保持一致：均通过 `.env.example` 提供模板、`.env` 提供本地实际值（`.env` 已被 git 忽略，不会误提交）。

| 配置项（后端 `backend/.env`） | 默认值 | 对应前端项（`frontend/.env`） |
| --- | --- | --- |
| `BACKEND_HOST` / `BACKEND_PORT` | `127.0.0.1` / `8000` | `VITE_BACKEND_HOST` / `VITE_BACKEND_PORT` |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | `VITE_DEV_PORT=3000` |
| —（浏览器侧默认走 Vite 代理） | — | `VITE_API_BASE_URL` / `VITE_WS_BASE_URL`（默认留空） |

前置要求：Python 3.9+、Node.js 18+。

### 1. 准备配置（两侧都要做，只需一次）

```bash
# 后端
cd backend
cp .env.example .env        # Windows: copy .env.example .env

# 前端
cd ../frontend
cp .env.example .env
```

默认口径：后端监听 `127.0.0.1:8000`（HTTP 回测 `/api/backtest`、健康检查 `/health`、行情 `ws://.../ws`），前端 dev server 监听 `3000` 并把 `/api`、`/ws`、`/health` 代理到后端。修改任一侧端口时，另一侧配置必须同步。需要浏览器直连远端后端时，在前端 `.env` 中填写 `VITE_API_BASE_URL` / `VITE_WS_BASE_URL` 即可，留空则始终走同源代理。

### 2. 安装依赖（可重复执行）

```bash
# 后端：创建 .venv 并安装 requirements.txt；已存在时可安全重跑
cd backend
python dev.py setup
```

脚本会自动处理：损坏的旧 `.venv` 会被删除重建；Debian/Ubuntu 最小镜像缺少 `ensurepip` 时，会以 `--without-pip` 建 venv 并在线引导 pip。依赖安装后会自检 `fastapi / uvicorn / numpy`，缺任一项直接报错退出。

```bash
# 前端
cd ../frontend
npm install
```

### 3. 启动联调（两个终端）

```bash
# 终端 A：后端
cd backend
python dev.py start
# 输出监听地址；端口被占用时会明确提示排查命令，不会静默失败

# 终端 B：前端
cd frontend
npm run dev
# predev 预检：Node 版本、node_modules、3000 端口、后端 /health 联通性
```

打开 http://localhost:3000 ：右上角状态点变绿即行情通道已连通（断线每 2 秒自动重连），点击「运行回测」即可得到回测报告。后端未启动时，前端仍能打开页面，但预检会给出明确警告；回测失败会弹出错误提示而不是静默无响应。

### 4. 打包

```bash
cd frontend
npm run build     # 类型检查 + 产物输出到 dist/
npm run preview   # 本地预览构建产物
```

### 5. 干净环境自检清单

1. `curl http://127.0.0.1:8000/health` 返回 `{"status":"ok",...}`；
2. WebSocket 连上 `ws://127.0.0.1:8000/ws` 后持续收到 ticks / orderBook 推送；
3. `curl -X POST http://127.0.0.1:8000/api/backtest -H 'Content-Type: application/json' -d '{"lowerPrice":95,"upperPrice":115,"gridCount":20,"capitalPerGrid":1000,"initialCapital":100000}'` 返回完整回测指标；
4. 通过 http://localhost:3000 页面验证：行情曲线/盘口实时刷新，回测报告正常渲染（即 Vite 代理链路也跑通）。

### 常见问题
- **端口被占用**：按启动脚本的提示用 `lsof -i :8000` / `ss -lntp`（Windows：`netstat -ano | findstr :8000`）定位并释放，或改 `.env` 中的端口（两侧同步修改）。
- **`ensurepip is not available`**：`sudo apt install python3-venv` 后重跑 `python dev.py setup`（脚本也会尝试自动引导）。
- **页面打开但无行情**：确认后端终端在运行、`backend/.env` 与 `frontend/.env` 的端口一致，并查看浏览器控制台与预检警告。

