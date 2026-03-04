import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../data/mockData.js';

const STATUS_OFICIO = ['Enviado', 'Aguardando Resposta', 'Respondido', 'Arquivado'];
const EMPTY = {
  numero: '', mes_ano: '', dt_oficio: new Date().toISOString().split('T')[0],
  destinatario: '', assunto: '', responsavel_id: null, responsavel: '',
  processo_id: null, status: 'Enviado',
};

function gerarNumeroOficio(oficios, mesAno) {
  const doMes = oficios.filter(o => o.mes_ano === mesAno);
  return String(doMes.length + 1).padStart(4, '0') + '/' + mesAno.split('/')[1];
}

function mesAnoAtual() {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

function ModalOficio({ oficio, onClose, onSave, oficios, usuarios, processos }) {
  const [form, setForm] = useState(() => {
    if (oficio) return { ...oficio };
    const ma = mesAnoAtual();
    return { ...EMPTY, mes_ano: ma, numero: gerarNumeroOficio(oficios, ma) };
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleMesAno = (v) => {
    set('mes_ano', v);
    set('numero', gerarNumeroOficio(oficios, v));
  };

  const handleSubmit = () => {
    if (!form.destinatario || !form.assunto) { alert('Destinatário e assunto são obrigatórios.'); return; }
    onSave(form);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{oficio ? 'Editar Ofício' : 'Novo Ofício'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid form-grid-2">
            <div className="form-group">
              <label className="form-label">Mês/Ano de Referência</label>
              <input className="form-input" value={form.mes_ano} onChange={e => handleMesAno(e.target.value)} placeholder="MM/AAAA" maxLength={7} />
              <div className="form-hint">Numeração é automática por mês</div>
            </div>
            <div className="form-group">
              <label className="form-label">Número do Ofício</label>
              <input className="form-input" value={form.numero} readOnly style={{ opacity: 0.7, cursor: 'not-allowed' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Data do Ofício</label>
              <input className="form-input" type="date" value={form.dt_oficio} onChange={e => set('dt_oficio', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Expedido por</label>
              <select className="form-select" value={form.responsavel} onChange={e => set('responsavel', e.target.value)}>
                <option value="">Selecione</option>
                {usuarios.filter(u => u.ativo).map(u => <option key={u.id} value={u.nome_simples}>{u.nome_simples}</option>)}
              </select>
            </div>
            <div className="form-group form-full">
              <label className="form-label">Destinatário *</label>
              <input className="form-input" value={form.destinatario} onChange={e => set('destinatario', e.target.value)} placeholder="Órgão, empresa ou pessoa" />
            </div>
            <div className="form-group form-full">
              <label className="form-label">Assunto *</label>
              <input className="form-input" value={form.assunto} onChange={e => set('assunto', e.target.value)} placeholder="Assunto do ofício" />
            </div>
            <div className="form-group">
              <label className="form-label">Processo Vinculado</label>
              <select className="form-select" value={form.processo_id || ''} onChange={e => set('processo_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">Nenhum</option>
                {processos.map(p => <option key={p.id} value={p.id}>{p.numero_interno} — {p.especie}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OFICIO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{oficio ? 'Salvar' : 'Registrar Ofício'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Oficios() {
  const { oficios, addOficio, editOficio, deleteOficio, usuarios, processos, addToast } = useApp();
  const [modal, setModal] = useState(null);
  const [filtroMesAno, setFiltroMesAno] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroResp, setFiltroResp] = useState('');
  const [busca, setBusca] = useState('');

  const mesesAnos = useMemo(() => {
    const set = new Set(oficios.map(o => o.mes_ano));
    return [...set].sort().reverse();
  }, [oficios]);

  const estatisticas = useMemo(() => {
    const por_mes = {};
    oficios.forEach(o => {
      if (!por_mes[o.mes_ano]) por_mes[o.mes_ano] = 0;
      por_mes[o.mes_ano]++;
    });
    return { por_mes, total: oficios.length };
  }, [oficios]);

  const lista = oficios.filter(o => {
    const txt = (o.numero + o.destinatario + o.assunto + o.responsavel).toLowerCase();
    return (!busca || txt.includes(busca.toLowerCase()))
      && (!filtroMesAno || o.mes_ano === filtroMesAno)
      && (!filtroStatus || o.status === filtroStatus)
      && (!filtroResp || o.responsavel === filtroResp);
  });

  const handleSave = (form) => {
    if (modal === 'novo') { addOficio(form); addToast('Ofício registrado!', 'success'); }
    else { editOficio(modal.id, form); addToast('Ofício atualizado!', 'success'); }
    setModal(null);
  };

  const statusBadge = (s) => {
    const map = { 'Enviado': 'badge-info', 'Aguardando Resposta': 'badge-warning', 'Respondido': 'badge-success', 'Arquivado': 'badge-neutral' };
    return <span className={`badge ${map[s] || 'badge-neutral'}`}>{s}</span>;
  };

  const responsaveis = [...new Set(oficios.map(o => o.responsavel))].filter(Boolean);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="page-title">Ofícios</div>
          <div className="page-sub">{estatisticas.total} ofícios registrados · {mesesAnos.length} meses</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('novo')}>+ Novo Ofício</button>
      </div>

      {/* Resumo por mês */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div
          className="stat-card"
          onClick={() => setFiltroMesAno('')}
          style={{ cursor: 'pointer', minWidth: 100, flex: '0 0 auto', border: !filtroMesAno ? '1px solid var(--color-accent-dim)' : undefined }}
        >
          <div className="stat-card-label">Total Geral</div>
          <div className="stat-card-value" style={{ fontSize: 22 }}>{estatisticas.total}</div>
        </div>
        {mesesAnos.map(ma => (
          <div
            key={ma}
            className="stat-card"
            onClick={() => setFiltroMesAno(filtroMesAno === ma ? '' : ma)}
            style={{ cursor: 'pointer', minWidth: 100, flex: '0 0 auto', border: filtroMesAno === ma ? '1px solid var(--color-accent-dim)' : undefined }}
          >
            <div className="stat-card-label">{ma}</div>
            <div className="stat-card-value" style={{ fontSize: 22 }}>{estatisticas.por_mes[ma] || 0}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1 }}>
          <span className="search-bar-icon">⌕</span>
          <input placeholder="Buscar por número, destinatário, assunto..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select className="form-select" value={filtroMesAno} onChange={e => setFiltroMesAno(e.target.value)}>
          <option value="">Todos os meses</option>
          {mesesAnos.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_OFICIO.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
          <option value="">Todos</option>
          {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Mês/Ano</th>
              <th>Data</th>
              <th>Destinatário</th>
              <th>Assunto</th>
              <th>Expedido por</th>
              <th>Processo</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">✉</div><div className="empty-state-text">Nenhum ofício encontrado</div></div></td></tr>
            )}
            {lista.map(o => (
              <tr key={o.id}>
                <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{o.numero}</span></td>
                <td><span className="badge badge-neutral">{o.mes_ano}</span></td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{formatDate(o.dt_oficio)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.destinatario}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{o.assunto}</td>
                <td>{o.responsavel || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-faint)' }}>
                  {o.processo_id ? processos.find(p => p.id === o.processo_id)?.numero_interno || '—' : '—'}
                </td>
                <td>{statusBadge(o.status)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn-icon btn-sm" onClick={() => setModal(o)}>✎</button>
                    <button className="btn-icon btn-sm" onClick={() => { if (window.confirm('Remover?')) { deleteOficio(o.id); addToast('Removido.', 'info'); } }} style={{ color: 'var(--color-danger)' }}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalOficio
          oficio={modal === 'novo' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          oficios={oficios}
          usuarios={usuarios}
          processos={processos}
        />
      )}
    </div>
  );
}
