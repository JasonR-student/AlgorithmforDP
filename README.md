# LCS&SCS Visualizer

版本：`1.0.4`
作者：任正汗 | JasonRhan
版权：Copyright 2026 任正汗 | JasonRhan. All rights reserved.

本项目用于演示最长公共子序列（LCS）和最短公共超序列（SCS）的动态规划过程。算法核心由 C++ 编译为 `lcs_scs.wasm`，网页端通过 React + Vite 调用 WebAssembly 完成计算、动画、性能分析、文献阅读和 AI 问答。

## 1.0.4 更新

- AI 对话区清理为干净的算法问答窗格，移除页面内可见的模型品牌、环境变量说明和展示稿痕迹。
- 超长文本动画支持在新页面打开，顶部保留输入与操作区，DP 表格在下方完整展开。
- 参考文献页改为紧凑列表，不再内嵌预览；点击论文后在新页面左侧阅读 PDF，右侧直接加载 AI 问答窗格。
- 算法说明页增加 LCS、SCS、Hirschberg、复杂度对比等互动讲解内容。
- 前端代码按功能拆分到 `features`、`components`、`hooks`、`utils`、`config`、`services`、`lib` 等目录，并为主要函数补充维护注释。
- 桌面端 exe、Vercel 源码包和项目版本统一升级到 `1.0.4`。

## 交付版本

本地桌面版：

```text
release\LCS_SCS_Visualizer_1.0.4.exe
```

Vercel 版本使用标准 Vite 静态构建：

```text
npm install
npm run build
```

输出目录：

```text
dist
```

可上传或导入 Vercel 的源码包：

```text
release\LCS_SCS_Visualizer_Vercel_1.0.4.zip
```

## AI 配置

算法计算不依赖 API Key。在线 AI 问答需要在 Vercel 项目环境变量中配置：

```text
LCS_AI_API_KEY=你的豆包或 OpenAI 兼容模型 API Key
```

可选变量：

```text
LCS_AI_MODEL=your-ark-endpoint-or-model-name
LCS_AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
LCS_AI_DAILY_LIMIT=30
```

后端也兼容 `DOUBAO_API_KEY`、`DOUBAO_MODEL`、`DOUBAO_BASE_URL`，但建议优先使用 `LCS_AI_*` 作为项目统一变量名。文献页问答会把当前页面文本、PDF 地址、论文方法说明和算法状态一起提交给后端代理。

未配置 API Key 时，前端会自动降级为本地规则分析，不影响算法计算、动画和文献页面。

## 代码结构

```text
LCS_SCS_Visualizer/
├─ api/                         # Vercel Serverless API
├─ docs/                        # 使用说明和参考文献补充材料
├─ launcher/                    # 本地 exe 启动器源码
├─ public/                      # Web 静态资源和 wasm 文件
├─ scripts/                     # 构建、打包脚本
├─ wasm/                        # C++ WebAssembly 算法核心
├─ web-src/
│  ├─ components/               # 通用 UI 组件
│  ├─ config/                   # 版本号、标签页、预设数据
│  ├─ data/                     # 文献元数据
│  ├─ features/                 # 一个功能一个目录
│  ├─ hooks/                    # 页面状态和业务动作
│  ├─ lib/                      # wasm、文件、随机文本工具
│  ├─ services/                 # AI 请求服务
│  ├─ utils/                    # 路由和上下文工具
│  ├─ App.jsx                   # 页面组合入口
│  └─ styles.css                # 全局样式
├─ index.html
├─ package.json
├─ vite.config.js
└─ vercel.json
```

## 常用命令

```bat
npm install
npm run build
npm run package:local
npm run package:vercel
```

`public/lcs_scs.wasm` 已预编译，Vercel 构建阶段不需要本地 C++ 或 Zig 工具链。

## 功能入口

- 核心结果：展示 LCS、SCS、Hirschberg 结果、DP 表和序列来源。
- 可视化动画：支持 DP 填表、标准 LCS 回溯、SCS 回溯构造、Hirschberg 线性空间回溯，并可打开独立动画页。
- 效率分析：批量比较标准 DP、滚动数组和 Hirschberg 的耗时、空间与优化比例。
- 算法说明：用互动步骤解释状态定义、转移公式、回溯路径和复杂度。
- 参考文献：紧凑展示论文列表，点击后进入 PDF 阅读 + 论文问答页。
