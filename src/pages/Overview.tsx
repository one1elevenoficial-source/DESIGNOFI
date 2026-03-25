import {
  MessageSquare,
  Trophy,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Target,
  Activity,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard, MagicFormulaItem } from '@/components/ui/kpi-card';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type OverviewApi = {
  total_messages?: number;
  hot_leads?: number;
  conversion_rate?: number;
  followup_conversions?: number;
  roi_estimated?: number;
  total_leads?: number;
  closed?: number;
  qualified?: number;
  scheduled?: number;
  lost?: number;
  new_leads?: number;
  total_conversions?: number;
};

const safeNum = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const funnelStages = [
  { label: 'Novo', key: 'novo', color: 'bg-info', textColor: 'text-info' },
  { label: 'Em Atendimento', key: 'em_atendimento', color: 'bg-purple-500', textColor: 'text-purple-400' },
  { label: 'Qualificado', key: 'qualificado', color: 'bg-warning', textColor: 'text-warning' },
  { label: 'Agendado', key: 'agendado', color: 'bg-orange-500', textColor: 'text-orange-400' },
  { label: 'Fechado', key: 'fechado', color: 'bg-success', textColor: 'text-success' },
  { label: 'Follow-up', key: 'followup', color: 'bg-primary', textColor: 'text-primary' },
];

export default function Overview() {
  const { currentWorkspace } = useWorkspace();

  const { data: overviewRes, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: async () => api.overview(),
    staleTime: 15_000,
    retry: 1,
  });

  // Leads reais para calcular funil
  const { data: rawLeads = [] } = useQuery({
    queryKey: ['leads', currentWorkspace.id],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) return [] as any[];
      return r.data ?? [];
    },
    staleTime: 15_000,
    retry: 1,
  });
  const leads = rawLeads as any[];

  const overview: OverviewApi | null =
    overviewRes && (overviewRes as any).ok ? ((overviewRes as any).data as OverviewApi) : null;

  const totalMessages = safeNum(overview?.total_messages);
  const activeLeads = safeNum(overview?.total_leads ?? overview?.hot_leads);
  const conversionRate = safeNum(overview?.conversion_rate);
  const hotLeads = safeNum(overview?.hot_leads);
  const followUpConversions = safeNum(overview?.followup_conversions);
  const totalConversions = safeNum(overview?.closed ?? overview?.total_conversions);
  const qualifiedLeads = safeNum(overview?.qualified);

  // Calcular funil a partir dos leads reais
  const funnelCounts: Record<string, number> = {
    novo: 0, em_atendimento: 0, qualificado: 0, agendado: 0, fechado: 0, followup: 0,
  };
  leads.forEach((l: any) => {
    const s = String(l.stage || l.status || '').toLowerCase().trim();
    if (s === 'novo') funnelCounts.novo++;
    else if (s === 'em atendimento' || s === 'qualificando' || s === 'em_atendimento') funnelCounts.em_atendimento++;
    else if (s === 'qualificado') funnelCounts.qualificado++;
    else if (s === 'agendado' || s === 'follow-up') funnelCounts.agendado++;
    else if (s === 'fechado' || s === 'ganhou' || s === 'convertido') funnelCounts.fechado++;
    else funnelCounts.followup++;
  });
  const totalFunnel = Object.values(funnelCounts).reduce((a, b) => a + b, 0) || 1;

  // Score saúde
  const total = activeLeads || 1;
  const score = Math.min(100, Math.round((hotLeads / total) * 40 + conversionRate * 0.4 + Math.min(totalMessages / 100, 1) * 20));
  const scoreColor = score >= 70 ? 'text-success' : score >= 40 ? 'text-warning' : 'text-destructive';
  const scoreLabel = score >= 70 ? 'Excelente' : score >= 40 ? 'Atenção necessária' : 'Crítico';

  let scoreHint = '';
  if (score < 70) {
    if (conversionRate < 10) scoreHint = 'Taxa de conversão está puxando o score para baixo.';
    else if (hotLeads / total < 0.2) scoreHint = 'Poucos leads quentes no funil. Ative o follow-up.';
    else scoreHint = 'Volume de mensagens está abaixo do ideal.';
  }

  const magicFormula = [
    { label: 'WhatsApp conectado', status: true },
    { label: 'Funil configurado', status: true },
    { label: 'Follow-up ativo', status: false },
    { label: 'IA treinada', status: false },
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao painel de {currentWorkspace.name}.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Mensagens */}
        <Card
          className="bg-card/50 transition-colors"
          style={{ border: '1px solid rgba(255,215,0,0.25)', background: 'linear-gradient(135deg, rgba(255,215,0,0.04) 0%, transparent 100%)' }}
        >
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-info" />
              </div>
            </div>
            <p
              className="text-2xl font-bold mt-3"
              style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)' }}
            >
              {totalMessages.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Mensagens</p>
          </CardContent>
        </Card>

        {/* Leads Ativos */}
        <Card
          className="bg-card/50 transition-colors"
          style={{ border: '1px solid rgba(255,215,0,0.25)', background: 'linear-gradient(135deg, rgba(255,215,0,0.04) 0%, transparent 100%)' }}
        >
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-info" />
              </div>
            </div>
            <p
              className="text-2xl font-bold mt-3"
              style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)' }}
            >
              {activeLeads}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Leads Ativos</p>
          </CardContent>
        </Card>

        {/* Taxa de Conversão */}
        <Card
          className="bg-card/50 transition-colors"
          style={{ border: '1px solid rgba(255,215,0,0.25)', background: 'linear-gradient(135deg, rgba(255,215,0,0.04) 0%, transparent 100%)' }}
        >
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-success" />
              </div>
            </div>
            <p
              className="text-2xl font-bold mt-3"
              style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)' }}
            >
              {conversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Taxa de Conversão</p>
          </CardContent>
        </Card>

        {/* Quase Fechando */}
        <Card
          className="bg-card/50 transition-colors"
          style={{ border: '1px solid rgba(255,215,0,0.25)', background: 'linear-gradient(135deg, rgba(255,215,0,0.04) 0%, transparent 100%)' }}
        >
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p
              className="text-2xl font-bold mt-3"
              style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2)' }}
            >
              {hotLeads}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Quase Fechando</p>
          </CardContent>
        </Card>

        {/* Total Conversões — gold-pulse */}
        <Card
          className="bg-card/50 transition-colors"
          style={{
            border: '1px solid rgba(255,215,0,0.25)',
            background: 'linear-gradient(135deg, rgba(255,215,0,0.04) 0%, transparent 100%)',
            boxShadow: '0 0 20px rgba(255,215,0,0.06)',
          }}
        >
          <CardContent className="pt-5">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
            </div>
            <p
              className="text-2xl font-bold mt-3 gold-pulse-text"
              style={{ color: '#FFD700' }}
            >
              {totalConversions}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total Conversões</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-success">{conversionRate.toFixed(1)}%</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Quentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{hotLeads}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Follow-up Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{followUpConversions}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Qualificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{qualifiedLeads}</div>
          </CardContent>
        </Card>
      </div>

      {/* Funil Comercial */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-primary" />
            Funil Comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum lead no funil ainda.</p>
          ) : (
            <div className="flex items-stretch gap-1">
              {funnelStages.map((stage) => {
                const count = funnelCounts[stage.key] || 0;
                const pct = Math.round((count / totalFunnel) * 100);
                return (
                  <div key={stage.key} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-secondary rounded-lg overflow-hidden h-2">
                      <div
                        className={cn('h-full rounded-lg transition-all duration-700', stage.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className={cn('text-lg font-bold', stage.textColor)}>{count}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{stage.label}</p>
                      <p className="text-[10px] text-muted-foreground opacity-60">⏱ —</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modo Dono */}
      <Card className="bg-gradient-to-r from-primary/10 via-card to-card border border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Resumo do Dia — Modo Dono
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-info">{activeLeads}</p>
              <p className="text-xs text-muted-foreground mt-1">Leads hoje</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-warning">{hotLeads}</p>
              <p className="text-xs text-muted-foreground mt-1">Quase fechando</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-success">{totalConversions}</p>
              <p className="text-xs text-muted-foreground mt-1">Fechados</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                {safeNum(overview?.roi_estimated) > 0
                  ? `R$ ${safeNum(overview?.roi_estimated).toLocaleString('pt-BR')}`
                  : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">ROI Estimado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saúde Comercial */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Saúde Comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className={`text-5xl font-black ${scoreColor}`}>{score}</p>
              <p className="text-xs text-muted-foreground">/100</p>
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${scoreColor}`}>{scoreLabel}</p>
              <div className="w-full bg-secondary rounded-full h-3 mt-2">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    score >= 70 ? 'bg-success' : score >= 40 ? 'bg-warning' : 'bg-destructive'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
              {scoreHint && (
                <p className="text-xs text-warning mt-2 font-medium">⚠️ {scoreHint}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Baseado em leads ativos, taxa de conversão e volume de mensagens
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts + Magic Formula */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Atividade do Período
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Dados de gráfico disponíveis quando a API retornar histórico.</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Magic Formula Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {magicFormula.map((item) => (
              <MagicFormulaItem key={item.label} label={item.label} status={item.status} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
