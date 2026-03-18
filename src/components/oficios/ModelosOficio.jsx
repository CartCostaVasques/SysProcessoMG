import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const TIPOS_RC = ['Casamento', 'Divórcio', 'Óbito', 'Nascimento', 'Outros'];
const MODELOS = [
  { id: 'comunicacao_rc',    label: 'Comunicação ao Registro Civil', descricao: 'Comunicação de ato notarial ao Registro Civil (casamento, divórcio, óbito...)' },
  { id: 'forum_cumprimento', label: 'Ofício ao Fórum — Cumprimento', descricao: 'Ofício simples de cumprimento dirigido ao Fórum / Juízo' },
];
const TIPO_LABEL = { juiz: 'Juiz(a)', cartorio_rc: 'Cartório RC', outro: 'Outro' };
const TABELIA_ID = '__tabelia_cartorio__';

const fmtData = (iso) => { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };
const fmtDataExtenso = (iso) => { if (!iso) return ''; return new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'}); };

// ── Autocomplete ─────────────────────────────────────────────
function AutocompleteContato({ value, onChange, tipoContato, placeholder, contatos, onSalvar }) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const ref = useRef(null);
  const sugestoes = useMemo(() => {
    const base = (contatos||[]).filter(c => c.tipo === tipoContato);
    if (!value || value.length < 2) return base;
    return base.filter(c => c.nome.toLowerCase().includes(value.toLowerCase()) || (c.descricao||'').toLowerCase().includes(value.toLowerCase()));
  }, [contatos, tipoContato, value]);
  const jaExiste = (contatos||[]).some(c => c.tipo === tipoContato && c.nome.toLowerCase() === (value||'').toLowerCase());
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false); };
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
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,.15)', maxHeight: 200, overflowY: 'auto', marginTop: 2 }}>
          {sugestoes.map(c => (
            <div key={c.id} onMouseDown={() => { onChange(c.nome); setAberto(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)' }} onMouseEnter={e => e.currentTarget.style.background='var(--color-surface-2)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.nome}</div>
              {c.descricao && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{c.descricao}</div>}
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
  const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, WidthType, Table, TableRow, TableCell, ShadingType } = await import('docx');
  const nomeCartorio = cartorio?.nome || 'Serviço Notarial e Registral';
  const cidade       = cartorio?.cidade || 'Paranatinga - MT';
  const endereco     = cartorio?.endereco || '';
  const telefone     = cartorio?.telefone || '';
  const dtOficio     = fmtDataExtenso(oficio.dt_oficio || new Date().toISOString().split('T')[0]);
  const numOficio    = oficio.numero || '';
  const nomeAssin    = assinante?.nome_completo || assinante?.nome_simples || '';
  const funcaoAssin  = assinante?.cargo || assinante?.perfil || 'Tabelião(ã)';

  const p = (text, opts={}) => new Paragraph({ alignment: opts.align||AlignmentType.JUSTIFIED, spacing: { after: opts.after??160, before: opts.before??0, line: 276 }, children: [new TextRun({ text: text||'', font: 'Arial', size: opts.size||24, bold: opts.bold||false, color: opts.color||undefined })] });
  const pEmpty = () => new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 24 })], spacing: { after: 80 } });
  const pMixed = (runs, opts={}) => new Paragraph({ alignment: opts.align||AlignmentType.JUSTIFIED, spacing: { after: opts.after??120, line: 276 }, children: runs.map(r => new TextRun({ font: 'Arial', size: 24, ...r })) });

  const cabecalho = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: nomeCartorio.toUpperCase(), font: 'Arial', size: 28, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: `${endereco} — ${cidade}`, font: 'Arial', size: 20, color: '555555' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E3A5F', space: 6 } }, children: [new TextRun({ text: telefone ? `Tel.: ${telefone}` : '', font: 'Arial', size: 20, color: '555555' })] }),
    pEmpty(),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 80 }, children: [new TextRun({ text: `${cidade}, ${dtOficio}.`, font: 'Arial', size: 24 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 320 }, children: [new TextRun({ text: `Ofício nº ${numOficio}`, font: 'Arial', size: 24, bold: true })] }),
  ];

  const rodape = [
    pEmpty(),
    p('Valemo-nos da oportunidade para reiterar à Vossa Senhoria, protestos de estima e apreço.', { after: 200 }),
    pEmpty(),
    p('Atenciosamente,', { after: 400 }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, border: { top: { style: BorderStyle.SINGLE, size: 4, color: '333333', space: 6 } }, children: [new TextRun({ text: nomeAssin, font: 'Arial', size: 24, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: funcaoAssin, font: 'Arial', size: 22, color: '555555' })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: nomeCartorio, font: 'Arial', size: 22, color: '555555' })] }),
  ];

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
    const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
    const borders = { top: border, bottom: border, left: border, right: border };
    const cm = { top: 80, bottom: 80, left: 120, right: 120 };
    const cell = (text, w, bold=false, bg=null) => new TableCell({ borders, margins: cm, width: { size: w, type: WidthType.DXA }, ...(bg?{shading:{fill:bg,type:ShadingType.CLEAR}}:{}), children: [new Paragraph({ children: [new TextRun({ text, font: 'Arial', size: 20, bold })] })] });
    const tabelaAssento = new Table({
      width: { size: 9026, type: WidthType.DXA }, columnWidths: [1505,1505,1505,4511],
      rows: [
        new TableRow({ children: [cell('Livro',1505,true,'E8EFF6'), cell('Folhas',1505,true,'E8EFF6'), cell('Termo',1505,true,'E8EFF6'), cell('Data do Assento',4511,true,'E8EFF6')] }),
        new TableRow({ children: [cell(livro,1505), cell(folhas,1505), cell(termo,1505), cell(dtAssento,4511)] }),
      ]
    });
    return [
      ...cabecalho,
      pEmpty(),
      pMixed([{ text: 'Prezado(a) Senhor(a) Oficial,' }], { after: 80 }),
      pMixed([{ text: 'Cartório de Registro Civil — ' }, { text: destinat, bold: true }], { after: 240 }),
      pEmpty(),
      p(`Vimos pelo presente comunicar a essa Serventia, o registro de ${tipoLabel} realizado nesta Serventia, o qual possui assento nessa Serventia.`, { after: 200 }),
      pEmpty(),
      p(`Dados do assento de ${tipoLabel}:`, { bold: true, after: 120 }),
      tabelaAssento,
      pEmpty(),
      ...(parte1 ? [
        pMixed([{ text: parte1, bold: true }], { after: 40 }),
        ...(tipoLabel==='casamento' && parte1Novo ? [
          pMixed([{ text: ' (nome de solteira)' }], { after: 40 }),
          pMixed([{ text: 'Após o casamento, passou a adotar o nome de: ' }, { text: parte1Novo, bold: true }], { after: 40 }),
        ] : []),
      ] : []),
      ...(parte2 ? [pMixed([{ text: tipoLabel==='casamento'?'Contraente: ':'' }, { text: parte2, bold: true }], { after: 40 })] : []),
      ...(matricula ? [pMixed([{ text: 'Matrícula: ' }, { text: matricula, bold: true }], { after: 40 })] : []),
      pEmpty(),
      p('Dados do assento pertinente à comunicação:', { bold: true, after: 120 }),
      ...(dadosCompl ? dadosCompl.split('\n').map(l => p(l, { after: 80 })) : [p('', { after: 160 }), p('', { after: 160 })]),
      ...rodape,
    ];
  };

  const buildForum = () => {
    const juiz = dados.juiz || '___________________________';
    const vara = dados.vara || '___________________________';
    const corpo = dados.corpo || 'Vimos, por meio do presente, encaminhar os documentos solicitados, colocando-nos à disposição para quaisquer esclarecimentos.';
    return [
      ...cabecalho,
      p('Excelentíssimo(a) Senhor(a)', { bold: true, after: 40 }),
      p(juiz, { bold: true, after: 40 }),
      p(vara, { after: 40 }),
      p(cidade, { after: 320 }),
      ...(dados.proc_judicial ? [p(`Ref.: Processo Judicial nº ${dados.proc_judicial}`, { bold: true, after: 240 })] : []),
      pMixed([{ text: 'Assunto: ', bold: true }, { text: oficio.assunto||'' }], { after: 240 }),
      p('Senhor(a),', { after: 200 }),
      ...corpo.split('\n').map(l => p(l, { after: 160 })),
      ...rodape,
    ];
  };

  const children = modelo.id === 'comunicacao_rc' ? buildRC() : buildForum();
  const doc = new Document({ styles: { default: { document: { run: { font: 'Arial', size: 24 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, right: 1134, bottom: 1134, left: 1701 } } }, children }] });
  return await Packer.toBlob(doc);
}

// ── Componente Principal ─────────────────────────────────────
export default function ModelosOficio() {
  const { oficios, processos, cartorio, usuarios, oficioContatos, addOficioContato, editOficioContato, deleteOficioContato, oficioModelosHistorico, addOficioModeloHistorico } = useApp();
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
    if (oficio) setDados(p => ({ ...p, destinatario: p.destinatario || oficio.destinatario || '' }));
  }, [oficio]);

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
          {[['emitir','✉ Emitir'],['historico','📋 Histórico']].map(([id,label]) => (
            <button key={id} onClick={() => setAba(id)} style={{ padding: '6px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: aba===id?700:400, background: aba===id?'var(--color-surface-3)':'transparent', color: aba===id?'var(--color-text)':'var(--color-text-muted)', borderRight: id==='emitir'?'1px solid var(--color-border)':'none' }}>{label}</button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setModalContatos(true)}>📋 Contatos ({oficioContatos?.length||0})</button>
      </div>

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
                          <td><button className="btn btn-secondary btn-sm" onClick={() => recarregarHistorico(h)}>↩ Reabrir</button></td>
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
            <select className="form-select" value={oficioSel} onChange={e => { setOficioSel(e.target.value); setDados({}); }}>
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
                    <AutocompleteContato value={dados.destinatario||''} onChange={v => setD('destinatario',v)} tipoContato="cartorio_rc" placeholder="Nome do Cartório RC" contatos={oficioContatos||[]} onSalvar={dados => addOficioContato(dados)} />
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
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">{(dados.tipo_rc||'Casamento')==='Casamento'?'Noiva (nome de solteira)':'Parte 1'}</label><input className="form-input" value={dados.parte1||''} onChange={e => setD('parte1',e.target.value)} placeholder="Nome" /></div>
                    {(dados.tipo_rc||'Casamento')==='Casamento' && <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Novo nome após casamento</label><input className="form-input" value={dados.parte1_novo_nome||''} onChange={e => setD('parte1_novo_nome',e.target.value)} placeholder="Nome após casamento" /></div>}
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">{(dados.tipo_rc||'Casamento')==='Casamento'?'Noivo':'Parte 2'}</label><input className="form-input" value={dados.parte2||''} onChange={e => setD('parte2',e.target.value)} placeholder="Nome" /></div>
                    <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Matrícula</label><input className="form-input" value={dados.matricula||processo?.numero_interno||''} onChange={e => setD('matricula',e.target.value)} placeholder="Matrícula" /></div>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dados do assento pertinente à comunicação</label>
                  <textarea className="form-input" rows={3} value={dados.dados_complementares||''} onChange={e => setD('dados_complementares',e.target.value)} placeholder="Informações adicionais..." style={{ resize: 'vertical', fontSize: 12 }} />
                </div>
              </>)}

              {modelo.id === 'forum_cumprimento' && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Meritíssimo(a) Juiz(a)</label>
                    <AutocompleteContato value={dados.juiz||''} onChange={v => setD('juiz',v)} tipoContato="juiz" placeholder="Nome do(a) Juiz(a)" contatos={oficioContatos||[]} onSalvar={dados => addOficioContato(dados)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Vara / Comarca</label><input className="form-input" value={dados.vara||''} onChange={e => setD('vara',e.target.value)} placeholder="Ex: 1ª Vara Cível de Paranatinga" /></div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Nº Processo Judicial (opcional)</label><input className="form-input" value={dados.proc_judicial||''} onChange={e => setD('proc_judicial',e.target.value)} placeholder="Nº do processo judicial" /></div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Corpo do Ofício</label>
                  <textarea className="form-input" rows={5} value={dados.corpo||''} onChange={e => setD('corpo',e.target.value)} placeholder="Texto principal do ofício..." style={{ resize: 'vertical', fontSize: 12 }} />
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
