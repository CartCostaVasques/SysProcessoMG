import { useState } from 'react';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';

// ─────────────────────────────────────────────
//  SERVIÇOS
// ─────────────────────────────────────────────
const EMPTY_SVC = { categoria: '', subcategoria: '', descricao: '', ativo: true };

function ModalServico({ servico, onClose, onSave, categorias }) {
  const [form, setForm] = useState(servico ? { ...servico } : { ...EMPTY_SVC });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSubmit = () => {
    if (!form.categoria || !form.subcategoria) { alert('Categoria e subcategoria são obrigatórios.'); return; }
    onSave(form);
  };
  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <span className="modal-title">{servico ? 'Editar Serviço' : 'Novo Tipo de Serviço'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid" style={{ gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Categoria *</label>
              <input className="form-input" list="cats" value={form.categoria} onChange={e => set('categoria', e.target.value)} placeholder="Ex: Escritura" />
              <datalist id="cats">{categorias.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Subcategoria *</label>
              <input className="form-input" value={form.subcategoria} onChange={e => set('subcategoria', e.target.value)} placeholder="Ex: Compra e Venda" />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input className="form-input" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Descrição completa do serviço" />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                {[true, false].map(v => (
                  <label key={String(v)} className="checkbox-wrapper">
                    <input type="radio" checked={form.ativo === v} onChange={() => set('ativo', v)} />
                    <div className="checkbox-box" style={{ borderRadius: '50%' }}>
                      {form.ativo === v && <span style={{ fontSize: 8, color: 'var(--color-bg)' }}>●</span>}
                    </div>
                    <span className="checkbox-label">{v ? 'Ativo' : 'Inativo'}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Salvar</button>
        </div>
      </div>
    </div></Portal>
  );
}

export function Servicos() {
  const { servicos, addServico, editServico, deleteServico, addToast } = useApp();
  const [modal, setModal] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroCateg, setFiltroCateg] = useState('');

  const categorias = [...new Set(servicos.map(s => s.categoria))];
  const lista = servicos.filter(s => {
    const ok = (s.categoria + s.subcategoria + s.descricao).toLowerCase().includes(busca.toLowerCase());
    return ok && (!filtroCateg || s.categoria === filtroCateg);
  });

  const grouped = categorias.filter(c => !filtroCateg || c === filtroCateg).map(c => ({
    categoria: c,
    items: lista.filter(s => s.categoria === c),
  })).filter(g => g.items.length);

  const handleSave = (form) => {
    if (modal === 'novo') { addServico(form); addToast('Serviço cadastrado!', 'success'); }
    else { editServico(modal.id, form); addToast('Serviço atualizado!', 'success'); }
    setModal(null);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><div className="page-title">Tipo de Serviços</div><div className="page-sub">Categorias e subcategorias de serviços</div></div>
        <button className="btn btn-primary" onClick={() => setModal('novo')}>+ Novo Serviço</button>
      </div>
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" value={filtroCateg} onChange={e => setFiltroCateg(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {grouped.map(g => (
        <div key={g.categoria} style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '6px 0', borderBottom: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{g.categoria}</span>
            <span className="badge badge-neutral">{g.items.length} subcategorias</span>
          </div>
          <div className="table-wrapper">
            <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: '220px' }} />
                <col />
                <col style={{ width: '90px' }} />
                <col style={{ width: '72px' }} />
              </colgroup>
              <thead><tr><th>Subcategoria</th><th>Descrição</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {g.items.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.subcategoria}</td>
                    <td style={{ color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.descricao || '—'}</td>
                    <td><span className={`badge ${s.ativo ? 'badge-success' : 'badge-neutral'}`}>{s.ativo ? 'Ativo' : 'Inativo'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="btn-icon btn-sm" onClick={() => setModal(s)}>✎</button>
                        <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Remover?')) { deleteServico(s.id); addToast('Removido.', 'info'); } }} style={{ color: 'var(--color-danger)' }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {grouped.length === 0 && <div className="empty-state"><div className="empty-state-icon">⊞</div><div className="empty-state-text">Nenhum serviço encontrado</div></div>}
      {modal && <ModalServico servico={modal === 'novo' ? null : modal} onClose={() => setModal(null)} onSave={handleSave} categorias={categorias} />}
    </div>
  );
}

// ─────────────────────────────────────────────
//  SETORES
// ─────────────────────────────────────────────
const EMPTY_SET = { nome: '', descricao: '', ativo: true };

export function Setores() {
  const { setores, addSetor, editSetor, deleteSetor, addToast } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [newRow, setNewRow] = useState(null);

  const startEdit = (s) => { setEditingId(s.id); setEditRow({ ...s }); };
  const cancelEdit = () => { setEditingId(null); setEditRow({}); };
  const setEd = (k, v) => setEditRow(p => ({ ...p, [k]: v }));
  const saveEdit = () => { editSetor(editingId, editRow); setEditingId(null); addToast('Setor atualizado!', 'success'); };

  const setNR = (k, v) => setNewRow(p => ({ ...p, [k]: v }));
  const saveNew = () => {
    if (!newRow.nome) { addToast('Nome obrigatório.', 'error'); return; }
    addSetor(newRow); setNewRow(null); addToast('Setor cadastrado!', 'success');
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><div className="page-title">Setores</div><div className="page-sub">Divisões internas do cartório</div></div>
        <button className="btn btn-primary" onClick={() => setNewRow({ ...EMPTY_SET })}>+ Novo Setor</button>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead><tr><th>Nome do Setor</th><th>Descrição</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {newRow && (
              <tr className="row-editing">
                <td><input className="td-input" value={newRow.nome} onChange={e => setNR('nome', e.target.value)} placeholder="Nome do setor" /></td>
                <td><input className="td-input" value={newRow.descricao} onChange={e => setNR('descricao', e.target.value)} placeholder="Descrição" /></td>
                <td>
                  <select className="td-select" value={newRow.ativo ? 'true' : 'false'} onChange={e => setNR('ativo', e.target.value === 'true')} style={{ width: 90 }}>
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveNew}>✓</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setNewRow(null)}>✕</button>
                  </div>
                </td>
              </tr>
            )}
            {setores.map(s => (
              editingId === s.id ? (
                <tr key={s.id} className="row-editing">
                  <td><input className="td-input" value={editRow.nome} onChange={e => setEd('nome', e.target.value)} /></td>
                  <td><input className="td-input" value={editRow.descricao} onChange={e => setEd('descricao', e.target.value)} /></td>
                  <td>
                    <select className="td-select" value={editRow.ativo ? 'true' : 'false'} onChange={e => setEd('ativo', e.target.value === 'true')} style={{ width: 90 }}>
                      <option value="true">Ativo</option>
                      <option value="false">Inativo</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓</button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>✕</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.nome}</td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{s.descricao || '—'}</td>
                  <td><span className={`badge ${s.ativo ? 'badge-success' : 'badge-neutral'}`}>{s.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button className="btn-icon btn-sm" onClick={() => startEdit(s)}>✎</button>
                      <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Remover setor?')) { deleteSetor(s.id); addToast('Removido.', 'info'); } }} style={{ color: 'var(--color-danger)' }}>✕</button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
