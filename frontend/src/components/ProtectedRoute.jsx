/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { Navigate } from 'react-router-dom'

/**
 * Envolve as rotas do painel: sem token no localStorage, manda para /login.
 */
export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}
