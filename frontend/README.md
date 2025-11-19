# 🌐 Social Trial

Uma plataforma de rede social moderna e completa, construída com React e Python (FastAPI), oferecendo experiência multilíngue, interações em tempo real e funcionalidades avançadas de comunidade.

## 📋 Índice

- [Descrição](#-descrição)
- [Características Principais](#-características-principais)
- [Tecnologias Utilizadas](#-tecnologias-utilizadas)
- [Instalação](#-instalação)
- [Uso](#-uso)
- [Guia do Usuário](#-guia-do-usuário)
- [Estrutura do Projeto](#-estrutura-do-projeto)

---

## 🎯 Descrição

Esta é uma plataforma de rede social full-stack que combina as melhores práticas de desenvolvimento moderno com uma experiência de usuário intuitiva. O projeto oferece um ecossistema digital completo onde usuários podem interagir, compartilhar conteúdo, participar de comunidades e explorar um marketplace integrado.

### Diferenciais

- **Multilíngue**: Suporte completo para Português, Inglês e Espanhol
- **Tempo Real**: WebSocket para mensagens e notificações instantâneas
- **Bots Automatizados**: Sistema de bots que simulam atividade de usuários
- **Temas Personalizáveis**: Sistema completo de Dark/Light mode
- **Responsivo**: Interface adaptável para desktop, tablet e mobile

---

## ✨ Características Principais

### 🔐 Autenticação & Perfil
- Sistema de login/registro
- Perfis personalizáveis com fotos e informações
- Gerenciamento de preferências (tema, idioma, notificações)
- Modo Demo para teste rápido da plataforma

### 👥 Social Features
- **Feed Dinâmico**: Publicações com likes, comentários e compartilhamentos
- **Mensagens**: Sistema de chat em tempo real com WebSocket
- **Amizades**: Envio e gerenciamento de solicitações de amizade
- **Notificações**: Alertas em tempo real de interações

### 🏘️ Comunidades
- Criação e gerenciamento de comunidades
- Diversas categorias (Tecnologia, Gaming, Música, Esportes, etc.)
- Sistema de membros e administradores
- Páginas dedicadas para cada comunidade

### 🛍️ Marketplace
- Listagem de produtos com imagens e detalhes
- Filtros avançados (categoria, condição, preço)
- Perfis de produtos com informações do vendedor
- Carrinho de compras

### 📸 Galeria
- Upload e compartilhamento de fotos
- Visualização em grid responsivo

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca para UI
- **React Router** - Navegação SPA
- **Context API** - Gerenciamento de estado global
- **Vite** - Build tool e dev server
- **Axios** - Requisições HTTP
- **WebSocket** - Comunicação em tempo real
- **CSS3** - Estilização customizada

### Backend
- **Python 3.11+**
- **FastAPI** - Framework web moderno e rápido
- **SQLAlchemy** - ORM para banco de dados
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação e autorização
- **APScheduler** - Agendamento de tarefas (bots)
- **WebSocket** - Comunicação em tempo real
- **Docker** - Containerização

---

## 📦 Instalação

### Pré-requisitos

- **Node.js** 18+ e npm/yarn
- **Python** 3.11+
- **PostgreSQL** 14+
- **Docker** (opcional, mas recomendado)

### Método 1: Com Docker (Recomendado)

```bash
# Clone o repositório
git clone <repository-url>
cd solo-challenge

# Inicie os containers
docker-compose up -d

# O frontend estará em http://localhost:5173
# O backend estará em http://localhost:8000
```

### Método 2: Instalação Manual

#### Backend

```bash
# Entre na pasta do backend
cd backend

# Crie um ambiente virtual
python -m venv venv

# Ative o ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Configure as variáveis de ambiente
# Crie um arquivo .env baseado no .env.example

# Execute as migrações do banco
# (Certifique-se que o PostgreSQL está rodando)

# Inicie o servidor
uvicorn app.main:app --reload
```

#### Frontend

```bash
# Entre na pasta do frontend
cd frontend

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

### Configuração do Banco de Dados

```sql
-- Crie o banco de dados
CREATE DATABASE social_network;

-- As tabelas serão criadas automaticamente pelo SQLAlchemy
```

---

## 🚀 Uso

### Acessando a Aplicação

1. Abra seu navegador em `http://localhost:5173`
2. **Modo Demo**: Clique em "Demo" para acesso rápido
   - Email: `test@example.com`
   - Senha: `test123`
3. **Novo Usuário**: Clique em "Register" para criar uma conta. EVITE usar e-mails reais.

### Scripts Disponíveis

#### Frontend
```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Gera build de produção
npm run preview      # Preview do build de produção
npm run lint         # Verifica código com ESLint
```

#### Backend
```bash
uvicorn app.main:app --reload           # Desenvolvimento
uvicorn app.main:app --host 0.0.0.0     # Produção
python -m pytest                         # Executar testes
```

---

## 📖 Guia do Usuário

### 1️⃣ Primeiros Passos

#### Criando uma Conta
1. Na página inicial, clique em **"Register"**
2. Preencha: Nome Completo, Email e Senha
3. Confirme sua senha
4. Clique em **"Register"** para criar sua conta
5. Você será redirecionado para o login

#### Configurando seu Perfil
1. Após o login, clique no seu avatar no canto superior direito
2. Selecione **"Profile"**
3. Clique em **"Edit Profile"**
4. Adicione:
   - Foto de perfil
   - Bio
   - Localização
   - Data de nascimento
5. Salve as alterações

### 2️⃣ Navegação Principal

#### Feed
- **Visualizar posts**: Role para ver publicações de amigos
- **Criar post**: Clique em "What's on your mind?"
- **Interagir**: Like, comentar ou compartilhar posts
- **Filtros**: Ordene por mais recentes ou populares

#### Mensagens
- **Nova conversa**: Clique no ícone "+" e selecione um amigo
- **Chat em tempo real**: Mensagens aparecem instantaneamente
- **Histórico**: Todas as conversas são salvas
- **Status online**: Veja quem está ativo

#### Amigos
- **Adicionar amigos**: Pesquise por nome ou email
- **Solicitações**: Aceite ou recuse pedidos de amizade
- **Lista de amigos**: Visualize todos os seus amigos
- **Sugestões**: Descubra novos amigos

### 3️⃣ Funcionalidades Avançadas

#### Comunidades
1. **Explorar**: Navegue por 13 categorias diferentes
2. **Filtrar**: Use a busca e filtros de categoria
3. **Entrar**: Clique em "Join" para se tornar membro
4. **Criar**: Crie sua própria comunidade
   - Nome e descrição
   - Categoria
   - Imagem de capa
5. **Gerenciar**: Como criador, você pode:
   - Adicionar moderadores
   - Aprovar/remover membros
   - Editar informações

#### Marketplace
1. **Navegar**: Explore produtos disponíveis
2. **Filtrar**: Por categoria, condição ou preço
3. **Vender**: Crie um novo anúncio
   - Fotos do produto
   - Título e descrição
   - Preço e condição
   - Categoria
4. **Comprar**: Entre em contato com vendedores

#### Galeria
1. **Upload**: Clique em "Upload Photo"
2. **Compartilhar**: Publique fotos no feed
3. **Visualizar**: Grid responsivo com preview

### 4️⃣ Personalização

#### Alterar Idioma
1. Abra a Sidebar ao clicar no ícone de menu hamburger na Navbar
2. Selecione: 🇧🇷 Português | 🇺🇸 English | 🇪🇸 Español
3. A interface muda instantaneamente

#### Alterar Tema
1. Clique no ícone de sol/lua na Navbar
2. Alterne entre Light e Dark mode
3. A preferência é salva automaticamente


### 5️⃣ Dicas & Truques


🤖 **Bots Automatizados**
- Bots postam automaticamente no feed em intervalos programados
- Enviam mensagens periódicas simulando atividade
- Sistema de agendamento com APScheduler (Python)

🔔 **Notificações em Tempo Real**
- Badge vermelho indica novas notificações
- Clique no ícone para ver detalhes

📱 **Mobile**
- Interface responsiva
- Navbar com menu hamburger em telas pequenas


---

## 📁 Estrutura do Projeto

```
solo-challenge/
├── frontend/                 # Aplicação React
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── context/         # Context API (User, Theme, Language, WebSocket)
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── services/        # Serviços de API
│   │   ├── styles/          # Estilos globais
│   │   └── utils/           # Funções utilitárias
│   ├── public/              # Assets estáticos
│   └── package.json
│
├── backend/                 # API FastAPI
│   ├── app/
│   │   ├── core/           # Configurações core (DB, JWT, WebSocket)
│   │   ├── models/         # Modelos SQLAlchemy
│   │   ├── routes/         # Endpoints da API
│   │   ├── schemas/        # Schemas Pydantic
│   │   └── services/       # Lógica de negócio
│   ├── scripts/            # Scripts utilitários
│   ├── uploads/            # Arquivos enviados
│   └── requirements.txt
│
└── docker-compose.yml      # Orquestração Docker
```

---


## 👨‍💻 Autor

Desenvolvido por Guilherme Santos da Silva para o projeto de conclusão da iniciativa +PraTi.

---


## 📞 Contato


- 📧 Email: guilherme99ssilva@hotmail.com


---

**⭐ Se gostou desse projeto, considere dar uma estrela no GitHub!**
