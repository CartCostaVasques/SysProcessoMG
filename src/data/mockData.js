// ============================================================
// SysProcesso — Mock Data (substitui Supabase em dev)
// ============================================================

export const MOCK_CARTORIO = {
  nome: 'Cartório de Notas e Registro de Imóveis',
  nomeSimples: 'Cartório Paranatinga',
  responsavel: 'Mauro George Viana Marques Felisbino',
  cidade: 'Paranatinga - MT',
  endereco: 'Avenida Brasil, nº 2.518, Jardim Panorama',
  cep: '78870-000',
  telefone: '(66) 3388-0000',
  email: 'contato@cartorioparanatinga.com.br',
  cor_primaria: '#e0e0e6',
  cor_acento: '#4a4a4a',
  tema: 'dark',
  logo: null,
};

export const PERFIS = ['Administrador', 'Tabelião', 'Escrevente', 'Substituto', 'Auxiliar', 'Consultor'];

export const MOCK_USUARIOS = [
  { id: 1, nome_completo: 'Mauro George Viana Marques Felisbino', nome_simples: 'Mauro', email: 'mauro@cartorio.com', cpf: '861.719.921-00', rg: '1264191-0 SSP-MT', celular: '(66) 9 8402-0120', cargo: 'Administrador', perfil: 'Administrador', setor: 'Administração', endereco: 'Av. Brasil, 2518', cidade: 'Paranatinga', uf: 'MT', ativo: true, dt_cadastro: '2024-01-10', ultimo_acesso: '2025-03-03 08:45', permissoes: ['dashboard','usuarios','processos','servicos','tarefas','setores','oficios','configuracoes','logs'] },
  { id: 2, nome_completo: 'Ana Paula Ribeiro Sousa', nome_simples: 'Ana Paula', email: 'ana@cartorio.com', cpf: '123.456.789-00', rg: '2233445-0 SSP-MT', celular: '(66) 9 9111-2222', cargo: 'Escrevente', perfil: 'Escrevente', setor: 'Escritura', endereco: 'Rua das Flores, 100', cidade: 'Paranatinga', uf: 'MT', ativo: true, dt_cadastro: '2024-02-01', ultimo_acesso: '2025-03-03 07:30', permissoes: ['dashboard','processos','servicos','tarefas','oficios'] },
  { id: 3, nome_completo: 'Carlos Eduardo Lima', nome_simples: 'Carlos', email: 'carlos@cartorio.com', cpf: '987.654.321-00', rg: '3344556-0 SSP-MT', celular: '(66) 9 9333-4444', cargo: 'Escrevente', perfil: 'Escrevente', setor: 'Protesto', endereco: 'Rua Mato Grosso, 250', cidade: 'Paranatinga', uf: 'MT', ativo: true, dt_cadastro: '2024-03-15', ultimo_acesso: '2025-03-02 17:10', permissoes: ['dashboard','processos','servicos','tarefas'] },
  { id: 4, nome_completo: 'Fernanda Costa Martins', nome_simples: 'Fernanda', email: 'fernanda@cartorio.com', cpf: '111.222.333-44', rg: '4455667-0 SSP-MT', celular: '(66) 9 9555-6666', cargo: 'Tabelião Substituto', perfil: 'Tabelião', setor: 'Registro Civil', endereco: 'Av. Cuiabá, 88', cidade: 'Paranatinga', uf: 'MT', ativo: false, dt_cadastro: '2024-04-20', ultimo_acesso: '2025-02-28 14:00', permissoes: ['dashboard','processos','servicos','tarefas','oficios','configuracoes'] },
];

export const MOCK_SETORES = [
  { id: 1, nome: 'Escritura', descricao: 'Lavraturas de escrituras públicas', ativo: true },
  { id: 2, nome: 'Protesto', descricao: 'Protestos de títulos e documentos', ativo: true },
  { id: 3, nome: 'Registro Civil', descricao: 'Registro de nascimentos, casamentos e óbitos', ativo: true },
  { id: 4, nome: 'Pessoa Jurídica', descricao: 'Registros de empresas e atos societários', ativo: true },
  { id: 5, nome: 'Administração', descricao: 'Setor administrativo e financeiro', ativo: true },
];

export const MOCK_SERVICOS = [
  { id: 1, categoria: 'Escritura', subcategoria: 'Compra e Venda', descricao: 'Compra e Venda de imóvel', ativo: true },
  { id: 2, categoria: 'Escritura', subcategoria: 'Doação', descricao: 'Doação de bem imóvel', ativo: true },
  { id: 3, categoria: 'Escritura', subcategoria: 'Permuta', descricao: 'Permuta de imóveis', ativo: true },
  { id: 4, categoria: 'Escritura', subcategoria: 'Inventário', descricao: 'Inventário extrajudicial', ativo: true },
  { id: 5, categoria: 'Escritura', subcategoria: 'Procuração', descricao: 'Procuração pública', ativo: true },
  { id: 6, categoria: 'Escritura', subcategoria: 'Usucapião', descricao: 'Usucapião extrajudicial', ativo: true },
  { id: 7, categoria: 'Protesto', subcategoria: 'Título Extrajudicial', descricao: 'Protesto de título extrajudicial', ativo: true },
  { id: 8, categoria: 'Protesto', subcategoria: 'Cheque', descricao: 'Protesto de cheque', ativo: true },
  { id: 9, categoria: 'Protesto', subcategoria: 'Nota Promissória', descricao: 'Protesto de nota promissória', ativo: true },
  { id: 10, categoria: 'Registro Civil', subcategoria: 'Nascimento', descricao: 'Registro de nascimento', ativo: true },
  { id: 11, categoria: 'Registro Civil', subcategoria: 'Casamento', descricao: 'Habilitação e registro de casamento', ativo: true },
  { id: 12, categoria: 'Registro Civil', subcategoria: 'Óbito', descricao: 'Registro de óbito', ativo: true },
  { id: 13, categoria: 'Pessoa Jurídica', subcategoria: 'Constituição', descricao: 'Constituição de empresa', ativo: true },
  { id: 14, categoria: 'Pessoa Jurídica', subcategoria: 'Alteração Contratual', descricao: 'Alteração contratual de empresa', ativo: true },
  { id: 15, categoria: 'Pessoa Jurídica', subcategoria: 'Dissolução', descricao: 'Dissolução de sociedade', ativo: true },
];

export const MOCK_PROCESSOS = [
  { id: 1, numero_interno: '456825', numero_judicial: '', especie: 'Compra e Venda', categoria: 'Escritura', status: 'Concluído', dt_abertura: '2024-07-04', dt_conclusao: '2024-08-01', responsavel_id: 2, responsavel: 'Ana Paula', partes: 'Iraci Ribeiro da Costa / Eduardo da Silva', municipio: 'Paranatinga', valor_ato: 4849.89, andamentos: 3, obs: '' },
  { id: 2, numero_interno: '456903', numero_judicial: '', especie: 'Doação', categoria: 'Escritura', status: 'Concluído', dt_abertura: '2024-07-05', dt_conclusao: '2024-07-29', responsavel_id: 2, responsavel: 'Ana Paula', partes: 'João Paulo Ferreira', municipio: 'Paranatinga', valor_ato: 5977.82, andamentos: 2, obs: '' },
  { id: 3, numero_interno: '457001', numero_judicial: '0001234-12.2024', especie: 'Usucapião', categoria: 'Escritura', status: 'Em andamento', dt_abertura: '2024-08-10', dt_conclusao: null, responsavel_id: 3, responsavel: 'Carlos', partes: 'Maria das Dores Silva', municipio: 'Paranatinga', valor_ato: 0, andamentos: 5, obs: 'Aguardando certidões' },
  { id: 4, numero_interno: '457102', numero_judicial: '', especie: 'Inventário', categoria: 'Escritura', status: 'Em andamento', dt_abertura: '2024-09-01', dt_conclusao: null, responsavel_id: 2, responsavel: 'Ana Paula', partes: 'Espólio de José Carlos Mendes', municipio: 'Paranatinga', valor_ato: 12500.00, andamentos: 7, obs: '' },
  { id: 5, numero_interno: '457210', numero_judicial: '', especie: 'Título Extrajudicial', categoria: 'Protesto', status: 'Concluído', dt_abertura: '2024-09-15', dt_conclusao: '2024-09-20', responsavel_id: 3, responsavel: 'Carlos', partes: 'Comércio Alfa Ltda', municipio: 'Paranatinga', valor_ato: 1200.00, andamentos: 2, obs: '' },
  { id: 6, numero_interno: '457305', numero_judicial: '', especie: 'Procuração', categoria: 'Escritura', status: 'Concluído', dt_abertura: '2024-10-03', dt_conclusao: '2024-10-03', responsavel_id: 2, responsavel: 'Ana Paula', partes: 'Roberto Lima Santos', municipio: 'Paranatinga', valor_ato: 320.00, andamentos: 1, obs: '' },
  { id: 7, numero_interno: '457401', numero_judicial: '0002345-22.2024', especie: 'Constituição', categoria: 'Pessoa Jurídica', status: 'Em andamento', dt_abertura: '2024-10-20', dt_conclusao: null, responsavel_id: 1, responsavel: 'Mauro', partes: 'Tech Solutions Ltda ME', municipio: 'Paranatinga', valor_ato: 0, andamentos: 3, obs: 'Pendente assinaturas' },
  { id: 8, numero_interno: '457502', numero_judicial: '', especie: 'Casamento', categoria: 'Registro Civil', status: 'Em andamento', dt_abertura: '2024-11-05', dt_conclusao: null, responsavel_id: 4, responsavel: 'Fernanda', partes: 'Paulo Henrique / Camila Rocha', municipio: 'Paranatinga', valor_ato: 0, andamentos: 2, obs: 'Habilitação em andamento' },
  { id: 9, numero_interno: '457610', numero_judicial: '', especie: 'Compra e Venda', categoria: 'Escritura', status: 'Em andamento', dt_abertura: '2025-01-10', dt_conclusao: null, responsavel_id: 2, responsavel: 'Ana Paula', partes: 'Construtora Horizonte / Pedro Alves', municipio: 'Sinop', valor_ato: 280000.00, andamentos: 4, obs: '' },
  { id: 10, numero_interno: '457715', numero_judicial: '', especie: 'Inventário', categoria: 'Escritura', status: 'Em andamento', dt_abertura: '2025-02-01', dt_conclusao: null, responsavel_id: 1, responsavel: 'Mauro', partes: 'Espólio de Antônia Ferreira', municipio: 'Paranatinga', valor_ato: 45000.00, andamentos: 1, obs: 'Novo processo' },
];

export const MOCK_ANDAMENTOS = [
  { id: 1, processo_id: 3, dt_andamento: '2024-08-10', tipo: 'Abertura', descricao: 'Processo aberto, documentos recebidos', responsavel: 'Carlos', concluido: true },
  { id: 2, processo_id: 3, dt_andamento: '2024-08-20', tipo: 'Diligência', descricao: 'Solicitação de certidões ao CRI', responsavel: 'Carlos', prazo: 15, vencimento: '2024-09-04', concluido: true },
  { id: 3, processo_id: 3, dt_andamento: '2024-09-05', tipo: 'Análise', descricao: 'Certidões recebidas, em análise', responsavel: 'Carlos', concluido: true },
  { id: 4, processo_id: 3, dt_andamento: '2024-10-01', tipo: 'Ofício', descricao: 'Ofício encaminhado ao Município', responsavel: 'Carlos', prazo: 30, vencimento: '2024-10-31', concluido: false },
  { id: 5, processo_id: 3, dt_andamento: '2025-01-15', tipo: 'Pendência', descricao: 'Aguardando retorno do Município', responsavel: 'Carlos', concluido: false },
];

export const MOCK_TAREFAS = [
  { id: 1, titulo: 'Imprimir livro Protocolo PJ', dt_inicio: '2025-03-01', dt_fim: '2025-03-05', responsavel_id: 1, responsavel: 'Mauro', setor: 'Pessoa Jurídica', tipo: 'Impressão', concluida: false, obs: '' },
  { id: 2, titulo: 'Revisar certidões pendentes', dt_inicio: '2025-02-28', dt_fim: '2025-03-03', responsavel_id: 2, responsavel: 'Ana Paula', setor: 'Escritura', tipo: 'Revisão', concluida: false, obs: 'Prioridade alta' },
  { id: 3, titulo: 'Atualizar cadastro de partes', dt_inicio: '2025-02-25', dt_fim: '2025-03-01', responsavel_id: 3, responsavel: 'Carlos', setor: 'Protesto', tipo: 'Cadastro', concluida: true, obs: '' },
  { id: 4, titulo: 'Enviar ofícios pendentes ISSQN', dt_inicio: '2025-03-03', dt_fim: '2025-03-07', responsavel_id: 1, responsavel: 'Mauro', setor: 'Administração', tipo: 'Ofício', concluida: false, obs: 'Referente Jan/2025' },
  { id: 5, titulo: 'Treinamento sistema novo', dt_inicio: '2025-03-10', dt_fim: '2025-03-10', responsavel_id: 2, responsavel: 'Ana Paula', setor: 'Escritura', tipo: 'Treinamento', concluida: false, obs: '' },
];

export const MOCK_OFICIOS = [
  { id: 1, numero: '0001/2025', mes_ano: '01/2025', dt_oficio: '2025-01-08', destinatario: 'Prefeitura Municipal de Paranatinga - MT', assunto: 'ISSQN - Entrada Dezembro 2024', responsavel_id: 1, responsavel: 'Mauro', processo_id: null, status: 'Enviado' },
  { id: 2, numero: '0002/2025', mes_ano: '01/2025', dt_oficio: '2025-01-15', destinatario: 'Tribunal de Justiça do Estado de MT', assunto: 'Relatório mensal de protestos - Dezembro 2024', responsavel_id: 1, responsavel: 'Mauro', processo_id: null, status: 'Respondido' },
  { id: 3, numero: '0003/2025', mes_ano: '01/2025', dt_oficio: '2025-01-22', destinatario: 'Receita Federal - Agência Paranatinga', assunto: 'Esclarecimentos CNPJ processo nº 457401', responsavel_id: 2, responsavel: 'Ana Paula', processo_id: 7, status: 'Enviado' },
  { id: 4, numero: '0001/2025', mes_ano: '02/2025', dt_oficio: '2025-02-05', destinatario: 'INCRA - Delegacia Cuiabá', assunto: 'Certidão de imóvel rural - Processo 457002', responsavel_id: 3, responsavel: 'Carlos', processo_id: null, status: 'Aguardando Resposta' },
  { id: 5, numero: '0002/2025', mes_ano: '02/2025', dt_oficio: '2025-02-18', destinatario: 'Procuradoria da Fazenda Nacional', assunto: 'Resposta ao Of 186268/2025', responsavel_id: 1, responsavel: 'Mauro', processo_id: null, status: 'Enviado' },
  { id: 6, numero: '0001/2025', mes_ano: '03/2025', dt_oficio: '2025-03-02', destinatario: 'DETRAN-MT', assunto: 'Solicitação de certidão de veículo - Processo 457715', responsavel_id: 2, responsavel: 'Ana Paula', processo_id: 10, status: 'Enviado' },
];

export const MOCK_LOGS_ACESSO = [
  { id: 1, ip: '192.168.1.101', navegador: 'Chrome 122', so: 'Windows 11', dt_acesso: '2025-03-03 08:45:12', usuario: 'Mauro', acao: 'Login' },
  { id: 2, ip: '192.168.1.102', navegador: 'Firefox 123', so: 'Windows 10', dt_acesso: '2025-03-03 07:30:44', usuario: 'Ana Paula', acao: 'Login' },
  { id: 3, ip: '189.45.200.11', navegador: 'Safari 17', so: 'macOS Sonoma', dt_acesso: '2025-03-03 06:12:05', usuario: '—', acao: 'Acesso (sem login)' },
  { id: 4, ip: '192.168.1.103', navegador: 'Chrome 121', so: 'Windows 10', dt_acesso: '2025-03-02 17:10:30', usuario: 'Carlos', acao: 'Login' },
  { id: 5, ip: '201.100.50.22', navegador: 'Edge 122', so: 'Windows 11', dt_acesso: '2025-03-02 14:05:18', usuario: '—', acao: 'Acesso (sem login)' },
  { id: 6, ip: '192.168.1.101', navegador: 'Chrome 122', so: 'Windows 11', dt_acesso: '2025-03-01 09:00:00', usuario: 'Mauro', acao: 'Login' },
  { id: 7, ip: '192.168.1.104', navegador: 'Chrome 122', so: 'Android 14', dt_acesso: '2025-03-01 08:15:00', usuario: '—', acao: 'Acesso (sem login)' },
];

// Helpers
export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
};

export const formatDate = (d) => {
  if (!d) return '—';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
};

export const formatCurrency = (v) => {
  if (!v && v !== 0) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
};
