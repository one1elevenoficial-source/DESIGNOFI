import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, Star, MessageSquare, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Lead, type LeadStage } from '@/lib/api';
import { cn } from '@/lib/utils';

type PipelineStage = LeadStage;

const stages: { id: PipelineStage; label: string; color: string; border: string; textColor: string }[] = [
  { id: 'Novo', label: 'Novo', color: 'bg-info', border: 'border-t-info/60', textColor: 'text-info' },
  { id: 'Em atendimento', label: 'Em Atendimento', color: 'bg-purple-500', border: 'border-t-purple-500/60', textColor: 'text-purple-400' },
  { id: 'Qualificado', label: 'Qualificado', color: 'bg-warning', border: 'border-t-warning/60', textColor: 'text-warning' },
  { id: 'Agendado', label: 'Agendado', color: 'bg-orange-500', border: 'border-t-orange-500/60', textColor: 'text-orange-400' },
  { id: 'Fechado', label: 'Fechado', color: 'bg-success', border: 'border-t-success/60', textColor: 'text-success' },
  { id: 'Perdido', label: 'Perdido', color: 'bg-destructive', border: 'border-t-destructive/60', textColor: 'text-destructive' },
];

function safeInitials(name?: string | null) {
  const n = String(name || 'Lead').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'L';
}

function normalizePipelineStage(input: any): PipelineStage {
  const raw = String(input ?? 'Novo').trim();
  if (
    raw === 'Novo' ||
    raw === 'Em atendimento' ||
    raw === 'Qualificado' ||
    raw === 'Agendado' ||
    raw === 'Fechado' ||
    raw === 'Perdido'
  ) return raw;

  const s = raw.toLowerCase();
  if (s === 'novo') return 'Novo';
  if (s === 'qualificando' || s === 'em atendimento' || s === 'atendimento') return 'Em atendimento';
  if (s === 'qualificado') return 'Qualificado';
  if (s === 'proposta') return 'Qualificado';
  if (s === 'follow-up' || s === 'follow up' || s === 'followup') return 'Agendado';
  if (s === 'agendado') return 'Agendado';
  if (s === 'fechado' || s === 'ganhou') return 'Fechado';
  if (s === 'perdido') return 'Perdido';
  return 'Novo';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString('pt-BR') +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return dateStr;
  }
}

function scoreColorClass(score: number) {
  if (score >= 70) return 'bg-success/10 text-success border-success/30';
  if (score >= 40) return 'bg-warning/10 text-warning border-warning/30';
  return 'bg-muted text-muted-foreground border-border';
}

export default function Pipeline() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ['leads', currentWorkspace.id],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) return [] as Lead[];
      return r.data ?? [];
    },
    staleTime: 10_000,
    retry: 1,
  });

  const updateStage = useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: string; stage: PipelineStage }) => {
      const r = await api.updateLeadStage(leadId, stage);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [lossModalOpen, setLossModalOpen] = useState(false);
  const [pendingLossLead, setPendingLossLead] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState<string>('');

  const leadsState = useMemo(() => {
    const raw = leadsQuery.data ?? [];
    return raw.map((l: any) => {
      const normalizedStage = normalizePipelineStage(l.stage ?? l.status ?? 'Novo');
      return {
        ...l,
        name: l.name ?? l.full_name ?? l.nome ?? 'Lead',
        phone: l.phone ?? l.number ?? l.whatsapp ?? '',
        stage: normalizedStage,
        score: typeof l.score === 'number' ? l.score : 50,
        lastMessage: l.lastMessage ?? l.last_message ?? l.last_message_text ?? '',
        lastMessageAt: l.lastMessageAt ?? l.last_message_at ?? l.updated_at ?? l.created_at ?? '',
        nextAction: l.nextAction ?? l.next_action ?? '',
        tags: Array.isArray(l.tags) ? l.tags : [],
        needsFollowUp: !!(l.needsFollowUp ?? l.needs_follow_up),
        source: l.source ?? l.origem ?? '—',
        daysInStage: (() => {
          const updated = l.updated_at ?? l.last_message_at ?? l.created_at;
          if (!updated) return 0;
          return Math.floor((Date.now() - new Date(updated).getTime()) / 86400000);
        })(),
      };
    }) as any[];
  }, [leadsQuery.data]);

  const getLeadsByStage = (stage: PipelineStage) =>
    leadsState.filter((l) => normalizePipelineStage(l.stage ?? 'Novo') === stage);

  const handleDragStart = (leadId: string) => setDraggedLead(leadId);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (stage: PipelineStage) => {
    if (!draggedLead) return;
    if (stage === 'Perdido') {
      setPendingLossLead(draggedLead);
      setLossModalOpen(true);
      setDraggedLead(null);
      return;
    }
    updateStage.mutate({ leadId: draggedLead, stage });
    setDraggedLead(null);
  };

  const confirmLoss = async () => {
    if (!pendingLossLead) return;
    await api.updateLeadStage(pendingLossLead, 'Perdido');
    qc.invalidateQueries({ queryKey: ['leads'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
    setLossModalOpen(false);
    setPendingLossLead(null);
    setLossReason('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Pipeline</h1>
          <p className="text-muted-foreground mt-1">Visualize e gerencie seu funil</p>
        </div>
      </div>

      {leadsQuery.isLoading && (
        <div className="text-center text-muted-foreground py-8">Carregando leads...</div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          return (
            <div
              key={stage.id}
              className={cn('kanban-column flex-shrink-0 border-t-2', stage.border)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                  <h3 className={cn('font-semibold', stage.textColor)}>{stage.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {stageLeads.length}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Column stats */}
              <p className="text-[10px] text-muted-foreground mb-3">
                {stageLeads.length} leads · — hoje · — mês
              </p>

              {/* Cards */}
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-2">
                  {stageLeads.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-6 border border-dashed border-border rounded-lg">
                      Nenhum lead aqui
                    </div>
                  )}
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead.id)}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className={cn('kanban-card', draggedLead === lead.id && 'opacity-50')}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-semibold text-primary">
                              {safeInitials(lead.name)}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-foreground">{lead.name}</h4>
                            <p className="text-xs text-muted-foreground">{lead.phone}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5 py-0 border', scoreColorClass(lead.score))}
                          >
                            {lead.score}
                          </Badge>
                        </div>
                      </div>

                      {/* Tempo no estágio - sempre visível */}
                      <div className="flex items-center gap-1 mb-2">
                        <span className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          lead.daysInStage >= 3 && lead.stage !== 'Fechado' && lead.stage !== 'Perdido'
                            ? 'text-warning bg-warning/10'
                            : 'text-muted-foreground bg-secondary'
                        )}>
                          ⏱ {lead.daysInStage === 0 ? 'hoje' : `${lead.daysInStage}d neste estágio`}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {lead.lastMessage || '—'}
                      </p>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDate(lead.lastMessageAt)}
                        </div>
                        {lead.needsFollowUp && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-warning/10 text-warning border-warning/30">
                            Follow-up
                          </Badge>
                        )}
                      </div>

                      {lead.tags.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {lead.tags.slice(0, 2).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Lead Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {safeInitials(selectedLead?.name)}
                </span>
              </div>
              {selectedLead?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Telefone</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.phone}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Origem</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.source}</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Score</p>
                  <p className="text-sm font-medium text-foreground">{selectedLead.score}/100</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Última Atividade</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(selectedLead.lastMessageAt)}</p>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Histórico Follow-up</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-foreground">D+0 - Contato inicial</span>
                    <Badge variant="secondary" className="text-[10px]">Enviado</Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 btn-premium">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Abrir Chat
                </Button>
                <Button variant="outline" className="flex-1 border-border text-muted-foreground">
                  Editar Lead
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Motivo de Perda */}
      <Dialog open={lossModalOpen} onOpenChange={(open) => { if (!open) { setLossModalOpen(false); setPendingLossLead(null); setLossReason(''); } }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <span>⚠️</span> Por que perdeu este lead?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {['Preço muito alto', 'Escolheu concorrente', 'Sem interesse', 'Sem resposta', 'Não era o decisor', 'Outro'].map((reason) => (
              <button
                key={reason}
                onClick={() => setLossReason(reason)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors text-sm ${
                  lossReason === reason
                    ? 'bg-destructive/10 border-destructive/50 text-destructive font-medium'
                    : 'bg-secondary/50 border-border text-foreground hover:bg-secondary'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setLossModalOpen(false); setPendingLossLead(null); setLossReason(''); }}
              className="flex-1 px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={confirmLoss}
              disabled={!lossReason}
              className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50"
            >
              Confirmar Perda
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
