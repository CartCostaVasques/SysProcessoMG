import { useState, useEffect, useRef } from 'react';
import { sbPublic as sb } from '../../lib/supabasePublic.js';

const HOJE = () => new Date().toISOString().split('T')[0];

function falarSenha(cod, tipo, guiche) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const letras = cod.slice(0, 1);
  const nums   = cod.slice(1).split('').join(' ');
  const pref   = tipo === 'preferencial' ? ', preferencial,' : '';
  const gc     = guiche ? `, guichê ${guiche}` : '';
  const texto  = `Senha ${letras} ${nums}${pref}${gc}, por favor.`;

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
              setTimeout(() => falarSenha(cod, nova.tipo, nova.guiche), 300);
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
    <div style={{ height: '100vh', background: '#020617', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>

      {/* Header */}
      <div style={{ background: '#0f172a', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #1e3a5f' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9' }}>Cartório Costa Vasques</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{hora}</div>
          <div style={{ fontSize: 13, color: '#64748b', textTransform: 'capitalize' }}>{data}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 0, overflow: 'hidden' }}>

        {/* Senha atual — destaque */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#020617' }}>
          {ultimaChamada ? (
            <>
              <div style={{ fontSize: 22, color: '#64748b', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 8 }}>Senha chamada</div>
              <div style={{ fontSize: 22, color: '#94a3b8', marginBottom: 12 }}>{getNomeSetor(ultimaChamada)}</div>
              <div style={{
                fontSize: 180, fontWeight: 900, lineHeight: 1,
                color: ultimaChamada.tipo === 'preferencial' ? '#f59e0b' : '#38bdf8',
                letterSpacing: -8,
                textShadow: ultimaChamada.tipo === 'preferencial'
                  ? '0 0 60px rgba(245,158,11,0.4)'
                  : '0 0 60px rgba(56,189,248,0.4)',
              }}>
                {getCod(ultimaChamada)}
              </div>
              {ultimaChamada.tipo === 'preferencial' && (
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', border: '3px solid #f59e0b', padding: '6px 24px', borderRadius: 12, marginTop: 8 }}>
                  ⭐ PREFERENCIAL
                </div>
              )}
              {ultimaChamada.guiche && (
                <div style={{ fontSize: 24, color: '#94a3b8', marginTop: 16 }}>
                  Guichê <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{ultimaChamada.guiche}</span>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 80, marginBottom: 16, opacity: 0.3 }}>🎫</div>
              <div style={{ fontSize: 24, color: '#334155' }}>Aguardando senhas...</div>
            </div>
          )}
        </div>

        {/* Histórico lateral */}
        <div style={{ background: '#0f172a', borderLeft: '2px solid #1e293b', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 2 }}>
            Últimas chamadas
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {historico.map((s, i) => {
              const cod = getCod(s);
              const nomeSetor = getNomeSetor(s);
              const isPref = s.tipo === 'preferencial';
              const isFirst = i === 0;
              return (
                <div key={s.id} style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #1e293b',
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: isFirst ? '#1e293b' : 'transparent',
                  opacity: isFirst ? 1 : 0.5 + (0.5 * (1 - i / historico.length)),
                }}>
                  <div style={{
                    fontSize: isFirst ? 36 : 28, fontWeight: 900,
                    color: isPref ? '#f59e0b' : '#38bdf8', minWidth: 80,
                  }}>{cod}</div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{nomeSetor}</div>
                    {isPref && <div style={{ fontSize: 10, color: '#f59e0b' }}>⭐ Preferencial</div>}
                    {s.guiche && <div style={{ fontSize: 11, color: '#64748b' }}>Guichê {s.guiche}</div>}
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
