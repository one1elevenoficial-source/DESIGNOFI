-- Criar tabela knowledge_items para armazenar items de conhecimento
CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('texto_livre', 'faq', 'url')),
  title TEXT NOT NULL,
  content TEXT,
  faq_pergunta TEXT,
  faq_resposta TEXT,
  url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_knowledge_items_client_id 
  ON public.knowledge_items(client_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_created_at 
  ON public.knowledge_items(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_items_type 
  ON public.knowledge_items(type);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas seus próprios items
CREATE POLICY "Users can view own knowledge items"
  ON public.knowledge_items
  FOR SELECT
  USING (auth.uid() = client_id);

-- Policy: Usuários podem criar items
CREATE POLICY "Users can create knowledge items"
  ON public.knowledge_items
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Policy: Usuários podem atualizar seus próprios items
CREATE POLICY "Users can update own knowledge items"
  ON public.knowledge_items
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Policy: Usuários podem deletar seus próprios items
CREATE POLICY "Users can delete own knowledge items"
  ON public.knowledge_items
  FOR DELETE
  USING (auth.uid() = client_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_knowledge_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_knowledge_items_timestamp ON public.knowledge_items;
CREATE TRIGGER update_knowledge_items_timestamp
  BEFORE UPDATE ON public.knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_items_timestamp();
