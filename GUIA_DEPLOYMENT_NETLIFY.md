# 🚀 Guia Completo de Deploy no Netlify

## 📋 Pré-requisitos
- Conta no GitHub
- Conta no Netlify (pode criar com a conta do GitHub)
- Projeto já pronto e funcionando localmente

---

## 🔧 PARTE 1: Preparar e Enviar para o GitHub

### Passo 1: Verificar o Estado do Git
Abra o PowerShell na pasta raiz do projeto e execute:

```powershell
git status
```

Isso mostrará quais arquivos foram modificados.

### Passo 2: Adicionar Todos os Arquivos Modificados
```powershell
git add .
```

### Passo 3: Fazer o Commit
```powershell
git commit -m "Preparar projeto para deploy no Netlify"
```

### Passo 4: Enviar para o GitHub
```powershell
git push origin main
```

**⚠️ IMPORTANTE:** Se você ainda não criou o repositório no GitHub:

1. Acesse [github.com](https://github.com)
2. Clique no botão **"+"** no canto superior direito
3. Selecione **"New repository"**
4. Dê um nome ao repositório (ex: `social-trial` ou `solo-challenge`)
5. **NÃO** marque "Add a README file"
6. Clique em **"Create repository"**
7. Copie os comandos mostrados na seção **"…or push an existing repository from the command line"**
8. Cole esses comandos no PowerShell na pasta do seu projeto

---

## 🌐 PARTE 2: Deploy no Netlify

### Passo 1: Acessar o Netlify
1. Abra seu navegador e vá para [app.netlify.com](https://app.netlify.com)
2. Se não tiver conta, clique em **"Sign up"**
3. Escolha **"Sign up with GitHub"** (recomendado)
4. Autorize o Netlify a acessar sua conta do GitHub

### Passo 2: Importar o Projeto
1. No painel do Netlify, clique em **"Add new site"**
2. Selecione **"Import an existing project"**
3. Escolha **"Deploy with GitHub"**
4. Será solicitada autorização - clique em **"Authorize Netlify"**
5. Na lista de repositórios, procure e clique no seu projeto

### Passo 3: Configurar as Opções de Build

**📝 Preencha os campos exatamente assim:**

| Campo | Valor |
|-------|-------|
| **Branch to deploy** | `main` |
| **Base directory** | `frontend` |
| **Build command** | `npm run build` |
| **Publish directory** | `frontend/dist` |

### Passo 4: Adicionar Variável de Ambiente

**ANTES de clicar em Deploy:**

1. Clique em **"Show advanced"** ou **"Advanced build settings"**
2. Clique em **"Add environment variable"**
3. Preencha:
   - **Key:** `VITE_API_URL`
   - **Value:** `http://localhost:8000` *(temporário - você mudará depois)*
4. Clique em **"Add"**

### Passo 5: Fazer o Deploy
1. Clique no botão **"Deploy [nome-do-site]"**
2. Aguarde o processo de build (2-5 minutos)
3. Você verá logs aparecendo na tela - isso é normal!

### Passo 6: Verificar o Deploy
1. Quando aparecer **"Site is live"** com um ✅, seu site está no ar!
2. Clique no link gerado (será algo como `random-name-123456.netlify.app`)
3. Seu frontend estará funcionando!

---

## ⚙️ PARTE 3: Configurações Pós-Deploy

### Mudar o Nome do Site (Opcional)
1. No painel do Netlify, vá em **"Site settings"**
2. Clique em **"Change site name"**
3. Digite um nome único (ex: `social-trial-app`)
4. Seu site ficará: `social-trial-app.netlify.app`

### Configurar Domínio Personalizado (Opcional - Avançado)
1. Vá em **"Domain settings"**
2. Clique em **"Add custom domain"**
3. Siga as instruções para conectar seu domínio

---

## 🔄 PARTE 4: Atualizações Futuras

**Sempre que você fizer mudanças no código:**

### Método Automático (Recomendado)
```powershell
# 1. Adicionar mudanças
git add .

# 2. Fazer commit
git commit -m "Descrição do que você mudou"

# 3. Enviar para GitHub
git push origin main
```

**✨ O Netlify detectará automaticamente e fará o redeploy!**

### Verificar o Deploy
1. Acesse seu painel no Netlify
2. Vá em **"Deploys"**
3. Você verá o histórico de todos os deploys

---

## 🐛 PARTE 5: Solução de Problemas Comuns

### ❌ Erro: "Build failed"
**Solução:**
1. Verifique os logs de erro no Netlify
2. Certifique-se que o projeto roda localmente: `npm run build`
3. Verifique se o `frontend/package.json` existe

### ❌ Erro: "Page not found" ao recarregar
**Já está resolvido!** Seu `netlify.toml` tem as configurações corretas.

### ❌ Erro: "API connection failed"
**Normal!** Seu backend ainda não está hospedado. Siga para a Parte 6.

---

## 🔜 PARTE 6: Próximos Passos - Backend

**IMPORTANTE:** Seu frontend está no ar, mas sem o backend ele não funciona completamente.

### O que você precisa fazer:
1. **Escolher serviço de hospedagem para o backend:**
   - **Render.com** (Recomendado - Gratuito)
   - Railway.app (Gratuito com limitações)
   - Fly.io (Gratuito para pequenos projetos)

2. **Fazer deploy do backend FastAPI + PostgreSQL**

3. **Atualizar a variável de ambiente no Netlify:**
   - Vá em **Site settings** → **Environment variables**
   - Edite `VITE_API_URL`
   - Mude de `http://localhost:8000` para a URL do seu backend
   - Exemplo: `https://seu-backend.onrender.com`

4. **Configurar CORS no backend:**
   - Adicionar a URL do Netlify nas origens permitidas
   - Exemplo: `https://social-trial-app.netlify.app`

5. **Fazer redeploy no Netlify:**
   - Vá em **Deploys** → **Trigger deploy** → **Deploy site**

---

## 📞 Ajuda Adicional

### Documentação Oficial
- [Netlify Docs](https://docs.netlify.com)
- [Deploy com Vite](https://vitejs.dev/guide/static-deploy.html#netlify)

### Status do Deploy
- ✅ **Frontend:** Pronto no Netlify
- ⏳ **Backend:** Pendente (próximo passo)
- ⏳ **Banco de Dados:** Pendente (junto com backend)

---

## ✅ Checklist Final

- [ ] Código enviado para o GitHub
- [ ] Site criado no Netlify
- [ ] Build configurado corretamente
- [ ] Variável `VITE_API_URL` adicionada
- [ ] Deploy bem-sucedido
- [ ] Site acessível pelo link do Netlify
- [ ] Nome do site personalizado (opcional)

**🎉 Parabéns! Seu frontend está no ar!**

---

*Criado em: 16 de Novembro de 2025*
*Projeto: Social Trial - Rede Social*
