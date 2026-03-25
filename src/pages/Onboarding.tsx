import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Smartphone, Bot, Users, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/lib/supabase';

const steps = [
  { id: 1, icon: Smartphone, title: 'Conectar WhatsApp', desc: 'Conecte sua instância do WhatsApp via QR Code', path: '/instances' },
  { id: 2, icon: Bot, title: 'Configurar o Bot', desc: 'Configure a persona e regras do seu agente IA', path: '/bot' },
  { id: 3, icon: Users, title: 'Importar Leads', desc: 'Importe sua lista de contatos para começar', path: '/leads' },
  { id: 4, icon: Zap, title: 'Iniciar Prospecção', desc: 'Lance sua primeira campanha de prospecção', path: '/prospeccao' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await supabase
        .from('workspaces')
        .update({ onboarding_completed: true })
        .eq('id', currentWorkspace.id);
      navigate('/overview');
    } catch (e) {
      console.error(e);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Bem-vindo ao ONE ELEVEN</h1>
          <p className="text-muted-foreground mt-2">Siga os passos abaixo para configurar sua conta e começar a automatizar suas vendas.</p>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.id}
                className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => navigate(step.path)}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{idx + 1}/{steps.length}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-border text-muted-foreground"
            onClick={handleComplete}
            disabled={completing}
          >
            Pular por agora
          </Button>
          <Button
            className="flex-1 btn-premium"
            onClick={handleComplete}
            disabled={completing}
          >
            {completing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Check className="w-4 h-4 mr-2" />Concluir configuração</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
