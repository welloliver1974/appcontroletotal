# Life OS Hub — Sistema Operacional Pessoal & Hermes Agent

> **Sistema Operacional Pessoal** — PWA dark mode premium (estilo Linear.app/Vercel) com 6 módulos integrados com IA. Frontend React 19 + Tailwind CSS v4, backend híbrido com Supabase/PostgreSQL em nuvem e fallback automático offline via `localStorage`.

---

## 🚀 Quick Start

```bash
# Instala dependências
npm install

# Desenvolvimento (hot reload)
npm run dev          # http://localhost:5173

# Produção
npm run build        # valida tipos (tsc -b) + build Vite
npm run preview      # serve o build de produção

# Lint
npm run lint         # oxlint
```

> **Primeira abertura:** Emergency Mode pede código de verificação. Use `2468` (demo). Dispositivo fica "confiável" após 1ª vez.

---

## 📦 Módulos Principais

| Módulo | Ícone | Descrição |
|--------|-------|-----------|
| **Dashboard** | 📊 | KPIs, briefing do Hermes com IA, radar de alertas consolidado, agenda, emails e Life Insights |
| **Life-Log & Leitura** | 📝 | Diário, leitura, cofre de fatos, captura de links YouTube/Instagram e busca neural |
| **Manutenção & Ativos** | 🛠️ | Gestão veicular e residencial, barras de vida útil e histórico de manutenções |
| **Consumo & Despensa** | 🛒 | Lista compacta, steppers de ajuste rápido, Modo Supermercado e envio para o Telegram |
| **Viagens & Experiências** | ✈️ | Itinerários cronológicos, paradas detalhadas e locais salvos |
| **Agenda & Inbox** | 📅 | Google Calendar sync automático (.ics com recorrência RRULE), eventos e emails prioritários |

---

## 🌟 Funcionalidades Avançadas & IA

* **💡 Safe-to-Spend & Conselheiro Financeiro Preditivo:** Cálculo diário em tempo real da cota livre disponível até o final do mês, ritmo de gastos (*Burn Rate*) e status (🟢 Confortável, 🟡 Atenção e 🔴 Crítico) no Dashboard e Finanças.
* **🏷️ Scanner EAN-13 com OpenFoodFacts na Despensa:** Leitura de código de barras de alimentos pela câmera ou busca manual, com autopreenchimento instantâneo de nome, foto, marca, categoria e validade média.
* **✈️ Smart Travel Assistant (Piloto Automático de Viagens):** Checklist inteligente de bagagem e documentos por estilo de viagem com persistência local, cálculo de consumo e combustível baseado no rendimento real (km/L) do carro cadastrado e envio direto para o Telegram Bot.
* **🚗 TCO Veicular por Km:** Cálculo do Custo Total de Posse (*Total Cost of Ownership*) por km rodado consolidando abastecimentos, peças e manutenções.
* **Hermes Agent Copilot:** Assistente integrado com suporte a voz, chat flutuante e execução de ações em linguagem natural.
* **Provedores de LLM:** Suporte a **NVIDIA AI Foundation**, **Groq**, **OpenRouter**, **VPS própria** e APIs OpenAI-compatíveis.
* **Proxy Serverless de LLMs (`/api/llm/proxy`):** Bypassa bloqueios de CORS do navegador para chamadas à API da NVIDIA e outros provedores.
* **Sincronização Google Calendar (`/api/calendar/sync-ical`):** Download e processamento serverless de links `.ics` com expansão de eventos recorrentes (RRULE diário, semanal, mensal e anual).
* **Ingestão Inteligente via Telegram (`/api/webhook/hermes-capture`):**
  - Adição de compras: *"preciso de coca zero e leite"* ➔ entra na lista de compras.
  - Baixa de compras: *"comprei coca zero"* ➔ dá baixa e atualiza o estoque.
  - Gastos, eventos e notas são categorizados automaticamente.
* **Lembretes 15 Minutos Antes:** Notificações PWA disparadas antes de compromissos da agenda.
* **Modo Supermercado Interativo:** Checklist de compras de alta sensibilidade para uso móvel no mercado com 1-click restock.

---

## 🎨 Design System ("Dark com Vida")

- **Tipografia:** Space Grotesk (títulos/números) + Inter (corpo/UI) + mono (dados tabulares)
- **Cores base:** Fundo `zinc-950` · Cards `zinc-900` com inset highlight (`white/0.04`) · Bordas `zinc-800`
- **Primária:** `indigo-500` (ações, foco, marca em gradiente `indigo→violet`)
- **Accents por módulo:** Dashboard → `violet` · Life-Log → `emerald` · Manutenção → `orange` · Despensa → `purple` · Viagens → `cyan` · Agenda → `rose`
- **Responsivo nativo:**
  - Mobile < 768px: BottomNav glass + `env(safe-area-inset)`
  - Tablet 768–1024px: NavRail + grids 2 col
  - Desktop ≥ 1024px: Sidebar expansível + grids alta densidade

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Cmd/Ctrl + K` | Foca Omnibox (busca neural) |
| `Cmd/Ctrl + N` | Modal de adição rápida global |
| `Alt + 1..6` | Navegação instantânea entre módulos |

---

## 🗄️ Banco de Dados (Supabase/PostgreSQL)

Configuração via variáveis de ambiente (`.env.local`):
```bash
VITE_SUPABASE_URL=https://sua-url.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

---

## 📚 Documentação Adicional

- [PRD.md](PRD.md) — Product Requirements Document.
- [ARCHITECTURE_AND_HISTORY.md](ARCHITECTURE_AND_HISTORY.md) — Histórico técnico completo com todas as 16 seções de evolução do projeto.
- [CLAUDE.md](CLAUDE.md) — Guia do desenvolvedor e regras de governança.