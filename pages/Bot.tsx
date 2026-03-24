import { useState, useEffect } from 'react';
import { Bot as BotIcon, Shield, TrendingUp, Sparkles, Save, Loader2, Upload, Trash2, FileText, Zap, X, Plus, Search, Tag, BookOpen } from 'lucide-react';
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
import { useAuth } from '@/lib/AuthContext';

type BotConfig = {
  agentName: string;
  segment: string;
  mainProduct: string;
  differentials: string;
  targetAudience: string;
  communicationTone: string;
  alwaysDo: string;
  neverDo: string;
  persona?: string;
  horario_inicio?: string;
  horario_fim?: string;
  handoff_humano?: boolean;
  regras?: string[];
};

type KnowledgeFile = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
};

type KnowledgeItem = {
  id?: string;
  type: 'texto_livre' | 'faq' | 'url';
  title: string;
  content?: string;
  faq_pergunta?: string;
  faq_resposta?: string;
  url?: string;
  tags: string[];
  created_at?: string;
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
  handoff_humano: false,
  regras: [],
};

const toneLabel: Record<string, string> = {
  formal: 'srei formal e objetivo com você',
  casual: 'vou falar de um jeito descontraído',
  consultivo: 'vou te ajudar a encontrar a melhor solução',
  amigavel: 'quero ser seu parceiro nessa jornada',
};

const DEFAULT_REALESTATE_CONFIG = {
  persona: (workspaceName: string) => 
    `Você é a assistente virtual da ${workspaceName}, especialista em atendimento de leads de imóveis. Seu nome é Sofia. Você é simpática, profissional e objetiva. Nunca revele que é uma IA. Responda sempre em português.`,
  horario_inicio: '08:00',
  horario_fim: '20:00',
  handoff_humano: true,
  regras: [
    'Nunca fale mal de concorrentes',
    'Sempre pergunte o nome do cliente no primeiro contato',
    'Se o cliente quiser ver um imóvel, peça o melhor horário',
    'Não prometa preços sem consultar o corretor'
  ]
};

const antiLoucuraRules = [
  { key: 'noPriceInvention', label: 'Não inventar preço', desc: 'O bot nunca inventa valores' },
  { key: 'respectStop', label: 'Respeitar STOP', desc: 'Para imediatamente se cliente pedir' },
  { key: 'noPromises', label: 'Não prometer resultado', desc: 'Evita garantias falsas' },
  { key: 'humanHandoff', label: 'Handoff humano', desc: 'Transfere quando necessário' },
];

const allowedFileTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv'];
const allowedExtensions = ['.pdf', '.docx', '.txt', '.csv'];

export default function Bot() {
  const { currentWorkspace } = useWorkspace();
  const { profile } = useAuth();
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
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [newRule, setNewRule] = useState('');
  
  // Novos estados para gerenciamento de conhecimento
  const [knowledgeTab, setKnowledgeTab] = useState<'documentos' | 'items'>('documentos');
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [savingItems, setSavingItems] = useState(false);
  const [savedItems, setSavedItems] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  
  // Form para novo item
  const [newItem, setNewItem] = useState<KnowledgeItem>({
    type: 'texto_livre',
    title: '',
    content: '',
    tags: [],
    faq_pergunta: '',
    faq_resposta: '',
    url: '',
  });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [allTags, setAllTags] = useState<string[]>(['preço', 'localidade', 'prazo', 'documentação', 'FAQ', 'contato']);

  // Preencher com exemplo de imobiliária
  const handleFillRealEstateExample = () => {
    setConfig((prev) => ({
      ...prev,
      persona: DEFAULT_REALESTATE_CONFIG.persona(currentWorkspace.name),
      horario_inicio: DEFAULT_REALESTATE_CONFIG.horario_inicio,
      horario_fim: DEFAULT_REALESTATE_CONFIG.horario_fim,
      handoff_humano: DEFAULT_REALESTATE_CONFIG.handoff_humano,
      regras: DEFAULT_REALESTATE_CONFIG.regras,
    }));
  };

  // Carregar knowledge items do Supabase
  const loadKnowledgeItems = async () => {
    setItemsLoading(true);
    try {
      const { data } = await supabase
        .from('knowledge_items')
        .select('*')
        .eq('client_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      setKnowledgeItems((data as KnowledgeItem[]) || []);
    } catch (e) {
      console.error('Erro ao carregar items:', e);
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadKnowledgeItems();
  }, [currentWorkspace.id]);

  const handleAddItem = async () => {
    if (!newItem.title.trim()) {
      alert('Título é obrigatório');
      return;
    }

    if (newItem.type === 'texto_livre' && !newItem.content?.trim()) {
      alert('Conteúdo é obrigatório para Texto Livre');
      return;
    }

    if (newItem.type === 'faq' && (!newItem.faq_pergunta?.trim() || !newItem.faq_resposta?.trim())) {
      alert('Pergunta e Resposta são obrigatórias para FAQ');
      return;
    }

    if (newItem.type === 'url' && !newItem.url?.trim()) {
      alert('URL é obrigatória');
      return;
    }

    setSavingItems(true);
    try {
      const itemToSave = {
        client_id: currentWorkspace.id,
        ...newItem,
        created_at: new Date().toISOString(),
      };

      if (editingItem) {
        await supabase
          .from('knowledge_items')
          .update(itemToSave)
          .eq('id', editingItem);
      } else {
        await supabase
          .from('knowledge_items')
          .insert([itemToSave]);
      }

      setSavedItems(true);
      setTimeout(() => setSavedItems(false), 2000);
      setEditingItem(null);
      loadKnowledgeItems();
      setNewItem({
        type: 'texto_livre',
        title: '',
        content: '',
        tags: [],
        faq_pergunta: '',
        faq_resposta: '',
        url: '',
      });
    } catch (e) {
      console.error('Erro ao salvar item:', e);
      alert('Erro ao salvar item');
    } finally {
      setSavingItems(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja deletar este item?')) return;

    try {
      await supabase
        .from('knowledge_items')
        .delete()
        .eq('id', itemId);
      loadKnowledgeItems();
    } catch (e) {
      console.error('Erro ao deletar item:', e);
      alert('Erro ao deletar item');
    }
  };

  const addTagToItem = () => {
    if (newTag.trim() && !newItem.tags.includes(newTag)) {
      setNewItem((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }));
      setNewTag('');
    }
  };

  const removeTagFromItem = (tag: string) => {
    setNewItem((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const filteredItems = knowledgeItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.faq_pergunta?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.some((tag) => item.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });

  const countByType = (type: string) => {
    return knowledgeItems.filter((item) => item.type === type).length;
  };
  const { data: savedConfig, isLoading } = useQuery({
    queryKey: ['bot-config', currentWorkspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('client_id', currentWorkspace.id)
        .single();
      return data ?? null;
    },
    staleTime: 30_000,
    retry: 1,
  });

  // Carregar arquivos da base de conhecimento
  const { data: knowledgeFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ['knowledge-files', currentWorkspace.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('client_id', currentWorkspace.id)
        .order('created_at', { ascending: false });
      return (data as KnowledgeFile[]) || [];
    },
    staleTime: 15_000,
    retry: 1,
  });

  useEffect(() => {
    if (savedConfig && typeof savedConfig === 'object') {
      const loadedConfig = { ...emptyConfig, ...savedConfig };
      // Se persona estiver vazia, preencher com exemplo de imobiliária
      if (!loadedConfig.persona || loadedConfig.persona.trim() === '') {
        loadedConfig.persona = DEFAULT_REALESTATE_CONFIG.persona(currentWorkspace.name);
        loadedConfig.horario_inicio = DEFAULT_REALESTATE_CONFIG.horario_inicio;
        loadedConfig.horario_fim = DEFAULT_REALESTATE_CONFIG.horario_fim;
        loadedConfig.handoff_humano = DEFAULT_REALESTATE_CONFIG.handoff_humano;
        loadedConfig.regras = DEFAULT_REALESTATE_CONFIG.regras;
      }
      setConfig(loadedConfig);
    }
  }, [savedConfig, currentWorkspace.name]);

  const update = (field: keyof BotConfig, val: string) => {
    setConfig((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('bot_configs')
        .upsert(
          {
            client_id: currentWorkspace.id,
            agentName: config.agentName,
            segment: config.segment,
            mainProduct: config.mainProduct,
            differentials: config.differentials,
            targetAudience: config.targetAudience,
            communicationTone: config.communicationTone,
            alwaysDo: config.alwaysDo,
            neverDo: config.neverDo,
            persona: config.persona,
            horario_inicio: config.horario_inicio,
            horario_fim: config.horario_fim,
            handoff_humano: config.handoff_humano,
            regras: config.regras,
          },
          { onConflict: 'client_id' }
        );
      setSaved(true);
      qc.invalidateQueries({ queryKey: ['bot-config'] });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    if (newRule.trim()) {
      setConfig((prev) => ({
        ...prev,
        regras: [...(prev.regras || []), newRule],
      }));
      setNewRule('');
    }
  };

  const removeRule = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      regras: (prev.regras || []).filter((_, i) => i !== index),
    }));
  };

  const handleFileUpload = async (files: File[]) => {
    if (!files.length) return;

    setUploading(true);
    try {
      const profile = await supabase.auth.getUser();
      const apiToken = localStorage.getItem('api_token');

      for (const file of files) {
        // Validar tipo de arquivo
        const isValidType = allowedFileTypes.includes(file.type) || 
          allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isValidType) {
          alert(`Arquivo ${file.name} não é suportado. Use: PDF, DOCX, TXT ou CSV`);
          continue;
        }

        // Enviar para API de billing (knowledge action)
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/billing?action=knowledge', {
          method: 'POST',
          headers: {
            'x-workspace-id': currentWorkspace.id,
            'x-api-token': apiToken || '',
          },
          body: formData,
        });

        if (!response.ok) {
          console.error('Upload error:', response.statusText);
          alert(`Erro ao fazer upload de ${file.name}`);
          continue;
        }
      }

      // Invalidar query para atualizar lista
      qc.invalidateQueries({ queryKey: ['knowledge-files', currentWorkspace.id] });
    } catch (e) {
      console.error('Error:', e);
      alert('Erro ao fazer upload dos arquivos');
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    if (!confirm('Tem certeza que deseja deletar este arquivo?')) return;

    try {
      const apiToken = localStorage.getItem('api_token');

      const response = await fetch(`/api/billing?action=knowledge&id=${fileId}`, {
        method: 'DELETE',
        headers: {
          'x-workspace-id': currentWorkspace.id,
          'x-api-token': apiToken || '',
        },
      });

      if (!response.ok) {
        console.error('Delete error:', response.statusText);
        alert('Erro ao deletar arquivo');
        return;
      }

      // Atualizar lista
      qc.invalidateQueries({ queryKey: ['knowledge-files', currentWorkspace.id] });
    } catch (e) {
      console.error('Error:', e);
      alert('Erro ao deletar arquivo');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
        <Button
          onClick={handleFillRealEstateExample}
          variant="outline"
          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-semibold"
        >
          <Zap className="w-4 h-4 mr-2" />
          Preencher com exemplo de imobiliária
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Card Dourado com Borda — Primeiro Elemento */}
          <Card 
            className="bg-card/50 border-border hover:border-warning/50 transition-colors"
            style={{
              border: '1px solid rgba(255,215,0,0.3)',
              background: 'linear-gradient(135deg, rgba(255,215,0,0.05) 0%, transparent 100%)',
              boxShadow: '0 0 20px rgba(255,215,0,0.08)',
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status do Agente</p>
                  <p className="text-xl font-bold text-yellow-400 mt-1">
                    {config.agentName || 'Não configurado'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Seu agente está {config.agentName ? 'pronto para usar' : 'aguardando configuração'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Base de Conhecimento */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Base de Conhecimento
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Envie documentos para treinar seu agente (PDF, DOCX, TXT, CSV)</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag & Drop */}
              <div
                onDragEnter={() => setDragActive(true)}
                onDragLeave={() => setDragActive(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const files = Array.from(e.dataTransfer.files) as File[];
                  handleFileUpload(files);
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.csv"
                  disabled={uploading}
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileUpload(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {uploading ? 'Enviando...' : 'Arraste arquivos aqui ou clique para selecionar'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT ou CSV (máx. 5MB cada)</p>
                  </div>
                </label>
              </div>

              {/* Lista de Arquivos */}
              {filesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : knowledgeFiles.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Arquivos Enviados ({knowledgeFiles.length})</p>
                  {knowledgeFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFile(file.id, file.file_url)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum arquivo enviado ainda</p>
              )}
            </CardContent>
          </Card>

          {/* Gestão de Items de Conhecimento */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Gestão de Conhecimento
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Criar e organizar items de texto, FAQs e URLs com tags</p>
                </div>
              </div>
              
              {/* Abas e Contadores */}
              <div className="flex gap-4 mt-4 border-b border-border">
                <button
                  onClick={() => setKnowledgeTab('documentos')}
                  className={`pb-2 px-2 text-sm font-medium transition-colors ${
                    knowledgeTab === 'documentos'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-4 h-4 inline mr-2" />
                  Documentos ({knowledgeFiles.length})
                </button>
                <button
                  onClick={() => setKnowledgeTab('items')}
                  className={`pb-2 px-2 text-sm font-medium transition-colors ${
                    knowledgeTab === 'items'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BookOpen className="w-4 h-4 inline mr-2" />
                  Items ({knowledgeItems.length})
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4 pt-4">
              {knowledgeTab === 'items' && (
                <>
                  {/* Contadores */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">Texto Livre</p>
                      <p className="text-2xl font-bold text-primary">{countByType('texto_livre')}</p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">FAQ</p>
                      <p className="text-2xl font-bold text-primary">{countByType('faq')}</p>
                    </div>
                    <div className="p-3 bg-secondary/50 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground">URLs</p>
                      <p className="text-2xl font-bold text-primary">{countByType('url')}</p>
                    </div>
                  </div>

                  {/* Busca e Filtros */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Buscar por título ou conteúdo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-secondary border-border"
                      />
                    </div>

                    {/* Filtro de Tags */}
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            setSelectedTags((prev) =>
                              prev.includes(tag)
                                ? prev.filter((t) => t !== tag)
                                : [...prev, tag]
                            );
                          }}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            selectedTags.includes(tag)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary border border-border hover:bg-primary/10'
                          }`}
                        >
                          <Tag className="w-3 h-3 inline mr-1" />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formulário para Novo Item */}
                  <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      {editingItem ? 'Editar Item' : 'Novo Item'}
                    </h3>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Tipo</label>
                      <Select value={newItem.type} onValueChange={(v: any) => setNewItem((prev) => ({ ...prev, type: v }))}>
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          <SelectItem value="texto_livre">Texto Livre</SelectItem>
                          <SelectItem value="faq">FAQ</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Título</label>
                      <Input
                        value={newItem.title}
                        onChange={(e) => setNewItem((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Ex: Política de Preços, Contato da Empresa"
                        className="bg-secondary border-border"
                      />
                    </div>

                    {newItem.type === 'texto_livre' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Conteúdo</label>
                        <Textarea
                          value={newItem.content || ''}
                          onChange={(e) => setNewItem((prev) => ({ ...prev, content: e.target.value }))}
                          placeholder="Escreva o conteúdo aqui..."
                          className="bg-secondary border-border"
                          rows={3}
                        />
                      </div>
                    )}

                    {newItem.type === 'faq' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Pergunta</label>
                          <Textarea
                            value={newItem.faq_pergunta || ''}
                            onChange={(e) => setNewItem((prev) => ({ ...prev, faq_pergunta: e.target.value }))}
                            placeholder="Ex: Qual o horário de funcionamento?"
                            className="bg-secondary border-border"
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Resposta</label>
                          <Textarea
                            value={newItem.faq_resposta || ''}
                            onChange={(e) => setNewItem((prev) => ({ ...prev, faq_resposta: e.target.value }))}
                            placeholder="Ex: Atendemos de segunda a sexta, das 9h às 18h."
                            className="bg-secondary border-border"
                            rows={2}
                          />
                        </div>
                      </>
                    )}

                    {newItem.type === 'url' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">URL</label>
                        <Input
                          value={newItem.url || ''}
                          onChange={(e) => setNewItem((prev) => ({ ...prev, url: e.target.value }))}
                          placeholder="https://exemplo.com"
                          className="bg-secondary border-border"
                        />
                      </div>
                    )}

                    {/* Tags */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Tags</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Adicionar tag..."
                            className="bg-secondary border-border"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addTagToItem();
                              }
                            }}
                          />
                        </div>
                        <Button
                          onClick={addTagToItem}
                          variant="outline"
                          size="sm"
                          className="border-border"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>

                      {newItem.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {newItem.tags.map((tag) => (
                            <div
                              key={tag}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 border border-primary/50 rounded-full"
                            >
                              <span className="text-xs font-medium text-primary">{tag}</span>
                              <button
                                onClick={() => removeTagFromItem(tag)}
                                className="hover:opacity-70"
                              >
                                <X className="w-3 h-3 text-primary" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Botão Salvar */}
                    <Button
                      onClick={handleAddItem}
                      disabled={savingItems}
                      className="w-full btn-premium"
                    >
                      {savingItems ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                      ) : savedItems ? (
                        '✓ Item salvo!'
                      ) : (
                        <><Save className="w-4 h-4 mr-2" /> {editingItem ? 'Atualizar Item' : 'Salvar Item'}</>
                      )}
                    </Button>
                  </div>

                  {/* Lista de Items */}
                  {itemsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredItems.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Items ({filteredItems.length})</p>
                      {filteredItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-secondary/50 rounded-lg border border-border hover:bg-secondary transition-colors space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold px-2 py-1 bg-primary/20 text-primary rounded">
                                  {item.type === 'texto_livre' ? 'Texto' : item.type === 'faq' ? 'FAQ' : 'URL'}
                                </span>
                                <p className="text-sm font-medium text-foreground">{item.title}</p>
                              </div>
                              {item.type === 'texto_livre' && item.content && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                              )}
                              {item.type === 'faq' && item.faq_pergunta && (
                                <p className="text-xs text-muted-foreground mt-1">P: {item.faq_pergunta}</p>
                              )}
                              {item.type === 'url' && item.url && (
                                <p className="text-xs text-primary mt-1">{item.url}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setNewItem(item);
                                  setEditingItem(item.id || '');
                                }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteItem(item.id || '')}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-2 py-0.5 bg-secondary border border-border rounded-full text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchQuery || selectedTags.length > 0
                        ? 'Nenhum item encontrado com esses filtros'
                        : 'Nenhum item criado ainda. Crie o primeiro!'}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Persona e Comportamento */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BotIcon className="w-4 h-4 text-primary" />
                Persona e Comportamento
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Defina como seu bot se apresenta e se comporta</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Persona */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Persona do Bot</label>
                <Textarea
                  value={config.persona || ''}
                  onChange={(e) => setConfig((prev) => ({ ...prev, persona: e.target.value }))}
                  placeholder="Descreva como o bot deve se apresentar e agir..."
                  className="bg-secondary border-border"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">Clique em 'Preencher com exemplo de imobiliária' para usar um template padrão.</p>
              </div>

              {/* Horários */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Horário de Início</label>
                  <Input
                    type="time"
                    value={config.horario_inicio || '08:00'}
                    onChange={(e) => setConfig((prev) => ({ ...prev, horario_inicio: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Horário de Término</label>
                  <Input
                    type="time"
                    value={config.horario_fim || '20:00'}
                    onChange={(e) => setConfig((prev) => ({ ...prev, horario_fim: e.target.value }))}
                    className="bg-secondary border-border"
                  />
                </div>
              </div>

              {/* Handoff Humano */}
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Handoff Humano</p>
                  <p className="text-xs text-muted-foreground">Transferir para atendente quando necessário</p>
                </div>
                <Switch
                  checked={config.handoff_humano || false}
                  onCheckedChange={(v) => setConfig((prev) => ({ ...prev, handoff_humano: v }))}
                />
              </div>

              {/* Regras */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Regras de Comportamento</label>
                <div className="flex gap-2">
                  <Input
                    value={newRule}
                    onChange={(e) => setNewRule(e.target.value)}
                    placeholder="Ex: Nunca fale mal de concorrentes"
                    className="bg-secondary border-border"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addRule();
                      }
                    }}
                  />
                  <Button
                    onClick={addRule}
                    variant="outline"
                    className="border-border"
                  >
                    Adicionar
                  </Button>
                </div>

                {(config.regras || []).length > 0 && (
                  <div className="space-y-2 mt-3">
                    {config.regras!.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border/50 hover:border-border"
                      >
                        <p className="text-sm text-foreground">{rule}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRule(idx)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

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
        </>
      )}
    </div>
  );
}
