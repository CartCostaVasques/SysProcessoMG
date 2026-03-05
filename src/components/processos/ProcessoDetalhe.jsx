import { useState, useEffect } from 'react';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const HOJE = () => new Date().toISOString().split('T')[0];
const TIPOS_VINCULO = ['Outorgante', 'Outorgado', 'Anuente', 'Comprador', 'Vendedor', 'Credor', 'Devedor', 'Representante', 'Outros'];
const STATUS_OPTS   = ['Em andamento', 'Concluído', 'Devolvido', 'Suspenso'];
const TIPOS_AND     = ['Despacho', 'Nota Devolutiva', 'Minuta Enviada', 'Protocolo', 'Diligência', 'Certidão', 'Retificação', 'Arquivado', 'Outros'];
const TIPOS_CERT    = ['Certidão Atualizada', 'Certidão de Ônus', 'Cadeia Dominial', 'Nascimento', 'Casamento', 'Óbito', 'Matrícula', 'Transcrição', 'Averbação', 'Outros'];

function formatBRL(v) {
  const n = parseFloat(String(v || 0).replace(/\./g, '').replace(',', '.')) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseBRL(s) {
  return parseFloat(String(s).replace(/\./g, '').replace(',', '.')) || 0;
}

// ── Seção colapsável ─────────────────────────────────────────
function Secao({ titulo, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)',
          padding: '6px 0', cursor: 'pointer', color: 'var(--color-text-muted)',
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
        }}
      >
        <span style={{ transition: 'transform 0.15s', display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        {titulo}
      </button>
      {open && <div style={{ paddingTop: 12 }}>{children}</div>}
    </div>
  );
}

// ── Campo readonly / editável ─────────────────────────────────
function Campo({ label, children, full }) {
  return (
    <div className="form-group" style={full ? { gridColumn: '1/-1', marginBottom: 10 } : { marginBottom: 10 }}>
      <label className="form-label" style={{ fontSize: 10, marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Aba: Dados do Processo ────────────────────────────────────
function TabDados({ proc, editando, onChange, servicos, usuarios, interessados, onCadastrarNovoInt }) {
  const categorias  = [...new Set(servicos.map(s => s.categoria))];
  const especies    = servicos.filter(s => !proc.categoria || s.categoria === proc.categoria).map(s => s.subcategoria);
  const partes      = (() => { try { return JSON.parse(proc.partes || '[]'); } catch { return []; } })();

  const inp = (v, k, opts = {}) => editando
    ? <input className="form-input" value={v || ''} onChange={e => onChange(k, e.target.value)} style={{ fontSize: 12, ...opts.style }} placeholder={opts.ph || ''} />
    : <div style={{ fontSize: 13, padding: '6px 0', color: v ? 'var(--color-text)' : 'var(--color-text-faint)', minHeight: 28 }}>{v || '—'}</div>;

  const sel = (v, k, options, label = '—') => editando
    ? <select className="form-select" value={v || ''} onChange={e => onChange(k, e.target.value)} style={{ fontSize: 12 }}>
        <option value="">{label}</option>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    : <div style={{ fontSize: 13, padding: '6px 0' }}>{v || '—'}</div>;

  const setVinculo = (idx, vl) => {
    const arr = [...partes]; arr[idx] = { ...arr[idx], vinculo: vl };
    onChange('partes', JSON.stringify(arr));
  };
  const removerParte = (idx) => {
    const arr = partes.filter((_, i) => i !== idx);
    onChange('partes', JSON.stringify(arr));
  };

  return (
    <div>
      <Secao titulo="Identificação">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <Campo label="Nº Interno *">{inp(proc.numero_interno, 'numero_interno')}</Campo>
          <Campo label="Dt. Cadastro">{inp(proc.dt_abertura, 'dt_abertura', { style: { }, ph: '' })}</Campo>
          <Campo label="Responsável">
            {editando
              ? <select className="form-select" value={proc.responsavel_id || ''} onChange={e => onChange('responsavel_id', e.target.value || null)} style={{ fontSize: 12 }}>
                  <option value="">—</option>
                  {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
                </select>
              : <div style={{ fontSize: 13, padding: '6px 0' }}>{usuarios.find(u => u.id === proc.responsavel_id)?.nome_simples || '—'}</div>
            }
          </Campo>
          <Campo label="Status">
            {editando
              ? <select className="form-select" value={proc.status || ''} onChange={e => { onChange('status', e.target.value); if (e.target.value === 'Concluído' && !proc.dt_conclusao) onChange('dt_conclusao', HOJE()); }} style={{ fontSize: 12 }}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              : <div style={{ fontSize: 13, padding: '6px 0' }}>{proc.status || '—'}</div>
            }
          </Campo>
          <Campo label="Categoria">
            {editando
              ? <select className="form-select" value={proc.categoria || ''} onChange={e => { onChange('categoria', e.target.value); onChange('especie', ''); }} style={{ fontSize: 12 }}>
                  <option value="">—</option>{categorias.map(c => <option key={c}>{c}</option>)}
                </select>
              : <div style={{ fontSize: 13, padding: '6px 0' }}>{proc.categoria || '—'}</div>
            }
          </Campo>
          <Campo label="Serviço / Espécie">
            {editando
              ? <select className="form-select" value={proc.especie || ''} onChange={e => onChange('especie', e.target.value)} style={{ fontSize: 12 }}>
                  <option value="">—</option>
                  {/* Garante que o valor atual apareça mesmo se não estiver na lista filtrada */}
                  {proc.especie && !especies.includes(proc.especie) && <option value={proc.especie}>{proc.especie}</option>}
                  {especies.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              : <div style={{ fontSize: 13, padding: '6px 0' }}>{proc.especie || '—'}</div>
            }
          </Campo>
          <Campo label="Valor do Ato">
            {editando
              ? <input className="form-input" defaultValue={formatBRL(proc.valor_ato)} onBlur={e => onChange('valor_ato', parseBRL(e.target.value))} style={{ fontSize: 12, textAlign: 'right' }} />
              : <div style={{ fontSize: 13, padding: '6px 0', fontFamily: 'var(--font-mono)' }}>{proc.valor_ato > 0 ? `R$ ${formatBRL(proc.valor_ato)}` : '—'}</div>
            }
          </Campo>
          <Campo label="Nº Judicial">{inp(proc.numero_judicial, 'numero_judicial')}</Campo>
        </div>
      </Secao>

      <Secao titulo="Partes do Processo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {partes.length === 0 && <div style={{ fontSize: 12, color: 'var(--color-text-faint)', padding: '4px 0' }}>Nenhuma parte vinculada.</div>}
          {partes.map((p, idx) => {
            const int = interessados.find(i => i.id === p.id);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                {editando
                  ? <select value={p.vinculo || 'Outorgante'} onChange={e => setVinculo(idx, e.target.value)}
                      style={{ fontSize: 11, background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 4, padding: '2px 6px', color: 'var(--color-text-muted)', cursor: 'pointer', minWidth: 110 }}>
                      {TIPOS_VINCULO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  : <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 110 }}>{p.vinculo || 'Outorgante'}</span>
                }
                <span style={{ color: 'var(--color-border-light)' }}>·</span>
                <strong style={{ flex: 1, fontSize: 13 }}>{int?.nome || p.nome}</strong>
                {int?.cpf && <span style={{ color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{int.cpf}</span>}
                {editando && (
                  <button onClick={() => removerParte(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 13, padding: '0 4px' }}>✕</button>
                )}
              </div>
            );
          })}
          {editando && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 4, alignSelf: 'flex-start' }}
              onClick={() => onCadastrarNovoInt('')}
            >+ Adicionar Interessado</button>
          )}
        </div>
      </Secao>

      <Secao titulo="Escritura / Procuração / Conclusão" defaultOpen={!!(proc.livro_ato || proc.esc_natureza || proc.dt_conclusao || proc.obs)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Campo label="Livro / Ato">{inp(proc.livro_ato, 'livro_ato')}</Campo>
          <Campo label="Folhas / Ato">{inp(proc.folhas_ato, 'folhas_ato')}</Campo>
          <Campo label="Dt. Conclusão">{inp(proc.dt_conclusao, 'dt_conclusao')}</Campo>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <Campo label="Descrição do Ato / Dados do Imóvel" full>
            {editando
              ? <textarea className="form-input" value={proc.esc_descricao || ''} onChange={e => onChange('esc_descricao', e.target.value)} rows={5} style={{ resize: 'vertical', fontSize: 12 }} placeholder="Ex: Imóvel urbano, matrícula nº 15000, RGI de Paranatinga-MT. Cartório: 1º Ofício. Descrição: lote nº 12, quadra 5..." />
              : <div style={{ fontSize: 13, padding: '6px 0', color: proc.esc_descricao ? 'var(--color-text)' : 'var(--color-text-faint)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{proc.esc_descricao || '—'}</div>
            }
          </Campo>
          <Campo label="Observações do Processo" full>
            {editando
              ? <textarea className="form-input" value={proc.obs || ''} onChange={e => onChange('obs', e.target.value)} rows={2} style={{ resize: 'vertical', fontSize: 12 }} />
              : <div style={{ fontSize: 13, padding: '6px 0', color: proc.obs ? 'var(--color-text)' : 'var(--color-text-faint)' }}>{proc.obs || '—'}</div>
            }
          </Campo>
        </div>
      </Secao>
    </div>
  );
}

// ── Aba: Andamentos ───────────────────────────────────────────
function TabAndamentos({ processoId, usuarios }) {
  const { andamentos, addAndamento, editAndamento, deleteAndamento, usuario, addToast } = useApp();
  const lista = andamentos.filter(a => a.processo_id === processoId).sort((a, b) => b.dt_andamento.localeCompare(a.dt_andamento));

  const EMPTY_AND = { processo_id: processoId, dt_andamento: HOJE(), tipo: '', descricao: '', responsavel: usuario?.nome_simples || '', vencimento: '', concluido: false };
  const [form, setForm]   = useState(null); // null = fechado, {} = novo, obj = editando
  const [editId, setEditId] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const abrirNovo = () => { setForm({ ...EMPTY_AND }); setEditId(null); };
  const abrirEdit = (a) => { setForm({ ...a }); setEditId(a.id); };
  const fechar    = () => { setForm(null); setEditId(null); };

  const salvar = async () => {
    if (!form.descricao.trim()) { addToast('Descrição obrigatória.', 'error'); return; }
    if (editId) { await editAndamento(editId, form); addToast('Andamento atualizado!', 'success'); }
    else { await addAndamento(form); addToast('Andamento registrado!', 'success'); }
    fechar();
  };

  const concluir = async (a) => {
    await editAndamento(a.id, { concluido: !a.concluido });
    addToast(a.concluido ? 'Reaberto.' : 'Concluído!', 'success');
  };

  const excluir = async (a) => {
    if (window.confirm('Remover este andamento?')) {
      await deleteAndamento(a.id);
      addToast('Removido.', 'info');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{lista.length} andamento(s)</span>
        <button className="btn btn-primary btn-sm" onClick={abrirNovo}>+ Novo Andamento</button>
      </div>

      {/* Formulário inline */}
      {form && (
        <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            {editId ? 'Editar Andamento' : 'Novo Andamento'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 160px 1fr 130px', gap: 10, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Data *</label>
              <input className="form-input" type="date" value={form.dt_andamento} onChange={e => set('dt_andamento', e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Tipo</label>
              <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)} style={{ fontSize: 12 }}>
                <option value="">—</option>
                {TIPOS_AND.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Descrição *</label>
              <input className="form-input" value={form.descricao} onChange={e => set('descricao', e.target.value)} style={{ fontSize: 12 }} placeholder="Descreva o andamento" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Vencimento</label>
              <input className="form-input" type="date" value={form.vencimento || ''} onChange={e => set('vencimento', e.target.value)} style={{ fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 10, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Responsável</label>
              <select className="form-select" value={form.responsavel || ''} onChange={e => set('responsavel', e.target.value)} style={{ fontSize: 12 }}>
                <option value="">—</option>
                {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.nome_simples}>{u.nome_simples}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 10 }}>Obs. / Detalhe</label>
              <input className="form-input" value={form.obs_and || ''} onChange={e => set('obs_and', e.target.value)} style={{ fontSize: 12 }} placeholder="Opcional" />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={fechar}>Cancelar</button>
              <button className="btn btn-primary btn-sm" onClick={salvar}>✓ Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {lista.length === 0 && !form && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-faint)', fontSize: 13 }}>
          Nenhum andamento registrado para este processo.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lista.map(a => (
          <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: a.concluido ? 'transparent' : 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', opacity: a.concluido ? 0.6 : 1, alignItems: 'flex-start' }}>
            <div style={{ minWidth: 80, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', paddingTop: 2 }}>{formatDate(a.dt_andamento)}</div>
            {a.tipo && <span className="badge badge-neutral" style={{ flexShrink: 0, marginTop: 1 }}>{a.tipo}</span>}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: a.concluido ? 400 : 500 }}>{a.descricao}</div>
              {a.obs_and && <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>{a.obs_and}</div>}
              <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--color-text-faint)' }}>
                {a.responsavel && <span>👤 {a.responsavel}</span>}
                {a.vencimento && (
                  <span style={{ color: !a.concluido && a.vencimento < HOJE() ? 'var(--color-danger)' : 'inherit' }}>
                    ⏱ {formatDate(a.vencimento)}{!a.concluido && a.vencimento < HOJE() ? ' — VENCIDO' : ''}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn-icon btn-sm" title={a.concluido ? 'Reabrir' : 'Concluir'} onClick={() => concluir(a)} style={{ color: a.concluido ? 'var(--color-text-faint)' : 'var(--color-success)' }}>{a.concluido ? '↩' : '✓'}</button>
              <button className="btn-icon btn-sm" title="Editar" onClick={() => abrirEdit(a)}>✎</button>
              <button className="btn-icon btn-sm" title="Excluir" onClick={() => excluir(a)} style={{ color: 'var(--color-danger)' }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aba: Pedido de Certidões ──────────────────────────────────
function gerarRequerimento(proc, certidoes, interessados, cartorio) {
  // Pega o primeiro interessado como requerente
  const partes = (() => { try { return JSON.parse(proc.partes || '[]'); } catch { return []; } })();
  const primeiraParteId = partes[0]?.id;
  const requerente = interessados.find(i => i.id === primeiraParteId) || { nome: partes[0]?.nome || '', cpf: '', rg: '', endereco: '', cidade: '', cep: '', email: '', celular: '' };

  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const cidade = cartorio?.cidade || 'Paranatinga-MT';
  const nomeCartorio = cartorio?.nome || '1º SERVIÇO DE REGISTRO DE IMÓVEIS E TÍTULOS E DOCUMENTOS DA COMARCA DE PARANATINGA – MT';
  const oficial = cartorio?.responsavel || 'Oficial Registrador';

  const linhasCert = certidoes.map(c => `
    <tr>
      <td style="border:1px solid #999;padding:4px 8px;font-size:11px;">${c.dt_pedido ? new Date(c.dt_pedido + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</td>
      <td style="border:1px solid #999;padding:4px 8px;font-size:11px;">${c.tipo || ''}</td>
      <td style="border:1px solid #999;padding:4px 8px;font-size:11px;">${c.descricao || c.obs || ''}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 20px 40px; color: #000; }
  .cabecalho { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 16px; }
  .cabecalho h2 { font-size: 13px; margin: 0 0 4px 0; text-transform: uppercase; }
  .cabecalho h3 { font-size: 12px; margin: 0; font-weight: normal; }
  .titulo-req { text-align: center; background: #ccc; font-size: 16px; font-weight: bold; padding: 6px; margin-bottom: 16px; }
  .campo-linha { display: flex; gap: 0; margin-bottom: 6px; }
  .campo { border: 1px solid #999; padding: 3px 8px; font-size: 11px; flex: 1; }
  .campo-label { font-size: 9px; color: #555; display: block; margin-bottom: 1px; }
  .campo-valor { font-size: 12px; min-height: 16px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { border: 1px solid #999; padding: 4px 8px; background: #eee; font-size: 11px; text-align: left; }
  .rodape { margin-top: 32px; }
  .assinatura { text-align: center; margin-top: 48px; border-top: 1px solid #000; display: inline-block; padding-top: 4px; min-width: 240px; font-size: 12px; }
  .declaracao { border: 1px solid #ccc; padding: 10px 14px; margin-top: 24px; font-size: 10px; text-align: justify; line-height: 1.5; }
  .declaracao p { margin: 0 0 8px 0; }
  @media print { body { padding: 10px 20px; } }
</style>
</head><body>
<div class="cabecalho">
  <h2>${nomeCartorio}</h2>
  <h3>${oficial}</h3>
</div>

<div class="titulo-req">Requerimento - Pedido de Certidão</div>

<div style="display:flex;justify-content:flex-end;margin-bottom:8px;">
  <div style="border:1px solid #999;padding:3px 12px;font-size:11px;">
    <span style="font-size:9px;color:#555;">Processo Interno &nbsp;</span>
    <strong style="font-size:14px;">${proc.numero_interno || ''}</strong>
  </div>
</div>

<div style="margin-bottom:4px;">
  <div class="campo-linha">
    <div class="campo" style="flex:3"><span class="campo-label">Requerente</span><div class="campo-valor">${requerente.nome || ''}</div></div>
  </div>
  <div class="campo-linha">
    <div class="campo" style="flex:1"><span class="campo-label">CPF</span><div class="campo-valor">${requerente.cpf || ''}</div></div>
    <div class="campo" style="flex:1"><span class="campo-label">Registro Geral</span><div class="campo-valor">${requerente.rg || ''}</div></div>
  </div>
  <div class="campo-linha">
    <div class="campo" style="flex:3"><span class="campo-label">Endereço</span><div class="campo-valor">${requerente.endereco || ''}</div></div>
  </div>
  <div class="campo-linha">
    <div class="campo" style="flex:2"><span class="campo-label">Cidade</span><div class="campo-valor">${requerente.cidade || cidade}</div></div>
    <div class="campo" style="flex:1"><span class="campo-label">CEP</span><div class="campo-valor">${requerente.cep || ''}</div></div>
  </div>
  <div class="campo-linha">
    <div class="campo" style="flex:2"><span class="campo-label">Email</span><div class="campo-valor">${requerente.email || ''}</div></div>
    <div class="campo" style="flex:1"><span class="campo-label">Celular</span><div class="campo-valor">${requerente.celular || ''}</div></div>
  </div>
</div>

<table>
  <thead><tr>
    <th style="width:100px;">Dt Pedido</th>
    <th style="width:180px;">Tipo Certidão</th>
    <th>Detalhes do Pedido - Matrícula</th>
  </tr></thead>
  <tbody>${linhasCert}</tbody>
</table>

<div style="margin-top:24px;font-size:12px;">${cidade}, &nbsp;&nbsp;&nbsp; ${hoje}</div>

<div style="margin-top:32px;text-align:center;">
  <div class="assinatura">
    <div>${requerente.nome || ''}</div>
    <div style="font-size:10px;color:#555;">Requerente</div>
  </div>
</div>

<div class="declaracao">
  <p>Estou ciente de que os dados são tratados de acordo com o regime jurídico da publicidade notarial e registral, bem como nos processos judiciais ou administrativos, atos notariais e registrais ou cidadania, consoante os §§ 4º e 5º, artigo 233, da Lei Federal nº13.709/2018 – LGPD, e que os dados coletados têm finalidade para efetuar qualificação notarial e/ou registral, cadastramento no sistema interno, publicações de editais onde há previsão legal e compartilhamento com Centrais Nacionais, Conselho Nacional de Justiça e a Central Eletrônica de Informações e Integração (CEI-MT).</p>
  <p>Art. 31 Para a expedição de certidão ou Informação restrita ao que constar nos Indicadores e Índices pessoais deverá ser exigida a identificação do requerente, por escrito, bem como a finalidade da solicitação, para fins de anotação da solicitação em prontuário, mantido em pasta física ou digital, que viabilizará o exercício da autodeterminação informativa do titular do dado pessoal, não se responsabilizando o delegatário pelo exame desta finalidade, salvo na hipótese de manifesta ilicitude penal, caso em que deverá negar o pedido.</p>
  <p>Art. 23. O tratamento de dados pessoais pelas pessoas jurídicas de direito público referidas no parágrafo único do art. 1º da Lei nº 12.527, de 18 de novembro de 2011 (Lei de Acesso à Informação), deverá ser realizado para o atendimento de sua finalidade pública, na persecução do interesse público, com o objetivo de executar as competências legais ou cumprir as atribuições legais do serviço público, desde que:</p>
  <p>§ 4º Os serviços notariais e de registro exercidos em caráter privado, por delegação do Poder Público, terão o mesmo tratamento dispensado às pessoas jurídicas referidas no caput deste artigo, nos termos desta Lei.</p>
  <p>§ 5º Os órgãos notariais e de registro devem fornecer acesso aos dados por meio eletrônico para a administração pública, tendo em vista as finalidades de que trata o caput deste artigo.</p>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=800,height=900');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

function TabCertidoes({ proc, editando, onChange, interessados, cartorio }) {
  const certidoes = (() => { try { return JSON.parse(proc.certidoes || '[]'); } catch { return []; } })();

  const EMPTY_CERT = { dt_pedido: HOJE(), tipo: '', descricao: '', concluido: false };

  const add    = () => onChange('certidoes', JSON.stringify([...certidoes, { ...EMPTY_CERT }]));
  const remove = (idx) => onChange('certidoes', JSON.stringify(certidoes.filter((_, i) => i !== idx)));
  const update = (idx, k, v) => {
    const arr = certidoes.map((c, i) => i === idx ? { ...c, [k]: v } : c);
    onChange('certidoes', JSON.stringify(arr));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{certidoes.length} pedido(s) de certidão</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {certidoes.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => gerarRequerimento(proc, certidoes, interessados, cartorio)}>
              🖨 Imprimir Requerimento
            </button>
          )}
          {editando && <button className="btn btn-primary btn-sm" onClick={add}>+ Adicionar</button>}
        </div>
      </div>

      {certidoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-faint)', fontSize: 13 }}>
          {editando ? 'Clique em "+ Adicionar" para registrar um pedido.' : 'Nenhum pedido de certidão registrado.'}
        </div>
      )}

      {certidoes.length > 0 && (
        <div>
          {/* Cabeçalho */}
          <div style={{ display: 'grid', gridTemplateColumns: '110px 180px 1fr 90px 28px', gap: 8, padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: 4 }}>
            <span>Dt. Pedido</span><span>Tipo</span><span>Descrição / Matrícula</span><span style={{ textAlign: 'center' }}>Concluído</span><span></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {certidoes.map((c, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '110px 180px 1fr 90px 28px', gap: 8, padding: '8px 10px', background: c.concluido ? 'transparent' : 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', alignItems: 'center', opacity: c.concluido ? 0.65 : 1 }}>
                {editando
                  ? <input className="form-input" type="date" value={c.dt_pedido} onChange={e => update(idx, 'dt_pedido', e.target.value)} style={{ fontSize: 11, padding: '4px 6px', height: 28 }} />
                  : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{formatDate(c.dt_pedido)}</span>
                }
                {editando
                  ? <select className="form-select" value={c.tipo} onChange={e => update(idx, 'tipo', e.target.value)} style={{ fontSize: 11, padding: '4px 6px', height: 28 }}>
                      <option value="">—</option>{TIPOS_CERT.map(t => <option key={t}>{t}</option>)}
                    </select>
                  : <span style={{ fontSize: 12, fontWeight: 500 }}>{c.tipo || '—'}</span>
                }
                {editando
                  ? <input className="form-input" value={c.descricao || ''} onChange={e => update(idx, 'descricao', e.target.value)} style={{ fontSize: 11, padding: '4px 6px', height: 28 }} placeholder="Ex: Matrícula nº 123, do livro 02-A, datada de 05/03/2026" />
                  : <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{c.descricao || '—'}</span>
                }
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <input type="checkbox" checked={!!c.concluido} onChange={e => update(idx, 'concluido', e.target.checked)} disabled={!editando} style={{ width: 16, height: 16, cursor: editando ? 'pointer' : 'default' }} />
                </div>
                {editando
                  ? <button onClick={() => remove(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
                  : <span></span>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal Principal ───────────────────────────────────────────
export default function ProcessoDetalhe({ processo, onClose, inline = false }) {
  const { editProcesso, usuarios, servicos, interessados, addInteressado, addToast, cartorio } = useApp();
  const [aba, setAba]         = useState('dados');
  const [editando, setEditando] = useState(false);
  const [form, setForm]       = useState({ ...processo });
  const [salvando, setSalvando] = useState(false);

  // Sincroniza se o processo mudar externamente
  useEffect(() => { if (!editando) setForm({ ...processo }); }, [processo]);

  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const salvar = async () => {
    if (!form.numero_interno?.trim()) { addToast('Nº Interno obrigatório.', 'error'); return; }
    setSalvando(true);
    await editProcesso(processo.id, form);
    setSalvando(false);
    setEditando(false);
    addToast('Processo salvo!', 'success');
  };

  const descartar = () => { setForm({ ...processo }); setEditando(false); };

  const STATUS_CONF = {
    'Em andamento': { cor: 'var(--color-warning)', sigla: 'EA' },
    'Concluído':    { cor: 'var(--color-success)', sigla: 'CO' },
    'Devolvido':    { cor: 'var(--color-danger)',  sigla: 'DV' },
    'Suspenso':     { cor: '#8a8a96',              sigla: 'SP' },
  };
  const conf = STATUS_CONF[form.status] || { cor: 'var(--color-text-faint)', sigla: '??' };

  const andsDoProcesso = useApp().andamentos.filter(a => a.processo_id === processo.id);
  const andsPendentes  = andsDoProcesso.filter(a => !a.concluido).length;

  const inner = (
    <div style={inline ? { display: 'flex', flexDirection: 'column' } : { width: 'min(900px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} className={inline ? '' : 'modal modal-lg'}>

          {/* Header */}
          <div className="modal-header" style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: conf.cor + '22', border: `2px solid ${conf.cor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: conf.cor }}>
                {conf.sigla}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-mono)' }}>Processo Nº {form.numero_interno}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                  {form.especie || '—'} · {form.categoria || '—'} · Cadastrado em {formatDate(form.dt_abertura)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {!editando && (
                <button className="btn btn-secondary btn-sm" onClick={() => setEditando(true)}>✎ Editar</button>
              )}
              <button className="btn-icon" onClick={onClose}>✕</button>
            </div>
          </div>

          {/* Abas */}
          <div className="tabs" style={{ flexShrink: 0, padding: '0 20px', borderBottom: '1px solid var(--color-border)' }}>
            {[
              ['dados', 'Dados do Processo'],
              ['andamentos', `Andamentos${andsPendentes > 0 ? ` (${andsPendentes})` : ''}`],
              ['certidoes', 'Pedido de Certidões'],
            ].map(([id, label]) => (
              <button key={id} className={`tab-btn ${aba === id ? 'active' : ''}`} onClick={() => setAba(id)}>{label}</button>
            ))}
          </div>

          {/* Corpo com scroll */}
          <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {aba === 'dados' && (
              <TabDados
                proc={form}
                editando={editando}
                onChange={onChange}
                servicos={servicos}
                usuarios={usuarios}
                interessados={interessados}
                onCadastrarNovoInt={() => {}}
              />
            )}
            {aba === 'andamentos' && (
              <TabAndamentos processoId={processo.id} usuarios={usuarios} />
            )}
            {aba === 'certidoes' && (
              <TabCertidoes proc={form} editando={editando} onChange={onChange} interessados={interessados} cartorio={cartorio} />
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ flexShrink: 0 }}>
            {editando ? (
              <>
                <button className="btn btn-secondary" onClick={descartar}>✕ Descartar</button>
                <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                  {salvando ? 'Salvando...' : '✓ Salvar Alterações'}
                </button>
              </>
            ) : (
              <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
            )}
          </div>

    </div>
  );

  if (inline) return inner;
  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        {inner}
      </div>
    </Portal>
  );
}
