import { useState } from 'react';
import { useApp } from '../../context/AppContextSupabase.jsx';
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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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
    </div>
  );
}

export default function Tarefas() {
  const { tarefas, addTarefa, editTarefa, deleteTarefa, usuarios, setores, addToast } = useApp();
  const [modal, setModal] = useState(null);
  const [filtroResp, setFiltroResp] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('pendentes');
  const [busca, setBusca] = useState('');

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
        <button className="btn btn-primary" onClick={() => setModal('novo')}>+ Nova Tarefa</button>
      </div>

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
    </div>
  );
}
