// ============================================================
// SysProcesso — AppContext com Supabase REAL
// Substitui o AppContext.jsx anterior
// ============================================================
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  supabase,
  signIn, signOut,
  getUsuarios, atualizarUsuario, deletarUsuario,
  getProcessos, criarProcesso, atualizarProcesso, deletarProcesso,
  getAndamentos, criarAndamento, atualizarAndamento, deletarAndamento,
  getTarefas, criarTarefa, atualizarTarefa, deletarTarefa,
  getOficios, criarOficio, atualizarOficio, deletarOficio,
  getSetores, criarSetor, atualizarSetor, deletarSetor,
  getServicos, criarServico, atualizarServico, deletarServico,
  getCartorio, salvarCartorio as salvarCartorioDB,
  getLogs, registrarLog,
  getDashboardStats,
  uploadLogo,
  proximoNumeroOficio,
} from '../lib/supabase.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // ── Auth ──────────────────────────────────────────────────
  const [usuario, setUsuario] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Dados ─────────────────────────────────────────────────
  const [usuarios,   setUsuarios]   = useState([]);
  const [processos,  setProcessos]  = useState([]);
  const [andamentos, setAndamentos] = useState([]);
  const [tarefas,    setTarefas]    = useState([]);
  const [oficios,    setOficios]    = useState([]);
  const [setores,    setSetores]    = useState([]);
  const [servicos,   setServicos]   = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [cartorio,   setCartorio]   = useState({});
  const [dashStats,  setDashStats]  = useState(null);

  // ── Loading states ────────────────────────────────────────
  const [loading, setLoading] = useState({});
  const setLoad = (key, v) => setLoading(p => ({ ...p, [key]: v }));

  // ── UI ────────────────────────────────────────────────────
  const [tema,             setTema]             = useState('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts,           setToasts]           = useState([]);

  // ─────────────────────────────────────────────────────────
  // TOASTS
  // ─────────────────────────────────────────────────────────
  const addToast = useCallback((msg, type = 'info', duration = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  // ─────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────

  // Escuta mudanças de sessão do Supabase
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await carregarPerfil(session.user.id);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await carregarPerfil(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUsuario(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carrega dados ao logar
  useEffect(() => {
    if (usuario) {
      carregarTudo();
    }
  }, [usuario?.id]);

  const carregarPerfil = async (uid) => {
    try {
      const { data } = await supabase.from('usuarios').select('*').eq('id', uid).single();
      if (data) setUsuario(data);
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  const carregarTudo = async () => {
    await Promise.allSettled([
      fetchUsuarios(),
      fetchProcessos(),
      fetchAndamentos(),
      fetchTarefas(),
      fetchOficios(),
      fetchSetores(),
      fetchServicos(),
      fetchCartorio(),
      fetchDashboard(),
      fetchLogs(),
    ]);
  };

  const login = useCallback(async (email, senha) => {
    setLoad('login', true);
    try {
      await signIn(email, senha);
      // Perfil carregado pelo onAuthStateChange
      addToast('Bem-vindo ao SysProcesso!', 'success');

      // Registra log de login
      await registrarLog({
        usuario_id: null, // será preenchido depois via trigger
        usuario: email.split('@')[0],
        ip: '—',
        navegador: navigator.userAgent.slice(0, 100),
        so: navigator.platform || '—',
        acao: 'Login',
      });
      return true;
    } catch (err) {
      addToast(err.message || 'Credenciais inválidas.', 'error');
      return false;
    } finally {
      setLoad('login', false);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUsuario(null);
    // Limpa estados
    setProcessos([]); setAndamentos([]); setTarefas([]);
    setOficios([]); setDashStats(null);
  }, []);

  const registrarAcesso = useCallback(async () => {
    await registrarLog({
      acao: 'Acesso (sem login)',
      navegador: navigator.userAgent.slice(0, 100),
      so: navigator.platform || '—',
    });
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

  // ─────────────────────────────────────────────────────────
  // FETCH functions
  // ─────────────────────────────────────────────────────────
  const fetchUsuarios  = async () => { try { setLoad('usuarios', true);  setUsuarios(await getUsuarios());     } catch(e) { addToast('Erro ao carregar usuários.', 'error'); } finally { setLoad('usuarios', false); } };
  const fetchProcessos = async () => { try { setLoad('processos', true); setProcessos(await getProcessos());   } catch(e) { addToast('Erro ao carregar processos.', 'error'); } finally { setLoad('processos', false); } };
  const fetchAndamentos = async () => { try { setAndamentos(await getAndamentos()); } catch(e) {} };
  const fetchTarefas   = async () => { try { setTarefas(await getTarefas());     } catch(e) {} };
  const fetchOficios   = async () => { try { setOficios(await getOficios());     } catch(e) {} };
  const fetchSetores   = async () => { try { setSetores(await getSetores());     } catch(e) {} };
  const fetchServicos  = async () => { try { setServicos(await getServicos());   } catch(e) {} };
  const fetchLogs      = async () => { try { setLogs(await getLogs());           } catch(e) {} };
  const fetchCartorio  = async () => { try { setCartorio(await getCartorio());   } catch(e) {} };
  const fetchDashboard = async () => { try { setDashStats(await getDashboardStats()); } catch(e) {} };

  // ─────────────────────────────────────────────────────────
  // USUÁRIOS CRUD
  // ─────────────────────────────────────────────────────────
  const addUsuario = useCallback(async (dados) => {
    // Criação de usuário Auth é feita pelo Administrador via painel Supabase
    // ou via função criarUsuario() que requer service_role key
    // Por ora, atualiza perfil se o ID já existir (usuário criado pelo admin)
    addToast('Para criar usuários, use o painel Supabase > Authentication > Users', 'warning', 6000);
  }, []);

  const editUsuario = useCallback(async (id, dados) => {
    try {
      const updated = await atualizarUsuario(id, dados);
      setUsuarios(prev => prev.map(u => u.id === id ? updated : u));
      // Se editou o próprio perfil
      if (usuario?.id === id) setUsuario(updated);
      addToast('Usuário atualizado!', 'success');
    } catch (err) {
      addToast('Erro ao atualizar usuário: ' + err.message, 'error');
    }
  }, [usuario]);

  const deleteUsuario = useCallback(async (id) => {
    try {
      await deletarUsuario(id); // inativa
      setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ativo: false } : u));
      addToast('Usuário inativado.', 'info');
    } catch (err) {
      addToast('Erro: ' + err.message, 'error');
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // PROCESSOS CRUD
  // ─────────────────────────────────────────────────────────
  const addProcesso = useCallback(async (dados) => {
    try {
      const novo = await criarProcesso({ ...dados, criado_por: usuario?.id });
      await fetchProcessos(); // recarrega com count de andamentos
      addToast('Processo cadastrado!', 'success');
      return novo;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, [usuario]);

  const editProcesso = useCallback(async (id, dados) => {
    try {
      const updated = await atualizarProcesso(id, dados);
      setProcessos(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      addToast('Processo atualizado!', 'success');
      return updated;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const deleteProcesso = useCallback(async (id) => {
    try {
      await deletarProcesso(id);
      setProcessos(prev => prev.filter(p => p.id !== id));
      addToast('Processo removido.', 'info');
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  // ─────────────────────────────────────────────────────────
  // ANDAMENTOS CRUD
  // ─────────────────────────────────────────────────────────
  const addAndamento = useCallback(async (dados) => {
    try {
      const novo = await criarAndamento({ ...dados, responsavel_id: usuario?.id });
      setAndamentos(prev => [novo, ...prev]);
      // Atualiza counter na lista de processos
      setProcessos(prev => prev.map(p =>
        p.id === dados.processo_id ? { ...p, total_andamentos: (p.total_andamentos || 0) + 1 } : p
      ));
      return novo;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, [usuario]);

  const editAndamento = useCallback(async (id, dados) => {
    try {
      const updated = await atualizarAndamento(id, dados);
      setAndamentos(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
      return updated;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const deleteAndamento = useCallback(async (id) => {
    try {
      const and = andamentos.find(a => a.id === id);
      await deletarAndamento(id);
      setAndamentos(prev => prev.filter(a => a.id !== id));
      if (and) {
        setProcessos(prev => prev.map(p =>
          p.id === and.processo_id ? { ...p, total_andamentos: Math.max(0, (p.total_andamentos || 1) - 1) } : p
        ));
      }
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, [andamentos]);

  // ─────────────────────────────────────────────────────────
  // TAREFAS CRUD
  // ─────────────────────────────────────────────────────────
  const addTarefa = useCallback(async (dados) => {
    try {
      const novo = await criarTarefa({ ...dados, criado_por: usuario?.id });
      setTarefas(prev => [novo, ...prev]);
      addToast('Tarefa criada!', 'success');
      return novo;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, [usuario]);

  const editTarefa = useCallback(async (id, dados) => {
    try {
      const updated = await atualizarTarefa(id, dados);
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t));
      return updated;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const deleteTarefa = useCallback(async (id) => {
    try {
      await deletarTarefa(id);
      setTarefas(prev => prev.filter(t => t.id !== id));
      addToast('Tarefa removida.', 'info');
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  // ─────────────────────────────────────────────────────────
  // OFÍCIOS CRUD
  // ─────────────────────────────────────────────────────────
  const addOficio = useCallback(async (dados) => {
    try {
      const novo = await criarOficio(dados);
      setOficios(prev => [novo, ...prev]);
      addToast('Ofício registrado!', 'success');
      return novo;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const editOficio = useCallback(async (id, dados) => {
    try {
      const updated = await atualizarOficio(id, dados);
      setOficios(prev => prev.map(o => o.id === id ? { ...o, ...updated } : o));
      addToast('Ofício atualizado!', 'success');
      return updated;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const deleteOficio = useCallback(async (id) => {
    try {
      await deletarOficio(id);
      setOficios(prev => prev.filter(o => o.id !== id));
      addToast('Ofício removido.', 'info');
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  // ─────────────────────────────────────────────────────────
  // SETORES CRUD
  // ─────────────────────────────────────────────────────────
  const addSetor = useCallback(async (dados) => {
    try {
      const novo = await criarSetor(dados);
      setSetores(prev => [...prev, novo]);
      addToast('Setor cadastrado!', 'success');
      return novo;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const editSetor = useCallback(async (id, dados) => {
    try {
      const updated = await atualizarSetor(id, dados);
      setSetores(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
      addToast('Setor atualizado!', 'success');
      return updated;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const deleteSetor = useCallback(async (id) => {
    try {
      await deletarSetor(id);
      setSetores(prev => prev.filter(s => s.id !== id));
      addToast('Setor removido.', 'info');
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  // ─────────────────────────────────────────────────────────
  // SERVIÇOS CRUD
  // ─────────────────────────────────────────────────────────
  const addServico = useCallback(async (dados) => {
    try {
      const novo = await criarServico(dados);
      setServicos(prev => [...prev, novo]);
      addToast('Serviço cadastrado!', 'success');
      return novo;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const editServico = useCallback(async (id, dados) => {
    try {
      const updated = await atualizarServico(id, dados);
      setServicos(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
      addToast('Serviço atualizado!', 'success');
      return updated;
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  const deleteServico = useCallback(async (id) => {
    try {
      await deletarServico(id);
      setServicos(prev => prev.filter(s => s.id !== id));
      addToast('Serviço removido.', 'info');
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  // ─────────────────────────────────────────────────────────
  // CARTÓRIO
  // ─────────────────────────────────────────────────────────
  const salvarCartorio = useCallback(async (dados) => {
    try {
      // Se tem logo como File, faz upload primeiro
      if (dados._logoFile instanceof File) {
        const url = await uploadLogo(dados._logoFile);
        dados = { ...dados, logo_url: url };
        delete dados._logoFile;
      }
      const updated = await salvarCartorioDB(dados);
      setCartorio(updated);
      addToast('Configurações salvas!', 'success');
    } catch (err) { addToast('Erro: ' + err.message, 'error'); }
  }, []);

  // ─────────────────────────────────────────────────────────
  // PROXÍMO NÚMERO OFÍCIO
  // ─────────────────────────────────────────────────────────
  const getProximoNumeroOficio = useCallback(async (mesAno) => {
    try {
      return await proximoNumeroOficio(mesAno);
    } catch {
      // Fallback local
      const doMes = oficios.filter(o => o.mes_ano === mesAno);
      return String(doMes.length + 1).padStart(4, '0') + '/' + mesAno.split('/')[1];
    }
  }, [oficios]);

  // ─────────────────────────────────────────────────────────
  // REALTIME — escuta mudanças no banco em tempo real
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!usuario) return;

    const channel = supabase
      .channel('sysprocesso-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'processos' }, () => fetchProcessos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'andamentos' }, () => fetchAndamentos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' },    () => fetchTarefas())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oficios' },    () => fetchOficios())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [usuario?.id]);

  return (
    <AppContext.Provider value={{
      // Auth
      usuario, login, logout, registrarAcesso, authLoading,
      // Dados
      usuarios,   addUsuario,   editUsuario,   deleteUsuario,
      processos,  addProcesso,  editProcesso,  deleteProcesso,
      andamentos, addAndamento, editAndamento, deleteAndamento,
      tarefas,    addTarefa,    editTarefa,    deleteTarefa,
      oficios,    addOficio,    editOficio,    deleteOficio,
      setores,    addSetor,     editSetor,     deleteSetor,
      servicos,   addServico,   editServico,   deleteServico,
      logs, cartorio, salvarCartorio,
      dashStats, fetchDashboard,
      // Helpers
      getProximoNumeroOficio,
      // UI
      tema, toggleTema,
      sidebarCollapsed, setSidebarCollapsed,
      toasts, addToast,
      loading,
      temPermissao,
      // Recarregar
      carregarTudo, fetchProcessos, fetchAndamentos,
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
