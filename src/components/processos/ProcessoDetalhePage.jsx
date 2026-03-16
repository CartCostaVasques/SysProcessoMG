import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import ProcessoDetalhe from './ProcessoDetalhe.jsx';
import { formatDate } from '../../data/mockData.js';

function formatBRL(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_CONF = {
  'Em andamento': { cor: 'var(--color-warning)', sigla: 'EA' },
  'Devolvido':    { cor: 'var(--color-danger)',  sigla: 'DV' },
  'Em reanálise': { cor: '#a78bfa',              sigla: 'RA' },
  'Concluído':    { cor: 'var(--color-success)', sigla: 'CO' },
  'Encerrado':    { cor: '#64748b',              sigla: 'EN' },
};

const STATUS_PENDENTES = ['Em andamento', 'Devolvido', 'Em reanálise'];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function parsePartes(partes) {
  try { return JSON.parse(partes || '[]'); } catch { return []; }
}

function NomesPartes({ partes, interessados }) {
  const arr = parsePartes(partes);
  if (!arr.length) return <span style={{ color: 'var(--color-text-faint)' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {arr.slice(0, 2).map((p, i) => {
        const int = interessados.find(x => x.id === p.id);
        const nome = int?.nome || p.nome || '';
        const primeiros = nome.trim().split(/\s+/).slice(0, 2).join(' ');
        return <span key={i} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{primeiros}</span>;
      })}
      {arr.length > 2 && <span style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>+{arr.length - 2}</span>}
    </div>
  );
}

const COLS = [
  { key: 'num',     label: 'Nº',           w: '60px'  },
  { key: 'dt',      label: 'Dt. Cadastro', w: '96px'  },
  { key: 'cat',     label: 'Categoria',    w: '120px' },
  { key: 'servico', label: 'Serviço',      w: '300px' },
  { key: 'partes',  label: 'Interessados', w: '180px' },
  { key: 'resp',    label: 'Resp.',        w: '60px'  },
  { key: 'valor',   label: 'Valor',        w: '110px' },
  { key: 'and',     label: 'Andamentos',   w: '90px'  },
  { key: 'status',  label: 'Status',       w: '70px'  },
];

function TabelaProcessos({ lista, usuarios, andamentos, interessados, onSelecionar }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 12 }}>
      <colgroup>{COLS.map(c => <col key={c.key} style={{ width: c.w }} />)}</colgroup>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
          {COLS.map(c => (
            <th key={c.key} style={{ padding: '5px 10px', fontSize: 10, fontWeight: 700,
              color: 'var(--color-text-faint)', textTransform: 'uppercase',
              letterSpacing: '0.06em', textAlign: c.key === 'valor' ? 'right' : 'left' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lista.length === 0 && (
          <tr><td colSpan={9}>
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">Nenhum processo encontrado</div>
            </div>
          </td></tr>
        )}
        {lista.map((p, i) => {
          const conf = STATUS_CONF[p.status] || { cor: 'var(--color-text-faint)', sigla: '??' };
          const resp = usuarios.find(u => u.id === p.responsavel_id);
          const pend = andamentos.filter(a => a.processo_id === p.id && !a.concluido).length;
          return (
            <tr key={p.id} onClick={() => onSelecionar(p)}
              style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border)',
                background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)',
                opacity: ['Concluído','Encerrado'].includes(p.status) ? 0.75 : 1 }}>
              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.numero_interno}</td>
              <td style={{ padding: '6px 10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{formatDate(p.dt_abertura)}</td>
              <td style={{ padding: '6px 10px', overflow: 'hidden' }}>
                <span className="badge badge-neutral" style={{ fontSize: 10, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{p.categoria}</span>
              </td>
              <td style={{ padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.especie || '—'}</td>
              <td style={{ padding: '6px 10px', overflow: 'hidden' }}>
                <NomesPartes partes={p.partes} interessados={interessados} />
              </td>
              <td style={{ padding: '6px 10px' }}>
                {resp
                  ? <div className="avatar avatar-sm" title={resp.nome_simples}>{resp.nome_simples.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0,2)}</div>
                  : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
              </td>
              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right',
                color: p.valor_ato > 0 ? 'var(--color-text)' : 'var(--color-text-faint)',
                fontWeight: p.valor_ato > 0 ? 600 : 400 }}>
                {p.valor_ato > 0 ? `R$ ${formatBRL(p.valor_ato)}` : '—'}
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                {pend > 0 ? <span className="badge badge-warning">{pend} pend.</span>
                           : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
              </td>
              <td style={{ padding: '6px 10px' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%',
                  background: conf.cor + '22', border: `2px solid ${conf.cor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: conf.cor }}>{conf.sigla}</div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Impressão ──────────────────────────────────────────────────
function gerarHtmlImpressao({ titulo, subtitulo, grupos, cartorio, usuarios, andamentos, interessados }) {
  const nomeCartorio = cartorio?.nome || 'Serviço Notarial e Registral';
  const cidade = cartorio?.cidade || 'Paranatinga-MT';
  const hoje = new Date().toLocaleDateString('pt-BR');
  const fmtBRL = v => (parseFloat(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtDt  = d => { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; };

  const SP = {
    'Em andamento': { sigla: 'EA', cor: '#b45309', bg: '#fef3c7' },
    'Devolvido':    { sigla: 'DV', cor: '#dc2626', bg: '#fee2e2' },
    'Em reanálise': { sigla: 'RA', cor: '#7c3aed', bg: '#ede9fe' },
    'Concluído':    { sigla: 'CO', cor: '#16a34a', bg: '#dcfce7' },
    'Encerrado':    { sigla: 'EN', cor: '#475569', bg: '#f1f5f9' },
  };

  let totalGeralQtd = 0, totalGeralVal = 0;

  const blocosHTML = grupos.map(g => {
    let qtdGrupo = 0, valGrupo = 0;
    const linhas = g.processos.map((p, i) => {
      const partes = (() => { try { return JSON.parse(p.partes||'[]').slice(0,2).map(x => { const int = interessados?.find(z => z.id === x.id); return (int?.nome||x.nome||'').split(' ').slice(0,2).join(' '); }).filter(Boolean).join(', '); } catch { return ''; } })();
      const val = parseFloat(p.valor_ato||0);
      const sc = SP[p.status] || { sigla: '??', cor: '#94a3b8', bg: '#f1f5f9' };
      qtdGrupo++; valGrupo += val; totalGeralQtd++; totalGeralVal += val;
      return `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:3px 6px;font-family:monospace;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.numero_interno}</td>
        <td style="padding:3px 6px;white-space:nowrap">${fmtDt(p.dt_abertura)}</td>
        <td style="padding:3px 6px;overflow:hidden;text-overflow:ellipsis">${p.especie||'—'}</td>
        <td style="padding:3px 6px;overflow:hidden;text-overflow:ellipsis">${partes||'—'}</td>
        <td style="padding:3px 2px;text-align:center;white-space:nowrap">
          <span style="display:inline-block;padding:1px 3px;border-radius:3px;font-size:10px;font-weight:800;background:${sc.bg};color:${sc.cor}">${sc.sigla}</span>
        </td>
        <td style="padding:3px 6px;text-align:right;font-family:monospace;white-space:nowrap">${val>0?'R$ '+fmtBRL(val):'—'}</td>
      </tr>`;
    }).join('');

    const cabecalho = g.isGeral ? '' : `
      <div style="display:flex;justify-content:space-between;align-items:center;background:#1e293b;color:#fff;padding:8px 12px;margin-top:16px;border-radius:4px 4px 0 0">
        <span style="font-weight:700;font-size:13px">${g.nome}</span>
        <span style="font-size:12px">${qtdGrupo} processo(s) &nbsp;|&nbsp; R$ ${fmtBRL(valGrupo)}</span>
      </div>`;

    return cabecalho + `
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px;table-layout:fixed">
        <colgroup>
          <col style="width:65px">
          <col style="width:72px">
          <col style="width:55%">
          <col style="width:160px">
          <col style="width:28px">
          <col style="width:75px">
        </colgroup>
        <thead><tr style="background:#e2e8f0">
          <th style="padding:4px 6px;text-align:left;white-space:nowrap">Nº</th>
          <th style="padding:4px 6px;text-align:left;white-space:nowrap">Data</th>
          <th style="padding:4px 6px;text-align:left">Serviço</th>
          <th style="padding:4px 6px;text-align:left">Interessados</th>
          <th style="padding:4px 2px;text-align:center">St.</th>
          <th style="padding:4px 6px;text-align:right;white-space:nowrap">Valor</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
      </table>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${titulo}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;margin:0;padding:20px}
    @media print{body{padding:10px}}
    th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;color:#475569}
    td{border-bottom:1px solid #e2e8f0;padding:2px}
    .cabecalho{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;border-bottom:2px solid #1e293b;padding-bottom:10px}
    .total-geral{background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 14px;text-align:right;font-weight:700;font-size:12px;margin-top:12px;border-radius:4px}
    .rodape{display:flex;justify-content:space-between;margin-top:20px;font-size:10px;color:#64748b;border-top:1px solid #e2e8f0;padding-top:8px}
  </style></head><body>
  <div class="cabecalho">
    <div>
      <div style="font-size:14px;font-weight:700">${nomeCartorio}</div>
      <div style="font-size:11px;color:#64748b">${cidade}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:15px;font-weight:700">${titulo}</div>
      ${subtitulo?`<div style="font-size:11px;color:#64748b">${subtitulo}</div>`:''}
      <div style="font-size:10px;color:#94a3b8;margin-top:2px">Emitido em ${hoje}</div>
    </div>
  </div>
  ${blocosHTML}
  <div class="total-geral">Total Geral: ${totalGeralQtd} processo(s) &nbsp;|&nbsp; R$ ${fmtBRL(totalGeralVal)}</div>
  <div class="rodape"><span>${nomeCartorio}</span><span>${cidade} — ${hoje}</span></div>
  </body></html>`;
}

function imprimir(params) {
  const html = gerarHtmlImpressao(params);
  const w = window.open('', '_blank', 'width=1000,height=800');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ─── Principal ──────────────────────────────────────────────────
export default function ProcessoDetalhePage() {
  const { processos, usuarios, andamentos, interessados, cartorio } = useApp();

  const [selecionado,  setSelecionado]  = useState(null);
  const [busca,        setBusca]        = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Em andamento');
  const [filtroResp,   setFiltroResp]   = useState('');
  const [modoVis,      setModoVis]      = useState('lista');
  const [limite,       setLimite]       = useState(50);
  const [filtroMes,    setFiltroMes]    = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [filtroAno,    setFiltroAno]    = useState(String(new Date().getFullYear()));
  const [modoData,     setModoData]     = useState('mes');
  const hojeStr   = new Date().toISOString().slice(0, 10);
  const inicioMes = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-01`;
  const [dtInicio, setDtInicio] = useState(inicioMes);
  const [dtFim,    setDtFim]    = useState(hojeStr);

  const anosDisp = useMemo(() => {
    const s = new Set();
    processos.forEach(p => { const d = p.dt_conclusao || p.dt_abertura; if (d) s.add(d.substring(0,4)); });
    if (!s.size) s.add(String(new Date().getFullYear()));
    return Array.from(s).sort((a,b) => b - a);
  }, [processos]);

  const responsaveisDisp = useMemo(() => {
    const s = new Set();
    processos.forEach(p => {
      const u = usuarios.find(x => x.id === p.responsavel_id);
      if (u) s.add(u.nome_simples);
    });
    return Array.from(s).sort();
  }, [processos, usuarios]);

  const processoAtual = selecionado
    ? processos.find(p => p.id === selecionado.id) || selecionado
    : null;

  const lista = useMemo(() => processos.filter(p => {
    const partes = parsePartes(p.partes);
    const nomesPartes = partes.map(pt => {
      const int = interessados.find(x => x.id === pt.id);
      return (int?.nome || pt.nome || '').toLowerCase();
    }).join(' ');
    const txt = (p.numero_interno + p.especie + p.categoria + nomesPartes).toLowerCase();

    const dtRef = ['Concluído','Encerrado'].includes(filtroStatus)
      ? (filtroStatus === 'Concluído' ? p.dt_conclusao : p.dt_encerramento)
      : p.dt_abertura;

    let matchData;
    if (modoData === 'periodo') {
      matchData = !dtRef ? false : (!dtInicio || dtRef >= dtInicio) && (!dtFim || dtRef <= dtFim);
    } else {
      const matchAno = !filtroAno || !dtRef ? true : dtRef.startsWith(filtroAno);
      const matchMes = filtroMes === 'todos' || !dtRef ? true : dtRef.substring(5,7) === filtroMes;
      matchData = matchAno && matchMes;
    }

    const respNome = usuarios.find(u => u.id === p.responsavel_id)?.nome_simples || '';
    const matchResp = !filtroResp || respNome === filtroResp;

    return (!busca || txt.includes(busca.toLowerCase()))
        && (!filtroStatus ? true
            : filtroStatus === 'pendentes' ? STATUS_PENDENTES.includes(p.status)
            : p.status === filtroStatus)
        && matchData && matchResp;
  }), [processos, busca, filtroStatus, filtroResp, filtroMes, filtroAno, modoData, dtInicio, dtFim, interessados, usuarios]);

  const totalGeral    = lista.reduce((s, p) => s + parseFloat(p.valor_ato || 0), 0);
  const listaLimitada = limite === 'todos' ? lista : lista.slice(0, limite);

  const grupos = useMemo(() => {
    const mapa = {};
    lista.forEach(p => {
      const resp = usuarios.find(u => u.id === p.responsavel_id);
      const key  = resp?.nome_simples || '— Sem responsável';
      if (!mapa[key]) mapa[key] = { nome: key, avatar: resp ? resp.nome_simples.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0,2) : '?', processos: [], total: 0 };
      mapa[key].processos.push(p);
      mapa[key].total += parseFloat(p.valor_ato || 0);
    });
    return Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [lista, usuarios]);

  // Label período para impressão
  const labelPeriodo = useMemo(() => {
    if (modoData === 'periodo') {
      const fmtDt = d => { if (!d) return ''; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; };
      return `Período: ${fmtDt(dtInicio)} a ${fmtDt(dtFim)}`;
    }
    const nomeMes = filtroMes === 'todos' ? 'Todos os meses' : MESES[parseInt(filtroMes)-1];
    return `${nomeMes} / ${filtroAno}`;
  }, [modoData, dtInicio, dtFim, filtroMes, filtroAno]);

  const labelStatus = filtroStatus === 'pendentes' ? 'Pendentes' : filtroStatus || 'Todos os status';

  const imprimirLista = () => imprimir({
    titulo: 'Relatório de Processos',
    subtitulo: `${labelPeriodo} · <b>${labelStatus}</b>${filtroResp ? ' · ' + filtroResp : ''}`,
    grupos: [{ nome: '', isGeral: true, processos: lista }],
    cartorio, usuarios, andamentos, interessados,
  });

  const imprimirPorResponsavel = (grupo) => imprimir({
    titulo: `Processos — ${grupo.nome}`,
    subtitulo: `${labelPeriodo} · <b>${labelStatus}</b>`,
    grupos: [{ ...grupo, isGeral: true }],
    cartorio, usuarios, andamentos, interessados,
  });

  const imprimirTodosResponsaveis = () => imprimir({
    titulo: 'Processos por Responsável',
    subtitulo: `${labelPeriodo} · <b>${labelStatus}</b>`,
    grupos,
    cartorio, usuarios, andamentos, interessados,
  });

  const temFiltroAtivo = !!(busca || filtroStatus !== 'Em andamento' || filtroResp
    || modoData !== 'mes' || filtroMes !== String(new Date().getMonth()+1).padStart(2,'0'));

  const limparFiltros = () => {
    setBusca(''); setFiltroStatus('Em andamento'); setFiltroResp('');
    setModoData('mes');
    setFiltroMes(String(new Date().getMonth()+1).padStart(2,'0'));
    setFiltroAno(String(new Date().getFullYear()));
    setDtInicio(inicioMes); setDtFim(hojeStr);
  };

  if (processoAtual) {
    return (
      <div className="fade-in">
        <button className="btn btn-ghost btn-sm" onClick={() => setSelecionado(null)} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Voltar à lista
        </button>
        <ProcessoDetalhe processo={processoAtual} onClose={() => setSelecionado(null)} inline />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Processos — Detalhe</div>
          <div className="page-sub">
            {lista.length} processo(s)
            {totalGeral > 0 && (
              <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 600 }}>
                · R$ {formatBRL(totalGeral)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" disabled={lista.length === 0}
            onClick={modoVis === 'lista' ? imprimirLista : imprimirTodosResponsaveis}>
            🖨 {modoVis === 'lista' ? 'Imprimir Lista' : 'Imprimir Todos'}
          </button>
          <div style={{ display: 'flex', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {[['lista','☰ Lista'],['responsavel','◫ Responsável']].map(([id, label]) => (
              <button key={id} onClick={() => setModoVis(id)} style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: modoVis === id ? 700 : 400,
                background: modoVis === id ? 'var(--color-surface-3)' : 'transparent',
                color: modoVis === id ? 'var(--color-text)' : 'var(--color-text-muted)',
                borderRight: id === 'lista' ? '1px solid var(--color-border)' : 'none',
              }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 200px' }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por nº, serviço, categoria, interessado..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>

        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendentes">⏳ Pendentes (todos)</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Devolvido">Devolvido</option>
          <option value="Em reanálise">Em reanálise</option>
          <option value="Concluído">Concluído</option>
          <option value="Encerrado">Encerrado</option>
        </select>

        <select className="form-select" value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          {responsaveisDisp.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`btn btn-sm ${modoData === 'mes' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setModoData('mes')}>📅 Mês</button>
          <button className={`btn btn-sm ${modoData === 'periodo' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setModoData('periodo')}>📆 Período</button>
        </div>

        {modoData === 'mes' && (<>
          <select className="form-select" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
            <option value="todos">Todos os meses</option>
            {MESES.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}
          </select>
          <select className="form-select" value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
            {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </>)}

        {modoData === 'periodo' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="date" className="form-input" style={{ fontSize: 12, padding: '6px 8px' }} value={dtInicio} onChange={e => setDtInicio(e.target.value)} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>até</span>
            <input type="date" className="form-input" style={{ fontSize: 12, padding: '6px 8px' }} value={dtFim} onChange={e => setDtFim(e.target.value)} />
          </div>
        )}

        {temFiltroAtivo && (
          <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>↺ Limpar</button>
        )}
      </div>

      {/* ── Modo Lista ── */}
      {modoVis === 'lista' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {lista.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Exibindo {listaLimitada.length} de {lista.length}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Linhas:</span>
                {[50, 70, 100, 'todos'].map(v => (
                  <button key={v} className={`btn btn-sm ${limite === v ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setLimite(v)} style={{ minWidth: 36, fontSize: 11 }}>
                    {v === 'todos' ? 'Todos' : v}
                  </button>
                ))}
              </div>
            </div>
          )}
          <TabelaProcessos lista={listaLimitada} usuarios={usuarios} andamentos={andamentos} interessados={interessados} onSelecionar={setSelecionado} />
        </div>
      )}

      {/* ── Modo Por Responsável ── */}
      {modoVis === 'responsavel' && (
        grupos.length === 0
          ? <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <TabelaProcessos lista={[]} usuarios={usuarios} andamentos={andamentos} interessados={interessados} onSelecionar={setSelecionado} />
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {grupos.map(g => (
                <div key={g.nome} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 16px', background: 'var(--color-surface-2)',
                    borderBottom: '1px solid var(--color-border)' }}>
                    <div className="avatar avatar-sm">{g.avatar}</div>
                    <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{g.nome}</span>
                    <span className="badge badge-neutral" style={{ fontSize: 11 }}>{g.processos.length} processo{g.processos.length !== 1 ? 's' : ''}</span>
                    {g.total > 0 && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-success)', marginLeft: 8 }}>
                        R$ {formatBRL(g.total)}
                      </span>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8, fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); imprimirPorResponsavel(g); }}>
                      🖨 Imprimir
                    </button>
                  </div>
                  <TabelaProcessos lista={g.processos} usuarios={usuarios} andamentos={andamentos} interessados={interessados} onSelecionar={setSelecionado} />
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
