import { Bell, Search, ChevronDown, Building2, LogOut, User, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { isDemoMode } from "@/lib/demoMode";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function Header() {
  const { currentWorkspace } = useWorkspace();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [isDark, setIsDark] = useState(
    () => localStorage.getItem('theme') !== 'light'
  );

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('light', !next);
  };

  const displayName = profile?.full_name || profile?.email || "Usuário";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel: Record<string, string> = {
    owner: "Proprietário",
    admin: "Administrador",
    member: "Membro",
  };

  // Leads para busca
  const { data: leadsRaw = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const r = await api.leads();
      if (!r.ok) return [] as any[];
      return r.data ?? [];
    },
    staleTime: 30_000,
    retry: 1,
  });
  const leads = (leadsRaw as any[]).slice(0, 50);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const q = searchValue.trim().toLowerCase();

  // Filtragem inteligente
  const matchedLeads = q
    ? leads.filter(
        (l: any) =>
          String(l.name || "").toLowerCase().includes(q) ||
          String(l.phone || "").includes(q) ||
          String(l.status || l.stage || "").toLowerCase().includes(q)
      )
    : leads.slice(0, 3);

  const recentLeads = leads.slice(0, 3);

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Workspace Info */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 text-foreground hover:bg-secondary">
            <div className="w-8 h-8 rounded-lg bg-gradient-premium flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm">{currentWorkspace.name}</span>
              <span className="text-[10px] text-muted-foreground">{currentWorkspace.niche}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 bg-popover border-border">
          <DropdownMenuLabel className="text-muted-foreground text-xs uppercase tracking-wider">
            Workspace
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-border" />
          <DropdownMenuItem
            className={cn("cursor-pointer bg-primary/10")}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{currentWorkspace.name}</div>
                <div className="text-xs text-muted-foreground">{currentWorkspace.niche}</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Smart Search */}
      <div className="flex-1 max-w-md mx-8" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            placeholder="Buscar leads, conversas, estágios..."
            className="pl-10 bg-secondary/50 border-border focus:bg-secondary"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
          />

          {/* Search Dropdown */}
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {!q ? (
                <div className="p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">
                    Recentes
                  </p>
                  {recentLeads.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Nenhum lead ainda.</p>
                  ) : (
                    recentLeads.map((lead: any) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setSearchOpen(false);
                          navigate("/leads");
                        }}
                        className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-md hover:bg-secondary/80 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary">
                            {String(lead.name || "L")
                              .split(" ")
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{lead.name || "Lead"}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.phone || ""}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <div className="p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">
                    Leads ({matchedLeads.length})
                  </p>
                  {matchedLeads.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">Nenhum resultado.</p>
                  ) : (
                    matchedLeads.slice(0, 6).map((lead: any) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchValue("");
                          navigate("/leads");
                        }}
                        className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-md hover:bg-secondary/80 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary">
                            {String(lead.name || "L")
                              .split(" ")
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{lead.name || "Lead"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.status || lead.stage || ""} · {lead.phone || ""}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {isDemoMode && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
            DEMO MODE
          </Badge>
        )}

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground"
        >
          {isDark
            ? <Sun size={16} />
            : <Moon size={16} />}
        </button>

        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-foreground hover:bg-secondary">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="font-medium text-sm">{displayName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {roleLabel[profile?.role ?? ""] ?? "Membro"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
            <DropdownMenuLabel className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer gap-2">
              <User className="w-4 h-4" /> Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
