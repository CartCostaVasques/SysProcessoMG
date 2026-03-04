import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const STATUS_OPTS = ['Em andamento', 'Concluído', 'Devolvido', 'Suspenso'];

const EMPTY_ROW = {
  numero_interno: '', especie: '', categoria: '',
  partes: '[]', municipio: 'Paranatinga', status: 'Em andamento',
  dt_abertura: new Date().toISOString().split('T')[0],
  dt_conclusao: '', responsavel_id: null, valor_ato: '', obs: '',
  interessados: [],
};

// ─── Modal Interessados ──────────────────────────────────────
function ModalInteressados({ interessados = [], onChange, onClose }) {
  const [lista, setLista] = useState(interessados.map((i, idx) => ({ ...i, _id: idx })));
  const [novoNome, setNovoNome] = useState('');
  const [novoCpf, setNovoCpf] = useState('');

  const adicionar = () => {
    if (!novoNome.trim()) { alert('Nome é obrigatório.'); return; }
    setLista(p => [...p, { nome: novoNome.trim(), cpf: novoCpf.trim(), _id: Date.now() }]);
    setNovoNome(''); setNovoCpf('');
  };

  const salvar = () => { onChange(lista.map(({ _id, ...r }) => r)); onClose(); };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">Interessados / Partes</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Adicionar Interessado</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Nome *</label>
                <input className="form-input" value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome completo" onKeyDown={e => e.key === 'Enter' && adicionar()} />
              </div>
              <div className="form-group">
                <label className="form-label">CPF <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(opcional)</span></label>
                <input className="form-input" value={novoCpf} onChange={e => setNovoCpf(e.target.value)} placeholder="000.000.000-00" />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={adicionar}>+ Adicionar</button>
          </div>

          {lista.length === 0
            ? <div className="empty-state"><div className="empty-state-text">Nenhum interessado cadastrado</div></div>
            : (
              <table className="data-table" style={{ fontSize: 13 }}>
                <thead><tr><th>#</th><th>Nome</th><th style={{ width: 160 }}>CPF</th><th style={{ width: 50 }}></th></tr></thead>
                <tbody>
                  {lista.map((i, idx) => (
                    <tr key={i._id}>
                      <td style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{idx + 1}</td>
                      <td><strong>{i.nome}</strong></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{i.cpf || '—'}</td>
                      <td><button className="btn-icon btn-sm" onClick={() => setLista(p => p.filter(x => x._id !== i._id))} style={{ color: 'var(--color-danger)' }}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Andamentos ────────────────────────────────────────
function ModalAndamentos({ processo, andamentos, onClose, onAddAndamento, onEditAndamento, onDeleteAndamento, usuarios }) {
  const [form, setForm] = useState({ processo_id: processo.id, dt_andamento: new Date().toISOString().split('T')[0], tipo: '', descricao: '', responsavel: '', prazo: '', vencimento: '', concluido: false });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const lista = andamentos.filter(a => a.processo_id === processo.id);
  const interessados = (() => { try { return JSON.parse(processo.partes || '[]'); } catch { return []; } })();

  const handleAdd = () => {
    if (!form.descricao) { alert('Descrição obrigatória.'); return; }
    onAddAndamento(form);
    setForm(p => ({ ...p, descricao: '', tipo: '', prazo: '', vencimento: '' }));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">Andamentos — {processo.numero_interno}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
            <strong>{processo.especie}</strong> · <span className={`badge ${processo.status === 'Concluído' ? 'badge-success' : 'badge-warning'}`}>{processo.status}</span>
            {interessados.length > 0 && (
              <div style={{ marginTop: 6, color: 'var(--color-text-muted)' }}>
                <strong>Interessados:</strong> {interessados.map(i => i.nome + (i.cpf ? ` (${i.cpf})` : '')).join(' · ')}
              </div>
            )}
          </div>

          <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Novo Andamento</div>
            <div className="form-grid form-grid-3" style={{ marginBottom: 10 }}>
              <div className="form-group"><label className="form-label">Data</label><input className="form-input" type="date" value={form.dt_andamento} onChange={e => set('dt_andamento', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Tipo</label><input className="form-input" value={form.tipo} onChange={e => set('tipo', e.target.value)} placeholder="Diligência, Ofício..." /></div>
              <div className="form-group"><label className="form-label">Responsável</label>
                <select className="form-select" value={form.responsavel} onChange={e => set('responsavel', e.target.value)}>
                  <option value="">Selecione</option>
                  {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.nome_simples}>{u.nome_simples}</option>)}
                </select>
              </div>
              <div className="form-group form-full"><label className="form-label">Descrição *</label><input className="form-input" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Detalhe o andamento..." /></div>
              <div className="form-group"><label className="form-label">Prazo (dias)</label><input className="form-input" type="number" value={form.prazo} onChange={e => set('prazo', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Vencimento</label><input className="form-input" type="date" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} /></div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleAdd}>+ Adicionar</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lista.length === 0 && <div className="empty-state"><div className="empty-state-text">Nenhum andamento registrado</div></div>}
            {lista.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', opacity: a.concluido ? 0.7 : 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: a.concluido ? 'var(--color-success-bg)' : 'var(--color-surface-3)', border: `1.5px solid ${a.concluido ? 'var(--color-success)' : 'var(--color-border-light)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: a.concluido ? 'var(--color-success)' : 'var(--color-text-faint)' }}>{a.concluido ? '✓' : i + 1}</div>
                  {i < lista.length - 1 && <div style={{ flex: 1, width: 1.5, background: 'var(--color-border)', marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{a.descricao}</span>
                    {a.tipo && <span className="badge badge-neutral">{a.tipo}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{formatDate(a.dt_andamento)} · {a.responsavel || '—'}{a.vencimento && ` · Vence: ${formatDate(a.vencimento)}`}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon btn-sm" onClick={() => onEditAndamento(a.id, { concluido: !a.concluido })}>{a.concluido ? '↩' : '✓'}</button>
                  <button className="btn-icon btn-sm" onClick={() => onDeleteAndamento(a.id)} style={{ color: 'var(--color-danger)' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Fechar</button></div>
      </div>
    </div>
  );
}

// ─── Principal ───────────────────────────────────────────────
export default function Processos() {
  const { processos, addProcesso, editProcesso, deleteProcesso, andamentos, addAndamento, editAndamento, deleteAndamento, servicos, usuarios, addToast } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [editRow, setEditRow]     = useState({});
  const [newRow, setNewRow]       = useState(null);
  const [modalAnd, setModalAnd]   = useState(null);
  const [modalInt, setModalInt]   = useState(null); // 'new' | 'edit'
  const [busca, setBusca]         = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroResp, setFiltroResp]     = useState('');
  const [filtroCateg, setFiltroCateg]   = useState('');

  const categorias = [...new Set(servicos.map(s => s.categoria))];
  const parsePartes = (v) => { try { return JSON.parse(v || '[]'); } catch { return []; } };

  const lista = processos.filter(p => {
    const nomes = parsePartes(p.partes).map(i => i.nome).join(' ');
    const txt = (p.numero_interno + nomes + p.especie + p.categoria + p.municipio).toLowerCase();
    return (!busca || txt.includes(busca.toLowerCase()))
      && (!filtroStatus || p.status === filtroStatus)
      && (!filtroResp || (usuarios.find(u => u.id === p.responsavel_id)?.nome_simples || '') === filtroResp)
      && (!filtroCateg || p.categoria === filtroCateg);
  });

  const startEdit = (p) => { setEditingId(p.id); setEditRow({ ...p, interessados: parsePartes(p.partes) }); };
  const cancelEdit = () => { setEditingId(null); setEditRow({}); };
  const setEd = (k, v) => setEditRow(p => ({ ...p, [k]: v }));
  const setNR = (k, v) => setNewRow(p => ({ ...p, [k]: v }));

  const saveEdit = async () => {
    const { interessados, ...rest } = editRow;
    await editProcesso(editingId, { ...rest, partes: JSON.stringify(interessados || []) });
    setEditingId(null);
  };

  const saveNewRow = async () => {
    if (!newRow.numero_interno) { addToast('Número interno é obrigatório.', 'error'); return; }
    // Verifica duplicidade
    if (processos.find(p => p.numero_interno.trim() === newRow.numero_interno.trim())) {
      addToast(`Nº Interno "${newRow.numero_interno}" já existe!`, 'error'); return;
    }
    const { interessados, ...rest } = newRow;
    await addProcesso({ ...rest, partes: JSON.stringify(interessados || []), valor_ato: parseFloat(newRow.valor_ato) || 0 });
    setNewRow(null);
  };

  const handleDelete = (p) => { if (window.confirm(`Remover processo ${p.numero_interno}?`)) deleteProcesso(p.id); };
  const responsaveis = [...new Set(processos.map(p => usuarios.find(u => u.id === p.responsavel_id)?.nome_simples).filter(Boolean))];
  const getEspecies = (c) => servicos.filter(s => !c || s.categoria === c).map(s => s.subcategoria);

  const statusBadge = (s) => {
    const m = { 'Em andamento': 'badge-warning', 'Concluído': 'badge-success', 'Devolvido': 'badge-danger', 'Suspenso': 'badge-neutral' };
    return <span className={`badge ${m[s] || 'badge-neutral'}`}>{s}</span>;
  };

  const renderPartes = (partes) => {
    const arr = parsePartes(partes);
    if (!arr.length) return <span style={{ color: 'var(--color-text-faint)' }}>—</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {arr.map((i, idx) => (
          <span key={idx} style={{ fontSize: 11 }}>
            <strong>{i.nome}</strong>
            {i.cpf && <span style={{ color: 'var(--color-text-faint)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>{i.cpf}</span>}
          </span>
        ))}
      </div>
    );
  };

  const btnInt = (count, onClick) => (
    <button className="btn btn-ghost btn-sm" onClick={onClick} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
      👤 {count > 0 ? `${count} pessoa(s)` : 'Adicionar'}
    </button>
  );

  const selResp = (val, onChange) => (
    <select className="td-select" value={val || ''} onChange={e => onChange(e.target.value || null)} style={{ width: 100 }}>
      <option value="">—</option>
      {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
    </select>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Processos</div>
          <div className="page-sub">{lista.length} registro(s) · {processos.filter(p => p.status === 'Em andamento').length} em andamento</div>
        </div>
        <button className="btn btn-primary" onClick={() => setNewRow({ ...EMPTY_ROW })}>+ Novo Processo</button>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por número, interessado, serviço..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>{STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-select" value={filtroCateg} onChange={e => setFiltroCateg(e.target.value)}>
          <option value="">Todas as categorias</option>{categorias.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-select" value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
          <option value="">Todos os responsáveis</option>{responsaveis.map(r => <option key={r}>{r}</option>)}
        </select>
        {(filtroStatus || filtroCateg || filtroResp || busca) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroCateg(''); setFiltroResp(''); }}>✕ Limpar</button>
        )}
      </div>

      <div className="table-wrapper">
        <table className="data-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 90 }}>Nº Interno</th>
              <th style={{ width: 120 }}>Categoria</th>
              <th style={{ width: 140 }}>Serviço</th>
              <th>Interessados / Partes</th>
              <th style={{ width: 100 }}>Município</th>
              <th style={{ width: 100 }}>Dt. Abertura</th>
              <th style={{ width: 100 }}>Dt. Conclusão</th>
              <th style={{ width: 110 }}>Responsável</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 60 }}>And.</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {/* Nova linha */}
            {newRow && (
              <tr className="row-editing">
                <td><input className="td-input" value={newRow.numero_interno} onChange={e => setNR('numero_interno', e.target.value)} placeholder="Nº *" style={{ width: 80 }} /></td>
                <td><select className="td-select" value={newRow.categoria} onChange={e => setNR('categoria', e.target.value)} style={{ width: 110 }}>
                  <option value="">Categoria</option>{categorias.map(c => <option key={c}>{c}</option>)}
                </select></td>
                <td><select className="td-select" value={newRow.especie} onChange={e => setNR('especie', e.target.value)} style={{ width: 130 }}>
                  <option value="">Serviço</option>{getEspecies(newRow.categoria).map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td>{btnInt((newRow.interessados || []).length, () => setModalInt('new'))}</td>
                <td><input className="td-input" value={newRow.municipio} onChange={e => setNR('municipio', e.target.value)} style={{ width: 90 }} /></td>
                <td><input className="td-input" type="date" value={newRow.dt_abertura} onChange={e => setNR('dt_abertura', e.target.value)} style={{ width: 110 }} /></td>
                <td><input className="td-input" type="date" value={newRow.dt_conclusao} onChange={e => setNR('dt_conclusao', e.target.value)} style={{ width: 110 }} /></td>
                <td>{selResp(newRow.responsavel_id, v => setNR('responsavel_id', v))}</td>
                <td><select className="td-select" value={newRow.status} onChange={e => setNR('status', e.target.value)} style={{ width: 110 }}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td>—</td>
                <td><div style={{ display: 'flex', gap: 3 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveNewRow}>✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setNewRow(null)}>✕</button>
                </div></td>
              </tr>
            )}

            {lista.length === 0 && !newRow && (
              <tr><td colSpan={11}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">Nenhum processo encontrado</div></div></td></tr>
            )}

            {lista.map(p => editingId === p.id ? (
              <tr key={p.id} className="row-editing">
                <td><input className="td-input" value={editRow.numero_interno} onChange={e => setEd('numero_interno', e.target.value)} style={{ width: 80 }} /></td>
                <td><select className="td-select" value={editRow.categoria} onChange={e => setEd('categoria', e.target.value)} style={{ width: 110 }}>
                  <option value="">—</option>{categorias.map(c => <option key={c}>{c}</option>)}
                </select></td>
                <td><select className="td-select" value={editRow.especie} onChange={e => setEd('especie', e.target.value)} style={{ width: 130 }}>
                  <option value="">—</option>{getEspecies(editRow.categoria).map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td>{btnInt((editRow.interessados || []).length, () => setModalInt('edit'))}</td>
                <td><input className="td-input" value={editRow.municipio} onChange={e => setEd('municipio', e.target.value)} style={{ width: 90 }} /></td>
                <td><input className="td-input" type="date" value={editRow.dt_abertura} onChange={e => setEd('dt_abertura', e.target.value)} style={{ width: 110 }} /></td>
                <td><input className="td-input" type="date" value={editRow.dt_conclusao || ''} onChange={e => setEd('dt_conclusao', e.target.value)} style={{ width: 110 }} /></td>
                <td>{selResp(editRow.responsavel_id, v => setEd('responsavel_id', v))}</td>
                <td><select className="td-select" value={editRow.status} onChange={e => setEd('status', e.target.value)} style={{ width: 110 }}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td>{p.total_andamentos || 0}</td>
                <td><div style={{ display: 'flex', gap: 3 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>✕</button>
                </div></td>
              </tr>
            ) : (
              <tr key={p.id}>
                <td><span style={{ fontFamily: 'var(--font-mono)' }}>{p.numero_interno}</span></td>
                <td><span className="badge badge-neutral">{p.categoria}</span></td>
                <td>{p.especie}</td>
                <td style={{ maxWidth: 220 }}>{renderPartes(p.partes)}</td>
                <td>{p.municipio}</td>
                <td>{formatDate(p.dt_abertura)}</td>
                <td>{formatDate(p.dt_conclusao)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="avatar avatar-sm">{usuarios.find(u => u.id === p.responsavel_id)?.nome_simples?.[0]?.toUpperCase() || '?'}</div>
                    <span>{usuarios.find(u => u.id === p.responsavel_id)?.nome_simples || '—'}</span>
                  </div>
                </td>
                <td>{statusBadge(p.status)}</td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModalAnd(p)} style={{ fontFamily: 'var(--font-mono)', gap: 4 }}>
                    <span>{p.total_andamentos || 0}</span><span style={{ fontSize: 10 }}>↗</span>
                  </button>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    <button className="btn-icon btn-sm" onClick={() => startEdit(p)}>✎</button>
                    <button className="btn-icon btn-sm" onClick={() => handleDelete(p)} style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalInt === 'new' && <ModalInteressados interessados={newRow?.interessados || []} onChange={l => setNR('interessados', l)} onClose={() => setModalInt(null)} />}
      {modalInt === 'edit' && <ModalInteressados interessados={editRow?.interessados || []} onChange={l => setEd('interessados', l)} onClose={() => setModalInt(null)} />}
      {modalAnd && <ModalAndamentos processo={modalAnd} andamentos={andamentos} onClose={() => setModalAnd(null)} onAddAndamento={addAndamento} onEditAndamento={editAndamento} onDeleteAndamento={deleteAndamento} usuarios={usuarios} />}
    </div>
  );
}
