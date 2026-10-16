import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const exec = promisify(execFile)
export default async function compare (expected, actual) {
  try {
    await exec(process.execPath, [fileURLToPath(new URL('./render-compare.js', import.meta.url)), expected, actual], { maxBuffer: 1024 * 1024 })
    return undefined
  } catch (error) {
    throw new Error(`PDF comparison failed: ${error.stderr || error.message}`)
  }
}
