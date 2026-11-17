import media from './mediaManifest.generated.json'
import { birthdayConfig } from '../config/birthdayConfig'

interface Media {
  videos: { url: string; name: string; type: string; subtitles?: string }[]
  music: { url: string; name: string }[]
  voice: { url: string; name: string }[]
}
const m = media as Media

export const surpriseVideo = birthdayConfig.surpriseVideo
  ? { url: birthdayConfig.surpriseVideo, type: birthdayConfig.surpriseVideo.endsWith('.webm') ? 'video/webm' : 'video/mp4', subtitles: undefined as string | undefined }
  : m.videos[0]
export const musicTracks = birthdayConfig.backgroundMusic ? [{ url: birthdayConfig.backgroundMusic, name: 'config' }] : m.music
export const voiceMessage = birthdayConfig.voiceMessage ?? m.voice[0]?.url
