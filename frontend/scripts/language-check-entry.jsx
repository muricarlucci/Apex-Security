/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
// Entry used only by the offline browser regression script.
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '../src/App'
import { DemoProvider } from '../src/context/DemoContext'
import i18n from '../src/i18n'
import '../src/index.css'

window.__i18n = i18n
window.__apiCalls = []
createRoot(document.getElementById('root')).render(
  <BrowserRouter><DemoProvider><App /></DemoProvider></BrowserRouter>,
)
