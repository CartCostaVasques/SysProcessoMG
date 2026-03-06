import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Portal from '../ui/Portal.jsx';

const EMPTY = { descricao: '', valor: '', dt_recibo: new Date().toISOString().slice(0,10), numero_os: '', obs: '' };

const fmtValor = (v) => v || v === 0
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))
  : '—';

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

// ── Modal cadastro/edição de recibo ─────────────────────────
function ModalRecibo({ recibo, nomeCliente, onClose, onSave }) {
  const [form, setForm] = useState(recibo ? { ...recibo } : { ...EMPTY });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const salvar = () => {
    if (!form.descricao.trim()) { alert('Descrição obrigatória.'); return; }
    const valor = parseFloat(String(form.valor).replace(',', '.'));
    if (isNaN(valor) || valor <= 0) { alert('Informe um valor válido.'); return; }
    onSave({ ...form, valor });
  };

  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">{recibo?.id ? '✎ Editar Recibo' : '＋ Novo Recibo'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
            Cliente: <strong>{nomeCliente}</strong>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input className="form-input" type="date" value={form.dt_recibo} onChange={e => set('dt_recibo', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nº OS / Processo</label>
              <input className="form-input" value={form.numero_os||''} onChange={e => set('numero_os', e.target.value)} placeholder="Ex: 000123" />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Descrição *</label>
              <input className="form-input" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Reconhecimento de Firma, Escritura de C&V..." autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Valor (R$) *</label>
              <input className="form-input" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Observações</label>
              <textarea className="form-input" rows={2} value={form.obs||''} onChange={e => set('obs', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar}>✓ Salvar</button>
        </div>
      </div>
    </div></Portal>
  );
}

// ── Modal impressão ──────────────────────────────────────────
function ModalImpressao({ recibo, interessado, cartorio, onClose }) {
  const printRef = useRef();

  const imprimir = () => {
    const html = printRef.current.innerHTML;
    const w = window.open('', '_blank', 'width=820,height=640');
    w.document.write(`<!DOCTYPE html><html><head><title>Recibo</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;font-size:12px;color:#000;background:#fff}
      .via{width:100%;padding:12mm 16mm;page-break-inside:avoid}
      .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:14px}
      .header h1{font-size:14px;font-weight:bold;text-transform:uppercase}
      .header p{font-size:10px;color:#444;margin-top:3px}
      .titulo{text-align:center;font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:12px 0}
      .num{text-align:right;font-size:10px;color:#666;margin-bottom:14px}
      .campo{display:flex;gap:8px;margin-bottom:8px;align-items:baseline}
      .campo b{min-width:120px;white-space:nowrap}
      .campo span{flex:1;border-bottom:1px solid #000;padding-bottom:1px;min-height:16px}
      .vbox{text-align:center;margin:16px 0}
      .vdest{display:inline-block;border:2px solid #000;padding:8px 24px;font-size:20px;font-weight:bold;letter-spacing:1px}
      .assin{display:flex;justify-content:space-between;margin-top:36px}
      .assin div{text-align:center}
      .assin div p{border-top:1px solid #000;padding-top:5px;font-size:10px;min-width:180px}
      .rodape{margin-top:16px;text-align:center;font-size:9px;color:#888;border-top:1px solid #ddd;padding-top:6px}
      .sep{border:none;border-top:1px dashed #aaa;margin:6mm 0;text-align:center;font-size:9px;color:#aaa}
      @media print{body{margin:0}}
    </style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 350);
  };

  const via = (n) => `
    <div class="via">
      <div class="header">
        ${cartorio.logo_url ? `<img src="${cartorio.logo_url}" style="height:44px;margin-bottom:5px"/>` : ''}
        <h1>${cartorio.nome||'Cartório'}</h1>
        <p>${[cartorio.endereco, cartorio.cidade, cartorio.telefone].filter(Boolean).join(' &bull; ')}</p>
      </div>
      <div class="titulo">Recibo de Pagamento de Emolumentos</div>
      <div class="num">${n}ª Via &nbsp;|&nbsp; Nº ${String(recibo.id||0).padStart(6,'0')}</div>
      <div class="campo"><b>Recebi de:</b><span>${interessado?.nome||'—'}</span></div>
      <div class="campo"><b>CPF/CNPJ:</b><span>${interessado?.cpf||'—'}</span></div>
      ${recibo.numero_os ? `<div class="campo"><b>Nº OS/Processo:</b><span>${recibo.numero_os}</span></div>` : ''}
      <div class="campo"><b>Referente a:</b><span>${recibo.descricao}</span></div>
      ${recibo.obs ? `<div class="campo"><b>Observações:</b><span>${recibo.obs}</span></div>` : ''}
      <div class="vbox"><div class="vdest">${fmtValor(recibo.valor)}</div></div>
      <div class="assin">
        <div><p>${cartorio.cidade||''},&nbsp;${fmtData(recibo.dt_recibo)}</p></div>
        <div><p>${cartorio.nome||'Cartório'}</p></div>
      </div>
      <div class="rodape">${cartorio.nome||''} ${cartorio.cidade ? '— '+cartorio.cidade : ''}</div>
    </div>`;

  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <span className="modal-title">🖨 Imprimir Recibo</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {/* conteúdo oculto para impressão */}
          <div ref={printRef} style={{ display: 'none' }}
            dangerouslySetInnerHTML={{ __html: via(1) + `<hr class="sep"/>` + via(2) }} />

          {/* preview */}
          <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{cartorio.nome}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{[cartorio.endereco, cartorio.cidade].filter(Boolean).join(' • ')}</div>
              <div style={{ fontWeight: 700, marginTop: 10, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Recibo de Pagamento de Emolumentos</div>
            </div>
            {[
              ['Recebi de', interessado?.nome],
              ['CPF/CNPJ',  interessado?.cpf],
              recibo.numero_os && ['Nº OS/Processo', recibo.numero_os],
              ['Referente a', recibo.descricao],
              recibo.obs && ['Observações', recibo.obs],
            ].filter(Boolean).map(([l, v]) => (
              <div key={l} style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginBottom: 8, fontSize: 13 }}>
                <span style={{ fontWeight: 600, minWidth: 120, fontSize: 12 }}>{l}:</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{v||'—'}</span>
              </div>
            ))}
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <div style={{ display: 'inline-block', border: '2px solid var(--color-border)', padding: '8px 24px', borderRadius: 8, fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {fmtValor(recibo.valor)}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
              <span>{cartorio.cidade}, {fmtData(recibo.dt_recibo)}</span>
              <span>{cartorio.nome}</span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
          <button className="btn btn-primary" onClick={imprimir}>🖨 Imprimir (1ª e 2ª Via)</button>
        </div>
      </div>
    </div></Portal>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function Recibos() {
  const { interessados, addInteressado, addToast, cartorio, usuario, supabaseClient } = useApp();

  const [recibos,        setRecibos]        = useState([]);
  const [carregando,     setCarregando]      = useState(false);
  const [clienteSel,     setClienteSel]      = useState(null);
  const [busca,          setBusca]           = useState('');
  const [buscaCliente,   setBuscaCliente]    = useState('');
  const [dropdown,       setDropdown]        = useState(false);
  const [modalRecibo,    setModalRecibo]     = useState(null); // null | 'novo' | objeto
  const [modalImpr,      setModalImpr]       = useState(null);
  const [showNovo,       setShowNovo]        = useState(false);
  const [novoForm,       setNovoForm]        = useState({ nome: '', cpf: '' });

  const sb = supabaseClient;

  // Interessados filtrados no dropdown
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return interessados.slice(0, 8);
    const q = buscaCliente.toLowerCase();
    return interessados.filter(i => i.nome.toLowerCase().includes(q) || (i.cpf||'').includes(q)).slice(0, 10);
  }, [buscaCliente, interessados]);

  // Recibos filtrados
  const recibosFiltrados = useMemo(() => {
    if (!busca.trim()) return recibos;
    const q = busca.toLowerCase();
    return recibos.filter(r => (r.descricao||'').toLowerCase().includes(q) || (r.numero_os||'').toLowerCase().includes(q));
  }, [busca, recibos]);

  const total = useMemo(() => recibos.reduce((s, r) => s + Number(r.valor||0), 0), [recibos]);

  const carregarRecibos = async (intId) => {
    if (!sb) return;
    setCarregando(true);
    try {
      const { data } = await sb.from('recibos').select('*').eq('interessado_id', intId).order('dt_recibo', { ascending: false });
      if (data) setRecibos(data);
    } catch(e) { console.error(e); }
    setCarregando(false);
  };

  const selecionarCliente = (int) => {
    setClienteSel(int);
    setBuscaCliente(int.nome);
    setDropdown(false);
    setBusca('');
    carregarRecibos(int.id);
  };

  const limparCliente = () => {
    setClienteSel(null);
    setBuscaCliente('');
    setRecibos([]);
  };

  const salvarRecibo = async (form) => {
    if (!sb) { addToast('Erro: conexão não disponível.', 'error'); return; }
    try {
      if (form.id) {
        const { data, error } = await sb.from('recibos').update({ ...form, interessado_id: clienteSel.id }).eq('id', form.id).select().single();
        if (error) throw error;
        setRecibos(p => p.map(r => r.id === form.id ? data : r));
        addToast('Recibo atualizado!', 'success');
      } else {
        const { data, error } = await sb.from('recibos').insert({ ...form, interessado_id: clienteSel.id, criado_por: usuario?.id }).select().single();
        if (error) throw error;
        setRecibos(p => [data, ...p]);
        addToast('Recibo registrado!', 'success');
      }
      setModalRecibo(null);
    } catch(e) { addToast(e.message, 'error'); }
  };

  const deletarRecibo = async (id) => {
    if (!sb || !window.confirm('Remover este recibo?')) return;
    try {
      await sb.from('recibos').delete().eq('id', id);
      setRecibos(p => p.filter(r => r.id !== id));
      addToast('Recibo removido.', 'info');
    } catch(e) { addToast(e.message, 'error'); }
  };

  const cadastrarNovoCliente = async () => {
    if (!novoForm.nome.trim()) { addToast('Nome obrigatório.', 'error'); return; }
    const novo = await addInteressado({ nome: novoForm.nome.trim(), cpf: novoForm.cpf.trim() });
    if (novo) {
      selecionarCliente(novo);
      setShowNovo(false);
      setNovoForm({ nome: '', cpf: '' });
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Recibos de Emolumentos</div>
          <div className="page-sub">Emissão e histórico de recibos por cliente</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Painel esquerdo: seleção de cliente ── */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'visible' }}>
            <div className="card-header"><div className="card-title">👤 Cliente</div></div>
            <div style={{ padding: '0 14px 14px' }}>

              {/* Busca autocomplete */}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input className="form-input" placeholder="Buscar pelo nome ou CPF..."
                  value={buscaCliente}
                  onChange={e => { setBuscaCliente(e.target.value); setDropdown(true); if (!e.target.value) limparCliente(); }}
                  onFocus={() => setDropdown(true)}
                  onBlur={() => setTimeout(() => setDropdown(false), 180)}
                  style={{ paddingRight: 34 }}
                />
                {buscaCliente && (
                  <button onClick={limparCliente} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                )}
                {dropdown && buscaCliente && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', maxHeight: 220, overflowY: 'auto' }}>
                    {clientesFiltrados.length === 0
                      ? <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>Nenhum resultado</div>
                      : clientesFiltrados.map(i => (
                        <div key={i.id} onMouseDown={() => selecionarCliente(i)}
                          style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <div style={{ fontWeight: 600 }}>{i.nome}</div>
                          {i.cpf && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{i.cpf}</div>}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Cadastrar novo */}
              {!showNovo
                ? <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, width: '100%' }} onClick={() => setShowNovo(true)}>＋ Novo cliente</button>
                : <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-muted)' }}>Cadastrar novo</div>
                    <input className="form-input" placeholder="Nome completo *" value={novoForm.nome} onChange={e => setNovoForm(p => ({ ...p, nome: e.target.value }))} style={{ marginBottom: 6, fontSize: 13 }} />
                    <input className="form-input" placeholder="CPF/CNPJ" value={novoForm.cpf} onChange={e => setNovoForm(p => ({ ...p, cpf: e.target.value }))} style={{ marginBottom: 8, fontSize: 13 }} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={cadastrarNovoCliente}>Cadastrar</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setShowNovo(false)}>✕</button>
                    </div>
                  </div>
              }

              {/* Card do cliente selecionado */}
              {clienteSel && (
                <div style={{ marginTop: 14, padding: 12, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-accent)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{clienteSel.nome}</div>
                  {clienteSel.cpf      && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>CPF: {clienteSel.cpf}</div>}
                  {clienteSel.telefone && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Tel: {clienteSel.telefone}</div>}
                  {clienteSel.cidade   && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{clienteSel.cidade}</div>}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{recibos.length} recibo(s)</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{fmtValor(total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Painel direito: recibos ── */}
        <div>
          {!clienteSel ? (
            <div className="card" style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--color-text-faint)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🧾</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Selecione um cliente</div>
              <div style={{ fontSize: 13 }}>Busque pelo nome ou CPF para ver o histórico de recibos</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">🧾 {clienteSel.nome}</div>
                <button className="btn btn-primary btn-sm" onClick={() => setModalRecibo('novo')}>＋ Novo Recibo</button>
              </div>
              <div style={{ padding: '0 14px 12px' }}>
                <input className="form-input" placeholder="Buscar por descrição ou OS..." value={busca} onChange={e => setBusca(e.target.value)} style={{ fontSize: 13 }} />
              </div>
              <div className="table-wrapper">
                <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                  <colgroup>
                    <col style={{ width: 90 }} /><col style={{ width: 95 }} /><col /><col style={{ width: 115 }} /><col style={{ width: 80 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Nº OS</th><th>Data</th><th>Descrição</th>
                      <th style={{ textAlign: 'right' }}>Valor</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregando ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--color-text-faint)' }}>Carregando...</td></tr>
                    ) : recibosFiltrados.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 28, color: 'var(--color-text-faint)' }}>
                        {busca ? 'Nenhum resultado.' : 'Nenhum recibo para este cliente.'}
                      </td></tr>
                    ) : recibosFiltrados.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{r.numero_os||'—'}</td>
                        <td style={{ fontSize: 12 }}>{fmtData(r.dt_recibo)}</td>
                        <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.descricao}>{r.descricao}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>{fmtValor(r.valor)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button className="btn-icon btn-sm" title="Imprimir" onClick={() => setModalImpr(r)}>🖨</button>
                            <button className="btn-icon btn-sm" title="Editar"   onClick={() => setModalRecibo(r)}>✎</button>
                            <button className="btn-icon btn-sm" title="Remover"  onClick={() => deletarRecibo(r.id)} style={{ color: 'var(--color-danger)' }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {recibos.length > 0 && (
                    <tfoot>
                      <tr style={{ background: 'var(--color-surface-2)', fontWeight: 700 }}>
                        <td colSpan={3} style={{ padding: '8px 10px', fontSize: 12 }}>Total — {recibos.length} recibo(s)</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px' }}>{fmtValor(total)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalRecibo && (
        <ModalRecibo
          recibo={modalRecibo === 'novo' ? null : modalRecibo}
          nomeCliente={clienteSel?.nome}
          onClose={() => setModalRecibo(null)}
          onSave={salvarRecibo}
        />
      )}
      {modalImpr && (
        <ModalImpressao
          recibo={modalImpr}
          interessado={clienteSel}
          cartorio={cartorio}
          onClose={() => setModalImpr(null)}
        />
      )}
    </div>
  );
}
