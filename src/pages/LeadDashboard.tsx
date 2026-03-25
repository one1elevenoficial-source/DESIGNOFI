import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare, Clock, TrendingUp, Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getTenant } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, useCallback } from 'react';

declare const d3: any;

const stageColors: Record<string, string> = {
  Novo: 'bg-info/10 text-info border-info/30',
  'Em atendimento': 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  Qualificado: 'bg-warning/10 text-warning border-warning/30',
  Agendado: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Fechado: 'bg-success/10 text-success border-success/30',
  Perdido: 'bg-destructive/10 text-destructive border-destructive/30',
};

export default function LeadDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tenant = getTenant();

  // ── Lead data ──────────────────────────────────────────────────────────────
  const { data: leadsRaw = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) return [] as any[];
      return r.data ?? [];
    },
    staleTime: 15_000,
    retry: 1,
  });

  const lead = (leadsRaw as any[]).find((l: any) => String(l.id) === id);

  // ── Messages ───────────────────────────────────────────────────────────────
  const { data: messagesRaw = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: async () => {
      const r = await api.messages(id!);
      if (!r.ok) return [] as any[];
      return r.data ?? [];
    },
    enabled: !!id,
    staleTime: 10_000,
    retry: 1,
  });
  const messages = messagesRaw as any[];

  // ── Knowledge Graph state ──────────────────────────────────────────────────
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [graphLoading, setGraphLoading] = useState(true);
  const [newNodeLabel, setNewNodeLabel] = useState('');
  const [newNodeValue, setNewNodeValue] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const API_BASE = String((import.meta as any).env?.VITE_API_BASE_URL || '').trim();

  const fetchGraph = useCallback(async () => {
    if (!id || !tenant?.workspaceId || !API_BASE) return;
    setGraphLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/billing?action=knowledge-graph&leadId=${id}`, {
        headers: {
          'x-workspace-id': tenant.workspaceId,
          'x-api-token': tenant.token || '',
        },
      });
      const data = await res.json();
      setGraphData({ nodes: data.nodes || [], edges: data.edges || [] });
    } catch (e) {
      console.error('Graph fetch error:', e);
    } finally {
      setGraphLoading(false);
    }
  }, [id, tenant?.workspaceId, tenant?.token, API_BASE]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // ── D3 Graph rendering ────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || graphLoading || !graphData.nodes.length) return;
    if (typeof d3 === 'undefined') return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const W = svgRef.current.clientWidth || 600;
    const H = 380;
    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const colorMap: Record<string, string> = {
      identity: '#00e85e',
      bant: '#FFD700',
      prediction: '#7c5cbf',
      manual: '#4a9eff',
      upload: '#ff6b35',
    };

    const confidenceColor = (c: number) =>
      c >= 0.85 ? '#00e85e' : c >= 0.6 ? '#FFD700' : '#555555';

    const nodes = graphData.nodes.map((n: any) => ({ ...n }));
    const links = graphData.edges.map((e: any) => ({ ...e }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(110)
          .strength(0.5)
      )
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(55));

    const g = svg.append('g');

    svg.call(
      d3
        .zoom()
        .scaleExtent([0.4, 2.5])
        .on('zoom', (event: any) => {
          g.attr('transform', event.transform);
        })
    );

    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#2a2a2a')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', (d: any) => (d.type === 'prediction' ? '4 3' : 'none'))
      .attr('stroke-opacity', 0.8);

    const node = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3
          .drag()
          .on('start', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event: any, d: any) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event: any, d: any) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append('circle')
      .attr('r', (d: any) => (d.is_central ? 40 : 33))
      .attr('fill', 'none')
      .attr('stroke', (d: any) => confidenceColor(d.confidence))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', (d: any) => (d.confidence >= 0.85 ? 'none' : '4 2'))
      .attr('opacity', 0.8);

    node
      .append('circle')
      .attr('r', (d: any) => (d.is_central ? 36 : 29))
      .attr('fill', (d: any) => colorMap[d.node_type] || '#444')
      .attr('fill-opacity', (d: any) => (d.is_central ? 0.22 : 0.14))
      .attr('stroke', (d: any) => colorMap[d.node_type] || '#444')
      .attr('stroke-width', 1.5);

    node
      .append('text')
      .text((d: any) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => (d.value ? '-0.3em' : '0.35em'))
      .attr('font-size', (d: any) => (d.is_central ? '12px' : '11px'))
      .attr('font-weight', '600')
      .attr('fill', '#ffffff')
      .attr('pointer-events', 'none');

    node
      .append('text')
      .text((d: any) =>
        d.value ? (d.value.length > 18 ? d.value.slice(0, 16) + '\u2026' : d.value) : ''
      )
      .attr('text-anchor', 'middle')
      .attr('dy', '1em')
      .attr('font-size', '9px')
      .attr('fill', '#888888')
      .attr('pointer-events', 'none');

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [graphData, graphLoading]);

  // ── Add manual node ────────────────────────────────────────────────────────
  const addManualNode = async () => {
    if (!newNodeLabel.trim() || !API_BASE) return;
    try {
      const centralNode = graphData.nodes.find((n: any) => n.is_central);
      await fetch(`${API_BASE}/api/billing?action=knowledge-graph&leadId=${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': tenant.workspaceId,
          'x-api-token': tenant.token || '',
        },
        body: JSON.stringify({
          label: newNodeLabel,
          type: 'manual',
          value: newNodeValue,
          source: 'manual',
          connected_to: centralNode ? [centralNode.id] : [],
        }),
      });
      setNewNodeLabel('');
      setNewNodeValue('');
      fetchGraph();
    } catch (e) {
      console.error('Add node error:', e);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <p className="text-muted-foreground">Lead não encontrado.</p>
      </div>
    );
  }

  const stage = String(lead.status ?? lead.stage ?? 'Novo');
  const name = String(lead.name ?? lead.full_name ?? 'Lead');
  const phone = String(lead.phone ?? lead.whatsapp ?? '\u2014');
  const createdAt = lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '\u2014';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-muted-foreground p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{name}</h1>
          <p className="text-muted-foreground text-sm">{phone}</p>
        </div>
        <Badge
          variant="outline"
          className={cn('border', stageColors[stage] || 'border-border text-muted-foreground')}
        >
          {stage}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Phone, label: 'Telefone', value: phone, color: 'text-primary' },
          { icon: Clock, label: 'Entrada', value: createdAt, color: 'text-info' },
          { icon: MessageSquare, label: 'Mensagens', value: String(messages.length), color: 'text-success' },
          { icon: TrendingUp, label: 'Score', value: lead.score ? String(lead.score) : '\u2014', color: 'text-warning' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="pt-4">
              <Icon className={`w-4 h-4 ${color} mb-2`} />
              <p className={`text-lg font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ══════════════ GRAFO DE CONHECIMENTO ══════════════ */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#fff' }}>
              Grafo de Conhecimento
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>
              Alimentado pelos agentes em tempo real — arraste os nós, dê zoom
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#666' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00e85e',
                  display: 'inline-block',
                }}
              />
              Confirmado
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#FFD700',
                  display: 'inline-block',
                }}
              />
              Inferido
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#555',
                  display: 'inline-block',
                }}
              />
              Incerto
            </span>
          </div>
        </div>

        {graphLoading ? (
          <div
            style={{
              height: '380px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#444',
            }}
          >
            <Loader2 className="w-6 h-6 animate-spin mr-2" style={{ color: '#00e85e' }} />
            Carregando grafo...
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div
            style={{
              height: '380px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#444',
              fontSize: '13px',
            }}
          >
            Nenhum dado no grafo ainda. Adicione informações manualmente abaixo.
          </div>
        ) : (
          <svg
            ref={svgRef}
            style={{
              width: '100%',
              height: '380px',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '8px',
            }}
          />
        )}

        {/* Add manual node */}
        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#666', fontWeight: '500' }}>
            Adicionar informação manualmente
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Input
              value={newNodeLabel}
              onChange={(e) => setNewNodeLabel(e.target.value)}
              placeholder="Ex: Tem sócio"
              className="flex-1"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
              }}
              onKeyDown={(e) => e.key === 'Enter' && addManualNode()}
            />
            <Input
              value={newNodeValue}
              onChange={(e) => setNewNodeValue(e.target.value)}
              placeholder="Detalhe (opcional)"
              className="flex-1"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px',
              }}
              onKeyDown={(e) => e.key === 'Enter' && addManualNode()}
            />
            <Button
              onClick={addManualNode}
              style={{
                background: '#00e85e',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* ══════════════ HISTÓRICO DE MENSAGENS ══════════════ */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Histórico de Mensagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem ainda.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((m: any) => {
                const direction = String(m.direction ?? m.dir ?? 'out');
                const mine = direction !== 'in';
                const body = String(m.body ?? m.text ?? m.content ?? '');
                const at = m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        mine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'
                      }`}
                    >
                      <p>{body}</p>
                      <p className={`text-[10px] mt-1 opacity-70 ${mine ? 'text-right' : ''}`}>{at}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
