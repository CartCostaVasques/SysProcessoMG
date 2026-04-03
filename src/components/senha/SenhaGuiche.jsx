import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const HOJE = () => new Date().toISOString().split('T')[0];

export default function SenhaGuiche() {
  const { supabaseClient: sb, addToast } = useApp();
  const [setores, setSetores]       = useState([]);
  const [senhas, setSenhas]         = useState([]);
  const [filtroSetor, setFiltroSetor] = useState('');
  const [guiche, setGuiche]         = useState(localStorage.getItem('guiche_nome') || '');
  const [editGuiche, setEditGuiche] = useState(!guiche);
  const [guicheTemp, setGuicheTemp] = useState(guiche);
  const [chamando, setChamando]     = useState(false);
  const [ultimaChamada, setUltima]  = useState(null);

  useEffect(() => {
    carregarDados();

    const canal = sb.channel('guiche-senhas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'senhas' }, () => {
        carregarDados();
      })
      .subscribe();

    return () => sb.removeChannel(canal);
  }, []);

  const carregarDados = async () => {
    const { data: setsData } = await sb.from('senha_setores').select('*').eq('ativo', true).order('ordem');
    setSetores(setsData || []);

    const { data: senhasData } = await sb.from('senhas')
      .select('*, senha_setores(nome, prefixo)')
      .eq('status', 'aguardando')
      .gte('criado_em', HOJE() + 'T00:00:00-03:00')
      .order('tipo', { ascending: false }) // preferencial primeiro
      .order('criado_em', { ascending: true });
    setSenhas(senhasData || []);
  };

  const getCod = (s) => {
    const setor = s.senha_setores;
    if (!setor) return '---';
    return `${setor.prefixo}${String(s.numero).padStart(3, '0')}`;
  };

  // Separa preferencial e normal, filtra por setor se houver
  const senhasFiltradas = useMemo(() => {
    let lista = senhas;
    if (filtroSetor) lista = lista.filter(s => s.setor_id === filtroSetor);
    const pref = lista.filter(s => s.tipo === 'preferencial');
    const norm = lista.filter(s => s.tipo === 'normal');
    return [...pref, ...norm];
  }, [senhas, filtroSetor]);

  const chamarProxima = async () => {
    if (chamando || senhasFiltradas.length === 0) return;
    setChamando(true);
    try {
      const proxima = senhasFiltradas[0];
      const { error } = await sb.from('senhas').update({
        status: 'chamada',
        guiche: guiche || null,
        chamado_em: new Date().toISOString(),
      }).eq('id', proxima.id);
      if (error) throw error;
      setUltima(proxima);
      await carregarDados();
    } catch (e) {
      addToast('Erro ao chamar senha: ' + e.message, 'error');
    } finally {
      setChamando(false);
    }
  };

  const chamarSenhaEspecifica = async (senha) => {
    if (chamando) return;
    setChamando(true);
    try {
      const { error } = await sb.from('senhas').update({
        status: 'chamada',
        guiche: guiche || null,
        chamado_em: new Date().toISOString(),
      }).eq('id', senha.id);
      if (error) throw error;
      setUltima(senha);
      await carregarDados();
    } catch (e) {
      addToast('Erro ao chamar senha', 'error');
    } finally {
      setChamando(false);
    }
  };

  const salvarGuiche = () => {
    setGuiche(guicheTemp);
    localStorage.setItem('guiche_nome', guicheTemp);
    setEditGuiche(false);
  };

  const totalPref = senhasFiltradas.filter(s => s.tipo === 'preferencial').length;
  const totalNorm = senhasFiltradas.filter(s => s.tipo === 'normal').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">🎫 Gerenciador de Senhas</div>
          <div className="page-sub">{senhasFiltradas.length} senha(s) aguardando · {totalPref} preferencial · {totalNorm} normal</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Identificação do guichê */}
          {editGuiche ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input className="form-input" value={guicheTemp} onChange={e => setGuicheTemp(e.target.value)}
                placeholder="Nome do guichê..." style={{ width: 180, height: 36, fontSize: 13 }}
                onKeyDown={e => e.key === 'Enter' && salvarGuiche()} />
              <button className="btn btn-primary btn-sm" onClick={salvarGuiche}>✓</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <div style={{ padding: '6px 14px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-text-muted)' }}>
                {guiche ? `Guichê: ${guiche}` : 'Sem guichê'}
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setGuicheTemp(guiche); setEditGuiche(true); }}>✎</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

        {/* Coluna principal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Ação principal */}
          <div className="card" style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '20px 24px' }}>
            <button onClick={chamarProxima} disabled={chamando || senhasFiltradas.length === 0}
              style={{
                flex: 1, padding: '20px', fontSize: 20, fontWeight: 700,
                background: senhasFiltradas.length > 0 ? 'var(--color-accent)' : 'var(--color-surface-2)',
                color: senhasFiltradas.length > 0 ? '#fff' : 'var(--color-text-faint)',
                border: 'none', borderRadius: 'var(--radius-md)', cursor: senhasFiltradas.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'all .15s',
              }}>
              {chamando ? '⏳ Chamando...' : senhasFiltradas.length > 0 ? '📢 Chamar Próxima' : 'Nenhuma senha na fila'}
            </button>

            {/* Filtro de setor */}
            <div style={{ minWidth: 200 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Filtrar setor</div>
              <select className="form-select" value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)}>
                <option value="">Todos os setores</option>
                {setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Última chamada */}
          {ultimaChamada && (
            <div style={{ padding: '16px 20px', background: 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))', border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Última chamada:</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: ultimaChamada.tipo === 'preferencial' ? 'var(--color-warning)' : 'var(--color-accent)' }}>
                {getCod(ultimaChamada)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{ultimaChamada.senha_setores?.nome}</div>
              {ultimaChamada.tipo === 'preferencial' && <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>⭐ Preferencial</span>}
            </div>
          )}

          {/* Fila de senhas */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Fila de Espera</div>
            </div>

            {senhasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-faint)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div>Nenhuma senha aguardando</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Separador preferencial */}
                {totalPref > 0 && (
                  <div style={{ padding: '6px 14px', background: 'color-mix(in srgb, var(--color-warning) 8%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)', fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    ⭐ Preferencial — {totalPref}
                  </div>
                )}
                {senhasFiltradas.filter(s => s.tipo === 'preferencial').map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: i === 0 && !filtroSetor ? 'color-mix(in srgb, var(--color-warning) 5%, transparent)' : 'transparent' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-warning)', minWidth: 80 }}>{getCod(s)}</div>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-muted)' }}>{s.senha_setores?.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{new Date(s.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <button onClick={() => chamarSenhaEspecifica(s)} disabled={chamando}
                      className="btn btn-secondary btn-sm">📢 Chamar</button>
                  </div>
                ))}

                {/* Separador normal */}
                {totalNorm > 0 && (
                  <div style={{ padding: '6px 14px', background: 'color-mix(in srgb, var(--color-accent) 5%, transparent)', borderBottom: '1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)', fontSize: 11, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    🎫 Normal — {totalNorm}
                  </div>
                )}
                {senhasFiltradas.filter(s => s.tipo === 'normal').map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--color-border)', background: i === 0 && totalPref === 0 && !filtroSetor ? 'color-mix(in srgb, var(--color-accent) 5%, transparent)' : 'transparent' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--color-accent)', minWidth: 80 }}>{getCod(s)}</div>
                    <div style={{ flex: 1, fontSize: 13, color: 'var(--color-text-muted)' }}>{s.senha_setores?.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{new Date(s.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <button onClick={() => chamarSenhaEspecifica(s)} disabled={chamando}
                      className="btn btn-secondary btn-sm">📢 Chamar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna lateral — contadores por setor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Por Setor</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {setores.map(setor => {
                const qtd = senhas.filter(s => s.setor_id === setor.id).length;
                const pref = senhas.filter(s => s.setor_id === setor.id && s.tipo === 'preferencial').length;
                return (
                  <div key={setor.id} onClick={() => setFiltroSetor(filtroSetor === setor.id ? '' : setor.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: filtroSetor === setor.id ? 'color-mix(in srgb, var(--color-accent) 10%, transparent)' : 'var(--color-surface-2)', border: `1px solid ${filtroSetor === setor.id ? 'var(--color-accent)' : 'transparent'}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{setor.prefixo}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 500 }}>{setor.nome}</div>
                      {pref > 0 && <div style={{ fontSize: 10, color: 'var(--color-warning)' }}>⭐ {pref} preferencial</div>}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: qtd > 0 ? 'var(--color-text)' : 'var(--color-text-faint)' }}>{qtd}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Links das telas externas */}
          <div className="card">
            <div className="card-header"><div className="card-title">Telas externas</div></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: '📺 Painel (TV)', path: '/senha/painel' },
                { label: '🖥 Totem (Tablet)', path: '/senha/totem' },
              ].map(({ label, path }) => (
                <button key={path} onClick={() => window.open(path, '_blank')}
                  className="btn btn-secondary" style={{ textAlign: 'left', fontSize: 13 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
