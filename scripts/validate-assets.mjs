#!/usr/bin/env node
/** Checks every URL referenced by the generated manifests exists on disk. Exit 1 on missing files. */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pub = (u) => path.join(ROOT, 'public', ...u.split('/').filter(Boolean).map(decodeURIComponent))
const read = async (f) => JSON.parse(await fs.readFile(path.join(ROOT, 'src/data', f), 'utf8'))
const photos = await read('photoManifest.generated.json')
const media = await read('mediaManifest.generated.json')
const urls = [
  ...photos.photos.flatMap((p) => [p.src, p.large, p.thumb, p.originalUrl]),
  ...media.videos.map((v) => v.url), ...media.music.map((m) => m.url), ...media.voice.map((m) => m.url),
]
const missing = []
for (const u of urls) { try { await fs.access(pub(u)) } catch { missing.push(u) } }
const ids = new Set(photos.photos.map((p) => p.id))
console.log(`Ảnh: ${photos.count} (id duy nhất: ${ids.size}) · trùng: ${photos.duplicates.length} · lỗi: ${photos.failed.length}`)
console.log(`Video: ${media.videos.length} · Nhạc: ${media.music.length} · Giọng nói: ${media.voice.length}`)
if (missing.length) { console.error('Thiếu file:\n  ' + missing.join('\n  ')); process.exit(1) }
if (ids.size !== photos.count) { console.error('ID ảnh bị trùng'); process.exit(1) }
console.log('✓ Tất cả tài nguyên đều tồn tại')
