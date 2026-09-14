// The context module imports nothing from the app, so no screen can create an
// import cycle by reaching for state.

import { createContext, useContext } from 'react'

export const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppContext.Provider>')
  return ctx
}
