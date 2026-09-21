"""集中管理后端运行配置：地址、端口、跨域。

优先级：环境变量 > backend/.env > 默认值。
复制 .env.example 为 .env 即可本地覆盖，无需改代码。
"""
import os

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:  # python-dotenv 未安装时退化为只读环境变量
    pass

HOST = os.environ.get("BACKEND_HOST", "127.0.0.1")
PORT = int(os.environ.get("BACKEND_PORT", "8000"))
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]
