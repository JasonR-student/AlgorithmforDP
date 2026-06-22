# LCS & SCS Wasm 可视化实验平台 1.0.1 使用文档

作者：任正江 | JasonRhan  
版本：1.0.1  
版权：Copyright 2026 JasonRhan

## 版本定位

1.0.1 是 Wasm 架构重构版本。相较旧版本地 C++ HTTP 服务，本版本不再使用 `cpp-httplib`，不再通过浏览器请求本地后端计算算法，而是把 C++ 算法核心编译为 `lcs_scs.wasm`，由浏览器端 JavaScript 直接调用。

## 启动方式

### 本地 exe

双击：

```text
release\LCS_SCS_Visualizer_1.0.1.exe
```

程序会自动打开系统默认浏览器。exe 只承担启动器职责，不监听端口，不启动后端服务。

### Vercel

部署到 Vercel 后直接访问站点域名即可。算法计算、文件导入导出、随机文本、性能测试均在浏览器中运行。

## AI 助手配置

Vercel 环境变量名称：

```text
JASONRHAN_DEEPSEEK_API_KEY
```

推荐可选变量：

```text
JASONRHAN_DEEPSEEK_MODEL=deepseek-v4-flash
JASONRHAN_DEEPSEEK_BASE_URL=https://api.deepseek.com
JASONRHAN_AI_DAILY_LIMIT=30
```

未配置 API Key 时，AI 助手自动使用本地规则分析，不影响算法演示。

## 核心功能

1. 输入控制：支持教材经典、短串边界、完全相同、完全不同、长串测试等预设。
2. 随机长文本：支持 100-200、200-300、100-300 挡位，也可以用滑动条按整十单位设置最小和最大长度。
3. LCS：Wasm 调用标准二维 DP，输出长度、序列、DP 表、回溯路径和小规模暴力递归对照。
4. SCS：基于 LCS DP 表构造最短公共超序列，按公共字符、S1 来源、S2 来源分别着色。
5. 可视化动画：支持重载、上一步、下一步、自动播放和进度条定位。
6. 性能分析：浏览器端批量调用 Wasm，对比标准 DP 与滚动数组的耗时和空间占用。
7. 文件导入导出：浏览器端解析 `.txt/.lcs` 文件，导出带中文解释的实验结果文件。
8. 参考文献：内置真实 PDF，可在页面中方格或横格浏览并预览。

## 建议答辩流程

1. 使用「教材经典」样例展示 LCS/SCS 正确性。
2. 切换到「可视化动画」说明 DP 表填充和回溯路径。
3. 使用随机长文本展示 Wasm 性能和空间优化效果。
4. 打开「算法说明」解释递推公式和 SCS 长度公式。
5. 打开「参考文献」说明课程基础问题与研究扩展之间的联系。
6. 使用 DeepSeek 助手生成答辩话术或效率分析总结。

## 构建命令

```bat
npm install
npm run release
```

生成产物：

```text
dist/                                    # Vercel 静态部署目录
public/lcs_scs.wasm                      # Wasm 算法模块
release/LCS_SCS_Visualizer_1.0.1.exe     # 本地单 exe 启动器
```
