# SysProcesso — Guia de Configuração Completo
## Supabase · GitHub · Vercel

---

## PASSO 1 — Supabase: Criar projeto

1. Acesse **https://supabase.com** e faça login
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** `sysprocesso`
   - **Database Password:** anote em local seguro
   - **Region:** `South America (São Paulo)` — mais próximo
4. Clique **"Create new project"** — aguarde ~2 minutos

---

## PASSO 2 — Supabase: Executar o Schema

1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"**
3. Abra o arquivo `supabase/schema.sql` deste projeto
4. Cole todo o conteúdo na área de texto
5. Clique em **"Run"** (ou Ctrl+Enter)
6. Verifique se aparece **"Success. No rows returned"** — OK!

> Isso cria todas as tabelas, triggers, RLS, funções e dados iniciais de uma vez.

---

## PASSO 3 — Supabase: Criar o primeiro usuário (Administrador)

1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Users"** → **"Add user"** → **"Create new user"**
3. Preencha:
   - **Email:** `mauro@cartorio.com` (ou seu e-mail real)
   - **Password:** senha forte
   - **Auto Confirm User:** ✅ marque
4. Clique **"Create user"**

Agora complete o perfil via SQL Editor:

```sql
-- Execute após criar o usuário no Auth
-- Substitua 'mauro@cartorio.com' pelo e-mail que você usou

update public.usuarios
set
  nome_completo  = 'Mauro George Viana Marques Felisbino',
  nome_simples   = 'Mauro',
  cpf            = '861.719.921-00',
  rg             = '1264191-0 SSP-MT',
  celular        = '(66) 9 8402-0120',
  cargo          = 'Administrador',
  perfil         = 'Administrador',
  setor          = 'Administração',
  cidade         = 'Paranatinga',
  uf             = 'MT',
  ativo          = true,
  permissoes     = ARRAY['dashboard','usuarios','processos','andamentos','tarefas','oficios','servicos','setores','configuracoes','logs']
where id = (
  select id from auth.users where email = 'mauro@cartorio.com'
);
```

---

## PASSO 4 — Supabase: Pegar as chaves de API

1. No menu lateral, clique em **"Settings"** → **"API"**
2. Copie:
   - **Project URL:** `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **anon (public) key:** `eyJ...` (chave longa)
3. Guarde essas duas informações — serão usadas no `.env.local` e na Vercel

---

## PASSO 5 — Projeto local: instalar dependências

```bash
# No terminal, dentro da pasta sysprocesso/
npm install
npm install @supabase/supabase-js
```

---

## PASSO 6 — Criar arquivo .env.local

Crie o arquivo `.env.local` na raiz do projeto (mesma pasta do `package.json`):

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ NUNCA suba o `.env.local` para o GitHub. Ele já está no `.gitignore`.

---

## PASSO 7 — Ativar o contexto Supabase no projeto

No arquivo `src/App.jsx`, troque a importação do contexto:

```jsx
// ANTES (mock/demo):
import { AppProvider, useApp } from './context/AppContext.jsx';

// DEPOIS (Supabase real):
import { AppProvider, useApp } from './context/AppContextSupabase.jsx';
```

---

## PASSO 8 — Testar localmente

```bash
npm run dev
# Acesse: http://localhost:3000
# Login com o e-mail e senha criados no Passo 3
```

---

## PASSO 9 — GitHub: criar repositório

```bash
# Na pasta do projeto:
git init
git add .
git commit -m "feat: SysProcesso v1.0 — sistema cartorial completo"

# Crie o repositório no GitHub (github.com/new)
# Depois vincule e envie:
git remote add origin https://github.com/SEU_USUARIO/sysprocesso.git
git branch -M main
git push -u origin main
```

---

## PASSO 10 — Vercel: fazer o deploy

1. Acesse **https://vercel.com** e faça login
2. Clique em **"Add New"** → **"Project"**
3. Clique em **"Import"** no repositório `sysprocesso`
4. Em **"Environment Variables"**, adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave anon
5. Clique **"Deploy"**
6. Aguarde ~1 minuto → URL gerada (ex: `sysprocesso.vercel.app`)

> A partir de agora, todo `git push` na branch `main` faz deploy automático.

---

## PASSO 11 — Domínio personalizado (opcional)

1. No painel Vercel → seu projeto → **"Settings"** → **"Domains"**
2. Adicione seu domínio (ex: `cartorioparanatinga.com.br`)
3. Configure o DNS no seu provedor apontando para a Vercel
4. HTTPS é automático

---

## PASSO 12 — Criar outros usuários

Para criar novos usuários do sistema:

1. Vá em Supabase → **Authentication** → **Users** → **Add user**
2. Crie o usuário com e-mail e senha
3. Execute o SQL para completar o perfil:

```sql
-- Adapte conforme o usuário
update public.usuarios
set
  nome_completo = 'Ana Paula Ribeiro Sousa',
  nome_simples  = 'Ana Paula',
  cpf           = '123.456.789-00',
  cargo         = 'Escrevente',
  perfil        = 'Escrevente',
  setor         = 'Escritura',
  ativo         = true,
  permissoes    = ARRAY['dashboard','processos','andamentos','tarefas','oficios']
where id = (
  select id from auth.users where email = 'ana@cartorio.com'
);
```

---

## Estrutura das variáveis de ambiente

| Variável | Onde pegar | Obrigatória |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | Supabase > Settings > API > Project URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase > Settings > API > anon key | ✅ |

---

## Tabelas criadas no Supabase

| Tabela | Descrição |
|--------|-----------|
| `cartorio` | Configurações do cartório (1 registro) |
| `setores` | Setores internos |
| `servicos` | Tipos de serviço por categoria/subcategoria |
| `usuarios` | Perfis dos usuários (vinculados ao Auth) |
| `processos` | Processos/autos cadastrados |
| `andamentos` | Histórico de movimentações |
| `tarefas` | Tarefas com prazo e responsável |
| `oficios` | Ofícios emitidos e recebidos |
| `logs_acesso` | Logs de acesso ao sistema |

## Views e Funções

| Nome | Tipo | Uso |
|------|------|-----|
| `vw_processos` | View | Processos com nome do responsável e total de andamentos |
| `dashboard_stats()` | RPC | Retorna todos os KPIs do dashboard em uma chamada |
| `proximo_numero_oficio(mes_ano)` | RPC | Calcula próximo número de ofício do mês |
| `tem_permissao(modulo)` | Function | Verifica se usuário logado tem acesso ao módulo |
| `meu_perfil()` | Function | Retorna perfil do usuário logado |

---

## Realtime

O sistema usa **Supabase Realtime** — mudanças feitas por qualquer usuário aparecem automaticamente para todos os conectados (processos, andamentos, tarefas, ofícios).

Ativado automaticamente no `AppContextSupabase.jsx`.

---

## Segurança (RLS)

Todas as tabelas têm **Row Level Security** ativo:

- **Administrador** → acesso total
- **Tabelião** → leitura total, escrita operacional
- **Escrevente** → apenas módulos com permissão
- **Consultor** → somente leitura do Dashboard
- **Anônimo** → apenas inserir log de acesso

---

## Suporte

Em caso de dúvidas:
- Documentação Supabase: https://supabase.com/docs
- Documentação Vercel: https://vercel.com/docs
- Documentação Vite: https://vitejs.dev/guide
