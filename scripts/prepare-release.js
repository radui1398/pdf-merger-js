import { execFileSync } from 'node:child_process'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const root = process.cwd()
const version = process.argv[2]
const web = JSON.parse(readFileSync('web/package.json'))
const node = JSON.parse(readFileSync('node/package.json'))
if (!version || !/^\d+\.\d+\.\d+$/.test(version) || web.version !== version || node.version !== version) throw new Error('Provide the stable version matching both package manifests.')
if (node.dependencies[web.name] !== `^${version}`) throw new Error('Node dependency must match the release version.')
if (!readFileSync('RELEASE.md', 'utf8').includes(`# ${version}\n`)) throw new Error('Missing release notes.')
const run = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
const commit = run('git', ['rev-parse', 'HEAD']).trim()
const output = path.resolve('release-artifacts')
mkdirSync(output, { recursive: true })
const packages = []
for (const workspace of ['web', 'node']) {
  const [packed] = JSON.parse(run('npm', ['pack', '--workspace', workspace, '--pack-destination', output, '--json']))
  const bytes = readFileSync(path.join(output, packed.filename))
  packages.push({ workspace, name: packed.name, version: packed.version, filename: packed.filename, integrity: `sha512-${createHash('sha512').update(bytes).digest('base64')}` })
}
// Packing regenerates documentation; include those changes in the provenance check.
const sourceDirty = run('git', ['status', '--porcelain']).trim().length > 0
writeFileSync(path.join(output, 'release.json'), JSON.stringify({ version, commit, sourceDirty, packages }, null, 2) + '\n')
execFileSync(process.execPath, ['scripts/test-packages.js', output], { cwd: root, stdio: 'inherit' })
console.log(`Validated release ${version} at ${commit}; artifacts retained in ${output}`)
