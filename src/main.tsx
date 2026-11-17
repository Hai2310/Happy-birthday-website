import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/600-italic.css'
import '@fontsource/great-vibes/400.css'
import '@fontsource/be-vietnam-pro/300.css'
import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import './styles/index.css'
import gsap from 'gsap'
import App from './app/App'

// Story timing follows the real clock: on a slow phone a heavy frame must not stretch a 1 s transition into many seconds.
gsap.ticker.lagSmoothing(0)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
