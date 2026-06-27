# LCS&SCS Visualizer 1.1.3 使用说明

## 网页端

本版本更新 Vercel 网页端，不更新本地 exe。打开生产站点后可以使用 LCS/SCS 计算、动画演示、性能分析、文献 PDF 阅读和右侧问答。

## AI 配置

豆包仍使用：

```text
LCS_AI_API_KEY
LCS_AI_MODEL
LCS_AI_BASE_URL
LCS_AI_DAILY_LIMIT
```

DeepSeek 使用：

```text
LCS_DEEPSEEK_API_KEY
LCS_DEEPSEEK_MODEL=deepseek-v4-flash
LCS_DEEPSEEK_BASE_URL=https://api.deepseek.com
```

豆包和 DeepSeek 共享 `LCS_AI_DAILY_LIMIT`。严格的服务端共享计数需要 Vercel KV 或 Upstash Redis REST：

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

或：

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

每日次数按 Asia/Shanghai 时间 00:00 刷新。
