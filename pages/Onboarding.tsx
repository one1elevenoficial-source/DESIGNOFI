import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Zap, LayoutDashboard, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { getTenant } from '@/lib/tenant';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const STEPS = [
  {
    id: 1,
    title: 'Conecte seu WhatsApp',
    description: 'Escaneie o QR Code abaixo com seu WhatsApp',
    icon: Smartphone,
    route: '/instances',
    cta: 'Conectar WhatsApp',
  },
  {
    id: 2,
    title: 'Configure seu assistente',
    description: 'Diga ao bot como ele deve se apresentar e atender seus clientes',
    icon: Zap,
    route: '/bot',
    cta: 'Configurar Bot',
  },
  {
    id: 3,
    title: 'Seu funil está pronto',
    description: 'Agora é só esperar os leads chegarem. O bot responde tudo sozinho.',
    icon: LayoutDashboard,
    route: '/pipeline',
    cta: 'Ver Pipeline',
    final: true,
  },
];

function StepConnector({
  isActive,
  isCompleted,
}: {
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div
      className={cn(
        'h-1 flex-1 mx-2 rounded-full transition-all duration-300',
        isActive || isCompleted
          ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50'
          : 'bg-white/10'
      )}
    />
  );
}

function StepCircle({
  number,
  isActive,
  isCompleted,
}: {
  number: number;
  isActive: boolean;
  isCompleted: boolean;
}) {
  return (
    <div
      className={cn(
        'w-12 h-12 rounded-full flex items-center justify-center font-bold text-base transition-all duration-300 relative',
        isActive
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 scale-110'
          : isCompleted
            ? 'bg-emerald-600 text-white'
            : 'bg-white/10 text-muted-foreground'
      )}
    >
      {isCompleted ? '✓' : number}
      {isActive && (
        <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
      )}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleNext = async (isLast: boolean) => {
    if (isLast) {
      setSaving(true);
      try {
        const tenant = getTenant();
        if (!tenant) throw new Error('Workspace não encontrado');

        await supabase
          .from('workspaces')
          .update({ onboarding_completed: true })
          .eq('id', tenant.workspaceId);

        toast({
          title: 'Onboarding Concluído!',
          description: 'Bem-vindo ao ONE ELEVEN 🎉',
        });

        navigate('/pipeline');
      } catch (err) {
        console.error('Erro ao salvar onboarding:', err);
        toast({
          title: 'Erro',
          description: 'Não foi possível salvar o progresso',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    } else {
      const nextStep = STEPS[currentStep];
      navigate(nextStep.route);
    }
  };

  const currentStepData = STEPS[currentStep - 1];
  const CurrentIcon = currentStepData.icon;

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-5">
        <div
          style={{
            backgroundImage:
              'linear-gradient(0deg, transparent 24%, rgba(0, 232, 94, .05) 25%, rgba(0, 232, 94, .05) 26%, transparent 27%, transparent 74%, rgba(0, 232, 94, .05) 75%, rgba(0, 232, 94, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 232, 94, .05) 25%, rgba(0, 232, 94, .05) 26%, transparent 27%, transparent 74%, rgba(0, 232, 94, .05) 75%, rgba(0, 232, 94, .05) 76%, transparent 77%, transparent)',
            backgroundSize: '50px 50px',
          }}
          className="absolute inset-0"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6 py-20">
        {/* Logo / Welcome */}
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-white mb-2">
            Bem-vindo ao ONE ELEVEN
          </h1>
          <p className="text-lg text-muted-foreground">
            Vamos configurar seu assistente IA em 3 passos
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-16 w-full max-w-2xl">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <StepCircle
                number={step.id}
                isActive={step.id === currentStep}
                isCompleted={completedSteps.includes(step.id)}
              />
              {idx < STEPS.length - 1 && (
                <StepConnector
                  isActive={step.id < currentStep}
                  isCompleted={completedSteps.includes(step.id) && step.id < currentStep}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content Card */}
        <Card className="w-full max-w-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-12">
          {/* Step Indicator*/}
          <div className="flex items-center gap-3 mb-8">
            <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1">
              Passo {currentStep} de {STEPS.length}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {Math.round((currentStep / STEPS.length) * 100)}% concluído
            </span>
          </div>

          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <CurrentIcon className="w-10 h-10 text-emerald-400" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              {currentStepData.title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              {currentStepData.description}
            </p>
          </div>

          {/* Step-specific Content */}
          <div className="mb-12 min-h-32 flex items-center justify-center">
            {currentStep === 1 && (
              <div className="text-center space-y-4">
                <div className="w-48 h-48 mx-auto bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Smartphone className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Clique no botão abaixo<br />
                      para conectar seu WhatsApp
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="text-center space-y-4">
                <div className="w-48 h-48 mx-auto bg-gradient-to-br from-emerald-500/20 to-emerald-400/5 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <Zap className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-pulse" />
                    <p className="text-sm text-muted-foreground">
                      Configure as respostas<br />
                      automáticas do bot
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="text-center space-y-4">
                <div className="w-48 h-48 mx-auto bg-gradient-to-br from-emerald-600/20 to-emerald-500/5 border border-emerald-600/30 rounded-2xl flex items-center justify-center">
                  <div className="text-center">
                    <LayoutDashboard className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Seu pipeline está<br />
                      100% pronto! 🎉
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="mb-12 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              {currentStep === 1 &&
                'Seu WhatsApp precisa estar com a bateria ativa e seguindo os passos de conexão. Este é um processo seguro e oficial do WhatsApp.'}
              {currentStep === 2 &&
                'Personalize como o bot se apresenta, seus horários de funcionamento, e as respostas automáticas para cada estágio do funil.'}
              {currentStep === 3 &&
                'Os leads começarão a chegar automaticamente. O bot responde, qualifica e passa para você quando necessário.'}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-4">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => {
                  const prevStep = STEPS[currentStep - 2];
                  navigate(prevStep.route);
                  setCurrentStep(currentStep - 1);
                }}
                className="flex-1 border-border text-foreground hover:bg-white/5"
              >
                Voltar
              </Button>
            )}
            <Button
              onClick={() => handleNext(currentStep === STEPS.length)}
              disabled={saving}
              className={cn(
                'flex-1 font-semibold text-base',
                'bg-emerald-500 hover:bg-emerald-600 text-white'
              )}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  {currentStepData.cta}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Você sempre pode retomar este onboarding em{' '}
            <button
              onClick={() => navigate('/settings')}
              className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
            >
              Configurações
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
