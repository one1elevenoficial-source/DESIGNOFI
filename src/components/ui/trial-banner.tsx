import { useState, useEffect } from 'react';
import { X, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const BANNER_DISMISSED_KEY = 'oneeleven_trial_banner_dismissed';
const TRIAL_DAYS = 30;

/**
 * Contextual trial banner — shown only to users in trial or within first 30 days.
 * Appears as a slim bar at the top of the app, disappears after the period ends
 * or when the user explicitly dismisses it.
 *
 * Shows:
 *  - Trial users: "Você está no trial. X dias restantes."
 *  - First-30-days users: "Plano Solo → upgrade para Profissional e desbloqueie [X]."
 * Hides automatically after 30 days or dismissal, and never nags existing customers.
 */
export function TrialBanner() {
  const { profile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    // Don't show if user already dismissed
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed) return;

    // Calculate days since account creation
    const createdAt = profile?.created_at;
    if (!createdAt) return;

    const created = new Date(createdAt);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - created.getTime()) / 86400000);

    if (daysSince < TRIAL_DAYS) {
      setDaysLeft(TRIAL_DAYS - daysSince);
      setVisible(true);
    }
  }, [profile]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, '1');
  };

  if (!visible) return null;

  const isEarlyDays = daysLeft !== null && daysLeft > 0;
  const isCritical = daysLeft !== null && daysLeft <= 5;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2 text-sm font-medium transition-all',
        isCritical
          ? 'bg-destructive/15 border-b border-destructive/30 text-destructive'
          : 'bg-primary/10 border-b border-primary/20 text-foreground'
      )}
    >
      {/* Left: message */}
      <div className="flex items-center gap-2 min-w-0">
        <Zap
          className={cn(
            'w-4 h-4 flex-shrink-0',
            isCritical ? 'text-destructive' : 'text-primary'
          )}
        />
        {isEarlyDays ? (
          <span className="truncate">
            {isCritical ? (
              <>
                ⚠️ Seu período gratuito expira em{' '}
                <span className="font-bold">{daysLeft} dia{daysLeft !== 1 ? 's' : ''}</span>.
                Garanta seu plano agora para não perder nada.
              </>
            ) : (
              <>
                Você está no período de avaliação gratuita.{' '}
                <span className="font-bold">{daysLeft} dias restantes</span>. Faça upgrade para
                o plano <span className="font-bold text-primary">Profissional</span> e desbloqueie
                múltiplas instâncias, follow-ups ilimitados e relatórios avançados.
              </>
            )}
          </span>
        ) : null}
      </div>

      {/* Right: CTA + dismiss */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          size="sm"
          className={cn(
            'h-7 px-3 text-xs',
            isCritical ? 'bg-destructive hover:bg-destructive/80' : 'btn-premium'
          )}
          onClick={() => window.open('https://oneeleven.com.br/upgrade', '_blank')}
        >
          Fazer upgrade
          <ArrowRight className="w-3 h-3 ml-1.5" />
        </Button>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground transition-colors ml-1"
          aria-label="Fechar banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
