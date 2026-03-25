import { Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOnboardingGuard } from "@/hooks/useOnboardingGuard";
import { AppSidebar } from "./AppSidebar";
import { Header } from "./Header";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { TrialBanner } from "@/components/ui/trial-banner";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

function MainLayoutContent() {
  const { checked } = useOnboardingGuard();

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div
          className="w-8 h-8 rounded-full border-2 border-transparent animate-spin"
          style={{ borderTopColor: "#00e85e" }}
        />
      </div>
    );
  }

  return (
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
  );
}

export function MainLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <TooltipProvider delayDuration={0}>
          <MainLayoutContent />
        </TooltipProvider>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}
