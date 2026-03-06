import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_FULL  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmtBRL  = (v) => Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtVal  = (v) => `R$ ${fmtBRL(v)}`;
const fmtPct  = (a, b) => {
  if (!b || b === 0) return a > 0 ? '+∞%' : '—';
  const pct = ((a - b) / b) * 100;
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
};

const DeltaBadge = ({ atual, anterior }) => {
  if (!anterior && anterior !== 0) return null;
  const pct = anterior === 0 ? (atual > 0 ? Infinity : 0) : ((atual - anterior) / anterior) * 100;
  const cor  = pct > 0 ? '#15803d' : pct < 0 ? '#dc2626' : '#6b7280';
  const bg   = pct > 0 ? '#dcfce7' : pct < 0 ? '#fee2e2' : '#f3f4f6';
  const label = pct === Infinity ? '+∞%' : (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: bg, color: cor, marginLeft: 6, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
};

// Agrupa processos por categoria / especie / setor
function agrupar(processos, usuarios, dtRef) {
  const porCategoria = {};
  const porEspecie   = {};
  const porSetor     = {};
  let total = 0;
  let qtd   = 0;

  processos.forEach(p => {
    const v   = parseFloat(p.valor_ato || 0);
    const cat = p.categoria || 'Sem Categoria';
    const esp = p.especie   || 'Sem Tipo';
    const u   = usuarios.find(u => u.id === p.responsavel_id);
    const set = u?.setor || 'Sem Setor';

    // Categoria
    if (!porCategoria[cat]) porCategoria[cat] = { qtd: 0, valor: 0 };
    porCategoria[cat].qtd++;
    porCategoria[cat].valor += v;

    // Espécie (tipo de serviço)
    const chave = `${cat} › ${esp}`;
    if (!porEspecie[chave]) porEspecie[chave] = { categoria: cat, especie: esp, qtd: 0, valor: 0 };
    porEspecie[chave].qtd++;
    porEspecie[chave].valor += v;

    // Setor
    if (!porSetor[set]) porSetor[set] = { qtd: 0, valor: 0 };
    porSetor[set].qtd++;
    porSetor[set].valor += v;

    total += v;
    qtd++;
  });

  return { porCategoria, porEspecie, porSetor, total, qtd };
}

// Filtra processos por ano+mes (mes = '01'..'12' ou 'todos')
function filtrarProcessos(processos, ano, mes) {
  return processos.filter(p => {
    const dt = p.dt_conclusao;   // apenas concluídos
    if (!dt) return false;
    if (!dt.startsWith(ano)) return false;
    if (mes !== 'todos' && dt.substring(5,7) !== mes) return false;
    return true;
  });
}

// Dados mensais para comparação ano a ano
function dadosMensais(processos, usuarios, ano) {
  const meses = Array.from({ length: 12 }, (_, i) => String(i+1).padStart(2,'0'));
  return meses.map(mes => {
    const lista = filtrarProcessos(processos, ano, mes);
    const { total, qtd } = agrupar(lista, usuarios, null);
    return { mes, total, qtd };
  });
}

export default function Panoramico() {
  const { processos, usuarios } = useApp();

  const anoAtual = String(new Date().getFullYear());
  const mesAtual = String(new Date().getMonth() + 1).padStart(2,'0');

  const [modoVis,  setModoVis]  = useState('mensal');   // 'mensal' | 'anual'
  const [anoA,     setAnoA]     = useState(anoAtual);
  const [mesA,     setMesA]     = useState(mesAtual);
  const [anoB,     setAnoB]     = useState(String(Number(anoAtual) - 1));
  const [mesB,     setMesB]     = useState(mesAtual);
  const [secao,    setSecao]    = useState('todos');     // 'todos' | 'categoria' | 'especie' | 'setor'

  // Anos disponíveis
  const anosDisp = useMemo(() => {
    const s = new Set();
    processos.forEach(p => { if (p.dt_conclusao) s.add(p.dt_conclusao.substring(0,4)); });
    if (!s.size) s.add(anoAtual);
    return Array.from(s).sort((a,b) => b - a);
  }, [processos]);

  // Meses disponíveis por ano
  const mesesDispA = useMemo(() => {
    const s = new Set(processos.filter(p => p.dt_conclusao?.startsWith(anoA)).map(p => p.dt_conclusao.substring(5,7)));
    return Array.from(s).sort();
  }, [processos, anoA]);
  const mesesDispB = useMemo(() => {
    const s = new Set(processos.filter(p => p.dt_conclusao?.startsWith(anoB)).map(p => p.dt_conclusao.substring(5,7)));
    return Array.from(s).sort();
  }, [processos, anoB]);

  // Se o mês selecionado não existe nos disponíveis, ajusta para o mais recente
  useEffect(() => {
    if (mesesDispA.length && !mesesDispA.includes(mesA)) {
      setMesA(mesesDispA[mesesDispA.length - 1]);
    }
  }, [mesesDispA]);
  useEffect(() => {
    if (mesesDispB.length && !mesesDispB.includes(mesB)) {
      setMesB(mesesDispB[mesesDispB.length - 1]);
    }
  }, [mesesDispB]);

  // Dados dos dois períodos
  const listaA = useMemo(() => filtrarProcessos(processos, anoA, modoVis === 'anual' ? 'todos' : mesA), [processos, anoA, mesA, modoVis]);
  const listaB = useMemo(() => filtrarProcessos(processos, anoB, modoVis === 'anual' ? 'todos' : mesB), [processos, anoB, mesB, modoVis]);

  const dadosA = useMemo(() => agrupar(listaA, usuarios), [listaA, usuarios]);
  const dadosB = useMemo(() => agrupar(listaB, usuarios), [listaB, usuarios]);

  // Dados mensais para comparação ano a ano
  const mensaisA = useMemo(() => dadosMensais(processos, usuarios, anoA), [processos, usuarios, anoA]);
  const mensaisB = useMemo(() => dadosMensais(processos, usuarios, anoB), [processos, usuarios, anoB]);

  const labelA = modoVis === 'anual' ? anoA : `${MESES_FULL[parseInt(mesA)-1]}/${anoA}`;
  const labelB = modoVis === 'anual' ? anoB : `${MESES_FULL[parseInt(mesB)-1]}/${anoB}`;

  // Chaves unificadas para comparação
  const todasCats    = [...new Set([...Object.keys(dadosA.porCategoria), ...Object.keys(dadosB.porCategoria)])].sort();
  const todasEspecies= [...new Set([...Object.keys(dadosA.porEspecie),   ...Object.keys(dadosB.porEspecie)])].sort();
  const todosSetores = [...new Set([...Object.keys(dadosA.porSetor),     ...Object.keys(dadosB.porSetor)])].sort();

  // Barra visual proporcional
  const BarraComparacao = ({ valA, valB, maxVal }) => {
    const pA = maxVal > 0 ? (valA / maxVal) * 100 : 0;
    const pB = maxVal > 0 ? (valB / maxVal) * 100 : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: 140 }}>
        <div style={{ height: 8, background: 'var(--color-surface-3, #e5e7eb)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pA}%`, background: 'var(--color-accent)', borderRadius: 4, transition: 'width .3s' }} />
        </div>
        <div style={{ height: 8, background: 'var(--color-surface-3, #e5e7eb)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pB}%`, background: '#94a3b8', borderRadius: 4, transition: 'width .3s' }} />
        </div>
      </div>
    );
  };

  const maxCatValor   = Math.max(...todasCats.map(k => Math.max(dadosA.porCategoria[k]?.valor||0, dadosB.porCategoria[k]?.valor||0)), 1);
  const maxEspValor   = Math.max(...todasEspecies.map(k => Math.max(dadosA.porEspecie[k]?.valor||0, dadosB.porEspecie[k]?.valor||0)), 1);
  const maxSetValor   = Math.max(...todosSetores.map(k => Math.max(dadosA.porSetor[k]?.valor||0, dadosB.porSetor[k]?.valor||0)), 1);
  const maxMensalVal  = Math.max(...mensaisA.map(m => m.valor), ...mensaisB.map(m => m.valor), 1);
  const maxMensalQtd  = Math.max(...mensaisA.map(m => m.qtd),   ...mensaisB.map(m => m.qtd),   1);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Panorâmico</div>
          <div className="page-sub">Análise comparativa de períodos</div>
        </div>
      </div>

      {/* ── Controles ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          {/* Modo */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Modo</label>
            <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              {[['mensal','Mensal'],['anual','Anual']].map(([id, label]) => (
                <button key={id} onClick={() => setModoVis(id)}
                  style={{ padding: '6px 18px', fontSize: 13, fontWeight: modoVis===id ? 700 : 400, background: modoVis===id ? 'var(--color-accent)' : 'var(--color-surface)', color: modoVis===id ? '#fff' : 'var(--color-text)', border: 'none', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Período A */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '8px 12px', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', borderRadius: 'var(--radius-md)', border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 4, alignSelf: 'center' }}>Período A</div>
            {modoVis === 'mensal' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Mês</label>
                <select className="form-select" style={{ fontSize: 13, height: 34, padding: '0 8px' }} value={mesA} onChange={e => setMesA(e.target.value)}>
                  {(mesesDispA.length ? mesesDispA : Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'))).map(m => (
                    <option key={m} value={m}>{MESES_FULL[parseInt(m)-1]}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Ano</label>
              <select className="form-select" style={{ fontSize: 13, height: 34, padding: '0 8px' }} value={anoA} onChange={e => { setAnoA(e.target.value); setMesA(mesAtual); }}>
                {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div style={{ fontSize: 18, color: 'var(--color-text-faint)', alignSelf: 'center', paddingBottom: 2 }}>vs</div>

          {/* Período B */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '8px 12px', background: 'rgba(148,163,184,0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(148,163,184,0.3)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4, alignSelf: 'center' }}>Período B</div>
            {modoVis === 'mensal' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Mês</label>
                <select className="form-select" style={{ fontSize: 13, height: 34, padding: '0 8px' }} value={mesB} onChange={e => setMesB(e.target.value)}>
                  {(mesesDispB.length ? mesesDispB : Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'))).map(m => (
                    <option key={m} value={m}>{MESES_FULL[parseInt(m)-1]}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 11 }}>Ano</label>
              <select className="form-select" style={{ fontSize: 13, height: 34, padding: '0 8px' }} value={anoB} onChange={e => { setAnoB(e.target.value); setMesB(mesAtual); }}>
                {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cards resumo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total de Processos', vA: dadosA.qtd,   vB: dadosB.qtd,   fmt: v => v, mono: false },
          { label: 'Valor Total',        vA: dadosA.total, vB: dadosB.total, fmt: fmtVal, mono: true  },
          { label: 'Ticket Médio',       vA: dadosA.qtd > 0 ? dadosA.total/dadosA.qtd : 0, vB: dadosB.qtd > 0 ? dadosB.total/dadosB.qtd : 0, fmt: fmtVal, mono: true },
        ].map(({ label, vA, vB, fmt, mono }) => (
          <div key={label} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, fontWeight: 600 }}>{label}</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', marginBottom: 2 }}>{labelA}</div>
                <div style={{ fontSize: mono ? 18 : 24, fontWeight: 700, fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{fmt(vA)}</div>
              </div>
              <div style={{ paddingBottom: 3 }}>
                <DeltaBadge atual={vA} anterior={vB} />
              </div>
            </div>
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>{labelB}: </span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{fmt(vB)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Comparação mensal (modo anual) ── */}
      {modoVis === 'anual' && (
        <div className="card" style={{ padding: 0, marginBottom: 20 }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">📅 Comparação Mês a Mês</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, background: 'var(--color-accent)', borderRadius: 2, display: 'inline-block' }} />{anoA}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, background: '#94a3b8', borderRadius: 2, display: 'inline-block' }} />{anoB}</span>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: 80 }} />
                <col style={{ width: 60 }} /><col /><col style={{ width: 130 }} />
                <col style={{ width: 60 }} /><col /><col style={{ width: 130 }} />
                <col style={{ width: 80 }} /><col style={{ width: 80 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th style={{ textAlign: 'right', color: 'var(--color-accent)' }}>Qtd {anoA}</th>
                  <th></th>
                  <th style={{ textAlign: 'right', color: 'var(--color-accent)' }}>Valor {anoA}</th>
                  <th style={{ textAlign: 'right', color: '#64748b' }}>Qtd {anoB}</th>
                  <th></th>
                  <th style={{ textAlign: 'right', color: '#64748b' }}>Valor {anoB}</th>
                  <th style={{ textAlign: 'center' }}>Δ Qtd</th>
                  <th style={{ textAlign: 'center' }}>Δ Valor</th>
                </tr>
              </thead>
              <tbody>
                {MESES_LABEL.map((ml, idx) => {
                  const mA = mensaisA[idx];
                  const mB = mensaisB[idx];
                  const temDados = mA.qtd > 0 || mB.qtd > 0;
                  return (
                    <tr key={ml} style={{ opacity: temDados ? 1 : 0.4 }}>
                      <td style={{ fontWeight: 600, fontSize: 12 }}>{ml}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{mA.qtd||'—'}</td>
                      <td>
                        <div style={{ height: 8, background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${maxMensalQtd > 0 ? (mA.qtd/maxMensalQtd)*100 : 0}%`, background: 'var(--color-accent)', borderRadius: 4 }} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{mA.total > 0 ? fmtVal(mA.total) : '—'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8' }}>{mB.qtd||'—'}</td>
                      <td>
                        <div style={{ height: 8, background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${maxMensalQtd > 0 ? (mB.qtd/maxMensalQtd)*100 : 0}%`, background: '#94a3b8', borderRadius: 4 }} />
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8' }}>{mB.total > 0 ? fmtVal(mB.total) : '—'}</td>
                      <td style={{ textAlign: 'center' }}>{temDados && <DeltaBadge atual={mA.qtd} anterior={mB.qtd} />}</td>
                      <td style={{ textAlign: 'center' }}>{temDados && <DeltaBadge atual={mA.total} anterior={mB.total} />}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700, background: 'var(--color-surface-2)' }}>
                  <td style={{ padding: '8px 10px' }}>Total</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px' }}>{dadosA.qtd}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px' }}>{fmtVal(dadosA.total)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px', color: '#94a3b8' }}>{dadosB.qtd}</td>
                  <td></td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px', color: '#94a3b8' }}>{fmtVal(dadosB.total)}</td>
                  <td style={{ textAlign: 'center' }}><DeltaBadge atual={dadosA.qtd} anterior={dadosB.qtd} /></td>
                  <td style={{ textAlign: 'center' }}><DeltaBadge atual={dadosA.total} anterior={dadosB.total} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Filtro de seção ── */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[['todos','Todos'],['categoria','Por Categoria'],['especie','Por Tipo de Serviço'],['setor','Por Setor']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${secao === id ? 'active' : ''}`} onClick={() => setSecao(id)}>{label}</button>
        ))}
      </div>

      {/* ── Tabela por Categoria ── */}
      {(secao === 'todos' || secao === 'categoria') && (
        <TabelaComparacao
          titulo="📁 Por Categoria"
          labelA={labelA} labelB={labelB}
          linhas={todasCats.map(k => ({
            chave: k, label: k,
            vA: dadosA.porCategoria[k] || { qtd: 0, valor: 0 },
            vB: dadosB.porCategoria[k] || { qtd: 0, valor: 0 },
          }))}
          maxValor={maxCatValor}
        />
      )}

      {/* ── Tabela por Tipo de Serviço ── */}
      {(secao === 'todos' || secao === 'especie') && (
        <TabelaComparacao
          titulo="🔧 Por Tipo de Serviço"
          labelA={labelA} labelB={labelB}
          linhas={todasEspecies.map(k => ({
            chave: k,
            label: dadosA.porEspecie[k]?.especie || dadosB.porEspecie[k]?.especie || k,
            sublabel: dadosA.porEspecie[k]?.categoria || dadosB.porEspecie[k]?.categoria || '',
            vA: dadosA.porEspecie[k]   || { qtd: 0, valor: 0 },
            vB: dadosB.porEspecie[k]   || { qtd: 0, valor: 0 },
          }))}
          maxValor={maxEspValor}
          agrupado
        />
      )}

      {/* ── Tabela por Setor ── */}
      {(secao === 'todos' || secao === 'setor') && (
        <TabelaComparacao
          titulo="🏢 Por Setor"
          labelA={labelA} labelB={labelB}
          linhas={todosSetores.map(k => ({
            chave: k, label: k,
            vA: dadosA.porSetor[k] || { qtd: 0, valor: 0 },
            vB: dadosB.porSetor[k] || { qtd: 0, valor: 0 },
          }))}
          maxValor={maxSetValor}
        />
      )}
    </div>
  );
}

// ── Componente de tabela comparativa reutilizável ────────────
function TabelaComparacao({ titulo, labelA, labelB, linhas, maxValor, agrupado }) {
  const fmtVal = (v) => Number(v||0) > 0 ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  const totalA = linhas.reduce((s, l) => ({ qtd: s.qtd + l.vA.qtd, valor: s.valor + l.vA.valor }), { qtd: 0, valor: 0 });
  const totalB = linhas.reduce((s, l) => ({ qtd: s.qtd + l.vB.qtd, valor: s.valor + l.vB.valor }), { qtd: 0, valor: 0 });

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20 }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title">{titulo}</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: 'var(--color-accent)', borderRadius: 2, display: 'inline-block' }} />{labelA}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: '#94a3b8', borderRadius: 2, display: 'inline-block' }} />{labelB}</span>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="data-table" style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col /><col style={{ width: 55 }} /><col style={{ width: 120 }} /><col style={{ width: 150 }} />
            <col style={{ width: 55 }} /><col style={{ width: 120 }} /><col style={{ width: 150 }} />
            <col style={{ width: 75 }} /><col style={{ width: 75 }} />
          </colgroup>
          <thead>
            <tr>
              <th></th>
              <th style={{ textAlign: 'right', color: 'var(--color-accent)', fontSize: 11 }}>Qtd</th>
              <th style={{ fontSize: 11, color: 'var(--color-accent)' }}></th>
              <th style={{ textAlign: 'right', color: 'var(--color-accent)', fontSize: 11 }}>Valor — {labelA}</th>
              <th style={{ textAlign: 'right', color: '#64748b', fontSize: 11 }}>Qtd</th>
              <th style={{ fontSize: 11, color: '#64748b' }}></th>
              <th style={{ textAlign: 'right', color: '#64748b', fontSize: 11 }}>Valor — {labelB}</th>
              <th style={{ textAlign: 'center', fontSize: 11 }}>Δ Qtd</th>
              <th style={{ textAlign: 'center', fontSize: 11 }}>Δ Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-faint)' }}>Sem dados</td></tr>
            ) : linhas.map(l => {
              const pA = maxValor > 0 ? (l.vA.valor / maxValor) * 100 : 0;
              const pB = maxValor > 0 ? (l.vB.valor / maxValor) * 100 : 0;
              const temDados = l.vA.qtd > 0 || l.vB.qtd > 0;
              return (
                <tr key={l.chave} style={{ opacity: temDados ? 1 : 0.35 }}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.label}</div>
                    {l.sublabel && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{l.sublabel}</div>}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{l.vA.qtd||'—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pA}%`, background: 'var(--color-accent)', borderRadius: 3, transition: 'width .3s' }} />
                      </div>
                      <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pB}%`, background: '#94a3b8', borderRadius: 3, transition: 'width .3s' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtVal(l.vA.valor)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8' }}>{l.vB.qtd||'—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pA}%`, background: 'var(--color-accent)', borderRadius: 3 }} />
                      </div>
                      <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pB}%`, background: '#94a3b8', borderRadius: 3 }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8' }}>{fmtVal(l.vB.valor)}</td>
                  <td style={{ textAlign: 'center' }}>{temDados && <DeltaBadge atual={l.vA.qtd} anterior={l.vB.qtd} />}</td>
                  <td style={{ textAlign: 'center' }}>{temDados && <DeltaBadge atual={l.vA.valor} anterior={l.vB.valor} />}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 700, background: 'var(--color-surface-2)' }}>
              <td style={{ padding: '8px 10px', fontSize: 12 }}>Total</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px' }}>{totalA.qtd}</td>
              <td></td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px' }}>{fmtVal(totalA.valor)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px', color: '#94a3b8' }}>{totalB.qtd}</td>
              <td></td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 10px', color: '#94a3b8' }}>{fmtVal(totalB.valor)}</td>
              <td style={{ textAlign: 'center' }}><DeltaBadge atual={totalA.qtd} anterior={totalB.qtd} /></td>
              <td style={{ textAlign: 'center' }}><DeltaBadge atual={totalA.valor} anterior={totalB.valor} /></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
