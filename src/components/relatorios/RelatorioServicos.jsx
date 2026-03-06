import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const formatBRL = v => {
  const n = parseFloat(String(v || 0).replace(/\./g, '').replace(',', '.')) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function primeirosNomes(partes) {
  try {
    const arr = JSON.parse(partes || '[]');
    return arr.slice(0, 2).map(p => {
      const palavras = (p.nome || '').trim().split(' ');
      return palavras.slice(0, 2).join(' ');
    }).join(', ');
  } catch { return ''; }
}

function gerarRelatorio(titulo, grupos, cartorio, isConcluido) {
  const nomeCartorio = cartorio?.nome_simples || cartorio?.nome || '';
  const endereco     = cartorio?.endereco || '';
  const cidade       = cartorio?.cidade   || '';
  const telefone     = cartorio?.telefone || '';
  const email        = cartorio?.email    || '';
  const logo         = cartorio?.logo_url || '';
  const hoje         = new Date().toLocaleDateString('pt-BR');
  const totalGeral   = grupos.reduce((s, g) => s + g.total, 0);
  const qtdGeral     = grupos.reduce((s, g) => s + g.processos.length, 0);

  const thData = isConcluido ? 'Dt. Conclusão' : 'Dt. Abertura';

  const linhasGrupos = grupos.map(g => {
    const linhasProc = g.processos.map(p => {
      const dtExibir = isConcluido
        ? (p.dt_conclusao ? formatDate(p.dt_conclusao) : '—')
        : formatDate(p.dt_abertura);
      const partes = primeirosNomes(p.partes);
      return `<tr>
        <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${p.numero_interno||''}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${dtExibir}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${p.especie||'—'}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${partes}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;text-align:right;">R$ ${formatBRL(p.valor_ato)}</td>
      </tr>`;
    }).join('');
    return `
      <tr>
        <td colspan="5" style="padding:6px 10px;background:#dde6f0;font-size:12px;font-weight:bold;border:1px solid #aab;">
          ${g.categoria}
          <span style="float:right;font-weight:normal;font-size:11px;">${g.processos.length} processo(s) &nbsp;|&nbsp; R$ ${formatBRL(g.total)}</span>
        </td>
      </tr>
      ${linhasProc}`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  @page { size: A4 portrait; margin: 15mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
  .cab { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .logo-box { width: 80px; height: 62px; border: 1px solid #bbb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
  .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .cab-info { flex: 1; text-align: center; }
  .cab-nome { font-size: 16px; font-weight: bold; margin-bottom: 3px; }
  .cab-sub  { font-size: 11px; color: #333; line-height: 1.5; }
  .titulo { background: #b8cce4; text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 2px; padding: 5px; margin: 8px 0 4px 0; }
  .subtitulo { text-align: center; font-size: 11px; color: #555; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #4a4a6a; color: #fff; padding: 5px 8px; font-size: 11px; text-align: left; border: 1px solid #333; }
  .total-geral { text-align: right; font-size: 12px; font-weight: bold; margin-top: 10px; padding: 6px 10px; background: #eef2f7; border: 1px solid #aab; }
  .rodape { border-top: 1px solid #999; margin-top: 16px; padding-top: 5px; display: flex; justify-content: space-between; font-size: 10px; color: #555; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div class="cab">
  <div class="logo-box">${logo ? `<img src="${logo}" alt="Logo">` : '<span style="font-size:9px;color:#aaa;">Logo</span>'}</div>
  <div class="cab-info">
    <div class="cab-nome">${nomeCartorio}</div>
    <div class="cab-sub">${endereco}<br>${[telefone,email].filter(Boolean).join(' - ')}<br>${cidade}</div>
  </div>
</div>
<div class="titulo">${titulo}</div>
<div class="subtitulo">Emitido em ${hoje} &nbsp;|&nbsp; ${qtdGeral} processo(s)</div>
<table>
  <thead><tr>
    <th style="width:85px;">Nº Interno</th>
    <th style="width:85px;">${thData}</th>
    <th style="width:130px;">Espécie</th>
    <th>Interessados</th>
    <th style="width:90px;text-align:right;">Valor</th>
  </tr></thead>
  <tbody>${linhasGrupos}</tbody>
</table>
<div class="total-geral">Total Geral: ${qtdGeral} processo(s) &nbsp;|&nbsp; R$ ${formatBRL(totalGeral)}</div>
<div class="rodape"><span>${nomeCartorio}</span><span>${cidade} — ${hoje}</span></div>
</body></html>`;

  const w = window.open('', '_blank', 'width=840,height=1100');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}


export default function RelatorioServicos() {
  const { processos, cartorio, usuarios } = useApp();
  const [filtro, setFiltro] = useState('Em andamento');
  const [busca, setBusca]   = useState('');

  const grupos = useMemo(() => {
    const lista = processos.filter(p => {
      const matchStatus = filtro === 'todos' ? true : p.status === filtro;
      const matchBusca  = !busca || [p.numero_interno, p.categoria, p.especie]
        .join(' ').toLowerCase().includes(busca.toLowerCase());
      return matchStatus && matchBusca;
    });
    const mapa = {};
    lista.forEach(p => {
      const cat = p.categoria || 'Sem Categoria';
      if (!mapa[cat]) mapa[cat] = { categoria: cat, processos: [], total: 0 };
      const usr = usuarios.find(u => u.id === p.responsavel_id);
      const _partes = (() => { try { return JSON.parse(p.partes||'[]').slice(0,2).map(x => (x.nome||'').split(' ').slice(0,2).join(' ')).filter(Boolean).join(', '); } catch { return ''; } })();
      mapa[cat].processos.push({ ...p, _resp: usr?.nome_simples || '—', _partes });
      mapa[cat].total += parseFloat(p.valor_ato || 0);
    });
    return Object.values(mapa).sort((a, b) => a.categoria.localeCompare(b.categoria));
  }, [processos, filtro, busca]);

  const totalGeral = grupos.reduce((s, g) => s + g.total, 0);
  const qtdGeral   = grupos.reduce((s, g) => s + g.processos.length, 0);

  const tituloRel = filtro === 'Em andamento' ? 'Relatório de Serviços em Andamento'
    : filtro === 'Concluído' ? 'Relatório de Serviços Concluídos'
    : 'Relatório de Serviços — Todos';

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
          onClick={() => gerarRelatorio(tituloRel, grupos, cartorio, filtro === 'Concluído')}
          disabled={qtdGeral === 0}>
          🖨 Imprimir Relatório
        </button>
      </div>

      {/* Filtros */}
      <div className="filter-bar" style={{ marginBottom: 16 }}>
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
        <input className="filter-input"
          placeholder="Buscar por nº, categoria, espécie..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: 300 }} />
      </div>

      {/* Conteúdo */}
      {grupos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-faint)', fontSize: 14 }}>
          Nenhum processo encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grupos.map(g => (
            <div key={g.categoria} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Cabeçalho do grupo */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 16px', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{g.categoria}</span>
                  <span className="badge badge-neutral" style={{ fontSize: 11 }}>{g.processos.length}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--color-success)' }}>
                    R$ {formatBRL(g.total)}
                  </span>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                    onClick={() => gerarRelatorio(`${tituloRel} — ${g.categoria}`, [g], cartorio, filtro === 'Concluído')}>
                    🖨 Setor
                  </button>
                </div>
              </div>

              {/* Tabela */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-2)' }}>
                    {['Nº Interno', filtro === 'Concluído' ? 'Dt. Conclusão' : 'Dt. Abertura', 'Espécie', 'Interessados', 'Valor'].map(h => (
                      <th key={h} style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700,
                        color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em',
                        textAlign: h === 'Valor' ? 'right' : 'left', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.processos.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)' }}>
                      <td style={{ padding: '7px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{p.numero_interno}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                        {filtro === 'Concluído' ? (p.dt_conclusao ? formatDate(p.dt_conclusao) : '—') : formatDate(p.dt_abertura)}
                      </td>
                      <td style={{ padding: '7px 12px', fontSize: 12 }}>{p.especie || '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>{p._partes || '—'}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'right',
                        fontWeight: p.valor_ato > 0 ? 600 : 400,
                        color: p.valor_ato > 0 ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
                        {p.valor_ato > 0 ? `R$ ${formatBRL(p.valor_ato)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border)' }}>
                    <td colSpan={5} style={{ padding: '6px 12px', fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'right' }}>
                      Subtotal {g.categoria}
                    </td>
                    <td style={{ padding: '6px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, textAlign: 'right', color: 'var(--color-success)' }}>
                      R$ {formatBRL(g.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          {/* Total geral */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16,
            padding: '12px 16px', background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Total Geral — {qtdGeral} processo(s)</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--color-success)' }}>
              R$ {formatBRL(totalGeral)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
