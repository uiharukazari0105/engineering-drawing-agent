"""Web 层测试：Vue 源码与生产构建 + 可选 HTTP 冒烟。"""
from __future__ import annotations

import os
import re

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FRONTEND = os.path.join(ROOT, "frontend")
FRONTEND_DIST = os.path.join(FRONTEND, "dist")

SRC_FILES = [
    "src/main.ts",
    "src/App.vue",
    "src/lib/api.ts",
    "src/lib/utils.ts",
    "src/stores/workbench.ts",
    "src/components/workbench/AppMenuBar.vue",
    "src/components/workbench/ProjectExplorer.vue",
    "src/components/workbench/DocumentTabs.vue",
    "src/components/workbench/WorkDock.vue",
    "src/components/model/ModelViewer.vue",
    "src/components/panels/ParameterInspector.vue",
    "src/components/panels/AssemblyPanel.vue",
    "src/components/ui/button/Button.vue",
    "src/components/ui/dialog/DialogContent.vue",
]


def test_frontend_entry_uses_vue_typescript():
    index_path = os.path.join(FRONTEND, "index.html")
    assert os.path.exists(index_path)
    index = open(index_path, encoding="utf-8").read()
    assert 'src="/src/main.ts"' in index
    package = open(os.path.join(FRONTEND, "package.json"), encoding="utf-8").read()
    assert '"vue"' in package
    assert '"typescript"' in package
    assert '"vite"' in package
    assert '"reka-ui"' in package


def test_vue_sources_exist():
    for relative_path in SRC_FILES:
        assert os.path.exists(os.path.join(FRONTEND, relative_path)), relative_path


def test_production_build_exists():
    index_path = os.path.join(FRONTEND_DIST, "index.html")
    if not os.path.exists(index_path):
        pytest.skip("先执行 cd frontend && npm run build")
    index = open(index_path, encoding="utf-8").read()
    assert re.search(r'/assets/index-[^"]+\.js', index)
    assert re.search(r'/assets/index-[^"]+\.css', index)


@pytest.mark.skipif(
    os.environ.get("RUN_HTTP_TESTS") != "1",
    reason="默认跳过 HTTP 冒烟（设置 RUN_HTTP_TESTS=1 启用）",
)
def test_http_smoke():
    if not os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        pytest.skip("Vue 生产构建不存在")
    from fastapi.testclient import TestClient

    from serve import app

    client = TestClient(app)
    assert client.get("/api/health").json()["ok"] is True
    index_response = client.get("/")
    assert index_response.status_code == 200
    assert "工程图纸建模与自纠错系统" in index_response.text

    assets = re.findall(r'(?:src|href)="(/assets/[^"]+)"', index_response.text)
    assert assets
    for asset in assets:
        assert client.get(asset).status_code == 200

    response = client.post("/api/tasks", json={"with_defect": True, "task_id": "T-HTTP"})
    assert any(item["constraint_id"] == "c_h4_inside" for item in response.json()["issues"])
    fixed = client.post("/api/tasks/T-HTTP/fix", json={"budget": 5, "mode": "A1"})
    assert fixed.json()["state"] == "DONE"
