"""后端统一启动入口：python run.py

启动前先做两项前置检查，失败时给出明确提示并以非零码退出：
1. 依赖是否安装齐全（fastapi / uvicorn / numpy / websockets）
2. 配置的端口是否已被占用
"""
import importlib
import socket
import sys

REQUIRED_PACKAGES = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn",
    "numpy": "numpy",
    "websockets": "websockets",
    "dotenv": "python-dotenv",
}


def check_dependencies():
    missing = []
    for module, package in REQUIRED_PACKAGES.items():
        try:
            importlib.import_module(module)
        except ImportError:
            missing.append(package)
    if missing:
        print(f"[错误] 缺少依赖: {', '.join(missing)}")
        print("       请先执行: pip install -r requirements.txt")
        sys.exit(1)


def check_port(host, port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            print(f"[错误] 端口 {port} 已被占用，无法启动后端服务。")
            print(f"       请释放该端口，或在 backend/.env 中修改 BACKEND_PORT 后重试。")
            sys.exit(1)


def main():
    check_dependencies()

    import uvicorn
    from app import config

    check_port(config.HOST, config.PORT)
    print(f"[启动] 行情与回测服务: http://{config.HOST}:{config.PORT} (WebSocket: /ws, 回测: /api/backtest)")
    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT)


if __name__ == "__main__":
    main()
