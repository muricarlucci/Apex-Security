/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { createContext, useContext, useState } from 'react'

const DemoContext = createContext({ isDemoMode: false, setIsDemoMode: () => {} })

export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false)

  return (
    <DemoContext.Provider value={{ isDemoMode, setIsDemoMode }}>
      {children}
    </DemoContext.Provider>
  )
}

export const useDemoMode = () => useContext(DemoContext)

/** Pequeno atraso artificial para o Modo Demo nao parecer instantaneo demais. */
export const demoDelay = (ms = 150) => new Promise(resolve => setTimeout(resolve, ms))
