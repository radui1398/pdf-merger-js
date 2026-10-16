import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const resources = fileURLToPath(new URL('../../node_modules/pdfjs-dist/', import.meta.url))
const tasks = []
async function load (file) {
  const task = getDocument({ data: new Uint8Array(await readFile(file)), standardFontDataUrl: path.join(resources, 'standard_fonts/'), cMapUrl: path.join(resources, 'cmaps/'), cMapPacked: true, useSystemFonts: false })
  tasks.push(task)
  return await task.promise
}
async function render (page) {
  const viewport = page.getViewport({ scale: 1 })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const context = canvas.getContext('2d')
  await page.render({ canvasContext: context, viewport, background: 'white' }).promise
  return { canvas, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data }
}
try {
  const [expected, actual] = await Promise.all(process.argv.slice(2).map(load))
  assert.equal(actual.numPages, expected.numPages, 'Page count')
  for (let i = 1; i <= expected.numPages; i++) {
    const [a, b] = await Promise.all([expected.getPage(i), actual.getPage(i)])
    let structuralError
    try {
      assert.deepEqual(b.view, a.view, `Page ${i} dimensions`)
      assert.equal(b.rotate, a.rotate, `Page ${i} rotation`)
      const texts = await Promise.all([a, b].map(async page => (await page.getTextContent()).items.map(item => ({ str: item.str, transform: item.transform, width: item.width, height: item.height }))))
      assert.deepEqual(texts[1], texts[0], `Page ${i} text`)
    } catch (error) { structuralError = error }
    const [left, right] = await Promise.all([render(a), render(b)])
    if (structuralError || !Buffer.from(left.pixels).equals(Buffer.from(right.pixels))) {
      const id = createHash('sha256').update(process.argv.slice(2).join('|')).digest('hex').slice(0, 12)
      const dir = path.resolve('test/artifacts', `${id}-page-${i}`)
      await mkdir(dir, { recursive: true })
      const diff = createCanvas(left.canvas.width, left.canvas.height)
      const ctx = diff.getContext('2d')
      const data = ctx.createImageData(diff.width, diff.height)
      for (let p = 0; p < data.data.length; p += 4) {
        const different = left.pixels.slice(p, p + 4).some((value, j) => value !== right.pixels[p + j])
        data.data.set(different ? [255, 0, 0, 255] : [255, 255, 255, 255], p)
      }
      ctx.putImageData(data, 0, 0)
      await Promise.all([['expected', left.canvas], ['actual', right.canvas], ['difference', diff]].map(([name, canvas]) => writeFile(path.join(dir, `${name}.png`), canvas.toBuffer('image/png'))))
      throw new Error(`Page ${i} mismatch: ${structuralError?.message || 'pixels differ'}; artifacts: ${dir}`)
    }
    a.cleanup(); b.cleanup()
  }
} finally {
  await Promise.all(tasks.map(task => task.destroy()))
}
