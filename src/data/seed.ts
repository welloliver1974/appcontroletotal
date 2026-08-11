import type {
  AgendaEvent,
  Asset,
  Fact,
  InboxEmail,
  LifeLogEntry,
  MaintenanceRecord,
  MaintMonth,
  PantryItem,
  ReadingEntry,
  StudySession,
  Trip,
  VocabWeek,
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
export const SEED_VERSION = 2

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
    { id: 'eml-4', from: 'Newsletter · Inglês Diário', subject: '5 phrasal verbs essenciais para viagens', preview: 'Practising English while travelling: check in, set off, get by…', importance: 'normal', sentAt: new Date(Date.now() - 26 * 3_600_000).toISOString(), tags: ['ingles'], read: true },
  ] satisfies InboxEmail[],

  lifeLog: [
    { id: 'log-1', title: 'Primeiro dia com o Life OS Hub', body: 'Configurei o Hermes Bridge, os ativos da casa e o plano de inglês B1. Motivação renovada para organizar a vida financeira.', tags: ['setup', 'produtividade'], mood: 5, createdAt: new Date(Date.now() - 86_400_000).toISOString() },
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
    { id: 'pan-1', name: 'Arroz integral 5kg', category: 'grãos', qty: 3.2, unit: 'kg', lowThreshold: 1 },
    { id: 'pan-2', name: 'Feijão preto 1kg', category: 'grãos', qty: 0.4, unit: 'kg', lowThreshold: 1, expiresAt: day(40) },
    { id: 'pan-3', name: 'Leite desnatado', category: 'laticínios', qty: 2, unit: 'L', lowThreshold: 3, expiresAt: day(6) },
    { id: 'pan-4', name: 'Ovos', category: 'proteínas', qty: 4, unit: 'dúzia', lowThreshold: 2 },
    { id: 'pan-5', name: 'Azeite extra virgem', category: 'condimentos', qty: 0.5, unit: 'L', lowThreshold: 0.75 },
    { id: 'pan-6', name: 'Café torrado 1kg', category: 'bebidas', qty: 0.2, unit: 'kg', lowThreshold: 0.75, expiresAt: day(30) },
  ] satisfies PantryItem[],

  trips: [
    { id: 'trp-1', destination: 'Florianópolis — SC', startDate: day(5), endDate: day(10), status: 'confirmado' },
    { id: 'trp-2', destination: 'Monte Verde — MG', startDate: day(28), endDate: day(31), status: 'planejado' },
    { id: 'trp-3', destination: 'Bonito — MS', startDate: day(120), endDate: day(127), status: 'planejado' },
  ] satisfies Trip[],

  study: [
    { id: 'std-1', date: day(-6), minutes: 35, area: 'ingles-srs', wordsLearned: 12 },
    { id: 'std-2', date: day(-4), minutes: 50, area: 'one-english', wordsLearned: 20 },
    { id: 'std-3', date: day(-2), minutes: 30, area: 'ingles-quiz', wordsLearned: 0 },
    { id: 'std-4', date: day(-1), minutes: 45, area: 'ingles-srs', wordsLearned: 15 },
  ] satisfies StudySession[],

  spending: Array.from({ length: 8 }, (_, i) => ({
    week: monday(7 - i),
    despensa: 320 + (i % 4) * 45 + i * 11,
    manutencao: i === 2 ? 612 : i === 6 ? 1240 : 0,
    viagens: i === 6 ? 1980 : i === 3 ? 640 : 0,
  })) satisfies WeeklySpending[],

  vocab: Array.from({ length: 8 }, (_, i) => ({
    week: monday(7 - i),
    words: 8 + (i % 3) * 5 + i * 2,
  })) satisfies VocabWeek[],

  maintMonths: Array.from({ length: 6 }, (_, i) => ({
    month: month(5 - i),
    count: [2, 1, 3, 2, 4, 2][i],
  })) satisfies MaintMonth[],
}