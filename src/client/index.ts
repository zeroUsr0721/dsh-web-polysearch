/**
 * dsh-web-polysearch — 浏览器端：Web 搜索设置页面。
 * 卡片式 UI：可折叠卡片、开关、各后端密钥输入。
 * 支持 i18n（中/英文），通过 locale 服务注册翻译字典。
 *
 * @module dsh-web-polysearch/client
 */

import { createElement, Fragment, useEffect, useState } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'

const NS = 'dsh-web-polysearch'

// ── i18n 词典 ────────────────────────────────────────────────────────────────

/** 翻译函数类型 */
type Translate = (key: string, fallback?: string) => string

/** locale 服务的最小接口 */
interface LocaleService {
  getLocale(): { id: string }
  subscribe(fn: () => void): () => void
  bind(ns: string): (key: string) => string
}

/** 中文词典 */
const ZH_DICT: Record<string, string> = {
  title: 'Web 搜索设置',
  defaults: '默认参数',
  maxResults: '最大结果数',
  maxResultsHint: '每次搜索返回结果数量上限',
  fetchContent: '抓取正文',
  fetchContentHint: '搜索时自动抓取前几条结果的正文内容',
  fetchCount: '抓取正文条数',
  fetchCountHint: '抓取前几条结果的正文（最多 5 条）',
  enable: '启用',
  enabledHint: '此来源已启用',
  enableHint: '启用后将在搜索中使用此来源',
  apiKey: 'API Key',
  googleApiKeyHint: 'Google Custom Search API Key',
  googleCx: 'Search Engine ID (cx)',
  googleCxHint: 'Google Custom Search Engine ID',
  bingApiKeyHint: 'Azure Bing Web Search API Key',
  placeholder: '留空保持不变',
  saved: '已保存 ✓',
  saveFailed: '保存失败',
  saving: '保存中…',
  save: '保存设置',
  'desc.deepseek': '启用后将使用系统内置 DeepSeek 搜索',
  'desc.duckduckgo': '免费公开搜索引擎，无需 API Key',
  'desc.exa': '免 Key MCP 端点直连 Exa 搜索引擎',
  'desc.google': 'Google Custom Search API，需 API Key + Search Engine ID',
  'desc.bing': 'Bing Web Search API，需 Azure API Key',
}

/** 英文词典 */
const EN_DICT: Record<string, string> = {
  title: 'Web Search Settings',
  defaults: 'Default Parameters',
  maxResults: 'Max Results',
  maxResultsHint: 'Upper limit on results returned per search',
  fetchContent: 'Fetch Content',
  fetchContentHint: 'Automatically fetch the body text of the top results',
  fetchCount: 'Fetch Count',
  fetchCountHint: 'How many top results to fetch body text for (max 5)',
  enable: 'Enable',
  enabledHint: 'This source is enabled',
  enableHint: 'Enable to use this source in searches',
  apiKey: 'API Key',
  googleApiKeyHint: 'Google Custom Search API Key',
  googleCx: 'Search Engine ID (cx)',
  googleCxHint: 'Google Custom Search Engine ID',
  bingApiKeyHint: 'Azure Bing Web Search API Key',
  placeholder: 'Leave empty to keep unchanged',
  saved: 'Saved ✓',
  saveFailed: 'Save failed',
  saving: 'Saving…',
  save: 'Save Settings',
  'desc.deepseek': 'Uses the built-in DeepSeek search',
  'desc.duckduckgo': 'Free public search engine, no API key required',
  'desc.exa': 'Keyless MCP endpoint directly connects to Exa search',
  'desc.google': 'Google Custom Search API, requires API Key + Search Engine ID',
  'desc.bing': 'Bing Web Search API, requires Azure API Key',
}

interface ConfigView {
  sources: string[]
  maxResults: number
  fetchContent: boolean
  fetchCount: number
}

const ALL_SOURCES = [
  { id: 'deepseek', label: 'DeepSeek', needsKey: false, descKey: 'desc.deepseek' },
  { id: 'duckduckgo', label: 'DuckDuckGo', needsKey: false, descKey: 'desc.duckduckgo' },
  { id: 'exa', label: 'Exa', needsKey: false, descKey: 'desc.exa' },
  { id: 'google', label: 'Google', needsKey: true, descKey: 'desc.google' },
  { id: 'bing', label: 'Bing', needsKey: true, descKey: 'desc.bing' },
]

const DEFAULTS: ConfigView = {
  sources: ALL_SOURCES.map(s => s.id),
  maxResults: 8,
  fetchContent: false,
  fetchCount: 3,
}

function asConfig(value: unknown): ConfigView {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return DEFAULTS
  const v = value as Record<string, unknown>
  const sources = Array.isArray(v.sources)
    ? v.sources.filter((s): s is string => typeof s === 'string' && ALL_SOURCES.some(alt => alt.id === s))
    : DEFAULTS.sources
  return {
    sources: sources.length > 0 ? sources : DEFAULTS.sources,
    maxResults: typeof v.maxResults === 'number' && v.maxResults > 0 ? Math.floor(v.maxResults) : DEFAULTS.maxResults,
    fetchContent: v.fetchContent === true,
    fetchCount: typeof v.fetchCount === 'number' && v.fetchCount > 0 ? Math.min(5, Math.floor(v.fetchCount)) : DEFAULTS.fetchCount,
  }
}

// ── 共享样式（与 PluginCard.module.css / fields.module.css 对齐）──────────

const cardStyle = {
  listStyle: 'none',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 12,
  background: 'var(--dsw-alias-bg-layer-3)',
  transition: 'border-color .16s, background .16s',
} as const

const cardHeaderStyle = {
  width: '100%',
  appearance: 'none',
  border: 0,
  background: 'none',
  font: 'inherit',
  color: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 12,
} as const

const cardBodyStyle = {
  borderTop: '1px solid var(--dsw-alias-border-l2)',
  margin: '0 16px',
  paddingBottom: 8,
} as const

const headTextStyle = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
} as const

const nameStyle = {
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
  color: 'var(--dsw-alias-label-primary)',
} as const

const descriptionStyle = {
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-tertiary)',
} as const

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '12px 0',
} as const

const fieldSeparator = { borderBottom: '1px solid var(--dsw-alias-border-l2)' } as const

const fieldHeadStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
} as const

const labelStyle = {
  flex: 1,
  minWidth: 0,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
} as const

const hintStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-tertiary)',
} as const

const inputStyle = {
  height: 34,
  padding: '0 12px',
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 8,
  background: 'var(--dsw-alias-bg-layer-3)',
  font: 'inherit',
  fontSize: 13,
  lineHeight: 1.5,
  color: 'var(--dsw-alias-label-primary)',
  outline: 'none',
  boxSizing: 'border-box' as const,
  width: '100%',
} as const

// ── 基础组件 ────────────────────────────────────────────────────────────────

function ChevronIcon(open: boolean): ReturnType<typeof createElement> {
  return createElement('svg', {
    width: 14,
    height: 14,
    viewBox: '0 0 14 14',
    fill: 'none',
    style: {
      flex: 'none',
      color: 'var(--dsw-alias-label-tertiary)',
      transition: 'transform .16s',
      transform: open ? 'rotate(180deg)' : 'none',
    },
  }, createElement('path', {
    d: 'M3.5 5.25L7 8.75L10.5 5.25',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }))
}

function ToggleSwitch(props: { checked: boolean; disabled?: boolean; onChange: (v: boolean) => void }): ReturnType<typeof createElement> {
  return createElement('label', {
    style: {
      position: 'relative' as const,
      display: 'inline-block',
      width: 36,
      height: 20,
      flex: 'none',
      cursor: props.disabled ? 'default' : 'pointer',
      opacity: props.disabled ? 0.4 : 1,
    },
  },
    createElement('input', {
      type: 'checkbox',
      checked: props.checked,
      disabled: props.disabled,
      onChange: (e: { target: { checked: boolean } }) => props.onChange(e.target.checked),
      style: { display: 'none' },
    }),
    createElement('span', {
      style: {
        position: 'absolute' as const,
        inset: 0,
        borderRadius: 10,
        background: props.checked ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)',
        transition: 'background .16s',
      },
    }),
    createElement('span', {
      style: {
        position: 'absolute' as const,
        top: 2,
        left: props.checked ? 18 : 2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: 'var(--dsw-alias-bg-layer-3)',
        transition: 'left .16s',
      },
    }),
  )
}

function ValueField(props: {
  id: string; label: string; hint: string; value: number; disabled: boolean; onChange: (v: number) => void; last?: boolean
}): ReturnType<typeof createElement> {
  return createElement('div', { style: { ...fieldStyle, ...(props.last ? {} : fieldSeparator) } },
    createElement('div', { style: fieldHeadStyle },
      createElement('label', { htmlFor: props.id, style: labelStyle }, props.label),
    ),
    createElement('input', {
      id: props.id,
      type: 'number',
      inputMode: 'numeric',
      min: 1,
      max: 50,
      value: props.value,
      disabled: props.disabled,
      onChange: (e: { target: { value: string } }) => props.onChange(Number(e.target.value)),
      style: inputStyle,
    }),
    createElement('p', { style: hintStyle }, props.hint),
  )
}

function ToggleField(props: {
  id: string; label: string; hint: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void; last?: boolean
}): ReturnType<typeof createElement> {
  return createElement('div', { style: { ...fieldStyle, ...(props.last ? {} : fieldSeparator) } },
    createElement('div', { style: fieldHeadStyle },
      createElement('label', { htmlFor: props.id, style: labelStyle }, props.label),
      ToggleSwitch({ checked: props.checked, disabled: props.disabled, onChange: props.onChange }),
    ),
    createElement('p', { style: hintStyle }, props.hint),
  )
}

function SecretField(props: {
  id: string; label: string; hint: string; value: string; disabled: boolean; onChange: (v: string) => void; placeholder: string; last?: boolean
}): ReturnType<typeof createElement> {
  return createElement('div', { style: { ...fieldStyle, ...(props.last ? {} : fieldSeparator) } },
    createElement('div', { style: fieldHeadStyle },
      createElement('label', { htmlFor: props.id, style: labelStyle }, props.label),
    ),
    createElement('input', {
      id: props.id,
      type: 'password',
      autoComplete: 'off',
      placeholder: props.placeholder,
      value: props.value,
      disabled: props.disabled,
      onChange: (e: { target: { value: string } }) => props.onChange(e.target.value),
      style: inputStyle,
    }),
    createElement('p', { style: hintStyle }, props.hint),
  )
}

// ── 设置主页面 ───────────────────────────────────────────────────────────────

function WebSearchSection(props: { scope: SettingsScope<ConfigView>; locale: LocaleService | undefined }): ReturnType<typeof createElement> {
  const { scope, locale } = props
  const [snapshot, setSnapshot] = useState<SettingsScopeSnapshot<ConfigView>>(() => scope.getSnapshot())
  const [draft, setDraft] = useState<ConfigView>(() => asConfig(scope.getSnapshot().value))
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({})
  const [openDefaults, setOpenDefaults] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleKey, setGoogleKey] = useState('')
  const [googleCx, setGoogleCx] = useState('')
  const [bingKey, setBingKey] = useState('')
  // 订阅 locale 变化，切换语言时重新渲染
  const [, setLocaleTick] = useState(0)

  useEffect(() => {
    const dispose = scope.subscribe(() => {
      const next = scope.getSnapshot()
      setSnapshot(next)
      if (next.value !== undefined) setDraft(asConfig(next.value))
    })
    return dispose
  }, [scope])

  useEffect(() => {
    if (locale !== undefined) {
      return locale.subscribe(() => setLocaleTick(v => v + 1))
    }
  }, [locale])

  // 每次渲染时根据当前 locale 绑定翻译函数
  const t: Translate = locale !== undefined
    ? (key: string, fallback?: string) => {
        const result = locale.bind(NS)(key)
        return result.length > 0 ? result : (fallback ?? key)
      }
    : (key: string, fallback?: string) => fallback ?? key

  const writable = snapshot.writable

  const toggleCard = (id: string) => {
    setOpenCards(o => ({ ...o, [id]: !o[id] }))
  }

  const toggleSource = (sourceId: string) => {
    setDraft(current => {
      const has = current.sources.includes(sourceId)
      return { ...current, sources: has ? current.sources.filter(s => s !== sourceId) : [...current.sources, sourceId] }
    })
  }

  const save = async () => {
    setBusy(true)
    setStatus('')
    try {
      const pending: Array<Promise<void>> = [
        scope.set('sources', draft.sources),
        scope.set('maxResults', draft.maxResults),
        scope.set('fetchContent', draft.fetchContent),
        scope.set('fetchCount', draft.fetchCount),
      ]
      if (googleKey.trim().length > 0) pending.push(scope.set('googleApiKey', googleKey.trim()))
      if (googleCx.trim().length > 0) pending.push(scope.set('googleCx', googleCx.trim()))
      if (bingKey.trim().length > 0) pending.push(scope.set('bingApiKey', bingKey.trim()))
      await Promise.all(pending)
      setGoogleKey('')
      setGoogleCx('')
      setBingKey('')
      setStatus(t('saved'))
    } catch (error) {
      setStatus(t('saveFailed') + ': ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setBusy(false)
    }
  }

  // 按定义顺序展示所有来源（不按启用状态排序）
  const enabledSources = draft.sources
  const ordered = ALL_SOURCES.map(s => s.id)

  const sourceMeta = (id: string) => ALL_SOURCES.find(s => s.id === id)!

  return createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, padding: 0 } },

    // 标题
    createElement('h3', { style: { margin: 0, ...nameStyle } }, t('title')),

    // ── 默认参数（可折叠）──
    createElement('div', { style: cardStyle },
      createElement('button', {
        type: 'button',
        onClick: () => setOpenDefaults(!openDefaults),
        'aria-expanded': openDefaults,
        style: cardHeaderStyle,
      },
        createElement('span', { style: headTextStyle },
          createElement('span', { style: nameStyle }, t('defaults')),
        ),
        ChevronIcon(openDefaults),
      ),
      openDefaults ? createElement('div', { style: cardBodyStyle },
        ValueField({
          id: 'wsm-max-results',
          label: t('maxResults'),
          hint: t('maxResultsHint'),
          value: draft.maxResults,
          disabled: !writable,
          onChange: (v) => setDraft(c => ({ ...c, maxResults: v })),
        }),
        ToggleField({
          id: 'wsm-fetch-content',
          label: t('fetchContent'),
          hint: t('fetchContentHint'),
          checked: draft.fetchContent,
          disabled: !writable,
          onChange: (v) => setDraft(c => ({ ...c, fetchContent: v })),
          last: !draft.fetchContent,
        }),
        draft.fetchContent ? ValueField({
          id: 'wsm-fetch-count',
          label: t('fetchCount'),
          hint: t('fetchCountHint'),
          value: draft.fetchCount,
          disabled: !writable,
          onChange: (v) => setDraft(c => ({ ...c, fetchCount: v })),
          last: true,
        }) : null,
      ) : null,
    ),

    // ── 各后端卡片 ──
    createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      ordered.map((sid, idx) => {
        const meta = sourceMeta(sid)
        const enabled = enabledSources.includes(sid)
        const open = openCards[sid] ?? false
        return createElement('div', {
          key: sid,
          style: {
            ...cardStyle,
            background: open ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-3)',
          },
        },
          // 卡片头部
          createElement('button', {
            type: 'button',
            onClick: () => toggleCard(sid),
            'aria-expanded': open,
            style: cardHeaderStyle,
          },
            createElement('span', { style: headTextStyle },
              createElement('span', { style: nameStyle }, meta.label),
              createElement('span', { style: descriptionStyle }, t(meta.descKey)),
            ),
            ChevronIcon(open),
          ),
          // 卡片正文——最后一项字段不显示分隔线
          open ? createElement('div', { style: cardBodyStyle },
            sid === 'google' || sid === 'bing'
              ? createElement(Fragment, null,
                  ToggleField({
                    id: `wsm-enable-${sid}`,
                    label: t('enable'),
                    hint: enabled ? t('enabledHint') : t('enableHint'),
                    checked: enabled,
                    disabled: !writable,
                    onChange: () => toggleSource(sid),
                    last: false,
                  }),
                  sid === 'google'
                    ? SecretField({
                        id: 'wsm-google-key',
                        label: t('apiKey'),
                        hint: t('googleApiKeyHint'),
                        value: googleKey,
                        disabled: !writable || !enabled,
                        onChange: setGoogleKey,
                        placeholder: t('placeholder'),
                        last: false,
                      })
                    : null,
                  sid === 'google'
                    ? SecretField({
                        id: 'wsm-google-cx',
                        label: t('googleCx'),
                        hint: t('googleCxHint'),
                        value: googleCx,
                        disabled: !writable || !enabled,
                        onChange: setGoogleCx,
                        placeholder: t('placeholder'),
                        last: true,
                      })
                    : null,
                  sid === 'bing'
                    ? SecretField({
                        id: 'wsm-bing-key',
                        label: t('apiKey'),
                        hint: t('bingApiKeyHint'),
                        value: bingKey,
                        disabled: !writable || !enabled,
                        onChange: setBingKey,
                        placeholder: t('placeholder'),
                        last: true,
                      })
                    : null,
                )
              : ToggleField({
                  id: `wsm-enable-${sid}`,
                  label: t('enable'),
                  hint: enabled ? t('enabledHint') : t('enableHint'),
                  checked: enabled,
                  disabled: !writable,
                  onChange: () => toggleSource(sid),
                  last: true,
                }),
          ) : null,
        )
      }),
    ),

    // 状态与保存按钮行
    status.length > 0
      ? createElement('div', {
        style: {
          margin: 0,
          fontSize: 12,
          lineHeight: 1.5,
          color: status === t('saved') ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-label-error)',
        },
      }, status)
      : null,

    createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 8 } },
      createElement('button', {
        onClick: save,
        disabled: busy || !writable,
        style: {
          appearance: 'none',
          border: '1px solid transparent',
          borderRadius: 8,
          padding: '5px 14px',
          font: 'inherit',
          fontSize: 13,
          lineHeight: 1.5,
          cursor: busy || !writable ? 'default' : 'pointer',
          background: 'var(--dsw-alias-label-primary)',
          color: 'var(--dsw-alias-bg-layer-3)',
          opacity: busy || !writable ? 0.4 : 1,
        },
      }, busy ? t('saving') : t('save')),
    ),
  )
}

export const inject = ['slots', 'settingsScope', 'locale']

export function apply(ctx: ClientContext): void {
  const slots = ctx.get('slots')
  const settingsScope = ctx.get('settingsScope')
  const locale = ctx.get('locale') as LocaleService | undefined
  if (slots === undefined || settingsScope === undefined) return

  // 注册 i18n 词典（同时注册 zh 和 zh-CN 以兼容不同 locale ID）
  if (locale !== undefined) {
    const disposeZh = locale.register(NS, 'zh', ZH_DICT)
    const disposeZhCN = locale.register(NS, 'zh-CN', ZH_DICT)
    const disposeEn = locale.register(NS, 'en', EN_DICT)
    ctx.effect(() => () => { disposeZh(); disposeZhCN(); disposeEn() }, 'dsh-web-polysearch: locale dispose')
  }

  // 用于 slot label 的翻译函数（slot label 不随语言切换重新注册）
  const tForLabel: Translate = locale !== undefined
    ? (key: string, fallback?: string) => {
        const result = locale.bind(NS)(key)
        return result.length > 0 ? result : (fallback ?? key)
      }
    : (key: string, fallback?: string) => fallback ?? key

  const scope = settingsScope.bind<ConfigView>({
    namespace: NS,
    decode: (section) => asConfig(section),
  })
  ctx.effect(() => () => { void scope.dispose() }, 'dsh-web-polysearch: scope dispose')

  // 注册 slot（label 跟随当前语言）
  let disposeSlot: (() => void) | undefined = slots.inject('settings.section', () => slots.register(
    { name: 'settings.section', id: 'dsh-web-polysearch', order: 25, label: tForLabel('title') },
    () => createElement(WebSearchSection, { scope, locale }),
  ))

  // 重新注册 slot（更新 label）
  function reRegisterSlot() {
    if (disposeSlot !== undefined) disposeSlot()
    disposeSlot = slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'dsh-web-polysearch', order: 25, label: tForLabel('title') },
      () => createElement(WebSearchSection, { scope, locale }),
    ))
  }

  ctx.effect(() => () => { if (disposeSlot !== undefined) disposeSlot() }, 'dsh-web-polysearch: slot dispose')

  // 同步当前语言到 host 端（通过 settings），使工具描述、错误信息和输出格式也跟随语言切换
  if (locale !== undefined) {
    const syncLocale = () => {
      const localeId = locale.getLocale().id
      scope.set('locale', localeId).catch((err: unknown) => {
        console.error('dsh-web-polysearch: locale sync failed', err)
      })
      // 重新注册 slot 以更新侧边栏标题
      reRegisterSlot()
    }
    syncLocale()
    const disposeSub = locale.subscribe(() => syncLocale())
    ctx.effect(() => disposeSub, 'dsh-web-polysearch: locale sync dispose')
  }
}
