import type { AddOptions } from './core.js'
import PDFMergerBase from './PDFMergerBase.js'

const globalObject = globalThis
export type { Pages, Metadata, AddOptions } from './core.js'
export type PdfInput = import('./core.js').PdfInput | File | String | string

export default class PDFMerger extends PDFMergerBase<PdfInput> {
  protected async _getInputAsUint8Array (input: PdfInput, options: AddOptions = {}): Promise<Uint8Array> {
    // see https://developer.mozilla.org/en-US/docs/Web/API/File
    if (typeof globalObject.File !== 'undefined' && input instanceof globalObject.File && typeof globalObject.FileReader !== 'undefined') {
      return new Promise<Uint8Array>((resolve, reject) => {
        const fileReader = new globalObject.FileReader()
        const cleanup = () => {
          fileReader.onload = fileReader.onerror = fileReader.onabort = null
          options.signal?.removeEventListener('abort', abort)
        }
        const fail = (error: unknown) => { cleanup(); reject(error) }
        const abort = () => {
          fileReader.abort()
          fail(options.signal?.reason ?? new DOMException('File reading aborted.', 'AbortError'))
        }
        fileReader.onerror = () => fail(fileReader.error ?? new Error('File reading failed.'))
        fileReader.onabort = () => fail(options.signal?.reason ?? new DOMException('File reading aborted.', 'AbortError'))
        fileReader.onload = () => {
          const result = fileReader.result
          if (!(result instanceof ArrayBuffer)) { fail(new TypeError('FileReader did not return an ArrayBuffer.')); return }
          cleanup()
          resolve(new Uint8Array(result))
        }
        options.signal?.addEventListener('abort', abort, { once: true })
        if (options.signal?.aborted) { abort(); return }
        try { fileReader.readAsArrayBuffer(input as File) } catch (error) { fail(error) }
      })
    }

    // strings are treated as URLs int the browser context
    if (typeof input === 'string' || input instanceof String) {
      try {
        Boolean(new URL(input as string))
      } catch (e) {
        throw new Error(`This is not a valid url: ${input}`)
      }
      input = new URL(input as string)
    }

    return await super._getInputAsUint8Array(input, options)
  }

  async saveAsBuffer () {
    return await this._saveAsUint8Array()
  }

  async saveAsBlob () {
    const buffer = await this._saveAsUint8Array()

    return new globalObject.Blob([buffer as Uint8Array<ArrayBuffer>], {
      type: 'application/pdf'
    })
  }

  async save (fileName: string) {
    const dataUri = await this._saveAsBase64()

    const link = document.createElement('a')
    link.href = dataUri
    link.download = `${fileName}.pdf`
    link.click()
  }
}
