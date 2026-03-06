import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const TIPOS = ['Cliente', 'Colaborador', 'Fornecedor', 'Outros'];
const EMPTY = { nome: '', cpf: '', rg: '', email: '', telefone: '', endereco: '', cidade: '', cep: '', obs: '', tipo: 'Cliente' };

const TIPO_COLORS = {
  'Colaborador': { bg: '#dbeafe', color: '#1e40af' },
  'Fornecedor':  { bg: '#dcfce7', color: '#15803d' },
  'Outros':      { bg: '#f3f4f6', color: '#6b7280' },
  'Cliente':     { bg: '#fef9c3', color: '#854d0e' },
};

const TipoBadge = ({ tipo }) => {
  const s = TIPO_COLORS[tipo] || TIPO_COLORS['Cliente'];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color }}>{tipo || 'Cliente'}</span>;
};

export default function Interessados() {
  const { interessados, addInteressado, editInteressado, deleteInteressado, addToast } = useApp();
  const [busca,      setBusca]      = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [editingId,  setEditingId]  = useState(null);
  const [editRow,    setEditRow]    = useState({});
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY });

  const set   = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setEd = (k, v) => setEditRow(p => ({ ...p, [k]: v }));

  const lista = interessados.filter(i => {
    const txt = (i.nome + (i.cpf||'') + (i.email||'') + (i.telefone||'')).toLowerCase();
    const matchBusca = !busca || txt.includes(busca.toLowerCase());
    const matchTipo  = filtroTipo === 'todos' || (i.tipo || 'Cliente') === filtroTipo;
    return matchBusca && matchTipo;
  });

  const handleAdd = async () => {
    if (!form.nome.trim()) { addToast('Nome é obrigatório.', 'error'); return; }
    await addInteressado(form);
    setForm({ ...EMPTY });
    setShowForm(false);
  };

  const startEdit  = (i) => { setEditingId(i.id); setEditRow({ ...i }); };
  const cancelEdit = ()  => { setEditingId(null); setEditRow({}); };
  const saveEdit   = async () => { await editInteressado(editingId, editRow); setEditingId(null); };
  const handleDelete = (i) => { if (window.confirm(`Remover "${i.nome}"?`)) deleteInteressado(i.id); };

  const contadores = TIPOS.reduce((acc, t) => {
    acc[t] = interessados.filter(i => (i.tipo || 'Cliente') === t).length;
    return acc;
  }, {});

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Interessados</div>
          <div className="page-sub">{interessados.length} cadastrado(s)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancelar' : '+ Novo Interessado'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">Novo Interessado</div></div>
          <div className="form-grid form-grid-3">
            <div className="form-group form-full">
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">CPF</label>
              <input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="form-group">
              <label className="form-label">RG</label>
              <input className="form-input" value={form.rg} onChange={e => set('rg', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Endereço</label>
              <input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cidade</label>
              <input className="form-input" value={form.cidade||''} onChange={e => set('cidade', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">CEP</label>
              <input className="form-input" value={form.cep||''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Obs.</label>
              <input className="form-input" value={form.obs} onChange={e => set('obs', e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleAdd}>Salvar</button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filter-bar" style={{ marginBottom: 12 }}>
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por nome, CPF, e-mail, telefone..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 150 }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t} ({contadores[t]||0})</option>)}
        </select>
        {busca && <button className="btn btn-ghost btn-sm" onClick={() => setBusca('')}>✕ Limpar</button>}
      </div>

      <div className="table-wrapper">
        <table className="data-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Nome</th>
              <th style={{ width: 110 }}>Tipo</th>
              <th style={{ width: 140 }}>CPF</th>
              <th style={{ width: 110 }}>RG</th>
              <th style={{ width: 130 }}>Telefone</th>
              <th>E-mail</th>
              <th>Endereço</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-text">Nenhum interessado encontrado</div></div></td></tr>
            )}
            {lista.map(i => editingId === i.id ? (
              <tr key={i.id} className="row-editing">
                <td><input className="td-input" value={editRow.nome} onChange={e => setEd('nome', e.target.value)} style={{ width: '100%' }} /></td>
                <td>
                  <select className="td-input" value={editRow.tipo||'Cliente'} onChange={e => setEd('tipo', e.target.value)} style={{ width: '100%' }}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td><input className="td-input" value={editRow.cpf||''} onChange={e => setEd('cpf', e.target.value)} style={{ width: 130 }} /></td>
                <td><input className="td-input" value={editRow.rg||''} onChange={e => setEd('rg', e.target.value)} style={{ width: 100 }} /></td>
                <td><input className="td-input" value={editRow.telefone||''} onChange={e => setEd('telefone', e.target.value)} style={{ width: 120 }} /></td>
                <td><input className="td-input" value={editRow.email||''} onChange={e => setEd('email', e.target.value)} style={{ width: '100%' }} /></td>
                <td><input className="td-input" value={editRow.endereco||''} onChange={e => setEd('endereco', e.target.value)} style={{ width: '100%' }} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓</button>
                    <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>✕</button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={i.id}>
                <td><strong>{i.nome}</strong></td>
                <td><TipoBadge tipo={i.tipo||'Cliente'} /></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{i.cpf||'—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{i.rg||'—'}</td>
                <td style={{ fontSize: 12 }}>{i.telefone||'—'}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{i.email||'—'}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.endereco||'—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    <button className="btn-icon btn-sm" onClick={() => startEdit(i)} title="Editar">✎</button>
                    <button className="btn-icon btn-sm" onClick={() => handleDelete(i)} title="Remover" style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
