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

## 环境要求
- Python 3.9+
- Node.js 18+ 与 npm

## 配置说明
前后端地址、端口统一由环境变量提供，不写死在代码里。两端约定一致：
复制各自的 `.env.example` 为 `.env` 即可本地覆盖，`.env` 已被 git 忽略。

- 后端 `backend/.env`：`BACKEND_HOST`（默认 127.0.0.1）、`BACKEND_PORT`（默认 8000）、`CORS_ORIGINS`（默认 *）
- 前端 `frontend/.env`：`VITE_DEV_PORT`（默认 3000）、`VITE_BACKEND_URL`（默认 http://127.0.0.1:8000，Vite 代理目标）、`VITE_API_BASE_URL` / `VITE_WS_URL`（默认留空走代理，后端不在本机时填直连地址）

前端开发服务器把 `/api`（回测接口）与 `/ws`（行情推送）代理到 `VITE_BACKEND_URL`，因此本地联调只需保证两端端口互相对应。

## 本地开发（从干净环境启动）

### 1. 启动后端（行情推送 + 回测接口）
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # 按需修改端口等配置
python run.py
```
启动前会自动检查：缺依赖时提示执行 `pip install -r requirements.txt`；端口被占用时明确报错退出。
启动成功后服务监听 `http://127.0.0.1:8000`（WebSocket 行情 `/ws`，回测接口 `POST /api/backtest`）。

### 2. 启动前端（开发模式）
新开一个终端：
```bash
cd frontend
npm install
cp .env.example .env             # 按需修改端口、后端地址
npm run dev
```
启动前会自动检查依赖是否安装（`predev` 钩子），缺失时提示执行 `npm install`；`VITE_DEV_PORT` 被占用时直接报错而不是静默换端口。
浏览器访问 `http://localhost:3000`，左上角状态灯变绿即行情推送已连通；右侧配置网格参数后点击"运行回测"即可看到回测报告。

### 3. 打包前端（生产构建）
```bash
cd frontend
npm install                      # 如已安装可跳过
npm run build
```
产物输出到 `frontend/dist/`。本地预览构建产物：`npm run preview`。

## 联调验证（可选）
后端启动后可用命令行快速验证两条链路：
```bash
# 回测接口
curl -X POST http://127.0.0.1:8000/api/backtest \
  -H 'Content-Type: application/json' \
  -d '{"lowerPrice":95,"upperPrice":115,"gridCount":20,"capitalPerGrid":1000,"initialCapital":100000}'
# 行情推送（websockets 库已包含在后端依赖中）
python - <<'EOF'
import asyncio, websockets
async def main():
    async with websockets.connect('ws://127.0.0.1:8000/ws') as ws:
        print((await ws.recv())[:200])
asyncio.run(main())
EOF
```

## 常见问题
- **后端提示"缺少依赖"**：确认已激活虚拟环境并执行 `pip install -r requirements.txt`。
- **后端提示"端口 8000 已被占用"**：释放该端口，或在 `backend/.env` 中修改 `BACKEND_PORT`，同时把 `frontend/.env` 的 `VITE_BACKEND_URL` 改成同一端口。
- **前端提示"未找到 node_modules / 缺少依赖"**：在 `frontend` 目录执行 `npm install`。
- **前端提示端口 3000 被占用**：释放该端口，或修改 `frontend/.env` 的 `VITE_DEV_PORT`。
- **页面状态灯红色（已断开）**：确认后端已启动，且 `VITE_BACKEND_URL`（或直连用的 `VITE_WS_URL`）指向后端实际地址。
