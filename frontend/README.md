# Frontend do dashboard Apex Security

Dashboard React/Vite da plataforma. Produção: https://apex-security-kappa.vercel.app.

Para desenvolvimento local, execute `npm install`, copie `.env.example` para `.env.local`, configure `VITE_API_URL=http://localhost:8000/api` e rode `npm run dev`. O backend deve estar acessível na porta 8000. Para verificar o build, rode `npm run build`.

Na Vercel, use Root Directory `frontend` e `VITE_API_URL=https://apex-security-xzk4.onrender.com/api`. A variável é incorporada ao build; alterações exigem Redeploy. A documentação completa fica no [README da raiz](../README.md).

## Idiomas e testes

`src/locales/interface.*.json` completa os catálogos originais, com português idêntico ao texto de origem. `useInterfaceText()` traduz a apresentação e assina mudanças de idioma, inclusive para mensagens já exibidas. Valores de formulários enviados à API, código, identificadores e conteúdos reais não são reescritos.

- `npm run test:i18n`: verifica chaves, português e parâmetros nos sete idiomas.
- `npm run test:i18n:browser`: compara as 15 telas em português com o commit anterior, testa sete idiomas, seleção na sidebar, persistência, formulários, Demo e PDFs. Requer Playwright disponível; `APEX_PLAYWRIGHT_MODULE` pode apontar para sua instalação. `APEX_BASELINE_REF` altera a referência de comparação (padrão `796987e`, que precisa existir no histórico local).

Os testes usam APIs simuladas e bundles em memória, sem servidor nem chamadas externas. Para zh/hi/ja, PDFs preservam caracteres pela renderização do navegador; o texto é rasterizado. Nos demais idiomas, permanece a exportação Latin do jsPDF.
