# 作品说明文档（交付版）

- **作品名称**：工程图纸建模与自纠错 Agent
- **队伍名称**：（填写）
- **版本号**：v0.1.0
- **联系方式**：（填写）
- **赛区/组别**：南部赛区 / 高校组

---

## 1. 环境依赖说明

| 组件 | 版本要求 | 是否必需 |
|---|---|---|
| Python | ≥ 3.10（本项目在 3.13.5 验证） | 必需 |
| Node.js | ≥ 18（仅用于前端依赖，已随包提供） | 可选 |
| CadQuery / OCCT | 任意可用版本 | **可选**（未安装时输出几何摘要 JSON） |

后端依赖：`fastapi`、`uvicorn`、`pydantic`、`networkx`；测试：`pytest`、`httpx`。

## 2. 一键安装与运行

在项目根目录运行：

```bash
python run.py
```

macOS / Linux 也可以直接执行 `./run.sh`。脚本首次运行会创建 `.venv`、安装后端和前端依赖、
启动服务并打开浏览器；后续运行会复用已安装环境。使用 `--lite` 可跳过 CadQuery，
使用 `--port 8080` 可更换端口。

## 3. 部署运行步骤

1. 在项目根目录执行 `python run.py`。
2. 等待终端显示 `Ready: http://127.0.0.1:8000`。
3. 浏览器会自动打开；也可手动访问该地址。
4. 使用内置蓝图或上传图纸，查看审查、修复和回归结果。

> 前端为**零构建**方案（浏览器原生 ESM + importmap），`frontend/node_modules` 已随包提供，无需 `npm build`。

### 离线/命令行演示（不依赖浏览器）

```bash
cd backend
python scripts/export_samples.py     # 生成样例图纸
python scripts/demo_run.py           # 解析→审查→影响分析→修复→导出
python scripts/evaluate_suite.py     # 测试集评估指标
python -m pytest -q                  # 自动化测试
```

产物：`backend/outputs/report.json`、`backend/outputs/metrics.json`、`backend/outputs/model_summary.json`。

## 4. 额外使用的开源组件说明

| 组件 | 版本 | 许可 | 用途 |
|---|---|---|---|
| FastAPI | ≥0.110 | MIT | REST API |
| uvicorn | ≥0.27 | BSD-3 | ASGI 服务器 |
| pydantic | ≥2 | MIT | 请求模型 |
| NetworkX | ≥3 | BSD-3 | 参数依赖图与可达性分析 |
| Three.js | 0.160 | MIT | 三维预览 |
| Preact | 10 | MIT | 前端组件（替代 React，零构建） |
| htm | 3 | Apache-2.0 | 无构建的模板语法 |
| CadQuery | 可选 | Apache-2.0 | 参数化建模与 STEP/STL 导出 |
| OpenCASCADE (OCCT) | 经 CadQuery | LGPL-2.1（含例外） | 几何内核 |
| Pillow | 可选 | HPND | 生成示意工程图样例 |

设计参考（未直接复用代码，仅参考其公开的方法与边界说明，均已注明）：
- **img2cad**（MIT）：其 `DESIGN.md` 明确"不做图像理解、不判定视觉正确性、无跨模态证据冲突检测"，
  本项目据此把创新点定位在"约束影响分析 + 确定性验证闭环"，避免重复实现。
- **cadrille**（Apache-2.0）：多模态单次生成路线的代表，用于竞品边界对照。

## 5. 码道在项目开发中的应用总结

本项目以**华为云码道**为核心 AI 编程工具，覆盖开发全流程：

| 阶段 | 码道使用方式 | 产出 |
|---|---|---|
| 需求分析 | 讨论选题、MVP 范围、竞品缺口 | 选题调研日志、MVP 功能清单 |
| 架构设计 | 生成 PRD、模块划分、接口与数据模型 | `PRD.md`、`app/models.py` 等骨架 |
| 代码生成 | 逐模块生成核心逻辑 | `graph/rules/propagate/audit/fix/state/parse/cad/store/api` |
| 调试排错 | 依据测试报错定位并修复 | 8 类真实故障的修复记录（见 `codearts_proof/README.md`） |
| 单元测试 | 生成并迭代测试用例 | 24 项测试全部通过 |
| 文档生成 | 生成 README、交付文档、视频脚本 | 本文件、`ppt/`、`video/` |

**效率体现**：从零到可运行闭环（含 24 项测试）在单日内完成；排错过程通过"测试先行 → 报错定位 → 最小修复"形成可审计链条。

证明材料见 `codearts_proof/`。

## 6. 已知限制

- 首版仅支持**带尺寸标注的二维机械零件图**（非装配体、非自由曲面）。
- 图纸解析以**人机协同**为主：结构化蓝图/清单解析为确定性路径，位图 OCR 为可选增强。
- 未安装 CadQuery 时只输出几何摘要 JSON，不产出 STEP/STL。
