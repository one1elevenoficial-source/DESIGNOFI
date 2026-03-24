import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  X,
  Smartphone,
  Users,
  MessageSquare,
  RefreshCw,
  Brain,
  BarChart3,
  Zap,
  Shield,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { getTenant } from '@/lib/tenant';
import { cn } from '@/lib/utils';

const WHATSAPP_NUMBER = '5519997816682';

const FALLBACK_PLANS = [
  {
    id: 'solo',
    name: 'Solo',
    description: 'Para corretores autônomos',
    price_monthly: 99700,
    price_annual: 79800,
    max_whatsapp_numbers: 1,
    max_users: 1,
    max_leads: 500,
    max_messages_month: 1000,
    max_followups_per_lead: 3,
    memory_retention_days: 30,
    max_knowledge_docs: 5,
    has_team_reports: false,
    has_routing: false,
    has_api_access: false,
    has_white_label: false,
    support_level: 'Autoatendimento',
    onboarding_type: 'Vídeo',
  },
  {
    id: 'profissional',
    name: 'Profissional',
    description: 'Para profissionais de crescimento',
    price_monthly: 129700,
    price_annual: 103800,
    max_whatsapp_numbers: 1,
    max_users: 1,
    max_leads: 2000,
    max_messages_month: 5000,
    max_followups_per_lead: 7,
    memory_retention_days: 180,
    max_knowledge_docs: 20,
    has_team_reports: false,
    has_routing: false,
    has_api_access: false,
    has_white_label: false,
    support_level: 'WhatsApp',
    onboarding_type: 'Vídeo + Chat',
  },
  {
    id: 'equipe',
    name: 'Equipe',
    description: 'Para times de 5 a 10 pessoas',
    price_monthly: 249700,
    price_annual: 199800,
    max_whatsapp_numbers: 5,
    max_users: 10,
    max_leads: 10000,
    max_messages_month: 25000,
    max_followups_per_lead: -1,
    memory_retention_days: 365,
    max_knowledge_docs: 100,
    has_team_reports: true,
    has_routing: true,
    has_api_access: false,
    has_white_label: false,
    support_level: 'Prioritário',
    onboarding_type: 'Videochamada',
  },
  {
    id: 'empresa',
    name: 'Empresa',
    description: 'Solução white-label completa',
    price_monthly: 499700,
    price_annual: 399800,
    max_whatsapp_numbers: -1,
    max_users: -1,
    max_leads: -1,
    max_messages_month: -1,
    max_followups_per_lead: -1,
    memory_retention_days: -1,
    max_knowledge_docs: -1,
    has_team_reports: true,
    has_routing: true,
    has_api_access: true,
    has_white_label: true,
    support_level: 'Gerente dedicado',
    onboarding_type: 'Presencial',
  },
];

interface Plan {
  id: string;
  name: string;
  description?: string;
  price_monthly: number;
  price_annual: number;
  max_whatsapp_numbers: number;
  max_users: number;
  max_leads: number;
  max_messages_month: number;
  max_followups_per_lead: number;
  memory_retention_days: number;
  max_knowledge_docs: number;
  has_team_reports: boolean;
  has_routing: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  support_level: string;
  onboarding_type: string;
}

function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let animId: number;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.6 + 0.2,
    }));

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      stars.forEach((s) => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0 || s.x > canvas!.width) s.vx *= -1;
        if (s.y < 0 || s.y > canvas!.height) s.vy *= -1;
      });
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 232, 94, ${(1 - dist / 120) * 0.15})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.stroke();
          }
        }
      }
      stars.forEach((s) => {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 232, 94, ${s.opacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00e85e';
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

function fmtPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtValue(val: number, unit = '') {
  if (val === -1) return 'Ilimitado';
  return `${val.toLocaleString('pt-BR')}${unit}`;
}

function PlanCard({
  plan,
  isCurrentPlan,
  isRecommended,
  cycle,
  onUpgrade,
}: {
  plan: Plan;
  isCurrentPlan: boolean;
  isRecommended: boolean;
  cycle: 'monthly' | 'annual';
  onUpgrade: (plan: Plan, price: string) => void;
}) {
  const price = cycle === 'monthly' ? plan.price_monthly : plan.price_annual;
  const priceDisplay = fmtPrice(price);
  const savings = cycle === 'annual' ? Math.round((plan.price_monthly * 12 - price) / 100) : 0;

  const borderColor = isCurrentPlan
    ? 'border-yellow-500/50 border-2'
    : isRecommended
      ? 'border-emerald-400/50 border-2'
      : 'border-white/8';

  const badgeContent = isCurrentPlan
    ? { label: 'SEU PLANO ATUAL', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
    : isRecommended
      ? { label: 'MAIS POPULAR', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
      : null;

  return (
    <div
      className={cn(
        'rounded-3xl p-8 backdrop-blur-xl border transition-all duration-300',
        'bg-white/[0.03] hover:bg-white/[0.05] hover:shadow-lg hover:shadow-emerald-500/10',
        borderColor
      )}
    >
      {badgeContent && (
        <Badge variant="outline" className={cn('mb-4 border', badgeContent.color)}>
          {badgeContent.label}
        </Badge>
      )}

      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
        <p className="text-sm text-muted-foreground mb-6">{plan.description || ''}</p>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold text-emerald-400">{priceDisplay}</span>
          <span className="text-muted-foreground">/mês</span>
        </div>
        {cycle === 'annual' && savings > 0 && (
          <p className="text-xs text-emerald-400 font-semibold">💰 Economiza R$ {savings.toLocaleString('pt-BR')}/ano</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">Primeiro mês grátis</p>
      </div>

      {/* CTA Button */}
      <Button
        onClick={() => onUpgrade(plan, priceDisplay)}
        disabled={isCurrentPlan}
        className={cn(
          'w-full mb-8 font-semibold',
          isCurrentPlan
            ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed'
            : 'bg-emerald-500 hover:bg-emerald-600 text-white'
        )}
      >
        {isCurrentPlan ? 'Plano Atual' : 'Fazer Upgrade →'}
      </Button>

      {/* Features by Category */}
      <div className="space-y-6">
        {/* WhatsApp & Atendimento */}
        <div>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            WhatsApp & Atendimento
          </h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {fmtValue(plan.max_whatsapp_numbers)} número(s) WhatsApp
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {fmtValue(plan.max_leads, ' leads')}
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {fmtValue(plan.max_messages_month, ' mensagens/mês')}
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {fmtValue(plan.max_followups_per_lead, ' follow-ups por lead')}
            </li>
          </ul>
        </div>

        {/* AI */}
        <div>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Inteligência Artificial
          </h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Funil com agentes por estágio
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Cérebro Cognitivo (Claude Sonnet)
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Score de lead em tempo real
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Memória permanente do lead
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Retenção:{' '}
              {plan.memory_retention_days === -1 ? 'Permanente' : `${plan.memory_retention_days} dias`}
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Análise emocional e psicológica
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Previsão de conversão por lead
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Learning Engine
            </li>
          </ul>
        </div>

        {/* CRM & Pipeline */}
        <div>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            CRM & Pipeline
          </h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Pipeline Kanban automático
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Dashboard do lead individual
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Base de conhecimento do lead
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {fmtValue(plan.max_knowledge_docs, ' documentos KB')}
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Grafo de conceitos (Obsidian-style)
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              {plan.has_team_reports ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
              Relatórios da equipe
            </li>
          </ul>
        </div>

        {/* Automação */}
        <div>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Automação
          </h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              {plan.has_routing ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
              Roteamento automático de leads
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Follow-up automático inteligente
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Detecção de handoff humano
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Multimodal (áudio, imagem, doc)
            </li>
          </ul>
        </div>

        {/* Suporte & Segurança */}
        <div>
          <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Suporte & Segurança
          </h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Suporte: {plan.support_level}
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Onboarding: {plan.onboarding_type}
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Secretário IA dentro do SaaS
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              {plan.has_api_access ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
              API Access
            </li>
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              {plan.has_white_label ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <X className="w-4 h-4 text-gray-500 flex-shrink-0" />
              )}
              White-label
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function Plans() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const tenant = getTenant();
        if (!tenant) {
          setPlans(FALLBACK_PLANS);
          setLoading(false);
          return;
        }

        const { data: plansData } = await supabase
          .from('plans')
          .select('*')
          .eq('is_active', true)
          .order('price_monthly');

        if (plansData && plansData.length > 0) {
          setPlans(plansData);
        } else {
          setPlans(FALLBACK_PLANS);
        }

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('plan_id')
          .eq('workspace_id', tenant.workspaceId)
          .maybeSingle();

        if (subData?.plan_id) {
          setCurrentPlanId(subData.plan_id);
        }
      } catch (err) {
        console.error('Erro ao carregar planos:', err);
        setPlans(FALLBACK_PLANS);
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, []);

  const handleUpgrade = (plan: Plan, price: string) => {
    const msg = encodeURIComponent(
      `Olá! Quero fazer upgrade para o plano ${plan.name} (${price}/mês). Pode me ajudar?`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
  };

  const recommendedPlanId = 'profissional';

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ backgroundColor: '#080808' }}
    >
      <ConstellationCanvas />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="px-6 py-8 flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1">
            <button
              onClick={() => setCycle('monthly')}
              className={cn(
                'px-6 py-2 rounded-full text-sm font-semibold transition-all',
                cycle === 'monthly'
                  ? 'bg-emerald-500 text-white'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle('annual')}
              className={cn(
                'px-6 py-2 rounded-full text-sm font-semibold transition-all',
                cycle === 'annual'
                  ? 'bg-emerald-500 text-white'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              Anual
              {cycle === 'annual' && (
                <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-400">
                  -20%
                </Badge>
              )}
            </button>
          </div>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Title */}
        <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">Escolha o plano certo para você</h1>
          <p className="text-lg text-muted-foreground">Todos os planos incluem 7 dias grátis. Sem cartão de crédito.</p>
        </div>

        {/* Plans Grid */}
        <div className="max-w-7xl mx-auto px-6 mb-20">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-96 bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={plan.id === currentPlanId}
                  isRecommended={plan.id === recommendedPlanId}
                  cycle={cycle}
                  onUpgrade={handleUpgrade}
                />
              ))}
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="max-w-7xl mx-auto px-6 mb-20">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Comparativo Completo</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-muted-foreground font-semibold">Recurso</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="text-center py-4 px-4 text-white font-semibold">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Números WhatsApp', key: 'max_whatsapp_numbers' },
                  { label: 'Leads Ativos', key: 'max_leads' },
                  { label: 'Mensagens/mês', key: 'max_messages_month' },
                  { label: 'Follow-ups por Lead', key: 'max_followups_per_lead' },
                  { label: 'Documentos KB', key: 'max_knowledge_docs' },
                  { label: 'Retenção de Memória (dias)', key: 'memory_retention_days' },
                  { label: 'Relatórios da Equipe', key: 'has_team_reports', isBool: true },
                  { label: 'Roteamento Automático', key: 'has_routing', isBool: true },
                  { label: 'API Access', key: 'has_api_access', isBool: true },
                  { label: 'White-label', key: 'has_white_label', isBool: true },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-4 px-4 text-muted-foreground font-medium">{row.label}</td>
                    {plans.map((plan) => {
                      const value = (plan as any)[row.key];
                      const display =
                        row.isBool ? (
                          value ? (
                            <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-500 mx-auto" />
                          )
                        ) : (
                          fmtValue(value)
                        );
                      return (
                        <td key={plan.id} className="py-4 px-4 text-center text-white">
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="max-w-4xl mx-auto px-6 mb-20">
          <div className="rounded-3xl p-12 backdrop-blur-xl bg-white/[0.03] border border-white/10 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              Todas as tecnologias que movem o ONE ELEVEN
            </h3>
            <p className="text-muted-foreground mb-8">
              Integrações profissionais com os melhores serviços
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {['Claude', 'Supabase', 'Evolution API', 'n8n', 'Vercel'].map((tech) => (
                <Badge key={tech} variant="outline" className="bg-white/5 border-white/10">
                  {tech}
                </Badge>
              ))}
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => {
                  const msg = encodeURIComponent(
                    'Olá! Tenho dúvidas sobre os planos do ONE ELEVEN. Podem me ajudar?'
                  );
                  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank');
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
              >
                <Send className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)}>
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
