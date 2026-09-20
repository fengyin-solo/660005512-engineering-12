#!/usr/bin/env python3
"""后端本地开发引导脚本(跨平台,Linux/macOS/Windows 通用)。

用法:
    python dev.py setup    创建 .venv 并安装 requirements.txt(可重复执行)
    python dev.py start    预检依赖与端口后启动 uvicorn
    python dev.py          等价于 start

设计目标:依赖缺失、venv 损坏、端口被占用时给出明确的中文提示,而不是静默失败。
"""
import os
import socket
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV = ROOT / ".venv"
ENV_EXAMPLE = ROOT / ".env.example"
ENV_FILE = ROOT / ".env"
REQUIREMENTS = ROOT / "requirements.txt"
GET_PIP_URL = "https://bootstrap.pypa.io/get-pip.py"

IS_WINDOWS = os.name == "nt"
PY = VENV / ("Scripts/python.exe" if IS_WINDOWS else "bin/python")
PIP_CMD = [str(PY), "-m", "pip"]


def info(msg: str) -> None: print(f"[信息] {msg}")
def ok(msg: str) -> None: print(f"[成功] {msg}")
def warn(msg: str) -> None: print(f"[警告] {msg}")
def fail(msg: str) -> None:
    print(f"\n[错误] {msg}", file=sys.stderr)
    sys.exit(1)


def run(cmd, **kw):
    print("  $ " + " ".join(str(c) for c in cmd))
    return subprocess.run([str(c) for c in cmd], **kw)


def load_env_file():
    env = {}
    if ENV_FILE.exists():
        for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def get_config():
    env = {**load_env_file(), **{k: v for k, v in os.environ.items()
                                 if k in ("BACKEND_HOST", "BACKEND_PORT")}}
    host = env.get("BACKEND_HOST", "127.0.0.1")
    try:
        port = int(env.get("BACKEND_PORT", "8000"))
    except ValueError:
        fail(f"BACKEND_PORT 不是合法端口: {env.get('BACKEND_PORT')}")
    return host, port


def venv_python_works() -> bool:
    if not PY.exists():
        return False
    r = subprocess.run([str(PY), "-c", "import sys; print(sys.version)"],
                       capture_output=True)
    return r.returncode == 0


def bootstrap_venv():
    if not VENV.exists():
        info(f"创建虚拟环境: {VENV}")
        VENV.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run([sys.executable, "-m", "venv", str(VENV)])
        if r.returncode != 0 or not PY.exists():
            # Debian/Ubuntu 最小镜像没有 ensurepip:先建一个无 pip 的 venv,再引导
            warn("标准方式创建 venv 失败(通常是缺少 ensurepip / python3-venv)")
            info("改用 --without-pip 创建,随后引导安装 pip …")
            r = subprocess.run([sys.executable, "-m", "venv", "--without-pip", str(VENV)])
            if r.returncode != 0 or not PY.exists():
                fail("创建虚拟环境失败。请先安装系统包后重试:\n"
                     "        Debian/Ubuntu: sudo apt install python3-venv\n"
                     "        Fedora:        sudo dnf install python3-virtualenv")
            bootstrap_pip()
    elif not venv_python_works():
        warn("发现已损坏的 .venv(python 解释器不存在或无法运行),将删除后重建。")
        import shutil
        shutil.rmtree(VENV)
        return bootstrap_venv()
    elif not module_available("pip"):
        info("venv 中缺少 pip,尝试引导安装 …")
        bootstrap_pip()


def bootstrap_pip():
    get_pip = ROOT / ".get-pip.py"
    try:
        info(f"下载 get-pip.py: {GET_PIP_URL}")
        urllib.request.urlretrieve(GET_PIP_URL, get_pip)
    except Exception as e:
        fail(f"下载 get-pip.py 失败: {e}\n"
             "        请检查网络,或先安装 python3-venv 后重新运行 setup。")
    if run([PY, str(get_pip)]).returncode != 0:
        fail("在 venv 中安装 pip 失败。")
    try:
        get_pip.unlink()
    except OSError:
        pass


def module_available(mod: str) -> bool:
    if not PY.exists():
        return False
    r = subprocess.run([str(PY), "-c", f"import {mod}"], capture_output=True)
    return r.returncode == 0


def install_requirements():
    info("升级 pip 并安装 requirements.txt …")
    run(PIP_CMD + ["install", "--upgrade", "pip"])
    if run(PIP_CMD + ["install", "-r", str(REQUIREMENTS)]).returncode != 0:
        fail("依赖安装失败,请检查网络或 requirements.txt 后重试。")
    for mod in ("fastapi", "uvicorn", "numpy"):
        if not module_available(mod):
            fail(f"依赖自检失败: venv 中仍无法 import {mod}。")
    ok("后端依赖安装并自检通过。")


def _port_open(host: str, port: int) -> bool:
    family = socket.AF_INET6 if ":" in host else socket.AF_INET
    with socket.socket(family, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def port_in_use(host: str, port: int) -> bool:
    # 同时探测 IPv4/IPv6 回环,避免旧进程只绑 ::1 时漏报
    candidates = ["127.0.0.1"]
    if socket.has_ipv6:
        candidates.append("::1")
    return any(_port_open(h, port) for h in candidates)


def preflight(host: str, port: int):
    if not ENV_FILE.exists():
        warn("未发现 backend/.env,正在从 .env.example 复制一份。")
        shutil_copy(ENV_EXAMPLE, ENV_FILE)
    if not PY.exists() or not venv_python_works():
        fail("尚未创建可用的虚拟环境,请先执行: python dev.py setup")
    missing = [m for m in ("fastapi", "uvicorn", "numpy") if not module_available(m)]
    if missing:
        fail(f"缺少依赖: {', '.join(missing)}\n        请先执行: python dev.py setup")
    if not (1 <= port <= 65535):
        fail(f"BACKEND_PORT 超出合法范围: {port}")
    if port_in_use(host, port):
        hint = "netstat -ano | findstr :%d" % port if IS_WINDOWS \
               else f"lsof -i :{port}   # 或: ss -lntp | grep {port}"
        fail(f"端口 {port} 已被占用,后端无法启动。\n"
             f"        请释放该端口,或修改 backend/.env 中的 BACKEND_PORT,\n"
             f"        同时同步修改 frontend/.env 中的 VITE_BACKEND_PORT。\n"
             f"        排查命令: {hint}")


def shutil_copy(src: Path, dst: Path):
    import shutil
    shutil.copyfile(src, dst)


def cmd_setup():
    if sys.version_info < (3, 9):
        fail(f"需要 Python 3.9+,当前为 {sys.version.split()[0]}。")
    if not ENV_FILE.exists() and ENV_EXAMPLE.exists():
        info("从 .env.example 创建 backend/.env。")
        shutil_copy(ENV_EXAMPLE, ENV_FILE)
    bootstrap_venv()
    install_requirements()
    ok("环境就绪。启动后端: python dev.py start")


def cmd_start():
    host, port = get_config()
    preflight(host, port)
    info(f"启动 uvicorn: http://{host}:{port}  (文档: /docs, 健康检查: /health, 行情: /ws)")
    # 直接传入 app 对象,避免工作目录/模块路径不一致导致 import 失败
    code = ("from app.config import settings; "
            "import uvicorn; "
            "uvicorn.run('app.main:app', host=settings.host, port=settings.port)")
    proc = subprocess.run([str(PY), "-c", code], cwd=str(ROOT))
    sys.exit(proc.returncode)


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "start"
    if action == "setup":
        cmd_setup()
    elif action == "start":
        cmd_start()
    else:
        fail(f"未知命令: {action}\n可用命令: setup, start")
