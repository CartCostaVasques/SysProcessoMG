import { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';

const fmtData = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const fmtCPF = (v) => {
  const n = (v || '').replace(/\D/g, '').slice(0, 11);
  return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const fmtCelular = (v) => {
  const n = (v || '').replace(/\D/g, '').slice(0, 11);
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const STATUS_FERIAS = {
  a_vencer:   { label: 'A Vencer',   bg: '#dbeafe', cor: '#1d4ed8' },
  programada: { label: 'Programada', bg: '#fef3c7', cor: '#b45309' },
  usufruida:  { label: 'Usufruída',  bg: '#dcfce7', cor: '#15803d' },
  vencida:    { label: 'Vencida',    bg: '#fee2e2', cor: '#dc2626' },
};

function diasAte(dataStr) {
  if (!dataStr) return null;
  return Math.ceil((new Date(dataStr) - new Date()) / 86400000);
}

// ─── Sub-aba Férias ──────────────────────────────────────────────────────────
function AbaFerias({ colaboradores, sb, addToast }) {
  const [ferias, setFerias] = useState([]);
  const [filtro, setFiltro] = useState('todos'); // todos | a_vencer | programada | vencida | usufruida
  const [modalFerias, setModalFerias] = useState(null); // null | { colaborador_id, ferias? }
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [colFiltro, setColFiltro] = useState('');

  useEffect(() => { carregarFerias(); }, []);

  const carregarFerias = async () => {
    const { data } = await sb.from('colaboradores_ferias')
      .select('*, colaboradores(nome_completo, foto_url, funcao)')
      .order('periodo_aquisitivo_fim', { ascending: true });
    // Atualizar status automaticamente
    const hoje = new Date().toISOString().split('T')[0];
    const atualizadas = (data || []).map(f => {
      let status = f.status;
      if (status !== 'usufruida') {
        if (f.periodo_aquisitivo_fim < hoje) status = 'vencida';
        else if (f.ferias_ini) status = 'programada';
        else status = 'a_vencer';
      }
      return { ...f, status };
    });
    setFerias(atualizadas);
  };

  const abrirModal = (colab, feriasExist = null) => {
    if (feriasExist) {
      setForm({ ...feriasExist });
    } else {
      // Calcular próximo período aquisitivo
      const admissao = colab.dt_admissao;
      const hoje = new Date();
      let ini = new Date(admissao);
      while (new Date(ini.getFullYear() + 1, ini.getMonth(), ini.getDate()) <= hoje) {
        ini = new Date(ini.getFullYear() + 1, ini.getMonth(), ini.getDate());
      }
      const fim = new Date(ini.getFullYear() + 1, ini.getMonth(), ini.getDate() - 1);
      setForm({
        colaborador_id: colab.id,
        periodo_aquisitivo_ini: ini.toISOString().split('T')[0],
        periodo_aquisitivo_fim: fim.toISOString().split('T')[0],
        dias_direito: 30,
        dias_usufruidos: 0,
        status: 'a_vencer',
        ferias_ini: '',
        ferias_fim: '',
        observacao: '',
      });
    }
    setModalFerias(colab);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      const payload = {
        colaborador_id: form.colaborador_id || modalFerias.id,
        periodo_aquisitivo_ini: form.periodo_aquisitivo_ini,
        periodo_aquisitivo_fim: form.periodo_aquisitivo_fim,
        dias_direito: Number(form.dias_direito) || 30,
        dias_usufruidos: Number(form.dias_usufruidos) || 0,
        status: form.status || 'a_vencer',
        ferias_ini: form.ferias_ini || null,
        ferias_fim: form.ferias_fim || null,
        observacao: form.observacao || null,
      };
      if (form.id) {
        await sb.from('colaboradores_ferias').update(payload).eq('id', form.id);
      } else {
        await sb.from('colaboradores_ferias').insert(payload);
      }
      addToast('Férias salvas!', 'success');
      setModalFerias(null);
      carregarFerias();
    } catch (e) { addToast('Erro: ' + e.message, 'error'); }
    finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este registro de férias?')) return;
    await sb.from('colaboradores_ferias').delete().eq('id', id);
    carregarFerias();
  };

  const feriasVencendo = ferias.filter(f => {
    if (f.status === 'usufruida') return false;
    const dias = diasAte(f.periodo_aquisitivo_fim);
    return dias !== null && dias <= 60 && dias >= 0;
  });

  const feriasFiltradas = ferias.filter(f => {
    if (filtro !== 'todos' && f.status !== filtro) return false;
    if (colFiltro && !f.colaboradores?.nome_completo?.toLowerCase().includes(colFiltro.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Alertas vencendo */}
      {feriasVencendo.length > 0 && (
        <div style={{ background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
          <div style={{ fontWeight: 700, color: '#b45309', marginBottom: 8 }}>⚠️ Férias vencendo em até 60 dias ({feriasVencendo.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {feriasVencendo.map(f => (
              <span key={f.id} style={{ padding: '3px 10px', borderRadius: 20, background: '#fff', border: '1px solid #fbbf24', fontSize: 12, color: '#92400e' }}>
                {f.colaboradores?.nome_completo} — vence {fmtData(f.periodo_aquisitivo_fim)} ({diasAte(f.periodo_aquisitivo_fim)} dias)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Header com filtros e ação */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Buscar colaborador..." value={colFiltro}
          onChange={e => setColFiltro(e.target.value)} style={{ maxWidth: 220 }} />
        {['todos','a_vencer','programada','vencida','usufruida'].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filtro === s ? 'var(--color-accent)' : 'var(--color-border)'}`, background: filtro === s ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-2)', color: filtro === s ? 'var(--color-accent)' : 'var(--color-text-muted)', fontSize: 12, fontWeight: filtro === s ? 700 : 400, cursor: 'pointer' }}>
            {s === 'todos' ? 'Todos' : STATUS_FERIAS[s]?.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <select className="form-select" style={{ fontSize: 13 }}
            onChange={e => e.target.value && abrirModal(colaboradores.find(c => c.id === e.target.value))}>
            <option value="">+ Registrar Férias</option>
            {colaboradores.filter(c => c.ativo).map(c => (
              <option key={c.id} value={c.id}>{c.nome_completo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="card" style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--color-surface-2)', borderBottom: '2px solid var(--color-border)' }}>
              {['Colaborador','Período Aquisitivo','Vence em','Férias Programadas','Dias','Status',''].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {feriasFiltradas.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-faint)' }}>Nenhum registro encontrado.</td></tr>
            ) : feriasFiltradas.map((f, i) => {
              const dias = diasAte(f.periodo_aquisitivo_fim);
              const st = STATUS_FERIAS[f.status] || STATUS_FERIAS.a_vencer;
              return (
                <tr key={f.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{f.colaboradores?.nome_completo || '—'}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtData(f.periodo_aquisitivo_ini)} → {fmtData(f.periodo_aquisitivo_fim)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {dias !== null ? (
                      <span style={{ color: dias <= 30 ? '#dc2626' : dias <= 60 ? '#b45309' : 'var(--color-text-muted)', fontWeight: dias <= 60 ? 700 : 400 }}>
                        {dias < 0 ? 'Vencida' : `${dias} dias`}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {f.ferias_ini ? `${fmtData(f.ferias_ini)} → ${fmtData(f.ferias_fim)}` : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ fontSize: 12 }}>{f.dias_usufruidos}/{f.dias_direito}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: st.bg, color: st.cor }}>{st.label}</span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon btn-sm" title="Editar" onClick={() => abrirModal(f.colaboradores || {}, f)}>✎</button>
                      <button className="btn-icon btn-sm" title="Excluir" style={{ color: 'var(--color-danger)' }} onClick={() => excluir(f.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal férias */}
      {modalFerias && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalFerias(null)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">🏖 Férias — {modalFerias.nome_completo || form.colaboradores?.nome_completo}</span>
              <button className="btn-icon" onClick={() => setModalFerias(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Período Aquisitivo — Início *</label>
                  <input type="date" className="form-input" value={form.periodo_aquisitivo_ini || ''}
                    onChange={e => setForm(p => ({ ...p, periodo_aquisitivo_ini: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Período Aquisitivo — Fim *</label>
                  <input type="date" className="form-input" value={form.periodo_aquisitivo_fim || ''}
                    onChange={e => setForm(p => ({ ...p, periodo_aquisitivo_fim: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Férias — Início</label>
                  <input type="date" className="form-input" value={form.ferias_ini || ''}
                    onChange={e => setForm(p => ({ ...p, ferias_ini: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Férias — Fim</label>
                  <input type="date" className="form-input" value={form.ferias_fim || ''}
                    onChange={e => setForm(p => ({ ...p, ferias_fim: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Dias de Direito</label>
                  <input type="number" className="form-input" value={form.dias_direito || 30}
                    onChange={e => setForm(p => ({ ...p, dias_direito: e.target.value }))} min={0} max={30} />
                </div>
                <div className="form-group">
                  <label className="form-label">Dias Usufruídos</label>
                  <input type="number" className="form-input" value={form.dias_usufruidos || 0}
                    onChange={e => setForm(p => ({ ...p, dias_usufruidos: e.target.value }))} min={0} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status || 'a_vencer'}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="a_vencer">A Vencer</option>
                    <option value="programada">Programada</option>
                    <option value="usufruida">Usufruída</option>
                    <option value="vencida">Vencida</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Observação</label>
                  <textarea className="form-input" rows={2} value={form.observacao || ''}
                    onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalFerias(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? '⏳ Salvando...' : '✓ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function Colaboradores() {
  const { supabaseClient: sb, addToast } = useApp();
  const [aba, setAba] = useState('colaboradores'); // colaboradores | ferias
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('ativos');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setCarregando(true);
    const { data } = await sb.from('colaboradores').select('*').order('nome_completo');
    setColaboradores(data || []);
    setCarregando(false);
  };

  const abrirModal = (colab = null) => {
    setForm(colab ? { ...colab } : { ativo: true });
    setFotoFile(null);
    setFotoPreview(colab?.foto_url || null);
    setModal(true);
  };

  const handleFoto = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFotoFile(f);
    setFotoPreview(URL.createObjectURL(f));
  };

  const salvar = async () => {
    if (!form.nome_completo?.trim()) { addToast('Nome obrigatório', 'error'); return; }
    setSalvando(true);
    try {
      let foto_url = form.foto_url || null;

      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop();
        const path = `${Date.now()}.${ext}`;
        const { error: upErr } = await sb.storage.from('colaboradores').upload(path, fotoFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = sb.storage.from('colaboradores').getPublicUrl(path);
        foto_url = urlData.publicUrl;
      }

      const payload = {
        nome_completo: form.nome_completo,
        cpf: form.cpf || null,
        rg: form.rg || null,
        funcao: form.funcao || null,
        dt_admissao: form.dt_admissao || null,
        dt_demissao: form.dt_demissao || null,
        clt_serie: form.clt_serie || null,
        pis: form.pis || null,
        email: form.email || null,
        celular: form.celular || null,
        endereco: form.endereco || null,
        cidade: form.cidade || null,
        foto_url,
        ativo: !form.dt_demissao,
        atualizado_em: new Date().toISOString(),
      };

      if (form.id) {
        await sb.from('colaboradores').update(payload).eq('id', form.id);
      } else {
        await sb.from('colaboradores').insert(payload);
      }
      addToast('Colaborador salvo!', 'success');
      setModal(false);
      carregar();
    } catch (e) { addToast('Erro: ' + e.message, 'error'); }
    finally { setSalvando(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este colaborador?')) return;
    await sb.from('colaboradores').delete().eq('id', id);
    carregar();
  };

  const lista = colaboradores.filter(c => {
    const matchBusca = !busca || c.nome_completo?.toLowerCase().includes(busca.toLowerCase()) || c.funcao?.toLowerCase().includes(busca.toLowerCase());
    const matchAtivo = filtroAtivo === 'todos' || (filtroAtivo === 'ativos' ? c.ativo : !c.ativo);
    return matchBusca && matchAtivo;
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="page-title">👥 Colaboradores</div>
          <div className="page-sub">{colaboradores.filter(c => c.ativo).length} ativo(s) · {colaboradores.filter(c => !c.ativo).length} inativo(s)</div>
        </div>
        {aba === 'colaboradores' && (
          <button className="btn btn-primary" onClick={() => abrirModal()}>+ Novo Colaborador</button>
        )}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)', marginBottom: 20 }}>
        {[['colaboradores','👥 Colaboradores'],['ferias','🏖 Férias']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)}
            style={{ padding: '10px 24px', background: 'none', border: 'none', borderBottom: `3px solid ${aba === id ? 'var(--color-accent)' : 'transparent'}`, color: aba === id ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: aba === id ? 700 : 400, cursor: 'pointer', fontSize: 14, marginBottom: -2 }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Aba Colaboradores ── */}
      {aba === 'colaboradores' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input className="form-input" placeholder="Buscar por nome ou função..." value={busca}
              onChange={e => setBusca(e.target.value)} style={{ maxWidth: 280 }} />
            {['ativos','inativos','todos'].map(f => (
              <button key={f} onClick={() => setFiltroAtivo(f)}
                style={{ padding: '5px 14px', borderRadius: 20, border: `1px solid ${filtroAtivo === f ? 'var(--color-accent)' : 'var(--color-border)'}`, background: filtroAtivo === f ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'var(--color-surface-2)', color: filtroAtivo === f ? 'var(--color-accent)' : 'var(--color-text-muted)', fontSize: 12, fontWeight: filtroAtivo === f ? 700 : 400, cursor: 'pointer' }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Grid de cards */}
          {carregando ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-faint)' }}>Carregando...</div>
          ) : lista.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-faint)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
              <div>Nenhum colaborador encontrado.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {lista.map(c => (
                <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0, opacity: c.ativo ? 1 : 0.65 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    {/* Foto */}
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--color-surface-2)', border: '2px solid var(--color-border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {c.foto_url ? (
                        <img src={c.foto_url} alt={c.nome_completo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 24, color: 'var(--color-text-faint)' }}>👤</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome_completo}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.funcao || '—'}</div>
                      <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 10, background: c.ativo ? 'color-mix(in srgb, var(--color-success) 15%, transparent)' : 'color-mix(in srgb, var(--color-danger) 15%, transparent)', color: c.ativo ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 700 }}>
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                    {c.email && <div>📧 {c.email}</div>}
                    {c.celular && <div>📱 {c.celular}</div>}
                    {c.dt_admissao && <div>📅 Admissão: {fmtData(c.dt_admissao)}</div>}
                    {c.dt_demissao && <div>📅 Demissão: {fmtData(c.dt_demissao)}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => abrirModal(c)}>✎ Editar</button>
                    <button className="btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => excluir(c.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Aba Férias ── */}
      {aba === 'ferias' && (
        <AbaFerias colaboradores={colaboradores} sb={sb} addToast={addToast} />
      )}

      {/* ── Modal Colaborador ── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">{form.id ? '✎ Editar' : '+ Novo'} Colaborador</span>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {/* Foto */}
                <div style={{ flexShrink: 0 }}>
                  <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--color-surface-2)', border: '2px dashed var(--color-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: 8 }}
                    onClick={() => fileRef.current?.click()}>
                    {fotoPreview ? (
                      <img src={fotoPreview} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 40 }}>👤</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleFoto} />
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%', fontSize: 11 }} onClick={() => fileRef.current?.click()}>
                    📷 Foto
                  </button>
                </div>

                {/* Campos */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Nome Completo *</label>
                    <input className="form-input" value={form.nome_completo || ''} onChange={e => set('nome_completo', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CPF</label>
                    <input className="form-input" value={form.cpf || ''} onChange={e => set('cpf', fmtCPF(e.target.value))} placeholder="000.000.000-00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">RG</label>
                    <input className="form-input" value={form.rg || ''} onChange={e => set('rg', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Função</label>
                    <input className="form-input" value={form.funcao || ''} onChange={e => set('funcao', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Celular</label>
                    <input className="form-input" value={form.celular || ''} onChange={e => set('celular', fmtCelular(e.target.value))} placeholder="(65) 99999-9999" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CLT (Nº de série)</label>
                    <input className="form-input" value={form.clt_serie || ''} onChange={e => set('clt_serie', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PIS</label>
                    <input className="form-input" value={form.pis || ''} onChange={e => set('pis', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data de Admissão</label>
                    <input type="date" className="form-input" value={form.dt_admissao || ''} onChange={e => set('dt_admissao', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data de Demissão</label>
                    <input type="date" className="form-input" value={form.dt_demissao || ''} onChange={e => set('dt_demissao', e.target.value)} />
                    <div className="form-hint">Preencher torna o colaborador inativo</div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Endereço</label>
                    <input className="form-input" value={form.endereco || ''} onChange={e => set('endereco', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cidade</label>
                    <input className="form-input" value={form.cidade || ''} onChange={e => set('cidade', e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={salvando}>
                {salvando ? '⏳ Salvando...' : '✓ Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
