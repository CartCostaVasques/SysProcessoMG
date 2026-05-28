import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useApp } from '../../context/AppContext.jsx';
import Portal from '../layout/Portal.jsx';

// Partículas animadas via CSS inline
const STYLE = `
@keyframes floatUp {
  0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  100% { transform: translateY(-120px) rotate(360deg) scale(0.3); opacity: 0; }
}
@keyframes sway {
  0%, 100% { transform: translateX(0); }
  50%       { transform: translateX(12px); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.2); }
  50%       { box-shadow: 0 0 40px rgba(255,255,255,0.5); }
}
@keyframes fadeInScale {
  from { opacity: 0; transform: scale(0.85) translateY(20px); }
  to   { opacity: 1; transform: scale(1)   translateY(0);     }
}
.aniv-modal { animation: fadeInScale 0.4s cubic-bezier(.34,1.56,.64,1) forwards; }
.aniv-particle { position: absolute; animation: floatUp 2.5s ease-out infinite; pointer-events: none; }
.aniv-sway { animation: sway 3s ease-in-out infinite; }
`;

const PARTICULAS_F = ['🌸','🌺','🌷','🌹','🌻','💐','🦋','✨','💫','🌿'];
const PARTICULAS_M = ['🏍','🚗','⚡','🔥','🎯','🏆','💪','🎸','🌊','⭐'];

function gerarParticulas(sexo, n = 14) {
  const lista = sexo === 'F' ? PARTICULAS_F : PARTICULAS_M;
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    emoji: lista[i % lista.length],
    left:  `${5 + Math.random() * 90}%`,
    delay: `${Math.random() * 2.5}s`,
    dur:   `${2 + Math.random() * 2}s`,
    size:  `${14 + Math.random() * 14}px`,
  }));
}

const BG_F = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 40%, #a18cd1 100%)';
const BG_M = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)';

const MSGS_F = [
  'Que este dia seja tão radiante quanto você! 🌸',
  'Flores de primavera para uma pessoa especial! 🌷',
  'Que sua vida seja sempre repleta de beleza e alegria! 💐',
  'Um dia mágico para uma pessoa incrível! 🦋',
];
const MSGS_M = [
  'Acelera os motores — é seu dia! 🏍',
  'Que sua vida seja sempre cheia de adrenalina e conquistas! 🏆',
  'Mais um ano na estrada, e que venham muitas aventuras! 🔥',
  'Um guerreiro merece a melhor comemoração! 💪',
];

export default function AlertaAniversario() {
  const { usuario } = useApp();
  const [aniversariante, setAniversariante] = useState(null);
  const [fechado, setFechado] = useState(false);
  const [particulas, setParticulas] = useState([]);

  useEffect(() => {
    async function verificar() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !usuario?.id) return;

        // Chave para não mostrar mais de uma vez por dia
        const chave = `aniv_visto_${usuario.id}_${new Date().toISOString().split('T')[0]}`;
        if (localStorage.getItem(chave)) return;

        // Buscar colaborador vinculado ao usuário logado pelo email
        const { data: colab } = await supabase
          .from('colaboradores')
          .select('id, nome_completo, sexo, dt_aniversario, foto_url')
          .eq('email', usuario.email)
          .eq('ativo', true)
          .maybeSingle();

        if (!colab?.dt_aniversario) return;

        const hoje = new Date();
        const aniv = new Date(colab.dt_aniversario + 'T00:00:00');
        const mesIgual = aniv.getMonth() === hoje.getMonth();
        const diaIgual = aniv.getDate()  === hoje.getDate();

        if (mesIgual && diaIgual) {
          setAniversariante(colab);
          setParticulas(gerarParticulas(colab.sexo));
          localStorage.setItem(chave, '1');
        }
      } catch (e) {
        console.warn('AlertaAniversario:', e.message);
      }
    }
    verificar();
  }, [usuario?.id, usuario?.email]);

  if (fechado || !aniversariante) return null;

  const isFem = aniversariante.sexo === 'F';
  const bg    = isFem ? BG_F : BG_M;
  const msgs  = isFem ? MSGS_F : MSGS_M;
  const msg   = msgs[Math.floor(Math.random() * msgs.length)];
  const primeiroNome = aniversariante.nome_completo?.split(' ')[0] || 'Você';

  return (
    <Portal>
      <style>{STYLE}</style>

      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>

        {/* Card */}
        <div className="aniv-modal" style={{
          position: 'relative', overflow: 'hidden',
          width: '100%', maxWidth: 420,
          borderRadius: 24, background: bg,
          padding: '48px 32px 40px',
          textAlign: 'center',
          color: '#fff',
        }}>

          {/* Partículas */}
          {particulas.map(p => (
            <span key={p.id} className="aniv-particle" style={{
              left: p.left, bottom: '-10px',
              fontSize: p.size,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}>{p.emoji}</span>
          ))}

          {/* Foto ou emoji */}
          <div className="aniv-sway" style={{ marginBottom: 16 }}>
            {aniversariante.foto_url ? (
              <img src={aniversariante.foto_url} alt="" style={{
                width: 90, height: 90, borderRadius: '50%',
                objectFit: 'cover',
                border: '4px solid rgba(255,255,255,0.6)',
                boxShadow: '0 0 30px rgba(255,255,255,0.3)',
              }} />
            ) : (
              <div style={{ fontSize: 72 }}>{isFem ? '🌸' : '🏆'}</div>
            )}
          </div>

          {/* Texto */}
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.8, marginBottom: 6 }}>
            {isFem ? '✨ Feliz Aniversário ✨' : '🔥 Feliz Aniversário 🔥'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
            {primeiroNome}!
          </div>
          <div style={{ fontSize: 15, opacity: 0.9, lineHeight: 1.5, marginBottom: 28, maxWidth: 300, margin: '0 auto 28px' }}>
            {msg}
          </div>

          {/* Decoração estilo */}
          <div style={{ fontSize: 28, marginBottom: 24, letterSpacing: 8 }}>
            {isFem
              ? '🌸 🌷 💐 🦋 🌺'
              : '🏍 ⚡ 🔥 🏆 🎯'}
          </div>

          <button
            onClick={() => setFechado(true)}
            style={{
              padding: '12px 40px', borderRadius: 50,
              border: '2px solid rgba(255,255,255,0.7)',
              background: 'rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', backdropFilter: 'blur(4px)',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseOut={e  => e.target.style.background = 'rgba(255,255,255,0.15)'}
          >
            {isFem ? '💐 Obrigada!' : '🤜 Valeu!'}
          </button>
        </div>
      </div>
    </Portal>
  );
}
