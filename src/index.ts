/**
 * dsh-web-polysearch — DeepSeek Harness 多源联网搜索插件。
 *
 * 注册 `dsh-web-polysearch` 工具，同时查询多个搜索引擎
 * (DeepSeek / DuckDuckGo / Exa / Google / Bing)，按配置顺序并行搜索、
 * 合并去重后返回结构化结果。支持直接获取指定网页正文。
 *
 * @module dsh-web-polysearch
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { defineTool } from '@deepseek-ai/dsh-tools'

/** Cordis 插件名，供加载器诊断用。 */
export const name = 'dsh-web-polysearch'

/** 插件依赖的 host 端服务。 */
export const inject = ['web', 'tools', 'systemPrompt', 'settings']

/** 持久化设置命名空间。 */
export const SETTINGS_NAMESPACE = settingsNamespace('dsh-web-polysearch')

/** 后端 ID 列表，按展示顺序排列。 */
export const SOURCE_IDS = ['deepseek', 'duckduckgo', 'exa', 'google', 'bing'] as const
export type SourceId = (typeof SOURCE_IDS)[number]

/** 插件配置：启用的后端（有序）、默认结果上限和密钥。 */
export interface Config {
  /** 启用的后端，按搜索顺序排列。 */
  sources: SourceId[]
  /** 单次返回合并结果的上限。 */
  maxResults: number
  /** 是否默认抓取前几条结果的正文。 */
  fetchContent: boolean
  /** 抓取正文时取前几条。 */
  fetchCount: number
  /** Google Custom Search API key（密钥）。 */
  googleApiKey?: string
  /** Google Custom Search 引擎 ID。 */
  googleCx?: string
  /** Bing Web Search API key（密钥）。 */
  bingApiKey?: string
  /** 当前 UI 语言（由 client 同步，供 host 端 i18n 使用）。 */
  locale?: string
}

export const Config: z<Config> = z.object({
  sources: z.array(z.union(SOURCE_IDS.map(id => z.const(id)))).default([...SOURCE_IDS]),
  maxResults: z.number().step(1).min(1).max(50).default(8),
  fetchContent: z.boolean().default(false),
  fetchCount: z.number().step(1).min(1).max(5).default(3),
  googleApiKey: z.string().role('secret'),
  googleCx: z.string(),
  bingApiKey: z.string().role('secret'),
  locale: z.string().default('zh-CN'),
})

// ── host 端 i18n ──────────────────────────────────────────────────────────

/** host 端翻译函数类型 */
type Translate = (key: string, fallback?: string) => string

/** 中文词典 */
const ZH_DICT: Record<string, string> = {
  toolDesc: '多源联网搜索或获取指定网页内容。传入 query 搜索多个搜索引擎；传入 url 则直接获取指定网页的正文内容。',
  paramQuery: '搜索关键词或自然语言问题（与 url 二选一）',
  paramUrl: '要获取内容的网页 URL（与 query 二选一）',
  paramMaxResults: '返回结果总数上限（默认取设置值）',
  paramFetchContent: '是否抓取最相关前几条的正文（默认取设置值）',
  errNoQueryOrUrl: 'query 或 url 至少提供一个',
  errGoogleKey: 'Google API key 未配置（设置页填写）',
  errGoogleCx: 'Google Search Engine ID (cx) 未配置（设置页填写）',
  errBingKey: 'Bing API key 未配置（设置页填写）',
  errGoogleParse: 'Google 返回了非 JSON 响应（可能为错误页面）',
  errBingParse: 'Bing 返回了非 JSON 响应（可能为错误页面）',
  errWebService: 'web service unavailable',
  errFetchFail: '[抓取失败] ',
  resultTitle: '### 多源搜索结果',
  resultSummary: '无',
  resultSource: '来源',
  resultFetchSummary: '获取到页面内容',
  resultErrorsTitle: '**部分来源失败**：',
  resultUnknownError: '未知错误',
  summaryFound: '搜索到',
  summaryResults: '条结果（来源：',
  summaryErrors: ' 个来源搜索失败：',
  summaryOverview: ' 概览：',
  sysPrompt: 'Use the dsh-web-polysearch tool when you need current web information from multiple search engines at once (DeepSeek / DuckDuckGo / Exa / Google / Bing), or to fetch the content of a specific web page by URL. It merges and deduplicates results across the configured backends and returns a structured list with sources. When url is provided instead of query, it fetches the page content directly. Follow up by citing the relevant URLs as markdown links.',
}

/** 英文词典 */
const EN_DICT: Record<string, string> = {
  toolDesc: 'Multi-source web search or fetch a specific page. Pass query to search multiple engines; pass url to fetch page content directly.',
  paramQuery: 'Search keywords or natural language question (one of query/url)',
  paramUrl: 'URL of the page to fetch content from (one of query/url)',
  paramMaxResults: 'Max results to return (defaults to settings value)',
  paramFetchContent: 'Whether to fetch body text for top results (defaults to settings value)',
  errNoQueryOrUrl: 'At least one of query or url must be provided',
  errGoogleKey: 'Google API key not configured (set in settings page)',
  errGoogleCx: 'Google Search Engine ID (cx) not configured (set in settings page)',
  errBingKey: 'Bing API key not configured (set in settings page)',
  errGoogleParse: 'Google returned a non-JSON response (possibly an error page)',
  errBingParse: 'Bing returned a non-JSON response (possibly an error page)',
  errWebService: 'web service unavailable',
  errFetchFail: '[fetch failed] ',
  resultTitle: '### Multi-Source Search Results',
  resultSummary: 'None',
  resultSource: 'source',
  resultFetchSummary: 'Fetched page content',
  resultErrorsTitle: '**Some sources failed**:',
  resultUnknownError: 'unknown error',
  summaryFound: 'Found',
  summaryResults: ' results (sources: ',
  summaryErrors: ' source(s) failed: ',
  summaryOverview: ' Overview: ',
  sysPrompt: 'Use the dsh-web-polysearch tool when you need current web information from multiple search engines at once (DeepSeek / DuckDuckGo / Exa / Google / Bing), or to fetch the content of a specific web page by URL. It merges and deduplicates results across the configured backends and returns a structured list with sources. When url is provided instead of query, it fetches the page content directly. Follow up by citing the relevant URLs as markdown links.',
}

/** 当前语言（默认中文，由 client 通过 RPC 同步） */
let currentLocale = 'zh-CN'

/** host 端翻译函数 */
function t(key: string, fallback?: string): string {
  const dict = currentLocale === 'en' ? EN_DICT : ZH_DICT
  return dict[key] ?? fallback ?? key
}

// ── 通用辅助函数 ──────────────────────────────────────────────────────────

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** 将 HTML 转为纯文本：移除 script/style/noscript 块和标签，解码实体。 */
function stripTags(text: string): string {
  return String(text)
    // 先移除 script/style/noscript 块（含内容）
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    // 再移除其余标签
    .replace(/<[^>]*>/g, ' ')
    // 解码常见 HTML 实体
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // 压缩空白
    .replace(/\s+/g, ' ')
    .trim()
}

interface SearchItem {
  url: string
  title: string
  snippet: string
  publishedAt?: string
}

// ── 各后端搜索实现 ─────────────────────────────────────────────────────────

async function searchDeepSeek(ctx: Context, query: string, limit: number): Promise<SearchItem[]> {
  const web = ctx.get('web')
  if (web === undefined) throw new Error(t('errWebService'))
  const result = await web.search({ query, maxResults: limit })
  const sources = Array.isArray(result.sources) ? result.sources : []
  return sources.map((s: { url: string; title?: string; snippet?: string; publishedAt?: string }) => ({
    url: String(s.url),
    title: str(s.title, hostnameOf(String(s.url))),
    snippet: str(s.snippet),
    publishedAt: str(s.publishedAt, undefined),
  }))
}

/** 单次 HTTP GET，返回原始文本。 */
async function fetchText(url: string, timeoutMs = 15000, headers: Record<string, string> = {}): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers: { accept: 'text/html,application/json', ...headers }, signal: controller.signal })
    return await response.text()
  } finally {
    clearTimeout(timer)
  }
}

function parseDuckDuckGo(html: string, limit: number): SearchItem[] {
  const out: SearchItem[] = []
  const seen = new Set<string>()
  const re = /<a[^>]+class=["']result__a["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && out.length < limit) {
    const rawHref = m[1]
    const title = stripTags(m[2])
    let url = rawHref
    const uddg = url.match(/uddg=([^&]+)/)
    if (uddg !== null) url = decodeURIComponent(uddg[1])
    if (url.startsWith('//')) url = 'https:' + url
    if (!url.startsWith('http') || seen.has(url)) continue
    seen.add(url)
    out.push({ url, title: title.length > 0 ? title : hostnameOf(url), snippet: '' })
  }
  return out
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

async function searchDuckDuckGo(query: string, limit: number): Promise<SearchItem[]> {
  const html = await fetchText('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), 15000, { 'user-agent': UA })
  return parseDuckDuckGo(html, limit)
}

/**
 * Exa MCP (streamable-http JSON-RPC) 客户端：initialize → initialized →
 * tools/call。直连 Exa 的免 Key MCP 端点 (https://mcp.exa.ai/mcp)。
 */
async function exaMcpSearch(query: string, limit: number): Promise<SearchItem[]> {
  const endpoint = 'https://mcp.exa.ai/mcp'
  const initBody = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'dsh-web-polysearch', version: '0.1.1' },
    },
  })
  const initResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: initBody,
  })
  let sessionId = initResponse.headers.get('mcp-session-id') ?? ''
  const initPayload = parseMcpResult(await initResponse.text())
  if (initPayload.id !== 1 || initPayload.error !== undefined) {
    throw new Error('Exa MCP initialize failed: ' + JSON.stringify(initPayload.error ?? initPayload))
  }

  const notify = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(sessionId.length > 0 ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
  })
  if (sessionId.length === 0) sessionId = notify.headers.get('mcp-session-id') ?? ''

  const callResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(sessionId.length > 0 ? { 'mcp-session-id': sessionId } : {}),
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'web_search_exa',
        arguments: { query, numResults: limit },
      },
    }),
  })
  const raw = await callResponse.text()
  const payload = parseMcpResult(raw)
  if (payload.error !== undefined) throw new Error('Exa MCP search failed: ' + JSON.stringify(payload.error))
  const content = payload.result?.content
  if (!Array.isArray(content)) return []
  // content items 是 MCP 文本块；structuredContent（如有）信息更丰富。
  const items: SearchItem[] = []
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') {
      const text = block.text
      // Exa 响应格式: "Title: ...\nURL: ...\nPublished: ...\nAuthor: ...\nHighlights:\n..."
      // 结果间以 "\n---\n" 分隔
      for (const segment of text.split('\n---\n')) {
        if (items.length >= limit) break
        const lines = segment.split('\n')
        let title = ''
        let url = ''
        let publishedAt = ''
        let inHighlights = false
        const highlightLines: string[] = []
        for (const line of lines) {
          const tl = line.trim()
          if (tl.startsWith('Title: ')) { title = tl.slice(7).trim(); continue }
          if (tl.startsWith('URL: ')) { url = tl.slice(5).trim(); continue }
          if (tl.startsWith('Published: ')) { publishedAt = tl.slice(11).trim(); continue }
          if (tl.startsWith('Highlights:') || tl.startsWith('Highlights :')) { inHighlights = true; continue }
          if (inHighlights && tl.length > 0) highlightLines.push(tl)
        }
        if (url.length === 0 || !url.startsWith('http')) continue
        const snippet = highlightLines.join(' ').slice(0, 300)
        items.push({
          url,
          title: title.length > 0 ? title : hostnameOf(url),
          snippet,
          publishedAt: publishedAt.length > 0 && publishedAt !== 'N/A' ? publishedAt : undefined,
        })
      }
    }
  }
  if (items.length > 0) return items.slice(0, limit)
  const structured = payload.result?.structuredContent
  if (structured !== null && typeof structured === 'object') {
    const results = (structured as { results?: unknown[] }).results
    if (Array.isArray(results)) {
      for (const r of results.slice(0, limit)) {
        if (r === null || typeof r !== 'object') continue
        const rec = r as Record<string, unknown>
        const url = str(rec.url || rec.link)
        if (url.length === 0) continue
        items.push({
          url,
          title: str(rec.title || rec.name, hostnameOf(url)),
          snippet: str(rec.snippet || rec.text || rec.summary),
          publishedAt: str(rec.publishedDate || rec.publishedAt, undefined),
        })
      }
    }
  }
  if (items.length > 0) return items
  // 回退：文本负载可能是 JSON，尝试解析。
  for (const block of content) {
    if (block.type === 'text' && typeof block.text === 'string') {
      const text = block.text.trim()
      if (text.length === 0) continue
      if (text.startsWith('{') || text.startsWith('[')) {
        try {
          const parsed = JSON.parse(text)
          const results = Array.isArray(parsed) ? parsed : (parsed as { results?: unknown[] }).results
          if (Array.isArray(results)) {
            for (const r of results.slice(0, limit)) {
              if (r === null || typeof r !== 'object') continue
              const rec = r as Record<string, unknown>
              const url = str(rec.url || rec.link)
              if (url.length === 0) continue
              items.push({
                url,
                title: str(rec.title || rec.name, hostnameOf(url)),
                snippet: str(rec.snippet || rec.text),
                publishedAt: str(rec.publishedDate || rec.publishedAt, undefined),
              })
            }
          }
        } catch {
          // not JSON; ignore
        }
        break
      }
    }
  }
  return items
}

/** 解析 MCP JSON-RPC 响应，支持纯 JSON 和 SSE 帧格式。 */
function parseMcpResult(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  // 先尝试直接 JSON.parse（含 try-catch，SSE 文本会跳过）
  try {
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return JSON.parse(trimmed) as Record<string, unknown>
  } catch { /* fall through to SSE parsing */ }
  // SSE 帧格式：`data: {...}`（事件流）或 `event: message`。
  const lines = trimmed.split(/\r?\n/)
  const dataLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  }
  if (dataLines.length > 0) {
    const joined = dataLines.join('')
    if (joined.length > 0) {
      try {
        return JSON.parse(joined) as Record<string, unknown>
      } catch {
        // fall through
      }
    }
  }
  throw new Error('unparseable MCP response: ' + raw.slice(0, 500))
}

async function searchGoogle(query: string, limit: number, config: Config): Promise<SearchItem[]> {
  const key = str(config.googleApiKey)
  const cx = str(config.googleCx)
  if (key.length === 0) throw new Error(t('errGoogleKey'))
  if (cx.length === 0) throw new Error(t('errGoogleCx'))
  const url = 'https://www.googleapis.com/customsearch/v1?key=' + encodeURIComponent(key)
    + '&cx=' + encodeURIComponent(cx)
    + '&q=' + encodeURIComponent(query)
    + '&num=' + Math.min(limit, 10)
  const text = await fetchText(url, 20000, { 'user-agent': UA })
  let data: { items?: Array<{ link?: string; title?: string; snippet?: string }> }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    throw new Error(t('errGoogleParse'))
  }
  const items = Array.isArray(data.items) ? data.items : []
  return items.map(item => ({
    url: str(item.link),
    title: str(item.title, hostnameOf(str(item.link))),
    snippet: str(item.snippet),
  })).filter(item => item.url.length > 0)
}

async function searchBing(query: string, limit: number, config: Config): Promise<SearchItem[]> {
  const key = str(config.bingApiKey)
  if (key.length === 0) throw new Error(t('errBingKey'))
  const url = 'https://api.bing.microsoft.com/v7.0/search?q=' + encodeURIComponent(query) + '&count=' + Math.min(limit, 50)
  const text = await fetchText(url, 20000, { 'Ocp-Apim-Subscription-Key': key, 'user-agent': UA })
  let data: { webPages?: { value?: Array<{ url?: string; name?: string; snippet?: string; datePublished?: string }> } }
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    throw new Error(t('errBingParse'))
  }
  const results = data.webPages?.value ?? []
  return results.map(item => ({
    url: str(item.url),
    title: str(item.name, hostnameOf(str(item.url))),
    snippet: str(item.snippet),
    publishedAt: str(item.datePublished, undefined),
  })).filter(item => item.url.length > 0)
}

/** 获取指定 URL 的纯文本内容（去除 HTML 标签）。 */
async function fetchPageContent(url: string): Promise<string> {
  const text = await fetchText(url, 20000, { 'user-agent': UA })
  return stripTags(text)
}

// ── 插件入口 ───────────────────────────────────────────────────────────────

export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config

  // 保存工具和 systemPrompt 的 dispose 函数，以便 locale 变化时重新注册
  let disposeTool: (() => void) | undefined
  let disposePrompt: (() => void) | undefined

  // 注册工具（描述跟随当前语言）
  function registerTool() {
    if (disposeTool !== undefined) disposeTool()
    if (disposePrompt !== undefined) disposePrompt()
    const tool = defineTool({
      name: 'dsh-web-polysearch',
      description: t('toolDesc'),
      parameters: {
        query: { type: 'string', description: t('paramQuery') },
        url: { type: 'string', description: t('paramUrl') },
        maxResults: { type: 'integer', description: t('paramMaxResults') },
        fetchContent: { type: 'boolean', description: t('paramFetchContent') },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            summary: { type: 'string', required: true },
            sources: {
              type: 'array',
              required: true,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  url: { type: 'string', required: true },
                  title: { type: 'string', required: true },
                  snippet: { type: 'string' },
                  publishedAt: { type: 'string' },
                  source: { type: 'string', required: true },
                  content: { type: 'string' },
                },
              },
            },
            sourceErrors: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  source: { type: 'string', required: true },
                  error: { type: 'string', required: true },
                },
              },
            },
            searchedSources: { type: 'array', items: { type: 'string' }, required: true },
          },
        },
        render: (_args, value) => [{ type: 'text', text: formatResult(value) }],
      },
      timeoutMs: 60000,
      isConcurrencySafe: () => true,
      async execute(args) {
        // 每次执行时从配置中读取最新 locale
        const cfg = current()
        if (typeof cfg.locale === 'string' && cfg.locale.length > 0) currentLocale = cfg.locale

        const query = str(args.query).trim()
        const pageUrl = str(args.url).trim()
        if (query.length === 0 && pageUrl.length === 0) throw new Error(t('errNoQueryOrUrl'))
        const limit = num(args.maxResults, cfg.maxResults)
        const fetchContent = bool(args.fetchContent, cfg.fetchContent)
        const fetchCount = Math.min(cfg.fetchCount, 5)

        // 直接获取页面内容模式
        if (pageUrl.length > 0) {
          const content = await fetchPageContent(pageUrl)
          return {
            summary: `${t('resultFetchSummary')}（${pageUrl}）`,
            sources: [{
              url: pageUrl,
              title: hostnameOf(pageUrl),
              snippet: '',
              source: 'fetch',
              content,
            }],
            sourceErrors: [],
            searchedSources: ['fetch'],
          }
        }

        // 多源搜索模式——并行查询所有已配置后端
        const merged: Array<SearchItem & { source: string; content?: string }> = []
        const seenUrls = new Set<string>()
        const sourceErrors: Array<{ source: string; error: string }> = []
        const wantSources = cfg.sources
        const searchedSources = wantSources
        // 每个后端请求足够多的结果以便合并去重后仍有富余
        const fetchLimit = Math.max(limit, 20)

        const runBackend = async (source: SourceId): Promise<SearchItem[]> => {
          switch (source) {
            case 'deepseek': return await searchDeepSeek(ctx, query, fetchLimit)
            case 'duckduckgo': return await searchDuckDuckGo(query, fetchLimit)
            case 'exa': return await exaMcpSearch(query, fetchLimit)
            case 'google': return await searchGoogle(query, fetchLimit, cfg)
            case 'bing': return await searchBing(query, fetchLimit, cfg)
          }
        }

        // 并行发起所有搜索请求
        const results = await Promise.allSettled(wantSources.map(s => runBackend(s)))

        // 按配置顺序合并结果（保持来源优先级）
        for (let i = 0; i < wantSources.length; i++) {
          const source = wantSources[i]
          const result = results[i]
          if (result.status === 'fulfilled') {
            for (const item of result.value) {
              if (item.url.length === 0 || seenUrls.has(item.url)) continue
              seenUrls.add(item.url)
              merged.push({ ...item, source })
            }
          } else {
            const error = result.reason
            sourceErrors.push({ source, error: error instanceof Error ? error.message : String(error) })
          }
        }

        // 截断到用户请求的数量上限
        if (merged.length > limit) merged.length = limit

        if (fetchContent && merged.length > 0) {
          const toFetch = merged.slice(0, fetchCount)
          await Promise.all(toFetch.map(async (item) => {
            try {
              item.content = await fetchPageContent(item.url)
            } catch (error) {
              item.content = t('errFetchFail') + (error instanceof Error ? error.message : String(error))
            }
          }))
        }

        const summaryParts = merged.slice(0, 5)
          .map(item => (item.snippet.length > 0 ? `${item.title}：${item.snippet.slice(0, 120)}` : ''))
          .filter(part => part.length > 0)
        let summary = `${t('summaryFound')} ${merged.length} ${t('summaryResults')}${searchedSources.join(', ')}）。`
        if (summaryParts.length > 0) summary += `${t('summaryOverview')}${summaryParts.join(' | ').slice(0, 600)}`
        if (sourceErrors.length > 0) {
          summary += ` ${sourceErrors.length}${t('summaryErrors')}${sourceErrors.map(e => e.source).join(', ')}。`
        }

        return {
          summary,
          sources: merged.map(item => ({
            url: item.url,
            title: item.title,
            snippet: item.snippet,
            ...item.publishedAt !== undefined && item.publishedAt.length > 0 ? { publishedAt: item.publishedAt } : {},
            source: item.source,
            ...item.content !== undefined ? { content: item.content } : {},
          })),
          sourceErrors,
          searchedSources,
        }
      },
    })
    disposeTool = ctx.tools.register(tool)
    disposePrompt = ctx.systemPrompt.section({
      name: 'tool:dsh-web-polysearch',
      order: 112,
      text: t('sysPrompt'),
    })
  }

  // 设置支撑的配置：组合入口是基础层，每次提交的变更会更新活跃 thunk。
  // 每次提交的变更更新后续工具调用使用的配置 thunk。
  let prevLocale = currentLocale
  installSettingsSection(ctx, SETTINGS_NAMESPACE, Config, config, {
    setSource: (source) => {
      current = source
      // 同步 locale 到模块级变量
      const cfg = current()
      if (typeof cfg.locale === 'string' && cfg.locale.length > 0) {
        currentLocale = cfg.locale
        // locale 变化时重新注册工具（更新描述等）
        if (currentLocale !== prevLocale) {
          prevLocale = currentLocale
          registerTool()
        }
      }
    },
    onChange: () => {},
  })

  // 初始注册工具
  registerTool()
  ctx.effect(() => () => {
    if (disposeTool !== undefined) disposeTool()
    if (disposePrompt !== undefined) disposePrompt()
  }, 'dsh-web-polysearch: tool dispose')
}

/** 渲染工具结果为模型可读的 Markdown。 */
function formatResult(value: unknown): string {
  const v = value !== null && typeof value === 'object' ? value as Record<string, unknown> : {}
  const lines: string[] = [t('resultTitle'), '']
  lines.push(`**${t('resultSummary') === 'None' ? 'Summary' : '摘要'}**：${str(v.summary, t('resultSummary'))}`)
  lines.push('')
  const srcList = Array.isArray(v.sources) ? v.sources as Array<Record<string, unknown>> : []
  srcList.forEach((s, i) => {
    const url = str(s.url)
    const title = str(s.title, hostnameOf(url))
    const source = str(s.source, '?')
    if (source === 'fetch') {
      // 直接获取页面模式——内联展示正文
      lines.push(`[${title}](${url})`)
      if (typeof s.content === 'string' && s.content.length > 0) {
        lines.push('', '```', s.content, '```')
      }
      return
    }
    lines.push(`${i + 1}. [${title}](${url})`)
    lines.push(`   ${t('resultSource')}：\`${source}\``)
    if (str(s.snippet).length > 0) lines.push(`   ${str(s.snippet)}`)
    if (typeof s.content === 'string' && s.content.length > 0) lines.push(`   > ${s.content.slice(0, 300)}`)
  })
  const errs = Array.isArray(v.sourceErrors) ? v.sourceErrors as Array<Record<string, unknown>> : []
  if (errs.length > 0) {
    lines.push('', t('resultErrorsTitle'))
    for (const e of errs) lines.push(`- \`${str(e.source, '?')}\`: ${str(e.error, t('resultUnknownError'))}`)
  }
  return lines.join('\n')
}