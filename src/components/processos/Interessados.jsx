import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import AR from './AR.jsx';
import Portal from '../layout/Portal.jsx';

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

function ModalInteressado({ dados, onSalvar, onClose }) {
  const [form, setForm] = useState({ ...EMPTY, ...dados });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isNovo = !dados?.id;

  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ width: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
          <div className="modal-header">
            <span className="modal-title">{isNovo ? '+ Novo Interessado' : 'Editar Interessado'}</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body" style={{ overflowY: 'auto', padding: 20 }}>
            <div className="form-grid form-grid-3">
              <div className="form-group form-full">
                <label className="form-label">Nome *</label>
                <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-select" value={form.tipo||'Cliente'} onChange={e => set('tipo', e.target.value)}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">CPF</label>
                <input className="form-input" value={form.cpf||''} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="form-group">
                <label className="form-label">RG</label>
                <input className="form-input" value={form.rg||''} onChange={e => set('rg', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input className="form-input" value={form.telefone||''} onChange={e => set('telefone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input className="form-input" type="email" value={form.email||''} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="form-group form-full">
                <label className="form-label">Endereço</label>
                <input className="form-input" value={form.endereco||''} onChange={e => set('endereco', e.target.value)} />
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
                <label className="form-label">Observações</label>
                <input className="form-input" value={form.obs||''} onChange={e => set('obs', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSalvar(form)}>Salvar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function Interessados() {
  const { interessados, addInteressado, editInteressado, deleteInteressado, addToast } = useApp();
  const [busca,      setBusca]      = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [modal,      setModal]      = useState(null); // null | 'novo' | objeto para editar

  const [aba, setAba] = useState('interessados');
  const [arHistorico, setArHistorico] = useState([]);

  const lista = interessados.filter(i => {
    const txt = (i.nome + (i.cpf||'') + (i.email||'') + (i.telefone||'')).toLowerCase();
    const matchBusca = !busca || txt.includes(busca.toLowerCase());
    const matchTipo  = filtroTipo === 'todos' || (i.tipo || 'Cliente') === filtroTipo;
    return matchBusca && matchTipo;
  });

  const handleSalvar = async (form) => {
    if (!form.nome.trim()) { addToast('Nome é obrigatório.', 'error'); return; }
    if (form.id) {
      await editInteressado(form.id, form);
    } else {
      await addInteressado(form);
    }
    setModal(null);
  };

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
        {aba === 'interessados' && (
          <button className="btn btn-primary" onClick={() => setModal('novo')}>+ Novo Interessado</button>
        )}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--color-border)' }}>
        {[
          { id: 'interessados', label: '👥 Interessados' },
          { id: 'ar',          label: '📮 AR / Etiquetas' },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{
              padding: '8px 18px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              borderBottom: aba === a.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              background: 'transparent', color: aba === a.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
              marginBottom: -2,
            }}>
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'ar' && <AR interessados={interessados} historico={arHistorico} setHistorico={setArHistorico} />}
      {aba === 'interessados' && (<>

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
            {lista.map(i => (
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
                    <button className="btn-icon btn-sm" onClick={() => setModal(i)} title="Editar">✎</button>
                    <button className="btn-icon btn-sm" onClick={() => handleDelete(i)} title="Remover" style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>)}

      {modal && (
        <ModalInteressado
          dados={modal === 'novo' ? EMPTY : modal}
          onSalvar={handleSalvar}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}


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
