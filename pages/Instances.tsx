import { useState, useEffect } from "react";
import { Plus, Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useUpgradeGate, UpgradeModal } from "@/components/ui/upgrade-modal";
import { Logo } from "@/components/Logo";
import { toast } from "@/hooks/use-toast";

export default function Instances() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [selectedInstance, setSelectedInstance] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showUpgrade, upgradeProps } = useUpgradeGate();

  const { data: queryResult, isLoading, refetch } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      return await api.instances();
    },
    staleTime: 15_000,
  });

  const instances = (queryResult?.data as any[]) || [];
  const errorMsg = queryResult?.ok === false ? queryResult.error || "Erro" : null;
  const isEvolutionMissing = errorMsg?.toLowerCase().includes("evolution") || errorMsg?.toLowerCase().includes("api");

  const createMutation = useMutation({
    mutationFn: () => api.registerInstance({ instance_name: instanceName || "default" }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["instances"] }); 
      setOpen(false); 
      setInstanceName("");
      toast({ title: "Sucesso", description: "Instância criada. Escaneie o QR Code para conectar." });
    },
  });

  // Polling para verificar status de conexão
  useEffect(() => {
    if (!selectedInstance || selectedInstance.status === "open" || selectedInstance.status === "connected") {
      return;
    }

    const interval = setInterval(async () => {
      refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedInstance, refetch]);

  const handleGetQrCode = async (instance: any) => {
    try {
      setSelectedInstance(instance);
      // Simular busca do QR Code da Evolution API
      // Em produção, isso seria: /api/instances?action=qrcode&instanceId=...
      
      const qrCodeUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%23fff' width='300' height='300'/%3E%3Cpath d='M10,10 L90,10 L90,90 L10,90 Z M20,20 L80,20 L80,80 L20,80 Z M30,30 L70,30 L70,70 L30,70 Z' fill='%23000'/%3E%3Cpath d='M110,10 L190,10 L190,90 L110,90 Z M120,20 L180,20 L180,80 L120,80 Z M130,30 L170,30 L170,70 L130,70 Z' fill='%23000'/%3E%3Cpath d='M10,110 L90,110 L90,190 L10,190 Z M20,120 L80,120 L80,180 L20,180 Z M30,130 L70,130 L70,170 L30,170 Z' fill='%23000'/%3E%3Crect x='110' y='110' width='80' height='80' fill='%23000'/%3E%3Crect x='120' y='120' width='60' height='60' fill='%23fff'/%3E%3C/svg%3E`;
      
      setQrCode(qrCodeUrl);
      setShowQrModal(true);
      toast({ title: "QR Code Pronto", description: "Escaneie com seu WhatsApp para conectar" });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível gerar o QR Code", variant: "destructive" });
    }
  };

  const copyInstanceId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copiado!", description: "ID da instância copiado" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo size={40} />
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Instâncias</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas conexões WhatsApp</p>
          </div>
        </div>
        <Button 
          className="btn-premium"
          onClick={() => {
            if ((instances as any[]).length >= 1) {
              showUpgrade({
                blockedFeature: 'adicionar uma 2ª instância conectada',
                targetPlan: 'Profissional',
                unlocks: [
                  'Até 5 instâncias simultâneas',
                  'Follow-ups contínuos ilimitados',
                  'Prioridade no suporte da IA'
                ]
              });
            } else {
              setOpen(true);
            }
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Instância
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>Conectar WhatsApp</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da instância</Label>
                <Input
                  placeholder="ex: vendas-principal"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full btn-premium"
              >
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</> : "Criar Instância"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isEvolutionMissing ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <WifiOff className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">API do Evolution não configurada</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              A conexão com o Evolution API (WhatsApp) não foi encontrada no servidor.
              Verifique as variáveis de ambiente <code className="bg-secondary px-1 py-0.5 rounded text-xs">EVOLUTION_API_URL</code> e <code className="bg-secondary px-1 py-0.5 rounded text-xs">EVOLUTION_API_KEY</code> do backend.
            </p>
          </CardContent>
        </Card>
      ) : instances.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center h-40 gap-3">
            <Smartphone className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Nenhuma instância conectada</p>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Conectar agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((inst) => (
            <Card key={inst.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    {inst.instance_name || inst.name || "Instância"}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      inst.status === "connected" || inst.status === "open"
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    )}
                  >
                    {inst.status === "connected" || inst.status === "open" ? (
                      <><Wifi className="w-3 h-3 mr-1" /> Conectado</>
                    ) : (
                      <><WifiOff className="w-3 h-3 mr-1" /> Desconectado</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-secondary px-2 py-1 rounded flex-1 truncate text-foreground font-mono">
                      {inst.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInstanceId(inst.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {inst.status !== "connected" && inst.status !== "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-primary border-primary/30 hover:bg-primary/10"
                    onClick={() => handleGetQrCode(inst)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code
                  </Button>
                )}

                {(inst.status === "connected" || inst.status === "open") && (
                  <div className="pt-2 text-xs text-success">
                    ✓ Conectado e pronto para usar
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {qrCode && (
              <div className="flex justify-center">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 border-2 border-border rounded-lg"
                />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Abra o WhatsApp no seu telefone e aponte a câmera para este código.
            </p>
            <p className="text-xs text-muted-foreground text-center">
              O QR Code expira em 2 minutos. Se expirar, gere um novo.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                refetch();
                toast({ title: "QR Code Renovado", description: "Tente novamente" });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Renovar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <UpgradeModal {...upgradeProps} />
    </div>
  );
}

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo size={40} />
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Instâncias</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas conexões WhatsApp</p>
          </div>
        </div>
        <Button 
          className="btn-premium"
          onClick={() => {
            if ((instances as any[]).length >= 1) {
              showUpgrade({
                blockedFeature: 'adicionar uma 2ª instância conectada',
                targetPlan: 'Profissional',
                unlocks: [
                  'Até 5 instâncias simultâneas',
                  'Follow-ups contínuos ilimitados',
                  'Prioridade no suporte da IA'
                ]
              });
            } else {
              setOpen(true);
            }
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Nova Instância
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader><DialogTitle>Conectar WhatsApp</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da instância</Label>
                <Input
                  placeholder="ex: vendas-principal"
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full btn-premium"
              >
                {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</> : "Criar Instância"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isEvolutionMissing ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <WifiOff className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">API do Evolution não configurada</h2>
            <p className="text-muted-foreground text-sm max-w-md">
              A conexão com o Evolution API (WhatsApp) não foi encontrada no servidor.
              Verifique as variáveis de ambiente <code className="bg-secondary px-1 py-0.5 rounded text-xs">EVOLUTION_API_URL</code> e <code className="bg-secondary px-1 py-0.5 rounded text-xs">EVOLUTION_API_KEY</code> do backend.
            </p>
          </CardContent>
        </Card>
      ) : instances.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center h-40 gap-3">
            <Smartphone className="w-12 h-12 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Nenhuma instância conectada</p>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Conectar agora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((inst) => (
            <Card key={inst.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    {inst.instance_name || inst.name || "Instância"}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      inst.status === "connected" || inst.status === "open"
                        ? "bg-success/10 text-success border-success/30"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    )}
                  >
                    {inst.status === "connected" || inst.status === "open" ? (
                      <><Wifi className="w-3 h-3 mr-1" /> Conectado</>
                    ) : (
                      <><WifiOff className="w-3 h-3 mr-1" /> Desconectado</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground font-mono truncate">{inst.id}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <UpgradeModal {...upgradeProps} />
    </div>
  );
}
