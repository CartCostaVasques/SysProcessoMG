import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

export default function SenhaSetores() {
  const { supabaseClient: sb, addToast } = useApp();
  const [setores, setSetores] = useState([]);
  const [form, setForm]       = useState(null); // null | {} | {id,...}
  const [salvando, setSalvando] = useState(false);

  const PREFIXOS_DISPONIVEIS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    const { data } = await sb.from('senha_setores').select('*').order('ordem');
    setSetores(data || []);
  };

  const abrir = (setor = null) => setForm(setor ? { ...setor } : { nome: '', prefixo: '', ativo: true, ordem: (setores.length + 1) * 10 });
  const fechar = () => setForm(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const salvar = async () => {
    if (!form.nome.trim() || !form.prefixo) { addToast('Nome e prefixo são obrigatórios', 'error'); return; }
    setSalvando(true);
    try {
      if (form.id) {
        const { error } = await sb.from('senha_setores').update({ nome: form.nome, prefixo: form.prefixo, ativo: form.ativo, ordem: form.ordem }).eq('id', form.id);
        if (error) throw error;
        addToast('Setor atualizado!', 'success');
      } else {
        const { error } = await sb.from('senha_setores').insert({ nome: form.nome, prefixo: form.prefixo, ativo: form.ativo, ordem: form.ordem });
        if (error) throw error;
        addToast('Setor criado!', 'success');
      }
      await carregar();
      fechar();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSalvando(false);
    }
  };

  const toggleAtivo = async (setor) => {
    await sb.from('senha_setores').update({ ativo: !setor.ativo }).eq('id', setor.id);
    await carregar();
  };

  const excluir = async (id) => {
    if (!confirm('Excluir setor? As senhas geradas serão mantidas no histórico.')) return;
    await sb.from('senha_setores').delete().eq('id', id);
    addToast('Setor excluído', 'info');
    await carregar();
  };

  const prefixosUsados = setores.filter(s => !form || s.id !== form.id).map(s => s.prefixo);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">⚙ Setores de Senha</div>
          <div className="page-sub">Configure os setores do sistema de senhas</div>
        </div>
        <button className="btn btn-primary" onClick={() => abrir()}>+ Novo Setor</button>
      </div>

      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Prefixo</th>
              <th>Nome do Setor</th>
              <th style={{ width: 80 }}>Ordem</th>
              <th style={{ width: 100 }}>Status</th>
              <th style={{ width: 120 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {setores.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 32 }}>Nenhum setor cadastrado</td></tr>
            )}
            {setores.map(s => (
              <tr key={s.id} style={{ opacity: s.ativo ? 1 : 0.5 }}>
                <td>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>{s.prefixo}</div>
                </td>
                <td style={{ fontWeight: 600 }}>{s.nome}</td>
                <td style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>{s.ordem}</td>
                <td>
                  <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, background: s.ativo ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'color-mix(in srgb, var(--color-danger) 15%, transparent)', color: s.ativo ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                    {s.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-icon btn-sm" onClick={() => abrir(s)} title="Editar">✎</button>
                    <button className="btn-icon btn-sm" onClick={() => toggleAtivo(s)} title={s.ativo ? 'Desativar' : 'Ativar'} style={{ color: s.ativo ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {s.ativo ? '⊘' : '✓'}
                    </button>
                    <button className="btn-icon btn-sm" onClick={() => excluir(s.id)} title="Excluir" style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {form && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && fechar()}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title">{form.id ? 'Editar Setor' : 'Novo Setor'}</span>
              <button className="btn-icon" onClick={fechar}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Setor *</label>
                <input className="form-input" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Escritura" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Prefixo (letra) *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PREFIXOS_DISPONIVEIS.map(p => {
                    const usado = prefixosUsados.includes(p);
                    const sel = form.prefixo === p;
                    return (
                      <button key={p} onClick={() => !usado && set('prefixo', p)} disabled={usado}
                        style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${sel ? 'var(--color-accent)' : usado ? 'var(--color-border)' : 'var(--color-border)'}`, background: sel ? 'var(--color-accent)' : usado ? 'var(--color-surface-2)' : 'var(--color-surface-2)', color: sel ? '#fff' : usado ? 'var(--color-text-faint)' : 'var(--color-text)', fontWeight: 700, fontSize: 14, cursor: usado ? 'not-allowed' : 'pointer', opacity: usado ? 0.4 : 1 }}>
                        {p}
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>Letras cinzas já estão em uso</div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Ordem de exibição</label>
                <input className="form-input" type="number" value={form.ordem} onChange={e => set('ordem', Number(e.target.value))} style={{ maxWidth: 100 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
                <label htmlFor="ativo" style={{ fontSize: 13, cursor: 'pointer' }}>Setor ativo</label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={fechar}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : '✓ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
