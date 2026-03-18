import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

// ── Modelos disponíveis ──────────────────────────────────────
const MODELOS = [
  {
    id: 'forum_cumprimento',
    label: 'Ofício ao Fórum — Cumprimento',
    descricao: 'Ofício simples de cumprimento dirigido ao Fórum / Juízo',
    camposExtras: [
      { key: 'juiz', label: 'Meritíssimo(a) Juiz(a)', placeholder: 'Nome do(a) Juiz(a)' },
      { key: 'vara', label: 'Vara / Comarca', placeholder: 'Ex: 1ª Vara Cível de Paranatinga' },
      { key: 'proc_judicial', label: 'Nº Processo Judicial (opcional)', placeholder: 'Nº do processo judicial' },
      { key: 'corpo', label: 'Corpo do Ofício', placeholder: 'Texto principal do ofício...', multiline: true },
    ],
  },
  {
    id: 'registro_civil',
    label: 'Comunicação ao Registro Civil',
    descricao: 'Comunicação de ato notarial ao Registro Civil',
    camposExtras: [
      { key: 'oficial_rc', label: 'Oficial do Registro Civil', placeholder: 'Nome do Oficial de RC' },
      { key: 'tipo_ato', label: 'Tipo do Ato Comunicado', placeholder: 'Ex: Escritura de Compra e Venda' },
      { key: 'partes_ato', label: 'Partes do Ato', placeholder: 'Ex: Fulano de Tal e Beltrano da Silva' },
      { key: 'corpo', label: 'Observações / Complemento', placeholder: 'Informações adicionais...', multiline: true },
    ],
  },
];

// ── Helpers de formatação ────────────────────────────────────
const fmtData = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const fmtDataExtenso = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
};

// ── Geração do .docx via lib docx (importada dinamicamente) ──
async function gerarDocx({ modelo, oficio, processo, interessados, cartorio, extras }) {
  // Import dinâmico para não aumentar o bundle principal
  const {
    Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle,
    UnderlineType, HeadingLevel,
  } = await import('docx');

  const nomeCartorio = cartorio?.nome || 'Serviço Notarial e Registral';
  const cidade       = cartorio?.cidade || 'Paranatinga - MT';
  const endereco     = cartorio?.endereco || '';
  const telefone     = cartorio?.telefone || '';
  const dtOficio     = fmtDataExtenso(oficio.dt_oficio || new Date().toISOString().split('T')[0]);
  const numOficio    = oficio.numero || '';

  // Partes do processo
  let partesStr = '';
  if (processo) {
    try {
      const partes = JSON.parse(processo.partes || '[]');
      partesStr = partes.map(p => {
        const int = interessados?.find(i => i.id === p.id);
        return int?.nome || p.nome || '';
      }).filter(Boolean).join(', ');
    } catch { partesStr = ''; }
  }

  // Estilo de parágrafo padrão
  const pNormal = (text, opts = {}) => new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { after: opts.spacingAfter ?? 160, before: opts.spacingBefore ?? 0, line: 276 },
    children: [new TextRun({
      text,
      font: 'Arial',
      size: opts.size || 24,
      bold: opts.bold || false,
      underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
      color: opts.color || undefined,
    })],
  });

  const pBlank = () => new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 24 })], spacing: { after: 80 } });

  // ── MODELO: Ofício ao Fórum ───────────────────────────────
  const buildForum = () => {
    const juiz      = extras.juiz || '___________________________';
    const vara      = extras.vara || '___________________________';
    const procJud   = extras.proc_judicial ? `Ref.: Processo Judicial nº ${extras.proc_judicial}` : '';
    const corpo     = extras.corpo || 'Vimos, por meio do presente, encaminhar os documentos solicitados, colocando-nos à disposição para quaisquer esclarecimentos.';

    return [
      // Cabeçalho cartório
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: nomeCartorio.toUpperCase(), font: 'Arial', size: 28, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: `${endereco} — ${cidade}`, font: 'Arial', size: 20, color: '555555' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: telefone ? `Tel.: ${telefone}` : '', font: 'Arial', size: 20, color: '555555' })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E3A5F', space: 6 } },
      }),

      pBlank(),

      // Número e data
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Ofício nº ${numOficio}`, font: 'Arial', size: 24, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 320 },
        children: [new TextRun({ text: `${cidade}, ${dtOficio}`, font: 'Arial', size: 24 })],
      }),

      // Destinatário
      pNormal(`Excelentíssimo(a) Senhor(a)`, { bold: true, spacingAfter: 40 }),
      pNormal(`${juiz}`, { bold: true, spacingAfter: 40 }),
      pNormal(`${vara}`, { spacingAfter: 40 }),
      pNormal(`${cidade}`, { spacingAfter: 320 }),

      // Referência judicial
      ...(procJud ? [pNormal(procJud, { bold: true, spacingAfter: 240 })] : []),

      // Assunto
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({ text: 'Assunto: ', font: 'Arial', size: 24, bold: true }),
          new TextRun({ text: oficio.assunto || '', font: 'Arial', size: 24 }),
        ],
      }),

      // Saudação
      pNormal('Senhor(a),', { spacingAfter: 200 }),

      // Corpo
      ...corpo.split('\n').map(linha => pNormal(linha, { spacingAfter: 160 })),

      // Processo vinculado
      ...(processo ? [
        pBlank(),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Processo vinculado: ', font: 'Arial', size: 24, bold: true }),
            new TextRun({ text: `${processo.numero_interno} — ${processo.especie || ''}`, font: 'Arial', size: 24 }),
          ],
        }),
        ...(partesStr ? [new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Partes: ', font: 'Arial', size: 24, bold: true }),
            new TextRun({ text: partesStr, font: 'Arial', size: 24 }),
          ],
        })] : []),
      ] : []),

      pBlank(),
      pBlank(),

      // Encerramento
      pNormal('Atenciosamente,', { spacingAfter: 400 }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 4 } },
        children: [new TextRun({ text: oficio.responsavel || nomeCartorio, font: 'Arial', size: 24, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: nomeCartorio, font: 'Arial', size: 22, color: '555555' })],
      }),
    ];
  };

  // ── MODELO: Comunicação Registro Civil ───────────────────
  const buildRegistroCivil = () => {
    const oficialRC = extras.oficial_rc || '___________________________';
    const tipoAto   = extras.tipo_ato || (processo?.especie || '___________________________');
    const partesAto = extras.partes_ato || partesStr || '___________________________';
    const corpo     = extras.corpo || '';

    return [
      // Cabeçalho
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: nomeCartorio.toUpperCase(), font: 'Arial', size: 28, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: `${endereco} — ${cidade}`, font: 'Arial', size: 20, color: '555555' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: telefone ? `Tel.: ${telefone}` : '', font: 'Arial', size: 20, color: '555555' })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E3A5F', space: 6 } },
      }),

      pBlank(),

      // Número e data
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 200 },
        children: [new TextRun({ text: `Ofício nº ${numOficio}`, font: 'Arial', size: 24, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 320 },
        children: [new TextRun({ text: `${cidade}, ${dtOficio}`, font: 'Arial', size: 24 })],
      }),

      // Destinatário
      pNormal('Ao Senhor(a)', { bold: true, spacingAfter: 40 }),
      pNormal(`Oficial do Registro Civil — ${oficialRC}`, { bold: true, spacingAfter: 40 }),
      pNormal(cidade, { spacingAfter: 320 }),

      // Assunto
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({ text: 'Assunto: ', font: 'Arial', size: 24, bold: true }),
          new TextRun({ text: oficio.assunto || 'Comunicação de Ato Notarial', font: 'Arial', size: 24 }),
        ],
      }),

      pNormal('Senhor(a) Oficial,', { spacingAfter: 200 }),

      pNormal(
        `Comunicamos a Vossa Senhoria que em ${dtOficio}, neste ${nomeCartorio}, foi lavrado o seguinte ato:`,
        { spacingAfter: 200 }
      ),

      // Quadro do ato
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Tipo do Ato: ', font: 'Arial', size: 24, bold: true }),
          new TextRun({ text: tipoAto, font: 'Arial', size: 24 }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: 'Partes Envolvidas: ', font: 'Arial', size: 24, bold: true }),
          new TextRun({ text: partesAto, font: 'Arial', size: 24 }),
        ],
      }),
      ...(processo ? [
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Processo nº: ', font: 'Arial', size: 24, bold: true }),
            new TextRun({ text: processo.numero_interno || '', font: 'Arial', size: 24 }),
          ],
        }),
        ...(processo.livro_ato ? [new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Livro/Folhas: ', font: 'Arial', size: 24, bold: true }),
            new TextRun({ text: `${processo.livro_ato}${processo.folhas_ato ? ' / ' + processo.folhas_ato : ''}`, font: 'Arial', size: 24 }),
          ],
        })] : []),
      ] : []),

      pBlank(),

      // Corpo extra
      ...(corpo ? corpo.split('\n').map(l => pNormal(l, { spacingAfter: 160 })) : []),

      pNormal(
        'Solicitamos que sejam tomadas as providências cabíveis para o devido registro, averbação ou anotação conforme determinação legal.',
        { spacingAfter: 200 }
      ),

      pBlank(),
      pNormal('Atenciosamente,', { spacingAfter: 400 }),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 4 } },
        children: [new TextRun({ text: oficio.responsavel || nomeCartorio, font: 'Arial', size: 24, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
        children: [new TextRun({ text: nomeCartorio, font: 'Arial', size: 22, color: '555555' })],
      }),
    ];
  };

  const children = modelo.id === 'forum_cumprimento' ? buildForum() : buildRegistroCivil();

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 24 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1418, right: 1134, bottom: 1134, left: 1701 }, // margens ofício: top 2.5cm, esq 3cm, dir 2cm, inf 2cm
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

// ── Componente principal ─────────────────────────────────────
export default function ModelosOficio() {
  const { oficios, processos, interessados, cartorio, usuarios } = useApp();

  const [oficioSel,  setOficioSel]  = useState('');
  const [modeloSel,  setModeloSel]  = useState('');
  const [extras,     setExtras]     = useState({});
  const [gerando,    setGerando]    = useState(false);
  const [erro,       setErro]       = useState('');

  const oficio   = useMemo(() => oficios.find(o => String(o.id) === String(oficioSel)), [oficios, oficioSel]);
  const processo = useMemo(() => oficio?.processo_id ? processos.find(p => p.id === oficio.processo_id) : null, [oficio, processos]);
  const modelo   = useMemo(() => MODELOS.find(m => m.id === modeloSel), [modeloSel]);

  const setExtra = (k, v) => setExtras(p => ({ ...p, [k]: v }));

  // Ordena ofícios: mais recentes primeiro
  const oficiosOrdenados = useMemo(() =>
    [...oficios].sort((a, b) => {
      const na = parseInt((a.numero || '').split('/')[0], 10) || 0;
      const nb = parseInt((b.numero || '').split('/')[0], 10) || 0;
      return nb - na;
    }),
  [oficios]);

  const handleGerar = async () => {
    if (!oficio)  { setErro('Selecione um ofício.'); return; }
    if (!modelo)  { setErro('Selecione um modelo.'); return; }
    setErro('');
    setGerando(true);
    try {
      const buffer = await gerarDocx({ modelo, oficio, processo, interessados, cartorio, extras });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Oficio_${oficio.numero?.replace('/', '-')}_${modelo.id}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setErro('Erro ao gerar o documento. Verifique o console.');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* Passo 1 — Selecionar ofício */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">1 — Selecione o Ofício</div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <select
            className="form-select"
            value={oficioSel}
            onChange={e => { setOficioSel(e.target.value); setExtras({}); }}
          >
            <option value="">— Selecione o ofício —</option>
            {oficiosOrdenados.map(o => (
              <option key={o.id} value={o.id}>
                {o.numero} · {o.mes_ano} · {o.destinatario} · {o.assunto}
              </option>
            ))}
          </select>

          {/* Resumo do ofício selecionado */}
          {oficio && (
            <div style={{ marginTop: 12, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Número: </span><strong>{oficio.numero}</strong></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Data: </span>{fmtData(oficio.dt_oficio)}</div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Destinatário: </span>{oficio.destinatario}</div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Expedido por: </span>{oficio.responsavel || '—'}</div>
              <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--color-text-muted)' }}>Assunto: </span>{oficio.assunto}</div>
              {processo && (
                <div style={{ gridColumn: '1 / -1', marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--color-border)' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Processo vinculado: </span>
                  <strong>{processo.numero_interno}</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}> — {processo.especie}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Passo 2 — Selecionar modelo */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">2 — Escolha o Modelo</div>
        </div>
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MODELOS.map(m => (
            <div
              key={m.id}
              onClick={() => { setModeloSel(m.id); setExtras({}); }}
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${modeloSel === m.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: modeloSel === m.id ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))' : 'var(--color-surface)',
                cursor: 'pointer',
                transition: 'border-color .15s, background .15s',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, color: modeloSel === m.id ? 'var(--color-accent)' : 'var(--color-text)' }}>
                {modeloSel === m.id ? '● ' : '○ '}{m.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{m.descricao}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Passo 3 — Campos extras do modelo */}
      {modelo && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">3 — Preencha os Campos do Modelo</div>
            <div className="card-subtitle" style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
              Campos em branco serão deixados como linha em branco no documento
            </div>
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {modelo.camposExtras.map(campo => (
              <div key={campo.key} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{campo.label}</label>
                {campo.multiline
                  ? <textarea
                      className="form-input"
                      rows={4}
                      value={extras[campo.key] || ''}
                      onChange={e => setExtra(campo.key, e.target.value)}
                      placeholder={campo.placeholder}
                      style={{ resize: 'vertical', fontSize: 12 }}
                    />
                  : <input
                      className="form-input"
                      value={extras[campo.key] || ''}
                      onChange={e => setExtra(campo.key, e.target.value)}
                      placeholder={campo.placeholder}
                    />
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div style={{ marginBottom: 12, padding: '8px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>
          ⚠ {erro}
        </div>
      )}

      {/* Botão gerar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleGerar}
          disabled={gerando || !oficioSel || !modeloSel}
          style={{ minWidth: 160 }}
        >
          {gerando ? '⏳ Gerando...' : '📄 Gerar .docx'}
        </button>
      </div>
    </div>
  );
}
