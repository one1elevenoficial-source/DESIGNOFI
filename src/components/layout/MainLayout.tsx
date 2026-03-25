import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { TrialBanner } from "@/components/ui/trial-banner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

function OnboardingRedirect() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentWorkspace?.id || location.pathname === '/onboarding') return;

    async function check() {
      try {
        const [{ data: workspace }, { data: sub }] = await Promise.all([
          supabase
            .from('workspaces')
            .select('onboarding_completed')
            .eq('id', currentWorkspace.id)
            .single(),
          supabase
            .from('subscriptions')
            .select('status')
            .eq('workspace_id', currentWorkspace.id)
            .maybeSingle(),
        ]);

        if (sub?.status === 'trial' && !workspace?.onboarding_completed) {
          navigate('/onboarding');
        }
      } catch {
        // ignora erros silenciosamente
      }
    }

    check();
  }, [currentWorkspace?.id]);

  return null;
}

export function MainLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <TooltipProvider delayDuration={0}>
          <OnboardingRedirect />
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TrialBanner />
              <Header />
              <main className="flex-1 p-6 overflow-auto">
                <Outlet />
              </main>
            </div>
            <OnboardingChecklist />
          </div>
        </TooltipProvider>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}
