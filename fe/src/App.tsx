import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { BarraNavigazione } from './components/BarraNavigazione'
import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { ToastViewport } from './components/ToastViewport'
import { AuthBootstrap, SessionWatcher } from './features/auth/GestioneSessione'
import { AdminRoute, ProtectedRoute } from './features/auth/RouteProtette'
import { AdminPage } from './pages/AdminPage'
import { ArtistaPage } from './pages/ArtistaPage'
import { ArtistiPage } from './pages/ArtistiPage'
import { BinderPage } from './pages/BinderPage'
import { CollezionePage } from './pages/CollezionePage'
import { CatalogoPage } from './pages/CatalogoPage'
import { EspansionePage } from './pages/EspansionePage'
import { ImpostazioniPage } from './pages/ImpostazioniPage'
import { LoginPage } from './pages/LoginPage'
import { NonTrovataPage } from './pages/NonTrovataPage'
import { PokedexPage } from './pages/PokedexPage'
import { PokemonPage } from './pages/PokemonPage'
import { PreferitiPage } from './pages/PreferitiPage'
import { ProfiloPage } from './pages/ProfiloPage'
import { RegisterPage } from './pages/RegisterPage'
import { cn } from './utils/cn'

export function App() {
  const location = useLocation()
  // tra un'espansione e l'altra (o un Pokémon e l'altro, o tra mensola e binder aperto)
  // la pagina resta montata: cambiano solo i contenuti
  const chiavePagina = location.pathname.startsWith('/espansioni/')
    ? '/espansioni'
    : location.pathname.startsWith('/pokedex/')
      ? '/pokedex/pokemon'
      : location.pathname.startsWith('/binder')
        ? '/binder'
        : location.pathname

  // binder aperto: niente barra in basso, all'album serve tutta l'altezza (si esce dal pulsante della mensola)
  const barraVisibile = !/^\/binder\/[^/]+/.test(location.pathname)

  // cambio pagina: si riparte dall'alto (i cambi di query string, come la paginazione, no).
  // Istantaneo: con lo scroll-behavior smooth del tema si vedrebbe la pagina risalire
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    // con-barra: da telefono la pagina lascia in fondo lo spazio della barra di navigazione
    <div className={cn('flex min-h-screen flex-col', barraVisibile && 'con-barra pb-(--spazio-barra)')}>
      <AuthBootstrap />
      <SessionWatcher />
      <Navbar />

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={chiavePagina}>
            <Route path="/" element={<CatalogoPage />} />
            <Route path="/espansioni/:id" element={<EspansionePage />} />
            <Route path="/pokedex" element={<PokedexPage />} />
            <Route path="/pokedex/:numero" element={<PokemonPage />} />
            <Route path="/artisti" element={<ArtistiPage />} />
            <Route path="/artisti/:slug" element={<ArtistaPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/preferiti"
              element={
                <ProtectedRoute>
                  <PreferitiPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profilo"
              element={
                <ProtectedRoute>
                  <ProfiloPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profilo/impostazioni"
              element={
                <ProtectedRoute>
                  <ImpostazioniPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collezione"
              element={
                <ProtectedRoute>
                  <CollezionePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/binder/:id?"
              element={
                <ProtectedRoute>
                  <BinderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NonTrovataPage />} />
          </Routes>
        </AnimatePresence>
      </div>

      <Footer />
      {barraVisibile && <BarraNavigazione />}
      <ToastViewport />
    </div>
  )
}
