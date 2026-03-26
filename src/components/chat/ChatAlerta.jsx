import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const getIniciais = (nome) => (nome || '?').trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);

// Solicita permissão de notificação do SO
async function solicitarPermissao() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// Dispara notificação nativa do SO
function notificarSO(titulo, corpo) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // Só notifica se o sistema estiver minimizado ou em outra aba
  if (document.visibilityState === 'visible') return;
  try {
    const n = new Notification(titulo, {
      body: corpo,
      icon: '/favicon.svg',
      tag: 'chat-' + Date.now(),
    });
    setTimeout(() => n.close(), 6000);
  } catch {}
}

export default function ChatAlerta({ onAbrirChat }) {
  const { supabaseClient: sb, usuario, usuarios } = useApp();
  const [alertas, setAlertas] = useState([]);
  const [respostas, setRespostas] = useState({});

  // Solicita permissão ao montar
  useEffect(() => { solicitarPermissao(); }, []);

  const carregarNaoLidas = useCallback(async () => {
    if (!usuario?.id) return;
    const { data } = await sb
      .from('mensagem_destinatarios')
      .select('id, mensagem_id, mensagens(id, texto, criado_em, de_usuario_id)')
      .eq('para_usuario_id', usuario.id)
      .eq('lida', false)
      .order('mensagem_id', { ascending: false });

    if (!data?.length) {
      setAlertas([]);
      return;
    }

    const novos = data.map(d => ({
      destId: d.id,
      mensagemId: d.mensagem_id,
      texto: d.mensagens?.texto || '',
      remetenteId: d.mensagens?.de_usuario_id,
      criadoEm: d.mensagens?.criado_em,
    }));

    // Verifica quais são realmente novos para notificar o SO
    setAlertas(prev => {
      const idsAntigos = new Set(prev.map(a => a.destId));
      const recentesNovos = novos.filter(n => !idsAntigos.has(n.destId));
      if (recentesNovos.length > 0) {
        const remetente = (usuarios || []).find(u => u.id === recentesNovos[0].remetenteId);
        notificarSO(
          `💬 ${remetente?.nome_simples || 'Mensagem nova'}`,
          recentesNovos[0].texto
        );
      }
      return novos; // sempre substitui pelo estado atual do banco
    });
  }, [sb, usuario?.id, usuarios]);

  // Realtime
  useEffect(() => {
    if (!usuario?.id) return;
    const channel = sb.channel(`chat_alerta_${usuario.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensagem_destinatarios',
      }, () => {
        carregarNaoLidas();
      })
      .subscribe();
    carregarNaoLidas();
    return () => { sb.removeChannel(channel); };
  }, [usuario?.id, sb, carregarNaoLidas]);

  const dispensar = async (alerta) => {
    await sb.from('mensagem_destinatarios')
      .update({ lida: true, lida_em: new Date().toISOString() })
      .eq('id', alerta.destId);
    setAlertas(prev => prev.filter(a => a.destId !== alerta.destId));
  };

  const responderRapido = async (alerta) => {
    const txt = respostas[alerta.destId]?.trim();
    if (!txt) return;
    const { data: novaMsg } = await sb.from('mensagens')
      .insert({ de_usuario_id: usuario.id, texto: txt })
      .select().single();
    if (novaMsg) {
      await sb.from('mensagem_destinatarios').insert({
        mensagem_id: novaMsg.id,
        para_usuario_id: alerta.remetenteId,
        lida: false,
      });
    }
    setRespostas(prev => ({ ...prev, [alerta.destId]: '' }));
    await dispensar(alerta);
  };

  const abrirChat = async (alerta) => {
    await dispensar(alerta);
    const { data } = await sb.from('mensagens')
      .select('de_usuario_id, mensagem_destinatarios(para_usuario_id)')
      .eq('id', alerta.mensagemId).single();
    if (!data) return;
    const dests = (data.mensagem_destinatarios || []).map(d => d.para_usuario_id);
    const participantes = [...new Set([data.de_usuario_id, ...dests])].sort();
    const remetente = (usuarios || []).find(u => u.id === alerta.remetenteId);
    onAbrirChat({ participantes, titulo: remetente?.nome_simples || 'Chat', tipo: participantes.length > 2 ? 'grupo' : '1:1' });
  };

  if (!alertas.length) return null;

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 3000, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340 }}>
      {alertas.slice(0, 5).map(alerta => {
        const remetente = (usuarios || []).find(u => u.id === alerta.remetenteId);
        return (
          <div key={alerta.destId}
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-accent)', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'slideIn .2s ease' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--color-surface-2)', cursor: 'pointer' }}
              onClick={() => abrirChat(alerta)}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {getIniciais(remetente?.nome_simples)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{remetente?.nome_simples || 'Usuário'}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>💬 Nova mensagem</div>
              </div>
              <button onClick={e => { e.stopPropagation(); dispensar(alerta); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: 14, padding: '2px 4px' }}>✕</button>
            </div>
            {/* Texto */}
            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5, cursor: 'pointer', maxHeight: 60, overflow: 'hidden' }}
              onClick={() => abrirChat(alerta)}>
              {alerta.texto}
            </div>
            {/* Resposta rápida */}
            <div style={{ padding: '6px 10px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 6 }}>
              <input
                className="form-input"
                style={{ flex: 1, fontSize: 12, padding: '5px 8px', height: 30 }}
                placeholder="Resposta rápida..."
                value={respostas[alerta.destId] || ''}
                onChange={e => setRespostas(prev => ({ ...prev, [alerta.destId]: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') responderRapido(alerta); }}
                onClick={e => e.stopPropagation()}
              />
              <button className="btn btn-primary btn-sm" style={{ height: 30, padding: '0 10px', fontSize: 12 }}
                onClick={() => responderRapido(alerta)}
                disabled={!respostas[alerta.destId]?.trim()}>➤</button>
            </div>
          </div>
        );
      })}
      {alertas.length > 5 && (
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', padding: '4px 0' }}>
          +{alertas.length - 5} mensagem(ns) não lida(s)
        </div>
      )}
      <style>{`@keyframes slideIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
