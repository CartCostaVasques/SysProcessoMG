import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Portal from '../layout/Portal.jsx';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TIPOS = ['Cliente','Colaborador','Fornecedor','Outros'];
const TIPO_COLORS = {
  'Colaborador': { bg: '#dbeafe', color: '#1e40af' },
  'Fornecedor':  { bg: '#dcfce7', color: '#15803d' },
  'Outros':      { bg: '#f3f4f6', color: '#6b7280' },
  'Cliente':     { bg: '#fef9c3', color: '#854d0e' },
};
const TipoBadge = ({ tipo }) => {
  const s = TIPO_COLORS[tipo] || TIPO_COLORS['Cliente'];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.color }}>{tipo||'Cliente'}</span>;
};

const EMPTY = {
  descricao: '', valor: '',
  dt_recibo: new Date().toISOString().slice(0,10),
  numero_os: '', obs: '',
  primeira_via: true, segunda_via: false, recibo_futuro: false,
};

const fmtValor = (v) => (v || v === 0)
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v))
  : '—';

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

function valorPorExtenso(valor) {
  if (!valor || isNaN(valor)) return '';
  const n = Math.abs(Number(valor));
  const inteiro = Math.floor(n);
  const centavos = Math.round((n - inteiro) * 100);
  const unidades = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez',
    'onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
  const dezenas  = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
  const centenas = ['','cem','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
  function grupo(n) {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    let s = '';
    const c = Math.floor(n / 100), r = n % 100;
    if (c) s += centenas[c];
    if (c && r) s += ' e ';
    if (r < 20) s += unidades[r];
    else { const d = Math.floor(r/10), u = r%10; s += dezenas[d]; if (u) s += ' e ' + unidades[u]; }
    return s;
  }
  function porExtenso(n) {
    if (n === 0) return 'zero';
    const bi = Math.floor(n/1e9), mi = Math.floor((n%1e9)/1e6), mil = Math.floor((n%1e6)/1e3), resto = n%1e3;
    const p = [];
    if (bi)    p.push(grupo(bi)    + (bi    === 1 ? ' bilhão'  : ' bilhões'));
    if (mi)    p.push(grupo(mi)    + (mi    === 1 ? ' milhão'  : ' milhões'));
    if (mil)   p.push(grupo(mil)   + (mil   === 1 ? ' mil'     : ' mil'));
    if (resto) p.push(grupo(resto));
    return p.join(' e ');
  }
  let r = '';
  if (inteiro > 0)              r += porExtenso(inteiro)   + (inteiro   === 1 ? ' real'     : ' reais');
  if (inteiro > 0 && centavos > 0) r += ' e ';
  if (centavos > 0)             r += porExtenso(centavos)  + (centavos  === 1 ? ' centavo'  : ' centavos');
  return r.charAt(0).toUpperCase() + r.slice(1);
}

function imprimirRecibo(recibo, interessado, cartorio) {
  const logo = cartorio.logo_url || '';
  const nomeCart = cartorio.nome || 'Cartório';
  const cidade   = cartorio.cidade || '';
  const dtRecibo = fmtData(recibo.dt_recibo);
  const numRecibo = String(recibo.id || 0).padStart(6, '0');
  const valorNum  = fmtValor(recibo.valor);
  const valorExt  = valorPorExtenso(recibo.valor);

  const vias = [];
  if (recibo.primeira_via)  vias.push('1ª Via — Cartório');
  if (recibo.segunda_via)   vias.push('2ª Via — Cliente');
  if (recibo.recibo_futuro) vias.push('Recibo para Pagamento Futuro');
  if (vias.length === 0)    vias.push('1ª Via');

  const viaHtml = (label) => `
    <div class="via">
      <div class="cab">
        <div class="logo-box">${logo ? `<img src="${logo}" alt="Logo">` : '<span style="font-size:9px;color:#aaa">Logo</span>'}</div>
        <div class="cab-info">
          <div class="cab-nome">${nomeCart}</div>
          <div class="cab-sub">${[cartorio.endereco, cidade].filter(Boolean).join(' — ')}<br>${[cartorio.telefone, cartorio.email].filter(Boolean).join(' · ')}</div>
        </div>
        <div class="via-label">${label}</div>
      </div>
      <div class="titulo-recibo">Recibo de Pagamento de Emolumentos</div>
      <div class="num-recibo">Nº ${numRecibo} &nbsp;|&nbsp; ${dtRecibo}</div>
      <div class="campo"><b>Recebi de:</b><span>${interessado?.nome || '—'}</span></div>
      <div class="campo"><b>CPF/CNPJ:</b><span>${interessado?.cpf || '—'}</span></div>
      ${recibo.numero_os ? `<div class="campo"><b>Nº Interno/OS:</b><span>${recibo.numero_os}</span></div>` : ''}
      <div class="campo"><b>Referente a:</b><span>${recibo.descricao}</span></div>
      ${recibo.obs ? `<div class="campo"><b>Observações:</b><span>${recibo.obs}</span></div>` : ''}
      <div class="valor-bloco">
        <div class="valor-num">${valorNum}</div>
        <div class="valor-ext">${valorExt}</div>
      </div>
      <div class="assin">
        <div><div class="linha-assin">${cidade}, ${dtRecibo}</div><div class="label-assin">Local e Data</div></div>
        <div><div class="linha-assin">&nbsp;</div><div class="label-assin">${nomeCart}</div></div>
      </div>
      <div class="rodape">${nomeCart}${cidade ? ' — ' + cidade : ''}</div>
    </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo ${numRecibo}</title>
<style>
  @page{size:A4 portrait;margin:10mm 14mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:12px;color:#000;background:#fff}
  .via{padding:6mm 0;page-break-inside:avoid}
  .cab{display:flex;align-items:center;gap:12px;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:10px}
  .logo-box{width:68px;height:52px;border:1px solid #bbb;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}
  .logo-box img{max-width:100%;max-height:100%;object-fit:contain}
  .cab-info{flex:1;text-align:center}
  .cab-nome{font-size:14px;font-weight:bold;margin-bottom:2px}
  .cab-sub{font-size:10px;color:#444;line-height:1.5}
  .via-label{font-size:10px;font-weight:bold;color:#555;white-space:nowrap;text-align:right;min-width:130px}
  .titulo-recibo{text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin:10px 0 4px}
  .num-recibo{text-align:center;font-size:10px;color:#666;margin-bottom:12px}
  .campo{display:flex;gap:8px;margin-bottom:7px;align-items:baseline;font-size:12px}
  .campo b{min-width:120px;white-space:nowrap;font-size:11px}
  .campo span{flex:1;border-bottom:1px solid #000;padding-bottom:1px;min-height:15px}
  .valor-bloco{text-align:center;margin:14px 0 10px}
  .valor-num{display:inline-block;border:2px solid #000;padding:7px 28px;font-size:20px;font-weight:bold;letter-spacing:1px;margin-bottom:4px}
  .valor-ext{font-size:11px;font-style:italic;color:#333}
  .assin{display:flex;justify-content:space-between;margin-top:28px;padding:0 20px}
  .assin>div{text-align:center}
  .linha-assin{border-top:1px solid #000;padding-top:5px;min-width:180px;font-size:11px;min-height:22px}
  .label-assin{font-size:10px;color:#555;margin-top:2px}
  .rodape{margin-top:10px;text-align:center;font-size:9px;color:#888;border-top:1px solid #ddd;padding-top:5px}
  .sep{border:none;border-top:1px dashed #aaa;margin:4mm 0}
  @media print{body{margin:0}}
</style></head><body>
${vias.map((v, i) => viaHtml(v) + (i < vias.length - 1 ? '<hr class="sep">' : '')).join('')}
</body></html>`;

  const w = window.open('', '_blank', 'width=860,height=1100');
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}

// ── Modal novo/editar ────────────────────────────────────────
function ModalRecibo({ recibo, nomeCliente, onClose, onSave }) {
  const [form, setForm] = useState(recibo ? { ...recibo } : { ...EMPTY });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const osRef = useRef();

  useEffect(() => { setTimeout(() => osRef.current?.focus(), 80); }, []);

  const salvar = () => {
    if (!form.descricao.trim()) { alert('Descrição obrigatória.'); return; }
    const valor = parseFloat(String(form.valor).replace(',', '.'));
    if (isNaN(valor) || valor <= 0) { alert('Informe um valor válido.'); return; }
    onSave({ ...form, valor });
  };

  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
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
              <label className="form-label">Nº Interno / OS</label>
              <input ref={osRef} className="form-input" value={form.numero_os||''} onChange={e => set('numero_os', e.target.value)} placeholder="Ex: 000123" />
            </div>
            <div className="form-group">
              <label className="form-label">Data *</label>
              <input className="form-input" type="date" value={form.dt_recibo} onChange={e => set('dt_recibo', e.target.value)} />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Descrição *</label>
              <input className="form-input" value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Reconhecimento de Firma, Escritura de C&V..." />
            </div>
            <div className="form-group">
              <label className="form-label">Valor (R$) *</label>
              <input className="form-input" value={form.valor} onChange={e => set('valor', e.target.value)} placeholder="0,00" style={{ fontFamily: 'var(--font-mono)' }} />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Observações</label>
              <textarea className="form-input" rows={2} value={form.obs||''} onChange={e => set('obs', e.target.value)} style={{ resize: 'vertical' }} />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Vias para impressão</label>
              <div style={{ display: 'flex', gap: 20, marginTop: 4, flexWrap: 'wrap' }}>
                {[['primeira_via','1ª Via (Cartório)'],['segunda_via','2ª Via (Cliente)'],['recibo_futuro','Recibo Futuro']].map(([key, label]) => (
                  <label key={key} className="checkbox-wrapper" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!form[key]} onChange={e => set(key, e.target.checked)} />
                    <div className="checkbox-box">{form[key] && <span style={{ fontSize: 9, color: 'var(--color-bg)', fontWeight: 800 }}>✓</span>}</div>
                    <span className="checkbox-label">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={salvar}>✓ Salvar e Imprimir</button>
        </div>
      </div>
    </div></Portal>
  );
}

// ── Tabela reutilizável ──────────────────────────────────────
function TabelaRecibos({ recibos, total, totalCount, carregando, busca, onEditar, onImprimir, onDeletar, mostrarCliente }) {
  const cols = mostrarCliente ? 6 : 5;
  return (
    <div className="table-wrapper">
      <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          {mostrarCliente && <col style={{ width: 180 }} />}
          <col style={{ width: 90 }} />
          <col style={{ width: 95 }} />
          <col />
          <col style={{ width: 115 }} />
          <col style={{ width: 88 }} />
        </colgroup>
        <thead>
          <tr>
            {mostrarCliente && <th>Cliente</th>}
            <th>Nº Interno</th><th>Data</th><th>Descrição</th>
            <th style={{ textAlign: 'right' }}>Valor</th><th></th>
          </tr>
        </thead>
        <tbody>
          {carregando ? (
            <tr><td colSpan={cols} style={{ textAlign: 'center', padding: 28, color: 'var(--color-text-faint)' }}>Carregando...</td></tr>
          ) : recibos.length === 0 ? (
            <tr><td colSpan={cols} style={{ textAlign: 'center', padding: 28, color: 'var(--color-text-faint)' }}>
              {busca ? 'Nenhum resultado.' : 'Nenhum recibo encontrado.'}
            </td></tr>
          ) : recibos.map(r => (
            <tr key={r.id}>
              {mostrarCliente && (
                <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={r.interessados?.nome}>
                  {r.interessados?.nome || '—'}
                </td>
              )}
              <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{r.numero_os||'—'}</td>
              <td style={{ fontSize: 12 }}>{fmtData(r.dt_recibo)}</td>
              <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.descricao}>
                {r.descricao}
                {r.recibo_futuro && <span style={{ marginLeft: 6, fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 5px' }}>Futuro</span>}
              </td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>{fmtValor(r.valor)}</td>
              <td>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button className="btn-icon btn-sm" title="Imprimir" onClick={() => onImprimir(r)}>🖨</button>
                  {onEditar && <button className="btn-icon btn-sm" title="Editar" onClick={() => onEditar(r)}>✎</button>}
                  <button className="btn-icon btn-sm" title="Remover" onClick={() => onDeletar(r.id)} style={{ color: 'var(--color-danger)' }}>✕</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {recibos.length > 0 && (
          <tfoot>
            <tr style={{ background: 'var(--color-surface-2)', fontWeight: 700 }}>
              <td colSpan={cols - 2} style={{ padding: '8px 10px', fontSize: 12 }}>Total — {totalCount} recibo(s)</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px' }}>{fmtValor(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────
export default function Recibos() {
  const { interessados, addInteressado, addToast, cartorio, usuario, supabaseClient: sb } = useApp();

  const mesAtual = String(new Date().getMonth() + 1).padStart(2, '0');
  const anoAtual = String(new Date().getFullYear());

  const [aba,           setAba]          = useState('emitir');
  const [recibos,       setRecibos]      = useState([]);
  const [todosRecibos,  setTodosRecibos] = useState([]);
  const [carregando,    setCarregando]   = useState(false);
  const [clienteSel,    setClienteSel]   = useState(null);
  const [busca,         setBusca]        = useState('');
  const [buscaCliente,  setBuscaCliente] = useState('');
  const [dropdown,      setDropdown]     = useState(false);
  const [modalRecibo,   setModalRecibo]  = useState(null);
  const [showNovo,      setShowNovo]     = useState(false);
  const [novoForm,      setNovoForm]     = useState({ nome: '', cpf: '' });
  const [filtroMes,     setFiltroMes]    = useState(mesAtual);
  const [filtroAno,     setFiltroAno]    = useState(anoAtual);
  const [buscaHist,     setBuscaHist]    = useState('');
  // Lote
  const [loteTipo,      setLoteTipo]     = useState('Colaborador');
  const [loteSelecionados, setLoteSelecionados] = useState({});
  const [loteForm,      setLoteForm]     = useState({ descricao: '', valor: '', dt_recibo: new Date().toISOString().slice(0,10), numero_os: '', obs: '', primeira_via: true, segunda_via: true, recibo_futuro: false });
  const [loteProcessando, setLoteProcessando] = useState(false);

  const carregarTodosRecibos = async () => {
    if (!sb) return;
    setCarregando(true);
    try {
      const { data } = await sb.from('recibos')
        .select('*, interessados(nome, cpf)')
        .order('dt_recibo', { ascending: false });
      if (data) setTodosRecibos(data);
    } catch(e) { console.error(e); }
    setCarregando(false);
  };

  useEffect(() => { if (aba === 'historico') carregarTodosRecibos(); }, [aba]);

  const anosDisp = useMemo(() => {
    const s = new Set(todosRecibos.map(r => r.dt_recibo?.substring(0,4)).filter(Boolean));
    if (!s.size) s.add(anoAtual);
    return Array.from(s).sort((a,b) => b-a);
  }, [todosRecibos]);

  const mesesDisp = useMemo(() => {
    const s = new Set(todosRecibos.filter(r => r.dt_recibo?.startsWith(filtroAno)).map(r => r.dt_recibo.substring(5,7)));
    return Array.from(s).sort();
  }, [todosRecibos, filtroAno]);

  const historicoFiltrado = useMemo(() => todosRecibos.filter(r => {
    const matchAno = r.dt_recibo?.startsWith(filtroAno);
    const matchMes = filtroMes === 'todos' || r.dt_recibo?.substring(5,7) === filtroMes;
    const q = buscaHist.toLowerCase();
    const matchBusca = !q || (r.descricao||'').toLowerCase().includes(q)
      || (r.interessados?.nome||'').toLowerCase().includes(q)
      || (r.numero_os||'').toLowerCase().includes(q);
    return matchAno && matchMes && matchBusca;
  }), [todosRecibos, filtroAno, filtroMes, buscaHist]);

  const totalHist = useMemo(() => historicoFiltrado.reduce((s,r) => s + Number(r.valor||0), 0), [historicoFiltrado]);

  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) return interessados.slice(0,8);
    const q = buscaCliente.toLowerCase();
    return interessados.filter(i => i.nome.toLowerCase().includes(q) || (i.cpf||'').includes(q)).slice(0,10);
  }, [buscaCliente, interessados]);

  const recibosFiltrados = useMemo(() => {
    if (!busca.trim()) return recibos;
    const q = busca.toLowerCase();
    return recibos.filter(r => (r.descricao||'').toLowerCase().includes(q) || (r.numero_os||'').toLowerCase().includes(q));
  }, [busca, recibos]);

  const total = useMemo(() => recibos.reduce((s,r) => s + Number(r.valor||0), 0), [recibos]);

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
    setClienteSel(int); setBuscaCliente(int.nome); setDropdown(false); setBusca('');
    carregarRecibos(int.id);
  };

  const limparCliente = () => { setClienteSel(null); setBuscaCliente(''); setRecibos([]); };

  const salvarRecibo = async (form) => {
    if (!sb) { addToast('Erro de conexão.', 'error'); return; }
    try {
      if (form.id) {
        const { data, error } = await sb.from('recibos').update({ ...form, interessado_id: clienteSel.id }).eq('id', form.id).select().single();
        if (error) throw error;
        setRecibos(p => p.map(r => r.id === form.id ? data : r));
        addToast('Recibo atualizado!', 'success');
        imprimirRecibo(data, clienteSel, cartorio);
      } else {
        const { data, error } = await sb.from('recibos').insert({ ...form, interessado_id: clienteSel.id, criado_por: usuario?.id }).select().single();
        if (error) throw error;
        setRecibos(p => [data, ...p]);
        addToast('Recibo registrado!', 'success');
        imprimirRecibo(data, clienteSel, cartorio);
      }
      setModalRecibo(null);
      if (aba === 'historico') carregarTodosRecibos();
    } catch(e) { addToast(e.message, 'error'); }
  };

  const deletarRecibo = async (id) => {
    if (!sb || !window.confirm('Remover este recibo?')) return;
    try {
      await sb.from('recibos').delete().eq('id', id);
      setRecibos(p => p.filter(r => r.id !== id));
      setTodosRecibos(p => p.filter(r => r.id !== id));
      addToast('Recibo removido.', 'info');
    } catch(e) { addToast(e.message, 'error'); }
  };

  const cadastrarNovoCliente = async () => {
    if (!novoForm.nome.trim()) { addToast('Nome obrigatório.', 'error'); return; }
    const novo = await addInteressado({ nome: novoForm.nome.trim(), cpf: novoForm.cpf.trim() });
    if (novo) { selecionarCliente(novo); setShowNovo(false); setNovoForm({ nome: '', cpf: '' }); }
  };

  // Lote
  const loteInteressados = useMemo(() =>
    interessados.filter(i => (i.tipo || 'Cliente') === loteTipo)
  , [interessados, loteTipo]);

  const toggleLote = (id) => setLoteSelecionados(p => ({ ...p, [id]: !p[id] }));
  const toggleTodosLote = () => {
    const todos = loteInteressados.every(i => loteSelecionados[i.id]);
    const novo = {};
    loteInteressados.forEach(i => { novo[i.id] = !todos; });
    setLoteSelecionados(novo);
  };
  const selecionadosLote = loteInteressados.filter(i => loteSelecionados[i.id]);

  const emitirLote = async () => {
    if (!sb) { addToast('Erro de conexão.', 'error'); return; }
    if (selecionadosLote.length === 0) { addToast('Selecione ao menos um destinatário.', 'error'); return; }
    if (!loteForm.descricao.trim()) { addToast('Descrição obrigatória.', 'error'); return; }
    const valor = parseFloat(String(loteForm.valor).replace(',', '.'));
    if (isNaN(valor) || valor <= 0) { addToast('Valor inválido.', 'error'); return; }
    if (!window.confirm(`Emitir ${selecionadosLote.length} recibo(s) de ${fmtValor(valor)} cada?`)) return;
    setLoteProcessando(true);
    let ok = 0, erros = 0;
    for (const int of selecionadosLote) {
      try {
        const { data, error } = await sb.from('recibos').insert({
          ...loteForm, valor, interessado_id: int.id, criado_por: usuario?.id
        }).select().single();
        if (error) throw error;
        imprimirRecibo(data, int, cartorio);
        ok++;
      } catch(e) { console.error(e); erros++; }
    }
    setLoteProcessando(false);
    addToast(`${ok} recibo(s) emitido(s)${erros ? `, ${erros} erro(s)` : ''}.`, erros ? 'error' : 'success');
    setLoteSelecionados({});
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Recibos de Emolumentos</div>
          <div className="page-sub">Emissão e histórico de recibos por cliente</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {[['emitir','🧾 Emitir Recibo'],['lote','📤 Emissão em Lote'],['historico','📋 Histórico Geral']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${aba === id ? 'active' : ''}`} onClick={() => setAba(id)}>{label}</button>
        ))}
      </div>

      {/* ── ABA EMITIR ── */}
      {aba === 'emitir' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>
          {/* Painel cliente */}
          <div className="card" style={{ padding: 0, overflow: 'visible' }}>
            <div className="card-header"><div className="card-title">👤 Cliente</div></div>
            <div style={{ padding: '0 14px 14px' }}>
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

          {/* Painel recibos */}
          <div>
            {!clienteSel ? (
              <div className="card" style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--color-text-faint)' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🧾</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Selecione um cliente</div>
                <div style={{ fontSize: 13 }}>Busque pelo nome ou CPF para ver o histórico</div>
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
                <TabelaRecibos recibos={recibosFiltrados} total={total} totalCount={recibos.length}
                  carregando={carregando} busca={busca}
                  onEditar={r => setModalRecibo(r)}
                  onImprimir={r => imprimirRecibo(r, clienteSel, cartorio)}
                  onDeletar={deletarRecibo} mostrarCliente={false} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA LOTE ── */}
      {aba === 'lote' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* Lista de destinatários */}
          <div className="card" style={{ padding: 0 }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div className="card-title">👥 Destinatários</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select className="form-select" style={{ fontSize: 12, height: 32, padding: '0 8px' }} value={loteTipo} onChange={e => { setLoteTipo(e.target.value); setLoteSelecionados({}); }}>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{selecionadosLote.length} selecionado(s)</span>
              </div>
            </div>
            <div className="table-wrapper">
              <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup><col style={{ width: 44 }} /><col /><col style={{ width: 150 }} /><col style={{ width: 130 }} /></colgroup>
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox"
                        checked={loteInteressados.length > 0 && loteInteressados.every(i => loteSelecionados[i.id])}
                        onChange={toggleTodosLote} />
                    </th>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                  </tr>
                </thead>
                <tbody>
                  {loteInteressados.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 28, color: 'var(--color-text-faint)' }}>
                      Nenhum interessado do tipo <strong>{loteTipo}</strong>.<br/>
                      <span style={{ fontSize: 12 }}>Cadastre em Interessados e defina o tipo.</span>
                    </td></tr>
                  ) : loteInteressados.map(i => (
                    <tr key={i.id} onClick={() => toggleLote(i.id)} style={{ cursor: 'pointer', background: loteSelecionados[i.id] ? 'var(--color-surface-2)' : '' }}>
                      <td onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={!!loteSelecionados[i.id]} onChange={() => toggleLote(i.id)} />
                      </td>
                      <td style={{ fontWeight: 500 }}>{i.nome}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{i.cpf||'—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{i.telefone||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Painel do recibo */}
          <div className="card">
            <div className="card-header"><div className="card-title">📄 Dados do Recibo</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nº Interno / OS</label>
                <input className="form-input" value={loteForm.numero_os||''} onChange={e => setLoteForm(p => ({ ...p, numero_os: e.target.value }))} placeholder="Ex: 000123" />
              </div>
              <div className="form-group">
                <label className="form-label">Data *</label>
                <input className="form-input" type="date" value={loteForm.dt_recibo} onChange={e => setLoteForm(p => ({ ...p, dt_recibo: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição *</label>
                <input className="form-input" value={loteForm.descricao} onChange={e => setLoteForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Pagamento de pro-labore, Gratificação..." autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$) *</label>
                <input className="form-input" value={loteForm.valor} onChange={e => setLoteForm(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" style={{ fontFamily: 'var(--font-mono)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} value={loteForm.obs||''} onChange={e => setLoteForm(p => ({ ...p, obs: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Vias</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {[['primeira_via','1ª Via (Cartório)'],['segunda_via','2ª Via (Colaborador)'],['recibo_futuro','Recibo Futuro']].map(([key, label]) => (
                    <label key={key} className="checkbox-wrapper" style={{ cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!loteForm[key]} onChange={e => setLoteForm(p => ({ ...p, [key]: e.target.checked }))} />
                      <div className="checkbox-box">{loteForm[key] && <span style={{ fontSize: 9, color: 'var(--color-bg)', fontWeight: 800 }}>✓</span>}</div>
                      <span className="checkbox-label">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Resumo */}
              {selecionadosLote.length > 0 && loteForm.valor && !isNaN(parseFloat(String(loteForm.valor).replace(',','.'))) && (
                <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: 12, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Destinatários:</span>
                    <strong>{selecionadosLote.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Valor unitário:</span>
                    <strong>{fmtValor(parseFloat(String(loteForm.valor).replace(',','.')))}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ fontWeight: 700 }}>Total:</span>
                    <strong style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>
                      {fmtValor(selecionadosLote.length * parseFloat(String(loteForm.valor).replace(',','.')))}
                    </strong>
                  </div>
                </div>
              )}

              <button className="btn btn-primary" onClick={emitirLote} disabled={loteProcessando || selecionadosLote.length === 0} style={{ marginTop: 4 }}>
                {loteProcessando ? '⏳ Emitindo...' : `📤 Emitir ${selecionadosLote.length > 0 ? selecionadosLote.length : ''} Recibo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div className="card-title">📋 Histórico de Recibos</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="form-select" style={{ fontSize: 12, height: 32, padding: '0 8px' }} value={filtroAno} onChange={e => { setFiltroAno(e.target.value); setFiltroMes('todos'); }}>
                {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select className="form-select" style={{ fontSize: 12, height: 32, padding: '0 8px' }} value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
                <option value="todos">Todos os meses</option>
                {mesesDisp.map(m => <option key={m} value={m}>{MESES[parseInt(m)-1]}</option>)}
              </select>
              <input className="form-input" placeholder="Buscar..." value={buscaHist} onChange={e => setBuscaHist(e.target.value)} style={{ fontSize: 12, height: 32, width: 180 }} />
            </div>
          </div>
          <TabelaRecibos recibos={historicoFiltrado} total={totalHist} totalCount={historicoFiltrado.length}
            carregando={carregando} busca={buscaHist}
            onEditar={null}
            onImprimir={r => imprimirRecibo(r, r.interessados, cartorio)}
            onDeletar={deletarRecibo} mostrarCliente={true} />
        </div>
      )}

      {modalRecibo && (
        <ModalRecibo
          recibo={modalRecibo === 'novo' ? null : modalRecibo}
          nomeCliente={clienteSel?.nome}
          onClose={() => setModalRecibo(null)}
          onSave={salvarRecibo}
        />
      )}
    </div>
  );
}
