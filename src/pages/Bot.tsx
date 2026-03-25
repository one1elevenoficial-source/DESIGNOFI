import { useState, useEffect } from 'react';
import { Bot as BotIcon, Shield, TrendingUp, Sparkles, Save, Loader2, Zap, BookOpen, Plus, Trash2, Search, X, Upload, FileText, HelpCircle, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  persona: string;
  horario_inicio: string;
  horario_fim: string;
  handoff_humano: boolean;
  regras: string[];
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
  persona: '',
  horario_inicio: '08:00',
  horario_fim: '20:00',
  handoff_humano: true,
  regras: [],
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

type KbTab = 'text' | 'faq' | 'url';
type KbItem = {
  id: string;
  item_type: string;
  title: string;
  content?: string | null;
  question?: string | null;
  answer?: string | null;
  url?: string | null;
  tags?: string[];
  file_url?: string | null;
  file_name?: string | null;
  created_at?: string | null;
};

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
  const [newRegra, setNewRegra] = useState('');

  // ── Knowledge Base state ─────────────────────────────────────────────────
  const [kbTab, setKbTab] = useState<KbTab>('text');
  const [kbSearch, setKbSearch] = useState('');
  const [kbSaving, setKbSaving] = useState(false);
  const [kbUploadDragging, setKbUploadDragging] = useState(false);

  const [kbTextForm, setKbTextForm] = useState({ titulo: '', conteudo: '', tags: [] as string[], tagInput: '' });
  const [kbFaqForm, setKbFaqForm] = useState({ pergunta: '', resposta: '', tags: [] as string[], tagInput: '' });
  const [kbUrlForm, setKbUrlForm] = useState({ titulo: '', url: '', descricao: '', tags: [] as string[], tagInput: '' });

  // ── Load bot config ──────────────────────────────────────────────────────
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

  // ── Load Knowledge Base items ────────────────────────────────────────────
  const { data: kbItems = [], refetch: refetchKb } = useQuery({
    queryKey: ['kb-items', currentWorkspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('client_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as KbItem[];
    },
    staleTime: 15_000,
    retry: 1,
  });

  const textCount = kbItems.filter((i) => i.item_type === 'text').length;
  const faqCount  = kbItems.filter((i) => i.item_type === 'faq').length;
  const urlCount  = kbItems.filter((i) => i.item_type === 'url').length;
  const docCount  = kbItems.filter((i) => i.item_type === 'document').length;

  const filteredKbItems = kbItems.filter((i) => {
    const q = kbSearch.toLowerCase();
    if (!q) return true;
    return (
      (i.title || '').toLowerCase().includes(q) ||
      (i.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const update = (field: keyof BotConfig, val: any) => {
    setConfig((prev) => ({ ...prev, [field]: val }));
  };

  const handlePreencherExemplo = () => {
    setConfig({
      ...emptyConfig,
      agentName: 'Sofia',
      segment: 'imobiliaria',
      mainProduct: 'Imóveis residenciais e comerciais',
      targetAudience: 'Famílias e investidores buscando imóveis',
      communicationTone: 'consultivo',
      differentials: 'Atendimento personalizado, mais de 10 anos de mercado',
      alwaysDo: 'Perguntar o nome no primeiro contato, ser simpática e profissional',
      neverDo: 'Falar mal de concorrentes, prometer preços sem consultar corretor',
      persona: 'Você é a Sofia, assistente virtual da empresa, especialista em atendimento de leads. Você é simpática, profissional e objetiva. NUNCA revele que é uma IA. Responda sempre em português.',
      horario_inicio: '08:00',
      horario_fim: '20:00',
      handoff_humano: true,
      regras: [
        'Nunca fale mal de concorrentes',
        'Sempre pergunte o nome do cliente no primeiro contato',
        'Se o cliente quiser ver um imóvel, peça o melhor horário',
        'Não prometa preços sem consultar o corretor',
      ],
    });
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

  // ── KB: add tag helper ───────────────────────────────────────────────────
  function addTag<T extends { tags: string[]; tagInput: string }>(
    form: T, setForm: (v: T) => void
  ) {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag], tagInput: '' });
    } else {
      setForm({ ...form, tagInput: '' });
    }
  }

  function removeTag<T extends { tags: string[] }>(
    form: T, setForm: (v: T) => void, tag: string
  ) {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) });
  }

  // ── KB: save item ────────────────────────────────────────────────────────
  const handleKbSave = async () => {
    setKbSaving(true);
    try {
      if (kbTab === 'text') {
        if (!kbTextForm.titulo.trim()) return;
        await supabase.from('knowledge_base').insert({
          client_id: currentWorkspace.id,
          workspace_id: currentWorkspace.id,
          item_type: 'text',
          title: kbTextForm.titulo,
          content: kbTextForm.conteudo,
          tags: kbTextForm.tags,
          source: 'manual',
        });
        setKbTextForm({ titulo: '', conteudo: '', tags: [], tagInput: '' });
      } else if (kbTab === 'faq') {
        if (!kbFaqForm.pergunta.trim()) return;
        await supabase.from('knowledge_base').insert({
          client_id: currentWorkspace.id,
          workspace_id: currentWorkspace.id,
          item_type: 'faq',
          title: kbFaqForm.pergunta,
          content: kbFaqForm.resposta,
          question: kbFaqForm.pergunta,
          answer: kbFaqForm.resposta,
          tags: kbFaqForm.tags,
          source: 'manual',
        });
        setKbFaqForm({ pergunta: '', resposta: '', tags: [], tagInput: '' });
      } else if (kbTab === 'url') {
        if (!kbUrlForm.titulo.trim()) return;
        await supabase.from('knowledge_base').insert({
          client_id: currentWorkspace.id,
          workspace_id: currentWorkspace.id,
          item_type: 'url',
          title: kbUrlForm.titulo,
          content: kbUrlForm.descricao,
          url: kbUrlForm.url,
          tags: kbUrlForm.tags,
          source: 'manual',
        });
        setKbUrlForm({ titulo: '', url: '', descricao: '', tags: [], tagInput: '' });
      }
      refetchKb();
    } catch (e) {
      console.error(e);
    } finally {
      setKbSaving(false);
    }
  };

  // ── KB: delete item ──────────────────────────────────────────────────────
  const handleKbDelete = async (item: KbItem) => {
    if (item.item_type === 'document' && item.file_url) {
      const path = item.file_url.split('/knowledge-files/')[1];
      if (path) {
        await supabase.storage.from('knowledge-files').remove([decodeURIComponent(path)]);
      }
    }
    await supabase.from('knowledge_base').delete().eq('id', item.id);
    refetchKb();
  };

  // ── KB: document upload ──────────────────────────────────────────────────
  const handleDocUpload = async (file: File) => {
    const path = `${currentWorkspace.id}/kb/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('knowledge-files').upload(path, file);
    if (error) { console.error(error); return; }
    const { data: { publicUrl } } = supabase.storage.from('knowledge-files').getPublicUrl(path);
    await supabase.from('knowledge_base').insert({
      client_id: currentWorkspace.id,
      workspace_id: currentWorkspace.id,
      item_type: 'document',
      title: file.name,
      content: `Documento: ${file.name}`,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      source: 'upload',
    });
    refetchKb();
  };

  const preview = config.agentName
    ? `Olá! Sou ${config.agentName}${config.mainProduct ? `, especialista em ${config.mainProduct}` : ''} da ${currentWorkspace.name}. ${config.communicationTone && toneLabel[config.communicationTone] ? `Aqui, ${toneLabel[config.communicationTone]}.` : ''} Em que posso te ajudar hoje? 😊`
    : 'Preencha o formulário ao lado para ver o preview do seu agente.';

  const kbTabIcons: Record<KbTab, React.ReactNode> = {
    text: <FileText className="w-3.5 h-3.5" />,
    faq: <HelpCircle className="w-3.5 h-3.5" />,
    url: <Link2 className="w-3.5 h-3.5" />,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-foreground">Configuração do Bot</h1>
          <p className="text-muted-foreground mt-1">Configure seu agente de vendas com IA</p>
        </div>
        <button
          onClick={handlePreencherExemplo}
          className="flex items-center gap-2 px-4 py-2 border border-[#00e85e]/40 text-[#00e85e] text-sm rounded-lg hover:bg-[#00e85e]/8 transition-all"
          style={{ '--tw-bg-opacity': 1 } as any}
        >
          <Zap className="w-4 h-4" />
          Preencher com exemplo de imobiliária
        </button>
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

                {/* Persona */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Persona / Prompt de sistema</label>
                  <Textarea
                    value={config.persona}
                    onChange={(e) => update('persona', e.target.value)}
                    placeholder="Ex: Você é a Sofia, assistente virtual especialista em atendimento..."
                    className="bg-secondary border-border"
                    rows={3}
                  />
                </div>

                {/* Horários e Handoff */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Horário início</label>
                    <Input
                      type="time"
                      value={config.horario_inicio}
                      onChange={(e) => update('horario_inicio', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Horário fim</label>
                    <Input
                      type="time"
                      value={config.horario_fim}
                      onChange={(e) => update('horario_fim', e.target.value)}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Handoff humano</label>
                    <div className="flex items-center gap-2 h-9 mt-1">
                      <Switch
                        checked={config.handoff_humano}
                        onCheckedChange={(v) => update('handoff_humano', v)}
                      />
                      <span className="text-sm text-muted-foreground">{config.handoff_humano ? 'Ativo' : 'Inativo'}</span>
                    </div>
                  </div>
                </div>

                {/* Regras */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Regras do agente</label>
                  <div className="space-y-2">
                    {config.regras.map((regra, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                        <span className="text-sm text-foreground flex-1">{regra}</span>
                        <button
                          onClick={() => update('regras', config.regras.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newRegra}
                        onChange={(e) => setNewRegra(e.target.value)}
                        placeholder="Adicionar regra..."
                        className="bg-secondary border-border"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newRegra.trim()) {
                            update('regras', [...config.regras, newRegra.trim()]);
                            setNewRegra('');
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-border"
                        onClick={() => {
                          if (newRegra.trim()) {
                            update('regras', [...config.regras, newRegra.trim()]);
                            setNewRegra('');
                          }
                        }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
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

            {/* ── BASE DE CONHECIMENTO ──────────────────────────────────────── */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Base de Conhecimento
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { label: 'Texto', count: textCount },
                      { label: 'FAQ', count: faqCount },
                      { label: 'URL', count: urlCount },
                      { label: 'Doc', count: docCount },
                    ].map(({ label, count }) => (
                      <Badge key={label} variant="outline" className="border-border text-xs">
                        {label}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Abas de criação */}
                <div className="flex gap-1 border-b border-border">
                  {(['text', 'faq', 'url'] as KbTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setKbTab(tab)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                        kbTab === tab
                          ? 'text-primary border-b-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {kbTabIcons[tab]}
                      {tab === 'text' ? 'Texto' : tab === 'faq' ? 'FAQ' : 'URL'}
                    </button>
                  ))}
                </div>

                {/* Aba Texto */}
                {kbTab === 'text' && (
                  <div className="space-y-3">
                    <Input
                      placeholder="Título *"
                      value={kbTextForm.titulo}
                      onChange={(e) => setKbTextForm({ ...kbTextForm, titulo: e.target.value })}
                      className="bg-secondary border-border"
                    />
                    <Textarea
                      placeholder="Conteúdo..."
                      value={kbTextForm.conteudo}
                      onChange={(e) => setKbTextForm({ ...kbTextForm, conteudo: e.target.value })}
                      className="bg-secondary border-border"
                      rows={4}
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {kbTextForm.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-border gap-1 text-xs">
                            {tag}
                            <button onClick={() => removeTag(kbTextForm, setKbTextForm, tag)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Tags (Enter para adicionar)"
                        value={kbTextForm.tagInput}
                        onChange={(e) => setKbTextForm({ ...kbTextForm, tagInput: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(kbTextForm, setKbTextForm); } }}
                        className="bg-secondary border-border text-sm"
                      />
                    </div>
                    <Button onClick={handleKbSave} disabled={kbSaving || !kbTextForm.titulo.trim()} size="sm" className="btn-premium">
                      {kbSaving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Salvando...</> : 'Salvar'}
                    </Button>
                  </div>
                )}

                {/* Aba FAQ */}
                {kbTab === 'faq' && (
                  <div className="space-y-3">
                    <Input
                      placeholder="Pergunta *"
                      value={kbFaqForm.pergunta}
                      onChange={(e) => setKbFaqForm({ ...kbFaqForm, pergunta: e.target.value })}
                      className="bg-secondary border-border"
                    />
                    <Textarea
                      placeholder="Resposta..."
                      value={kbFaqForm.resposta}
                      onChange={(e) => setKbFaqForm({ ...kbFaqForm, resposta: e.target.value })}
                      className="bg-secondary border-border"
                      rows={3}
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {kbFaqForm.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-border gap-1 text-xs">
                            {tag}
                            <button onClick={() => removeTag(kbFaqForm, setKbFaqForm, tag)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Tags (Enter para adicionar)"
                        value={kbFaqForm.tagInput}
                        onChange={(e) => setKbFaqForm({ ...kbFaqForm, tagInput: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(kbFaqForm, setKbFaqForm); } }}
                        className="bg-secondary border-border text-sm"
                      />
                    </div>
                    <Button onClick={handleKbSave} disabled={kbSaving || !kbFaqForm.pergunta.trim()} size="sm" className="btn-premium">
                      {kbSaving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Salvando...</> : 'Salvar'}
                    </Button>
                  </div>
                )}

                {/* Aba URL */}
                {kbTab === 'url' && (
                  <div className="space-y-3">
                    <Input
                      placeholder="Título *"
                      value={kbUrlForm.titulo}
                      onChange={(e) => setKbUrlForm({ ...kbUrlForm, titulo: e.target.value })}
                      className="bg-secondary border-border"
                    />
                    <Input
                      placeholder="URL (https://...)"
                      value={kbUrlForm.url}
                      onChange={(e) => setKbUrlForm({ ...kbUrlForm, url: e.target.value })}
                      className="bg-secondary border-border"
                    />
                    <Input
                      placeholder="Descrição"
                      value={kbUrlForm.descricao}
                      onChange={(e) => setKbUrlForm({ ...kbUrlForm, descricao: e.target.value })}
                      className="bg-secondary border-border"
                    />
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {kbUrlForm.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-border gap-1 text-xs">
                            {tag}
                            <button onClick={() => removeTag(kbUrlForm, setKbUrlForm, tag)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Input
                        placeholder="Tags (Enter para adicionar)"
                        value={kbUrlForm.tagInput}
                        onChange={(e) => setKbUrlForm({ ...kbUrlForm, tagInput: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(kbUrlForm, setKbUrlForm); } }}
                        className="bg-secondary border-border text-sm"
                      />
                    </div>
                    <Button onClick={handleKbSave} disabled={kbSaving || !kbUrlForm.titulo.trim()} size="sm" className="btn-premium">
                      {kbSaving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Salvando...</> : 'Salvar'}
                    </Button>
                  </div>
                )}

                {/* Upload de documentos */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setKbUploadDragging(true); }}
                  onDragLeave={() => setKbUploadDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setKbUploadDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleDocUpload(file);
                  }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                    kbUploadDragging ? 'border-primary/60 bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.pdf,.docx,.txt,.csv';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleDocUpload(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Arraste um arquivo ou <span className="text-primary">clique para selecionar</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">.pdf, .docx, .txt, .csv</p>
                </div>

                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título ou tag..."
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                    className="pl-10 bg-secondary border-border"
                  />
                </div>

                {/* Lista de itens */}
                <div className="space-y-2">
                  {filteredKbItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum item na base de conhecimento.</p>
                  ) : (
                    filteredKbItems.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 p-3 bg-secondary/40 rounded-lg border border-border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                            <Badge variant="outline" className="text-[10px] px-1.5 border-border">
                              {item.item_type}
                            </Badge>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.tags.map((tag) => (
                                <span key={tag} className="text-[10px] text-muted-foreground bg-secondary rounded-full px-1.5 py-0.5">{tag}</span>
                              ))}
                            </div>
                          )}
                          {item.created_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleKbDelete(item)}
                          className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
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
