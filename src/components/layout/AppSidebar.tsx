import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Smartphone,
  MessageSquare,
  UserCircle,
  Kanban,
  Clock,
  Trophy,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/overview' },
  { icon: Trophy, label: 'Convertidos', path: '/converted', golden: true },
  { icon: UserCircle, label: 'Leads', path: '/leads' },
  { icon: Kanban, label: 'Pipeline', path: '/pipeline' },
  { icon: MessageSquare, label: 'Caixa de Entrada', path: '/inbox' },
  { icon: Clock, label: 'Follow-ups', path: '/follow-ups' },
  { icon: Bot, label: 'Bot', path: '/bot' },
  { icon: Users, label: 'Membros', path: '/clients', agencyOnly: true },
  { icon: Smartphone, label: 'Instâncias', path: '/instances' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { profile } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const displayName = profile?.full_name || currentWorkspace?.name || 'One Eleven';

  return (
    <aside
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 sticky top-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('p-4 border-b border-sidebar-border flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
        <div className="w-9 h-9 rounded-lg bg-gradient-premium flex items-center justify-center shadow-glow">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-display font-bold text-foreground text-lg tracking-tight">{displayName}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Enterprise</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const isGolden = item.golden;

          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                isActive
                  ? isGolden
                    ? 'bg-warning/15 text-warning shadow-[0_0_12px_hsl(var(--warning)/0.25)]'
                    : 'bg-primary/10 text-primary'
                  : isGolden
                  ? 'text-warning/80 hover:bg-warning/10 hover:text-warning'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isGolden ? 'text-warning animate-pulse' : isActive ? 'text-primary' : ''
                )}
              />
              {!collapsed && (
                <span
                  className={cn(
                    'font-medium text-sm',
                    isGolden
                      ? isActive
                        ? 'text-warning font-semibold'
                        : 'text-warning/80'
                      : isActive
                      ? 'text-primary'
                      : ''
                  )}
                >
                  {item.label}
                </span>
              )}
              {isActive && !collapsed && (
                <div
                  className={cn(
                    'ml-auto w-1.5 h-1.5 rounded-full animate-pulse',
                    isGolden ? 'bg-warning' : 'bg-primary'
                  )}
                />
              )}
            </NavLink>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" className="bg-popover border-border">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return link;
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('w-full text-muted-foreground hover:text-foreground', collapsed && 'px-2')}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
