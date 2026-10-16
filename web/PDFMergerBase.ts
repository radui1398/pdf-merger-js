import { PDFDocument, type LoadOptions } from '@cantoo/pdf-lib'

import { parsePagesString, validatePageNumber, MAX_SELECTED_PAGES } from './parsePagesString.js'

export type PdfInput = Uint8Array | ArrayBuffer | Blob | URL
export type Pages = string | string[] | number | number[] | null
export interface AddOptions {
  signal?: AbortSignal
  timeoutMs?: number
}
export interface Metadata {
  producer?: string
  author?: string
  title?: string
  creator?: string
}

export default class PDFMergerBase<Input = PdfInput> {
  protected _doc: PDFDocument | undefined = undefined

  protected _loadOptions: LoadOptions = {
    // in order to bypass passwordless encryption we set the password to ''
    ignoreEncryption: true,
    password: ''
  }

  constructor (loadOptions: LoadOptions = {}) {
    this._loadOptions = {
      ...this._loadOptions,
      ...loadOptions
    }

    this.reset()
  }

  reset () {
    this._doc = undefined
  }

  async setMetadata (metadata: Metadata) {
    const doc = await this._ensureDoc()
    if (metadata.producer) doc.setProducer(metadata.producer)
    if (metadata.author) doc.setAuthor(metadata.author)
    if (metadata.title) doc.setTitle(metadata.title)
    if (metadata.creator) doc.setCreator(metadata.creator)
  }

  async add (input: Input, pages?: Pages, options: AddOptions = {}) {
    const timeout = options.timeoutMs ?? 30000
    if (!Number.isSafeInteger(timeout) || timeout < 0 || timeout > 2147483647) {
      throw new RangeError('timeoutMs must be an integer between 0 and 2147483647.')
    }
    options.signal?.throwIfAborted()
    const src = await this._getInputAsUint8Array(input, options)
    options.signal?.throwIfAborted()
    const source = await PDFDocument.load(src, this._loadOptions)
    const count = source.getPageCount()
    let selected: number[]
    if (pages === undefined || pages === null || pages === 'all') {
      if (count > MAX_SELECTED_PAGES) throw new RangeError(`Page selection exceeds ${MAX_SELECTED_PAGES} pages.`)
      selected = source.getPageIndices().map(index => index + 1)
    } else if (typeof pages === 'string') {
      selected = parsePagesString(pages, count)
    } else {
      const values = Array.isArray(pages) ? pages : [pages]
      if (values.length > MAX_SELECTED_PAGES) throw new RangeError(`Page selection exceeds ${MAX_SELECTED_PAGES} pages.`)
      selected = values.map(validatePageNumber)
    }
    for (const page of selected) {
      if (page > count) throw new RangeError(`Page ${page} exceeds document page count ${count}.`)
    }
    options.signal?.throwIfAborted()
    const doc = await this._ensureDoc()
    const copied = await doc.copyPages(source, selected.map(page => page - 1))
    options.signal?.throwIfAborted()
    copied.forEach(page => doc.addPage(page))
  }

  protected async _ensureDoc (): Promise<PDFDocument> {
    if (!this._doc) {
      this._doc = await PDFDocument.create()
      this._doc.setProducer('pdf-merger-js')
      this._doc.setCreationDate(new Date())
    }
    return this._doc
  }

  protected async _saveAsUint8Array () {
    const doc = await this._ensureDoc()
    return await doc.save()
  }

  protected async _saveAsBase64 () {
    const doc = await this._ensureDoc()
    return await doc.saveAsBase64({ dataUri: true })
  }

  protected async _getInputAsUint8Array (input: unknown, options: AddOptions = {}): Promise<Uint8Array> {
    // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array
    if (input instanceof Uint8Array) {
      return input
    }

    // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer
    if (input instanceof ArrayBuffer || Object.prototype.toString.call(input) === '[object ArrayBuffer]') {
      return new Uint8Array(input as ArrayBuffer)
    }

    // see https://developer.mozilla.org/en-US/docs/Web/API/Blob
    if (typeof Blob !== 'undefined' && input instanceof Blob) {
      const aBuffer = await input.arrayBuffer()
      return new Uint8Array(aBuffer)
    }

    // see https://developer.mozilla.org/en-US/docs/Web/API/URL
    if (input instanceof URL) {
      if (typeof fetch === 'undefined') {
        throw new Error('fetch is not defined. You need to use a polyfill for this to work.')
      }
      const controller = new AbortController()
      const abort = () => controller.abort(options.signal?.reason)
      options.signal?.addEventListener('abort', abort, { once: true })
      if (options.signal?.aborted) abort()
      const timeout = options.timeoutMs ?? 30000
      const timer = timeout > 0 ? setTimeout(() => controller.abort(new DOMException('PDF download timed out.', 'TimeoutError')), timeout) : undefined
      try {
        const res = await fetch(input, { signal: controller.signal })
        if (!res.ok) {
          await res.body?.cancel()
          throw new Error(`PDF download failed: HTTP ${res.status} ${res.statusText}`)
        }
        return new Uint8Array(await res.arrayBuffer())
      } finally {
        if (timer !== undefined) clearTimeout(timer)
        options.signal?.removeEventListener('abort', abort)
      }
    }

    // throw a meaningful error if input type is unknown or invalid
    const allowedTypes = ['Uint8Array', 'ArrayBuffer', 'File', 'Blob', 'URL']
    let errorMsg = `pdf-input must be of type ${allowedTypes.join(', ')}, a valid filename or url!`
    if (typeof input === 'string' || input instanceof String) {
      errorMsg += ` Input was "${input}" wich is not an existing file, nor a valid URL!`
    } else {
      errorMsg += ` Input was of type "${typeof input}" instead.`
    }
    throw new Error(errorMsg)
  }

}
