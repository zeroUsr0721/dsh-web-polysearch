# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- README installation instructions reordered: GitHub `github:owner/repo` is the primary install path; local path and `pnpm-workspace.yaml`-free manual install are documented; the dshmarket entry is described as conditional on admission to the curated registry.

## [0.1.1] - 2026-08-26

### Added
- `dsh-web-polysearch` initial release (renamed from `dsh-web-search-multi`)
- Multi-source web search across DeepSeek, DuckDuckGo, Exa, Google, Bing
- Parallel search via `Promise.allSettled`
- Direct page fetch via `url` parameter
- Optional content fetching for top results
- Bilingual settings UI (Chinese and English) via DSH locale service
- `dsh-plugin` GitHub topic for ecosystem discovery
- MIT license

### Changed
- Renamed from `dsh-web-search-multi` to `dsh-web-polysearch`
- Migrated settings UI to `polysearch` naming
- DuckDuckGo fetcher now sends a proper User-Agent header
- Exa response parser handles both plain JSON and SSE-framed responses
- `parseMcpResult` wrapped in try/catch to fall through SSE parsing safely
- Google/Bing JSON.parse wrapped in try/catch with friendly error
- `stripTags` filters `<script>`, `<style>`, `<noscript>` blocks
- Settings UI dynamically re-registers on locale change
- Tool description re-registers on locale change
- Removed drag-reorder UI from settings cards (simpler layout)

### Fixed
- `sourceErrors: null` no longer fails output schema validation
- Tool description on host side reflects the current UI language
- Sidebar section label updates when the locale changes