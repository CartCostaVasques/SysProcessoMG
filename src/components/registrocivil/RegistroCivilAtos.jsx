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
  );
}
