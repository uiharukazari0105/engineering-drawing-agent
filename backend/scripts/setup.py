"""一键安装：检查 Python 版本、安装后端依赖、校验前端资源。

运行：`python backend/scripts/setup.py`
"""
from __future__ import annotations

import os
import subprocess
import sys

MIN = (3, 10)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BACKEND = os.path.join(ROOT, "backend")
FRONTEND = os.path.join(ROOT, "frontend")

def main() -> None:
    if sys.version_info < MIN:
        sys.exit(f"需要 Python >= {MIN[0]}.{MIN[1]}，当前 {sys.version.split()[0]}")

    print(f"[1/3] Python {sys.version.split()[0]} OK")

    print("[2/3] 安装后端依赖 ...")
    req = os.path.join(BACKEND, "requirements.txt")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req])

    print("[3/3] 构建 Vue 前端 ...")
    if not os.path.isdir(os.path.join(FRONTEND, "node_modules")):
        subprocess.check_call(["npm", "ci"], cwd=FRONTEND)
    subprocess.check_call(["npm", "run", "build"], cwd=FRONTEND)

    print("\n完成。启动：python backend/serve.py  ->  http://127.0.0.1:8000")


if __name__ == "__main__":
    main()
