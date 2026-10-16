import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = mkdtempSync(path.join(tmpdir(), 'pdf-merger-packages-'))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const run = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const fixture = path.join(root, 'test/fixtures/Testfile_A.pdf')

try {
  const archives = {}
  const artifactDirectory = process.argv[2] && path.resolve(process.argv[2])
  for (const workspace of ['web', 'node']) {
    let packed
    if (artifactDirectory) {
      const release = JSON.parse(readFileSync(path.join(artifactDirectory, 'release.json')))
      const artifact = release.packages.find(pkg => pkg.workspace === workspace)
      archives[workspace] = path.join(artifactDirectory, artifact.filename)
      const listing = run('tar', ['-tzf', archives[workspace]], root).trim().split('\n')
      packed = { files: listing.map(file => ({ path: file.replace(/^package\//, '') })) }
    } else {
      [packed] = JSON.parse(run(npm, ['pack', '--workspace', workspace, '--pack-destination', temporary, '--json'], root))
      archives[workspace] = path.join(temporary, packed.filename)
    }
    for (const guide of ['llms.txt', 'llms-full.txt']) {
      assert(packed.files.some(file => file.path === guide), `${workspace} must ship ${guide}`)
    }
    assert(packed.files.some(file => file.path === 'LICENSE'))
    assert(packed.files.some(file => file.path === 'dist/index.d.ts'))
    if (workspace === 'web') assert(!packed.files.some(file => file.path.includes('cli')))
  }
  for (const variant of ['web', 'node']) {
    const cwd = path.join(temporary, variant)
    mkdirSync(cwd)
    writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
    run(npm, ['install', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', archives.web, ...(variant === 'node' ? [archives.node] : [])], cwd)
    const installedWeb = JSON.parse(readFileSync(path.join(cwd, 'node_modules/@radui1398/pdf-merger-js/package.json')))
    assert.deepEqual(Object.keys(installedWeb.dependencies), ['@cantoo/pdf-lib'])
    assert.equal(installedWeb.bin, undefined)
    if (variant === 'web') {
      assert(!existsSync(path.join(cwd, 'node_modules/commander')))
      assert(!existsSync(path.join(cwd, 'node_modules/@radui1398/pdf-merger-js-node')))
      run(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        import fs from 'node:fs/promises';
        import Web from '@radui1398/pdf-merger-js';
        import Alias from '@radui1398/pdf-merger-js/web';
        import Browser from '@radui1398/pdf-merger-js/browser';
        import { PDFMergerBase, parsePagesString } from '@radui1398/pdf-merger-js/core';
        assert.equal(Web, Alias); assert.equal(Web, Browser);
        assert.deepEqual(parsePagesString('1-2'), [1, 2]);
        const merger = new Web(); assert(merger instanceof PDFMergerBase);
        await merger.add(new Uint8Array(await fs.readFile(${JSON.stringify(fixture)})));
        assert((await merger.saveAsBuffer()).length > 0);
        assert((await merger.saveAsBlob()).size > 0);
      `], cwd)
    } else {
      const output = path.join(cwd, 'merged.pdf')
      run(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        import Merger from '@radui1398/pdf-merger-js-node';
        const merger = new Merger();
        await merger.add(${JSON.stringify(fixture)});
        assert(Buffer.isBuffer(await merger.saveAsBuffer()));
        await merger.save(${JSON.stringify(output)});
      `], cwd)
      const bin = path.join(cwd, 'node_modules/.bin/pdf-merge')
      assert.equal(run(bin, ['--version'], cwd).trim(), JSON.parse(readFileSync(path.join(cwd, 'node_modules/@radui1398/pdf-merger-js-node/package.json'))).version)
      run(bin, ['--output', output, fixture, fixture], cwd)
      run(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        import fs from 'node:fs/promises';
        import { PDFDocument } from '@cantoo/pdf-lib';
        const result = await PDFDocument.load(await fs.readFile(${JSON.stringify(output)}));
        const source = await PDFDocument.load(await fs.readFile(${JSON.stringify(fixture)}));
        assert.equal(result.getPageCount(), 2 * source.getPageCount());
      `], cwd)
    }
    // Resolve declarations from the installed tarballs, not workspace symlinks.
    writeFileSync(path.join(cwd, 'types.ts'), variant === 'web'
      ? "import Web from '@radui1398/pdf-merger-js'; import Alias from '@radui1398/pdf-merger-js/web'; import Browser from '@radui1398/pdf-merger-js/browser'; import { PDFMergerBase, parsePagesString } from '@radui1398/pdf-merger-js/core'; const b: Promise<Blob> = new Web().saveAsBlob(); new Alias(); new Browser(); new PDFMergerBase().add(new Uint8Array(), parsePagesString('1')); void b;"
      : "import Node from '@radui1398/pdf-merger-js-node'; import type { Buffer } from 'node:buffer'; const b: Promise<Buffer> = new Node().saveAsBuffer(); new Node().add('input.pdf'); void b;")
    writeFileSync(path.join(cwd, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        noEmit: true,
        strict: true,
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        lib: ['ES2022', 'DOM'],
        typeRoots: [path.join(root, 'node_modules/@types')],
        types: variant === 'web' ? [] : ['node']
      },
      files: ['types.ts']
    }))
    run(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', path.join(cwd, 'tsconfig.json')], cwd)
  }
  console.log('Packed web and Node packages: installation, exports, types and CLI passed.')
} catch (error) {
  if (error.stdout) console.error(error.stdout.toString())
  if (error.stderr) console.error(error.stderr.toString())
  throw error
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
