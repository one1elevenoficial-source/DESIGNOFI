import { CreditCard, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mockHistory = [
  { date: '19/02/2026', value: 'R$ 497,00', status: 'Pago', method: 'PIX' },
  { date: '19/01/2026', value: 'R$ 497,00', status: 'Pago', method: 'PIX' },
  { date: '19/12/2025', value: 'R$ 497,00', status: 'Pago', method: 'PIX' },
];

export default function Pagamentos() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Pagamentos</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua assinatura e histórico financeiro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: DollarSign, label: 'Plano atual', value: 'Pro — R$ 497/mês', color: 'text-warning' },
          { icon: Calendar, label: 'Próximo vencimento', value: '19/03/2026', color: 'text-info' },
          { icon: TrendingUp, label: 'Total pago', value: 'R$ 1.491,00', color: 'text-success' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="pt-5">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Histórico de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-4 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              <span>Data</span>
              <span>Valor</span>
              <span>Método</span>
              <span>Status</span>
            </div>
            {mockHistory.map((p, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-4 px-3 py-2.5 rounded-lg hover:bg-secondary/50 text-sm">
                <span className="text-foreground">{p.date}</span>
                <span className="text-foreground font-medium">{p.value}</span>
                <span className="text-muted-foreground">{p.method}</span>
                <Badge className="bg-success/10 text-success border-success/30 w-fit text-xs">{p.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
