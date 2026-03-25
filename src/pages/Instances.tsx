import { useState } from "react";
import { Plus, Smartphone, Wifi, WifiOff, QrCode, RefreshCw, Loader2 } from "lucide-react";
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

const EVOLUTION_URL = (import.meta as any).env?.VITE_EVOLUTION_API_URL || 'https://evolution-api-difc.onrender.com';
const EVOLUTION_KEY = (import.meta as any).env?.VITE_EVOLUTION_API_KEY || 'oneleven2026';

const evolutionConfigured = !!(import.meta as any).env?.VITE_EVOLUTION_API_URL;

async function evoCreateInstance(instanceName: string) {
  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers: { apikey: EVOLUTION_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ instanceName, token: EVOLUTION_KEY }),
  });
  return res.json();
}

async function evoGetQRCode(instanceName: string): Promise<string | null> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
      headers: { apikey: EVOLUTION_KEY },
    });
    const data = await res.json();
    return data.base64 || null;
  } catch {
    return null;
  }
}

export default function Instances() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [createdInstance, setCreatedInstance] = useState<string | null>(null);
  const { showUpgrade, upgradeProps } = useUpgradeGate();

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["instances"],
    queryFn: async () => {
      const r = await api.instances();
      return r.ok ? r.data : [];
    },
    staleTime: 15_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const name = instanceName || "default";
      // Try Evolution API first
      await evoCreateInstance(name).catch(() => {});
      // Also register in our backend
      return api.registerInstance({ instance_name: name });
    },
    onSuccess: async () => {
      const name = instanceName || "default";
      setCreatedInstance(name);
      qc.invalidateQueries({ queryKey: ["instances"] });
      // Fetch QR Code
      setQrLoading(true);
      const qr = await evoGetQRCode(name);
      setQrCode(qr);
      setQrLoading(false);
    },
  });

  const handleRefreshQr = async (name: string) => {
    setQrLoading(true);
    const qr = await evoGetQRCode(name);
    setQrCode(qr);
    setQrLoading(false);
  };

  const handleClose = () => {
    setOpen(false);
    setInstanceName("");
    setQrCode(null);
    setCreatedInstance(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Instâncias</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas conexões WhatsApp</p>
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
      </div>

      {/* Evolution API banner when not configured */}
      {!evolutionConfigured && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{
            background: 'rgba(250,204,21,0.1)',
            border: '1px solid rgba(250,204,21,0.2)',
            color: '#fde047',
          }}
        >
          ⚠️ Evolution API não configurada. Adicione <code className="bg-black/20 px-1 rounded">VITE_EVOLUTION_API_URL</code> no .env para usar QR Code real. Usando: <span className="opacity-70">{EVOLUTION_URL}</span>
        </div>
      )}

      {/* Create + QR Dialog */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!createdInstance ? (
              <>
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
                  {createMutation.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>
                    : "Criar Instância"}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Escaneie o QR Code com o WhatsApp para conectar
                  <strong className="text-foreground ml-1">{createdInstance}</strong>
                </p>

                <div className="flex flex-col items-center gap-3">
                  {qrLoading ? (
                    <div className="w-48 h-48 flex items-center justify-center bg-secondary rounded-xl border border-border">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : qrCode ? (
                    <img
                      src={qrCode}
                      alt="QR Code WhatsApp"
                      className="w-48 h-48 rounded-xl border border-white/10"
                    />
                  ) : (
                    <div className="w-48 h-48 flex flex-col items-center justify-center bg-secondary rounded-xl border border-border gap-2">
                      <QrCode className="w-10 h-10 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground text-center px-3">
                        QR Code não disponível.<br />Tente atualizar.
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border gap-2"
                    onClick={() => handleRefreshQr(createdInstance)}
                    disabled={qrLoading}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
                    Atualizar QR
                  </Button>
                </div>

                <Button onClick={handleClose} className="w-full" variant="outline">
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (instances as any[]).length === 0 ? (
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
          {(instances as any[]).map((inst) => (
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
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground font-mono truncate">{inst.id}</p>
                {(inst.status !== "connected" && inst.status !== "open") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border gap-2 text-xs"
                    onClick={async () => {
                      const name = inst.instance_name || inst.name;
                      if (!name) return;
                      setCreatedInstance(name);
                      setOpen(true);
                      setQrLoading(true);
                      const qr = await evoGetQRCode(name);
                      setQrCode(qr);
                      setQrLoading(false);
                    }}
                  >
                    <QrCode className="w-3.5 h-3.5" /> Ver QR Code
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UpgradeModal {...upgradeProps} />
    </div>
  );
}
