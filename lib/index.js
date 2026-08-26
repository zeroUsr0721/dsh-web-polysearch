import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/index.ts
/** Cordis 插件名，供加载器诊断用。 */
const name = "dsh-web-polysearch";
/** 插件依赖的 host 端服务。 */
const inject = [
	"web",
	"tools",
	"systemPrompt",
	"settings"
];
/** 持久化设置命名空间。 */
const SETTINGS_NAMESPACE = settingsNamespace("dsh-web-polysearch");
/** 后端 ID 列表，按展示顺序排列。 */
const SOURCE_IDS = [
	"deepseek",
	"duckduckgo",
	"exa",
	"google",
	"bing"
];
const Config = z.object({
	sources: z.array(z.union(SOURCE_IDS.map((id) => z.const(id)))).default([...SOURCE_IDS]),
	maxResults: z.number().step(1).min(1).max(50).default(8),
	fetchContent: z.boolean().default(false),
	fetchCount: z.number().step(1).min(1).max(5).default(3),
	googleApiKey: z.string().role("secret"),
	googleCx: z.string(),
	bingApiKey: z.string().role("secret"),
	locale: z.string().default("zh-CN")
});
/** 中文词典 */
const ZH_DICT = {
	toolDesc: "多源联网搜索或获取指定网页内容。传入 query 搜索多个搜索引擎；传入 url 则直接获取指定网页的正文内容。",
	paramQuery: "搜索关键词或自然语言问题（与 url 二选一）",
	paramUrl: "要获取内容的网页 URL（与 query 二选一）",
	paramMaxResults: "返回结果总数上限（默认取设置值）",
	paramFetchContent: "是否抓取最相关前几条的正文（默认取设置值）",
	errNoQueryOrUrl: "query 或 url 至少提供一个",
	errGoogleKey: "Google API key 未配置（设置页填写）",
	errGoogleCx: "Google Search Engine ID (cx) 未配置（设置页填写）",
	errBingKey: "Bing API key 未配置（设置页填写）",
	errGoogleParse: "Google 返回了非 JSON 响应（可能为错误页面）",
	errBingParse: "Bing 返回了非 JSON 响应（可能为错误页面）",
	errWebService: "web service unavailable",
	errFetchFail: "[抓取失败] ",
	resultTitle: "### 多源搜索结果",
	resultSummary: "无",
	resultSource: "来源",
	resultFetchSummary: "获取到页面内容",
	resultErrorsTitle: "**部分来源失败**：",
	resultUnknownError: "未知错误",
	summaryFound: "搜索到",
	summaryResults: "条结果（来源：",
	summaryErrors: " 个来源搜索失败：",
	summaryOverview: " 概览：",
	sysPrompt: "Use the dsh-web-polysearch tool when you need current web information from multiple search engines at once (DeepSeek / DuckDuckGo / Exa / Google / Bing), or to fetch the content of a specific web page by URL. It merges and deduplicates results across the configured backends and returns a structured list with sources. When url is provided instead of query, it fetches the page content directly. Follow up by citing the relevant URLs as markdown links."
};
/** 英文词典 */
const EN_DICT = {
	toolDesc: "Multi-source web search or fetch a specific page. Pass query to search multiple engines; pass url to fetch page content directly.",
	paramQuery: "Search keywords or natural language question (one of query/url)",
	paramUrl: "URL of the page to fetch content from (one of query/url)",
	paramMaxResults: "Max results to return (defaults to settings value)",
	paramFetchContent: "Whether to fetch body text for top results (defaults to settings value)",
	errNoQueryOrUrl: "At least one of query or url must be provided",
	errGoogleKey: "Google API key not configured (set in settings page)",
	errGoogleCx: "Google Search Engine ID (cx) not configured (set in settings page)",
	errBingKey: "Bing API key not configured (set in settings page)",
	errGoogleParse: "Google returned a non-JSON response (possibly an error page)",
	errBingParse: "Bing returned a non-JSON response (possibly an error page)",
	errWebService: "web service unavailable",
	errFetchFail: "[fetch failed] ",
	resultTitle: "### Multi-Source Search Results",
	resultSummary: "None",
	resultSource: "source",
	resultFetchSummary: "Fetched page content",
	resultErrorsTitle: "**Some sources failed**:",
	resultUnknownError: "unknown error",
	summaryFound: "Found",
	summaryResults: " results (sources: ",
	summaryErrors: " source(s) failed: ",
	summaryOverview: " Overview: ",
	sysPrompt: "Use the dsh-web-polysearch tool when you need current web information from multiple search engines at once (DeepSeek / DuckDuckGo / Exa / Google / Bing), or to fetch the content of a specific web page by URL. It merges and deduplicates results across the configured backends and returns a structured list with sources. When url is provided instead of query, it fetches the page content directly. Follow up by citing the relevant URLs as markdown links."
};
/** 当前语言（默认中文，由 client 通过 RPC 同步） */
let currentLocale = "zh-CN";
/** host 端翻译函数 */
function t(key, fallback) {
	return (currentLocale === "en" ? EN_DICT : ZH_DICT)[key] ?? fallback ?? key;
}
function str(value, fallback = "") {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}
function num(value, fallback) {
	return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
function bool(value, fallback) {
	return typeof value === "boolean" ? value : fallback;
}
function hostnameOf(url) {
	try {
		return new URL(url).hostname;
	} catch {
		return url;
	}
}
/** 将 HTML 转为纯文本：移除 script/style/noscript 块和标签，解码实体。 */
function stripTags(text) {
	return String(text).replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
async function searchDeepSeek(ctx, query, limit) {
	const web = ctx.get("web");
	if (web === void 0) throw new Error(t("errWebService"));
	const result = await web.search({
		query,
		maxResults: limit
	});
	return (Array.isArray(result.sources) ? result.sources : []).map((s) => ({
		url: String(s.url),
		title: str(s.title, hostnameOf(String(s.url))),
		snippet: str(s.snippet),
		publishedAt: str(s.publishedAt, void 0)
	}));
}
/** 单次 HTTP GET，返回原始文本。 */
async function fetchText(url, timeoutMs = 15e3, headers = {}) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await (await fetch(url, {
			headers: {
				accept: "text/html,application/json",
				...headers
			},
			signal: controller.signal
		})).text();
	} finally {
		clearTimeout(timer);
	}
}
function parseDuckDuckGo(html, limit) {
	const out = [];
	const seen = /* @__PURE__ */ new Set();
	const re = /<a[^>]+class=["']result__a["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g;
	let m;
	while ((m = re.exec(html)) !== null && out.length < limit) {
		const rawHref = m[1];
		const title = stripTags(m[2]);
		let url = rawHref;
		const uddg = url.match(/uddg=([^&]+)/);
		if (uddg !== null) url = decodeURIComponent(uddg[1]);
		if (url.startsWith("//")) url = "https:" + url;
		if (!url.startsWith("http") || seen.has(url)) continue;
		seen.add(url);
		out.push({
			url,
			title: title.length > 0 ? title : hostnameOf(url),
			snippet: ""
		});
	}
	return out;
}
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
async function searchDuckDuckGo(query, limit) {
	return parseDuckDuckGo(await fetchText("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), 15e3, { "user-agent": UA }), limit);
}
/**
* Exa MCP (streamable-http JSON-RPC) 客户端：initialize → initialized →
* tools/call。直连 Exa 的免 Key MCP 端点 (https://mcp.exa.ai/mcp)。
*/
async function exaMcpSearch(query, limit) {
	const endpoint = "https://mcp.exa.ai/mcp";
	const initBody = JSON.stringify({
		jsonrpc: "2.0",
		id: 1,
		method: "initialize",
		params: {
			protocolVersion: "2025-06-18",
			capabilities: {},
			clientInfo: {
				name: "dsh-web-polysearch",
				version: "0.1.1"
			}
		}
	});
	const initResponse = await fetch(endpoint, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream"
		},
		body: initBody
	});
	let sessionId = initResponse.headers.get("mcp-session-id") ?? "";
	const initPayload = parseMcpResult(await initResponse.text());
	if (initPayload.id !== 1 || initPayload.error !== void 0) throw new Error("Exa MCP initialize failed: " + JSON.stringify(initPayload.error ?? initPayload));
	const notify = await fetch(endpoint, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			...sessionId.length > 0 ? { "mcp-session-id": sessionId } : {}
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			method: "notifications/initialized"
		})
	});
	if (sessionId.length === 0) sessionId = notify.headers.get("mcp-session-id") ?? "";
	const payload = parseMcpResult(await (await fetch(endpoint, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
			...sessionId.length > 0 ? { "mcp-session-id": sessionId } : {}
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: {
				name: "web_search_exa",
				arguments: {
					query,
					numResults: limit
				}
			}
		})
	})).text());
	if (payload.error !== void 0) throw new Error("Exa MCP search failed: " + JSON.stringify(payload.error));
	const content = payload.result?.content;
	if (!Array.isArray(content)) return [];
	const items = [];
	for (const block of content) if (block.type === "text" && typeof block.text === "string") {
		const text = block.text;
		for (const segment of text.split("\n---\n")) {
			if (items.length >= limit) break;
			const lines = segment.split("\n");
			let title = "";
			let url = "";
			let publishedAt = "";
			let inHighlights = false;
			const highlightLines = [];
			for (const line of lines) {
				const tl = line.trim();
				if (tl.startsWith("Title: ")) {
					title = tl.slice(7).trim();
					continue;
				}
				if (tl.startsWith("URL: ")) {
					url = tl.slice(5).trim();
					continue;
				}
				if (tl.startsWith("Published: ")) {
					publishedAt = tl.slice(11).trim();
					continue;
				}
				if (tl.startsWith("Highlights:") || tl.startsWith("Highlights :")) {
					inHighlights = true;
					continue;
				}
				if (inHighlights && tl.length > 0) highlightLines.push(tl);
			}
			if (url.length === 0 || !url.startsWith("http")) continue;
			const snippet = highlightLines.join(" ").slice(0, 300);
			items.push({
				url,
				title: title.length > 0 ? title : hostnameOf(url),
				snippet,
				publishedAt: publishedAt.length > 0 && publishedAt !== "N/A" ? publishedAt : void 0
			});
		}
	}
	if (items.length > 0) return items.slice(0, limit);
	const structured = payload.result?.structuredContent;
	if (structured !== null && typeof structured === "object") {
		const results = structured.results;
		if (Array.isArray(results)) for (const r of results.slice(0, limit)) {
			if (r === null || typeof r !== "object") continue;
			const rec = r;
			const url = str(rec.url || rec.link);
			if (url.length === 0) continue;
			items.push({
				url,
				title: str(rec.title || rec.name, hostnameOf(url)),
				snippet: str(rec.snippet || rec.text || rec.summary),
				publishedAt: str(rec.publishedDate || rec.publishedAt, void 0)
			});
		}
	}
	if (items.length > 0) return items;
	for (const block of content) if (block.type === "text" && typeof block.text === "string") {
		const text = block.text.trim();
		if (text.length === 0) continue;
		if (text.startsWith("{") || text.startsWith("[")) {
			try {
				const parsed = JSON.parse(text);
				const results = Array.isArray(parsed) ? parsed : parsed.results;
				if (Array.isArray(results)) for (const r of results.slice(0, limit)) {
					if (r === null || typeof r !== "object") continue;
					const rec = r;
					const url = str(rec.url || rec.link);
					if (url.length === 0) continue;
					items.push({
						url,
						title: str(rec.title || rec.name, hostnameOf(url)),
						snippet: str(rec.snippet || rec.text),
						publishedAt: str(rec.publishedDate || rec.publishedAt, void 0)
					});
				}
			} catch {}
			break;
		}
	}
	return items;
}
/** 解析 MCP JSON-RPC 响应，支持纯 JSON 和 SSE 帧格式。 */
function parseMcpResult(raw) {
	const trimmed = raw.trim();
	try {
		if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed);
	} catch {}
	const lines = trimmed.split(/\r?\n/);
	const dataLines = [];
	for (const line of lines) if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
	if (dataLines.length > 0) {
		const joined = dataLines.join("");
		if (joined.length > 0) try {
			return JSON.parse(joined);
		} catch {}
	}
	throw new Error("unparseable MCP response: " + raw.slice(0, 500));
}
async function searchGoogle(query, limit, config) {
	const key = str(config.googleApiKey);
	const cx = str(config.googleCx);
	if (key.length === 0) throw new Error(t("errGoogleKey"));
	if (cx.length === 0) throw new Error(t("errGoogleCx"));
	const text = await fetchText("https://www.googleapis.com/customsearch/v1?key=" + encodeURIComponent(key) + "&cx=" + encodeURIComponent(cx) + "&q=" + encodeURIComponent(query) + "&num=" + Math.min(limit, 10), 2e4, { "user-agent": UA });
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error(t("errGoogleParse"));
	}
	return (Array.isArray(data.items) ? data.items : []).map((item) => ({
		url: str(item.link),
		title: str(item.title, hostnameOf(str(item.link))),
		snippet: str(item.snippet)
	})).filter((item) => item.url.length > 0);
}
async function searchBing(query, limit, config) {
	const key = str(config.bingApiKey);
	if (key.length === 0) throw new Error(t("errBingKey"));
	const text = await fetchText("https://api.bing.microsoft.com/v7.0/search?q=" + encodeURIComponent(query) + "&count=" + Math.min(limit, 50), 2e4, {
		"Ocp-Apim-Subscription-Key": key,
		"user-agent": UA
	});
	let data;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error(t("errBingParse"));
	}
	return (data.webPages?.value ?? []).map((item) => ({
		url: str(item.url),
		title: str(item.name, hostnameOf(str(item.url))),
		snippet: str(item.snippet),
		publishedAt: str(item.datePublished, void 0)
	})).filter((item) => item.url.length > 0);
}
/** 获取指定 URL 的纯文本内容（去除 HTML 标签）。 */
async function fetchPageContent(url) {
	return stripTags(await fetchText(url, 2e4, { "user-agent": UA }));
}
function apply(ctx, config) {
	let current = () => config;
	let disposeTool;
	let disposePrompt;
	function registerTool() {
		if (disposeTool !== void 0) disposeTool();
		if (disposePrompt !== void 0) disposePrompt();
		const tool = defineTool({
			name: "dsh-web-polysearch",
			description: t("toolDesc"),
			parameters: {
				query: {
					type: "string",
					description: t("paramQuery")
				},
				url: {
					type: "string",
					description: t("paramUrl")
				},
				maxResults: {
					type: "integer",
					description: t("paramMaxResults")
				},
				fetchContent: {
					type: "boolean",
					description: t("paramFetchContent")
				}
			},
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						summary: {
							type: "string",
							required: true
						},
						sources: {
							type: "array",
							required: true,
							items: {
								type: "object",
								additionalProperties: false,
								properties: {
									url: {
										type: "string",
										required: true
									},
									title: {
										type: "string",
										required: true
									},
									snippet: { type: "string" },
									publishedAt: { type: "string" },
									source: {
										type: "string",
										required: true
									},
									content: { type: "string" }
								}
							}
						},
						sourceErrors: {
							type: "array",
							items: {
								type: "object",
								additionalProperties: false,
								properties: {
									source: {
										type: "string",
										required: true
									},
									error: {
										type: "string",
										required: true
									}
								}
							}
						},
						searchedSources: {
							type: "array",
							items: { type: "string" },
							required: true
						}
					}
				},
				render: (_args, value) => [{
					type: "text",
					text: formatResult(value)
				}]
			},
			timeoutMs: 6e4,
			isConcurrencySafe: () => true,
			async execute(args) {
				const cfg = current();
				if (typeof cfg.locale === "string" && cfg.locale.length > 0) currentLocale = cfg.locale;
				const query = str(args.query).trim();
				const pageUrl = str(args.url).trim();
				if (query.length === 0 && pageUrl.length === 0) throw new Error(t("errNoQueryOrUrl"));
				const limit = num(args.maxResults, cfg.maxResults);
				const fetchContent = bool(args.fetchContent, cfg.fetchContent);
				const fetchCount = Math.min(cfg.fetchCount, 5);
				if (pageUrl.length > 0) {
					const content = await fetchPageContent(pageUrl);
					return {
						summary: `${t("resultFetchSummary")}（${pageUrl}）`,
						sources: [{
							url: pageUrl,
							title: hostnameOf(pageUrl),
							snippet: "",
							source: "fetch",
							content
						}],
						sourceErrors: [],
						searchedSources: ["fetch"]
					};
				}
				const merged = [];
				const seenUrls = /* @__PURE__ */ new Set();
				const sourceErrors = [];
				const wantSources = cfg.sources;
				const searchedSources = wantSources;
				const fetchLimit = Math.max(limit, 20);
				const runBackend = async (source) => {
					switch (source) {
						case "deepseek": return await searchDeepSeek(ctx, query, fetchLimit);
						case "duckduckgo": return await searchDuckDuckGo(query, fetchLimit);
						case "exa": return await exaMcpSearch(query, fetchLimit);
						case "google": return await searchGoogle(query, fetchLimit, cfg);
						case "bing": return await searchBing(query, fetchLimit, cfg);
					}
				};
				const results = await Promise.allSettled(wantSources.map((s) => runBackend(s)));
				for (let i = 0; i < wantSources.length; i++) {
					const source = wantSources[i];
					const result = results[i];
					if (result.status === "fulfilled") for (const item of result.value) {
						if (item.url.length === 0 || seenUrls.has(item.url)) continue;
						seenUrls.add(item.url);
						merged.push({
							...item,
							source
						});
					}
					else {
						const error = result.reason;
						sourceErrors.push({
							source,
							error: error instanceof Error ? error.message : String(error)
						});
					}
				}
				if (merged.length > limit) merged.length = limit;
				if (fetchContent && merged.length > 0) {
					const toFetch = merged.slice(0, fetchCount);
					await Promise.all(toFetch.map(async (item) => {
						try {
							item.content = await fetchPageContent(item.url);
						} catch (error) {
							item.content = t("errFetchFail") + (error instanceof Error ? error.message : String(error));
						}
					}));
				}
				const summaryParts = merged.slice(0, 5).map((item) => item.snippet.length > 0 ? `${item.title}：${item.snippet.slice(0, 120)}` : "").filter((part) => part.length > 0);
				let summary = `${t("summaryFound")} ${merged.length} ${t("summaryResults")}${searchedSources.join(", ")}）。`;
				if (summaryParts.length > 0) summary += `${t("summaryOverview")}${summaryParts.join(" | ").slice(0, 600)}`;
				if (sourceErrors.length > 0) summary += ` ${sourceErrors.length}${t("summaryErrors")}${sourceErrors.map((e) => e.source).join(", ")}。`;
				return {
					summary,
					sources: merged.map((item) => ({
						url: item.url,
						title: item.title,
						snippet: item.snippet,
						...item.publishedAt !== void 0 && item.publishedAt.length > 0 ? { publishedAt: item.publishedAt } : {},
						source: item.source,
						...item.content !== void 0 ? { content: item.content } : {}
					})),
					sourceErrors,
					searchedSources
				};
			}
		});
		disposeTool = ctx.tools.register(tool);
		disposePrompt = ctx.systemPrompt.section({
			name: "tool:dsh-web-polysearch",
			order: 112,
			text: t("sysPrompt")
		});
	}
	let prevLocale = currentLocale;
	installSettingsSection(ctx, SETTINGS_NAMESPACE, Config, config, {
		setSource: (source) => {
			current = source;
			const cfg = current();
			if (typeof cfg.locale === "string" && cfg.locale.length > 0) {
				currentLocale = cfg.locale;
				if (currentLocale !== prevLocale) {
					prevLocale = currentLocale;
					registerTool();
				}
			}
		},
		onChange: () => {}
	});
	registerTool();
	ctx.effect(() => () => {
		if (disposeTool !== void 0) disposeTool();
		if (disposePrompt !== void 0) disposePrompt();
	}, "dsh-web-polysearch: tool dispose");
}
/** 渲染工具结果为模型可读的 Markdown。 */
function formatResult(value) {
	const v = value !== null && typeof value === "object" ? value : {};
	const lines = [t("resultTitle"), ""];
	lines.push(`**${t("resultSummary") === "None" ? "Summary" : "摘要"}**：${str(v.summary, t("resultSummary"))}`);
	lines.push("");
	(Array.isArray(v.sources) ? v.sources : []).forEach((s, i) => {
		const url = str(s.url);
		const title = str(s.title, hostnameOf(url));
		const source = str(s.source, "?");
		if (source === "fetch") {
			lines.push(`[${title}](${url})`);
			if (typeof s.content === "string" && s.content.length > 0) lines.push("", "```", s.content, "```");
			return;
		}
		lines.push(`${i + 1}. [${title}](${url})`);
		lines.push(`   ${t("resultSource")}：\`${source}\``);
		if (str(s.snippet).length > 0) lines.push(`   ${str(s.snippet)}`);
		if (typeof s.content === "string" && s.content.length > 0) lines.push(`   > ${s.content.slice(0, 300)}`);
	});
	const errs = Array.isArray(v.sourceErrors) ? v.sourceErrors : [];
	if (errs.length > 0) {
		lines.push("", t("resultErrorsTitle"));
		for (const e of errs) lines.push(`- \`${str(e.source, "?")}\`: ${str(e.error, t("resultUnknownError"))}`);
	}
	return lines.join("\n");
}
//#endregion
export { Config, SETTINGS_NAMESPACE, SOURCE_IDS, apply, inject, name };
