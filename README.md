# dsh-web-polysearch

**English** · [中文](README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![DSH plugin](https://img.shields.io/badge/DSH-dsh--plugin-2ea44f)](https://github.com/topics/dsh-plugin)

Multi-source web search tool for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH).

Queries several search backends in parallel — DeepSeek, DuckDuckGo, Exa, Google, Bing — merges and deduplicates results, and returns a structured answer. Also fetches the full content of a single URL on demand.

Part of the DSH plugin ecosystem. Discovered via the [`dsh-plugin`](https://github.com/topics/dsh-plugin) GitHub topic.

## Features

- **Parallel multi-engine search** — all enabled backends are queried at once via `Promise.allSettled`; results are merged and deduplicated by URL
- **Five built-in backends**:
  - **DeepSeek** — uses the DSH built-in `web` service (no key)
  - **DuckDuckGo** — scrapes `html.duckduckgo.com` (no key)
  - **Exa** — connects directly to the keyless MCP endpoint at `https://mcp.exa.ai/mcp` (no key)
  - **Google Custom Search** — requires API Key + Search Engine ID
  - **Bing Web Search** — requires Azure API Key
- **Direct page fetch** — pass `url` instead of `query` to fetch a single page's full content
- **Optional content fetching** — when `fetchContent` is on, the top results' body text is fetched in parallel
- **Bilingual settings UI** — Chinese and English, registered with the DSH locale service
- **SSE parsing** — handles MCP responses in plain JSON and SSE-framed formats

## Installation

The plugin is distributed via GitHub. There is no npm release at the moment.

### From GitHub (recommended)

```sh
dsh plugin --profile web add github:zeroUsr0721/dsh-web-polysearch
```

`dsh plugin` forwards the spec to pnpm, which downloads a tarball from GitHub and installs it into the profile. Built artifacts (`lib/index.js`, `lib/client.js`) are committed to this repository, so no `prepare` build step runs at install time and no `pnpm-workspace.yaml` allow-list is required.

### From a local checkout (development)

```sh
git clone https://github.com/zeroUsr0721/dsh-web-polysearch.git
dsh plugin --profile web add ./dsh-web-polysearch
```

pnpm links the checkout via `link:`, so edits in the source tree take effect after a restart.

### Manual edit

Add to your profile's `package.json`:

```json
{
  "dependencies": {
    "dsh-web-polysearch": "github:zeroUsr0721/dsh-web-polysearch"
  }
}
```

Then run `pnpm install` in the profile directory. Add `"dsh-web-polysearch"` to `dsh.profile.bundles` if it is not picked up automatically.

### Via dshmarket

Once the plugin is admitted to the [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) curated registry, it will appear in **Settings → Plugins → Plugin Market** in the DSH Web GUI for one-click install.

## Configuration

Open **Settings → Plugins → Web Search Settings** in the DSH Web GUI.

| Setting | Description | Default |
|---------|-------------|---------|
| `sources` | Enabled backends (order matters for merge priority) | All five |
| `maxResults` | Max results returned per call | 8 |
| `fetchContent` | Whether to fetch body text for top results | `false` |
| `fetchCount` | How many top results to fetch body for (1–5) | 3 |
| `googleApiKey` | Google Custom Search API Key | — |
| `googleCx` | Google Custom Search Engine ID | — |
| `bingApiKey` | Bing Web Search API Key | — |

## Tool: `dsh-web-polysearch`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | one of `query` / `url` | Search keywords |
| `url` | string | one of `query` / `url` | URL whose body to fetch directly |
| `maxResults` | integer | no | Max results (default: settings value) |
| `fetchContent` | boolean | no | Fetch body text for top results (default: settings value) |

The tool always uses the backends configured in the settings page — the model cannot override the source list at call time.

### Output

```json
{
  "summary": "Found 5 results (sources: exa, duckduckgo).",
  "sources": [
    { "url": "https://...", "title": "...", "snippet": "...", "source": "exa" }
  ],
  "sourceErrors": [
    { "source": "duckduckgo", "error": "fetch failed" }
  ],
  "searchedSources": ["exa", "duckduckgo"]
}
```

### Examples

Search across all configured backends:

```json
{ "query": "DeepSeek Harness plugins", "maxResults": 10 }
```

Fetch a specific page's content directly:

```json
{ "url": "https://github.com/topics/dsh-plugin" }
```

## Architecture

- **Host side** (`src/index.ts`) — registers the `dsh-web-polysearch` tool, implements each search backend, parses MCP/SSE responses, fetches page content
- **Client side** (`src/client/index.ts`) — the **Web Search Settings** UI: collapsible cards, toggle switches, secret inputs, i18n

The two halves ship as separate bundles (`lib/index.js` + `lib/client.js`) and are loaded by the DSH host and browser shell respectively.

## Building from source

```sh
pnpm install
pnpm run build
```

Build output: `lib/index.js` (host) + `lib/client.js` (client).

## Ecosystem

This repository carries the [`dsh-plugin`](https://github.com/topics/dsh-plugin) GitHub topic. Adding the topic to your own plugin repository is the standard way to make a plugin discoverable by:

- The [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) directory and its mirror sites
- The community-maintained ecosystem indexes
- Other tooling that consumes the topic as a discovery signal

## License

MIT