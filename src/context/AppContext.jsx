// SysProcesso — AppContext com Supabase + debug
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Client separado para signUp de novos usuários (não interfere na sessão do admin)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false, autoRefreshToken: false, storageKey: 'sysprocesso-anon-signup' }
});

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [usuario, setUsuario]     = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [usuarios,   setUsuarios]   = useState([]);
  const [interessados, setInteressados] = useState([]);
  const [processos,  setProcessos]  = useState([]);
  const [andamentos, setAndamentos] = useState([]);
  const [tarefas,    setTarefas]    = useState([]);
  const [oficios,    setOficios]    = useState([]);
  const [setores,    setSetores]    = useState([]);
  const [servicos,   setServicos]   = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [cartorio,   setCartorio]   = useState({});
  const [dashStats,  setDashStats]  = useState(null);
  const [loading,    setLoadingMap] = useState({});
  const [tema,       setTema]       = useState('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toasts,     setToasts]     = useState([]);

  const addToast = useCallback((msg, type = 'info', duration = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  // ── AUTH ────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (session?.user) {
        carregarPerfil(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        carregarPerfil(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUsuario(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const carregarPerfil = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', uid)
        .single();


      if (data) {
        setUsuario(data);
        if (data.pref_cor_tema && data.pref_cor_tema !== 'padrao') {
          document.documentElement.setAttribute('data-color', data.pref_cor_tema);
        } else {
          document.documentElement.removeAttribute('data-color');
        }
        if (data.pref_cor_accent) {
          document.documentElement.style.setProperty('--color-accent', data.pref_cor_accent);
        }
        if (data.pref_tema_base) {
          setTema(data.pref_tema_base);
          document.documentElement.setAttribute('data-theme', data.pref_tema_base);
        }
      } else {
        // Perfil não encontrado — cria um mínimo para não travar
        const { data: authUser } = await supabase.auth.getUser();
        const perfilMinimo = {
          id: uid,
          nome_completo: authUser?.user?.email || 'Usuário',
          nome_simples: authUser?.user?.email?.split('@')[0] || 'Usuário',
          perfil: 'Administrador',
          ativo: true,
          permissoes: ['dashboard','usuarios','processos','andamentos','tarefas','oficios','servicos','setores','configuracoes','logs'],
        };
        setUsuario(perfilMinimo);
      }
    } catch (err) {
      console.error('[Perfil] Exceção:', err);
      // Mesmo com erro, deixa o usuário entrar com perfil mínimo
      const { data: authUser } = await supabase.auth.getUser();
      setUsuario({
        id: uid,
        nome_completo: authUser?.user?.email || 'Usuário',
        nome_simples: authUser?.user?.email?.split('@')[0] || 'Usuário',
        perfil: 'Administrador',
        ativo: true,
        permissoes: ['dashboard','usuarios','processos','andamentos','tarefas','oficios','servicos','setores','configuracoes','logs'],
      });
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      carregarTudo();
    }
  }, [usuario?.id]);



  const carregarTudo = async () => {
    await Promise.allSettled([
      fetchSetores(),
      fetchServicos(),
      fetchCartorio(),
      fetchProcessos(),
      fetchAndamentos(),
      fetchTarefas(),
      fetchOficios(),
      fetchUsuarios(),
      fetchInteressados(),
      fetchLogs(),
    ]);
  };

  const login = useCallback(async (email, senha) => {
    try {
      console.log('[LOGIN] Tentando login para:', email);
      console.log('[LOGIN] URL Supabase:', SUPABASE_URL);
      console.log('[LOGIN] ANON Key (primeiros 20 chars):', SUPABASE_ANON?.substring(0, 20));
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
      console.log('[LOGIN] Resposta data:', data);
      console.log('[LOGIN] Resposta error:', error);
      if (error) {
        console.error('[LOGIN] Erro completo:', JSON.stringify(error));
        addToast(`Erro: ${error.message} (status: ${error.status})`, 'error');
        return false;
      }
      addToast('Bem-vindo ao SysProcesso!', 'success');
      return true;
    } catch (err) {
      console.error('[LOGIN] Exceção:', err);
      addToast('Erro ao conectar. Tente novamente.', 'error');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setProcessos([]); setAndamentos([]); setTarefas([]);
    setOficios([]); setDashStats(null);
  }, []);

  const registrarAcesso = useCallback(async () => {
    try {
      await supabase.from('logs_acesso').insert({
        acao: 'Acesso (sem login)',
        navegador: navigator.userAgent.slice(0, 100),
        so: navigator.platform || '—',
      });
    } catch(e) {}
  }, []);

  const toggleTema = useCallback(() => {
    setTema(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      return next;
    });
  }, []);

  const setTemaBase = useCallback(async (novoTema) => {
    setTema(novoTema);
    document.documentElement.setAttribute('data-theme', novoTema);
    // Persiste como preferência do usuário
    if (usuario?.id) {
      try {
        await supabase.from('usuarios').update({ pref_tema_base: novoTema }).eq('id', usuario.id);
        setUsuario(prev => ({ ...prev, pref_tema_base: novoTema }));
      } catch(e) { console.error(e); }
    }
  }, [usuario?.id]);

  const temPermissao = useCallback((modulo) => {
    if (!usuario) return false;
    if (usuario.perfil === 'Administrador') return true;
    return usuario.permissoes?.includes(modulo) ?? false;
  }, [usuario]);

  // ── FETCH ──────────────────────────────────────────────
  const salvarPrefsUsuario = async (prefs) => {
    console.log('[PREFS] Iniciando salvar:', prefs, 'usuario.id:', usuario?.id);
    if (!usuario?.id) { console.warn('[PREFS] Sem usuario.id, abortando'); return; }
    try {
      const { data, error } = await supabase.from('usuarios').update(prefs).eq('id', usuario.id).select();
      if (error) {
        console.error('[PREFS] Erro Supabase:', error);
      } else {
        console.log('[PREFS] Salvo com sucesso:', data);
        setUsuario(prev => ({ ...prev, ...prefs }));
      }
    } catch(e) { console.error('[PREFS] Exceção:', e); }
  };

  const fetchUsuarios  = async () => { try { const {data} = await supabase.from('usuarios').select('*').order('nome_completo'); if(data) setUsuarios(data); } catch(e){} };
  const fetchInteressados = async () => { try { const {data} = await supabase.from('interessados').select('*').order('nome'); if(data) setInteressados(data); } catch(e){console.error('interessados',e)} };
  const fetchProcessos = async () => { try { const [{data:procs},{data:ands}] = await Promise.all([supabase.from('processos').select('*').order('dt_abertura',{ascending:false}), supabase.from('andamentos').select('processo_id')]); if(procs) { const counts = (ands||[]).reduce((acc,a)=>{acc[a.processo_id]=(acc[a.processo_id]||0)+1;return acc;},{}); setProcessos(procs.map(p=>({...p,total_andamentos:counts[p.id]||0}))); } } catch(e){console.error('processos',e)} };
  const fetchAndamentos= async () => { try { const {data} = await supabase.from('andamentos').select('*, processos(numero_interno)').order('dt_andamento',{ascending:false}); if(data) setAndamentos(data); } catch(e){} };
  const fetchTarefas   = async () => { try { const {data} = await supabase.from('tarefas').select('*').order('dt_fim',{ascending:true}); if(data) setTarefas(data); } catch(e){} };
  const fetchOficios   = async () => { try { const {data} = await supabase.from('oficios').select('*').order('dt_oficio',{ascending:false}); if(data) setOficios(data); } catch(e){} };
  const fetchSetores   = async () => { try { const {data} = await supabase.from('setores').select('*').order('nome'); if(data) setSetores(data); } catch(e){} };
  const fetchServicos  = async () => { try { const {data} = await supabase.from('servicos').select('*').order('categoria'); if(data) setServicos(data); } catch(e){} };
  const fetchLogs      = async () => { try { const {data} = await supabase.from('logs_acesso').select('*').order('dt_acesso',{ascending:false}).limit(100); if(data) setLogs(data); } catch(e){} };
  const fetchCartorio  = async () => { try { const {data} = await supabase.from('cartorio').select('*').eq('id',1).single(); if(data) { setCartorio(data); } } catch(e){} };
  const fetchDashboard = async () => { try { const {data} = await supabase.rpc('dashboard_stats'); if(data) setDashStats(data); } catch(e){} };

  // ── CRUD ───────────────────────────────────────────────
  const addUsuario    = useCallback(async (d) => {
    try {
      if (!d.email)         { addToast('E-mail obrigatório.', 'error'); return; }
      if (!d.nome_completo) { addToast('Nome completo obrigatório.', 'error'); return; }
      if (!d.senha)         { addToast('Senha obrigatória.', 'error'); return; }

      // Verifica se e-mail já existe
      const { data: existente } = await supabase.from('usuarios').select('id').eq('email', d.email).maybeSingle();
      if (existente) { addToast('E-mail já cadastrado no sistema.', 'error'); return; }

      // Cria usuário direto no auth via função admin (já confirmado, sem email)
      const { data: authResult, error: authError } = await supabase.rpc('admin_criar_usuario', {
        p_email: d.email,
        p_senha: d.senha,
        p_nome:  d.nome_completo,
      });
      if (authError) throw authError;
      if (!authResult?.ok) throw new Error(authResult?.erro || 'Falha ao criar acesso.');
      const uid = authResult.id;
      if (!uid) throw new Error('Falha ao obter ID do usuário.');

      // Monta perfil explicitamente (evita passar campos errados)
      const perfil = {
        id:            uid,
        nome_completo: d.nome_completo,
        nome_simples:  d.nome_simples || d.nome_completo.split(' ')[0],
        email:         d.email,
        cargo:         d.cargo    || null,
        setor:         d.setor    || null,
        celular:       d.celular  || null,
        cpf:           d.cpf      || null,
        rg:            d.rg       || null,
        perfil:        d.perfil   || 'Operador',
        permissoes:    d.permissoes || [],
        ativo:         true,
      };

      // Verifica se uid já existe na tabela (tentativa anterior falhou no meio)
      const { data: jaExiste } = await supabase.from('usuarios').select('id').eq('id', uid).maybeSingle();
      let data, error;
      if (jaExiste) {
        // Atualiza o registro incompleto
        ({ data, error } = await supabase.from('usuarios').update(perfil).eq('id', uid).select().single());
      } else {
        ({ data, error } = await supabase.from('usuarios').insert(perfil).select().single());
      }
      if (error) throw error;
      setUsuarios(p => jaExiste ? p.map(u => u.id === uid ? data : u) : [...p, data]);
      addToast('Usuário cadastrado com sucesso!', 'success');
      return data;
    } catch(e) { addToast(e.message, 'error'); }
  }, []);
  const editUsuario   = useCallback(async (id, d) => { try { const { senha: _s, ...dadosSenha } = d; const {data,error} = await supabase.from('usuarios').update(dadosSenha).eq('id',id).select().single(); if(error) throw error; setUsuarios(p=>p.map(u=>u.id===id?data:u)); if(usuario?.id===id) setUsuario(data); addToast('Salvo!','success'); } catch(e){ addToast(e.message,'error'); } }, [usuario]);
  const alterarSenha = useCallback(async (userId, novaSenha) => {
    if (!novaSenha || novaSenha.length < 6) {
      addToast('Senha deve ter mínimo 6 caracteres.', 'error'); return false;
    }
    try {
      const { data, error } = await supabase.rpc('admin_alterar_senha', {
        p_user_id: userId,
        p_nova_senha: novaSenha,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.erro || 'Erro ao alterar senha');
      addToast('Senha alterada com sucesso!', 'success');
      return true;
    } catch(e) { addToast(e.message, 'error'); return false; }
  }, []);

  const minhaSenha = useCallback(async (novaSenha) => {
    if (!novaSenha || novaSenha.length < 6) {
      addToast('Senha deve ter mínimo 6 caracteres.', 'error'); return false;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      addToast('Sua senha foi alterada!', 'success');
      return true;
    } catch(e) { addToast(e.message, 'error'); return false; }
  }, []);
  const deleteUsuario = useCallback(async (id) => { try { await supabase.from('usuarios').update({ativo:false}).eq('id',id); setUsuarios(p=>p.map(u=>u.id===id?{...u,ativo:false}:u)); } catch(e){ addToast(e.message,'error'); } }, []);

  const CAMPOS_PROCESSO = ['numero_interno','numero_judicial','categoria','especie','partes','municipio','status','dt_abertura','dt_conclusao','responsavel_id','valor_ato','obs','livro_ato','folhas_ato','esc_natureza','esc_descricao','certidoes'];
  const limparProcesso = (d) => Object.fromEntries(Object.entries(d).filter(([k]) => CAMPOS_PROCESSO.includes(k)).map(([k,v]) => [k, v === '' ? null : v]));

  const addProcesso    = useCallback(async (d) => { try { 
    const {data,error} = await supabase.from('processos').insert({...limparProcesso(d),criado_por:usuario?.id}).select().single(); if(error) throw error; await fetchProcessos(); addToast('Processo cadastrado!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, [usuario]);
  const editProcesso   = useCallback(async (id, d) => { try {
    const {data,error} = await supabase.from('processos').update(limparProcesso(d)).eq('id',id).select().single(); if(error) throw error; setProcessos(p=>p.map(i=>i.id===id?{...i,...data}:i)); addToast('Salvo!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const deleteProcesso = useCallback(async (id) => { try { await supabase.from('processos').delete().eq('id',id); setProcessos(p=>p.filter(i=>i.id!==id)); addToast('Removido.','info'); } catch(e){ addToast(e.message,'error'); } }, []);

  const addAndamento    = useCallback(async (d) => { try { const {data,error} = await supabase.from('andamentos').insert(d).select().single(); if(error) throw error; setAndamentos(p=>[data,...p]); setProcessos(p=>p.map(proc=>proc.id===d.processo_id?{...proc,total_andamentos:(proc.total_andamentos||0)+1}:proc)); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const editAndamento   = useCallback(async (id, d) => { try { const {data,error} = await supabase.from('andamentos').update(d).eq('id',id).select().single(); if(error) throw error; setAndamentos(p=>p.map(a=>a.id===id?{...a,...data}:a)); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const deleteAndamento = useCallback(async (id) => { try { await supabase.from('andamentos').delete().eq('id',id); setAndamentos(p=>p.filter(a=>a.id!==id)); } catch(e){ addToast(e.message,'error'); } }, []);
  const addInteressado    = useCallback(async (d) => { try { const {data,error} = await supabase.from('interessados').insert(d).select().single(); if(error) throw error; setInteressados(p=>[...p,data]); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const editInteressado   = useCallback(async (id, d) => { try { const {data,error} = await supabase.from('interessados').update(d).eq('id',id).select().single(); if(error) throw error; setInteressados(p=>p.map(i=>i.id===id?data:i)); addToast('Salvo!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const deleteInteressado = useCallback(async (id) => { try { await supabase.from('interessados').delete().eq('id',id); setInteressados(p=>p.filter(i=>i.id!==id)); addToast('Removido.','info'); } catch(e){ addToast(e.message,'error'); } }, []);

  const addTarefa    = useCallback(async (d) => { try { const {data,error} = await supabase.from('tarefas').insert({...d,criado_por:usuario?.id}).select().single(); if(error) throw error; setTarefas(p=>[data,...p]); addToast('Tarefa criada!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, [usuario]);
  const editTarefa   = useCallback(async (id, d) => { try { const {data,error} = await supabase.from('tarefas').update(d).eq('id',id).select().single(); if(error) throw error; setTarefas(p=>p.map(t=>t.id===id?{...t,...data}:t)); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const deleteTarefa = useCallback(async (id) => { try { await supabase.from('tarefas').delete().eq('id',id); setTarefas(p=>p.filter(t=>t.id!==id)); addToast('Removida.','info'); } catch(e){ addToast(e.message,'error'); } }, []);

  const addOficio    = useCallback(async (d) => { try { const {data,error} = await supabase.from('oficios').insert(d).select().single(); if(error) throw error; setOficios(p=>[data,...p]); addToast('Ofício registrado!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const editOficio   = useCallback(async (id, d) => { try { const {data,error} = await supabase.from('oficios').update(d).eq('id',id).select().single(); if(error) throw error; setOficios(p=>p.map(o=>o.id===id?{...o,...data}:o)); addToast('Salvo!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const deleteOficio = useCallback(async (id) => { try { await supabase.from('oficios').delete().eq('id',id); setOficios(p=>p.filter(o=>o.id!==id)); addToast('Removido.','info'); } catch(e){ addToast(e.message,'error'); } }, []);

  const addSetor    = useCallback(async (d) => { try { const {data,error} = await supabase.from('setores').insert(d).select().single(); if(error) throw error; setSetores(p=>[...p,data]); addToast('Setor criado!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const editSetor   = useCallback(async (id, d) => { try { const {data,error} = await supabase.from('setores').update(d).eq('id',id).select().single(); if(error) throw error; setSetores(p=>p.map(s=>s.id===id?{...s,...data}:s)); addToast('Salvo!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const deleteSetor = useCallback(async (id) => { try { await supabase.from('setores').delete().eq('id',id); setSetores(p=>p.filter(s=>s.id!==id)); addToast('Removido.','info'); } catch(e){ addToast(e.message,'error'); } }, []);

  const addServico    = useCallback(async (d) => { try { const {data,error} = await supabase.from('servicos').insert(d).select().single(); if(error) throw error; setServicos(p=>[...p,data]); addToast('Serviço criado!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const editServico   = useCallback(async (id, d) => { try { const {data,error} = await supabase.from('servicos').update(d).eq('id',id).select().single(); if(error) throw error; setServicos(p=>p.map(s=>s.id===id?{...s,...data}:s)); addToast('Salvo!','success'); return data; } catch(e){ addToast(e.message,'error'); } }, []);
  const deleteServico = useCallback(async (id) => { try { await supabase.from('servicos').delete().eq('id',id); setServicos(p=>p.filter(s=>s.id!==id)); addToast('Removido.','info'); } catch(e){ addToast(e.message,'error'); } }, []);

  const salvarCartorio = useCallback(async (d) => { try { const {data,error} = await supabase.from('cartorio').upsert({id:1,...d}).select().single(); if(error) throw error; setCartorio(data); addToast('Configurações salvas!','success'); } catch(e){ addToast(e.message,'error'); } }, []);

  const getProximoNumeroOficio = useCallback(async (mesAno) => {
    try { const {data} = await supabase.rpc('proximo_numero_oficio', {p_mes_ano: mesAno}); return data; }
    catch { const doMes = oficios.filter(o=>o.mes_ano===mesAno); return String(doMes.length+1).padStart(4,'0')+'/'+mesAno.split('/')[1]; }
  }, [oficios]);

  // Realtime
  useEffect(() => {
    if (!usuario) return;
    const channel = supabase.channel('realtime')
      .on('postgres_changes', {event:'*',schema:'public',table:'processos'}, fetchProcessos)
      .on('postgres_changes', {event:'*',schema:'public',table:'andamentos'}, fetchAndamentos)
      .on('postgres_changes', {event:'*',schema:'public',table:'tarefas'}, fetchTarefas)
      .on('postgres_changes', {event:'*',schema:'public',table:'oficios'}, fetchOficios)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [usuario?.id]);

  if (authLoading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#111',color:'#fff',flexDirection:'column',gap:12}}>
        <div style={{width:32,height:32,border:'3px solid #444',borderTop:'3px solid #fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
        <span style={{fontSize:13,color:'#888'}}>Conectando...</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{
      usuario, login, logout, registrarAcesso, authLoading,
      usuarios, addUsuario, editUsuario, deleteUsuario, alterarSenha, minhaSenha,
      processos, addProcesso, editProcesso, deleteProcesso,
      andamentos, addAndamento, editAndamento, deleteAndamento,
      tarefas, addTarefa, editTarefa, deleteTarefa,
      oficios, addOficio, editOficio, deleteOficio,
      setores, addSetor, editSetor, deleteSetor,
      servicos, addServico, editServico, deleteServico,
      logs, cartorio, salvarCartorio,
      dashStats, fetchDashboard,
      getProximoNumeroOficio,
      tema, toggleTema, setTemaBase,
      sidebarCollapsed, setSidebarCollapsed,
      toasts, addToast,
      loading,
      temPermissao,
      interessados, addInteressado, editInteressado, deleteInteressado,
      carregarTudo, fetchProcessos, fetchAndamentos, salvarPrefsUsuario,
      supabaseClient: supabase,
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
