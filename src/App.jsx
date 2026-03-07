import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';

// Estilos
import './styles/globals.css';
import './styles/layout.css';
import './styles/components.css';

// Layout
import { Sidebar, Header, ToastContainer } from './components/layout/Layout.jsx';

// Páginas
import LoginPage from './pages/LoginPage.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import Usuarios from './components/usuarios/Usuarios.jsx';
import Processos from './components/processos/Processos.jsx';
import ProcessoDetalhePage from './components/processos/ProcessoDetalhePage.jsx';
import Interessados from './components/processos/Interessados.jsx';
import Tarefas from './components/tarefas/Tarefas.jsx';
import Oficios  from './components/oficios/Oficios.jsx';
import Recibos     from './components/recibos/Recibos.jsx';
import Panoramico   from './components/panoramico/Panoramico.jsx';
import ImportacaoCSV from './components/importacao/ImportacaoCSV.jsx';
import { Servicos, Setores } from './components/servicos/ServicosSetores.jsx';
import RelatorioServicos from './components/relatorios/RelatorioServicos.jsx';
import { Configuracoes, LogsAcesso } from './components/configuracoes/Config.jsx';

function AppShell() {
  const { usuario, tema } = useApp();
  const [page, setPage] = useState('dashboard');

  // Aplica tema ao DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
  }, [tema]);

  if (!usuario) return <LoginPage />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard':     return <Dashboard setPage={setPage} />;
      case 'usuarios':      return <Usuarios />;
      case 'processos':     return <Processos />;
      case 'andamentos':    return <ProcessoDetalhePage />;
      case 'interessados':   return <Interessados />;
      case 'tarefas':       return <Tarefas />;
      case 'oficios':       return <Oficios />;
      case 'recibos':       return <Recibos />;
      case 'panoramico':    return <Panoramico />;
      case 'importacaocsv': return <ImportacaoCSV />;
      case 'servicos':      return <Servicos />;
      case 'setores':       return <Setores />;
      case 'relservicos':   return <RelatorioServicos />;
      case 'configuracoes': return <Configuracoes />;
      case 'logs':          return <LogsAcesso />;
      default:              return <Dashboard setPage={setPage} />;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} />
      <div className="main-area">
        <Header page={page} setPage={setPage} />
        <main className="main-content">
          {renderPage()}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
