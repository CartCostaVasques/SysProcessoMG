import { useState, useEffect } from 'react';
import { sbPublic as sb } from '../../lib/supabasePublic.js';

const HOJE = () => new Date().toISOString().split('T')[0];

function gerarZPL(setor, numero, tipo, cartorio = 'Cartório Costa Vasques') {
  const cod = `${setor.prefixo}${String(numero).padStart(3, '0')}`;
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const data = new Date().toLocaleDateString('pt-BR');
  const pref = tipo === 'preferencial' ? '^FO40,230^A0N,28,28^FDPREFERENCIAl^FS' : '';

  return `^XA
^PW576
^LL480
^FO40,30^A0N,30,30^FD${cartorio}^FS
^FO40,75^GB496,2,2^FS
^FO40,100^A0N,28,28^FD${setor.nome}^FS
^FO40,160^A0N,120,120^FD${cod}^FS
${pref}
^FO40,290^GB496,2,2^FS
^FO40,310^A0N,26,26^FD${data}   ${hora}^FS
^FO40,360^A0N,22,22^FDAguarde ser chamado^FS
^XZ`;
}

async function imprimirZebra(zpl) {
  try {
    // Zebra Browser Print — agente local
    const res = await fetch('http://localhost:9100/write', {
      method: 'POST',
      body: JSON.stringify({ device: { connection: 'network' }, data: zpl }),
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    // Fallback: window.print com layout térmico
    const win = window.open('', '_blank', 'width=300,height=500');
    win.document.write(`<html><head><style>
      body{font-family:monospace;text-align:center;margin:0;padding:8px;font-size:14px}
      .cod{font-size:64px;font-weight:900;margin:8px 0}
      .pref{font-size:18px;font-weight:700;color:#000;border:2px solid #000;padding:2px 8px;display:inline-block;margin:4px 0}
      hr{border:1px dashed #000}
      @media print{@page{margin:0;size:80mm auto}}
    </style></head><body onload="window.print();window.close()">
      <b>Cartório Costa Vasques</b><hr>
      <div>${win._setor}</div>
      <div class="cod">${win._cod}</div>
      ${win._pref ? '<div class="pref">⭐ PREFERENCIAL</div>' : ''}
      <hr><small>${win._data}</small>
      <br><small>Aguarde ser chamado</small>
    </body></html>`);
    return true;
  }
}

export default function SenhaTotem() {
  const [setores, setSetores]     = useState([]);
  const [emissao, setEmissao]     = useState(null); // { setor, numero, tipo, cod }
  const [loading, setLoading]     = useState(false);
  const [hora, setHora]           = useState('');

  useEffect(() => {
    carregarSetores();
    const t = setInterval(() => {
      setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const carregarSetores = async () => {
    const { data } = await sb.from('senha_setores').select('*').eq('ativo', true).order('ordem');
    setSetores(data || []);
  };

  const gerarSenha = async (setor, tipo) => {
    if (loading) return;
    setLoading(true);
    try {
      // Pega o próximo número do dia
      const { data: ultimas } = await sb
        .from('senhas')
        .select('numero')
        .eq('setor_id', setor.id)
        .gte('criado_em', HOJE() + 'T00:00:00-03:00')
        .order('numero', { ascending: false })
        .limit(1);

      const numero = ultimas?.length > 0 ? ultimas[0].numero + 1 : 1;
      const cod = `${setor.prefixo}${String(numero).padStart(3, '0')}`;

      const { error } = await sb.from('senhas').insert({
        setor_id: setor.id,
        numero,
        tipo,
        status: 'aguardando',
      });
      if (error) throw error;

      // Imprime
      const zpl = gerarZPL(setor, numero, tipo);
      await imprimirZebra(zpl);

      setEmissao({ setor, numero, tipo, cod });
      setTimeout(() => setEmissao(null), 5000);
    } catch (e) {
      alert('Erro ao gerar senha: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (emissao) {
    return (
      <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <div style={{ fontSize: 28, color: '#94a3b8' }}>{emissao.setor.nome}</div>
        <div style={{ fontSize: 160, fontWeight: 900, color: emissao.tipo === 'preferencial' ? '#f59e0b' : '#38bdf8', lineHeight: 1, letterSpacing: -4 }}>{emissao.cod}</div>
        {emissao.tipo === 'preferencial' && (
          <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b', border: '3px solid #f59e0b', padding: '8px 24px', borderRadius: 12 }}>⭐ PREFERENCIAL</div>
        )}
        <div style={{ fontSize: 22, color: '#64748b', marginTop: 16 }}>Aguarde ser chamado</div>
        <div style={{ marginTop: 32, width: 200, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#38bdf8', borderRadius: 3, animation: 'shrink 5s linear forwards' }} />
        </div>
        <style>{`@keyframes shrink { from{width:100%} to{width:0%} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>Cartório Costa Vasques</div>
          <div style={{ fontSize: 16, color: '#64748b', marginTop: 4 }}>Retire sua senha</div>
        </div>
        <div style={{ fontSize: 48, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{hora}</div>
      </div>

      {/* Setores */}
      <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {setores.map(setor => (
          <div key={setor.id}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2 }}>
              {setor.nome}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Normal */}
              <button onClick={() => gerarSenha(setor, 'normal')} disabled={loading}
                style={{ padding: '32px 20px', background: '#1e40af', border: 'none', borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'all .15s', opacity: loading ? 0.6 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                onMouseLeave={e => e.currentTarget.style.background = '#1e40af'}>
                <span style={{ fontSize: 40 }}>🎫</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Normal</span>
                <span style={{ fontSize: 13, color: '#93c5fd' }}>{setor.prefixo}001, {setor.prefixo}002...</span>
              </button>
              {/* Preferencial */}
              <button onClick={() => gerarSenha(setor, 'preferencial')} disabled={loading}
                style={{ padding: '32px 20px', background: '#78350f', border: 'none', borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, transition: 'all .15s', opacity: loading ? 0.6 : 1 }}
                onMouseEnter={e => e.currentTarget.style.background = '#92400e'}
                onMouseLeave={e => e.currentTarget.style.background = '#78350f'}>
                <span style={{ fontSize: 40 }}>⭐</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>Preferencial</span>
                <span style={{ fontSize: 13, color: '#fcd34d' }}>Idosos, gestantes, PCD</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
