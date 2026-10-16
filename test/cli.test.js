import { startServer } from './helpers/http-server.js'
import path from 'path'
import fs from 'fs-extra'
import util from 'util'
import { execFile } from 'child_process'
import { jest } from '@jest/globals'
import pdfDiff from './helpers/pdf-compare.js'

const asyncExec = util.promisify(execFile)

const __dirname = path.dirname(new URL(import.meta.url).pathname)
const FIXTURES_DIR = path.join(__dirname, 'fixtures')
const TMP_DIR = path.join(__dirname, 'tmp', 'cli.test')

jest.setTimeout(60000)
let server
beforeAll(async () => { server = await startServer() })
afterAll(async () => { await server.close() })

async function mergePDFsCli (outputFile, inputFiles) {
  const { stdout, stderr } = await asyncExec(process.execPath, ['./node/dist/cli.js', '--output', outputFile, ...inputFiles])
  return { stdout, stderr }
}

describe('issues', () => {
  beforeAll(async () => {
    await fs.ensureDir(TMP_DIR)
  })

  test('should merge two pdfs', async () => {
    await mergePDFsCli(path.join(TMP_DIR, 'Testfile_AB.pdf'), [
      path.join(FIXTURES_DIR, 'Testfile_A.pdf'),
      path.join(FIXTURES_DIR, 'Testfile_B.pdf')
    ])
    const diff = await pdfDiff(
      path.join(FIXTURES_DIR, 'Testfile_AB.pdf'),
      path.join(TMP_DIR, 'Testfile_AB.pdf')
    )
    expect(diff).toBeFalsy()
  })

  const testIfFetch = test
  testIfFetch('should merge two pdfs from URL', async () => {
    await mergePDFsCli(path.join(TMP_DIR, 'Testfile_AB.pdf'), [
      `${server.url}/Testfile_A.pdf`,
      `${server.url}/Testfile_B.pdf`
    ])
    const diff = await pdfDiff(
      path.join(FIXTURES_DIR, 'Testfile_AB.pdf'),
      path.join(TMP_DIR, 'Testfile_AB.pdf')
    )
    expect(diff).toBeFalsy()
  })

  test('combine single pages from multiple pdfs', async () => {
    await mergePDFsCli(path.join(TMP_DIR, '2468.pdf'), [
      path.join(FIXTURES_DIR, '123456789.pdf#2'),
      path.join(FIXTURES_DIR, '123456789.pdf#4'),
      path.join(FIXTURES_DIR, '123456789.pdf#6'),
      path.join(FIXTURES_DIR, '123456789.pdf#8')
    ])
    const diff = await pdfDiff(
      path.join(FIXTURES_DIR, '2468.pdf'),
      path.join(TMP_DIR, '2468.pdf')
    )
    expect(diff).toBeFalsy()
  })

  test('combine pages from multiple pdfs (list)', async () => {
    await mergePDFsCli(path.join(TMP_DIR, '2468.pdf'), [
      path.join(FIXTURES_DIR, '123456789.pdf#2,4'),
      path.join(FIXTURES_DIR, '123456789.pdf#6,8')
    ])
    const diff = await pdfDiff(
      path.join(FIXTURES_DIR, '2468.pdf'),
      path.join(TMP_DIR, '2468.pdf')
    )
    expect(diff).toBeFalsy()
  })

  test('combine pages from multipel pdfs (rang)', async () => {
    await mergePDFsCli(path.join(TMP_DIR, '123456789.pdf'), [
      path.join(FIXTURES_DIR, '123456789.pdf#1-5'),
      path.join(FIXTURES_DIR, '123456789.pdf#6-9')
    ])
    const diff = await pdfDiff(
      path.join(FIXTURES_DIR, '123456789.pdf'),
      path.join(TMP_DIR, '123456789.pdf')
    )
    expect(diff).toBeFalsy()
  })

  test('combine pages from multipel pdfs (combined list and range)', async () => {
    await mergePDFsCli(path.join(TMP_DIR, '123456789.pdf'), [
      path.join(FIXTURES_DIR, '123456789.pdf#1,2,3-4'),
      path.join(FIXTURES_DIR, '123456789.pdf#5-7,8to9')
    ])
    const diff = await pdfDiff(
      path.join(FIXTURES_DIR, '123456789.pdf'),
      path.join(TMP_DIR, '123456789.pdf')
    )
    expect(diff).toBeFalsy()
  })

  afterEach(async () => {
    for (const file of await fs.readdir(TMP_DIR)) {
      await fs.unlink(path.join(TMP_DIR, file))
    }
  })

  afterAll(async () => {
    await fs.remove(TMP_DIR)
  })
})
