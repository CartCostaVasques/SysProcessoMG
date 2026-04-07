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
  const [cfg, setCfg]                   = useState({});
  const ultimaRef = useRef(null);
  const [ativado, setAtivado] = useState(false);

  useEffect(() => {
    carregarDados();
    const t = setInterval(() => {
      const agora = new Date();
      setHora(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setData(agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    }, 1000);

    // Realtime
    const canal = sb.channel('painel-senhas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'senha_config' }, () => {
        setTimeout(() => sb.from('senha_config').select('chave, valor').then(({ data: cfgRows }) => {
          if (cfgRows) setCfg(Object.fromEntries(cfgRows.map(r => [r.chave, r.valor])));
        }), 400);
      })
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
              const cod = `${setor.prefixo}${String(nova.numero).padStart(2, '0')}`;
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

  const ativarAudio = () => {
    // Um speak() silencioso garante a ativação do contexto de áudio pelo browser
    const msg = new SpeechSynthesisUtterance(' ');
    msg.volume = 0;
    window.speechSynthesis.speak(msg);
    setAtivado(true);
  };

  const carregarDados = async () => {
    const { data: setsData } = await sb.from('senha_setores').select('*').eq('ativo', true);
    const mapa = {};
    (setsData || []).forEach(s => { mapa[s.id] = s; });
    setSetores(mapa);

    const [{ data: cartData }, { data: cfgData }] = await Promise.all([
      sb.from('cartorio').select('nome, nome_simples').limit(1),
      sb.from('senha_config').select('chave, valor'),
    ]);
    if (cfgData) setCfg(Object.fromEntries(cfgData.map(r => [r.chave, r.valor])));
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

  const tempoRelativo = (iso) => {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s atrás`;
    const m = Math.floor(diff / 60);
    if (m < 60) return m === 1 ? '1 minuto atrás' : `${m} minutos atrás`;
    const h = Math.floor(m / 60);
    return h === 1 ? '1 hora atrás' : `${h} horas atrás`;
  };

  const fundoCfg = cfg['painel_cor_fundo'] || '#1e2433';

  // Cores derivadas do fundo — mais claras/escuras para criar hierarquia
  const isLight = (hex) => {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (r*299 + g*587 + b*114) / 1000 > 128;
  };
  const light = isLight(fundoCfg);
  const fundoHeader  = light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const fundoCentral = light ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.25)';
  const fundoLateral = light ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0.30)';
  const bordaCor     = light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.08)';
  const textoCor     = light ? '#1a1a1a' : '#f8fafc';
  const textoMuted   = light ? 'rgba(0,0,0,0.5)' : '#6b7280';

  const getCod = (s) => {
    const setor = s.senha_setores || setores[s.setor_id];
    if (!setor) return '---';
    return `${setor.prefixo}${String(s.numero).padStart(2, '0')}`;
  };

  const getNomeSetor = (s) => s.senha_setores?.nome || setores[s.setor_id]?.nome || '—';

  return (
    <>
    {!ativado && (
      <div onClick={ativarAudio} style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 24 }}>
        <div style={{ fontSize: 72 }}>📺</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>Painel de Atendimento</div>
        <div style={{ fontSize: 18, color: '#94a3b8' }}>Toque para iniciar o painel com áudio</div>
        <div style={{ marginTop: 16, padding: '16px 48px', background: '#1e40af', borderRadius: 16, fontSize: 20, fontWeight: 700, color: '#fff' }}>▶ Iniciar</div>
      </div>
    )}
    {ativado && <div style={{ height: '100vh', background: cfg['painel_cor_fundo'] || '#1e2433', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>

      {/* Header — cinza escuro com logo e nome âmbar */}
      <div style={{ background: fundoHeader, padding: '14px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${bordaCor}` }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 800, color: cfg['painel_cor_nome_cartorio'] || '#f59e0b', letterSpacing: 0.5, lineHeight: 1.1 }}>{nomeCartorio}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', lineHeight: 1 }}>{hora}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, textTransform: 'capitalize' }}>{data}</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', gap: 0, overflow: 'hidden' }}>

        {/* Senha atual — área principal em cinza médio */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: fundoCentral, position: 'relative' }}>
          {ultimaChamada ? (
            <>
              <div style={{ fontSize: 16, color: textoMuted, textTransform: 'uppercase', letterSpacing: 6, marginBottom: 12 }}>Senha Chamada</div>
              {/* Setor em destaque */}
              <div style={{ fontSize: 32, fontWeight: 800, color: textoCor, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 3, background: fundoLateral, padding: '6px 28px', borderRadius: 10 }}>
                {getNomeSetor(ultimaChamada)}
              </div>
              {/* Código com borda âmbar */}
              <div style={{
                fontSize: 180, fontWeight: 900, lineHeight: 1,
                color: ultimaChamada.tipo === 'preferencial' ? (cfg['painel_cor_senha_pref'] || '#f59e0b') : (cfg['painel_cor_senha_normal'] || '#38bdf8'),
                letterSpacing: -8,
                textShadow: ultimaChamada.tipo === 'preferencial'
                  ? '0 0 80px rgba(245,158,11,0.5)'
                  : '0 0 80px rgba(56,189,248,0.4)',
                WebkitTextStroke: `3px ${ultimaChamada.tipo === 'preferencial' ? 'rgba(245,158,11,0.6)' : 'rgba(245,158,11,0.5)'}`,
              }}>
                {getCod(ultimaChamada)}
              </div>
              {ultimaChamada.tipo === 'preferencial' && (
                <div style={{ fontSize: 26, fontWeight: 700, color: cfg['painel_cor_senha_pref'] || '#f59e0b', border: `3px solid ${cfg['painel_cor_senha_pref'] || '#f59e0b'}`, padding: '6px 24px', borderRadius: 12, marginTop: 16 }}>
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
          {/* Faixa do atendente — mesma largura do header */}
          {ultimaChamada?.guiche && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: '360px', background: fundoHeader, borderTop: `2px solid ${bordaCor}`, padding: '12px 40px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 14, color: textoMuted, textTransform: 'uppercase', letterSpacing: 2, flexShrink: 0 }}>Atendente:</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: cfg['painel_cor_nome_cartorio'] || '#f59e0b', textTransform: 'uppercase', letterSpacing: 1 }}>{ultimaChamada.guiche}</div>
            </div>
          )}
        </div>

        {/* Histórico lateral — cinza escuro */}
        <div style={{ background: fundoLateral, borderLeft: `2px solid ${bordaCor}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `2px solid ${bordaCor}`, fontSize: 12, fontWeight: 700, color: textoMuted, textTransform: 'uppercase', letterSpacing: 3 }}>
            Últimas Chamadas
          </div>
          <div style={{ flex: 1, overflowY: 'hidden', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {historico.map((s, i) => {
              const cod = getCod(s);
              const nomeSetor = getNomeSetor(s);
              const isPref = s.tipo === 'preferencial';
              const corSenha = isPref ? (cfg['painel_cor_senha_pref'] || '#f59e0b') : (cfg['painel_cor_senha_normal'] || '#38bdf8');

              // i===0 é a última (já na tela grande), i===1 é a penúltima — card expandido
              if (i === 0) return null;

              if (i === 1) {
                return (
                  <div key={s.id} style={{ borderRadius: 10, background: fundoHeader, border: `1px solid ${bordaCor}`, overflow: 'hidden', marginBottom: 4 }}>
                    {/* Label topo */}
                    <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: textoMuted, textTransform: 'uppercase', letterSpacing: 2, padding: '6px 0 4px', borderBottom: `1px solid ${bordaCor}` }}>
                      Senha anterior
                    </div>
                    {/* Código */}
                    <div style={{ textAlign: 'center', padding: '10px 8px 4px' }}>
                      <div style={{ fontSize: 55, fontWeight: 900, color: corSenha, letterSpacing: -2, lineHeight: 1 }}>
                        {cod}{isPref && <span style={{ fontSize: 18, marginLeft: 4 }}>⭐</span>}
                      </div>
                    </div>
                    {/* Setor */}
                    <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, color: textoCor, textTransform: 'uppercase', letterSpacing: 1, padding: '6px 8px', borderTop: `1px solid ${bordaCor}`, borderBottom: `1px solid ${bordaCor}` }}>
                      {nomeSetor}
                    </div>
                    {/* Tempo */}
                    <div style={{ textAlign: 'center', fontSize: 13, color: textoMuted, padding: '6px 8px 10px' }}>
                      {tempoRelativo(s.chamado_em)}
                    </div>
                  </div>
                );
              }

              // demais — compactas
              const opacity = Math.max(0.35, 1 - (i - 1) * 0.1);
              return (
                <div key={s.id} style={{ padding: '8px 12px', borderRadius: 8, background: i % 2 === 0 ? fundoHeader : 'transparent', display: 'flex', alignItems: 'center', gap: 0, opacity, transition: 'all .3s' }}>
                  {/* Coluna: código + tempo — largura fixa para alinhar tudo */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 100, flexShrink: 0 }}>
                    <div style={{ fontSize: 29, fontWeight: 900, color: corSenha, letterSpacing: -1, lineHeight: 1 }}>{cod}</div>
                    <div style={{ fontSize: 11, color: textoMuted, opacity: 0.7 }}>{tempoRelativo(s.chamado_em)}</div>
                  </div>
                  {/* Estrela — largura fixa, centralizada, sempre ocupa o espaço */}
                  <div style={{ width: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isPref && <span style={{ fontSize: 14, color: cfg['painel_cor_senha_pref'] || '#f59e0b' }}>⭐</span>}
                  </div>
                  {/* Setor — alinhado após a estrela */}
                  <div style={{ fontSize: 17, color: textoMuted, flex: 1 }}>{nomeSetor}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>}
    </>
  );
}
