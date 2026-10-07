# SPDX-License-Identifier: GPL-3.0-or-later
# Apex Security - Application Security Posture Management platform
# Copyright (C) 2026 Apex Security contributors
# Licensed under the GNU General Public License v3.0 or later.
# See LICENSE.md in the repository root for the full license text.
import os
import sys

# Os testes importam "services.*", que vive em backend/ (estrutura definida na R1,
# com tests/ na raiz do projeto). Inserir backend/ no sys.path resolve o import
# sem alterar a estrutura de pastas.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
