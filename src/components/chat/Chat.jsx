import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const fmtHora = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
const fmtData = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR');
};
const getIniciais = (nome) => (nome || '?').trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function Chat({ conversaInicial = null }) {
  const { supabaseClient: sb, usuario, usuarios } = useApp();
  const [conversas, setConversas] = useState([]); // lista de conversas recentes
  const [convAtual, setConvAtual] = useState(conversaInicial); // { tipo: '1:1'|'grupo', participantes: [ids], titulo }
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [modalNovaConv, setModalNovaConv] = useState(false);
  const [selDests, setSelDests] = useState([]);
  const [tituloGrupo, setTituloGrupo] = useState('');
  const fimRef = useRef(null);

  const usuariosAtivos = (usuarios || []).filter(u => u.ativo && u.id !== usuario?.id);

  // ── Carrega conversas recentes ──
  const carregarConversas = useCallback(async () => {
    if (!usuario?.id) return;
    // Busca mensagens enviadas ou recebidas pelo usuário nos últimos 7 dias
    const { data: recebidas } = await sb
      .from('mensagem_destinatarios')
      .select('mensagem_id, lida, mensagens(id, texto, criado_em, de_usuario_id)')
      .eq('para_usuario_id', usuario.id)
      .order('mensagem_id', { ascending: false })
      .limit(100);

    const { data: enviadas } = await sb
      .from('mensagens')
      .select('id, texto, criado_em, de_usuario_id, mensagem_destinatarios(para_usuario_id)')
      .eq('de_usuario_id', usuario.id)
      .order('criado_em', { ascending: false })
      .limit(100);

    // Agrupa por conversa (combinação de participantes)
    const mapaConv: Record<string, any> = {};

    const adicionarMsg = (msg: any, dests: string[]) => {
      const participantes = [...new Set([msg.de_usuario_id, ...dests])].filter(Boolean).sort();
      const chave = participantes.join(',');
      if (!mapaConv[chave] || new Date(msg.criado_em) > new Date(mapaConv[chave].ultimaMsg.criado_em)) {
        mapaConv[chave] = { participantes, ultimaMsg: msg, chave };
      }
    };

    for (const r of (recebidas || [])) {
      if (r.mensagens) adicionarMsg(r.mensagens, [usuario.id]);
    }
    for (const e of (enviadas || [])) {
      const dests = (e.mensagem_destinatarios || []).map((d: any) => d.para_usuario_id);
      adicionarMsg(e, dests);
    }

    const lista = Object.values(mapaConv).sort((a: any, b: any) =>
      new Date(b.ultimaMsg.criado_em).getTime() - new Date(a.ultimaMsg.criado_em).getTime()
    );
    setConversas(lista as any[]);
  }, [sb, usuario?.id]);

  useEffect(() => { carregarConversas(); }, [carregarConversas]);

  // ── Carrega mensagens da conversa atual ──
  const carregarMensagens = useCallback(async () => {
    if (!convAtual || !usuario?.id) return;
    const { participantes } = convAtual;

    // Busca todas as mensagens entre esses participantes
    const { data } = await sb
      .from('mensagens')
      .select('*, mensagem_destinatarios(para_usuario_id, lida)')
      .in('de_usuario_id', participantes)
      .order('criado_em', { ascending: true });

    // Filtra apenas mensagens onde todos participantes fazem parte
    const filtradas = (data || []).filter((m: any) => {
      const envolvidos = [m.de_usuario_id, ...(m.mensagem_destinatarios || []).map((d: any) => d.para_usuario_id)];
      return participantes.every((p: string) => envolvidos.includes(p));
    });

    setMensagens(filtradas);

    // Marca como lidas
    const naoLidas = filtradas
      .filter((m: any) => m.de_usuario_id !== usuario.id)
      .flatMap((m: any) => m.mensagem_destinatarios || [])
      .filter((d: any) => d.para_usuario_id === usuario.id && !d.lida)
      .map((d: any) => d.id);

    if (naoLidas.length > 0) {
      await sb.from('mensagem_destinatarios')
        .update({ lida: true, lida_em: new Date().toISOString() })
        .in('id', naoLidas);
    }
  }, [convAtual, sb, usuario?.id]);

  useEffect(() => { carregarMensagens(); }, [carregarMensagens]);

  // ── Realtime ──
  useEffect(() => {
    if (!usuario?.id) return;
    const channel = sb.channel('chat_msgs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensagem_destinatarios',
        filter: `para_usuario_id=eq.${usuario.id}`,
      }, () => {
        carregarMensagens();
        carregarConversas();
      })
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [usuario?.id, sb, carregarMensagens, carregarConversas]);

  // Scroll automático
  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  // ── Enviar mensagem ──
  const enviar = async () => {
    if (!texto.trim() || !convAtual || enviando) return;
    setEnviando(true);
    const { data: msg } = await sb.from('mensagens').insert({
      de_usuario_id: usuario.id,
      texto: texto.trim(),
    }).select().single();

    if (msg) {
      const dests = convAtual.participantes.filter((p: string) => p !== usuario.id);
      await sb.from('mensagem_destinatarios').insert(
        dests.map((p: string) => ({ mensagem_id: msg.id, para_usuario_id: p, lida: false }))
      );
    }
    setTexto('');
    setEnviando(false);
    carregarMensagens();
    carregarConversas();
  };

  // ── Nova conversa ──
  const iniciarConversa = () => {
    if (!selDests.length) return;
    const participantes = [...new Set([usuario.id, ...selDests])].sort();
    const titulo = selDests.length === 1
      ? (usuarios || []).find(u => u.id === selDests[0])?.nome_simples || 'Usuário'
      : tituloGrupo || selDests.map(id => (usuarios || []).find(u => u.id === id)?.nome_simples || '').join(', ');
    setConvAtual({ participantes, titulo, tipo: selDests.length > 1 ? 'grupo' : '1:1' });
    setModalNovaConv(false);
    setSelDests([]);
    setTituloGrupo('');
  };

  const getNomeConv = (conv: any) => {
    const outros = conv.participantes.filter((p: string) => p !== usuario?.id);
    if (outros.length === 1) return (usuarios || []).find(u => u.id === outros[0])?.nome_simples || 'Usuário';
    return outros.map((id: string) => (usuarios || []).find(u => u.id === id)?.nome_simples?.split(' ')[0] || '').join(', ');
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <div className="page-title">💬 Chat</div>
          <div className="page-sub">Mensagens internas</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalNovaConv(true)}>+ Nova Conversa</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, height: 'calc(100vh - 200px)', minHeight: 400 }}>

        {/* ── Lista de conversas ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
            CONVERSAS
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversas.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>
                Nenhuma conversa ainda.<br />Clique em + Nova Conversa.
              </div>
            )}
            {conversas.map((conv: any) => {
              const nome = getNomeConv(conv);
              const ativo = convAtual?.participantes?.join(',') === conv.chave;
              return (
                <div key={conv.chave} onClick={() => setConvAtual({ ...conv, titulo: nome })}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', background: ativo ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'transparent', borderLeft: ativo ? '3px solid var(--color-accent)' : '3px solid transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {getIniciais(nome)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.ultimaMsg?.texto}</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-text-faint)', flexShrink: 0 }}>{fmtHora(conv.ultimaMsg?.criado_em)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Área de mensagens ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!convAtual ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: 14 }}>
              Selecione uma conversa ou inicie uma nova
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  {getIniciais(convAtual.titulo)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{convAtual.titulo}</div>
              </div>

              {/* Mensagens */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mensagens.map((m: any, i: number) => {
                  const minha = m.de_usuario_id === usuario?.id;
                  const remetente = (usuarios || []).find(u => u.id === m.de_usuario_id);
                  const dataAtual = fmtData(m.criado_em);
                  const dataPrev = i > 0 ? fmtData((mensagens as any[])[i - 1].criado_em) : null;
                  return (
                    <div key={m.id}>
                      {dataAtual !== dataPrev && (
                        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-faint)', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                          {dataAtual}
                          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: minha ? 'flex-end' : 'flex-start', gap: 8 }}>
                        {!minha && (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, alignSelf: 'flex-end' }}>
                            {getIniciais(remetente?.nome_simples)}
                          </div>
                        )}
                        <div style={{ maxWidth: '70%' }}>
                          {!minha && <div style={{ fontSize: 10, color: 'var(--color-text-faint)', marginBottom: 2, marginLeft: 2 }}>{remetente?.nome_simples}</div>}
                          <div style={{ padding: '8px 12px', borderRadius: minha ? '12px 12px 4px 12px' : '12px 12px 12px 4px', background: minha ? 'var(--color-accent)' : 'var(--color-surface-2)', color: minha ? '#fff' : 'var(--color-text)', fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {m.texto}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 2, textAlign: minha ? 'right' : 'left', marginLeft: minha ? 0 : 2 }}>
                            {fmtHora(m.criado_em)}
                            {minha && <span style={{ marginLeft: 4 }}>{(m.mensagem_destinatarios || []).every((d: any) => d.lida) ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={fimRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8 }}>
                <input className="form-input" style={{ flex: 1 }} placeholder="Digite sua mensagem..."
                  value={texto} onChange={e => setTexto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
                <button className="btn btn-primary" onClick={enviar} disabled={enviando || !texto.trim()}>
                  {enviando ? '⏳' : '➤'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal nova conversa ── */}
      {modalNovaConv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nova Conversa</div>
            <div className="form-group">
              <label className="form-label">Selecione os participantes</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {usuariosAtivos.map(u => {
                  const sel = selDests.includes(u.id);
                  return (
                    <div key={u.id} onClick={() => setSelDests(prev => sel ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-md)', border: `2px solid ${sel ? 'var(--color-accent)' : 'var(--color-border)'}`, background: sel ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))' : 'var(--color-surface)', cursor: 'pointer' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                        {getIniciais(u.nome_simples)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: sel ? 600 : 400 }}>{u.nome_simples}</span>
                      {sel && <span style={{ marginLeft: 'auto', color: 'var(--color-accent)', fontSize: 14 }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
            {selDests.length > 1 && (
              <div className="form-group">
                <label className="form-label">Nome do grupo (opcional)</label>
                <input className="form-input" value={tituloGrupo} onChange={e => setTituloGrupo(e.target.value)} placeholder="Ex: Equipe, Plantão..." />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-ghost" onClick={() => { setModalNovaConv(false); setSelDests([]); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={iniciarConversa} disabled={!selDests.length}>
                {selDests.length > 1 ? 'Criar Grupo' : 'Iniciar Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
