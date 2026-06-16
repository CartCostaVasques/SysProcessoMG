import { useState, useEffect, useCallback } from 'react';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { supabase } from '../../lib/supabase.js';

const PERIODICIDADE = [
  { value: 'quinzenal',   label: 'Quinzenal'   },
  { value: 'mensal',      label: 'Mensal'      },
  { value: 'trimestral',  label: 'Trimestral'  },
  { value: 'semestral',   label: 'Semestral'   },
  { value: 'anual',       label: 'Anual'       },
];

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const STATUS_CLS = {
  pendente:  { label: 'Pendente',  bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',  color: 'var(--color-warning)'  },
  realizado: { label: 'Realizado', bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)',  color: 'var(--color-success)'  },
  atrasado:  { label: 'Atrasado',  bg: 'color-mix(in srgb, var(--color-danger)  15%, transparent)',  color: 'var(--color-danger)'   },
};

const EMPTY_CONFIG = { titulo: '', descricao: '', periodicidade: 'mensal', dia_vencimento: 1, responsavel_id: '', dias_alerta: 2, ativo: true };

const VARIAVEIS = [
  { key: '{{NOME_JUIZ_PAZ}}',  desc: 'Nome do Juiz de Paz' },
  { key: '{{MES_ANO}}',        desc: 'Mês e ano (ex: Maio de 2026)' },
  { key: '{{PERIODO}}',        desc: 'Período do mês (ex: 01 a 31 de Maio de 2026)' },
  { key: '{{DATA_EMISSAO}}',   desc: 'Data de emissão do documento' },
  { key: '{{RESPONSAVEL}}',    desc: 'Nome do responsável pela comunicação' },
];

function hoje() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function toDateStr(date) {
  const y = date.getFullYear(), m = String(date.getMonth()+1).padStart(2,'0'), d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function fmtData(str) {
  if (!str) return '—';
  const [y,m,d] = str.split('-');
  return `${d}/${m}/${y}`;
}
function diasNoMes(ano, mes) { return new Date(ano, mes, 0).getDate(); }

function calcProximoVencimento(config) {
  const h = hoje();
  const dia = config.dia_vencimento || 1;
  if (config.periodicidade === 'quinzenal') {
    const d1 = new Date(h.getFullYear(), h.getMonth(), dia);
    const d2 = new Date(h.getFullYear(), h.getMonth(), dia + 15);
    if (h <= d1) return d1;
    if (h <= d2) return d2;
    return new Date(h.getFullYear(), h.getMonth() + 1, dia);
  }
  if (config.periodicidade === 'mensal') {
    let d = new Date(h.getFullYear(), h.getMonth(), dia);
    if (h > d) d = new Date(h.getFullYear(), h.getMonth() + 1, dia);
    return d;
  }
  if (config.periodicidade === 'trimestral') {
    for (let i = 0; i < 5; i++) {
      const m = (Math.floor(h.getMonth() / 3) * 3 + i * 3) % 12;
      const y = h.getFullYear() + Math.floor((Math.floor(h.getMonth() / 3) * 3 + i * 3) / 12);
      const d = new Date(y, m, dia);
      if (d >= h) return d;
    }
  }
  if (config.periodicidade === 'semestral') {
    for (let i = 0; i < 4; i++) {
      const m = (Math.floor(h.getMonth() / 6) * 6 + i * 6) % 12;
      const y = h.getFullYear() + Math.floor((Math.floor(h.getMonth() / 6) * 6 + i * 6) / 12);
      const d = new Date(y, m, dia);
      if (d >= h) return d;
    }
  }
  if (config.periodicidade === 'anual') {
    let d = new Date(h.getFullYear(), h.getMonth(), dia);
    if (h > d) d = new Date(h.getFullYear() + 1, h.getMonth(), dia);
    return d;
  }
  return h;
}

// Substitui variáveis no texto do modelo
function substituirVariaveis(corpo, { cartorio, responsavelNome, dtVencimento }) {
  const refDate = dtVencimento ? new Date(dtVencimento + 'T12:00:00') : new Date();
  const mes = refDate.getMonth(); // 0-based
  const ano = refDate.getFullYear();
  const nomeMes = MESES[mes];
  const ultimoDia = diasNoMes(ano, mes + 1);
  const hoje2 = new Date();
  const dtEmissao = `${String(hoje2.getDate()).padStart(2,'0')} de ${MESES[hoje2.getMonth()]} de ${hoje2.getFullYear()}`;

  return corpo
    .replace(/\{\{NOME_JUIZ_PAZ\}\}/g, cartorio?.juiz_paz || '___________________')
    .replace(/\{\{MES_ANO\}\}/g, `${nomeMes} de ${ano}`)
    .replace(/\{\{PERIODO\}\}/g, `01 a ${ultimoDia} de ${nomeMes} de ${ano}`)
    .replace(/\{\{DATA_EMISSAO\}\}/g, dtEmissao)
    .replace(/\{\{RESPONSAVEL\}\}/g, responsavelNome || '___________________');
}

// Gera o .docx usando a mesma estrutura dos ofícios
async function gerarDocxComunicacao({ cartorio, modelo, textoFinal, assinante, titulo }) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, ImageRun, Header, UnderlineType } = await import('docx');

  const FONTE = 'Arial', TAM = 24;
  const MARGIN_H = 227, MARGIN_LR = 1134, MARGIN_BOT = 1134;

  const p = (text, opts = {}) => new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 160, before: opts.before ?? 0, line: 276 },
    children: [new TextRun({ text: text || '', font: FONTE, size: opts.size || TAM, bold: opts.bold || false })],
  });
  const pEmpty = () => new Paragraph({ children: [new TextRun({ text: '', font: FONTE, size: TAM })], spacing: { after: 0, line: 276 } });
  const pCenter = (text, opts = {}) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: opts.after ?? 160, line: 276 },
    children: [new TextRun({ text: text || '', font: FONTE, size: opts.size || TAM, bold: opts.bold || false, underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined })],
  });
  const pIndent = (text, opts = {}) => new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 160, line: 276 },
    indent: { firstLine: 1701 },
    children: [new TextRun({ text: text || '', font: FONTE, size: TAM })],
  });

  // Cabeçalho com imagem
  const cabecalhoImgUrl = cartorio?.cabecalho_img_url || null;
  let headerChildren = [];
  let headerHeightDXA = 1800;

  if (cabecalhoImgUrl) {
    try {
      const imgResp = await fetch(cabecalhoImgUrl);
      const imgBuffer = await imgResp.arrayBuffer();
      const imgBytes = new Uint8Array(imgBuffer);
      const imgType = (imgResp.headers.get('content-type') || '').includes('png') ? 'png' : 'jpg';
      const targetW = Math.round(17 * 37.795);
      const targetH = Math.round(3.5 * 37.795);
      headerHeightDXA = Math.round((3.5 / 2.54) * 1440) + 400;
      headerChildren = [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [new ImageRun({ data: imgBytes.buffer, transformation: { width: targetW, height: targetH }, type: imgType })],
      })];
    } catch {
      headerChildren = [pCenter(cartorio?.nome || '', { bold: true })];
    }
  } else {
    headerChildren = [pCenter(cartorio?.nome || '', { bold: true })];
  }

  const wordHeader = new Header({ children: headerChildren });

  // Assinatura
  const nomeAssin   = assinante?.nome_completo || assinante?.nome_simples || cartorio?.responsavel || '';
  const funcaoAssin = assinante?.cargo || assinante?.perfil || 'Tabeliã';
  const nomeCartorio = cartorio?.nome || '';

  const assinaturaParags = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 6 } }, children: [new TextRun({ text: nomeAssin, font: FONTE, size: TAM, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: funcaoAssin, font: FONTE, size: 22, color: '555555' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: nomeCartorio, font: FONTE, size: 22, color: '555555' })] }),
  ];

  // Cidade e data
  const hoje2 = new Date();
  const dtEmissao = `Paranatinga - MT, ${String(hoje2.getDate()).padStart(2,'0')} de ${MESES[hoje2.getMonth()]} de ${hoje2.getFullYear()}.`;

  // Montar parágrafos do corpo
  const linhasCorpo = textoFinal.split('\n').filter(l => l.trim());

  const children = [
    pEmpty(),
    pEmpty(),
    pEmpty(),
    // Título centralizado, negrito, sublinhado, grande
    pCenter(titulo || 'ATESTADO', { bold: true, underline: true, size: 36, after: 600 }),
    // Corpo
    ...linhasCorpo.map(l => pIndent(l, { after: 200 })),
    pEmpty(),
    pEmpty(),
    // Data
    p(dtEmissao, { align: AlignmentType.CENTER, after: 600 }),
    // Assinatura
    ...assinaturaParags,
  ];

  const doc = new Document({
    styles: { default: { document: { run: { font: FONTE, size: TAM } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { header: MARGIN_H, top: headerHeightDXA, right: MARGIN_LR, bottom: MARGIN_BOT, left: MARGIN_LR },
        },
      },
      headers: { default: wordHeader },
      children,
    }],
  });

  return await Packer.toBlob(doc);
}

// ── Modal de modelo (editar texto) ──────────────────────────────────
// Textos padrão por palavra-chave
const TEXTOS_PADRAO = [
  {
    chaves: ['juiz de paz', 'atestado'],
    titulo: 'ATESTADO',
    corpo: 'Tem o presente a finalidade de atestar, para os devidos fins de direito e para que surta os efeitos legais, que o Sr. {{NOME_JUIZ_PAZ}}, Juiz de Paz deste Ofício, compareceu em todos os atos que foi convocado à Presidir no período de {{PERIODO}}.',
  },
];

function getTextoPadrao(titulo) {
  const t = (titulo || '').toLowerCase();
  return TEXTOS_PADRAO.find(p => p.chaves.some(c => t.includes(c))) || null;
}

function ModalModelo({ config, modelo, onClose, onSave }) {
  const padrao = !modelo ? getTextoPadrao(config.titulo) : null;
  const [titulo, setTitulo] = useState(modelo?.titulo || padrao?.titulo || config.titulo);
  const [corpo, setCorpo]   = useState(modelo?.corpo  || padrao?.corpo  || '');

  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 780, width: '95vw' }}>
          <div className="modal-header">
            <span className="modal-title">📄 Modelo de Documento — {config.titulo}</span>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Título do documento</label>
              <input className="form-input" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: ATESTADO" />
            </div>
            <div>
              <label className="form-label">Texto do modelo</label>
              <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                <strong>Variáveis disponíveis:</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {VARIAVEIS.map(v => (
                    <span key={v.key} title={v.desc} onClick={() => setCorpo(c => c + v.key)}
                      style={{ cursor: 'pointer', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontFamily: 'monospace' }}>
                      {v.key}
                    </span>
                  ))}
                </div>
                <div style={{ marginTop: 4, fontSize: 10 }}>Clique na variável para inserir no texto.</div>
              </div>
              <textarea className="form-input" rows={18} value={corpo} onChange={e => setCorpo(e.target.value)}
                placeholder="Digite o texto do documento aqui. Use as variáveis acima para campos automáticos."
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8, fontSize: 13, minHeight: 220 }} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => {
              if (!corpo.trim()) { alert('Digite o texto do modelo.'); return; }
              onSave({ titulo, corpo });
            }}>Salvar Modelo</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Modal de gerar documento ─────────────────────────────────────────
function ModalGerar({ ocorrencia, config, modelo, cartorio, usuarios, onClose }) {
  const responsavelNome = usuarios.find(u => u.id === config?.responsavel_id)?.nome_simples || '';
  const [juizes,    setJuizes]  = useState([]);
  const [juizSel,   setJuizSel] = useState(cartorio?.juiz_paz || '');
  const [titulo,    setTitulo]  = useState(modelo.titulo || config?.titulo || 'ATESTADO');
  const [assinante, setAss]     = useState(null);
  const [gerando,   setGerando] = useState(false);
  const { addToast } = useApp();
  const temJuizVar = modelo.corpo.includes('{{NOME_JUIZ_PAZ}}');

  const assinantes = usuarios.filter(u => u.ativo && ['tabelião','tabeliao','escrevente','administrador','substituto'].includes((u.perfil||'').toLowerCase()));

  useEffect(() => {
    if (!assinante && assinantes.length) setAss(assinantes[0]);
  }, [assinantes.length]);

  useEffect(() => {
    supabase.from('juizes_paz').select('id, nome, status').order('nome').then(({ data }) => {
      if (data) {
        setJuizes(data);
        // pré-selecionar o ativo ou o do cartório
        const ativo = data.find(j => j.status === 'ativo');
        if (ativo) setJuizSel(ativo.nome);
        else if (cartorio?.juiz_paz) setJuizSel(cartorio.juiz_paz);
      }
    });
  }, []);

  // Texto com variáveis substituídas dinamicamente
  const texto = substituirVariaveis(modelo.corpo, {
    cartorio: { ...cartorio, juiz_paz: juizSel },
    responsavelNome,
    dtVencimento: ocorrencia?.dt_vencimento,
  });

  const gerar = async () => {
    setGerando(true);
    try {
      const assinanteReal = assinante || { nome_completo: cartorio?.responsavel, cargo: 'Tabeliã' };
      const blob = await gerarDocxComunicacao({ cartorio, modelo, textoFinal: texto, assinante: assinanteReal, titulo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titulo.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('Documento gerado!', 'success');
      onClose();
    } catch (e) {
      console.error(e);
      addToast('Erro ao gerar documento.', 'error');
    } finally {
      setGerando(false);
    }
  };

  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 600 }}>
          <div className="modal-header">
            <span className="modal-title">📄 Gerar Documento — {config?.titulo}</span>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Título</label>
              <input className="form-input" value={titulo} onChange={e => setTitulo(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Assinante</label>
              <select className="form-input" value={assinante?.id || ''} onChange={e => setAss(assinantes.find(a => a.id === e.target.value) || null)}>
                {cartorio?.responsavel && <option value="__cartorio__">{cartorio.responsavel} — Tabeliã</option>}
                {assinantes.map(a => <option key={a.id} value={a.id}>{a.nome_simples}</option>)}
              </select>
            </div>
            {temJuizVar && (
              <div>
                <label className="form-label">Juiz de Paz</label>
                {juizes.length > 0 ? (
                  <select className="form-input" value={juizSel} onChange={e => setJuizSel(e.target.value)}>
                    <option value="">— Selecione —</option>
                    {juizes.map(j => (
                      <option key={j.id} value={j.nome}>{j.nome}{j.status === 'ativo' ? ' ✓' : ''}</option>
                    ))}
                  </select>
                ) : (
                  <input className="form-input" value={juizSel} onChange={e => setJuizSel(e.target.value)} placeholder="Nome do Juiz de Paz" />
                )}
              </div>
            )}
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-muted)', maxHeight: 180, overflowY: 'auto' }}>
              <div style={{ fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Preview do documento</div>
              {texto.split('\n').map((l, i) => <div key={i}>{l || <br/>}</div>)}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={gerar} disabled={gerando}>
              {gerando ? 'Gerando...' : '⬇ Baixar .docx'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Modal cadastro/edição de comunicação ─────────────────────────────
function ModalConfig({ config, onClose, onSave, usuarios }) {
  const [form, setForm] = useState(config ? { ...config } : { ...EMPTY_CONFIG });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 520 }}>
          <div className="modal-header">
            <span className="modal-title">{config ? 'Editar Comunicação' : 'Nova Comunicação'}</span>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div><label className="form-label">Título *</label>
              <input className="form-input" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Atestado Juiz de Paz" /></div>
            <div><label className="form-label">Descrição</label>
              <textarea className="form-input" rows={2} value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} style={{ resize: 'vertical' }} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="form-label">Periodicidade *</label>
                <select className="form-input" value={form.periodicidade} onChange={e => set('periodicidade', e.target.value)}>
                  {PERIODICIDADE.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select></div>
              <div><label className="form-label">{form.periodicidade === 'quinzenal' ? 'Dia (1ª quinzena)' : 'Dia do vencimento'}</label>
                <input className="form-input" type="number" min={1} max={28} value={form.dia_vencimento || 1} onChange={e => set('dia_vencimento', parseInt(e.target.value) || 1)} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label className="form-label">Responsável</label>
                <select className="form-input" value={form.responsavel_id || ''} onChange={e => set('responsavel_id', e.target.value || null)}>
                  <option value="">— Nenhum —</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
                </select></div>
              <div><label className="form-label">Alertar (dias antes)</label>
                <input className="form-input" type="number" min={1} max={30} value={form.dias_alerta || 2} onChange={e => set('dias_alerta', parseInt(e.target.value) || 2)} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
              <label htmlFor="ativo" style={{ fontSize: 13, cursor: 'pointer' }}>Comunicação ativa</label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => { if (!form.titulo) { alert('Título obrigatório.'); return; } onSave(form); }}>Salvar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Modal realizar ocorrência ─────────────────────────────────────────
function ModalRealizar({ ocorrencia, config, onClose, onSave }) {
  const [dtRealizado, setDtRealizado] = useState(toDateStr(hoje()));
  const [obs, setObs] = useState('');
  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 420 }}>
          <div className="modal-header">
            <span className="modal-title">✓ Marcar como Realizado</span>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{config?.titulo}</div>
              <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>Vencimento: {fmtData(ocorrencia?.dt_vencimento)}</div>
            </div>
            <div><label className="form-label">Data de realização</label>
              <input className="form-input" type="date" value={dtRealizado} onChange={e => setDtRealizado(e.target.value)} /></div>
            <div><label className="form-label">Observação</label>
              <textarea className="form-input" rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Protocolo, número do documento, etc." style={{ resize: 'vertical' }} /></div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSave({ dt_realizado: dtRealizado, observacao: obs, status: 'realizado' })}>Confirmar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Componente principal ─────────────────────────────────────────────
export default function Comunicacoes() {
  const { usuario, addToast, usuarios, cartorio } = useApp();
  const [configs,     setConfigs]     = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [modelos,     setModelos]     = useState([]); // { config_id, titulo, corpo, id }
  const [loading,     setLoading]     = useState(true);
  const [modalConfig,   setModalConfig]   = useState(null);
  const [modalRealizar, setModalRealizar] = useState(null);
  const [modalModelo,   setModalModelo]   = useState(null); // { config, modelo|null }
  const [modalGerar,    setModalGerar]    = useState(null); // { ocorrencia, config, modelo }
  const [aba,         setAba]         = useState('pendentes');
  const [filtroResp,  setFiltroResp]  = useState('');

  const carregar = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setLoading(true);
      const [{ data: cfgs }, { data: ocors }, { data: mods }] = await Promise.all([
        supabase.from('comunicacoes_config').select('*').order('titulo'),
        supabase.from('comunicacoes_ocorrencias').select('*').order('dt_vencimento', { ascending: false }),
        supabase.from('comunicacoes_modelos').select('*'),
      ]);
      setConfigs(cfgs || []);
      setOcorrencias(ocors || []);
      setModelos(mods || []);
    } catch(e) { console.warn('Comunicacoes carregar:', e.message); }
    finally { setLoading(false); }
  }, []);

  const gerarOcorrencias = useCallback(async (cfgs, ocors) => {
    if (!cfgs?.length) return;
    const h = hoje();
    const inserts = [];
    for (const cfg of cfgs.filter(c => c.ativo)) {
      const prox = calcProximoVencimento(cfg);
      const proxStr = toDateStr(prox);
      const jaExiste = ocors?.some(o => o.config_id === cfg.id && o.dt_vencimento === proxStr);
      if (!jaExiste) {
        const pendentes = ocors?.filter(o => o.config_id === cfg.id && o.status === 'pendente') || [];
        for (const p of pendentes) {
          const dtV = new Date(p.dt_vencimento + 'T00:00:00');
          if (dtV < h) await supabase.from('comunicacoes_ocorrencias').update({ status: 'atrasado' }).eq('id', p.id);
        }
        inserts.push({ config_id: cfg.id, dt_vencimento: proxStr, status: 'pendente' });
      }
    }
    if (inserts.length > 0) { await supabase.from('comunicacoes_ocorrencias').insert(inserts); await carregar(); }
  }, [carregar]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { if (!loading && configs.length > 0) gerarOcorrencias(configs, ocorrencias); }, [loading]);

  // Modelos automáticos por palavra-chave no título
  const MODELOS_AUTO = [
    {
      chaves: ['juiz de paz', 'atestado'],
      titulo: 'ATESTADO',
      corpo: 'Tem o presente a finalidade de atestar, para os devidos fins de direito e para que surta os efeitos legais, que o Sr. {{NOME_JUIZ_PAZ}}, Juiz de Paz deste Ofício, compareceu em todos os atos que foi convocado à Presidir no período de {{PERIODO}}.',
    },
  ];

  const salvarConfig = async (form) => {
    const payload = { titulo: form.titulo, descricao: form.descricao || null, periodicidade: form.periodicidade, dia_vencimento: form.dia_vencimento, responsavel_id: form.responsavel_id || null, dias_alerta: form.dias_alerta, ativo: form.ativo };
    let configId = form.id;
    if (form.id) {
      await supabase.from('comunicacoes_config').update(payload).eq('id', form.id);
      addToast('Comunicação atualizada.', 'success');
    } else {
      const { data } = await supabase.from('comunicacoes_config').insert(payload).select().single();
      configId = data?.id;
      // Criar modelo automático se título bater com palavra-chave
      if (configId) {
        const tituloLower = form.titulo.toLowerCase();
        const modeloAuto = MODELOS_AUTO.find(m => m.chaves.some(c => tituloLower.includes(c)));
        if (modeloAuto) {
          const jaExiste = modelos.some(m => m.config_id === configId);
          if (!jaExiste) {
            await supabase.from('comunicacoes_modelos').insert({ config_id: configId, titulo: modeloAuto.titulo, corpo: modeloAuto.corpo });
            addToast('Comunicação criada com modelo automático! 📄', 'success');
          }
        } else {
          addToast('Comunicação criada.', 'success');
        }
      }
    }
    setModalConfig(null); carregar();
  };

  const salvarModelo = async ({ titulo, corpo }) => {
    const { config, modelo } = modalModelo;
    const payload = { config_id: config.id, titulo, corpo, atualizado_em: new Date().toISOString() };
    if (modelo?.id) { await supabase.from('comunicacoes_modelos').update(payload).eq('id', modelo.id); addToast('Modelo atualizado.', 'success'); }
    else { await supabase.from('comunicacoes_modelos').insert(payload); addToast('Modelo salvo.', 'success'); }
    setModalModelo(null); carregar();
  };

  const excluirOcorrencia = async (id) => {
    if (!confirm('Excluir este registro de ocorrência pendente?')) return;
    await supabase.from('comunicacoes_ocorrencias').delete().eq('id', id);
    addToast('Ocorrência excluída.', 'success'); carregar();
  };

  const realizarOcorrencia = async (ocorrencia, dados) => {
    await supabase.from('comunicacoes_ocorrencias').update({ ...dados, realizado_por: usuario?.id }).eq('id', ocorrencia.id);
    addToast('Comunicação marcada como realizada!', 'success');
    setModalRealizar(null); carregar();
  };

  const excluirConfig = async (id) => {
    if (!confirm('Excluir esta comunicação e todo seu histórico?')) return;
    await supabase.from('comunicacoes_config').delete().eq('id', id);
    addToast('Comunicação excluída.', 'success'); carregar();
  };

  const nomeResp = (id) => usuarios.find(u => u.id === id)?.nome_simples || '—';
  const configById = (id) => configs.find(c => c.id === id);
  const modeloPorConfig = (configId) => modelos.find(m => m.config_id === configId);

  const h = hoje();
  const pendentes = ocorrencias.filter(o => o.status !== 'realizado').map(o => {
    const cfg = configById(o.config_id);
    const dtV = new Date(o.dt_vencimento + 'T00:00:00');
    const diffDias = Math.ceil((dtV - h) / 86400000);
    return { ...o, cfg, diffDias };
  }).filter(o => o.cfg).sort((a, b) => a.diffDias - b.diffDias);

  const historico = ocorrencias.filter(o => o.status === 'realizado').map(o => ({ ...o, cfg: configById(o.config_id) })).filter(o => o.cfg);
  const pendFiltradas = filtroResp ? pendentes.filter(o => o.cfg?.responsavel_id === filtroResp) : pendentes;
  const histFiltradas = filtroResp ? historico.filter(o => o.cfg?.responsavel_id === filtroResp) : historico;
  const labelPeriod = (p) => PERIODICIDADE.find(x => x.value === p)?.label || p;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>📡 Comunicações Periódicas</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Controle de comunicações obrigatórias do cartório</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalConfig('novo')}>+ Nova Comunicação</button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)' }}>
        {[
          { id: 'pendentes',  label: `⏳ Pendentes (${pendentes.length})` },
          { id: 'historico',  label: '✓ Histórico' },
          { id: 'configurar', label: `⚙ Configurar (${configs.length})` },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: aba === a.id ? 700 : 400, cursor: 'pointer',
            background: 'transparent', border: 'none',
            borderBottom: aba === a.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: aba === a.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}>{a.label}</button>
        ))}
      </div>

      {/* Filtro responsável */}
      {(aba === 'pendentes' || aba === 'historico') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Responsável:</span>
          <select style={{ fontSize: 12, height: 30, padding: '0 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
            value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
            <option value="">Todos</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Carregando...</div>
      ) : (
        <>
          {/* ABA PENDENTES */}
          {aba === 'pendentes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendFiltradas.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>✅ Nenhuma comunicação pendente.</div>
              )}
              {pendFiltradas.map(o => {
                const st = STATUS_CLS[o.status] || STATUS_CLS.pendente;
                const atrasado = o.status === 'atrasado';
                const urgente  = !atrasado && o.diffDias <= (o.cfg?.dias_alerta || 2);
                const modeloDisp = modeloPorConfig(o.cfg?.id);
                return (
                  <div key={o.id} style={{
                    background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', padding: '12px 16px',
                    border: `2px solid ${atrasado ? 'var(--color-danger)' : urgente ? 'var(--color-warning)' : 'var(--color-border)'}`,
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{o.cfg?.titulo}</div>
                      {o.cfg?.descricao && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{o.cfg.descricao}</div>}
                      <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>📅 Vence: <strong>{fmtData(o.dt_vencimento)}</strong></span>
                        <span>🔄 {labelPeriod(o.cfg?.periodicidade)}</span>
                        <span>👤 {nomeResp(o.cfg?.responsavel_id)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color }}>
                        {atrasado ? `Atrasado ${Math.abs(o.diffDias)}d` : o.diffDias === 0 ? 'Hoje!' : `${o.diffDias}d`}
                      </span>
                      {modeloDisp && (
                        <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}
                          onClick={() => setModalGerar({ ocorrencia: o, config: o.cfg, modelo: modeloDisp })}>
                          📄 Gerar Doc
                        </button>
                      )}
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}
                        onClick={() => setModalRealizar({ ocorrencia: o, config: o.cfg })}>✓ Realizar</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--color-danger)' }}
                        onClick={() => excluirOcorrencia(o.id)} title="Excluir ocorrência">🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ABA HISTÓRICO */}
          {aba === 'historico' && (
            <div style={{ overflowX: 'auto' }}>
              {histFiltradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>Nenhum registro no histórico.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                      {['Comunicação','Periodicidade','Responsável','Vencimento','Realizado em','Observação'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {histFiltradas.map((o, i) => (
                      <tr key={o.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{o.cfg?.titulo}</td>
                        <td style={{ padding: '8px 12px' }}>{labelPeriod(o.cfg?.periodicidade)}</td>
                        <td style={{ padding: '8px 12px' }}>{nomeResp(o.cfg?.responsavel_id)}</td>
                        <td style={{ padding: '8px 12px' }}>{fmtData(o.dt_vencimento)}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-success)' }}>{fmtData(o.dt_realizado)}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{o.observacao || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ABA CONFIGURAR */}
          {aba === 'configurar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {configs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>Nenhuma comunicação cadastrada.</div>
              )}
              {configs.map(c => {
                const modeloExiste = modeloPorConfig(c.id);
                return (
                  <div key={c.id} style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    opacity: c.ativo ? 1 : 0.5,
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {c.titulo}
                        {!c.ativo && <span style={{ fontSize: 10, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', padding: '1px 8px', borderRadius: 10 }}>inativa</span>}
                        {modeloExiste && <span style={{ fontSize: 10, background: 'color-mix(in srgb, var(--color-success) 15%, transparent)', color: 'var(--color-success)', padding: '1px 8px', borderRadius: 10 }}>📄 com modelo</span>}
                      </div>
                      {c.descricao && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.descricao}</div>}
                      <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap', color: 'var(--color-text-muted)' }}>
                        <span>🔄 {labelPeriod(c.periodicidade)}</span>
                        <span>📅 Dia {c.dia_vencimento}</span>
                        <span>👤 {nomeResp(c.responsavel_id)}</span>
                        <span>⏰ Alerta {c.dias_alerta}d antes</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}
                        onClick={() => setModalModelo({ config: c, modelo: modeloExiste || null })}>
                        {modeloExiste ? '📄 Editar Modelo' : '📄 Criar Modelo'}
                      </button>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }} onClick={() => setModalConfig({
                        id: c.id, titulo: c.titulo, descricao: c.descricao || '', periodicidade: c.periodicidade,
                        dia_vencimento: c.dia_vencimento, responsavel_id: c.responsavel_id || '', dias_alerta: c.dias_alerta, ativo: c.ativo,
                      })}>✏ Editar</button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--color-danger)' }} onClick={() => excluirConfig(c.id)}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modais */}
      {modalConfig && <ModalConfig config={modalConfig === 'novo' ? null : modalConfig} onClose={() => setModalConfig(null)} onSave={salvarConfig} usuarios={usuarios} />}
      {modalRealizar && <ModalRealizar ocorrencia={modalRealizar.ocorrencia} config={modalRealizar.config} onClose={() => setModalRealizar(null)} onSave={(d) => realizarOcorrencia(modalRealizar.ocorrencia, d)} />}
      {modalModelo && <ModalModelo config={modalModelo.config} modelo={modalModelo.modelo} onClose={() => setModalModelo(null)} onSave={salvarModelo} />}
      {modalGerar && <ModalGerar ocorrencia={modalGerar.ocorrencia} config={modalGerar.config} modelo={modalGerar.modelo} cartorio={cartorio} usuarios={usuarios} onClose={() => setModalGerar(null)} />}
    </div>
  );
}
