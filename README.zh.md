# dsh-web-polysearch

[English](README.md) · **中文**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![DSH plugin](https://img.shields.io/badge/DSH-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）多源联网搜索插件。

并行查询多个搜索引擎（DeepSeek / DuckDuckGo / Exa / Google / Bing），合并去重后返回结构化结果。也支持通过 URL 直接获取指定网页的正文。

属于 DSH 插件生态，通过 GitHub [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic 被收录。

## 功能特性

- **并行多引擎搜索** — 通过 `Promise.allSettled` 同时查询所有已配置后端，按 URL 合并去重
- **五大搜索后端**：
  - **DeepSeek** — 使用 DSH 内置的 `web` 服务（无需 Key）
  - **DuckDuckGo** — 抓取 `html.duckduckgo.com`（无需 Key）
  - **Exa** — 直连免 Key MCP 端点 `https://mcp.exa.ai/mcp`（无需 Key）
  - **Google Custom Search** — 需 API Key + 搜索引擎 ID
  - **Bing Web Search** — 需 Azure API Key
- **直接获取网页正文** — 传入 `url` 参数（替代 `query`）即可获取指定页面的完整内容
- **正文抓取** — 可选自动抓取前几条搜索结果的正文（并行获取）
- **中英双语设置 UI** — 通过 DSH locale 服务注册中英文翻译
- **SSE 解析** — 支持 MCP 响应的纯 JSON 和 SSE 帧两种格式

## 安装

插件目前通过 GitHub 分发，未发布到 npm。

### 从 GitHub 安装（推荐）

```sh
dsh plugin --profile web add github:zeroUsr0721/dsh-web-polysearch
```

`dsh plugin` 会把这个 spec 转给 pnpm，pnpm 从 GitHub 拉取 tarball 并安装到 profile。构建产物（`lib/index.js`、`lib/client.js`）已提交到仓库，所以安装时不会运行 `prepare` 构建脚本，也不需要在 `pnpm-workspace.yaml` 里 allowBuilds。

### 从本地源码安装（开发用）

```sh
git clone https://github.com/zeroUsr0721/dsh-web-polysearch.git
dsh plugin --profile web add ./dsh-web-polysearch
```

pnpm 通过 `link:` 协议链接源码目录，源码改动后重启 DSH 生效。

### 手动编辑

添加到 profile 的 `package.json`：

```json
{
  "dependencies": {
    "dsh-web-polysearch": "github:zeroUsr0721/dsh-web-polysearch"
  }
}
```

然后在 profile 目录运行 `pnpm install`。如果插件没自动加载，把它加入 `dsh.profile.bundles`。

### 通过 dshmarket

插件收录到 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 目录后，会在 DSH Web GUI 的 **设置 → 插件 → 插件市场** 中显示，支持一键安装。

## 配置

在 DSH Web GUI 中打开 **设置 → 插件 → Web 搜索设置**。

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `sources` | 启用的搜索后端（顺序决定合并优先级） | 全部五个 |
| `maxResults` | 每次返回结果数量上限 | 8 |
| `fetchContent` | 是否抓取前几条结果的正文 | `false` |
| `fetchCount` | 抓取正文的结果条数（1–5） | 3 |
| `googleApiKey` | Google Custom Search API Key | — |
| `googleCx` | Google 搜索引擎 ID | — |
| `bingApiKey` | Bing Web Search API Key | — |

## 工具：`dsh-web-polysearch`

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `query` | string | `query`/`url` 二选一 | 搜索关键词 |
| `url` | string | `query`/`url` 二选一 | 要获取内容的网页 URL |
| `maxResults` | integer | 否 | 返回结果上限（默认取设置值） |
| `fetchContent` | boolean | 否 | 是否抓取正文（默认取设置值） |

工具始终使用设置页配置的来源列表，模型无法在调用时覆盖。

### 输出

```json
{
  "summary": "搜索到 5 条结果（来源：exa, duckduckgo）。",
  "sources": [
    { "url": "https://...", "title": "...", "snippet": "...", "source": "exa" }
  ],
  "sourceErrors": [
    { "source": "duckduckgo", "error": "fetch failed" }
  ],
  "searchedSources": ["exa", "duckduckgo"]
}
```

### 示例

跨所有已配置后端搜索：

```json
{ "query": "DeepSeek Harness 插件", "maxResults": 10 }
```

直接获取指定页面内容：

```json
{ "url": "https://github.com/topics/dsh-plugin" }
```

## 架构

- **Host 端**（`src/index.ts`）— 注册 `dsh-web-polysearch` 工具，实现各后端搜索，解析 MCP/SSE 响应，抓取页面正文
- **Client 端**（`src/client/index.ts`）— **Web 搜索设置** UI：可折叠卡片、开关组件、密钥输入、i18n

两个端分别打包（产物分别为 `lib/index.js` 和 `lib/client.js`），由 DSH host 端和浏览器 shell 加载。

## 从源码构建

```sh
pnpm install
pnpm run build
```

构建产物：`lib/index.js`（host）+ `lib/client.js`（client）。

## 生态

本仓库已添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) GitHub topic。这是 DSH 插件生态的官方发现机制，被以下渠道消费：

- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 目录及镜像站点
- 社区维护的生态索引
- 其他以 topic 作为发现信号的周边工具

给自己的插件仓库添加 `dsh-plugin` topic 即可被收录。

## 许可证

MIT