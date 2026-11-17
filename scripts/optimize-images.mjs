#!/usr/bin/env node
// Re-generate every optimized photo from the originals (ignores cache).
process.argv.push('--force')
await import('./import-photos.mjs')
