import { useState, useEffect, Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e) { console.error('[ErrorBoundary] Componente crashou:', e); }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: 'red' }}>
        <b>Erro ao carregar página:</b><br/>
        {this.state.error.message}
      </div>
    );
    return this.props.children;
  }
}
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
import RegistroCivilAtos from './components/registrocivil/RegistroCivilAtos.jsx';
import Panoramico   from './components/panoramico/Panoramico.jsx';
import ImportacaoCSV from './components/importacao/ImportacaoCSV.jsx';
import { Servicos, Setores } from './components/servicos/ServicosSetores.jsx';
import RelatorioServicos from './components/relatorios/RelatorioServicos.jsx';
import RelatorioConfig   from './components/relatorios/RelatorioConfig.jsx';
import { Configuracoes, LogsAcesso } from './components/configuracoes/Config.jsx';
import Chat from './components/chat/Chat.jsx';
import ChatAlerta from './components/chat/ChatAlerta.jsx';
import Estoque from './components/estoque/Estoque.jsx';

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
      case 'regcivil':      return <RegistroCivilAtos />;
      case 'panoramico':    return <Panoramico />;
      case 'importacaocsv': return <ImportacaoCSV />;
      case 'servicos':      return <Servicos />;
      case 'setores':       return <Setores />;
      case 'relservicos':   return <RelatorioServicos />;
      case 'relconfig':     return <RelatorioConfig />;
      case 'chat':          return <Chat />;
      case 'estoque':       return <Estoque />;
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
          <ErrorBoundary key={page}>
            {renderPage()}
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
      <ChatAlerta onAbrirChat={(conv) => { setPage('chat'); }} />
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
