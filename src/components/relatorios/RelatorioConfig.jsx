import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Portal from '../layout/Portal.jsx';

const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const TIPOS = [
  { id: 'ambos',    label: 'Ambos (Em Andamento + Concluídos)' },
  { id: 'andamento', label: 'Apenas Em Andamento' },
  { id: 'concluido', label: 'Apenas Concluídos' },
];

const EMPTY = {
  nome: '', ativo: true, destinatarios: '', tipo: 'ambos',
  filtro_setores: [], filtro_servicos: [], filtro_responsaveis: [],
  periodo_dias: 1, agendamento: 'manual', hora_envio: '18:00', dia_semana: 1,
};

export default function RelatorioConfig() {
  const { supabaseClient: sb, usuarios, processos, addToast } = useApp();

  const [configs,    setConfigs]    = useState([]);
  const [envios,     setEnvios]     = useState([]);
  const [modal,      setModal]      = useState(null); // null | 'novo' | objeto
  const [form,       setForm]       = useState(EMPTY);
  const [salvando,   setSalvando]   = useState(false);
  const [enviando,   setEnviando]   = useState(null); // id da config enviando
  const [carregando, setCarregando] = useState(true);

  // Categorias únicas dos processos
  const categorias = useMemo(() => [...new Set(processos.map(p => p.categoria).filter(Boolean))].sort(), [processos]);

  const fetchConfigs = async () => {
    const { data } = await sb.from('relatorio_config').select('*').order('criado_em', { ascending: false });
    if (data) setConfigs(data);
  };
  const fetchEnvios = async () => {
    const { data } = await sb.from('relatorio_envios').select('*').order('enviado_em', { ascending: false }).limit(50);
    if (data) setEnvios(data);
  };

  useEffect(() => {
    Promise.all([fetchConfigs(), fetchEnvios()]).finally(() => setCarregando(false));
  }, []);

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const abrirModal = (config = null) => {
    if (config) {
      setForm({
        ...config,
        destinatarios: (config.destinatarios || []).join(', '),
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
        periodo_dias:        Number(form.periodo_dias),
        agendamento:         form.agendamento,
        hora_envio:          form.hora_envio,
        dia_semana:          Number(form.dia_semana),
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
      const { data, error } = await sb.functions.invoke('enviar-relatorio', {
        body: { config_id: config.id },
      });
      if (error) throw error;
      if (data?.ok) {
        addToast(`Relatório enviado! ${data.resultados?.[0]?.total ?? 0} processo(s)`, 'success');
        fetchEnvios();
        fetchConfigs();
      } else {
        addToast('Erro ao enviar: ' + (data?.erro || 'desconhecido'), 'error');
      }
    } catch(e) { addToast(e.message, 'error'); }
    finally { setEnviando(null); }
  };

  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const fmtDt = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  if (carregando) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-faint)' }}>Carregando...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Relatórios Automáticos</div>
          <div className="page-sub">Configure envios periódicos por e-mail</div>
        </div>
        <button className="btn btn-primary" onClick={() => abrirModal()}>+ Nova Configuração</button>
      </div>

      {/* Lista de configurações */}
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
                      <span className="badge badge-info">{c.tipo === 'ambos' ? 'Todos' : c.tipo === 'andamento' ? 'Andamento' : 'Concluído'}</span>
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
                <th>Configuração</th><th>Enviado em</th><th>Destinatários</th><th>Processos</th><th>Status</th>
              </tr></thead>
              <tbody>
                {envios.map(e => {
                  const conf = configs.find(c => c.id === e.config_id);
                  return (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12 }}>{conf?.nome || '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDt(e.enviado_em)}</td>
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

              {/* Período */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Período de busca (dias atrás)</label>
                <select className="form-select" value={form.periodo_dias} onChange={e => setF('periodo_dias', e.target.value)}>
                  <option value={1}>Último dia (ontem)</option>
                  <option value={7}>Última semana (7 dias)</option>
                  <option value={15}>Últimos 15 dias</option>
                  <option value={30}>Último mês (30 dias)</option>
                </select>
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

              {/* Filtro de responsáveis */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Filtrar por Responsável <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(vazio = todos)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {usuarios.filter(u => u.ativo).map(u => (
                    <button key={u.id} type="button"
                      className={`btn btn-sm ${(form.filtro_responsaveis||[]).includes(u.id) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setF('filtro_responsaveis', toggleArr(form.filtro_responsaveis || [], u.id))}>
                      {u.nome_simples}
                    </button>
                  ))}
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
    </div>
  );
}
