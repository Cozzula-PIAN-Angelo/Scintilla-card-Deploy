import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import toastReducer from '../features/toast/toastSlice'
import { api } from './api'
import { salvaToken } from './storage'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    toast: toastReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
})

// il token in localStorage segue sempre quello dello slice auth
let tokenPrecedente = store.getState().auth.token
store.subscribe(() => {
  const token = store.getState().auth.token
  if (token !== tokenPrecedente) {
    tokenPrecedente = token
    salvaToken(token)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
