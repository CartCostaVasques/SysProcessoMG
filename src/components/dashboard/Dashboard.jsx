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

  const hoje = new Date();
  const anoAtual  = String(hoje.getFullYear());
  const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const [filtroAno, setFiltroAno] = useState(anoAtual);

  // Anos disponíveis nos processos
  const anosDisp = useMemo(() => {
    const s = new Set();
    processos.forEach(p => { if (p.dt_conclusao) s.add(p.dt_conclusao.substring(0,4)); });
    if (!s.size) s.add(anoAtual);
    return Array.from(s).sort((a,b) => b - a);
  }, [processos]);

  // Mês/mês anterior relativos ao filtroAno (se for ano atual, usa mês atual; senão, Dez vs Nov)
  const isAnoAtual = filtroAno === anoAtual;
  const mesRef     = isAnoAtual ? hoje.getMonth() + 1 : 12;
  const mesStr     = String(mesRef).padStart(2,'0');
  const mesAntNum  = mesRef === 1 ? 12 : mesRef - 1;
  const anoAntStr  = mesRef === 1 ? String(Number(filtroAno) - 1) : filtroAno;
  const mesAntStr  = String(mesAntNum).padStart(2,'0');

  const stats = useMemo(() => {
    const somaQtd = (arr) => arr.reduce((s,p) => s + parseInt(p.quantidade||1), 0);
    const isRF = (p) => p.categoria === 'Reconhecimento de Firma';
    const STATUS_PENDENTES = ['Em andamento', 'Devolvido', 'Em reanálise'];
    const total            = somaQtd(processos);
    const emAndamento      = somaQtd(processos.filter(p => STATUS_PENDENTES.includes(p.status)));
    const concluidos       = somaQtd(processos.filter(p => p.status === 'Concluído'));
    const conclRF          = somaQtd(processos.filter(p => p.status === 'Concluído' && isRF(p)));
    const conclOutros      = concluidos - conclRF;
    const tarefasPendentes = tarefas.filter(t => !t.concluida).length;
    const oficiosEnviados  = oficios.filter(o => o.status === 'Enviado' || o.status === 'Aguardando Resposta').length;
    const tarefasVencidas  = tarefas.filter(t => !t.concluida && new Date(t.dt_fim) < hoje).length;
    const recFirma         = somaQtd(processos.filter(p => isRF(p)));
    const outrosProcessos  = total - recFirma;
    return { total, emAndamento, concluidos, conclRF, conclOutros, tarefasPendentes, oficiosEnviados, tarefasVencidas, recFirma, outrosProcessos };
  }, [processos, tarefas, oficios]);

  // Valores financeiros — filtrados pelo ano selecionado
  const financeiro = useMemo(() => {
    const filtrar = (ano, mes) => processos.filter(p => {
      const dt = p.dt_conclusao;
      if (!dt) return false;
      return dt.startsWith(ano) && dt.substring(5,7) === mes;
    });

    const listaMes   = filtrar(filtroAno,  mesStr);
    const listaAnt   = filtrar(anoAntStr,  mesAntStr);
    const listaAno   = processos.filter(p => p.dt_conclusao?.startsWith(filtroAno));
    const listaConcl = processos.filter(p => p.status === 'Concluído');

    const soma = (arr) => arr.reduce((s, p) => s + parseFloat(p.valor_ato || 0), 0);

    const vlMes   = soma(listaMes);
    const vlAnt   = soma(listaAnt);
    const vlAno   = soma(listaAno);
    const vlTotal = soma(listaConcl);
    const diffMes = vlMes - vlAnt;
    const diffPct = vlAnt > 0 ? ((vlMes - vlAnt) / vlAnt * 100) : null;

    const somaQtd = (arr) => arr.reduce((s,p) => s + parseInt(p.quantidade||1), 0);
    const isRF = (p) => p.categoria === 'Reconhecimento de Firma';
    return {
      vlMes, vlAnt, vlAno, vlTotal,
      qtdMes: somaQtd(listaMes), qtdAnt: somaQtd(listaAnt), qtdAno: somaQtd(listaAno),
      qtdAnoRF:     somaQtd(listaAno.filter(isRF)),
      qtdAnoOutros: somaQtd(listaAno.filter(p => !isRF(p))),
      qtdTotalRF:   somaQtd(listaConcl.filter(isRF)),
      qtdTotalOutros: somaQtd(listaConcl.filter(p => !isRF(p))),
      diffMes, diffPct,
      labelMes: MESES_FULL[mesRef - 1],
      labelAnt: MESES_FULL[mesAntNum - 1],
    };
  }, [processos, filtroAno]);

  const fmtBRL = (v) => Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const porCategoria = useMemo(() => {
    const map = {};
    processos.filter(p => p.dt_conclusao?.startsWith(filtroAno) && p.categoria !== 'Reconhecimento de Firma')
      .forEach(p => { map[p.categoria] = (map[p.categoria] || 0) + parseInt(p.quantidade||1); });
    return Object.entries(map).map(([label, value]) => ({ label, value }));
  }, [processos, filtroAno]);

  const recFirmaAno = useMemo(() =>
    processos.filter(p => p.dt_conclusao?.startsWith(filtroAno) && p.categoria === 'Reconhecimento de Firma')
      .reduce((s,p) => s + parseInt(p.quantidade||1), 0)
  , [processos, filtroAno]);

  const porResponsavel = useMemo(() => {
    const map = {};
    processos.filter(p => p.dt_conclusao?.startsWith(filtroAno) && p.categoria !== 'Reconhecimento de Firma')
      .forEach(p => {
        const u = (usuarios||[]).find(u=>u.id===p.responsavel_id);
        if (!u) return; // ignora sem responsável
        const rNome = u.nome_simples;
        map[rNome] = (map[rNome] || 0) + parseInt(p.quantidade||1);
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [processos, usuarios, filtroAno]);

  // Processos por mês (6 meses do filtroAno, terminando no mês de referência)
  const porMes = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const m = mesRef - i;
      const ajuste = m <= 0;
      const mesNum = ajuste ? m + 12 : m;
      const anoNum = ajuste ? Number(filtroAno) - 1 : Number(filtroAno);
      const mes = String(mesNum).padStart(2,'0');
      const ano = String(anoNum);
      const qtd = processos.filter(p => p.dt_conclusao?.startsWith(ano) && p.dt_conclusao?.substring(5,7) === mes)
        .reduce((s,p) => s + parseInt(p.quantidade||1), 0);
      result.push({ label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mesNum-1], value: qtd, highlight: i === 0 });
    }
    return result;
  }, [processos, filtroAno]);

  const processosPendentes = processos.filter(p => ['Em andamento', 'Devolvido', 'Em reanálise'].includes(p.status)).slice(0, 5);
  const tarefasRecentes    = tarefas.filter(t => !t.concluida).slice(0, 4);

  const DeltaBadge = ({ diff, pct }) => {
    if (pct === null) return null;
    const cor = pct > 0 ? '#15803d' : pct < 0 ? '#dc2626' : '#6b7280';
    const bg  = pct > 0 ? '#dcfce7' : pct < 0 ? '#fee2e2' : '#f3f4f6';
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: bg, color: cor, whiteSpace: 'nowrap' }}>
        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Visão geral do cartório — {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Ano:</span>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            {anosDisp.map(a => (
              <button key={a} onClick={() => setFiltroAno(a)}
                style={{ padding: '6px 16px', fontSize: 13, fontWeight: filtroAno === a ? 700 : 400, background: filtroAno === a ? 'var(--color-accent)' : 'var(--color-surface)', color: filtroAno === a ? '#fff' : 'var(--color-text-muted)', border: 'none', borderRight: '1px solid var(--color-border)', cursor: 'pointer' }}>
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards — operacionais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
        {/* Card especial: Total de Processos + Rec. Firma */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="stat-card-label">Total de Processos</div>
            <span style={{ fontSize: 16, opacity: 0.6 }}>📋</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-info)' }}>{stats.total}</div>
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Outros processos</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{stats.outrosProcessos}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Rec. de Firma</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{stats.recFirma}</span>
            </div>
          </div>
        </div>
        {/* Card especial: Concluídos + Rec. Firma */}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div className="stat-card-label">Concluídos</div>
            <span style={{ fontSize: 16, opacity: 0.6 }}>✓</span>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{stats.concluidos}</div>
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Outros</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{stats.conclOutros}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Rec. de Firma</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{stats.conclRF}</span>
            </div>
          </div>
        </div>
        {[
          { label: 'Pendentes',          value: stats.emAndamento, sub: 'Em andamento / devolvidos / reanálise', icon: '🔄', color: 'var(--color-warning)' },
          { label: 'Tarefas Pendentes',  value: stats.tarefasPendentes, sub: stats.tarefasVencidas > 0 ? `${stats.tarefasVencidas} vencida(s)` : 'Sem vencidas', icon: '✓', color: stats.tarefasVencidas > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' },
          { label: 'Ofícios Enviados',   value: stats.oficiosEnviados, sub: 'Total enviados', icon: '✉', color: 'var(--color-info)' },
          { label: 'Usuários Ativos',    value: usuarios.filter(u => u.ativo).length, sub: `de ${usuarios.length} cadastrados`, icon: '◉', color: 'var(--color-text-muted)' },
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

      {/* KPI Cards — financeiros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
        {/* Mês atual */}
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-card-label">💰 {financeiro.labelMes}/{anoAtual}</div>
            <DeltaBadge diff={financeiro.diffMes} pct={financeiro.diffPct} />
          </div>
          <div className="stat-card-value" style={{ color: 'var(--color-success)', fontSize: 18 }}>
            R$ {fmtBRL(financeiro.vlMes)}
          </div>
          <div className="stat-card-sub">{financeiro.qtdMes} processo(s) concluído(s)</div>
          {financeiro.vlAnt > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-faint)', borderTop: '1px solid var(--color-border)', paddingTop: 5 }}>
              <span style={{ marginRight: 4 }}>{financeiro.labelAnt}:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>R$ {fmtBRL(financeiro.vlAnt)}</span>
              <span style={{ marginLeft: 6, color: 'var(--color-text-faint)' }}>({financeiro.qtdAnt} proc.)</span>
              <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', color: financeiro.diffMes >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {financeiro.diffMes >= 0 ? '+' : ''}R$ {fmtBRL(financeiro.diffMes)}
              </span>
            </div>
          )}
        </div>

        {/* Ano atual */}
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-info)' }}>
          <div className="stat-card-label">📅 Acumulado {filtroAno}</div>
          <div className="stat-card-value" style={{ color: 'var(--color-info)', fontSize: 18 }}>
            R$ {fmtBRL(financeiro.vlAno)}
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Outros</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{financeiro.qtdAnoOutros}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Rec. de Firma</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{financeiro.qtdAnoRF}</span>
            </div>
          </div>
          {financeiro.qtdAno > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-faint)', borderTop: '1px solid var(--color-border)', paddingTop: 5 }}>
              Ticket médio: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-text-muted)' }}>R$ {fmtBRL(financeiro.vlAno / financeiro.qtdAno)}</span>
            </div>
          )}
        </div>

        {/* Total histórico */}
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-accent-dim)' }}>
          <div className="stat-card-label">🏛 Total Histórico</div>
          <div className="stat-card-value" style={{ color: 'var(--color-text)', fontSize: 18 }}>
            R$ {fmtBRL(financeiro.vlTotal)}
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 6, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Outros</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{financeiro.qtdTotalOutros}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-muted)' }}>Rec. de Firma</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{financeiro.qtdTotalRF}</span>
            </div>
          </div>
          {financeiro.vlTotal > 0 && financeiro.qtdMes > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-faint)', borderTop: '1px solid var(--color-border)', paddingTop: 5 }}>
              {financeiro.labelMes} representa <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {(financeiro.vlMes / financeiro.vlTotal * 100).toFixed(1)}%
              </span> do total
            </div>
          )}
        </div>

        {/* Ticket médio mês */}
        <div className="stat-card" style={{ borderLeft: '3px solid var(--color-warning)' }}>
          <div className="stat-card-label">📊 Ticket Médio — {financeiro.labelMes}</div>
          <div className="stat-card-value" style={{ color: 'var(--color-warning)', fontSize: 18 }}>
            {financeiro.qtdMes > 0 ? `R$ ${fmtBRL(financeiro.vlMes / financeiro.qtdMes)}` : '—'}
          </div>
          <div className="stat-card-sub">por processo concluído</div>
          {financeiro.qtdAnt > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-faint)', borderTop: '1px solid var(--color-border)', paddingTop: 5 }}>
              {financeiro.labelAnt}: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>R$ {fmtBRL(financeiro.vlAnt / financeiro.qtdAnt)}</span>
            </div>
          )}
        </div>
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
          {recFirmaAno > 0 && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--color-accent)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-text-muted)' }}>Reconhecimento de Firma</span>
                </div>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{recFirmaAno}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 4 }}>* não incluído no gráfico acima</div>
            </div>
          )}
        </div>

        {/* Por responsável */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Por Responsável</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porResponsavel.map(([nome, qtd]) => {
              const totalQtd = processos.filter(p=>p.dt_conclusao?.startsWith(filtroAno) && p.categoria !== 'Reconhecimento de Firma' && (usuarios||[]).find(u=>u.id===p.responsavel_id)).reduce((s,p)=>s+parseInt(p.quantidade||1),0);
              const pct = totalQtd > 0 ? (qtd / totalQtd) * 100 : 0;
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
              <div className="card-subtitle">{stats.emAndamento} pendentes</div>
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
                    <td style={{ fontSize: 12 }}>
                        {(() => {
                          try {
                            const arr = JSON.parse(p.partes || '[]');
                            if (!arr.length) return <span style={{ color: 'var(--color-text-faint)' }}>—</span>;
                            return arr.slice(0,2).map((i,idx) => (
                              <div key={idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
                                {i.nome?.trim().split(/\s+/).slice(0,2).join(' ') || '—'}
                              </div>
                            ));
                          } catch { return <span style={{ color: 'var(--color-text-faint)' }}>—</span>; }
                        })()}
                      </td>
                    <td><span className="badge badge-neutral">{(usuarios||[]).find(u=>u.id===p.responsavel_id)?.nome_simples || "—"}</span></td>
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
