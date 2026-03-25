import { useState, useEffect } from 'react';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const TIPOS_TAREFA = ['Impressão', 'Revisão', 'Cadastro', 'Ofício', 'Treinamento', 'Reunião', 'Protocolo', 'Outros'];
const EMPTY = { titulo: '', dt_inicio: new Date().toISOString().split('T')[0], dt_fim: '', responsavel_id: null, responsavel: '', setor: '', tipo: '', obs: '', concluida: false };

function ModalTarefa({ tarefa, onClose, onSave, usuarios, setores }) {
  const [form, setForm] = useState(tarefa ? { ...tarefa } : { ...EMPTY });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleResp = (nome) => {
    const u = usuarios.find(u => u.nome_simples === nome);
    set('responsavel', nome);
    if (u) { set('responsavel_id', u.id); if (!form.setor) set('setor', u.setor || ''); }
  };

  const handleSubmit = () => {
    if (!form.titulo) { alert('Título obrigatório.'); return; }
    onSave(form);
  };

  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{tarefa ? 'Editar Tarefa' : 'Nova Tarefa'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid form-grid-2">
            <div className="form-group form-full">
              <label className="form-label">Título / Descrição *</label>
              <input className="form-input" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Descreva a tarefa" />
            </div>
            <div className="form-group">
              <label className="form-label">Data Início</label>
              <input className="form-input" type="date" value={form.dt_inicio} onChange={e => set('dt_inicio', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Data Fim / Prazo</label>
              <input className="form-input" type="date" value={form.dt_fim} onChange={e => set('dt_fim', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Responsável</label>
              <select className="form-select" value={form.responsavel} onChange={e => handleResp(e.target.value)}>
                <option value="">Selecione</option>
                {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.nome_simples}>{u.nome_simples}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Setor</label>
              <select className="form-select" value={form.setor} onChange={e => set('setor', e.target.value)}>
                <option value="">Selecione</option>
                {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Tarefa</label>
              <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="">Selecione</option>
                {TIPOS_TAREFA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group form-full">
              <label className="form-label">Observações</label>
              <textarea className="form-textarea" value={form.obs} onChange={e => set('obs', e.target.value)} placeholder="Detalhes adicionais..." />
            </div>
            <div className="form-group">
              <label className="form-label">Concluída?</label>
              <label className="checkbox-wrapper" style={{ marginTop: 6 }}>
                <input type="checkbox" checked={form.concluida} onChange={e => set('concluida', e.target.checked)} />
                <div className="checkbox-box">{form.concluida && <span style={{ fontSize: 9, color: 'var(--color-bg)', fontWeight: 800 }}>✓</span>}</div>
                <span className="checkbox-label">{form.concluida ? 'Sim — Tarefa concluída' : 'Não — Em andamento'}</span>
              </label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{tarefa ? 'Salvar' : 'Criar Tarefa'}</button>
        </div>
      </div>
    </div></Portal>
  );
}

export default function Tarefas() {
  const { tarefas, addTarefa, editTarefa, deleteTarefa, usuarios, setores, addToast, supabaseClient: sb } = useApp();
  const [modal, setModal] = useState(null);
  const [filtroResp, setFiltroResp] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('pendentes');
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('tarefas');

  // Config alerta
  const [alertaConfig, setAlertaConfig] = useState(null);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [testando, setTestando] = useState(false);

  useEffect(() => {
    sb.from('tarefas_alerta_config').select('*').limit(1).single()
      .then(({ data }) => setAlertaConfig(data || { hora_envio: '07:00', dias_antecedencia: 1, ativo: true }));
  }, [sb]);

  const salvarConfig = async () => {
    if (!alertaConfig) return;
    setSalvandoConfig(true);
    if (alertaConfig.id) {
      await sb.from('tarefas_alerta_config').update({
        hora_envio: alertaConfig.hora_envio,
        dias_antecedencia: alertaConfig.dias_antecedencia,
        ativo: alertaConfig.ativo,
      }).eq('id', alertaConfig.id);
    } else {
      await sb.from('tarefas_alerta_config').insert({
        hora_envio: alertaConfig.hora_envio,
        dias_antecedencia: alertaConfig.dias_antecedencia,
        ativo: alertaConfig.ativo,
      });
    }
    addToast('Configuração salva', 'success');
    setSalvandoConfig(false);
  };

  const testarAlerta = async () => {
    setTestando(true);
    const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/enviar-relatorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnon}` },
        body: JSON.stringify({ acao: 'alerta_tarefas' }),
      });
      const data = await resp.json();
      if (data.ok) addToast('Alerta de tarefas enviado!', 'success');
      else addToast('Erro: ' + (data.erro || 'desconhecido'), 'error');
    } catch { addToast('Erro ao conectar', 'error'); }
    setTestando(false);
  };

  const hoje = new Date();
  const lista = tarefas.filter(t => {
    const ok = (t.titulo + t.responsavel + t.setor + t.tipo).toLowerCase().includes(busca.toLowerCase());
    const statusOk = filtroStatus === 'todas' ? true : filtroStatus === 'pendentes' ? !t.concluida : t.concluida;
    return ok && statusOk && (!filtroResp || t.responsavel === filtroResp) && (!filtroSetor || t.setor === filtroSetor);
  });

  const handleSave = (form) => {
    if (modal === 'novo') { addTarefa(form); addToast('Tarefa criada!', 'success'); }
    else { editTarefa(modal.id, form); addToast('Tarefa atualizada!', 'success'); }
    setModal(null);
  };

  const toggleConcluida = (t) => {
    editTarefa(t.id, { concluida: !t.concluida });
    addToast(t.concluida ? 'Tarefa reaberta.' : 'Tarefa concluída!', t.concluida ? 'info' : 'success');
  };

  const responsaveis = [...new Set(tarefas.map(t => t.responsavel))].filter(Boolean);
  const setoresUsados = [...new Set(tarefas.map(t => t.setor))].filter(Boolean);

  const getStatusInfo = (t) => {
    if (t.concluida) return { label: 'Concluída', cls: 'badge-success' };
    if (t.dt_fim && new Date(t.dt_fim) < hoje) return { label: 'Vencida', cls: 'badge-danger' };
    if (t.dt_fim) {
      const diff = Math.ceil((new Date(t.dt_fim) - hoje) / 86400000);
      if (diff <= 2) return { label: `Vence em ${diff}d`, cls: 'badge-warning' };
    }
    return { label: 'Pendente', cls: 'badge-info' };
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Tarefas</div>
          <div className="page-sub">{tarefas.filter(t => !t.concluida).length} pendentes · {tarefas.filter(t => t.concluida).length} concluídas</div>
        </div>
        {aba === 'tarefas' && <button className="btn btn-primary" onClick={() => setModal('novo')}>+ Nova Tarefa</button>}
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {[['tarefas','✓ Tarefas'],['alerta','🔔 Alerta por E-mail']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${aba === id ? 'active' : ''}`} onClick={() => setAba(id)}>{label}</button>
        ))}
      </div>

      {aba === 'alerta' && alertaConfig && (
        <div style={{ maxWidth: 520 }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="card-title">⏰ Configuração do Alerta de Tarefas</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  E-mail enviado automaticamente para cada responsável com tarefas vencendo.
                </div>
              </div>
              <div onClick={() => setAlertaConfig(c => ({ ...c, ativo: !c.ativo }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: alertaConfig.ativo ? 'var(--color-accent)' : 'var(--color-surface-3)', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: alertaConfig.ativo ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Horário de envio <span style={{ fontWeight: 400, color: 'var(--color-text-faint)' }}>(horário de Cuiabá)</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input className="form-input" type="time" value={alertaConfig.hora_envio || '07:00'}
                    onChange={e => setAlertaConfig(c => ({ ...c, hora_envio: e.target.value }))}
                    style={{ width: 130 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    UTC: {alertaConfig.hora_envio ? String(parseInt(alertaConfig.hora_envio) + 4).padStart(2,'0') + ':' + alertaConfig.hora_envio.split(':')[1] : '—'}
                  </span>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Antecedência do alerta</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[['1','1 dia antes'],['2','2 dias antes'],['3','3 dias antes']].map(([v, l]) => {
                    const ativo = String(alertaConfig.dias_antecedencia) === v;
                    return (
                      <button key={v} onClick={() => setAlertaConfig(c => ({ ...c, dias_antecedencia: Number(v) }))}
                        style={{ padding: '6px 12px', fontSize: 12, fontWeight: ativo ? 700 : 400, borderRadius: 'var(--radius-md)', border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`, background: ativo ? 'var(--color-accent)' : 'var(--color-surface)', color: ativo ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer' }}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--color-text-muted)' }}>
                📋 Para atualizar o horário no pg_cron, execute no Supabase SQL Editor:
                <pre style={{ fontSize: 11, marginTop: 8, padding: '8px 10px', background: 'var(--color-surface-3)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
{`SELECT cron.unschedule('alerta-tarefas-diario');
SELECT cron.schedule(
  'alerta-tarefas-diario',
  '${alertaConfig.hora_envio ? `0 ${String(parseInt(alertaConfig.hora_envio) + 4).padStart(2,'0')}` : '0 11'} * * 1,2,3,4,5',
  $$ SELECT net.http_post(...) $$
);`}
                </pre>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={testarAlerta} disabled={testando}>
                  {testando ? '⏳ Enviando...' : '▶ Testar agora'}
                </button>
                <button className="btn btn-primary" onClick={salvarConfig} disabled={salvandoConfig}>
                  {salvandoConfig ? 'Salvando...' : 'Salvar configuração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {aba === 'tarefas' && (<>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar tarefas..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todas">Todas</option>
          <option value="pendentes">Pendentes</option>
          <option value="concluidas">Concluídas</option>
        </select>
        <select className="form-select" value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="form-select" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
          <option value="">Todos os setores</option>
          {setoresUsados.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Tarefa</th>
              <th>Tipo</th>
              <th>Responsável</th>
              <th>Setor</th>
              <th>Início</th>
              <th>Prazo</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">✓</div><div className="empty-state-text">Nenhuma tarefa encontrada</div></div></td></tr>
            )}
            {lista.map(t => {
              const status = getStatusInfo(t);
              return (
                <tr key={t.id} style={{ opacity: t.concluida ? 0.6 : 1 }}>
                  <td>
                    <button
                      onClick={() => toggleConcluida(t)}
                      style={{
                        width: 18, height: 18, borderRadius: 4,
                        border: `1.5px solid ${t.concluida ? 'var(--color-success)' : 'var(--color-border-light)'}`,
                        background: t.concluida ? 'var(--color-success-bg)' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: 'var(--color-success)',
                      }}
                    >{t.concluida ? '✓' : ''}</button>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, textDecoration: t.concluida ? 'line-through' : 'none' }}>{t.titulo}</div>
                    {t.obs && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{t.obs}</div>}
                  </td>
                  <td><span className="badge badge-neutral">{t.tipo || '—'}</span></td>
                  <td>{t.responsavel || '—'}</td>
                  <td>{t.setor || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(t.dt_inicio)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(t.dt_fim)}</td>
                  <td><span className={`badge ${status.cls}`}>{status.label}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn-icon btn-sm" onClick={() => setModal(t)}>✎</button>
                      <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Remover?')) { deleteTarefa(t.id); addToast('Removida.', 'info'); } }} style={{ color: 'var(--color-danger)' }}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalTarefa
          tarefa={modal === 'novo' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          usuarios={usuarios}
          setores={setores}
        />
      )}
      </>)}
    </div>
  );
}
