# Frontend do dashboard Apex Security

Dashboard React/Vite da plataforma. Produção: https://apex-security-kappa.vercel.app.

Para desenvolvimento local, execute `npm install`, copie `.env.example` para `.env.local`, configure `VITE_API_URL=http://localhost:8000/api` e rode `npm run dev`. O backend deve estar acessível na porta 8000. Para verificar o build, rode `npm run build`.

Na Vercel, use Root Directory `frontend` e `VITE_API_URL=https://apex-security-xzk4.onrender.com/api`. A variável é incorporada ao build; alterações exigem Redeploy. A documentação completa fica no [README da raiz](../README.md).
