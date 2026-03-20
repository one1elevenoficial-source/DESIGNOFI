import { useState, useEffect } from 'react';
import { Bot as BotIcon, Shield, TrendingUp, Sparkles, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type BotConfig = {
  agentName: string;
  segment: string;
  mainProduct: string;
  differentials: string;
  targetAudience: string;
  communicationTone: string;
  alwaysDo: string;
  neverDo: string;
};

const emptyConfig: BotConfig = {
  agentName: '',
  segment: '',
  mainProduct: '',
  differentials: '',
  targetAudience: '',
  communicationTone: 'consultivo',
  alwaysDo: '',
  neverDo: '',
};

const toneLabel: Record<string, string> = {
  formal: 'srei formal e objetivo com você',
  casual: 'vou falar de um jeito descontraído',
  consultivo: 'vou te ajudar a encontrar a melhor solução',
  amigavel: 'quero ser seu parceiro nessa jornada',
};

const antiLoucuraRules = [
  { key: 'noPriceInvention', label: 'Não inventar preço', desc: 'O bot nunca inventa valores' },
  { key: 'respectStop', label: 'Respeitar STOP', desc: 'Para imediatamente se cliente pedir' },
  { key: 'noPromises', label: 'Não prometer resultado', desc: 'Evita garantias falsas' },
  { key: 'humanHandoff', label: 'Handoff humano', desc: 'Transfere quando necessário' },
];

export default function Bot() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  const [config, setConfig] = useState<BotConfig>(emptyConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rulesEnabled, setRulesEnabled] = useState({
    noPriceInvention: true,
    respectStop: true,
    noPromises: true,
    humanHandoff: true,
  });

  // Carregar config salva do Supabase
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['bot-config', currentWorkspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('workspaces')
        .select('bot_config')
        .eq('id', currentWorkspace.id)
        .single();
      return data?.bot_config ?? null;
    },
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (savedConfig && typeof savedConfig === 'object') {
      setConfig({ ...emptyConfig, ...savedConfig });
    }
  }, [savedConfig]);

  const update = (field: keyof BotConfig, val: string) => {
    setConfig((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('workspaces')
        .update({ bot_config: config })
        .eq('id', currentWorkspace.id);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['bot-config'] });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const preview = config.agentName
    ? `Olá! Sou ${config.agentName}${config.mainProduct ? `, especialista em ${config.mainProduct}` : ''} da ${currentWorkspace.name}. ${config.communicationTone && toneLabel[config.communicationTone] ? `Aqui, ${toneLabel[config.communicationTone]}.` : ''} Em que posso te ajudar hoje? 😊`
    : 'Preencha o formulário ao lado para ver o preview do seu agente.';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Configuração do Bot</h1>
          <p className="text-muted-foreground mt-1">Configure seu agente de vendas com IA</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Formulário — 3 colunas */}
          <div className="lg:col-span-3 space-y-6">
            {/* Identidade */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BotIcon className="w-4 h-4 text-primary" />
                  Identidade do Agente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Nome do Agente</label>
                    <Input
                      value={config.agentName}
                      onChange={(e) => update('agentName', e.target.value)}
                      placeholder="Ex: Lia, Max, Sofia..."
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Tom de Comunicação</label>
                    <Select value={config.communicationTone} onValueChange={(v) => update('communicationTone', v)}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione o tom" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="consultivo">Consultivo</SelectItem>
                        <SelectItem value="amigavel">Amigável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Missão */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Missão e Contexto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Segmento</label>
                    <Select value={config.segment} onValueChange={(v) => update('segment', v)}>
                      <SelectTrigger className="bg-secondary border-border">
                        <SelectValue placeholder="Selecione o segmento" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="imobiliaria">Imobiliária</SelectItem>
                        <SelectItem value="clinica">Clínica</SelectItem>
                        <SelectItem value="loja">Loja</SelectItem>
                        <SelectItem value="servicos">Serviços</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Produto / Serviço Principal</label>
                    <Input
                      value={config.mainProduct}
                      onChange={(e) => update('mainProduct', e.target.value)}
                      placeholder="Ex: Apartamentos de alto padrão"
                      className="bg-secondary border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Público-alvo</label>
                  <Input
                    value={config.targetAudience}
                    onChange={(e) => update('targetAudience', e.target.value)}
                    placeholder="Ex: Famílias de classe média buscando primeiro imóvel"
                    className="bg-secondary border-border"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Diferenciais da Empresa
                    <span className="text-muted-foreground font-normal ml-2 text-xs">({config.differentials.length}/200)</span>
                  </label>
                  <Textarea
                    value={config.differentials}
                    onChange={(e) => update('differentials', e.target.value.slice(0, 200))}
                    placeholder="Ex: 15 anos de experiência, atendimento personalizado..."
                    className="bg-secondary border-border"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">O agente SEMPRE deve fazer</label>
                    <Textarea
                      value={config.alwaysDo}
                      onChange={(e) => update('alwaysDo', e.target.value)}
                      placeholder="Ex: Se apresentar pelo nome, agradecer pelo contato..."
                      className="bg-secondary border-border"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">O agente NUNCA deve fazer</label>
                    <Textarea
                      value={config.neverDo}
                      onChange={(e) => update('neverDo', e.target.value)}
                      placeholder="Ex: Falar mal de concorrentes, inventar preços..."
                      className="bg-secondary border-border"
                      rows={3}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview em tempo real */}
            <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BotIcon className="w-4 h-4 text-primary animate-pulse" />
                  Preview — Como o bot vai se apresentar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/60 rounded-xl p-4 border border-border">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <BotIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground mb-0.5">
                        {config.agentName || 'Agente'}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{preview}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Atualiza em tempo real conforme você preenche os campos.</p>
              </CardContent>
            </Card>

            {/* Conversões pelo Bot */}
            <Card className="bg-gradient-to-br from-warning/20 via-warning/10 to-card border-warning/30">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-warning/80 font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Conversões pelo Bot
                    </p>
                    <p className="text-4xl font-bold font-display text-warning">0</p>
                    <p className="text-sm text-muted-foreground">
                      Leads que converteram após interação com o agente IA
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="flex items-center gap-2 text-success">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">— este mês</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button className="btn-premium px-8" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : saved ? (
                  '✓ Salvo!'
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Salvar Configurações</>
                )}
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border sticky top-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-destructive" />
                  Regras Anti-Loucura
                </CardTitle>
                <p className="text-xs text-muted-foreground">Limites críticos do agente</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {antiLoucuraRules.map((rule) => (
                  <div
                    key={rule.key}
                    className="flex items-center justify-between gap-3 p-2.5 bg-secondary/50 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{rule.label}</p>
                      <p className="text-[10px] text-muted-foreground">{rule.desc}</p>
                    </div>
                    <Switch
                      checked={rulesEnabled[rule.key as keyof typeof rulesEnabled]}
                      onCheckedChange={(v) => setRulesEnabled((prev) => ({ ...prev, [rule.key]: v }))}
                    />
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-success">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    Todas as regras ativas
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BotIcon className="w-4 h-4 text-primary" />
                  Status do Agente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Respostas hoje', value: '—' },
                  { label: 'Taxa de sucesso', value: '—', color: 'text-success' },
                  { label: 'Handoffs humanos', value: '—', color: 'text-warning' },
                  { label: 'Tempo médio', value: '—' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className={`font-semibold text-foreground ${item.color || ''}`}>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
