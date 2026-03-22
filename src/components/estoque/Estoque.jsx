import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const UNIDADES = ['unid', 'pct', 'cx', 'resma', 'rolo', 'fls'];

const EMPTY_ITEM = {
  nome: '', unidade: 'unid', quantidade_atual: 0, quantidade_minima: 0,
  fornecedor: '', contato: '', observacoes: '', fls_por_pct: 0,
};

// Retorna total de folhas se pct, senão null
const totalFls = (item) => item.unidade === 'pct' && item.fls_por_pct > 0
  ? item.quantidade_atual * item.fls_por_pct : null;

function BarraEstoque({ atual, minimo }) {
  const pct = minimo > 0 ? Math.min((atual / (minimo * 3)) * 100, 100) : 100;
  const cor = atual <= 0 ? '#dc2626' : atual <= minimo ? '#f59e0b' : '#16a34a';
  return (
    <div style={{ height: 6, background: 'var(--color-surface-3)', borderRadius: 4, overflow: 'hidden', minWidth: 80 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width .3s' }} />
    </div>
  );
}

function BadgeEstoque({ atual, minimo }) {
  if (atual <= 0)    return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626' }}>Esgotado</span>;
  if (atual <= minimo) return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#b45309' }}>Crítico</span>;
  return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>OK</span>;
}

export default function Estoque() {
  const { supabaseClient: sb, usuario, addToast } = useApp();
  const [aba, setAba] = useState('itens');
  const [itens, setItens] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [destinatarios, setDestinatarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  // Modal item
  const [modalItem, setModalItem] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formItem, setFormItem] = useState(EMPTY_ITEM);

  // Modal movimento
  const [modalMov, setModalMov] = useState(false);
  const [movItem, setMovItem] = useState(null);
  const [movTipo, setMovTipo] = useState('saida');
  const [movQtd, setMovQtd] = useState(1);
  const [movObs, setMovObs] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Modal destinatário
  const [modalDest, setModalDest] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [estoqueConfig, setEstoqueConfig] = useState(null);
  const [salvandoConfig, setSalvandoConfig] = useState(false);
  const [testando, setTestando] = useState(false);

  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: its }, { data: movs }, { data: dests }, { data: cfg }] = await Promise.all([
      sb.from('estoque_itens').select('*').order('nome'),
      sb.from('estoque_movimentos').select('*, usuarios(nome_simples)').order('criado_em', { ascending: false }).limit(100),
      sb.from('estoque_alerta_destinatarios').select('*').order('email'),
      sb.from('estoque_config').select('*').limit(1).single(),
    ]);
    setItens(its || []);
    setMovimentos(movs || []);
    setDestinatarios(dests || []);
    setEstoqueConfig(cfg || { hora_envio: '07:00', dias_semana: [1,2,3,4,5], ativo: true });
    setLoading(false);
  }, [sb]);

  useEffect(() => { carregar(); }, [carregar]);

  // ── Salvar item ──
  const salvarItem = async () => {
    if (!formItem.nome.trim()) return addToast('Nome obrigatório', 'error');
    setSalvando(true);
    const payload = { ...formItem, quantidade_atual: Number(formItem.quantidade_atual), quantidade_minima: Number(formItem.quantidade_minima), fls_por_pct: Number(formItem.fls_por_pct || 0) };
    if (editItem) {
      await sb.from('estoque_itens').update(payload).eq('id', editItem.id);
      addToast('Item atualizado', 'success');
    } else {
      await sb.from('estoque_itens').insert(payload);
      addToast('Item cadastrado', 'success');
    }
    setSalvando(false);
    setModalItem(false);
    carregar();
  };

  // ── Registrar movimento ──
  const registrarMovimento = async () => {
    if (!movQtd || Number(movQtd) <= 0) return addToast('Quantidade inválida', 'error');
    setSalvando(true);
    const item = itens.find(i => i.id === movItem);
    const novaQtd = movTipo === 'entrada'
      ? item.quantidade_atual + Number(movQtd)
      : item.quantidade_atual - Number(movQtd);

    if (movTipo === 'saida' && Number(movQtd) > item.quantidade_atual) {
      addToast(`Estoque insuficiente! Disponível: ${item.quantidade_atual} ${item.unidade}`, 'error');
      setSalvando(false);
      return;
    }

    await sb.from('estoque_movimentos').insert({
      item_id: movItem, tipo: movTipo, quantidade: Number(movQtd),
      responsavel_id: usuario.id, observacao: movObs || null,
    });

    // Atualiza quantidade e reseta alerta se entrada
    const updatePayload = { quantidade_atual: novaQtd };
    if (movTipo === 'entrada') updatePayload.alerta_enviado = false;
    await sb.from('estoque_itens').update(updatePayload).eq('id', movItem);

    // Verifica se precisa disparar alerta (ignora cache local do alerta_enviado)
    if (movTipo === 'saida' && novaQtd <= item.quantidade_minima) {
      dispararAlerta(); // fire and forget — não bloqueia o fluxo
    }

    addToast(`${movTipo === 'entrada' ? 'Entrada' : 'Saída'} registrada`, 'success');
    setSalvando(false);
    setModalMov(false);
    setMovObs('');
    setMovQtd(1);
    carregar();
  };

  // ── Disparar alerta via enviar-relatorio (acao: alerta_estoque) ──
  const dispararAlerta = async () => {
    const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    try {
      await fetch(`${supabaseUrl}/functions/v1/enviar-relatorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnon}` },
        body: JSON.stringify({ acao: 'alerta_estoque' }),
      });
    } catch (e) { console.error('Alerta estoque:', e); }
  };

  // ── Excluir item ──
  const excluirItem = async (id) => {
    if (!confirm('Excluir este item e todo o seu histórico de movimentos?')) return;
    await sb.from('estoque_movimentos').delete().eq('item_id', id);
    await sb.from('estoque_itens').delete().eq('id', id);
    addToast('Item excluído', 'success');
    carregar();
  };

  // ── Ativar/Inativar item ──
  const toggleAtivo = async (item) => {
    const novoStatus = !item.ativo;
    await sb.from('estoque_itens').update({ ativo: novoStatus }).eq('id', item.id);
    addToast(novoStatus ? 'Item reativado' : 'Item inativado — alertas suspensos', 'success');
    carregar();
  };

  // ── Excluir movimento (repõe estoque) ──
  const excluirMovimento = async (mov) => {
    const item = itens.find(i => i.id === mov.item_id);
    if (!item) return;
    if (!confirm(`Excluir este movimento? A quantidade de ${mov.quantidade} ${item.unidade} será ${mov.tipo === 'saida' ? 'reposta' : 'descontada'} do estoque.`)) return;
    // Repõe: saída excluída → soma de volta; entrada excluída → subtrai
    const novaQtd = mov.tipo === 'saida'
      ? item.quantidade_atual + mov.quantidade
      : item.quantidade_atual - mov.quantidade;
    await sb.from('estoque_movimentos').delete().eq('id', mov.id);
    await sb.from('estoque_itens').update({ quantidade_atual: Math.max(0, novaQtd) }).eq('id', item.id);
    addToast('Movimento excluído e estoque ajustado', 'success');
    carregar();
  };

  // ── Salvar config de alerta ──
  const salvarConfig = async () => {
    if (!estoqueConfig) return;
    setSalvandoConfig(true);
    if (estoqueConfig.id) {
      await sb.from('estoque_config').update({
        hora_envio: estoqueConfig.hora_envio,
        dias_semana: estoqueConfig.dias_semana,
        ativo: estoqueConfig.ativo,
      }).eq('id', estoqueConfig.id);
    } else {
      await sb.from('estoque_config').insert({
        hora_envio: estoqueConfig.hora_envio,
        dias_semana: estoqueConfig.dias_semana,
        ativo: estoqueConfig.ativo,
      });
    }
    addToast('Configuração salva', 'success');
    setSalvandoConfig(false);
    carregar();
  };

  // ── Testar alerta agora ──
  const testarAlerta = async () => {
    setTestando(true);
    const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/enviar-relatorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnon}` },
        body: JSON.stringify({ acao: 'alerta_estoque' }),
      });
      const data = await resp.json();
      if (data.ok) addToast('Alerta enviado com sucesso!', 'success');
      else addToast('Erro ao enviar: ' + (data.erro || 'desconhecido'), 'error');
    } catch (e) {
      addToast('Erro ao conectar com a função', 'error');
    }
    setTestando(false);
  };

  // ── Destinatários ──
  const adicionarDest = async () => {
    if (!novoEmail.trim() || !novoEmail.includes('@')) return addToast('E-mail inválido', 'error');
    await sb.from('estoque_alerta_destinatarios').insert({ email: novoEmail.trim() });
    setNovoEmail('');
    addToast('Destinatário adicionado', 'success');
    carregar();
  };
  const toggleDest = async (d) => {
    await sb.from('estoque_alerta_destinatarios').update({ ativo: !d.ativo }).eq('id', d.id);
    carregar();
  };
  const excluirDest = async (id) => {
    await sb.from('estoque_alerta_destinatarios').delete().eq('id', id);
    carregar();
  };

  const abrirMov = (itemId, tipo) => {
    setMovItem(itemId); setMovTipo(tipo); setMovQtd(1); setMovObs('');
    setModalMov(true);
  };
  const abrirEditar = (item) => {
    setEditItem(item);
    setFormItem({ nome: item.nome, unidade: item.unidade, quantidade_atual: item.quantidade_atual, quantidade_minima: item.quantidade_minima, fornecedor: item.fornecedor || '', contato: item.contato || '', observacoes: item.observacoes || '', fls_por_pct: item.fls_por_pct || 0 });
    setModalItem(true);
  };
  const abrirNovo = () => { setEditItem(null); setFormItem(EMPTY_ITEM); setModalItem(true); };

  const fmtData = (iso) => { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };
  const criticos = itens.filter(i => i.quantidade_atual <= i.quantidade_minima).length;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">Controle de Estoque</div>
          <div className="page-sub">Materiais do cartório</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Item</button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total de Itens', value: itens.length, color: 'var(--color-accent)' },
          { label: 'Itens Críticos', value: criticos, color: criticos > 0 ? '#f59e0b' : '#16a34a' },
          { label: 'Esgotados', value: itens.filter(i => i.quantidade_atual <= 0).length, color: '#dc2626' },
        ].map(c => (
          <div key={c.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        {[['itens','📦 Itens'],['historico','📋 Histórico'],['destinatarios','📧 Alertas']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${aba === id ? 'active' : ''}`} onClick={() => setAba(id)}>{label}</button>
        ))}
      </div>

      {/* ── ABA ITENS ── */}
      {aba === 'itens' && (
        <div className="card" style={{ padding: 0 }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {itens.filter(i => !i.ativo).length > 0 && `${itens.filter(i => !i.ativo).length} item(ns) inativo(s)`}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={mostrarInativos} onChange={e => setMostrarInativos(e.target.checked)} />
                Mostrar inativos
              </label>
            </div>
          </div>
          {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Carregando...</div> : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th style={{ textAlign: 'center' }}>Qtd Atual</th>
                    <th style={{ textAlign: 'center' }}>Mínimo</th>
                    <th>Situação</th>
                    <th>Fornecedor</th>
                    <th>Contato</th>
                    <th style={{ textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.filter(i => mostrarInativos || i.ativo !== false).length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-faint)' }}>Nenhum item cadastrado.</td></tr>
                  )}
                  {itens.filter(i => mostrarInativos || i.ativo !== false).map(item => {
                    const inativo = item.ativo === false;
                    return (
                    <tr key={item.id} style={{ background: inativo ? 'color-mix(in srgb, #94a3b8 8%, transparent)' : item.quantidade_atual <= item.quantidade_minima ? 'color-mix(in srgb, #f59e0b 5%, transparent)' : undefined, opacity: inativo ? 0.6 : 1 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontWeight: 600 }}>{item.nome}</div>
                          {inativo && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: '#f1f5f9', color: '#94a3b8', fontWeight: 600 }}>Inativo</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{item.unidade}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>
                        <div>{item.quantidade_atual}</div>
                        {totalFls(item) !== null && (
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                            {totalFls(item).toLocaleString('pt-BR')} fls
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                        {item.quantidade_minima}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <BadgeEstoque atual={item.quantidade_atual} minimo={item.quantidade_minima} />
                          <BarraEstoque atual={item.quantidade_atual} minimo={item.quantidade_minima} />
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{item.fornecedor || '—'}</td>
                      <td style={{ fontSize: 12 }}>{item.contato || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          {!inativo && <>
                            <button className="btn btn-success btn-sm" title="Registrar entrada" onClick={() => abrirMov(item.id, 'entrada')}>+ Entrada</button>
                            <button className="btn btn-warning btn-sm" title="Registrar saída" onClick={() => abrirMov(item.id, 'saida')}>− Saída</button>
                          </>}
                          <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(item)}>✏</button>
                          <button className="btn btn-ghost btn-sm" title={inativo ? 'Reativar' : 'Inativar (suspende alertas)'}
                            style={{ color: inativo ? '#16a34a' : '#f59e0b' }}
                            onClick={() => toggleAtivo(item)}>
                            {inativo ? '▶' : '⏸'}
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => excluirItem(item.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ABA HISTÓRICO ── */}
      {aba === 'historico' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Material</th>
                  <th>Tipo</th>
                  <th style={{ textAlign: 'center' }}>Qtd</th>
                  <th>Responsável</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movimentos.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-faint)' }}>Nenhum movimento registrado.</td></tr>
                )}
                {movimentos.map(m => {
                  const item = itens.find(i => i.id === m.item_id);
                  return (
                    <tr key={m.id}>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtData(m.criado_em)}</td>
                      <td style={{ fontWeight: 600 }}>{item?.nome || '—'}</td>
                      <td>
                        {m.tipo === 'entrada'
                          ? <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d' }}>↑ Entrada</span>
                          : <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626' }}>↓ Saída</span>}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{m.quantidade}</td>
                      <td style={{ fontSize: 12 }}>{m.usuarios?.nome_simples || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{m.observacao || '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                          title="Excluir e repor estoque" onClick={() => excluirMovimento(m)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA ALERTAS ── */}
      {aba === 'destinatarios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>

          {/* Configuração de envio */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div className="card-title">⚙️ Configuração do Alerta</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  O sistema verifica itens críticos e envia e-mail automaticamente via pg_cron.
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Alertas ativos</span>
                <div onClick={() => setEstoqueConfig(c => ({ ...c, ativo: !c.ativo }))}
                  style={{ width: 40, height: 22, borderRadius: 11, background: estoqueConfig?.ativo ? 'var(--color-accent)' : 'var(--color-surface-3)', position: 'relative', cursor: 'pointer', transition: 'background .2s' }}>
                  <div style={{ position: 'absolute', top: 3, left: estoqueConfig?.ativo ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Horário */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Horário de envio</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input className="form-input" type="time" value={estoqueConfig?.hora_envio || '07:00'}
                    onChange={e => setEstoqueConfig(c => ({ ...c, hora_envio: e.target.value }))}
                    style={{ width: 130 }} />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Horário de Brasília — o pg_cron usa UTC (−3h ou −4h conforme horário de verão)
                  </span>
                </div>
              </div>

              {/* Dias da semana */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Dias da semana</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {DIAS_SEMANA.map((d, i) => {
                    const ativo = (estoqueConfig?.dias_semana || []).includes(i);
                    return (
                      <button key={i} onClick={() => {
                        const dias = estoqueConfig?.dias_semana || [];
                        setEstoqueConfig(c => ({ ...c, dias_semana: ativo ? dias.filter(x => x !== i) : [...dias, i].sort() }));
                      }} style={{ padding: '5px 10px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: ativo ? 700 : 400, border: `2px solid ${ativo ? 'var(--color-accent)' : 'var(--color-border)'}`, background: ativo ? 'var(--color-accent)' : 'var(--color-surface)', color: ativo ? '#fff' : 'var(--color-text-muted)', cursor: 'pointer' }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 6 }}>
                  Configuração visual — atualize o pg_cron no Supabase para refletir os dias escolhidos.
                </div>
              </div>

              {/* Itens críticos agora */}
              {(() => {
                const criticos = itens.filter(i => i.ativo !== false && i.quantidade_atual <= i.quantidade_minima);
                return criticos.length > 0 ? (
                  <div style={{ padding: '10px 14px', background: 'color-mix(in srgb, #f59e0b 10%, transparent)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 4 }}>⚠ {criticos.length} item(ns) crítico(s) agora</div>
                    <div style={{ fontSize: 11, color: '#b45309' }}>{criticos.map(i => i.nome).join(', ')}</div>
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', background: 'color-mix(in srgb, #16a34a 10%, transparent)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(22,163,74,0.3)' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>✓ Nenhum item crítico no momento</div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="btn btn-secondary" onClick={testarAlerta} disabled={testando}>
                  {testando ? '⏳ Enviando...' : '▶ Testar agora'}
                </button>
                <button className="btn btn-primary" onClick={salvarConfig} disabled={salvandoConfig}>
                  {salvandoConfig ? 'Salvando...' : 'Salvar configuração'}
                </button>
              </div>
            </div>
          </div>

          {/* Destinatários */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 4 }}>📧 Destinatários</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              Receberão o e-mail de alerta quando itens estiverem críticos.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <input className="form-input" placeholder="email@exemplo.com" value={novoEmail} onChange={e => setNovoEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && adicionarDest()} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={adicionarDest}>Adicionar</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {destinatarios.length === 0 && <div style={{ color: 'var(--color-text-faint)', fontSize: 13 }}>Nenhum destinatário cadastrado.</div>}
              {destinatarios.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{d.email}</span>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 8, fontWeight: 700, background: d.ativo ? '#dcfce7' : '#f1f5f9', color: d.ativo ? '#15803d' : '#94a3b8' }}>{d.ativo ? 'Ativo' : 'Inativo'}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleDest(d)}>{d.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => excluirDest(d.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Instrução pg_cron */}
          <div className="card" style={{ background: 'var(--color-surface-2)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8 }}>📋 Como atualizar o agendamento no Supabase</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-faint)', lineHeight: 1.6 }}>
              Para alterar o horário do pg_cron, acesse <strong>Supabase → Database → Extensions → pg_cron</strong> e rode:
            </div>
            <pre style={{ fontSize: 11, background: 'var(--color-surface-3)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginTop: 8, overflowX: 'auto', color: 'var(--color-text-muted)' }}>
{`SELECT cron.unschedule('alerta-estoque-diario');
SELECT cron.schedule(
  'alerta-estoque-diario',
  '0 ${estoqueConfig ? String(parseInt(estoqueConfig.hora_envio) + 3).padStart(2,'0') : '10'} * * ${(estoqueConfig?.dias_semana || [1,2,3,4,5]).join(',')}',
  $$ ... $$
);`}
            </pre>
          </div>
        </div>
      )}

      {/* ── MODAL ITEM ── */}
      {modalItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editItem ? 'Editar Item' : 'Novo Item'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Nome *</label>
                <input className="form-input" value={formItem.nome} onChange={e => setFormItem(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Capa de Escritura" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Unidade</label>
                  <select className="form-select" value={formItem.unidade} onChange={e => setFormItem(f => ({ ...f, unidade: e.target.value, fls_por_pct: e.target.value !== 'pct' ? 0 : f.fls_por_pct }))}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd Atual</label>
                  <input className="form-input" type="number" min="0" value={formItem.quantidade_atual} onChange={e => setFormItem(f => ({ ...f, quantidade_atual: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Qtd Mínima</label>
                  <input className="form-input" type="number" min="0" value={formItem.quantidade_minima} onChange={e => setFormItem(f => ({ ...f, quantidade_minima: e.target.value }))} />
                </div>
              </div>
              {formItem.unidade === 'pct' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="form-label">Fls por pct</label>
                    <input className="form-input" type="number" min="0" value={formItem.fls_por_pct} onChange={e => setFormItem(f => ({ ...f, fls_por_pct: e.target.value }))} placeholder="Ex: 500" />
                  </div>
                  {formItem.fls_por_pct > 0 && formItem.quantidade_atual > 0 && (
                    <div style={{ paddingBottom: 4, fontSize: 13, color: 'var(--color-accent)', fontWeight: 700 }}>
                      = {(Number(formItem.quantidade_atual) * Number(formItem.fls_por_pct)).toLocaleString('pt-BR')} fls total
                    </div>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Fornecedor</label>
                <input className="form-input" value={formItem.fornecedor} onChange={e => setFormItem(f => ({ ...f, fornecedor: e.target.value }))} placeholder="Nome da empresa ou pessoa" />
              </div>
              <div className="form-group">
                <label className="form-label">Contato</label>
                <input className="form-input" value={formItem.contato} onChange={e => setFormItem(f => ({ ...f, contato: e.target.value }))} placeholder="Telefone, e-mail, etc." />
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <textarea className="form-input" rows={2} value={formItem.observacoes} onChange={e => setFormItem(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setModalItem(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarItem} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MOVIMENTO ── */}
      {modalMov && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: '100%', maxWidth: 360 }}>
            {(() => {
              const item = itens.find(i => i.id === movItem);
              return (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                    {movTipo === 'entrada' ? '↑ Registrar Entrada' : '↓ Registrar Saída'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                    {item?.nome} · Estoque atual: <strong>{item?.quantidade_atual} {item?.unidade}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Tipo</label>
                      <div style={{ display: 'flex', gap: 0, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        {[['entrada','↑ Entrada'],['saida','↓ Saída']].map(([id, label]) => (
                          <button key={id} onClick={() => setMovTipo(id)}
                            style={{ flex: 1, padding: '7px 0', fontSize: 13, fontWeight: movTipo===id?700:400, background: movTipo===id?(id==='entrada'?'#16a34a':'#dc2626'):'var(--color-surface)', color: movTipo===id?'#fff':'var(--color-text)', border: 'none', cursor: 'pointer' }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Quantidade *
                        {movTipo === 'saida' && (
                          <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 6 }}>
                            (máx: {item?.quantidade_atual} {item?.unidade})
                          </span>
                        )}
                      </label>
                      <input className="form-input" type="number" min="1"
                        max={movTipo === 'saida' ? item?.quantidade_atual : undefined}
                        value={movQtd} onChange={e => setMovQtd(e.target.value)} autoFocus />
                      {movTipo === 'saida' && Number(movQtd) > (item?.quantidade_atual || 0) && (
                        <div style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 4, fontWeight: 600 }}>
                          ⚠ Quantidade maior que o estoque disponível ({item?.quantidade_atual} {item?.unidade})
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Observação</label>
                      <input className="form-input" value={movObs} onChange={e => setMovObs(e.target.value)} placeholder="Opcional" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button className="btn btn-ghost" onClick={() => setModalMov(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={registrarMovimento} disabled={salvando}>{salvando ? 'Registrando...' : 'Confirmar'}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
