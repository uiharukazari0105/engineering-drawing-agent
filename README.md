# 工程图纸建模与自纠错 Agent

上传一份带尺寸标注的二维机械零件图，Agent 自动生成**可编辑的参数化三维实体**，并像工程师一样
**审查尺寸/特征/约束问题 → 局部修复 → 回归验证 → 输出证据链报告**。

差异化点（详见 `PRD.md`）：
1. **约束影响图（Constraint Dependency Graph）**——改一个参数，自动算出受影响特征集与需回归的约束集。
2. **确定性审查 + 可量化验证闭环**——几何内核校验 + 数值规则 + 公差判定，量化、带阈值、可回滚。
3. **置信度 × 用户意愿的自适应自动化**——`A0 全自动 / A1 辅助 / A2 手动`，低置信或高风险时请求确认或拒绝修复。

## 目录结构

```
PRD.md                     产品设计文档（需求/架构/接口/指标/里程碑）
research-log-*.md          选题调研日志
backend/                   后端（Python）
  app/                     核心模块：models/graph/rules/propagate/parse/audit/fix/state/cad/store/api/evaluate
                          华为云接入：cloud（配置探测）/llm（多模态）/obs（对象存储）
                          /evidence（证据上云）/metrics（CES 指标）/jobs（异步任务）/fn（函数工作流）
  functions/handler.py     FunctionGraph 函数入口（可选部署）
  scripts/                 demo_run.py / evaluate_suite.py / export_samples.py
  tests/                   单元与闭环测试 + 云服务接入测试
  serve.py                 API + 前端静态资源（同源）
  requirements.txt
frontend/                  前端（Vue 3 + TypeScript + Vite + shadcn-vue）
  src/stores/              Pinia 业务状态（任务、修复、导出）
  src/components/ui/       shadcn-vue 基础组件
  src/components/workbench 菜单、状态栏、资源树、文档标签、流程阶段、底部 Dock
  src/components/panels/   审查、参数、日志、对比、执行状态
  src/components/model/    Three.js 参数化模型视口
samples/                   演示样例（蓝图 JSON + 示意工程图 PDF/PNG）
readme/                    交付文档（部署说明、图纸解析说明、评估指标说明、前端设计自检、审查问题修复报告、华为云服务接入说明）
```

## 快速开始

### 0. 一键运行（推荐）

在项目根目录执行：

```bash
./run.sh
```

首次运行会自动创建 `.venv`、安装后端与前端依赖、安装 CadQuery，并在服务就绪后打开浏览器。
后续运行会复用已安装环境。

常用参数：

```bash
./run.sh --lite                 # 跳过 CadQuery，仅使用几何摘要
./run.sh --port 8080            # 更换端口
./run.sh --no-browser           # 不自动打开浏览器
./run.sh --reinstall            # 重新安装依赖
./run.sh --check-only           # 只准备环境，不启动服务
```

也可以直接执行 `python3 run.py`。

## 项目级工作区

- 顶部菜单与文档标签支持同时打开多份图纸，每份图纸保留独立任务、模型、审查、修复和导出状态。
- 左侧资源管理器以工程树组织文件夹、图纸与零件组合检查。
- 图纸可从资源管理器直接拖入文件夹完成归类。
- 文件菜单提供打开图纸、新建文件夹、保存工程和读取工程。
- 工程文件为 ZIP：`project.json` 保存文件夹、任务、模型、审查和修复元数据，原始图纸放在 `drawings/` 下。
- Pinia 持久化恢复活动图纸、文件夹、解析结果、审查与修复进度、Dock 状态和资源管理器状态。
- Blob/File 原始内容不写入 `localStorage`，需要随工程归档时请使用“保存工程”生成 ZIP。
- `视图 → 工作记录台` 可切换审查清单、修复记录、回归对比、执行状态和组合检查。
- 当前组合检查执行前端确定性基础接口核对：板厚、孔径和孔数模式是否兼容。
- 装配位姿、干涉体积、完整约束求解仍需要后续后端几何内核能力，界面中会明确标注这一边界。

### 1. 后端

```bash
cd backend
pip install -r requirements.txt
python -m pytest -q                 # 运行测试（96 通过 / 1 跳过）
python serve.py                     # 启动服务：http://127.0.0.1:8000
```

### 2. 前端

前端使用 Vue 3 + TypeScript + Vite + shadcn-vue。`backend/serve.py` 默认挂载
`frontend/dist` 生产构建；`run.py` 会自动安装依赖并执行 `npm run build`。

如需重新安装前端依赖：

```bash
cd frontend
npm ci
npm run build
```

### 3. 前端设计自检（可复现）

```bash
cd frontend
npm run type-check                   # vue-tsc 类型检查
npm run build                        # Vite 生产构建
```

设计规范与迭代记录见 `readme/前端设计自检.md`。

### 4. 审查问题复核（可复现）

```bash
cd backend
python scripts/audit_repro.py        # 28 项（后端 16 + 前端 12）逐条复核，期望「0 复现」
```

修复明细与契约变更见 `readme/审查问题修复报告.md`。

### 5. 一键演示（生成报告与指标）

```bash
cd backend
python scripts/export_samples.py     # 生成 samples/ 样例
python scripts/demo_run.py           # 解析→审查→影响分析→修复→导出，输出 outputs/report.json
python scripts/evaluate_suite.py     # 测试集评估，输出 outputs/metrics.json
```

## 华为云服务接入（可选增强）

全部云服务均为**可选**：不配置任何凭据时，主闭环行为与接入前完全一致。
详细步骤、演示脚本与答辩话术见 [`readme/华为云服务接入说明.md`](readme/华为云服务接入说明.md)。

| 服务 | 作用 | 关键环境变量 |
|---|---|---|
| **MaaS**（多模态） | 位图图纸尺寸理解；模型只出候选值，不参与最终裁决 | `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` |
| **OBS** | 证据包上云、manifest 记录对象 key+ETag、预签名下载 | `OBS_ENDPOINT` / `OBS_BUCKET` / `OBS_AK` / `OBS_SK` |
| **FunctionGraph** | 长任务异步化（修复/导出） | `FN_ENDPOINT` |
| **CES** | 调用量、时延分位、错误率指标 | `CES_AK` / `CES_SK` / `CES_NAMESPACE` |

新增端点：

```
GET  /api/cloud/status?probe=true     # 服务接入状态 + OBS 连通性自检
GET  /api/metrics/summary             # 指标看板（本地聚合，无需云环境）
POST /api/metrics/push                # 批量上报 CES
POST /api/tasks/{id}/fix/async        # 异步修复，返回 job_id
GET  /api/jobs/{job_id}               # 异步任务状态
```

快速自检：

```bash
cd backend
python -c "from app.cloud import status; import json; print(json.dumps(status(), ensure_ascii=False, indent=2))"
```

## 关键概念

- **证据状态**：`observed / inferred / user-confirmed / unknown`，每个参数带来源与置信度。
- **自动化档位**：由置信度 c 与用户意愿 p 决定（`τ_high=0.85`、`τ_low=0.55`，可调）。
- **修复预算**：硬限制（默认 3–5 轮）；失败/振荡/预算耗尽即回滚。
- **几何内核可选**：安装 `cadquery` 可导出真实 STEP/STL；未安装则输出确定性几何摘要 JSON，闭环不受影响。

## 开源组件许可

| 组件 | 许可 |
|---|---|
| CadQuery（可选） | Apache-2.0 |
| OpenCASCADE / OCCT（经 CadQuery） | LGPL-2.1（含例外） |
| Three.js | MIT |
| Vue 3 | MIT |
| Pinia | MIT |
| shadcn-vue / Reka UI | MIT |
| Tailwind CSS | MIT |
| Lucide | ISC |
| Noto Sans SC / 思源黑体同源字形 | SIL OFL 1.1 |
| FastAPI / uvicorn / pydantic | MIT / BSD |
| NetworkX | BSD-3-Clause |
| 设计参考：img2cad(MIT) / cadrille(Apache-2.0) | 仅作参考并注明 |
