import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

function hoje() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function AlertaComunicacoes({ onNavigate }) {
  const [alertas, setAlertas] = useState([]);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

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
  }, []);

  if (fechado || alertas.length === 0) return null;

  const atrasadas = alertas.filter(a => a.status === 'atrasado' || a.diffDias < 0);
  const proximas  = alertas.filter(a => a.status !== 'atrasado' && a.diffDias >= 0);

  return (
    <div style={{
      background: '#fef3c7', border: '1px solid #fbbf24',
      borderRadius: 'var(--radius-md)', padding: '10px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      margin: '0 0 12px 0',
    }}>
      <span style={{ fontSize: 18, lineHeight: 1.4 }}>📡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: '#b45309', fontSize: 13, marginBottom: 4 }}>
          Comunicações que precisam de atenção ({alertas.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {atrasadas.map(a => (
            <span key={a.id} style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
              ⚠ {a.cfg.titulo} — Atrasado {Math.abs(a.diffDias)}d
            </span>
          ))}
          {proximas.map(a => (
            <span key={a.id} style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#fff', color: '#92400e', border: '1px solid #fbbf24' }}>
              {a.cfg.titulo} — {a.diffDias === 0 ? 'Hoje!' : `${a.diffDias}d`}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {onNavigate && (
          <button onClick={() => { onNavigate('comunicacoes'); setFechado(true); }}
            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius-md)', border: '1px solid #fbbf24', background: '#fff', color: '#b45309', cursor: 'pointer', fontWeight: 600 }}>
            Ver
          </button>
        )}
        <button onClick={() => setFechado(true)}
          style={{ fontSize: 14, lineHeight: 1, background: 'transparent', border: 'none', cursor: 'pointer', color: '#b45309', fontWeight: 700 }}>
          ✕
        </button>
      </div>
    </div>
  );
}
