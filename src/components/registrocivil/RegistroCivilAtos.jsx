import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

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

// Garante que a origem tenha UF — se não tiver, adiciona "– MT"
function garantirUF(origem) {
  // Verifica se já tem UF (dois caracteres maiúsculos no final após hífen)
  if (/–\s*[A-Z]{2}\s*$/.test(origem) || /-\s*[A-Z]{2}\s*$/.test(origem)) return origem;
  return origem + ' – MT';
}

// ── Detecção de gênero ────────────────────────────────────────
const NOMES_FEM = new Set([
  'MARIA','ANA','JOANA','LUCIA','LUZIA','ROSA','RITA','LENA','LINA','NINA','NAIR','VERA','IRIS','INES','RUTH','RAQUEL','ESTER','REBECA','DIANA','SORAIA','SONIA','TANIA','VANIA','SILVIA','LIVIA','OLIVIA','FLAVIA','CLAUDIA','PATRICIA','LETICIA','BEATRIZ','CAMILA','LARISSA','JULIANA','FABIANA','TATIANA','ADRIANA','VIVIANE','SIMONE','LILIANE','CRISTIANE','ROSILANE','MARLENE','IRENE','LUCIENE','APARECIDA','CONCEICAO','CONCEIÇÃO','FRANCISCA','JOSEFA','ANTONIA','RAIMUNDA','EDILENE','EDNA','ELAINE','ELIANA','ELISA','ELIZABETE','ELIZANGELA','ERICA','ERICKA','ERIKA','EUNICE','EVA','EVELINE','EVELYN','FATIMA','FERNANDA','GABRIELA','GISELE','GISELLE','GLEICE','GRACIELA','HELOISA','IARA','IRACEMA','ISABEL','IZABEL','JAQUELINE','JESSICA','JOELMA','JOSIANE','JOVITA','JULIA','KATIA','KEILA','LAILA','LARICE','LEDA','LEONORA','LORENA','LUANA','LUCIANA','LUCIMARA','LUISA','LUIZA','MAGDA','MAISA','MARCELA','MARCIA','MARGARETE','MARGARIDA','MARIANA','MARILENE','MARINA','MARISA','MARLEI','MARTA','MIRELA','MIRIAM','MIRIANE','MIRIAN','MONICA','NADIR','NATALIA','NATHALIA','NATHALIE','NOEMIA','NORMA','ODETE','OLGA','PATRICIA','PAULA','PRISCILA','PRISCILLA','RAFAELA','REJANE','RENATA','ROSANA','ROSANE','ROSANGELA','ROSARIA','ROSEMEIRE','ROSENI','ROSIANE','ROSILDA','ROSINEI','ROSINEIDE','ROSINEIRE','ROSSANA','SAMARA','SANDRA','SARA','SELMA','SILVANA','SOLANGE','SUELI','SUELY','SUZANA','SUZANE','TAMARA','TAMIRES','TEREZA','THERESA','THAINÁ','THAIS','THAISE','THAISSA','VALDIRENE','VALERIA','VALQUIRIA','VANDERLEIA','VANIA','VANUSA','VIVIAN','WANESSA','YONE','ZELIA','ZILMA',
  'ROSINDA','AUXILIADORA','CLEIDE','CLEIDIANE','CILEIDE','ROSEMEIRE','NELI','NELY','NELI','GENI','GENY','MAIRI','NAIR','DAIR',
]);

function detectarGenero(nomeCompleto) {
  if (!nomeCompleto) return 'M';
  const partes = nomeCompleto.trim().toUpperCase().split(/\s+/);
  const primeiro = partes[0];
  if (NOMES_FEM.has(primeiro)) return 'F';
  const nomeLower = primeiro.toLowerCase();
  for (const suf of ['iane','iene','iele','uela','uele','ana','ina','ela','ila','ena','ona','uda','ada','ida','eda','oda','anda','ilda','inda']) {
    if (nomeLower.endsWith(suf)) return 'F';
  }
  if (nomeLower.endsWith('a') && !['luca','nicola','gabriel','ezequiel','daniel','michael','rafael','miguel','israel','pascal'].some(ex => nomeLower === ex)) return 'F';
  return 'M';
}

// ── Parser HTML ───────────────────────────────────────────────
function stripTags(s) { return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

function detectarTipo(b) {
  if (b.includes('Óbito') || b.includes('Obito')) return 'obito';
  if (/convers[ãa]o de separa[çc][ãa]o/i.test(b)) return 'conversao';
  if (b.includes('Alterações de Estado Civil') || b.includes('Alteracoes de Estado Civil') || b.includes('divórcio') || b.includes('divorcio') || b.includes('Divórcio') || b.includes('Escritura Pública') || b.includes('Mandado')) return 'divorcio';
  return 'casamento';
}

function detectarSubtipoDivorcio(corpo) {
  if (/escritura p[úu]blica/i.test(corpo) || /escritura\s+p[úu]blica/i.test(corpo)) return 'escritura';
  if (/mandado/i.test(corpo)) return 'mandado';
  return 'escritura'; // default
}

function parseLote(html) {
  // Normaliza quebras de linha
  const htmlNorm = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // REJEITADO está dentro do mesmo bloco da comunicação (antes do </center> final)
  // Detecta por código: cada bloco tem seu próprio código
  const rejeicoesPorCodigo = {};
  const blocosHtml = htmlNorm.split(/<hr\s*\/?>/i);
  for (const bloco of blocosHtml) {
    const codM = bloco.match(/Código da comunicação:\s*(\d+)/);
    if (!codM) continue;
    const blocoSemTags = bloco.replace(/<[^>]+>/g, '');
    if (/R\s*E\s*J\s*E\s*I\s*T\s*A\s*D\s*O/i.test(blocoSemTags)) {
      const motivoM = blocoSemTags.match(/Motivo da rejeição[^:]*:\s*(.+)/i);
      rejeicoesPorCodigo[codM[1]] = {
        rejeitado: true,
        motivoRejeicao: motivoM ? motivoM[1].trim() : '',
      };
    }
  }

  const blocks = htmlNorm.split(/<hr\s*\/?>/i).filter(b => b.includes('Comunicação') || b.includes('Comunicacao'));

  return blocks.map(b => {
    const tipo = detectarTipo(b);
    const cod = (b.match(/Código da comunicação:\s*(\d+)/) || [])[1] || '?';
    const dataCom = (b.match(/,\s*(\d{2}\/\d{2}\/\d{4})\s*<br>/) || [])[1] || '?';
    const origemMatch = b.match(/Comunicação[^<]*(?:<\/[^>]+>)?<br><br>\s*([^\n<]+)/i)
      || b.match(/<br><br>\s*([^\n<]+?(?:Ofício|Oficio|Comarca|-\s*[A-Z]{2})[^\n<]*)/i);
    const origemRaw = corrigirAcentos((origemMatch ? origemMatch[1] : '?').trim().replace(/<[^>]+>/g, '').replace(/<br>/g, '').trim());
    const origem = garantirUF(origemRaw);
    const divMatch = b.match(/<div align="JUSTIFY">([\s\S]+?)<\/div>/i);
    const corpo = divMatch ? stripTags(divMatch[1]) : '';
    let averbacao;
    if (tipo === 'casamento') averbacao = gerarCasamento(corpo, origem, dataCom);
    else if (tipo === 'obito') averbacao = gerarObito(corpo, origem, dataCom);
    else if (tipo === 'conversao') averbacao = gerarConversaoSeparacao(corpo, origem, dataCom);
    else {
      const subtipo = detectarSubtipoDivorcio(corpo);
      averbacao = subtipo === 'mandado'
        ? gerarDivorcioMandado(corpo, origem, dataCom)
        : gerarDivorcioEscritura(corpo, origem, dataCom);
    }
    // Rejeição: apenas pelo mapa (evita falsos positivos)
    const rejInfo = rejeicoesPorCodigo[cod] || {};
    const rejeitado = rejInfo.rejeitado || false;
    const motivoRejeicao = rejInfo.motivoRejeicao || '';

    return { tipo, codigo: cod, origem, dataComunicado: dataCom, averbacao, rejeitado, motivoRejeicao };
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

  const cidade = corrigirAcentos(origem.replace(/\s*[-–]\s*\d+[°º]\s*[Oo]f[íi]cio.*/i, '').trim());
  return `De acordo com o COMUNICADO datado em ${dataCom}, enviado pelo Cartório de Registro Civil do Município de ${cidade}, conforme ato do Livro ${livro}, folhas ${folhas}, termo nº ${termo}, em data de ${dataAto}, foi realizado o ASSENTO DE CASAMENTO de ${frase1}, e ${frase2}.`;
}

// ── Gerador Óbito ─────────────────────────────────────────────
function gerarObito(corpo, origem, dataCom) {
  // folhas aceita alfanumérico (ex: 157V, 140, 23A)
  const ato = corpo.match(/Aos\s+(\d{2}\/\d{2}\/\d{4})\s+no\s+livro\s+(\w+)\s+n[úu]mero\s+(\d+),\s*folhas\s+(\w+),\s*termo\s+(\d+)/i);
  const dataAto  = ato ? ato[1] : '?';
  const livroNum = ato ? ato[3] : '?';
  const folhas   = ato ? ato[4] : '?';
  const termo    = ato ? ato[5] : '?';

  const nomeM   = corpo.match(/óbito de\s+(.+?)\s+ocorrido/i);
  const nome    = nomeM ? nomeM[1].trim() : '?';
  const dataObM = corpo.match(/ocorrido em\s+(\d{2}\/\d{2}\/\d{4})/i);
  const dataOb  = dataObM ? dataObM[1] : '?';

  const usaEla = /\bEla\b/.test(corpo);
  const usaEle = /\bEle\b/.test(corpo);
  let genero;
  if (usaEla) genero = 'F';
  else if (usaEle) genero = 'M';
  else genero = detectarGenero(nome);

  const falecidoStr = genero === 'F' ? 'falecida' : 'falecido';
  const cidade = corrigirAcentos(origem.replace(/\s*[-–]\s*\d+[°º]\s*[Oo]f[íi]cio.*/i, '').trim());
  return `De acordo com o COMUNICADO datado em ${dataCom}, enviado pelo Cartório de Registro Civil do Município e Comarca de ${cidade}, conforme termo nº ${termo}, folha n° ${folhas}, do livro C-${livroNum}, em data de ${dataAto}, foi lavrado o ASSENTO DE ÓBITO de ${nome}, ${falecidoStr} em ${dataOb}.`;
}

// ── Gerador Conversão de Separação em Divórcio ───────────────
function gerarConversaoSeparacao(corpo, origem, dataCom) {
  // Cônjuges — "do casal NOME1 e NOME2, conforme"
  // O "e" pode ser precedido por nome composto, então captura tudo entre "do casal" e ", conforme"
  const trecho = corpo.match(/(?:do\s+)?casal\s+([\s\S]+?),\s*conforme/i);
  let conj1 = '[CÔNJUGE 1]', conj2 = '[CÔNJUGE 2]';
  if (trecho) {
    // Divide pelo " e " mais provável — antes de nome maiúsculo
    const partes = trecho[1].split(/ e (?=[A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ])/);
    if (partes.length >= 2) {
      conj1 = partes[0].trim();
      conj2 = partes[1].trim();
    }
  }

  // Vara e Juíza — aceita "Juiz" ou "Juíz" (com ou sem acento)
  const varaJuizaM = corpo.match(/Ju[íi]z\s*de Direito\s+da\s+(.+?),\s*(.+?),\s*datada de/i);
  const vara  = varaJuizaM ? varaJuizaM[1].trim() : '[VARA]';
  const juiza = varaJuizaM ? varaJuizaM[2].trim() : '[JUÍZA]';

  // Datas
  const dataSentM  = corpo.match(/datada de\s+(\d{2}\/\d{2}\/\d{4})/i);
  const dataTransM = corpo.match(/transitou em julgado\s+(?:aos|em)\s+(\d{2}\/\d{2}\/\d{4})/i);
  const dataSent   = dataSentM  ? dataSentM[1]  : '[DATA SENTENÇA]';
  const dataTrans  = dataTransM ? dataTransM[1] : '[DATA TRÂNSITO]';

  // Autos
  const autosM = corpo.match(/autos\s+([\d\/\.\-]+)/i);
  const autos  = autosM ? autosM[1].trim() : '[AUTOS]';

  // Quem continuou com o mesmo nome — usa indexOf
  const corpoLow = corpo.toLowerCase();
  const posCont1 = corpo.toLowerCase().indexOf(conj1.toLowerCase().substring(0, 10));
  const posCont2 = corpo.toLowerCase().indexOf(conj2.toLowerCase().substring(0, 10), posCont1 + 10);
  const posContNome = corpo.toLowerCase().indexOf('continuou com o mesmo nome');
  const cont1 = posCont1 >= 0 && posContNome > posCont1;
  const cont2 = posCont2 >= 0 && corpo.toLowerCase().lastIndexOf('continuou com o mesmo nome') > posCont2;

  // Nome de solteira — nas observações
  const soltM = corpo.match(/(?:Vontando|Voltando|vontando|voltando).+?(?:solteira|seja)[,;:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^.]+)/i);
  const nomeSolteiraRaw = soltM ? soltM[1].trim().replace(/[.;]$/, '').replace(/^(?:ou seja:|qual seja:)\s*/i, '') : '';
  const nomeSolteira = nomeSolteiraRaw;

  const cartorioOrigem = corrigirAcentos(origem.trim());

  let texto = `De acordo com o COMUNICADO datado em ${dataCom}, enviado a esta Serventia pelo ${cartorioOrigem}, foi realizada a CONVERSÃO DE SEPARAÇÃO em DIVÓRCIO CONSENSUAL de ${conj1} e ${conj2}, nos termos da sentença proferida pelo MM. Juiz de Direito da ${vara}, ${juiza}, datada de ${dataSent}, que transitou em julgado aos ${dataTrans}, autos ${autos}.`;
  if (cont1) texto += ` ${conj1}, continuou com o mesmo nome.`;
  if (cont2) texto += ` ${conj2}, continuou com o mesmo nome.`;
  if (nomeSolteira) texto += ` Voltando a cônjuge virago a usar o nome de solteira, qual seja: ${nomeSolteira}.`;
  return texto;
}

// ── Gerador Divórcio por Escritura Pública ───────────────────
function gerarDivorcioEscritura(corpo, origem, dataCom) {
  // Cônjuges — vêm depois de "de" antes de "CONFORME ESCRITURA"
  // Padrão: "de NOME1 e NOME2, CONFORME ESCRITURA"
  const conjM = corpo.match(/de\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^,]+?)\s+e\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^,]+?)[,\s]+(?:CONFORME|nos termos)/i);
  const conj1 = conjM ? conjM[1].trim() : '[CÔNJUGE 1]';
  const conj2 = conjM ? conjM[2].trim() : '[CÔNJUGE 2]';

  // Dados da escritura — "PELO 2° OFICIO DE X, NO LIVRO Y, À PÁGINA Z"
  // ou "lavrada no livro nº X, às folhas nº Y, em data de Z"
  const livroM  = corpo.match(/(?:NO LIVRO|livro\s+n[°º]?)\s*(\d+)/i);
  const paginaM = corpo.match(/(?:À PÁGINA|folhas?\s+n[°º]?|página)\s*(\d+(?:-\d+)?)/i);
  const dataEscM = corpo.match(/(?:LAVRADA EM|em data de)\s+(\d{2}\/\d{2}\/\d{4})/i);
  const tabelM  = corpo.match(/PELO\s+(.+?(?:OFICIO|OFÍCIO|TABELIONATO|Tabelionato)[^,\n.]+)/i)
    || corpo.match(/pelo\s+(.+?(?:Tabelionato|Ofício|Oficio)[^,\n.]+)/i);

  const livro      = livroM   ? livroM[1]   : '[LIVRO]';
  const pagina     = paginaM  ? paginaM[1]  : '[FOLHAS/PÁGINA]';
  const dataEsc    = dataEscM ? dataEscM[1] : '[DATA]';
  const tabelionato = tabelM  ? tabelM[1].trim().replace(/[,.]$/, '') : '[TABELIONATO]';

  // Nome de solteira
  const soltM = corpo.match(/voltando.+?usar.+?nome.+?solteira[,:]?\s*(?:qual seja:?)?\s*([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^.]+)/i);
  const nomeSolteira = soltM ? soltM[1].trim().replace(/\.$/, '') : '';

  // Quem continuou com o mesmo nome / quem voltou ao nome de solteira
  const cont1 = /continuou com o mesmo nome/i.test(corpo.split(conj2)[0] || '') ? `${conj1} continuou com o mesmo nome.` : '';
  const cont2 = /continuou com o mesmo nome/i.test(corpo.split(conj1)[1] || '') ? `${conj2} continuou com o mesmo nome.` : '';

  const cartorioOrigem = corrigirAcentos(origem.trim());

  let texto = `De acordo com o COMUNICADO datado em ${dataCom}, enviado a esta Serventia pelo ${cartorioOrigem}, foi realizado o DIVÓRCIO CONSENSUAL de ${conj1} e ${conj2}, nos termos da Escritura Pública, lavrada no livro nº ${livro}, à página nº ${pagina}, em data de ${dataEsc}, pelo ${tabelionato}.`;
  if (cont1) texto += ` ${cont1}`;
  if (cont2) texto += ` ${cont2}`;
  if (nomeSolteira) texto += ` A cônjuge virago voltará a usar o nome de solteira, qual seja: ${nomeSolteira}.`;
  return texto;
}

// ── Gerador Divórcio por Mandado Judicial ────────────────────
function gerarDivorcioMandado(corpo, origem, dataCom) {
  // Cônjuges
  const conjM = corpo.match(/div[óo]rcio\s+(?:consensual\s+)?d[oa]\s+Sr\.?\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^c]+?)\s+com\s+a\s+Sra\.?\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^,]+)/i)
    || corpo.match(/div[óo]rcio.+?de[:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^e]+?)\s+e\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^,]+)/i);
  const conj1 = conjM ? conjM[1].trim() : '[CÔNJUGE 1]';
  const conj2 = conjM ? conjM[2].trim() : '[CÔNJUGE 2]';

  // Dados do mandado
  const dataMandM   = corpo.match(/datado de\s+(\d{2}\/\d{2}\/\d{4})/i);
  const juizaM      = corpo.match(/assinado pela?\s+(.+?),\s*MM[ªa]/i);
  const varaM       = corpo.match(/MM[ªa]\.?\s*Juíz[ao]?\s*de Direito da\s+(.+?),\s*extraído/i);
  const processoM   = corpo.match(/processo\s+n[°º]?\s*([\d\-\.]+)/i);
  const dataSentM   = corpo.match(/(?:decretado|sentença).+?em\s+(\d{2}\/\d{2}\/\d{4})/i);
  const dataTransM  = corpo.match(/transitou em julgado em\s+(\d{2}\/\d{2}\/\d{4})/i);
  const dataCumprM  = corpo.match(/Cumpra-se expedido em\s+(\d{2}\/\d{2}\/\d{4})/i);
  const dirComarcaM = corpo.match(/Dra?\.\s+([^,]+),\s*MM[ªa].+?Diretora?\s+desta Comarca\s+de\s+([^.]+)/i);

  const dataMandado  = dataMandM   ? dataMandM[1]   : '[DATA MANDADO]';
  const juiza        = juizaM      ? juizaM[1].trim() : '[JUÍZA]';
  const vara         = varaM       ? varaM[1].trim() : '[VARA]';
  const processo     = processoM   ? processoM[1]   : '[PROCESSO]';
  const dataSent     = dataSentM   ? dataSentM[1]   : '[DATA SENTENÇA]';
  const dataTrans    = dataTransM  ? dataTransM[1]  : '[DATA TRÂNSITO]';
  const dataCumpr    = dataCumprM  ? dataCumprM[1]  : '[DATA CUMPRIMENTO]';
  const dirComarca   = dirComarcaM ? `Dra. ${dirComarcaM[1].trim()}, MMª. Juíza de Direito e Diretora desta Comarca de ${dirComarcaM[2].trim()}` : '';

  // Nome de solteira
  const soltM = corpo.match(/(?:voltando|retornando|usar).+?nome.+?(?:solteira|seja)[,:]?\s*["""]?([A-ZÁÉÍÓÚÀÂÊÔÃÕÜÇÑ][^".]+)["""]?/i);
  const nomeSolteira = soltM ? soltM[1].trim().replace(/[""".]$/, '') : '';

  let texto = `COMUNICO o DIVÓRCIO CONSENSUAL do Sr. ${conj1} com a Sra. ${conj2}, nos termos do Mandado de Averbação, datado de ${dataMandado}, assinado pela ${juiza}, MMª. Juíza de Direito da ${vara}, extraído do processo nº ${processo}, requerido pelo casal, averbo o DIVÓRCIO JUDICIAL CONSENSUAL dos mesmos, decretado por sentença proferida pela já referida Juíza, em ${dataSent}, à qual transitou em julgado em ${dataTrans}.`;
  if (nomeSolteira) texto += ` A contraente voltará a usar o nome de solteira: "${nomeSolteira}".`;
  if (dataCumpr) texto += ` Cumpra-se expedido em ${dataCumpr}`;
  if (dirComarca) texto += `, pela ${dirComarca}.`;
  return texto;
}

// ── Componente Principal ──────────────────────────────────────
// ── Componente de Casamentos ─────────────────────────────────
function AbaCasamentos({ sb, addToast, usuarios, cartorio }) {
  const [casamentos, setCasamentos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [buscaProcesso, setBuscaProcesso] = useState('');
  const [processosFiltrados, setProcessosFiltrados] = useState([]);
  const [signatario, setSignatario] = useState('');
  const [marcados, setMarcados] = useState([]);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    const { data } = await sb.from('casamentos')
      .select('*, processos(numero_interno, especie), usuarios(nome_simples, cargo)')
      .order('dt_celebracao', { ascending: true });
    setCasamentos(data || []);
  };

  const toggleMarcado = (id) => {
    setMarcados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const abrirNovo = () => {
    setForm({ status: 'agendado', tipo: 'civil', local_tipo: 'serventia', dt_agendamento: new Date().toISOString().split('T')[0] });
    setBuscaProcesso('');
    setProcessosFiltrados([]);
    setModal(true);
  };

  const abrirEditar = (c) => {
    setForm({ ...c });
    setBuscaProcesso(c.processos?.numero_interno || '');
    setModal(true);
  };

  const buscarProcesso = async (termo) => {
    setBuscaProcesso(termo);
    if (!termo || termo.length < 2) { setProcessosFiltrados([]); return; }
    const { data } = await sb.from('processos').select('id, numero_interno, especie, partes')
      .ilike('numero_interno', `%${termo}%`).limit(8);
    setProcessosFiltrados(data || []);
  };

  const selecionarProcesso = (p) => {
    set('processo_id', p.id);
    setBuscaProcesso(p.numero_interno);
    setProcessosFiltrados([]);
    try {
      const partes = typeof p.partes === 'string' ? JSON.parse(p.partes) : (p.partes || []);
      const outorgante = partes.find(x => x.vinculo === 'Outorgante');
      const outorgado  = partes.find(x => x.vinculo === 'Outorgado');
      if (outorgante?.nome) set('noivo1', outorgante.nome);
      if (outorgado?.nome)  set('noivo2', outorgado.nome);
    } catch {}
  };

  const salvar = async () => {
    if (!form.noivo1?.trim() || !form.noivo2?.trim()) { addToast('Informe os nomes dos noivos', 'error'); return; }
    setSalvando(true);
    try {
      const payload = {
        noivo1: form.noivo1,
        noivo2: form.noivo2,
        dt_agendamento: form.dt_agendamento || new Date().toISOString().split('T')[0],
        dt_celebracao: form.dt_celebracao ? new Date(form.dt_celebracao).toISOString() : null,
        local_tipo: form.local_tipo || 'serventia',
        local_endereco: form.local_endereco || null,
        tipo: form.tipo || 'civil',
        responsavel_id: form.responsavel_id || null,
        status: form.status || 'agendado',
        observacao: form.observacao || null,
        juiz_paz: form.juiz_paz || null,
        processo_id: form.processo_id ? parseInt(form.processo_id) : null,
        atualizado_em: new Date().toISOString(),
      };
      if (form.id) {
        await sb.from('casamentos').update(payload).eq('id', form.id);
      } else {
        await sb.from('casamentos').insert(payload);
      }
      addToast('Casamento salvo!', 'success');
      setModal(false);
      carregar();
    } catch(e) { addToast('Erro: ' + e.message, 'error'); }
    finally { setSalvando(false); }
  };

  const concluir = async (id) => {
    await sb.from('casamentos').update({ status: 'realizado', atualizado_em: new Date().toISOString() }).eq('id', id);
    const cas = casamentos.find(c => c.id === id);
    if (cas?.processo_id) {
      const confirmar = window.confirm('Casamento concluído!\n\nDeseja concluir o processo vinculado também?');
      if (confirmar) {
        await sb.from('processos').update({ status: 'Concluído', dt_conclusao: new Date().toISOString().split('T')[0] }).eq('id', cas.processo_id);
        addToast('Casamento e processo concluídos!', 'success');
      } else {
        addToast('Casamento concluído!', 'success');
      }
    } else {
      addToast('Casamento concluído!', 'success');
    }
    carregar();
  };

  const cancelar = async (id) => {
    if (!confirm('Cancelar este casamento?')) return;
    await sb.from('casamentos').update({ status: 'cancelado', atualizado_em: new Date().toISOString() }).eq('id', id);
    carregar();
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este casamento?')) return;
    await sb.from('casamentos').delete().eq('id', id);
    carregar();
  };

  const gerarRelatorio = (tipo) => {
    const lista = tipo === 'pendentes'
      ? casamentos.filter(c => c.status === 'agendado')
      : casamentos.filter(c => c.status === 'realizado');
    const fmtDH = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
    const TIPO2 = { civil: 'Civil', religioso: 'Religioso', civil_religioso: 'Civil e Religioso' };
    const LOCAL2 = { serventia: 'Serventia', externo: 'Externo' };
    const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const titulo = tipo === 'pendentes' ? 'Casamentos Pendentes (Agendados)' : 'Casamentos Realizados';
    const linhas = lista.map((c, i) => `<tr style="background:${i%2===0?'#fff':'#f8fafc'}">
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${c.noivo1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${c.noivo2}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap">${fmtDH(c.dt_celebracao)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${TIPO2[c.tipo]||c.tipo}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${LOCAL2[c.local_tipo]||c.local_tipo}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:12px">${c.processos?.numero_interno||'—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${c.usuarios?.nome_simples||'—'}</td>
    </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:13px;color:#1e293b;margin:0;padding:20px}@media print{body{padding:10px}.no-print{display:none}}h1{font-size:18px;margin-bottom:4px}.sub{font-size:12px;color:#64748b;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{background:#f1f5f9;padding:9px 12px;text-align:left;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;border-bottom:2px solid #e2e8f0}.btn-print{margin-bottom:16px;padding:8px 20px;background:#1e40af;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px}</style></head><body>
    <button class="btn-print no-print" onclick="window.print()">🖨 Imprimir / Salvar PDF</button>
    <div style="background:#1e293b;color:#fff;padding:14px 20px;border-radius:6px;margin-bottom:16px"><div style="font-size:16px;font-weight:700">Cartório Costa Vasques</div><div style="font-size:11px;color:#94a3b8;margin-top:2px">Paranatinga - MT</div></div>
    <h1>${titulo}</h1><div class="sub">Gerado em ${hoje} · Total: ${lista.length} casamento(s)</div>
    <table><thead><tr><th>Noivo(a) 1</th><th>Noivo(a) 2</th><th>Data/Hora</th><th>Tipo</th><th>Local</th><th>Processo</th><th>Responsável</th></tr></thead>
    <tbody>${linhas||'<tr><td colspan="7" style="padding:24px;text-align:center;color:#94a3b8">Nenhum registro encontrado.</td></tr>'}</tbody></table>
    <div style="margin-top:12px;font-size:13px;color:#475569">Total: <strong>${lista.length}</strong> casamento(s)</div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
  };

  const gerarOficioJuizPaz = async () => {
    const naoComunicados = casamentos.filter(c => c.status === 'agendado' && !c.comunicado);
    const paraOficio = marcados.length > 0
      ? casamentos.filter(c => marcados.includes(c.id))
      : naoComunicados;
    if (paraOficio.length === 0) { addToast('Nenhum casamento selecionado para comunicação.', 'info'); return; }

    const { data: oficiosDisponiveis } = await sb.from('oficios')
      .select('id, numero, dt_oficio, responsavel, tipo, status')
      .eq('status', 'Rascunho').order('dt_oficio', { ascending: false });
    const oficiosCasamento = (oficiosDisponiveis || []).filter(o => o.tipo === 'Comunicado de Casamentos');
    if (!oficiosCasamento?.length) {
      alert('Nenhum oficio do tipo "Comunicado de Casamentos" com status Rascunho encontrado.\nVá em Ofícios > Novo Ofício, selecione o tipo e status Rascunho para gerar o número primeiro.');
      return;
    }

    let oficioSel = oficiosCasamento[0];
    if (oficiosCasamento.length > 1) {
      const opcoes = oficiosCasamento.map((o, i) => (i+1) + '. nº ' + o.numero).join(' | ');
      const idx = parseInt(prompt('Ofícios disponíveis: ' + opcoes + '\nDigite o número (1-' + oficiosCasamento.length + '):')) - 1;
      if (isNaN(idx) || idx < 0 || idx >= oficiosCasamento.length) return;
      oficioSel = oficiosCasamento[idx];
    }

    const hoje = new Date();
    const nomeCartorio = cartorio?.nome || 'Cartório Costa Vasques';
    const nomeResponsavel = cartorio?.responsavel || '';
    const nomejuiz = paraOficio.find(c => c.juiz_paz)?.juiz_paz || cartorio?.juiz_paz || '';
    const numOficio = oficioSel.numero;
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const dataExtenso = 'Paranatinga - MT, ' + hoje.getDate() + ' de ' + meses[hoje.getMonth()].toLowerCase() + ' de ' + hoje.getFullYear() + '.';
    const mesCasamentos = meses[paraOficio[0]?.dt_celebracao ? new Date(paraOficio[0].dt_celebracao).getMonth() : hoje.getMonth()].toUpperCase() + ' ' + hoje.getFullYear();
    const fmtDataDoc = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR'); };
    const fmtHoraDoc = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

    const sigAssinantes = (usuarios || []).filter(u => u.ativo && ['tabelião','tabeliao','escrevente','administrador','substituto'].includes((u.perfil||'').toLowerCase()));
    const sigEscolhido = signatario
      ? (signatario === nomeResponsavel ? { nome: nomeResponsavel, cargo: cartorio?.cargo_tabeliao || 'Tabelião' } : sigAssinantes.find(u => (u.nome_completo || u.nome_simples) === signatario))
      : (sigAssinantes[0] || { nome: nomeResponsavel, cargo: cartorio?.cargo_tabeliao || 'Tabelião' });
    const nomeSig = (sigEscolhido?.nome_completo || sigEscolhido?.nome_simples || sigEscolhido?.nome || nomeResponsavel).toUpperCase();
    const cargoSig = sigEscolhido?.cargo || cartorio?.cargo_tabeliao || 'Tabelião Substituto';

    try {
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, Header, AlignmentType, BorderStyle, WidthType, ShadingType } = await import('docx');
      const cabecalhoImgUrl = cartorio?.cabecalho_img_url || cartorio?.logo_url || null;
      let headerChildren = [];
      const MAR_RIGHT_DOC = 991, MAR_BOT_DOC = 1134, MAR_LEFT_DOC = 1701, MAR_HEADER_DOC = 426;
      const targetW = Math.round(17 * 37.795);
      const targetH = Math.round(3.5 * 37.795);
      let headerHeightDXA = Math.round((3.5 / 2.54) * 1440) + 400;

      if (cabecalhoImgUrl) {
        try {
          let imgBytes, imgType;
          if (cabecalhoImgUrl.startsWith('data:')) {
            const base64 = cabecalhoImgUrl.split(',')[1];
            const binary = atob(base64);
            imgBytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) imgBytes[i] = binary.charCodeAt(i);
            const mimeMatch = cabecalhoImgUrl.match(/data:([^;]+);/);
            imgType = (mimeMatch?.[1] || 'image/jpeg').includes('png') ? 'png' : 'jpg';
          } else {
            const imgResp = await fetch(cabecalhoImgUrl);
            const imgBuffer = await imgResp.arrayBuffer();
            imgBytes = new Uint8Array(imgBuffer);
            imgType = (imgResp.headers.get('content-type') || '').includes('png') ? 'png' : 'jpg';
          }
          headerChildren = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [new ImageRun({ data: imgBytes.buffer, transformation: { width: targetW, height: targetH }, type: imgType })] })];
        } catch(e) {
          headerChildren = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: nomeCartorio.toUpperCase(), font: 'Arial', size: 26, bold: true })] })];
        }
      } else {
        headerChildren = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: nomeCartorio.toUpperCase(), font: 'Arial', size: 26, bold: true })] })];
      }

      const wordHeader = new Header({ children: headerChildren });
      const FONTE = 'Arial', TAM = 24, FIRST_LINE = 1701;
      const t = (text, bold=false, underline=false) => new TextRun({ text, font: FONTE, size: TAM, bold, underline: underline ? {} : undefined });
      const tW = (text, bold=false) => new TextRun({ text, font: FONTE, size: TAM, bold, color: 'FFFFFF' });
      const p = (children, align=AlignmentType.JUSTIFIED, sp={}) => new Paragraph({ alignment: align, spacing: { line: 360, lineRule: 'auto', before: 120, after: 120, ...sp }, children: Array.isArray(children) ? children : [t(children)] });
      const pR = (children, align=AlignmentType.JUSTIFIED, sp={}) => new Paragraph({ alignment: align, spacing: { line: 360, lineRule: 'auto', before: 120, after: 120, ...sp }, indent: { firstLine: FIRST_LINE }, children: Array.isArray(children) ? children : [t(children)] });
      const pV = () => new Paragraph({ children: [t('')], spacing: { line: 240, before: 0, after: 0 } });

      const LARG = 11906 - MAR_LEFT_DOC - MAR_RIGHT_DOC;
      const C1=Math.round(LARG*0.45), C2=Math.round(LARG*0.30), C3=LARG-C1-C2;
      const brd={style:BorderStyle.SINGLE,size:4,color:'000000'}, brdAll={top:brd,bottom:brd,left:brd,right:brd}, mC={top:80,bottom:80,left:120,right:120};
      const th = (text,w) => new TableCell({ width:{size:w,type:WidthType.DXA}, borders:brdAll, margins:mC, shading:{fill:'000000',type:ShadingType.CLEAR}, children:[new Paragraph({alignment:AlignmentType.CENTER,children:[tW(text,true)]})] });
      const td = (text,w,i) => new TableCell({ width:{size:w,type:WidthType.DXA}, borders:brdAll, margins:mC, shading:{fill:i%2===0?'FFFFFF':'F5F5F5',type:ShadingType.CLEAR}, children:[new Paragraph({alignment:AlignmentType.CENTER,children:[t(text)]})] });
      const tabela = new Table({
        width:{size:LARG,type:WidthType.DXA}, columnWidths:[C1,C2,C3],
        rows:[
          new TableRow({tableHeader:true, children:[th('PRENOME DOS NUBENTES',C1),th('DATA AGENDADA',C2),th('HORÁRIO AGENDADO',C3)]}),
          ...paraOficio.map((c,i)=>new TableRow({children:[td(c.noivo1.split(' ')[0]+' e '+c.noivo2.split(' ')[0],C1,i),td(fmtDataDoc(c.dt_celebracao),C2,i),td(fmtHoraDoc(c.dt_celebracao),C3,i)]})),
        ],
      });

      const doc = new Document({
        styles:{default:{document:{run:{font:FONTE,size:TAM}}}},
        sections:[{
          headers:{default:wordHeader},
          properties:{page:{size:{width:11906,height:16838},margin:{top:headerHeightDXA,right:MAR_RIGHT_DOC,bottom:MAR_BOT_DOC,left:MAR_LEFT_DOC,header:MAR_HEADER_DOC,footer:567,gutter:0}}},
          children:[
            p([t(dataExtenso)], AlignmentType.RIGHT, {before:0,after:0}),
            pV(),
            p([t('Ofício nº '+numOficio,true)], AlignmentType.LEFT, {before:0,after:0}),
            pV(),
            p([t('Assunto: '),t('COMUNICADO DE AGENDAMENTO DE CASAMENTOS',true,true),t('.')], AlignmentType.LEFT, {before:0,after:120}),
            p([t('Exmo. Sr. Juiz de Paz,')], AlignmentType.LEFT, {before:0,after:120}),
            pR([t('Venho por meio do presente, '),t('INFORMAR',true,true),t(' as datas e horários agendados para realização de casamentos nesta Serventia:')], AlignmentType.JUSTIFIED),
            pV(),
            p([t('CASAMENTOS AGENDADOS NO MÊS DE ',false,true),t(mesCasamentos,true,true)], AlignmentType.CENTER, {before:0,after:120}),
            tabela,
            pV(),
            pR([t('Outrossim, informo que, será entregue uma lista atualizada semanalmente por esta Serventia.')], AlignmentType.JUSTIFIED),
            pV(),
            pR([t('Sendo o que nos apresenta de momento, aproveito a oportunidade para renovar à Vossa Excelência protestos de elevada estima e consideração.')], AlignmentType.JUSTIFIED),
            pV(),
            pR([t('Atenciosamente,')], AlignmentType.LEFT),
            pV(), pV(), pV(),
            p([t('_'.repeat(50))], AlignmentType.CENTER, {line:240,before:0,after:0}),
            p([t(nomeSig,true)], AlignmentType.CENTER, {line:240,before:0,after:0}),
            p([t(cargoSig)], AlignmentType.CENTER, {line:240,before:0,after:0}),
            pV(),
            p([t('Ao Exmo. Sr. Juiz de Paz deste município de Paranatinga/MT')], AlignmentType.LEFT, {before:0,after:0}),
            p([t(nomejuiz,true,true)], AlignmentType.LEFT, {before:0,after:0}),
            pV(),
            p([t('Recebido em: ___________________________.') ], AlignmentType.LEFT, {before:0,after:0}),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Oficio_' + numOficio.replace('/', '_') + '_Casamentos.docx';
      a.click();
      URL.revokeObjectURL(url);
    } catch(errDocx) {
      console.error('Erro docx:', errDocx);
      const linhas2 = paraOficio.map(c => `<tr><td style="padding:6px 12px;border:1px solid #000;text-align:center">${c.noivo1.split(' ')[0]} e ${c.noivo2.split(' ')[0]}</td><td style="padding:6px 12px;border:1px solid #000;text-align:center">${fmtDataDoc(c.dt_celebracao)}</td><td style="padding:6px 12px;border:1px solid #000;text-align:center">${fmtHoraDoc(c.dt_celebracao)}</td></tr>`).join('');
      const htmlFallback = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;font-size:12pt;margin:0;padding:40px 60px}@media print{body{padding:20px 40px}.no-print{display:none}@page{size:A4;margin:2cm}}table{width:100%;border-collapse:collapse;margin:16px 0}th{background:#000;color:#fff;padding:6px 12px;border:1px solid #000;text-align:center}.btn{margin-bottom:16px;padding:8px 20px;background:#1e40af;color:#fff;border:none;border-radius:6px;cursor:pointer}</style></head><body><button class="btn no-print" onclick="window.print()">Imprimir / Salvar PDF</button><p style="text-align:right">${dataExtenso}</p><p><strong>Ofício nº ${numOficio}</strong></p><p>Assunto: <strong><u>COMUNICADO DE AGENDAMENTO DE CASAMENTOS</u></strong>.</p><p>Exmo. Sr. Juiz de Paz,</p><p style="margin-left:3cm">Venho por meio do presente, <strong>INFORMAR</strong> as datas e horários agendados para realização de casamentos nesta Serventia:</p><p style="text-align:center"><u>CASAMENTOS AGENDADOS NO MÊS DE <strong>${mesCasamentos}</strong></u></p><table><thead><tr><th>PRENOME DOS NUBENTES</th><th>DATA AGENDADA</th><th>HORÁRIO AGENDADO</th></tr></thead><tbody>${linhas2}</tbody></table><p style="margin-left:3cm">Outrossim, informo que, será entregue uma lista atualizada semanalmente por esta Serventia.</p><p style="margin-left:3cm">Sendo o que nos apresenta de momento, aproveito a oportunidade para renovar à Vossa Excelência protestos de elevada estima e consideração.</p><p style="margin-left:3cm">Atenciosamente,</p><br><br><div style="text-align:center"><p>${'_'.repeat(50)}</p><p><strong>${nomeSig}</strong></p><p>${cargoSig}</p></div><p>Ao Exmo. Sr. Juiz de Paz deste município de Paranatinga/MT - <strong>${nomejuiz}</strong></p><br><p>Recebido em: _____________________________.</p></body></html>`;
      const w = window.open('', '_blank', 'width=900,height=750');
      w.document.write(htmlFallback);
      w.document.close();
    }

    await Promise.all(paraOficio.map(c => sb.from('casamentos').update({ comunicado: true }).eq('id', c.id)));
    setMarcados([]);
    carregar();
    addToast('Ofício gerado! ' + paraOficio.length + ' casamento(s) marcado(s) como comunicado.', 'success');
  };

  const fmtDtHora = (iso) => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  const diasAte = (iso) => { if (!iso) return null; return Math.ceil((new Date(iso) - new Date()) / 86400000); };

  const ST = {
    agendado:  { label: 'Agendado',  bg: '#dbeafe', cor: '#1d4ed8' },
    realizado: { label: 'Realizado', bg: '#dcfce7', cor: '#15803d' },
    cancelado: { label: 'Cancelado', bg: '#fee2e2', cor: '#dc2626' },
  };
  const TIPO  = { civil: 'Civil', religioso: 'Religioso', civil_religioso: 'Civil e Religioso' };
  const LOCAL = { serventia: '🏢 Serventia', externo: '📍 Externo' };

  const proximos = casamentos.filter(c => c.status === 'agendado' && c.dt_celebracao && diasAte(c.dt_celebracao) !== null && diasAte(c.dt_celebracao) <= 7 && diasAte(c.dt_celebracao) >= 0);
  const lista = casamentos.filter(c => {
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false;
    if (filtroPeriodo && c.dt_celebracao && !c.dt_celebracao.startsWith(filtroPeriodo)) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Alerta próximos 7 dias */}
      {proximos.length > 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
          <div style={{ fontWeight: 700, color: '#b45309', marginBottom: 6 }}>💍 Casamentos nos próximos 7 dias ({proximos.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {proximos.map(c => (
              <span key={c.id} style={{ padding: '3px 12px', borderRadius: 20, background: '#fff', border: '1px solid #fbbf24', fontSize: 12, color: '#92400e' }}>
                {c.noivo1} & {c.noivo2} — {fmtDtHora(c.dt_celebracao)} ({diasAte(c.dt_celebracao) === 0 ? 'Hoje!' : `${diasAte(c.dt_celebracao)} dias`})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Linha 1: filtros + Novo Casamento */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {['todos','agendado','realizado','cancelado'].map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filtroStatus === s ? 'var(--color-accent)' : 'var(--color-border)'}`, background: filtroStatus === s ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-2)', color: filtroStatus === s ? 'var(--color-accent)' : 'var(--color-text-muted)', fontSize: 12, fontWeight: filtroStatus === s ? 700 : 400, cursor: 'pointer' }}>
            {s === 'todos' ? 'Todos' : ST[s]?.label}
          </button>
        ))}
        <input type="month" className="form-input" value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)} style={{ maxWidth: 160 }} />
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Casamento</button>
        </div>
      </div>

      {/* Linha 2: relatórios + signatário + ofício */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => gerarRelatorio('pendentes')}>📄 Rel. Pendentes</button>
        <button className="btn btn-secondary" onClick={() => gerarRelatorio('realizados')}>📄 Rel. Realizados</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Signatário:</span>
          <select className="form-select" style={{ fontSize: 12, height: 32, minWidth: 180 }} value={signatario} onChange={e => setSignatario(e.target.value)}>
            <option value="">Padrão (Cartório)</option>
            {cartorio?.responsavel && (
              <option value={cartorio.responsavel}>{cartorio.responsavel} ({cartorio.cargo_tabeliao || 'Tabelião'})</option>
            )}
            {(usuarios || []).filter(u => u.ativo && ['tabelião','tabeliao','escrevente','administrador','substituto'].includes((u.perfil||'').toLowerCase())).map(u => (
              <option key={u.id} value={u.nome_completo || u.nome_simples}>{u.nome_completo || u.nome_simples}{u.cargo ? ` (${u.cargo})` : ''}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-secondary" style={{ color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }} onClick={gerarOficioJuizPaz}>
          📨 Ofício Juiz de Paz{marcados.length > 0 ? ` (${marcados.length})` : ''}
        </button>
      </div>

      {/* Tabela */}
      <div className="card" style={{ overflow: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '10px 12px', width: 40 }}></th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Noivos</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Data Celebração</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Tipo / Local</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Processo</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Responsável</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-faint)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💍</div>
                Nenhum casamento encontrado.
              </td></tr>
            ) : lista.map((c, i) => {
              const st = ST[c.status] || ST.agendado;
              const dias = diasAte(c.dt_celebracao);
              const estaMarcado = marcados.includes(c.id);
              return (
                <tr key={c.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', textAlign: 'center', width: 40 }}>
                    {c.status === 'agendado' && !c.comunicado ? (
                      <span
                        onClick={() => toggleMarcado(c.id)}
                        style={{
                          display: 'inline-block', width: 20, height: 20, borderRadius: 4,
                          border: `2px solid ${estaMarcado ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          background: estaMarcado ? 'var(--color-accent)' : 'transparent',
                          cursor: 'pointer', lineHeight: '16px', textAlign: 'center',
                          fontSize: 13, color: '#fff', userSelect: 'none',
                        }}
                      >{estaMarcado ? '✓' : ''}</span>
                    ) : c.comunicado ? (
                      <span title="Já comunicado" style={{ fontSize: 14 }}>📨</span>
                    ) : null}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600 }}>{c.noivo1}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>& {c.noivo2}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div>{fmtDtHora(c.dt_celebracao)}</div>
                    {c.status === 'agendado' && dias !== null && dias <= 7 && dias >= 0 && (
                      <div style={{ fontSize: 11, color: '#b45309', fontWeight: 700 }}>{dias === 0 ? '⚡ Hoje!' : `⚡ ${dias} dias`}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>
                    <div>{TIPO[c.tipo] || c.tipo}</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>{LOCAL[c.local_tipo] || c.local_tipo}</div>
                    {c.local_tipo === 'externo' && c.local_endereco && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{c.local_endereco}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {c.processos ? <span style={{ fontFamily: 'var(--font-mono)' }}>{c.processos.numero_interno}</span> : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {c.usuarios?.nome_simples || '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: st.bg, color: st.cor }}>{st.label}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn-icon btn-sm" title="Editar" onClick={() => abrirEditar(c)}>✎</button>
                      {c.status === 'agendado' && <button className="btn btn-secondary btn-sm" onClick={() => concluir(c.id)}>✓ Concluir</button>}
                      {c.status === 'agendado' && <button className="btn-icon btn-sm" title="Cancelar" style={{ color: 'var(--color-warning)' }} onClick={() => cancelar(c.id)}>⊘</button>}
                      <button className="btn-icon btn-sm" title="Excluir" style={{ color: 'var(--color-danger)' }} onClick={() => excluir(c.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Resumo */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[['agendado','Agendados','#dbeafe','#1d4ed8'],['realizado','Realizados','#dcfce7','#15803d'],['cancelado','Cancelados','#fee2e2','#dc2626']].map(([s, label, bg, cor]) => (
          <div key={s} style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-md)', background: bg, textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: cor }}>{casamentos.filter(c => c.status === s).length}</div>
            <div style={{ fontSize: 12, color: cor, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <span className="modal-title">💍 {form.id ? 'Editar' : 'Novo'} Casamento</span>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ gridColumn: '1 / -1', position: 'relative' }}>
                  <label className="form-label">Processo Vinculado</label>
                  <input className="form-input" value={buscaProcesso} onChange={e => buscarProcesso(e.target.value)} placeholder="Digite o número do processo..." />
                  {processosFiltrados.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                      {processosFiltrados.map(p => (
                        <div key={p.id} onClick={() => selecionarProcesso(p)}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--color-border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <strong>{p.numero_interno}</strong> — {p.especie}
                        </div>
                      ))}
                    </div>
                  )}
                  {form.processo_id && <div className="form-hint">✓ Processo vinculado — nomes preenchidos automaticamente</div>}
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Noivo(a) 1 *</label>
                  <input className="form-input" value={form.noivo1 || ''} onChange={e => set('noivo1', e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Noivo(a) 2 *</label>
                  <input className="form-input" value={form.noivo2 || ''} onChange={e => set('noivo2', e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="form-group">
                  <label className="form-label">Data do Agendamento</label>
                  <input type="date" className="form-input" value={form.dt_agendamento || ''} onChange={e => set('dt_agendamento', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Data/Hora da Celebração</label>
                  <input type="datetime-local" className="form-input" value={form.dt_celebracao ? form.dt_celebracao.slice(0,16) : ''} onChange={e => set('dt_celebracao', e.target.value ? e.target.value + ':00-04:00' : null)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-select" value={form.tipo || 'civil'} onChange={e => set('tipo', e.target.value)}>
                    <option value="civil">Civil</option>
                    <option value="religioso">Religioso</option>
                    <option value="civil_religioso">Civil e Religioso</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Local</label>
                  <select className="form-select" value={form.local_tipo || 'serventia'} onChange={e => set('local_tipo', e.target.value)}>
                    <option value="serventia">Serventia</option>
                    <option value="externo">Externo</option>
                  </select>
                </div>
                {form.local_tipo === 'externo' && (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Endereço do Local</label>
                    <input className="form-input" value={form.local_endereco || ''} onChange={e => set('local_endereco', e.target.value)} placeholder="Rua, número, bairro..." />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Responsável</label>
                  <select className="form-select" value={form.responsavel_id || ''} onChange={e => set('responsavel_id', e.target.value || null)}>
                    <option value="">Selecione</option>
                    {(usuarios || []).filter(u => u.ativo).map(u => (
                      <option key={u.id} value={u.id}>{u.nome_simples || u.nome_completo}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Juiz de Paz</label>
                  <input className="form-input" value={form.juiz_paz || ''} onChange={e => set('juiz_paz', e.target.value)} placeholder={cartorio?.juiz_paz || 'Nome do Juiz de Paz'} />
                  <div className="form-hint">Deixe em branco para usar o Juiz cadastrado nas Configurações</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status || 'agendado'} onChange={e => set('status', e.target.value)}>
                    <option value="agendado">Agendado</option>
                    <option value="realizado">Realizado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Observações</label>
                  <textarea className="form-input" rows={2} value={form.observacao || ''} onChange={e => set('observacao', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? '⏳ Salvando...' : '✓ Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Componente principal ──────────────────────────────────────
export default function RegistroCivilAtos() {
  const { supabaseClient: sb, addToast, usuarios, cartorio } = useApp();
  const [aba, setAba] = useState('casamentos');
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
    <div style={{ padding: '24px 28px', maxWidth: 960 }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
          ⚖ Registro Civil — Atos
        </h1>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)', marginBottom: 24 }}>
        {[['casamentos','💍 Casamentos'],['atos','📋 Averbações']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            style={{ padding: '10px 24px', background: 'none', border: 'none', borderBottom: `3px solid ${aba === id ? 'var(--color-accent)' : 'transparent'}`, color: aba === id ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: aba === id ? 700 : 400, cursor: 'pointer', fontSize: 14, marginBottom: -2 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Aba Casamentos */}
      {aba === 'casamentos' && (
        <AbaCasamentos sb={sb} addToast={addToast} usuarios={usuarios} cartorio={cartorio} />
      )}

      {/* Aba Averbações */}
      {aba === 'atos' && (
      <div>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Carregue o arquivo HTML do lote de comunicações para gerar os textos de averbação automaticamente.
      </p>

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
              background: c.tipo === 'casamento' ? '#fef3e2' : c.tipo === 'divorcio' ? '#fce7f3' : c.tipo === 'conversao' ? '#e0f2fe' : '#e8eaf6',
              color: c.tipo === 'casamento' ? '#b45309' : c.tipo === 'divorcio' ? '#9d174d' : c.tipo === 'conversao' ? '#0369a1' : '#3949ab',
            }}>
              {c.tipo === 'casamento' ? '💍 Casamento' : c.tipo === 'divorcio' ? '⚖ Divórcio' : c.tipo === 'conversao' ? '🔄 Conversão Sep.' : '✝ Óbito'}
            </span>
            {c.rejeitado && (
              <span title={c.motivoRejeicao || 'Comunicação rejeitada'} style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: 4, cursor: c.motivoRejeicao ? 'help' : 'default',
                background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
              }}>
                ⚠ Com Rejeição
              </span>
            )}
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
              {c.rejeitado && c.motivoRejeicao && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: 12, color: '#dc2626' }}>
                  <strong>Motivo da Rejeição:</strong> {c.motivoRejeicao}
                </div>
              )}
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
      )}
    </div>
  );
}
