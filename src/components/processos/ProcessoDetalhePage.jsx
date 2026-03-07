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
  'Concluído':    { cor: 'var(--color-success)', sigla: 'CO' },
  'Devolvido':    { cor: 'var(--color-danger)',  sigla: 'DV' },
  'Suspenso':     { cor: '#8a8a96',              sigla: 'SP' },
};

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

// Colunas fixas — mesmas em todos os quadros
const COLS = [
  { key: 'num',       label: 'Nº',           w: '60px'  },
  { key: 'dt',        label: 'Dt. Cadastro', w: '96px'  },
  { key: 'cat',       label: 'Categoria',    w: '120px' },
  { key: 'servico',   label: 'Serviço',      w: '226px' },
  { key: 'partes',    label: 'Interessados', w: '180px' },
  { key: 'resp',      label: 'Resp.',        w: '60px'  },
  { key: 'valor',     label: 'Valor',        w: '110px' },
  { key: 'and',       label: 'Andamentos',   w: '90px'  },
  { key: 'status',    label: 'Status',       w: '70px'  },
];

function TabelaProcessos({ lista, usuarios, andamentos, interessados, onSelecionar }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 12 }}>
      <colgroup>
        {COLS.map(c => <col key={c.key} style={{ width: c.w }} />)}
      </colgroup>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
          {COLS.map(c => (
            <th key={c.key} style={{
              padding: '5px 10px', fontSize: 10, fontWeight: 700,
              color: 'var(--color-text-faint)', textTransform: 'uppercase',
              letterSpacing: '0.06em', textAlign: c.key === 'valor' ? 'right' : 'left',
            }}>{c.label}</th>
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
                opacity: p.status === 'Concluído' ? 0.75 : 1 }}>
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
                  : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                }
              </td>
              <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', textAlign: 'right',
                color: p.valor_ato > 0 ? 'var(--color-text)' : 'var(--color-text-faint)',
                fontWeight: p.valor_ato > 0 ? 600 : 400 }}>
                {p.valor_ato > 0 ? `R$ ${formatBRL(p.valor_ato)}` : '—'}
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                {pend > 0
                  ? <span className="badge badge-warning">{pend} pend.</span>
                  : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                }
              </td>
              <td style={{ padding: '6px 10px' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%',
                  background: conf.cor + '22', border: `2px solid ${conf.cor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: conf.cor }}>
                  {conf.sigla}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ProcessoDetalhePage() {
  const { processos, usuarios, andamentos, interessados } = useApp();

  const [selecionado,  setSelecionado]  = useState(null);
  const [busca,        setBusca]        = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Em andamento');
  const [modoVis,      setModoVis]      = useState('lista');

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
    return (!busca || txt.includes(busca.toLowerCase()))
        && (!filtroStatus || p.status === filtroStatus);
  }), [processos, busca, filtroStatus, interessados]);

  const totalGeral = lista.reduce((s, p) => s + parseFloat(p.valor_ato || 0), 0);

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
            {modoVis === 'lista' && totalGeral > 0 && (
              <span style={{ marginLeft: 8, fontFamily: 'var(--font-mono)', color: 'var(--color-success)', fontWeight: 600 }}>
                · R$ {formatBRL(totalGeral)}
              </span>
            )}
          </div>
        </div>
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

      {/* Filtros */}
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por nº, serviço, categoria, interessado..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Concluído">Concluído</option>
          <option value="Devolvido">Devolvido</option>
          <option value="Suspenso">Suspenso</option>
        </select>
        {(busca || filtroStatus !== 'Em andamento') && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setBusca(''); setFiltroStatus('Em andamento'); }}>↺ Limpar</button>
        )}
      </div>

      {/* ── Modo Lista ── */}
      {modoVis === 'lista' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <TabelaProcessos lista={lista} usuarios={usuarios} andamentos={andamentos} interessados={interessados} onSelecionar={setSelecionado} />
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
                  {/* Cabeçalho do grupo com total */}
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
                  </div>
                  <TabelaProcessos lista={g.processos} usuarios={usuarios} andamentos={andamentos} interessados={interessados} onSelecionar={setSelecionado} />
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
