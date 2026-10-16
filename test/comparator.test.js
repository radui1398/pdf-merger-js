import { PDFDocument, rgb, degrees } from '@cantoo/pdf-lib'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import compare from './helpers/pdf-compare.js'
import { jest } from '@jest/globals'

jest.setTimeout(30000)
let directory
beforeAll(async () => { directory = await mkdtemp(path.join(tmpdir(), 'pdf-comparator-')) })
afterAll(async () => { await rm(directory, { recursive: true, force: true }) })
async function document (name, mutate = () => {}) {
  const doc = await PDFDocument.create()
  for (const text of ['First', 'Second']) {
    const page = doc.addPage([200, 200])
    page.drawText(text, { x: 20, y: 100, size: 14 })
    page.drawRectangle({ x: 20, y: 20, width: 40, height: 40, color: rgb(1, 0, 0) })
  }
  await mutate(doc)
  const file = path.join(directory, `${name}.pdf`)
  await writeFile(file, await doc.save())
  return file
}
test('ignores creation dates and serialization', async () => {
  const expected = await document('expected')
  const actual = await document('dates', doc => doc.setCreationDate(new Date('2000-01-01')))
  await expect(compare(expected, actual)).resolves.toBeUndefined()
})
test.each(['order', 'text', 'graphics', 'size', 'rotation', 'count', 'image'])('detects %s changes', async mode => {
  const expected = await document(`expected-${mode}`)
  const actual = await document(mode, async doc => {
    const page = doc.getPage(0)
    if (mode === 'order') { const pages = await doc.copyPages(doc, [1, 0]); doc.removePage(1); doc.removePage(0); pages.forEach(p => doc.addPage(p)) }
    if (mode === 'text') page.drawText('Changed', { x: 10, y: 150 })
    if (mode === 'graphics') page.drawRectangle({ x: 20, y: 20, width: 40, height: 40, color: rgb(0, 0, 1) })
    if (mode === 'size') page.setSize(300, 300)
    if (mode === 'rotation') page.setRotation(degrees(90))
    if (mode === 'count') doc.removePage(1)
    if (mode === 'image') {
      const image = await doc.embedPng(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=', 'base64'))
      page.drawImage(image, { x: 20, y: 20, width: 40, height: 40 })
    }
  })
  await expect(compare(expected, actual)).rejects.toThrow()
})
