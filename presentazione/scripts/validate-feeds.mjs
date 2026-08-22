import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { validateFeeds } from './feed-gate.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data')

const { errors, warnings, summaries } = validateFeeds(DATA_DIR)

if (warnings.length) {
  console.warn(`Feed gate warning (${warnings.length}):`)
  warnings.slice(0, 30).forEach((warning) => console.warn(`- ${warning}`))
}

if (errors.length) {
  console.error(`Feed gate FALLITO (${errors.length}):`)
  errors.slice(0, 30).forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

const warnNote = warnings.length ? ` · ${warnings.length} warning` : ''
console.log(`Feed gate OK · ${summaries.join(' · ')}${warnNote}`)
