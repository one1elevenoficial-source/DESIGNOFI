import { useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Send, Image, Mic, MoreHorizontal, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type Lead, type Message } from '@/lib/api';
import { supabase } from '@/lib/supabase';

type Conversation = {
  id: string;
  leadName: string;
  leadPhone: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  tags: string[];
  stage?: string;
  createdAt?: string;
};

type FilterTab = 'all' | 'active' | 'waiting' | 'resolved';

const filterLabels: Record<FilterTab, string> = {
  all: 'Todos',
  active: 'Ativos',
  waiting: 'Aguardando',
  resolved: 'Resolvidos',
};

const stageColors: Record<string, string> = {
  Novo: 'bg-info/10 text-info border-info/30',
  'Em atendimento': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Qualificado: 'bg-warning/10 text-warning border-warning/30',
  Agendado: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Fechado: 'bg-success/10 text-success border-success/30',
  Perdido: 'bg-destructive/10 text-destructive border-destructive/30',
};

function safeInitials(name?: string | null) {
  const n = String(name || 'Lead').trim();
  const parts = n.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'L';
}

export default function Inbox() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selected, setSelected] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [summary, setSummary] = useState<{
    context: string;
    objection: string | null;
    tone: string;
    hoursWithoutResponse: number;
  } | null>(null);

  const leadsQuery = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) return [] as Lead[];
      return r.data ?? [];
    },
    staleTime: 10_000,
    retry: 1,
  });

  const conversations: Conversation[] = useMemo(() => {
    const leads = (leadsQuery.data ?? []) as any[];
    return leads.map((l: any) => ({
      id: String(l.id),
      leadName: String(l.name ?? l.full_name ?? l.nome ?? 'Lead'),
      leadPhone: String(l.phone ?? l.whatsapp ?? l.numero ?? ''),
      lastMessage: String(l.last_message ?? l.lastMessage ?? l.last_message_text ?? '') || 'Nenhuma mensagem',
      lastMessageAt: String(l.last_message_at ?? l.updated_at ?? l.created_at ?? ''),
      unread: Number(l.unread ?? 0),
      tags: Array.isArray(l.tags) ? l.tags : [],
      stage: String(l.status ?? l.stage ?? 'Novo'),
      createdAt: String(l.created_at ?? ''),
    }));
  }, [leadsQuery.data]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        (!q ||
          c.leadName.toLowerCase().includes(q) ||
          c.leadPhone.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery, activeFilter]);

  const leadIdFromUrl = searchParams.get('lead_id');
  const selectedId = useMemo(() => {
    if (leadIdFromUrl) return leadIdFromUrl;
    if (selected) return selected;
    return conversations[0]?.id ?? null;
  }, [leadIdFromUrl, selected, conversations]);

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    return conversations.find((c) => c.id === selectedId) ?? null;
  }, [conversations, selectedId]);

  const messagesQuery = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: async () => {
      const r = await api.messages(selectedConversation!.id);
      if (!r.ok) return [] as Message[];
      return r.data ?? [];
    },
    enabled: !!selectedConversation?.id,
    staleTime: 5_000,
    retry: 1,
  });

  const sendMutation = useMutation({
    mutationFn: async ({ leadId, body }: { leadId: string; body: string }) => {
      const r = await api.sendMessage(leadId, body);
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['messages', vars.leadId] });
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    },
  });

  const messages: any[] = (messagesQuery.data ?? []) as any[];

  useEffect(() => {
    if (!messagesQuery.data || messagesQuery.data.length === 0) {
      setSummary(null);
      return;
    }
    const msgs = messagesQuery.data as any[];
    const lastMsg = msgs[msgs.length - 1];
    const inboundMsgs = msgs.filter((m) => m.direction === 'in');
    const allInbound = inboundMsgs.map((m) => String(m.body || '')).join(' ').toLowerCase();

    let tone = 'neutro';
    if (/urgente|hoje|agora|rápido/.test(allInbound)) tone = 'apressado';
    else if (/como funciona|detalhe|explica|processo/.test(allInbound)) tone = 'analítico';
    else if (/quero|preciso|sonho|família/.test(allInbound)) tone = 'emocional';

    let objection: string | null = null;
    if (/caro|valor|preço|desconto/.test(allInbound)) objection = 'Sensível a preço';
    else if (/pensar|depois|semana|não sei/.test(allInbound)) objection = 'Indeciso';
    else if (/concorrente|outro|comparar/.test(allInbound)) objection = 'Comparando concorrentes';

    const lastMsgDate = lastMsg?.created_at ? new Date(lastMsg.created_at) : null;
    const hoursWithoutResponse = lastMsgDate
      ? Math.floor((Date.now() - lastMsgDate.getTime()) / 3600000)
      : 0;

    const lastFew = inboundMsgs.slice(-3).map((m) => m.body || '').join(' ');
    const context = lastFew.length > 120 ? lastFew.slice(0, 120) + '...' : lastFew || 'Sem mensagens do lead ainda.';

    setSummary({ context, objection, tone, hoursWithoutResponse });
  }, [messagesQuery.data]);

  const handleTransferToHuman = async (leadId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('user_profiles').select('full_name').eq('id', user!.id).single();
    await supabase.from('leads').update({
      human_attending:       true,
      human_attending_by:    profile?.full_name || 'Atendente',
      human_attending_since: new Date().toISOString(),
    }).eq('id', leadId);
    await supabase.from('handoff_log').insert({
      lead_id:      leadId,
      triggered_by: 'manual',
      action:       'handoff',
      agent_name:   profile?.full_name || 'Atendente',
    }).maybeSingle();
    qc.invalidateQueries({ queryKey: ['leads'] });
  };

  const handleReturnToBot = async (leadId: string) => {
    await supabase.from('leads').update({
      human_attending:       false,
      human_attending_by:    null,
      human_attending_since: null,
    }).eq('id', leadId);
    qc.invalidateQueries({ queryKey: ['leads'] });
  };

  const handleResolve = async (leadId: string) => {
    await supabase.from('leads')
      .update({ conversation_status: 'resolved' })
      .eq('id', leadId);
    qc.invalidateQueries({ queryKey: ['leads'] });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6 animate-fade-in">
      {/* Conversations List */}
      <div className="w-96 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              className="pl-10 bg-secondary border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Filtros traduzidos */}
          <div className="flex gap-2">
            {(Object.keys(filterLabels) as FilterTab[]).map((f) => (
              <Badge
                key={f}
                variant={activeFilter === f ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer',
                  activeFilter === f
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'hover:bg-secondary/80 border-border text-muted-foreground'
                )}
                onClick={() => setActiveFilter(f)}
              >
                {filterLabels[f]}
              </Badge>
            ))}
          </div>
        </div>

        {/* Conversations */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {leadsQuery.isLoading && (
              <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
            )}
            {!leadsQuery.isLoading && filteredConversations.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center py-8">Nenhuma conversa.</div>
            )}
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelected(conv.id)}
                onDoubleClick={() => navigate(`/leads/${conv.id}`)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                  selectedConversation?.id === conv.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-secondary/50'
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-sm font-semibold text-foreground">
                      {safeInitials(conv.leadName)}
                    </span>
                  </div>
                  {conv.unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground truncate">{conv.leadName}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleString('pt-BR') : ''}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {/* Badge de estágio */}
                    {conv.stage && (
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0 border',
                          stageColors[conv.stage] || 'border-border text-muted-foreground'
                        )}
                      >
                        {conv.stage}
                      </Badge>
                    )}
                    {conv.tags.slice(0, 1).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary">
                  {safeInitials(selectedConversation.leadName)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{selectedConversation.leadName}</h3>
                <p className="text-xs text-muted-foreground">{selectedConversation.leadPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mini card compacto com dados do lead */}
              {selectedConversation.stage && (
                <Badge
                  variant="outline"
                  className={cn(
                    'border text-xs',
                    stageColors[selectedConversation.stage] || 'border-border text-muted-foreground'
                  )}
                >
                  {selectedConversation.stage}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground border-border gap-1"
                onClick={() => navigate('/pipeline')}
              >
                <ExternalLink className="w-4 h-4" />
                Ver no Pipeline
              </Button>
              <Button variant="outline" size="sm" className="text-muted-foreground border-border">
                <UserPlus className="w-4 h-4 mr-2" />
                Transferir
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border w-48">
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-sm"
                    onClick={() => navigate(`/leads/${selectedConversation.id}`)}
                  >
                    📋 Ver perfil completo
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-sm"
                    onClick={() => handleTransferToHuman(selectedConversation.id)}
                  >
                    👤 Transferir para humano
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-sm"
                    onClick={() => handleReturnToBot(selectedConversation.id)}
                  >
                    🤖 Devolver ao bot
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem
                    className="cursor-pointer gap-2 text-sm text-success focus:text-success"
                    onClick={() => handleResolve(selectedConversation.id)}
                  >
                    ✅ Marcar como resolvido
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mini card: dados do lead */}
          <div className="mx-4 mt-3 p-3 bg-secondary/40 border border-border rounded-lg flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>📅 Entrada: {selectedConversation.createdAt ? new Date(selectedConversation.createdAt).toLocaleDateString('pt-BR') : '—'}</span>
            <span>📍 Estágio: <strong className="text-foreground">{selectedConversation.stage || '—'}</strong></span>
            {selectedConversation.tags.length > 0 && (
              <span>🏷️ Tags: {selectedConversation.tags.join(', ')}</span>
            )}
          </div>

          {/* Resumo inteligente */}
          {summary && (
            <div className="mx-4 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">📋 Resumo do Lead</span>
                {summary.hoursWithoutResponse > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    summary.hoursWithoutResponse > 24
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {summary.hoursWithoutResponse}h sem resposta
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">"{summary.context}"</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-secondary rounded-full">
                  Tom: <strong>{summary.tone}</strong>
                </span>
                {summary.objection && (
                  <span className="text-xs px-2 py-1 bg-warning/10 text-warning rounded-full">
                    ⚠️ {summary.objection}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((m) => {
                const direction = String((m as any).direction ?? (m as any).dir ?? 'out');
                const mine = direction !== 'in';
                const body = String((m as any).body ?? (m as any).text ?? (m as any).content ?? '');
                const createdAt = (m as any).created_at ?? (m as any).createdAt ?? null;

                return (
                  <div key={String((m as any).id ?? `${createdAt}-${body.slice(0, 8)}`)} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[75%] rounded-2xl px-4 py-2 text-sm', mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground')}>
                      <div>{body}</div>
                      <div className={cn('mt-1 text-[10px] opacity-70', mine ? 'text-primary-foreground' : 'text-muted-foreground')}>
                        {createdAt ? new Date(createdAt).toLocaleTimeString('pt-BR') : ''}
                      </div>
                    </div>
                  </div>
                );
              })}

              {messagesQuery.isLoading && (
                <div className="text-sm text-muted-foreground">Carregando mensagens...</div>
              )}
              {!messagesQuery.isLoading && messages.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda.</div>
              )}
            </div>
          </ScrollArea>

          {/* Composer */}
          <div className="p-4 border-t border-border">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="bg-secondary border-border"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (!messageInput.trim()) return;
                      sendMutation.mutate({ leadId: selectedConversation.id, body: messageInput.trim() });
                      setMessageInput('');
                    }
                  }}
                />
              </div>

              <Button variant="outline" size="icon" className="border-border text-muted-foreground">
                <Image className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="border-border text-muted-foreground">
                <Mic className="w-4 h-4" />
              </Button>

              <Button
                onClick={() => {
                  if (!messageInput.trim()) return;
                  sendMutation.mutate({ leadId: selectedConversation.id, body: messageInput.trim() });
                  setMessageInput('');
                }}
                disabled={sendMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-card border border-border rounded-xl">
          <div className="text-muted-foreground">Selecione uma conversa</div>
        </div>
      )}
    </div>
  );
}
