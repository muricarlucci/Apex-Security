/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import PullRequests from './pages/PullRequests'
import Remediations from './pages/Remediations'
import Repositories from './pages/Repositories'
import RealRisk from './pages/RealRisk'
import AnomalyAnalysis from './pages/AnomalyAnalysis'
import IntentChecker from './pages/IntentChecker'
import Radar from './pages/Radar'
import Login from './pages/Login'
import Signup from './pages/Signup'
import IntegrationKey from './pages/IntegrationKey'
import Account from './pages/Account'
import Contact from './pages/Contact'
import Notifications from './pages/Notifications'

export default function App() {
  return (
    <Routes>
      {/* Rotas publicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Painel — exige sessao ativa */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/pull-requests" element={<PullRequests />} />
                <Route path="/remediations" element={<Remediations />} />
                <Route path="/real-risk" element={<RealRisk />} />
                <Route path="/repositories" element={<Repositories />} />
                <Route path="/anomaly-analysis" element={<AnomalyAnalysis />} />
                <Route path="/intent-checker" element={<IntentChecker />} />
                <Route path="/radar" element={<Radar />} />
                <Route path="/integration-key" element={<IntegrationKey />} />
                <Route path="/account" element={<Account />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/notifications" element={<Notifications />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
