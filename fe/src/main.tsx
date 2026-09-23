import { MotionConfig } from 'framer-motion'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router'
import { App } from './App'
import { store } from './app/store'
import './theme/theme.css'

// lo scroll lo gestisce l'app (in cima al cambio pagina, punto di partenza tornando a vetrina e
// Pokédex): il ripristino automatico del browser, animato dallo smooth del tema, lo sovrascriveva
history.scrollRestoration = 'manual'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        {/* "user": con prefers-reduced-motion le animazioni di movimento diventano semplici dissolvenze */}
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
