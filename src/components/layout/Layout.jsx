import { useApp } from '../../context/AppContext.jsx';
import { getInitials } from '../../data/mockData.js';

const NAV_ITEMS = [
  { id: 'dashboard',      label: 'Dashboard',       icon: '⊡', section: 'Principal' },
  { id: 'processos',      label: 'Processos',        icon: '📋', section: 'Operacional' },
  { id: 'andamentos',     label: 'Andamentos',       icon: '🔄', section: 'Operacional' },
  { id: 'relservicos',    label: 'Serviços por Setor', icon: '📊', section: 'Operacional' },
  { id: 'interessados',   label: 'Interessados',     icon: '👤', section: 'Operacional' },
  { id: 'tarefas',        label: 'Tarefas',          icon: '✓',  section: 'Operacional' },
  { id: 'oficios',        label: 'Ofícios',          icon: '✉',  section: 'Operacional' },
  { id: 'servicos',       label: 'Tipo de Serviços', icon: '⊞',  section: 'Cadastros' },
  { id: 'setores',        label: 'Setores',          icon: '▦',  section: 'Cadastros' },
  { id: 'usuarios',       label: 'Usuários',         icon: '◉',  section: 'Cadastros' },
  { id: 'configuracoes',  label: 'Configurações',    icon: '⚙',  section: 'Sistema' },
  { id: 'logs',           label: 'Logs de Acesso',   icon: '◎',  section: 'Sistema' },
];

export function Sidebar({ page, setPage }) {
  const { usuario, logout, sidebarCollapsed, setSidebarCollapsed, cartorio, temPermissao } = useApp();

  const sections = [...new Set(NAV_ITEMS.map(i => i.section))];

  return (
    <nav className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">SP</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">SysProcesso</span>
          <span className="sidebar-logo-sub">{cartorio.nomeSimples}</span>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-nav">
        {sections.map(section => {
          const items = NAV_ITEMS.filter(i => i.section === section && (i.id === 'dashboard' || temPermissao(i.id)));
          if (!items.length) return null;
          return (
            <div key={section} className="sidebar-section">
              <div className="sidebar-section-label">{section}</div>
              {items.map(item => (
                <div
                  key={item.id}
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => setPage(item.id)}
                  data-tooltip={sidebarCollapsed ? item.label : undefined}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  <span className="nav-item-label">{item.label}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div
          className="sidebar-user"
          onClick={() => { if (window.confirm('Deseja sair do sistema?')) logout(); }}
          data-tooltip={sidebarCollapsed ? `${usuario?.nome_simples} · Sair` : undefined}
        >
          <div className="avatar">{getInitials(usuario?.nome_simples)}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{usuario?.nome_simples}</div>
            <div className="sidebar-user-role">{usuario?.perfil} · Sair</div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Header({ page, setPage }) {
  const { sidebarCollapsed, setSidebarCollapsed, toggleTema, tema, usuario } = useApp();

  const PAGE_LABELS = {
    dashboard: 'Dashboard', processos: 'Processos', andamentos: 'Andamentos', interessados: 'Interessados',
    tarefas: 'Tarefas', oficios: 'Ofícios', servicos: 'Tipo de Serviços',
    setores: 'Setores', relservicos: 'Serviços por Setor', usuarios: 'Usuários', configuracoes: 'Configurações',
    logs: 'Logs de Acesso',
  };

  return (
    <header className="main-header">
      <button
        className="btn-icon"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        title="Menu"
      >
        ☰
      </button>

      <div className="breadcrumb" style={{ flex: 1 }}>
        <span className="breadcrumb-item">SysProcesso</span>
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-item active">{PAGE_LABELS[page] || page}</span>
      </div>

      <div className="main-header-actions">
        <button
          className="btn-icon"
          onClick={toggleTema}
          title={tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
        >
          {tema === 'dark' ? '☀' : '◑'}
        </button>
        <div className="header-divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div className="avatar avatar-sm">{getInitials(usuario?.nome_simples)}</div>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{usuario?.nome_simples}</span>
        </div>
      </div>
    </header>
  );
}

export function ToastContainer() {
  const { toasts } = useApp();
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  const colors = { success: 'var(--color-success)', error: 'var(--color-danger)', warning: 'var(--color-warning)', info: 'var(--color-info)' };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span style={{ color: colors[t.type], fontWeight: 700 }}>{icons[t.type]}</span>
          <span style={{ fontSize: 13 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
