import { useState, useEffect } from 'react';
import { sbPublic as sb } from '../../lib/supabasePublic.js';

const HOJE = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ── Impressão Bematech via proxy local (Termux) ──────────────────────────────
function gerarDadosImpressao(nomeCartorio, setor, cod, tipo, cfg) {
  const hora   = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const getTam = (chave) => (cfg && cfg[chave]) || 'normal';
  return {
    cartorio:  nomeCartorio,
    setor:     setor.nome,
    senha:     cod,
    hora,
    preferencial: tipo === 'preferencial',
    tam_cartorio: getTam('imp_tam_cartorio'),
    tam_setor:    getTam('imp_tam_setor'),
    tam_senha:    getTam('imp_tam_senha'),
    tam_hora:     getTam('imp_tam_hora'),
    rodape:    (cfg && cfg['imp_rodape']) || 'Seja Bem-Vindo!',
    info:      (cfg && cfg['imp_info'])   || '',
  };
}

async function imprimirBematech(dados, proxyPorta = '8080') {
  try {
    const res = await fetch(`http://localhost:${proxyPorta}/imprimir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    return res.ok;
  } catch {
    return false;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

function TelaSetores({ setores, onEscolher, nomeCartorio, config }) {
  const [hora, setHora] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const t = setInterval(() => setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })), 1000);
    return () => clearInterval(t);
  }, []);
  const nSetores = setores.length;
  const linhas = Math.ceil(nSetores / 2);
  const nSetores = setores.length;
  const colunas = nSetores <= 4 ? 2 : nSetores <= 6 ? 3 : 4;
  return (
    <div style={{ height: '100vh', width: '100vw', background: config['totem_cor_fundo'] || '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#1e293b', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #334155', flexShrink: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: config['totem_cor_nome_cartorio'] || '#f59e0b' }}>{nomeCartorio}</div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{hora}</div>
      </div>

      {/* Título */}
      <div style={{ textAlign: 'center', padding: '8px 16px 4px', flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Painel de Senha</div>
        <div style={{ fontSize: 14, color: '#64748b', marginTop: 2 }}>Selecione o setor que deseja atendimento</div>
      </div>

      {/* Grid — ocupa o espaço restante igualmente */}
      <div style={{ flex: 1, padding: '6px 12px 10px', display: 'grid', gridTemplateColumns: `repeat(${colunas}, 1fr)`, gap: 8, minHeight: 0 }}>
        {setores.map(setor => (
          <button key={setor.id} onClick={() => onEscolher(setor)}
            style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: 12, cursor: 'pointer', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'all .15s', minHeight: 0, padding: '0 16px' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.background = '#1e3a5f'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.background = '#1e293b'; }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: config['totem_cor_prefixo_bg'] || '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{setor.prefixo}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: config['totem_cor_nome_setor'] || '#1e40af', textAlign: 'left', lineHeight: 1.2 }}>{setor.nome}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TelaTipo({ setor, onEscolher, onVoltar, loading }) {
  return (
    <div style={{ height: '100vh', width: '100vw', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ background: '#1e293b', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #334155', flexShrink: 0 }}>
        <button onClick={onVoltar} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 16 }}>← Voltar</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>{setor.nome}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Escolha o tipo de atendimento</div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px', alignContent: 'center' }}>
        <button onClick={() => onEscolher('normal')} disabled={loading}
          style={{ padding: '20px 12px', background: '#1e40af', border: '3px solid #3b82f6', borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = '#1d4ed8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#1e40af')}>
          <span style={{ fontSize: 40 }}>🎫</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>Normal</span>
          <span style={{ fontSize: 13, color: '#93c5fd' }}>Atendimento geral</span>
        </button>
        <button onClick={() => onEscolher('preferencial')} disabled={loading}
          style={{ padding: '20px 12px', background: '#78350f', border: '3px solid #f59e0b', borderRadius: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: loading ? 0.6 : 1 }}
          onMouseEnter={e => !loading && (e.currentTarget.style.background = '#92400e')}
          onMouseLeave={e => (e.currentTarget.style.background = '#78350f')}>
          <span style={{ fontSize: 40 }}>⭐</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>Preferencial</span>
          <span style={{ fontSize: 13, color: '#fcd34d' }}>Idosos · Gestantes · PCD</span>
        </button>
      </div>
      {loading && <div style={{ textAlign: 'center', color: '#64748b', paddingBottom: 16, fontSize: 14 }}>⏳ Gerando senha...</div>}
    </div>
  );
}

function TelaConfirmacao({ cod, tipo, setor, onVoltar }) {
  useEffect(() => {
    const t = setTimeout(onVoltar, 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ height: '100vh', width: '100vw', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden' }}>
      <div style={{ fontSize: 16, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 3 }}>{setor.nome}</div>
      <div style={{ fontSize: 110, fontWeight: 900, lineHeight: 1, letterSpacing: -4, color: tipo === 'preferencial' ? '#f59e0b' : '#38bdf8', textShadow: tipo === 'preferencial' ? '0 0 60px rgba(245,158,11,.4)' : '0 0 60px rgba(56,189,248,.4)' }}>
        {cod}
      </div>
      {tipo === 'preferencial' && (
        <div style={{ fontSize: 26, fontWeight: 700, color: '#f59e0b', border: '3px solid #f59e0b', padding: '8px 28px', borderRadius: 14 }}>⭐ PREFERENCIAL</div>
      )}
      <div style={{ fontSize: 16, color: '#64748b', marginTop: 4 }}>Aguarde ser chamado</div>
      <div style={{ width: 200, height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
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
  const [config, setConfig]             = useState({});

  useEffect(() => {
    carregarDados();

    const canal = sb.channel('totem-config')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'senha_config' }, () => {
        setTimeout(() => sb.from('senha_config').select('chave, valor').then(({ data }) => {
          if (data) setConfig(Object.fromEntries(data.map(r => [r.chave, r.valor])));
        }), 400);
      })
      .subscribe();

    return () => sb.removeChannel(canal);
  }, []);

  const carregarDados = async () => {
    const [{ data: cartData }, { data: setData }, { data: cfgData }] = await Promise.all([
      sb.from('cartorio').select('nome, nome_simples').limit(1),
      sb.from('senha_setores').select('*').eq('ativo', true).order('ordem'),
      sb.from('senha_config').select('chave, valor'),
    ]);
    const cart = cartData?.[0];
    if (cart) setNomeCartorio(cart.nome_simples || cart.nome || 'Cartório');
    setSetores(setData || []);
    if (cfgData) setConfig(Object.fromEntries(cfgData.map(r => [r.chave, r.valor])));
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
      const cod    = `${setorSel.prefixo}${String(numero).padStart(2, '0')}`;

      const { error } = await sb.from('senhas').insert({ setor_id: setorSel.id, numero, tipo, status: 'aguardando' });
      if (error) throw error;

      const proxyPorta = config['imp_proxy_porta'] || '8080';
      await imprimirBematech(gerarDadosImpressao(nomeCartorio, setorSel, cod, tipo, config), proxyPorta);
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
  return <TelaSetores setores={setores} onEscolher={escolherSetor} nomeCartorio={nomeCartorio} config={config} />;
}
