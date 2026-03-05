import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const HOJE = () => new Date().toISOString().split('T')[0];
const TIPOS_AND = ['Despacho', 'Nota Devolutiva', 'Minuta Enviada', 'Protocolo', 'Diligência', 'Certidão', 'Retificação', 'Arquivado', 'Outros'];

export default function Andamentos() {
  const { processos, andamentos, addAndamento, editAndamento, deleteAndamento, usuarios, usuario, addToast } = useApp();

  // Filtros
  const [busca,        setBusca]        = useState('');
  const [filtroResp,   setFiltroResp]   = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroProc,   setFiltroProc]   = useState('');
  const [dtInicio,     setDtInicio]     = useState('');
  const [dtFim,        setDtFim]        = useState('');

  // Formulário novo/editar (inline no topo da lista)
  const EMPTY = { dt_andamento: HOJE(), tipo: '', descricao: '', responsavel: usuario?.nome_simples || '', vencimento: '', obs_and: '', processo_id: '' };
  const [form,   setForm]   = useState(null);
  const [editId, setEditId] = useState(null);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const temFiltro = busca || filtroResp || filtroStatus || filtroProc || dtInicio || dtFim;

  const responsaveis = [...new Set(andamentos.map(a => a.responsavel))].filter(Boolean);

  const lista = useMemo(() => {
    if (!temFiltro) return [];
    return andamentos
      .filter(a => {
        const proc = processos.find(p => p.id === a.processo_id);
        const txt  = (a.descricao + (a.tipo || '') + (proc?.numero_interno || '') + (proc?.especie || '')).toLowerCase();
        const dt   = a.dt_andamento || '';
        return (!busca       || txt.includes(busca.toLowerCase()))
            && (!filtroResp  || a.responsavel === filtroResp)
            && (!filtroStatus|| (filtroStatus === 'concluido' ? a.concluido : !a.concluido))
            && (!filtroProc  || String(proc?.numero_interno || '').toLowerCase().includes(filtroProc.toLowerCase()))
            && (!dtInicio    || dt >= dtInicio)
            && (!dtFim       || dt <= dtFim);
      })
      .map(a => ({ ...a, processo: processos.find(p => p.id === a.processo_id) }))
      .sort((a, b) => b.dt_andamento.localeCompare(a.dt_andamento));
  }, [andamentos, processos, busca, filtroResp, filtroStatus, filtroProc, dtInicio, dtFim]);

  const stats = useMemo(() => ({
    total:      lista.length,
    concluidos: lista.filter(a =>  a.concluido).length,
    pendentes:  lista.filter(a => !a.concluido).length,
  }), [lista]);

  const abrirNovo = () => { setForm({ ...EMPTY }); setEditId(null); };
  const abrirEdit = (a) => { setForm({ ...a }); setEditId(a.id); };
  const fechar    = () => { setForm(null); setEditId(null); };

  const salvar = async () => {
    if (!form.descricao?.trim()) { addToast('Descrição obrigatória.', 'error'); return; }
    if (!form.processo_id && !editId) { addToast('Selecione o processo.', 'error'); return; }
    if (editId) {
      await editAndamento(editId, form);
      addToast('Andamento atualizado!', 'success');
    } else {
      await addAndamento(form);
      addToast('Andamento registrado!', 'success');
    }
    fechar();
  };

  const concluir = async (a) => {
    await editAndamento(a.id, { concluido: !a.concluido });
    addToast(a.concluido ? 'Reaberto.' : 'Concluído!', 'success');
  };

  const excluir = async (a) => {
    if (window.confirm('Remover este andamento?')) {
      await deleteAndamento(a.id);
      addToast('Removido.', 'info');
    }
  };

  const limparFiltros = () => { setBusca(''); setFiltroResp(''); setFiltroStatus(''); setFiltroProc(''); setDtInicio(''); setDtFim(''); };

  return (
    <div className="fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Andamentos</div>
          <div className="page-sub">Movimentações vinculadas aos processos · aplique um filtro para listar</div>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Novo Andamento</button>
      </div>

      {/* Formulário inline */}
      {form && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            {editId ? 'Editar Andamento' : 'Novo Andamento'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 160px 160px 1fr 160px', gap: 10, marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Processo *</label>
              <select className="form-select" value={form.processo_id || ''} onChange={e => set('processo_id', e.target.value)} style={{ fontSize: 12 }}>
                <option value="">— Selecione —</option>
                {processos.map(p => <option key={p.id} value={p.id}>{p.numero_interno} — {p.especie}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data *</label>
              <input className="form-input" type="date" value={form.dt_andamento} onChange={e => set('dt_andamento', e.target.value)} style={{ fontSize: 12 }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo</label>
              <select className="form-select" value={form.tipo || ''} onChange={e => set('tipo', e.target.value)} style={{ fontSize: 12 }}>
                <option value="">—</option>
                {TIPOS_AND.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Descrição *</label>
              <input className="form-input" value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} style={{ fontSize: 12 }} placeholder="Descreva o andamento" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Vencimento</label>
              <input className="form-input" type="date" value={form.vencimento || ''} onChange={e => set('vencimento', e.target.value)} style={{ fontSize: 12 }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 10, alignItems: 'end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Responsável</label>
              <select className="form-select" value={form.responsavel || ''} onChange={e => set('responsavel', e.target.value)} style={{ fontSize: 12 }}>
                <option value="">—</option>
                {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.nome_simples}>{u.nome_simples}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observação</label>
              <input className="form-input" value={form.obs_and || ''} onChange={e => set('obs_and', e.target.value)} style={{ fontSize: 12 }} placeholder="Opcional" />
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary" onClick={fechar}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar}>✓ Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: '1 1 200px' }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por descrição, tipo..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <input
          className="form-input"
          value={filtroProc}
          onChange={e => setFiltroProc(e.target.value)}
          placeholder="Nº Processo"
          style={{ width: 120 }}
        />
        <select className="form-select" value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="concluido">Concluídos</option>
        </select>
        <input type="date" className="form-input" value={dtInicio} onChange={e => setDtInicio(e.target.value)} title="Data início" style={{ width: 130 }} />
        <input type="date" className="form-input" value={dtFim}    onChange={e => setDtFim(e.target.value)}    title="Data fim"   style={{ width: 130 }} />
        {temFiltro && (
          <button className="btn btn-ghost btn-sm" onClick={limparFiltros}>✕ Limpar</button>
        )}
      </div>

      {/* Stats — só quando há filtro ativo */}
      {temFiltro && (
        <div style={{ display: 'flex', gap: 10, margin: '12px 0' }}>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-card-label">Total no filtro</div>
            <div className="stat-card-value">{stats.total}</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-card-label">Concluídos</div>
            <div className="stat-card-value" style={{ color: 'var(--color-success)' }}>{stats.concluidos}</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-card-label">Pendentes</div>
            <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>{stats.pendentes}</div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 90 }}>Data</th>
              <th style={{ width: 110 }}>Processo</th>
              <th style={{ width: 130 }}>Tipo</th>
              <th>Descrição</th>
              <th style={{ width: 120 }}>Responsável</th>
              <th style={{ width: 100 }}>Vencimento</th>
              <th style={{ width: 110 }}>Status</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {!temFiltro && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">⌕</div>
                    <div className="empty-state-text">Use os filtros acima para buscar andamentos</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 4 }}>
                      Busque por descrição, número do processo, responsável ou período
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {temFiltro && lista.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔄</div>
                    <div className="empty-state-text">Nenhum andamento encontrado para este filtro</div>
                  </div>
                </td>
              </tr>
            )}
            {lista.map(a => (
              <tr key={a.id} style={{ opacity: a.concluido ? 0.6 : 1 }}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(a.dt_andamento)}</td>
                <td>
                  {a.processo
                    ? <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 12 }}>{a.processo.numero_interno}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{a.processo.especie}</div>
                      </div>
                    : <span style={{ color: 'var(--color-text-faint)' }}>—</span>
                  }
                </td>
                <td>{a.tipo ? <span className="badge badge-neutral">{a.tipo}</span> : '—'}</td>
                <td>
                  <div style={{ fontSize: 13 }}>{a.descricao}</div>
                  {a.obs_and && <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>{a.obs_and}</div>}
                </td>
                <td style={{ fontSize: 12 }}>{a.responsavel || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: !a.concluido && a.vencimento && a.vencimento < HOJE() ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                  {formatDate(a.vencimento) || '—'}
                  {!a.concluido && a.vencimento && a.vencimento < HOJE() && <div style={{ fontSize: 10, color: 'var(--color-danger)' }}>VENCIDO</div>}
                </td>
                <td>
                  <span className={`badge ${a.concluido ? 'badge-success' : 'badge-warning'}`}>
                    {a.concluido ? '✓ Concluído' : 'Pendente'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                    <button className="btn-icon btn-sm" title={a.concluido ? 'Reabrir' : 'Concluir'} onClick={() => concluir(a)} style={{ color: a.concluido ? 'var(--color-text-faint)' : 'var(--color-success)' }}>{a.concluido ? '↩' : '✓'}</button>
                    <button className="btn-icon btn-sm" title="Editar" onClick={() => abrirEdit(a)}>✎</button>
                    <button className="btn-icon btn-sm" title="Excluir" onClick={() => excluir(a)} style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
