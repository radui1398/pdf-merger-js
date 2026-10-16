import fs from 'node:fs/promises'
import type { AddOptions } from '@radui1398/pdf-merger-js/core'
import type { PathLike } from 'node:fs'
export type { Pages, Metadata, AddOptions } from '@radui1398/pdf-merger-js/core'
export type PdfInput = import('@radui1398/pdf-merger-js/core').PdfInput | Buffer | String | PathLike | string

import { PDFMergerBase } from '@radui1398/pdf-merger-js/core'

export default class PDFMerger extends PDFMergerBase<PdfInput> {
  protected async _getInputAsUint8Array (input: PdfInput, options: AddOptions = {}): Promise<Uint8Array> {
    if (input instanceof Buffer) {
      return input
    }

    // strings can be a path to a (local) files or a external URL
    if (typeof input === 'string' || input instanceof String) {
      try {
        return await fs.readFile(input as string, { signal: options.signal })
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT' && (e as NodeJS.ErrnoException).code !== 'ENOTDIR') throw e
        try {
          Boolean(new URL(input as string))
          input = new URL(input as string)
        } catch (e) {
          throw new Error(`The provided string "${input}" is neither a valid file-path nor a valid URL!`)
        }
      }
    }

    return await super._getInputAsUint8Array(input, options)
  }

  async saveAsBuffer () {
    const uInt8Array = await this._saveAsUint8Array()
    return Buffer.from(uInt8Array)
  }

  async save (fileName: PathLike) {
    const pdfBytes = await this._saveAsUint8Array()
    await fs.writeFile(fileName, pdfBytes)
  }
}
