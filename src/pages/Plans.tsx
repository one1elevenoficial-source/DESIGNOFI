import { Check, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const plans = [
  {
    id: 'solo', name: 'Solo', price: 'R$ 997', period: '/mês',
    features: ['1 instância WhatsApp', '500 leads/mês', 'Bot IA básico', 'Suporte via chat'],
    highlighted: false,
  },
  {
    id: 'profissional', name: 'Profissional', price: 'R$ 1.297', period: '/mês',
    features: ['3 instâncias WhatsApp', '2.000 leads/mês', 'Bot IA avançado', 'Follow-up automático', 'Base de conhecimento', 'Suporte prioritário'],
    highlighted: true,
  },
  {
    id: 'equipe', name: 'Equipe', price: 'R$ 2.497', period: '/mês',
    features: ['10 instâncias WhatsApp', 'Leads ilimitados', 'Secretário IA', 'Prospecção em massa', 'API access', 'Suporte 24h'],
    highlighted: false,
  },
];

export default function Plans() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Planos</h1>
        <p className="text-muted-foreground mt-1">Escolha o plano ideal para o seu negócio</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`bg-card border-border relative ${
              plan.highlighted ? 'border-primary/50 shadow-[0_0_30px_rgba(0,232,94,0.1)]' : ''
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-xs px-3">Mais popular</Badge>
              </div>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Zap className={`w-5 h-5 ${plan.highlighted ? 'text-primary' : 'text-muted-foreground'}`} />
                {plan.name}
              </CardTitle>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-success flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Button
                className={plan.highlighted ? 'btn-premium w-full' : 'w-full'}
                variant={plan.highlighted ? 'default' : 'outline'}
              >
                Assinar {plan.name}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
