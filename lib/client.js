window.__ModuleLoader__.load({
	id: "dsh-web-polysearch",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/index.ts
		/**
		* dsh-web-polysearch — 浏览器端：Web 搜索设置页面。
		* 卡片式 UI：可折叠卡片、开关、各后端密钥输入。
		* 支持 i18n（中/英文），通过 locale 服务注册翻译字典。
		*
		* @module dsh-web-polysearch/client
		*/
		const NS = "dsh-web-polysearch";
		/** 中文词典 */
		const ZH_DICT = {
			title: "Web 搜索设置",
			defaults: "默认参数",
			maxResults: "最大结果数",
			maxResultsHint: "每次搜索返回结果数量上限",
			fetchContent: "抓取正文",
			fetchContentHint: "搜索时自动抓取前几条结果的正文内容",
			fetchCount: "抓取正文条数",
			fetchCountHint: "抓取前几条结果的正文（最多 5 条）",
			enable: "启用",
			enabledHint: "此来源已启用",
			enableHint: "启用后将在搜索中使用此来源",
			apiKey: "API Key",
			googleApiKeyHint: "Google Custom Search API Key",
			googleCx: "Search Engine ID (cx)",
			googleCxHint: "Google Custom Search Engine ID",
			bingApiKeyHint: "Azure Bing Web Search API Key",
			placeholder: "留空保持不变",
			saved: "已保存 ✓",
			saveFailed: "保存失败",
			saving: "保存中…",
			save: "保存设置",
			"desc.deepseek": "启用后将使用系统内置 DeepSeek 搜索",
			"desc.duckduckgo": "免费公开搜索引擎，无需 API Key",
			"desc.exa": "免 Key MCP 端点直连 Exa 搜索引擎",
			"desc.google": "Google Custom Search API，需 API Key + Search Engine ID",
			"desc.bing": "Bing Web Search API，需 Azure API Key"
		};
		/** 英文词典 */
		const EN_DICT = {
			title: "Web Search Settings",
			defaults: "Default Parameters",
			maxResults: "Max Results",
			maxResultsHint: "Upper limit on results returned per search",
			fetchContent: "Fetch Content",
			fetchContentHint: "Automatically fetch the body text of the top results",
			fetchCount: "Fetch Count",
			fetchCountHint: "How many top results to fetch body text for (max 5)",
			enable: "Enable",
			enabledHint: "This source is enabled",
			enableHint: "Enable to use this source in searches",
			apiKey: "API Key",
			googleApiKeyHint: "Google Custom Search API Key",
			googleCx: "Search Engine ID (cx)",
			googleCxHint: "Google Custom Search Engine ID",
			bingApiKeyHint: "Azure Bing Web Search API Key",
			placeholder: "Leave empty to keep unchanged",
			saved: "Saved ✓",
			saveFailed: "Save failed",
			saving: "Saving…",
			save: "Save Settings",
			"desc.deepseek": "Uses the built-in DeepSeek search",
			"desc.duckduckgo": "Free public search engine, no API key required",
			"desc.exa": "Keyless MCP endpoint directly connects to Exa search",
			"desc.google": "Google Custom Search API, requires API Key + Search Engine ID",
			"desc.bing": "Bing Web Search API, requires Azure API Key"
		};
		const ALL_SOURCES = [
			{
				id: "deepseek",
				label: "DeepSeek",
				needsKey: false,
				descKey: "desc.deepseek"
			},
			{
				id: "duckduckgo",
				label: "DuckDuckGo",
				needsKey: false,
				descKey: "desc.duckduckgo"
			},
			{
				id: "exa",
				label: "Exa",
				needsKey: false,
				descKey: "desc.exa"
			},
			{
				id: "google",
				label: "Google",
				needsKey: true,
				descKey: "desc.google"
			},
			{
				id: "bing",
				label: "Bing",
				needsKey: true,
				descKey: "desc.bing"
			}
		];
		const DEFAULTS = {
			sources: ALL_SOURCES.map((s) => s.id),
			maxResults: 8,
			fetchContent: false,
			fetchCount: 3
		};
		function asConfig(value) {
			if (value === null || typeof value !== "object" || Array.isArray(value)) return DEFAULTS;
			const v = value;
			const sources = Array.isArray(v.sources) ? v.sources.filter((s) => typeof s === "string" && ALL_SOURCES.some((alt) => alt.id === s)) : DEFAULTS.sources;
			return {
				sources: sources.length > 0 ? sources : DEFAULTS.sources,
				maxResults: typeof v.maxResults === "number" && v.maxResults > 0 ? Math.floor(v.maxResults) : DEFAULTS.maxResults,
				fetchContent: v.fetchContent === true,
				fetchCount: typeof v.fetchCount === "number" && v.fetchCount > 0 ? Math.min(5, Math.floor(v.fetchCount)) : DEFAULTS.fetchCount
			};
		}
		const cardStyle = {
			listStyle: "none",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 12,
			background: "var(--dsw-alias-bg-layer-3)",
			transition: "border-color .16s, background .16s"
		};
		const cardHeaderStyle = {
			width: "100%",
			appearance: "none",
			border: 0,
			background: "none",
			font: "inherit",
			color: "inherit",
			textAlign: "left",
			cursor: "pointer",
			display: "flex",
			alignItems: "center",
			gap: 12,
			padding: "14px 16px",
			borderRadius: 12
		};
		const cardBodyStyle = {
			borderTop: "1px solid var(--dsw-alias-border-l2)",
			margin: "0 16px",
			paddingBottom: 8
		};
		const headTextStyle = {
			flex: 1,
			minWidth: 0,
			display: "flex",
			flexDirection: "column",
			gap: 4
		};
		const nameStyle = {
			fontSize: 15,
			fontWeight: 600,
			lineHeight: 1.4,
			color: "var(--dsw-alias-label-primary)"
		};
		const descriptionStyle = {
			fontSize: 13,
			lineHeight: 1.5,
			color: "var(--dsw-alias-label-tertiary)"
		};
		const fieldStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			padding: "12px 0"
		};
		const fieldSeparator = { borderBottom: "1px solid var(--dsw-alias-border-l2)" };
		const fieldHeadStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8
		};
		const labelStyle = {
			flex: 1,
			minWidth: 0,
			fontSize: 13,
			fontWeight: 500,
			lineHeight: 1.5,
			color: "var(--dsw-alias-label-primary)"
		};
		const hintStyle = {
			margin: 0,
			fontSize: 12,
			lineHeight: 1.5,
			color: "var(--dsw-alias-label-tertiary)"
		};
		const inputStyle = {
			height: 34,
			padding: "0 12px",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 8,
			background: "var(--dsw-alias-bg-layer-3)",
			font: "inherit",
			fontSize: 13,
			lineHeight: 1.5,
			color: "var(--dsw-alias-label-primary)",
			outline: "none",
			boxSizing: "border-box",
			width: "100%"
		};
		function ChevronIcon(open) {
			return (0, react.createElement)("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 14 14",
				fill: "none",
				style: {
					flex: "none",
					color: "var(--dsw-alias-label-tertiary)",
					transition: "transform .16s",
					transform: open ? "rotate(180deg)" : "none"
				}
			}, (0, react.createElement)("path", {
				d: "M3.5 5.25L7 8.75L10.5 5.25",
				stroke: "currentColor",
				strokeWidth: 1.5,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}));
		}
		function ToggleSwitch(props) {
			return (0, react.createElement)("label", { style: {
				position: "relative",
				display: "inline-block",
				width: 36,
				height: 20,
				flex: "none",
				cursor: props.disabled ? "default" : "pointer",
				opacity: props.disabled ? .4 : 1
			} }, (0, react.createElement)("input", {
				type: "checkbox",
				checked: props.checked,
				disabled: props.disabled,
				onChange: (e) => props.onChange(e.target.checked),
				style: { display: "none" }
			}), (0, react.createElement)("span", { style: {
				position: "absolute",
				inset: 0,
				borderRadius: 10,
				background: props.checked ? "var(--dsw-alias-brand-primary)" : "var(--dsw-alias-border-l2)",
				transition: "background .16s"
			} }), (0, react.createElement)("span", { style: {
				position: "absolute",
				top: 2,
				left: props.checked ? 18 : 2,
				width: 16,
				height: 16,
				borderRadius: "50%",
				background: "var(--dsw-alias-bg-layer-3)",
				transition: "left .16s"
			} }));
		}
		function ValueField(props) {
			return (0, react.createElement)("div", { style: {
				...fieldStyle,
				...props.last ? {} : fieldSeparator
			} }, (0, react.createElement)("div", { style: fieldHeadStyle }, (0, react.createElement)("label", {
				htmlFor: props.id,
				style: labelStyle
			}, props.label)), (0, react.createElement)("input", {
				id: props.id,
				type: "number",
				inputMode: "numeric",
				min: 1,
				max: 50,
				value: props.value,
				disabled: props.disabled,
				onChange: (e) => props.onChange(Number(e.target.value)),
				style: inputStyle
			}), (0, react.createElement)("p", { style: hintStyle }, props.hint));
		}
		function ToggleField(props) {
			return (0, react.createElement)("div", { style: {
				...fieldStyle,
				...props.last ? {} : fieldSeparator
			} }, (0, react.createElement)("div", { style: fieldHeadStyle }, (0, react.createElement)("label", {
				htmlFor: props.id,
				style: labelStyle
			}, props.label), ToggleSwitch({
				checked: props.checked,
				disabled: props.disabled,
				onChange: props.onChange
			})), (0, react.createElement)("p", { style: hintStyle }, props.hint));
		}
		function SecretField(props) {
			return (0, react.createElement)("div", { style: {
				...fieldStyle,
				...props.last ? {} : fieldSeparator
			} }, (0, react.createElement)("div", { style: fieldHeadStyle }, (0, react.createElement)("label", {
				htmlFor: props.id,
				style: labelStyle
			}, props.label)), (0, react.createElement)("input", {
				id: props.id,
				type: "password",
				autoComplete: "off",
				placeholder: props.placeholder,
				value: props.value,
				disabled: props.disabled,
				onChange: (e) => props.onChange(e.target.value),
				style: inputStyle
			}), (0, react.createElement)("p", { style: hintStyle }, props.hint));
		}
		function WebSearchSection(props) {
			const { scope, locale } = props;
			const [snapshot, setSnapshot] = (0, react.useState)(() => scope.getSnapshot());
			const [draft, setDraft] = (0, react.useState)(() => asConfig(scope.getSnapshot().value));
			const [openCards, setOpenCards] = (0, react.useState)({});
			const [openDefaults, setOpenDefaults] = (0, react.useState)(false);
			const [status, setStatus] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [googleKey, setGoogleKey] = (0, react.useState)("");
			const [googleCx, setGoogleCx] = (0, react.useState)("");
			const [bingKey, setBingKey] = (0, react.useState)("");
			const [, setLocaleTick] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				return scope.subscribe(() => {
					const next = scope.getSnapshot();
					setSnapshot(next);
					if (next.value !== void 0) setDraft(asConfig(next.value));
				});
			}, [scope]);
			(0, react.useEffect)(() => {
				if (locale !== void 0) return locale.subscribe(() => setLocaleTick((v) => v + 1));
			}, [locale]);
			const t = locale !== void 0 ? (key, fallback) => {
				const result = locale.bind(NS)(key);
				return result.length > 0 ? result : fallback ?? key;
			} : (key, fallback) => fallback ?? key;
			const writable = snapshot.writable;
			const toggleCard = (id) => {
				setOpenCards((o) => ({
					...o,
					[id]: !o[id]
				}));
			};
			const toggleSource = (sourceId) => {
				setDraft((current) => {
					const has = current.sources.includes(sourceId);
					return {
						...current,
						sources: has ? current.sources.filter((s) => s !== sourceId) : [...current.sources, sourceId]
					};
				});
			};
			const save = async () => {
				setBusy(true);
				setStatus("");
				try {
					const pending = [
						scope.set("sources", draft.sources),
						scope.set("maxResults", draft.maxResults),
						scope.set("fetchContent", draft.fetchContent),
						scope.set("fetchCount", draft.fetchCount)
					];
					if (googleKey.trim().length > 0) pending.push(scope.set("googleApiKey", googleKey.trim()));
					if (googleCx.trim().length > 0) pending.push(scope.set("googleCx", googleCx.trim()));
					if (bingKey.trim().length > 0) pending.push(scope.set("bingApiKey", bingKey.trim()));
					await Promise.all(pending);
					setGoogleKey("");
					setGoogleCx("");
					setBingKey("");
					setStatus(t("saved"));
				} catch (error) {
					setStatus(t("saveFailed") + ": " + (error instanceof Error ? error.message : String(error)));
				} finally {
					setBusy(false);
				}
			};
			const enabledSources = draft.sources;
			const ordered = ALL_SOURCES.map((s) => s.id);
			const sourceMeta = (id) => ALL_SOURCES.find((s) => s.id === id);
			return (0, react.createElement)("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 14,
				padding: 0
			} }, (0, react.createElement)("h3", { style: {
				margin: 0,
				...nameStyle
			} }, t("title")), (0, react.createElement)("div", { style: cardStyle }, (0, react.createElement)("button", {
				type: "button",
				onClick: () => setOpenDefaults(!openDefaults),
				"aria-expanded": openDefaults,
				style: cardHeaderStyle
			}, (0, react.createElement)("span", { style: headTextStyle }, (0, react.createElement)("span", { style: nameStyle }, t("defaults"))), ChevronIcon(openDefaults)), openDefaults ? (0, react.createElement)("div", { style: cardBodyStyle }, ValueField({
				id: "wsm-max-results",
				label: t("maxResults"),
				hint: t("maxResultsHint"),
				value: draft.maxResults,
				disabled: !writable,
				onChange: (v) => setDraft((c) => ({
					...c,
					maxResults: v
				}))
			}), ToggleField({
				id: "wsm-fetch-content",
				label: t("fetchContent"),
				hint: t("fetchContentHint"),
				checked: draft.fetchContent,
				disabled: !writable,
				onChange: (v) => setDraft((c) => ({
					...c,
					fetchContent: v
				})),
				last: !draft.fetchContent
			}), draft.fetchContent ? ValueField({
				id: "wsm-fetch-count",
				label: t("fetchCount"),
				hint: t("fetchCountHint"),
				value: draft.fetchCount,
				disabled: !writable,
				onChange: (v) => setDraft((c) => ({
					...c,
					fetchCount: v
				})),
				last: true
			}) : null) : null), (0, react.createElement)("div", { style: {
				display: "flex",
				flexDirection: "column",
				gap: 8
			} }, ordered.map((sid, idx) => {
				const meta = sourceMeta(sid);
				const enabled = enabledSources.includes(sid);
				const open = openCards[sid] ?? false;
				return (0, react.createElement)("div", {
					key: sid,
					style: {
						...cardStyle,
						background: open ? "var(--dsw-alias-bg-layer-2)" : "var(--dsw-alias-bg-layer-3)"
					}
				}, (0, react.createElement)("button", {
					type: "button",
					onClick: () => toggleCard(sid),
					"aria-expanded": open,
					style: cardHeaderStyle
				}, (0, react.createElement)("span", { style: headTextStyle }, (0, react.createElement)("span", { style: nameStyle }, meta.label), (0, react.createElement)("span", { style: descriptionStyle }, t(meta.descKey))), ChevronIcon(open)), open ? (0, react.createElement)("div", { style: cardBodyStyle }, sid === "google" || sid === "bing" ? (0, react.createElement)(react.Fragment, null, ToggleField({
					id: `wsm-enable-${sid}`,
					label: t("enable"),
					hint: enabled ? t("enabledHint") : t("enableHint"),
					checked: enabled,
					disabled: !writable,
					onChange: () => toggleSource(sid),
					last: false
				}), sid === "google" ? SecretField({
					id: "wsm-google-key",
					label: t("apiKey"),
					hint: t("googleApiKeyHint"),
					value: googleKey,
					disabled: !writable || !enabled,
					onChange: setGoogleKey,
					placeholder: t("placeholder"),
					last: false
				}) : null, sid === "google" ? SecretField({
					id: "wsm-google-cx",
					label: t("googleCx"),
					hint: t("googleCxHint"),
					value: googleCx,
					disabled: !writable || !enabled,
					onChange: setGoogleCx,
					placeholder: t("placeholder"),
					last: true
				}) : null, sid === "bing" ? SecretField({
					id: "wsm-bing-key",
					label: t("apiKey"),
					hint: t("bingApiKeyHint"),
					value: bingKey,
					disabled: !writable || !enabled,
					onChange: setBingKey,
					placeholder: t("placeholder"),
					last: true
				}) : null) : ToggleField({
					id: `wsm-enable-${sid}`,
					label: t("enable"),
					hint: enabled ? t("enabledHint") : t("enableHint"),
					checked: enabled,
					disabled: !writable,
					onChange: () => toggleSource(sid),
					last: true
				})) : null);
			})), status.length > 0 ? (0, react.createElement)("div", { style: {
				margin: 0,
				fontSize: 12,
				lineHeight: 1.5,
				color: status === t("saved") ? "var(--dsw-alias-label-secondary)" : "var(--dsw-alias-label-error)"
			} }, status) : null, (0, react.createElement)("div", { style: {
				display: "flex",
				alignItems: "center",
				justifyContent: "flex-end",
				gap: 8,
				paddingTop: 8
			} }, (0, react.createElement)("button", {
				onClick: save,
				disabled: busy || !writable,
				style: {
					appearance: "none",
					border: "1px solid transparent",
					borderRadius: 8,
					padding: "5px 14px",
					font: "inherit",
					fontSize: 13,
					lineHeight: 1.5,
					cursor: busy || !writable ? "default" : "pointer",
					background: "var(--dsw-alias-label-primary)",
					color: "var(--dsw-alias-bg-layer-3)",
					opacity: busy || !writable ? .4 : 1
				}
			}, busy ? t("saving") : t("save"))));
		}
		const inject = [
			"slots",
			"settingsScope",
			"locale"
		];
		function apply(ctx) {
			const slots = ctx.get("slots");
			const settingsScope = ctx.get("settingsScope");
			const locale = ctx.get("locale");
			if (slots === void 0 || settingsScope === void 0) return;
			if (locale !== void 0) {
				const disposeZh = locale.register(NS, "zh", ZH_DICT);
				const disposeZhCN = locale.register(NS, "zh-CN", ZH_DICT);
				const disposeEn = locale.register(NS, "en", EN_DICT);
				ctx.effect(() => () => {
					disposeZh();
					disposeZhCN();
					disposeEn();
				}, "dsh-web-polysearch: locale dispose");
			}
			const tForLabel = locale !== void 0 ? (key, fallback) => {
				const result = locale.bind(NS)(key);
				return result.length > 0 ? result : fallback ?? key;
			} : (key, fallback) => fallback ?? key;
			const scope = settingsScope.bind({
				namespace: NS,
				decode: (section) => asConfig(section)
			});
			ctx.effect(() => () => {
				scope.dispose();
			}, "dsh-web-polysearch: scope dispose");
			let disposeSlot = slots.inject("settings.section", () => slots.register({
				name: "settings.section",
				id: "dsh-web-polysearch",
				order: 25,
				label: tForLabel("title")
			}, () => (0, react.createElement)(WebSearchSection, {
				scope,
				locale
			})));
			function reRegisterSlot() {
				if (disposeSlot !== void 0) disposeSlot();
				disposeSlot = slots.inject("settings.section", () => slots.register({
					name: "settings.section",
					id: "dsh-web-polysearch",
					order: 25,
					label: tForLabel("title")
				}, () => (0, react.createElement)(WebSearchSection, {
					scope,
					locale
				})));
			}
			ctx.effect(() => () => {
				if (disposeSlot !== void 0) disposeSlot();
			}, "dsh-web-polysearch: slot dispose");
			if (locale !== void 0) {
				const syncLocale = () => {
					const localeId = locale.getLocale().id;
					scope.set("locale", localeId).catch((err) => {
						console.error("dsh-web-polysearch: locale sync failed", err);
					});
					reRegisterSlot();
				};
				syncLocale();
				const disposeSub = locale.subscribe(() => syncLocale());
				ctx.effect(() => disposeSub, "dsh-web-polysearch: locale sync dispose");
			}
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map