import { Clock, Plus, TrendingUp, MessageSquare, Trophy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function FollowUps() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Follow-ups</h1>
          <p className="text-muted-foreground mt-1">Motor de sequências automatizadas</p>
        </div>
        <Button className="btn-premium">
          <Plus className="w-4 h-4 mr-2" />
          Nova Sequência
        </Button>
      </div>

      {/* Dashboard de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <ChevronRight className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs text-muted-foreground mt-1">Sequências Ativas</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-5">
            <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center mb-2">
              <MessageSquare className="w-4 h-4 text-info" />
            </div>
            <p className="text-2xl font-bold text-info">0</p>
            <p className="text-xs text-muted-foreground mt-1">Enviadas Hoje</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-5">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-warning">—%</p>
            <p className="text-xs text-muted-foreground mt-1">Taxa de Resposta</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-5">
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center mb-2">
              <Trophy className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-success">0</p>
            <p className="text-xs text-muted-foreground mt-1">Conversões via FU</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center h-56 gap-3 border border-dashed border-border rounded-xl bg-card/30">
        <Clock className="w-12 h-12 text-muted-foreground" />
        <p className="text-foreground font-medium">Nenhuma sequência configurada</p>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Crie sequências de follow-up para nutrir seus leads automaticamente e aumentar a taxa de conversão.
        </p>
        <Button className="btn-premium" size="sm">
          <Plus className="w-4 h-4 mr-2" /> Criar Sequência
        </Button>
      </div>
    </div>
  );
}
