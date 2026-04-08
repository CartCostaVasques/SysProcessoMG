import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const HOJE = () => {
  // Data atual no horário de Cuiabá (UTC-4)
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Cuiaba' }));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};


// ── Seletor de cor igual ao da tela de Configurações ─────────────────────────
const FUNDOS_PRESET = [
  { id: 'dark-blue',   label: 'Azul Escuro',    valor: '#0d1117' },
  { id: 'dark-gray',   label: 'Cinza Escuro',   valor: '#111827' },
  { id: 'dark-slate',  label: 'Slate Escuro',   valor: '#0f172a' },
  { id: 'dark-green',  label: 'Verde Escuro',   valor: '#052e16' },
  { id: 'dark-purple', label: 'Roxo Escuro',    valor: '#1a0533' },
  { id: 'dark-brown',  label: 'Marrom Escuro',  valor: '#1c0a00' },
  { id: 'mid-blue',    label: 'Azul Médio',     valor: '#1e3a5f' },
  { id: 'mid-gray',    label: 'Cinza Médio',    valor: '#374151' },
  { id: 'mid-green',   label: 'Verde Médio',    valor: '#14532d' },
  { id: 'mid-teal',    label: 'Teal Médio',     valor: '#134e4a' },
  { id: 'mid-purple',  label: 'Roxo Médio',     valor: '#3b1f6e' },
  { id: 'light-gray',  label: 'Cinza Claro',    valor: '#d1d5db' },
  { id: 'light-blue',  label: 'Azul Claro',     valor: '#bfdbfe' },
  { id: 'light-green', label: 'Verde Claro',    valor: '#bbf7d0' },
  { id: 'light-teal',  label: 'Teal Claro',     valor: '#99f6e4' },
  { id: 'light-sky',   label: 'Azul Céu',       valor: '#e0f2fe' },
  { id: 'white',       label: 'Branco',          valor: '#ffffff' },
];

const CORES_PRESET = [
  { label: 'Âmbar',        valor: '#f59e0b' },
  { label: 'Azul Celeste', valor: '#38bdf8' },
  { label: 'Azul Médio',   valor: '#60a5fa' },
  { label: 'Azul Royal',   valor: '#3b82f6' },
  { label: 'Verde',        valor: '#4ade80' },
  { label: 'Verde Menta',  valor: '#6ee7b7' },
  { label: 'Verde Claro',  valor: '#86efac' },
  { label: 'Laranja',      valor: '#fb923c' },
  { label: 'Rosa',         valor: '#f472b6' },
  { label: 'Lilás',        valor: '#c084fc' },
  { label: 'Branco Puro',  valor: '#ffffff' },
  { label: 'Cinza Claro',  valor: '#e0e0e6' },
];

function SeletorCor({ label, chave, valor, onChange, tipo = 'cor' }) {
  const preset = tipo === 'fundo' ? FUNDOS_PRESET : CORES_PRESET;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {preset.map(c => (
          <button key={c.id || c.valor} onClick={() => onChange(chave, c.valor)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--color-surface-2)', border: `2px solid ${valor === c.valor ? c.valor : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 12, color: valor === c.valor ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: valor === c.valor ? 700 : 400 }}>
            <div style={{ width: 16, height: 16, borderRadius: 3, background: c.valor, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>Personalizada:</div>
        <input type="color" value={valor || '#000000'} onChange={e => onChange(chave, e.target.value)}
          style={{ width: 40, height: 32, border: '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer', padding: 2, background: 'var(--color-surface-2)' }} />
        <input className="form-input" value={valor || ''} onChange={e => onChange(chave, e.target.value)}
          style={{ width: 110, fontFamily: 'var(--font-mono)', fontSize: 13 }} />
        <div style={{ width: 28, height: 28, borderRadius: 6, background: valor || '#000', border: '1px solid rgba(255,255,255,0.15)' }} />
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const abreviarSetor = (nome) =>
  nome === 'Reconhecimento de Firma' ? 'Rec. de Firma' : nome;

export default function SenhaGuiche() {
  const { supabaseClient: sb, addToast, usuarios, temPermissao, usuario, cartorio } = useApp();
  const [setores, setSetores]       = useState([]);
  const [senhas, setSenhas]         = useState([]);
  const [historico, setHistorico]   = useState([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoje'); // hoje | semana | mes
  const [setoresAbertos, setSetoresAbertos] = useState({});  // { 'resp::setor': bool }
  const [aba, setAba]               = useState('fila'); // fila | historico
  const [filtroSetor, setFiltroSetor] = useState('');
  const [guiche, setGuiche]         = useState(localStorage.getItem('guiche_nome') || '');
  const [editGuiche, setEditGuiche] = useState(!guiche);
  const [guicheTemp, setGuicheTemp] = useState(guiche);
  const [chamando, setChamando]     = useState(false);
  const [ultimaChamada, setUltima]  = useState(null);
  const [config, setConfig]         = useState({});
  const [configEdit, setConfigEdit] = useState({});
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [modalGerarSenha, setModalGerarSenha] = useState(false);
  const [gerarSetorSel, setGerarSetorSel]     = useState('');
  const [gerarTipo, setGerarTipo]             = useState('normal');
  const [gerandoSenha, setGerandoSenha]       = useState(false);
  const [gerarConfirm, setGerarConfirm]       = useState(null); // { cod, setor }
  const [atendidas, setAtendidas]             = useState([]);
  const [modalTransferir, setModalTransferir] = useState(null); // senha object
  const [transferirResp, setTransferirResp]   = useState('');
  const [transferindo, setTransferindo]       = useState(false);

  useEffect(() => {
    carregarDados();
    carregarConfig();

    const canal = sb.channel('guiche-senhas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'senhas' }, () => {
        carregarDados();
      })
      .subscribe();

    // Polling de fallback — atualiza a cada 30s caso o Realtime caia
    const poll = setInterval(() => carregarDados(), 30000);

    return () => { sb.removeChannel(canal); clearInterval(poll); };
  }, []);

  const carregarConfig = async () => {
    const { data } = await sb.from('senha_config').select('chave, valor');
    if (data) {
      const obj = Object.fromEntries(data.map(r => [r.chave, r.valor]));
      setConfig(obj);
      setConfigEdit(obj);
    }
  };

  const salvarConfig = async () => {
    setSalvandoConfig(true);
    try {
      const rows = Object.entries(configEdit).map(([chave, valor]) => ({ chave, valor }));
      await sb.from('senha_config').upsert(rows, { onConflict: 'chave' });
      setConfig({ ...configEdit });
      addToast('Configurações salvas!', 'success');
    } catch (e) {
      addToast('Erro ao salvar: ' + e.message, 'error');
    } finally {
      setSalvandoConfig(false);
    }
  };

  const carregarDados = async () => {
    const { data: setsData } = await sb.from('senha_setores').select('*').eq('ativo', true).order('ordem');
    setSetores(setsData || []);

    const { data: senhasData } = await sb.from('senhas')
      .select('*, senha_setores(nome, prefixo)')
      .eq('status', 'aguardando')
      .gte('criado_em', HOJE() + 'T04:00:00Z')
      .order('tipo', { ascending: false })
      .order('criado_em', { ascending: true });
    setSenhas(senhasData || []);

    const inicio = (() => {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Cuiaba' }));
      if (filtroPeriodo === 'semana') d.setDate(d.getDate() - 6);
      else if (filtroPeriodo === 'mes') d.setDate(1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    const { data: histData } = await sb.from('senhas')
      .select('*, senha_setores(nome, prefixo)')
      .eq('status', 'chamada')
      .gte('criado_em', inicio + 'T04:00:00Z')
      .order('chamado_em', { ascending: false });
    setHistorico(histData || []);
    setAtendidas(histData || []);
    setSetoresAbertos({});
  };

  const getCod = (s) => {
    const setor = s.senha_setores;
    if (!setor) return '---';
    return `${setor.prefixo}${String(s.numero).padStart(2, '0')}`;
  };

  // Separa preferencial e normal, filtra por setor se houver
  const senhasFiltradas = useMemo(() => {
    let lista = senhas;
    if (filtroSetor) lista = lista.filter(s => s.setor_id === filtroSetor);
    const pref = lista.filter(s => s.tipo === 'preferencial');
    const norm = lista.filter(s => s.tipo === 'normal');
    return [...pref, ...norm];
  }, [senhas, filtroSetor]);

  const chamarProxima = async () => {
    if (chamando || senhasFiltradas.length === 0) return;
    setChamando(true);
    try {
      const proxima = senhasFiltradas[0];
      const { error } = await sb.from('senhas').update({
        status: 'chamada',
        guiche: usuario?.nome_simples || guiche || null,
        chamado_em: new Date().toISOString(),
      }).eq('id', proxima.id);
      if (error) throw error;
      setUltima(proxima);
      await carregarDados();
    } catch (e) {
      addToast('Erro ao chamar senha: ' + e.message, 'error');
    } finally {
      setChamando(false);
    }
  };

  const chamarSenhaEspecifica = async (senha) => {
    if (chamando) return;
    setChamando(true);
    try {
      const { error } = await sb.from('senhas').update({
        status: 'chamada',
        guiche: usuario?.nome_simples || guiche || null,
        chamado_em: new Date().toISOString(),
      }).eq('id', senha.id);
      if (error) throw error;
      setUltima(senha);
      await carregarDados();
    } catch (e) {
      addToast('Erro ao chamar senha', 'error');
    } finally {
      setChamando(false);
    }
  };

  const repetirChamada = async () => {
    if (!ultimaChamada || chamando) return;
    setChamando(true);
    try {
      // Atualiza chamado_em para agora — dispara Realtime no painel e repete a voz
      await sb.from('senhas').update({
        chamado_em: new Date().toISOString(),
      }).eq('id', ultimaChamada.id);
    } catch (e) {
      addToast('Erro ao repetir chamada', 'error');
    } finally {
      setChamando(false);
    }
  };

  const salvarGuiche = () => {
    setGuiche(guicheTemp);
    localStorage.setItem('guiche_nome', guicheTemp);
    setEditGuiche(false);
  };

  const totalPref = senhasFiltradas.filter(s => s.tipo === 'preferencial').length;
  const totalNorm = senhasFiltradas.filter(s => s.tipo === 'normal').length;

  // Agrupa histórico por guichê
  // ── Periodo helper ────────────────────────────────────────────────────────
  const inicioPeriodo = () => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Cuiaba' }));
    if (filtroPeriodo === 'semana') { d.setDate(d.getDate() - 6); }
    else if (filtroPeriodo === 'mes') { d.setDate(1); }
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  // ── Resumo geral por setor (todos os responsaveis) ─────────────────────────
  const resumoPorSetor = useMemo(() => {
    const mapa = {};
    for (const s of historico) {
      const nome = s.senha_setores?.nome || 'Desconhecido';
      if (!mapa[nome]) mapa[nome] = 0;
      mapa[nome]++;
    }
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [historico]);

  // ── Historico filtrado por responsavel ────────────────────────────────────
  const isAdmin = usuario?.perfil === 'Administrador';
  const historicoFiltrado = useMemo(() => {
    if (isAdmin) return historico;
    return historico.filter(s => s.guiche === (usuario?.nome_simples || ''));
  }, [historico, isAdmin, usuario]);

  const historicoPorResp = useMemo(() => {
    const mapa = {};
    for (const s of historicoFiltrado) {
      const key = s.guiche || '(sem responsável)';
      if (!mapa[key]) mapa[key] = { resp: key, total: 0, porSetor: {} };
      mapa[key].total++;
      const nomeSetor = s.senha_setores?.nome || 'Desconhecido';
      if (!mapa[key].porSetor[nomeSetor]) mapa[key].porSetor[nomeSetor] = [];
      mapa[key].porSetor[nomeSetor].push(s);
    }
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [historicoFiltrado]);

  const toggleSetor = (key) => setSetoresAbertos(p => ({ ...p, [key]: !p[key] }));

  const transferirSenha = async () => {
    if (!transferirResp || !modalTransferir) return;
    setTransferindo(true);
    try {
      const { error } = await sb.from('senhas')
        .update({ guiche: transferirResp })
        .eq('id', modalTransferir.id);
      if (error) throw error;
      addToast('Senha transferida com sucesso!', 'success');
      setModalTransferir(null);
      setTransferirResp('');
      await carregarDados();
    } catch (e) {
      addToast('Erro ao transferir: ' + e.message, 'error');
    } finally {
      setTransferindo(false);
    }
  };

  const gerarSenhaParaCliente = async () => {
    if (!gerarSetorSel) { addToast('Selecione o setor', 'error'); return; }
    setGerandoSenha(true);
    try {
      const setor = setores.find(s => s.id === gerarSetorSel);
      const { data: ultimas } = await sb.from('senhas').select('numero')
        .eq('setor_id', gerarSetorSel)
        .gte('criado_em', HOJE() + 'T04:00:00Z')
        .order('numero', { ascending: false }).limit(1);
      const numero = ultimas?.length > 0 ? ultimas[0].numero + 1 : 1;
      const cod    = `${setor.prefixo}${String(numero).padStart(2, '0')}`;
      const { error } = await sb.from('senhas').insert({
        setor_id: gerarSetorSel, numero, tipo: gerarTipo, status: 'aguardando'
      });
      if (error) throw error;
      const proxyHost  = config['imp_proxy_host']  || '192.168.10.129';
      const proxyPorta = config['imp_proxy_porta']  || '8080';
      const nomeCart   = cartorio?.nome_simples || cartorio?.nome || 'Cartório';
      fetch(`http://${proxyHost}:${proxyPorta}/imprimir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartorio: nomeCart, setor: setor.nome, senha: cod,
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          preferencial: gerarTipo === 'preferencial',
          tam_cartorio: config['imp_tam_cartorio'] || 'normal',
          tam_setor:    config['imp_tam_setor']    || 'medio',
          tam_senha:    config['imp_tam_senha']    || 'grande',
          tam_hora:     config['imp_tam_hora']     || 'normal',
          rodape:       config['imp_rodape']       || 'Seja Bem-Vindo!',
          info:         config['imp_info']         || '',
        }),
      }).catch(() => {});
      setGerarConfirm({ cod, setor: setor.nome, tipo: gerarTipo });
      await carregarDados();
    } catch (e) {
      addToast('Erro ao gerar senha: ' + e.message, 'error');
    } finally {
      setGerandoSenha(false);
    }
  };

  useEffect(() => { carregarDados(); }, [filtroPeriodo]);


  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">🎫 Gerenciador de Senhas</div>
          <div className="page-sub">{senhasFiltradas.length} senha(s) aguardando · {totalPref} preferencial · {totalNorm} normal</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => { setModalGerarSenha(true); setGerarConfirm(null); setGerarSetorSel(''); setGerarTipo('normal'); }}
            className="btn btn-primary">
            🎫 Gerar Senha para Cliente
          </button>
          {/* Identificação do guichê */}
          {editGuiche ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input className="form-input" value={guicheTemp} onChange={e => setGuicheTemp(e.target.value)}
                placeholder="Nome do guichê..." style={{ width: 180, height: 36, fontSize: 13 }}
                onKeyDown={e => e.key === 'Enter' && salvarGuiche()} />
              <button className="btn btn-primary btn-sm" onClick={salvarGuiche}>✓</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ padding: '6px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-muted)' }}>
                {guiche ? `Guichê: ${guiche}` : 'Sem guichê'}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setGuicheTemp(guiche); setEditGuiche(true); }}>✎</button>
            </div>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
        {[['fila', '🎫 Fila de Espera'], ['atendidas', '✅ Senhas Atendidas'], ['historico', '📋 Histórico do Dia'], ...(temPermissao('senha_aparencia') ? [['aparencia', '🎨 Aparência'], ['impressora', '🖨 Impressora']] : [])].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            className={`tab-btn ${aba === id ? 'active' : ''}`}>
            {label}
            {id === 'fila' && senhasFiltradas.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 7px', borderRadius: 10, background: 'var(--color-accent)', color: 'var(--color-bg)', fontWeight: 700 }}>{senhasFiltradas.length}</span>
            )}
            {id === 'historico' && historico.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 7px', borderRadius: 10, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontWeight: 700 }}>{historico.length}</span>
            )}
          </button>
        ))}
      </div>

      {aba === 'atendidas' && (() => {
        // Agrupar por setor
        const porSetor = {};
        for (const s of atendidas) {
          const nome = s.senha_setores?.nome || 'Desconhecido';
          if (!porSetor[nome]) porSetor[nome] = [];
          porSetor[nome].push(s);
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.keys(porSetor).length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-faint)' }}>
                Nenhuma senha atendida hoje ainda.
              </div>
            ) : Object.entries(porSetor).sort((a,b) => a[0].localeCompare(b[0])).map(([setor, senhasSetor]) => (
              <div key={setor} className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', margin: '-16px -16px 12px -16px', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{setor}</div>
                  <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 10, background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)', fontWeight: 700 }}>{senhasSetor.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {senhasSetor.map(s => {
                    const cod = `${s.senha_setores?.prefixo}${String(s.numero).padStart(2,'0')}`;
                    const isPref = s.tipo === 'preferencial';
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 4px', borderBottom: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: isPref ? 'var(--color-warning)' : 'var(--color-accent)', minWidth: 60, fontFamily: 'var(--font-mono)' }}>
                          {isPref && '⭐'} {cod}
                        </div>
                        <div style={{ flex: 1, fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {s.guiche || '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-faint)', minWidth: 50 }}>
                          {s.chamado_em ? new Date(s.chamado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setModalTransferir(s); setTransferirResp(s.guiche || ''); }}>
                          ↔ Transferir
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {aba === 'historico' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Filtro de período ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Período:</span>
            {[['hoje','Hoje'],['semana','Últimos 7 dias'],['mes','Este mês']].map(([id, label]) => (
              <button key={id} onClick={() => setFiltroPeriodo(id)}
                style={{ padding: '5px 14px', fontSize: 12, borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `1px solid ${filtroPeriodo === id ? 'var(--color-accent)' : 'var(--color-border)'}`, background: filtroPeriodo === id ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-2)', color: filtroPeriodo === id ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: filtroPeriodo === id ? 700 : 400 }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Cards resumo por setor (geral) ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Resumo Geral — Atendimentos por Setor</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {resumoPorSetor.length === 0 ? (
                <div style={{ color: 'var(--color-text-faint)', fontSize: 13 }}>Nenhum atendimento ainda.</div>
              ) : resumoPorSetor.map(([setor, qtd]) => (
                <div key={setor} style={{ padding: '14px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{abreviarSetor(setor)}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>{qtd}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>senha{qtd !== 1 ? 's' : ''} atendida{qtd !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Histórico por responsável ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              {isAdmin ? 'Histórico por Responsável' : `Suas senhas — ${usuario?.nome_simples || ''}`}
            </div>

            {historicoPorResp.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-faint)' }}>
                Nenhuma senha chamada neste período.
              </div>
            ) : historicoPorResp.map(({ resp, total, porSetor }) => (
              <div key={resp} className="card" style={{ marginBottom: 12 }}>
                {/* Cabeçalho do responsável */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', margin: '-16px -16px 16px -16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--color-bg)' }}>
                      {resp.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{resp}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{total} senha(s) chamada(s)</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-accent)' }}>{total}</div>
                </div>

                {/* Setores colapsáveis */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(porSetor).map(([nomeSetor, senhasSetor]) => {
                    const key = `${resp}::${nomeSetor}`;
                    const aberto = !!setoresAbertos[key];
                    return (
                      <div key={nomeSetor} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                        {/* Header clicável */}
                        <div onClick={() => toggleSetor(key)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: 'var(--color-surface-2)', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{nomeSetor}</span>
                            <span style={{ padding: '1px 8px', borderRadius: 10, background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)', color: 'var(--color-accent)', fontSize: 11, fontWeight: 700 }}>{senhasSetor.length}</span>
                          </div>
                          <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{aberto ? '▲' : '▼'}</span>
                        </div>
                        {/* Senhas */}
                        {aberto && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 14px' }}>
                            {senhasSetor.map(s => {
                              const cod = `${s.senha_setores?.prefixo}${String(s.numero).padStart(2,'0')}`;
                              const isPref = s.tipo === 'preferencial';
                              return (
                                <div key={s.id} style={{ padding: '4px 12px', borderRadius: 8, background: isPref ? 'color-mix(in srgb, var(--color-warning) 12%, transparent)' : 'var(--color-surface-2)', border: `1px solid ${isPref ? 'color-mix(in srgb, var(--color-warning) 30%, transparent)' : 'var(--color-border)'}`, fontSize: 14, fontWeight: 700, color: isPref ? 'var(--color-warning)' : 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>
                                  {isPref && '⭐'} {cod}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aba === 'fila' && (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Coluna principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ação principal */}
          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '20px 24px' }}>
            <button onClick={chamarProxima} disabled={chamando || senhasFiltradas.length === 0}
              style={{
                flex: 1, padding: '20px', fontSize: 20, fontWeight: 700,
                background: senhasFiltradas.length > 0 ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: senhasFiltradas.length > 0 ? 'var(--color-bg)' : 'var(--color-text-faint)',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: senhasFiltradas.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'all .15s',
              }}>
              {chamando ? '⏳ Chamando...' : senhasFiltradas.length > 0 ? '📢 Chamar Próxima' : 'Nenhuma senha na fila'}
            </button>

            {/* Filtro de setor */}
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Filtrar setor</div>
              <select className="form-select" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
                <option value="">Todos os setores</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Última chamada */}
          {ultimaChamada && (
            <div style={{ padding: '16px 20px', background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))', border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Última chamada:</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: ultimaChamada.tipo === 'preferencial' ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                {getCod(ultimaChamada)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{ultimaChamada.senha_setores?.nome}</div>
              {ultimaChamada.tipo === 'preferencial' && <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>⭐ Preferencial</span>}
              <div style={{ marginLeft: 'auto' }}>
                <button onClick={repetirChamada} disabled={chamando}
                  style={{ padding: '8px 18px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  📢 Repetir chamada
                </button>
              </div>
            </div>
          )}

          {/* Fila de senhas */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Fila de Espera</div>
            </div>

            {senhasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-faint)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div>Nenhuma senha aguardando</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Separador preferencial */}
                {totalPref > 0 && (
                  <div style={{ padding: '6px 14px', background: 'color-mix(in srgb, var(--color-warning) 8%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)', fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    ⭐ Preferencial — {totalPref}
                  </div>
                )}
                {senhasFiltradas.filter(s => s.tipo === 'preferencial').map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: i === 0 && !filtroSetor ? 'color-mix(in srgb, var(--color-warning) 5%, transparent)' : 'transparent' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-warning)', minWidth: 80 }}>{getCod(s)}</div>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-muted)' }}>{s.senha_setores?.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{new Date(s.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <button onClick={() => chamarSenhaEspecifica(s)} disabled={chamando}
                      className="btn btn-secondary btn-sm">📢 Chamar</button>
                    <button onClick={() => { setModalTransferir(s); setTransferirResp(s.guiche || ''); }} className="btn btn-secondary btn-sm">↔</button>
                  </div>
                ))}

                {/* Separador normal */}
                {totalNorm > 0 && (
                  <div style={{ padding: '6px 14px', background: 'color-mix(in srgb, var(--color-accent) 5%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)', fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    🎫 Normal — {totalNorm}
                  </div>
                )}
                {senhasFiltradas.filter(s => s.tipo === 'normal').map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: i === 0 && totalPref === 0 && !filtroSetor ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)' : 'transparent' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-accent)', minWidth: 80 }}>{getCod(s)}</div>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-muted)' }}>{s.senha_setores?.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{new Date(s.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <button onClick={() => chamarSenhaEspecifica(s)} disabled={chamando}
                      className="btn btn-secondary btn-sm">📢 Chamar</button>
                    <button onClick={() => { setModalTransferir(s); setTransferirResp(s.guiche || ''); }} className="btn btn-secondary btn-sm">↔</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral — contadores por setor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Por Setor</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {setores.map(setor => {
                const qtd = senhas.filter(s => s.setor_id === setor.id).length;
                const pref = senhas.filter(s => s.setor_id === setor.id && s.tipo === 'preferencial').length;
                return (
                  <div key={setor.id} onClick={() => setFiltroSetor(filtroSetor === setor.id ? '' : setor.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: filtroSetor === setor.id ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface-2)', border: `1px solid ${filtroSetor === setor.id ? 'var(--color-accent)' : 'transparent'}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--color-bg)', flexShrink: 0 }}>{setor.prefixo}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 500 }}>{abreviarSetor(setor.nome)}</div>
                      {pref > 0 && <div style={{ fontSize: 10, color: 'var(--color-warning)' }}>⭐ {pref} preferencial</div>}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: qtd > 0 ? 'var(--color-text)' : 'var(--color-text-faint)' }}>{qtd}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Links das telas externas */}
          <div className="card">
            <div className="card-header"><div className="card-title">Telas externas</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '📺 Painel (TV)', path: '/senha/painel' },
                { label: '🖥 Totem (Tablet)', path: '/senha/totem' },
              ].map(({ label, path }) => (
                <button key={path} onClick={() => window.open(path, '_blank')}
                  className="btn btn-secondary" style={{ textAlign: 'left', fontSize: 13 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}
      {aba === 'aparencia' && temPermissao('senha_aparencia') && (
        <div style={{ maxWidth: 760 }}>

          {/* ── TOTEM ── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">🖥 Totem (Tablet)</div></div>
            <SeletorCor label="Cor de fundo" chave="totem_cor_fundo" valor={configEdit['totem_cor_fundo']} onChange={(k,v) => setConfigEdit(p => ({...p,[k]:v}))} tipo="fundo" />
            <SeletorCor label="Nome do cartório" chave="totem_cor_nome_cartorio" valor={configEdit['totem_cor_nome_cartorio']} onChange={(k,v) => setConfigEdit(p => ({...p,[k]:v}))} />
            <SeletorCor label="Fundo do prefixo (letra do setor)" chave="totem_cor_prefixo_bg" valor={configEdit['totem_cor_prefixo_bg']} onChange={(k,v) => setConfigEdit(p => ({...p,[k]:v}))} />
            <SeletorCor label="Nome do setor" chave="totem_cor_nome_setor" valor={configEdit['totem_cor_nome_setor']} onChange={(k,v) => setConfigEdit(p => ({...p,[k]:v}))} />
          </div>

          {/* ── PAINEL TV ── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">📺 Painel (TV)</div></div>
            <SeletorCor label="Cor de fundo" chave="painel_cor_fundo" valor={configEdit['painel_cor_fundo']} onChange={(k,v) => setConfigEdit(p => ({...p,[k]:v}))} tipo="fundo" />
            <SeletorCor label="Nome do cartório" chave="painel_cor_nome_cartorio" valor={configEdit['painel_cor_nome_cartorio']} onChange={(k,v) => setConfigEdit(p => ({...p,[k]:v}))} />
            <SeletorCor label="Senha normal" chave="painel_cor_senha_normal" valor={configEdit['painel_cor_senha_normal']} onChange={(k,v) => setConfigEdit(p => ({...p,[k]:v}))} />
            <SeletorCor label="Senha preferencial" chave="painel_cor_senha_pref" valor={configEdit['painel_cor_senha_pref']} onChange={(k,v) => setConfigEdit(p => ({...p,[k]:v}))} />
          </div>

          {/* ── PREVIEW ── */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">👁 Preview</div></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, background: configEdit['totem_cor_fundo'] || '#0f172a', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Totem</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: configEdit['totem_cor_nome_cartorio'] || '#f59e0b', marginBottom: 12 }}>Cartório</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: configEdit['totem_cor_prefixo_bg'] || '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: '#fff' }}>A</div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: configEdit['totem_cor_nome_setor'] || '#4ade80' }}>Escritura</span>
                </div>
              </div>
              <div style={{ flex: 1, background: configEdit['painel_cor_fundo'] || '#1e2433', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Painel TV</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: configEdit['painel_cor_nome_cartorio'] || '#f59e0b', marginBottom: 12 }}>Cartório</div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 28, fontWeight: 900, color: configEdit['painel_cor_senha_normal'] || '#38bdf8' }}>A001</span>
                  <span style={{ fontSize: 28, fontWeight: 900, color: configEdit['painel_cor_senha_pref'] || '#f59e0b' }}>B002 ⭐</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setConfigEdit({ ...config })}>↩ Descartar</button>
            <button onClick={salvarConfig} disabled={salvandoConfig}
              style={{ padding: '10px 24px', background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: salvandoConfig ? 'not-allowed' : 'pointer', opacity: salvandoConfig ? 0.7 : 1 }}>
              {salvandoConfig ? '⏳ Salvando...' : '✓ Salvar Configurações'}
            </button>
          </div>
        </div>
      )}

      {aba === 'impressora' && temPermissao('senha_aparencia') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16, alignItems: 'start' }}>

          {/* ── Coluna esquerda: configurações ── */}
          <div>
            {/* Rede */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><div className="card-title">🔌 Conexão</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
                <div className="form-group">
                  <label className="form-label">IP da Impressora</label>
                  <input className="form-input" value={configEdit['imp_ip'] || ''}
                    onChange={e => setConfigEdit(p => ({...p, imp_ip: e.target.value}))}
                    placeholder="ex: 192.168.10.173" style={{ fontFamily: 'var(--font-mono)' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">IP do Proxy (Tablet)</label>
                  <input className="form-input" value={configEdit['imp_proxy_host'] || 'localhost'}
                    onChange={e => setConfigEdit(p => ({...p, imp_proxy_host: e.target.value}))}
                    placeholder="ex: 192.168.10.129 ou localhost"
                    style={{ fontFamily: 'var(--font-mono)' }} />
                  <div className="form-hint">Use "localhost" no tablet · IP do tablet (192.168.10.129) para imprimir do PC</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Porta impressora</label>
                    <input className="form-input" value={configEdit['imp_porta'] || '9100'}
                      onChange={e => setConfigEdit(p => ({...p, imp_porta: e.target.value}))}
                      style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Porta proxy (Termux)</label>
                    <input className="form-input" value={configEdit['imp_proxy_porta'] || '8080'}
                      onChange={e => setConfigEdit(p => ({...p, imp_proxy_porta: e.target.value}))}
                      style={{ fontFamily: 'var(--font-mono)' }} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Papel</label>
                    <select className="form-select" value={configEdit['imp_largura'] || '80'}
                      onChange={e => setConfigEdit(p => ({...p, imp_largura: e.target.value}))}>
                      <option value="58">58mm</option>
                      <option value="80">80mm</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Layout do ticket */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><div className="card-title">🎫 Layout do Ticket</div></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
                {[
                  { chave: 'imp_tam_cartorio', label: 'Nome do cartório' },
                  { chave: 'imp_tam_setor',    label: 'Setor' },
                  { chave: 'imp_tam_senha',    label: 'Código da senha' },
                  { chave: 'imp_tam_hora',     label: 'Horário' },
                ].map(({ chave, label }) => (
                  <div key={chave} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', width: 160, flexShrink: 0 }}>{label}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[['normal', 'Normal'], ['medio', 'Médio'], ['grande', 'Grande']].map(([v, l]) => (
                        <button key={v} onClick={() => setConfigEdit(p => ({...p, [chave]: v}))}
                          style={{ padding: '4px 12px', fontSize: 12, borderRadius: 'var(--radius-md)', cursor: 'pointer', border: `1px solid ${(configEdit[chave] || 'normal') === v ? 'var(--color-accent)' : 'var(--color-border)'}`, background: (configEdit[chave] || 'normal') === v ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-2)', color: (configEdit[chave] || 'normal') === v ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: (configEdit[chave] || 'normal') === v ? 700 : 400 }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="form-group" style={{ marginTop: 6 }}>
                  <label className="form-label">Texto do rodapé</label>
                  <input className="form-input" value={configEdit['imp_rodape'] || 'Seja Bem-Vindo!'}
                    onChange={e => setConfigEdit(p => ({...p, imp_rodape: e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Texto informativo (opcional)</label>
                  <input className="form-input" value={configEdit['imp_info'] || ''}
                    onChange={e => setConfigEdit(p => ({...p, imp_info: e.target.value}))}
                    placeholder="ex: Atendemos das 08h às 17h" />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setConfigEdit({ ...config })}>↩ Descartar</button>
              <button onClick={salvarConfig} disabled={salvandoConfig}
                style={{ padding: '10px 24px', background: 'var(--color-accent)', color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: salvandoConfig ? 'not-allowed' : 'pointer', opacity: salvandoConfig ? 0.7 : 1 }}>
                {salvandoConfig ? '⏳ Salvando...' : '✓ Salvar'}
              </button>
              <button onClick={() => {
                const porta = configEdit['imp_proxy_porta'] || '8080';
                const host  = configEdit['imp_proxy_host']  || 'localhost';
                const hora  = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                fetch(`http://${host}:${porta}/imprimir`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cartorio: (cartorio && cartorio.nome_simples) || 'Cartório',
                    setor: 'Escritura', senha: 'ES01', hora,
                    preferencial: false,
                    tam_cartorio: configEdit['imp_tam_cartorio'] || 'normal',
                    tam_setor:    configEdit['imp_tam_setor']    || 'medio',
                    tam_senha:    configEdit['imp_tam_senha']    || 'grande',
                    tam_hora:     configEdit['imp_tam_hora']     || 'normal',
                    rodape:       configEdit['imp_rodape']       || 'Seja Bem-Vindo!',
                    info:         configEdit['imp_info']         || '',
                  }),
                }).then(r => { if (r.ok) addToast('Teste enviado!', 'success'); else addToast('Erro: ' + r.status, 'error'); })
                  .catch(() => addToast('Proxy não responde. Termux rodando?', 'error'));
              }}
                className="btn btn-secondary">🖨 Imprimir Teste</button>
            </div>
          </div>

          {/* ── Coluna direita: preview visual ── */}
          <div style={{ position: 'sticky', top: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Preview do Ticket</div>
            <div style={{ background: '#fff', borderRadius: 8, padding: '16px 12px', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', fontFamily: 'monospace', color: '#111', minWidth: 220, border: '1px solid #e5e7eb' }}>
              {(() => {
                const tam = (chave) => {
                  const v = configEdit[chave] || 'normal';
                  if (v === 'grande') return { fontSize: 22, fontWeight: 700 };
                  if (v === 'medio')  return { fontSize: 17, fontWeight: 600 };
                  return { fontSize: 13, fontWeight: 400 };
                };
                const sep = <div style={{ borderTop: '1px dashed #ccc', margin: '6px 0' }} />;
                const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const rodape = configEdit['imp_rodape'] || 'Seja Bem-Vindo!';
                const info   = configEdit['imp_info'] || '';
                return (
                  <div style={{ textAlign: 'center' }}>
                    <div style={tam('imp_tam_cartorio')}>{(cartorio && cartorio.nome_simples) || 'Cartório'}</div>
                    {sep}
                    <div style={tam('imp_tam_setor')}>Escritura</div>
                    {sep}
                    <div style={{ ...tam('imp_tam_senha'), letterSpacing: 2 }}>A001</div>
                    {sep}
                    <div style={tam('imp_tam_hora')}>{hora}</div>
                    {sep}
                    <div style={{ fontSize: 13 }}>{rodape}</div>
                    {info && <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{info}</div>}
                    <div style={{ marginTop: 12, borderTop: '2px dashed #ccc', paddingTop: 4, fontSize: 10, color: '#aaa' }}>✂ corte</div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      )}

      {/* ── Modal Gerar Senha para Cliente ── */}
      {modalGerarSenha && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !gerandoSenha && setModalGerarSenha(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title">🎫 Gerar Senha para Cliente</span>
              <button className="btn-icon" onClick={() => !gerandoSenha && setModalGerarSenha(false)}>✕</button>
            </div>
            <div className="modal-body">
              {gerarConfirm ? (
                /* Confirmação */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{gerarConfirm.setor}</div>
                  <div style={{ fontSize: 80, fontWeight: 900, color: gerarConfirm.tipo === 'preferencial' ? 'var(--color-warning)' : 'var(--color-accent)', letterSpacing: -2, lineHeight: 1 }}>{gerarConfirm.cod}</div>
                  {gerarConfirm.tipo === 'preferencial' && <div style={{ fontSize: 14, color: 'var(--color-warning)', marginTop: 8 }}>⭐ Preferencial</div>}
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 12 }}>Senha gerada e enviada para impressão!</div>
                </div>
              ) : (
                /* Formulário */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Setor</label>
                    <select className="form-select" value={gerarSetorSel} onChange={e => setGerarSetorSel(e.target.value)}>
                      <option value="">Selecione o setor</option>
                      {setores.map(s => <option key={s.id} value={s.id}>{s.prefixo} — {s.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Atendimento</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[['normal','🎫 Normal'], ['preferencial','⭐ Preferencial']].map(([v, l]) => (
                        <button key={v} onClick={() => setGerarTipo(v)}
                          style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: `2px solid ${gerarTipo === v ? 'var(--color-accent)' : 'var(--color-border)'}`, background: gerarTipo === v ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-2)', color: gerarTipo === v ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: gerarTipo === v ? 700 : 400, cursor: 'pointer', fontSize: 14 }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {gerarConfirm ? (
                <>
                  <button className="btn btn-secondary" onClick={() => setModalGerarSenha(false)}>Fechar</button>
                  <button className="btn btn-primary" onClick={() => { setGerarConfirm(null); setGerarSetorSel(''); setGerarTipo('normal'); }}>+ Nova Senha</button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => setModalGerarSenha(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={gerarSenhaParaCliente} disabled={gerandoSenha || !gerarSetorSel}>
                    {gerandoSenha ? '⏳ Gerando...' : '🖨 Gerar e Imprimir'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Transferir Senha ── */}
      {modalTransferir && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalTransferir(null)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <span className="modal-title">↔ Transferir Senha</span>
              <button className="btn-icon" onClick={() => setModalTransferir(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                  {modalTransferir.senha_setores?.prefixo}{String(modalTransferir.numero).padStart(2,'0')}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{modalTransferir.senha_setores?.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 4 }}>
                  Responsável atual: <strong>{modalTransferir.guiche || '(sem responsável)'}</strong>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Transferir para</label>
                <select className="form-select" value={transferirResp} onChange={e => setTransferirResp(e.target.value)}>
                  <option value="">Selecione o responsável</option>
                  {usuarios.filter(u => u.ativo).map(u => (
                    <option key={u.id} value={u.nome_simples || u.nome_completo}>
                      {u.nome_simples || u.nome_completo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalTransferir(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={transferirSenha} disabled={transferindo || !transferirResp}>
                {transferindo ? '⏳ Transferindo...' : '↔ Transferir'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
