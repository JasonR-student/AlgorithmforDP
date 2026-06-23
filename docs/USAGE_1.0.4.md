# LCS & SCS Wasm 可视化平台 1.0.4 使用说明

作者：任正江 | JasonRhan
版本：`1.0.4`
版权：Copyright 2026 任正江 | JasonRhan. All rights reserved.

## 版本定位

1.0.4 是面向课程展示、现场讲解和 Vercel 部署的稳定版本。算法计算全部在浏览器侧完成，C++ 内核通过 WebAssembly 暴露给前端 JavaScript，Vercel 只负责静态资源托管和可选的在线 AI 代理函数。

## 启动方式

本地桌面端：

```text
release\LCS_SCS_Visualizer_1.0.4.exe
```

Vercel 网页端：

```text
npm install
npm run build
```

Vercel 输出目录为：

```text
dist
```

## AI 助手配置

部署后可在 Vercel 环境变量中添加：

```text
LCS_AI_API_KEY=你的模型 API Key
```

可选变量：

```text
LCS_AI_MODEL=your-model-name
LCS_AI_BASE_URL=https://api.example.com
LCS_AI_DAILY_LIMIT=30
```

没有配置 API Key 时，AI 窗格会使用本地规则分析，页面仍可完成算法计算、动画展示、性能分析和文献阅读。

## 核心功能

1. LCS：输出长度、序列、DP 表和回溯路径。
2. SCS：基于同一张 DP 表构造最短公共超序列，并按字符来源着色。
3. Hirschberg：用线性空间方式重构 LCS 序列，用于和标准 DP 对比。
4. 可视化动画：支持 DP 填表、LCS 回溯、SCS 构造三种模式。
5. 超长文本：支持随机长文本生成，并可在独立页面查看动画表格。
6. 效率分析：批量比较三类算法的时间、空间和优化比例。
7. 算法说明：通过互动步骤解释状态定义、转移、回溯和复杂度。
8. 参考文献：紧凑列表展示论文，点击后进入 PDF 阅读和 AI 论文问答页。

## 发布产物

```text
dist/                                            # Vercel 静态部署目录
public/lcs_scs.wasm                              # Wasm 算法模块
release/LCS_SCS_Visualizer_1.0.4.exe             # 本地桌面版
release/LCS_SCS_Visualizer_Vercel_1.0.4.zip      # Vercel 源码包
```

## GitHub Release 示例

```bat
git add .
git commit -m "release 1.0.4 wasm visualizer"
git tag v1.0.4
git push origin v1.0.4
gh release create v1.0.4 release\LCS_SCS_Visualizer_1.0.4.exe release\LCS_SCS_Visualizer_Vercel_1.0.4.zip --title "LCS/SCS Visualizer 1.0.4" --notes-file docs\USAGE_1.0.4.md
```
