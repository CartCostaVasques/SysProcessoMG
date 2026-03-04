import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate, formatCurrency } from '../../data/mockData.js';

function MiniChart({ data, color = 'var(--color-text-muted)', height = 36 }) {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80; const h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function BarChart({ data, color = 'var(--color-border-light)' }) {
  const max = Math.max(...data.map(d => d.value)) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div
            style={{
              width: '100%',
              height: Math.max(2, (d.value / max) * 52),
              background: d.highlight ? 'var(--color-accent)' : color,
              borderRadius: '2px 2px 0 0',
              transition: 'height 0.3s ease',
            }}
          />
          <span style={{ fontSize: 9, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ slices }) {
  const total = slices.reduce((s, i) => s + i.value, 0);
  if (!total) return null;
  let offset = 0;
  const r = 28; const cx = 36; const cy = 36;
  const circum = 2 * Math.PI * r;

  const colors = ['var(--color-text-muted)', 'var(--color-text-faint)', 'var(--color-accent-dim)', 'var(--color-border-light)', '#6b7280'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={72} height={72}>
        {slices.map((s, i) => {
          const dash = (s.value / total) * circum;
          const gap = circum - dash;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={8}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              style={{ transformOrigin: `${cx}px ${cy}px`, transform: 'rotate(-90deg)' }}
            />
          );
          offset += dash;
          return el;
        })}
        <circle cx={cx} cy={cy} r={r - 12} fill="var(--color-surface-2)" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-text)" fontFamily="var(--font-mono)">{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>{s.label}</span>
            <span style={{ color: 'var(--color-text)', fontWeight: 600, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ setPage }) {
  const { processos, tarefas, oficios, andamentos, usuarios } = useApp();

  const stats = useMemo(() => {
    const total = processos.length;
    const emAndamento = processos.filter(p => p.status === 'Em andamento').length;
    const concluidos = processos.filter(p => p.status === 'Concluído').length;
    const tarefasPendentes = tarefas.filter(t => !t.concluida).length;
    const oficiosPendentes = oficios.filter(o => o.status === 'Aguardando Resposta').length;

    const hoje = new Date();
    const tarefasVencidas = tarefas.filter(t => {
      if (t.concluida) return false;
      return new Date(t.dt_fim) < hoje;
    }).length;

    return { total, emAndamento, concluidos, tarefasPendentes, oficiosPendentes, tarefasVencidas };
  }, [processos, tarefas, oficios]);

  const porCategoria = useMemo(() => {
    const map = {};
    processos.forEach(p => { map[p.categoria] = (map[p.categoria] || 0) + 1; });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [processos]);

  const porResponsavel = useMemo(() => {
    const map = {};
    processos.forEach(p => { map[p.responsavel_nome] = (map[p.responsavel_nome] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [processos]);

  const meses = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev', 'Mar'];
  const abertosData = [2, 3, 1, 3, 2, 1, 2, 1, 2];
  const concluidosData = [1, 2, 1, 2, 2, 0, 1, 0, 0];

  const porMes = meses.map((label, i) => ({
    label,
    value: abertosData[i],
    highlight: i === meses.length - 1,
  }));

  const processosPendentes = processos.filter(p => p.status === 'Em andamento').slice(0, 5);
  const tarefasRecentes = tarefas.filter(t => !t.concluida).slice(0, 4);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Visão geral do cartório — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de Processos', value: stats.total, sub: 'Todos os registros', icon: '📋', color: 'var(--color-info)' },
          { label: 'Em Andamento', value: stats.emAndamento, sub: 'Processos ativos', icon: '🔄', color: 'var(--color-warning)' },
          { label: 'Concluídos', value: stats.concluidos, sub: 'Processos finalizados', icon: '✓', color: 'var(--color-success)' },
          { label: 'Tarefas Pendentes', value: stats.tarefasPendentes, sub: stats.tarefasVencidas > 0 ? `${stats.tarefasVencidas} vencida(s)` : 'Sem vencidas', icon: '✓', color: stats.tarefasVencidas > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' },
          { label: 'Ofícios Pendentes', value: stats.oficiosPendentes, sub: 'Aguardando resposta', icon: '✉', color: 'var(--color-warning)' },
          { label: 'Usuários Ativos', value: usuarios.filter(u => u.ativo).length, sub: `de ${usuarios.length} cadastrados`, icon: '◉', color: 'var(--color-text-muted)' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div className="stat-card-label">{s.label}</div>
              <span style={{ fontSize: 16, opacity: 0.6 }}>{s.icon}</span>
            </div>
            <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-card-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {/* Processos por mês */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Processos por Mês</div>
              <div className="card-subtitle">Abertos nos últimos 9 meses</div>
            </div>
          </div>
          <BarChart data={porMes} />
        </div>

        {/* Por categoria */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Por Categoria</div>
          </div>
          <DonutChart slices={porCategoria} />
        </div>

        {/* Por responsável */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Por Responsável</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porResponsavel.map(([nome, qtd]) => {
              const pct = (qtd / processos.length) * 100;
              return (
                <div key={nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{nome}</span>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{qtd}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--color-surface-3)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent-dim)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
        {/* Processos em andamento */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Processos em Andamento</div>
              <div className="card-subtitle">{stats.emAndamento} processos ativos</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('processos')}>Ver todos →</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº Interno</th>
                  <th>Serviço</th>
                  <th>Partes</th>
                  <th>Responsável</th>
                  <th>Andamentos</th>
                </tr>
              </thead>
              <tbody>
                {processosPendentes.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.numero_interno}</span></td>
                    <td>
                      <div style={{ fontSize: 12 }}>{p.especie}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{p.categoria}</div>
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{p.partes}</td>
                    <td><span className="badge badge-neutral">{p.responsavel_nome}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{p.total_andamentos || 0}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tarefas pendentes */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Tarefas Pendentes</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setPage('tarefas')}>Ver todas →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tarefasRecentes.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">✓</div>
                <div className="empty-state-text">Tudo em dia!</div>
              </div>
            )}
            {tarefasRecentes.map(t => {
              const vencida = new Date(t.dt_fim) < new Date();
              return (
                <div key={t.id} style={{ padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: `1px solid ${vencida ? 'rgba(248,113,113,0.2)' : 'var(--color-border)'}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>{t.titulo}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${vencida ? 'badge-danger' : 'badge-warning'}`}>{vencida ? 'Vencida' : 'Pendente'}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>até {formatDate(t.dt_fim)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 3 }}>{t.responsavel} · {t.setor}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
