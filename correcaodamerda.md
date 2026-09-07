# Relatório de Correção: Travamento ao Sincronizar Google Calendar

## 📌 Problema Relatado
- O app travava completamente (interface congelada, mouse não respondia) ao tentar sincronizar o Google Calendar.
- No mobile, o app fechava e travava o celular.
- Após voltar ao commit anterior (`12b4e6a`), o problema persistia, indicando que algo no estado persistente (localStorage/Supabase) estava causando um loop de processamento excessivo.

## 🔍 Raiz do Problema Investigada
Após análise detalhada do código, identificamos que o travamento ocorria na função `parseIcalToEvents` (`src/lib/ical.ts`), responsável por:
1. Ler o feed iCal do Google Calendar (URL configurada nas settings).
2. Expandir eventos recorrentes (RRULE) dentro de uma janela de 8 meses (2 meses no passado → 6 meses no futuro).
3. Embora existisse um limite *por evento* de 200 ocorrências (`maxCount`), não havia **limite global** para o número total de eventos processados.

### Cenário de Loop que Causava Travamento
- Calendários com muitos eventos base (ex: calendários de feriados, trabalho compartilhado, múltiplos calendários pessoais) continham centenas de eventos recorrentes.
- Cada evento recorrente era expandido para até 200 ocorrências.
- Resultado: **centenas de milhares de eventos** sendo processados de forma **síncrona** na thread principal do navegador.
- Esse processamento pesado bloqueava a UI por vários segundos, causando:
  - Congelamento do mouse e da interface.
  - Falha no renderização do React.
  - No WebView do mobile, o sistema interpretava como falta de resposta e encerrava o app.

### Evidências no Código
- Função `parseIcalToEvents` (linhas 107-256) tinha loops aninhados sem limite global.
- Variáveis `totalEvents` e `limitReached` estavam ausentes.
- O único controle era `maxCount = 200` por evento recorrente (linha 216).
- Não havia avisos ou quebra ao atingir volumes perigosos.

## 🛠️ Correção Aplicada
Adicionamos um **limite global seguro de 2.000 eventos** ao processamento do iCal, suficiente para uso típico (vários meses de compromissos pessoais) enquanto evita o travamento em calendários grandes.

### Arquivo Modificado
- `src/lib/ical.ts`

### Mudanças Principais
1. **Adicionado limite global**:
   ```typescript
   const MAX_TOTAL_EVENTS = 2000
   let totalEvents = 0
   let limitReached = false
   ```
2. **Verificação antes de adicionar cada evento** (tanto eventos únicos quanto ocorrências de RRULE):
   ```typescript
   if (totalEvents >= MAX_TOTAL_EVENTS) {
     limitReached = true
     break
   }
   ```
3. **Contagem incremental** (`totalEvents++`) ao adicionar cada evento ao array `events`.
4. **Aviso no console** quando o limite é atingido:
   ```typescript
   if (limitReached) {
     console.warn('[iCal] Limite de eventos atingido (2.000). Alguns eventos podem não ser exibidos.')
   }
   ```

### Código Corrigido (trecho relevante)
```typescript
// Global limit to prevent browser freezing with large calendars
const MAX_TOTAL_EVENTS = 2000
let totalEvents = 0
let limitReached = false

// ... (loops de processamento) ...

// Single non-recurring event
if (!item.rrule) {
  const id = baseId
  if (!seenIds.has(id)) {
    if (totalEvents >= MAX_TOTAL_EVENTS) {
      limitReached = true
      break
    }
    seenIds.add(id)
    events.push({ /* ... */ })
    totalEvents++
  }
  continue
}

// Recurring event (RRULE)
// ... (setup) ...

// Generate occurrences
while (curr <= windowEnd && count < maxCount && !limitReached) {
  // ... (verificação de data) ...

  if (curr >= windowStart) {
    const occDateStr = toIsoDate(curr)
    const occId = `${baseId}-${occDateStr}`
    if (!seenIds.has(occId)) {
      if (totalEvents >= MAX_TOTAL_EVENTS) {
        limitReached = true
        break
      }
      seenIds.add(occId)
      events.push({ /* ... */ })
      totalEvents++
    }
  }

  // ... (step forward) ...
}

// Final warning
if (limitReached) {
  console.warn('[iCal] Limite de eventos atingido (2.000). Alguns eventos podem não ser exibidos.')
}
```

## ✅ Resultado Esperado
- O app não congela mais ao sincronizar calendários grandes.
- A interface permanece responsiva durante o processamento.
- Quando o limite de 2.000 eventos é atingido, os eventos excedentes são ignorados, mas o core funcionamento (agenda, lembretes, etc.) continua com os eventos processados.
- Um aviso aparece no console do desenvolvedor para transparência.

## 📝 Recomendações Pós-Correção
1. **Reinicie o servidor de desenvolvimento** (`npm run dev`) para garantir que o código atualizado seja carregado.
2. **Limpe o cache do navegador** (Ctrl+Shift+R) ou o armazenamento local do app se necessário.
3. **Monitore o console** do navegador em caso de sincronização de calendários muito grandes (aviso será exibido).
4. **Considere revisar calendários compartilhados**: desative calendários com muitos eventos recorrentes (ex: feriados genéricos) se não forem essenciais para seu uso no Life OS.

## 🧪 Teste de Validação
- Sincronize um calendário com poucos eventos pessoais → funciona normalmente.
- Sincronize um calendário com muitos eventos recorrentes (ex: calendário de feriados de vários anos) → o app processa até 2.000 eventos e exibe aviso no console, sem travar.
- A interface permanece utilizável durante todo o processo.

## 📚 Referências
- RFC 5545 (iCalendar) para compreensão de RRULE.
- Boas práticas de desempenho em React: evitar trabalho síncrono pesado na thread principal.

---
*Correção aplicada em 2026-09-06 por assistente Claude Code.*