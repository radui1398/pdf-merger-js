import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const check = process.argv.includes('--check')
const read = (file) => readFileSync(path.join(root, file), 'utf8').trim()
let stale = false

for (const directory of ['web', 'node']) {
  const manifest = JSON.parse(read(`${directory}/package.json`))
  const browser = directory === 'web'
  const summary = browser
    ? 'Merge PDFs in browsers using File, Blob or byte arrays. No CLI or Commander dependency.'
    : 'Merge PDFs with the Node.js API or the pdf-merge CLI. Supports filesystem paths and Buffer output.'
  const intro = `# ${manifest.name}\n\n> ${summary}\n\nVersion: ${manifest.version}. ESM package.\n\nInstall: \`npm install ${manifest.name}\`.\n\nImport: \`import PDFMerger from '${manifest.name}'\`.\n`
  const index = `${intro}\n## Documentation\n\n- [Full agent guide](./llms-full.txt): Usage, API declarations, examples and limitations in one file.\n- [README](./README.md): Installation, examples and migration instructions.\n- [Public types](./dist/index.d.ts): Package-specific TypeScript API.\n${browser ? '- [Core types](./dist/core.d.ts): Shared API, page selectors and metadata.\n' : ''}`
  const declarations = [
    ['Shared core API', 'web/dist/PDFMergerBase.d.ts'],
    ['Core exports', 'web/dist/core.d.ts'],
    ['Page parser', 'web/dist/parsePagesString.d.ts'],
    [browser ? 'Browser API' : 'Node.js API', `${directory}/dist/index.d.ts`]
  ].map(([title, file]) => `## ${title}\n\n\`\`\`ts\n${read(file)}\n\`\`\``).join('\n\n')
  const guidance = `## Usage rules\n\n- Await each \`add()\` call in the desired output order, then await saving. Do not mutate the same merger concurrently.\n- Page numbers are one-based. Omit pages, pass \`null\`, or use \`'all'\` to copy all pages. Examples: \`1\`, \`[1, 3]\`, \`'1,3'\`, \`'1-3'\`, \`'1 to 3'\`. Selected pages are appended in the specified order. Use valid page numbers within the source document.\n- \`save()\` and \`saveAsBuffer()\` do not reset the merger. Call synchronous \`reset()\` before starting an independent merge.\n- \`setMetadata()\` accepts producer, author, title and creator. Await it before saving.\n- Constructor options are forwarded to \`@cantoo/pdf-lib\` when loading inputs; defaults include \`ignoreEncryption: true\` and an empty password. Password-protected documents may require an explicit password.\n- Catch rejected promises from the library for invalid input, failed fetches, parsing errors and invalid pages.\n${browser ? '- Strings are URLs, not local filesystem paths. Pass a File from a file input for local documents. Remote URLs require browser fetch access and appropriate CORS headers.\n- `saveAsBuffer()` returns Uint8Array, not Node Buffer. `saveAsBlob()` returns a PDF Blob. `save(name)` triggers a DOM download and appends `.pdf`; pass a name without that extension.\n- `/web` and `/browser` are aliases of the default export. `/core` exposes PDFMergerBase and parsePagesString for reuse.\n' : '- Strings are tried as local paths first, then as URLs. `saveAsBuffer()` returns Buffer; `save(path)` writes the file without adding an extension. There is no Node `saveAsBlob()` method.\n- The CLI accepts inputs suffixed with `#` and a page selector, for example `"input.pdf#1-3"`. `--silent` takes precedence over `--verbose`.\n- CLI failures write to stderr and exit with code 1, including with --silent. Success, help and version exit with code 0. --output is required; --timeout controls the download deadline.\n'}- Version 6 changed the original package default to the browser API. Use \`@radui1398/pdf-merger-js-node\` for Node and CLI integrations.\n`
  const full = `${intro}\n${read(`${directory}/README.md`)}\n\n${guidance}\n${declarations}\n`
  for (const [name, content] of [['llms.txt', index], ['llms-full.txt', full]]) {
    const target = path.join(root, directory, name)
    if (check) {
      let actual
      try { actual = readFileSync(target, 'utf8') } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
      if (actual !== content) {
        console.error(`${directory}/${name} is missing or stale. Run npm run docs:generate.`)
        stale = true
      }
    } else {
      writeFileSync(target, content)
      console.error(`Generated ${directory}/${name}`)
    }
  }
}
if (stale) process.exitCode = 1
