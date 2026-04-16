import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext.jsx';

export default function AlertaCasamento() {
  const { supabaseClient: sb, usuario } = useApp();
  const [alertas, setAlertas] = useState([]);

  const carregar = useCallback(async () => {
    if (!usuario?.id) return;

    // Busca casamentos agendados nos próximos 3 dias onde o responsável é o usuário logado
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 3);
    limite.setHours(23, 59, 59, 999);

    const { data } = await sb.from('casamentos')
      .select('id, noivo1, noivo2, dt_celebracao, responsavel_id')
      .eq('status', 'agendado')
      .eq('responsavel_id', usuario.id)
      .gte('dt_celebracao', hoje.toISOString())
      .lte('dt_celebracao', limite.toISOString())
      .order('dt_celebracao', { ascending: true });

    setAlertas(data || []);
  }, [sb, usuario?.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const dispensar = (id) => setAlertas(prev => prev.filter(a => a.id !== id));
  const dispensarTodos = () => setAlertas([]);

  const diasAte = (iso) => {
    const d = new Date(iso);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.ceil((d - hoje) / 86400000);
  };

  const fmtDtHora = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (!alertas.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 3000,
      display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 340,
    }}>
      {alertas.map(c => {
        const dias = diasAte(c.dt_celebracao);
        const urgente = dias === 0;
        const cor = urgente ? '#ef4444' : dias === 1 ? '#f97316' : '#eab308';
        return (
          <div key={c.id} style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: `4px solid ${cor}`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            animation: 'slideInCasamento .2s ease',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', background: 'var(--color-surface-2)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: cor, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 16, flexShrink: 0,
              }}>💍</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                  Casamento em {urgente ? 'HOJE!' : dias === 1 ? '1 dia' : `${dias} dias`}
                </div>
                <div style={{ fontSize: 11, color: cor, fontWeight: 600 }}>
                  ⚡ {urgente ? 'Atenção — hoje!' : `${dias} dia(s) restante(s)`}
                </div>
              </div>
              <button onClick={() => dispensar(c.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-faint)', fontSize: 14, padding: '2px 4px',
              }}>✕</button>
            </div>

            {/* Corpo */}
            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 4 }}>
                {c.noivo1}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                & {c.noivo2}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 6 }}>
                📅 {fmtDtHora(c.dt_celebracao)}
              </div>
            </div>
          </div>
        );
      })}

      {/* Botão dispensar todos se houver mais de 1 */}
      {alertas.length > 1 && (
        <button onClick={dispensarTodos} style={{
          background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)',
          fontSize: 11, padding: '6px 12px', cursor: 'pointer', textAlign: 'center',
        }}>
          Dispensar todos ({alertas.length})
        </button>
      )}

      <style>{`
        @keyframes slideInCasamento {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
