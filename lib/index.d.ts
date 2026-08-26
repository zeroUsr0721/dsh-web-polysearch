import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/index.d.ts
/** Cordis 插件名，供加载器诊断用。 */
declare const name = "dsh-web-polysearch";
/** 插件依赖的 host 端服务。 */
declare const inject: string[];
/** 持久化设置命名空间。 */
declare const SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** 后端 ID 列表，按展示顺序排列。 */
declare const SOURCE_IDS: readonly ["deepseek", "duckduckgo", "exa", "google", "bing"];
type SourceId = (typeof SOURCE_IDS)[number];
/** 插件配置：启用的后端（有序）、默认结果上限和密钥。 */
interface Config {
  /** 启用的后端，按搜索顺序排列。 */
  sources: SourceId[];
  /** 单次返回合并结果的上限。 */
  maxResults: number;
  /** 是否默认抓取前几条结果的正文。 */
  fetchContent: boolean;
  /** 抓取正文时取前几条。 */
  fetchCount: number;
  /** Google Custom Search API key（密钥）。 */
  googleApiKey?: string;
  /** Google Custom Search 引擎 ID。 */
  googleCx?: string;
  /** Bing Web Search API key（密钥）。 */
  bingApiKey?: string;
  /** 当前 UI 语言（由 client 同步，供 host 端 i18n 使用）。 */
  locale?: string;
}
declare const Config: z<Config>;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, SETTINGS_NAMESPACE, SOURCE_IDS, SourceId, apply, inject, name };