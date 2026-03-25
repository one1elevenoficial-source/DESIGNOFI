import { Bot, Mic, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Secretario() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Secretário IA</h1>
        <p className="text-muted-foreground mt-1">Agente de atendimento telefônico com IA</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Mic, label: 'Ligações atendidas', value: '—', color: 'text-primary' },
          { icon: Clock, label: 'Tempo médio', value: '—', color: 'text-warning' },
          { icon: MessageSquare, label: 'Resolvidos', value: '—', color: 'text-success' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="pt-5">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-3">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Configuração do Secretário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <Bot className="w-12 h-12 opacity-30" />
            <p className="text-sm">Em breve — Secretário IA com atendimento por voz</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
