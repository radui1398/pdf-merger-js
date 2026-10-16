import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
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
  const waitArgument = process.argv.find(arg => arg.startsWith('--wait-ms='))
  const waitMs = waitArgument ? Number(waitArgument.slice('--wait-ms='.length)) : 600000
  if (!Number.isSafeInteger(waitMs) || waitMs < 0) throw new Error('Invalid --wait-ms.')
  const stateFile = path.join(directory, 'submitted.json')
  const submitted = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {}
  const saveSubmitted = pkg => {
    submitted[`${pkg.name}@${pkg.version}`] = pkg.integrity
    writeFileSync(stateFile, JSON.stringify(submitted, null, 2) + '\n')
  }
  for (const argument of process.argv.filter(arg => arg.startsWith('--submitted='))) {
    const pkg = manifest.packages.find(pkg => pkg.name === argument.slice('--submitted='.length))
    if (!pkg) throw new Error('Unknown submitted package.')
    saveSubmitted(pkg)
  }
  const query = pkg => {
    try {
      return JSON.parse(execFileSync('npm', ['view', `${pkg.name}@${pkg.version}`, 'dist.integrity', '--json', '--prefer-online'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))
    } catch (error) {
      if (error.stderr?.toString().includes('E404')) return null
      throw error
    }
  }
  for (const pkg of manifest.packages) {
    const existing = query(pkg)
    if (existing && existing !== pkg.integrity) throw new Error(`Published version differs from validated archive: ${pkg.name}`)
    const receipt = submitted[`${pkg.name}@${pkg.version}`]
    if (receipt && receipt !== pkg.integrity) throw new Error(`Submitted archive differs: ${pkg.name}`)
    if (!existing && !receipt) {
      execFileSync('npm', ['publish', path.join(directory, pkg.filename), '--access', 'public', '--ignore-scripts'], { stdio: 'inherit' })
      saveSubmitted(pkg)
    }
    if (existing) console.log(`Already published and verified: ${pkg.name}@${pkg.version}`)
    else console.log(`Submitted to npm; waiting for visibility: ${pkg.name}@${pkg.version}`)
    const deadline = Date.now() + waitMs
    let visible = false
    while (true) {
      const integrity = query(pkg)
      if (integrity === pkg.integrity) { visible = true; break }
      if (integrity) throw new Error(`Registry integrity mismatch: ${pkg.name}`)
      if (Date.now() >= deadline) break
      await new Promise(resolve => setTimeout(resolve, Math.min(5000, deadline - Date.now())))
    }
    if (!visible) {
      console.error(`npm accepted ${pkg.name}@${pkg.version}, but it is still not visible. No later package was submitted. Rerun with the same archives; the saved receipt prevents duplicate publication.`)
      process.exitCode = 2
      break
    }
    console.log(`Registry integrity verified: ${pkg.name}@${pkg.version}`)
  }
}
