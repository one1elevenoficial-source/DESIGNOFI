import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/lib/supabase';
import { getTenant } from '@/lib/tenant';

export function useOnboardingGuard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const tenant = getTenant();
        if (!tenant || !currentWorkspace?.id) {
          setChecked(true);
          return;
        }

        // Check workspace onboarding status
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('onboarding_completed')
          .eq('id', tenant.workspaceId)
          .single();

        if (workspace && !workspace.onboarding_completed) {
          // Check subscription status
          const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('workspace_id', tenant.workspaceId)
            .maybeSingle();

          if (subscription?.status === 'trial') {
            navigate('/onboarding', { replace: true });
            return;
          }
        }

        setChecked(true);
      } catch (err) {
        console.error('Erro ao verificar onboarding:', err);
        setChecked(true);
      }
    };

    checkOnboarding();
  }, [currentWorkspace?.id, navigate]);

  return { checked };
}
