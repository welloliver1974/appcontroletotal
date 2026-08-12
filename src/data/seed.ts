import type {
  AgendaEvent,
  Asset,
  Course,
  Fact,
  InboxEmail,
  LifeLogEntry,
  MaintenanceRecord,
  MaintMonth,
  MediaItem,
  PantryItem,
  Place,
  QuizQuestion,
  ReadingEntry,
  RoleplaySession,
  SRSFlashcard,
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
export const SEED_VERSION = 5

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
    { id: 'pan-1', name: 'Arroz integral 5kg', category: 'grãos', qty: 3.2, unit: 'kg', lowThreshold: 1 },
    { id: 'pan-2', name: 'Feijão preto 1kg', category: 'grãos', qty: 0.4, unit: 'kg', lowThreshold: 1, expiresAt: day(40) },
    { id: 'pan-3', name: 'Leite desnatado', category: 'laticínios', qty: 2, unit: 'L', lowThreshold: 3, expiresAt: day(6) },
    { id: 'pan-4', name: 'Ovos', category: 'proteínas', qty: 4, unit: 'dúzia', lowThreshold: 2 },
    { id: 'pan-5', name: 'Azeite extra virgem', category: 'condimentos', qty: 0.5, unit: 'L', lowThreshold: 0.75 },
    { id: 'pan-6', name: 'Café torrado 1kg', category: 'bebidas', qty: 0.2, unit: 'kg', lowThreshold: 0.75, expiresAt: day(30) },
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

  courses: [
    {
      id: 'course-1',
      title: 'Inglês B1 — Curso Completo',
      level: 'B1',
      description: 'Curso estruturado para alcançar nível B1 (intermediário) do CEFR. Gramática, vocabulário, listening, reading e speaking.',
      order: 1,
      lessons: [
        {
          id: 'les-1',
          courseId: 'course-1',
          title: 'Present Perfect vs Past Simple',
          area: 'grammar',
          order: 1,
          content: `# Present Perfect vs Past Simple

## Quando usar cada um?

### Present Perfect
Usamos para ações que **começaram no passado e continuam no presente** ou têm **relevância no momento atual**.

> **Formação:** have/has + particípio passado

**Exemplos:**
- I **have lived** here for 5 years. (moro aqui há 5 anos e continuo morando)
- She **has finished** her homework. (ela terminou a lição - resultado presente)
- We **have never been** to Japan. (experiência de vida até agora)

### Past Simple
Usamos para ações **completadas em tempo definido no passado**.

> **Formação:** verbo + -ed (regulares) / forma irregular

**Exemplos:**
- I **lived** in London in 2010. (tempo definido: 2010)
- She **finished** her homework **yesterday**. (tempo definido: ontem)
- They **visited** Paris **last year**.

---

## Palavras-chave

| Present Perfect | Past Simple |
|----------------|-------------|
| already, yet, just | yesterday, last week, ago |
| ever, never | in 2020, on Monday |
| for, since | when I was young |

---

## Prática rápida

Complete com a forma correta:

1. I \_\_\_\_\_\_ (see) that movie yesterday.
2. She \_\_\_\_\_\_ (not/finish) her coffee yet.
3. We \_\_\_\_\_\_ (know) each other for ten years.
4. They \_\_\_\_\_\_ (arrive) two hours ago.

> **Respostas:** 1. saw 2. hasn't finished 3. have known 4. arrived`,
          vocabulary: [
            { id: 'voc-1', word: 'already', translation: 'já', example: 'I have already eaten.', tags: ['grammar'] },
            { id: 'voc-2', word: 'yet', translation: 'ainda (negativo)', example: 'Have you finished yet?', tags: ['grammar'] },
            { id: 'voc-3', word: 'just', translation: 'acabou de', example: 'She has just arrived.', tags: ['grammar'] },
            { id: 'voc-4', word: 'since', translation: 'desde (ponto no tempo)', example: 'I have lived here since 2020.', tags: ['grammar'] },
            { id: 'voc-5', word: 'for', translation: 'há/por (período)', example: 'We have studied for two hours.', tags: ['grammar'] },
          ],
          estimatedMinutes: 25,
          completed: false,
        },
        {
          id: 'les-2',
          courseId: 'course-1',
          title: 'Future Forms: Will vs Going to vs Present Continuous',
          area: 'grammar',
          order: 2,
          content: `# Future Forms

Existem três formas principais de falar do futuro em inglês:

## 1. Will (Decisão espontânea / Previsão)
- **Decisão no momento da fala:** "I'll help you with that."
- **Previsão baseada em opinião:** "It will rain tomorrow."

## 2. Going to (Plano / Evidência presente)
- **Plano decidido antes:** "I'm going to study English tonight."
- **Evidência visível:** "Look at those clouds! It's going to rain."

## 3. Present Continuous (Arranjo fixo / Agendamento)
- **Compromisso agendado:** "I'm meeting John at 7pm."
- **Viagem marcada:** "We're flying to London next Friday."

---

## Comparação rápida

| Situação | Forma |
|----------|-------|
| "Vou viajar nas férias" (já comprei passagem) | I'm travelling / I'm going to travel |
| "Acho que vai chover" (palpite) | It will rain |
| "Olha essas nuvens!" (evidência) | It's going to rain |
| "Te ligo depois" (decisão agora) | I'll call you later |

---

## Exercício

Escolha a melhor opção:

1. A: "The phone's ringing!" B: "I \_\_\_\_\_\_ (get) it."
2. "We \_\_\_\_\_\_ (visit) our grandparents next weekend. We booked the tickets."
3. "Watch out! You \_\_\_\_\_\_ (fall)!"

> **Respostas:** 1. 'll get (decisão espontânea) 2. 're visiting / 're going to visit (plano agendado) 3. 're going to fall (evidência)`,
          vocabulary: [
            { id: 'voc-6', word: 'spontaneous', translation: 'espontâneo', example: 'It was a spontaneous decision.', tags: ['grammar'] },
            { id: 'voc-7', word: 'arrangement', translation: 'arranjo/compromisso', example: 'We have an arrangement to meet at 5.', tags: ['grammar'] },
            { id: 'voc-8', word: 'evidence', translation: 'evidência', example: 'There is no evidence of fraud.', tags: ['grammar'] },
            { id: 'voc-9', word: 'prediction', translation: 'previsão', example: 'My prediction is that prices will rise.', tags: ['grammar'] },
            { id: 'voc-10', word: 'booked', translation: 'reservado', example: 'The tickets are already booked.', tags: ['grammar'] },
          ],
          estimatedMinutes: 30,
          completed: false,
        },
        {
          id: 'les-3',
          courseId: 'course-1',
          title: 'Travel Vocabulary: Airport & Flight',
          area: 'vocabulary',
          order: 3,
          content: `# Travel Vocabulary — Airport & Flight

## No aeroporto (At the airport)

| Inglês | Português | Exemplo |
|--------|-----------|---------|
| check-in | check-in / balcão | Where is the check-in desk? |
| boarding pass | cartão de embarque | Please show your boarding pass. |
| gate | portão de embarque | Gate 12 is on the left. |
| departure lounge | sala de embarque | We waited in the departure lounge. |
| baggage drop | despacho de bagagem | Baggage drop closes in 20 minutes. |
| carry-on | bagagem de mão | My carry-on fits in the overhead bin. |
| checked luggage | bagagem despachada | My checked luggage is 20 kg. |
| security check | controle de segurança | The security check takes 15 minutes. |
| customs | alfândega | Customs officers may inspect your bags. |
| arrivals / departures | chegadas / partidas | Check the departures board. |

## No avião (On the plane)

| Inglês | Português |
|--------|-----------|
| aisle seat | assento no corredor |
| window seat | assento na janela |
| overhead bin | compartimento superior |
| seat belt | cinto de segurança |
| life vest | colete salva-vidas |
| turbulence | turbulência |
| fasten seat belt | apertar o cinto |
| tray table | mesinha |
| call button | botão de chamada |

## Frases úteis

- **Where is my gate?** (Onde fica meu portão?)
- **Is this flight on time?** (Este voo está no horário?)
- **Can I have a window seat, please?** (Posso ter assento na janela, por favor?)
- **My luggage is lost.** (Minha bagagem foi perdida.)
- **I have a connecting flight.** (Tenho uma conexão.)`,
          vocabulary: [
            { id: 'voc-11', word: 'boarding pass', translation: 'cartão de embarque', example: 'Show your boarding pass at the gate.', tags: ['travel'] },
            { id: 'voc-12', word: 'carry-on', translation: 'bagagem de mão', example: 'My carry-on is lightweight.', tags: ['travel'] },
            { id: 'voc-13', word: 'checked luggage', translation: 'bagagem despachada', example: 'I have two pieces of checked luggage.', tags: ['travel'] },
            { id: 'voc-14', word: 'turbulence', translation: 'turbulência', example: 'Expect some turbulence during the flight.', tags: ['travel'] },
            { id: 'voc-15', word: 'connecting flight', translation: 'voo de conexão', example: 'My connecting flight is in two hours.', tags: ['travel'] },
            { id: 'voc-16', word: 'overhead bin', translation: 'compartimento superior', example: 'Put your bag in the overhead bin.', tags: ['travel'] },
            { id: 'voc-17', word: 'aisle seat', translation: 'assento no corredor', example: 'I prefer an aisle seat.', tags: ['travel'] },
            { id: 'voc-18', word: 'departure lounge', translation: 'sala de embarque', example: 'We met in the departure lounge.', tags: ['travel'] },
          ],
          estimatedMinutes: 20,
          completed: false,
        },
        {
          id: 'les-4',
          courseId: 'course-1',
          title: 'Job Interview Preparation',
          area: 'speaking',
          order: 4,
          content: `# Job Interview Preparation

## Perguntas clássicas e como responder

### 1. "Tell me about yourself."
**Estrutura:** Presente → Passado → Futuro
> "I'm a software developer with 5 years of experience in React and Node.js. In my last role, I led a team of 4 and reduced deployment time by 40%. I'm looking for a position where I can contribute to scalable products."

### 2. "What are your strengths?"
**Escolha 2-3 relevantes para a vaga. Use exemplos.**
> "My main strengths are problem-solving and communication. For example, last year I identified a bottleneck in our CI/CD pipeline and proposed a solution that cut build times in half."

### 3. "What is your weakness?"
**Seja honesto mas mostre melhoria.**
> "I used to struggle with delegation, but I've been using project management tools to track tasks and trust my team more."

### 4. "Why do you want to work here?"
**Pesquise a empresa. Conecte seus valores.**
> "I admire your focus on sustainable technology. Your recent project on renewable energy aligns with my values."

### 5. "Where do you see yourself in 5 years?"
**Mostre ambição realista.**
> "I'd like to grow into a tech lead role, mentoring junior developers while still coding."

---

## Vocabulário de entrevista

| Termo | Significado |
|-------|-------------|
| background | formação/experiência |
| skillset | conjunto de habilidades |
| fast-paced | ritmo acelerado |
| stakeholder | parte interessada |
| deliverable | entrega/resultado |
| onboarding | integração |
| KPI | indicador-chave de desempenho |

---

## Dicas de pronúncia

- **Develop** /dɪˈveləp/ (não "deve-lop")
- **Project** (substantivo) /ˈprɒdʒekt/ | (verbo) /prəˈdʒekt/
- **Experience** /ɪkˈspɪəriəns/
- **Achievement** /əˈtʃiːvmənt/`,
          vocabulary: [
            { id: 'voc-19', word: 'skillset', translation: 'conjunto de habilidades', example: 'Your skillset matches our needs.', tags: ['career'] },
            { id: 'voc-20', word: 'fast-paced', translation: 'ritmo acelerado', example: 'We work in a fast-paced environment.', tags: ['career'] },
            { id: 'voc-21', word: 'stakeholder', translation: 'parte interessada', example: 'We need approval from all stakeholders.', tags: ['career'] },
            { id: 'voc-22', word: 'deliverable', translation: 'entrega/resultado', example: 'The deliverable is due Friday.', tags: ['career'] },
            { id: 'voc-23', word: 'onboarding', translation: 'integração', example: 'The onboarding process takes two weeks.', tags: ['career'] },
            { id: 'voc-24', word: 'background', translation: 'formação/experiência', example: 'What is your background in marketing?', tags: ['career'] },
          ],
          estimatedMinutes: 35,
          completed: false,
        },
        {
          id: 'les-5',
          courseId: 'course-1',
          title: 'Listening: Podcast About Remote Work',
          area: 'listening',
          order: 5,
          content: `# Listening Practice: Remote Work

## Instruções
Ouça o áudio (simulado abaixo) e responda às perguntas. No app real, haveria um player de áudio.

---

## Transcrição do áudio (para estudo)

> "Welcome to WorkLife podcast. Today we're talking about the future of remote work. Since 2020, the way we work has changed dramatically. Many companies adopted hybrid models — three days in the office, two at home. But some, like GitLab and Automattic, remain fully remote.
>
> The benefits are clear: no commute, better work-life balance, access to global talent. But challenges exist too. Communication can be harder. Building culture takes effort. Time zones complicate meetings.
>
> The key is intentionality. Successful remote teams over-communicate. They document everything. They use async tools like Notion, Loom, and Slack effectively. And they meet in person once or twice a year for team building.
>
> What about you? Do you prefer remote, hybrid, or office?"

---

## Perguntas de compreensão

1. **Quais empresas são citadas como totalmente remotas?**
   - GitLab e Automattic

2. **Quais são os 3 benefícios mencionados?**
   - No commute, better work-life balance, access to global talent

3. **Quais são os 3 desafios?**
   - Communication harder, building culture takes effort, time zones complicate meetings

4. **Qual a chave para equipes remotas bem-sucedidas?**
   - Intentionality (intencionalidade) — over-communicate, document everything, use async tools

5. **Com que frequência se encontram pessoalmente?**
   - Once or twice a year (uma ou duas vezes por ano)

---

## Vocabulário do áudio

| Palavra | Tradução | Contexto |
|---------|----------|----------|
| dramatically | drasticamente | changed dramatically |
| hybrid | híbrido | hybrid models |
| commute | deslocamento (trabalho-casa) | no commute |
| work-life balance | equilíbrio vida-trabalho | better work-life balance |
| global talent | talentos globais | access to global talent |
| intentionality | intencionalidade | The key is intentionality |
| over-communicate | super-comunicar | over-communicate |
| async | assíncrono | async tools`,
          vocabulary: [
            { id: 'voc-25', word: 'commute', translation: 'deslocamento (casa-trabalho)', example: 'My commute takes 40 minutes.', tags: ['work'] },
            { id: 'voc-26', word: 'work-life balance', translation: 'equilíbrio vida-trabalho', example: 'Remote work improves work-life balance.', tags: ['work'] },
            { id: 'voc-27', word: 'intentionality', translation: 'intencionalidade', example: 'Leadership requires intentionality.', tags: ['work'] },
            { id: 'voc-28', word: 'over-communicate', translation: 'comunicar em excesso (bom sentido)', example: 'Remote teams must over-communicate.', tags: ['work'] },
            { id: 'voc-29', word: 'async', translation: 'assíncrono', example: 'We use async communication.', tags: ['work'] },
            { id: 'voc-30', word: 'dramatically', translation: 'drasticamente', example: 'Sales dropped dramatically.', tags: ['general'] },
          ],
          estimatedMinutes: 25,
          completed: false,
        },
        {
          id: 'les-6',
          courseId: 'course-1',
          title: 'Reading: The Science of Habits',
          area: 'reading',
          order: 6,
          content: `# Reading: The Science of Habits

## Texto

**How Habits Shape Our Lives**

Research shows that about 40% of our daily actions are habits — automatic behaviors we perform without conscious thought. Understanding how habits work can help us build better ones and break unwanted ones.

### The Habit Loop

Every habit follows a three-step loop, discovered by MIT researchers:

1. **Cue (Gatilho)** — A trigger that tells your brain to start the behavior. It can be a time, location, emotion, or preceding action.
2. **Routine (Rotina)** — The behavior itself: what you do.
3. **Reward (Recompensa)** — The benefit you get, which reinforces the loop.

**Example:** You feel stressed (cue) → you check social media (routine) → you feel distracted/relieved (reward).

### Breaking Bad Habits

You cannot eliminate a habit — you can only replace the routine. Keep the same cue and reward, change the routine.

> **Cue:** Stress → **New Routine:** 5 deep breaths → **Reward:** Calm

### Building Good Habits

Use the **2-Minute Rule**: Make the new habit so easy it takes less than 2 minutes to start.
- Want to read more? → Read one page.
- Want to exercise? → Put on workout clothes.
- Want to meditate? → Sit for 1 minute.

### Environment Design

Make good habits obvious and bad habits invisible.
- Put a book on your pillow → you'll read before bed.
- Delete social media apps → harder to scroll mindlessly.

---

## Perguntas

1. **Que porcentagem de ações diárias são hábitos?**
   - About 40% (cerca de 40%)

2. **Quais são os 3 componentes do "Habit Loop"?**
   - Cue, Routine, Reward

3. **Como quebrar um mau hábito?**
   - Replace the routine, keep cue and reward

4. **O que é a "2-Minute Rule"?**
   - Make the habit take < 2 minutes to start

5. **Como o ambiente ajuda?**
   - Make good habits obvious, bad habits invisible

---

## Vocabulário do texto

| Palavra | Tradução |
|---------|----------|
| conscious | consciente |
| trigger | gatilho |
| reinforce | reforçar |
| eliminate | eliminar |
| replace | substituir |
| mindlessly | sem pensar / automaticamente`,
          vocabulary: [
            { id: 'voc-31', word: 'conscious', translation: 'consciente', example: 'Make a conscious effort to change.', tags: ['psychology'] },
            { id: 'voc-32', word: 'trigger', translation: 'gatilho', example: 'Stress is a trigger for bad habits.', tags: ['psychology'] },
            { id: 'voc-33', word: 'reinforce', translation: 'reforçar', example: 'Rewards reinforce behavior.', tags: ['psychology'] },
            { id: 'voc-34', word: 'eliminate', translation: 'eliminar', example: 'You cannot eliminate a habit completely.', tags: ['psychology'] },
            { id: 'voc-35', word: 'replace', translation: 'substituir', example: 'Replace the routine, not the cue.', tags: ['psychology'] },
            { id: 'voc-36', word: 'mindlessly', translation: 'sem pensar', example: 'Scrolling mindlessly wastes time.', tags: ['psychology'] },
          ],
          estimatedMinutes: 30,
          completed: false,
        },
      ],
      progress: 0,
      createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] satisfies Course[],

  quizQuestions: [
    {
      id: 'q-1',
      lessonId: 'les-1',
      type: 'multiple_choice',
      prompt: 'Choose the correct sentence:',
      options: [
        'I have seen that movie yesterday.',
        'I saw that movie yesterday.',
        'I have saw that movie yesterday.',
        'I see that movie yesterday.',
      ],
      correctAnswer: 'I saw that movie yesterday.',
      explanation: 'Use Past Simple (saw) with a specific past time marker like "yesterday". Present Perfect cannot be used with specific past time.',
    },
    {
      id: 'q-2',
      lessonId: 'les-1',
      type: 'fill_blank',
      prompt: 'Complete: She _______ (not/finish) her homework yet.',
      correctAnswer: ["hasn't finished", 'has not finished'],
      explanation: 'Present Perfect negative with "yet": has not finished / hasn\'t finished.',
    },
    {
      id: 'q-3',
      lessonId: 'les-1',
      type: 'multiple_choice',
      prompt: 'Which sentence uses "for" correctly with Present Perfect?',
      options: [
        'I have lived here for 2010.',
        'I have lived here for five years.',
        'I lived here for five years ago.',
        'I am living here for five years.',
      ],
      correctAnswer: 'I have lived here for five years.',
      explanation: '"For" is used with a duration (period of time). "Since" is used with a starting point.',
    },
    {
      id: 'q-4',
      lessonId: 'les-2',
      type: 'multiple_choice',
      prompt: 'A: "It\'s very hot in here." B: "I _______ open the window."',
      options: ['will', 'am going to', 'am opening', 'open'],
      correctAnswer: 'will',
      explanation: 'Spontaneous decision at the moment of speaking → "will".',
    },
    {
      id: 'q-5',
      lessonId: 'les-2',
      type: 'multiple_choice',
      prompt: 'We _______ (visit) our grandparents next weekend. We booked the tickets last month.',
      options: ['will visit', 'are visiting', 'visit', 'visited'],
      correctAnswer: 'are visiting',
      explanation: 'Fixed arrangement (tickets booked) → Present Continuous for future.',
    },
    {
      id: 'q-6',
      lessonId: 'les-3',
      type: 'translation',
      prompt: 'Translate to English: "Minha bagagem foi perdida."',
      correctAnswer: ['My luggage was lost.', 'My luggage has been lost.'],
      explanation: 'Passive voice. Both Past Simple and Present Perfect work here.',
    },
    {
      id: 'q-7',
      lessonId: 'les-3',
      type: 'multiple_choice',
      prompt: 'Where do you put your carry-on bag on the plane?',
      options: ['Under the seat', 'In the overhead bin', 'At baggage drop', 'At customs'],
      correctAnswer: 'In the overhead bin',
      explanation: 'Carry-on bags go in the overhead bin (compartimento superior).',
    },
    {
      id: 'q-8',
      lessonId: 'les-4',
      type: 'fill_blank',
      prompt: 'Complete: "My main _______ are problem-solving and communication."',
      correctAnswer: ['strengths'],
      explanation: '"Strengths" (pontos fortes) is the standard term for positive qualities in interviews.',
    },
    {
      id: 'q-9',
      lessonId: 'les-5',
      type: 'multiple_choice',
      prompt: 'According to the podcast, what is the key to successful remote teams?',
      options: ['Working longer hours', 'Intentionality', 'Having no meetings', 'Using only email'],
      correctAnswer: 'Intentionality',
      explanation: 'The podcast states: "The key is intentionality. Successful remote teams over-communicate."',
    },
    {
      id: 'q-10',
      lessonId: 'les-6',
      type: 'multiple_choice',
      prompt: 'What percentage of daily actions are habits, according to research?',
      options: ['10%', '25%', '40%', '60%'],
      correctAnswer: '40%',
      explanation: 'The text states: "Research shows that about 40% of our daily actions are habits."',
    },
  ] satisfies QuizQuestion[],

  srsFlashcards: [
    {
      id: 'srs-1',
      userId: 'user-1',
      vocabId: 'voc-1',
      word: 'already',
      translation: 'já',
      example: 'I have already eaten.',
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: new Date().toISOString().slice(0, 10),
      state: 0,
    },
    {
      id: 'srs-2',
      userId: 'user-1',
      vocabId: 'voc-2',
      word: 'yet',
      translation: 'ainda (negativo)',
      example: 'Have you finished yet?',
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: new Date().toISOString().slice(0, 10),
      state: 0,
    },
    {
      id: 'srs-3',
      userId: 'user-1',
      vocabId: 'voc-11',
      word: 'boarding pass',
      translation: 'cartão de embarque',
      example: 'Show your boarding pass at the gate.',
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: new Date().toISOString().slice(0, 10),
      state: 0,
    },
    {
      id: 'srs-4',
      userId: 'user-1',
      vocabId: 'voc-19',
      word: 'skillset',
      translation: 'conjunto de habilidades',
      example: 'Your skillset matches our needs.',
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: new Date().toISOString().slice(0, 10),
      state: 0,
    },
    {
      id: 'srs-5',
      userId: 'user-1',
      vocabId: 'voc-25',
      word: 'commute',
      translation: 'deslocamento (casa-trabalho)',
      example: 'My commute takes 40 minutes.',
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: new Date().toISOString().slice(0, 10),
      state: 0,
    },
  ] satisfies SRSFlashcard[],

  roleplaySessions: [
    {
      id: 'rp-1',
      scenario: 'Airport check-in',
      level: 'B1',
      messages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Hello! Welcome to SkyAir check-in. May I see your passport and booking reference, please?',
          timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
          meta: { tone: 'encouraging' },
        },
        {
          id: 'msg-2',
          role: 'user',
          content: 'Here is my passport. My booking reference is SKY789.',
          timestamp: new Date(Date.now() - 4 * 60_000).toISOString(),
        },
        {
          id: 'msg-3',
          role: 'assistant',
          content: 'Thank you. I see you\'re flying to London Heathrow, departing at 14:30. Would you like an aisle or window seat?',
          timestamp: new Date(Date.now() - 3 * 60_000).toISOString(),
          meta: { tone: 'neutral' },
        },
      ],
      startedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    },
    {
      id: 'rp-2',
      scenario: 'Job interview',
      level: 'B1',
      messages: [
        {
          id: 'msg-4',
          role: 'assistant',
          content: 'Good morning! Thanks for coming in. Let\'s start — tell me about yourself and your background.',
          timestamp: new Date(Date.now() - 10 * 60_000).toISOString(),
          meta: { tone: 'encouraging' },
        },
        {
          id: 'msg-5',
          role: 'user',
          content: 'I\'m a frontend developer with 4 years of experience in React and TypeScript. In my last role, I led the migration to a new design system.',
          timestamp: new Date(Date.now() - 9 * 60_000).toISOString(),
        },
        {
          id: 'msg-6',
          role: 'assistant',
          content: 'Great! That sounds like valuable experience. What would you say is your greatest professional achievement so far?',
          timestamp: new Date(Date.now() - 8 * 60_000).toISOString(),
          meta: { tone: 'neutral' },
        },
      ],
      startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
    },
  ] satisfies RoleplaySession[],
}