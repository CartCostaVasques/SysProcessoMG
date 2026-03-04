import { createContext, useContext, useState, useCallback } from 'react';
import { MOCK_CARTORIO, MOCK_USUARIOS, MOCK_PROCESSOS, MOCK_TAREFAS, MOCK_OFICIOS, MOCK_SETORES, MOCK_SERVICOS, MOCK_ANDAMENTOS, MOCK_LOGS_ACESSO } from '../data/mockData.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Auth
  const [usuario, setUsuario] = useState(null);

  // Dados
  const [usuarios, setUsuarios]     = useState(MOCK_USUARIOS);
  const [processos, setProcessos]   = useState(MOCK_PROCESSOS);
  const [andamentos, setAndamentos] = useState(MOCK_ANDAMENTOS);
  const [tarefas, setTarefas]       = useState(MOCK_TAREFAS);
  const [oficios, setOficios]       = useState(MOCK_OFICIOS);
  const [setores, setSetores]       = useState(MOCK_SETORES);
  const [servicos, setServicos]     = useState(MOCK_SERVICOS);
  const [logs, setLogs]             = useState(MOCK_LOGS_ACESSO);
  const [cartorio, setCartorio]     = useState(MOCK_CARTORIO);

  // UI
  const [tema, setTema] = useState('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast
  const addToast = useCallback((msg, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  // Auth
  const login = useCallback((email, senha) => {
    const u = MOCK_USUARIOS.find(u => u.email === email);
    if (u) {
      setUsuario(u);
      // Registra log de acesso
      const novoLog = {
        id: Date.now(),
        ip: '192.168.1.1',
        navegador: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Outro',
        so: navigator.platform || 'Desconhecido',
        dt_acesso: new Date().toISOString().replace('T', ' ').slice(0, 19),
        usuario: u.nome_simples,
        acao: 'Login',
      };
      setLogs(prev => [novoLog, ...prev]);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setUsuario(null), []);

  // Registra acesso sem login
  const registrarAcesso = useCallback(() => {
    const novoLog = {
      id: Date.now(),
      ip: '—',
      navegador: navigator.userAgent.split(' ').pop() || 'Desconhecido',
      so: navigator.platform || '—',
      dt_acesso: new Date().toISOString().replace('T', ' ').slice(0, 19),
      usuario: '—',
      acao: 'Acesso (sem login)',
    };
    setLogs(prev => [novoLog, ...prev]);
  }, []);

  const toggleTema = useCallback(() => {
    setTema(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const temPermissao = useCallback((modulo) => {
    if (!usuario) return false;
    if (usuario.perfil === 'Administrador') return true;
    return usuario.permissoes?.includes(modulo) ?? false;
  }, [usuario]);

  // CRUD Genérico
  const nextId = (arr) => Math.max(0, ...arr.map(i => i.id)) + 1;

  const addUsuario    = (d) => { const novo = { ...d, id: nextId(usuarios), dt_cadastro: new Date().toISOString().split('T')[0], ultimo_acesso: '—' }; setUsuarios(p => [...p, novo]); return novo; };
  const editUsuario   = (id, d) => setUsuarios(p => p.map(u => u.id === id ? { ...u, ...d } : u));
  const deleteUsuario = (id) => setUsuarios(p => p.filter(u => u.id !== id));

  const addProcesso    = (d) => { const novo = { ...d, id: nextId(processos), andamentos: 0 }; setProcessos(p => [...p, novo]); return novo; };
  const editProcesso   = (id, d) => setProcessos(p => p.map(i => i.id === id ? { ...i, ...d } : i));
  const deleteProcesso = (id) => setProcessos(p => p.filter(i => i.id !== id));

  const addAndamento    = (d) => { const novo = { ...d, id: nextId(andamentos) }; setAndamentos(p => [...p, novo]); setProcessos(p => p.map(pr => pr.id === d.processo_id ? { ...pr, andamentos: pr.andamentos + 1 } : pr)); return novo; };
  const editAndamento   = (id, d) => setAndamentos(p => p.map(a => a.id === id ? { ...a, ...d } : a));
  const deleteAndamento = (id) => setAndamentos(p => p.filter(a => a.id !== id));

  const addTarefa    = (d) => { const novo = { ...d, id: nextId(tarefas) }; setTarefas(p => [...p, novo]); return novo; };
  const editTarefa   = (id, d) => setTarefas(p => p.map(t => t.id === id ? { ...t, ...d } : t));
  const deleteTarefa = (id) => setTarefas(p => p.filter(t => t.id !== id));

  const addOficio    = (d) => { const novo = { ...d, id: nextId(oficios) }; setOficios(p => [...p, novo]); return novo; };
  const editOficio   = (id, d) => setOficios(p => p.map(o => o.id === id ? { ...o, ...d } : o));
  const deleteOficio = (id) => setOficios(p => p.filter(o => o.id !== id));

  const addSetor    = (d) => { const novo = { ...d, id: nextId(setores) }; setSetores(p => [...p, novo]); return novo; };
  const editSetor   = (id, d) => setSetores(p => p.map(s => s.id === id ? { ...s, ...d } : s));
  const deleteSetor = (id) => setSetores(p => p.filter(s => s.id !== id));

  const addServico    = (d) => { const novo = { ...d, id: nextId(servicos) }; setServicos(p => [...p, novo]); return novo; };
  const editServico   = (id, d) => setServicos(p => p.map(s => s.id === id ? { ...s, ...d } : s));
  const deleteServico = (id) => setServicos(p => p.filter(s => s.id !== id));

  const salvarCartorio = (d) => setCartorio(d);

  return (
    <AppContext.Provider value={{
      usuario, login, logout, registrarAcesso,
      usuarios, addUsuario, editUsuario, deleteUsuario,
      processos, addProcesso, editProcesso, deleteProcesso,
      andamentos, addAndamento, editAndamento, deleteAndamento,
      tarefas, addTarefa, editTarefa, deleteTarefa,
      oficios, addOficio, editOficio, deleteOficio,
      setores, addSetor, editSetor, deleteSetor,
      servicos, addServico, editServico, deleteServico,
      logs, cartorio, salvarCartorio,
      tema, toggleTema,
      sidebarCollapsed, setSidebarCollapsed,
      toasts, addToast,
      temPermissao,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp fora do AppProvider');
  return ctx;
};
