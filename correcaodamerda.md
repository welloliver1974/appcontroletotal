# Correção Definitiva: Duplicação de Eventos do Google Calendar

## Problema
O app Life OS estava duplicando todos os eventos da agenda (de ~1000 para ~2500) e travando ao navegar entre abas.

## Causa Raiz Identificada
Dois problemas combinados:

1. **Merge de dados no `db.ts`**: O código estava MESCLANDO os eventos da tabela `events` COM os da tabela `app_settings` (onde também eram salvos cópias dos eventos do Google Calendar). Isso criava duplicatas a cada carregamento.

2. **Sincronização automática**: O app tentava sincronizar com o Google Calendar automaticamente em cada página (`useHojeData.ts` e `AgendaPage.tsx`).

## Soluções Aplicadas

### 1. Removido o merge de eventos no `src/lib/db.ts`
```typescript
// ANTES (causava duplicatas):
const merged = [...userCloudEvents, ...(filtered as unknown as AgendaEvent[])]
const seen = new Set<string>()
const unique = merged.filter((e) => {
  if (!e.id || seen.has(e.id)) return false
  seen.add(e.id)
  return true
})
return enrichEventsWithCompletion(unique)

// DEPOIS (apenas usa a tabela events):
if (collection === 'events') {
  return enrichEventsWithCompletion(filtered as unknown as AgendaEvent[]) as unknown as T[]
}
```

### 2. Desativado auto-sync no código
- `src/features/hoje/useHojeData.ts`: Comentado bloco de auto-sync
- `src/features/agenda/AgendaPage.tsx`: Comentado bloco de auto-sync
- `src/lib/googleCalendarSync.ts`: Mudado default `autoSync: false`

### 3. Limpeza no Supabase
- Removidos todos os registros de `app_settings` que contêm eventos (`events_*`)
- Removidas 13 duplicatas exatas da tabela `events`
- Desativado `autoSync` para ambos os usuários no banco

## Estado Atual
- **Total de eventos**: 2523 únicos na tabela `events`
- **app_settings**: 0 registros de eventos
- **autoSync**: Desativado para ambos os usuários
- **Build**: ✅ TypeScript limpo, deploy automático do Vercel em andamento

## Como Usar Agora
O app funciona normalmente sem sincronização automática. Se quiser sincronizar manualmente:
1. Vá em Agenda → Configurações → Google Calendar
2. Cole seu URL iCal
3. Clique no botão "Google Calendar" (sincronização manual)
4. **NUNCA** ative "autoSync" nas configurações

## Commits
- `85ea8e8` - Remove lógica de merge que causava duplicatas
- `5fd8285` - Desativa auto-sync no código
- `70a7aff` - Corrige erros de TypeScript dos comentários
- `6e86279` - Desativa autoSync como padrão no código

## Deploy
O Vercel está fazendo deploy automático das mudanças. Aguarde 2-3 minutos para o build completar.
