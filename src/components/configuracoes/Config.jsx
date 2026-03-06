import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';

// ─────────────────────────────────────────────
//  CONFIGURAÇÕES DO CARTÓRIO
// ─────────────────────────────────────────────
export function Configuracoes() {
  const { cartorio, salvarCartorio, tema, toggleTema, addToast, usuario, salvarPrefsUsuario } = useApp();

  const [corTema,   setCorTema]   = useState(() => usuario?.pref_cor_tema   || document.documentElement.getAttribute('data-color') || 'padrao');
  const [corAccent, setCorAccent] = useState(() => usuario?.pref_cor_accent || cartorio?.cor_primaria || '#e0e0e6');
  const [form, setForm] = useState({ ...cartorio });
  const [tab, setTab] = useState('cartorio');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    const { tema: _t, ...formSemTema } = form;
    salvarCartorio({ ...formSemTema, cor_primaria: corAccent });
    salvarPrefsUsuario({ pref_cor_tema: corTema, pref_cor_accent: corAccent });
    addToast('Configurações salvas!', 'success');
  };

  const aplicarCorTema = (cor) => {
    setCorTema(cor);
    if (cor === 'padrao') document.documentElement.removeAttribute('data-color');
    else document.documentElement.setAttribute('data-color', cor);
  };

  const aplicarCorAccent = (cor) => {
    setCorAccent(cor);
    set('cor_primaria', cor);
    document.documentElement.style.setProperty('--color-accent', cor);
  };

  const handleReset = () => {
    aplicarCorTema('padrao');
    aplicarCorAccent('#e0e0e6');
    salvarPrefsUsuario({ pref_cor_tema: 'padrao', pref_cor_accent: '#e0e0e6' });
    addToast('Cores restauradas ao padrão.', 'info');
  };

  const CORES_PRESET = [
    { label: 'Cinza Claro (Padrão)', valor: '#e0e0e6' },
    { label: 'Cinza Suave',          valor: '#c8c8d4' },
    { label: 'Cinza Médio',          valor: '#8a8a96' },
    { label: 'Branco Puro',          valor: '#ffffff' },
    { label: 'Azul Celeste',         valor: '#93c5fd' },
    { label: 'Azul Médio',           valor: '#60a5fa' },
    { label: 'Azul Royal',           valor: '#3b82f6' },
    { label: 'Verde Menta',          valor: '#6ee7b7' },
    { label: 'Verde Claro',          valor: '#86efac' },
    { label: 'Verde',                valor: '#4ade80' },
    { label: 'Âmbar',                valor: '#fbbf24' },
    { label: 'Laranja',              valor: '#fb923c' },
    { label: 'Rosa',                 valor: '#f472b6' },
    { label: 'Lilás',                valor: '#c084fc' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div><div className="page-title">Configurações</div><div className="page-sub">Dados do cartório, aparência e preferências</div></div>
        <button className="btn btn-primary" onClick={handleSave}>Salvar Configurações</button>
      </div>

      <div className="tabs">
        {[['cartorio', 'Dados do Cartório'], ['aparencia', 'Aparência'], ['sistema', 'Sistema']].map(([id, label]) => (
          <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'cartorio' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Dados do Cartório</div>
          </div>
          <div className="form-grid form-grid-2">
            <div className="form-group form-full">
              <label className="form-label">Nome Completo do Cartório</label>
              <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nome Simples / Fantasia</label>
              <input className="form-input" value={form.nome_simples} onChange={e => set('nome_simples', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Responsável / Tabelião</label>
              <input className="form-input" value={form.responsavel} onChange={e => set('responsavel', e.target.value)} />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Endereço</label>
              <input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cidade / UF</label>
              <input className="form-input" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">CEP</label>
              <input className="form-input" value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.telefone} onChange={e => set('telefone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>

            {/* Logo upload */}
            <div className="form-group form-full">
              <label className="form-label">Logomarca</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 80, height: 80, background: 'var(--color-surface-2)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--color-text-faint)' }}>
                  {form.logo_url ? <img src={form.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : '🏛'}
                </div>
                <div>
                  <input type="file" accept="image/*" id="logo-upload" style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { const r = new FileReader(); r.onload = (ev) => set('logo_url', ev.target.result); r.readAsDataURL(f); }
                    }}
                  />
                  <label htmlFor="logo-upload" className="btn btn-secondary" style={{ display: 'inline-flex', cursor: 'pointer' }}>Carregar Logo</label>
                  {form.logo_url && <button className="btn btn-ghost btn-sm" onClick={() => set('logo_url', null)} style={{ marginLeft: 8 }}>Remover</button>}
                  <div className="form-hint" style={{ marginTop: 6 }}>PNG, SVG ou JPG. Recomendado: fundo transparente.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'aparencia' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Aparência do Sistema</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Tema claro/escuro */}
            <div>
              <div className="form-label" style={{ marginBottom: 10 }}>Tema Base</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[['dark', '◑ Escuro'], ['light', '☀ Claro']].map(([id, label]) => (
                  <button key={id} onClick={() => { if (tema !== id) toggleTema(); }}
                    style={{ padding: '12px 20px', background: tema === id ? 'var(--color-surface-3)' : 'var(--color-surface-2)', border: `1px solid ${tema === id ? 'var(--color-accent-dim)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', color: tema === id ? 'var(--color-text)' : 'var(--color-text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: tema === id ? 600 : 400 }}
                  >{label}</button>
                ))}
              </div>
            </div>

            {/* Paleta de cores */}
            <div>
              <div className="form-label" style={{ marginBottom: 10 }}>Paleta de Cores</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { id: 'padrao',     label: '⬛ Cinza Escuro',   preview: '#18181b' },
                  { id: 'cinza-medio',label: '▪️ Cinza Médio',    preview: '#2a2a2e' },
                  { id: 'azul',       label: '🔵 Azul Escuro',    preview: '#0d1528' },
                  { id: 'azul-medio', label: '🩵 Azul Médio',     preview: '#0f1e38' },
                  { id: 'verde',      label: '🟢 Verde Escuro',   preview: '#0a1610' },
                  { id: 'verde-medio',label: '🍃 Verde Médio',    preview: '#0f2218' },
                  { id: 'roxo',       label: '🟣 Roxo Escuro',    preview: '#120f1e' },
                  { id: 'marrom',     label: '🟫 Marrom Escuro',  preview: '#1a1208' },
                ].map(c => (
                  <button key={c.id} onClick={() => aplicarCorTema(c.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: corTema === c.id ? 'var(--color-surface-3)' : 'var(--color-surface-2)', border: `2px solid ${corTema === c.id ? 'var(--color-accent)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 13, color: corTema === c.id ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: corTema === c.id ? 600 : 400 }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: c.preview, border: '1px solid rgba(255,255,255,0.15)' }} />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor de Acento */}
            <div>
              <div className="form-label" style={{ marginBottom: 10 }}>Cor de Acento</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {CORES_PRESET.map(c => (
                  <button
                    key={c.valor}
                    onClick={() => {
                      aplicarCorAccent(c.valor);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px',
                      background: 'var(--color-surface-2)',
                      border: `1px solid ${form.cor_primaria === c.valor ? c.valor : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <div style={{ width: 16, height: 16, borderRadius: 3, background: c.valor, border: '1px solid rgba(255,255,255,0.1)' }} />
                    {c.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="form-group">
                  <label className="form-label">Cor personalizada (hex)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={corAccent} onChange={e => aplicarCorAccent(e.target.value)} style={{ width: 40, height: 34, padding: 2, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
                    <input className="form-input" value={corAccent} onChange={e => aplicarCorAccent(e.target.value)} style={{ width: 120 }} />
                    <button className="btn btn-ghost btn-sm" onClick={handleReset}>↺ Padrão</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <div className="form-label" style={{ marginBottom: 10 }}>Pré-visualização</div>
              <div style={{ padding: 16, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="btn btn-primary">Botão Primário</button>
                <button className="btn btn-secondary">Secundário</button>
                <span className="badge badge-success">Concluído</span>
                <span className="badge badge-warning">Pendente</span>
                <span className="badge badge-danger">Vencido</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-accent)' }}>456825</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'sistema' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Configurações do Sistema</div></div>

          {/* Numeração de Ofícios */}
          <div style={{ marginBottom: 24 }}>
            <div className="form-label" style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-muted)' }}>Numeração de Ofícios</div>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Número Inicial do Ofício</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={form.oficio_numero_inicial ?? 0}
                  onChange={e => set('oficio_numero_inicial', Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="form-hint" style={{ paddingBottom: 4 }}>
                Número base para contar ofícios do mês. Se já havia 45 ofícios antes do sistema, coloque 45 — o próximo será 46/mês.
              </div>
            </div>
          </div>

          <hr className="divider" />

          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--color-text-muted)' }}>Informações do Sistema</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Versão', '1.0.0'],
              ['Framework', 'Next.js 14 + React'],
              ['Banco de Dados', 'Supabase (PostgreSQL)'],
              ['Deploy', 'Vercel'],
              ['Repositório', 'GitHub'],
              ['Autenticação', 'Supabase Auth (JWT)'],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '12px 16px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 500, fontFamily: k === 'Versão' ? 'var(--font-mono)' : 'inherit' }}>{v}</div>
              </div>
            ))}
          </div>
          <hr className="divider" />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => addToast('Exportação em desenvolvimento.', 'info')}>⬇ Exportar dados</button>
            <button className="btn btn-secondary" onClick={() => addToast('Backup criado!', 'success')}>☁ Backup manual</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  LOGS DE ACESSO
// ─────────────────────────────────────────────
export function LogsAcesso() {
  const { logs } = useApp();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const lista = logs.filter(l => {
    const txt = ((l.ip||'') + (l.usuario||'') + (l.navegador||'') + (l.so||'')).toLowerCase();
    return (!busca || txt.includes(busca.toLowerCase()))
      && (!filtroTipo || l.acao === filtroTipo);
  });

  const logins = logs.filter(l => l.acao === 'Login').length;
  const acessos = logs.filter(l => l.acao !== 'Login').length;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Logs de Acesso</div>
          <div className="page-sub">{logs.length} registros · {logins} logins · {acessos} acessos sem login</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-card-label">Total de Registros</div>
          <div className="stat-card-value">{logs.length}</div>
        </div>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-card-label">Logins Realizados</div>
          <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{logins}</div>
        </div>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="stat-card-label">Acessos sem Login</div>
          <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>{acessos}</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por IP, usuário, navegador..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option value="Login">Login</option>
          <option value="Acesso (sem login)">Acesso sem login</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>IP</th>
              <th>Navegador</th>
              <th>Sistema Operacional</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">◎</div><div className="empty-state-text">Nenhum registro encontrado</div></div></td></tr>
            )}
            {lista.map(l => (
              <tr key={l.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)' }}>{l.dt_acesso}</td>
                <td>
                  {l.usuario !== '—' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar avatar-sm">{l.usuario?.[0]?.toUpperCase() || '?'}</div>
                      <span>{l.usuario}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--color-text-faint)' }}>Visitante</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${l.acao === 'Login' ? 'badge-success' : 'badge-warning'}`}>
                    {l.acao === 'Login' ? '🔑' : '👁'} {l.acao}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{l.ip || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{l.navegador || '—'}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{l.so || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
