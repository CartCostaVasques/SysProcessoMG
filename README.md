# SysProcesso — Sistema de Gestão para Cartório de Tabelionato

Stack: **React 18 + Vite · CSS puro · Context API**  
Deploy: **Vercel · Supabase · GitHub**

---

## Estrutura do projeto

```
src/
├── App.jsx                        ← Componente raiz, roteamento de páginas
├── main.jsx                       ← Entry point React
├── styles/
│   ├── globals.css                ← Variáveis CSS, reset, animações, tema claro/escuro
│   ├── layout.css                 ← Sidebar, header, shell, login
│   └── components.css             ← Botões, inputs, cards, tabelas, modais, badges...
├── context/
│   └── AppContext.jsx             ← Estado global (auth, dados, tema, toasts)
├── data/
│   └── mockData.js                ← Dados simulados (substitui Supabase em dev)
├── pages/
│   └── LoginPage.jsx              ← Tela de login
└── components/
    ├── layout/
    │   └── Layout.jsx             ← Sidebar, Header, ToastContainer
    ├── dashboard/
    │   └── Dashboard.jsx          ← KPIs, gráficos, alertas
    ├── usuarios/
    │   └── Usuarios.jsx           ← CRUD de usuários + permissões por módulo
    ├── processos/
    │   ├── Processos.jsx          ← Cadastro inline estilo planilha + andamentos
    │   └── Andamentos.jsx         ← Visualização filtrada por usuário e período
    ├── tarefas/
    │   └── Tarefas.jsx            ← Gestão de tarefas com prazos e status
    ├── oficios/
    │   └── Oficios.jsx            ← Controle mensal de ofícios
    ├── servicos/
    │   └── ServicosSetores.jsx    ← Serviços (categoria/subcategoria) + Setores
    └── configuracoes/
        └── Config.jsx             ← Dados do cartório + tema/cores + logs de acesso
```

---

## Instalação e execução local

```bash
npm install
npm run dev
# acesse: http://localhost:3000
```

**Login de demonstração:**  
- E-mail: `mauro@cartorio.com`  
- Senha: qualquer

---

## Conectar ao Supabase

1. Crie projeto em [supabase.com](https://supabase.com)
2. Crie arquivo `.env.local`:
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
3. Instale o client: `npm install @supabase/supabase-js`
4. Crie `src/lib/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```
5. Substitua as funções do `AppContext.jsx` por chamadas ao Supabase

---

## Deploy na Vercel

1. Push para GitHub
2. Importe repositório na Vercel
3. Configure variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy automático a cada push na `main`

---

## Módulos

| Módulo | Funcionalidade |
|--------|----------------|
| Dashboard | KPIs, gráficos por categoria/responsável, alertas |
| Processos | Cadastro inline (estilo planilha) + andamentos em timeline |
| Andamentos | Visualização filtrada por responsável e período |
| Tarefas | Controle com prazos, setor, tipo e conclusão |
| Ofícios | Numeração automática por mês/ano, totais consolidados |
| Tipo de Serviços | Cadastro por categoria e subcategoria |
| Setores | Divisões internas do cartório |
| Usuários | Qualificação completa + perfis + permissões por módulo |
| Configurações | Dados do cartório, logomarca, cores, tema claro/escuro |
| Logs de Acesso | Registro de todos os acessos (com e sem login) |

---

## Tema e Cores

O sistema usa CSS custom properties. Para alterar cores sem recompilar:

```js
// Em tempo de execução (já implementado no módulo Configurações):
document.documentElement.style.setProperty('--color-accent', '#sua-cor')
```

Temas disponíveis: **dark** (padrão cinza/preto) e **light**.

---

## Migração dos dados do Access

Execute o script de migração para importar os dados existentes:

```bash
# Instale mdbtools no servidor
sudo apt install mdbtools

# Exporte tabelas para CSV
mdb-export banco.accdb TabelaCadastroAutos > processos.csv
mdb-export banco.accdb TabelaCadAndamento > andamentos.csv
# ... etc

# Importe via Supabase dashboard ou script Node
```
