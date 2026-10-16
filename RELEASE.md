# 6.0.1

- Publish a verification release for GitHub Actions Trusted Publishing on both packages.
- No library API or runtime behavior changes from 6.0.0.

# 6.0.0

- Preserve npm publication acceptance receipts and wait for registry processing without duplicate submissions; query fresh metadata and report pending publication separately from failure.

- Set explicit public npm publishing configuration and workspace repository metadata; check checkout cleanliness after packing regenerates documentation.

- Validate page selectors and document bounds before appending pages; cap selections at 100,000 pages.
- Add optional cancellation and download timeout to add(), HTTP status errors, and reliable FileReader rejection.
- Make CLI failures exit with code 1; require output and add --timeout.
- Remove public-network dependencies from functional tests.
- Add a manually triggered OIDC release workflow with validated archives, checksums and partial-release recovery.

- Migrate web, shared core, Node API and CLI sources to strict TypeScript; generate ESM and declarations in dist with separate browser and Node configurations.

- Generate and ship per-package llms.txt and llms-full.txt agent guides, with CI freshness and package-content checks.

- Split into independent web and Node npm packages, managed by a private workspace.
- Breaking: `@radui1398/pdf-merger-js` now defaults to the browser API. Move Node imports and CLI installations to `@radui1398/pdf-merger-js-node`.
- Preserve browser aliases `/browser` and `/web`; expose shared functionality through `/core`.
- Remove Commander and CLI files from web installations; retain `pdf-merge` in the Node package.
- Update dependencies and require Node >=22.12.0 for the Node package.
- Add isolated package installation and TypeScript checks; replace pdf-diff and its override with structural and exact visual PDF comparison.

