# Contributing

Thanks for your interest in `dsh-web-polysearch`!

## Issues

Before opening an issue, please:

1. Search existing issues to avoid duplicates.
2. Check the [CHANGELOG](./CHANGELOG.md) to see if your concern has already been addressed.
3. Make sure you are on the latest released version.

When filing a bug, please include:

- DSH version
- Plugin version
- Reproduction steps
- Expected vs. actual behavior
- Relevant log lines (use `console.error` output from the browser console or the host stderr)

## Pull requests

- Fork the repository and create a feature branch.
- Keep changes focused — one concern per PR.
- Run `pnpm install && pnpm run build` locally and confirm the build artifacts (`lib/index.js`, `lib/client.js`) regenerate without errors.
- For UI changes, include before/after screenshots or GIFs.
- Update the [CHANGELOG](./CHANGELOG.md) under an `[Unreleased]` section if your change is user-facing.
- Add or update tests when feasible.

## Plugin ecosystem

- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your repository for ecosystem discovery.
- Tag new DSH plugins with the relevant `dsh-*` keyword for npm search.

## Commit messages

Use the imperative mood ("Add feature", not "Added feature") and keep the subject under 72 characters. Body text should explain *why*, not *what*.

## Code of conduct

Be respectful. This is a small ecosystem; assume good faith and prefer asking before accusing.