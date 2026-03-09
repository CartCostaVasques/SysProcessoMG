import React, { useState, useMemo, useEffect } from 'react';
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
  const porSetor     = {};  // agora = por categoria do processo (campo mais confiável)
  let total = 0;
  let qtd   = 0;

  processos.forEach(p => {
    const v   = parseFloat(p.valor_ato || 0);
    const cat = p.categoria || 'Sem Categoria';
    const esp = p.especie   || 'Sem Tipo';

    // Categoria (igual ao "setor" — usamos p.categoria como agrupador principal)
    if (!porCategoria[cat]) porCategoria[cat] = { qtd: 0, valor: 0 };
    porCategoria[cat].qtd++;
    porCategoria[cat].valor += v;

    // Espécie (tipo de serviço: Categoria › Subcategoria)
    const chave = `${cat} › ${esp}`;
    if (!porEspecie[chave]) porEspecie[chave] = { categoria: cat, especie: esp, qtd: 0, valor: 0 };
    porEspecie[chave].qtd++;
    porEspecie[chave].valor += v;

    // porSetor agora agrupa pelo setor do usuário responsável (mantido para compatibilidade)
    const u   = usuarios.find(u => u.id === p.responsavel_id);
    const set = u?.setor || 'Sem Setor';
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
  const { processos, usuarios, tarefas } = useApp();

  const hoje     = new Date();
  const anoAtual = String(hoje.getFullYear());
  const mesAtual = String(hoje.getMonth() + 1).padStart(2,'0');
  // Mês anterior
  const mesAntNum  = hoje.getMonth() === 0 ? 12 : hoje.getMonth();
  const anoAnt     = hoje.getMonth() === 0 ? String(hoje.getFullYear() - 1) : anoAtual;
  const mesAnt     = String(mesAntNum).padStart(2,'0');
  // Dois meses atrás
  const mes2AntNum = mesAntNum === 1 ? 12 : mesAntNum - 1;
  const ano2Ant    = mesAntNum === 1 ? String(Number(anoAnt) - 1) : anoAnt;
  const mes2Ant    = String(mes2AntNum).padStart(2,'0');

  const [modoVis,  setModoVis]  = useState('mensal');
  const [anoA,     setAnoA]     = useState(anoAnt);    // mês anterior = mais provável ter dados
  const [mesA,     setMesA]     = useState(mesAnt);
  const [anoB,     setAnoB]     = useState(ano2Ant);   // dois meses atrás
  const [mesB,     setMesB]     = useState(mes2Ant);
  const [secao,    setSecao]    = useState('todos');

  // Estados do modo Sequência
  const [seqAno,      setSeqAno]      = useState(anoAtual);
  const [seqMeses,    setSeqMeses]    = useState(6);     // quantos meses exibir
  const [seqAgrup,    setSeqAgrup]    = useState('especie'); // 'categoria' | 'especie' | 'setor'
  const [seqMesInicio,setSeqMesInicio]= useState(
    String(Math.max(1, new Date().getMonth() + 1 - 5)).padStart(2,'0')
  );

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

  const anoARef = React.useRef(null);  // null = ainda não houve troca pelo usuário
  const anoBRef = React.useRef(null);

  // Só ajusta o mês se o USUÁRIO trocou o ano e o mês atual não existe nesse ano
  useEffect(() => {
    if (anoARef.current === null) { anoARef.current = anoA; return; }
    if (anoA !== anoARef.current) {
      anoARef.current = anoA;
      if (mesesDispA.length && !mesesDispA.includes(mesA)) {
        setMesA(mesesDispA[mesesDispA.length - 1]);
      }
    }
  }, [anoA, mesesDispA]);

  useEffect(() => {
    if (anoBRef.current === null) { anoBRef.current = anoB; return; }
    if (anoB !== anoBRef.current) {
      anoBRef.current = anoB;
      if (mesesDispB.length && !mesesDispB.includes(mesB)) {
        setMesB(mesesDispB[mesesDispB.length - 1]);
      }
    }
  }, [anoB, mesesDispB]);

  // Dados dos dois períodos
  const listaA = useMemo(() => filtrarProcessos(processos, anoA, modoVis === 'anual' ? 'todos' : mesA), [processos, anoA, mesA, modoVis]);
  const listaB = useMemo(() => filtrarProcessos(processos, anoB, modoVis === 'anual' ? 'todos' : mesB), [processos, anoB, mesB, modoVis]);

  const dadosA = useMemo(() => agrupar(listaA, usuarios), [listaA, usuarios]);
  const dadosB = useMemo(() => agrupar(listaB, usuarios), [listaB, usuarios]);

  // Dados mensais para comparação ano a ano
  const mensaisA = useMemo(() => dadosMensais(processos, usuarios, anoA), [processos, usuarios, anoA]);
  const mensaisB = useMemo(() => dadosMensais(processos, usuarios, anoB), [processos, usuarios, anoB]);

  // ── Dados do modo Sequência ──────────────────────────────────
  const seqColunas = useMemo(() => {
    const cols = [];
    let ano = parseInt(seqAno);
    let mes = parseInt(seqMesInicio);
    for (let i = 0; i < seqMeses; i++) {
      const mesStr = String(mes).padStart(2,'0');
      cols.push({ ano: String(ano), mes: mesStr, label: `${MESES_LABEL[mes-1]}/${ano}` });
      mes++;
      if (mes > 12) { mes = 1; ano++; }
    }
    return cols;
  }, [seqAno, seqMesInicio, seqMeses]);

  const seqDados = useMemo(() => {
    // Para cada coluna, agrupa os processos
    return seqColunas.map(col => {
      const lista = filtrarProcessos(processos, col.ano, col.mes);
      return agrupar(lista, usuarios);
    });
  }, [seqColunas, processos, usuarios]);

  const seqChaves = useMemo(() => {
    const s = new Set();
    seqDados.forEach(d => {
      const fonte = seqAgrup === 'categoria' ? d.porCategoria
                  : seqAgrup === 'setor'     ? d.porSetor
                  :                            d.porEspecie;
      Object.keys(fonte).forEach(k => s.add(k));
    });
    return Array.from(s).sort();
  }, [seqDados, seqAgrup]);

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
              {[['mensal','Mensal'],['anual','Anual'],['sequencia','Sequência']].map(([id, label]) => (
                <button key={id} onClick={() => setModoVis(id)}
                  style={{ padding: '6px 16px', fontSize: 13, fontWeight: modoVis===id ? 700 : 400, background: modoVis===id ? 'var(--color-accent)' : 'var(--color-surface)', color: modoVis===id ? '#fff' : 'var(--color-text)', border: 'none', borderRight: id !== 'sequencia' ? '1px solid var(--color-border)' : 'none', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Controles Mensal / Anual */}
          {modoVis !== 'sequencia' && (<>
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
          </>)}

          {/* Controles Sequência */}
          {modoVis === 'sequencia' && (<>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Agrupar por</label>
              <select className="form-select" value={seqAgrup} onChange={e => setSeqAgrup(e.target.value)}>
                <option value="especie">Tipo de Serviço</option>
                <option value="categoria">Categoria</option>
                <option value="setor">Responsável (Setor)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mês inicial</label>
              <select className="form-select" value={seqMesInicio} onChange={e => setSeqMesInicio(e.target.value)}>
                {Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')).map(m => (
                  <option key={m} value={m}>{MESES_FULL[parseInt(m)-1]}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ano</label>
              <select className="form-select" value={seqAno} onChange={e => setSeqAno(e.target.value)}>
                {anosDisp.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nº de meses</label>
              <select className="form-select" value={seqMeses} onChange={e => setSeqMeses(Number(e.target.value))}>
                {[3,4,5,6,8,10,12].map(n => <option key={n} value={n}>{n} meses</option>)}
              </select>
            </div>
          </>)}
        </div>
      </div>

      {/* ── Resumo cards (só nos modos mensal/anual) ── */}
      {modoVis !== 'sequencia' && (<>
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

      {/* ── Produtividade por Colaborador ── */}
      {modoVis === 'mensal' && (() => {
        const hoje2 = new Date();
        const usuariosAtivos = (usuarios || []).filter(u => u.ativo !== false);
        const cards = usuariosAtivos.map(u => {
          const procA = listaA.filter(p => p.responsavel_id === u.id);
          const procB = listaB.filter(p => p.responsavel_id === u.id);
          const vlA   = procA.reduce((s, p) => s + parseFloat(p.valor_ato || 0), 0);
          const vlB   = procB.reduce((s, p) => s + parseFloat(p.valor_ato || 0), 0);
          // tarefas
          const tPend    = (tarefas || []).filter(t => !t.concluida && t.responsavel_id === u.id);
          const tConc    = (tarefas || []).filter(t =>  t.concluida && t.responsavel_id === u.id);
          const tAtras   = tPend.filter(t => t.dt_fim && new Date(t.dt_fim) < hoje2);
          // processos em andamento desse usuário (todos os anos)
          const emAnd    = (processos || []).filter(p => p.responsavel_id === u.id && p.status === 'Em andamento');
          const vlAnd    = emAnd.reduce((s, p) => s + parseFloat(p.valor_ato || 0), 0);
          return { u, procA, procB, vlA, vlB, tPend, tConc, tAtras, emAnd, vlAnd };
        }).filter(c => c.procA.length > 0 || c.procB.length > 0 || c.tPend.length > 0);

        if (!cards.length) return null;

        const perfis = { Tabelião: '#f59e0b', Escrevente: 'var(--color-accent)', Administrador: '#8b5cf6', Consultor: '#64748b' };

        return (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>👥 Produtividade por Colaborador</span>
              <span style={{ fontSize: 11, background: 'var(--color-surface-2)', padding: '2px 8px', borderRadius: 10 }}>{labelA} vs {labelB}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {cards.map(({ u, procA, procB, vlA, vlB, tPend, tConc, tAtras, emAnd, vlAnd }) => {
                const inicial  = (u.nome_simples || u.nome || '?')[0].toUpperCase();
                const corPerfil = perfis[u.perfil] || '#64748b';
                const ticketA  = procA.length > 0 ? vlA / procA.length : 0;
                const deltaQtd = procB.length > 0 ? ((procA.length - procB.length) / procB.length * 100) : null;
                const deltaVlr = vlB > 0 ? ((vlA - vlB) / vlB * 100) : null;

                return (
                  <div key={u.id} className="card" style={{ padding: 0, overflow: 'hidden', border: `1px solid var(--color-border)` }}>
                    {/* Cabeçalho */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: corPerfil, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0 }}>
                        {inicial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.nome_simples || u.nome}</div>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: corPerfil + '22', color: corPerfil }}>{u.perfil}</span>
                      </div>
                      {tAtras.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: 8, flexShrink: 0 }}>
                          {tAtras.length} atrasada{tAtras.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Processos período A */}
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Concluídos — {labelA}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 22, fontWeight: 700 }}>{procA.length}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>proc.</span>
                          {deltaQtd !== null && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 6, background: deltaQtd >= 0 ? '#dcfce7' : '#fee2e2', color: deltaQtd >= 0 ? '#15803d' : '#dc2626' }}>
                              {deltaQtd >= 0 ? '+' : ''}{deltaQtd.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: '#22c55e' }}>{fmtVal(vlA)}</div>
                          {ticketA > 0 && <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>ticket {fmtVal(ticketA)}</div>}
                        </div>
                      </div>
                      {/* comparativo período B */}
                      <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
                        <span>{labelB}: <strong>{procB.length}</strong> proc.</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtVal(vlB)}</span>
                      </div>
                    </div>

                    {/* Em andamento */}
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', background: emAnd.length > 0 ? 'color-mix(in srgb, #f59e0b 5%, transparent)' : 'transparent' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#f59e0b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Em Andamento</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontSize: 18, fontWeight: 700 }}>{emAnd.length}</span>
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>proc. pendentes</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: '#f59e0b' }}>{fmtVal(vlAnd)}</div>
                      </div>
                    </div>

                    {/* Tarefas */}
                    <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Tarefas</div>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                          {tConc.length} concl.
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} />
                          {tPend.length} pend.
                        </span>
                        {tAtras.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#dc2626', fontWeight: 700 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                            {tAtras.length} atras.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

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
        {[['todos','Todos'],['especie','Por Tipo de Serviço'],['categoria','Por Categoria']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${secao === id ? 'active' : ''}`} onClick={() => setSecao(id)}>{label}</button>
        ))}
      </div>

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
      </> )} {/* fim modoVis !== sequencia */}

      {/* ══ MODO SEQUÊNCIA ══════════════════════════════════════ */}
      {modoVis === 'sequencia' && (
        <TabelaSequencia
          colunas={seqColunas}
          dados={seqDados}
          chaves={seqChaves}
          agrup={seqAgrup}
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
                    <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pA}%`, background: 'var(--color-accent)', borderRadius: 3, transition: 'width .3s' }} />
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtVal(l.vA.valor)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#94a3b8' }}>{l.vB.qtd||'—'}</td>
                  <td>
                    <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pB}%`, background: '#94a3b8', borderRadius: 3, transition: 'width .3s' }} />
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

// ── Tabela Sequência Mensal ──────────────────────────────────
function TabelaSequencia({ colunas, dados, chaves, agrup }) {
  const fmtV  = (v) => Number(v||0) > 0 ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  const fmtDV = (v) => v === 0 ? '—' : (v > 0 ? `+R$ ${Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}` : `-R$ ${Number(Math.abs(v)).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`);
  const fmtDQ = (v) => v === 0 ? '—' : (v > 0 ? `+${v}` : `${v}`);

  const getDado = (dadoMes, chave) => {
    const fonte = agrup === 'categoria' ? dadoMes.porCategoria
                : agrup === 'setor'     ? dadoMes.porSetor
                :                         dadoMes.porEspecie;
    return fonte[chave] || { qtd: 0, valor: 0 };
  };

  const getLabelChave = (chave) => {
    if (agrup === 'especie') {
      const partes = chave.split(' › ');
      return { label: partes[1] || chave, sub: partes[0] || '' };
    }
    return { label: chave, sub: '' };
  };

  // Totais por coluna
  const totaisCols = colunas.map((_, ci) => ({
    qtd:   chaves.reduce((s, k) => s + getDado(dados[ci], k).qtd,   0),
    valor: chaves.reduce((s, k) => s + getDado(dados[ci], k).valor, 0),
  }));

  const AGRUP_LABEL = { especie: 'Tipo de Serviço', categoria: 'Categoria', setor: 'Setor' };

  // Cabeçalho de colunas: cada mês ocupa 2 colunas (Qtd + Valor) + 1 Δ (menos na última)
  // Layout: [Serviço] [Qtd M1] [Val M1] [Δ] [Qtd M2] [Val M2] [Δ] ... [Qtd Mn] [Val Mn]
  const n = colunas.length;

  return (
    <div className="card" style={{ padding: 0, marginBottom: 20, overflowX: 'auto' }}>
      <div className="card-header">
        <div>
          <div className="card-title">📊 Evolução Mensal — {AGRUP_LABEL[agrup]}</div>
          <div className="card-subtitle" style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
            Δ = diferença em relação ao mês anterior &nbsp;·&nbsp; verde = crescimento &nbsp;·&nbsp; vermelho = queda
          </div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ minWidth: 200 + n * 260, fontSize: 12 }}>
          <thead>
            {/* Linha 1 — Meses */}
            <tr style={{ background: 'var(--color-surface-2)' }}>
              <th rowSpan={2} style={{ minWidth: 180, position: 'sticky', left: 0, background: 'var(--color-surface-2)', zIndex: 2, borderRight: '2px solid var(--color-border)' }}>
                {AGRUP_LABEL[agrup]}
              </th>
              {colunas.map((col, ci) => (
                <th key={ci} colSpan={ci < n - 1 ? 3 : 2}
                  style={{ textAlign: 'center', borderLeft: '1px solid var(--color-border)', padding: '6px 4px', fontSize: 11, fontWeight: 700, color: ci === n - 1 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                  {col.label}
                </th>
              ))}
            </tr>
            {/* Linha 2 — Qtd / Valor / Δ */}
            <tr style={{ background: 'var(--color-surface-2)' }}>
              {colunas.map((_, ci) => (
                <React.Fragment key={ci}>
                  <th style={{ textAlign: 'right', fontSize: 10, color: 'var(--color-text-faint)', borderLeft: '1px solid var(--color-border)', minWidth: 50 }}>Qtd</th>
                  <th style={{ textAlign: 'right', fontSize: 10, color: 'var(--color-text-faint)', minWidth: 130 }}>Valor</th>
                  {ci < n - 1 && <th style={{ textAlign: 'center', fontSize: 10, color: 'var(--color-text-faint)', minWidth: 80, background: 'var(--color-surface-3)' }}>Δ vs ant.</th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {chaves.length === 0 ? (
              <tr><td colSpan={1 + n * 3} style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-faint)' }}>Sem dados no período selecionado</td></tr>
            ) : chaves.map(chave => {
              const { label, sub } = getLabelChave(chave);
              const temQualquerDado = dados.some(d => getDado(d, chave).qtd > 0);
              return (
                <tr key={chave} style={{ opacity: temQualquerDado ? 1 : 0.3 }}>
                  <td style={{ position: 'sticky', left: 0, background: 'var(--color-surface)', borderRight: '2px solid var(--color-border)', zIndex: 1 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 176 }}>{label}</div>
                    {sub && <div style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>{sub}</div>}
                  </td>
                  {colunas.map((_, ci) => {
                    const cur  = getDado(dados[ci],    chave);
                    const prev = ci > 0 ? getDado(dados[ci-1], chave) : null;
                    const dq   = prev !== null ? cur.qtd   - prev.qtd   : null;
                    const dv   = prev !== null ? cur.valor - prev.valor : null;
                    const corDQ = dq === null ? '' : dq > 0 ? '#15803d' : dq < 0 ? '#dc2626' : '#6b7280';
                    const corDV = dv === null ? '' : dv > 0 ? '#15803d' : dv < 0 ? '#dc2626' : '#6b7280';
                    const bgDelta = dv === null ? 'var(--color-surface-3)' : dv > 0 ? 'rgba(21,128,61,0.07)' : dv < 0 ? 'rgba(220,38,38,0.07)' : 'var(--color-surface-3)';
                    return (
                      <React.Fragment key={ci}>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', borderLeft: '1px solid var(--color-border)', fontWeight: cur.qtd > 0 ? 600 : 400, color: cur.qtd > 0 ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
                          {cur.qtd || '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: cur.valor > 0 ? 'var(--color-text)' : 'var(--color-text-faint)' }}>
                          {fmtV(cur.valor)}
                        </td>
                        {ci < n - 1 && (
                          <td style={{ textAlign: 'center', background: bgDelta, padding: '4px 6px' }}>
                            {dq !== null && dq !== 0 && (
                              <div style={{ fontSize: 10, fontWeight: 700, color: corDQ, whiteSpace: 'nowrap' }}>{fmtDQ(dq)} proc.</div>
                            )}
                            {dv !== null && dv !== 0 && (
                              <div style={{ fontSize: 10, fontWeight: 600, color: corDV, whiteSpace: 'nowrap' }}>{fmtDV(dv)}</div>
                            )}
                            {dq === 0 && dv === 0 && <span style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>—</span>}
                            {dq === null && <span style={{ fontSize: 10, color: 'var(--color-text-faint)' }}>—</span>}
                          </td>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          {/* Totais por coluna */}
          <tfoot>
            <tr style={{ fontWeight: 700, background: 'var(--color-surface-2)', borderTop: '2px solid var(--color-border)' }}>
              <td style={{ position: 'sticky', left: 0, background: 'var(--color-surface-2)', borderRight: '2px solid var(--color-border)', padding: '8px 10px', zIndex: 1 }}>Total</td>
              {colunas.map((_, ci) => {
                const cur  = totaisCols[ci];
                const prev = ci > 0 ? totaisCols[ci-1] : null;
                const dq   = prev !== null ? cur.qtd   - prev.qtd   : null;
                const dv   = prev !== null ? cur.valor - prev.valor : null;
                const corDQ = dq === null ? '' : dq > 0 ? '#15803d' : dq < 0 ? '#dc2626' : '#6b7280';
                const corDV = dv === null ? '' : dv > 0 ? '#15803d' : dv < 0 ? '#dc2626' : '#6b7280';
                return (
                  <React.Fragment key={ci}>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', borderLeft: '1px solid var(--color-border)', padding: '8px 6px' }}>{cur.qtd}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', padding: '8px 6px' }}>{fmtV(cur.valor)}</td>
                    {ci < n - 1 && (
                      <td style={{ textAlign: 'center', padding: '8px 6px', background: 'var(--color-surface-3)' }}>
                        {dq !== null && dq !== 0 && <div style={{ fontSize: 10, fontWeight: 700, color: corDQ }}>{fmtDQ(dq)} proc.</div>}
                        {dv !== null && dv !== 0 && <div style={{ fontSize: 10, fontWeight: 600, color: corDV }}>{fmtDV(dv)}</div>}
                        {((dq === 0 && dv === 0) || dq === null) && <span style={{ color: 'var(--color-text-faint)', fontSize: 10 }}>—</span>}
                      </td>
                    )}
                  </React.Fragment>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
