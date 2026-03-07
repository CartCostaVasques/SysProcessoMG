import { useState, useRef, useEffect } from 'react';
import ProcessoDetalhe from './ProcessoDetalhe.jsx';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const STATUS_OPTS = ['Em andamento', 'Concluído', 'Devolvido', 'Suspenso'];
const HOJE = () => new Date().toISOString().split('T')[0];
const ONTEM = () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; };

// Tipos de vínculo do interessado no processo
const TIPOS_VINCULO = ['Outorgante', 'Outorgado', 'Anuente', 'Comprador', 'Vendedor', 'Credor', 'Devedor', 'Representante', 'Outros'];

// Formatação de valor BR
function formatBRL(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseBRL(s) {
  const str = String(s || '').trim();
  if (str.includes(',')) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(str) || 0;
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
  { label: 'Cancelamento de Protesto', categoria: 'Protesto',          especie: 'Cancelamento' },
  { label: 'Certidão de Protesto',     categoria: 'Certidao de Atos',  especie: 'Cert de Protesto' },
  { label: 'Averbação Registro Civil', categoria: 'Registro Civil',    especie: 'Averbação' },
  { label: 'Certidão Registro Civil',  categoria: 'Certidao de Atos',  especie: 'Cert Registro Civil' },
];

// ─── Modal Cadastro Rápido ───────────────────────────────────
const LINHA_VAZIA = () => ({ numero: '', valor: '0,00', _id: Math.random() });

function ModalServicRapido({ usuarios, onSalvar, onClose }) {
  const { servicos } = useApp();
  const [selecionado, setSelecionado] = useState(null);
  const [respId, setRespId]           = useState('');
  const [data, setData]               = useState(HOJE());
  const [linhas, setLinhas]           = useState([LINHA_VAZIA(), LINHA_VAZIA(), LINHA_VAZIA()]);
  const primeiroRef = useRef(null);

  useEffect(() => { primeiroRef.current?.focus(); }, []);

  const setLinha = (idx, k, v) => setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, [k]: v } : l));
  const addLinha = () => setLinhas(prev => [...prev, LINHA_VAZIA()]);
  const remLinha = (idx) => setLinhas(prev => prev.filter((_, i) => i !== idx));

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // avança para próximo campo ou adiciona linha
      const inputs = document.querySelectorAll('.rapido-input');
      const curIdx = Array.from(inputs).indexOf(e.target);
      if (curIdx < inputs.length - 1) inputs[curIdx + 1].focus();
      else addLinha();
    }
  };

  const salvar = async () => {
    if (!selecionado) { alert('Selecione um tipo de serviço'); return; }
    const validas = linhas.filter(l => l.numero.trim());
    if (validas.length === 0) { alert('Preencha ao menos um Nº Interno'); return; }
    const dt = data || HOJE();
    await onSalvar(validas.map(l => ({
      numero_interno: l.numero.trim(),
      categoria:      selecionado.categoria,
      especie:        selecionado.especie,
      responsavel_id: respId || null,
      dt_abertura:    dt,
      dt_conclusao:   dt,
      status:         'Concluído',
      valor_ato:      parseBRL(l.valor),
      partes:         '[]',
      municipio:      'Paranatinga',
      obs:            '',
    })));
  };

  const btnStyle = (ativo) => ({
    padding: '10px 14px', textAlign: 'left', cursor: 'pointer',
    background: ativo ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
    border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-md)', color: ativo ? 'var(--color-text)' : 'var(--color-text-muted)',
    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: ativo ? 600 : 400,
    display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.12s',
  });

  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">⚡ Cadastro Rápido</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tipo de serviço */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tipo de Serviço *</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {SERVICOS_RAPIDOS.map((s, i) => {
                // Busca o serviço real no banco pelo label — match por subcategoria contendo palavras-chave
                const svcReal = servicos.find(sv =>
                  sv.subcategoria?.toLowerCase().includes(s.especie.toLowerCase()) ||
                  sv.subcategoria === s.especie
                );
                const item = svcReal
                  ? { label: s.label, categoria: svcReal.categoria, especie: svcReal.subcategoria }
                  : s;
                const ativo = selecionado?.label === s.label;
                return (
                  <button key={i} onClick={() => setSelecionado(item)} style={btnStyle(ativo)}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`, background: ativo ? 'var(--color-accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: 'var(--color-bg)' }}>
                      {ativo ? '✓' : ''}
                    </span>
                    {s.label}
                    {svcReal && <span style={{ fontSize: 10, color: 'var(--color-text-faint)', marginLeft: 4 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Responsável + Data — escolha única */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Responsável</label>
              <select className="form-select" value={respId} onChange={e => setRespId(e.target.value)}>
                <option value="">—</option>
                {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {[['Hoje', HOJE()],['Ontem', ONTEM()]].map(([l, v]) => (
                  <button key={l} onClick={() => setData(v)} style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${data===v ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: data===v ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
                    color: data===v ? 'var(--color-text)' : 'var(--color-text-muted)',
                    cursor: 'pointer', fontSize: 13, fontWeight: data===v ? 600 : 400,
                  }}>{l}</button>
                ))}
                <input type="date" className="form-input" value={data} onChange={e => setData(e.target.value)}
                  style={{ fontSize: 13, height: 36, width: 140, padding: '0 8px' }} />
              </div>
            </div>
          </div>

          {/* Grade de lançamentos */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 28px', gap: 8, marginBottom: 6, padding: '0 4px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nº Interno</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'right' }}>Valor (R$)</span>
              <span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {linhas.map((l, idx) => (
                <div key={l._id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 28px', gap: 8, alignItems: 'center' }}>
                  <input
                    ref={idx === 0 ? primeiroRef : null}
                    className="form-input rapido-input"
                    value={l.numero}
                    onChange={e => setLinha(idx, 'numero', e.target.value)}
                    onKeyDown={e => handleKeyDown(e, idx)}
                    placeholder={`Nº ${idx + 1}`}
                    style={{ fontSize: 13 }}
                  />
                  <input
                    className="form-input rapido-input"
                    value={l.valor}
                    onChange={e => setLinha(idx, 'valor', e.target.value)}
                    onBlur={e => setLinha(idx, 'valor', formatBRL(parseBRL(e.target.value)))}
                    onKeyDown={e => handleKeyDown(e, idx)}
                    style={{ fontSize: 13, textAlign: 'right' }}
                    placeholder="0,00"
                  />
                  <button onClick={() => remLinha(idx)} style={{ background: 'none', border: 'none', color: linhas.length > 1 ? 'var(--color-danger)' : 'var(--color-text-faint)', cursor: linhas.length > 1 ? 'pointer' : 'default', fontSize: 16, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    disabled={linhas.length <= 1}>✕</button>
                </div>
              ))}
            </div>
            <button onClick={addLinha} style={{ marginTop: 8, background: 'none', border: `1px dashed var(--color-border)`, borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, padding: '6px 12px', width: '100%' }}>
              + Adicionar linha
            </button>
          </div>

          <div style={{ padding: '6px 10px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--color-text-faint)' }}>
            Status: Concluído · Dt. Cadastro = Dt. Conclusão · Enter avança entre campos
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar}>✓ Salvar Todos</button>
        </div>
      </div>
    </div></Portal>
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
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
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
    </div></Portal>
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
  const [processoDetalhe, setProcessoDetalhe] = useState(null);
  const [busca, setBusca]               = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroResp, setFiltroResp]     = useState('');
  const [filtroCateg, setFiltroCateg]   = useState('');
  const numRef = useRef(null);
  const focadoRef = useRef(false);

  // Foco automático no Nº Interno apenas ao ABRIR nova linha (não a cada digitação)
  useEffect(() => {
    if (newRow && !focadoRef.current && numRef.current) {
      numRef.current.focus();
      focadoRef.current = true;
    }
    if (!newRow) focadoRef.current = false;
  }, [newRow]);

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

  const handleSalvarRapido = async (lista) => {
    let salvos = 0, erros = [];
    for (const dados of lista) {
      if (processos.find(p => p.numero_interno.trim() === dados.numero_interno.trim())) {
        erros.push(dados.numero_interno);
      } else {
        await addProcesso(dados);
        salvos++;
      }
    }
    setModalRapido(false);
    if (salvos > 0) addToast(`${salvos} processo(s) registrado(s)!`, 'success');
    if (erros.length > 0) addToast(`Nº já existente: ${erros.join(', ')}`, 'error');
  };

  const STATUS_CONF = {
    'Em andamento': { cor: 'var(--color-warning)', sigla: 'EA' },
    'Concluído':    { cor: 'var(--color-success)', sigla: 'CO' },
    'Devolvido':    { cor: 'var(--color-danger)',  sigla: 'DV' },
    'Suspenso':     { cor: '#8a8a96',              sigla: 'SP' },
  };
  const statusBadge = (s) => {
    const conf = STATUS_CONF[s] || { cor: 'var(--color-text-faint)', sigla: s?.slice(0,2).toUpperCase() };
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={s}>
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: conf.cor + '22', border: `2px solid ${conf.cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: conf.cor, letterSpacing: '-0.5px', flexShrink: 0 }}>{conf.sigla}</div>
      </div>
    );
  };

  const doisPrimNomes = (nome = '') => nome.trim().split(/\s+/).slice(0, 2).join(' ');

  const renderPartes = (partes) => {
    const arr = toSel(partes);
    if (!arr.length) return <span style={{ color: 'var(--color-text-faint)' }}>—</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {arr.map((i, idx) => (
          <span key={idx} style={{ fontSize: 11 }}>
            <strong>{doisPrimNomes(i.nome)}</strong>
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
              <th style={{ width: 55 }}>Nº</th>
              <th style={{ width: 82 }}>Dt. Cadastro</th>
              <th style={{ width: 95 }}>Categoria</th>
              <th style={{ minWidth: 150 }}>Serviço</th>
              <th style={{ minWidth: 220 }}>Interessados</th>
              <th style={{ width: 60 }}>Resp.</th>
              <th style={{ width: 110 }}>Valor</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ width: 75 }}>Conclusão</th>
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
                <td><select className="td-select" value={editRow.categoria} onChange={e => { setEd('categoria', e.target.value); setEd('especie', ''); }} style={{ width: 105 }}>
                  <option value="">—</option>
                  {categorias.map(c => <option key={c}>{c}</option>)}
                  {editRow.categoria && !categorias.includes(editRow.categoria) && <option value={editRow.categoria}>{editRow.categoria}</option>}
                </select></td>
                <td><select className="td-select" value={editRow.especie} onChange={e => setEd('especie', e.target.value)} style={{ width: 125 }}>
                  <option value="">—</option>
                  {getEspecies(editRow.categoria).map(s => <option key={s}>{s}</option>)}
                  {editRow.especie && !getEspecies(editRow.categoria).includes(editRow.especie) && <option value={editRow.especie}>{editRow.especie}</option>}
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
              <tr key={p.id} style={{ opacity: p.status === 'Concluído' ? 0.75 : 1, cursor: 'pointer' }} onClick={() => setProcessoDetalhe(p)}>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{p.numero_interno}</span></td>
                <td style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(p.dt_abertura)}</td>
                <td><span className="badge badge-neutral">{p.categoria}</span></td>
                <td style={{ fontSize: 11 }}>{p.especie}</td>
                <td style={{ maxWidth: 200 }}>{renderPartes(p.partes)}</td>
                <td>
                  {(() => {
                    const u = usuarios.find(u => u.id === p.responsavel_id);
                    if (!u) return <span style={{ color: 'var(--color-text-faint)' }}>—</span>;
                    const iniciais = u.nome_simples.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 3);
                    return (
                      <div className="avatar avatar-sm" title={u.nome_simples} style={{ cursor: 'default' }}>{iniciais}</div>
                    );
                  })()}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textAlign: 'right', color: 'var(--color-text-muted)' }}>
                  {p.valor_ato > 0 ? `R$ ${formatBRL(p.valor_ato)}` : '—'}
                </td>
                <td>{statusBadge(p.status)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(p.dt_conclusao) || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    {p.status !== 'Concluído' && (
                      <button className="btn-icon btn-sm" onClick={e => { e.stopPropagation(); handleConcluir(p); }} title="Concluir" style={{ color: 'var(--color-success)', fontSize: 14 }}>✓</button>
                    )}
                    <button className="btn-icon btn-sm" onClick={e => { e.stopPropagation(); startEdit(p); }} title="Editar">✎</button>
                    <button className="btn-icon btn-sm" onClick={e => { e.stopPropagation(); handleDelete(p); }} title="Remover" style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalRapido && <ModalServicRapido usuarios={usuarios} onSalvar={handleSalvarRapido} onClose={() => setModalRapido(false)} />}
      {modalNovoInt && <ModalInteressado nomeInicial={modalNovoInt.nome} onSalvar={handleSalvarInteressado} onClose={() => setModalNovoInt(null)} />}
      {processoDetalhe && (
        <ProcessoDetalhe
          processo={processoDetalhe}
          onClose={() => setProcessoDetalhe(null)}
        />
      )}
    </div>
  );
}
