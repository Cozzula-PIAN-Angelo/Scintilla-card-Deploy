import { AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import { Footer } from './components/Footer'
import { Navbar } from './components/Navbar'
import { ToastViewport } from './components/ToastViewport'
import { AuthBootstrap, SessionWatcher } from './features/auth/GestioneSessione'
import { AdminRoute, ProtectedRoute } from './features/auth/RouteProtette'
import { AdminPage } from './pages/AdminPage'
import { CatalogoPage } from './pages/CatalogoPage'
import { LoginPage } from './pages/LoginPage'
import { NonTrovataPage } from './pages/NonTrovataPage'
import { PreferitiPage } from './pages/PreferitiPage'
import { RegisterPage } from './pages/RegisterPage'

export function App() {
  const location = useLocation()

  // cambio pagina: si riparte dall'alto (i cambi di query string, come la paginazione, no)
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <AuthBootstrap />
      <SessionWatcher />
      <Navbar />

      <div className="flex-1">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<CatalogoPage />} />
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
      <ToastViewport />
    </div>
  )
}
