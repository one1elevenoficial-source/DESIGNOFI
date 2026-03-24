# ONE ELEVEN — Backend n8n Workflows

## ⚠️ SEGURANÇA CRÍTICA

**NUNCA commita credenciais neste repositório!**

- ❌ URLs de API
- ❌ Chaves/tokens
- ❌ Senhas
- ❌ IDs privados
- ❌ Números de telefone

**SEMPRE use variáveis de ambiente** configuradas em n8n → Settings → Variables

---

## 📋 Stack

- **n8n** — Orquestrador de workflows
- **Evolution API** — Gateway WhatsApp
- **Supabase** — Banco de dados PostgreSQL + RLS
- **Anthropic Claude** — Engine de IA
- **Vercel** — Hosting do SaaS

---

## 🔑 Variáveis Globais do n8n

Configure estas variáveis em `n8n → Settings → Variables`:

| Variável | Tipo | Descrição |
|---|---|---|
| `SUPABASE_URL` | URL | Endpoint do Supabase |
| `SUPABASE_ANON_KEY` | String | Chave pública do Supabase |
| `ANTHROPIC_API_KEY` | String | Chave da API Claude |
| `EVOLUTION_URL` | URL | Endpoint da Evolution API |
| `EVOLUTION_KEY` | String | Secret da Evolution API |
| `EVOLUTION_INSTANCE` | String | Nome da instância WhatsApp |
| `SAAS_BASE_URL` | URL | URL base do SaaS (Vercel) |
| `SAAS_API_TOKEN` | String | Token de autenticação API |
| `WORKSPACE_ID` | UUID | ID do workspace padrão |
| `ADMIN_PHONE` | String | Telefone do admin (com país) |
| `AVG_TICKET` | Number | Ticket médio em R$ |
| `N8N_WEBHOOK_BASE_URL` | URL | Base de webhooks do n8n |
| `NOTION_TOKEN` | String | Token de integração Notion |

**👉 Copie de:** `n8n_variables.env.example` (editar localmente, NUNCA commitar)

---

## 📂 Estrutura de Arquivos

```
n8n_blueprints/
├── README.md (este arquivo)
├── n8n_variables.env.example
├── ARCHITECTURE.md
│
├── CORE/
│   ├── 0_COMPANY_CONFIG_SETUP.json      (Setup inicial)
│   └── 0_CEREBRO_AUTONOMO_v1.json       (Núcleo de decisões)
│
├── FUNIL_AGENTES/
│   ├── 1_INBOUND_ROUTER_v3.json         (Detecta stage do lead)
│   ├── 2_IA_NOVO_v3.json                (Novos leads)
│   ├── 3_IA_ATENDIMENTO_v3.json         (Em conversa)
│   ├── 4_IA_QUALIFICACAO_v3.json        (Qualificação)
│   ├── 5_IA_AGENDADO_v3.json            (Reunion agendada)
│   ├── 6_IA_POSVENDA_v3.json            (Pós-venda)
│   └── 7_IA_FOLLOWUP_v3.json            (Follow-up)
│
├── AUTOMACAO/
│   ├── 8_LEARNING_ENGINE_v1.json        (Aprendizado autônomo)
│   ├── MESSAGE_STATUS_SYNC_v3.json      (Sync de status)
│   └── PROSPECCAO_MASSA_v1.json         (Prospecção em massa)
│
└── INFRAESTRUTURA/
    ├── __ONBOARD_INSTANCE_v2.json       (Onboarding)
    └── ___ERROR_HANDLER.json            (Tratamento de erros)
```

---

## 🚀 Ordem de Importação (OBRIGATÓRIA)

Importar no n8n nesta sequência exata:

```
1. ___ERROR_HANDLER.json
2. __ONBOARD_INSTANCE_v2.json
3. 0_COMPANY_CONFIG_SETUP.json
4. 0_CEREBRO_AUTONOMO_v1.json           ← ANTES dos agentes
5. 2_IA_NOVO_v3.json
6. 3_IA_ATENDIMENTO_v3.json
7. 4_IA_QUALIFICACAO_v3.json
8. 5_IA_AGENDADO_v3.json
9. 6_IA_POSVENDA_v3.json
10. 7_IA_FOLLOWUP_v3.json
11. 1_INBOUND_ROUTER_v3.json            ← DEPOIS dos agentes
12. 8_LEARNING_ENGINE_v1.json
13. MESSAGE_STATUS_SYNC_v3.json
14. PROSPECCAO_MASSA_v1.json
```

**Motivo:** O router ativa os agentes, não pode estar antes deles.

---

## 🧠 Arquitetura do Funil

```
╔═══════════════════════════════════════════════════════════╗
║                  ENTRADA: WhatsApp                        ║
║              (Evolution API Webhook)                      ║
╚═════════════════════╤═══════════════════════════════════╝
                      │
                      ▼
        ┌─────────────────────────────┐
        │ 1_INBOUND_ROUTER_v3         │
        │ (Detecta stage do lead)     │
        └─────────────┬───────────────┘
                      │
        ┌─────────────┴────────────────────────┐
        │                                      │
        ▼                                      ▼
   ┌──────────┐                        ┌────────────┐
   │ 2_NOVO   │                        │ 3_ATENÇÃO  │
   └──────────┘                        └────────────┘
   (Lead novo)                        (Em conversa)
        │                                      │
        └──────────────┬───────────────────────┘
                       ▼
              ┌─────────────────┐
              │ 4_QUALIFICACAO  │
              │ (Interesse?)    │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   Sim (▼)        Não (▼)         Sim (▼)
  (Qualif)     (Follow-up)     (Agenda)
        │              │              │
   ┌────┴───┐    ┌─────┴──┐     ┌────┴───┐
   │ 5_AGEN │    │7_FOLLOW│     │6_POSV. │
   └────┬───┘    └────┬───┘     └────┬───┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
         ┌──────────────────────────┐
         │ 0_CEREBRO_AUTONOMO_v1    │
         │ (Executa para TODOS)     │
         │ - Analisa sentimento     │
         │ - Persiste contexto      │
         │ - Propõe próximo passo   │
         └──────────┬───────────────┘
                    ▼
           ┌─────────────────┐
           │  Supabase       │
           │  (Persiste      │
           │   tudo)         │
           └────────┬────────┘
                    ▼
        ┌────────────────────────┐
        │  Evolution API         │
        │  (Envia resposta)      │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  WhatsApp              │
        │  (Usuário recebe)      │
        └────────────────────────┘

╔════════════════════════════════════════════════════════════╗
║  PARALELOS (rodam em background)                           ║
╠════════════════════════════════════════════════════════════╣
║ 8_LEARNING_ENGINE_v1                                       ║
║ (Dom 23h - Aprende padrões, propõe melhorias via WhatsApp) ║
║                                                            ║
║ MESSAGE_STATUS_SYNC_v3                                     ║
║ (A cada 5min - Atualiza status de leitura)                ║
║                                                            ║
║ PROSPECCAO_MASSA_v1                                        ║
║ (Seg-Sex 9h - Envia 100 prospecções/dia)                  ║
╚════════════════════════════════════════════════════════════╝
```

---

## 📊 Banco de Dados (Supabase)

### Tabelas Principais

| Tabela | Chave | Uso |
|---|---|---|
| `leads` | `client_id` | Leads no funil |
| `messages` | `lead_id` | Histórico de msgs |
| `bot_configs` | `client_id` | Config do agente |
| `workspaces` | `id` | Workspaces dos clientes |
| `api_tokens` | `workspace_id` | Autenticação API |
| `user_profiles` | `workspace_id` | Perfis de usuários |
| `subscriptions` | `workspace_id` | Assinaturas |
| `plans` | `id` | Planos disponíveis |

### Tabelas de IA

| Tabela | Uso |
|---|---|
| `ai_memory_profiles` | Perfil cognitivo do lead |
| `lead_knowledge` | Conhecimento estruturado |
| `lead_insights` | Insights gerados |
| `concept_graph` | Grafo de conceitos (estilo Obsidian) |
| `funnel_predictions` | Previsões de conversão |
| `media_transcriptions` | Transcrições de áudio/vídeo |

### Tabelas de Aprendizado

| Tabela | Uso |
|---|---|
| `ai_proposals` | Propostas de melhoria (aguardando aprovação) |
| `learning_cycles` | Ciclos de aprendizado executados |
| `admin_approvals` | Tokens de aprovação via WhatsApp |

### Tabelas de Prospecção

| Tabela | Uso |
|---|---|
| `prospecting_lists` | Listas diárias de prospecção |
| `prospecting_contacts` | Contatos individuais |
| `prospecting_metrics` | Métricas de performance |

### Tabelas de Billing

| Tabela | Uso |
|---|---|
| `manual_payments` | Pagamentos PIX manuais |
| `secretary_conversations` | Histórico do secretário IA |

---

## 🤖 O que cada Workflow faz

### `0_CEREBRO_AUTONOMO_v1.json`
**Núcleo de decisão do sistema**

- Recebe: Mensagem do usuário + histórico
- Processa: Análise com Claude
- Persiste: Insights, contexto, próximo passo
- Envia: Resposta via Evolution API

### `1_INBOUND_ROUTER_v3.json`
**Router inteligente de entrada**

- Webhook da Evolution API
- Detecta: Novo lead, lead existente, stage
- Roteia para o agente apropriado
- Executa `0_CEREBRO_AUTONOMO_v1` para todos

### `2_IA_NOVO_v3.json`
**Agente para novos leads**

- Greeting personalizado
- Identifica necessidade
- Avança para qualificação

### `3_IA_ATENDIMENTO_v3.json`
**Agente de suporte em conversa**

- Responde perguntas detalhadas
- Resolve dúvidas técnicas
- Pode escalar para humano

### `4_IA_QUALIFICACAO_v3.json`
**Qualifica interesse real**

- "Está realmente interessado?"
- Se SIM → agenda reunião (5_IA_AGENDADO)
- Se NÃO → para follow-up (7_IA_FOLLOWUP)

### `5_IA_AGENDADO_v3.json`
**Pós-agendamento**

- Confirma detalhes da reunião
- Avança para pós-venda

### `6_IA_POSVENDA_v3.json`
**Suporte ao cliente ativo**

- Acompanhamento pós-venda
- Detecção de problemas
- Upsell/cross-sell

### `7_IA_FOLLOWUP_v3.json`
**Reaquecimento de leads frios**

- Lembrete de interesse anterior
- Novas argumentações
- Desconto/oferta especial

### `8_LEARNING_ENGINE_v1.json`
**Aprendizado autônomo (Domingo 23h)**

1. Analisa leads dos últimos 30 dias
2. Identifica padrões (convertidos vs perdidos)
3. Claude propõe até 5 mudanças
4. Admin recebe no WhatsApp com token
5. Responde token para APROVAR ou REJEITAR
6. Sistema aplica automaticamente

### `MESSAGE_STATUS_SYNC_v3.json`
**Sincronização de status**

- Executa a cada 5 minutos
- Atualiza `messages.is_read`
- Trigger: usuário lê no WhatsApp

### `PROSPECCAO_MASSA_v1.json`
**Prospecção em massa (Seg-Sex 9h)**

1. Lê lista de contatos no Notion/Supabase
2. Divide em 2 grupos:
   - 50 contatos: Trial de 7 dias
   - 50 contatos: Venda direta
3. Envia com intervalo de 4-6 min (antispam)
4. Às 17h30 detecta respostas
5. Às 18h calcula métricas
6. Quando responde → funil automático assume

---

## ⚙️ Como Adicionar Nova Variável

1. Vá em `n8n → Settings → Variables`
2. Clique `Add Variable`
3. Nome: `MINHA_VAR`
4. Valor: `seu_valor_aqui`
5. Salve com save

**Para usar no workflow:**
```
{{ $vars.MINHA_VAR }}
```

---

## 🔍 Debugging

Se um workflow falhar:

1. **Verifique variáveis**: Todas foram configuradas?
2. **Verifique conexões**: Evolution API online?
3. **Verifique Supabase**: Credenciais corretas?
4. **Verifique logs**: n8n → Execution History

---

## 📝 Versionamento

- **v1** → Primeira versão estável
- **v2** → Atual (deprecated)
- **v3** → Nova implementação com melhorias

Arquivos v3 precisam de v1 do CEREBRO primeiro!

---

## ✅ Checklist de Deploy

- [ ] Variáveis globais configuradas
- [ ] Evolution API online
- [ ] Supabase com credenciais corretas
- [ ] Webhooks apontando para n8n
- [ ] Workflows importados nesta ordem
- [ ] Testes com mensagem de teste no WhatsApp
- [ ] Learning Engine agendado (Dom 23h)
- [ ] Prospecção massa agendada (Seg-Sex 9h)
- [ ] Erros monitorados no n8n

---

## 🆘 Suporte

Se algo quebrar:
1. Não edite JSONs diretamente
2. Reimporte o arquivo original
3. Configure variáveis novamente
4. Se persistir, documento os erros

---

**Última atualização:** 24 de Março de 2026
**Versão:** ONE ELEVEN v3.0
**Status:** ✅ Produção
