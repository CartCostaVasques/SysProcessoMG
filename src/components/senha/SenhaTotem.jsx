import { useState, useEffect } from 'react';
import { sbPublic as sb } from '../../lib/supabasePublic.js';

const HOJE = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

function gerarZPL(setor, numero, tipo) {
  const cod     = `${setor.prefixo}${String(numero).padStart(3, '0')}`;
  const hora    = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const data    = new Date().toLocaleDateString('pt-BR');
  const isPref  = tipo === 'preferencial';
  const linhaPref = isPref ? `^FO40,255^A0N,30,30^FD*** PREFERENCIAL ***^FS` : '';
  return `^XA\n^PW576\n^LL520\n^FO40,30^A0N,28,28^FDCartorio Costa Vasques^FS\n^FO40,70^GB496,2,2^FS\n^FO40,90^A0N,28,28^FD${setor.nome}^FS\n^FO40,145^A0N,110,110^FD${cod}^FS\n${linhaPref}\n^FO40,300^GB496,2,2^FS\n^FO40,320^A0N,26,26^FD${data}   ${hora}^FS\n^FO40,365^A0N,22,22^FDAguarde ser chamado^FS\n^XZ`;
}

async function imprimirZebra(zpl) {
  try {
    // Passo 1: descobre a impressora padrão
    const resDisc = await fetch('http://localhost:9100/available', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!resDisc.ok) return false;
    const dispData = await resDisc.json();
    const printer = dispData?.printer;
    if (!printer) return false;

    // Passo 2: envia o ZPL para a impressora
    const resSend = await fetch('http://localhost:9100/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device: printer, data: zpl }),
    });
    return resSend.ok;
  } catch {
    return false;
  }
}

function TelaSetores({ setores, onEscolher, nomeCartorio }) {
  const [hora, setHora] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const t = setInterval(() => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1e293b', padding: 'clamp(16px,3vw,24px) clamp(20px,5vw,40px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #334155' }}>
        <div>
          <div style={{ fontSize: 'clamp(22px, 4vw, 34px)', fontWeight: 800, color: '#f59e0b' }}>{nomeCartorio}</div>
          <div style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: '#64748b', marginTop: 4 }}>Toque para retirar sua senha</div>
        </div>
        <div style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{hora}</div>
      </div>
      <div style={{ flex: 1, padding: 'clamp(16px,3vw,40px)', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'clamp(12px,2vw,24px)', alignContent: 'start' }}>
        {setores.map(setor => (
          <button key={setor.id} onClick={() => onEscolher(setor)}
            style={{ padding: 'clamp(24px,4vw,40px) clamp(16px,3vw,24px)', background: '#1e293b', border: '2px solid #334155', borderRadius: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'clamp(10px,2vw,16px)', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.background = '#1e3a5f'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#1e293b'; }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: '#fff' }}>{setor.prefixo}</div>
            <div style={{ fontSize: 'clamp(18px,2.5vw,26px)', fontWeight: 700, color: '#1e40af', textAlign: 'center' }}>{setor.nome}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TelaTipo({ setor, onEscolher, onVoltar, loading }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#1e293b', padding: '24px 40px', display: 'flex', alignItems: 'center', gap: 20, borderBottom: '2px solid #334155' }}>
        <button onClick={onVoltar} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 20 }}>← Voltar</button>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>{setor.nome}</div>
          <div style={{ fontSize: 16, color: '#64748b' }}>Escolha o tipo de atendimento</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, padding: '60px 40px', alignContent: 'center' }}>
        <button onClick={() => onEscolher('normal')} disabled={loading}
          style={{ padding: '60px 20px', background: '#1e40af', border: '3px solid #3b82f6', borderRadius: 24, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = '#1d4ed8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1e40af')}>
          <span style={{ fontSize: 64 }}>🎫</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>Normal</span>
          <span style={{ fontSize: 16, color: '#93c5fd' }}>Atendimento geral</span>
        </button>
        <button onClick={() => onEscolher('preferencial')} disabled={loading}
          style={{ padding: '60px 20px', background: '#78350f', border: '3px solid #f59e0b', borderRadius: 24, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = '#92400e')}
          onMouseLeave={e => (e.currentTarget.style.background = '#78350f')}>
          <span style={{ fontSize: 64 }}>⭐</span>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#fbbf24' }}>Preferencial</span>
          <span style={{ fontSize: 16, color: '#fcd34d' }}>Idosos · Gestantes · PCD</span>
        </button>
      </div>
      {loading && <div style={{ textAlign: 'center', color: '#64748b', paddingBottom: 32, fontSize: 18 }}>⏳ Gerando senha...</div>}
    </div>
  );
}

function TelaConfirmacao({ cod, tipo, setor, onVoltar }) {
  useEffect(() => {
    const t = setTimeout(onVoltar, 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <div style={{ fontSize: 22, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 4 }}>{setor.nome}</div>
      <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 1, letterSpacing: -6, color: tipo === 'preferencial' ? '#f59e0b' : '#38bdf8', textShadow: tipo === 'preferencial' ? '0 0 80px rgba(245,158,11,.4)' : '0 0 80px rgba(56,189,248,.4)' }}>
        {cod}
      </div>
      {tipo === 'preferencial' && (
        <div style={{ fontSize: 26, fontWeight: 700, color: '#f59e0b', border: '3px solid #f59e0b', padding: '8px 28px', borderRadius: 14 }}>⭐ PREFERENCIAL</div>
      )}
      <div style={{ fontSize: 22, color: '#64748b', marginTop: 8 }}>Aguarde ser chamado</div>
      <div style={{ width: 260, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden', marginTop: 12 }}>
        <div style={{ height: '100%', background: '#38bdf8', borderRadius: 3, animation: 'encolher 6s linear forwards' }} />
      </div>
      <style>{`@keyframes encolher { from{width:100%} to{width:0} }`}</style>
    </div>
  );
}

export default function SenhaTotem() {
  const [setores, setSetores]           = useState([]);
  const [etapa, setEtapa]               = useState('setores');
  const [setorSel, setSetorSel]         = useState(null);
  const [emissao, setEmissao]           = useState(null);
  const [loading, setLoading]           = useState(false);
  const [nomeCartorio, setNomeCartorio] = useState('Cartório');

  useEffect(() => { carregarDados(); }, []);

  const carregarDados = async () => {
    const [{ data: cartData }, { data: setData }] = await Promise.all([
      sb.from('cartorio').select('nome, nome_simples').limit(1),
      sb.from('senha_setores').select('*').eq('ativo', true).order('ordem'),
    ]);
    const cart = cartData?.[0];
    if (cart) setNomeCartorio(cart.nome_simples || cart.nome || 'Cartório');
    setSetores(setData || []);
  };

  const escolherSetor = (setor) => { setSetorSel(setor); setEtapa('tipo'); };

  const escolherTipo = async (tipo) => {
    if (loading) return;
    setLoading(true);
    try {
      const { data: ultimas } = await sb
        .from('senhas').select('numero')
        .eq('setor_id', setorSel.id)
        .gte('criado_em', HOJE() + 'T00:00:00-03:00')
        .order('numero', { ascending: false }).limit(1);

      const numero = ultimas?.length > 0 ? ultimas[0].numero + 1 : 1;
      const cod    = `${setorSel.prefixo}${String(numero).padStart(3, '0')}`;

      const { error } = await sb.from('senhas').insert({ setor_id: setorSel.id, numero, tipo, status: 'aguardando' });
      if (error) throw error;

      await imprimirZebra(gerarZPL(setorSel, numero, tipo));
      setEmissao({ cod, tipo, setor: setorSel });
      setEtapa('confirmacao');
    } catch (e) {
      alert('Erro ao gerar senha: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const voltar = () => { setEtapa('setores'); setSetorSel(null); setEmissao(null); };

  if (etapa === 'tipo')        return <TelaTipo setor={setorSel} onEscolher={escolherTipo} onVoltar={voltar} loading={loading} />;
  if (etapa === 'confirmacao') return <TelaConfirmacao {...emissao} onVoltar={voltar} />;
  return <TelaSetores setores={setores} onEscolher={escolherSetor} nomeCartorio={nomeCartorio} />;
}
