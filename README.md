# PDF Merger JS

Merge PDF documents or selected pages in browsers and Node.js.

## Packages and installation

| Directory | npm package | Purpose |
| --- | --- | --- |
| `web/` | `@radui1398/pdf-merger-js` | Browser library; depends only on `@cantoo/pdf-lib` |
| `node/` | `@radui1398/pdf-merger-js-node` | Node.js API and `pdf-merge` command |

Browser: `npm install @radui1398/pdf-merger-js`

Node.js: `npm install @radui1398/pdf-merger-js-node`

CLI: `npm install -g @radui1398/pdf-merger-js-node`

The Node package requires Node.js 22.12.0 or newer. Installing the web package does not install Commander or the CLI.

## Migrating to version 6

The default export of `@radui1398/pdf-merger-js` is now the browser implementation. Node users must install and import `@radui1398/pdf-merger-js-node`. Browser users may use the default import or the `/web` and `/browser` aliases. The command remains `pdf-merge`, with the same options.

The `/core` entry exports `PDFMergerBase` and `parsePagesString` for reuse. Existing merger methods retain their behavior: browser output uses `Uint8Array` or `Blob`, and Node output uses `Buffer` or filesystem paths.

## Development

Run `npm ci` and `npm run build` at the repository root. This private npm workspace manages both packages and a single lockfile. Use the latest patch of Node.js 22, 24, or 26 for development to satisfy jsdom's requirements.

- `npm run build`: compile the TypeScript libraries and CLI to `web/dist` and `node/dist`, including generated declarations.
- `npm run typecheck`: strict compilation for web and Node, followed by public API type checks.
- `npm run standard`: lint JavaScript test and tooling files.
- `npm test`: browser, Node, CLI and regression tests.
- `npm run test:types`: check public TypeScript interfaces.
- `npm run test:package`: pack and install both packages in temporary projects; check exports, types, CLI and web dependency isolation. Requires npm registry access.

Test tools remain root development dependencies. PDF.js and a canvas renderer compare page structure, text and rendered pixels. These tools are not installed by consumers; the legacy comparator and its override have been removed.

Both packages are prepared as version 6.0.1, a verification release for GitHub Actions Trusted Publishing. Release the web package before the Node package, which depends on it. Publishing is started manually through the Manual release workflow, after validation.

## Usage

### CLI "pdf-merge"

```txt
Usage: pdf-merge [options] <inputFiles...>

merge multiple PDF documents, or parts of them, to a new PDF document

Options:
  -V, --version              output the version number
  -o, --output <outputFile>  Merged PDF output file path
  -v, --verbose              Print verbose output
  -s, --silent               do not print any output to stdout. Overwrites --verbose
  -h, --help                 display help for command

```

#### Example calls

Merge pages 1-2 from the first input with pages 1,2 and 5-7 from the second pdf document:

`pdf-merge --output ./merged.pdf ./input1.pdf#1-2 ./input2.pdf#1,2,5-7`

Get two pdf files from the an url and merge the first one with pages 2-3 from the second one:

`pdf-merge --verbose --output ./sample.pdf Testfile.pdf https://pdfobject.com/pdf/sample.pdf https://upload.wikimedia.org/wikipedia/commons/1/13/Example.pdf#2-3`

### node.js

The node.js version has the following export functions:

* `saveAsBuffer` exports a merged pdf as an [Buffer](https://nodejs.org/api/buffer.html).
* `save` saves the pdf under the given filename.
* `setMetadata` set Metadata for producer, author, title or creator.
* `reset` resets the internal state of the document, to start again.

#### async node.js example

```js
import PDFMerger from '@radui1398/pdf-merger-js-node';

var merger = new PDFMerger();

(async () => {
  await merger.add('pdf1.pdf');  //merge all pages. parameter is the path to file and filename.
  await merger.add('pdf2.pdf', 2); // merge only page 2
  await merger.add('pdf2.pdf', [1, 3]); // merge the pages 1 and 3
  await merger.add('pdf2.pdf', '4, 7, 8'); // merge the pages 4, 7 and 8
  await merger.add('pdf3.pdf', '3 to 5'); //merge pages 3 to 5 (3,4,5)
  await merger.add('pdf3.pdf', '3-5'); //merge pages 3 to 5 (3,4,5)

  // Set metadata
  await merger.setMetadata({
    producer: "pdf-merger-js based script",
    author: "John Doe",
    creator: "John Doe",
    title: "My live as John Doe"
  });

  await merger.save('merged.pdf'); //save under given name and reset the internal document
  
  // Export the merged PDF as a nodejs Buffer
  // const mergedPdfBuffer = await merger.saveAsBuffer();
  // fs.writeSync('merged.pdf', mergedPdfBuffer);
})();
```

### Browser

The Browser version has the following export functions:

* `saveAsBuffer` exports a merged pdf as an [Uint8Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array).
* `saveAsBlob` exports a merged pdf as a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
* `save` starts a file-download directly in the browser.
* `setMetadata` set Metadata for producer, author, title or creator.
* `reset` resets the internal state of the document, to start again.

#### async react example

```jsx
import PDFMerger from '@radui1398/pdf-merger-js';
import React, { useEffect, useState } from 'react';

// files: Array of PDF File or Blob objects
const Merger = (files) => {
  const [mergedPdfUrl, setMergedPdfUrl] = useState();

  useEffect(() => {
    const render = async () => {
      const merger = new PDFMerger();

      for(const file of files) {
        await merger.add(file);
      }

      await merger.setMetadata({
        producer: "pdf-merger-js based script"
      });

      const mergedPdf = await merger.saveAsBlob();
      const url = URL.createObjectURL(mergedPdf);

      return setMergedPdfUrl(url);
    };

    render().catch((err) => {
      throw err;
    });

    () => setMergedPdfUrl({});
  }, [files, setMergedPdfUrl]);

  return !data ? (
    <>Loading</>
  ) : (
    <iframe
      height={1000}
      src={`${mergedPdfUrl}`}
      title='pdf-viewer'
      width='100%s'
    ></iframe>
  );
};
```

## Similar libraries

* This library is inspired by the [PHP library PDFMerger](https://github.com/myokyawhtun/PDFMerger) and has a very similar API.
* [pdf-merge](https://www.npmjs.com/package/pdf-merge) has a dependency on [PDFtk](https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/).
* [easy-pdf-merge](https://www.npmjs.com/package/easy-pdf-merge) has a dependency on the [Apache PDFBox® - A Java PDF Library](https://pdfbox.apache.org/).
* [pdfmerge](https://www.npmjs.com/package/pdfmerge) has a dependency on python and [PyPDF2](https://pythonhosted.org/PyPDF2/).

## Documentation for agents

Each published package includes `llms.txt`, a concise documentation index, and `llms-full.txt`, a self-contained guide with examples, public TypeScript declarations and usage limitations.

Run `npm run docs:generate` after changing package metadata, READMEs or TypeScript sources. The generator also holds shared usage guidance in `scripts/generate-llms.js`; update it when runtime behavior changes. Commit the generated files. `npm run docs:check` checks for missing or stale output without modifying files, and CI runs this check. Packing either workspace regenerates both guides through `prepack`.

- [Web index](web/llms.txt) · [Web full guide](web/llms-full.txt)
- [Node index](node/llms.txt) · [Node full guide](node/llms-full.txt)

### TypeScript configuration

`tsconfig.json` provides strict shared compiler options. `web/tsconfig.json` enables browser APIs and excludes ambient Node types; `node/tsconfig.json` uses Node types without the DOM library. `npm run build` compiles web first, then Node against its generated declarations. Public API examples remain checked separately by `test/types/tsconfig.json`.

Library and CLI sources are TypeScript; test and tooling scripts remain JavaScript. Published packages contain compiled ESM and generated `.d.ts` files in `dist/`. Consumers do not need a compiler. Build output is ignored by Git and regenerated before tests, documentation generation and packing. Do not manually edit generated declarations.

## Robust input handling

`add(input, pages?, { signal?, timeoutMs? })` accepts an AbortSignal and a download timeout. The default is 30,000 ms; 0 disables the timer. Values must be integers between 0 and 2,147,483,647 ms. HTTP failures include their status. Timeout covers response headers and body; there are no automatic retries. Cancellation interrupts downloads and FileReader; PDF parsing cannot be interrupted while executing. Calls on the same merger must remain sequential.

Page selectors accept positive safe integers, numeric strings in arrays, and ascending ranges. Invalid tokens, fractions, reversed ranges and out-of-bounds pages reject before appending any pages. Order and duplicates are retained, an empty array adds nothing, and a selection may contain at most 100,000 pages.

CLI failures return exit code 1 and write to stderr, including with `--silent`. Success, help and version return 0. `--output` is required; `--timeout <ms>` uses the same rules as the API.

## Test isolation and release

Functional tests use local HTTP fixtures and controlled browser fetch responses, without public endpoints. PDF comparison runs in separate Node processes with local fonts and exact pixel equality. Visual differences are written to `test/artifacts/` and uploaded by CI. Comparator self-tests intentionally generate differences.

`npm run release:prepare -- 6.0.0` runs validation and preserves tested tarballs plus SHA-512 integrity values in `release-artifacts/`. `npm run release:verify` checks them without publishing. Ordinary package checks remain disposable; the release path tests the exact retained archives without repacking. Production audits block CI; development audits report separately.

The Manual release workflow takes a stable version and full commit SHA reachable from master. It validates Node 22/24/26, creates and tests retained artifacts, then publishes web before Node using npm OIDC. Configure an `npm-release` GitHub environment with required reviewers and configure trusted publishers for both npm packages using `.github/workflows/release.yml` (workflow filename `release.yml`) and that environment. If a package does not yet exist, complete npm's initial package setup/publication before relying on trusted publishing; no credentials or account settings are created by this repository.

The publisher verifies checksums and registry integrity and requires archives prepared from a clean checkout. Local dirty-checkout archives can be validated with --dry-run but cannot be published. On partial failure, rerun only the failed publish job using the original retained artifacts; an identical existing web version is skipped, while conflicting content fails. No automatic unpublish is performed. Do not rebuild artifacts to resume a release.

### Before the first npm 6.0.0 release

Both packages explicitly publish publicly to `https://registry.npmjs.org/` and identify their workspace directory in repository metadata.

1. Review and commit the intended release changes. Exclude local `.DS_Store` files from the commit; ignoring them does not remove files already staged. Push the release commit to master before using the GitHub workflow.
2. For local publication, authenticate with `npm login` and confirm the account with `npm whoami`. Never commit npm credentials. For the workflow, configure trusted publishers and the `npm-release` environment as described above; local authentication is not used by OIDC.
3. Run `npm run release:prepare -- 6.0.0` using a supported development Node version, followed by `npm run release:verify`. The manifest must report `sourceDirty: false` before publication. Rebuild archives after the final commit; do not edit that field manually.
4. For a first package that requires local bootstrap publication, use the validated archives with `node scripts/publish-release.js release-artifacts` only when ready to publish. Otherwise start Manual release for the full committed SHA. Both paths publish web before Node.

### npm processing delays

A successful `npm publish` can be accepted before the version is publicly visible. The publisher saves acceptance receipts in `release-artifacts/submitted.json`, queries with `--prefer-online`, and waits up to ten minutes per package. If still pending, it exits with code 2 without submitting the next package. Rerun using the same directory and archives; accepted versions are not submitted twice. `--wait-ms=<milliseconds>` changes the visibility wait.

When upgrading from a publisher that did not save receipts, use `--submitted=<package-name>` only after npm explicitly reported successful publication of that exact validated archive. Do not regenerate the archives or alter integrity values while a release is pending. Receipts must be retained alongside the original archives when resuming on another runner.
