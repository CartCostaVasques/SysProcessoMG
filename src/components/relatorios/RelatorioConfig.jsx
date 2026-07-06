import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Portal from '../layout/Portal.jsx';

const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const TIPOS = [
  { id: 'ambos',                          label: 'Todos (Andamento + Concluídos + Encerrados)' },
  { id: 'andamento',                      label: 'Em Andamento (inclui Devolvido e Em Reanálise)' },
  { id: 'andamento_reanalise',            label: 'Em Andamento e Em Reanálise (sem Devolvido)' },
  { id: 'andamento_reanalise_devolvido',  label: 'Em Andamento e Em Reanálise (com Devolvidos em quadro separado)' },
  { id: 'concluido',                      label: 'Apenas Concluídos' },
  { id: 'encerrado',                      label: 'Apenas Encerrados' },
  { id: 'panoramico',                     label: '📊 Panorâmico — Sequência de meses comparativa' },
];

const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const EMPTY = {
  nome: '', ativo: true, destinatarios: '', tipo: 'ambos',
  filtro_setores: [], filtro_servicos: [], filtro_responsaveis: [],
  periodo_dias: 1, periodo_tipo: 'mes_atual', periodo_ini: '', periodo_fim: '',
  periodo_mes: '', periodo_ano: '',
  agendamento: 'manual', hora_envio: '18:00', dia_semana: 1,
  incluir_detalhado: true, incluir_categoria: false,
  incluir_agrupado_resp: false, incluir_individual_resp: false,
  destinatarios_individual: [],
  // Campos exclusivos do Panorâmico
  pan_mes_ini: String(new Date().getMonth() + 1).padStart(2, '0'),
  pan_ano: String(new Date().getFullYear()),
  pan_meses: 6,
  pan_agrup: 'especie',
};

export default function RelatorioConfig() {
  const { supabaseClient: sb, usuarios, processos, addToast } = useApp();

  const [aba,        setAba]        = useState('relatorios'); // 'relatorios' | 'aniversarios'
  const [configs,    setConfigs]    = useState([]);
  const [envios,     setEnvios]     = useState([]);
  const [modal,      setModal]      = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [salvando,   setSalvando]   = useState(false);
  const [enviando,   setEnviando]   = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Estado da aba Aniversários
  const [anivConfig,    setAnivConfig]    = useState(null);
  const [anivForm,      setAnivForm]      = useState({
    ativo: true,
    dias_antecedencia: 0,
    hora_envio: '08:00',
    texto_aniversario: 'Desejamos a você um feliz aniversário! 🎉🎂\n\nQue este dia seja repleto de alegrias e realizações.\n\nCom carinho,\nEquipe do Cartório Costa Vasques',
    assunto_email: '🎂 Feliz Aniversário, {NOME}!',
  });
  const [anivSalvando,  setAnivSalvando]  = useState(false);
  const [anivEnviando,  setAnivEnviando]  = useState(false);
  const [anivDataManual, setAnivDataManual] = useState(''); // data para envio manual específico
  const [colaboradores, setColaboradores] = useState([]);

  // Categorias e anos únicos dos processos
  const categorias = useMemo(() => [...new Set(processos.map(p => p.categoria).filter(Boolean))].sort(), [processos]);
  const anosDisponiveis = useMemo(() => {
    const anos = new Set(processos.map(p => {
      const d = p.dt_conclusao || p.dt_abertura;
      return d ? d.substring(0, 4) : null;
    }).filter(Boolean));
    return [...anos].sort((a, b) => b - a);
  }, [processos]);

  const fetchConfigs = async () => {
    const { data } = await sb.from('relatorio_config').select('*').order('criado_em', { ascending: false });
    if (data) setConfigs(data);
  };
  const fetchEnvios = async () => {
    const { data } = await sb.from('relatorio_envios').select('*').order('enviado_em', { ascending: false }).limit(50);
    if (data) setEnvios(data);
  };
  const fetchAnivConfig = async () => {
    const { data } = await sb.from('aniversario_config').select('*').eq('id', 1).maybeSingle();
    if (data) {
      setAnivConfig(data);
      setAnivForm({
        ativo:              data.ativo              ?? true,
        dias_antecedencia:  data.dias_antecedencia  ?? 0,
        hora_envio:         data.hora_envio          || '08:00',
        texto_aniversario:  data.texto_aniversario  || anivForm.texto_aniversario,
        assunto_email:      data.assunto_email       || anivForm.assunto_email,
      });
    }
  };
  const fetchColaboradores = async () => {
    const { data } = await sb.from('colaboradores').select('id, nome_completo, email, dt_aniversario, sexo, ativo').eq('ativo', true).not('dt_aniversario', 'is', null).not('email', 'is', null).order('nome_completo');
    if (data) setColaboradores(data);
  };

  useEffect(() => {
    Promise.all([fetchConfigs(), fetchEnvios(), fetchAnivConfig(), fetchColaboradores()]).finally(() => setCarregando(false));
  }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const abrirModal = (config = null) => {
    if (config) {
      setForm({
        ...config,
        destinatarios: (config.destinatarios || []).join(', '),
        incluir_detalhado: config.incluir_detalhado !== false,
        incluir_categoria: config.incluir_categoria === true,
        periodo_mes: config.periodo_mes || '',
        periodo_ano: config.periodo_ano || '',
        pan_mes_ini: config.pan_mes_ini || String(new Date().getMonth() + 1).padStart(2, '0'),
        pan_ano:     config.pan_ano     || String(new Date().getFullYear()),
        pan_meses:   config.pan_meses   || 6,
        pan_agrup:   config.pan_agrup   || 'especie',
      });
    } else {
      setForm(EMPTY);
    }
    setModal(config || 'novo');
  };

  const handleSalvar = async () => {
    if (!form.nome.trim()) { addToast('Nome obrigatório', 'error'); return; }
    const dests = form.destinatarios.split(',').map(e => e.trim()).filter(Boolean);
    if (!dests.length) { addToast('Informe ao menos um e-mail destinatário', 'error'); return; }
    setSalvando(true);
    try {
      const payload = {
        nome:                form.nome.trim(),
        ativo:               form.ativo,
        destinatarios:       dests,
        tipo:                form.tipo,
        filtro_setores:      form.filtro_setores?.length ? form.filtro_setores : null,
        filtro_servicos:     form.filtro_servicos?.length ? form.filtro_servicos : null,
        filtro_responsaveis: form.filtro_responsaveis?.length ? form.filtro_responsaveis : null,
        periodo_dias:        form.periodo_tipo === 'dias' ? Number(form.periodo_dias) : 0,
        periodo_tipo:        form.periodo_tipo || 'mes_atual',
        periodo_ini:         form.periodo_tipo === 'datas' ? form.periodo_ini : null,
        periodo_fim:         form.periodo_tipo === 'datas' ? form.periodo_fim : null,
        periodo_mes:         form.periodo_tipo === 'mes_ano' ? form.periodo_mes : null,
        periodo_ano:         form.periodo_tipo === 'mes_ano' ? form.periodo_ano : null,
        agendamento:         form.agendamento,
        hora_envio:          form.hora_envio,
        dia_semana:          Number(form.dia_semana),
        incluir_detalhado:        form.incluir_detalhado !== false,
        incluir_categoria:        form.incluir_categoria === true,
        incluir_agrupado_resp:    form.incluir_agrupado_resp === true,
        incluir_individual_resp:  form.incluir_individual_resp === true,
        destinatarios_individual: form.incluir_individual_resp ? (form.destinatarios_individual || []) : [],
        pan_mes_ini: form.tipo === 'panoramico' ? form.pan_mes_ini : null,
        pan_ano:     form.tipo === 'panoramico' ? form.pan_ano     : null,
        pan_meses:   form.tipo === 'panoramico' ? Number(form.pan_meses || 6) : null,
        pan_agrup:   form.tipo === 'panoramico' ? (form.pan_agrup || 'especie') : null,
      };
      if (modal === 'novo') {
        const { error } = await sb.from('relatorio_config').insert(payload);
        if (error) throw error;
        addToast('Configuração criada!', 'success');
      } else {
        const { error } = await sb.from('relatorio_config').update(payload).eq('id', modal.id);
        if (error) throw error;
        addToast('Configuração salva!', 'success');
      }
      setModal(null);
      fetchConfigs();
    } catch(e) { addToast(e.message, 'error'); }
    finally { setSalvando(false); }
  };

  const handleDeletar = async (id) => {
    if (!window.confirm('Remover esta configuração?')) return;
    await sb.from('relatorio_config').delete().eq('id', id);
    fetchConfigs();
    addToast('Removida.', 'info');
  };

  const handleEnviarAgora = async (config) => {
    setEnviando(config.id);
    try {
      const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/enviar-relatorio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnon}`,
          'apikey': supabaseAnon,
        },
        body: JSON.stringify({ config_id: config.id }),
      });
      const data = await resp.json();
      if (data?.ok) {
        addToast(`Relatório enviado! ${data.resultados?.[0]?.total ?? 0} processo(s)`, 'success');
        fetchEnvios();
        fetchConfigs();
      } else {
        addToast('Erro ao enviar: ' + (data?.erro || JSON.stringify(data)), 'error');
      }
    } catch(e) { addToast(e.message, 'error'); }
    finally { setEnviando(null); }
  };

  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const fmtDt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  const handleSalvarAniv = async () => {
    setAnivSalvando(true);
    try {
      const payload = {
        id: 1,
        ativo:             anivForm.ativo,
        dias_antecedencia: Number(anivForm.dias_antecedencia),
        hora_envio:        anivForm.hora_envio || '08:00',
        texto_aniversario: anivForm.texto_aniversario,
        assunto_email:     anivForm.assunto_email,
        atualizado_em:     new Date().toISOString(),
      };
      const { error } = await sb.from('aniversario_config').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      await fetchAnivConfig();
      addToast('Configuração de aniversário salva!', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setAnivSalvando(false);
    }
  };

  const handleEnviarAnivAgora = async (dataAlvo = null) => {
    setAnivEnviando(true);
    try {
      const supabaseUrl = sb.supabaseUrl;
      const { data: { session } } = await sb.auth.getSession();
      const body = { acao: 'alerta_aniversario' };
      if (dataAlvo) body.data_alvo = dataAlvo; // YYYY-MM-DD
      const resp = await fetch(`${supabaseUrl}/functions/v1/enviar-relatorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(body),
      });
      const result = await resp.json();
      if (result.ok) addToast(result.msg || 'Verificação de aniversários concluída!', 'success');
      else addToast(result.erro || 'Erro ao enviar', 'error');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setAnivEnviando(false);
    }
  };

  if (carregando) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-faint)' }}>Carregando...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Relatórios Automáticos</div>
          <div className="page-sub">Configure envios periódicos por e-mail</div>
        </div>
        {aba === 'relatorios' && (
          <button className="btn btn-primary" onClick={() => abrirModal()}>+ Nova Configuração</button>
        )}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--color-border)', marginBottom: 20 }}>
        {[
          { id: 'relatorios',   label: '📊 Relatórios de Processos' },
          { id: 'aniversarios', label: '🎂 Aniversários dos Colaboradores' },
        ].map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: aba === t.id ? 700 : 400, border: 'none', background: 'transparent', borderBottom: `3px solid ${aba === t.id ? 'var(--color-accent)' : 'transparent'}`, color: aba === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)', cursor: 'pointer', marginBottom: -2, borderRadius: '4px 4px 0 0', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA: Relatórios de Processos ── */}
      {aba === 'relatorios' && (<>
      {configs.length === 0
        ? <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-faint)' }}>
            Nenhuma configuração ainda. Crie uma para começar.
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {configs.map(c => (
              <div key={c.id} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.nome}</span>
                      <span className={`badge ${c.ativo ? 'badge-success' : 'badge-neutral'}`}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                      <span className="badge badge-info">{c.tipo === 'ambos' ? 'Todos' : c.tipo === 'andamento' ? 'Andamento' : c.tipo === 'andamento_reanalise' ? 'And+Reanálise' : c.tipo === 'andamento_reanalise_devolvido' ? 'And+Rean+Dev' : c.tipo === 'encerrado' ? 'Encerrado' : 'Concluído'}</span>
                      {c.incluir_detalhado && c.incluir_categoria && <span className="badge badge-info">Detalhado + Categoria</span>}
                      {c.incluir_detalhado && !c.incluir_categoria && <span className="badge badge-info">Detalhado</span>}
                      {!c.incluir_detalhado && c.incluir_categoria && <span className="badge badge-info">Só Categoria</span>}
                      {c.agendamento !== 'manual' && (
                        <span className="badge badge-warning">{c.agendamento === 'diario' ? `Diário ${c.hora_envio}` : `Semanal ${DIAS_SEMANA[c.dia_semana]} ${c.hora_envio}`}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                      Período: {c.periodo_dias} dia(s) &nbsp;·&nbsp;
                      Para: {(c.destinatarios || []).join(', ')} &nbsp;·&nbsp;
                      Último envio: {fmtDt(c.ultimo_envio)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleEnviarAgora(c)} disabled={enviando === c.id}>
                      {enviando === c.id ? '⏳ Enviando...' : '📧 Enviar Agora'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => abrirModal(c)}>✎ Editar</button>
                    <button className="btn-icon btn-sm" onClick={() => handleDeletar(c.id)} style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      }

      {/* Histórico de envios */}
      {envios.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header"><div className="card-title">Histórico de Envios</div></div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr>
                <th>Configuração</th><th>Enviado em</th><th>Período</th><th>Destinatários</th><th>Processos</th><th>Status</th>
              </tr></thead>
              <tbody>
                {envios.map(e => {
                  const conf = configs.find(c => c.id === e.config_id);
                  const fmtD = (s) => s ? s.split('-').reverse().join('/') : '';
                  const periodoTexto = conf
                    ? (conf.periodo_tipo === 'datas' && conf.periodo_ini
                        ? `${fmtD(conf.periodo_ini)} a ${fmtD(conf.periodo_fim)}`
                        : `Últimos ${conf.periodo_dias} dia(s)`)
                    : '—';
                  return (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12 }}>{conf?.nome || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDt(e.enviado_em)}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{periodoTexto}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{(e.destinatarios || []).join(', ')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, textAlign: 'right' }}>{e.total_processos}</td>
                      <td>
                        {e.status === 'ok'
                          ? <span className="badge badge-success">✓ Enviado</span>
                          : <span className="badge badge-danger" title={e.erro_msg}>✕ Erro</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de criação/edição */}
      {modal && (
        <Portal>
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <span className="modal-title">{modal === 'novo' ? 'Nova Configuração' : 'Editar Configuração'}</span>
              <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Nome e ativo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome da Configuração *</label>
                  <input className="form-input" value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Ex: Relatório Diário Escritura" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.ativo ? 'sim' : 'nao'} onChange={e => setF('ativo', e.target.value === 'sim')}>
                    <option value="sim">Ativo</option>
                    <option value="nao">Inativo</option>
                  </select>
                </div>
              </div>

              {/* Destinatários */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Destinatários (e-mails separados por vírgula) *</label>
                <input className="form-input" value={form.destinatarios} onChange={e => setF('destinatarios', e.target.value)} placeholder="email1@gmail.com, email2@gmail.com" />
              </div>

              {/* Tipo */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo de Relatório</label>
                <select className="form-select" value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
                  {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              {/* ── Configurações exclusivas do Panorâmico ── */}
              {form.tipo === 'panoramico' && (
                <div style={{ background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))', border: '1px solid color-mix(in srgb, var(--color-accent) 25%, var(--color-border))', borderRadius: 'var(--radius-md)', padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>Configurações do Panorâmico</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Mês inicial</label>
                      <select className="form-select" value={form.pan_mes_ini || '01'} onChange={e => setF('pan_mes_ini', e.target.value)}>
                        {MESES_FULL.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Ano</label>
                      <select className="form-select" value={form.pan_ano || String(new Date().getFullYear())} onChange={e => setF('pan_ano', e.target.value)}>
                        {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nº de meses</label>
                      <select className="form-select" value={form.pan_meses || 6} onChange={e => setF('pan_meses', Number(e.target.value))}>
                        {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n} meses</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Agrupar por</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[['especie','Serviço (Espécie)'],['categoria','Categoria'],['setor','Setor']].map(([id, label]) => (
                        <button key={id} type="button"
                          className={`btn btn-sm ${(form.pan_agrup||'especie') === id ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setF('pan_agrup', id)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '6px 10px', borderRadius: 'var(--radius-md)' }}>
                    {(() => {
                      const m = parseInt(form.pan_mes_ini || '1');
                      const a = parseInt(form.pan_ano || String(new Date().getFullYear()));
                      const n = form.pan_meses || 6;
                      const cols = [];
                      let cm = m, ca = a;
                      for (let i = 0; i < n; i++) {
                        cols.push(`${MESES_FULL[cm-1].substring(0,3)}/${ca}`);
                        cm++; if (cm > 12) { cm = 1; ca++; }
                      }
                      return `Sequência: ${cols.join(' → ')}`;
                    })()}
                  </div>
                </div>
              )}

              {/* Seções do e-mail — ocultas no modo Panorâmico */}
              {form.tipo !== 'panoramico' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Seções do E-mail</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  {[
                    { key: 'incluir_detalhado', label: 'Processos detalhados (lista completa)', sub: 'Uma linha por processo com número, data, espécie, responsável e valor' },
                    { key: 'incluir_categoria', label: 'Resumo por Categoria', sub: 'Tabela agrupada: categoria | quantidade | valor total' },
                    { key: 'incluir_agrupado_resp', label: 'Relatório por Responsável (e-mail único)', sub: 'Um único e-mail para os destinatários com todos os responsáveis agrupados por categoria' },
                    { key: 'incluir_individual_resp', label: 'E-mail individual por Responsável', sub: 'Cada responsável recebe no seu próprio e-mail apenas os processos dele, agrupados por categoria' },
                  ].map(op => (
                    <div key={op.key} onClick={() => setF(op.key, !form[op.key])}
                      style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: `2px solid ${form[op.key] ? 'var(--color-accent)' : 'var(--color-border)'}`, background: form[op.key] ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))' : 'var(--color-surface)', cursor: 'pointer' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${form[op.key] ? 'var(--color-accent)' : 'var(--color-border)'}`, background: form[op.key] ? 'var(--color-accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                        {form[op.key] && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: form[op.key] ? 700 : 400, color: form[op.key] ? 'var(--color-accent)' : 'var(--color-text)' }}>{op.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{op.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {!form.incluir_detalhado && !form.incluir_categoria && !form.incluir_agrupado_resp && !form.incluir_individual_resp && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-danger)' }}>⚠ Selecione ao menos uma seção.</div>
                )}
              </div>
              )}

              {/* Seleção de responsáveis para e-mail individual */}
              {form.incluir_individual_resp && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      Responsáveis que recebem e-mail individual
                      <span style={{ fontWeight: 400, color: 'var(--color-text-faint)', marginLeft: 6 }}>(vazio = todos ativos)</span>
                    </label>
                    <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                      onClick={() => {
                        const ativos = (usuarios || []).filter(u => u.ativo && u.email).map(u => u.id);
                        setF('destinatarios_individual', ativos);
                      }}>
                      ✓ Marcar todos os ativos
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(usuarios || []).filter(u => u.ativo && u.email).map(u => {
                      const sel = (form.destinatarios_individual || []).includes(u.id);
                      return (
                        <button key={u.id} type="button"
                          className={`btn btn-sm ${sel ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => {
                            const atual = form.destinatarios_individual || [];
                            setF('destinatarios_individual', sel ? atual.filter(id => id !== u.id) : [...atual, u.id]);
                          }}>
                          {u.nome_simples}
                        </button>
                      );
                    })}
                  </div>
                  {(usuarios || []).filter(u => u.ativo && !u.email).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-faint)' }}>
                      ⚠ Responsáveis sem e-mail cadastrado não aparecem na lista.
                    </div>
                  )}
                </div>
              )}
              {form.tipo !== 'panoramico' && (<>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Período de busca</label>
                <select className="form-select" value={form.periodo_tipo||'dias'} onChange={e => {
                  setF('periodo_tipo', e.target.value);
                  setF('periodo_ini', ''); setF('periodo_fim', '');
                  setF('periodo_mes', ''); setF('periodo_ano', '');
                  setF('periodo_dias', 1);
                }}>
                  <option value="semana_atual">Semana atual</option>
                  <option value="mes_atual">Mês atual</option>
                  <option value="mes_ano">Mês e ano específico</option>
                  <option value="dias">Relativo (dias atrás)</option>
                  <option value="datas">Por datas específicas</option>
                </select>

                {form.periodo_tipo === 'dias' && (
                  <select className="form-select" style={{ marginTop: 8 }} value={form.periodo_dias} onChange={e => setF('periodo_dias', e.target.value)}>
                    <option value={1}>Último dia (ontem)</option>
                    <option value={7}>Últimos 7 dias</option>
                    <option value={15}>Últimos 15 dias</option>
                    <option value={30}>Últimos 30 dias</option>
                  </select>
                )}

                {form.periodo_tipo === 'mes_ano' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Mês</label>
                      <select className="form-select" value={form.periodo_mes||''} onChange={e => setF('periodo_mes', e.target.value)}>
                        <option value="">Todos os meses</option>
                        {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,i) => (
                          <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Ano</label>
                      <select className="form-select" value={form.periodo_ano||''} onChange={e => setF('periodo_ano', e.target.value)}>
                        <option value="">Todos os anos</option>
                        {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {form.periodo_tipo === 'datas' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Data início</label>
                      <input className="form-input" type="date" value={form.periodo_ini||''} onChange={e => setF('periodo_ini', e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Data fim</label>
                      <input className="form-input" type="date" value={form.periodo_fim||''} onChange={e => setF('periodo_fim', e.target.value)} />
                    </div>
                  </div>
                )}

                {(form.periodo_tipo === 'semana_atual' || form.periodo_tipo === 'mes_atual') && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', padding: '6px 10px', borderRadius: 'var(--radius-md)' }}>
                    {form.periodo_tipo === 'semana_atual' ? 'Enviará os processos da semana em curso (domingo a sábado).' : 'Enviará os processos do mês em curso (do dia 1 até hoje).'}
                  </div>
                )}
              </div>

              {/* Filtro de categorias */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Filtrar por Categoria/Serviço <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(vazio = todos)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {categorias.map(cat => (
                    <button key={cat} type="button"
                      className={`btn btn-sm ${(form.filtro_servicos||[]).includes(cat) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setF('filtro_servicos', toggleArr(form.filtro_servicos || [], cat))}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              </>)}

              {/* Filtro de responsáveis */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Filtrar por Responsável <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(vazio = todos)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {(() => {
                    const anoAtual = String(new Date().getFullYear());
                    // IDs de responsáveis com processos no ano atual
                    const idsComProcesso = new Set(
                      processos
                        .filter(p => (p.dt_abertura || '').startsWith(anoAtual))
                        .map(p => p.responsavel_id)
                        .filter(Boolean)
                    );
                    // Ativos + inativos com processos no ano
                    const lista = (usuarios || []).filter(u =>
                      u.ativo || idsComProcesso.has(u.id)
                    ).sort((a, b) => (a.nome_simples || '').localeCompare(b.nome_simples || ''));
                    return lista.map(u => (
                      <button key={u.id} type="button"
                        className={`btn btn-sm ${(form.filtro_responsaveis||[]).includes(u.id) ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setF('filtro_responsaveis', toggleArr(form.filtro_responsaveis || [], u.id))}
                        style={{ opacity: u.ativo ? 1 : 0.7 }}
                        title={u.ativo ? '' : 'Usuário inativo'}>
                        {u.nome_simples}{!u.ativo ? ' ⚠' : ''}
                      </button>
                    ));
                  })()}
                </div>
              </div>

              {/* Agendamento */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Agendamento Automático</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Frequência</label>
                    <select className="form-select" value={form.agendamento} onChange={e => setF('agendamento', e.target.value)}>
                      <option value="manual">Apenas manual</option>
                      <option value="diario">Diário</option>
                      <option value="semanal">Semanal</option>
                    </select>
                  </div>
                  {form.agendamento !== 'manual' && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Hora do envio</label>
                      <input className="form-input" type="time" value={form.hora_envio} onChange={e => setF('hora_envio', e.target.value)} />
                    </div>
                  )}
                  {form.agendamento === 'semanal' && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Dia da semana</label>
                      <select className="form-select" value={form.dia_semana} onChange={e => setF('dia_semana', Number(e.target.value))}>
                        {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {form.agendamento !== 'manual' && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', background: 'var(--color-surface-2)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                    ⚠ O envio automático requer que o pg_cron esteja ativo no Supabase e o cron configurado.
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
      </>)}

      {/* ── ABA: Aniversários dos Colaboradores ── */}
      {aba === 'aniversarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Card de configuração */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Configuração do E-mail de Aniversário</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{anivForm.ativo ? 'Ativo' : 'Inativo'}</span>
                <div onClick={() => setAnivForm(p => ({ ...p, ativo: !p.ativo }))}
                  style={{ width: 40, height: 22, borderRadius: 11, background: anivForm.ativo ? 'var(--color-success)' : 'var(--color-border)', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: anivForm.ativo ? 20 : 2, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Assunto do e-mail</label>
                <input className="form-input" value={anivForm.assunto_email} onChange={e => setAnivForm(p => ({ ...p, assunto_email: e.target.value }))}
                  placeholder="Ex: 🎂 Feliz Aniversário, {NOME}!" />
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>Variável: <code style={{ fontSize: 10 }}>{'{NOME}'}</code></div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Enviar com antecedência</label>
                <select className="form-select" value={anivForm.dias_antecedencia} onChange={e => setAnivForm(p => ({ ...p, dias_antecedencia: Number(e.target.value) }))}>
                  <option value={0}>No dia do aniversário</option>
                  <option value={1}>1 dia antes</option>
                  <option value={2}>2 dias antes</option>
                  <option value={3}>3 dias antes</option>
                  <option value={7}>1 semana antes</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Hora do envio automático</label>
                <input className="form-input" type="time" value={anivForm.hora_envio || '08:00'} onChange={e => setAnivForm(p => ({ ...p, hora_envio: e.target.value }))} />
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>Horário de Brasília</div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Texto do e-mail</label>
              <textarea className="form-input" rows={6} value={anivForm.texto_aniversario}
                onChange={e => setAnivForm(p => ({ ...p, texto_aniversario: e.target.value }))}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7, fontSize: 13, minHeight: 130 }} />
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>
                Variáveis: <code style={{ fontSize: 10 }}>{'{NOME}'}</code> · <code style={{ fontSize: 10 }}>{'{NOME_COMPLETO}'}</code> · <code style={{ fontSize: 10 }}>{'{DATA}'}</code>
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleSalvarAniv} disabled={anivSalvando}>
              {anivSalvando ? '⏳ Salvando...' : '💾 Salvar Configuração'}
            </button>
          </div>

          {/* Card de pg_cron */}
          <div className="card" style={{ padding: 16, borderLeft: '3px solid var(--color-accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>⚙️</span>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Envio Automático via pg_cron</div>
              <span className="badge badge-warning" style={{ fontSize: 10 }}>Requer configuração no Supabase</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
              O envio automático funciona todos os dias — <strong>incluindo sábados, domingos e feriados</strong>. Copie o SQL abaixo e execute no <strong>Supabase → SQL Editor</strong>. Sempre que mudar a hora acima e salvar, rode novamente.
            </div>
            <pre style={{ fontSize: 11, background: 'var(--color-surface-2)', padding: '10px 14px', borderRadius: 'var(--radius-md)', overflowX: 'auto', color: 'var(--color-text)', lineHeight: 1.8, userSelect: 'all', cursor: 'text' }}>
{`SELECT cron.unschedule('alerta-aniversario-diario');
SELECT cron.schedule(
  'alerta-aniversario-diario',
  '0 ${String(parseInt((anivForm.hora_envio || '08:00').split(':')[0]) + 3).padStart(2,'0')} * * *',
  $$
    SELECT net.http_post(
      url := '${typeof window !== 'undefined' ? window.location.origin : 'https://rriienkhlofjlvsxdkur.supabase.co'}/functions/v1/enviar-relatorio',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer SERVICE_ROLE_KEY"}'::jsonb,
      body := '{"acao":"alerta_aniversario"}'::jsonb
    );
  $$
);`}
            </pre>
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 8 }}>
              Substitua <code style={{ fontSize: 10 }}>SERVICE_ROLE_KEY</code> pela sua chave service_role do Supabase (Settings → API).
              O horário está em UTC — sua hora configurada ({anivForm.hora_envio || '08:00'} Brasília = {String(parseInt((anivForm.hora_envio || '08:00').split(':')[0]) + 3).padStart(2,'0')}:00 UTC).
            </div>
          </div>

          {/* Envio manual por data */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📧 Envio Manual por Data</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Use para enviar felicitações de uma data específica — útil quando o envio automático falhou ou para recuperar um aniversário perdido.
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data do aniversário</label>
                <input className="form-input" type="date" value={anivDataManual}
                  onChange={e => setAnivDataManual(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={{ width: 180 }} />
              </div>
              <button className="btn btn-secondary" onClick={() => handleEnviarAnivAgora(anivDataManual || null)} disabled={anivEnviando}>
                {anivEnviando ? '⏳ Enviando...' : `📧 ${anivDataManual ? 'Enviar para ' + anivDataManual.split('-').reverse().join('/') : 'Enviar para hoje'}`}
              </button>
              {anivDataManual && (
                <button className="btn btn-ghost btn-sm" onClick={() => setAnivDataManual('')} style={{ color: 'var(--color-text-muted)' }}>✕ Limpar data</button>
              )}
            </div>
            {/* Mostra quem faz aniversário na data selecionada */}
            {anivDataManual && (() => {
              const dt = new Date(anivDataManual + 'T12:00:00');
              const mes = dt.getMonth() + 1;
              const dia = dt.getDate();
              const aniversariantes = colaboradores.filter(c => {
                if (!c.dt_aniversario) return false;
                const a = new Date(c.dt_aniversario + 'T12:00:00');
                return a.getMonth() + 1 === mes && a.getDate() === dia;
              });
              if (!aniversariantes.length) return (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-faint)', padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  Nenhum colaborador ativo com aniversário em {dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.
                </div>
              );
              return (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface))', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
                  <strong>🎂 Aniversariantes em {dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}:</strong>
                  {' '}{aniversariantes.map(c => c.nome_completo.split(' ')[0]).join(', ')}
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: 6 }}>({aniversariantes.length} e-mail{aniversariantes.length > 1 ? 's' : ''} serão enviados)</span>
                </div>
              );
            })()}
          </div>

          {/* Prévia do e-mail */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Prévia do E-mail</div>
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                <strong>Assunto:</strong> {(anivForm.assunto_email || '').replace(/\{NOME\}/g, 'Maria')}
              </div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--color-text)', marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                {(anivForm.texto_aniversario || '')
                  .replace(/\{NOME\}/g, 'Maria')
                  .replace(/\{NOME_COMPLETO\}/g, 'Maria da Silva')
                  .replace(/\{DATA\}/g, new Date().toLocaleDateString('pt-BR'))}
              </div>
            </div>
          </div>

          {/* Lista de colaboradores */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header">
              <div className="card-title">Colaboradores Ativos com Aniversário Cadastrado</div>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{colaboradores.length} colaborador(es)</span>
            </div>
            {colaboradores.length === 0
              ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>
                  Nenhum colaborador ativo com data de aniversário e e-mail cadastrados.
                </div>
              : <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr>
                      <th>Nome</th>
                      <th>Aniversário</th>
                      <th>Próximo</th>
                      <th>E-mail</th>
                      <th></th>
                    </tr></thead>
                    <tbody>
                      {colaboradores
                        .map(c => {
                          const hoje = new Date();
                          const aniv = c.dt_aniversario ? new Date(c.dt_aniversario + 'T12:00:00') : null;
                          const proximo = aniv ? new Date(hoje.getFullYear(), aniv.getMonth(), aniv.getDate()) : null;
                          if (proximo && proximo < hoje) proximo.setFullYear(hoje.getFullYear() + 1);
                          const diffDias = proximo ? Math.round((proximo - hoje) / 86400000) : 999;
                          return { ...c, aniv, proximo, diffDias };
                        })
                        .sort((a, b) => a.diffDias - b.diffDias)
                        .map(c => {
                          let proximoLabel = '—', proximoCor = 'var(--color-text-muted)';
                          if (c.aniv) {
                            if (c.diffDias === 0) { proximoLabel = '🎂 Hoje!'; proximoCor = 'var(--color-success)'; }
                            else if (c.diffDias <= 7) { proximoLabel = `Em ${c.diffDias} dia(s)`; proximoCor = 'var(--color-warning)'; }
                            else { proximoLabel = c.proximo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
                          }
                          return (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 600 }}>{c.nome_completo}</td>
                              <td style={{ fontSize: 12 }}>{c.aniv ? c.aniv.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) : '—'}</td>
                              <td style={{ fontSize: 12, fontWeight: 600, color: proximoCor }}>{proximoLabel}</td>
                              <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.email}</td>
                              <td>
                                <button className="btn btn-ghost btn-sm" title="Enviar felicitações agora para este colaborador"
                                  disabled={anivEnviando}
                                  onClick={() => handleEnviarAnivAgora(c.dt_aniversario.substring(5))}>
                                  📧
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      )}

    </div>
  );
}
