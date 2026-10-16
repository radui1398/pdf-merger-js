/** @jest-environment jsdom */
import { jest } from '@jest/globals'
import Merger from '@radui1398/pdf-merger-js'
const OriginalReader = globalThis.FileReader
const originalFetch = globalThis.fetch

afterEach(() => { globalThis.FileReader = OriginalReader; globalThis.fetch = originalFetch })

test.each(['error', 'abort', 'invalid'])('FileReader %s rejects', async mode => {
  globalThis.FileReader = class {
    readAsArrayBuffer () {
      if (mode === 'error') { this.error = new Error('read failed'); this.onerror() }
      if (mode === 'abort') this.onabort()
      if (mode === 'invalid') { this.result = 'invalid'; this.onload() }
    }
  }
  await expect(new Merger().add(new File(['x'], 'test.pdf'))).rejects.toThrow()
})
test('signal aborts reader and removes handlers', async () => {
  let reader
  globalThis.FileReader = class {
    constructor () { reader = this }
    readAsArrayBuffer () {}
    abort () { this.onabort?.() }
  }
  const controller = new AbortController()
  const pending = new Merger().add(new File(['x'], 'test.pdf'), null, { signal: controller.signal })
  controller.abort()
  await expect(pending).rejects.toThrow()
  expect(reader.onload).toBeNull()
  expect(reader.onerror).toBeNull()
  expect(reader.onabort).toBeNull()
})
test('HTTP failures do not parse body', async () => {
  const arrayBuffer = jest.fn()
  globalThis.fetch = jest.fn(async () => ({ ok: false, status: 500, statusText: 'Error', arrayBuffer }))
  await expect(new Merger().add('https://fixtures.test/error')).rejects.toThrow('HTTP 500')
  expect(arrayBuffer).not.toHaveBeenCalled()
})
test('fetch timeout and caller cancellation', async () => {
  globalThis.fetch = jest.fn((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  }))
  await expect(new Merger().add('https://fixtures.test/slow', null, { timeoutMs: 10 })).rejects.toThrow()
  const controller = new AbortController()
  const pending = new Merger().add('https://fixtures.test/slow', null, { signal: controller.signal })
  controller.abort()
  await expect(pending).rejects.toThrow()
})
test('binary inputs work without File and FileReader globals', async () => {
  const OriginalFile = globalThis.File
  try {
    globalThis.File = undefined
    globalThis.FileReader = undefined
    // A malformed PDF must reach PDF parsing, not fail while accessing File.
    await expect(new Merger().add(new Uint8Array([1, 2, 3]))).rejects.toThrow(/PDF|header/i)
  } finally { globalThis.File = OriginalFile }
})
