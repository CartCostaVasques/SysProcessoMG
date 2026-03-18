import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

// ── Modelos disponíveis ──────────────────────────────────────
const MODELOS = [
  {
    id: 'forum_cumprimento',
    label: 'Ofício ao Fórum — Cumprimento',
    descricao: 'Ofício simples de cumprimento dirigido ao Fórum / Juízo',
    camposExtras: [
      { key: 'juiz', label: 'Meritíssimo(a) Juiz(a)', placeholder: 'Nome do(a) Juiz(a)', tipoContato: 'juiz' },
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
      { key: 'oficial_rc', label: 'Oficial do Registro Civil', placeholder: 'Nome do Oficial de RC', tipoContato: 'cartorio_rc' },
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

const TIPO_LABEL = { juiz: 'Juiz(a)', cartorio_rc: 'Cartório RC', outro: 'Outro' };

// ── Autocomplete com botão salvar contato ────────────────────
function AutocompleteContato({ value, onChange, tipoContato, placeholder, contatos, onSalvar }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const ref = useRef(null);

  const sugestoes = useMemo(() => {
    if (!value || value.length < 2) return contatos.filter(c => c.tipo === tipoContato);
    return contatos.filter(c =>
      c.tipo === tipoContato &&
      (c.nome.toLowerCase().includes(value.toLowerCase()) ||
       (c.descricao || '').toLowerCase().includes(value.toLowerCase()))
    );
  }, [contatos, tipoContato, value]);

  const jaExiste = contatos.some(c => c.tipo === tipoContato && c.nome.toLowerCase() === (value || '').toLowerCase());

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSalvar = async () => {
    if (!value?.trim()) return;
    setSalvando(true);
    await onSalvar({ tipo: tipoContato, nome: value.trim(), descricao: '' });
    setSalvando(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          className="form-input"
          value={value}
          onChange={e => { onChange(e.target.value); setAberto(true); }}
          onFocus={() => setAberto(true)}
          placeholder={placeholder}
          style={{ flex: 1 }}
          autoComplete="off"
        />
        {value && !jaExiste && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSalvar}
            disabled={salvando}
            title={`Salvar "${value}" como ${TIPO_LABEL[tipoContato]}`}
            style={{ flexShrink: 0, fontSize: 11 }}
          >
            {salvando ? '...' : '💾 Salvar'}
          </button>
        )}
        {value && jaExiste && (
          <span style={{ alignSelf: 'center', fontSize: 11, color: 'var(--color-success, #16a34a)', flexShrink: 0 }}>✓ salvo</span>
        )}
      </div>

      {aberto && sugestoes.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxHeight: 200, overflowY: 'auto', marginTop: 2,
        }}>
          {sugestoes.map(c => (
            <div
              key={c.id}
              onMouseDown={() => { onChange(c.nome); setAberto(false); }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</div>
              {c.descricao && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.descricao}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal de gerenciamento de contatos ───────────────────────
function GerenciarContatos({ contatos, onAdd, onEdit, onDelete, onClose }) {
  const [form,      setForm]      = useState({ tipo: 'juiz', nome: '', descricao: '' });
  const [editando,  setEditando]  = useState(null);
  const [filtrTipo, setFiltrTipo] = useState('');
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSalvar = async () => {
    if (!form.nome.trim()) return;
    if (editando) { await onEdit(editando, { nome: form.nome.trim(), descricao: form.descricao.trim(), tipo: form.tipo }); setEditando(null); }
    else          { await onAdd({ tipo: form.tipo, nome: form.nome.trim(), descricao: form.descricao.trim() }); }
    setForm({ tipo: form.tipo, nome: '', descricao: '' });
  };

  const iniciarEdicao = (c) => {
    setEditando(c.id);
    setForm({ tipo: c.tipo, nome: c.nome, descricao: c.descricao || '' });
  };

  const lista = filtrTipo ? contatos.filter(c => c.tipo === filtrTipo) : contatos;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Gerenciar Contatos</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Formulário */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nome *</label>
              <input className="form-input" value={form.nome} onChange={e => setF('nome', e.target.value)} placeholder="Nome do juiz, cartório, etc." />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Descrição (vara, comarca, endereço...)</label>
            <input className="form-input" value={form.descricao} onChange={e => setF('descricao', e.target.value)} placeholder="Informação complementar opcional" />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editando && <button className="btn btn-secondary btn-sm" onClick={() => { setEditando(null); setForm({ tipo: form.tipo, nome: '', descricao: '' }); }}>Cancelar</button>}
            <button className="btn btn-primary btn-sm" onClick={handleSalvar} disabled={!form.nome.trim()}>
              {editando ? 'Salvar alteração' : '+ Adicionar'}
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={{ padding: '10px 18px 6px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm ${!filtrTipo ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltrTipo('')}>Todos</button>
          {Object.entries(TIPO_LABEL).map(([k, v]) => (
            <button key={k} className={`btn btn-sm ${filtrTipo === k ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFiltrTipo(k)}>{v}</button>
          ))}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {lista.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>Nenhum contato cadastrado</div>
            : lista.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>{TIPO_LABEL[c.tipo]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</div>
                  {c.descricao && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.descricao}</div>}
                </div>
                <button className="btn-icon btn-sm" onClick={() => iniciarEdicao(c)} title="Editar">✎</button>
                <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Remover contato?')) onDelete(c.id); }} style={{ color: 'var(--color-danger)' }} title="Remover">✕</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

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

  const blob = await Packer.toBlob(doc);
  return blob;
}

// ── Componente principal ─────────────────────────────────────
export default function ModelosOficio() {
  const { oficios, processos, interessados, cartorio, oficioContatos, addOficioContato, editOficioContato, deleteOficioContato } = useApp();

  const [oficioSel,       setOficioSel]       = useState('');
  const [modeloSel,       setModeloSel]       = useState('');
  const [extras,          setExtras]          = useState({});
  const [gerando,         setGerando]         = useState(false);
  const [erro,            setErro]            = useState('');
  const [modalContatos,   setModalContatos]   = useState(false);

  const oficio   = useMemo(() => oficios.find(o => String(o.id) === String(oficioSel)), [oficios, oficioSel]);
  const processo = useMemo(() => oficio?.processo_id ? processos.find(p => p.id === oficio.processo_id) : null, [oficio, processos]);
  const modelo   = useMemo(() => MODELOS.find(m => m.id === modeloSel), [modeloSel]);

  const setExtra = (k, v) => setExtras(p => ({ ...p, [k]: v }));

  const oficiosOrdenados = useMemo(() =>
    [...oficios].sort((a, b) => {
      const na = parseInt((a.numero || '').split('/')[0], 10) || 0;
      const nb = parseInt((b.numero || '').split('/')[0], 10) || 0;
      return nb - na;
    }),
  [oficios]);

  const handleSalvarContato = async (dados) => {
    await addOficioContato(dados);
  };

  const handleGerar = async () => {
    if (!oficio)  { setErro('Selecione um ofício.'); return; }
    if (!modelo)  { setErro('Selecione um modelo.'); return; }
    setErro('');
    setGerando(true);
    try {
      const blob = await gerarDocx({ modelo, oficio, processo, interessados, cartorio, extras });
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

      {/* Cabeçalho com botão gerenciar contatos */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setModalContatos(true)}>
          📋 Gerenciar Contatos ({oficioContatos?.length || 0})
        </button>
      </div>

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

      {/* Passo 3 — Campos extras */}
      {modelo && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">3 — Preencha os Campos do Modelo</div>
            <div className="card-subtitle" style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
              Campos com 💾 podem ser salvos para reutilização futura
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
                  : campo.tipoContato
                    ? <AutocompleteContato
                        value={extras[campo.key] || ''}
                        onChange={v => setExtra(campo.key, v)}
                        tipoContato={campo.tipoContato}
                        placeholder={campo.placeholder}
                        contatos={oficioContatos || []}
                        onSalvar={handleSalvarContato}
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

      {/* Modal gerenciar contatos */}
      {modalContatos && (
        <GerenciarContatos
          contatos={oficioContatos || []}
          onAdd={addOficioContato}
          onEdit={editOficioContato}
          onDelete={deleteOficioContato}
          onClose={() => setModalContatos(false)}
        />
      )}
    </div>
  );
}
