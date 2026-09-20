"""统一的环境配置入口。

地址、端口、CORS 来源不再散落在代码中,统一由环境变量提供:
1. 进程已存在的环境变量优先级最高(CI / docker 注入);
2. 其次读取 backend/.env(本地开发,从 .env.example 复制);
3. 最后使用下列默认值。
"""
import os
from pathlib import Path
from typing import List

ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def _load_dotenv() -> None:
    """极简 .env 解析:KEY=VALUE,忽略注释与空行,不覆盖已有环境变量。

    不引入 python-dotenv,保证仅靠 requirements.txt 中的依赖即可运行。
    """
    if not ENV_FILE.exists():
        return
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_load_dotenv()


def _env(key: str, default: str) -> str:
    return os.environ.get(key, default).strip() or default


class Settings:
    def __init__(self) -> None:
        self.host: str = _env("BACKEND_HOST", "127.0.0.1")
        self.port: int = int(_env("BACKEND_PORT", "8000"))
        self.cors_origins: List[str] = [
            o.strip() for o in _env("BACKEND_CORS_ORIGINS", "").split(",") if o.strip()
        ]


settings = Settings()
