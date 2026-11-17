#!/usr/bin/env node
/** Scans our-videos / our-music / voice-messages and writes src/data/mediaManifest.generated.json */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PUB = path.join(ROOT, 'public')
const url = (abs) => '/' + path.relative(PUB, abs).split(path.sep).map(encodeURIComponent).join('/')

async function list(dir, exts) {
  const out = []
  let ents = []
  try { ents = await fs.readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of ents) {
    if (e.name.startsWith('.') || e.isSymbolicLink()) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await list(full, exts)))
    else if (exts.includes(path.extname(e.name).toLowerCase())) out.push(full)
  }
  return out.sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
}

const A = path.join(PUB, 'assets')
const videos = await list(path.join(A, 'our-videos'), ['.mp4', '.webm', '.mov', '.m4v'])
const music = await list(path.join(A, 'our-music'), ['.mp3', '.m4a', '.ogg', '.opus', '.wav', '.webm', '.aac'])
const voice = await list(path.join(A, 'voice-messages'), ['.mp3', '.m4a', '.ogg', '.opus', '.wav', '.webm', '.aac'])
const subs = await list(path.join(A, 'our-videos'), ['.vtt'])

const manifest = {
  videos: videos.map((v) => {
    const base = v.replace(/\.[^.]+$/, '')
    const vtt = subs.find((s) => s.startsWith(base))
    return { url: url(v), name: path.basename(v), type: v.endsWith('.webm') ? 'video/webm' : 'video/mp4', subtitles: vtt ? url(vtt) : undefined }
  }),
  music: music.map((m) => ({ url: url(m), name: path.basename(m) })),
  voice: voice.map((m) => ({ url: url(m), name: path.basename(m) })),
}
for (const v of videos) if (v.endsWith('.mov')) console.warn(`⚠ ${path.basename(v)}: .mov có thể không phát trên Android/Chrome. Nên chuyển sang MP4 (H.264): ffmpeg -i in.mov -c:v libx264 -crf 23 -c:a aac out.mp4`)
await fs.writeFile(path.join(ROOT, 'src/data/mediaManifest.generated.json'), JSON.stringify(JSON.parse(JSON.stringify(manifest)), null, 2) + '\n')
console.log(`🎞  ${videos.length} video · 🎵 ${music.length} nhạc · 🎙 ${voice.length} lời nhắn thoại`)
