import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const directory = path.resolve(process.argv[2] || 'release-artifacts')
const manifest = JSON.parse(readFileSync(path.join(directory, 'release.json')))
const expected = ['@radui1398/pdf-merger-js', '@radui1398/pdf-merger-js-node']
if (manifest.packages.length !== 2 || manifest.packages.some((pkg, i) => pkg.name !== expected[i] || pkg.version !== manifest.version || path.basename(pkg.filename) !== pkg.filename)) throw new Error('Invalid release manifest.')
for (const pkg of manifest.packages) {
  const integrity = `sha512-${createHash('sha512').update(readFileSync(path.join(directory, pkg.filename))).digest('base64')}`
  if (integrity !== pkg.integrity) throw new Error(`Archive integrity mismatch: ${pkg.name}`)
}
if (process.argv.includes('--dry-run')) {
  console.log(`Verified archive checksums for ${manifest.version}; no publication performed.`)
} else {
  if (manifest.sourceDirty !== false) throw new Error('Publication requires archives prepared from a clean checkout.')
  const query = pkg => {
    try {
      return JSON.parse(execFileSync('npm', ['view', `${pkg.name}@${pkg.version}`, 'dist.integrity', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
    } catch (error) {
      if (error.stderr?.toString().includes('E404')) return null
      throw error
    }
  }
  for (const pkg of manifest.packages) {
    const existing = query(pkg)
    if (existing && existing !== pkg.integrity) throw new Error(`Published version differs from validated archive: ${pkg.name}`)
    if (!existing) execFileSync('npm', ['publish', path.join(directory, pkg.filename), '--access', 'public', '--ignore-scripts'], { stdio: 'inherit' })
    let visible = false
    for (let attempt = 0; attempt < 12; attempt++) {
      const integrity = query(pkg)
      if (integrity === pkg.integrity) { visible = true; break }
      if (integrity) throw new Error(`Registry integrity mismatch: ${pkg.name}`)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
    if (!visible) throw new Error(`Package not yet visible: ${pkg.name}; rerun the same release artifacts later.`)
  }
}
