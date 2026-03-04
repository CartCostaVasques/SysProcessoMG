// ============================================================
// SysProcesso — Cliente Supabase + helpers tipados
// src/lib/supabase.js
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    'Variáveis de ambiente não encontradas.\n' +
    'Crie o arquivo .env.local com:\n' +
    'VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=eyJ...'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────

/** Login com e-mail e senha */
export async function signIn(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data;
}

/** Logout */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Sessão atual */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Cria novo usuário no Auth + perfil */
export async function criarUsuario({ email, senha, nome_completo, nome_simples, perfil = 'Escrevente', ...rest }) {
  // Cria no Supabase Auth (requer service_role key em ambiente admin)
  // No frontend, use o convite por e-mail ou crie via painel Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome_completo, nome_simples, perfil }, // passa para o trigger handle_new_user
    },
  });
  if (error) throw error;

  // Atualiza os demais campos do perfil
  if (data.user) {
    await atualizarUsuario(data.user.id, { nome_completo, nome_simples, perfil, ...rest });
  }
  return data.user;
}

// ─────────────────────────────────────────────────────────────
// USUÁRIOS
// ─────────────────────────────────────────────────────────────

export async function getUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nome_completo');
  if (error) throw error;
  return data;
}

export async function getUsuarioPorId(id) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarUsuario(id, dados) {
  const { data, error } = await supabase
    .from('usuarios')
    .update(dados)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarUsuario(id) {
  // Inativa ao invés de deletar (preserva histórico)
  return atualizarUsuario(id, { ativo: false });
}

// ─────────────────────────────────────────────────────────────
// PROCESSOS
// ─────────────────────────────────────────────────────────────

export async function getProcessos(filtros = {}) {
  let q = supabase
    .from('vw_processos') // usa a view com join de usuário e count de andamentos
    .select('*')
    .order('dt_abertura', { ascending: false });

  if (filtros.status)       q = q.eq('status', filtros.status);
  if (filtros.responsavel_id) q = q.eq('responsavel_id', filtros.responsavel_id);
  if (filtros.categoria)    q = q.eq('categoria', filtros.categoria);
  if (filtros.busca)        q = q.ilike('numero_interno', `%${filtros.busca}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function criarProcesso(dados) {
  const { data, error } = await supabase
    .from('processos')
    .insert(dados)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarProcesso(id, dados) {
  const { data, error } = await supabase
    .from('processos')
    .update(dados)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarProcesso(id) {
  const { error } = await supabase.from('processos').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// ANDAMENTOS
// ─────────────────────────────────────────────────────────────

export async function getAndamentos(filtros = {}) {
  let q = supabase
    .from('andamentos')
    .select('*, processos(numero_interno, especie)')
    .order('dt_andamento', { ascending: false });

  if (filtros.processo_id)    q = q.eq('processo_id', filtros.processo_id);
  if (filtros.responsavel_id) q = q.eq('responsavel_id', filtros.responsavel_id);
  if (filtros.concluido !== undefined) q = q.eq('concluido', filtros.concluido);
  if (filtros.dt_inicio)      q = q.gte('dt_andamento', filtros.dt_inicio);
  if (filtros.dt_fim)         q = q.lte('dt_andamento', filtros.dt_fim);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function criarAndamento(dados) {
  const { data, error } = await supabase
    .from('andamentos')
    .insert(dados)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarAndamento(id, dados) {
  const { data, error } = await supabase
    .from('andamentos')
    .update(dados)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarAndamento(id) {
  const { error } = await supabase.from('andamentos').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// TAREFAS
// ─────────────────────────────────────────────────────────────

export async function getTarefas(filtros = {}) {
  let q = supabase
    .from('tarefas')
    .select('*')
    .order('dt_fim', { ascending: true, nullsFirst: false });

  if (filtros.responsavel_id) q = q.eq('responsavel_id', filtros.responsavel_id);
  if (filtros.setor)          q = q.eq('setor', filtros.setor);
  if (filtros.concluida !== undefined) q = q.eq('concluida', filtros.concluida);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function criarTarefa(dados) {
  const { data, error } = await supabase
    .from('tarefas')
    .insert(dados)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarTarefa(id, dados) {
  const { data, error } = await supabase
    .from('tarefas')
    .update(dados)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarTarefa(id) {
  const { error } = await supabase.from('tarefas').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// OFÍCIOS
// ─────────────────────────────────────────────────────────────

export async function getOficios(filtros = {}) {
  let q = supabase
    .from('oficios')
    .select('*, processos(numero_interno)')
    .order('dt_oficio', { ascending: false });

  if (filtros.mes_ano)        q = q.eq('mes_ano', filtros.mes_ano);
  if (filtros.status)         q = q.eq('status', filtros.status);
  if (filtros.responsavel_id) q = q.eq('responsavel_id', filtros.responsavel_id);

  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function proximoNumeroOficio(mesAno) {
  const { data, error } = await supabase.rpc('proximo_numero_oficio', { p_mes_ano: mesAno });
  if (error) throw error;
  return data; // string ex: "0003/2025"
}

export async function criarOficio(dados) {
  const { data, error } = await supabase
    .from('oficios')
    .insert(dados)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarOficio(id, dados) {
  const { data, error } = await supabase
    .from('oficios')
    .update(dados)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarOficio(id) {
  const { error } = await supabase.from('oficios').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// SETORES
// ─────────────────────────────────────────────────────────────

export async function getSetores() {
  const { data, error } = await supabase
    .from('setores')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data;
}

export async function criarSetor(dados) {
  const { data, error } = await supabase.from('setores').insert(dados).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarSetor(id, dados) {
  const { data, error } = await supabase.from('setores').update(dados).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletarSetor(id) {
  const { error } = await supabase.from('setores').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// SERVIÇOS
// ─────────────────────────────────────────────────────────────

export async function getServicos() {
  const { data, error } = await supabase
    .from('servicos')
    .select('*')
    .order('categoria')
    .order('subcategoria');
  if (error) throw error;
  return data;
}

export async function criarServico(dados) {
  const { data, error } = await supabase.from('servicos').insert(dados).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarServico(id, dados) {
  const { data, error } = await supabase.from('servicos').update(dados).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletarServico(id) {
  const { error } = await supabase.from('servicos').delete().eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────
// CARTÓRIO
// ─────────────────────────────────────────────────────────────

export async function getCartorio() {
  const { data, error } = await supabase
    .from('cartorio')
    .select('*')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data;
}

export async function salvarCartorio(dados) {
  const { data, error } = await supabase
    .from('cartorio')
    .upsert({ id: 1, ...dados })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD (chamada RPC única)
// ─────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const { data, error } = await supabase.rpc('dashboard_stats');
  if (error) throw error;
  return data; // JSON com todos os stats
}

// ─────────────────────────────────────────────────────────────
// LOGS DE ACESSO
// ─────────────────────────────────────────────────────────────

export async function getLogs(limit = 100) {
  const { data, error } = await supabase
    .from('logs_acesso')
    .select('*')
    .order('dt_acesso', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function registrarLog({ usuario_id, usuario, ip, navegador, so, acao }) {
  // Funciona mesmo sem sessão (anon) — política permite insert
  const { error } = await supabase.from('logs_acesso').insert({
    usuario_id: usuario_id || null,
    usuario:    usuario    || null,
    ip, navegador, so, acao,
  });
  // Silencia erro de log para não quebrar a UX
  if (error) console.warn('Erro ao registrar log:', error.message);
}

// ─────────────────────────────────────────────────────────────
// STORAGE — upload de logo
// ─────────────────────────────────────────────────────────────

export async function uploadLogo(file) {
  const ext  = file.name.split('.').pop();
  const path = `logo/cartorio.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return data.publicUrl;
}
