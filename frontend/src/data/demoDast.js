/*
SPDX-License-Identifier: GPL-3.0-or-later
Apex Security - Application Security Posture Management platform
Copyright (C) 2026 Apex Security contributors
Licensed under the GNU General Public License v3.0 or later.
See LICENSE.md in the repository root for the full license text.
*/
const requested = new Date(Date.now() - 3600000).toISOString()
export const demoDastScans = [{ id: 801, target_kind: 'lab', target_url: 'http://localhost:3000', target_label: 'Laboratório Apex', mode: 'full', status: 'completed', requested_at: requested, started_at: requested, finished_at: new Date(Date.now() - 3300000).toISOString(), alerts_count: 5, counts: { HIGH: 2, MEDIUM: 1, LOW: 1, INFO: 1 }, zap_version: 'Demo' }]
export const demoDastAlerts = [
  ['Content Security Policy', 'MEDIUM', '10038', 'Use a restrictive Content-Security-Policy response header.'],
  ['Cookie without HttpOnly flag', 'LOW', '10010', 'Set HttpOnly and Secure flags on session cookies.'],
  ['Server version disclosure', 'INFO', '10036', 'Remove server version details from response headers.'],
  ['Cross Site Scripting (Reflected)', 'HIGH', '40012', 'Encode output for its context and validate untrusted input.'],
  ['SQL Injection', 'HIGH', '40018', 'Use parameterized queries and avoid SQL string concatenation.'],
].map(([title, severity, plugin, solution], index) => ({ id: 1801 + index, source_tool: 'zap', scan_type: 'DAST', repository: 'dast:juice-shop-lab', file_path: 'http://localhost:3000/', line_number: null, target_url: 'http://localhost:3000', title, title_key: `dast.demoTitle${index}`, solution_key: `dast.demoSolution${index}`, severity, severity_adjusted: severity, solution, cwe_id: index === 3 ? '79' : index === 4 ? '89' : null, created_at: requested, raw_output: JSON.stringify({ pluginid: plugin, instances: [] }) }))
