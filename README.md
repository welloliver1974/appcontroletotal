# AppControleTotal · Life OS Hub

Seu sistema operacional pessoal — dark mode premium, responsivo (mobile / tablet / desktop), PWA. Frontend React + Tailwind com backend simulado (mock) em `localStorage`.

## Módulos

📊 Dashboard · 📝 Life-Log · 🛠️ Manutenção · 🛒 Despensa · ✈️ Viagens · 📅 Agenda & Inbox

6 módulos ativos (módulo Inglês B1 removido na Fase 6).

## Recursos

**Fases concluídas:**
- **Fase 0**: Design system, navegação responsiva (Sidebar/NavRail/BottomNav), header + omnibox, Emergency Gate, rotas, camada mock
- **Fase 0.5**: Refresc visual — Space Grotesk + Inter, indigo primário, dark "com vida", accents vivos + glow
- **Fase 5**: Viagens & Experiências — itinerário cronológico, locais salvos
- **Fase 6**: Módulo Inglês B1 removido (curso/idioma não prosseguiu)
- **Fase 7**: Agenda & Inbox (Hermes Bridge) — CalendarView, EventModal, EmailCard, inbox inteligente
- **Fase 8**: Backup, Webhook e PWA — backup semanal automatizado (JSON), PWA offline com runtime caching, notificações toast, fila offline/sincronização, integração webhook Hermes

**Em andamento:**
- **Fase 1**: Dashboard (KPIs, alertas, agenda, emails, Life Insights)

**Planejadas:**
- Fase 2: Life-Log & Leitura
- Fase 3: Manutenção & Ativos
- Fase 4: Consumo & Despensa

## Rode

```bash
npm install
npm run dev        # desenvolvimento (http://localhost:5173)
npm run build      # valida tipos + build de produção
npm run preview    # serve o build
```

> Na primeira abertura, o **Emergency Mode** pede um código de verificação. Em modo demo use `2468`. Depois o dispositivo fica "confiável".

O PRD está em `PRD.md`; decisões e convenções de código em `CLAUDE.md`.

**Status:** Fases 0, 0.5, 5, 6, 7 e 8 concluídas. Dashboard em construção (Fase 1 em andamento).