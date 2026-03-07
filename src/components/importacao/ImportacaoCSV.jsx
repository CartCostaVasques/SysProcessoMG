import { useState, useRef, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';

// ─────────────────────────────────────────────────────────────
// PADRÃO DE IMPORTAÇÃO CSV
// ─────────────────────────────────────────────────────────────
// FORMATO MÍNIMO:  numero_interno;cliente;dt_abertura;dt_conclusao;valor
// FORMATO COMPLETO:
//   numero_interno;numero_judicial;cliente;municipio;dt_abertura;
//   dt_conclusao;valor;categoria;especie;responsavel;status;livro_ato;folhas_ato;obs
//
// REGRAS:
//   Separador : ponto e vírgula (;) — também aceita vírgula ou TAB
//   Datas     : DD/MM/AAAA ou AAAA-MM-DD
//   Valores   : ponto ou vírgula decimal (143.54 ou 143,54)
//   Encoding  : UTF-8
//   responsavel: nome simples do usuário (ex: Karol, Hugo, Adriana)
// ─────────────────────────────────────────────────────────────

const SEPARADORES = [';', ',', '\t'];

const normCol = s => String(s||'').toLowerCase().trim()
  .replace(/[áàã]/g,'a').replace(/[éê]/g,'e').replace(/[í]/g,'i')
  .replace(/[óô]/g,'o').replace(/[ú]/g,'u').replace(/ç/g,'c')
  .replace(/[\s_\-\.]+/g,'_');

const ALIASES = {
  numero_interno:  ['numero_interno','num_interno','n_interno','os','o_s','numero','num','n_os'],
  numero_judicial: ['numero_judicial','num_judicial','judicial'],
  cliente:         ['cliente','interessado','parte','nome','razao_social'],
  municipio:       ['municipio','cidade','local'],
  dt_abertura:     ['dt_abertura','data_abertura','data_entrada','dt_entrada','data_entr','dt_entr','data'],
  dt_conclusao:    ['dt_conclusao','data_conclusao','data_exec','dt_exec'],
  valor:           ['valor','valor_total','valor_ato','total','vlr'],
  categoria:       ['categoria','cat'],
  especie:         ['especie','tipo','tipo_servico','servico','subcategoria'],
  responsavel:     ['responsavel','resp','responsavel_nome','usuario'],
  status:          ['status','situacao'],
  livro_ato:       ['livro_ato','livro'],
  folhas_ato:      ['folhas_ato','folhas'],
  obs:             ['obs','observacao','observacoes'],
};

function detectarColuna(headers, campo) {
  const aliases = ALIASES[campo] || [campo];
  for (const h of headers) { if (aliases.includes(normCol(h))) return h; }
  return null;
}

function parsearData(s) {
  if (!s) return null;
  const str = String(s).trim();
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

function parsearValor(s) {
  const str = String(s||'').trim().replace(/[R$\s]/g,'');
  if (!str || str === '0') return 0;
  if (str.includes(',')) return parseFloat(str.replace(/\./g,'').replace(',','.')) || 0;
  return parseFloat(str) || 0;
}

function parsearCSV(texto) {
  const primeira = texto.split('\n')[0];
  let sep = ';';
  let maxCount = 0;
  for (const s of SEPARADORES) {
    const count = (primeira.match(new RegExp(s === '\t' ? '\t' : `\\${s}`, 'g')) || []).length;
    if (count > maxCount) { maxCount = count; sep = s; }
  }
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  if (linhas.length < 2) return { erro: 'Arquivo vazio ou sem dados.', linhas: [], sep, headers: [] };
  const headers = linhas[0].split(sep).map(h => h.trim().replace(/^"|"$/g,''));
  const dados = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].split(sep).map(c => c.trim().replace(/^"|"$/g,''));
    if (cols.every(c => !c)) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = cols[idx] || ''; });
    dados.push(obj);
  }
  return { erro: null, linhas: dados, sep, headers };
}

const Progresso = ({ atual, total, label }) => (
  <div style={{ marginTop:8 }}>
    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
      <span style={{ color:'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontFamily:'var(--font-mono)', fontWeight:700 }}>{atual}/{total}</span>
    </div>
    <div style={{ height:8, background:'var(--color-surface-2)', borderRadius:4, overflow:'hidden' }}>
      <div style={{ height:'100%', width:`${total>0?(atual/total)*100:0}%`,
        background:'var(--color-accent)', borderRadius:4, transition:'width .15s' }} />
    </div>
  </div>
);

// Select compacto inline
const TdSelect = ({ value, onChange, options, placeholder, width=110 }) => (
  <select value={value||''} onChange={e => onChange(e.target.value)}
    style={{ fontSize:11, padding:'2px 4px', width, height:26, borderRadius:4,
      border:`1px solid ${!value ? '#fca5a5' : 'var(--color-border)'}`,
      background:'var(--color-surface)', color:'var(--color-text)', cursor:'pointer' }}>
    <option value="">{placeholder}</option>
    {options.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
  </select>
);

export default function ImportacaoCSV() {
  const { supabaseClient: sb, servicos, usuarios, addToast } = useApp();

  const fileRef  = useRef(null);
  const [parsed,     setParsed]     = useState(null);
  const [linhas,     setLinhas]     = useState([]);  // linhas editáveis
  const [importando, setImportando] = useState(false);
  const [progresso,  setProgresso]  = useState({ atual:0, total:0, label:'' });
  const [resultado,  setResultado]  = useState(null);
  const [abaAtiva,   setAbaAtiva]   = useState('importar');

  // Listas para selects
  const categorias = useMemo(() => [...new Set(servicos.map(s => s.categoria))].sort(), [servicos]);
  const getEspecies = useCallback(cat => servicos.filter(s => !cat || s.categoria === cat).map(s => s.subcategoria).sort(), [servicos]);
  const usuariosAtivos = useMemo(() => usuarios.filter(u => u.ativo).map(u => ({ value: u.id, label: u.nome_simples })), [usuarios]);

  // Atualizar campo de uma linha
  const setLinha = (idx, campo, valor) => {
    setLinhas(prev => prev.map((l, i) => {
      if (i !== idx) return l;
      const nova = { ...l, [campo]: valor };
      if (campo === 'categoria') nova.especie = ''; // resetar espécie ao trocar categoria
      return nova;
    }));
  };

  // Aplicar categoria/serviço/responsável para todas as linhas selecionadas
  const [aplicarTodos, setAplicarTodos] = useState({ categoria:'', especie:'', responsavel_id:'' });
  const aplicarParaTodos = () => {
    setLinhas(prev => prev.map(l => ({
      ...l,
      ...(aplicarTodos.categoria   ? { categoria:     aplicarTodos.categoria,   especie: aplicarTodos.especie || l.especie } : {}),
      ...(aplicarTodos.especie     ? { especie:        aplicarTodos.especie     } : {}),
      ...(aplicarTodos.responsavel_id ? { responsavel_id: aplicarTodos.responsavel_id } : {}),
    })));
    addToast('Aplicado a todas as linhas.', 'success');
  };

  // Carregar arquivo
  const carregarArquivo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const result = parsearCSV(e.target.result);
      if (result.erro) { addToast(result.erro, 'error'); return; }

      const mapa = {};
      Object.keys(ALIASES).forEach(campo => { mapa[campo] = detectarColuna(result.headers, campo); });

      // Mapear usuário por nome simples
      const respPorNome = {};
      usuarios.forEach(u => { respPorNome[u.nome_simples?.toLowerCase().trim()] = u.id; });

      const linhasMapeadas = result.linhas.map((row, idx) => {
        const respNomeCSV = mapa.responsavel ? (row[mapa.responsavel]||'').toLowerCase().trim() : '';
        return {
          _idx:           idx,
          _erro:          [],
          numero_interno:  row[mapa.numero_interno]  || '',
          numero_judicial: row[mapa.numero_judicial] || '',
          cliente:         row[mapa.cliente]         || '',
          municipio:       row[mapa.municipio]        || 'Paranatinga',
          dt_abertura:     parsearData(row[mapa.dt_abertura]),
          dt_conclusao:    parsearData(row[mapa.dt_conclusao]),
          valor:           parsearValor(row[mapa.valor]),
          categoria:       row[mapa.categoria]       || '',
          especie:         row[mapa.especie]         || '',
          responsavel_id:  respPorNome[respNomeCSV]  || '',
          status:          row[mapa.status]          || '',
          livro_ato:       row[mapa.livro_ato]       || '',
          folhas_ato:      row[mapa.folhas_ato]      || '',
          obs:             row[mapa.obs]             || '',
        };
      });

      setParsed({ ...result, mapa });
      setLinhas(linhasMapeadas);
      setResultado(null);
      addToast(`${linhasMapeadas.length} linhas carregadas.`, 'success');
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Validação ao vivo
  const linhasValidadas = useMemo(() => linhas.map(l => {
    const erros = [];
    if (!l.numero_interno) erros.push('Nº interno');
    if (!l.dt_abertura)    erros.push('Dt abertura');
    if (!l.categoria)      erros.push('Categoria');
    if (!l.especie)        erros.push('Serviço');
    return { ...l, _erros: erros, _ok: erros.length === 0 };
  }), [linhas]);

  const qtdOk    = linhasValidadas.filter(l => l._ok).length;
  const qtdErro  = linhasValidadas.filter(l => !l._ok).length;

  // Importar
  const importar = async () => {
    const validas = linhasValidadas.filter(l => l._ok);
    if (!sb || !validas.length) return;
    setImportando(true);
    setProgresso({ atual:0, total:validas.length, label:'Iniciando...' });
    let ok = 0, skip = 0, erro = 0;

    try {
      const { data: existentes } = await sb.from('processos').select('numero_interno');
      const existSet = new Set((existentes||[]).map(p => String(p.numero_interno).trim()));

      const { data: ints } = await sb.from('interessados').select('id,nome');
      const intMap = {};
      (ints||[]).forEach(i => { intMap[i.nome.toLowerCase().trim()] = i.id; });

      for (let i = 0; i < validas.length; i++) {
        const l = validas[i];
        setProgresso({ atual:i+1, total:validas.length, label:`${l.numero_interno} — ${l.cliente}` });

        if (existSet.has(String(l.numero_interno).trim())) { skip++; continue; }

        // Criar interessado se não existir
        let intId = null;
        if (l.cliente) {
          const key = l.cliente.toLowerCase().trim();
          if (intMap[key]) {
            intId = intMap[key];
          } else {
            const { data: novoInt } = await sb.from('interessados').insert({ nome: l.cliente }).select('id').single();
            if (novoInt) { intId = novoInt.id; intMap[key] = novoInt.id; }
          }
        }

        const dtConc = l.dt_conclusao;
        const { error } = await sb.from('processos').insert({
          numero_interno:  l.numero_interno,
          numero_judicial: l.numero_judicial || null,
          categoria:       l.categoria,
          especie:         l.especie,
          municipio:       l.municipio || 'Paranatinga',
          status:          l.status || (dtConc ? 'Concluído' : 'Em andamento'),
          dt_abertura:     l.dt_abertura,
          dt_conclusao:    dtConc || null,
          valor_ato:       l.valor || null,
          responsavel_id:  l.responsavel_id || null,
          livro_ato:       l.livro_ato || null,
          folhas_ato:      l.folhas_ato || null,
          obs:             l.obs || null,
          partes:          intId ? JSON.stringify([{ id:intId, nome:l.cliente, vinculo:'Parte' }]) : '[]',
        });

        if (error) { erro++; console.error(l.numero_interno, error.message); }
        else { ok++; existSet.add(String(l.numero_interno).trim()); }
      }

      setResultado({ ok, skip, erro });
      addToast(`${ok} importados · ${skip} já existiam · ${erro} erros`, erro > 0 ? 'error' : 'success');
    } catch(e) { addToast('Erro: ' + e.message, 'error'); }
    setImportando(false);
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Importação CSV</div>
          <div className="page-sub">Importar processos a partir de arquivo CSV</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom:20 }}>
        {[['importar','⬆ Importar'],['padrao','📋 Padrão']].map(([id,label]) => (
          <button key={id} className={`tab-btn ${abaAtiva===id?'active':''}`} onClick={() => setAbaAtiva(id)}>{label}</button>
        ))}
      </div>

      {/* ── ABA PADRÃO ── */}
      {abaAtiva === 'padrao' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">📋 Padrão de Importação CSV</div></div>
            <div style={{ fontSize:13, lineHeight:1.8, color:'var(--color-text-muted)' }}>
              <p><strong style={{ color:'var(--color-text)' }}>Separador:</strong> <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>;</code> (detectado automaticamente — aceita vírgula ou TAB também)</p>
              <p><strong style={{ color:'var(--color-text)' }}>Encoding:</strong> UTF-8</p>
              <p><strong style={{ color:'var(--color-text)' }}>Datas:</strong> <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>DD/MM/AAAA</code> ou <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>AAAA-MM-DD</code></p>
              <p><strong style={{ color:'var(--color-text)' }}>Valores:</strong> <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>143.54</code> ou <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>143,54</code></p>
              <p><strong style={{ color:'var(--color-text)' }}>responsavel:</strong> nome simples do usuário (ex: Karol, Hugo, Adriana) — ou deixar em branco e preencher na tela</p>
              <p><strong style={{ color:'var(--color-text)' }}>categoria / especie:</strong> podem vir no CSV ou ser preenchidos na tela linha a linha</p>
            </div>
          </div>
          <div className="card" style={{ padding:0 }}>
            <div className="card-header"><div className="card-title">🗂 Colunas Reconhecidas</div></div>
            <table className="data-table" style={{ width:'100%' }}>
              <thead><tr><th>Campo</th><th>Aliases aceitos</th><th>Obrig.</th><th>Observação</th></tr></thead>
              <tbody>
                {[
                  ['numero_interno','numero_interno, os, o_s, numero, num','✅','Número interno'],
                  ['numero_judicial','numero_judicial, judicial','—','Opcional'],
                  ['cliente','cliente, interessado, parte, nome, razao_social','✅','Criado se não existir'],
                  ['municipio','municipio, cidade, local','—','Padrão: Paranatinga'],
                  ['dt_abertura','dt_abertura, data_abertura, data_entrada, data','✅','DD/MM/AAAA'],
                  ['dt_conclusao','dt_conclusao, data_conclusao, data_exec, dt_exec','—','Se preenchida → Concluído'],
                  ['valor','valor, valor_total, valor_ato, total, vlr','—','Decimal'],
                  ['categoria','categoria, cat','—','Editável na tela'],
                  ['especie','especie, tipo, tipo_servico, servico, subcategoria','—','Editável na tela'],
                  ['responsavel','responsavel, resp, usuario','—','Nome simples — editável na tela'],
                  ['status','status, situacao','—','Auto pela dt_conclusao'],
                  ['livro_ato','livro_ato, livro','—','Opcional'],
                  ['folhas_ato','folhas_ato, folhas','—','Opcional'],
                  ['obs','obs, observacao, observacoes','—','Opcional'],
                ].map(([campo,aliases,obrig,obs]) => (
                  <tr key={campo}>
                    <td><code style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{campo}</code></td>
                    <td style={{ fontSize:11, color:'var(--color-text-muted)' }}>{aliases}</td>
                    <td style={{ textAlign:'center' }}>{obrig}</td>
                    <td style={{ fontSize:12, color:'var(--color-text-muted)' }}>{obs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">📄 Exemplo</div></div>
            <pre style={{ fontSize:12, background:'var(--color-surface-2)', padding:12, borderRadius:'var(--radius-md)', overflow:'auto', color:'var(--color-text-muted)', margin:0 }}>{`numero_interno;cliente;dt_abertura;dt_conclusao;valor;responsavel
541516;RONALDY WILLIAM ALMEIDA SILVA;30/01/2026;02/02/2026;0;Karol
542323;FORUM DA COMARCA DE PARANATINGA-MT;06/02/2026;06/02/2026;115.65;Hugo
538585;RIO DO CEDRO ENERGIA LTDA;08/01/2026;10/02/2026;6948.45;Adriana`}</pre>
          </div>
        </div>
      )}

      {/* ── ABA IMPORTAR ── */}
      {abaAtiva === 'importar' && (
        <>
          {/* Upload */}
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-header"><div className="card-title">📂 Arquivo CSV</div></div>
            <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              <input ref={fileRef} type="file" accept=".csv,.txt"
                onChange={e => carregarArquivo(e.target.files[0])}
                style={{ fontSize:13 }} />
              {parsed && (
                <span style={{ fontSize:13, color:'var(--color-text-muted)' }}>
                  ✓ <strong>{parsed.linhas.length}</strong> linhas · sep <code style={{ background:'var(--color-surface-2)', padding:'1px 5px', borderRadius:3 }}>{parsed.sep === '\t' ? 'TAB' : parsed.sep}</code>
                </span>
              )}
            </div>
          </div>

          {linhas.length > 0 && (
            <>
              {/* Resumo */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
                {[
                  { label:'Total',          val:linhas.length,  cor:'var(--color-text)' },
                  { label:'✅ Prontas',      val:qtdOk,          cor:'#15803d' },
                  { label:'⚠ Faltam dados', val:qtdErro,        cor:qtdErro>0?'#dc2626':'var(--color-text-muted)' },
                ].map(({ label,val,cor }) => (
                  <div key={label} className="card" style={{ padding:'12px 16px', textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'var(--color-text-muted)', marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:24, fontWeight:700, color:cor }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Aplicar para todas */}
              <div className="card" style={{ marginBottom:16 }}>
                <div className="card-header">
                  <div className="card-title">⚡ Aplicar para Todas as Linhas</div>
                  <span style={{ fontSize:12, color:'var(--color-text-muted)' }}>Preencha e clique em aplicar — sobrescreve apenas os campos selecionados</span>
                </div>
                <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label" style={{ fontSize:11 }}>Categoria</label>
                    <select className="form-select" style={{ fontSize:13, height:34 }}
                      value={aplicarTodos.categoria}
                      onChange={e => setAplicarTodos(p => ({ ...p, categoria:e.target.value, especie:'' }))}>
                      <option value="">— manter —</option>
                      {categorias.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label" style={{ fontSize:11 }}>Serviço</label>
                    <select className="form-select" style={{ fontSize:13, height:34 }}
                      value={aplicarTodos.especie}
                      onChange={e => setAplicarTodos(p => ({ ...p, especie:e.target.value }))}
                      disabled={!aplicarTodos.categoria}>
                      <option value="">— manter —</option>
                      {getEspecies(aplicarTodos.categoria).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label className="form-label" style={{ fontSize:11 }}>Responsável</label>
                    <select className="form-select" style={{ fontSize:13, height:34 }}
                      value={aplicarTodos.responsavel_id}
                      onChange={e => setAplicarTodos(p => ({ ...p, responsavel_id:e.target.value }))}>
                      <option value="">— manter —</option>
                      {usuariosAtivos.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-secondary" style={{ height:34 }} onClick={aplicarParaTodos}>
                    Aplicar a Todas
                  </button>
                </div>
              </div>

              {/* Tabela editável */}
              <div className="card" style={{ padding:0, marginBottom:16 }}>
                <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div className="card-title">📋 Revisar e Editar Linha a Linha</div>
                  <button className="btn btn-primary"
                    disabled={importando || qtdOk === 0}
                    onClick={importar}>
                    {importando ? '⏳ Importando...' : `▶ Importar ${qtdOk} processos`}
                  </button>
                </div>

                {importando && <div style={{ padding:'0 16px 12px' }}><Progresso {...progresso} /></div>}

                {resultado && (
                  <div style={{ margin:'0 16px 12px', padding:12, borderRadius:'var(--radius-md)',
                    background:resultado.erro>0?'#fef3c7':'#f0fdf4',
                    border:`1px solid ${resultado.erro>0?'#fcd34d':'#86efac'}`, fontSize:13 }}>
                    ✅ <strong>{resultado.ok}</strong> importados &nbsp;·&nbsp;
                    <strong>{resultado.skip}</strong> já existiam
                    {resultado.erro>0 && <> &nbsp;·&nbsp; <span style={{ color:'#dc2626' }}><strong>{resultado.erro}</strong> erros</span></>}
                  </div>
                )}

                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:'var(--color-surface-2)', borderBottom:'2px solid var(--color-border)' }}>
                        <th style={{ padding:'8px 6px', textAlign:'left', width:80 }}>Nº Interno</th>
                        <th style={{ padding:'8px 6px', textAlign:'left', width:80 }}>Dt Abertura</th>
                        <th style={{ padding:'8px 6px', textAlign:'left', width:80 }}>Dt Conclusão</th>
                        <th style={{ padding:'8px 6px', textAlign:'left', minWidth:160 }}>Cliente</th>
                        <th style={{ padding:'8px 6px', textAlign:'left', width:115 }}>Categoria</th>
                        <th style={{ padding:'8px 6px', textAlign:'left', width:130 }}>Serviço</th>
                        <th style={{ padding:'8px 6px', textAlign:'left', width:100 }}>Responsável</th>
                        <th style={{ padding:'8px 6px', textAlign:'right', width:85 }}>Valor</th>
                        <th style={{ padding:'8px 6px', textAlign:'center', width:36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasValidadas.map((l, idx) => (
                        <tr key={idx} style={{
                          borderBottom:'1px solid var(--color-border)',
                          background: l._ok ? 'transparent' : 'color-mix(in srgb, #dc2626 4%, transparent)',
                        }}>
                          <td style={{ padding:'4px 6px', fontFamily:'var(--font-mono)', fontSize:11 }}>{l.numero_interno||'—'}</td>
                          <td style={{ padding:'4px 6px', fontSize:11 }}>
                            {l.dt_abertura ? l.dt_abertura.split('-').reverse().join('/') : <span style={{ color:'#dc2626' }}>—</span>}
                          </td>
                          <td style={{ padding:'4px 6px', fontSize:11 }}>
                            {l.dt_conclusao ? l.dt_conclusao.split('-').reverse().join('/') : '—'}
                          </td>
                          <td style={{ padding:'4px 6px', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                            title={l.cliente}>{l.cliente||'—'}</td>
                          <td style={{ padding:'4px 6px' }}>
                            <TdSelect
                              value={l.categoria}
                              onChange={v => setLinha(idx, 'categoria', v)}
                              options={categorias}
                              placeholder="Categoria"
                              width={110}
                            />
                          </td>
                          <td style={{ padding:'4px 6px' }}>
                            <TdSelect
                              value={l.especie}
                              onChange={v => setLinha(idx, 'especie', v)}
                              options={getEspecies(l.categoria)}
                              placeholder="Serviço"
                              width={125}
                            />
                          </td>
                          <td style={{ padding:'4px 6px' }}>
                            <TdSelect
                              value={l.responsavel_id}
                              onChange={v => setLinha(idx, 'responsavel_id', v)}
                              options={usuariosAtivos}
                              placeholder="Resp."
                              width={95}
                            />
                          </td>
                          <td style={{ padding:'4px 6px', textAlign:'right', fontFamily:'var(--font-mono)', fontSize:11 }}>
                            {l.valor > 0 ? `R$ ${l.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}
                          </td>
                          <td style={{ padding:'4px 6px', textAlign:'center' }}>
                            {l._ok
                              ? <span style={{ color:'#15803d', fontSize:14 }}>✓</span>
                              : <span title={l._erros.join(', ')} style={{ color:'#dc2626', fontSize:14, cursor:'help' }}>⚠</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
