# Plano: Write-Back Google Calendar (App → Google)

**Data**: 2026-09-07  
**Status**: RASCUNHO — aguardando aprovação  
**Objetivo**: Criar eventos no app Life OS Hub e sincronizá-los para o Google Calendar de cada usuário

---

## 🎯 Visão Geral

### Direção do sync
```
App (novo evento)  ──→  Google Calendar  (unidirecional)
      ←──  iCal feed  ──  Google Calendar  (existente, read-only)
```

- **Input (read)**: já existe via iCal — mantém-se intacto
- **Output (write)**: novo fluxo — cria evento no Google a partir do app

### Multi-tenant (por usuário)
- `welloliver@gmail.com` → agenda do Well
- `silvinhamsa@gmail.com` → agenda da Silvia
- Credenciais OAuth **separadas por email**, salvas em `app_settings`
- Cada usuário vê e sincroniza apenas seus próprios eventos

---

## ⚠️ Lições do `correcaodamerda.md` (regras não negociáveis)

1. **NUNCA** mesclar dados de múltiplas fontes sem deduplicação
2. **NUNCA** auto-sync em useEffect sem controle explícito do usuário
3. **NUNCA** salvar bulk de eventos em `app_settings`
4. **Mobile first**: batches de 100, zero operações síncronas pesadas
5. **Isolar mudanças**: endpoint novo, zero impacto no código existente de sync iCal
6. **Sempre** botão explícito — jamais automático na criação

---

## 📐 Arquitetura Proposta

```
┌─────────────────┐
│  EventModal.tsx │  ← checkbox "Sync p/ Google Calendar"
└────────┬────────┘
         │ (apenas se credenciais configuradas)
         ▼
┌─────────────────┐
│  AgendaPage.tsx │  ← handleSaveEvent + flag googleSync
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  api/calendar/create-event.js       │  ← NOVO endpoint serverless
│  - Autentica com Google OAuth       │
│  - Cria evento na Google Calendar   │
│  - Retorna id do evento no Google   │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│  Google Calendar API                │
│  (calendars.primary.events.insert)  │
└─────────────────────────────────────┘

Armazenamento por usuário (app_settings):
  gcal_oauth_welloliver@gmail.com  → { clientId, clientSecret, refreshToken, primaryCalendarId }
  gcal_oauth_silvinhamsa@gmail.com → { clientId, clientSecret, refreshToken, primaryCalendarId }
```

---

## 📦 Migrations Necessárias

### Nova migration: credenciais OAuth em `app_settings`

**Arquivo**: `supabase/migrations/20260907000000_google_calendar_oauth.sql`

```sql
-- app_settings já existe e é genérica (id text, data jsonb).
-- NÃO precisa de tabela nova. As credenciais vão em app_settings.data
-- conforme padrão já usado:
--   id = 'gcal_oauth_<email_lower>'
--   data = { clientId, clientSecret, refreshToken, primaryCalendarId, lastTokenRefresh }
```

**Conclusão**: nenhuma migration SQL necessária. Apenas uso da tabela `app_settings` existente.

---

## 🔧 Etapa 1 — Novo Endpoint Serverless

**Arquivo**: `api/calendar/create-event.js`

```javascript
// POST /api/calendar/create-event
// Corpo: { userEmail, title, date, timeStart, timeEnd?, category?, location?, credentials }
// Resposta: { ok: true, googleEventId: "xxx", error?: string }
```

### O que o endpoint faz:
1. Recebe `credentials` (clientId, clientSecret, refreshToken) + dados do evento
2. Troca `refreshToken` por `accessToken` via Google OAuth2 token endpoint
3. Chama `Google Calendar API v3` → `calendars.primary.events.insert`
4. Retorna `googleEventId` para o frontend registrar
5. Tratamento de erro: token expirado → retorna `error: 'token_expired'` para o app pedir refresh

### Variáveis de ambiente necessárias (Vercel):
```
GOOGLE_CALENDAR_CLIENT_ID     (fallback opcional, mas recomendado: passar nos credentials do usuário)
GOOGLE_CALENDAR_CLIENT_SECRET (fallback opcional)
```

> **Nota**: Como cada usuário tem suas próprias credenciais, o endpoint **não usa env vars fixas** — usa os credentials passados no body (que vêm do localStorage do app, criptografados no banco).

---

## 🔧 Etapa 2 — Nova Interface de Configuração OAuth

**Arquivo**: `src/features/agenda/SettingsGoogleCalendar.tsx` — **expandir**, não recriar.

Adicionar seção **"Google Calendar OAuth (Write)"** abaixo da seção iCal existente:

```
┌─────────────────────────────────────────┐
│  Google Calendar — Importar (iCal)      │  ← existente, read-only
│  [textarea com iCal URLs]               │
│  [Sincronizar Google Calendar]          │
├─────────────────────────────────────────┤
│  Google Calendar — Exportar (OAuth)     │  ← NOVA seção
│  Client ID:     [________________]      │
│  Client Secret: [________________]      │
│  Refresh Token: [________________]      │
│                                         │
│  ℹ️ Obtenha no Google Cloud Console     │
│  OAuth 2.0 → Credenciais de            │
│  autorização para aplicativo           │
│  web.                                 │
└─────────────────────────────────────────┘
```

### Armazenamento
- Salvar em `app_settings` com key `gcal_oauth_<email_lower>`
- Salvar também em localStorage (fallback local)
- **NUNCA** mostrar credentials na UI após salvar (mas deixar campo editável)

### Como obter o Refresh Token (instrução na UI)
```
1. Acessar https://console.cloud.google.com
2. Criar projeto (se não tiver) → APIs & Services → Credentials
3. Criar OAuth 2.0 Client ID (tipo: Web application)
4. Habilitar "Google Calendar API" no projeto
5. Usar ferramenta OAuth 2.0 Playground (https://oauth2.googleapis.com/token)
   - Selecionar scope: https://www.googleapis.com/auth/calendar.events
   - Autorizar → trocar código por refresh token
   - Copiar o refresh token
```

---

## 🔧 Etapa 3 — Checkbox no EventModal

**Arquivo**: `src/features/agenda/EventModal.tsx`

Adicionar no final do form:
```tsx
{hasGoogleCredentials && (
  <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-800">
    <input
      type="checkbox"
      id="event-google-sync"
      checked={syncToGoogle}
      onChange={(e) => setSyncToGoogle(e.target.checked)}
      className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-blue-500"
    />
    <label htmlFor="event-google-sync" className="text-xs font-medium text-zinc-300 cursor-pointer select-none flex items-center gap-1.5">
      <Calendar className="h-3.5 w-3.5 text-blue-400" />
      Sincronizar com Google Calendar
    </label>
  </div>
)}
```

O checkbox **só aparece** se o usuário tiver credenciais OAuth configuradas.

---

## 🔧 Etapa 4 — Integração com AgendaPage

**Arquivo**: `src/features/agenda/AgendaPage.tsx`

### Mudança em `handleSaveEvent`:
```typescript
const handleSaveEvent = useCallback(async (eventData: Omit<AgendaEvent, 'id'>, syncToGoogle?: boolean) => {
  if (editingEvent) {
    await api.update<AgendaEvent>('events', editingEvent.id, eventData)
    setEvents(data!.events.map((e) => (e.id === editingEvent.id ? { ...e, ...eventData } : e)))
  } else {
    const created = await api.create<AgendaEvent>('events', eventData)
    setEvents([...data!.events, created])

    // Write-back: apenas se checkbox marcado E o evento é novo
    if (syncToGoogle && created) {
      await pushToGoogleCalendar(created)
    }
  }
}, [editingEvent, data, setEvents])
```

### Função `pushToGoogleCalendar`:
```typescript
async function pushToGoogleCalendar(event: AgendaEvent): Promise<void> {
  const config = getGoogleCalendarConfig()
  if (!config.googleOAuthCredentials) return

  try {
    const res = await fetch('/api/calendar/create-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: getCurrentUserEmail(),
        title: event.title,
        date: event.date,
        timeStart: event.timeStart,
        timeEnd: event.timeEnd,
        location: event.location,
        credentials: config.googleOAuthCredentials,
      }),
    })
    const data = await res.json()
    if (!data.ok) {
      console.warn('[GoogleCalendar] Falha no write-back:', data.error)
      // Silencioso — não interromper fluxo do app
    }
  } catch (err) {
    console.warn('[GoogleCalendar] Erro no write-back:', err)
  }
}
```

---

## 🔧 Etapa 5 — Store Google OAuth Config

**Arquivo**: `src/lib/googleCalendarSync.ts` — **expandir**, não recriar.

Adicionar:
```typescript
export interface GoogleOAuthCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
  primaryCalendarId?: string  // "primary" ou calendar_id específico
}

export interface GoogleCalendarConfig {
  icalUrl: string
  autoSync: boolean
  lastSyncAt: string | null
  lastEventsCount: number
  googleOAuthCredentials?: GoogleOAuthCredentials | null  // NOVO campo
}
```

Funções auxiliares:
```typescript
export function saveGoogleOAuthCredentials(credentials: GoogleOAuthCredentials): void
export function getGoogleOAuthCredentials(): GoogleOAuthCredentials | null
export function clearGoogleOAuthCredentials(): void
```

---

## 🔒 Segurança

| Aspecto | Abordagem |
|---|---|
| Credentials em trânsito | HTTPS (Vercel) obrigatório |
| Credentials em repouso | `app_settings` (PostgreSQL com RLS) + localStorage (criptografia implícita do device) |
| Refresh token expira? | Endpoint retorna `token_expired` → app mostra toast "Credenciais expiradas, atualize nas configurações" |
| Usuário A vê credenciais do B? | Não — key é `gcal_oauth_<email_do_donO>`; query é filtrada por RLS |
| Credentials no body da request | Só vai pro serverless, nunca logado em produção |

### RLS Policy para app_settings (precisa verificar se já existe)
```sql
-- Já existe? Precisa garantir que:
-- row.id LIKE 'gcal_oauth_%' + email do usuário logado
```

---

## 🧪 Testes de Validação

### Teste 1 — Create sem credentials
1. Usuário cria evento SEM marcar checkbox Google
2. ✅ Evento criado no app
3. ✅ Sem chamada ao serverless
4. ✅ Sem erro

### Teste 2 — Create com credentials válidas
1. Usuário configura OAuth credentials
2. Cria evento marcando "Sync p/ Google Calendar"
3. ✅ Evento criado no app
4. ✅ Evento criado no Google Calendar
5. ✅ Toast de sucesso

### Teste 3 — Token expirado
1. Usuário marca sync, mas refresh token está expirado
2. ✅ Evento criado no app (não bloqueia)
3. ✅ Toast de aviso "Falha ao sincronizar com Google — verifique as credenciais"

### Teste 4 — Multi-usuário
1. Well cria evento e marca sync → aparece na agenda do Well no Google
2. Silvia cria evento e marca sync → aparece na agenda da Silvia no Google
3. ✅ Nenhuma cruzamento de dados

### Teste 5 — Não regressão iCal
1. Sync manual iCal funciona normalmente
2. ✅ Zero eventos duplicados
3. ✅ Zero travamento mobile

---

## 📋 Checklist de Implementação (ordem)

- [ ] **Etapa 1**: Criar `api/calendar/create-event.js`
- [ ] **Etapa 2**: Expandir `googleCalendarSync.ts` com OAuth config
- [ ] **Etapa 3**: Expandir `SettingsGoogleCalendar.tsx` com seção OAuth
- [ ] **Etapa 4**: Expandir `EventModal.tsx` com checkbox sync
- [ ] **Etapa 5**: Atualizar `AgendaPage.tsx` — `handleSaveEvent` + `pushToGoogleCalendar`
- [ ] **Etapa 6**: Verificar RLS policies em `app_settings`
- [ ] **Etapa 7**: Build limpo (`npm run build`)
- [ ] **Etapa 8**: Deploy + teste manual

---

## 🚫 O que NÃO fazer (armadilhas evitadas)

- ❌ NÃO usar OAuth no browser (exige redirect, login no Google, etc.)
- ❌ NÃO automatizar write-back (sempre checkbox explícito)
- ❌ NÃO tocar no código de sync iCal existente
- ❌ NÃO salvar eventos em `app_settings` (só credentials OAuth)
- ❌ NÃO fazer batch operations no write-back (um evento por vez)
- ❌ NÃO expor credentials na UI após salvar
- ❌ NÃO usar servidor de auth próprio — usar Google diretamente do serverless

---

## 📁 Arquivos Alterados

| Arquivo | Ação | Descrição |
|---|---|---|
| `api/calendar/create-event.js` | **NOVO** | Serverless endpoint para criar evento no Google |
| `src/lib/googleCalendarSync.ts` | **MODIFICAR** | Adicionar campos OAuth à config |
| `src/features/agenda/SettingsGoogleCalendar.tsx` | **MODIFICAR** | Seção OAuth credentials |
| `src/features/agenda/EventModal.tsx` | **MODIFICAR** | Checkbox sync p/ Google |
| `src/features/agenda/AgendaPage.tsx` | **MODIFICAR** | Chamar write-back pós-save |

**Nenhum outro arquivo afetado.**

---

## 🔮 Próximos passos (pós-MVP, se interessar)

- [ ] Botão "Sync p/ Google" em eventos existentes (reabrir evento e marcar)
- [ ] Deletar evento do Google quando deletar do app (bidirecional simples)
- [ ] Sincronizar alterações de título/data no Google também
- [ ] Suporte a Google Calendar específico (não só primary)
- [ ] Queue offline: se internet cair, salva e tenta depois

---

*Plano criado em 2026-09-07 — aguardando aprovação do usuário*
