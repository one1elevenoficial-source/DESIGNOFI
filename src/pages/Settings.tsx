import { useState, useRef, useEffect } from "react";
import { Palette, Users, CreditCard, Save, Loader2, UserPlus, Trash2, Check, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const paymentHistory = [
  { date: "19/02/2026", value: "R$ 497,00", status: "Pago" },
  { date: "19/01/2026", value: "R$ 497,00", status: "Pago" },
  { date: "19/12/2025", value: "R$ 497,00", status: "Pago" },
];

const brazilianTimezones = [
  { value: "America/Sao_Paulo", label: "São Paulo / Brasília (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Belem", label: "Belém (GMT-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Cuiaba", label: "Cuiabá (GMT-4)" },
  { value: "America/Porto_Velho", label: "Porto Velho (GMT-4)" },
  { value: "America/Boa_Vista", label: "Boa Vista (GMT-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
];

export default function Settings() {
  const { currentWorkspace } = useWorkspace();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState(currentWorkspace.name);
  const [timezone, setTimezone] = useState(currentWorkspace.timezone || "America/Sao_Paulo");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operador");

  // Garantir bucket existe ao montar
  useEffect(() => {
    supabase.storage.createBucket('workspace-assets', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
      fileSizeLimit: 2097152,
    }).catch(() => {}); // ignora se já existe
  }, []);

  // Carregar logo atual do workspace
  useEffect(() => {
    async function loadLogo() {
      const { data } = await supabase
        .from('workspaces')
        .select('logo_url, timezone')
        .eq('id', currentWorkspace.id)
        .single();
      if (data?.logo_url) setLogoUrl(data.logo_url);
      if (data?.timezone) setTimezone(data.timezone);
    }
    loadLogo();
  }, [currentWorkspace.id]);

  // Membros reais
  const { data: members = [] } = useQuery({
    queryKey: ['members', profile?.workspace_id],
    queryFn: async () => {
      if (!profile?.workspace_id) return [];
      const { data } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, created_at')
        .eq('workspace_id', profile.workspace_id);
      return data ?? [];
    },
    enabled: !!profile?.workspace_id,
    staleTime: 30_000,
    retry: 1,
  });

  const usageLeads = 45;
  const maxLeads = 100;
  const usageLeadsPct = Math.round((usageLeads / maxLeads) * 100);
  const isNearLimit = usageLeadsPct >= 80;

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `logos/${currentWorkspace.id}.${ext}`;
      const { error } = await supabase.storage
        .from('workspace-assets')
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage
        .from('workspace-assets')
        .getPublicUrl(path);
      const url = data.publicUrl;
      setLogoUrl(url);
      // Salva logo_url no workspace
      await supabase
        .from('workspaces')
        .update({ logo_url: url })
        .eq('id', currentWorkspace.id);
    } catch (e) {
      console.error('Logo upload error:', e);
    } finally {
      setLogoUploading(false);
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLogoPreview(url);
    handleLogoUpload(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await supabase
        .from('workspaces')
        .update({
          name: companyName,
          timezone,
        })
        .eq('id', currentWorkspace.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do seu negócio</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="branding">Meu Negócio</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="plan">Plano</TabsTrigger>
        </TabsList>

        {/* Meu Negócio */}
        <TabsContent value="branding">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" /> Informações do Negócio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload de logo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Logo da empresa</label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-16 h-16 rounded-full bg-secondary border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center overflow-hidden"
                  >
                    {logoUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : logoPreview || logoUrl ? (
                      <img src={logoPreview || logoUrl!} alt="Logo" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <Palette className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      className="border-border text-muted-foreground"
                      disabled={logoUploading}
                    >
                      {logoUploading ? 'Enviando...' : logoPreview || logoUrl ? 'Trocar logo' : 'Fazer upload'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP até 2MB</p>
                  </div>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nome da empresa</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  Fuso Horário
                </label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {brazilianTimezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Workspace ID</label>
                <Input
                  value={currentWorkspace.id}
                  readOnly
                  className="bg-secondary border-border font-mono text-xs text-muted-foreground"
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="btn-premium">
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : saved ? (
                  <><Check className="w-4 h-4 mr-2" /> Salvo!</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Salvar alterações</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usuários */}
        <TabsContent value="users">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Membros do Workspace
              </CardTitle>
              <Button className="btn-premium" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Membro
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                  <Users className="w-8 h-8" />
                  <p className="text-sm">Nenhum membro encontrado.</p>
                </div>
              ) : (
                (members as any[]).map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {(m?.full_name || m?.email || 'U').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{m?.full_name || '—'}</p>
                        <p className="text-sm text-muted-foreground">{m?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="border-border capitalize text-xs">{m?.role || 'membro'}</Badge>
                      <Badge className="text-xs bg-success/15 text-success border-success/30">Ativo</Badge>
                      {m?.role !== 'owner' && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive w-7 h-7">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Convidar Membro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">E-mail</label>
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colega@empresa.com"
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Função</label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="visualizador">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setInviteOpen(false)} className="text-muted-foreground">
                  Cancelar
                </Button>
                <Button className="btn-premium" onClick={() => setInviteOpen(false)}>
                  Enviar Convite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Plano */}
        <TabsContent value="plan">
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-warning" /> Plano atual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/20 to-card rounded-lg border border-warning/30">
                  <div>
                    <p className="text-lg font-bold text-foreground">Plano Pro</p>
                    <p className="text-sm text-muted-foreground">R$ 497/mês</p>
                  </div>
                  <Badge className="bg-warning/20 text-warning border-warning/30">Ativo</Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Leads</span>
                      <span className={cn("font-medium", isNearLimit ? "text-destructive" : "text-foreground")}>
                        {usageLeads} / {maxLeads}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={cn("h-2 rounded-full transition-all", isNearLimit ? "bg-destructive" : "bg-primary")}
                        style={{ width: `${usageLeadsPct}%` }}
                      />
                    </div>
                    {isNearLimit && (
                      <p className="text-xs text-destructive mt-1">Você usou {usageLeadsPct}% do limite. Considere fazer upgrade.</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Mensagens</span>
                      <span className="font-medium text-foreground">14.8k / 50k</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: "29.6%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Instâncias</span>
                      <span className="font-medium text-foreground">— / 5</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary transition-all" style={{ width: "0%" }} />
                    </div>
                  </div>
                </div>

                {isNearLimit && (
                  <Button className="btn-premium w-full">Fazer Upgrade de Plano</Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-3 gap-4 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                    <span>Data</span>
                    <span>Valor</span>
                    <span>Status</span>
                  </div>
                  {paymentHistory.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-4 px-3 py-2.5 rounded-lg hover:bg-secondary/50 text-sm">
                      <span className="text-foreground">{p.date}</span>
                      <span className="text-foreground">{p.value}</span>
                      <Badge className="bg-success/10 text-success border-success/30 w-fit">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
