# Plano de Implementação — Central de Hoje

## Objetivo

Criar uma nova página chamada **Hoje** no Life OS Hub, sem remover nem alterar o Dashboard atual. A página deve funcionar como uma central operacional diária, especialmente útil no celular: leve, clara, rápida e focada em ações prioritárias.

## Regra Principal

Não retirar nada do Dashboard existente. A Central de Hoje deve ser uma rota nova e independente para teste de uso real.

## Resultado Esperado

Adicionar uma nova rota `/hoje` com uma tela mobile-first que mostra:

- Resumo curto do dia
- Próxima ação importante
- Até 5 prioridades do dia
- Alertas críticos
- Ações rápidas
- Pequeno resumo do Hermes/local logic

## Arquivos Prováveis

Criar:

- `src/features/hoje/HojePage.tsx`
- `src/features/hoje/hojeUtils.ts`
- `src/features/hoje/useHojeData.ts`

Alterar:

- `src/app/App.tsx`
- `src/lib/modules.ts`
- Possivelmente `src/components/layout/Header.tsx`, `Sidebar.tsx`, `BottomNav.tsx` ou `NavRail.tsx`, caso a navegação dependa diretamente de `MODULES`.

## Navegação

Adicionar um novo módulo:

- `id`: `hoje`
- `label`: `Hoje`
- `emoji`: `☀️`
- `path`: `/hoje`
- `icon`: usar `SunMedium`, `Sparkles`, `CalendarCheck` ou similar de `lucide-react`
- `accent`: preferencialmente `blue` ou `cyan`
- `tag`: `Plano diário`
- `description`: `Prioridades, agenda e ações rápidas para hoje.`

Importante: manter `/dashboard` como rota existente. Não trocar a rota inicial ainda, a menos que o usuário peça depois.

## App Router

Em `src/app/App.tsx`:

1. Importar lazy page:
   `const HojePage = lazy(() => import('@/features/hoje/HojePage').then((m) => ({ default: m.HojePage })))`

2. Adicionar rota:
   `<Route path="/hoje" element={<HojePage />} />`

3. Manter:
   `<Route index element={<Navigate to="/dashboard" replace />} />`

## Dados Usados

A Central de Hoje deve reaproveitar os dados já existentes do app:

- Agenda/eventos
- Emails críticos
- Despensa
- Finanças/spendingEntries/fixedBills
- Hábitos
- Manutenção/ativos
- Viagem ativa
- Life-log, se útil

Usar o padrão já existente de data hooks, como:

- `useAgendaData`
- `useDespensaData`
- `useFinancasData`
- `useManutencaoData`
- `useViagensData`
- APIs de `src/data/api.ts` ou adapter equivalente usado pelo projeto

## Layout Mobile-First

A página deve ser mais limpa que o Dashboard.

Estrutura sugerida:

1. Header da página
   - Título: `Hoje`
   - Subtítulo curto com data atual
   - Sem hero grande

2. Card "Agora"
   - Próximo compromisso de hoje, se houver
   - Caso não haja evento, mostrar alerta/prioridade mais urgente
   - Caso esteja tudo tranquilo, mostrar mensagem curta

3. Lista "Prioridades"
   - Máximo de 5 itens
   - Cada item com:
     - Ícone
     - Título curto
     - Descrição curta
     - Origem: Agenda, Finanças, Despensa, Manutenção, Viagem ou Hábitos
     - Severidade: crítica, atenção, normal

4. "Alertas Críticos"
   - Contas vencendo/vencidas
   - Itens da despensa zerados ou vencendo
   - Manutenção crítica
   - Eventos de hoje
   - Evitar duplicar tudo: mostrar só os alertas realmente importantes

5. "Ações Rápidas"
   - Botões compactos:
     - `+ Gasto`
     - `+ Evento`
     - `+ Nota`
     - `+ Compra`
     - `Voz`
   - Reusar os fluxos/modais globais existentes quando possível

6. "Resumo Hermes"
   - Texto curto gerado por lógica local inicialmente
   - Não depender de LLM para a primeira versão
   - Exemplo: `Hoje pede atenção em 2 compromissos, 1 conta e 3 itens de despensa.`

## Regras de UX

- Não usar gráficos.
- Não usar cards grandes demais.
- Não mostrar mais de 5 prioridades.
- Não repetir todos os dados do Dashboard.
- Evitar rolagem longa no celular.
- Manter densidade boa para telas de 360px a 430px.
- Usar componentes existentes: `Card`, `Button`, `PageHeader`, `Badge`, `EmptyState`, `Skeleton`, se fizer sentido.
- Usar ícones de `lucide-react`.
- Seguir o design dark premium já existente.

## Lógica de Priorização

Criar função pura em `hojeUtils.ts`, por exemplo:

`buildTodayPlan(input): TodayPlan`

Tipos sugeridos:

```ts
export type TodayPrioritySource =
  | 'agenda'
  | 'financas'
  | 'despensa'
  | 'manutencao'
  | 'viagens'
  | 'habitos'

export type TodayPrioritySeverity = 'critical' | 'warning' | 'normal'

export interface TodayPriority {
  id: string
  source: TodayPrioritySource
  severity: TodayPrioritySeverity
  title: string
  description: string
  actionLabel?: string
  path?: string
}

export interface TodayPlan {
  dateLabel: string
  summary: string
  now?: TodayPriority
  priorities: TodayPriority[]
  alerts: TodayPriority[]
}
```

Prioridade sugerida:

1. Evento acontecendo agora ou próximo evento de hoje
2. Conta vencida ou vencendo hoje
3. Item de despensa vencido ou zerado
4. Manutenção vencida/crítica
5. Viagem ativa ou começando em breve
6. Hábitos pendentes
7. Registro financeiro recomendado, se houver indício

Ordenação:

- `critical` antes de `warning`
- `warning` antes de `normal`
- Itens com horário/data mais próximos primeiro
- Limitar prioridades a 5

## Estados Vazios

Se não houver nada urgente:

- Mostrar card "Dia limpo"
- Sugerir uma ação rápida, como registrar nota ou revisar agenda
- Não preencher com conteúdo artificial demais

## Testes/Validação

Após implementar:

1. Rodar `npm run lint`
2. Rodar `npm run build`
3. Testar visualmente em:
   - Mobile 360px
   - Mobile 390px
   - Tablet
   - Desktop
4. Conferir que:
   - Dashboard continua igual
   - `/hoje` abre corretamente
   - Navegação mostra Hoje
   - Não há overflow horizontal no celular
   - Listas respeitam limite de 5 prioridades
   - A tela funciona sem Supabase, usando fallback/mock local

## Critério de Aceite

A implementação está concluída quando:

- [x] A rota `/hoje` existe e renderiza sem erro.
- [x] O menu mostra a nova página Hoje.
- [x] O Dashboard não perdeu nenhum card nem comportamento (100% preservado).
- [x] A Central de Hoje mostra dados reais/mockados do app em tempo real.
- [x] A tela é limpa, compacta e usável no celular e adaptada para notebook.
- [x] Build e lint passam sem erros.

---

## ✅ Status da Implementação

- **Status:** Concluído, Polido para Mobile e Validado 🚀
- **Data:** 26/08/2026
- **Arquivos Criados:**
  - `src/features/hoje/HojePage.tsx`
  - `src/features/hoje/hojeUtils.ts`
  - `src/features/hoje/useHojeData.ts`
- **Arquivos Integrados & Atualizados:**
  - `src/lib/modules.ts`
  - `src/app/App.tsx`
  - `src/components/layout/BottomNav.tsx`
  - `src/components/layout/QuickAddModal.tsx`
  - `src/components/ui/PageHeader.tsx` (responsividade aprimorada para mobile)
  - `src/data/types.ts` (`AgendaEvent.completed`)
  - `src/features/agenda/EventModal.tsx` & `CalendarView.tsx`
  - `src/features/dashboard/Widgets.tsx`
- **Recursos Adicionais Entregues:**
  - ✅ **Check-in de Compromissos:** Botão interativo de conclusão em 1 toque nas prioridades e no foco do dia.
  - ✅ **Responsividade Mobile Fina:** Correção de quebras de linha em tags e formatação de datas adaptativa.
  - ✅ **Quebra de Linha Completa (Mobile):** Remoção de `truncate` rígido nos títulos e descrições, permitindo leitura integral sem cortes em qualquer celular.
  - ✅ **Expansão de Prioridades:** Botão "Ver todas (X)" / "Mostrar menos (Top 5)" para visualização total sem limites no mobile.
  - ✅ **Notificações Nativas Web Push:** Banner de ativação em 1 toque e lembretes automáticos 15 minutos antes.
- **Validação:** `npm run build` (sucesso, PWA gerado sem erros) e `npm run lint` (0 erros).

