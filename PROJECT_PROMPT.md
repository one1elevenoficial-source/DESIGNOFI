# PROMPT PARA IDE — ONE ELEVEN
> Cole isso no início da conversa. Depois peça as alterações uma a uma pelo número.

---

## CONTEXTO DO PROJETO

Você é um engenheiro sênior trabalhando no SaaS **ONE ELEVEN** — automação comercial via WhatsApp com IA.

**Stack:**
- React + TypeScript + Tailwind CSS + shadcn/ui + Vite
- Vercel Serverless Functions (Node.js) — **LIMITE FIXO DE 12 FUNÇÕES**
- Supabase (PostgreSQL + RLS multi-tenant)
- Deploy automático: GitHub → Vercel (branch main)

**URLs:**
- Produção: https://saas-pink-mu.vercel.app
- Supabase: pdrbdpzquhidojirkmcv

---

## DESIGN SYSTEM

```
Background:    #0a0a0a
Verde neon:    #00e85e  (cor principal, botões, ações)
Dourado:       #FFD700  (métricas de destaque)
Bordas:        rgba(255,255,255,0.08)
Cards:         glassmorphism — background rgba(255,255,255,0.03)
```

---

## ESTRUTURA DE ARQUIVOS

```
src/
  pages/
    Login.tsx           ← constelação animada, verde neon
    Register.tsx
    Overview.tsx        ← dashboard KPIs
    Leads.tsx
    Pipeline.tsx        ← kanban drag & drop — NÃO MEXER
    Inbox.tsx           ← chat com leads
    Instances.tsx       ← instâncias WhatsApp
    Clients.tsx
    FollowUps.tsx
    Converted.tsx
    Bot.tsx             ← config do agente (usa client_id)
    Settings.tsx
    Checkout.tsx        ← CRIAR (já existe em outputs)
    Secretario.tsx      ← CRIAR (já existe em outputs)
    Pagamentos.tsx      ← página de pagamentos e faturas
  components/
    layout/
      AppSidebar.tsx
      Header.tsx
      MainLayout.tsx
    Logo.tsx            ← CRIAR
  lib/
    AuthContext.tsx
    supabase.ts
    tenant.ts           ← getTenant() → { workspaceId, token }
    api.ts

api/                    ← 12 funções (no máximo)
  billing.js            ← checkout + webhook + invite + knowledge + secretary
  leads.js
  messages.js
  instances.js
  clients.js
  overview.js
  inbound.js
  webhook.js
  onboarding.js
  system.js
  index.js
  ai/[action].js
```

---

## BANCO — REGRAS CRÍTICAS

```
leads        → usa client_id  (NÃO workspace_id)
bot_configs  → usa client_id  (NÃO workspace_id)
messages     → usa lead_id
workspaces   → id (= workspace_id em outros contextos)
api_tokens   → workspace_id
user_profiles → workspace_id
subscriptions → workspace_id
```

**Autenticação em todas as chamadas de API:**
```ts
const tenant = getTenant(); // { workspaceId, token }
headers: {
  'x-api-token':    tenant.token,
  'x-workspace-id': tenant.workspaceId
}
```

**Novas funcionalidades de API** → sempre em `api/billing.js` como `?action=nome`
Nunca criar novo arquivo em `/api/`

---

## ESTADO ATUAL

✅ Logo componente completada
✅ Login com botão WhatsApp
✅ Dark/Light mode toggle
✅ Settings clean + upload de foto
✅ Dashboard métricas douradas
✅ Card convertido com animação
✅ Bot.tsx com query corrigida (bot_configs + client_id)
✅ Knowledge base upload funcional
✅ Membros invites via /api/billing
✅ Consolidação de API endpoints (api/invite.js e api/knowledge.js deletados)
✅ Página de Pagamentos completa
✅ Rota /pagamentos implementada

---

## ALTERAÇÕES PARA IMPLEMENTAR

> Peça uma por vez: **"implemente a alteração [N]"**

---

### [6] ANIMAÇÕES NOS CARDS — ÍCONE SE DESENHA AO HOVER
**Arquivos:** componentes de card em `src/components/` e `src/pages/Overview.tsx`

```css
.card-icon path {
  stroke-dasharray: 200;
  stroke-dashoffset: 0;
  transition: stroke-dashoffset 0s;
}
.card:hover .card-icon path {
  animation: icon-draw 0.5s ease forwards;
}
@keyframes icon-draw {
  from { stroke-dashoffset: 200; }
  to   { stroke-dashoffset: 0; }
}
```

Ícones sugeridos (lucide-react):
- Leads → `UserPlus`
- Convertidos → `Trophy` (dourado)
- Receita → `TrendingUp`
- Pipeline → `GitBranch`
- Bot → `Zap`
- Mensagens → `MessageCircle`
- Instâncias → `Smartphone`

---

### [10] INBOX — MENU 3 PONTOS FUNCIONAL
**Arquivo:** `src/pages/Inbox.tsx`

Menu dropdown com 4 ações reais:

```tsx
// Transferir para humano
const handleTransferToHuman = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('user_profiles').select('full_name').eq('id', user!.id).single();

  await supabase.from('leads').update({
    human_attending:       true,
    human_attending_by:    profile?.full_name || 'Atendente',
    human_attending_since: new Date().toISOString()
  }).eq('id', selectedLeadId);

  await supabase.from('handoff_log').insert({
    lead_id:      selectedLeadId,
    triggered_by: 'manual',
    action:       'handoff',
    agent_name:   profile?.full_name || 'Atendente'
  });
  toast.success('Lead transferido para atendimento humano');
};

// Marcar como resolvido
const handleMarkResolved = async () => {
  await supabase.from('leads')
    .update({ conversation_status: 'resolved' })
    .eq('id', selectedLeadId);
  toast.success('Conversa marcada como resolvida');
};

// Silenciar
const handleMute = async () => {
  await supabase.from('leads')
    .update({ conversation_status: 'muted' })
    .eq('id', selectedLeadId);
  toast.success('Conversa silenciada');
};
```

---

### [11] INBOX — ÁUDIO E IMAGEM
**Arquivo:** `src/pages/Inbox.tsx`

Adicionar suporte para upload de áudio e imagem nas mensagens:

```tsx
const handleAudioRecord = async (blob: Blob) => {
  const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
  const { data, error } = await supabase.storage
    .from('warehouse')
    .upload(`audio/${Math.random().toString(36).substring(7)}.webm`, file);

  if (error) {
    toast.error('Erro ao fazer upload de áudio');
    return;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('warehouse')
    .getPublicUrl(data?.path!);

  // Salvar mensagem com áudio
  await supabase.from('messages').insert({
    lead_id: selectedLeadId,
    content: '',
    audio_url: publicUrl,
    media_type: 'audio'
  });
};

const handleImageUpload = async (file: File) => {
  const { data, error } = await supabase.storage
    .from('warehouse')
    .upload(`images/${Math.random().toString(36).substring(7)}.jpg`, file);

  if (error) {
    toast.error('Erro ao fazer upload de imagem');
    return;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('warehouse')
    .getPublicUrl(data?.path!);

  // Salvar mensagem com imagem
  await supabase.from('messages').insert({
    lead_id: selectedLeadId,
    content: '',
    image_url: publicUrl,
    media_type: 'image'
  });
};
```

UI:
- Botão de microfone para gravar áudio (usando MediaRecorder API)
- Botão de clipe/imagem para enviar arquivos
- Preview de áudio/imagem antes de enviar

---

### [12] INSTÂNCIAS — QR CODE REAL
**Arquivo:** `src/pages/Instances.tsx`

Integração com Evolution API para gerar QR code real:

```tsx
const getEvolutionQrCode = async (instanceId: string) => {
  const response = await fetch(
    `${process.env.REACT_APP_EVOLUTION_API_URL}/instances/${instanceId}/qrcode`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_EVOLUTION_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return data.qrcode; // URL da imagem do QR code
};

// Polling a cada 3 segundos para verificar status de conexão
useEffect(() => {
  if (!selectedInstance) return;

  const pollStatus = setInterval(async () => {
    const response = await fetch(
      `${process.env.REACT_APP_EVOLUTION_API_URL}/instances/${selectedInstance.id}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_EVOLUTION_API_KEY}`
        }
      }
    );

    const data = await response.json();
    
    if (data.instance.connectionStatus === 'open') {
      toast.success('WhatsApp conectado!');
      clearInterval(pollStatus);
      // Atualizar status no banco
      await supabase.from('instances')
        .update({ connected: true })
        .eq('id', selectedInstance.id);
    }
  }, 3000);

  return () => clearInterval(pollStatus);
}, [selectedInstance]);
```

**Ambiente:**
```
VITE_EVOLUTION_API_URL=https://api.evolution.com.br
VITE_EVOLUTION_API_KEY=sua-chave-aqui
```

---

### [14] CHECKOUT E PLANOS — ROUTER
**Arquivo:** `src/pages/Plans.tsx`

Criar página com 4 planos e toggle mensal/anual:

```tsx
const PLANS = [
  { id: 'solo', name: 'Solo', monthly: 997, annual: 9576, features: [...] },
  { id: 'profissional', name: 'Profissional', monthly: 1297, annual: 12456, features: [...] },
  { id: 'equipe', name: 'Equipe', monthly: 2497, annual: 23976, features: [...] },
  { id: 'empresa', name: 'Empresa', monthly: 4997, annual: 47976, features: [...] },
];

const handleSelectPlan = (planId: string) => {
  // Redireciona para /checkout com parâmetros
  navigate(`/checkout?plan=${planId}&cycle=${isAnnual ? 'annual' : 'monthly'}`);
};
```

Cards dos planos:
- Nome do plano
- Preço com toggle mensal/anual (-20% anual)
- Lista de features
- Botão "Contratar" que navega para /checkout
- Destaque visual para Empresa ("Solução Customizada")

---

## RESTRIÇÕES IMPORTANTES

- ❌ **NÃO MEXER** no Pipeline.tsx (Kanban drag & drop funcionando)
- ❌ **NÃO CRIAR** novos arquivos em `/api/` (limite de 12 funções)
- ❌ **NÃO USAR** `workspace_id` para filtrar `leads` ou `bot_configs` (usa `client_id`)
- ✅ Sempre gerar o **arquivo completo** — nunca trechos
- ✅ Informar sempre o **caminho exato** do arquivo
- ✅ `getTenant()` de `@/lib/tenant` para obter workspaceId e token
