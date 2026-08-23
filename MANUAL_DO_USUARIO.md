# 📖 Guia do Usuário & Manual de Instruções — Life OS Hub

Bem-vindo ao **Life OS Hub (AppControleTotal)**! Este manual foi criado para ser o seu guia definitivo de uso diário, mostrando como aproveitar ao máximo cada uma das ferramentas inteligentes do sistema.

---

## 📑 Sumário Rápido

1. [⚡ Ações Rápidas no Dashboard & Biometria](#1-⚡-ações-rápidas-no-dashboard--biometria)
2. [🧾 Scanner OCR de Despesas com Reposição na Despensa](#2-🧾-scanner-ocr-de-despesas-com-reposição-na-despensa)
3. [🚗 Carro & Manutenção Preditiva](#3-🚗-carro--manutenção-preditiva)
4. [🧠 Hermes Copiloto & "Pergunte ao meu Life OS"](#4-🧠-hermes-copiloto--pergunte-ao-meu-life-os)
5. [✈️ Viagens, Modo Viagem & Importador Google Maps](#5-✈️-viagens-modo-viagem--importador-google-maps)
6. [🛒 Despensa & Lista Rápida de Compras](#6-🛒-despensa--lista-rápida-de-compras)
7. [🔒 Cofre de Documentos, Seguros & Notas](#7-🔒-cofre-de-documentos-seguros--notas)
8. [📲 Instalação no Celular (PWA) & Sincronização](#8-📲-instalação-no-celular-pwa--sincronização)

---

## 1. ⚡ Ações Rápidas no Dashboard & Biometria

O Dashboard foi projetado com foco em **lançamentos em 1 toque**, eliminando a necessidade de navegar por menus complexos.

### Barra de Ações do Topo:
* **`💸 + Gasto`**: Abre o formulário de despesa rápida (valor, categoria, data e descrição).
* **`🧾 Escanear Cupom`**: Abre a câmera para ler recibos e notas fiscais com IA.
* **`🎙️ Gravar Voz`**: Permite gravar um áudio narrando o seu dia; a IA transcreve e estrutura tudo no seu Diário (`Life-Log`).
* **`📅 + Evento`**: Cadastra um novo compromisso na Agenda.
* **`⛽ Abastecer`**: Registra o odômetro atual (Km), litros e valor para calcular o consumo médio do veículo.

### 🤖 Briefing do Hermes com Voz 👩/👨, Clima & Disparos 24/7 na Nuvem:
* **`🔊 Ouvir / ⏹️ Parar`**: Narra o resumo matinal e o passo a passo de receitas com voz natural em português brasileiro.
* **`👩 / 👨 Seletor Rápido de Voz`**: Alterne entre a voz feminina clara/ágil (`👩`) e masculina encorpada/grave (`👨`) com apenas 1 clique.
* **`🌤️ Clima em Tempo Real`**: Exibe a temperatura e condição climática da sua cidade (Open-Meteo).
* **`⏰ Agendar`**: Configura os horários matinal (ex: `07:00`) e debriefing noturno (ex: `21:30`), com disparos autônomos 24/7 direto no seu Telegram Bot.
* **`🔄 Atualizar`**: Regenera a síntese executiva do Hermes instantaneamente com IA.

### 📱 Abas Rápidas de Navegação no Celular:
* No smartphone, a Dashboard conta com um seletor no topo dos cards para acesso imediato sem rolagem excessiva:
  * **🎯 `Rotina & Agenda`**: Mostra os Hábitos de hoje, Próximos Compromissos e Diário Life-Log.
  * **💰 `Finanças & Radar`**: Traz na hora o resumo de Finanças do Mês, Radar de Alertas prioritários e a Lista de Compras.
  * **📋 `Todos`**: Exibe a lista completa e contínua de todos os cards.

### 🔐 Desbloqueio por Biometria no Celular:
* No seu smartphone, você pode entrar no app usando a **Digital ou Face ID**.
* Para ativar: acesse **Configurações (`⚙️`) ➔ Minha Conta ➔ Ativar Biometria**.

---

## 2. 🧾 Scanner OCR Híbrido: QR Code SEFAZ, Foto Completa (IA) & Chave de Acesso (44 Dígitos)
 
### 3 Formas Inteligentes de Ler o Cupom:
1. **⚡ Fotografar QR Code (Modo Rápido):**
   * Fotografa o QR Code fiscal de perto usando a câmera nativa com foco nítido.
   * Lê instantaneamente os dados fiscais da SEFAZ (NFC-e / SAT).
2. **🛒 Foto Completa do Cupom (IA & Despensa):**
   * Fotografa o cupom inteiro para o Gemini/Llama Vision ler item por item, calcular descontos e abastecer a **Despensa**.
3. **🔑 Chave de Acesso (44 Dígitos & Código de Barras 1D):**
   * Digite ou clique no botão **"Colar 📋"** para inserir a Chave de Consulta impressa na nota fiscal.
   * O sistema formata automaticamente de 4 em 4 números (`3524 0800 0000...`) e extrai na mesma hora o CNPJ da loja, Estado/UF, data e tipo de nota.
   * A câmera também reconhece o **código de barras 1D** impresso no cupom logo acima da chave.

### Como funciona o fluxo:
1. Clique em **`🧾 Escanear Cupom`** no topo do Dashboard ou em Finanças.
2. Escolha uma das 3 opções acima (QR Code, Foto Completa ou Chave de Acesso).
3. Os dados são carregados na tela de conferência editável:
   * **Badge de QR Code / Chave SEFAZ:** Exibe confirmação oficial dos dados fiscais.
   * **Estabelecimento / Loja:** Nome comercial ou CNPJ identificado (totalmente editável).
   * **Valor Total Pago (R$):** Valor líquido final pós-desconto.
   * **Categoria, Data e Hora:** Ajustáveis livremente.
   * **Visualizador da Foto:** Botão para abrir a imagem original ao lado dos dados para rápida conferência.
4. **Despensa Inteligente por Categoria:**
   * **Alimentação (Padarias, Restaurantes, Bares, Lanches):** O estoque na Despensa fica **desmarcado por padrão** (consumo imediato). Você pode marcar caso deseje estocar algo.
   * **Despensa (Supermercados, Atacadões, Hortifrutis):** O estoque fica **marcado por padrão** para abastecer os armários.
   * Você pode editar produtos, alterar quantidades/unidades, remover itens com a lixeira ou clicar em **`+ Adicionar Item`**.
5. **Salvar & Abastecer:**
   * Clique em **`Salvar Gasto & Repor Despensa`** para registrar a despesa financeira e atualizar o estoque conforme sua escolha!

---

## 3. 🚗 Manutenção, Ativos & Abastecimento Integrado

### Como funciona:
* **⛽ Abastecimento Inteligente com Sincronização em Finanças:**
  * Toda vez que você abastecer, use o botão **`⛽ Abastecer`** informando a quilometragem atual do painel, litros e valor pago.
  * O sistema calcula na hora o **Consumo Médio ($\text{km/L}$)**, **Preço por Litro** e **Custo por Km**.
  * **Sincronização Bidirecional:** Qualquer abastecimento registrado (seja pelo botão rápido, pelo menu de Manutenção ou por cupom/gasto financeiro) é sincronizado automaticamente entre **Finanças** e o **Histórico do Veículo**.
  * **⚡ Painel de Consumo & Combustível:** Logo abaixo dos cartões dos veículos na tela de Manutenção, um painel executivo apresenta:
    * **Consumo Médio ($\text{km/L}$):** Rendimento real do veículo calculado entre abastecimentos.
    * **Custo por Km ($\text{R\$/km}$):** Custo de combustível por quilômetro rodado.
    * **Último Litro ($\text{R\$/L}$):** Preço unitário pago no último posto com litragem.
    * **Total em Combustível:** Total acumulado investido no veículo.
    * **Autonomia e Nível do Tanque:** Barra visual com porcentagem e estimativa de quilômetros restantes antes da reserva.
  * **Filtros no Histórico:** Na tela de Manutenção, use os botões de filtro (`Todos`, `Abastecimentos ⛽` e `Manutenções 🔧`) para alternar e ver seus abastecimentos e serviços de forma organizada.
* **🏠 Ativos e Gestão de Patrimônio (Carro, Moto, Casa, Equipamentos):**
  * Cadastre seus veículos ou imóveis para manter o histórico de revisões, troca de óleo, seguro ou reformas.
  * **Revisões Opcionais:** A data de próxima manutenção é 100% opcional; se não houver revisão prevista, o ativo fica como *"Em dia / Sem revisão agendada"*, sem alarmes desnecessários.
  * **Manutenção Preditiva do Carro:** O app calcula o ritmo de rodagem ($\text{km/dia}$) e sugere a estimativa da próxima troca de óleo a cada 10.000 km.

---

## 4. 🧠 Hermes Copiloto & "Pergunte ao meu Life OS"

O assistente Hermes está conectado a todas as 15 coleções do seu banco de dados em tempo real.

### Como conversar:
* Clique no botão flutuante do **Hermes (`🤖`)** no canto inferior direito.
* Você pode digitar ou usar o botão de **Microfone (`🎙️`)** para falar.

### Exemplos de perguntas que você pode fazer:
* *"Quanto eu já gastei este mês em alimentação?"*
* *"Quais contas fixas ainda estão pendentes para pagar?"*
* *"O que está acabando ou vencendo na minha despensa?"*
* *"Quando é a próxima revisão do meu carro?"*
* *"Quais são meus compromissos para os próximos 3 dias?"*

---

## 5. ✈️ Viagens, Modo Viagem & Importador Google Maps

### 🏷️ Tipos de Viagem:
Ao criar ou importar uma viagem, defina o tipo:
* **💼 Viagem a Trabalho:** Foco no controle de Km rodados e paradas comerciais (sem poluição com relatórios de compras pessoais).
* **👨‍👩‍👧‍👦 Viagem em Família:** Ativa o botão **`📊 Gastos da Família`** para cruzar as despesas de hotéis, passeios e restaurantes e gerar um relatório formatado para o WhatsApp.
* **🌴 Viagem Pessoal / Lazer.**

### 📥 Importar do Google Maps (Linha do Tempo):
1. No menu **Viagens**, clique no botão **`📥 Importar Google Maps`**.
2. Selecione o arquivo `.json` ou `.kml` exportado da sua Linha do Tempo do Google.
3. O app extrai o destino, datas, Km percorrido e cria as paradas do itinerário dia a dia automaticamente.

### 🌟 Modo Viagem no Dashboard:
Durante as datas de uma viagem ativa, o topo do Dashboard exibe o painel da viagem com paradas do dia, conversor de moeda (USD/EUR ➔ BRL) e atalhos rápidos de documentos.

---

## 6. 🛒 Despensa & Lista Rápida de Compras

### Na tela inicial (Dashboard):
* O card **Lista de Compras & Despensa** monitora automaticamente itens que estão acabando (`quantidade <= limite mínimo`) ou com vencimento nos próximos 7 dias.
* Quando estiver no mercado, clique no botão **`✓ Comprado`** no item para atualizar o estoque na hora.
* Use o campo rápido para adicionar novos itens que você lembrou de comprar.

---

## 7. 🔒 Cofre de Documentos, Seguros & Notas

Acesse pelo menu **Life-Log ➔ Cofre de Documentos (`DocVault`)**:
* Guarde apólices de seguro (carro, residencial, vida), cartões de vacina, cópias de CNH/RG e contratos.
* Ficam protegidos e acessíveis mesmo sem conexão de internet (offline-first).

---

## 8. 📲 Instalação no Celular (PWA) & Sincronização

### Como instalar no celular:
* **No Android (Chrome):** Toque no banner no topo do app ou no menu dos 3 pontinhos ➔ **"Instalar Aplicativo"**.
* **No iPhone (Safari):** Toque no botão de Compartilhar (`⎋`) ➔ **"Adicionar à Tela de Início (➕)"**.

### ☁️ Sincronização em Nuvem:
* Suas chaves de IA, configurações e dados ficam salvos com segurança no Supabase e sincronizam instantaneamente entre todos os seus celulares, tablets e computadores.

---
*Life OS Hub — Viva com clareza, controle e tranquilidade.*
