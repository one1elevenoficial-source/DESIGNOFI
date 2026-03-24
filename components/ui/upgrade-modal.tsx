import { X, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type UpgradeFeature = {
  /** Feature name that was blocked */
  blockedFeature: string;
  /** What they unlock in the next plan */
  unlocks: string[];
  /** Name of the next plan */
  targetPlan?: string;
};

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature: UpgradeFeature;
}

/**
 * Soft-block upgrade modal — shown when user tries to access a feature
 * not included in their current plan. Converts much better than a static
 * pricing page because it surfaces the exact pain point at the right moment.
 *
 * Usage:
 *   const [showUpgrade, setShowUpgrade] = useState(false);
 *   <UpgradeModal
 *     open={showUpgrade}
 *     onClose={() => setShowUpgrade(false)}
 *     feature={{ blockedFeature: '2ª instância', unlocks: ['...'], targetPlan: 'Profissional' }}
 *   />
 */
export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const plan = feature.targetPlan ?? 'Profissional';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md p-0 overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-card px-6 pt-6 pb-5 border-b border-border relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-3">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground leading-tight">
            Esta feature requer o plano {plan}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Você tentou usar <span className="text-foreground font-medium">{feature.blockedFeature}</span>, disponível a partir do plano {plan}.
          </p>
        </div>

        {/* Unlocks list */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Com o plano {plan} você desbloqueia:
          </p>
          <ul className="space-y-2">
            {feature.unlocks.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 flex flex-col gap-2">
          <Button
            className="btn-premium w-full"
            onClick={() => {
              // Direcionar para link de upgrade ou abrir chat de vendas
              window.open('https://oneeleven.com.br/upgrade', '_blank');
              onClose();
            }}
          >
            Fazer upgrade agora
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={onClose}>
            Continuar no plano atual
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to trigger the upgrade modal with a specific blocked feature.
 * 
 * Usage:
 *   const { showUpgrade, upgradeProps } = useUpgradeGate();
 *   
 *   <Button onClick={() => showUpgrade({ blockedFeature: '2ª instância', unlocks: ['...'] })}>
 *     Adicionar instância
 *   </Button>
 *   <UpgradeModal {...upgradeProps} />
 */
import { useState } from 'react';

export function useUpgradeGate() {
  const [open, setOpen] = useState(false);
  const [feature, setFeature] = useState<UpgradeFeature>({
    blockedFeature: '',
    unlocks: [],
  });

  const showUpgrade = (f: UpgradeFeature) => {
    setFeature(f);
    setOpen(true);
  };

  return {
    showUpgrade,
    upgradeProps: {
      open,
      onClose: () => setOpen(false),
      feature,
    },
  };
}
