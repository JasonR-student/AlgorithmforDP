# LCS&SCS Visualizer

版本：`1.1.3`
作者：任正江 | JasonRhan
联系：jasonrhan@agent.qq.com
版权：Copyright 2026 任正江 | JasonRhan. All rights reserved.

本项目用于演示最长公共子序列（LCS）和最短公共超序列（SCS）的动态规划过程。网页端通过 React + Vite 调用 WebAssembly 完成计算、动画、性能分析、文献阅读和 AI 问答。

## 1.1.3 更新

- AI 问答改为双模型路由：文献阅读相关问题使用豆包，其他问题默认使用 DeepSeek。
- DeepSeek、豆包共享同一个每日次数限制，计数在 Vercel API 端完成，浏览器刷新不会重置。
- 每日额度按 Asia/Shanghai 时间 00:00 刷新。
- 问答等待态显示为“思考中...”，回答下方以灰色小字显示来源模型。
- 主界面、独立动画页、PDF 阅读页底部统一显示版权、版本和联系邮箱。
- 预留本地端下载链接；当前版本仅更新网页/Vercel 端，本地 exe 后续同步。

## AI 环境变量

Vercel 生产环境需要配置：

```text
LCS_AI_API_KEY=你的豆包 API Key
LCS_AI_MODEL=你的豆包模型或 Ark Endpoint
LCS_AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
LCS_AI_DAILY_LIMIT=30

LCS_DEEPSEEK_API_KEY=你的 DeepSeek API Key
LCS_DEEPSEEK_MODEL=deepseek-v4-flash
LCS_DEEPSEEK_BASE_URL=https://api.deepseek.com
```

严格的服务端共享次数限制需要 Vercel KV 或 Upstash Redis REST 变量：

```text
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

也兼容：

```text
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

如果没有配置 KV/Upstash，API 会回退到 Vercel 函数内存计数，只能保证单个运行实例内不因浏览器刷新而重置，不能保证跨实例严格共享。

## 本地端说明

本次不更新本地 exe。页面中预留的下载入口为：

```text
/release/LCS_SCS_Visualizer_1.1.3.exe
```

后续同步本地端时，exe 的 AI 功能应调用已部署的 Vercel `/api/chat`，由 Vercel 统一返回回答和剩余额度。

## 构建

```bat
npm install
npm run build
```

输出目录：

```text
dist
```
