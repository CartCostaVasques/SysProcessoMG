import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useApp } from '../../context/AppContext.jsx';

function hoje() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function fmtData(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

export default function AlertaComunicacoes({ onNavigate }) {
  const { usuario } = useApp();
  const [alertas, setAlertas] = useState([]);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !usuario?.id) return;

        const { data: ocors } = await supabase
          .from('comunicacoes_ocorrencias')
          .select('*, comunicacoes_config(*)')
          .in('status', ['pendente', 'atrasado']);

        if (!ocors?.length) return;

        const h = hoje();
        const relevantes = ocors
          .map(o => {
            const cfg = o.comunicacoes_config;
            if (!cfg) return null;
            if (cfg.responsavel_id && cfg.responsavel_id !== usuario.id) return null;
            const dtV = new Date(o.dt_vencimento + 'T00:00:00');
            const diffDias = Math.ceil((dtV - h) / 86400000);
            const diasAlerta = cfg.dias_alerta || 2;
            if (o.status === 'atrasado' || diffDias <= diasAlerta) {
              return { ...o, cfg, diffDias };
            }
            return null;
          })
          .filter(Boolean)
          .sort((a, b) => a.diffDias - b.diffDias);

        setAlertas(relevantes);
      } catch (e) {
        console.warn('AlertaComunicacoes:', e.message);
      }
    }
    carregar();
  }, [usuario?.id]);

  if (fechado || alertas.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 1200,
      width: 340, maxWidth: 'calc(100vw - 48px)',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-warning)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      overflow: 'hidden',
    }}>
      <div style={{
        background: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
        borderBottom: '1px solid var(--color-warning)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📡</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-warning)' }}>
            Comunicações Pendentes ({alertas.length})
          </span>
        </div>
        <button onClick={() => setFechado(true)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1, padding: 2,
        }}>✕</button>
      </div>

      <div style={{ maxHeight: 280, overflowY: 'auto', padding: '8px 0' }}>
        {alertas.map(a => {
          const atrasado = a.status === 'atrasado' || a.diffDias < 0;
          return (
            <div key={a.id} style={{
              padding: '8px 14px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.cfg.titulo}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  Vence: {fmtData(a.dt_vencimento)}
                </div>
              </div>
              <span style={{
                flexShrink: 0, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: atrasado
                  ? 'color-mix(in srgb, var(--color-danger) 15%, transparent)'
                  : 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
                color: atrasado ? 'var(--color-danger)' : 'var(--color-warning)',
                border: `1px solid ${atrasado ? 'var(--color-danger)' : 'var(--color-warning)'}`,
              }}>
                {atrasado ? `Atrasado ${Math.abs(a.diffDias)}d` : a.diffDias === 0 ? 'Hoje!' : `${a.diffDias}d`}
              </span>
            </div>
          );
        })}
      </div>

      {onNavigate && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--color-border)' }}>
          <button onClick={() => { onNavigate('comunicacoes'); setFechado(true); }}
            className="btn btn-primary" style={{ width: '100%', fontSize: 12 }}>
            Ver Comunicações
          </button>
        </div>
      )}
    </div>
  );
}
