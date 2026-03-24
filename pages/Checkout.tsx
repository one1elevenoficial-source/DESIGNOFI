import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, QrCode, Copy, Check, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from '@/hooks/use-toast';

const PLANS = {
  solo: { name: 'Solo', price: { monthly: 997, annual: 9576 } },
  profissional: { name: 'Profissional', price: { monthly: 1297, annual: 12456 } },
  equipe: { name: 'Equipe', price: { monthly: 2497, annual: 23976 } },
  empresa: { name: 'Empresa', price: { monthly: 4997, annual: 47976 } },
};

type PaymentMethod = 'pix' | 'credit_card';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const planId = (searchParams.get('plan') || 'profissional') as keyof typeof PLANS;
  const billingCycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'annual';

  const plan = PLANS[planId];
  const price = plan.price[billingCycle];
  const monthlyEquivalent = billingCycle === 'annual' ? Math.round(price / 12) : price;

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.full_name || '',
    email: profile?.email || '',
    cpfCnpj: '',
    phone: '',
  });
  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  const handleCheckout = async () => {
    if (!formData.cpfCnpj) {
      toast({ title: 'Erro', description: 'Preencha o CPF/CNPJ', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const apiToken = localStorage.getItem('api_token');
      
      const response = await fetch('/api/billing?action=checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': currentWorkspace?.id || '',
          'x-api-token': apiToken || '',
        },
        body: JSON.stringify({
          planId,
          billingCycle,
          paymentMethod,
          customer: {
            name: formData.name,
            email: formData.email,
            cpfCnpj: formData.cpfCnpj.replace(/\D/g, ''),
            phone: formData.phone.replace(/\D/g, ''),
          },
          ...(paymentMethod === 'credit_card' ? { card: cardData } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar pagamento');
      }

      if (paymentMethod === 'pix' && data.pixQrCode) {
        setPixQrCode(data.pixQrCode);
        setPixCopyPaste(data.pixCopyPaste);
        toast({ title: 'PIX QR Code Gerado', description: 'Escaneie para completar o pagamento' });
      } else {
        toast({ title: 'Sucesso!', description: 'Assinatura criada com sucesso' });
        setTimeout(() => navigate('/pagamentos'), 2000);
      }
    } catch (error) {
      console.error(error);
      toast({ 
        title: 'Erro', 
        description: error instanceof Error ? error.message : 'Erro ao processar pagamento', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const copyPixKey = () => {
    if (pixCopyPaste) {
      navigator.clipboard.writeText(pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copiado!', description: 'Chave PIX copiada' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Checkout</h1>
        <p className="text-muted-foreground mt-1">Finalize seu pagamento para ativar o plano</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          <Card className="bg-card/50 border-primary/30">
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{plan.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{billingCycle === 'annual' ? 'Anual' : 'Mensal'}</p>
                </div>
                <p className="text-lg font-bold text-foreground">R$ {(price / 100).toLocaleString('pt-BR')}</p>
              </div>

              {billingCycle === 'annual' && (
                <div className="p-3 bg-success/10 border border-success/30 rounded-lg">
                  <p className="text-xs text-success font-medium">
                    ✓ Você economiza R$ {((price / 12) * 2.4 - monthlyEquivalent).toLocaleString('pt-BR')} comparado ao plano mensal
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados Pessoais */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-secondary border-border"
                  placeholder="João Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="bg-secondary border-border"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-secondary border-border"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF/CNPJ</Label>
                <Input
                  id="cpf"
                  value={formData.cpfCnpj}
                  onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                  className="bg-secondary border-border"
                  placeholder="000.000.000-00"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Método de Pagamento */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Método de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <div className="flex items-center space-x-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setPaymentMethod('pix')}
                >
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">PIX</p>
                      <p className="text-xs text-muted-foreground">Instantâneo, seguro e sem taxa</p>
                    </div>
                  </Label>
                  <QrCode className="w-5 h-5 text-primary" />
                </div>

                <div className="flex items-center space-x-4 p-4 border border-border rounded-lg cursor-pointer hover:bg-secondary/30 transition-colors mt-3"
                  onClick={() => setPaymentMethod('credit_card')}
                >
                  <RadioGroupItem value="credit_card" id="credit_card" />
                  <Label htmlFor="credit_card" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">Cartão de Crédito</p>
                      <p className="text-xs text-muted-foreground">Parcelado em até 12x</p>
                    </div>
                  </Label>
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
              </RadioGroup>

              {paymentMethod === 'credit_card' && (
                <div className="mt-4 space-y-4 pt-4 border-t border-border/50">
                  <div className="space-y-2">
                    <Label htmlFor="holderName">Nome do Titular</Label>
                    <Input
                      id="holderName"
                      value={cardData.holderName}
                      onChange={(e) => setCardData({ ...cardData, holderName: e.target.value })}
                      className="bg-secondary border-border"
                      placeholder="João Silva"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Número do Cartão</Label>
                    <Input
                      id="cardNumber"
                      value={cardData.number}
                      onChange={(e) => setCardData({ ...cardData, number: e.target.value.replace(/\D/g, '') })}
                      className="bg-secondary border-border"
                      placeholder="0000 0000 0000 0000"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryMonth">Mês</Label>
                      <Input
                        id="expiryMonth"
                        maxLength={2}
                        value={cardData.expiryMonth}
                        onChange={(e) => setCardData({ ...cardData, expiryMonth: e.target.value })}
                        className="bg-secondary border-border"
                        placeholder="12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryYear">Ano</Label>
                      <Input
                        id="expiryYear"
                        maxLength={2}
                        value={cardData.expiryYear}
                        onChange={(e) => setCardData({ ...cardData, expiryYear: e.target.value })}
                        className="bg-secondary border-border"
                        placeholder="25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        maxLength={4}
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                        className="bg-secondary border-border"
                        placeholder="000"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full btn-premium h-12"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              `Pagar R$ ${(price / 100).toLocaleString('pt-BR')}`
            )}
          </Button>
        </div>

        {/* Sidebar - Resumo */}
        <div>
          <Card className="bg-card/50 border-border/50 sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Detalhes da Assinatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">PLANO</p>
                <p className="font-semibold text-foreground">{plan.name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">PERÍODO</p>
                <p className="font-semibold text-foreground capitalize">
                  {billingCycle === 'annual' ? 'Anual' : 'Mensal'}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">VALOR</p>
                <p className="font-semibold text-foreground">R$ {(price / 100).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">
                  R$ {(monthlyEquivalent / 100).toLocaleString('pt-BR')} por mês
                </p>
              </div>
              <div className="pt-4 border-t border-border/50 space-y-2">
                <p className="text-xs text-muted-foreground">BENEFÍCIOS</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Início na próxima segunda</li>
                  <li>✓ 7 dias de garantia</li>
                  <li>✓ Cancelamento a qualquer momento</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PIX QR Code Modal */}
      {pixQrCode && (
        <AlertDialog open={!!pixQrCode} onOpenChange={() => setPixQrCode(null)}>
          <AlertDialogContent className="bg-card border-border max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Escaneie o QR Code</AlertDialogTitle>
              <AlertDialogDescription>
                Use seu WhatsApp ou app do seu banco para escanear
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <img src={pixQrCode} alt="PIX QR Code" className="w-56 h-56 border-2 border-border rounded-lg" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Ou copie a chave PIX:</p>
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                  <code className="text-xs flex-1 truncate font-mono text-foreground">
                    {pixCopyPaste}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPixKey}
                    className="flex-shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertDialogCancel>Fechar</AlertDialogCancel>
              <AlertDialogAction onClick={() => navigate('/pagamentos')} className="btn-premium">
                Já Paguei
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
