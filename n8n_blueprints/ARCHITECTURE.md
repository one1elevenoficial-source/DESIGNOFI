# ONE ELEVEN — Arquitetura Técnica

## 🏗️ Stack de Tecnologia

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    FRONTEND (SaaS)                           │
│         React 18 + TypeScript + Tailwind CSS                │
│        (Vercel) - URL: https://saas.example.com            │
│                                                              │
└──────────────┬───────────────────────┬──────────────────────┘
               │                       │
               ▼                       ▼
        ┌─────────────┐        ┌─────────────────┐
        │  Supabase   │        │   Evolution API │
        │ PostgreSQL  │        │   (WhatsApp)    │
        │   + RLS     │        │  (Render)       │
        │   + Auth    │        │                 │
        └────────┬────┘        └────────┬────────┘
                 │                      │
                 │      WEBHOOKS        │
                 ▼                      ▼
        ┌─────────────────────────────────────┐
        │                                     │
        │            n8n Server               │
        │                                     │
        │  (Workflows de Automação)           │
        │  + Evolution Listener               │
        │  + Scheduler (Learning, Prospecção) │
        │  + Webhook Handler                  │
        │                                     │
        └──────────┬──────────────────────────┘
                   │
                   ├── IA (Anthropic Claude)
                   ├── Notion (Agenda)
                   ├── WhatsApp (Evolution)
                   └── Supabase (Banco)
```

---

## 🔄 Fluxo de um Lead (Passo a Passo)

### 1️⃣ Lead envia mensagem no WhatsApp

```
Usuário: "Oi, gostaria de saber mais sobre seu produto"
         ↓ (via WhatsApp)
     Evolution API
         ↓ (webhook)
      n8n
```

### 2️⃣ n8n recebe no webhook

```json
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "55199XXXXXXXX@s.whatsapp.net",
      "id": "msg_id_123"
    },
    "message": {
      "conversation": "Oi, gostaria de saber mais..."
    }
  }
}
```

### 3️⃣ 1_INBOUND_ROUTER_v3 processa

```
├── Query no Supabase: existe lead com phone 55199XXXXXXXX?
├── Se NÃO existe:
│   └── Cria novo lead (stage = 1_NOVO)
├── Se existe:
│   └── Pega stage atual
└── Roteia para agente apropriado
```

### 4️⃣ Agente apropriado executa (2-7)

**Exemplo: Lead novo (stage 1)**

```javascript
// 2_IA_NOVO_v3 executa:

const message = "Oi, gostaria de saber mais sobre seu produto";
const leadContext = {
  stage: 1,
  history: [],
  name: null,
  phone: "55199XXXXXXXX"
};

// Chama Claude:
const prompt = `
  Você é um assistente de vendas da empresa ONE ELEVEN.
  Um novo lead enviou: "${message}"
  
  Responda:
  1. Uma mensagem amigável
  2. Uma pergunta para qualificar
  
  Seu próximo passo será descobrir o nome e necessidade.
`;

const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  messages: [{ role: "user", content: prompt }]
});

// response.content[0].text = "Oi! Bem-vindo! Qual é o seu nome?"
```

### 5️⃣ Antes de responder, executa CEREBRO

```javascript
// 0_CEREBRO_AUTONOMO_v1 processa:

const aiOutput = {
  message: "Oi! Bem-vindo! Qual é o seu nome?",
  nextStage: 1,
  sentimentScore: 0.8,
  proposedActions: [
    "Guardar nome do lead",
    "Após 3 respostas → qualificar interesse"
  ],
  context: {
    firstMessage: true,
    engagementLevel: "high",
    recommendedFollowUp: "48h se não responder"
  }
};

// Persiste tudo no Supabase:
// - INSERT INTO ai_memory_profiles (lead_id, sentiment, stage)
// - INSERT INTO lead_insights (lead_id, insight_type, content)
// - UPDATE leads (stage, last_message_at)
```

### 6️⃣ Envia resposta via Evolution

```javascript
const payload = {
  number: "55199XXXXXXXX",
  text: "Oi! Bem-vindo! Qual é o seu nome?"
};

await fetch("https://evolution-api.com/message/sendText", {
  method: "POST",
  headers: {
    "apikey": process.env.EVOLUTION_KEY,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    chatId: "55199XXXXXXXX@s.whatsapp.net",
    text: payload.text
  })
});

// WhatsApp recebe: "Oi! Bem-vindo! Qual é o seu nome?"
```

### 7️⃣ Lead responde

```
Usuário: "Meu nome é João"
         ↓ (webhook novamente)
```

### 8️⃣ Ciclo repete (2→5)

```
2_IA_NOVO processa "Meu nome é João"
  ↓
0_CEREBRO persiste name="João"
  ↓
Incrementa score de qualificação
  ↓
Evolution responde
```

---

## 🤖 Como Claude Recebe Contexto

Cada request para Claude inclui:

```javascript
const systemPrompt = `
  Você é Sofia, assistente de vendas de imóvel.
  
  Configuração atual:
  - Empresa: ONE ELEVEN
  - Objetivo: Agendar visita de imóvel
  - Produção: Apartamentos de alto padrão
  - Público: Casais de 30-50 anos com poder aquisitivo
  
  Regras:
  1. Nunca minta sobre preço — sempre diga "preciso consultar"
  2. Se cliente desistir, ofereça desconto de 5%
  3. Sempre obtenha WhatsApp para acompanhamento
  4. Máximo 3 mensagens antes de agendar reunião
  
  Histórico com este lead:
  ${JSON.stringify(leadHistory, null, 2)}
  
  Insights anteriores:
  ${JSON.stringify(aiInsights, null, 2)}
`;

const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  system: systemPrompt,
  messages: conversationMessages
});
```

---

## 📊 Banco de Dados — Exemplo Real

### Tabela: `leads`

```sql
id | client_id | phone | name | stage | created_at | updated_at
1  | workspace-uuid | 55199... | João | 2 | 2026-03-20 | 2026-03-24
2  | workspace-uuid | 55198... | Maria | 5 | 2026-03-21 | 2026-03-24
```

**stage:** 1=novo, 2=atendo, 3=qualif, 4=agend, 5=pós, 6=cold

### Tabela: `messages`

```sql
id | lead_id | direction | content | is_read | created_at
1  | 1 | incoming | "Oi, gostaria..." | true | 2026-03-24 09:15
2  | 1 | outgoing | "Oi! Qual seu nome?" | true | 2026-03-24 09:15
3  | 1 | incoming | "Meu nome é João" | true | 2026-03-24 09:20
```

### Tabela: `ai_memory_profiles`

```sql
id | lead_id | sentiment_score | engagement | next_recommended_action
1  | 1 | 0.85 | high | "Agendar visita"
2  | 2 | 0.45 | low | "Reaquecimento em 7 dias"
```

---

## ⏱️ Timeline de um Lead (Exemplo)

```
Seg 9:00  → Lead novo entra ("Oi!")
            Stage: 1_NOVO
            IA: "Qual seu nome?"

Seg 9:05  → Lead responde "João"
            Stage: mantém 1_NOVO
            IA: "Prazer João! O que te traz aqui?"

Seg 9:10  → Lead: "Procuro apto em Sobradinho"
            Stage: 2_ATENDIMENTO
            IA: "Tenho 3 opções perfeitas. Qual orçamento?"

Seg 9:15  → Lead: "Em torno de 500k"
            Stage: 3_QUALIFICACAO
            IA: "Ótimo! Está realmente interessado em visitar?"

Seg 9:20  → Lead: "Sim! Quando posso ir?"
            Stage: 4_AGENDADO
            IA: Agenda no Notion para hoje 14h

Seg 14:00 → Reunião acontece (fora do sistema)

Ter 9:00  → (seguindo up) Lead responde interesse
            Stage: 5_POSVENDA
            IA: "Qual a próxima ação?"

Seg da próxima semana → Se não responder
            Stage: 6_FOLLOWUP
            Learning Engine ativa: "Oferta especial?"
```

---

## 🧠 Learning Engine — Ciclo Semanal

**Domingo às 23:00:**

```
1. Query últimos 30 dias:
   SELECT * FROM leads 
   WHERE created_at > now() - interval '30 days'
   AND (stage = 5 OR stage = 6)  -- convertidos ou frios

2. Agrupa por outcome:
   - Convertidos: 12 leads
   - Perdidos: 18 leads
   - Em progresso: 5 leads

3. Calcula métricas:
   - Taxa de conversão: 40%
   - Tempo médio no funil: 4 dias
   - Maior objeção: "Preciso pensar"

4. Claude analisa:
   "Por que 60% desistem? É preço? Timing?
    Vejo padrão: 8 leads mencionaram 'orçamento apertado'.
    Proposta: Oferecer parcelamento em 36x (sem juros por 90 dias)"

5. Admin recebe no WhatsApp:
   "🧠 PROPOSTA DE MELHORIA
    Aumentar taxa de conversão de 40% para 50%
    
    Proposta: Oferecer parcelamento 36x sem juros
    Token para aprovar: APROVA_PARCELA
    Token para rejeitar: REJEITA_PARCELA"

6. Admin responde: "APROVA_PARCELA"
   INSERT INTO ai_proposals (status='approved', ...)
   APLICAR NOS PRÓXIMOS AGENTES

7. Próximas semanas:
   - Agentes usam nova argumento
   - Medem resultado
   - Propõem ajustes
```

---

## 🚀 Prospecção em Massa — Fluxo Diário

**Segunda a Sexta às 9h:**

```
1. Carrega lista de contatos:
   SELECT * FROM prospecting_lists 
   WHERE DATE(created_at) = TODAY()
   LIMIT 100

2. Divide estratégia:
   - Contatos com Notion "empresário": Trial 7 dias
   - Contatos com Notion "consumidor": Venda direta
   - Contatos com Notion "já abordado": Oferta especial

3. Envia com intervalo anti-spam (4-6 min):
   Contato 1: 9:00 "Oi João! Descobrimos que..."
   Contato 2: 9:05 "Oi Maria! Temos solução para..."
   Contato 3: 9:10 "Oi Pedro! Você seria interessado?..."
   ...
   Contato 50: 9:30

4. Às 17h30:
   SELECT * FROM messages
   WHERE direction='incoming' AND created_at > '09:00'
   = 18 respostas positivas

5. Às 18h:
   UPDATE prospecting_metrics
   - Taxa de resposta: 18%
   - Time de resposta médio: 12 min
   - Palavras-chave mais eficazes: "Problema", "Solução"

6. Automático:
   Os 18 que responderam → entram no funil normal
   Inbound Router detecta → stage 1_NOVO
   Agentes assumem
```

---

## 🔒 Segurança RLS (Row Level Security)

Supabase protege com RLS policies:

```sql
-- Cada workspace vê apenas seus dados
CREATE POLICY "Users can read own leads"
ON leads FOR SELECT
USING (client_id = auth.uid());

-- Cada usuário vê apenas leads de seu workspace
CREATE POLICY "Users can read workspace leads"
ON leads FOR SELECT
USING (
  client_id IN (
    SELECT workspace_id FROM user_profiles
    WHERE user_id = auth.uid()
  )
);
```

---

## 🔄 Integrações Externas

### Evolution API (WhatsApp)

```
POST /message/sendText
POST /instance/create
POST /instance/disconnect
GET /instance/list
GET /message/fetch (histórico)
```

### Notion (Agenda)

```
GET /databases/{database_id}/query
POST /pages (criar novo agendamento)
PATCH /pages/{page_id} (atualizar status)
```

### Anthropic Claude

```
POST /messages
  model: "claude-3-5-sonnet-20241022"
  max_tokens: 1000
  system: [contexto do lead]
  messages: [histórico de conversa]
```

---

## 📈 Métricas Rastreadas

```
Por Lead:
- time_in_stage (quantos dias em cada estágio)
- sentiment_score (0-1, aumenta conforme engajamento)
- engagement_level (low/medium/high)
- conversion_probability (% de chance de comprar)
- churn_risk (% de risco de desistir)

Por Período:
- conversion_rate (vendas / leads)
- avg_ticket (valor médio de venda)
- customer_lifetime_value (CLV)
- cost_per_acquisition (CPA)

Por Agente:
- effectiveness_score (IA, comparar vs baseline)
- improvement_rate (mês a mês)
- most_common_objections (palavras-chave)
```

---

## ✅ Checklist de Deploy

```
✓ Variáveis globais configuradas
✓ Evolution API webhook apontando para n8n
✓ Supabase RLS policies ativas
✓ Workflows importados nesta ordem
✓ Testes com lead de teste
✓ Learning Engine agendado (Dom 23h)
✓ Prospecção massa agendada (Seg-Sex 9h)
✓ Monitoramento de erros ativo
✓ Backup de workflows feito
```

---

**Arquitetura ONE ELEVEN v3.0**
**Data: 24 de Março de 2026**
**Status: ✅ Produção**
