import { useState, useEffect, useCallback } from 'react';
import Portal from '../layout/Portal.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { supabase } from '../../lib/supabase.js';

const PERIODICIDADE = [
  { value: 'quinzenal',  label: 'Quinzenal'  },
  { value: 'mensal',     label: 'Mensal'     },
  { value: 'semestral',  label: 'Semestral'  },
  { value: 'anual',      label: 'Anual'      },
];

const STATUS_CLS = {
  pendente:  { label: 'Pendente',  bg: '#fef3c7', color: '#b45309', border: '#fbbf24' },
  realizado: { label: 'Realizado', bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  atrasado:  { label: 'Atrasado',  bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

const EMPTY_CONFIG = { titulo: '', descricao: '', periodicidade: 'mensal', dia_vencimento: 1, responsavel_id: '', dias_alerta: 2, ativo: true };

function hoje() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDias(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function fmtData(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Calcula próxima data de vencimento a partir de hoje conforme periodicidade
function calcProximoVencimento(config) {
  const h = hoje();
  const dia = config.dia_vencimento || 1;

  if (config.periodicidade === 'quinzenal') {
    // Vencimentos nos dias 1 e 16 de cada mês (ou dia e dia+15)
    const d1 = new Date(h.getFullYear(), h.getMonth(), dia);
    const d2 = new Date(h.getFullYear(), h.getMonth(), dia + 15);
    if (h <= d1) return d1;
    if (h <= d2) return d2;
    return new Date(h.getFullYear(), h.getMonth() + 1, dia);
  }

  if (config.periodicidade === 'mensal') {
    let d = new Date(h.getFullYear(), h.getMonth(), dia);
    if (h > d) d = new Date(h.getFullYear(), h.getMonth() + 1, dia);
    return d;
  }

  if (config.periodicidade === 'semestral') {
    const meses = [0, 6]; // jan e jul
    for (let i = 0; i < 4; i++) {
      const m = (meses[0] + i * 6) % 12;
      const y = h.getFullYear() + Math.floor(i / 2);
      const d = new Date(y, m, dia);
      if (d >= h) return d;
    }
  }

  if (config.periodicidade === 'anual') {
    let d = new Date(h.getFullYear(), (dia <= 12 ? dia - 1 : 0), 1);
    if (h > d) d = new Date(h.getFullYear() + 1, d.getMonth(), 1);
    return d;
  }

  return h;
}

// Modal de cadastro/edição de comunicação
function ModalConfig({ config, onClose, onSave, usuarios }) {
  const [form, setForm] = useState(config ? { ...config } : { ...EMPTY_CONFIG });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 520 }}>
          <div className="modal-header">
            <span className="modal-title">{config ? 'Editar Comunicação' : 'Nova Comunicação'}</span>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <label className="form-label">Título *</label>
              <input className="form-input" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Relatório RCPN" />
            </div>

            <div>
              <label className="form-label">Descrição</label>
              <textarea className="form-input" rows={2} value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} placeholder="Detalhes da comunicação..." style={{ resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Periodicidade *</label>
                <select className="form-input" value={form.periodicidade} onChange={e => set('periodicidade', e.target.value)}>
                  {PERIODICIDADE.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">
                  {form.periodicidade === 'quinzenal' ? 'Dia (1ª quinzena)' : 'Dia do vencimento'}
                </label>
                <input className="form-input" type="number" min={1} max={28} value={form.dia_vencimento || 1}
                  onChange={e => set('dia_vencimento', parseInt(e.target.value) || 1)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Responsável</label>
                <select className="form-input" value={form.responsavel_id || ''} onChange={e => set('responsavel_id', e.target.value || null)}>
                  <option value="">— Nenhum —</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Alertar (dias antes)</label>
                <input className="form-input" type="number" min={1} max={30} value={form.dias_alerta || 2}
                  onChange={e => set('dias_alerta', parseInt(e.target.value) || 2)} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} />
              <label htmlFor="ativo" style={{ fontSize: 13, cursor: 'pointer' }}>Comunicação ativa</label>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => {
              if (!form.titulo) { alert('Título obrigatório.'); return; }
              onSave(form);
            }}>Salvar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// Modal para marcar ocorrência como realizada
function ModalRealizar({ ocorrencia, config, onClose, onSave }) {
  const [dtRealizado, setDtRealizado] = useState(toDateStr(hoje()));
  const [obs, setObs] = useState('');

  return (
    <Portal>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" style={{ maxWidth: 420 }}>
          <div className="modal-header">
            <span className="modal-title">✓ Marcar como Realizado</span>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>{config?.titulo}</div>
              <div style={{ color: 'var(--color-text-muted)', marginTop: 2 }}>Vencimento: {fmtData(ocorrencia?.dt_vencimento)}</div>
            </div>
            <div>
              <label className="form-label">Data de realização</label>
              <input className="form-input" type="date" value={dtRealizado} onChange={e => setDtRealizado(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Observação</label>
              <textarea className="form-input" rows={2} value={obs} onChange={e => setObs(e.target.value)} placeholder="Protocolo, número do documento, etc." style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => onSave({ dt_realizado: dtRealizado, observacao: obs, status: 'realizado' })}>Confirmar</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export default function Comunicacoes() {
  const { usuario, addToast, usuarios } = useApp();
  const [configs, setConfigs] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState(null);  // null | 'novo' | objeto
  const [modalRealizar, setModalRealizar] = useState(null); // null | { ocorrencia, config }
  const [aba, setAba] = useState('pendentes'); // 'pendentes' | 'historico' | 'configurar'
  const [filtroResp, setFiltroResp] = useState('');

  const carregar = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setLoading(true);
      const [{ data: cfgs }, { data: ocors }] = await Promise.all([
        supabase.from('comunicacoes_config').select('*').order('titulo'),
        supabase.from('comunicacoes_ocorrencias').select('*').order('dt_vencimento', { ascending: false }),
      ]);
      setConfigs(cfgs || []);
      setOcorrencias(ocors || []);
    } catch(e) {
      console.warn('Comunicacoes carregar:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Gerar ocorrências pendentes automaticamente
  const gerarOcorrencias = useCallback(async (cfgs, ocors) => {
    if (!cfgs?.length) return;
    const h = hoje();
    const inserts = [];

    for (const cfg of cfgs.filter(c => c.ativo)) {
      const prox = calcProximoVencimento(cfg);
      const proxStr = toDateStr(prox);
      // Verificar se já existe ocorrência pendente/futura para essa config
      const jaExiste = ocors?.some(o => o.config_id === cfg.id && o.dt_vencimento === proxStr);
      if (!jaExiste) {
        // Marcar atrasadas
        const pendentes = ocors?.filter(o => o.config_id === cfg.id && o.status === 'pendente') || [];
        for (const p of pendentes) {
          const dtV = new Date(p.dt_vencimento + 'T00:00:00');
          if (dtV < h) {
            await supabase.from('comunicacoes_ocorrencias').update({ status: 'atrasado' }).eq('id', p.id);
          }
        }
        inserts.push({ config_id: cfg.id, dt_vencimento: proxStr, status: 'pendente' });
      }
    }

    if (inserts.length > 0) {
      await supabase.from('comunicacoes_ocorrencias').insert(inserts);
      await carregar();
    }
  }, [carregar]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    if (!loading && configs.length > 0) gerarOcorrencias(configs, ocorrencias);
  }, [loading]);

  const salvarConfig = async (form) => {
    const payload = {
      titulo: form.titulo, descricao: form.descricao || null,
      periodicidade: form.periodicidade, dia_vencimento: form.dia_vencimento,
      responsavel_id: form.responsavel_id || null,
      dias_alerta: form.dias_alerta, ativo: form.ativo,
    };
    if (form.id) {
      await supabase.from('comunicacoes_config').update(payload).eq('id', form.id);
      addToast('Comunicação atualizada.', 'success');
    } else {
      await supabase.from('comunicacoes_config').insert(payload);
      addToast('Comunicação criada.', 'success');
    }
    setModalConfig(null);
    carregar();
  };

  const excluirConfig = async (id) => {
    if (!confirm('Excluir esta comunicação e todo seu histórico?')) return;
    await supabase.from('comunicacoes_config').delete().eq('id', id);
    addToast('Comunicação excluída.', 'success');
    carregar();
  };

  const realizarOcorrencia = async (ocorrencia, dados) => {
    await supabase.from('comunicacoes_ocorrencias').update({
      ...dados, realizado_por: usuario?.id,
    }).eq('id', ocorrencia.id);
    addToast('Comunicação marcada como realizada!', 'success');
    setModalRealizar(null);
    carregar();
  };

  const nomeResp = (id) => usuarios.find(u => u.id === id)?.nome_simples || '—';
  const configById = (id) => configs.find(c => c.id === id);

  // Ocorrências pendentes + atrasadas com alerta próximo
  const h = hoje();
  const pendentes = ocorrencias.filter(o => o.status !== 'realizado').map(o => {
    const cfg = configById(o.config_id);
    const dtV = new Date(o.dt_vencimento + 'T00:00:00');
    const diffDias = Math.ceil((dtV - h) / 86400000);
    return { ...o, cfg, diffDias };
  }).filter(o => o.cfg).sort((a, b) => a.diffDias - b.diffDias);

  const historico = ocorrencias.filter(o => o.status === 'realizado').map(o => ({
    ...o, cfg: configById(o.config_id),
  })).filter(o => o.cfg);

  const pendFiltradas = filtroResp ? pendentes.filter(o => o.cfg?.responsavel_id === filtroResp) : pendentes;
  const histFiltradas = filtroResp ? historico.filter(o => o.cfg?.responsavel_id === filtroResp) : historico;

  const labelPeriod = (p) => PERIODICIDADE.find(x => x.value === p)?.label || p;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>📡 Comunicações Periódicas</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Controle de comunicações obrigatórias do cartório</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalConfig('novo')}>+ Nova Comunicação</button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border)', paddingBottom: 0 }}>
        {[
          { id: 'pendentes', label: `⏳ Pendentes (${pendentes.length})` },
          { id: 'historico', label: '✓ Histórico' },
          { id: 'configurar', label: `⚙ Configurar (${configs.length})` },
        ].map(a => (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            padding: '8px 16px', fontSize: 13, fontWeight: aba === a.id ? 700 : 400, cursor: 'pointer',
            background: 'transparent', border: 'none', borderBottom: aba === a.id ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: aba === a.id ? 'var(--color-accent)' : 'var(--color-text-muted)',
          }}>{a.label}</button>
        ))}
      </div>

      {/* Filtro responsável */}
      {(aba === 'pendentes' || aba === 'historico') && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Responsável:</span>
          <select style={{ fontSize: 12, height: 30, padding: '0 8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface-2)', color: 'var(--color-text)' }}
            value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
            <option value="">Todos</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome_simples}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Carregando...</div>
      ) : (
        <>
          {/* ABA PENDENTES */}
          {aba === 'pendentes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendFiltradas.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>
                  ✅ Nenhuma comunicação pendente.
                </div>
              )}
              {pendFiltradas.map(o => {
                const st = STATUS_CLS[o.status] || STATUS_CLS.pendente;
                const atrasado = o.status === 'atrasado';
                const urgente = !atrasado && o.diffDias <= (o.cfg?.dias_alerta || 2);
                return (
                  <div key={o.id} style={{
                    background: atrasado ? '#fff1f1' : urgente ? '#fefce8' : 'var(--color-surface)',
                    border: `1px solid ${atrasado ? '#fca5a5' : urgente ? '#fbbf24' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{o.cfg?.titulo}</div>
                      {o.cfg?.descricao && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{o.cfg.descricao}</div>}
                      <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>📅 Vence: <strong>{fmtData(o.dt_vencimento)}</strong></span>
                        <span>🔄 {labelPeriod(o.cfg?.periodicidade)}</span>
                        <span>👤 {nomeResp(o.cfg?.responsavel_id)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                        {atrasado ? `Atrasado ${Math.abs(o.diffDias)}d` : o.diffDias === 0 ? 'Hoje!' : `${o.diffDias}d`}
                      </span>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }}
                        onClick={() => setModalRealizar({ ocorrencia: o, config: o.cfg })}>
                        ✓ Realizar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ABA HISTÓRICO */}
          {aba === 'historico' && (
            <div style={{ overflowX: 'auto' }}>
              {histFiltradas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>
                  Nenhum registro no histórico.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', fontSize: 11, textTransform: 'uppercase' }}>
                      {['Comunicação', 'Periodicidade', 'Responsável', 'Vencimento', 'Realizado em', 'Observação'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {histFiltradas.map((o, i) => (
                      <tr key={o.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-surface-2)', borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{o.cfg?.titulo}</td>
                        <td style={{ padding: '8px 12px' }}>{labelPeriod(o.cfg?.periodicidade)}</td>
                        <td style={{ padding: '8px 12px' }}>{nomeResp(o.cfg?.responsavel_id)}</td>
                        <td style={{ padding: '8px 12px' }}>{fmtData(o.dt_vencimento)}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-success)' }}>{fmtData(o.dt_realizado)}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{o.observacao || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ABA CONFIGURAR */}
          {aba === 'configurar' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {configs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>
                  Nenhuma comunicação cadastrada. Clique em "+ Nova Comunicação".
                </div>
              )}
              {configs.map(c => (
                <div key={c.id} style={{
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  opacity: c.ativo ? 1 : 0.5,
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {c.titulo}
                      {!c.ativo && <span style={{ fontSize: 10, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)', padding: '1px 8px', borderRadius: 10 }}>inativa</span>}
                    </div>
                    {c.descricao && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.descricao}</div>}
                    <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap', color: 'var(--color-text-muted)' }}>
                      <span>🔄 {labelPeriod(c.periodicidade)}</span>
                      <span>📅 Dia {c.dia_vencimento}</span>
                      <span>👤 {nomeResp(c.responsavel_id)}</span>
                      <span>⏰ Alerta {c.dias_alerta}d antes</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }} onClick={() => setModalConfig(c)}>✏ Editar</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--color-danger)' }} onClick={() => excluirConfig(c.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modais */}
      {modalConfig && (
        <ModalConfig
          config={modalConfig === 'novo' ? null : modalConfig}
          onClose={() => setModalConfig(null)}
          onSave={salvarConfig}
          usuarios={usuarios}
        />
      )}
      {modalRealizar && (
        <ModalRealizar
          ocorrencia={modalRealizar.ocorrencia}
          config={modalRealizar.config}
          onClose={() => setModalRealizar(null)}
          onSave={(dados) => realizarOcorrencia(modalRealizar.ocorrencia, dados)}
        />
      )}
    </div>
  );
}
