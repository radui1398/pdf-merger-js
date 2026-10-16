# @radui1398/pdf-merger-js-node

Node.js PDF merger and CLI. Requires Node.js >=22.12.0.

```sh
npm install @radui1398/pdf-merger-js-node
```

```js
import PDFMerger from '@radui1398/pdf-merger-js-node'

const merger = new PDFMerger()
await merger.add('first.pdf')
await merger.add('second.pdf', '1-3')
await merger.save('merged.pdf')
const buffer = await merger.saveAsBuffer()
```

Inputs include file paths, Buffer, Uint8Array, ArrayBuffer, Blob and URLs. `reset()` starts a fresh document; `setMetadata()` accepts producer, author, title and creator. The constructor accepts optional pdf-lib load options.

```sh
npm install -g @radui1398/pdf-merger-js-node
pdf-merge --output merged.pdf first.pdf 'second.pdf#1-3'
```

CLI flags remain `--output`, `--verbose`, `--silent`, `--version` and `--help`.

Migrating from version 5: replace the old `@radui1398/pdf-merger-js` Node import with this package. The API and CLI behavior are unchanged. This package reuses the web package's `/core` and adds Commander for argument parsing.

## Agent documentation

The npm package includes `llms.txt` (documentation index) and `llms-full.txt` (standalone usage guide and TypeScript API). These files are generated from the package metadata, README, generated public declarations and shared usage guidance.

The library is authored in TypeScript and ships compiled ESM and generated declarations in `dist/`. Consumers use the same package imports without a build step.

## Input validation and cancellation

`await merger.add(input, pages, { signal, timeoutMs: 30000 })` supports cancellation and a timeout covering the whole download. Use `timeoutMs: 0` to disable it. Valid values are integers from 0 to 2,147,483,647. HTTP failures reject with the status code. Cancellation is checked before adding pages; synchronous PDF parsing cannot be interrupted. Await calls sequentially.

Page selections use positive safe integers, preserve order and duplicates, and are limited to 100,000 pages. Invalid or out-of-bounds selections reject without appending pages. An empty array adds nothing. `null`, omitted pages and `'all'` select every page.

CLI: `--output` is required; `--timeout <ms>` controls downloads. Errors go to stderr and return exit code 1 even with `--silent`; success/help/version return 0.
