import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import ProcessoDetalhe from './ProcessoDetalhe.jsx';
import { formatDate } from '../../data/mockData.js';

function formatBRL(v) {
  const n = parseFloat(String(v || 0).replace(/\./g, '').replace(',', '.')) || 0;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

function TabelaProcessos({ lista, usuarios, andamentos, interessados, onSelecionar }) {
  return (
    <div className="table-wrapper">
      <table className="data-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ width: 55 }}>Nº</th>
            <th style={{ width: 90 }}>Dt. Cadastro</th>
            <th style={{ width: 110 }}>Categoria</th>
            <th style={{ minWidth: 120 }}>Serviço</th>
            <th style={{ minWidth: 130 }}>Interessados</th>
            <th style={{ width: 70 }}>Resp.</th>
            <th style={{ width: 110 }}>Valor</th>
            <th style={{ width: 80 }}>Andamentos</th>
            <th style={{ width: 90 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {lista.length === 0 && (
            <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">Nenhum processo encontrado</div></div></td></tr>
          )}
          {lista.map(p => {
            const conf = STATUS_CONF[p.status] || { cor: 'var(--color-text-faint)', sigla: '??' };
            const resp = usuarios.find(u => u.id === p.responsavel_id);
            const pend = andamentos.filter(a => a.processo_id === p.id && !a.concluido).length;
            return (
              <tr key={p.id} onClick={() => onSelecionar(p)} style={{ cursor: 'pointer', opacity: p.status === 'Concluído' ? 0.7 : 1 }} title="Clique para abrir o detalhe">
                <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{p.numero_interno}</span></td>
                <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(p.dt_abertura)}</td>
                <td><span className="badge badge-neutral">{p.categoria}</span></td>
                <td>{p.especie || '—'}</td>
                <td><NomesPartes partes={p.partes} interessados={interessados} /></td>
                <td>
                  {resp
                    ? <div className="avatar avatar-sm" title={resp.nome_simples}>{resp.nome_simples.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0,3)}</div>
                    : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                  }
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--color-text-muted)' }}>
                  {p.valor_ato > 0 ? `R$ ${formatBRL(p.valor_ato)}` : '—'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {pend > 0
                    ? <span className="badge badge-warning">{pend} pend.</span>
                    : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                  }
                </td>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: conf.cor + '22', border: `2px solid ${conf.cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: conf.cor }}>
                      {conf.sigla}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ProcessoDetalhePage() {
  const { processos, usuarios, andamentos, interessados } = useApp();

  const [selecionado,  setSelecionado]  = useState(null);
  const [busca,        setBusca]        = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Em andamento');
  const [modoVis,      setModoVis]      = useState('lista'); // 'lista' | 'responsavel'

  const processoAtual = selecionado
    ? processos.find(p => p.id === selecionado.id) || selecionado
    : null;

  const lista = processos.filter(p => {
    const partes = parsePartes(p.partes);
    const nomesPartes = partes.map(pt => {
      const int = interessados.find(x => x.id === pt.id);
      return (int?.nome || pt.nome || '').toLowerCase();
    }).join(' ');
    const txt = (p.numero_interno + p.especie + p.categoria + nomesPartes).toLowerCase();
    return (!busca || txt.includes(busca.toLowerCase()))
        && (!filtroStatus || p.status === filtroStatus);
  });

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

  // Agrupamento por responsável
  const grupos = lista.reduce((acc, p) => {
    const resp = usuarios.find(u => u.id === p.responsavel_id);
    const key  = resp?.nome_simples || '— Sem responsável';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});
  const ordemGrupos = Object.keys(grupos).sort();

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Processos — Detalhe</div>
          <div className="page-sub">{lista.length} processo(s) · clique para abrir o detalhe</div>
        </div>
        {/* Alternância de modo */}
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
        {(busca || filtroStatus) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setBusca(''); setFiltroStatus('Em andamento'); }}>↺ Limpar</button>
        )}
      </div>

      {/* ── Modo Lista ── */}
      {modoVis === 'lista' && (
        <TabelaProcessos lista={lista} usuarios={usuarios} andamentos={andamentos} interessados={interessados} onSelecionar={setSelecionado} />
      )}

      {/* ── Modo Por Responsável ── */}
      {modoVis === 'responsavel' && (
        ordemGrupos.length === 0
          ? <TabelaProcessos lista={[]} usuarios={usuarios} andamentos={andamentos} interessados={interessados} onSelecionar={setSelecionado} />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {ordemGrupos.map(resp => (
                <div key={resp}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: 6 }}>
                    <div className="avatar avatar-sm">{resp.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0,3)}</div>
                    <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{resp}</span>
                    <span className="badge badge-neutral">{grupos[resp].length} processo{grupos[resp].length !== 1 ? 's' : ''}</span>
                  </div>
                  <TabelaProcessos lista={grupos[resp]} usuarios={usuarios} andamentos={andamentos} interessados={interessados} onSelecionar={setSelecionado} />
                </div>
              ))}
            </div>
      )}
    </div>
  );
}
