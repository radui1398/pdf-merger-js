import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import path from 'node:path'

const exec = promisify(execFile)
let directory, manifest, bin
beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'pdf-release-'))
  bin = path.join(directory, 'bin')
  await mkdir(bin)
  manifest = { version: '6.0.0', sourceDirty: false, packages: [] }
  for (const [workspace, name] of [['web', '@radui1398/pdf-merger-js'], ['node', '@radui1398/pdf-merger-js-node']]) {
    const filename = `${workspace}.tgz`
    const bytes = Buffer.from(workspace)
    await writeFile(path.join(directory, filename), bytes)
    manifest.packages.push({ name, version: '6.0.0', workspace, filename, integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` })
  }
  await writeFile(path.join(directory, 'release.json'), JSON.stringify(manifest))
  await writeFile(path.join(directory, 'state.json'), '{}')
  // Fake registry: all publication commands stay inside this temporary directory.
  await writeFile(path.join(bin, 'npm'), `#!${process.execPath}\nconst fs=require('node:fs');const path=require('node:path');const dir=process.env.FAKE_REGISTRY;const stateFile=path.join(dir,'state.json');const state=JSON.parse(fs.readFileSync(stateFile));const manifest=JSON.parse(fs.readFileSync(path.join(dir,'release.json')));const args=process.argv.slice(2);if(args[0]==='view'){const pkg=manifest.packages.find(p=>args[1]===p.name+'@'+p.version);if(!state[pkg.name]){console.error('npm error E404');process.exit(1)}console.log(JSON.stringify(state[pkg.name]));}else if(args[0]==='publish'){const pkg=manifest.packages.find(p=>path.basename(args[1])===p.filename);state[pkg.name]=pkg.integrity;fs.writeFileSync(stateFile,JSON.stringify(state));fs.appendFileSync(path.join(dir,'published.log'),pkg.workspace+'\\n');}else{process.exit(2)}\n`, { mode: 0o755 })
})
afterEach(async () => { await rm(directory, { recursive: true, force: true }) })
const publish = (...args) => exec(process.execPath, ['scripts/publish-release.js', directory, ...args], { env: { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}`, FAKE_REGISTRY: directory } })
test('dry run verifies checksums without publishing', async () => {
  await publish('--dry-run')
  expect(JSON.parse(await readFile(path.join(directory, 'state.json')))).toEqual({})
})
test('publishes web before Node', async () => {
  await publish()
  expect(await readFile(path.join(directory, 'published.log'), 'utf8')).toBe('web\nnode\n')
})
test('resumes a partial release without republishing web', async () => {
  const web = manifest.packages[0]
  await writeFile(path.join(directory, 'state.json'), JSON.stringify({ [web.name]: web.integrity }))
  await publish()
  expect(await readFile(path.join(directory, 'published.log'), 'utf8')).toBe('node\n')
})
test('refuses altered archives', async () => {
  await writeFile(path.join(directory, 'web.tgz'), 'modified')
  await expect(publish('--dry-run')).rejects.toThrow()
})
test('refuses conflicting published versions', async () => {
  await writeFile(path.join(directory, 'state.json'), JSON.stringify({ [manifest.packages[0].name]: 'different' }))
  await expect(publish()).rejects.toThrow()
})

test('refuses publication from a dirty checkout', async () => {
  manifest.sourceDirty = true
  await writeFile(path.join(directory, 'release.json'), JSON.stringify(manifest))
  await expect(publish()).rejects.toThrow()
})
