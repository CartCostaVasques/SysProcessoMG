import { useState, useRef, useEffect } from 'react';
import ProcessoDetalhe from './ProcessoDetalhe.jsx';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const STATUS_OPTS = ['Em andamento', 'Devolvido', 'Em reanálise', 'Concluído', 'Encerrado'];
const STATUS_PENDENTES = ['Em andamento', 'Devolvido', 'Em reanálise'];
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
  valor_ato: 0, quantidade: 1, obs: '', _sel: [],
};

// ─── Serviços fixos do cadastro rápido ──────────────────────
// Edite categoria/especie para bater com os cadastrados no banco
const SERVICOS_RAPIDOS = [
  { label: 'Apontamento Protesto',      categoria: 'Protesto',          especie: 'Apontamento Protesto' },
  { label: 'Baixa Protesto',            categoria: 'Protesto',          especie: 'Baixa Protesto' },
  { label: 'Certidão de Protesto',      categoria: 'Certidao de Atos',  especie: 'Cert de Protesto' },
  { label: 'Averbação Registro Civil',  categoria: 'Registro Civil',    especie: 'Averbação' },
  { label: 'Certidão Registro Civil',   categoria: 'Certidao de Atos',  especie: 'Cert Registro Civil' },
];

// ─── Modal Cadastro Rápido ───────────────────────────────────
const LINHA_VAZIA = () => ({ numero: '', valor: '0,00', _id: Math.random() });

function ModalServicRapido({ usuarios, onSalvar, onClose, processos = [] }) {
  const { servicos, usuario } = useApp();
  const [modo, setModo]               = useState(null); // null | 'certidoes' | 'atos'
  const [categoriaAtos, setCategoriaAtos] = useState('');
  const [selecionado, setSelecionado] = useState(null);
  const [respId, setRespId]           = useState(usuario?.id || '');
  const [data, setData]               = useState(HOJE());
  const [concluido, setConcluido]     = useState(true);
  const [linhas, setLinhas]           = useState([LINHA_VAZIA(), LINHA_VAZIA(), LINHA_VAZIA()]);
  const [salvando, setSalvando]       = useState(false);
  const primeiroRef = useRef(null);

  const numExiste = (num) => num.trim() && processos.some(p => p.numero_interno.trim() === num.trim());

  useEffect(() => { primeiroRef.current?.focus(); }, []);

  // Serviços da categoria Certidão de Atos
  const certidoes = servicos.filter(s => s.categoria === 'Certidao de Atos' || s.categoria === 'Certidão de Atos');

  // Categorias excluindo Certidão de Atos e Reconhecimento de Firma
  const categoriasAtos = [...new Set(
    servicos
      .filter(s => s.categoria !== 'Certidao de Atos' && s.categoria !== 'Certidão de Atos' && s.categoria !== 'Reconhecimento de Firma')
      .map(s => s.categoria)
  )].sort();

  // Serviços da categoria selecionada
  const servicosDaCategoria = categoriaAtos
    ? servicos.filter(s => s.categoria === categoriaAtos)
    : [];

  const setLinha = (idx, k, v) => setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, [k]: v } : l));
  const addLinha = () => setLinhas(prev => [...prev, LINHA_VAZIA()]);
  const remLinha = (idx) => setLinhas(prev => prev.filter((_, i) => i !== idx));

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputs = document.querySelectorAll('.rapido-input');
      const curIdx = Array.from(inputs).indexOf(e.target);
      if (curIdx < inputs.length - 1) inputs[curIdx + 1].focus();
      else addLinha();
    }
  };

  const selecionarServico = (svc) => {
    setSelecionado({ label: svc.subcategoria, categoria: svc.categoria, especie: svc.subcategoria });
  };

  const salvar = async () => {
    if (!selecionado) { alert('Selecione um tipo de serviço'); return; }
    const validas = linhas.filter(l => l.numero.trim());
    if (validas.length === 0) { alert('Preencha ao menos um Nº Interno'); return; }
    // Verificar duplicados antes de salvar
    const duplicados = validas.filter(l => numExiste(l.numero)).map(l => l.numero.trim());
    if (duplicados.length > 0) {
      alert(`Nº duplicado(s): ${duplicados.join(', ')}.\nCorrija antes de salvar.`);
      return;
    }
    setSalvando(true);
    try {
      const dt = data || HOJE();
      await onSalvar(validas.map(l => ({
        numero_interno: l.numero.trim(),
        categoria:      selecionado.categoria,
        especie:        selecionado.especie,
        responsavel_id: respId || null,
        dt_abertura:    dt,
        dt_conclusao:   concluido ? dt : null,
        status:         concluido ? 'Concluído' : 'Em andamento',
        valor_ato:      parseBRL(l.valor),
        partes:         '[]',
        municipio:      'Paranatinga',
        obs:            '',
      })));
    } finally {
      setSalvando(false);
    }
  };

  const btnModo = (ativo) => ({
    flex: 1, padding: '14px 10px', cursor: 'pointer', borderRadius: 'var(--radius-md)',
    border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`,
    background: ativo ? 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))' : 'var(--color-surface-2)',
    color: ativo ? 'var(--color-accent)' : 'var(--color-text-muted)',
    fontSize: 14, fontWeight: ativo ? 700 : 400, textAlign: 'center',
    transition: 'all 0.12s', fontFamily: 'var(--font-sans)',
  });

  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">⚡ Cadastro Rápido</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Escolha do modo */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tipo de Serviço *</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnModo(modo === 'certidoes')} onClick={() => { setModo('certidoes'); setSelecionado(null); setCategoriaAtos(''); }}>
                📄 Certidões
              </button>
              <button style={btnModo(modo === 'atos')} onClick={() => { setModo('atos'); setSelecionado(null); setCategoriaAtos(''); }}>
                🏛 Outros Serviços
              </button>
            </div>
          </div>

          {/* Certidões — chips */}
          {modo === 'certidoes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {certidoes.map((svc, i) => {
                const ativo = selecionado?.especie === svc.subcategoria;
                return (
                  <button key={i} onClick={() => selecionarServico(svc)} style={{
                    padding: '9px 12px', textAlign: 'left', cursor: 'pointer',
                    background: ativo ? 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))' : 'var(--color-surface-2)',
                    border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)', color: ativo ? 'var(--color-text)' : 'var(--color-text-muted)',
                    fontSize: 13, fontWeight: ativo ? 600 : 400, display: 'flex', alignItems: 'center', gap: 8,
                    fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
                  }}>
                    <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`, background: ativo ? 'var(--color-accent)' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: '#fff' }}>
                      {ativo ? '✓' : ''}
                    </span>
                    {svc.subcategoria}
                  </button>
                );
              })}
            </div>
          )}

          {/* Outros serviços — categoria + serviço */}
          {modo === 'atos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Chips de categoria */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>Categoria</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {categoriasAtos.map(cat => {
                    const ativo = categoriaAtos === cat;
                    return (
                      <button key={cat} onClick={() => { setCategoriaAtos(cat); setSelecionado(null); }} style={{
                        padding: '6px 14px', cursor: 'pointer', borderRadius: 20,
                        border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: ativo ? 'color-mix(in srgb, var(--color-accent) 12%, var(--color-surface))' : 'var(--color-surface-2)',
                        color: ativo ? 'var(--color-accent)' : 'var(--color-text-muted)',
                        fontSize: 13, fontWeight: ativo ? 700 : 400,
                        fontFamily: 'var(--font-sans)', transition: 'all 0.12s',
                      }}>{cat}</button>
                    );
                  })}
                </div>
              </div>

              {/* Select de serviço */}
              {categoriaAtos && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Serviço</label>
                  <select className="form-select" value={selecionado?.especie || ''} onChange={e => {
                    const svc = servicosDaCategoria.find(s => s.subcategoria === e.target.value);
                    if (svc) selecionarServico(svc);
                  }}>
                    <option value="">— Selecione o serviço —</option>
                    {servicosDaCategoria.map(svc => (
                      <option key={svc.id || svc.subcategoria} value={svc.subcategoria}>{svc.subcategoria}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Serviço selecionado — confirmação visual */}
          {selecionado && (
            <div style={{ padding: '8px 12px', background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))', borderRadius: 'var(--radius-md)', border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)', fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>
              ✓ {selecionado.categoria} — {selecionado.especie}
            </div>
          )}

          {/* Responsável + Concluído + Data */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Responsável</label>
                <select className="form-select" value={respId} onChange={e => setRespId(e.target.value)}>
                  <option value="">—</option>
                  {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
                </select>
              </div>
              {/* Toggle Concluído */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <div onClick={() => setConcluido(c => !c)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '8px 14px', borderRadius: 'var(--radius-md)', height: 36,
                  border: `2px solid ${concluido ? 'var(--color-success)' : 'var(--color-border)'}`,
                  background: concluido ? 'color-mix(in srgb, var(--color-success) 10%, var(--color-surface))' : 'var(--color-surface-2)',
                  userSelect: 'none',
                }}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: concluido ? 'var(--color-success)' : 'var(--color-surface-3)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: concluido ? 18 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: concluido ? 'var(--color-success)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {concluido ? 'Concluído' : 'Em andamento'}
                  </span>
                </div>
              </div>
            </div>

            {/* Data — só aparece se concluído */}
            {concluido && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data de conclusão</label>
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
            )}
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
                    style={{ fontSize: 13, borderColor: numExiste(l.numero) ? '#ef4444' : undefined, outline: numExiste(l.numero) ? '1px solid #ef4444' : undefined }}
                    title={numExiste(l.numero) ? '⚠ Número já cadastrado!' : ''}
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
            {concluido ? 'Status: Concluído · Dt. Abertura = Dt. Conclusão' : 'Status: Em andamento · Sem data de conclusão'} · Enter avança entre campos
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={salvando}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
            {salvando ? '⏳ Salvando...' : '✓ Salvar Todos'}
          </button>
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
    servicos, usuarios, interessados, addInteressado, addToast, usuario,
  } = useApp();

  const [editingId, setEditingId]       = useState(null);
  const [editRow, setEditRow]           = useState({});
  const [newRow, setNewRow]             = useState(null);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [modalNovoInt, setModalNovoInt] = useState(null);
  const [modalRapido, setModalRapido]   = useState(false);
  const [modalDiag, setModalDiag]       = useState(false);
  const [processoDetalhe, setProcessoDetalhe] = useState(null);
  const [busca, setBusca]               = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroResp, setFiltroResp]     = useState('');
  const [filtroCateg, setFiltroCateg]   = useState('');
  const [limite, setLimite]             = useState(30);
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
  const listaLimitada = limite === 'todos' ? lista : lista.slice(0, limite);

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

  // Verifica se número já existe
  const numeroExiste = (num) => processos.some(p => p.numero_interno.trim() === num.trim());

  const saveNewRow = async () => {
    if (!newRow.numero_interno) { addToast('Número interno é obrigatório.', 'error'); return; }
    if (salvandoNovo) return;
    const num = newRow.numero_interno.trim();
    if (numeroExiste(num)) {
      addToast(`Nº ${num} já existe! Verifique antes de cadastrar.`, 'error');
      return;
    }
    setSalvandoNovo(true);
    const { _sel, ...rest } = newRow;
    await addProcesso({ ...rest, numero_interno: num, quantidade: parseInt(rest.quantidade || 1), partes: serializarPartes(_sel) });
    setSalvandoNovo(false);
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
    const duplicados = lista.filter(d => numeroExiste(d.numero_interno.trim())).map(d => d.numero_interno.trim());
    if (duplicados.length > 0) {
      addToast(`Nº duplicado(s): ${duplicados.join(', ')}. Corrija antes de salvar.`, 'error');
      return;
    }
    let salvos = 0;
    for (const dados of lista) {
      await addProcesso({ ...dados, numero_interno: dados.numero_interno.trim(), quantidade: 1 });
      salvos++;
    }
    setModalRapido(false);
    if (salvos > 0) addToast(`${salvos} processo(s) registrado(s)!`, 'success');
  };

  const STATUS_CONF = {
    'Em andamento': { cor: 'var(--color-warning)', sigla: 'EA' },
    'Devolvido':    { cor: 'var(--color-danger)',  sigla: 'DV' },
    'Em reanálise': { cor: '#a78bfa',              sigla: 'RA' },
    'Concluído':    { cor: 'var(--color-success)', sigla: 'CO' },
    'Encerrado':    { cor: '#64748b',              sigla: 'EN' },
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
          <div className="page-sub">{lista.reduce((s,p)=>s+parseInt(p.quantidade||1),0)} serviço(s) · {processos.filter(p => STATUS_PENDENTES.includes(p.status)).reduce((s,p)=>s+parseInt(p.quantidade||1),0)} pendentes</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setModalRapido(true)}>⚡ Cadastro Rápido</button>
          <button className="btn btn-secondary" style={{ color: 'var(--color-warning)', borderColor: 'var(--color-warning)' }} onClick={() => setModalDiag(true)}>⚠ Diagnóstico</button>
          <button className="btn btn-primary" onClick={() => setNewRow({ ...EMPTY_ROW, responsavel_id: usuario?.id || null })}>+ Novo Processo</button>
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
        {lista.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Exibindo {listaLimitada.length} de {lista.length}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Linhas:</span>
              {[30, 40, 'todos'].map(v => (
                <button key={v} className={`btn btn-sm ${limite === v ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setLimite(v)} style={{ minWidth: 36, fontSize: 11 }}>
                  {v === 'todos' ? 'Todos' : v}
                </button>
              ))}
            </div>
          </div>
        )}
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
              <th style={{ width: 45 }}>Qtd</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ width: 75 }}>Conclusão</th>
              <th style={{ width: 75 }}></th>
            </tr>
          </thead>
          <tbody>
            {/* Nova linha */}
            {newRow && (
              <tr className="row-editing">
                <td><input ref={numRef} className="td-input" value={newRow.numero_interno} onChange={e => setNR('numero_interno', e.target.value)} placeholder="Nº *" style={{ width: 70, borderColor: newRow.numero_interno && numeroExiste(newRow.numero_interno.trim()) ? '#ef4444' : undefined, outline: newRow.numero_interno && numeroExiste(newRow.numero_interno.trim()) ? '1px solid #ef4444' : undefined }} title={newRow.numero_interno && numeroExiste(newRow.numero_interno.trim()) ? '⚠ Número já cadastrado!' : ''} /></td>
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
                <td><input className="td-input" type="number" min="1" value={newRow.quantidade || 1} onChange={e => setNR('quantidade', parseInt(e.target.value)||1)} style={{ width: 40, textAlign: 'center' }} title="Quantidade de serviços" /></td>
                <td><select className="td-select" value={newRow.status} onChange={e => { setNR('status', e.target.value); if (e.target.value === 'Concluído') setNR('dt_conclusao', HOJE()); }} style={{ width: 105 }}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select></td>
                <td><input className="td-input" type="date" value={newRow.dt_conclusao} onChange={e => setNR('dt_conclusao', e.target.value)} style={{ width: 90 }} /></td>
                <td><div style={{ display: 'flex', gap: 3 }}>
                  <button className="btn btn-primary btn-sm" onClick={saveNewRow} disabled={salvandoNovo} title="Salvar processo">
                    {salvandoNovo ? '⏳' : '✓'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setNewRow(null)} disabled={salvandoNovo}>✕</button>
                </div></td>
              </tr>
            )}

            {lista.length === 0 && !newRow && (
              <tr><td colSpan={11}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">Nenhum processo encontrado</div></div></td></tr>
            )}

            {listaLimitada.map(p => editingId === p.id ? (
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
                <td><input className="td-input" type="number" min="1" value={editRow.quantidade || 1} onChange={e => setEd('quantidade', parseInt(e.target.value)||1)} style={{ width: 40, textAlign: 'center' }} title="Quantidade de serviços" /></td>
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
              <tr key={p.id} style={{ opacity: ['Concluído','Encerrado'].includes(p.status) ? 0.75 : 1, cursor: 'pointer' }} onClick={() => setProcessoDetalhe(p)}>
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
                <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {(p.quantidade || 1) > 1
                    ? <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{p.quantidade}</span>
                    : <span style={{ color: 'var(--color-text-faint)' }}>1</span>
                  }
                </td>
                <td>{statusBadge(p.status)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(p.dt_conclusao) || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    {STATUS_PENDENTES.includes(p.status) && (
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

      {modalRapido && <ModalServicRapido usuarios={usuarios} processos={processos} onSalvar={handleSalvarRapido} onClose={() => setModalRapido(false)} />}
      {modalNovoInt && <ModalInteressado nomeInicial={modalNovoInt.nome} onSalvar={handleSalvarInteressado} onClose={() => setModalNovoInt(null)} />}

      {/* Modal Diagnóstico de Inconsistências */}
      {modalDiag && (() => {
        const comDataSemConcluido = processos.filter(p =>
          p.dt_conclusao && p.status !== 'Concluído'
        );
        const concluidoSemData = processos.filter(p =>
          p.status === 'Concluído' && !p.dt_conclusao
        );
        const comValorSemConcluido = processos.filter(p =>
          p.valor_ato > 0 && p.status === 'Concluído' && !p.dt_conclusao
        );
        const total = comDataSemConcluido.length + concluidoSemData.length;
        const fmtBRL2 = (v) => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
        const fmtDt = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

        const Secao = ({ titulo, cor, items, colunas }) => items.length === 0 ? null : (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: cor, display: 'inline-block' }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{titulo}</span>
              <span style={{ fontSize: 11, background: cor + '22', color: cor, borderRadius: 10, padding: '1px 8px', fontWeight: 700 }}>{items.length}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  {colunas.map(c => <th key={c} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>{c}</th>)}
                  <th style={{ padding: '6px 10px', borderBottom: '1px solid var(--color-border)' }} />
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => (
                  <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{p.numero_interno}</td>
                    <td style={{ padding: '7px 10px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.especie}</td>
                    <td style={{ padding: '7px 10px' }}><span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: p.status === 'Concluído' ? '#dcfce7' : '#fee2e2', color: p.status === 'Concluído' ? '#15803d' : '#dc2626' }}>{p.status}</span></td>
                    <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtDt(p.dt_conclusao)}</td>
                    <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-accent)' }}>{fmtBRL2(p.valor_ato)}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <button className="btn-icon btn-sm" title="Ver processo" onClick={() => { setProcessoDetalhe(p); setModalDiag(false); }}>↗</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

        return (
          <Portal>
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalDiag(false)}>
              <div className="modal" style={{ maxWidth: 780 }}>
                <div className="modal-header">
                  <span className="modal-title">⚠ Diagnóstico de Inconsistências</span>
                  <button className="btn-icon" onClick={() => setModalDiag(false)}>✕</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                  {total === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Nenhuma inconsistência encontrada!</div>
                      <div style={{ fontSize: 13, marginTop: 6 }}>Todos os processos estão com status e datas consistentes.</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ padding: '10px 14px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 'var(--radius-md)', marginBottom: 20, fontSize: 12, color: '#92400e' }}>
                        <strong>⚠ {total} inconsistência(s) encontrada(s).</strong> Clique em ↗ para abrir o processo e corrigir.
                      </div>
                      <Secao
                        titulo="Com data de conclusão mas status ≠ Concluído"
                        cor="#ef4444"
                        items={comDataSemConcluido}
                        colunas={['Nº Interno', 'Espécie', 'Status', 'Dt. Conclusão', 'Valor']}
                      />
                      <Secao
                        titulo="Status Concluído mas sem data de conclusão"
                        cor="#f97316"
                        items={concluidoSemData}
                        colunas={['Nº Interno', 'Espécie', 'Status', 'Dt. Conclusão', 'Valor']}
                      />
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setModalDiag(false)}>Fechar</button>
                </div>
              </div>
            </div>
          </Portal>
        );
      })()}
      {processoDetalhe && (
        <ProcessoDetalhe
          processo={processoDetalhe}
          onClose={() => setProcessoDetalhe(null)}
        />
      )}
    </div>
  );
}
