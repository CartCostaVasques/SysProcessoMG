import { useState, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';

// ─────────────────────────────────────────────────────────────
// PADRÃO DE IMPORTAÇÃO CSV — documentado aqui para referência
// ─────────────────────────────────────────────────────────────
//
// FORMATO MÍNIMO (campos obrigatórios):
//   numero_interno ; cliente ; dt_abertura ; dt_conclusao ; valor
//
// FORMATO COMPLETO (todos os campos):
//   numero_interno ; numero_judicial ; cliente ; municipio ;
//   dt_abertura ; dt_conclusao ; valor ; categoria ; especie ;
//   status ; livro_ato ; folhas_ato ; obs
//
// REGRAS:
//   - Separador: ponto e vírgula (;)
//   - Datas: DD/MM/AAAA ou AAAA-MM-DD
//   - Valor: ponto como decimal (ex: 143.54) ou vírgula (ex: 143,54)
//   - Encoding: UTF-8
//   - Primeira linha: cabeçalho (nomes das colunas, case insensitive)
//   - cliente: nome do interessado (criado automaticamente se não existir)
//   - status: "Concluído" ou "Em andamento" (padrão: Concluído se dt_conclusao preenchida)
//   - Se categoria/especie ausentes no CSV, serão definidas na tela antes de importar
// ─────────────────────────────────────────────────────────────

const SEPARADORES = [';', ',', '\t'];
const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Normaliza nome de coluna para comparação
const normCol = s => String(s||'').toLowerCase().trim()
  .replace(/[áàã]/g,'a').replace(/[éê]/g,'e').replace(/[í]/g,'i')
  .replace(/[óô]/g,'o').replace(/[ú]/g,'u').replace(/ç/g,'c')
  .replace(/[\s_\-\.]+/g,'_');

// Mapa de aliases de colunas
const ALIASES = {
  numero_interno:  ['numero_interno','num_interno','n_interno','os','o_s','numero','num','n_os'],
  numero_judicial: ['numero_judicial','num_judicial','judicial'],
  cliente:         ['cliente','interessado','parte','nome','razao_social','cliente_nome'],
  municipio:       ['municipio','cidade','local'],
  dt_abertura:     ['dt_abertura','data_abertura','data_entrada','dt_entrada','data_entr','dt_entr','data'],
  dt_conclusao:    ['dt_conclusao','data_conclusao','data_exec','dt_exec','data_exec','dt_conclusao'],
  valor:           ['valor','valor_total','valor_ato','total','vlr'],
  categoria:       ['categoria','cat'],
  especie:         ['especie','tipo','tipo_servico','servico','subcategoria'],
  status:          ['status','situacao'],
  livro_ato:       ['livro_ato','livro'],
  folhas_ato:      ['folhas_ato','folhas'],
  obs:             ['obs','observacao','observacoes'],
};

function detectarColuna(headers, campo) {
  const aliases = ALIASES[campo] || [campo];
  for (const h of headers) {
    const n = normCol(h);
    if (aliases.includes(n)) return h;
  }
  return null;
}

function parsearData(s) {
  if (!s) return null;
  const str = String(s).trim();
  // DD/MM/AAAA
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  // AAAA-MM-DD
  const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) return str;
  return null;
}

function parsearValor(s) {
  const str = String(s||'').trim().replace(/[R$\s]/g,'');
  if (!str || str === '0') return 0;
  if (str.includes(',')) return parseFloat(str.replace(/\./g,'').replace(',','.')) || 0;
  return parseFloat(str) || 0;
}

function parsearCSV(texto) {
  // Detectar separador
  const primeira = texto.split('\n')[0];
  let sep = ';';
  for (const s of SEPARADORES) {
    if ((primeira.match(new RegExp('\\' + s === '\\t' ? s : `\\${s}`, 'g')) || []).length > 1) {
      sep = s; break;
    }
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
  <div style={{ marginTop: 8 }}>
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

export default function ImportacaoCSV() {
  const { supabaseClient: sb, servicos, usuarios, addToast, fetchProcessos } = useApp();

  const fileRef = useRef(null);
  const [parsed,      setParsed]      = useState(null);   // { linhas, headers, sep, mapa }
  const [categoria,   setCategoria]   = useState('');
  const [especie,     setEspecie]     = useState('');
  const [importando,  setImportando]  = useState(false);
  const [progresso,   setProgresso]   = useState({ atual:0, total:0, label:'' });
  const [resultado,   setResultado]   = useState(null);
  const [abaAtiva,    setAbaAtiva]    = useState('importar'); // 'importar' | 'padrao'

  const categorias = [...new Set(servicos.map(s => s.categoria))].sort();
  const especies   = servicos.filter(s => !categoria || s.categoria === categoria).map(s => s.subcategoria).sort();

  // Detectar mapeamento de colunas
  const mapa = useMemo(() => {
    if (!parsed) return {};
    const m = {};
    Object.keys(ALIASES).forEach(campo => {
      m[campo] = detectarColuna(parsed.headers, campo);
    });
    return m;
  }, [parsed]);

  // Preview mapeado
  const linhasMapeadas = useMemo(() => {
    if (!parsed) return [];
    return parsed.linhas.map(row => ({
      numero_interno:  row[mapa.numero_interno]  || '',
      numero_judicial: row[mapa.numero_judicial] || '',
      cliente:         row[mapa.cliente]         || '',
      municipio:       row[mapa.municipio]        || 'Paranatinga',
      dt_abertura:     parsearData(row[mapa.dt_abertura]),
      dt_conclusao:    parsearData(row[mapa.dt_conclusao]),
      valor:           parsearValor(row[mapa.valor]),
      categoria:       row[mapa.categoria]       || categoria || '',
      especie:         row[mapa.especie]         || especie   || '',
      status:          row[mapa.status]          || '',
      livro_ato:       row[mapa.livro_ato]       || '',
      folhas_ato:      row[mapa.folhas_ato]      || '',
      obs:             row[mapa.obs]             || '',
      _raw:            row,
    }));
  }, [parsed, mapa, categoria, especie]);

  // Validação
  const { validas, invalidas } = useMemo(() => {
    const v = [], inv = [];
    linhasMapeadas.forEach((l, i) => {
      const erros = [];
      if (!l.numero_interno) erros.push('Nº interno ausente');
      if (!l.dt_abertura)    erros.push('Data abertura inválida');
      if (!l.categoria)      erros.push('Categoria não definida');
      if (!l.especie)        erros.push('Serviço não definido');
      if (erros.length) inv.push({ ...l, _linha: i+2, _erros: erros });
      else              v.push({ ...l, _linha: i+2 });
    });
    return { validas: v, invalidas: inv };
  }, [linhasMapeadas]);

  const carregarArquivo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const texto = e.target.result;
      const result = parsearCSV(texto);
      if (result.erro) { addToast(result.erro, 'error'); return; }
      setParsed(result);
      setResultado(null);
      addToast(`${result.linhas.length} linhas carregadas.`, 'success');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const importar = async () => {
    if (!sb || !validas.length) return;
    setImportando(true);
    setProgresso({ atual:0, total: validas.length, label: 'Importando...' });
    let ok = 0, skip = 0, erro = 0;

    try {
      // Buscar processos existentes
      const { data: existentes } = await sb.from('processos').select('numero_interno');
      const existSet = new Set((existentes||[]).map(p => String(p.numero_interno).trim()));

      // Buscar/criar interessados
      const { data: ints } = await sb.from('interessados').select('id,nome');
      const intMap = {};
      (ints||[]).forEach(i => { intMap[i.nome.toLowerCase().trim()] = i.id; });

      for (let i = 0; i < validas.length; i++) {
        const l = validas[i];
        setProgresso(p => ({ ...p, atual: i+1, label: `Importando ${l.numero_interno}...` }));

        if (existSet.has(String(l.numero_interno).trim())) { skip++; continue; }

        // Criar interessado se não existir
        let intId = null;
        if (l.cliente) {
          const nomeKey = l.cliente.toLowerCase().trim();
          if (intMap[nomeKey]) {
            intId = intMap[nomeKey];
          } else {
            const { data: novoInt } = await sb.from('interessados').insert({ nome: l.cliente }).select('id').single();
            if (novoInt) { intId = novoInt.id; intMap[nomeKey] = novoInt.id; }
          }
        }

        const catFinal = l.categoria || categoria;
        const espFinal = l.especie   || especie;
        const dtConc   = l.dt_conclusao;
        const statusFinal = l.status || (dtConc ? 'Concluído' : 'Em andamento');

        const processo = {
          numero_interno:  l.numero_interno,
          numero_judicial: l.numero_judicial || null,
          categoria:       catFinal,
          especie:         espFinal,
          municipio:       l.municipio || 'Paranatinga',
          status:          statusFinal,
          dt_abertura:     l.dt_abertura,
          dt_conclusao:    dtConc || null,
          valor_ato:       l.valor || null,
          livro_ato:       l.livro_ato || null,
          folhas_ato:      l.folhas_ato || null,
          obs:             l.obs || null,
          partes:          intId ? JSON.stringify([{ id: intId, nome: l.cliente, vinculo: 'Parte' }]) : '[]',
        };

        const { error } = await sb.from('processos').insert(processo);
        if (error) { erro++; console.error(error); }
        else { ok++; existSet.add(String(l.numero_interno).trim()); }
      }

      setResultado({ ok, skip, erro });
      addToast(`${ok} importados · ${skip} já existiam · ${erro} erros`, erro > 0 ? 'error' : 'success');
      if (ok > 0 && typeof fetchProcessos === 'function') fetchProcessos();
    } catch(e) { addToast('Erro: ' + e.message, 'error'); }
    setImportando(false);
  };

  const camposDetectados = Object.entries(mapa).filter(([,v]) => v);
  const camposFaltando   = Object.entries(mapa).filter(([k,v]) => !v && ['numero_interno','cliente','dt_abertura'].includes(k));

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Importação CSV</div>
          <div className="page-sub">Importar processos a partir de arquivo CSV</div>
        </div>
      </div>

      {/* Abas */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {[['importar','⬆ Importar'],['padrao','📋 Padrão de Importação']].map(([id,label]) => (
          <button key={id} className={`tab-btn ${abaAtiva===id?'active':''}`} onClick={() => setAbaAtiva(id)}>{label}</button>
        ))}
      </div>

      {/* ── ABA PADRÃO ── */}
      {abaAtiva === 'padrao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">📋 Padrão de Importação CSV</div></div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-muted)' }}>
              <p><strong style={{ color:'var(--color-text)' }}>Separador:</strong> ponto e vírgula <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>;</code> (também aceita vírgula ou TAB — detectado automaticamente)</p>
              <p><strong style={{ color:'var(--color-text)' }}>Encoding:</strong> UTF-8</p>
              <p><strong style={{ color:'var(--color-text)' }}>Primeira linha:</strong> cabeçalho com nomes das colunas (não sensível a maiúsculas)</p>
              <p><strong style={{ color:'var(--color-text)' }}>Datas:</strong> <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>DD/MM/AAAA</code> ou <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>AAAA-MM-DD</code></p>
              <p><strong style={{ color:'var(--color-text)' }}>Valores:</strong> use ponto ou vírgula como decimal (ex: <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>143.54</code> ou <code style={{ background:'var(--color-surface-2)', padding:'1px 6px', borderRadius:4 }}>143,54</code>)</p>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div className="card-header"><div className="card-title">🗂 Colunas Reconhecidas</div></div>
            <table className="data-table" style={{ width:'100%' }}>
              <thead><tr><th>Campo</th><th>Nomes aceitos no cabeçalho</th><th>Obrigatório</th><th>Observação</th></tr></thead>
              <tbody>
                {[
                  ['numero_interno',  'numero_interno, num_interno, os, o_s, numero, num',             '✅','Número interno do processo'],
                  ['numero_judicial', 'numero_judicial, num_judicial, judicial',                        '—', 'Opcional'],
                  ['cliente',        'cliente, interessado, parte, nome, razao_social',                 '✅','Criado automaticamente se não existir'],
                  ['municipio',      'municipio, cidade, local',                                        '—', 'Padrão: Paranatinga'],
                  ['dt_abertura',    'dt_abertura, data_abertura, data_entrada, dt_entrada, data',      '✅','Formato DD/MM/AAAA'],
                  ['dt_conclusao',   'dt_conclusao, data_conclusao, data_exec, dt_exec',                '—', 'Se preenchida, status = Concluído'],
                  ['valor',          'valor, valor_total, valor_ato, total, vlr',                       '—', 'Decimal com ponto ou vírgula'],
                  ['categoria',      'categoria, cat',                                                  '—', 'Se ausente, definir na tela antes de importar'],
                  ['especie',        'especie, tipo, tipo_servico, servico, subcategoria',              '—', 'Se ausente, definir na tela antes de importar'],
                  ['status',         'status, situacao',                                                '—', 'Padrão automático pela data de conclusão'],
                  ['livro_ato',      'livro_ato, livro',                                                '—', 'Opcional'],
                  ['folhas_ato',     'folhas_ato, folhas',                                              '—', 'Opcional'],
                  ['obs',            'obs, observacao, observacoes',                                    '—', 'Opcional'],
                ].map(([campo, aliases, obrig, obs]) => (
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
            <div className="card-header"><div className="card-title">📄 Exemplo Mínimo</div></div>
            <pre style={{ fontSize:12, background:'var(--color-surface-2)', padding:12, borderRadius:'var(--radius-md)', overflow:'auto', color:'var(--color-text-muted)', margin:0 }}>{`numero_interno;cliente;dt_abertura;dt_conclusao;valor
541516;RONALDY WILLIAM ALMEIDA SILVA;30/01/2026;02/02/2026;0
542323;FORUM DA COMARCA DE PARANATINGA-MT;06/02/2026;06/02/2026;0
538585;RIO DO CEDRO ENERGIA LTDA;08/01/2026;10/02/2026;6948.45`}</pre>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">📄 Exemplo Completo</div></div>
            <pre style={{ fontSize:12, background:'var(--color-surface-2)', padding:12, borderRadius:'var(--radius-md)', overflow:'auto', color:'var(--color-text-muted)', margin:0 }}>{`numero_interno;numero_judicial;cliente;municipio;dt_abertura;dt_conclusao;valor;categoria;especie;status;livro_ato;folhas_ato;obs
541516;;RONALDY WILLIAM ALMEIDA SILVA;Paranatinga;30/01/2026;02/02/2026;0;Protesto;Cancelamento;Concluído;;;
542323;;FORUM DA COMARCA DE PARANATINGA-MT;Paranatinga;06/02/2026;06/02/2026;0;Certidao de Atos;Cert de Protesto;Concluído;;;
538585;;RIO DO CEDRO ENERGIA LTDA;Paranatinga;08/01/2026;10/02/2026;6948.45;Protesto;Cancelamento;Concluído;;;`}</pre>
          </div>
        </div>
      )}

      {/* ── ABA IMPORTAR ── */}
      {abaAtiva === 'importar' && (
        <>
          {/* Upload */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">📂 Arquivo CSV</div></div>
            <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
              <input ref={fileRef} type="file" accept=".csv,.txt"
                onChange={e => carregarArquivo(e.target.files[0])}
                style={{ fontSize:13 }} />
              {parsed && (
                <span style={{ fontSize:13, color:'var(--color-text-muted)' }}>
                  ✓ <strong>{parsed.linhas.length}</strong> linhas · separador <code style={{ background:'var(--color-surface-2)', padding:'1px 5px', borderRadius:3 }}>{parsed.sep === '\t' ? 'TAB' : parsed.sep}</code> · <strong>{parsed.headers.length}</strong> colunas detectadas
                </span>
              )}
            </div>

            {/* Colunas detectadas */}
            {parsed && (
              <div style={{ marginTop:12, display:'flex', gap:6, flexWrap:'wrap' }}>
                {camposDetectados.map(([campo, col]) => (
                  <span key={campo} style={{ fontSize:11, padding:'2px 8px', borderRadius:8,
                    background:'#dcfce7', color:'#15803d', fontWeight:600 }}>
                    ✓ {campo} → "{col}"
                  </span>
                ))}
                {camposFaltando.map(([campo]) => (
                  <span key={campo} style={{ fontSize:11, padding:'2px 8px', borderRadius:8,
                    background:'#fee2e2', color:'#dc2626', fontWeight:600 }}>
                    ✗ {campo} não encontrado
                  </span>
                ))}
              </div>
            )}
          </div>

          {parsed && (
            <>
              {/* Categoria e Serviço (se não vieram no CSV) */}
              {(!mapa.categoria || !mapa.especie) && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <div className="card-title">🔧 Categoria e Serviço</div>
                    <span style={{ fontSize:12, color:'var(--color-text-muted)' }}>Não detectados no CSV — selecione para aplicar a todas as linhas</span>
                  </div>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label">Categoria {!mapa.categoria && <span style={{ color:'#dc2626' }}>*</span>}</label>
                      <select className="form-select" value={categoria} onChange={e => { setCategoria(e.target.value); setEspecie(''); }}>
                        <option value="">— Selecione —</option>
                        {categorias.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label">Serviço {!mapa.especie && <span style={{ color:'#dc2626' }}>*</span>}</label>
                      <select className="form-select" value={especie} onChange={e => setEspecie(e.target.value)} disabled={!categoria}>
                        <option value="">— Selecione —</option>
                        {especies.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
                {[
                  { label:'Total de linhas',  val: linhasMapeadas.length, cor:'var(--color-text)' },
                  { label:'✅ Válidas',        val: validas.length,        cor:'#15803d' },
                  { label:'⚠ Com problema',   val: invalidas.length,      cor: invalidas.length > 0 ? '#dc2626' : 'var(--color-text-muted)' },
                ].map(({ label, val, cor }) => (
                  <div key={label} className="card" style={{ padding:'12px 16px', textAlign:'center' }}>
                    <div style={{ fontSize:11, color:'var(--color-text-muted)', marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:24, fontWeight:700, color: cor }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Problemas */}
              {invalidas.length > 0 && (
                <div className="card" style={{ padding:0, marginBottom:16, border:'1px solid #fca5a5' }}>
                  <div className="card-header" style={{ background:'#fee2e2' }}>
                    <div className="card-title" style={{ color:'#dc2626' }}>⚠ Linhas com problema ({invalidas.length})</div>
                  </div>
                  <div className="table-wrapper" style={{ maxHeight:200, overflowY:'auto' }}>
                    <table className="data-table" style={{ width:'100%' }}>
                      <thead><tr><th>Linha</th><th>Nº Interno</th><th>Cliente</th><th>Erros</th></tr></thead>
                      <tbody>
                        {invalidas.map((l,i) => (
                          <tr key={i}>
                            <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{l._linha}</td>
                            <td style={{ fontSize:12 }}>{l.numero_interno || '—'}</td>
                            <td style={{ fontSize:12 }}>{l.cliente || '—'}</td>
                            <td style={{ fontSize:11, color:'#dc2626' }}>{l._erros.join(' · ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Preview das válidas */}
              <div className="card" style={{ padding:0, marginBottom:16 }}>
                <div className="card-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div className="card-title">👁 Preview — {validas.length} linhas válidas</div>
                  <button className="btn btn-primary"
                    disabled={importando || !validas.length || (!mapa.categoria && !categoria) || (!mapa.especie && !especie)}
                    onClick={importar}>
                    {importando ? '⏳ Importando...' : `▶ Importar ${validas.length} processos`}
                  </button>
                </div>

                {importando && <div style={{ padding:'0 16px 12px' }}><Progresso {...progresso} /></div>}

                {resultado && (
                  <div style={{ margin:'0 16px 12px', padding:12, borderRadius:'var(--radius-md)',
                    background: resultado.erro > 0 ? '#fef3c7' : '#f0fdf4',
                    border: `1px solid ${resultado.erro > 0 ? '#fcd34d' : '#86efac'}`, fontSize:13 }}>
                    ✅ <strong>{resultado.ok}</strong> importados &nbsp;·&nbsp;
                    <strong>{resultado.skip}</strong> já existiam
                    {resultado.erro > 0 && <> &nbsp;·&nbsp; <span style={{ color:'#dc2626' }}><strong>{resultado.erro}</strong> erros</span></>}
                  </div>
                )}

                <div className="table-wrapper" style={{ maxHeight:450, overflowY:'auto' }}>
                  <table className="data-table" style={{ tableLayout:'fixed', width:'100%' }}>
                    <colgroup>
                      <col style={{ width:85 }}/><col style={{ width:90 }}/><col style={{ width:90 }}/>
                      <col /><col /><col style={{ width:100 }}/><col style={{ width:90 }}/>
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Nº Interno</th><th>Dt Abertura</th><th>Dt Conclusão</th>
                        <th>Cliente</th><th>Categoria / Serviço</th>
                        <th style={{ textAlign:'right' }}>Valor</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validas.slice(0,300).map((l,i) => {
                        const catFinal = l.categoria || categoria;
                        const espFinal = l.especie   || especie;
                        const stFinal  = l.status || (l.dt_conclusao ? 'Concluído' : 'Em andamento');
                        return (
                          <tr key={i}>
                            <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{l.numero_interno}</td>
                            <td style={{ fontSize:11 }}>{l.dt_abertura ? l.dt_abertura.split('-').reverse().join('/') : '—'}</td>
                            <td style={{ fontSize:11 }}>{l.dt_conclusao ? l.dt_conclusao.split('-').reverse().join('/') : '—'}</td>
                            <td style={{ fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.cliente || '—'}</td>
                            <td style={{ fontSize:11, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              <span style={{ color:'var(--color-text-muted)' }}>{catFinal}</span>
                              {espFinal && <> · <strong>{espFinal}</strong></>}
                            </td>
                            <td style={{ textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12 }}>
                              {l.valor > 0 ? `R$ ${l.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}
                            </td>
                            <td>
                              <span style={{ fontSize:11, fontWeight:600, padding:'2px 6px', borderRadius:8,
                                background: stFinal==='Concluído' ? '#dcfce7' : '#fef3c7',
                                color:      stFinal==='Concluído' ? '#15803d' : '#92400e' }}>
                                {stFinal}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {validas.length > 300 && (
                        <tr><td colSpan={7} style={{ textAlign:'center', padding:12, fontSize:12, color:'var(--color-text-faint)' }}>
                          Exibindo 300 de {validas.length} (todos serão importados)
                        </td></tr>
                      )}
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
