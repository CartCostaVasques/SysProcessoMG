import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

export default function Andamentos() {
  const { processos, andamentos, usuarios } = useApp();
  const [filtroResp, setFiltroResp] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [dtInicio, setDtInicio] = useState('');
  const [dtFim, setDtFim] = useState('');
  const [busca, setBusca] = useState('');

  const responsaveis = [...new Set(andamentos.map(a => a.responsavel))].filter(Boolean);

  const lista = useMemo(() => {
    return andamentos
      .filter(a => {
        const proc = processos.find(p => p.id === a.processo_id);
        const txt = (a.descricao + a.tipo + (proc?.numero_interno || '') + (proc?.partes || '')).toLowerCase();
        const dt = a.dt_andamento;
        return (!busca || txt.includes(busca.toLowerCase()))
          && (!filtroResp || a.responsavel === filtroResp || proc?.responsavel === filtroResp)
          && (!filtroStatus || (filtroStatus === 'concluido' ? a.concluido : !a.concluido))
          && (!dtInicio || dt >= dtInicio)
          && (!dtFim || dt <= dtFim);
      })
      .map(a => ({
        ...a,
        processo: processos.find(p => p.id === a.processo_id),
      }))
      .sort((a, b) => b.dt_andamento.localeCompare(a.dt_andamento));
  }, [andamentos, processos, filtroResp, filtroStatus, dtInicio, dtFim, busca]);

  const stats = useMemo(() => ({
    total: lista.length,
    concluidos: lista.filter(a => a.concluido).length,
    pendentes: lista.filter(a => !a.concluido).length,
  }), [lista]);

  const { editAndamento, addToast } = useApp();

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Andamentos</div>
          <div className="page-sub">Histórico de movimentações dos processos</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-card-label">Total no filtro</div>
          <div className="stat-card-value">{stats.total}</div>
        </div>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-card-label">Concluídos</div>
          <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{stats.concluidos}</div>
        </div>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-card-label">Pendentes</div>
          <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>{stats.pendentes}</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por descrição, tipo, processo..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="concluido">Concluídos</option>
        </select>
        <input type="date" className="form-input" value={dtInicio} onChange={e => setDtInicio(e.target.value)} title="Data início" style={{ width: 130 }} />
        <input type="date" className="form-input" value={dtFim} onChange={e => setDtFim(e.target.value)} title="Data fim" style={{ width: 130 }} />
        {(filtroResp || filtroStatus || dtInicio || dtFim || busca) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFiltroResp(''); setFiltroStatus(''); setDtInicio(''); setDtFim(''); setBusca(''); }}>✕ Limpar</button>
        )}
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Processo</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Responsável</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🔄</div><div className="empty-state-text">Nenhum andamento encontrado</div></div></td></tr>
            )}
            {lista.map(a => (
              <tr key={a.id} style={{ opacity: a.concluido ? 0.65 : 1 }}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(a.dt_andamento)}</td>
                <td>
                  {a.processo ? (
                    <div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12 }}>{a.processo.numero_interno}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{a.processo.especie}</div>
                    </div>
                  ) : <span style={{ color: 'var(--color-text-faint)' }}>—</span>}
                </td>
                <td>{a.tipo ? <span className="badge badge-neutral">{a.tipo}</span> : '—'}</td>
                <td style={{ maxWidth: 280 }}>{a.descricao}</td>
                <td>{a.responsavel || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: a.vencimento && new Date(a.vencimento) < new Date() && !a.concluido ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                  {formatDate(a.vencimento)}
                </td>
                <td>
                  <span className={`badge ${a.concluido ? 'badge-success' : 'badge-warning'}`}>
                    {a.concluido ? '✓ Concluído' : 'Pendente'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-icon btn-sm"
                    onClick={() => { editAndamento(a.id, { concluido: !a.concluido }); addToast(a.concluido ? 'Reaberto.' : 'Concluído!', 'success'); }}
                    title={a.concluido ? 'Reabrir' : 'Marcar concluído'}
                  >
                    {a.concluido ? '↩' : '✓'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
