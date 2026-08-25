import type {
  AgendaEvent,
  Asset,
  Fact,
  InboxEmail,
  LifeLogEntry,
  MaintenanceRecord,
  MaintMonth,
  MediaItem,
  PantryItem,
  Place,
  ReadingEntry,
  Trip,
  WeeklySpending,
} from './types'

/** ISO YYYY-MM-DD for `offset` days relative to today. */
function day(offset: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

/** Monday YYYY-MM-DD for `weeksAgo` weeks ago. */
function monday(weeksAgo: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay() + 1 - weeksAgo * 7)
  return d.toISOString().slice(0, 10)
}

/** Month key 'YYYY-MM' for `monthsAgo`. */
function month(monthsAgo: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toISOString().slice(0, 7)
}

// bumping re-seeds every collection; safe while all data is mock seed
export const SEED_VERSION = 8 // Fase 7 — Inglês removido, preparação Agenda/Inbox

export const SEED: Record<string, unknown[]> = {
  events: [
    { id: 'evt-1', title: 'Check-up clínico anual', date: day(1), timeStart: '09:30', timeEnd: '10:15', category: 'pessoal', location: 'Clínica São Lucas' },
    { id: 'evt-2', title: 'Reunião de trabalho — Sprint Review', date: day(1), timeStart: '15:00', timeEnd: '16:00', category: 'reuniao', location: 'Online (Meet)' },
    { id: 'evt-3', title: 'Treino na academia', date: day(2), timeStart: '07:00', timeEnd: '08:00', category: 'habit', location: 'Smart Fit' },
    { id: 'evt-4', title: 'Jantar em família', date: day(3), timeStart: '19:30', category: 'pessoal', location: 'Casa dos pais' },
    { id: 'evt-5', title: 'Voo para Florianópolis', date: day(5), timeStart: '11:45', category: 'viagem', location: 'GRU — Aeroporto' },
    { id: 'evt-6', title: 'Revisão do carro na oficina', date: day(6), timeStart: '14:00', category: 'pessoal', location: 'Oficina do Zé' },
    { id: 'evt-7', title: 'Entrevista — vaga senior', date: day(8), timeStart: '10:00', timeEnd: '11:00', category: 'reuniao', location: 'Online (Zoom)' },
  ] satisfies AgendaEvent[],

  emails: [
    { id: 'eml-1', from: 'Hermes · Alerta', subject: 'Fatura do cartão acima de R$ 3.000 este mês', preview: 'Manutenção da oficina (R$ 1.240) + passagens Floripa (R$ 1.980) concentrados na mesma fatura. Revisar gastos da semana.', importance: 'critico', sentAt: new Date(Date.now() - 2 * 3_600_000).toISOString(), tags: ['financas', 'alerta'], read: false },
    { id: 'eml-2', from: 'Banco Central', subject: 'Faturas em aberto — vencimentos próximos', preview: 'Você tem 2 faturas vencendo em até 5 dias. Total: R$ 4.720,00.', importance: 'critico', sentAt: new Date(Date.now() - 5 * 3_600_000).toISOString(), tags: ['financas'], read: false },
    { id: 'eml-3', from: 'Recrutador · RH', subject: 'Resposta à sua candidatura', preview: 'Obrigado pelo interesse. Podemos agendar a entrevista técnica na próxima semana?', importance: 'normal', sentAt: new Date(Date.now() - 7 * 3_600_000).toISOString(), tags: ['carreira'], read: false },
  ] satisfies InboxEmail[],

  lifeLog: [
    { id: 'log-1', title: 'Primeiro dia com o Life OS Hub', body: 'Configurei o Hermes Bridge, os ativos da casa e a despensa. Motivação renovada para organizar a vida financeira.', tags: ['setup', 'produtividade'], mood: 5, createdAt: new Date(Date.now() - 86_400_000).toISOString() },
    { id: 'log-2', title: 'Leitura: Deep Work encerrado', body: 'Terminei o capítulo 5. Destaque: a rotina do ritual — bloquear 90 min sem notificações logo pela manhã. Vou testar por 2 semanas.', tags: ['leitura', 'foco'], mood: 4, createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
    { id: 'log-3', title: 'Treino de perna — novo PR', body: 'Agachamento livre: 3x6 com 92 kg. Sensação ótima, gasto maior que o planejado nos suplementos.', tags: ['saude', 'treino'], mood: 5, createdAt: new Date(Date.now() - 5 * 86_400_000).toISOString() },
  ] satisfies LifeLogEntry[],

  facts: [
    { id: 'fct-1', content: 'Trocar filtro do ar-condicionado a cada 3 meses (último: fev/2026).', source: 'Manual da casa', tags: ['casa', 'filtro'], createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString() },
    { id: 'fct-2', content: 'Pneu traseiro esquerdo perde ~2 psi/semana — verificar na próxima manutenção.', source: 'Observação', tags: ['carro', 'pneu'], createdAt: new Date(Date.now() - 9 * 86_400_000).toISOString() },
    { id: 'fct-3', content: 'Meu horário de foco produtivo: 6h30–9h da manhã.', source: 'Reflexão', tags: ['produtividade', 'rotina'], createdAt: new Date(Date.now() - 20 * 86_400_000).toISOString() },
  ] satisfies Fact[],

  reading: [
    { id: 'rd-1', title: 'Deep Work', author: 'Cal Newport', status: 'lendo', progress: 62, note: 'Capítulo 5: rituais de foco profundo.', tags: ['foco', 'produtividade'], updatedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    { id: 'rd-2', title: 'Hábitos Atômicos', author: 'James Clear', status: 'encerrado', progress: 100, note: 'Fichamento pronto.', tags: ['habitos'], updatedAt: new Date(Date.now() - 10 * 86_400_000).toISOString() },
    { id: 'rd-3', title: 'O Poder do Hábito', author: 'Charles Duhigg', status: 'lendo', progress: 30, tags: ['habitos', 'ciencia'], updatedAt: new Date(Date.now() - 86_400_000).toISOString() },
  ] satisfies ReadingEntry[],

  media: [
    { id: 'md-1', kind: 'youtube', url: 'https://youtu.be/habits-in-15', title: 'Como criar hábitos que duram — Atomic Habits em 15 min', sourceLabel: 'YouTube · @produtividade', summary: 'Resumo visual do método de James Clear: gatilho, rotina e recompensa — e como melhorar 1% por dia sem depender só de força de vontade.', minutes: 15, status: 'salvo', tags: ['habitos', 'foco'], createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    { id: 'md-2', kind: 'youtube', url: 'https://youtu.be/dark-mode-with-life', title: 'Dark mode com vida — design systems na prática (Tailwind)', sourceLabel: 'YouTube · @devconf', summary: 'Camadas de superfície, sombras internas e glows ambiente: como montar um tema escuro sem preto chapado e com profundidade real na UI.', minutes: 24, status: 'consumido', tags: ['design', 'frontend'], createdAt: new Date(Date.now() - 9 * 86_400_000).toISOString() },
    { id: 'md-3', kind: 'instagram', url: 'https://instagram.com/reel/fit-recipe-10min', title: 'Receita fit de 10 minutos (rolê rápido)', sourceLabel: 'Instagram · @receitasfit', summary: 'Ovos, aveia e banana em reels: 320 kcal e 18 g de proteína — boa opção para o treino matinal.', minutes: 8, status: 'salvo', tags: ['saude', 'comida'], createdAt: new Date(Date.now() - 86_400_000).toISOString() },
    { id: 'md-4', kind: 'instagram', url: 'https://instagram.com/p/floripa-checklist', title: 'Checklist de viagem — Florianópolis', sourceLabel: 'Instagram · @viajandolite', summary: 'O que levar e os 3 pontos que valem a pena na temporada: Lagoinha, Jurerê e o centro histórico.', minutes: 6, status: 'consumido', tags: ['viagem'], createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString() },
  ] satisfies MediaItem[],

  assets: [
    { id: 'ast-1', name: 'Chevrolet Onix 2021', category: 'carro', lifePct: 62, nextMaintenance: day(6), lastMaintenance: day(-160) },
    { id: 'ast-2', name: 'Apartamento — 3 quartos', category: 'casa', lifePct: 88, nextMaintenance: day(14), lastMaintenance: day(-90) },
    { id: 'ast-3', name: 'Filtro de água gelada', category: 'casa', lifePct: 18, nextMaintenance: day(2), lastMaintenance: day(-88) },
  ] satisfies Asset[],

  maintenance: [
    { id: 'mnt-1', assetId: 'ast-1', title: 'Troca de óleo + filtros', cost: 420, date: day(-160), odometerKm: 48_500 },
    { id: 'mnt-2', assetId: 'ast-1', title: 'Alinhamento e balanceamento', cost: 180, date: day(-98), odometerKm: 52_100 },
    { id: 'mnt-3', assetId: 'ast-2', title: 'Manutenção do ar-condicionado', cost: 890, date: day(-90) },
    { id: 'mnt-4', assetId: 'ast-3', title: 'Troca do filtro de água', cost: 95, date: day(-88) },
  ] satisfies MaintenanceRecord[],

  pantry: [
    { id: 'pan-1', name: 'Arroz integral 5kg', category: 'grãos', qty: 3.2, unit: 'kg', lowThreshold: 1, price: 28.5 },
    { id: 'pan-2', name: 'Feijão preto 1kg', category: 'grãos', qty: 0.4, unit: 'kg', lowThreshold: 1, expiresAt: day(40), price: 8.9 },
    { id: 'pan-3', name: 'Leite desnatado', category: 'laticínios', qty: 2, unit: 'L', lowThreshold: 3, expiresAt: day(6), price: 5.4 },
    { id: 'pan-4', name: 'Ovos', category: 'proteínas', qty: 4, unit: 'dúzia', lowThreshold: 2, price: 14.0 },
    { id: 'pan-5', name: 'Azeite extra virgem', category: 'condimentos', qty: 0.5, unit: 'L', lowThreshold: 0.75, price: 39.9 },
    { id: 'pan-6', name: 'Café torrado 1kg', category: 'bebidas', qty: 0.2, unit: 'kg', lowThreshold: 0.75, expiresAt: day(30), price: 34.0 },
  ] satisfies PantryItem[],

  trips: [
    {
      id: 'trp-1',
      destination: 'Florianópolis — SC',
      startDate: day(5),
      endDate: day(10),
      status: 'confirmado',
      stops: [
        { id: 'st-p-1', day: 1, time: '11:45', title: 'Voo GRU → Floripa + check-in pousada', note: 'Voo direto (1h20).' },
        { id: 'st-p-2', day: 2, time: '09:00', title: 'Praia da Joaquina' },
        { id: 'st-p-3', day: 2, time: '17:00', title: 'Mirante do Morro da Lagoa' },
        { id: 'st-p-4', day: 3, title: 'Trilha da Lagoinha do Leste', note: 'Trilha 1h30 — levar água.' },
        { id: 'st-p-5', day: 4, time: '10:00', title: 'Passeio de barco — Lagoa da Conceição' },
        { id: 'st-p-6', day: 5, title: 'Jurerê Internacional + almoço no centrinho' },
        { id: 'st-p-7', day: 6, title: 'Centro histórico', note: 'Catedral e Mercado Público pela manhã.' },
      ],
    },
    {
      id: 'trp-2',
      destination: 'Monte Verde — MG',
      startDate: day(28),
      endDate: day(31),
      status: 'planejado',
      stops: [
        { id: 'st-mv-1', day: 1, time: '14:00', title: 'Chegada em Monte Verde', note: 'Clima frio — casaco leve.' },
        { id: 'st-mv-2', day: 2, time: '08:00', title: 'Trilha do Pico do Selado', note: 'Vista 360° no topo.' },
        { id: 'st-mv-3', day: 3, time: '09:30', title: 'Pedra Redonda' },
        { id: 'st-mv-4', day: 4, time: '11:00', title: 'Chocolate artesanal + volta' },
      ],
    },
    {
      id: 'trp-3',
      destination: 'Bonito — MS',
      startDate: day(120),
      endDate: day(127),
      status: 'planejado',
      stops: [],
    },
  ] satisfies Trip[],

  places: [
    { id: 'plc-1', name: 'Jericoacoara', where: 'Ceará', visited: false },
    { id: 'plc-2', name: 'Chapada dos Veadeiros', where: 'Goiás', visited: false, note: 'Cachoeiras — melhor na seca.' },
    { id: 'plc-3', name: 'Fernando de Noronha', where: 'Pernambuco', visited: false, note: 'Projeto Tamar — janela de tartarugas.' },
    { id: 'plc-4', name: 'Ilha do Cardoso', where: 'Cananéia — SP', visited: true, note: 'Mergulho e trilha da restinga.' },
    { id: 'plc-5', name: 'São Thomé das Letras', where: 'MG', visited: true },
  ] satisfies Place[],

  spending: Array.from({ length: 8 }, (_, i) => ({
    week: monday(7 - i),
    despensa: 320 + (i % 4) * 45 + i * 11,
    manutencao: i === 2 ? 612 : i === 6 ? 1240 : 0,
    viagens: i === 6 ? 1980 : i === 3 ? 640 : 0,
  })) satisfies WeeklySpending[],

  spendingEntries: [
    { id: 'sp-1', amount: 48.5, category: 'Alimentação', note: 'Almoço executivo', date: day(0), time: '12:35' },
    { id: 'sp-2', amount: 150.0, category: 'Transporte', note: 'Abastecimento gasolina', date: day(-1), time: '08:40' },
    { id: 'sp-3', amount: 84.9, category: 'Saúde', note: 'Farmácia - vitaminas', date: day(-2), time: '18:15' },
    { id: 'sp-4', amount: 215.0, category: 'Despensa', note: 'Supermercado semanal', date: day(-3), time: '19:20' },
    { id: 'sp-5', amount: 35.0, category: 'Lazer', note: 'Cinema + café', date: day(-5), time: '21:00' },
  ],

  fixedBills: [
    { id: 'bill-1', name: 'Internet Fibra 500MB', amount: 119.9, dueDay: 10, category: 'Serviços', paidMonths: [month(0)] },
    { id: 'bill-2', name: 'Energia Elétrica (Enel)', amount: 185.4, dueDay: 15, category: 'Moradia', paidMonths: [month(0)] },
    { id: 'bill-3', name: 'Fatura Cartão de Crédito', amount: 1420.0, dueDay: 22, category: 'Financeiro', paidMonths: [] },
    { id: 'bill-4', name: 'Streaming & Assinaturas', amount: 55.9, dueDay: 28, category: 'Lazer', paidMonths: [] },
  ],

  habits: [
    { id: 'hb-1', title: 'Tomar 2L de água', icon: '💧', completedDates: [day(0)], order: 1 },
    { id: 'hb-2', title: 'Treino / Exercício físico 30 min', icon: '🏃', completedDates: [day(0)], order: 2 },
    { id: 'hb-3', title: 'Leitura de 15 páginas', icon: '📖', completedDates: [], order: 3 },
    { id: 'hb-4', title: 'Revisar agenda e prioridades', icon: '🎯', completedDates: [day(0)], order: 4 },
  ],

  docVault: [
    { id: 'doc-1', title: 'Renavam do Carro', category: 'veiculo', value: '00123456789', extra: 'Placa: ABC-1234 · Honda Civic', updatedAt: day(-10) },
    { id: 'doc-2', title: 'Medidas Colchão Casal', category: 'casa', value: '1,38m x 1,88m', extra: 'Para compra de lençol e protetor', updatedAt: day(-20) },
    { id: 'doc-3', title: 'Filtro Ar Condicionado Sala', category: 'casa', value: 'Split 12.000 BTUs', extra: 'Modelo filtro: HEPA 30x20', updatedAt: day(-15) },
    { id: 'doc-4', title: 'Cartão Nacional de Saúde (SUS)', category: 'saude', value: '7000 1234 5678 9012', extra: 'Titular', updatedAt: day(-30) },
  ],

  maintMonths: Array.from({ length: 6 }, (_, i) => ({
    month: month(5 - i),
    count: [2, 1, 3, 2, 4, 2][i],
  })) satisfies MaintMonth[],
}