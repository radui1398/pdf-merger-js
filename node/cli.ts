#!/usr/bin/env node

import fs from 'fs'
import { program } from 'commander'

import PDFMerger from './index.js'
import { parsePagesString } from '@radui1398/pdf-merger-js/core'

async function main (packageJson: { version: string, description: string }) {
  program
    .version(packageJson.version)
    .description(packageJson.description)
    .requiredOption('-o, --output <outputFile>', 'Merged PDF output file path')
    .option('-v, --verbose', 'Print verbose output')
    .option('-s, --silent', 'do not print any output to stdout. Overwrites --verbose')
    .option('--timeout <ms>', 'PDF download timeout in milliseconds (0 disables)', '30000')
    .arguments('<inputFiles...>')
    .action(async (inputFiles: string[], cmd: { output?: string, verbose?: boolean, silent?: boolean, timeout: string }) => {
      const timeoutMs = /^\d+$/.test(cmd.timeout) ? Number(cmd.timeout) : NaN
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > 2147483647) throw new Error('Invalid --timeout: expected an integer between 0 and 2147483647.')
      const outputFile = cmd.output
      const verbose = cmd.verbose && !cmd.silent
      const silent = cmd.silent

      if (!outputFile) {
        console.error('Please provide an output file using the --output flag')
        process.exitCode = 1
        return
      }

      if (!inputFiles || !inputFiles.length) {
        console.error('Please provide at least one input file')
        process.exitCode = 1
        return
      }

      try {
        const merger = new PDFMerger()

        for (const inputFile of inputFiles) {
          const [filePath, pagesString] = inputFile.split('#')
          const pages = pagesString ? parsePagesString(pagesString) : null
          if (verbose) {
            if (pages && pages.length) {
              console.log(`adding page${pages.length > 1 ? 's' : ''} ${pages.join(',')} from ${filePath} to output...`)
            } else {
              console.log(`adding all pages from ${filePath} to output...`)
            }
          }
          await merger.add(filePath, pages, { timeoutMs })
        }

        if (verbose) {
          console.log(`Saving merged output to ${outputFile}...`)
        }

        await merger.save(outputFile)

        if (!silent) {
          console.log(`Merged pages successfully into ${outputFile}`)
        }
      } catch (error) {
        process.exitCode = 1
        console.error('An error occurred while merging the PDFs:', error)
      }
    })

  await program.parseAsync(process.argv)
}

(() => {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
  main(packageJson).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
})()
