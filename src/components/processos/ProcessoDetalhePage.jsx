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

export default function ProcessoDetalhePage() {
  const { processos, usuarios, andamentos } = useApp();

  const [selecionado, setSelecionado] = useState(null);
  const [busca,        setBusca]       = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  // Quando o processo for editado externamente, atualiza o selecionado
  const processoAtual = selecionado
    ? processos.find(p => p.id === selecionado.id) || selecionado
    : null;

  const lista = processos.filter(p => {
    const txt = (p.numero_interno + p.especie + p.categoria).toLowerCase();
    return (!busca || txt.includes(busca.toLowerCase()))
        && (!filtroStatus || p.status === filtroStatus);
  });

  const pendentes = (id) => andamentos.filter(a => a.processo_id === id && !a.concluido).length;

  if (processoAtual) {
    return (
      <div className="fade-in">
        {/* Botão voltar */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSelecionado(null)}
          style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          ← Voltar à lista
        </button>

        {/* ProcessoDetalhe inline — sem modal */}
        <ProcessoDetalheInline
          processo={processoAtual}
          onVoltar={() => setSelecionado(null)}
        />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Processos — Detalhe</div>
          <div className="page-sub">Selecione um processo para ver e editar os detalhes</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar-icon">⌕</span>
          <input
            placeholder="Buscar por nº, serviço, categoria..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            autoFocus
          />
        </div>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Concluído">Concluído</option>
          <option value="Devolvido">Devolvido</option>
          <option value="Suspenso">Suspenso</option>
        </select>
        {(busca || filtroStatus) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setBusca(''); setFiltroStatus(''); }}>✕ Limpar</button>
        )}
      </div>

      {/* Tabela */}
      <div className="table-wrapper">
        <table className="data-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 55 }}>Nº</th>
              <th style={{ width: 90 }}>Dt. Cadastro</th>
              <th style={{ width: 110 }}>Categoria</th>
              <th>Serviço</th>
              <th style={{ width: 70 }}>Resp.</th>
              <th style={{ width: 110 }}>Valor</th>
              <th style={{ width: 80 }}>Andamentos</th>
              <th style={{ width: 90 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <div className="empty-state-text">Nenhum processo encontrado</div>
                  </div>
                </td>
              </tr>
            )}
            {lista.map(p => {
              const conf = STATUS_CONF[p.status] || { cor: 'var(--color-text-faint)', sigla: '??' };
              const resp = usuarios.find(u => u.id === p.responsavel_id);
              const pend = pendentes(p.id);
              return (
                <tr
                  key={p.id}
                  onClick={() => setSelecionado(p)}
                  style={{ cursor: 'pointer', opacity: p.status === 'Concluído' ? 0.7 : 1 }}
                  title="Clique para abrir o detalhe"
                >
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{p.numero_interno}</span></td>
                  <td style={{ color: 'var(--color-text-muted)' }}>{formatDate(p.dt_abertura)}</td>
                  <td><span className="badge badge-neutral">{p.categoria}</span></td>
                  <td>{p.especie || '—'}</td>
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
    </div>
  );
}

// ── ProcessoDetalhe sem modal (inline na página) ──────────────
function ProcessoDetalheInline({ processo, onVoltar }) {
  // Reutiliza todo o conteúdo do ProcessoDetalhe mas sem o overlay/modal
  // Importa dinâmico para evitar circular — renderiza via wrapper
  return <ProcessoDetalhe processo={processo} onClose={onVoltar} inline />;
}
