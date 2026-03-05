import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const STATUS_OPTS = ['Em andamento', 'Concluído', 'Devolvido', 'Suspenso'];
const HOJE = () => new Date().toISOString().split('T')[0];
const ONTEM = () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; };

// Tipos de vínculo do interessado no processo
const TIPOS_VINCULO = ['Outorgante', 'Outorgado', 'Anuente', 'Comprador', 'Vendedor', 'Credor', 'Devedor', 'Representante', 'Outros'];

// Formatação de valor BR
function formatBRL(v) {
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseBRL(s) {
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0;
}
function InputValor({ value, onChange, style }) {
  const [display, setDisplay] = useState(formatBRL(value || 0));
  useEffect(() => { setDisplay(formatBRL(value || 0)); }, [value]);
  return (
    <input
      className="td-input"
      value={display}
      onChange={e => setDisplay(e.target.value)}
      onBlur={e => { const n = parseBRL(e.target.value); setDisplay(formatBRL(n)); onChange(n); }}
      style={{ textAlign: 'right', ...style }}
    />
  );
}

const EMPTY_ROW = {
  numero_interno: '', especie: '', categoria: '',
  partes: '[]', municipio: 'Paranatinga', status: 'Em andamento',
  dt_abertura: HOJE(), dt_conclusao: '', responsavel_id: null,
  valor_ato: 0, obs: '', _sel: [],
};

// ─── Serviços fixos do cadastro rápido ──────────────────────
// Edite categoria/especie para bater com os cadastrados no banco
const SERVICOS_RAPIDOS = [
  { label: 'Cancelamento de Protesto', categoria: 'Protesto',         especie: 'Cancelamento' },
  { label: 'Averbação Registro Civil', categoria: 'Registro Civil',   especie: 'Averbação' },
  { label: 'Certidão Registro Civil',  categoria: 'Certidão de Atos', especie: 'Cert Registro Civil' },
];

// ─── Modal Cadastro Rápido ───────────────────────────────────
function ModalServicRapido({ usuarios, onSalvar, onClose }) {
  const [selecionado, setSelecionado] = useState(null);
  const [numero, setNumero]           = useState('');
  const [respId, setRespId]           = useState('');
  const [data, setData]               = useState('hoje');
  const numRef = useRef(null);

  useEffect(() => { numRef.current?.focus(); }, []);

  const salvar = () => {
    if (!numero.trim()) { alert('Nº Interno obrigatório'); return; }
    if (!selecionado)   { alert('Selecione um tipo de serviço'); return; }
    const dt = data === 'ontem' ? ONTEM() : HOJE();
    onSalvar({
      numero_interno: numero.trim(),
      categoria:      selecionado.categoria,
      especie:        selecionado.especie,
      responsavel_id: respId || null,
      dt_abertura:    dt,
      dt_conclusao:   dt,
      status:         'Concluído',
      valor_ato:      0,
      partes:         '[]',
      municipio:      'Paranatinga',
      obs:            '',
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">⚡ Cadastro Rápido</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">

          {/* Grade de serviços — option buttons */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Tipo de Serviço *</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SERVICOS_RAPIDOS.map((s, i) => {
                const ativo = selecionado?.label === s.label;
                return (
                  <button key={i} onClick={() => setSelecionado(s)} style={{
                    padding: '11px 14px', textAlign: 'left', cursor: 'pointer',
                    background: ativo ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
                    border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: ativo ? 'var(--color-text)' : 'var(--color-text-muted)',
                    fontFamily: 'var(--font-sans)', fontSize: 13,
                    fontWeight: ativo ? 600 : 400, transition: 'all 0.12s',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`, background: ativo ? 'var(--color-accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: 'var(--color-bg)' }}>
                      {ativo ? '✓' : ''}
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nº Interno + Data + Responsável */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Nº Interno *</label>
              <input ref={numRef} className="form-input" value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="Ex: 001"
                onKeyDown={e => e.key === 'Enter' && salvar()} />
            </div>
            <div className="form-group">
              <label className="form-label">Data</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['hoje','Hoje'],['ontem','Ontem']].map(([v,l]) => (
                  <button key={v} onClick={() => setData(v)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${data===v ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: data===v ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
                    color: data===v ? 'var(--color-text)' : 'var(--color-text-muted)',
                    cursor: 'pointer', fontSize: 13, fontWeight: data===v ? 600 : 400,
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label className="form-label">Responsável</label>
              <select className="form-select" value={respId} onChange={e => setRespId(e.target.value)}>
                <option value="">—</option>
                {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--color-text-faint)' }}>
            Valor: R$ 0,00 · Status: Concluído · Dt. Cadastro = Dt. Conclusão
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar}>✓ Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Autocomplete Interessados ────────────────────────────────
function AutocompleteInteressados({ todos, selecionados, onChange, onCadastrarNovo }) {
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const opcoes = todos.filter(i =>
    i.ativo !== false &&
    !selecionados.find(s => s.id === i.id) &&
    (i.nome.toLowerCase().includes(busca.toLowerCase()) || (i.cpf || '').includes(busca))
  ).slice(0, 8);

  const adicionar = (i) => { onChange([...selecionados, { ...i, vinculo: 'Outorgante' }]); setBusca(''); setAberto(false); };
  const remover = (id) => onChange(selecionados.filter(s => s.id !== id));
  const setVinculo = (id, v) => onChange(selecionados.map(s => s.id === id ? { ...s, vinculo: v } : s));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {selecionados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 5 }}>
          {selecionados.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border-light)', borderRadius: 6, fontSize: 11 }}>
              <select value={s.vinculo || 'Outorgante'} onChange={e => setVinculo(s.id, e.target.value)}
                style={{ fontSize: 10, background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, maxWidth: 90 }}>
                {TIPOS_VINCULO.map(t => <option key={t}>{t}</option>)}
              </select>
              <span style={{ color: 'var(--color-border-light)' }}>·</span>
              <strong style={{ flex: 1 }}>{s.nome}</strong>
              {s.cpf && <span style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>{s.cpf}</span>}
              <button onClick={() => remover(s.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', padding: 0, fontSize: 11 }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <input className="td-input" value={busca} onChange={e => { setBusca(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)} placeholder="Buscar ou adicionar..." style={{ width: '100%', minWidth: 150 }} />
      {aberto && busca.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, minWidth: 240, zIndex: 999, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto' }}>
          {opcoes.map(i => (
            <button key={i.id} onClick={() => adicionar(i)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>{i.nome}</div>
              {i.cpf && <div style={{ fontSize: 10, color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)' }}>{i.cpf}</div>}
            </button>
          ))}
          <button onClick={() => { onCadastrarNovo(busca); setBusca(''); setAberto(false); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600 }}>
            + Cadastrar "{busca}"
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Modal Cadastro de Interessado ───────────────────────────
function ModalInteressado({ nomeInicial = '', onSalvar, onClose }) {
  const [form, setForm] = useState({ nome: nomeInicial, cpf: '', rg: '', email: '', telefone: '', endereco: '', obs: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Cadastrar Interessado</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid form-grid-2">
            <div className="form-group form-full"><label className="form-label">Nome *</label><input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} autoFocus /></div>
            <div className="form-group"><label className="form-label">CPF</label><input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" /></div>
            <div className="form-group"><label className="form-label">RG</label><input className="form-input" value={form.rg} onChange={e => set('rg', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.telefone} onChange={e => set('telefone', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
            <div className="form-group form-full"><label className="form-label">Endereço</label><input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} /></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => { if (!form.nome.trim()) { alert('Nome obrigatório'); return; } onSalvar(form); }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Principal ────────────────────────────────────────────────
export default function Processos() {
  const {
    processos, addProcesso, editProcesso, deleteProcesso,
    andamentos, addAndamento, editAndamento, deleteAndamento,
    servicos, usuarios, interessados, addInteressado, addToast,
  } = useApp();

  const [editingId, setEditingId]       = useState(null);
  const [editRow, setEditRow]           = useState({});
  const [newRow, setNewRow]             = useState(null);
  const [modalNovoInt, setModalNovoInt] = useState(null);
  const [modalRapido, setModalRapido]   = useState(false);
  const [busca, setBusca]               = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroResp, setFiltroResp]     = useState('');
  const [filtroCateg, setFiltroCateg]   = useState('');
  const numRef = useRef(null);

  // Foco automático no Nº Interno ao abrir nova linha
  useEffect(() => { if (newRow && numRef.current) numRef.current.focus(); }, [newRow]);

  const categorias  = [...new Set(servicos.map(s => s.categoria))];
  const parsePartes = (v) => { try { return JSON.parse(v || '[]'); } catch { return []; } };
  const toSel = (partes) => parsePartes(partes).map(item => {
    if (item.id) { const i = interessados.find(x => x.id === item.id); return i ? { ...i, vinculo: item.vinculo } : item; }
    return item;
  }).filter(Boolean);

  const lista = processos.filter(p => {
    const nomes = toSel(p.partes).map(i => i.nome || '').join(' ');
    const txt = (p.numero_interno + nomes + p.especie + p.categoria).toLowerCase();
    return (!busca || txt.includes(busca.toLowerCase()))
      && (!filtroStatus || p.status === filtroStatus)
      && (!filtroResp || (usuarios.find(u => u.id === p.responsavel_id)?.nome_simples || '') === filtroResp)
      && (!filtroCateg || p.categoria === filtroCateg);
  });

  const startEdit  = (p) => { setEditingId(p.id); setEditRow({ ...p, _sel: toSel(p.partes) }); };
  const cancelEdit = () => { setEditingId(null); setEditRow({}); };
  const setEd = (k, v) => setEditRow(p => ({ ...p, [k]: v }));
  const setNR = (k, v) => setNewRow(p => ({ ...p, [k]: v }));
  const getEspecies = (c) => servicos.filter(s => !c || s.categoria === c).map(s => s.subcategoria);
  const responsaveis = [...new Set(processos.map(p => usuarios.find(u => u.id === p.responsavel_id)?.nome_simples).filter(Boolean))];

  const serializarPartes = (sel) =>
    JSON.stringify((sel || []).map(i => ({ id: i.id, nome: i.nome, cpf: i.cpf || '', vinculo: i.vinculo || '' })));

  const saveEdit = async () => {
    const { _sel, ...rest } = editRow;
    await editProcesso(editingId, { ...rest, partes: serializarPartes(_sel) });
    setEditingId(null);
  };

  const saveNewRow = async () => {
    if (!newRow.numero_interno) { addToast('Número interno é obrigatório.', 'error'); return; }
    if (processos.find(p => p.numero_interno.trim() === newRow.numero_interno.trim())) {
      addToast(`Nº "${newRow.numero_interno}" já existe!`, 'error'); return;
    }
    const { _sel, ...rest } = newRow;
    await addProcesso({ ...rest, partes: serializarPartes(_sel) });
    setNewRow(null);
  };

  const handleConcluir = async (p) => {
    await editProcesso(p.id, { status: 'Concluído', dt_conclusao: HOJE() });
    addToast('Processo concluído!', 'success');
  };

  const handleDelete = (p) => { if (window.confirm(`Remover processo ${p.numero_interno}?`)) deleteProcesso(p.id); };

  const handleCadastrarNovo = (nome, cb) => setModalNovoInt({ nome, cb });

  const handleSalvarInteressado = async (dados) => {
    const novo = await addInteressado(dados);
    if (novo && modalNovoInt?.cb) modalNovoInt.cb(novo);
    setModalNovoInt(null);
  };

  const handleSalvarRapido = async (dados) => {
    if (processos.find(p => p.numero_interno.trim() === dados.numero_interno.trim())) {
      addToast(`Nº "${dados.numero_interno}" já existe!`, 'error'); return;
    }
    await addProcesso(dados);
    setModalRapido(false);
    addToast('Processo registrado!', 'success');
  };

  const statusBadge = (s) => {
    const m = { 'Em andamento': 'badge-warning', 'Concluído': 'badge-success', 'Devolvido': 'badge-danger', 'Suspenso': 'badge-neutral' };
    return <span className={`badge ${m[s] || 'badge-neutral'}`}>{s}</span>;
  };

  const renderPartes = (partes) => {
    const arr = toSel(partes);
    if (!arr.length) return <span style={{ color: 'var(--color-text-faint)' }}>—</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {arr.map((i, idx) => (
          <span key={idx} style={{ fontSize: 11 }}>
            {i.vinculo && <span style={{ color: 'var(--color-text-faint)', fontSize: 10, marginRight: 3 }}>{i.vinculo}:</span>}
            <strong>{i.nome}</strong>
          </span>
        ))}
      </div>
    );
  };

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
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setModalRapido(true)}>⚡ Cadastro Rápido</button>
          <button className="btn btn-primary" onClick={() => setNewRow({ ...EMPTY_ROW })}>+ Novo Processo</button>
        </div>
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
              <th style={{ width: 70 }}>Nº Interno</th>
              <th style={{ width: 82 }}>Dt. Cadastro</th>
              <th style={{ width: 95 }}>Categoria</th>
              <th style={{ minWidth: 150 }}>Serviço</th>
              <th style={{ minWidth: 220 }}>Interessados</th>
              <th style={{ width: 90 }}>Responsável</th>
              <th style={{ width: 80 }}>Valor</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ width: 95 }}>Dt. Conclusão</th>
              <th style={{ width: 75 }}></th>
            </tr>
          </thead>
          <tbody>
            {/* Nova linha */}
            {newRow && (
              <tr className="row-editing">
                <td><input ref={numRef} className="td-input" value={newRow.numero_interno} onChange={e => setNR('numero_interno', e.target.value)} placeholder="Nº *" style={{ width: 70 }} /></td>
                <td><input className="td-input" type="date" value={newRow.dt_abertura} onChange={e => setNR('dt_abertura', e.target.value)} style={{ width: 85 }} /></td>
                <td><select className="td-select" value={newRow.categoria} onChange={e => { setNR('categoria', e.target.value); setNR('especie', ''); }} style={{ width: 105 }}>
                  <option value="">Categoria</option>{categorias.map(c => <option key={c}>{c}</option>)}
                </select></td>
                <td><select className="td-select" value={newRow.especie} onChange={e => setNR('especie', e.target.value)} style={{ width: 125 }}>
                  <option value="">Serviço</option>{getEspecies(newRow.categoria).map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td>
                  <AutocompleteInteressados todos={interessados} selecionados={newRow._sel || []}
                    onChange={sel => setNR('_sel', sel)}
                    onCadastrarNovo={nome => handleCadastrarNovo(nome, novo => setNR('_sel', [...(newRow._sel || []), { ...novo, vinculo: 'Outorgante' }]))} />
                </td>
                <td>{selResp(newRow.responsavel_id, v => setNR('responsavel_id', v))}</td>
                <td><InputValor value={newRow.valor_ato} onChange={v => setNR('valor_ato', v)} style={{ width: 80 }} /></td>
                <td><select className="td-select" value={newRow.status} onChange={e => { setNR('status', e.target.value); if (e.target.value === 'Concluído') setNR('dt_conclusao', HOJE()); }} style={{ width: 105 }}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td><input className="td-input" type="date" value={newRow.dt_conclusao} onChange={e => setNR('dt_conclusao', e.target.value)} style={{ width: 90 }} /></td>
                <td><div style={{ display: 'flex', gap: 3 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveNewRow}>✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setNewRow(null)}>✕</button>
                </div></td>
              </tr>
            )}

            {lista.length === 0 && !newRow && (
              <tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">Nenhum processo encontrado</div></div></td></tr>
            )}

            {lista.map(p => editingId === p.id ? (
              <tr key={p.id} className="row-editing">
                <td><input className="td-input" value={editRow.numero_interno} onChange={e => setEd('numero_interno', e.target.value)} style={{ width: 70 }} /></td>
                <td><input className="td-input" type="date" value={editRow.dt_abertura} onChange={e => setEd('dt_abertura', e.target.value)} style={{ width: 85 }} /></td>
                <td><select className="td-select" value={editRow.categoria} onChange={e => setEd('categoria', e.target.value)} style={{ width: 105 }}>
                  <option value="">—</option>{categorias.map(c => <option key={c}>{c}</option>)}
                </select></td>
                <td><select className="td-select" value={editRow.especie} onChange={e => setEd('especie', e.target.value)} style={{ width: 125 }}>
                  <option value="">—</option>{getEspecies(editRow.categoria).map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td>
                  <AutocompleteInteressados todos={interessados} selecionados={editRow._sel || []}
                    onChange={sel => setEd('_sel', sel)}
                    onCadastrarNovo={nome => handleCadastrarNovo(nome, novo => setEd('_sel', [...(editRow._sel || []), { ...novo, vinculo: 'Outorgante' }]))} />
                </td>
                <td>{selResp(editRow.responsavel_id, v => setEd('responsavel_id', v))}</td>
                <td><InputValor value={editRow.valor_ato} onChange={v => setEd('valor_ato', v)} style={{ width: 80 }} /></td>
                <td><select className="td-select" value={editRow.status} onChange={e => { setEd('status', e.target.value); if (e.target.value === 'Concluído' && !editRow.dt_conclusao) setEd('dt_conclusao', HOJE()); }} style={{ width: 105 }}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td><input className="td-input" type="date" value={editRow.dt_conclusao || ''} onChange={e => setEd('dt_conclusao', e.target.value)} style={{ width: 90 }} /></td>
                <td><div style={{ display: 'flex', gap: 3 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>✕</button>
                </div></td>
              </tr>
            ) : (
              <tr key={p.id} style={{ opacity: p.status === 'Concluído' ? 0.75 : 1 }}>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.numero_interno}</span></td>
                <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(p.dt_abertura)}</td>
                <td><span className="badge badge-neutral">{p.categoria}</span></td>
                <td style={{ fontSize: 11 }}>{p.especie}</td>
                <td style={{ maxWidth: 200 }}>{renderPartes(p.partes)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="avatar avatar-sm">{usuarios.find(u => u.id === p.responsavel_id)?.nome_simples?.[0]?.toUpperCase() || '?'}</div>
                    <span style={{ fontSize: 11 }}>{usuarios.find(u => u.id === p.responsavel_id)?.nome_simples || '—'}</span>
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'right', color: 'var(--color-text-muted)' }}>
                  {p.valor_ato > 0 ? `R$ ${formatBRL(p.valor_ato)}` : '—'}
                </td>
                <td>{statusBadge(p.status)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(p.dt_conclusao) || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    {p.status !== 'Concluído' && (
                      <button className="btn-icon btn-sm" onClick={() => handleConcluir(p)} title="Concluir" style={{ color: 'var(--color-success)', fontSize: 14 }}>✓</button>
                    )}
                    <button className="btn-icon btn-sm" onClick={() => startEdit(p)} title="Editar">✎</button>
                    <button className="btn-icon btn-sm" onClick={() => handleDelete(p)} title="Remover" style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalRapido && <ModalServicRapido usuarios={usuarios} onSalvar={handleSalvarRapido} onClose={() => setModalRapido(false)} />}
      {modalNovoInt && <ModalInteressado nomeInicial={modalNovoInt.nome} onSalvar={handleSalvarInteressado} onClose={() => setModalNovoInt(null)} />}
    </div>
  );
}
