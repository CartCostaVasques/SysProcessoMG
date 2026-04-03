import { useState, useEffect, useRef } from 'react';
import { sbPublic as sb } from '../../lib/supabasePublic.js';

const HOJE = () => new Date().toISOString().split('T')[0];

function falarSenha(cod, nomeSetor) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const letras = cod.slice(0, 1);
  const nums   = cod.slice(1).split('').join(' ');
  const setor  = nomeSetor ? `, Setor ${nomeSetor}` : '';
  const texto  = `Senha ${letras} ${nums}${setor}.`;

  const falar = () => {
    const msg  = new SpeechSynthesisUtterance(texto);
    msg.lang   = 'pt-BR';
    msg.rate   = 0.88;
    msg.pitch  = 1;
    const vozes = window.speechSynthesis.getVoices();
    const voz   = vozes.find(v => v.lang === 'pt-BR')
               || vozes.find(v => v.lang.startsWith('pt'))
               || vozes[0];
    if (voz) msg.voice = voz;
    window.speechSynthesis.speak(msg);
  };

  // Vozes podem não ter carregado ainda
  const vozes = window.speechSynthesis.getVoices();
  if (vozes.length > 0) {
    falar();
  } else {
    window.speechSynthesis.onvoiceschanged = () => { falar(); window.speechSynthesis.onvoiceschanged = null; };
  }
}

export default function SenhaPainel() {
  const [setores, setSetores]       = useState({});
  const [ultimaChamada, setUltime]  = useState(null);
  const [historico, setHistorico]   = useState([]);
  const [hora, setHora]             = useState('');
  const [data, setData]             = useState('');
  const [nomeCartorio, setNomeCartorio] = useState('Cartório');
  const ultimaRef = useRef(null);

  useEffect(() => {
    carregarDados();
    const t = setInterval(() => {
      const agora = new Date();
      setHora(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setData(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    }, 1000);

    // Realtime
    const canal = sb.channel('painel-senhas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'senhas' }, payload => {
        if (payload.eventType === 'UPDATE' && payload.new.status === 'chamada') {
          const nova = payload.new;
          setHistorico(h => {
            // Se for repetição, não duplica no histórico
            const semDuplicata = h.filter(x => x.id !== nova.id);
            return [nova, ...semDuplicata].slice(0, 8);
          });
          setUltime(nova);
          setSetores(s => {
            const setor = s[nova.setor_id];
            if (setor) {
              const cod = `${setor.prefixo}${String(nova.numero).padStart(3, '0')}`;
              setTimeout(() => falarSenha(cod, setor.nome), 300);
            }
            return s;
          });
        }
        if (payload.eventType === 'INSERT') {
          carregarDados();
        }
      })
      .subscribe();

    // Vozes carregam async
    window.speechSynthesis?.addEventListener?.('voiceschanged', () => {});

    return () => { clearInterval(t); sb.removeChannel(canal); };
  }, []);

  const carregarDados = async () => {
    const { data: setsData } = await sb.from('senha_setores').select('*').eq('ativo', true);
    const mapa = {};
    (setsData || []).forEach(s => { mapa[s.id] = s; });
    setSetores(mapa);

    const { data: cartData } = await sb.from('cartorio').select('nome, nome_simples, logo_url').limit(1);
    const cart = cartData?.[0];
    if (cart) {
      if (cart.nome_simples || cart.nome) setNomeCartorio(cart.nome_simples || cart.nome);
    }

    const { data: chamadas } = await sb.from('senhas')
      .select('*, senha_setores(nome, prefixo)')
      .eq('status', 'chamada')
      .gte('criado_em', HOJE() + 'T00:00:00-03:00')
      .order('chamado_em', { ascending: false })
      .limit(8);
    setHistorico(chamadas || []);
    if (chamadas?.length > 0) setUltime(chamadas[0]);
  };

  const getCod = (s) => {
    const setor = s.senha_setores || setores[s.setor_id];
    if (!setor) return '---';
    return `${setor.prefixo}${String(s.numero).padStart(3, '0')}`;
  };

  const getNomeSetor = (s) => s.senha_setores?.nome || setores[s.setor_id]?.nome || '—';

  return (
    <div style={{ height: '100vh', background: '#1e2433', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>

      {/* Header — cinza escuro com logo e nome âmbar */}
      <div style={{ background: '#2a2f3e', padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #374151' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#f59e0b', letterSpacing: 0.5, lineHeight: 1.1 }}>{nomeCartorio}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', lineHeight: 1 }}>{hora}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, textTransform: 'capitalize' }}>{data}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 0, overflow: 'hidden' }}>

        {/* Senha atual — área principal em cinza médio */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#252b3a' }}>
          {ultimaChamada ? (
            <>
              <div style={{ fontSize: 16, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 6, marginBottom: 12 }}>Senha Chamada</div>
              {/* Setor em destaque */}
              <div style={{ fontSize: 32, fontWeight: 800, color: '#f8fafc', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 3, background: '#374151', padding: '6px 28px', borderRadius: 10 }}>
                {getNomeSetor(ultimaChamada)}
              </div>
              {/* Código com borda âmbar */}
              <div style={{
                fontSize: 180, fontWeight: 900, lineHeight: 1,
                color: ultimaChamada.tipo === 'preferencial' ? '#f59e0b' : '#38bdf8',
                letterSpacing: -8,
                textShadow: ultimaChamada.tipo === 'preferencial'
                  ? '0 0 80px rgba(245,158,11,0.5)'
                  : '0 0 80px rgba(56,189,248,0.4)',
                WebkitTextStroke: `3px ${ultimaChamada.tipo === 'preferencial' ? 'rgba(245,158,11,0.6)' : 'rgba(245,158,11,0.5)'}`,
              }}>
                {getCod(ultimaChamada)}
              </div>
              {ultimaChamada.tipo === 'preferencial' && (
                <div style={{ fontSize: 26, fontWeight: 700, color: '#f59e0b', border: '3px solid #f59e0b', padding: '6px 24px', borderRadius: 12, marginTop: 16 }}>
                  ⭐ PREFERENCIAL
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 72, marginBottom: 16, opacity: 0.2 }}>🎫</div>
              <div style={{ fontSize: 22, color: '#4b5563' }}>Aguardando senhas...</div>
            </div>
          )}
        </div>

        {/* Histórico lateral — cinza escuro */}
        <div style={{ background: '#2a2f3e', borderLeft: '2px solid #374151', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '2px solid #374151', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 3 }}>
            Últimas Chamadas
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {historico.map((s, i) => {
              const cod = getCod(s);
              const nomeSetor = getNomeSetor(s);
              const isPref = s.tipo === 'preferencial';
              const isFirst = i === 0;
              const bgColor = isFirst ? '#374151' : i % 2 === 0 ? '#2f3547' : '#252b3a';
              return (
                <div key={s.id} style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: bgColor,
                  border: isFirst ? '1px solid #4b5563' : '1px solid transparent',
                  display: 'flex', flexDirection: 'column', gap: 2,
                  opacity: isFirst ? 1 : Math.max(0.45, 1 - i * 0.08),
                  transition: 'all .3s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div style={{
                      fontSize: isFirst ? 34 : 28,
                      fontWeight: 900,
                      color: isPref ? '#f59e0b' : '#38bdf8',
                      letterSpacing: -1,
                      lineHeight: 1,
                    }}>{cod}</div>
                    {isPref && <span style={{ fontSize: 12, color: '#f59e0b' }}>⭐</span>}
                  </div>
                  <div style={{ fontSize: isFirst ? 13 : 12, color: isFirst ? '#d1d5db' : '#9ca3af', fontWeight: isFirst ? 600 : 400 }}>
                    {nomeSetor}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
