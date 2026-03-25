// Resolve: checkout, webhook Asaas, invite de membros, knowledge base e grafo de conhecimento
//
// Rotas:
//   POST /api/billing?action=checkout    → cria assinatura Asaas
//   POST /api/billing?action=webhook     → recebe eventos Asaas (sem auth)
//   POST /api/billing?action=invite      → manda email de convite real
//   GET  /api/billing?action=knowledge   → lista arquivos do bot
//   DELETE /api/billing?action=knowledge&id=xxx → remove arquivo
//   GET  /api/billing?action=knowledge-graph&leadId=X → nós do grafo do lead
//   POST /api/billing?action=knowledge-graph&leadId=X → cria nó manual
//   DELETE /api/billing?action=knowledge-graph&nodeId=X → remove nó

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ASAAS_URL = process.env.ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/api/v3";

const PLAN_PRICES = {
  solo:         { monthly: 997,  annual: 9576  },
  profissional: { monthly: 1297, annual: 12456 },
  equipe:       { monthly: 2497, annual: 23976 },
  empresa:      { monthly: 4997, annual: 47976 },
};

// ─── helpers ────────────────────────────────────────────────────────────────

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-token, x-workspace-id");
}

async function getWorkspaceId(req) {
  const workspaceId = req.headers["x-workspace-id"];
  const apiToken    = req.headers["x-api-token"];
  if (!workspaceId || !apiToken) return null;
  const { data } = await supabaseAdmin
    .from("api_tokens")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .eq("token", apiToken)
    .single();
  return data ? workspaceId : null;
}

async function asaasRequest(path, method = "GET", body = null) {
  const res = await fetch(`${ASAAS_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "access_token": process.env.ASAAS_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.errors?.[0]?.description || "Erro Asaas");
  return data;
}

// ─── main handler ───────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;

  // ── WEBHOOK (sem autenticação — chamado pelo Asaas diretamente) ──────────
  if (action === "webhook") {
    const event = req.body;
    const type  = event?.event;
    const workspaceId = event?.payment?.externalReference
      || event?.subscription?.externalReference;

    try {
      if (type === "PAYMENT_RECEIVED" || type === "PAYMENT_CONFIRMED") {
        await supabaseAdmin.from("subscriptions").update({
          status: "active",
          updated_at: new Date().toISOString(),
        }).eq("workspace_id", workspaceId);
      }
      if (type === "PAYMENT_OVERDUE") {
        await supabaseAdmin.from("subscriptions").update({
          status: "past_due", updated_at: new Date().toISOString(),
        }).eq("workspace_id", workspaceId);
      }
      if (type === "SUBSCRIPTION_DELETED") {
        await supabaseAdmin.from("subscriptions").update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("workspace_id", workspaceId);
      }
      return res.status(200).json({ received: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── As demais rotas precisam de autenticação ─────────────────────────────
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return res.status(401).json({ error: "Não autorizado" });

  // ── CHECKOUT ─────────────────────────────────────────────────────────────
  if (action === "checkout" && req.method === "POST") {
    const { planId, billingCycle, paymentMethod, customer, card } = req.body;
    if (!planId || !billingCycle || !paymentMethod || !customer?.email || !customer?.cpfCnpj) {
      return res.status(400).json({ error: "Dados incompletos" });
    }
    const prices = PLAN_PRICES[planId];
    if (!prices) return res.status(400).json({ error: "Plano inválido" });

    try {
      // Criar ou buscar cliente
      let customerId;
      const existing = await asaasRequest(`/customers?email=${encodeURIComponent(customer.email)}`);
      customerId = existing.data?.[0]?.id;
      if (!customerId) {
        const created = await asaasRequest("/customers", "POST", {
          name: customer.name, email: customer.email,
          cpfCnpj: customer.cpfCnpj, mobilePhone: customer.phone,
        });
        customerId = created.id;
      }

      // Criar assinatura com 7 dias de trial
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const value = billingCycle === "annual" ? prices.annual : prices.monthly;

      const payload = {
        customer: customerId,
        billingType: paymentMethod,
        value,
        nextDueDate: dueDate.toISOString().split("T")[0],
        cycle: billingCycle === "annual" ? "YEARLY" : "MONTHLY",
        description: `ONE ELEVEN — Plano ${planId}`,
        externalReference: workspaceId,
        ...(paymentMethod === "CREDIT_CARD" && card ? {
          creditCard: {
            holderName: card.holderName, number: card.number,
            expiryMonth: card.expiryMonth, expiryYear: card.expiryYear, ccv: card.cvv,
          },
          creditCardHolderInfo: { name: customer.name, email: customer.email, cpfCnpj: customer.cpfCnpj },
        } : {}),
      };

      const subscription = await asaasRequest("/subscriptions", "POST", payload);

      // Atualizar banco
      await supabaseAdmin.from("subscriptions").update({
        plan_id: planId, status: "active", billing_cycle: billingCycle,
        price_cents: value * 100,
        asaas_subscription_id: subscription.id,
        asaas_customer_id: customerId,
        current_period_end: new Date(Date.now() + (billingCycle === "annual" ? 365 : 30) * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("workspace_id", workspaceId);

      // PIX: buscar QR Code
      if (paymentMethod === "PIX") {
        const payments = await asaasRequest(`/subscriptions/${subscription.id}/payments`);
        const first = payments.data?.[0];
        if (first) {
          const pix = await asaasRequest(`/payments/${first.id}/pixQrCode`);
          return res.status(200).json({
            success: true,
            pixQrCode: `data:image/png;base64,${pix.encodedImage}`,
            pixCopyPaste: pix.payload,
          });
        }
      }

      return res.status(200).json({ success: true, subscriptionId: subscription.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── INVITE ────────────────────────────────────────────────────────────────
  if (action === "invite" && req.method === "POST") {
    const { email, role = "member" } = req.body;
    if (!email) return res.status(400).json({ error: "Email obrigatório" });

    try {
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { workspace_id: workspaceId, role },
        redirectTo: `https://saas-pink-mu.vercel.app/login`,
      });
      if (error) throw error;

      await supabaseAdmin.from("user_invites").upsert({
        workspace_id: workspaceId, email, role,
        invited_at: new Date().toISOString(), status: "pending",
      }, { onConflict: "email" });

      return res.status(200).json({ success: true, message: `Convite enviado para ${email}` });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── KNOWLEDGE — fazer upload ──────────────────────────────────────────────
  if (action === "knowledge" && req.method === "POST") {
    try {
      // Por arquitetura Vercel Serverless, o upload é feito pelo cliente direto para Supabase Storage.
      // Este endpoint valida e registra o arquivo no banco. Alternativa: processar multipart com busboy.
      // 
      // Fluxo esperado:
      // 1. Cliente faz upload direto para Supabase Storage (api.ts)
      // 2. Cliente envia POST aqui com metadados
      // 3. Este endpoint registra no banco de dados

      // Para MVP: confirmamos apenas. Cliente faria upload direto.
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── KNOWLEDGE — listar ────────────────────────────────────────────────────
  if (action === "knowledge" && req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("knowledge_base")
      .select("id, file_name, file_url, file_type, file_size, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ files: data || [] });
  }

  // ── KNOWLEDGE — deletar ───────────────────────────────────────────────────
  if (action === "knowledge" && req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "ID obrigatório" });

    const { data: file } = await supabaseAdmin
      .from("knowledge_base")
      .select("file_url")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (file?.file_url) {
      const path = file.file_url.split("/knowledge-files/")[1];
      if (path) await supabaseAdmin.storage.from("knowledge-files").remove([decodeURIComponent(path)]);
    }

    await supabaseAdmin.from("knowledge_base").delete().eq("id", id);
    return res.status(200).json({ success: true });
  }

  // ── KNOWLEDGE GRAPH — Grafo de Conhecimento do Lead ───────────────────────
  if (action === "knowledge-graph") {
    const leadId = req.query.leadId || req.body?.leadId;
    const method = req.method;

    if (method === "GET" && leadId) {
      const { data: nodes } = await supabaseAdmin
        .from("concept_graph")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true });

      if (!nodes || nodes.length === 0) {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("name, intent, stage, lead_temperature, urgency_level, pain_point, estimated_value, notes")
          .eq("id", leadId)
          .single();

        if (lead) {
          const baseNodes = buildBaseGraph(lead, leadId, workspaceId);
          const { data: inserted } = await supabaseAdmin
            .from("concept_graph")
            .insert(baseNodes)
            .select();
          return res.status(200).json({ nodes: inserted || baseNodes, edges: buildEdges(inserted || baseNodes) });
        }
      }

      return res.status(200).json({ nodes: nodes || [], edges: buildEdges(nodes || []) });
    }

    if (method === "POST") {
      const { label, type, value, source, connected_to } = req.body;

      const { data: newNode } = await supabaseAdmin
        .from("concept_graph")
        .insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          label,
          node_type: type || "manual",
          value: value || "",
          confidence: source === "ia" ? 0.85 : 1.0,
          source: source || "manual",
          connected_to: connected_to || [],
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (connected_to?.length > 0) {
        for (const targetId of connected_to) {
          const { data: target } = await supabaseAdmin
            .from("concept_graph")
            .select("connected_to")
            .eq("id", targetId)
            .single();
          if (target) {
            await supabaseAdmin
              .from("concept_graph")
              .update({ connected_to: [...(target.connected_to || []), newNode.id] })
              .eq("id", targetId);
          }
        }
      }

      return res.status(201).json(newNode);
    }

    if (method === "DELETE") {
      const nodeId = req.query.nodeId;
      await supabaseAdmin.from("concept_graph").delete().eq("id", nodeId).eq("workspace_id", workspaceId);
      return res.status(200).json({ deleted: true });
    }
  }

  return res.status(400).json({ error: "Ação inválida" });
}

// ─── helpers do grafo de conhecimento ─────────────────────────────────────────

function buildBaseGraph(lead, leadId, workspaceId) {
  const now = new Date().toISOString();
  const nicheMap = {
    imovel:   { budget: "R$ 50k–500k",            need: "Fechar mais vendas no WhatsApp", timing: "30–60 dias" },
    clinica:  { budget: "R$ 3k–15k por paciente",  need: "Reduzir no-show e aumentar agendamentos", timing: "7–30 dias" },
    academia: { budget: "R$ 100–300/mês por aluno", need: "Reter alunos e vender planos", timing: "Imediato" },
    default:  { budget: "A identificar",            need: "Automatizar atendimento no WhatsApp", timing: "A identificar" },
  };
  const intent = (lead.intent || "").toLowerCase();
  const nicheKey = Object.keys(nicheMap).find((k) => intent.includes(k)) || "default";
  const niche = nicheMap[nicheKey];

  return [
    { workspace_id: workspaceId, lead_id: leadId, label: lead.name || "Lead", node_type: "identity", value: `Estágio: ${lead.stage}`, confidence: 1.0, source: "ia", connected_to: [], is_central: true, created_at: now },
    { workspace_id: workspaceId, lead_id: leadId, label: "Budget", node_type: "bant", value: lead.estimated_value ? `R$ ${lead.estimated_value}` : niche.budget, confidence: lead.estimated_value ? 0.95 : 0.6, source: "ia", connected_to: [], created_at: now },
    { workspace_id: workspaceId, lead_id: leadId, label: "Decisor", node_type: "bant", value: "A confirmar", confidence: 0.4, source: "ia", connected_to: [], created_at: now },
    { workspace_id: workspaceId, lead_id: leadId, label: "Dor principal", node_type: "bant", value: lead.pain_point || niche.need, confidence: lead.pain_point ? 0.9 : 0.65, source: "ia", connected_to: [], created_at: now },
    { workspace_id: workspaceId, lead_id: leadId, label: "Timing", node_type: "bant", value: lead.urgency_level === "alta" ? "Urgente" : niche.timing, confidence: lead.urgency_level ? 0.85 : 0.5, source: "ia", connected_to: [], created_at: now },
    { workspace_id: workspaceId, lead_id: leadId, label: "Probabilidade", node_type: "prediction", value: lead.lead_temperature === "quente" ? "72%" : lead.lead_temperature === "morno" ? "41%" : "18%", confidence: 0.8, source: "ia", connected_to: [], created_at: now },
    { workspace_id: workspaceId, lead_id: leadId, label: "Próxima ação", node_type: "prediction", value: "Apresentar proposta", confidence: 0.75, source: "ia", connected_to: [], created_at: now },
    { workspace_id: workspaceId, lead_id: leadId, label: "Risco de perda", node_type: "prediction", value: lead.lead_temperature === "frio" ? "Alto — sem resposta há +48h" : "Baixo", confidence: 0.7, source: "ia", connected_to: [], created_at: now },
  ];
}

function buildEdges(nodes) {
  if (!nodes?.length) return [];
  const central = nodes.find((n) => n.is_central) || nodes[0];
  if (!central) return [];
  return nodes
    .filter((n) => n.id !== central.id)
    .map((n) => ({ source: central.id, target: n.id, type: n.node_type }));
}
