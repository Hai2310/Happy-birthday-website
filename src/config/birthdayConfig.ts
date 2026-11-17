/**
 * ═══════════════════════════════════════════════════════════════════
 *  OUR UNIVERSE — FILE CÁ NHÂN HOÁ DUY NHẤT
 *  Sửa tên, lời nhắn, thư tay, lý do yêu em... tất cả ở đây.
 *  Mỗi chuỗi có dạng { vi, en } — tiếng Việt là mặc định, en là tuỳ chọn.
 *  Các chỗ ghi  ✏️  là chỗ anh nên điền thông tin thật của hai đứa.
 * ═══════════════════════════════════════════════════════════════════
 */
import type { StageId } from '../stores/experience'

export type L = { vi: string; en?: string }

export interface TimelineMilestone {
  title: L
  /** Ngày thật (tuỳ chọn). Để trống nếu không chắc — trang sẽ không bịa ngày. */
  date?: string
  description: L
  /** Tên file gốc trong our-photos (vd "2024/bien.jpg") hoặc số thứ tự ảnh (0, 1, 2...). Bỏ trống = tự chọn. */
  photo?: string | number
}

export interface BirthdayConfig {
  girlfriendName: string
  boyfriendName: string
  nickname: string
  /** Tuổi mới — hiển thị trên topper bánh kem và số nến */
  age?: number
  /** YYYY-MM-DD (tuỳ chọn) */
  birthdayDate?: string
  /** YYYY-MM-DD (tuỳ chọn) — nếu có sẽ hiện "đã bên nhau N ngày" */
  relationshipStartDate?: string
  preferredLanguage: 'vi' | 'en'
  theme: 'midnight-rose'
  primaryColor: string
  accentColor: string
  musicEnabled: boolean
  /** Đường dẫn nhạc nền. Bỏ trống = tự dùng file đầu tiên trong public/assets/our-music, nếu không có thì dùng bản nhạc piano được tạo trực tiếp trên trình duyệt. */
  backgroundMusic?: string
  /** Bỏ trống = tự dùng file đầu tiên trong public/assets/voice-messages */
  voiceMessage?: string
  /** Bỏ trống = tự dùng file đầu tiên trong public/assets/our-videos */
  surpriseVideo?: string
  /** Tên file ảnh chân dung chính (trong our-photos). Bỏ trống = ảnh "hero" đầu tiên hoặc ảnh đầu tiên. */
  heroPhoto?: string
  /**
   * Mật mã mở quà (chỉ để tạo bất ngờ, KHÔNG phải bảo mật thật).
   * Ví dụ ngày sinh "1711". Để null = không cần mật mã.
   */
  secretCode: string | null
  secretHint: L
  secretMessage: L
  invitation: { line1: L; line2: L; cta: L }
  room: { title: L; subtitle: L }
  garden: { line1: L; line2: L; roseMessages: L[]; butterflySurprise: L }
  universe: { title: L; subtitle: L }
  timelineIntro: L
  timeline: TimelineMilestone[]
  reasonsILoveYou: L[]
  cake: { wishPrompt: L; afterBlow: L }
  loveLetter: { greeting: L; paragraphs: L[]; closing: L }
  /** Lời nhắn dự phòng khi chưa có file ghi âm giọng nói */
  voiceFallback: L
  /** Chú thích ảnh theo tên file gốc. Cũng có thể dùng public/assets/our-photos/photos.config.json */
  photoCaptions: Record<string, L>
  sceneOrder: StageId[]
  enabledScenes: Partial<Record<StageId, boolean>>
  finalMessage: L[]
  signature: L
}

export const birthdayConfig: BirthdayConfig = {
  // ✏️ Tên thật của em (hiện ở "Happy Birthday, ..."). Đang để biệt danh anh hay gọi.
  girlfriendName: 'Bé Iu',
  // ✏️ Tên của anh
  boyfriendName: 'Anh Bé Thỏ',
  nickname: 'bé iu',
  age: 20,
  birthdayDate: undefined, // ✏️ vd '2006-11-17'
  relationshipStartDate: undefined, // ✏️ vd '2024-02-14'
  preferredLanguage: 'vi',
  theme: 'midnight-rose',
  primaryColor: '#D8B987',
  accentColor: '#D991A9',
  musicEnabled: true,
  backgroundMusic: undefined,
  voiceMessage: undefined,
  surpriseVideo: undefined,
  heroPhoto: 'tu-chat/anh-23.jpg',

  secretCode: null,
  secretHint: { vi: 'Gợi ý: ngày sinh của em (ngày + tháng, vd 1711)', en: 'Hint: your birthday (day + month, e.g. 1711)' },
  secretMessage: {
    vi: 'Có những điều anh không nói được thành lời, nên anh gói chúng vào đây.',
    en: "Some things I couldn't say out loud, so I wrapped them up here.",
  },

  invitation: {
    line1: { vi: 'Có một điều đặc biệt đang chờ em...', en: 'Something special is waiting for you...' },
    line2: { vi: 'Một thế giới nhỏ, được tạo nên chỉ dành riêng cho em.', en: 'A little world, made only for you.' },
    cta: { vi: 'Chạm để mở món quà', en: 'Tap to open your gift' },
  },

  room: {
    title: { vi: 'Tuổi 20 của em bắt đầu từ đây', en: 'Your twenties begin right here' },
    subtitle: {
      vi: 'Hôm nay là bé iu đã 20 tuổi rùi đó...',
      en: "Today my little love is turning 20...",
    },
  },

  garden: {
    line1: { vi: 'Nếu tình yêu có hình dạng...', en: 'If love had a shape...' },
    line2: { vi: 'Anh muốn nó đẹp như thế giới này, dành riêng cho em.', en: 'I would want it to be as beautiful as this world — made just for you.' },
    roseMessages: [
      { vi: 'Mỗi bông hoa ở đây là một lần anh nghĩ đến em trong ngày.', en: 'Every flower here is a time I thought of you today.' },
      { vi: 'Anh chúc em gặp được thật nhiều điều tốt đẹp, như hoa nở đúng mùa.', en: 'I wish you so many beautiful things, like flowers blooming in their season.' },
      { vi: 'Đừng gắng quá nha bé iu. Hoa cũng cần được nghỉ ngơi mà.', en: "Don't push yourself too hard, love. Even flowers need rest." },
      { vi: 'Em không cần phải hoàn hảo. Em chỉ cần là em thôi.', en: "You don't have to be perfect. You only have to be you." },
      { vi: 'Ở đâu có em, ở đó là khu vườn đẹp nhất của anh.', en: 'Wherever you are is my most beautiful garden.' },
    ],
    butterflySurprise: {
      vi: 'Bé bướm nhỏ này nhờ anh nói: "Hôm nay em là người đặc biệt nhất."',
      en: 'This little butterfly asked me to tell you: "Today, you are the most special one."',
    },
  },

  universe: {
    title: { vi: 'Vũ trụ kỷ niệm của chúng mình', en: 'Our universe of memories' },
    subtitle: {
      vi: 'Anh đã gom lại những khoảnh khắc đẹp nhất của chúng mình... để mỗi lần em mở ra, em sẽ biết mình được yêu thương nhiều đến thế nào.',
      en: "I gathered our most beautiful moments... so every time you open this, you'll know how deeply you are loved.",
    },
  },

  timelineIntro: { vi: 'Câu chuyện của chúng mình, từng trang một', en: 'Our story, one page at a time' },
  // ✏️ Sửa tiêu đề / ngày / mô tả cho đúng chuyện thật của hai đứa. Không có ngày thì để trống.
  timeline: [
    {
      title: { vi: 'Ngày bắt đầu', en: 'The beginning' },
      description: { vi: 'Ngày mà mọi thứ bắt đầu — và anh chưa biết rằng mình may mắn đến thế.', en: "The day it all began — and I didn't yet know how lucky I was." },
      photo: 'tu-chat/anh-27.jpg',
    },
    {
      title: { vi: 'Kỷ niệm đầu tiên', en: 'Our first memory' },
      description: { vi: 'Khoảnh khắc đầu tiên anh muốn giữ lại mãi.', en: 'The first moment I wanted to keep forever.' },
      photo: 'tu-chat/anh-01.jpg',
    },
    {
      title: { vi: 'Những ngày đẹp bên nhau', en: 'Beautiful days together' },
      description: { vi: 'Không cần một ngày thật hoàn hảo. Chỉ cần có em bên cạnh.', en: "It doesn't need to be a perfect day. Just a day with you." },
      photo: 'tu-chat/anh-06.jpg',
    },
    {
      title: { vi: 'Những điều bình thường', en: 'Ordinary little things' },
      description: { vi: 'Anh thích cả những khoảnh khắc rất bình thường khi có em.', en: 'I love even the most ordinary moments with you.' },
      photo: 'tu-chat/anh-20.jpg',
    },
    {
      title: { vi: 'Hôm nay — em 20 tuổi', en: 'Today — you are 20' },
      description: { vi: 'Tuổi 20 của em, anh muốn được đi cùng em từng ngày một.', en: 'Your twenties — I want to walk beside you, one day at a time.' },
      photo: 'tu-chat/anh-28.jpg',
    },
    {
      title: { vi: 'Những điều phía trước', en: 'What lies ahead' },
      description: { vi: 'Những mục tiêu em ấp ủ, những nơi mình chưa đến... anh muốn cùng em đi hết.', en: "The dreams you hold, the places we haven't been yet... I want to see them all with you." },
      photo: 'tu-chat/anh-14.jpg',
    },
  ],

  reasonsILoveYou: [
    { vi: 'Anh yêu nụ cười của em.', en: 'I love your smile.' },
    { vi: 'Anh thích cả những khoảnh khắc rất bình thường khi có em.', en: 'I love even the most ordinary moments with you.' },
    { vi: 'Cảm ơn em vì đã xuất hiện trong cuộc đời anh.', en: 'Thank you for coming into my life.' },
    { vi: 'Mong rằng mỗi ngày bên em đều là một ngày thật đẹp.', en: 'I hope every day with you is a beautiful day.' },
    { vi: 'Vì ở bên em, anh được là chính mình.', en: 'Because with you, I get to be myself.' },
    { vi: 'Vì em làm những ngày mệt nhất của anh nhẹ đi.', en: 'Because you make my hardest days lighter.' },
    { vi: 'Vì em là bé iu của anh — chỉ vậy thôi là đủ.', en: "Because you're my little love — that's enough." },
    { vi: 'Khi nào em mệt, cứ dựa vào anh nhé. Anh bé thỏ luôn ở đây.', en: "Whenever you're tired, lean on me. Your bunny is always here." },
  ],

  cake: {
    wishPrompt: { vi: 'Nhắm mắt lại và ước một điều thật đẹp nhé.', en: 'Close your eyes and make a beautiful wish.' },
    afterBlow: { vi: 'Chúc mừng sinh nhật em yêu!', en: 'Happy birthday, my love!' },
  },

  // 💌 Thư tay — dựa trên chính lời của anh, chỉ thêm một chút ngọt ngào. Sửa thoải mái.
  loveLetter: {
    greeting: { vi: 'Gửi bé iu của anh,', en: 'To my little love,' },
    paragraphs: [
      {
        vi: 'Hôm nay là bé iu đã 20 tuổi rùi đó... Anh ngồi nghĩ mãi không biết nói gì cho đủ, nên anh gom hết vào thế giới nhỏ này — chỉ dành riêng cho em thôi.',
        en: "Today my little love is turning 20... I thought for so long about what to say and nothing felt like enough, so I put it all into this little world — made only for you.",
      },
      {
        vi: 'Anh chúc em gặp được thật nhiều điều tốt đẹp, hoàn thành được những mục tiêu em đang ấp ủ trong tương lai nhớ. Anh tin em làm được, và anh sẽ luôn là người cổ vũ em to nhất.',
        en: "I wish you so many good things, and that you reach every goal you're dreaming of. I believe in you, and I'll always be your loudest cheerleader.",
      },
      {
        vi: 'Nhưng mà đừng gắng quá nha bé iu. Em không cần lúc nào cũng phải mạnh mẽ đâu. Khi nào buồn, khi nào mệt, khi nào thấy mọi thứ hơi nặng một chút... thì luôn có anh bé thỏ ở đây nè. Em chỉ cần quay lại thôi, anh vẫn ở đó, nghe em kể hết mọi chuyện.',
        en: "But don't push yourself too hard, okay? You don't always have to be strong. Whenever you're sad, or tired, or the world feels a little too heavy... your bunny is always right here. Just turn around — I'll be there, listening to everything.",
      },
      {
        vi: 'Chúc bé iu tuổi mới luôn khỏe mạnh, có thật nhiều niềm vui, thật nhiều hạnh phúc — và hạnh phúc bên cạnh anh nữa nhớ.',
        en: 'Happy new age, my love. Stay healthy, find so much joy, so much happiness — and be happy right here beside me.',
      },
      {
        vi: 'Những ngày vui, anh muốn cười cùng em. Những ngày buồn, anh muốn ở bên em. Cảm ơn em đã đến, đã ở lại, và đã là bé iu của anh.',
        en: 'On the happy days, I want to laugh with you. On the sad days, I want to stay by your side. Thank you for coming, for staying, and for being my little love.',
      },
    ],
    closing: {
      vi: 'Anh yêu em nhiều lắm — nhiều hơn tất cả những ngôi sao trong vũ trụ nhỏ này cộng lại.',
      en: 'I love you so much — more than all the stars in this little universe put together.',
    },
  },

  voiceFallback: {
    vi: 'Nếu em đang đọc dòng này, nghĩa là anh còn ngại chưa dám ghi âm. Nhưng anh muốn em tưởng tượng giọng anh đang nói thật nhỏ bên tai em: "Chúc mừng sinh nhật, bé iu. Anh ở đây nè."',
    en: 'If you\'re reading this, I was still too shy to record my voice. But imagine me whispering softly: "Happy birthday, my love. I\'m right here."',
  },

  // ✏️ Chú thích ảnh: 'ten-file.jpg': { vi: '...', en: '...' }
  photoCaptions: {},

  sceneOrder: ['invitation', 'room', 'garden', 'universe', 'timeline', 'tree', 'cake', 'gift', 'finale'],
  enabledScenes: {},

  finalMessage: [
    { vi: 'Thế giới này có rất nhiều điều đẹp đẽ...', en: 'This world is full of beautiful things...' },
    { vi: 'Nhưng với anh, một trong những điều đẹp nhất chính là có em.', en: 'But to me, one of the most beautiful is having you.' },
    { vi: 'Chúc em một tuổi 20 thật hạnh phúc. Đừng gắng quá nha, vì đã có anh ở đây rồi.', en: "Have the happiest twentieth year. Don't push too hard — I'm right here." },
    { vi: 'Anh yêu em.', en: 'I love you.' },
  ],
  signature: { vi: 'Yêu em thật nhiều — Anh bé thỏ của em', en: 'With all my love — your bunny' },
}
