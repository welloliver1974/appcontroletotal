# Hermes Agent (VPS) — Guia de Integração e Endpoints do Servidor

> **Contexto da Infraestrutura:**
> O túnel `cloudflared` já está configurado e ativo com o domínio próprio (ex: `https://hermes.housecloud.tec.br`). O servidor VPS e o Hermes já possuem endereço HTTPS público pronto. 
> 
> **Objetivo:** Adicionar no serviço do Hermes na VPS a rota para receber os disparos de webhook vindos do aplicativo (como a lista de compras da despensa e mensagens do chat) e enviá-los ao Telegram.

---

## 🌐 1. Visão Geral da Comunicação

```
[ AppControleTotal (PWA) ]
     │
     ├── (1) Dispara Webhook / Lista de Compras (HTTPS POST) ──► [ Seu Domínio Ativo (housecloud.tec.br) ]
     │                                                                          │
     │                                                                          ▼
     │                                                               [ Hermes Agent na VPS ]
     │                                                                          │
     └── (2) Recebe Realtime WebSockets ◄── [ Banco Supabase ] ◄───────────────┘
```

1. **Do Hermes (VPS) ➔ Para o App:** O Hermes continua inserindo registros diretamente no **Supabase** (como já faz). O app escuta via **Supabase Realtime (WebSocket)** e exibe tudo na hora.
2. **Do App ➔ Para o Hermes (VPS):** O app envia requisições HTTPS diretamente para o seu domínio já ativo (ex: `https://hermes.housecloud.tec.br/webhook`) protegido por token de segurança.

---

## 🛡️ 2. Segurança e Cabeçalhos Esperados

Todas as requisições enviadas pelo AppControleTotal contêm os seguintes cabeçalhos:

```http
POST /webhook HTTP/1.1
Host: hermes.seu-dominio.com
Content-Type: application/json
X-Hermes-Signature: <SEU_TOKEN_SECRETO>
Authorization: Bearer <SEU_TOKEN_SECRETO>
```

> **Validação na VPS:** O servidor deve verificar se `X-Hermes-Signature` ou `Authorization: Bearer` corresponde ao token configurado nas variáveis de ambiente da VPS.

---

## 📡 3. Endpoints a serem Configurados na VPS

### 🛒 Endpoint 1: Recebimento de Webhooks & Lista de Compras da Despensa
* **Método:** `POST`
* **Rota sugerida:** `/webhook` ou `/api/webhook`

#### Formato do Payload JSON enviado pelo App:
```json
{
  "event": "pantry_shopping_list",
  "timestamp": "2026-08-17T21:40:00.000Z",
  "source": "life-os-hub",
  "payload": {
    "generatedAt": "2026-08-17T21:40:00.000Z",
    "totalItems": 2,
    "items": [
      {
        "id": "item-123",
        "name": "Leite Desnatado",
        "category": "laticinios",
        "qty": 0,
        "unit": "L",
        "lowThreshold": 2,
        "reason": "Estoque baixo (0/2 L)"
      },
      {
        "id": "item-456",
        "name": "Iogurte Natural",
        "category": "laticinios",
        "qty": 1,
        "unit": "un",
        "lowThreshold": 1,
        "expiresAt": "2026-08-18",
        "reason": "Vence em 1 dia"
      }
    ]
  }
}
```

#### Comportamento Esperado na VPS:
1. Validar o token de segurança no cabeçalho.
2. Formatar a lista de compras em mensagem de texto amigável.
3. Enviar a mensagem para o seu **Bot do Telegram** ou WhatsApp. Exemplo de mensagem enviada no Telegram:
   > 🛒 **Lista de Compras — Life OS Hub**
   > • Leite Desnatado (Estoque baixo: 0/2 L)
   > • Iogurte Natural (Vence em 1 dia)
4. Retornar status HTTP `200 OK` com `{ "ok": true, "message": "Enviado ao Telegram" }`.

---

### 💬 Endpoint 2 (Opcional): Chat e Consultas de IA
* **Método:** `POST`
* **Rota sugerida:** `/api/chat`

#### Formato do Payload enviado pelo Chat do App:
```json
{
  "messages": [
    { "role": "system", "content": "Você é o HERMES AGENT..." },
    { "role": "user", "content": "O que tenho agendado para hoje?" }
  ],
  "model": "llama-3.3-70b-versatile"
}
```

#### Resposta esperada da VPS:
```json
{
  "reply": "Hoje você tem 2 compromissos agendados: Reunião às 10:00 e Treino às 18:00.",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hoje você tem 2 compromissos agendados: Reunião às 10:00 e Treino às 18:00."
      }
    }
  ]
}
```

---

## 🗄️ 4. Como o Hermes grava dados no Supabase (Para atualizar o App ao vivo)

O Hermes pode inserir dados em qualquer uma das tabelas do Supabase. O app receberá o evento em tempo real automaticamente:

### 1. Inserir Gasto / Despesa (`spending`):
```sql
INSERT INTO spending (id, amount, category, note, date)
VALUES (gen_random_uuid()::text, 45.50, 'Alimentação', 'Almoço com a equipe', '2026-08-17');
```

### 2. Inserir Item na Despensa (`pantry`):
```sql
INSERT INTO pantry (id, name, category, qty, unit, low_threshold, expires_at)
VALUES (gen_random_uuid()::text, 'Café Torrado', 'alimentos', 2, 'un', 1, '2026-12-31');
```

### 3. Inserir Compromisso na Agenda (`events`):
```sql
INSERT INTO events (id, title, date, time_start, time_end, category, location)
VALUES (gen_random_uuid()::text, 'Reunião de Alinhamento', '2026-08-18', '14:00', '15:00', 'reuniao', 'Google Meet');
```

### 4. Inserir Nota no Diário / Life-Log (`life_log`):
```sql
INSERT INTO life_log (id, title, body, tags, mood, created_at)
VALUES (gen_random_uuid()::text, 'Reflexão do dia', 'Dia produtivo com ótimos avanços.', ARRAY['foco', 'trabalho'], 5, NOW());
```

---

## 🐍 5. Exemplo de Código Pronto para a VPS (Python / FastAPI)

Caso queira subir ou ajustar o servidor FastAPI na sua VPS:

```python
import os
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel
import httpx

app = FastAPI(title="Hermes Agent Gateway")

HERMES_SECRET = os.getenv("HERMES_SECRET", "seu_token_secreto_aqui")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

@app.post("/webhook")
async def handle_webhook(
    request: Request,
    x_hermes_signature: str = Header(None),
    authorization: str = Header(None)
):
    # 1. Validação de Segurança
    token = x_hermes_signature or (authorization.replace("Bearer ", "") if authorization else "")
    if token != HERMES_SECRET:
        raise HTTPException(status_code=401, detail="Assinatura inválida ou não autorizada.")

    body = await request.json()
    event = body.get("event")
    payload = body.get("payload", {})

    # 2. Processamento da Lista de Compras da Despensa
    if event == "pantry_shopping_list":
        items = payload.get("items", [])
        if not items:
            return {"ok": True, "message": "Nenhum item na lista."}

        lines = ["🛒 *Lista de Compras — Life OS Hub*\n"]
        for it in items:
            lines.append(f"• *{it.get('name')}* — {it.get('reason', '')}")

        msg_text = "\n".join(lines)

        # 3. Envio ao Telegram
        if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": TELEGRAM_CHAT_ID,
                        "text": msg_text,
                        "parse_mode": "Markdown"
                    }
                )

        return {"ok": True, "items_processed": len(items), "sent_to_telegram": True}

    # Outros eventos genéricos
    return {"ok": True, "event": event, "status": "processed"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

---

## 📬 7. Bot do Hermes: Triagem Executiva de E-mails para o App

Você pode utilizar o seu bot do Hermes (que já lê e-mails via MCP/IMAP/Gmail) para atuar como um **Assessor Executivo Inteligente**. Em vez de você abrir a caixa de entrada para triar mensagens, o bot analisa os e-mails recebidos, descarta ruídos e envia apenas o resumo dos e-mails críticos direto para a tabela `emails` do Supabase.

### 📋 Estrutura da Tabela `emails` no Supabase:

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `TEXT` / `UUID` | Identificador único (ex: `gen_random_uuid()`) |
| `from` | `TEXT` | Remetente (ex: `banco@notificacoes.com.br` ou `Diretoria`) |
| `subject` | `TEXT` | Assunto ou Título Sintetizado pela IA |
| `preview` | `TEXT` | Resumo executivo de 2 a 3 linhas gerado pelo bot |
| `importance` | `TEXT` | `'critico'` (destaque vermelho) ou `'normal'` |
| `sent_at` | `TIMESTAMPTZ` | Data e hora de envio (ISO string ou `NOW()`) |
| `tags` | `TEXT[]` | Tags para filtros (ex: `['hermes', 'financeiro', 'urgente']`) |
| `read` | `BOOLEAN` | Status de leitura (iniciar com `false`) |

---

### 🐍 Script do Bot Hermes para Inserir E-mails Triados (Python / Supabase):

```python
import os
from datetime import datetime, timezone
from supabase import create_client, Client

# Configurações do Supabase (as mesmas usadas pelo app)
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://seu-projeto.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "sua_chave_service_role_ou_anon")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def send_email_to_life_os(
    sender: str,
    subject: str,
    ai_summary_preview: str,
    importance: str = "critico",
    tags: list = None
):
    """
    Insere o e-mail triado pelo Hermes direto no Supabase.
    O AppControleTotal receberá em tempo real via WebSocket.
    """
    if tags is None:
        tags = ["hermes", "email-triado"]
    
    payload = {
        "from": sender,
        "subject": subject,
        "preview": ai_summary_preview,
        "importance": importance,  # 'critico' ou 'normal'
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "tags": tags,
        "read": False
    }
    
    response = supabase.table("emails").insert(payload).execute()
    print(f"✅ E-mail enviado com sucesso ao Life OS Hub! ID: {response.data}")
    return response.data

# Exemplo de chamada direta pelo Bot do Hermes após ler via MCP:
if __name__ == "__main__":
    send_email_to_life_os(
        sender="Financeiro / Banco",
        subject="Fatura com vencimento para amanhã",
        ai_summary_preview="Fatura do cartão no valor de R$ 1.450,00 vence amanhã (20/08). Código de barras disponível no corpo do e-mail.",
        importance="critico",
        tags=["hermes", "financeiro", "urgente"]
    )
```

---

## 🚀 8. Checklist de Ativação na VPS

1. [ ] **Túnel Cloudflare:** Verificar se o túnel `cloudflared` está ativo apontando para a porta do servidor local (ex: `http://localhost:8000`).
2. [ ] **Token Secreto:** Definir a mesma chave secreta na VPS (`HERMES_SECRET`) e no AppControleTotal (**Configurações ➔ Hermes & IA ➔ Token Secreto**).
3. [ ] **Teste no App:** Ir na aba **Configurações ➔ Hermes & IA** e clicar no botão **"Testar Webhook VPS"** para confirmar a resposta `HTTP 200 OK`.
4. [ ] **Triagem de E-mails:** Executar o script ou função do bot do Hermes que lê os e-mails via MCP e faz o `insert` na tabela `emails`.

