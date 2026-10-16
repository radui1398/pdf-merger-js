export const MAX_SELECTED_PAGES = 100000

export function validatePageNumber (value: unknown): number {
  const number = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1) {
    throw new RangeError(`Invalid page number: ${String(value)}. Expected a positive safe integer.`)
  }
  return number
}

export function parsePagesString (pages: string, pageCount?: number): number[] {
  if (typeof pages !== 'string' || !pages.trim()) throw new TypeError('Invalid page selection: expected a non-empty string.')
  const result: number[] = []
  for (const token of pages.split(',')) {
    const match = token.trim().match(/^(\d+)(?:\s*(?:-|to)\s*(\d+))?$/)
    if (!match) throw new TypeError(`Invalid page selection: ${token}`)
    const start = validatePageNumber(match[1])
    const end = match[2] === undefined ? start : validatePageNumber(match[2])
    if (end < start) throw new RangeError(`Reversed page range: ${token}`)
    if (pageCount !== undefined && end > pageCount) throw new RangeError(`Page ${end} exceeds document page count ${pageCount}.`)
    if (end - start + 1 > MAX_SELECTED_PAGES - result.length) throw new RangeError(`Page selection exceeds ${MAX_SELECTED_PAGES} pages.`)
    for (let page = start; page <= end; page++) result.push(page)
  }
  return result
}
