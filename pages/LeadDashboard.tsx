import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MessageCircle,
  Heat,
  Clock,
  TrendingUp,
  DollarSign,
  Zap,
  Send,
  User,
  Calendar,
  AlertCircle,
  Lightbulb,
  Phone,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const STAGES = [
  { id: 'novo', label: 'Novo', order: 0 },
  { id: 'em_atendimento', label: 'Em Atendimento', order: 1 },
  { id: 'qualificado', label: 'Qualificado', order: 2 },
  { id: 'agendado', label: 'Agendado', order: 3 },
  { id: 'pos_venda', label: 'Cliente', order: 4 },
];

const TEMPERATURE_CONFIG = {
  quente: { label: '🔥 Quente', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  morno: { label: '🌡️ Morno', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
  frio: { label: '❄️ Frio', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
};

interface Lead {
  id: string;
  name?: string;
  phone?: string;
  stage?: string;
  score?: number;
  lead_temperature?: string;
  urgency_level?: string;
  intent?: string;
  pain?: string;
  notes?: string;
  objections?: string;
  human_attending?: boolean;
  human_attending_by?: string;
  human_attending_since?: string;
  last_message_at?: string;
  created_at?: string;
  upsell_opportunity?: boolean;
  chance_de_venda?: number;
  priority_score?: number;
  scheduled_at?: string;
  ai_reasoning?: string;
}

interface Message {
  id: string;
  body?: string;
  direction?: string;
  created_at?: string;
  type?: string;
}

interface FunnelPrediction {
  conversion_probability?: number;
  predicted_days_to_close?: number;
  predicted_revenue?: number;
  recommended_action?: string;
  action_urgency?: string;
}

interface MemoryProfile {
  engagement_score?: number;
  buying_momentum?: number;
  trust_score?: number;
  resistance_index?: number;
  conversation_energy?: number;
  interaction_count?: number;
  last_strategy_used?: string;
}

interface Knowledge {
  category?: string;
  key?: string;
  value?: string;
}

interface Insight {
  insight_type?: string;
  content?: string;
  importance?: string;
  created_at?: string;
}

export default function LeadDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [prediction, setPrediction] = useState<FunnelPrediction | null>(null);
  const [memory, setMemory] = useState<MemoryProfile | null>(null);
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    loadLeadData();
  }, [id, currentWorkspace.id]);

  const loadLeadData = async () => {
    if (!id || !currentWorkspace?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [leadRes, messagesRes, predictionRes, memoryRes, knowledgeRes, insightsRes] =
        await Promise.all([
          supabase.from('leads').select('*').eq('id', id).single(),
          supabase
            .from('messages')
            .select('*')
            .eq('lead_id', id)
            .order('created_at', { ascending: false })
            .limit(15),
          supabase.from('funnel_predictions').select('*').eq('lead_id', id).single(),
          supabase.from('ai_memory_profiles').select('*').eq('lead_id', id).single(),
          supabase.from('lead_knowledge').select('*').eq('lead_id', id),
          supabase
            .from('lead_insights')
            .select('*')
            .eq('lead_id', id)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

      if (leadRes.error && leadRes.error.code !== 'PGRST116') throw leadRes.error;
      if (messagesRes.error && messagesRes.error.code !== 'PGRST116') throw messagesRes.error;

      setLead(leadRes.data || null);
      setMessages((messagesRes.data || []).reverse());
      setPrediction(predictionRes.data || null);
      setMemory(memoryRes.data || null);
      setKnowledge(knowledgeRes.data || []);
      setInsights(insightsRes.data || []);

      if (!leadRes.data) {
        setError('Lead não encontrado');
      }
    } catch (err) {
      console.error('Erro ao carregar lead:', err);
      setError('Erro ao carregar dados do lead');
      toast({ title: 'Erro', description: 'Não foi possível carregar os dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferToHuman = async () => {
    if (!lead?.id) return;

    try {
      setTransferring(true);

      await supabase
        .from('leads')
        .update({
          human_attending: true,
          human_attending_by: profile?.full_name || 'Atendente',
          human_attending_since: new Date().toISOString(),
        })
        .eq('id', lead.id);

      await supabase.from('handoff_log').insert({
        lead_id: lead.id,
        triggered_by: 'manual',
        action: 'handoff',
        agent_name: profile?.full_name || 'Atendente',
      });

      toast({ title: 'Sucesso', description: 'Lead transferido para atendimento humano' });
      loadLeadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível transferir o lead', variant: 'destructive' });
    } finally {
      setTransferring(false);
    }
  };

  const handleReturnToBot = async () => {
    if (!lead?.id) return;

    try {
      await supabase
        .from('leads')
        .update({
          human_attending: false,
          human_attending_by: null,
          human_attending_since: null,
        })
        .eq('id', lead.id);

      toast({ title: 'Sucesso', description: 'Lead devolvido para o bot' });
      loadLeadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível devolver o lead', variant: 'destructive' });
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!lead?.id) return;

    try {
      await supabase.from('leads').update({ stage: newStage }).eq('id', lead.id);

      await supabase.from('events').insert({
        lead_id: lead.id,
        type: 'stage_change',
        data: JSON.stringify({ from: lead.stage, to: newStage }),
      });

      toast({ title: 'Sucesso', description: `Lead movido para ${newStage}` });
      loadLeadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro', description: 'Não foi possível mudar o stage', variant: 'destructive' });
    }
  };

  const copyPhone = () => {
    if (lead?.phone) {
      navigator.clipboard.writeText(lead.phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copiado!', description: 'Telefone copiado para a área de transferência' });
    }
  };

  // Cálculos
  const temperature = (lead?.lead_temperature || 'frio').toLowerCase();
  const tempConfig = TEMPERATURE_CONFIG[temperature as keyof typeof TEMPERATURE_CONFIG] || TEMPERATURE_CONFIG.frio;
  const score = lead?.score || 0;
  const conversion = prediction?.conversion_probability
    ? Math.round(prediction.conversion_probability * 100)
    : Math.min(100, Math.round((score / 100) * 80));
  const daysInFunnel = lead?.created_at
    ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const revenue = prediction?.predicted_revenue || (score > 70 ? 1297 : score > 40 ? 648 : 0);

  const timeSinceLastContact = useMemo(() => {
    if (!lead?.last_message_at) return 'Sem contato';
    const date = new Date(lead.last_message_at);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diff < 1) return 'Agora';
    if (diff < 60) return `Há ${diff}m`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Há ${days}d`;
  }, [lead?.last_message_at]);

  const currentStageOrder = STAGES.find((s) => s.id === lead?.stage)?.order ?? 0;

  // Alertas
  const alerts = useMemo(() => {
    const result = [];

    if (lead?.last_message_at) {
      const hoursAgo = Math.floor((Date.now() - new Date(lead.last_message_at).getTime()) / (1000 * 60 * 60));
      if (hoursAgo > 96) {
        result.push({ type: 'critical', text: `Parado há ${Math.floor(hoursAgo / 24)} dias` });
      } else if (hoursAgo > 48) {
        result.push({ type: 'warning', text: `Parado há ${hoursAgo}h` });
      }
    }

    if (lead?.scheduled_at) {
      const scheduled = new Date(lead.scheduled_at);
      if (scheduled > new Date()) {
        const daysUntil = Math.floor((scheduled.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        result.push({
          type: 'info',
          text: `Reunião: ${scheduled.toLocaleDateString('pt-BR')} às ${scheduled.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        });
      }
    }

    if (lead?.human_attending) {
      result.push({ type: 'info', text: `Em atendimento: ${lead.human_attending_by || 'Atendente'}` });
    }

    if (lead?.upsell_opportunity) {
      result.push({ type: 'success', text: 'Oportunidade de upsell' });
    }

    return result;
  }, [lead]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Card className="bg-card/50 border-border">
          <CardContent className="flex flex-col items-center justify-center h-40 gap-4">
            <AlertTriangle className="w-12 h-12 text-destructive" />
            <p className="text-foreground font-medium">{error || 'Lead não encontrado'}</p>
            <Button variant="outline" onClick={() => navigate('/leads')}>
              Voltar para Leads
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className={cn('w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold', tempConfig.bg)}>
              {lead.name
                ?.split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase() || 'L'}
            </div>

            {/* Lead Info */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{lead.name || 'Lead'}</h1>
                <Badge className={cn('border', tempConfig.bg, tempConfig.border)}>
                  {tempConfig.label}
                </Badge>
                {lead.stage && (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {STAGES.find((s) => s.id === lead.stage)?.label || lead.stage}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <code className="font-mono">{lead.phone || 'N/A'}</code>
                  {lead.phone && (
                    <Button variant="ghost" size="sm" onClick={copyPhone}>
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {timeSinceLastContact}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Criado há{' '}
                  {Math.floor((Date.now() - new Date(lead.created_at || '').getTime()) / (1000 * 60 * 60 * 24))}d
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          {lead.phone && (
            <Button
              variant="outline"
              className="border-primary/30 text-primary hover:bg-primary/10"
              asChild
            >
              <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-2" />
                Abrir WhatsApp
              </a>
            </Button>
          )}

          {!lead.human_attending ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={transferring}>
                  <User className="w-4 h-4 mr-2" />
                  Transferir p/ Humano
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Transferir para atendimento humano?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O lead será atribuído a você para atendimento manual. A IA não mais interromperá.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogAction onClick={handleTransferToHuman} disabled={transferring}>
                  {transferring ? 'Transferindo...' : 'Confirmar'}
                </AlertDialogAction>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="destructive" onClick={handleReturnToBot}>
              <Zap className="w-4 h-4 mr-2" />
              Devolver ao Bot
            </Button>
          )}
        </div>
      </div>

      {/* Barra do Funil */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-2">
            {STAGES.map((stage, idx) => {
              const isCurrentOrPast = idx <= currentStageOrder;
              const isCurrent = stage.id === lead.stage;

              return (
                <div key={stage.id} className="flex-1 flex items-center gap-2">
                  <div
                    className={cn(
                      'flex-1 h-2 rounded-full transition-all',
                      isCurrent
                        ? 'bg-primary shadow-[0_0_12px_rgba(0,232,94,0.5)]'
                        : isCurrentOrPast
                          ? 'bg-primary/40'
                          : 'bg-border/50'
                    )}
                  />
                  {idx < STAGES.length - 1 && (
                    <ChevronRight
                      className={cn('w-4 h-4 flex-shrink-0', isCurrentOrPast ? 'text-primary' : 'text-muted-foreground')}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between gap-2 mt-2 text-xs">
            {STAGES.map((stage) => (
              <span
                key={stage.id}
                className={cn(
                  'font-medium',
                  stage.id === lead.stage ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {stage.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Score */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">Score</p>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
                {score}
              </p>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    score >= 71 ? 'bg-success' : score >= 41 ? 'bg-warning' : 'bg-destructive'
                  )}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversão */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">Conversão</p>
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
                {conversion}%
              </p>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${conversion}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dias no Funil */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">Dias no Funil</p>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
                {daysInFunnel}
              </p>
              <p className="text-xs text-muted-foreground">
                {prediction?.predicted_days_to_close
                  ? `${prediction.predicted_days_to_close} dias para fechar`
                  : 'Sem previsão'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Receita */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">Receita</p>
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <p className="text-3xl font-bold" style={{ color: '#FFD700' }}>
                R$ {(revenue / 100).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">Prevista</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2 Colunas: Conteúdo + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda (60%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* O que a IA sabe */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" />
                O que a IA sabe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.pain && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Dor Principal</p>
                  <p className="text-sm text-foreground">{lead.pain}</p>
                </div>
              )}

              {lead.intent && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Intenção</p>
                  <p className="text-sm text-foreground">{lead.intent}</p>
                </div>
              )}

              {lead.objections && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Objeções Detectadas</p>
                  <div className="flex flex-wrap gap-2">
                    {lead.objections.split(',').map((obj, idx) => (
                      <Badge key={idx} variant="outline" className="border-warning/30 text-warning">
                        {obj.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {prediction?.recommended_action && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Estratégia Recomendada</p>
                  <p className="text-sm text-foreground font-medium text-primary">{prediction.recommended_action}</p>
                </div>
              )}

              {prediction?.action_urgency && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Urgência</p>
                  <Badge
                    className={cn(
                      'border',
                      prediction.action_urgency === 'HIGH'
                        ? 'bg-destructive/20 text-destructive border-destructive/30'
                        : prediction.action_urgency === 'MEDIUM'
                          ? 'bg-warning/20 text-warning border-warning/30'
                          : 'bg-success/20 text-success border-success/30'
                    )}
                  >
                    {prediction.action_urgency}
                  </Badge>
                </div>
              )}

              {lead.ai_reasoning && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Análise da IA</p>
                  <p className="text-sm text-muted-foreground italic">{lead.ai_reasoning}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Mensagens */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Histórico de Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda</p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {messages.map((msg) => {
                    const isInbound = msg.direction === 'inbound' || msg.direction === 'in';
                    const createdAt = new Date(msg.created_at || '');
                    const timeStr = createdAt.toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div key={msg.id} className={cn('flex', isInbound ? 'justify-start' : 'justify-end')}>
                        <div
                          className={cn(
                            'max-w-xs px-4 py-2 rounded-2xl text-sm',
                            isInbound
                              ? 'bg-secondary text-foreground'
                              : 'bg-primary/20 text-primary border border-primary/30'
                          )}
                        >
                          {msg.type === 'audio' && (
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              <span>[Áudio]</span>
                            </div>
                          )}
                          {msg.type === 'image' && (
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              <span>[Imagem]</span>
                            </div>
                          )}
                          {msg.type !== 'audio' && msg.type !== 'image' && msg.body && (
                            <p>{msg.body}</p>
                          )}
                          <p className={cn('text-xs mt-1 opacity-70', isInbound ? 'text-muted-foreground' : '')}>
                            {timeStr}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita (40%) */}
        <div className="space-y-6">
          {/* Perfil Cognitivo */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Perfil Cognitivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {memory ? (
                <>
                  <ProgressBar label="Engajamento" value={memory.engagement_score || 0} />
                  <ProgressBar label="Confiança" value={memory.trust_score || 0} />
                  <ProgressBar label="Momentum" value={memory.buying_momentum || 0} />
                  <ProgressBar label="Resistência" value={memory.resistance_index || 0} isNegative />
                  <ProgressBar label="Energia" value={memory.conversation_energy || 0} />

                  {memory.interaction_count && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Interações totais: <strong>{memory.interaction_count}</strong>
                      </p>
                    </div>
                  )}

                  {memory.last_strategy_used && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Última estratégia: <strong>{memory.last_strategy_used}</strong>
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Perfil em construção...</p>
              )}
            </CardContent>
          </Card>

          {/* Base de Conhecimento */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                O que sabemos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {knowledge.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma informação estruturada ainda</p>
              ) : (
                <div className="space-y-2">
                  {knowledge.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 py-2 border-b border-border/50 last:border-0">
                      <span className="text-xs font-mono bg-secondary px-2 py-1 rounded text-primary flex-shrink-0">
                        [{item.category}]
                      </span>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground font-medium">{item.key}</p>
                        <p className="text-sm text-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alertas */}
          {alerts.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-warning" />
                  Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex items-start gap-2 p-2 rounded-lg text-sm',
                      alert.type === 'critical'
                        ? 'bg-destructive/10 text-destructive'
                        : alert.type === 'warning'
                          ? 'bg-warning/10 text-warning'
                          : alert.type === 'success'
                            ? 'bg-success/10 text-success'
                            : 'bg-info/10 text-info'
                    )}
                  >
                    <span className="flex-shrink-0">
                      {alert.type === 'critical' && '🔴'}
                      {alert.type === 'warning' && '🟡'}
                      {alert.type === 'success' && '✓'}
                      {alert.type === 'info' && 'ℹ️'}
                    </span>
                    <span>{alert.text}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-2 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        'flex-shrink-0 border',
                        insight.importance === 'HIGH'
                          ? 'bg-destructive/10 text-destructive border-destructive/30'
                          : insight.importance === 'MEDIUM'
                            ? 'bg-warning/10 text-warning border-warning/30'
                            : 'bg-info/10 text-info border-info/30'
                      )}
                    >
                      {insight.importance}
                    </Badge>
                    <p className="text-sm text-foreground">{insight.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Change Stage */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Mudar Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={lead.stage || 'novo'} onValueChange={handleStageChange}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {STAGES.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, isNegative }: { label: string; value: number; isNegative?: boolean }) {
  const percentage = Math.min(100, Math.max(0, value));
  const color = isNegative
    ? percentage > 70
      ? 'bg-destructive'
      : percentage > 40
        ? 'bg-warning'
        : 'bg-success'
    : percentage > 70
      ? 'bg-success'
      : percentage > 40
        ? 'bg-warning'
        : 'bg-destructive';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <span className="text-xs font-semibold text-foreground">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
