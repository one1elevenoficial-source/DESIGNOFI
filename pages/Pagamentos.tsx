import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, DollarSign, Calendar, CheckCircle, AlertCircle, Download, QrCode, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const PIX_KEY = "19991322809";

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  billing_cycle: string;
  price_cents: number;
  current_period_end: string;
  asaas_subscription_id?: string;
  created_at: string;
}

interface Invoice {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  url?: string;
}

const PLAN_INFO = {
  solo: { name: 'Solo', color: 'bg-blue-500' },
  profissional: { name: 'Profissional', color: 'bg-purple-500' },
  equipe: { name: 'Equipe', color: 'bg-amber-500' },
  empresa: { name: 'Empresa', color: 'bg-red-500' },
};

export default function Pagamentos() {
  const { profile } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [currentWorkspace?.id]);

  const loadSubscription = async () => {
    if (!currentWorkspace?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setSubscription(data || null);

      // Mock invoices para demonstração
      if (data) {
        const mockInvoices: Invoice[] = [
          {
            id: '1',
            status: 'paid',
            value: data.price_cents / 100,
            dueDate: new Date(data.current_period_end).toLocaleDateString('pt-BR'),
          },
          {
            id: '2',
            status: 'pending',
            value: data.price_cents / 100,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
          },
        ];
        setInvoices(mockInvoices);
      }
    } catch (error) {
      console.error('Erro ao carregar assinatura:', error);
      toast({ title: 'Erro', description: 'Não foi possível carregar a assinatura', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePixQr = async () => {
    try {
      // Chamaria API para gerar QR Code PIX real
      // Por enquanto, simula
      const mockQr = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23fff' width='200' height='200'/%3E%3Ctext x='50%' y='50%' text-anchor='middle' dy='.3em' font-size='24' fill='%23000'%3EPIX%3C/text%3E%3C/svg%3E`;
      setPixQrCode(mockQr);
      setShowPixModal(true);
    } catch (error) {
      console.error('Erro:', error);
      toast({ title: 'Erro', description: 'Erro ao gerar QR Code', variant: 'destructive' });
    }
  };

  const copyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      toast({ title: 'Copiado!', description: 'Chave PIX copiada para a área de transferência' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.id) return;

    try {
      const response = await fetch('/api/billing?action=cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': currentWorkspace?.id || '',
          'x-api-token': localStorage.getItem('api_token') || '',
        },
        body: JSON.stringify({ subscriptionId: subscription.asaas_subscription_id }),
      });

      if (!response.ok) throw new Error('Erro ao cancelar');

      toast({ title: 'Sucesso', description: 'Assinatura cancelada' });
      loadSubscription();
    } catch (error) {
      console.error('Erro:', error);
      toast({ title: 'Erro', description: 'Não foi possível cancelar a assinatura', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados de pagamento...</p>
        </div>
      </div>
    );
  }

  const planName = subscription ? PLAN_INFO[subscription.plan_id as keyof typeof PLAN_INFO]?.name : 'Nenhum plano';
  const planColor = subscription ? PLAN_INFO[subscription.plan_id as keyof typeof PLAN_INFO]?.color : 'bg-gray-500';
  const price = subscription ? (subscription.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'N/A';
  const cycle = subscription?.billing_cycle === 'annual' ? 'Anual' : 'Mensal';
  const isActive = subscription?.status === 'active';
  const isPastDue = subscription?.status === 'past_due';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Pagamentos</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua assinatura e faturas</p>
      </div>

      {/* Current Subscription Card */}
      {subscription ? (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Assinatura Ativa
                </CardTitle>
                <CardDescription>Detalhes da sua assinatura atual</CardDescription>
              </div>
              <Badge
                className={cn(
                  isActive ? 'bg-green-500/20 text-green-400' : isPastDue ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400',
                  'text-xs font-semibold'
                )}
              >
                {isActive ? 'Ativa' : isPastDue ? 'Atrasada' : 'Aguardando'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Plano</p>
                <p className="text-lg font-semibold text-foreground">{planName}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Valor</p>
                <p className="text-lg font-semibold text-foreground">{price}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Ciclo</p>
                <p className="text-lg font-semibold text-foreground">{cycle}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Renova em</p>
                <p className="text-lg font-semibold text-foreground">{new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="default"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => window.location.href = '/plans'}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Alterar Plano
              </Button>

              {isPastDue && (
                <Button
                  variant="outline"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  onClick={handleGeneratePixQr}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Pagar com PIX
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                    Cancelar Assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar Assinatura?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você perderá acesso a todos os recursos. Esta ação é irreversível.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogAction
                    onClick={handleCancelSubscription}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Sim, cancelar
                  </AlertDialogAction>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm border-amber-500/50">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle>Nenhuma Assinatura Ativa</CardTitle>
                <CardDescription>Você não tem um plano ativo no momento</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => window.location.href = '/plans'}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Ver Planos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Method */}
      {subscription && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Forma de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-sidebar/50 border border-border/50">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Chave PIX Aleatória</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono bg-sidebar p-2 rounded mt-2">
                    {PIX_KEY}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyPixKey}
                  className="text-primary hover:bg-primary/10"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleGeneratePixQr}
                className="w-full"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Gerar QR Code PIX
              </Button>
              <Button
                variant="outline"
                className="w-full"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Adicionar Cartão
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Faturas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-sidebar/50 border border-border/50 hover:bg-sidebar/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {invoice.status === 'paid' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {(invoice.value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <p className="text-xs text-muted-foreground">Vencimento: {invoice.dueDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        invoice.status === 'paid'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-amber-500/20 text-amber-400',
                        'text-xs'
                      )}
                    >
                      {invoice.status === 'paid' ? 'Pago' : 'Pendente'}
                    </Badge>
                    {invoice.url && (
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PIX QR Code Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Código PIX QR</DialogTitle>
            <DialogDescription>Escaneie com o seu celular para pagar</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {pixQrCode && (
              <img src={pixQrCode} alt="QR Code PIX" className="w-48 h-48 border border-border rounded-lg" />
            )}
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-2">Chave PIX (Copia e Cola):</p>
              <div className="p-3 bg-sidebar rounded border border-border/50 flex items-center justify-between">
                <p className="text-sm font-mono text-foreground">{PIX_KEY}</p>
                <Button variant="ghost" size="sm" onClick={copyPixKey}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
