import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

export type TipoToast = 'successo' | 'errore' | 'info'

export interface Toast {
  id: string
  tipo: TipoToast
  messaggio: string
  // etichetta del bottone; cosa fa lo sa useToast (le funzioni non vanno nello store)
  azione?: string
  durata?: number
}

const MASSIMO_VISIBILI = 4

const toastSlice = createSlice({
  name: 'toast',
  initialState: [] as Toast[],
  reducers: {
    toastAggiunto: {
      reducer(state, action: PayloadAction<Toast>) {
        state.push(action.payload)
        if (state.length > MASSIMO_VISIBILI) state.shift()
      },
      prepare(tipo: TipoToast, messaggio: string, opzioni: { azione?: string; durata?: number } = {}) {
        return { payload: { id: nanoid(), tipo, messaggio, ...opzioni } }
      },
    },
    toastRimosso(state, action: PayloadAction<string>) {
      return state.filter((toast) => toast.id !== action.payload)
    },
  },
})

export const { toastAggiunto, toastRimosso } = toastSlice.actions
export default toastSlice.reducer
