import { useState, useRef } from 'react';

// ── Correção de acentos em nomes de cidades ───────────────────
const ACENTOS = [
  [/\bGaucha\b/g,    'Gaúcha'],
  [/\bGaúcha\b/g,    'Gaúcha'],
  [/\bCaceres\b/g,   'Cáceres'],
  [/\bCuiaba\b/g,    'Cuiabá'],
  [/\bBrasilia\b/g,  'Brasília'],
  [/\bGoiania\b/g,   'Goiânia'],
  [/\bBelem\b/g,     'Belém'],
  [/\bFortaleza\b/g, 'Fortaleza'],
  [/\bSao\b/g,       'São'],
  [/\bSAO\b/g,       'SÃO'],
  [/\bItupeva\b/g,   'Itupeva'],
  [/\bMontenegro\b/g,'Montenegro'],
];

function corrigirAcentos(str) {
  let s = str;
  ACENTOS.forEach(([re, sub]) => { s = s.replace(re, sub); });
  return s;
}

// ── Detecção de gênero ────────────────────────────────────────
// Terminações femininas comuns em nomes brasileiros
const SUFIXOS_FEM = ['a','ane','ane','ina','ine','ice','ize','ilde','ilda','ilda','anda','anda','ela','elia','elia','enia','esia','esia','ete','ete','ette','ette','ia','iana','iane','icia','icia','ile','ille','ina','ine','ione','ione','ires','ires','isa','ise','ite','iva','ive','ize','ize','nde','one','ore','ude','une','ure','ute'];
const NOMES_FEM = new Set([
  'MARIA','ANA','JOANA','LUCIA','LUZIA','ROSA','RITA','LENA','LINA','NINA','NAIR','VERA','IRIS','INES','RUTH','RAQUEL','ESTER','REBECA','DIANA','SORAIA','SONIA','TANIA','VANIA','SILVIA','LIVIA','OLIVIA','FLAVIA','CLAUDIA','CLAUDIA','PATRICIA','LETICIA','BEATRIZ','CAMILA','LARISSA','JULIANA','FABIANA','TATIANA','ADRIANA','VIVIANE','SIMONE','LILIANE','CRISTIANE','ROSILANE','MARLENE','IRENE','LUCIENE','APARECIDA','CONCEICAO','CONCEIÇÃO','FRANCISCA','JOSEFA','ANTONIA','RAIMUNDA','EDILENE','EDNA','ELAINE','ELIANA','ELISA','ELIZABETE','ELIZANGELA','ERICA','ERICKA','ERIKA','EUNICE','EVA','EVELINE','EVELYN','FATIMA','FERNANDA','GABRIELA','GISELE','GISELLE','GLEICE','GRACIELA','HELOISA','IARA','IRACEMA','ISABEL','IZABEL','JAQUELINE','JESSICA','JOELMA','JORGELINA','JOSIANE','JOVITA','JULIA','KATIA','KEILA','LAILA','LARICE','LEDA','LEONORA','LORENA','LUANA','LUCIANA','LUCIMARA','LUISA','LUIZA','MAGDA','MAISA','MARCELA','MARCIA','MARGARETE','MARGARIDA','MARIANA','MARILENE','MARINA','MARISA','MARLEI','MARTA','MIRELA','MIRIAM','MIRIANE','MIRIAN','MONICA','NADIR','NATALIA','NATHALIA','NATHALIE','NOEMIA','NORMA','ODETE','OLGA','PATRICIA','PAULA','PRISCILA','PRISCILLA','RAFAELA','REJANE','RENATA','ROSANA','ROSANE','ROSANGELA','ROSARIA','ROSEMEIRE','ROSENI','ROSIANE','ROSILDA','ROSINEI','ROSINEIDE','ROSINEIRE','ROSSANA','SAMARA','SANDRA','SARA','SELMA','SILVANA','SOLANGE','SUELI','SUELY','SUZANA','SUZANE','TAMARA','TAMIRES','TEREZA','THERESA','THAINÁ','THAIS','THAISE','THAISSA','VALDIRENE','VALERIA','VALQUIRIA','VANDERLEIA','VANIA','VANUSA','VIVIAN','WANESSA','YONE','ZELIA','ZILMA']);

function detectarGenero(nomeCompleto) {
  if (!nomeCompleto) return 'M';
  const partes = nomeCompleto.trim().toUpperCase().split(/\s+/);
  const primeiro = partes[0];
  // Verificação direta na lista
  if (NOMES_FEM.has(primeiro)) return 'F';
  // Sufixos femininos no primeiro nome
  const nomeLower = primeiro.toLowerCase();
  for (const suf of ['iane','iene','iele','uela','uele','ana','ina','ela','ila','ina','ena','ona','uda','ada','ida','eda','oda','anda','ilda','inda','anda']) {
    if (nomeLower.endsWith(suf)) return 'F';
  }
  if (nomeLower.endsWith('a') && !['luca','nicola','joaquina','gabriel','ezequiel','daniel','michael','rafael','miguel','israel','pascal','rial'].some(ex => nomeLower === ex)) return 'F';
  return 'M';
}

// ── Parser HTML ───────────────────────────────────────────────
function stripTags(s) { return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

function parseLote(html) {
  const blocks = html.split('<hr>').filter(b => b.includes('Comunicação'));
  return blocks.map(b => {
    const tipo = b.includes('Óbito') ? 'obito' : 'casamento';
    const cod = (b.match(/Código da comunicação:\s*(\d+)/) || [])[1] || '?';
    const dataCom = (b.match(/,\s*(\d{2}\/\d{2}\/\d{4})\s*<br>/) || [])[1] || '?';
    const origemMatch = b.match(/Comunicação de (?:Casamento Civil|Óbito)<br><br>[\s\S]*?\n\s*([^\n<]+)/);
    const origem = corrigirAcentos((origemMatch ? origemMatch[1] : '?').trim().replace(/<br>/g, '').trim());
    const divMatch = b.match(/<div align="JUSTIFY">([\s\S]+?)<\/div>/i);
    const corpo = divMatch ? stripTags(divMatch[1]) : '';
    const averbacao = tipo === 'casamento'
      ? gerarCasamento(corpo, origem, dataCom)
      : gerarObito(corpo, origem, dataCom);
    return { tipo, codigo: cod, origem, dataComunicado: dataCom, averbacao };
  });
}

// ── Gerador Casamento ─────────────────────────────────────────
function gerarCasamento(corpo, origem, dataCom) {
  const ato = corpo.match(/Aos\s+(\d{2}\/\d{2}\/\d{4})\s+no\s+livro\s+(\w+)\s+n[úu]mero\s+\d+,\s*folhas\s+(\d+),\s*termo\s+(\d+)/i);
  const dataAto = ato ? ato[1] : '?';
  const livro   = ato ? ato[2] : '?';
  const folhas  = ato ? ato[3] : '?';
  const termo   = ato ? ato[4] : '?';

  const c1m = corpo.match(/casamento civil de:\s+(.+?),\s*(o qual|a qual)/i);
  const nome1 = c1m ? c1m[1].trim() : '?';
  const gen1  = c1m ? c1m[2].toLowerCase() : 'o qual';

  // Bloco de ação do cônjuge 1
  const blocoC1 = corpo.match(/casamento civil de:.+?(?:,\s*(?:o qual|a qual))([\s\S]+?)(?:,\s*e\s+[A-Z])/i);
  let frase1;
  if (blocoC1 && /continuou com o mesmo nome/i.test(blocoC1[1])) {
    frase1 = `${nome1}, ${gen1} continuou com o mesmo nome`;
  } else if (blocoC1 && /passou a assinar/i.test(blocoC1[1])) {
    const ass = blocoC1[1].match(/passou a assinar:\s*([^.,\n]+)/i);
    frase1 = `${nome1}, ${gen1} passou a assinar: ${ass ? ass[1].trim() : '?'}`;
  } else {
    frase1 = `${nome1}, ${gen1} continuou com o mesmo nome`;
  }

  // Cônjuge 2
  const c2m = corpo.match(/,\s*e\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^,]+?),\s*(a qual|o qual)([\s\S]+?)(?:\.\s*(?:Ela|Ele|[A-Z][a-z]|OBSERV)|$)/i);
  let frase2 = '?';
  if (c2m) {
    const nome2 = c2m[1].trim();
    const gen2  = c2m[2].toLowerCase();
    const acao2 = c2m[3];
    if (/continuou com o mesmo nome/i.test(acao2)) {
      frase2 = `${nome2}, ${gen2} continuou com o mesmo nome`;
    } else {
      const ass2 = acao2.match(/passou a assinar:\s*([^.\n]+)/i);
      frase2 = `${nome2}, ${gen2} passou a assinar: ${ass2 ? ass2[1].trim().replace(/\.$/, '') : '?'}`;
    }
  }

  const cidade = corrigirAcentos(origem.replace(/\s*-\s*\d+[°º]\s*[Oo]f[íi]cio.*/i, '').trim());
  return `De acordo com o COMUNICADO datado em ${dataCom}, enviado pelo Cartório de Registro Civil do Município de ${cidade}, conforme ato do Livro ${livro}, folhas ${folhas}, termo nº ${termo}, em data de ${dataAto}, foi realizado o ASSENTO DE CASAMENTO de ${frase1}, e ${frase2}.`;
}

// ── Gerador Óbito ─────────────────────────────────────────────
function gerarObito(corpo, origem, dataCom) {
  const ato = corpo.match(/Aos\s+(\d{2}\/\d{2}\/\d{4})\s+no\s+livro\s+(\w+)\s+n[úu]mero\s+(\d+),\s*folhas\s+(\d+),\s*termo\s+(\d+)/i);
  const dataAto  = ato ? ato[1] : '?';
  const livroNum = ato ? ato[3] : '?';
  const folhas   = ato ? ato[4] : '?';
  const termo    = ato ? ato[5] : '?';

  const nomeM   = corpo.match(/óbito de\s+(.+?)\s+ocorrido/i);
  const nome    = nomeM ? nomeM[1].trim() : '?';
  const dataObM = corpo.match(/ocorrido em\s+(\d{2}\/\d{2}\/\d{4})/i);
  const dataOb  = dataObM ? dataObM[1] : '?';

  // Detecta gênero pelo nome — mas se o próprio comunicado usa "Ela" ou "Ele" como referência, respeita
  const usaEla = /\bEla\b/.test(corpo);
  const usaEle = /\bEle\b/.test(corpo);
  let genero;
  if (usaEla) genero = 'F';
  else if (usaEle) genero = 'M';
  else genero = detectarGenero(nome);

  const falecidoStr = genero === 'F' ? 'falecida' : 'falecido';

  const cidade = corrigirAcentos(origem.replace(/\s*-\s*\d+[°º]\s*[Oo]f[íi]cio.*/i, '').trim());
  return `De acordo com o COMUNICADO datado em ${dataCom}, enviado pelo Cartório de Registro Civil do Município e Comarca de ${cidade}, conforme termo nº ${termo}, folha n° ${folhas}, do livro C-${livroNum}, em data de ${dataAto}, foi lavrado o ASSENTO DE ÓBITO de ${nome}, ${falecidoStr} em ${dataOb}.`;
}

// ── Componente Principal ──────────────────────────────────────
export default function RegistroCivilAtos() {
  const [comunicacoes, setComunicacoes] = useState([]);
  const [abertos, setAbertos]           = useState({});
  const [copiado, setCopiado]           = useState(null);
  const [dragging, setDragging]         = useState(false);
  const fileRef = useRef();

  const processarArquivo = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const lista = parseLote(e.target.result);
      setComunicacoes(lista);
      // Abre todos por padrão
      const ini = {};
      lista.forEach((_, i) => ini[i] = true);
      setAbertos(ini);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const toggleAberto = (i) => setAbertos(p => ({ ...p, [i]: !p[i] }));

  const copiar = (texto, key) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(key);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  const textoCompleto = comunicacoes.map(c => c.averbacao).join('\n\n\n');

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900 }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
          ⚖ Registro Civil — Atos
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          Carregue o arquivo HTML do lote de comunicações para gerar os textos de averbação automaticamente.
        </p>
      </div>

      {/* Upload */}
      <div
        onClick={() => fileRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); processarArquivo(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '32px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--color-accent)18' : 'var(--color-surface-2)',
          transition: 'all 0.2s',
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>
          {comunicacoes.length > 0 ? 'Carregar outro arquivo' : 'Clique ou arraste o arquivo HTML aqui'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
          Exportado do sistema registrocivil.org.br
        </div>
        <input ref={fileRef} type="file" accept=".html,.htm" style={{ display: 'none' }}
          onChange={e => processarArquivo(e.target.files[0])} />
      </div>

      {/* Toolbar */}
      {comunicacoes.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => copiar(textoCompleto, 'todos')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copiado === 'todos' ? '✓ Copiado!' : '📋 Copiar Todas as Averbações'}
          </button>
          <span style={{ fontSize: 12, color: 'var(--color-text-faint)', marginLeft: 'auto' }}>
            {comunicacoes.length} comunicação{comunicacoes.length > 1 ? 'ões' : ''} encontrada{comunicacoes.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Cards */}
      {comunicacoes.map((c, i) => (
        <div key={i} style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 12,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div
            onClick={() => toggleAberto(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px',
              background: 'var(--color-surface-2)',
              borderBottom: abertos[i] ? '1px solid var(--color-border)' : 'none',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 4,
              background: c.tipo === 'casamento' ? '#fef3e2' : '#e8eaf6',
              color: c.tipo === 'casamento' ? '#b45309' : '#3949ab',
            }}>
              {c.tipo === 'casamento' ? '💍 Casamento' : '✝ Óbito'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-faint)' }}>
              #{c.codigo}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flex: 1 }}>
              {c.origem}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{c.dataComunicado}</span>
            <span style={{
              fontSize: 11, color: 'var(--color-text-faint)',
              transform: abertos[i] ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s', display: 'inline-block',
            }}>▼</span>
          </div>

          {/* Body */}
          {abertos[i] && (
            <div style={{ padding: '18px 22px' }}>
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: 13.5,
                lineHeight: 1.9,
                color: 'var(--color-text)',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {c.averbacao}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copiar(c.averbacao, i)}
                >
                  {copiado === i ? '✓ Copiado!' : '📋 Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Estado vazio */}
      {comunicacoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-faint)', fontSize: 13 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          Nenhuma comunicação carregada ainda.
        </div>
      )}
    </div>
  );
}
