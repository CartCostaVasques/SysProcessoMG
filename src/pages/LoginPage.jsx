import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

export default function LoginPage() {
  const { login, registrarAcesso, addToast, cartorio } = useApp();
  const [email, setEmail] = useState('mauro@cartorio.com');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showSenha, setShowSenha] = useState(false);

  useEffect(() => { registrarAcesso(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !senha) { setErro('Preencha e-mail e senha.'); return; }
    setLoading(true); setErro('');
    await new Promise(r => setTimeout(r, 600));
    const ok = login(email, senha);
    if (!ok) { setErro('Credenciais inválidas. Verifique e-mail e senha.'); }
    else { addToast('Bem-vindo ao SysProcesso!', 'success'); }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">SP</div>
          <div style={{ textAlign: 'center' }}>
            <div className="login-logo-name">SysProcesso</div>
            <div className="login-logo-sub">{cartorio.nomeSimples}</div>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              className="form-input"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showSenha ? 'text' : 'password'}
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                style={{ paddingRight: 38 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'var(--color-text-faint)', cursor: 'pointer',
                  fontSize: 13, padding: 2,
                }}
              >
                {showSenha ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {erro && (
            <div style={{ background: 'var(--color-danger-bg)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12, color: 'var(--color-danger)' }}>
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
          >
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Entrando...</> : 'Entrar'}
          </button>
        </form>

        <div className="login-footer">
          <div style={{ marginBottom: 4 }}>SysProcesso — Sistema de Gestão Cartorial</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>v1.0.0 · Next.js · Supabase · Vercel</div>
        </div>

        {/* Dica dev */}
        <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', fontSize: 11, color: 'var(--color-text-faint)', border: '1px solid var(--color-border)' }}>
          <strong style={{ color: 'var(--color-text-muted)' }}>Demo:</strong> mauro@cartorio.com · qualquer senha
        </div>
      </div>
    </div>
  );
}
