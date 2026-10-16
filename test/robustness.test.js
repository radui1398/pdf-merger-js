import { jest } from '@jest/globals'
import { PDFDocument } from '@cantoo/pdf-lib'
import Merger from '@radui1398/pdf-merger-js-node'
import { parsePagesString } from '@radui1398/pdf-merger-js/core'
import { startServer } from './helpers/http-server.js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const exec = promisify(execFile)
jest.setTimeout(20000)
let server, bytes, directory
beforeAll(async () => {
  server = await startServer()
  directory = await mkdtemp(path.join(tmpdir(), 'pdf-robust-'))
  const pdf = await PDFDocument.create()
  pdf.addPage([100, 100]); pdf.addPage([200, 200])
  bytes = await pdf.save()
})
afterAll(async () => { await server.close(); await rm(directory, { recursive: true, force: true }) })

test.each(['0', '-1', '1.5', '3-1', '1e2', '1x', '1,,2', '1-100001', '9007199254740992'])('reject selection %s', value => {
  expect(() => parsePagesString(value)).toThrow()
})
test.each([0, -1, 1.5, NaN, Infinity, [1, '2x'], [1, 3], [1, 0]])('invalid selection does not append pages: %j', async pages => {
  const merger = new Merger()
  await merger.add(bytes, 1)
  await expect(merger.add(bytes, pages)).rejects.toThrow()
  expect((await PDFDocument.load(await merger.saveAsBuffer())).getPageCount()).toBe(1)
})
test('order, duplicates and empty lists', async () => {
  const merger = new Merger()
  await merger.add(bytes, [2, 1, 2])
  await merger.add(bytes, [])
  const pdf = await PDFDocument.load(await merger.saveAsBuffer())
  expect(pdf.getPages().map(page => page.getWidth())).toEqual([200, 100, 200])
})
test.each(['404', '500'])('HTTP %s is reported', async code => {
  await expect(new Merger().add(`${server.url}/${code}`)).rejects.toThrow(`HTTP ${code}`)
})
test.each(['invalid', 'disconnect'])('reject %s response', async route => {
  await expect(new Merger().add(`${server.url}/${route}`)).rejects.toThrow()
})
test.each(['slow', 'slow-body'])('timeout during %s', async route => {
  await expect(new Merger().add(`${server.url}/${route}`, null, { timeoutMs: 30 })).rejects.toThrow()
})
test('abort before and during download, retain existing pages', async () => {
  const merger = new Merger()
  await merger.add(bytes, 1)
  const controller = new AbortController()
  const pending = merger.add(`${server.url}/slow-body`, null, { signal: controller.signal, timeoutMs: 0 })
  controller.abort()
  await expect(pending).rejects.toThrow()
  await expect(merger.add(bytes, null, { signal: controller.signal })).rejects.toThrow()
  expect((await PDFDocument.load(await merger.saveAsBuffer())).getPageCount()).toBe(1)
})
test.each([-1, 1.5, Infinity, NaN])('reject timeout %s', async timeoutMs => {
  await expect(new Merger().add(bytes, null, { timeoutMs })).rejects.toThrow('timeoutMs')
})
test('CLI failures exit nonzero even when silent', async () => {
  const output = path.join(directory, 'out.pdf')
  for (const args of [[], ['--output', output], ['--output', output, `${server.url}/404`], ['--output', output, `${server.url}/invalid`], ['--output', output, `${server.url}/Testfile_A.pdf#0`], ['--output', output, '--timeout', '20', `${server.url}/slow`], ['--output', output, '--timeout', '-1', `${server.url}/Testfile_A.pdf`], ['--output', directory, `${server.url}/Testfile_A.pdf`]]) {
    await expect(exec(process.execPath, ['node/dist/cli.js', '--silent', ...args])).rejects.toMatchObject({ code: 1, stderr: expect.any(String) })
  }
  await exec(process.execPath, ['node/dist/cli.js', '--silent', '--output', output, `${server.url}/Testfile_A.pdf`])
  expect((await PDFDocument.load(await readFile(output))).getPageCount()).toBeGreaterThan(0)
})

test('CLI help and version succeed and silent suppresses success output', async () => {
  const help = await exec(process.execPath, ['node/dist/cli.js', '--help'])
  expect(help.stdout).toContain('--timeout')
  const version = JSON.parse(await readFile('node/package.json')).version
  expect((await exec(process.execPath, ['node/dist/cli.js', '--version'])).stdout.trim()).toBe(version)
  const result = await exec(process.execPath, ['node/dist/cli.js', '--silent', '--verbose', '--output', path.join(directory, 'silent.pdf'), `${server.url}/Testfile_A.pdf`])
  expect(result.stdout).toBe('')
  expect(result.stderr).toBe('')
})
test('filesystem errors are not reported as URL errors', async () => {
  await expect(new Merger().add(directory)).rejects.toMatchObject({ code: 'EISDIR' })
})
