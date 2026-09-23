import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { leggiToken } from '../../app/storage'
import { RUOLO_ADMIN, type Utente } from '../../types/api'

interface StatoAuth {
  token: string | null
  utente: Utente | null
  // true dopo un 401 inatteso: il SessionWatcher avvisa e porta al login
  sessioneScaduta: boolean
}

const statoIniziale: StatoAuth = {
  token: leggiToken(),
  utente: null,
  sessioneScaduta: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState: statoIniziale,
  reducers: {
    tokenImpostato(state, action: PayloadAction<string>) {
      state.token = action.payload
      state.utente = null
    },
    utenteCaricato(state, action: PayloadAction<Utente>) {
      // una risposta di /me arrivata dopo un logout non deve ripristinare l'utente
      if (state.token) state.utente = action.payload
    },
    logoutLocale(state) {
      state.token = null
      state.utente = null
    },
    sessioneScaduta(state) {
      if (state.token) state.sessioneScaduta = true
      state.token = null
      state.utente = null
    },
    avvisoSessioneGestito(state) {
      state.sessioneScaduta = false
    },
  },
  selectors: {
    selectToken: (state) => state.token,
    selectUtente: (state) => state.utente,
    selectIsAdmin: (state) => state.utente?.ruoli.includes(RUOLO_ADMIN) ?? false,
    selectSessioneScaduta: (state) => state.sessioneScaduta,
  },
})

export const { tokenImpostato, utenteCaricato, logoutLocale, sessioneScaduta, avvisoSessioneGestito } =
  authSlice.actions
export const { selectToken, selectUtente, selectIsAdmin, selectSessioneScaduta } = authSlice.selectors
export default authSlice.reducer
