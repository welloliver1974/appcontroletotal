# 🛡️ Ponto de Restauração & Backup de Segurança (Versão Consolidada)

**Data do Ponto de Restauração**: 07/09/2026  
**Git Tag Estável**: `ponto-estavel-2026-09-07-completo`  
**Git Tag Base Agenda**: `ponto-estavel-agenda-2026-09-07`

---

## 📌 O que está 100% testado e funcionando nesta versão:

### 1. 🧾 Scanner de Cupons Fiscais Longos (Multi-Foto & Visão IA)
- Suporte a múltiplas fotos consecutivas para cupons de supermercado extensos (Parte 1: topo, Parte 2: meio, Parte 3: rodapé).
- Galeria de fotos com remoção individual de imagens tremidas e tabs para conferência de cada foto.
- Consolidação multimodal via IA sem duplicar itens de sobreposição entre as fotos.
- Dicionário extensivo de abreviações brasileiras de varejo (`CR LEITE` ➔ Creme de Leite, `CR RICOTA` ➔ Creme de Ricota, `L COND` ➔ Leite Condensado, `ACH PO` ➔ Achocolatado em Pó, `MARG` ➔ Margarina, etc.).
- Extração de data/hora no cabeçalho e captura do valor líquido a pagar com descontos aplicados.

### 2. 🛒 Despensa & Eliminação de Alertas Falsos
- **Cards da Despensa**: Correção de layout, responsividade e contenção de overflow para textos longos.
- **Regra Inteligente de Estoque Baixo**: Itens com 1 unidade ativa (margarina, achocolatado, azeite) permanecem com status **OK 🟢**.
- **Aba "Hoje" & Dashboard**: Eliminação dos 16 recados de atenção falsos-positivos. Alertas só disparam se o item estiver esgotado (`qty === 0`) ou abaixo do mínimo personalizado (`lowThreshold > 0 && qty < lowThreshold`).

### 3. 📅 Sincronização Segura do Google Calendar (ICS)
- **Cooldown de 30 minutos**: Evita requisições repetidas ao trocar de abas ou recarregar a tela.
- **Mutex Concorrente**: Bloqueio de chamadas paralelas para não criar eventos duplicados.
- **Sincronização em Background**: Roda silenciosamente ao abrir o app e atualiza compromissos no banco de dados.
- **Botão Manual**: Sempre acessível na aba Agenda para forçar sincronização imediata.

### 4. ⚡ Transições Instantâneas entre Abas (`Idle Prefetch`)
- Pré-carregamento inteligente de todos os módulos de abas em segundo plano durante o tempo ocioso do navegador.
- Transições lisas e sem atrasos já a partir do primeiro clique.

### 5. 💵 Gestão Financeira & Scanner com Data Robusta
- Normalização inteligente de datas (`YYYY-MM-DD`, `YYYY/MM/DD`, `DD/MM/YYYY`) sem corromper dia/mês/ano.
- Leitura defensiva no extrato e soma correta no Total do Mês.
- Botão de Edição (`Edit2`) em todas as linhas do extrato para alterar valores, datas, categorias ou notas a qualquer momento.

---

## 🚨 Como voltar para este ponto exato a qualquer momento (Rollback)

Se qualquer alteração futura quebrar algo ou causar instabilidade, utilize qualquer um dos métodos abaixo:

### Método 1: Script Automático em 1 Comando
Abra o terminal na pasta do projeto e execute:
```bash
node rollback_ponto_estavel.mjs
```

### Método 2: Pelo Git Terminal
```bash
git reset --hard ponto-estavel-2026-09-07-completo
git push origin main --force
```
*A Vercel recompilará e publicará a versão estável automaticamente.*
