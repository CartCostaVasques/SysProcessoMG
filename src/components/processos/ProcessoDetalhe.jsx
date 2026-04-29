import { useState, useEffect, useMemo } from 'react';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const HOJE = () => new Date().toISOString().split('T')[0];
const TIPOS_VINCULO = ['Outorgante', 'Outorgado', 'Anuente', 'Comprador', 'Vendedor', 'Credor', 'Devedor', 'Representante', 'Outros'];
const STATUS_OPTS   = ['Em andamento', 'Devolvido', 'Em reanálise', 'Concluído', 'Encerrado'];
const TIPOS_AND     = ['Despacho', 'Nota Devolutiva', 'Minuta Enviada', 'Protocolo', 'Diligência', 'Certidão', 'Retificação', 'Jurídico', 'Arquivado', 'Outros'];
const TIPOS_CERT    = ['Certidão Atualizada', 'Certidão de Ônus', 'Cadeia Dominial', 'Nascimento', 'Casamento', 'Óbito', 'Matrícula', 'Transcrição', 'Averbação', 'Outros'];

const STATUS_CONF_GLOBAL = {
  'Em andamento': { cor: 'var(--color-warning)',  sigla: 'EA', icon: '🔄' },
  'Devolvido':    { cor: 'var(--color-danger)',   sigla: 'DV', icon: '↩️' },
  'Em reanálise': { cor: '#a78bfa',               sigla: 'RA', icon: '🔍' },
  'Concluído':    { cor: 'var(--color-success)',  sigla: 'CO', icon: '✅' },
  'Encerrado':    { cor: '#64748b',               sigla: 'EN', icon: '🔒' },
};

const STATUS_PENDENTES = ['Em andamento', 'Em reanálise'];

const fmtNomeInteressados = (partes) => {
  try {
    const preposicoes = new Set(['de','da','do','das','dos','e','a','o']);
    const lista = JSON.parse(partes || '[]');
    return lista.slice(0, 2).map(p => {
      const palavras = (p.nome || '').trim().split(/\s+/);
      const nomes = [];
      for (const w of palavras) {
        if (!preposicoes.has(w.toLowerCase())) { nomes.push(w); if (nomes.length === 2) break; }
      }
      return nomes.join(' ');
    }).filter(Boolean).join(' · ');
  } catch { return '—'; }
};

function ModalTelaAndamento({ onClose }) {
  const { processos, andamentos, interessados, usuarios } = useApp();
  const [filtroStatus, setFiltroStatus] = useState('pendentes'); // pendentes|todos|Em andamento|Devolvido|Em reanálise
  const [filtroAnd, setFiltroAnd]       = useState('pendentes'); // pendentes|finalizados|todos
  const [busca, setBusca]               = useState('');
  const hoje = new Date().toISOString().split('T')[0];

  const fmtBRL = (v) => Number(v||0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lista = useMemo(() => {
    // Filtra processos por status
    const procsFiltrados = processos.filter(p => {
      if (filtroStatus === 'pendentes') return STATUS_PENDENTES.includes(p.status);
      if (filtroStatus === 'todos') return true;
      return p.status === filtroStatus;
    });

    return procsFiltrados.map(p => {
      // Filtra andamentos deste processo
      let ands = andamentos.filter(a => a.processo_id === p.id);
      if (filtroAnd === 'pendentes')   ands = ands.filter(a => !a.concluido);
      if (filtroAnd === 'finalizados') ands = ands.filter(a => a.concluido);

      // Só mostra se tiver andamentos após filtro
      if (ands.length === 0) return null;

      // Busca
      if (busca) {
        const q = busca.toLowerCase();
        const nomes = fmtNomeInteressados(p.partes).toLowerCase();
        if (!(String(p.numero_interno).includes(q) || nomes.includes(q) || (p.especie||'').toLowerCase().includes(q))) return null;
      }

      return { proc: p, ands };
    }).filter(Boolean);
  }, [processos, andamentos, filtroStatus, filtroAnd, busca]);

  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()} style={{ alignItems: 'flex-start', paddingTop: 40 }}>
        <div style={{ width: 'min(1000px, 96vw)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', maxHeight: '88vh', overflow: 'hidden' }}>
          {/* Header */}
          <div className="modal-header">
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>📋 Tela de Andamentos</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{lista.length} processo(s) encontrado(s)</div>
            </div>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>

          {/* Filtros */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Busca */}
            <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
              <span className="search-bar-icon">⌕</span>
              <input className="search-bar-input" placeholder="Buscar por nº interno, interessado, espécie..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            {/* Status processo */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Status:</span>
              {[['pendentes','Pendentes (todos)'],['Em andamento','Em andamento'],['Devolvido','Devolvido'],['Em reanálise','Em reanálise'],['todos','Todos']].map(([v, l]) => (
                <button key={v} onClick={() => setFiltroStatus(v)}
                  className={`btn btn-sm ${filtroStatus === v ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11 }}>{l}</button>
              ))}
            </div>
            {/* Filtro andamento */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>Andamento:</span>
              {[['pendentes','Pendentes'],['finalizados','Finalizados'],['todos','Todos']].map(([v, l]) => (
                <button key={v} onClick={() => setFiltroAnd(v)}
                  className={`btn btn-sm ${filtroAnd === v ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 11 }}>{l}</button>
              ))}
            </div>
          </div>

          {/* Tabela */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 16px' }}>
            {lista.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-faint)' }}>Nenhum processo encontrado com os filtros selecionados.</div>
            ) : (
              <table className="data-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>N. Interno</th>
                    <th style={{ width: 100 }}>Dt. Abertura</th>
                    <th>Interessados</th>
                    <th>Andamentos</th>
                    <th style={{ width: 44, textAlign: 'center' }}>Resp.</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(({ proc, ands }) => {
                    const nomes = fmtNomeInteressados(proc.partes);
                    const conf = STATUS_CONF_GLOBAL[proc.status] || {};
                    const resp = (usuarios || []).find(u => u.id === proc.responsavel_id);
                    const iniciais = resp ? resp.nome_simples.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
                    return (
                      <tr key={proc.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, verticalAlign: 'top' }}>
                          <div>{proc.numero_interno}</div>
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: conf.cor + '22', color: conf.cor, fontWeight: 700, fontFamily: 'sans-serif' }}>{proc.status}</span>
                        </td>
                        <td style={{ fontSize: 12, verticalAlign: 'top' }}>{formatDate(proc.dt_abertura)}</td>
                        <td style={{ fontSize: 12, verticalAlign: 'top', color: 'var(--color-text-muted)' }}>{nomes || '—'}</td>
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {ands.map(a => {
                              const vencido = a.vencimento && a.vencimento < hoje && !a.concluido;
                              return (
                                <div key={a.id} style={{ fontSize: 11, padding: '4px 8px', borderRadius: 'var(--radius-md)', background: a.concluido ? 'color-mix(in srgb, var(--color-success) 8%, transparent)' : vencido ? 'color-mix(in srgb, var(--color-danger) 8%, transparent)' : 'var(--color-surface-2)', border: `1px solid ${a.concluido ? 'color-mix(in srgb, var(--color-success) 20%, transparent)' : vencido ? 'color-mix(in srgb, var(--color-danger) 20%, transparent)' : 'var(--color-border)'}` }}>
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    {a.concluido && <span style={{ color: 'var(--color-success)', fontSize: 10 }}>✓</span>}
                                    {a.tipo && <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 6px' }}>{a.tipo}</span>}
                                    <span style={{ color: 'var(--color-text)' }}>{a.descricao}</span>
                                  </div>
                                  {a.vencimento && (
                                    <div style={{ fontSize: 10, color: vencido ? 'var(--color-danger)' : 'var(--color-text-faint)', marginTop: 2 }}>
                                      {vencido ? '⚠ VENCIDO — ' : '⏰ '}{formatDate(a.vencimento)}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
                          <div title={resp?.nome_simples || '—'} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                            {iniciais}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, verticalAlign: 'top', color: 'var(--color-success)' }}>
                          {proc.valor_ato > 0 ? `R$ ${fmtBRL(proc.valor_ato)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Modal Alterar Status ──────────────────────────────────────
function ModalAlterarStatus({ processo, onClose, onSalvar, registroEditar = null }) {
  const hoje = new Date().toISOString().split('T')[0];
  const [novoStatus, setNovoStatus] = useState(registroEditar?.status_novo || '');
  const [obs, setObs]               = useState(registroEditar?.obs || '');
  const [dtAlteracao, setDtAlteracao] = useState(registroEditar?.dt_alteracao?.split('T')[0] || hoje);
  const [salvando, setSalvando]     = useState(false);
  const editando = !!registroEditar;

  const statusDisponiveis = editando
    ? STATUS_OPTS
    : STATUS_OPTS.filter(s => s !== processo.status);

  const salvar = async () => {
    if (!novoStatus) return;
    setSalvando(true);
    await onSalvar(novoStatus, obs, dtAlteracao, registroEditar?.id);
    setSalvando(false);
    onClose();
  };

  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{ width: 'min(460px, 96vw)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="modal-header">
            <div style={{ fontWeight: 700, fontSize: 15 }}>{editando ? '✎ Editar Registro de Status' : 'Alterar Status do Processo'}</div>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!editando && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Status atual</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: (STATUS_CONF_GLOBAL[processo.status]?.cor || '#888') + '22', border: `1px solid ${STATUS_CONF_GLOBAL[processo.status]?.cor || '#888'}` }}>
                  <span>{STATUS_CONF_GLOBAL[processo.status]?.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: STATUS_CONF_GLOBAL[processo.status]?.cor }}>{processo.status}</span>
                </div>
              </div>
            )}
            {/* Novo status */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{editando ? 'Status' : 'Novo status'} *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {statusDisponiveis.map(s => {
                  const c = STATUS_CONF_GLOBAL[s] || {};
                  const sel = novoStatus === s;
                  return (
                    <button key={s} onClick={() => setNovoStatus(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: `2px solid ${sel ? c.cor : 'var(--color-border)'}`, background: sel ? c.cor + '22' : 'var(--color-surface-2)', cursor: 'pointer', fontWeight: sel ? 700 : 400, fontSize: 13, color: sel ? c.cor : 'var(--color-text-muted)', transition: 'all .15s' }}>
                      <span>{c.icon}</span> {s}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Data da alteração */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data da alteração</label>
              <input className="form-input" type="date" value={dtAlteracao} onChange={e => setDtAlteracao(e.target.value)} style={{ maxWidth: 200 }} />
            </div>
            {/* Observação */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observação (opcional)</label>
              <textarea className="form-input" rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex: Documento faltante, aguardando assinatura..." style={{ fontSize: 13, resize: 'vertical' }} />
            </div>
          </div>
          <div className="modal-footer" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={salvar} disabled={!novoStatus || salvando}>
              {salvando ? 'Salvando...' : editando ? '✓ Salvar Edição' : '✓ Confirmar Alteração'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Aba: Histórico de Situações ───────────────────────────────
function TabHistorico({ processoId, processo }) {
  const { processoHistorico, alterarStatusProcesso } = useApp();
  const historico = processoHistorico.filter(h => h.processo_id === processoId);
  const [editando, setEditando] = useState(null);

  if (historico.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-faint)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
        <div>Nenhuma alteração de status registrada ainda.</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>As mudanças de status aparecerão aqui com data e observação.</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', paddingLeft: 28 }}>
      <div style={{ position: 'absolute', left: 10, top: 8, bottom: 8, width: 2, background: 'var(--color-border)', borderRadius: 2 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {historico.map((h, i) => {
          const c = STATUS_CONF_GLOBAL[h.status_novo] || { cor: '#888', icon: '●' };
          return (
            <div key={h.id} style={{ position: 'relative', paddingBottom: 20 }}>
              <div style={{ position: 'absolute', left: -22, top: 4, width: 14, height: 14, borderRadius: '50%', background: c.cor, border: '2px solid var(--color-surface)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }} />
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: h.obs ? 6 : 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.cor }}>{c.icon} {h.status_novo}</span>
                  {h.status_anterior && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>← {h.status_anterior}</span>
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{formatDate(h.dt_alteracao)}</span>
                    {h.usuarios?.nome_simples && (
                      <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>por {h.usuarios.nome_simples}</span>
                    )}
                    <button className="btn-icon btn-sm" style={{ fontSize: 12, opacity: 0.7 }} onClick={() => setEditando(h)} title="Editar">✎</button>
                  </div>
                </div>
                {h.obs && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--color-border)', paddingTop: 6, marginTop: 4 }}>"{h.obs}"</div>}
              </div>
            </div>
          );
        })}
      </div>
      {editando && (
        <ModalAlterarStatus
          processo={processo}
          registroEditar={editando}
          onClose={() => setEditando(null)}
          onSalvar={async (novoStatus, obs, dtAlteracao, id) => {
            await alterarStatusProcesso(processoId, null, novoStatus, obs, dtAlteracao, id);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function formatBRL(v) {
  // v vem do banco como número (ex: 143.54) — formata direto sem manipular string
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function parseBRL(s) {
  // Usuário digita estilo BR (1.234,56) ou US (1234.56) — normaliza ambos
  const str = String(s || '').trim();
  // Se tem vírgula, trata como BR: remove pontos de milhar, troca vírgula por ponto
  if (str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Sem vírgula: número direto (ex: 143.54)
  return parseFloat(str) || 0;
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

// ── Aba: Ofícios Expedidos ────────────────────────────────────
function TabOficiosExpedidos({ processoId }) {
  const { oficios, usuarios } = useApp();
  const lista = (oficios || []).filter(o => o.processo_id === processoId);

  const statusBadge = (s) => {
    const conf = {
      'Enviado':    { bg: '#dbeafe', color: '#1e40af' },
      'Respondido': { bg: '#dcfce7', color: '#15803d' },
      'Pendente':   { bg: '#fef9c3', color: '#854d0e' },
      'Arquivado':  { bg: '#f3f4f6', color: '#6b7280' },
    };
    const c = conf[s] || conf['Pendente'];
    return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: c.bg, color: c.color }}>{s}</span>;
  };

  if (lista.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-faint)' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>✉</div>
        <div>Nenhum ofício expedido vinculado a este processo.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {lista.map(o => {
        const resp = usuarios.find(u => u.id === o.responsavel_id);
        return (
          <div key={o.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', background: 'var(--color-surface-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13 }}>
                    {o.numero || '—'}
                  </span>
                  {statusBadge(o.status)}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{o.assunto}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  Destinatário: <strong>{o.destinatario}</strong>
                </div>
                {resp && (
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>
                    Responsável: {resp.nome_simples}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {o.dt_oficio ? new Date(o.dt_oficio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                </div>
                {o.mes_ano && <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{o.mes_ano}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Aba: Dados do Processo ────────────────────────────────────
// ── Modal Adicionar Interessado (busca + cadastro) ─────────────
function ModalAdicionarInteressado({ interessados, onAdicionar, onClose }) {
  const [busca,    setBusca]    = useState('');
  const [cadastro, setCadastro] = useState(false);
  const [form,     setForm]     = useState({ nome: '', cpf: '', rg: '', email: '', telefone: '', endereco: '' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const opcoes = busca.length > 0
    ? interessados.filter(i =>
        i.ativo !== false &&
        (i.nome.toLowerCase().includes(busca.toLowerCase()) || (i.cpf || '').includes(busca))
      ).slice(0, 8)
    : [];

  const abrirCadastro = (nome) => { setForm(p => ({ ...p, nome })); setCadastro(true); };

  if (cadastro) {
    return (
      <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal">
          <div className="modal-header">
            <span className="modal-title">Cadastrar Novo Interessado</span>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-grid form-grid-2">
              <div className="form-group form-full"><label className="form-label">Nome *</label><input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} autoFocus /></div>
              <div className="form-group"><label className="form-label">CPF/CNPJ</label><input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" /></div>
              <div className="form-group"><label className="form-label">RG</label><input className="form-input" value={form.rg} onChange={e => set('rg', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Telefone</label><input className="form-input" value={form.telefone} onChange={e => set('telefone', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">E-mail</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
              <div className="form-group form-full"><label className="form-label">Endereço</label><input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost btn-sm" onClick={() => setCadastro(false)}>← Voltar</button>
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => { if (!form.nome.trim()) { alert('Nome obrigatório'); return; } onAdicionar(form, true); }}>Salvar e Adicionar</button>
          </div>
        </div>
      </div></Portal>
    );
  }

  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Adicionar Interessado</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Buscar pelo nome ou CPF</label>
            <input className="form-input" value={busca} onChange={e => setBusca(e.target.value)}
              autoFocus placeholder="Digite para buscar..." />
          </div>
          <div style={{ marginTop: 8, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', minHeight: 48 }}>
            {busca.length === 0 && (
              <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'center' }}>
                Digite um nome para buscar
              </div>
            )}
            {busca.length > 0 && opcoes.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'center' }}>
                Nenhum resultado para "{busca}"
              </div>
            )}
            {opcoes.map(i => (
              <button key={i.id} onClick={() => onAdicionar(i, false)}
                style={{ display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', color: 'var(--color-text)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)' }}>{i.nome}</span>
                {i.cpf && <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{i.cpf}</span>}
              </button>
            ))}
            {busca.length > 0 && (
              <button onClick={() => abrirCadastro(busca)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', background: 'none', border: 'none', borderTop: opcoes.length > 0 ? '1px solid var(--color-border)' : 'none', cursor: 'pointer', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                + Cadastrar novo: "{busca}"
              </button>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div></Portal>
  );
}

function TabDados({ proc, editando, onChange, servicos, usuarios, interessados, onCadastrarNovoInt }) {
  const categorias  = [...new Set(servicos.map(s => s.categoria))];
  const especies    = servicos.filter(s => !proc.categoria || s.categoria === proc.categoria).map(s => s.subcategoria);
  const partes      = (() => { try { return JSON.parse(proc.partes || '[]'); } catch { return []; } })();

  const inp = (v, k, opts = {}) => editando
    ? <input className="form-input" value={v || ''} onChange={e => onChange(k, e.target.value)} style={{ fontSize: 12, ...opts.style }} placeholder={opts.ph || ''} />
    : <div style={{ fontSize: 13, padding: '6px 0', color: v ? 'var(--color-text)' : 'var(--color-text-faint)', minHeight: 28 }}>{v || '—'}</div>;

  // Campo de data com máscara dd/mm/aaaa (converte de/para ISO aaaa-mm-dd internamente)
  const isoToBr = (iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return iso;
  };
  const brToIso = (br) => {
    const clean = br.replace(/\D/g, '');
    if (clean.length === 8) return `${clean.slice(4)}-${clean.slice(2,4)}-${clean.slice(0,2)}`;
    return br;
  };
  const maskDate = (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0,2)}/${digits.slice(2)}`;
    return `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;
  };
  const inpDate = (v, k) => editando
    ? <input
        className="form-input"
        value={isoToBr(v)}
        onChange={e => {
          const masked = maskDate(e.target.value);
          const digits = masked.replace(/\D/g, '');
          onChange(k, digits.length === 8 ? brToIso(masked) : masked);
        }}
        placeholder="dd/mm/aaaa"
        maxLength={10}
        style={{ fontSize: 12 }}
      />
    : <div style={{ fontSize: 13, padding: '6px 0', color: v ? 'var(--color-text)' : 'var(--color-text-faint)', minHeight: 28 }}>{isoToBr(v) || '—'}</div>;

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
              ? <select className="form-select" value={proc.status || ''} onChange={e => {
                  const s = e.target.value;
                  onChange('status', s);
                  if (s === 'Concluído' && !proc.dt_conclusao) onChange('dt_conclusao', HOJE());
                  if (s === 'Encerrado' && !proc.dt_encerramento) onChange('dt_encerramento', HOJE());
                }} style={{ fontSize: 12 }}>
                  {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                </select>
              : <div style={{ fontSize: 13, padding: '6px 0', color: STATUS_CONF_GLOBAL[proc.status]?.cor || 'var(--color-text)', fontWeight: 600 }}>
                  {STATUS_CONF_GLOBAL[proc.status]?.icon} {proc.status || '—'}
                </div>
            }
          </Campo>
          {(editando || proc.dt_conclusao) && proc.status === 'Concluído' && (
            <Campo label="Dt. Conclusão">
              {editando
                ? <input className="form-input" type="date" value={proc.dt_conclusao || ''} onChange={e => onChange('dt_conclusao', e.target.value)} style={{ fontSize: 12 }} />
                : <div style={{ fontSize: 13, padding: '6px 0', color: 'var(--color-success)', fontWeight: 600 }}>{formatDate(proc.dt_conclusao)}</div>
              }
            </Campo>
          )}
          {(editando || proc.dt_encerramento) && proc.status === 'Encerrado' && (
            <Campo label="Dt. Encerramento">
              {editando
                ? <input className="form-input" type="date" value={proc.dt_encerramento || ''} onChange={e => onChange('dt_encerramento', e.target.value)} style={{ fontSize: 12 }} />
                : <div style={{ fontSize: 13, padding: '6px 0', color: '#64748b', fontWeight: 600 }}>{formatDate(proc.dt_encerramento)}</div>
              }
            </Campo>
          )}
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
          <Campo label="Quantidade">
            {editando
              ? <input className="form-input" type="number" min="1" value={proc.quantidade || 1} onChange={e => onChange('quantidade', parseInt(e.target.value)||1)} style={{ fontSize: 12 }} />
              : <div style={{ fontSize: 13, padding: '6px 0', fontWeight: (proc.quantidade||1) > 1 ? 700 : 400, color: (proc.quantidade||1) > 1 ? 'var(--color-accent)' : 'var(--color-text)' }}>
                  {proc.quantidade || 1}{(proc.quantidade||1) > 1 && <span style={{ fontSize:11, color:'var(--color-text-muted)', marginLeft:5 }}>serviços neste lançamento</span>}
                </div>
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
          <Campo label="Dt. Conclusão">{inpDate(proc.dt_conclusao, 'dt_conclusao')}</Campo>
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
function gerarRequerimento(proc, certidoes, usuarios, cartorio, usuarioLogado) {
  // Usa o usuário logado como requerente (quem assina o requerimento)
  const req = usuarioLogado
    ? {
        nome:     usuarioLogado.nome_completo || usuarioLogado.nome_simples || '',
        cpf:      usuarioLogado.cpf      || '',
        rg:       usuarioLogado.rg       || '',
        endereco: usuarioLogado.endereco || '',
        cidade:   usuarioLogado.cidade   || 'Paranatinga - MT',
        cep:      usuarioLogado.cep      || '',
        email:    usuarioLogado.email    || '',
        telefone: usuarioLogado.celular  || '',
      }
    : { nome: '', cpf: '', rg: '', endereco: '', cidade: 'Paranatinga - MT', cep: '', email: '', telefone: '' };

  const hoje         = new Date().toLocaleDateString('pt-BR');
  const cidadeData   = cartorio?.cidade || 'Paranatinga-MT';
  const nomeCartorio = cartorio?.nome || '';
  const oficial      = 'Oficial Registrador';

  const linhasCert = certidoes.map(c => {
    const matriculas = (c.descricao || c.obs || '').split('\n').filter(l => l.trim());
    const totalLinhas = Math.max(1, matriculas.length);
    if (totalLinhas <= 1) {
      return `<tr>
        <td style="border:1px solid #aaa;padding:4px 8px;font-size:11px;width:90px;">${c.dt_pedido ? new Date(c.dt_pedido+'T12:00:00').toLocaleDateString('pt-BR') : ''}</td>
        <td style="border:1px solid #aaa;padding:4px 8px;font-size:11px;width:170px;">${c.tipo||''}</td>
        <td style="border:1px solid #aaa;padding:4px 8px;font-size:11px;">${matriculas[0]||''}</td>
      </tr>`;
    }
    // Múltiplas matrículas: primeira linha com rowspan para data e tipo
    const primeiraLinha = `<tr>
      <td rowspan="${totalLinhas}" style="border:1px solid #aaa;padding:4px 8px;font-size:11px;width:90px;vertical-align:middle;">${c.dt_pedido ? new Date(c.dt_pedido+'T12:00:00').toLocaleDateString('pt-BR') : ''}</td>
      <td rowspan="${totalLinhas}" style="border:1px solid #aaa;padding:4px 8px;font-size:11px;width:170px;vertical-align:middle;">${c.tipo||''}</td>
      <td style="border:1px solid #aaa;padding:4px 8px;font-size:11px;">${matriculas[0]}</td>
    </tr>`;
    const demaisLinhas = matriculas.slice(1).map(m => `<tr>
      <td style="border:1px solid #aaa;padding:4px 8px;font-size:11px;">${m}</td>
    </tr>`).join('');
    return primeiraLinha + demaisLinhas;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  @page { size: A4 portrait; margin: 16mm 18mm 16mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; width: 100%; }
  .cab { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .cab h2 { font-size: 13px; font-weight: bold; text-transform: uppercase; line-height: 1.4; margin-bottom: 3px; }
  .cab-sep { border: none; border-top: 1px solid #000; width: 55%; margin: 5px auto; }
  .cab h3 { font-size: 12px; font-weight: normal; }
  .titulo-req { background: #ddd; text-align: center; font-size: 15px; font-weight: bold; padding: 6px; margin-bottom: 10px; }
  .proc-row { display: flex; justify-content: flex-end; margin-bottom: 10px; }
  .proc-box { border: 1px solid #888; padding: 3px 14px 3px 10px; font-size: 11px; display: flex; align-items: center; gap: 8px; }
  .proc-box strong { font-size: 16px; }
  /* Campos */
  .campo-bloco { width: 100%; border-collapse: collapse; margin-bottom: 5px; }
  .campo-bloco td { border: 1px solid #999; padding: 3px 8px; vertical-align: top; }
  .flabel { font-size: 9px; color: #555; display: block; margin-bottom: 1px; }
  .fval   { font-size: 12px; min-height: 17px; display: block; }
  /* Tabela certidões */
  .tab-cert { width: 100%; border-collapse: collapse; margin: 12px 0; }
  .tab-cert th { border: 1px solid #aaa; padding: 4px 8px; background: #eee; font-size: 11px; text-align: left; }
  /* Assinatura */
  .assin-area { margin-top: 36px; text-align: center; }
  .assin-linha { display: inline-block; border-top: 1px solid #000; padding-top: 4px; min-width: 240px; text-align: center; font-size: 12px; }
  /* LGPD */
  .lgpd { border: 1px solid #ccc; padding: 9px 12px; margin-top: 22px; font-size: 10px; line-height: 1.55; text-align: justify; }
  .lgpd p { margin-bottom: 6px; }
  .lgpd p:last-child { margin-bottom: 0; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>

<div class="cab">
  <h2>${nomeCartorio}</h2>
  <hr class="cab-sep">
  <h3>${oficial}</h3>
</div>

<div class="titulo-req">Requerimento - Pedido de Certidão</div>

<div class="proc-row">
  <div class="proc-box">Processo Interno <strong>${proc.numero_interno||''}</strong></div>
</div>

<!-- Requerente -->
<table class="campo-bloco"><tr>
  <td style="width:100%;"><span class="flabel">Requerente</span><span class="fval">${req.nome||''}</span></td>
</tr></table>

<table class="campo-bloco"><tr>
  <td style="width:50%;"><span class="flabel">CPF</span><span class="fval">${req.cpf||''}</span></td>
  <td style="width:50%;"><span class="flabel">Registro Geral</span><span class="fval">${req.rg||''}</span></td>
</tr></table>

<table class="campo-bloco"><tr>
  <td style="width:100%;"><span class="flabel">Endereço</span><span class="fval">${req.endereco||''}</span></td>
</tr></table>

<table class="campo-bloco"><tr>
  <td style="width:60%;"><span class="flabel">Cidade</span><span class="fval">${req.cidade||cidadeData}</span></td>
  <td style="width:40%;"><span class="flabel">CEP</span><span class="fval">${req.cep||''}</span></td>
</tr></table>

<table class="campo-bloco"><tr>
  <td style="width:60%;"><span class="flabel">Email</span><span class="fval">${req.email||''}</span></td>
  <td style="width:40%;"><span class="flabel">Celular</span><span class="fval">${req.telefone||''}</span></td>
</tr></table>

<!-- Certidões -->
<table class="tab-cert">
  <thead><tr>
    <th style="width:90px;">Dt Pedido</th>
    <th style="width:170px;">Tipo Certidão</th>
    <th>Detalhes do Pedido - Matrícula</th>
  </tr></thead>
  <tbody>${linhasCert}</tbody>
</table>

<div style="font-size:12px;margin-top:16px;">${cidadeData}, &nbsp;&nbsp;&nbsp; ${hoje}</div>

<div class="assin-area">
  <div class="assin-linha">
    <div>${req.nome||''}</div>
    <div style="font-size:10px;color:#555;">Requerente</div>
  </div>
</div>

<div class="lgpd">
  <p>Estou ciente de que os dados são tratados de acordo com o regime jurídico da publicidade notarial e registral, bem como nos processos judiciais ou administrativos, atos notariais e registrais ou cidadania, consoante os §§ 4º e 5º, artigo 233, da Lei Federal nº13.709/2018 – LGPD, e que os dados coletados têm finalidade para efetuar qualificação notarial e/ou registral, cadastramento no sistema interno, publicações de editais onde há previsão legal e compartilhamento com Centrais Nacionais, Conselho Nacional de Justiça e a Central Eletrônica de Informações e Integração (CEI-MT).</p>
  <p>Art. 31 Para a expedição de certidão ou Informação restrita ao que constar nos Indicadores e Índices pessoais deverá ser exigida a identificação do requerente, por escrito, bem como a finalidade da solicitação, para fins de anotação da solicitação em prontuário, mantido em pasta física ou digital, que viabilizará o exercício da autodeterminação informativa do titular do dado pessoal, não se responsabilizando o delegatário pelo exame desta finalidade, salvo na hipótese de manifesta ilicitude penal, caso em que deverá negar o pedido.</p>
  <p>Art. 23. O tratamento de dados pessoais pelas pessoas jurídicas de direito público referidas no parágrafo único do art. 1º da Lei nº 12.527, de 18 de novembro de 2011 (Lei de Acesso à Informação), deverá ser realizado para o atendimento de sua finalidade pública, na persecução do interesse público, com o objetivo de executar as competências legais ou cumprir as atribuições legais do serviço público, desde que: § 4º Os serviços notariais e de registro exercidos em caráter privado, por delegação do Poder Público, terão o mesmo tratamento dispensado às pessoas jurídicas referidas no caput deste artigo, nos termos desta Lei. § 5º Os órgãos notariais e de registro devem fornecer acesso aos dados por meio eletrônico para a administração pública, tendo em vista as finalidades de que trata o caput deste artigo.</p>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=820,height=1100');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}


function gerarArquivoAtos(proc, interessados, cartorio) {
  const partes      = (() => { try { return JSON.parse(proc.partes || '[]'); } catch { return []; } })();
  const nomeSimples = cartorio?.nome_simples || cartorio?.nome || '';
  const endereco    = cartorio?.endereco || '';
  const cidade      = cartorio?.cidade   || '';
  const telefone    = cartorio?.telefone || '';
  const email       = cartorio?.email    || '';
  const logo        = cartorio?.logo_url  || '';
  const dtConc      = proc.dt_conclusao
    ? new Date(proc.dt_conclusao + 'T12:00:00').toLocaleDateString('pt-BR') : '';

  const linhasPartes = partes.map(p => {
    const int     = interessados.find(i => String(i.id) === String(p.id));
    const nome    = int?.nome || p.nome || '';
    const vinculo = p.vinculo || 'Parte';
    return `<tr>
      <td style="width:130px;padding:5px 10px;border:1px solid #aaa;background:#f0f0f0;font-size:12px;">${vinculo}</td>
      <td style="padding:5px 10px;border:1px solid #aaa;font-size:12px;">${nome}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title></title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20mm; }
  @media print {
    body { padding: 20mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: A4 portrait; }
  }
  .cab { display: flex; align-items: center; gap: 18px; padding-bottom: 10px; border-bottom: 2px solid #000; }
  .logo-box { width: 88px; height: 68px; border: 1px solid #bbb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
  .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .logo-txt { font-size: 9px; color: #aaa; }
  .cab-info { flex: 1; text-align: center; }
  .cab-nome { font-size: 17px; font-weight: bold; line-height: 1.2; margin-bottom: 4px; }
  .cab-sub  { font-size: 11px; color: #222; line-height: 1.6; }

  /* === FAIXA: 3cm abaixo do cabeçalho === */
  .titulo { margin-top: 1.5cm; background: #b8cce4; text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 3px; padding: 6px 0; }
  .sep { border: none; border-top: 1px solid #888; margin: 3px 0; }

  /* === Nº INTERNO: 2.5cm abaixo da faixa === */
  .proc-row { margin-top: 1.25cm; display: flex; justify-content: flex-end; }
  .proc-box { border: 1px solid #888; padding: 4px 16px 4px 10px; font-size: 11px; display: flex; align-items: center; gap: 10px; }
  .proc-box strong { font-size: 18px; font-weight: bold; }

  /* === ESPÉCIE: 3cm abaixo do Nº interno === */
  .bloco-especie { margin-top: 1.5cm; }
  .label { font-size: 10px; color: #555; margin-bottom: 3px; }
  .caixa { border: 1px solid #888; padding: 5px 10px; font-size: 13px; font-weight: bold; text-align: center; width: 100%; }

  /* === INTERESSADOS: 2.5cm abaixo da espécie === */
  .bloco-partes { margin-top: 1.25cm; }
  .tab-partes { width: 100%; border-collapse: collapse; }

  /* === DESCRIÇÃO: 3cm abaixo dos interessados === */
  .bloco-desc { margin-top: 1.5cm; }
  .desc-box { border: 1px solid #888; padding: 7px 10px; font-size: 12px; min-height: 48px; width: 100%; }

  /* === QUADRO ATO: 3.5cm abaixo da descrição === */
  .bloco-ato { margin-top: 1.75cm; display: flex; justify-content: flex-end; }
  .livro-tab { border-collapse: collapse; }
  .livro-tab td { border: 1px solid #888; padding: 5px 14px; font-size: 12px; }
  .livro-tab .lbl { background: #f0f0f0; width: 80px; }
  .livro-tab .val { font-weight: bold; min-width: 110px; text-align: right; }

  /* === RODAPÉ === */
  .rodape { clear: both; border-top: 1px solid #888; margin-top: 40px; }
</style>
</head><body>

<div class="cab">
  <div class="logo-box">
    ${logo ? `<img src="${logo}" alt="Logo">` : '<span class="logo-txt">Logo</span>'}
  </div>
  <div class="cab-info">
    <div class="cab-nome">${nomeSimples}</div>
    <div class="cab-sub">
      ${endereco}<br>
      ${[telefone, email].filter(Boolean).join(' - ')}<br>
      ${cidade}
    </div>
  </div>
</div>

<div class="titulo">Controle de Acervo Extrajudicial</div>
<hr class="sep"><hr class="sep" style="margin-top:2px;">

<div class="proc-row">
  <div class="proc-box">Processo Interno <strong>${proc.numero_interno || ''}</strong></div>
</div>

<div class="bloco-especie">
  <div class="label">Especie</div>
  <div class="caixa">${proc.especie || ''}</div>
</div>

<div class="bloco-partes">
  <table class="tab-partes">${linhasPartes}</table>
</div>

<div class="bloco-desc">
  <div class="label">Descrição Ato</div>
  <div class="desc-box">${proc.esc_descricao || proc.obs || ''}</div>
</div>

<div class="bloco-ato">
  <table class="livro-tab">
    <tr><td class="lbl">Livro Ato</td><td class="val">${proc.livro_ato   || ''}</td></tr>
    <tr><td class="lbl">Folhas Ato</td><td class="val">${proc.folhas_ato || ''}</td></tr>
    <tr><td class="lbl">Data</td><td class="val">${dtConc}</td></tr>
  </table>
</div>

<div class="rodape"></div>
</body></html>`;

  const w = window.open('', '_blank', 'width=840,height=1150');
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}


function TabCertidoes({ proc, editando, onChange, interessados, cartorio, usuarios, processoId, editProcesso, usuario }) {
  const [certLocal, setCertLocal] = useState(
    () => { try { return JSON.parse(proc.certidoes || '[]'); } catch { return []; } }
  );

  // Sincroniza quando proc.certidoes muda externamente
  useEffect(() => {
    try { setCertLocal(JSON.parse(proc.certidoes || '[]')); } catch { setCertLocal([]); }
  }, [proc.certidoes]);

  const EMPTY_CERT = { dt_pedido: HOJE(), tipo: '', descricao: '', concluido: false };

  const salvarCertidoes = (nova) => {
    setCertLocal(nova);
    const json = JSON.stringify(nova);
    onChange('certidoes', json);
    editProcesso(processoId, { ...proc, certidoes: json });
  };

  const add    = () => salvarCertidoes([...certLocal, { ...EMPTY_CERT }]);
  const remove = (idx) => salvarCertidoes(certLocal.filter((_, i) => i !== idx));

  // update local sem salvar ainda (evita requisição por tecla)
  const updateLocal = (idx, k, v) => {
    setCertLocal(prev => prev.map((c, i) => i === idx ? { ...c, [k]: v } : c));
  };
  // flush: salva no banco ao sair do campo
  const flush = () => {
    const json = JSON.stringify(certLocal);
    onChange('certidoes', json);
    editProcesso(processoId, { ...proc, certidoes: json });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{certLocal.length} pedido(s) de certidão</span>
        <button className="btn btn-primary btn-sm" onClick={add}>+ Adicionar</button>
      </div>

      {certLocal.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-faint)', fontSize: 13 }}>
          Clique em "+ Adicionar" para registrar um pedido.
        </div>
      )}

      {certLocal.length > 0 && (
        <div>
          {/* Cabeçalho */}
          <div style={{ display: 'grid', gridTemplateColumns: '110px 180px 1fr 110px 28px', gap: 8, padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)', marginBottom: 4 }}>
            <span>Dt. Pedido</span><span>Tipo</span><span>Descrição / Matrícula</span><span></span><span></span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {certLocal.map((c, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '110px 180px 1fr 110px 28px', gap: 8, padding: '8px 10px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', alignItems: 'start' }}>
                <input className="form-input" type="date" value={c.dt_pedido || ''} onChange={e => updateLocal(idx, 'dt_pedido', e.target.value)} onBlur={flush} style={{ fontSize: 11, padding: '4px 6px', height: 28 }} />
                <select className="form-select" value={c.tipo || ''} onChange={e => salvarCertidoes(certLocal.map((x, i) => i === idx ? { ...x, tipo: e.target.value } : x))} style={{ fontSize: 11, padding: '4px 6px', height: 28 }}>
                  <option value="">—</option>{TIPOS_CERT.map(t => <option key={t}>{t}</option>)}
                </select>
                <textarea
                  className="form-input"
                  value={c.descricao || ''}
                  onChange={e => updateLocal(idx, 'descricao', e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); updateLocal(idx, 'descricao', (c.descricao || '') + String.fromCharCode(10)); } }}
                  rows={Math.max(1, (c.descricao || '').split(String.fromCharCode(10)).length)}
                  style={{ fontSize: 11, padding: '4px 6px', resize: 'none', lineHeight: '1.6', minHeight: 28 }}
                  placeholder="Ex: Matrícula nº 123, livro 02-A — Enter para nova matrícula"
                  onBlur={flush}
                />
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 8px', height: 28, alignSelf: 'flex-start' }}
                  onClick={() => gerarRequerimento(proc, [c], usuarios, cartorio, usuario)}>
                  🖨 Imprimir
                </button>
                <button onClick={() => remove(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 16, padding: 0, alignSelf: 'flex-start', marginTop: 4 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modal Principal ───────────────────────────────────────────
export { ModalTelaAndamento };
export default function ProcessoDetalhe({ processo, onClose, inline = false }) {
  const { editProcesso, alterarStatusProcesso, processoHistorico, usuarios, servicos, interessados, addInteressado, addToast, cartorio, oficios, usuario } = useApp();
  const [aba, setAba]                   = useState('dados');
  const [editando, setEditando]         = useState(false);
  const [form, setForm]                 = useState({ ...processo });
  const [salvando, setSalvando]         = useState(false);
  const [modalStatus, setModalStatus]   = useState(false);
  const [modalNovoInt, setModalNovoInt] = useState(false);

  // Sincroniza se o processo mudar externamente
  useEffect(() => { if (!editando) setForm({ ...processo }); }, [processo]);

  const onChange = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const adicionarInteressadoAoForm = (interessado) => {
    const partesAtuais = (() => { try { return JSON.parse(form.partes || '[]'); } catch { return []; } })();
    const jaExiste = partesAtuais.find(p => p.id === interessado.id);
    if (jaExiste) return;
    onChange('partes', JSON.stringify([...partesAtuais, { id: interessado.id, nome: interessado.nome, cpf: interessado.cpf || '', vinculo: 'Outorgante' }]));
  };

  const handleAdicionarInteressado = async (dados, isNovo) => {
    if (isNovo) {
      const novo = await addInteressado(dados);
      if (novo) adicionarInteressadoAoForm(novo);
    } else {
      adicionarInteressadoAoForm(dados);
    }
    setModalNovoInt(false);
  };

  const salvar = async () => {
    if (!form.numero_interno?.trim()) { addToast('Nº Interno obrigatório.', 'error'); return; }
    setSalvando(true);
    await editProcesso(processo.id, form);
    setSalvando(false);
    setEditando(false);
  };

  const descartar = () => { setForm({ ...processo }); setEditando(false); };

  const handleAlterarStatus = async (novoStatus, obs, dtAlteracao) => {
    await alterarStatusProcesso(processo.id, processo.status, novoStatus, obs, dtAlteracao);
  };

  const conf = STATUS_CONF_GLOBAL[form.status] || { cor: 'var(--color-text-faint)', sigla: '??', icon: '?' };
  const isPendente = STATUS_PENDENTES.includes(form.status);

  const andsDoProcesso = useApp().andamentos.filter(a => a.processo_id === processo.id);
  const andsPendentes  = andsDoProcesso.filter(a => !a.concluido).length;
  const qtdHistorico   = (processoHistorico || []).filter(h => h.processo_id === processo.id).length;

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
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => setModalStatus(true)}
                    style={{ background: conf.cor + '18', borderColor: conf.cor, color: conf.cor }}>
                    {conf.icon} Alterar Status
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditando(true)}>✎ Editar</button>
                </>
              )}
              <button className="btn-icon" onClick={onClose}>✕</button>
            </div>
          </div>

          {/* Abas */}
          <div className="tabs" style={{ flexShrink: 0, padding: '0 20px', borderBottom: '1px solid var(--color-border)' }}>
            {[
              ['dados', 'Dados do Processo'],
              ['andamentos', `Andamentos${andsPendentes > 0 ? ` (${andsPendentes})` : ''}`],
              ['historico', `Histórico${qtdHistorico > 0 ? ` (${qtdHistorico})` : ''}`],
              ['oficios', `Ofícios Expedidos${(oficios||[]).filter(o=>o.processo_id===processo.id).length > 0 ? ` (${(oficios||[]).filter(o=>o.processo_id===processo.id).length})` : ''}`],
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
                onCadastrarNovoInt={() => setModalNovoInt(true)}
              />
            )}
            {aba === 'andamentos' && (
              <TabAndamentos processoId={processo.id} usuarios={usuarios} />
            )}
            {aba === 'historico' && (
              <TabHistorico processoId={processo.id} processo={processo} />
            )}
            {aba === 'oficios' && (
              <TabOficiosExpedidos processoId={processo.id} />
            )}
            {aba === 'certidoes' && (
              <TabCertidoes proc={form} editando={editando} onChange={onChange} interessados={interessados} cartorio={cartorio} usuarios={usuarios} processoId={processo.id} editProcesso={editProcesso} usuario={usuario} />
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ flexShrink: 0, gap: 8, flexWrap: 'wrap' }}>
            {aba === 'dados' && !editando && (
              <button className="btn btn-secondary btn-sm" onClick={() => gerarArquivoAtos(form, interessados, cartorio)} style={{ marginRight: 'auto' }}>
                🖨 Arquivo de Atos
              </button>
            )}

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

  return (
    <>
      {inline ? inner : (
        <Portal>
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            {inner}
          </div>
        </Portal>
      )}
      {modalStatus && (
        <ModalAlterarStatus
          processo={form}
          onClose={() => setModalStatus(false)}
          onSalvar={handleAlterarStatus}
        />
      )}
      {modalNovoInt && (
        <ModalAdicionarInteressado
          interessados={interessados}
          onAdicionar={handleAdicionarInteressado}
          onClose={() => setModalNovoInt(false)}
        />
      )}
    </>
  );
}
