import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const formatBRL = v => {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Colunas fixas com larguras definidas — igual em todos os setores
const COLS = [
  { key: 'num',       label: 'Nº Interno',    w: '90px',  align: 'left'  },
  { key: 'data',      label: 'Data',           w: '100px', align: 'left'  },
  { key: 'especie',   label: 'Espécie',        w: '160px', align: 'left'  },
  { key: 'partes',    label: 'Interessados',   w: 'auto',  align: 'left'  },
  { key: 'valor',     label: 'Valor',          w: '110px', align: 'right' },
];

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function gerarRelatorio(titulo, grupos, cartorio, isConcluido, filtroMes, filtroAno) {
  const nomeCartorio = cartorio?.nome_simples || cartorio?.nome || '';
  const logo         = cartorio?.logo_url || '';
  const endereco     = cartorio?.endereco || '';
  const cidade       = cartorio?.cidade   || '';
  const telefone     = cartorio?.telefone || '';
  const email        = cartorio?.email    || '';
  const hoje         = new Date().toLocaleDateString('pt-BR');
  const totalGeral   = grupos.reduce((s, g) => s + g.total, 0);
  const qtdGeral     = grupos.reduce((s, g) => s + g.processos.length, 0);
  const thData       = isConcluido ? 'Dt. Conclusão' : 'Dt. Abertura';
  const periodoLabel = [filtroMes !== 'todos' ? MESES[parseInt(filtroMes)-1] : null, filtroAno].filter(Boolean).join(' ');

  const linhasGrupos = grupos.map(g => {
    const linhasProc = g.processos.map(p => {
      const dt = isConcluido ? (p.dt_conclusao ? formatDate(p.dt_conclusao) : '—') : formatDate(p.dt_abertura);
      const partes = (() => { try { return JSON.parse(p.partes||'[]').slice(0,2).map(x=>(x.nome||'').split(' ').slice(0,2).join(' ')).filter(Boolean).join(', '); } catch { return ''; } })();
      return `<tr>
        <td style="padding:4px 8px;border-bottom:1px solid #e0e0e0;font-size:11px;width:80px;">${p.numero_interno||''}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #e0e0e0;font-size:11px;width:90px;">${dt}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #e0e0e0;font-size:11px;width:150px;">${p.especie||'—'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #e0e0e0;font-size:11px;">${partes||'—'}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #e0e0e0;font-size:11px;text-align:right;width:100px;">R$ ${formatBRL(p.valor_ato)}</td>
      </tr>`;
    }).join('');
    return `
      <tr><td colspan="5" style="padding:6px 10px;background:#d6e4f0;font-size:12px;font-weight:bold;border-top:2px solid #aac;">
        ${g.categoria}
        <span style="float:right;font-weight:600;font-size:11px;">${g.processos.length} processo(s) &nbsp;|&nbsp; R$ ${formatBRL(g.total)}</span>
      </td></tr>
      <tr style="background:#eef4f9;">
        <th style="padding:4px 8px;font-size:10px;text-align:left;color:#555;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc;">Nº Interno</th>
        <th style="padding:4px 8px;font-size:10px;text-align:left;color:#555;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc;">${thData}</th>
        <th style="padding:4px 8px;font-size:10px;text-align:left;color:#555;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc;">Espécie</th>
        <th style="padding:4px 8px;font-size:10px;text-align:left;color:#555;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc;">Interessados</th>
        <th style="padding:4px 8px;font-size:10px;text-align:right;color:#555;font-weight:700;text-transform:uppercase;border-bottom:1px solid #ccc;">Valor</th>
      </tr>
      ${linhasProc}`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: A4 portrait; margin: 14mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
  .cab { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .logo-box { width: 72px; height: 56px; border: 1px solid #bbb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
  .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .cab-info { flex: 1; text-align: center; }
  .cab-nome { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
  .cab-sub  { font-size: 10px; color: #444; line-height: 1.5; }
  .titulo { background: #b8cce4; text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 1px; padding: 5px; margin: 8px 0 3px 0; }
  .subtitulo { text-align: center; font-size: 10px; color: #555; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .total-geral { text-align: right; font-size: 12px; font-weight: bold; margin-top: 10px; padding: 5px 10px; background: #e8f0fa; border: 1px solid #aab; }
  .rodape { border-top: 1px solid #999; margin-top: 12px; padding-top: 4px; display: flex; justify-content: space-between; font-size: 10px; color: #555; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div class="cab">
  <div class="logo-box">${logo ? `<img src="${logo}" alt="Logo">` : '<span style="font-size:9px;color:#aaa;">Logo</span>'}</div>
  <div class="cab-info">
    <div class="cab-nome">${nomeCartorio}</div>
    <div class="cab-sub">${endereco}<br>${[telefone,email].filter(Boolean).join(' · ')}<br>${cidade}</div>
  </div>
</div>
<div class="titulo">${titulo}</div>
<div class="subtitulo">Período: ${periodoLabel||'Todos'} &nbsp;|&nbsp; Emitido em ${hoje} &nbsp;|&nbsp; ${qtdGeral} processo(s)</div>
<table><tbody>${linhasGrupos}</tbody></table>
<div class="total-geral">Total Geral: ${qtdGeral} processo(s) &nbsp;|&nbsp; R$ ${formatBRL(totalGeral)}</div>
<div class="rodape"><span>${nomeCartorio}</span><span>${cidade} — ${hoje}</span></div>
</body></html>`;

  const w = window.open('', '_blank', 'width=860,height=1100');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

export default function RelatorioServicos() {
  const { processos, cartorio, usuarios } = useApp();
  const [filtro,    setFiltro]    = useState('Concluído');
  const [filtroMes, setFiltroMes] = useState('todos');
  const [filtroAno, setFiltroAno] = useState(String(new Date().getFullYear()));
  const [busca,     setBusca]     = useState('');

  // Anos disponíveis nos processos
  const anosDisp = useMemo(() => {
    const s = new Set();
    processos.forEach(p => {
      const d = p.dt_conclusao || p.dt_abertura;
      if (d) s.add(d.substring(0, 4));
    });
    return Array.from(s).sort((a, b) => b - a);
  }, [processos]);

  const grupos = useMemo(() => {
    const lista = processos.filter(p => {
      const matchStatus = filtro === 'todos' ? true : p.status === filtro;
      const dtRef = filtro === 'Concluído' ? p.dt_conclusao : p.dt_abertura;
      const matchAno = !filtroAno || !dtRef ? true : dtRef.startsWith(filtroAno);
      const matchMes = filtroMes === 'todos' || !dtRef ? true : dtRef.substring(5, 7) === filtroMes.padStart(2, '0');
      const matchBusca = !busca || [p.numero_interno, p.categoria, p.especie].join(' ').toLowerCase().includes(busca.toLowerCase());
      return matchStatus && matchAno && matchMes && matchBusca;
    });
    const mapa = {};
    lista.forEach(p => {
      const cat = p.categoria || 'Sem Categoria';
      if (!mapa[cat]) mapa[cat] = { categoria: cat, processos: [], total: 0 };
      const _partes = (() => { try { return JSON.parse(p.partes||'[]').slice(0,2).map(x=>(x.nome||'').split(' ').slice(0,2).join(' ')).filter(Boolean).join(', '); } catch { return ''; } })();
      mapa[cat].processos.push({ ...p, _partes });
      mapa[cat].total += parseFloat(p.valor_ato || 0);
    });
    return Object.values(mapa).sort((a, b) => a.categoria.localeCompare(b.categoria));
  }, [processos, filtro, filtroMes, filtroAno, busca]);

  const totalGeral = grupos.reduce((s, g) => s + g.total, 0);
  const qtdGeral   = grupos.reduce((s, g) => s + g.processos.length, 0);
  const isConcluido = filtro === 'Concluído';
  const labelData   = isConcluido ? 'Dt. Conclusão' : 'Dt. Abertura';

  const tituloRel = filtro === 'Em andamento' ? 'Relatório de Serviços em Andamento'
    : filtro === 'Concluído' ? 'Relatório de Serviços Concluídos'
    : 'Relatório de Serviços — Todos';

  const selectStyle = {
    padding: '6px 10px', borderRadius: 'var(--radius-md)', fontSize: 12,
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
    color: 'var(--color-text)', cursor: 'pointer',
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Serviços por Setor</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {qtdGeral} processo(s) &nbsp;·&nbsp; Total R$ {formatBRL(totalGeral)}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm"
          onClick={() => gerarRelatorio(tituloRel, grupos, cartorio, isConcluido, filtroMes, filtroAno)}
          disabled={qtdGeral === 0}>
          🖨 Imprimir Relatório
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignItems: 'center', padding: '10px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        {/* Status */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { v: 'Em andamento', l: 'Em Andamento' },
            { v: 'Concluído',    l: 'Concluídos'   },
            { v: 'todos',        l: 'Todos'         },
          ].map(({ v, l }) => (
            <button key={v}
              className={`btn btn-sm ${filtro === v ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFiltro(v)}>{l}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

        {/* Mês */}
        <select style={selectStyle} value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
          <option value="todos">Todos os meses</option>
          {MESES.map((m, i) => (
            <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>
          ))}
        </select>

        {/* Ano */}
        <select style={selectStyle} value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
          {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ width: 1, height: 24, background: 'var(--color-border)' }} />

        {/* Busca */}
        <input className="filter-input"
          placeholder="Buscar nº, categoria, espécie..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: 240 }} />
      </div>

      {/* Conteúdo */}
      {grupos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-faint)', fontSize: 14 }}>
          Nenhum processo encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {grupos.map(g => (
            <div key={g.categoria} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Cabeçalho do grupo — total só aqui */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '9px 16px', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{g.categoria}</span>
                  <span className="badge badge-neutral" style={{ fontSize: 11 }}>{g.processos.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>
                    R$ {formatBRL(g.total)}
                  </span>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                    onClick={() => gerarRelatorio(`${tituloRel} — ${g.categoria}`, [g], cartorio, isConcluido, filtroMes, filtroAno)}>
                    🖨 Setor
                  </button>
                </div>
              </div>

              {/* Tabela com larguras fixas — igual em todos os setores */}
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  {COLS.map(c => <col key={c.key} style={{ width: c.w }} />)}
                </colgroup>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                    {COLS.map(c => (
                      <th key={c.key} style={{ padding: '5px 12px', fontSize: 10, fontWeight: 700,
                        color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em',
                        textAlign: c.align }}>
                        {c.key === 'data' ? labelData : c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.processos.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)' }}>
                      <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.numero_interno}</td>
                      <td style={{ padding: '6px 12px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {isConcluido ? (p.dt_conclusao ? formatDate(p.dt_conclusao) : '—') : formatDate(p.dt_abertura)}
                      </td>
                      <td style={{ padding: '6px 12px', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.especie || '—'}</td>
                      <td style={{ padding: '6px 12px', fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p._partes || '—'}</td>
                      <td style={{ padding: '6px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'right',
                        fontWeight: p.valor_ato > 0 ? 600 : 400,
                        color: p.valor_ato > 0 ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
                        {p.valor_ato > 0 ? `R$ ${formatBRL(p.valor_ato)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Total geral */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
            padding: '10px 16px', background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Total Geral — {qtdGeral} processo(s)</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--color-success)' }}>
              R$ {formatBRL(totalGeral)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
