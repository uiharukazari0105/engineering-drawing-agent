"""启动服务：后端 API + Vue 生产构建静态资源。

运行：在 backend 目录下执行 `python serve.py`，浏览器打开 http://127.0.0.1:8000
"""
from __future__ import annotations

import os

import uvicorn
from fastapi.staticfiles import StaticFiles

from app.api import app

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIST = os.path.join(ROOT_DIR, "frontend", "dist")
FRONTEND_SOURCE = os.path.join(ROOT_DIR, "frontend")
FRONTEND_DIR = FRONTEND_DIST if os.path.isfile(os.path.join(FRONTEND_DIST, "index.html")) else FRONTEND_SOURCE

if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


def main() -> None:
    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("PORT", "8000")))


if __name__ == "__main__":
    main()
