import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const TIPOS_RC = ['Casamento', 'Divórcio', 'Óbito', 'Nascimento', 'Outros'];
const MODELOS = [
  { id: 'comunicacao_rc',    label: 'Comunicação ao Registro Civil', descricao: 'Comunicação de ato notarial ao Registro Civil (casamento, divórcio, óbito...)' },
  { id: 'forum_cumprimento', label: 'Ofício ao Fórum / Juízo',       descricao: 'Cumprimento de mandado, envio de documentos, resposta a solicitação...' },
  { id: 'protesto',          label: 'Ofício de Protesto',             descricao: 'Retirada de apontamento, comunicação de protesto, texto livre...' },
];

// Situações pré-definidas para o Fórum
const SITUACOES_FORUM = [
  {
    id: 'cumprimento_mandado',
    label: 'Cumprimento de Mandado',
    corpo: `Venho por meio do presente, em atendimento ao referido Mandado Judicial, no qual figura a parte acima requerida, informar a Vossa Excelência o devido cumprimento do mesmo, procedendo com a [ATO PRATICADO].

Desta feita, segue certidão do registro sob nº [Nº REGISTRO] do Livro [LIVRO] desta Serventia para a comprovação do ato.

Sendo o que nos apresenta de momento, aproveito a oportunidade para renovar à Vossa Excelência protestos de elevada estima e consideração.`,
  },
  {
    id: 'envio_documentos',
    label: 'Envio de Documentos / Certidão',
    corpo: `Vimos pelo presente encaminhar a Vossa Excelência, em atendimento à solicitação, os documentos abaixo relacionados:

[RELACIONAR OS DOCUMENTOS ENVIADOS]

Colocamo-nos à disposição para quaisquer esclarecimentos que se fizerem necessários.`,
  },
  {
    id: 'resposta_solicitacao',
    label: 'Resposta a Solicitação',
    corpo: `Em resposta ao ofício nº [Nº OFÍCIO], datado de [DATA], vimos informar que:

[DESCREVER A RESPOSTA À SOLICITAÇÃO]

Permanecemos à inteira disposição de Vossa Excelência para o que mais se fizer necessário.`,
  },
  {
    id: 'sustacao_protesto',
    label: 'Sustação de Protesto',
    corpo: `Venho por meio do presente, em atendimento ao determinado no processo acima mencionado, informar a Vossa Excelência que em [DATA_HOJE], esta Serventia procedeu a suspensão dos protestos em que figura como devedor a parte acima indicada, sob CNPJ de nº [CNPJ MATRIZ], sendo a empresa matriz, e também no CNPJ de sua filial sob nº [CNPJ FILIAL], conforme certidões de protestos anexas ao presente.

Informo ainda, que nos demais CNPJ das filiais não constam protestos em nossa Serventia.`,
  },
  {
    id: 'baixa_protesto',
    label: 'Baixa de Protesto',
    corpo: `Venho por meio do presente, em atendimento ao determinado no processo acima mencionado, informar a Vossa Excelência que em [DATA_HOJE], esta Serventia procedeu as baixas dos protestos em que figura como devedor a parte acima indicado, conforme certidão negativa de protesto anexa ao presente.`,
  },
  {
    id: 'livre',
    label: 'Texto Livre',
    corpo: '',
  },
];

// Situações pré-definidas para Protesto
const SITUACOES_PROTESTO = [
  {
    id: 'retirada_apontamento',
    label: 'Retirada de Apontamento',
    corpo: `Venho através da presente informar aos senhores, que recebemos de forma manual o pedido de retirada do apontamento devido um problema interno entre a empresa sacadora e o banco apresentante, o qual por diversas tentativas não conseguiram solicitar a mesma, entrando assim em contato conosco para fazer de forma manual e não havendo prejuízo para a parte devedora.

Em conversa com o apresentante ele nos informou que entrará em contato com a central para ver como proceder nos próximos, pois nesse caso ele não teve sucesso em resolver de forma online. Segue em anexo print da conversa e requerimento de retirada.

Sendo apenas para o momento, aproveito a oportunidade da reiterar a Vossa Senhoria, protestos de estima e elevada consideração.`,
  },
  {
    id: 'comunicacao_protesto',
    label: 'Comunicação de Protesto',
    corpo: `Vimos pelo presente comunicar a Vossa Senhoria que foram lavrados os protestos dos títulos abaixo discriminados, conforme determinação legal.

[RELACIONAR OS TÍTULOS PROTESTADOS]

Permanecemos à disposição para quaisquer esclarecimentos.`,
  },
  {
    id: 'livre',
    label: 'Texto Livre',
    corpo: '',
  },
];

const TIPO_LABEL = { juiz: 'Juiz(a)', cartorio_rc: 'Cartório RC / Vara', protesto_dest: 'Destinatário Protesto', outro: 'Outro' };
const TABELIA_ID = '__tabelia_cartorio__';

const fmtData = (iso) => { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };
const fmtDataExtenso = (iso) => { if (!iso) return ''; return new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}); };

// ── Autocomplete ─────────────────────────────────────────────
function AutocompleteContato({ value, onChange, tipoContato, placeholder, contatos, onSalvar, onEditar, onDeletar, onSelect }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const ref = useRef(null);
  const sugestoes = useMemo(() => {
    const base = (contatos||[]).filter(c => c.tipo === tipoContato);
    if (!value || value.length < 2) return base;
    return base.filter(c => c.nome.toLowerCase().includes(value.toLowerCase()) || (c.descricao||'').toLowerCase().includes(value.toLowerCase()));
  }, [contatos, tipoContato, value]);
  const jaExiste = (contatos||[]).some(c => c.tipo === tipoContato && c.nome.toLowerCase() === (value||'').toLowerCase());
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setAberto(false); setEditandoId(null); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="form-input" value={value} onChange={e => { onChange(e.target.value); setAberto(true); }} onFocus={() => setAberto(true)} placeholder={placeholder} style={{ flex: 1 }} autoComplete="off" />
        {value && !jaExiste && <button className="btn btn-secondary btn-sm" onClick={async () => { setSalvando(true); await onSalvar({ tipo: tipoContato, nome: value.trim(), descricao: '' }); setSalvando(false); }} disabled={salvando} style={{ flexShrink: 0, fontSize: 11 }}>{salvando ? '...' : '💾 Salvar'}</button>}
        {value && jaExiste && <span style={{ alignSelf: 'center', fontSize: 11, color: '#16a34a', flexShrink: 0 }}>✓ salvo</span>}
      </div>
      {aberto && sugestoes.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,.15)', maxHeight: 240, overflowY: 'auto', marginTop: 2 }}>
          {sugestoes.map(c => (
            <div key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              {editandoId === c.id ? (
                // Modo edição inline
                <div style={{ display: 'flex', gap: 6, padding: '6px 10px', alignItems: 'center' }}>
                  <input
                    className="form-input"
                    value={editNome}
                    onChange={e => setEditNome(e.target.value)}
                    style={{ flex: 1, fontSize: 12, height: 28 }}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') { onEditar(c.id, { ...c, nome: editNome.trim() }); setEditandoId(null); }
                      if (e.key === 'Escape') setEditandoId(null);
                    }}
                  />
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onMouseDown={e => { e.preventDefault(); onEditar(c.id, { ...c, nome: editNome.trim() }); setEditandoId(null); }}>✓</button>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onMouseDown={e => { e.preventDefault(); setEditandoId(null); }}>✕</button>
                </div>
              ) : (
                // Modo normal
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 6px 0 0' }}>
                  <div onMouseDown={() => { onChange(c.nome); if(onSelect) onSelect(c); setAberto(false); }} style={{ flex: 1, padding: '8px 12px', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--color-surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</div>
                    {c.descricao && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.descricao}</div>}
                  </div>
                  <button className="btn-icon" style={{ fontSize: 12, padding: '2px 4px', flexShrink: 0 }}
                    onMouseDown={e => { e.preventDefault(); setEditandoId(c.id); setEditNome(c.nome); }}
                    title="Editar">✎</button>
                  <button className="btn-icon" style={{ fontSize: 12, padding: '2px 4px', flexShrink: 0, color: 'var(--color-danger)' }}
                    onMouseDown={e => { e.preventDefault(); if (window.confirm(`Remover "${c.nome}"?`)) { onDeletar(c.id); if (value === c.nome) onChange(''); } }}
                    title="Remover">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal Gerenciar Contatos ─────────────────────────────────
function GerenciarContatos({ contatos, onAdd, onEdit, onDelete, onClose }) {
  const [form, setForm] = useState({ tipo: 'juiz', nome: '', descricao: '' });
  const [editando, setEditando] = useState(null);
  const [filtrTipo, setFiltrTipo] = useState('');
  const setF = (k,v) => setForm(p => ({...p,[k]:v}));
  const handleSalvar = async () => {
    if (!form.nome.trim()) return;
    if (editando) { await onEdit(editando, { nome: form.nome.trim(), descricao: form.descricao.trim(), tipo: form.tipo }); setEditando(null); }
    else { await onAdd({ tipo: form.tipo, nome: form.nome.trim(), descricao: form.descricao.trim() }); }
    setForm({ tipo: form.tipo, nome: '', descricao: '' });
  };
  const lista = filtrTipo ? contatos.filter(c => c.tipo === filtrTipo) : contatos;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Gerenciar Contatos</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Tipo</label><select className="form-select" value={form.tipo} onChange={e => setF('tipo',e.target.value)}>{Object.entries(TIPO_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Nome *</label><input className="form-input" value={form.nome} onChange={e => setF('nome',e.target.value)} placeholder="Nome do juiz, cartório, etc." /></div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Descrição (vara, comarca...)</label><input className="form-input" value={form.descricao} onChange={e => setF('descricao',e.target.value)} placeholder="Informação complementar opcional" /></div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editando && <button className="btn btn-secondary btn-sm" onClick={() => { setEditando(null); setForm({ tipo: form.tipo, nome: '', descricao: '' }); }}>Cancelar</button>}
            <button className="btn btn-primary btn-sm" onClick={handleSalvar} disabled={!form.nome.trim()}>{editando ? 'Salvar alteração' : '+ Adicionar'}</button>
          </div>
        </div>
        <div style={{ padding: '10px 18px 6px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm ${!filtrTipo?'btn-primary':'btn-secondary'}`} onClick={() => setFiltrTipo('')}>Todos</button>
          {Object.entries(TIPO_LABEL).map(([k,v]) => <button key={k} className={`btn btn-sm ${filtrTipo===k?'btn-primary':'btn-secondary'}`} onClick={() => setFiltrTipo(k)}>{v}</button>)}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {lista.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>Nenhum contato cadastrado</div>
            : lista.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>{TIPO_LABEL[c.tipo]}</span>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</div>{c.descricao && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.descricao}</div>}</div>
                <button className="btn-icon btn-sm" onClick={() => { setEditando(c.id); setForm({ tipo: c.tipo, nome: c.nome, descricao: c.descricao||'' }); }}>✎</button>
                <button className="btn-icon btn-sm" onClick={() => { if(window.confirm('Remover contato?')) onDelete(c.id); }} style={{ color: 'var(--color-danger)' }}>✕</button>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ── Geração docx ─────────────────────────────────────────────
async function gerarDocx({ modelo, oficio, processo, cartorio, dados, assinante }) {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, WidthType, Table, TableRow, TableCell, ShadingType, ImageRun, Header, UnderlineType } = await import('docx');
  const nomeCartorio   = cartorio?.nome || 'Serviço Notarial e Registral';
  const cidade         = cartorio?.cidade || 'Paranatinga - MT';
  const endereco       = cartorio?.endereco || '';
  const telefone       = cartorio?.telefone || '';
  const cabecalhoImg   = cartorio?.cabecalho_img_url || null;
  const dtOficio       = fmtDataExtenso(oficio.dt_oficio || new Date().toISOString().split('T')[0]);
  const numOficio      = oficio.numero || '';
  const nomeAssin      = assinante?.nome_completo || assinante?.nome_simples || '';
  const funcaoAssin    = assinante?.cargo || assinante?.perfil || 'Tabelião(ã)';

  // 1 cm = 567 DXA | 0.4 cm ≈ 227 DXA
  // Margens da página: header edge = 227 (~0.4cm), top body = altura do header + pequeno gap
  const MARGIN_H   = 227;   // distância da borda ao cabeçalho (0.4 cm)
  const MARGIN_LR  = 1134;  // esquerda/direita 2 cm
  const MARGIN_BOT = 1134;  // inferior 2 cm

  const p = (text, opts={}) => new Paragraph({ alignment: opts.align||AlignmentType.JUSTIFIED, spacing: { after: opts.after??160, before: opts.before??0, line: 276 }, children: [new TextRun({ text: text||'', font: 'Arial', size: opts.size||24, bold: opts.bold||false, color: opts.color||undefined })] });
  const pEmpty = () => new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 24 })], spacing: { after: 80 } });
  const pMixed = (runs, opts={}) => new Paragraph({ alignment: opts.align||AlignmentType.JUSTIFIED, spacing: { after: opts.after??120, line: 276 }, children: runs.map(r => new TextRun({ font: 'Arial', size: 24, ...r, underline: r.underline ? { type: UnderlineType.SINGLE } : undefined })) });

  // ── Helpers de tabela ──────────────────────────────────────
  const border   = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
  const borders  = { top: border, bottom: border, left: border, right: border };
  const cm       = { top: 80, bottom: 80, left: 120, right: 120 };
  const cell = (runs, w, bg=null) => new TableCell({
    borders, margins: cm,
    width: { size: w, type: WidthType.DXA },
    ...(bg ? { shading: { fill: bg, type: ShadingType.CLEAR } } : {}),
    children: [new Paragraph({ children: Array.isArray(runs)
      ? runs.map(r => new TextRun({ font: 'Arial', size: 22, ...r }))
      : [new TextRun({ text: runs||'', font: 'Arial', size: 22 })]
    })]
  });

  // ── Header do Word (cabeçalho de página) ──────────────────
  // Largura útil A4 com margens LR de 2cm cada = 11906 - 2*1134 = 9638 px em DXA
  // Em EMUs: 1 DXA = 635 EMU | largura útil em EMU ≈ 9638 * 635 ≈ 6.120.130
  // Imagem: 940px × 130px original → proporcional na largura útil
  // Usamos 580pt de largura (~8.1cm no doc, ~580 * 635 / 914400 ≈ 0.4 polegadas? não)
  // Melhor: largura total útil em pontos = (11906 - 2*1134) / 20 * 1.333 ≈ 512pt
  // Vamos usar width em pixels diretamente como docx aceita (pt equivalente)
  let headerParagraphs = [];
  let headerHeightDXA  = 1800; // altura reservada para o header (≈3.2cm) quando texto

  if (cabecalhoImg) {
    try {
      const base64    = cabecalhoImg.split(',')[1];
      const binary    = atob(base64);
      const bytes     = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const mimeMatch = cabecalhoImg.match(/data:([^;]+);/);
      const mime      = mimeMatch?.[1] || 'image/jpeg';
      const imgType   = mime.includes('png') ? 'png' : 'jpg';

      // docx lib usa pixels (96dpi) no transformation
      // 1 cm = 37.795 px a 96dpi
      // Largura: 17cm = 642px | Altura: 3.5cm = 132px
      const targetW = Math.round(17 * 37.795);   // 642px
      const targetH = Math.round(3.5 * 37.795);  // 132px
      headerHeightDXA = Math.round((3.5 / 2.54) * 1440) + 400; // ~1980 DXA + folga

      headerParagraphs = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 0, before: 0 },
          children: [new ImageRun({
            data: bytes.buffer,
            transformation: { width: targetW, height: targetH },
            type: imgType,
          })],
        }),
      ];
    } catch (e) {
      console.warn('Erro ao carregar imagem do cabeçalho:', e);
      // fallback texto
      headerParagraphs = [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: nomeCartorio.toUpperCase(), font: 'Arial', size: 26, bold: true })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: `${endereco} — ${cidade}${telefone ? ' · Tel.: '+telefone : ''}`, font: 'Arial', size: 18, color: '555555' })] }),
        new Paragraph({ spacing: { after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E3A5F', space: 4 } }, children: [new TextRun({ text: '', size: 4 })] }),
      ];
    }
  } else {
    // Sem imagem: cabeçalho texto no header
    headerParagraphs = [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: nomeCartorio.toUpperCase(), font: 'Arial', size: 26, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [new TextRun({ text: `${endereco} — ${cidade}`, font: 'Arial', size: 18, color: '555555' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E3A5F', space: 4 } }, children: [new TextRun({ text: telefone ? `Tel.: ${telefone}` : '', font: 'Arial', size: 18, color: '555555' })] }),
    ];
  }

  const wordHeader = new Header({ children: headerParagraphs });

  // ── Corpo: cidade/data e nº ofício à esquerda ──────────────
  const cabecalho = [
    pEmpty(),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 40 }, children: [new TextRun({ text: `${cidade}, ${dtOficio}.`, font: 'Arial', size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 320 }, children: [new TextRun({ text: `Ofício nº ${numOficio}`, font: 'Arial', size: 24, bold: true })] }),
  ];

  // pIndent deve ser declarado ANTES de rodape
  const pIndent = (text, opts={}) => new Paragraph({ alignment: opts.align||AlignmentType.JUSTIFIED, spacing: { after: opts.after??160, before: opts.before??0, line: 276 }, indent: { firstLine: 1701 }, children: [new TextRun({ text: text||'', font: 'Arial', size: opts.size||24, bold: opts.bold||false })] });

  const assinaturaParags = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 6 } }, children: [new TextRun({ text: nomeAssin, font: 'Arial', size: 24, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: funcaoAssin, font: 'Arial', size: 22, color: '555555' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: nomeCartorio, font: 'Arial', size: 22, color: '555555' })] }),
  ];

  // Rodapé RC (sem indent)
  const rodape = [
    pEmpty(),
    pIndent('Valemo-nos da oportunidade para reiterar à Vossa Senhoria, protestos de estima e apreço.', { after: 200 }),
    pEmpty(),
    pIndent('Atenciosamente,', { after: 400 }),
    ...assinaturaParags,
  ];

  // Rodapé Fórum/Protesto (com indent — idêntico ao rodape agora)
  const rodapeForum = rodape;

  const buildRC = () => {
    const tipoLabel  = (dados.tipo_rc || 'casamento').toLowerCase();
    const destinat   = dados.destinatario || oficio.destinatario || '___________________________';
    const livro      = dados.livro || '';
    const folhas     = dados.folhas || '';
    const termo      = dados.termo || '';
    const dtAssento  = dados.dt_assento ? fmtData(dados.dt_assento) : '';
    const parte1     = dados.parte1 || '';
    const parte1Novo = dados.parte1_novo_nome || '';
    const parte2     = dados.parte2 || '';
    const matricula  = dados.matricula || '';
    const dadosCompl = dados.dados_complementares || '';

    const tabelaAssento = new Table({
      width: { size: 9071, type: WidthType.DXA }, columnWidths: [1505, 1505, 1505, 4556],
      rows: [
        new TableRow({ children: [cell('Livro', 1505, 'E8EFF6'), cell('Folhas', 1505, 'E8EFF6'), cell('Termo', 1505, 'E8EFF6'), cell('Data do Assento', 4511, 'E8EFF6')] }),
        new TableRow({ children: [cell(livro, 1505), cell(folhas, 1505), cell(termo, 1505), cell(dtAssento, 4511)] }),
      ]
    });

    const linhasPartes = [];
    if (tipoLabel === 'casamento') {
      if (parte1)     linhasPartes.push(new TableRow({ children: [cell([{ text: 'Noiva (nome de solteira): ', bold: true }, { text: parte1 }], 9026)] }));
      if (parte1Novo) linhasPartes.push(new TableRow({ children: [cell([{ text: 'Novo nome após casamento: ', bold: true }, { text: parte1Novo }], 9026)] }));
      if (parte2)     linhasPartes.push(new TableRow({ children: [cell([{ text: 'Contraente: ', bold: true }, { text: parte2 }], 9026)] }));
    } else {
      if (parte1) linhasPartes.push(new TableRow({ children: [cell([{ text: tipoLabel==='óbito'?'Falecido(a): ':'Parte 1: ', bold: true }, { text: parte1 }], 9026)] }));
      if (parte2 && tipoLabel !== 'óbito') linhasPartes.push(new TableRow({ children: [cell([{ text: 'Parte 2: ', bold: true }, { text: parte2 }], 9026)] }));
    }
    if (matricula) linhasPartes.push(new TableRow({ children: [cell([{ text: 'Matrícula: ', bold: true }, { text: matricula }], 9026)] }));

    const tabelaPartes = linhasPartes.length > 0
      ? new Table({ width: { size: 9071, type: WidthType.DXA }, columnWidths: [9071], rows: linhasPartes })
      : null;

    const linhasAto = dadosCompl
      ? dadosCompl.split('\n').filter(l => l.trim()).map(l => new TableRow({ children: [cell(l, 9026)] }))
      : [new TableRow({ children: [cell('', 9026)] }), new TableRow({ children: [cell('', 9026)] })];

    const tabelaAto = new Table({ width: { size: 9071, type: WidthType.DXA }, columnWidths: [9071], rows: linhasAto });

    return [
      ...cabecalho,
      pEmpty(),
      pMixed([{ text: 'Prezado(a) Senhor(a) Oficial,' }], { after: 80 }),
      pMixed([{ text: 'Cartório de Registro Civil — ' }, { text: destinat, bold: true }], { after: 240 }),
      pEmpty(),
      pIndent(`Vimos pelo presente comunicar a essa Serventia, o registro de ${tipoLabel} realizado nesta Serventia, o qual possui assento nessa Serventia.`, { after: 200 }),
      pEmpty(),
      p(`Dados do assento de ${tipoLabel}:`, { bold: true, after: 120 }),
      tabelaAssento,
      pEmpty(),
      ...(tabelaPartes ? [p('Dados das partes:', { bold: true, after: 120 }), tabelaPartes, pEmpty()] : []),
      p('Dados do assento pertinente à comunicação:', { bold: true, after: 120 }),
      tabelaAto,
      ...rodape,
    ];
  };

  const buildForum = () => {
    const vara       = dados.vara       || oficio.destinatario || '___________________________';
    const juiz       = dados.juiz       || '';
    const procJud    = dados.proc_judicial || '';
    const referente  = dados.referente  || '';
    const corpo      = dados.corpo      || '';
    const parte1     = dados.parte1     || '';
    const parte2     = dados.parte2     || '';
    const matricula  = dados.matricula  || '';

    // Tabela de partes (mesma lógica do RC)
    const linhasPartes = [];
    if (parte1) linhasPartes.push(new TableRow({ children: [cell([{ text: 'Parte Requerida: ', bold: true }, { text: parte1 }], 9071)] }));
    if (parte2) linhasPartes.push(new TableRow({ children: [cell([{ text: 'Parte Requerente: ', bold: true }, { text: parte2 }], 9071)] }));
    const tabelaPartes = linhasPartes.length > 0
      ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: [9071], rows: linhasPartes })
      : null;

    const numPartes  = [parte1, parte2].filter(Boolean).length;
    const corpoFinal = numPartes >= 2
      ? corpo
          .replace('no qual figura a parte acima requerida', 'no qual figuram as partes acima requeridas')
          .replace('figura como devedor a parte acima indicado', 'figuram como devedores as partes acima indicados')
          .replace('figura como devedor a parte acima indicada', 'figuram como devedores as partes acima indicadas')
      : corpo;

    return [
      ...cabecalho,
      pEmpty(),
      // Referente (negrito, antes da saudação — conforme imagem)
      ...(referente ? [
        pMixed([{ text: 'Referente: ', bold: true }, { text: referente, bold: true, underline: true }], { after: 240, align: AlignmentType.LEFT }),
      ] : []),
      // Destinatário — tratamento conforme Dr./Dra.
      ...((() => {
        const feminino = juiz.trimStart().toLowerCase().startsWith('dra.');
        const tratamento = juiz
          ? (feminino ? 'Excelentíssima ' : 'Excelentíssimo ')
          : 'Excelentíssimo(a) ';
        return [
          pMixed([{ text: tratamento }, { text: juiz || '' }], { after: 80 }),
          pMixed([{ text: vara, bold: true }], { after: 240 }),
        ];
      })()),
      pEmpty(),
      // Nº processo judicial
      ...(procJud ? [
        pMixed([{ text: 'Proc. nº ' }, { text: procJud, bold: true }], { after: 200 }),
      ] : []),
      // Partes
      ...(tabelaPartes ? [
        p('Partes:', { bold: true, after: 120 }),
        tabelaPartes,
        pEmpty(),
      ] : []),
      // Corpo editável com indent de 3cm (1701 DXA)
      ...corpoFinal.split('\n').map(l => new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 160, line: 276 },
        indent: { firstLine: 1701 },
        children: [new TextRun({ text: l || '', font: 'Arial', size: 24 })],
      })),
      ...rodapeForum,
    ];
  };

  const buildProtesto = () => {
    const destNome     = dados.dest_nome    || oficio.destinatario || '___________________________';
    const destEndereco = dados.dest_endereco || '';
    const corpo        = dados.corpo        || '';

    return [
      ...cabecalho,
      pEmpty(),
      // Destinatário — nome e endereço à esquerda
      new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 40, line: 276 }, children: [new TextRun({ text: 'À ', font: 'Arial', size: 24 }), new TextRun({ text: destNome, font: 'Arial', size: 24, bold: true })] }),
      ...(destEndereco ? destEndereco.split('\n').map(l =>
        new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 40, line: 276 }, children: [new TextRun({ text: l || '', font: 'Arial', size: 24 })] })
      ) : []),
      pEmpty(),
      pIndent('Prezados Senhores,', { after: 200 }),
      pEmpty(),
      // Corpo com indent 3cm
      ...corpo.split('\n').map(l => new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 160, line: 276 },
        indent: { firstLine: 1701 },
        children: [new TextRun({ text: l || '', font: 'Arial', size: 24 })],
      })),
      ...rodapeForum,
    ];
  };

  const children = modelo.id === 'comunicacao_rc' ? buildRC()
    : modelo.id === 'protesto'        ? buildProtesto()
    : buildForum();

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 24 } } } },
    sections: [{
      headers: { default: wordHeader },
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: {
            header: MARGIN_H,          // 0.4 cm da borda ao header
            top:    headerHeightDXA,   // distância da borda ao corpo (= altura do header + folga)
            right:  MARGIN_LR,
            bottom: MARGIN_BOT,
            left:   MARGIN_LR,
          },
        },
      },
      children,
    }],
  });
  return await Packer.toBlob(doc);
}

// ── Componente Principal ─────────────────────────────────────
// ── Aba de edição de textos ──────────────────────────────────
function AbaTextos({ situacoes, textosSalvos, onSalvar, onReset }) {
  const [selecionada, setSelecionada] = useState(null);
  const [textoEdit,   setTextoEdit]   = useState('');
  const [salvando,    setSalvando]    = useState(false);
  const [salvo,       setSalvo]       = useState(false);

  const getSalvo = (modeloId, situacaoId) =>
    textosSalvos.find(t => t.modelo_id === modeloId && t.situacao_id === situacaoId);

  const handleSelect = (s) => {
    setSelecionada(s);
    const salvo = getSalvo(s.modeloId, s.id);
    setTextoEdit(salvo ? salvo.corpo : s.corpo);
    setSalvo(false);
  };

  const handleSalvar = async () => {
    if (!selecionada) return;
    setSalvando(true);
    await onSalvar(selecionada.modeloId, selecionada.id, textoEdit);
    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  };

  const handleReset = async () => {
    if (!selecionada) return;
    if (!window.confirm('Restaurar o texto original padrão? O texto personalizado será removido.')) return;
    await onReset(selecionada.modeloId, selecionada.id);
    setTextoEdit(selecionada.corpo);
    setSalvo(false);
  };

  // Agrupa por modelo
  const grupos = situacoes.reduce((acc, s) => {
    if (!acc[s.modeloLabel]) acc[s.modeloLabel] = [];
    acc[s.modeloLabel].push(s);
    return acc;
  }, {});

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, alignItems: 'stretch' }}>
      {/* Lista de situações */}
      <div className="card" style={{ padding: 0, position: 'sticky', top: 0 }}>
        <div className="card-header"><div className="card-title" style={{ fontSize: 13 }}>Situações</div></div>
        {Object.entries(grupos).map(([modeloLabel, sits]) => (
          <div key={modeloLabel}>
            <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
              {modeloLabel}
            </div>
            {sits.map(s => {
              const temCustom = !!getSalvo(s.modeloId, s.id);
              const ativo = selecionada?.modeloId === s.modeloId && selecionada?.id === s.id;
              return (
                <div key={s.id} onClick={() => handleSelect(s)}
                  style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', background: ativo ? 'color-mix(in srgb, var(--color-accent) 10%, var(--color-surface))' : 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: ativo ? 700 : 400, color: ativo ? 'var(--color-accent)' : 'var(--color-text)' }}>{s.label}</span>
                  {temCustom && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 6, background: 'var(--color-accent)', color: '#fff', flexShrink: 0 }}>editado</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        {!selecionada
          ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>← Selecione uma situação para editar o texto base</div>
          : (<>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="card-title" style={{ fontSize: 13 }}>{selecionada.label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{selecionada.modeloLabel}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {getSalvo(selecionada.modeloId, selecionada.id) && (
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={handleReset}>↺ Restaurar original</button>
                )}
                <button className="btn btn-primary btn-sm" onClick={handleSalvar} disabled={salvando} style={{ minWidth: 80 }}>
                  {salvando ? '...' : salvo ? '✓ Salvo!' : '💾 Salvar'}
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>
                Este texto será usado como base ao selecionar esta situação. Use [COLCHETES] para campos editáveis.
              </div>
              <textarea
                className="form-input"
                value={textoEdit}
                onChange={e => { setTextoEdit(e.target.value); setSalvo(false); }}
                style={{ resize: 'none', fontSize: 12, fontFamily: 'inherit', lineHeight: 1.7, width: '100%', flex: 1, minHeight: 300 }}
              />
            </div>
          </>)
        }
      </div>
    </div>
  );
}

export default function ModelosOficio() {
  const { oficios, processos, cartorio, usuarios, oficioContatos, addOficioContato, editOficioContato, deleteOficioContato, oficioModelosHistorico, addOficioModeloHistorico, deleteOficioModeloHistorico, oficioModelosTextos, salvarOficioModeloTexto, resetOficioModeloTexto } = useApp();
  // Retorna texto personalizado salvo ou o padrão do código, substituindo [DATA_HOJE]
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const getCorpo = (modeloId, situacaoId, corpoPadrao) => {
    const salvo = (oficioModelosTextos||[]).find(t => t.modelo_id === modeloId && t.situacao_id === situacaoId);
    const texto = salvo ? salvo.corpo : corpoPadrao;
    return texto.replace(/\[DATA_HOJE\]/g, dataHoje);
  };

  const [aba,           setAba]           = useState('emitir');
  const [oficioSel,     setOficioSel]     = useState('');
  const [modeloSel,     setModeloSel]     = useState('');
  const [dados,         setDados]         = useState({});
  const [assinanteSel,  setAssinanteSel]  = useState(null);
  const [gerando,       setGerando]       = useState(false);
  const [erro,          setErro]          = useState('');
  const [modalContatos, setModalContatos] = useState(false);

  const oficio   = useMemo(() => oficios.find(o => String(o.id)===String(oficioSel)), [oficios, oficioSel]);
  const processo = useMemo(() => oficio?.processo_id ? processos.find(p => p.id===oficio.processo_id) : null, [oficio, processos]);
  const modelo   = useMemo(() => MODELOS.find(m => m.id===modeloSel), [modeloSel]);

  const assinantes = useMemo(() => usuarios.filter(u => u.ativo && ['tabelião','tabeliao','escrevente','administrador','substituto'].includes((u.perfil||'').toLowerCase())), [usuarios]);
  const tabeliaCartorio = cartorio?.responsavel ? { id: TABELIA_ID, nome_simples: cartorio.responsavel, nome_completo: cartorio.responsavel, perfil: 'Tabelião', cargo: 'Tabeliã' } : null;

  useEffect(() => {
    if (!assinanteSel) {
      if (tabeliaCartorio) setAssinanteSel(tabeliaCartorio);
      else if (assinantes.length) setAssinanteSel(assinantes[0]);
    }
  }, [assinantes, cartorio]);

  useEffect(() => {
    if (oficio) {
      setDados(p => ({
        ...p,
        destinatario: p.destinatario || oficio.destinatario || '',
        referente:    oficio.assunto || p.referente || '',
      }));
    }
  }, [oficio?.id]);

  const setD = (k,v) => setDados(p => ({...p,[k]:v}));

  const oficiosOrdenados = useMemo(() => [...oficios].sort((a,b) => { const na=parseInt((a.numero||'').split('/')[0],10)||0; const nb=parseInt((b.numero||'').split('/')[0],10)||0; return nb-na; }), [oficios]);

  const handleGerar = async () => {
    if (!oficio)  { setErro('Selecione um ofício.'); return; }
    if (!modelo)  { setErro('Selecione um modelo.'); return; }
    setErro(''); setGerando(true);
    try {
      const blob = await gerarDocx({ modelo, oficio, processo, cartorio, dados, assinante: assinanteSel });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Oficio_${oficio.numero?.replace('/','_')}_${modelo.id}.docx`; a.click();
      URL.revokeObjectURL(url);
      await addOficioModeloHistorico({ oficio_id: oficio.id, modelo_id: modelo.id, dados, assinante_id: assinanteSel?.id||null, assinante_nome: assinanteSel?.nome_completo||assinanteSel?.nome_simples||'', assinante_funcao: assinanteSel?.cargo||assinanteSel?.perfil||'' });
    } catch(e) { console.error(e); setErro('Erro ao gerar o documento. Verifique o console.'); }
    finally { setGerando(false); }
  };

  const recarregarHistorico = (h) => {
    const of = oficios.find(o => o.id===h.oficio_id);
    if (of) setOficioSel(String(of.id));
    setModeloSel(h.modelo_id);
    setDados(h.dados||{});
    const assin = assinantes.find(u => String(u.id)===String(h.assinante_id));
    if (assin) setAssinanteSel(assin);
    else if (h.assinante_id===TABELIA_ID && tabeliaCartorio) setAssinanteSel(tabeliaCartorio);
    setAba('emitir');
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {[['emitir','✉ Emitir'],['historico','📋 Histórico'],['textos','✏ Textos']].map(([id,label]) => (
            <button key={id} onClick={() => setAba(id)} style={{ padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: aba===id?700:400, background: aba===id?'var(--color-surface-3)':'transparent', color: aba===id?'var(--color-text)':'var(--color-text-muted)', borderRight: id!=='textos'?'1px solid var(--color-border)':'none' }}>{label}</button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setModalContatos(true)}>📋 Contatos ({oficioContatos?.length||0})</button>
      </div>

      {/* Textos */}
      {aba === 'textos' && (() => {
        const todasSituacoes = [
          ...SITUACOES_FORUM.filter(s => s.id !== 'livre').map(s => ({ ...s, modeloId: 'forum_cumprimento', modeloLabel: 'Fórum / Juízo' })),
          ...SITUACOES_PROTESTO.filter(s => s.id !== 'livre').map(s => ({ ...s, modeloId: 'protesto', modeloLabel: 'Protesto' })),
        ];
        return (
          <AbaTextos
            situacoes={todasSituacoes}
            textosSalvos={oficioModelosTextos||[]}
            onSalvar={salvarOficioModeloTexto}
            onReset={resetOficioModeloTexto}
          />
        );
      })()}

      {/* Histórico */}
      {aba === 'historico' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header"><div className="card-title">Histórico de Ofícios Gerados</div></div>
          {(!oficioModelosHistorico||oficioModelosHistorico.length===0)
            ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>Nenhum ofício gerado ainda.</div>
            : <div className="table-wrapper">
                <table className="data-table">
                  <thead><tr><th>Ofício</th><th>Modelo</th><th>Assunto</th><th>Assinante</th><th>Gerado em</th><th></th></tr></thead>
                  <tbody>
                    {oficioModelosHistorico.map(h => {
                      const of = oficios.find(o => o.id===h.oficio_id);
                      const mod = MODELOS.find(m => m.id===h.modelo_id);
                      return (
                        <tr key={h.id}>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{of?.numero||'—'}</span></td>
                          <td style={{ fontSize: 12 }}>{mod?.label||h.modelo_id}</td>
                          <td style={{ fontSize: 12, color: 'var(--color-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{of?.assunto||'—'}</td>
                          <td style={{ fontSize: 12 }}>{h.assinante_nome||'—'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{fmtData(h.gerado_em?.split('T')[0])}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => recarregarHistorico(h)}>↩ Reabrir</button>
                              <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Remover do histórico?')) deleteOficioModeloHistorico(h.id); }} style={{ color: 'var(--color-danger)' }} title="Remover">✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* Emitir */}
      {aba === 'emitir' && (<>
        {/* Passo 1 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">1 — Selecione o Ofício</div></div>
          <div style={{ padding: '12px 16px' }}>
            <select className="form-select" value={oficioSel} onChange={e => {
              const id = e.target.value;
              setOficioSel(id);
              const of = oficios.find(o => String(o.id) === String(id));
              setDados({ referente: of?.assunto || '', destinatario: of?.destinatario || '' });
            }}>
              <option value="">— Selecione o ofício —</option>
              {oficiosOrdenados.map(o => <option key={o.id} value={o.id}>{o.numero} · {o.mes_ano} · {o.destinatario} · {o.assunto}</option>)}
            </select>
            {oficio && (
              <div style={{ marginTop: 10, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Número: </span><strong>{oficio.numero}</strong></div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Data: </span>{fmtData(oficio.dt_oficio)}</div>
                <div><span style={{ color: 'var(--color-text-muted)' }}>Destinatário: </span>{oficio.destinatario}</div>
                <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--color-text-muted)' }}>Assunto: </span>{oficio.assunto}</div>
                {processo && <div style={{ gridColumn: '1/-1', marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--color-border)' }}><span style={{ color: 'var(--color-text-muted)' }}>Processo: </span><strong>{processo.numero_interno}</strong><span style={{ color: 'var(--color-text-muted)' }}> — {processo.especie}</span>{processo.livro_ato&&<span style={{ color: 'var(--color-text-muted)' }}> · Livro: {processo.livro_ato}{processo.folhas_ato?' / '+processo.folhas_ato:''}</span>}</div>}
              </div>
            )}
          </div>
        </div>

        {/* Passo 2 */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header"><div className="card-title">2 — Escolha o Modelo</div></div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {MODELOS.map(m => (
              <div key={m.id} onClick={() => { setModeloSel(m.id); setDados(p => ({ destinatario: p.destinatario })); }}
                style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `2px solid ${modeloSel===m.id?'var(--color-accent)':'var(--color-border)'}`, background: modeloSel===m.id?'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))':'var(--color-surface)', cursor: 'pointer', transition: 'border-color .15s' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: modeloSel===m.id?'var(--color-accent)':'var(--color-text)' }}>{modeloSel===m.id?'● ':'○ '}{m.label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{m.descricao}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Passo 3 — Campos */}
        {modelo && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">3 — Dados do Documento</div></div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {modelo.id === 'comunicacao_rc' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Tipo de Comunicação</label>
                    <select className="form-select" value={dados.tipo_rc||'Casamento'} onChange={e => setD('tipo_rc',e.target.value)}>
                      {TIPOS_RC.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Cartório de Registro Civil (Destinatário)</label>
                    <AutocompleteContato value={dados.destinatario||''} onChange={v => setD('destinatario',v)} tipoContato="cartorio_rc" placeholder="Nome do Cartório RC" contatos={oficioContatos||[]} onSalvar={dados => addOficioContato(dados)} onEditar={(id,d) => editOficioContato(id,d)} onDeletar={id => deleteOficioContato(id)} />
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Dados do Assento</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Livro</label><input className="form-input" value={dados.livro||processo?.livro_ato||''} onChange={e => setD('livro',e.target.value)} placeholder="Livro" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Folhas</label><input className="form-input" value={dados.folhas||processo?.folhas_ato||''} onChange={e => setD('folhas',e.target.value)} placeholder="Folhas" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Termo</label><input className="form-input" value={dados.termo||''} onChange={e => setD('termo',e.target.value)} placeholder="Termo" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Data do Assento</label><input className="form-input" type="date" value={dados.dt_assento||''} onChange={e => setD('dt_assento',e.target.value)} /></div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Partes</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">{(dados.tipo_rc||'Casamento')==='Casamento'?'Noiva (nome de solteira)':(dados.tipo_rc||'Casamento')==='Óbito'?'Falecido(a)':'Parte 1'}</label><input className="form-input" value={dados.parte1||''} onChange={e => setD('parte1',e.target.value)} placeholder="Nome" /></div>
                    {(dados.tipo_rc||'Casamento')==='Casamento' && <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Novo nome após casamento</label><input className="form-input" value={dados.parte1_novo_nome||''} onChange={e => setD('parte1_novo_nome',e.target.value)} placeholder="Nome após casamento" /></div>}
                    {(dados.tipo_rc||'Casamento')!=='Óbito' && <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">{(dados.tipo_rc||'Casamento')==='Casamento'?'Noivo':'Parte 2'}</label><input className="form-input" value={dados.parte2||''} onChange={e => setD('parte2',e.target.value)} placeholder="Nome" /></div>}
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Matrícula</label><input className="form-input" value={dados.matricula||processo?.numero_interno||''} onChange={e => setD('matricula',e.target.value)} placeholder="Matrícula" /></div>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dados do assento pertinente à comunicação</label>
                  <textarea className="form-input" rows={3} value={dados.dados_complementares||''} onChange={e => setD('dados_complementares',e.target.value)} placeholder="Informações adicionais..." style={{ resize: 'vertical', fontSize: 12 }} />
                </div>
              </>)}

              {modelo.id === 'forum_cumprimento' && (<>

                {/* Situação pré-definida */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Situação / Tipo do Ofício</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SITUACOES_FORUM.map(s => (
                      <div key={s.id}
                        onClick={() => {
                          setD('situacao', s.id);
                          const corpo = getCorpo('forum_cumprimento', s.id, s.corpo);
                          if (corpo && !dados.corpo_editado) setD('corpo', corpo);
                          else if (corpo) { if (window.confirm('Substituir o corpo do ofício pelo texto padrão desta situação?')) { setD('corpo', corpo); setD('corpo_editado', false); } }
                          else setD('corpo', '');
                        }}
                        style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `2px solid ${dados.situacao===s.id?'var(--color-accent)':'var(--color-border)'}`, background: dados.situacao===s.id?'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))':'var(--color-surface)', cursor: 'pointer', fontSize: 13, fontWeight: dados.situacao===s.id?700:400, color: dados.situacao===s.id?'var(--color-accent)':'var(--color-text)' }}>
                        {dados.situacao===s.id?'● ':'○ '}{s.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Destinatário</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Vara / Comarca (Destinatário)</label>
                      <AutocompleteContato value={dados.vara||oficio?.destinatario||''} onChange={v => setD('vara',v)} tipoContato="cartorio_rc" placeholder="Ex: 1ª Vara Cível de Paranatinga" contatos={oficioContatos||[]} onSalvar={d => addOficioContato({...d, tipo:'cartorio_rc'})} onEditar={(id,d) => editOficioContato(id,d)} onDeletar={id => deleteOficioContato(id)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Meritíssimo(a) Juiz(a)</label>
                      <AutocompleteContato value={dados.juiz||''} onChange={v => setD('juiz',v)} tipoContato="juiz" placeholder="Nome do(a) Juiz(a)" contatos={oficioContatos||[]} onSalvar={d => addOficioContato(d)} onEditar={(id,d) => editOficioContato(id,d)} onDeletar={id => deleteOficioContato(id)} />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Referência e Processo</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Referente</label>
                      <input className="form-input" value={dados.referente||''} onChange={e => setD('referente',e.target.value)} placeholder="Ex: Cumprimento ao Mandado de Retificação de Registro, extraído dos Autos nº 1000703-22..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nº Processo Judicial</label>
                      <input className="form-input" value={dados.proc_judicial||''} onChange={e => setD('proc_judicial',e.target.value)} placeholder="Nº do processo judicial" />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Partes (opcional)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Parte Requerida</label><input className="form-input" value={dados.parte1||''} onChange={e => setD('parte1',e.target.value)} placeholder="Nome da parte requerida" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Parte Requerente</label><input className="form-input" value={dados.parte2||''} onChange={e => setD('parte2',e.target.value)} placeholder="Nome da parte requerente" /></div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Corpo do Ofício</div>
                    {dados.situacao && dados.situacao !== 'livre' && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                        onClick={() => { const s = SITUACOES_FORUM.find(x => x.id===dados.situacao); if(s) { setD('corpo', getCorpo('forum_cumprimento', s.id, s.corpo)); setD('corpo_editado', false); } }}>
                        ↺ Restaurar texto padrão
                      </button>
                    )}
                  </div>
                  <textarea
                    className="form-input"
                    rows={15}
                    value={dados.corpo||''}
                    onChange={e => { setD('corpo', e.target.value); setD('corpo_editado', true); }}
                    placeholder="Texto do ofício..."
                    style={{ resize: 'vertical', fontSize: 12, fontFamily: 'inherit', lineHeight: 1.6, minHeight: 280 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>
                    Texto editável — use [COLCHETES] para marcar campos a preencher
                  </div>
                </div>
              </>)}

              {/* ── Protesto ── */}
              {modelo.id === 'protesto' && (<>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Situação / Tipo do Ofício</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {SITUACOES_PROTESTO.map(s => (
                      <div key={s.id}
                        onClick={() => {
                          setD('situacao_prot', s.id);
                          const corpo = getCorpo('protesto', s.id, s.corpo);
                          if (corpo && !dados.corpo_editado) setD('corpo', corpo);
                          else if (corpo) { if (window.confirm('Substituir o corpo pelo texto padrão?')) { setD('corpo', corpo); setD('corpo_editado', false); } }
                          else setD('corpo', '');
                        }}
                        style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', border: `2px solid ${dados.situacao_prot===s.id?'var(--color-accent)':'var(--color-border)'}`, background: dados.situacao_prot===s.id?'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))':'var(--color-surface)', cursor: 'pointer', fontSize: 13, fontWeight: dados.situacao_prot===s.id?700:400, color: dados.situacao_prot===s.id?'var(--color-accent)':'var(--color-text)' }}>
                        {dados.situacao_prot===s.id?'● ':'○ '}{s.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Destinatário</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Nome / Razão Social</label>
                      <AutocompleteContato
                        value={dados.dest_nome||oficio?.destinatario||''}
                        onChange={v => setD('dest_nome', v)}
                        tipoContato="protesto_dest"
                        placeholder="Ex: CRA - Central de Remessa de Arquivos"
                        contatos={oficioContatos||[]}
                        onSalvar={d => addOficioContato({ tipo:'protesto_dest', nome: d.nome, descricao: dados.dest_endereco||'' })}
                        onEditar={(id,d) => editOficioContato(id, d)}
                        onDeletar={id => deleteOficioContato(id)}
                        onSelect={c => { setD('dest_nome', c.nome); if(c.descricao) setD('dest_endereco', c.descricao); }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Endereço Completo</label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <textarea className="form-input" rows={2} value={dados.dest_endereco||''} onChange={e => setD('dest_endereco', e.target.value)} placeholder="Ex: Rua General Amilcar Magalhães, 38 - Duque de Caxias - Cuiabá - MT" style={{ resize: 'vertical', fontSize: 12, flex: 1 }} />
                        {(() => {
                          const contatoExistente = (oficioContatos||[]).find(c => c.tipo==='protesto_dest' && c.nome.toLowerCase()===(dados.dest_nome||'').toLowerCase().trim());
                          if (!contatoExistente || !dados.dest_nome) return null;
                          const enderecoAtualizado = contatoExistente.descricao !== (dados.dest_endereco||'');
                          if (!enderecoAtualizado) return null;
                          return (
                            <button className="btn btn-secondary btn-sm" style={{ flexShrink: 0, fontSize: 11, marginTop: 2 }}
                              onClick={() => editOficioContato(contatoExistente.id, { ...contatoExistente, descricao: dados.dest_endereco||'' })}>
                              💾 Salvar endereço
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Corpo do Ofício</div>
                    {dados.situacao_prot && dados.situacao_prot !== 'livre' && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { const s = SITUACOES_PROTESTO.find(x => x.id===dados.situacao_prot); if(s) { setD('corpo', getCorpo('protesto', s.id, s.corpo)); setD('corpo_editado', false); } }}>↺ Restaurar texto padrão</button>
                    )}
                  </div>
                  <textarea className="form-input" rows={15} value={dados.corpo||''} onChange={e => { setD('corpo', e.target.value); setD('corpo_editado', true); }} placeholder="Texto do ofício..." style={{ resize: 'vertical', fontSize: 12, fontFamily: 'inherit', lineHeight: 1.6, minHeight: 280 }} />
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>Texto editável — use [COLCHETES] para marcar campos a preencher</div>
                </div>
              </>)}
            </div>
          </div>
        )}

        {/* Passo 4 — Assinante */}
        {modelo && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">4 — Assinante</div></div>
            <div style={{ padding: '12px 16px' }}>
              <select className="form-select" value={assinanteSel?.id||''} onChange={e => {
                if (e.target.value===TABELIA_ID) { setAssinanteSel(tabeliaCartorio); return; }
                setAssinanteSel(assinantes.find(u => String(u.id)===String(e.target.value))||null);
              }}>
                <option value="">— Selecione o assinante —</option>
                {tabeliaCartorio && <option value={TABELIA_ID}>{tabeliaCartorio.nome_completo} (Tabeliã)</option>}
                {assinantes.map(u => <option key={u.id} value={u.id}>{u.nome_simples} ({u.cargo||u.perfil})</option>)}
              </select>
              {assinanteSel && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>Assinará como: <strong>{assinanteSel.nome_completo||assinanteSel.nome_simples}</strong> — {assinanteSel.cargo||assinanteSel.perfil}</div>}
            </div>
          </div>
        )}

        {erro && <div style={{ marginBottom: 12, padding: '8px 14px', background: '#fee2e2', color: '#dc2626', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600 }}>⚠ {erro}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleGerar} disabled={gerando||!oficioSel||!modeloSel} style={{ minWidth: 160 }}>
            {gerando ? '⏳ Gerando...' : '📄 Gerar .docx'}
          </button>
        </div>
      </>)}

      {modalContatos && <GerenciarContatos contatos={oficioContatos||[]} onAdd={addOficioContato} onEdit={editOficioContato} onDelete={deleteOficioContato} onClose={() => setModalContatos(false)} />}
    </div>
  );
}
