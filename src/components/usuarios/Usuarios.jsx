import { useState } from 'react';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { getInitials, formatDate, PERFIS } from '../../data/mockData.js';

const MODULOS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'processos', label: 'Processos' },
  { id: 'andamentos', label: 'Andamentos' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'oficios', label: 'Ofícios' },
  { id: 'servicos', label: 'Tipo de Serviços' },
  { id: 'setores', label: 'Setores' },
  { id: 'usuarios', label: 'Usuários' },
  { id: 'configuracoes', label: 'Configurações' },
  { id: 'logs', label: 'Logs de Acesso' },
];

const TODOS_MODULOS = MODULOS.map(m => m.id);

const EMPTY = {
  nome_completo: '', nome_simples: '', email: '', cpf: '', rg: '',
  celular: '', cargo: '', perfil: 'Escrevente', setor: '',
  endereco: '', cidade: '', uf: 'MT', cep: '', ativo: true, permissoes: ['dashboard','processos','tarefas'],
};

function ModalUsuario({ usuario, onClose, onSave, setores, isNovo, iniciarEditando, onRedefinirSenha, somenteLeitura }) {
  const [form, setForm] = useState(usuario ? { ...usuario } : { ...EMPTY });
  const [tab, setTab] = useState('dados');
  const [editando, setEditando] = useState(isNovo || iniciarEditando || false);
  const [modoLeitura, setModoLeitura] = useState(somenteLeitura || false);

  // Campos bloqueados se em modo leitura ou se não está editando
  const bloqueado = modoLeitura || !editando;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const togglePerm = (id) => {
    if (form.perfil === 'Administrador') return;
    set('permissoes', form.permissoes.includes(id) ? form.permissoes.filter(p => p !== id) : [...form.permissoes, id]);
  };

  const handlePerfil = (p) => {
    set('perfil', p);
    if (p === 'Administrador') set('permissoes', TODOS_MODULOS);
    else if (p === 'Tabelião')   set('permissoes', ['dashboard','processos','andamentos','tarefas','oficios','servicos','setores','configuracoes']);
    else if (p === 'Substituto') set('permissoes', ['dashboard','processos','andamentos','tarefas','oficios','servicos','setores','configuracoes']);
    else if (p === 'Escrevente') set('permissoes', ['dashboard','processos','andamentos','tarefas','oficios','servicos','setores']);
    else if (p === 'Auxiliar')   set('permissoes', ['dashboard','processos','tarefas']);
    else if (p === 'Consultor')  set('permissoes', ['dashboard']);
  };

  const handleSubmit = () => {
    if (!editando) return;
    if (!form.nome_completo || !form.email) { alert('Nome completo e e-mail são obrigatórios.'); return; }
    if (isNovo && !form.senha) { alert('Senha obrigatória para novo usuário.'); return; }
    if (isNovo && form.senha && form.senha.length < 6) { alert('Senha deve ter no mínimo 6 caracteres.'); return; }
    onSave(form);
  };

  return (
    <Portal><div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span className="modal-title">{isNovo ? 'Novo Usuário' : (editando ? 'Editando Usuário' : usuario?.nome_simples || usuario?.nome_completo)}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {!isNovo && !editando && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditando(true)}>✎ Editar</button>
            )}
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          <div className="tabs">
            {[['dados', 'Dados Pessoais'], ['acesso', 'Acesso e Permissões']].map(([id, label]) => (
              <button key={id} className={`tab-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          {tab === 'dados' && (
            <div className="form-grid form-grid-2">
              <div className="form-group form-full">
                <label className="form-label">Nome Completo *</label>
                <input className="form-input" value={form.nome_completo} onChange={e => set('nome_completo', e.target.value)} placeholder="Nome conforme documento" readOnly={bloqueado} style={bloqueado ? {opacity:0.75,cursor:'default'} : {}} />
              </div>
              <div className="form-group">
                <label className="form-label">Nome Simples</label>
                <input className="form-input" value={form.nome_simples} onChange={e => set('nome_simples', e.target.value)} placeholder="Como é chamado" />
              </div>
              <div className="form-group">
                <label className="form-label">E-mail *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              {isNovo && (
                <div className="form-group">
                  <label className="form-label">Senha *</label>
                  <input className="form-input" type="password" value={form.senha || ''} onChange={e => set('senha', e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
                  <div className="form-hint">Senha de acesso ao sistema.</div>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">CPF</label>
                <input className="form-input" value={form.cpf} onChange={e => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="form-group">
                <label className="form-label">RG</label>
                <input className="form-input" value={form.rg} onChange={e => set('rg', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Celular</label>
                <input className="form-input" value={form.celular} onChange={e => set('celular', e.target.value)} placeholder="(66) 9 0000-0000" />
              </div>
              <div className="form-group">
                <label className="form-label">Cargo</label>
                <input className="form-input" value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Cargo no cartório" />
              </div>
              <div className="form-group">
                <label className="form-label">Setor</label>
                <select className="form-select" value={form.setor} onChange={e => set('setor', e.target.value)}>
                  <option value="">Selecione</option>
                  {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                </select>
              </div>
              <div className="form-group form-full">
                <label className="form-label">Endereço</label>
                <input className="form-input" value={form.endereco} onChange={e => set('endereco', e.target.value)} placeholder="Rua, número, bairro" />
              </div>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input className="form-input" value={form.cidade} onChange={e => set('cidade', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">CEP</label>
                <input className="form-input" value={form.cep || ''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
              </div>
              <div className="form-group">
                <label className="form-label">UF</label>
                <input className="form-input" value={form.uf} onChange={e => set('uf', e.target.value)} maxLength={2} style={{ width: 60 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {[true, false].map(v => (
                    <label key={String(v)} className="checkbox-wrapper" style={{ opacity: bloqueado ? 0.7 : 1, pointerEvents: bloqueado ? 'none' : 'auto' }}>
                      <input type="radio" checked={form.ativo === v} onChange={() => set('ativo', v)} />
                      <div className="checkbox-box" style={{ borderRadius: '50%' }}>
                        {form.ativo === v && <span style={{ fontSize: 8, color: 'var(--color-bg)' }}>●</span>}
                      </div>
                      <span className="checkbox-label">{v ? 'Ativo' : 'Inativo'}</span>
                    </label>
                  ))}
                </div>
                {!form.ativo && (
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>📅</span> Desativado em: <strong>{form.dt_desativacao ? formatDate(form.dt_desativacao) : 'não registrado'}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'acesso' && (
            <div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Perfil de Acesso</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {PERFIS.map(p => (
                    <button
                      key={p}
                      className={`btn ${form.perfil === p ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handlePerfil(p)}
                    >{p}</button>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-faint)' }}>
                  {form.perfil === 'Administrador' && 'Acesso total a todos os módulos.'}
                  {form.perfil === 'Tabelião'      && 'Acesso amplo, exceto Usuários e Logs.'}
                  {form.perfil === 'Substituto'    && 'Mesmas permissões do Tabelião durante substituição.'}
                  {form.perfil === 'Escrevente'    && 'Acesso operacional conforme seleção abaixo.'}
                  {form.perfil === 'Auxiliar'      && 'Acesso básico: Dashboard, Processos e Tarefas.'}
                  {form.perfil === 'Consultor'     && 'Apenas leitura — somente Dashboard.'}
                </div>
              </div>

              <div className="form-label" style={{ marginBottom: 10 }}>Módulos Permitidos</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {MODULOS.map(m => {
                  const checked  = form.perfil === 'Administrador' || form.permissoes.includes(m.id);
                  const disabled = form.perfil === 'Administrador' || form.perfil === 'Consultor';
                  return (
                    <label key={m.id} className="checkbox-wrapper" style={{ opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer', padding: '8px 10px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                      <input type="checkbox" checked={checked} onChange={() => !disabled && togglePerm(m.id)} />
                      <div className="checkbox-box">
                        {checked && <span style={{ fontSize: 9, color: 'var(--color-bg)', fontWeight: 800 }}>✓</span>}
                      </div>
                      <span className="checkbox-label">{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          {modoLeitura ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
              <button className="btn btn-primary" onClick={() => { setModoLeitura(false); setEditando(true); }}>✎ Editar</button>
            </>
          ) : editando ? (
            <>
              <button className="btn btn-secondary" onClick={() => isNovo ? onClose() : setEditando(false)}>
                {isNovo ? 'Cancelar' : '✕ Descartar'}
              </button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                {isNovo ? 'Cadastrar Usuário' : '✓ Salvar Alterações'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => onRedefinirSenha(usuario.email)}>
                🔑 Redefinir Senha
              </button>
              <button className="btn btn-warning" style={{ fontSize: 12 }} onClick={() => {
                if (window.confirm(`Enviar e-mail de redefinição de senha para ${usuario.email}?`)) {
                  onRedefinirSenha(usuario.email);
                }
              }}>
                📧 Reenviar Acesso
              </button>
              <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
            </>
          )}
        </div>
      </div>
    </div></Portal>
  );
}

export default function Usuarios() {
  const { usuarios, addUsuario, editUsuario, deleteUsuario, redefinirSenha, setores, addToast } = useApp();
  const [modal, setModal]           = useState(null); // null | 'novo' | usuario
  const [modalViewing, setModalViewing] = useState(false); // true = só visualizar
  const [busca, setBusca]           = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const lista = usuarios.filter(u => {
    const ok = (u.nome_completo + u.email + u.cargo + u.setor).toLowerCase().includes(busca.toLowerCase());
    if (filtroStatus === 'ativos') return ok && u.ativo;
    if (filtroStatus === 'inativos') return ok && !u.ativo;
    return ok;
  });

  const abrirVisualizar = (u) => { setModalViewing(true);  setModal(u); };
  const abrirEditar     = (u) => { setModalViewing(false); setModal(u); };

  const handleSave = (form) => {
    // Salva a data de desativação sempre que inativo e sem data registrada
    if (form.ativo === false && !form.dt_desativacao) {
      form.dt_desativacao = new Date().toISOString().split('T')[0];
    }
    // Se foi reativado, limpa a data
    if (form.ativo === true) {
      form.dt_desativacao = null;
    }
    if (modal === 'novo') {
      addUsuario(form);
      addToast('Usuário cadastrado com sucesso!', 'success');
    } else {
      editUsuario(modal.id, form);
      addToast('Usuário atualizado!', 'success');
    }
    setModal(null);
  };

  const handleDelete = (u) => {
    if (window.confirm(`Deseja remover ${u.nome_simples || u.nome_completo}?`)) {
      deleteUsuario(u.id);
      addToast('Usuário removido.', 'info');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Usuários</div>
          <div className="page-sub">{usuarios.filter(u => u.ativo).length} ativos de {usuarios.length} cadastrados</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setModal('novo')}>+ Novo Usuário</button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por nome, e-mail, cargo..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Cargo / Setor</th>
              <th>Contato</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Último Acesso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">◉</div><div className="empty-state-text">Nenhum usuário encontrado</div></div></td></tr>
            )}
            {lista.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar">{getInitials(u.nome_simples || u.nome_completo)}</div>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{u.nome_completo}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontSize: 12 }}>{u.cargo || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{u.setor || '—'}</div>
                </td>
                <td>
                  <div style={{ fontSize: 12 }}>{u.celular || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>CPF: {u.cpf || '—'}</div>
                </td>
                <td><span className="badge badge-neutral">{u.perfil}</span></td>
                <td>
                  <span className={`badge ${u.ativo ? 'badge-success' : 'badge-neutral'}`}>
                    <span className={`dot ${u.ativo ? 'dot-success' : 'dot-muted'}`} />
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  {!u.ativo && u.dt_desativacao && (
                    <div style={{ fontSize: 10, color: 'var(--color-text-faint)', marginTop: 2 }}>
                      desde {formatDate(u.dt_desativacao)}
                    </div>
                  )}
                </td>
                <td style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{u.ultimo_acesso || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn-icon btn-sm" onClick={() => abrirVisualizar(u)} title="Visualizar">👁</button>
                    <button className="btn-icon btn-sm" onClick={() => abrirEditar(u)} title="Editar">✎</button>
                    <button className="btn-icon btn-sm" onClick={() => handleDelete(u)} title="Remover" style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalUsuario
          usuario={modal === 'novo' ? null : modal}
          isNovo={modal === 'novo'}
          somenteLeitura={modalViewing}
          onClose={() => { setModal(null); setModalViewing(false); }}
          onSave={handleSave}
          setores={setores}
          onRedefinirSenha={redefinirSenha}
        />
      )}
    </div>
  );
}
