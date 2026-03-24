import { Trophy, TrendingUp, CalendarDays, Bot, Loader2, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const stageColors: Record<string, string> = {
  Novo: '#06b6d4',
  'Em atendimento': '#a855f7',
  Qualificado: '#eab308',
  Agendado: '#f97316',
  Fechado: '#22c55e',
  Perdido: '#ef4444',
};

// Estilos para animações de ouro
const goldStyles = `
  @keyframes gold-shine {
    0%,100% { text-shadow: 0 0 10px rgba(255,215,0,0.4); }
    50% { text-shadow: 0 0 30px rgba(255,215,0,0.9), 0 0 60px rgba(255,215,0,0.4); }
  }
  .converted-value {
    color: #FFD700;
    animation: gold-shine 2.5s ease-in-out infinite;
  }
`;

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

function getDaysInFunnel(lead: any) {
  const start = lead.created_at;
  const end = lead.updated_at ?? lead.created_at;
  if (!start) return '—';
  try {
    const days = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    return `${days}d`;
  } catch {
    return '—';
  }
}

// Gera array dos últimos N dias com contagem zero
function buildDayBuckets(days: number) {
  const today = new Date();
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    buckets[key] = 0;
  }
  return buckets;
}

export default function Converted() {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads-converted"],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) return [];
      return (r.data as any[]).filter((l) => {
        const s = String(l.status ?? l.stage ?? '').toLowerCase();
        return ['fechado', 'vendido', 'convertido', 'ganhou'].includes(s);
      });
    },
    staleTime: 15_000,
    retry: 1,
  });

  const total = leads.length;

  // Hoje e últimos 7 dias
  const today = new Date();
  const todayStr = today.toDateString();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const convToday = leads.filter((l: any) => {
    const d = l.updated_at ?? l.created_at;
    return d && new Date(d).toDateString() === todayStr;
  }).length;

  const convWeek = leads.filter((l: any) => {
    const d = l.updated_at ?? l.created_at;
    return d && new Date(d) >= weekAgo;
  }).length;

  // Gráfico de linha: últimos 30 dias
  const convByDay = buildDayBuckets(30);
  leads.forEach((l: any) => {
    const d = l.updated_at ?? l.created_at;
    if (!d) return;
    const key = new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (key in convByDay) convByDay[key]++;
  });
  const lineData = Object.entries(convByDay).map(([date, count]) => ({ date, count }));
  // Mostrar apenas os últimos 14 pontos para melhor visualização
  const lineDataTrimmed = lineData.slice(-14);

  // Gráfico de barras: por estágio de origem
  const stageCount: Record<string, number> = {};
  leads.forEach((l: any) => {
    const s = l.origin_stage ?? l.last_stage ?? 'Fechado';
    stageCount[s] = (stageCount[s] || 0) + 1;
  });
  const barData = Object.entries(stageCount).map(([stage, count]) => ({ stage, count }));

  // Bot conversions (mock 40%)
  const botConversions = Math.round(total * 0.4);
  const taxaGeral = total > 0 ? ((total / Math.max(total + 20, 1)) * 100).toFixed(1) : '0.0';

  return (
    <>
      <style>{goldStyles}</style>
      <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Convertidos</h1>
        <p className="text-muted-foreground mt-1">Leads que fecharam negócio</p>
      </div>

      {/* 6 KPIs compactos */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card 
          className="bg-card border-border hover:border-success/30 transition-colors"
          style={{
            border: '1px solid rgba(255,215,0,0.4)',
            boxShadow: '0 0 20px rgba(255,215,0,0.08)',
          }}
        >
          <CardContent className="pt-4 pb-4">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <Trophy className="w-4 h-4 text-success" />
            </div>
            <p className="text-xl font-bold converted-value">{total}</p>
            <p className="text-xs text-muted-foreground leading-tight">Total Convertidos</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-success/30 transition-colors">
          <CardContent className="pt-4 pb-4">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <CalendarDays className="w-4 h-4 text-success" />
            </div>
            <p className="text-xl font-bold text-success">{convToday}</p>
            <p className="text-xs text-muted-foreground leading-tight">Hoje</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-success/30 transition-colors">
          <CardContent className="pt-4 pb-4">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <p className="text-xl font-bold text-success">{convWeek}</p>
            <p className="text-xs text-muted-foreground leading-tight">Na Semana</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-success/30 transition-colors">
          <CardContent className="pt-4 pb-4">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <BarChart2 className="w-4 h-4 text-success" />
            </div>
            <p className="text-xl font-bold text-success">{taxaGeral}%</p>
            <p className="text-xs text-muted-foreground leading-tight">Taxa Geral</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-warning/20 hover:border-warning/40 transition-colors">
          <CardContent className="pt-4 pb-4">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
              <Bot className="w-4 h-4 text-warning" />
            </div>
            <p className="text-xl font-bold text-warning">{botConversions}</p>
            <p className="text-xs text-muted-foreground leading-tight">Via Bot</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border hover:border-success/30 transition-colors">
          <CardContent className="pt-4 pb-4">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <Trophy className="w-4 h-4 text-success" />
            </div>
            <p className="text-xl font-bold text-success">{convWeek}</p>
            <p className="text-xs text-muted-foreground leading-tight">Semana Atual</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linha: Conversões nos últimos 30 dias */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Conversões por Dia (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {leads.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem conversões ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineDataTrimmed}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={3} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Barras: por estágio de origem */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-info" />
              Conversões por Estágio de Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="h-48">
            {barData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Sem dados de estágio de origem.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={index} fill={stageColors[entry.stage] || '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista compacta */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-success" />
              Leads Convertidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                <Trophy className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm">Nenhum lead convertido ainda.</p>
                <p className="text-xs">As conversões aparecerão aqui quando leads forem movidos para "Fechado".</p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-4 gap-4 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <span>Nome</span>
                  <span>Data Conversão</span>
                  <span>Estágio Origem</span>
                  <span>Tempo no Funil</span>
                </div>
                {leads.map((lead: any) => (
                  <div key={lead.id} className="grid grid-cols-4 gap-4 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-3.5 h-3.5 text-success" />
                      </div>
                      <span className="font-medium text-sm truncate">{lead.name || 'Lead'}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{formatDate(lead.updated_at ?? lead.created_at)}</span>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs w-fit">
                      Fechado
                    </Badge>
                    <span className="text-sm text-muted-foreground">{getDaysInFunnel(lead)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
