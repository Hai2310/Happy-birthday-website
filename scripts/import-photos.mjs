#!/usr/bin/env node
/**
 * Photo import pipeline — Our Universe
 *
 *  - Recursively scans public/assets/our-photos (any depth, Unicode/space-safe names)
 *  - Never modifies the originals
 *  - Applies EXIF orientation, writes optimized WebP copies in 3 sizes
 *  - Detects exact duplicates (SHA-1 of bytes) — duplicates are listed, not deleted
 *  - Reads EXIF DateTimeOriginal only when present (never guesses dates)
 *  - Writes src/data/photoManifest.generated.json
 *  - Skips & reports corrupted / unsupported files instead of crashing
 *
 * Optional overrides: public/assets/our-photos/photos.config.json
 *   { "IMG_0001.jpg": { "caption": "...", "alt": "...", "category": "hero", "order": 1, "scene": "finale" } }
 *
 * Usage: node scripts/import-photos.mjs [--src dir] [--out dir] [--manifest file] [--force]
 */
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const arg = (name, def) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : def
}
const SRC = arg('--src', path.join(ROOT, 'public/assets/our-photos'))
const OUT = arg('--out', path.join(ROOT, 'public/assets/optimized/photos'))
const MANIFEST = arg('--manifest', path.join(ROOT, 'src/data/photoManifest.generated.json'))
const PUBLIC_DIR = path.join(ROOT, 'public')
const FORCE = args.includes('--force')

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.heic', '.heif', '.gif', '.tif', '.tiff'])
const SIZES = { thumb: 480, medium: 1280, large: 2400 }

/** Category from folder names / filename keywords. Purely lexical — no visual inference. */
const CATEGORY_RULES = [
  ['hero', /(^|[\W_])(hero|portrait|chan-dung|chandung|cover)([\W_]|$)/i],
  ['couple', /(^|[\W_])(couple|us|together|doi|chung-minh|hai-dua)([\W_]|$)/i],
  ['romantic', /(^|[\W_])(romantic|date|hen-ho|lang-man|love)([\W_]|$)/i],
  ['travel', /(^|[\W_])(travel|trip|du-lich|dulich|beach|bien|nui)([\W_]|$)/i],
  ['occasion', /(^|[\W_])(anniversary|ky-niem|tet|valentine|noel|christmas|event)([\W_]|$)/i],
  ['birthday', /(^|[\W_])(birthday|sinh-nhat|sinhnhat|bday)([\W_]|$)/i],
  ['everyday', /(^|[\W_])(daily|everyday|thuong-ngay|hang-ngay)([\W_]|$)/i],
]

export function classify(relPath) {
  const norm = relPath.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
  for (const [cat, re] of CATEGORY_RULES) if (re.test(norm)) return cat
  return 'other'
}

export function stableId(hash) {
  return 'p_' + hash.slice(0, 12)
}

async function walk(dir) {
  const out = []
  let entries = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    // never follow symlinks out of the photo directory
    if (e.isSymbolicLink()) continue
    if (e.isDirectory()) out.push(...(await walk(full)))
    else if (e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase())) out.push(full)
  }
  return out
}

function parseExifDate(exifBuf, exifReader) {
  if (!exifBuf || !exifReader) return undefined
  try {
    const ex = exifReader(exifBuf)
    const d = ex?.Photo?.DateTimeOriginal || ex?.Image?.DateTime
    if (d instanceof Date && !isNaN(d.getTime()) && d.getFullYear() > 1990) return d.toISOString()
  } catch {
    /* unreadable EXIF — leave date unknown */
  }
  return undefined
}

const toUrl = (abs) => '/' + path.relative(PUBLIC_DIR, abs).split(path.sep).map(encodeURIComponent).join('/')

async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const { default: sharp } = await import('sharp')
  let exifReader
  try {
    exifReader = (await import('exif-reader')).default
  } catch {
    exifReader = undefined
  }

  await fs.mkdir(OUT, { recursive: true })
  let overrides = {}
  const cfgPath = path.join(SRC, 'photos.config.json')
  if (await exists(cfgPath)) {
    try {
      overrides = JSON.parse(await fs.readFile(cfgPath, 'utf8'))
    } catch (e) {
      console.warn(`⚠ photos.config.json không đọc được: ${e.message}`)
    }
  }

  const files = (await walk(SRC)).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
  const byHash = new Map()
  const photos = []
  const duplicates = []
  const failed = []

  for (const file of files) {
    const rel = path.relative(SRC, file).split(path.sep).join('/')
    try {
      const buf = await fs.readFile(file)
      const hash = createHash('sha1').update(buf).digest('hex')
      if (byHash.has(hash)) {
        duplicates.push({ file: rel, sameAs: byHash.get(hash).original })
        continue
      }
      const img = sharp(buf, { failOn: 'error' })
      const meta = await img.metadata()
      if (!meta.width || !meta.height) throw new Error('không có kích thước ảnh')
      // EXIF orientations 5–8 swap width/height
      const swap = (meta.orientation ?? 1) >= 5
      const width = swap ? meta.height : meta.width
      const height = swap ? meta.width : meta.height
      const id = stableId(hash)
      const variants = {}
      for (const [name, size] of Object.entries(SIZES)) {
        const outFile = path.join(OUT, `${id}-${name}.webp`)
        if (FORCE || !(await exists(outFile))) {
          await sharp(buf)
            .rotate() // apply EXIF orientation
            .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: name === 'thumb' ? 72 : 82, effort: 4 })
            .toFile(outFile)
        }
        variants[name] = toUrl(outFile)
      }
      const ov = overrides[rel] ?? overrides[path.basename(rel)] ?? {}
      const entry = {
        id,
        original: rel,
        originalUrl: toUrl(file),
        src: variants.medium,
        large: variants.large,
        thumb: variants.thumb,
        width,
        height,
        aspect: +(width / height).toFixed(4),
        date: parseExifDate(meta.exif, exifReader),
        category: ov.category ?? classify(rel),
        scene: ov.scene,
        caption: ov.caption,
        alt: ov.alt,
        order: typeof ov.order === 'number' ? ov.order : undefined,
      }
      byHash.set(hash, entry)
      photos.push(entry)
      process.stdout.write(`  ✓ ${rel}\n`)
    } catch (e) {
      const ext = path.extname(rel).toLowerCase()
      const hint = ext === '.heic' || ext === '.heif'
        ? ' (HEIC chưa giải mã được trên máy này — hãy xuất ảnh sang JPG, hoặc chạy: heif-convert ảnh.heic ảnh.jpg)'
        : ''
      failed.push({ file: rel, error: String(e.message || e) + hint })
      process.stdout.write(`  ✗ ${rel}: ${e.message}${hint}\n`)
    }
  }

  // Explicit order wins, then file order (natural sort). Dates are NOT used to reorder unless set via order.
  photos.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9))

  // Remove optimized files whose source disappeared
  const keep = new Set(photos.flatMap((p) => [p.src, p.large, p.thumb].map((u) => path.basename(decodeURIComponent(u)))))
  for (const f of await fs.readdir(OUT)) if (f.endsWith('.webp') && !keep.has(f)) await fs.unlink(path.join(OUT, f))

  const manifest = {
    generatedAt: new Date().toISOString(),
    count: photos.length,
    photos: photos.map((p) => JSON.parse(JSON.stringify(p))), // strip undefined
    duplicates,
    failed,
  }
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true })
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  console.log(
    `\n📸 ${photos.length} ảnh đã nhập · ${duplicates.length} ảnh trùng (vẫn giữ bản gốc) · ${failed.length} lỗi → ${path.relative(ROOT, MANIFEST)}`,
  )
  if (!photos.length) console.log('   Chưa có ảnh nào. Hãy chép ảnh vào public/assets/our-photos/ rồi chạy lại: npm run photos')
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('import-photos.mjs')) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
