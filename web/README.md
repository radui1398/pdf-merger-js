# @radui1398/pdf-merger-js

Browser PDF merger. Version 6 exports the browser implementation by default; Node.js users should migrate to `@radui1398/pdf-merger-js-node`.

```sh
npm install @radui1398/pdf-merger-js
```

```js
import PDFMerger from '@radui1398/pdf-merger-js'

const merger = new PDFMerger()
await merger.add(file) // File, Blob, Uint8Array, ArrayBuffer, URL or URL string
await merger.add(otherFile, '1-3')
const blob = await merger.saveAsBlob()
await merger.save('merged') // Downloads merged.pdf
```

`saveAsBuffer()` returns a Uint8Array. `reset()` starts a fresh document; `setMetadata()` accepts producer, author, title and creator. The constructor accepts optional pdf-lib load options.

`/web` and `/browser` alias the default export. `/core` exports `PDFMergerBase` and `parsePagesString`. The only direct runtime dependency is `@cantoo/pdf-lib`; no CLI or Commander is installed.

## Agent documentation

The npm package includes `llms.txt` (documentation index) and `llms-full.txt` (standalone usage guide and TypeScript API). These files are generated from the package metadata, README, generated public declarations and shared usage guidance.

The library is authored in TypeScript and ships compiled ESM and generated declarations in `dist/`. Consumers use the same package imports without a build step.

## Input validation and cancellation

`await merger.add(input, pages, { signal, timeoutMs: 30000 })` supports cancellation and a timeout covering the whole download. Use `timeoutMs: 0` to disable it. Valid values are integers from 0 to 2,147,483,647. HTTP failures reject with the status code. Cancellation is checked before adding pages; synchronous PDF parsing cannot be interrupted. Await calls sequentially.

Page selections use positive safe integers, preserve order and duplicates, and are limited to 100,000 pages. Invalid or out-of-bounds selections reject without appending pages. An empty array adds nothing. `null`, omitted pages and `'all'` select every page.

FileReader failures, aborts and invalid results reject rather than leaving pending operations.
