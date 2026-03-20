import { useMemo, useState } from 'react';
import { Search, MoreHorizontal, Phone, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type UIStage =
  | 'novo'
  | 'em_atendimento'
  | 'qualificado'
  | 'agendado'
  | 'fechado'
  | 'perdido';

type LeadUI = {
  id: string;
  name: string;
  phone: string;
  stage: UIStage;
  source?: string | null;
  score?: number | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  responsible?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const stageColors: Record<UIStage, string> = {
  novo: 'bg-info/10 text-info border-info/30',
  em_atendimento: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  qualificado: 'bg-warning/10 text-warning border-warning/30',
  agendado: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  fechado: 'bg-success/10 text-success border-success/30',
  perdido: 'bg-destructive/10 text-destructive border-destructive/30',
};

const stageLabels: Record<UIStage, string> = {
  novo: 'Novo',
  em_atendimento: 'Em Atendimento',
  qualificado: 'Qualificado',
  agendado: 'Agendado',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

const stageFilters: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'novo', label: 'Novo' },
  { key: 'em_atendimento', label: 'Em Atendimento' },
  { key: 'qualificado', label: 'Qualificado' },
  { key: 'agendado', label: 'Agendado' },
  { key: 'fechado', label: 'Fechado' },
  { key: 'perdido', label: 'Perdido' },
];

function statusToStage(statusRaw: any): UIStage {
  const s = String(statusRaw || '').trim().toLowerCase();
  if (s === 'novo') return 'novo';
  if (s === 'qualificando' || s === 'qualificado' || s === 'em atendimento' || s === 'em_atendimento') return s === 'qualificado' ? 'qualificado' : 'em_atendimento';
  if (s === 'proposta') return 'qualificado';
  if (s === 'follow-up' || s === 'follow up' || s === 'followup' || s === 'agendado') return 'agendado';
  if (s === 'fechado' || s === 'ganhou' || s === 'convertido' || s === 'vendido') return 'fechado';
  if (s === 'perdido') return 'perdido';
  return 'novo';
}

function scoreColorClass(score: number) {
  if (score >= 70) return 'bg-success/10 text-success border-success/30';
  if (score >= 40) return 'bg-warning/10 text-warning border-warning/30';
  return 'bg-muted text-muted-foreground border-border';
}

export default function Leads() {
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');

  const { data: rawLeads = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leads', currentWorkspace?.id],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) throw new Error((r as any).error ?? 'API error');
      return r.data ?? [];
    },
    enabled: Boolean(currentWorkspace?.id),
    staleTime: 10_000,
    retry: 1,
  });

  const allLeads: LeadUI[] = useMemo(() => {
    return (rawLeads as any[]).map((l) => ({
      id: String(l?.id),
      name: String(l?.name || '').trim() || 'Sem nome',
      phone: String(l?.phone || '').trim() || '-',
      stage: statusToStage(l?.status ?? l?.stage ?? 'Novo'),
      status: String(l?.status || ''),
      created_at: l?.created_at ?? null,
      source: l?.source ?? null,
      score: l?.score ?? null,
      lastMessage: l?.last_message ?? l?.lastMessage ?? null,
      lastMessageAt: l?.last_message_at ?? l?.lastMessageAt ?? null,
      responsible: l?.responsible ?? null,
    }));
  }, [rawLeads]);

  const filteredLeads = useMemo(() => {
    return allLeads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(lead.phone || '').includes(searchQuery);
      const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [allLeads, searchQuery, stageFilter]);

  const columns = [
    {
      key: 'name',
      header: 'Lead',
      render: (item: LeadUI) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">
              {item.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </span>
          </div>
          <div>
            <div className="font-medium text-foreground">{item.name}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {item.phone}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Estágio',
      render: (item: LeadUI) => (
        <Badge variant="outline" className={cn('border', stageColors[item.stage])}>
          {stageLabels[item.stage]}
        </Badge>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      render: (item: LeadUI) => {
        const s = Number(item.score ?? 0);
        return (
          <Badge variant="outline" className={cn('border font-bold', scoreColorClass(s))}>
            {s}
          </Badge>
        );
      },
    },
    {
      key: 'lastMessage',
      header: 'Última Mensagem',
      render: (item: LeadUI) => (
        <div className="max-w-[200px]">
          <p className="text-sm text-foreground truncate">{item.lastMessage || item.lastMessage || '—'}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {item.lastMessageAt ? new Date(item.lastMessageAt).toLocaleDateString('pt-BR') : '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (item: LeadUI) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
            <DropdownMenuItem>Iniciar Follow-up</DropdownMenuItem>
            <DropdownMenuItem>Mover para Pipeline</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Carregando...' : `${filteredLeads.length} leads encontrados`}
          </p>
          {isError && (
            <div className="mt-2 text-sm text-destructive">
              Falhou ao carregar leads: {String((error as any)?.message || 'erro')}
              <button className="ml-2 underline" onClick={() => refetch()}>
                tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filtros rápidos por estágio */}
      <div className="flex flex-wrap gap-2">
        {stageFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStageFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150',
              stageFilter === f.key
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-secondary border-border text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            className="pl-10 bg-secondary border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground">Carregando leads...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
          <span className="text-4xl">🔍</span>
          <p>Nenhum lead encontrado.</p>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredLeads} keyField="id" />
      )}
    </div>
  );
}
