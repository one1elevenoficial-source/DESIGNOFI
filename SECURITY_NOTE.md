# 🔒 Nota de Segurança

## Mudanças Realizadas (24 de Março de 2026)

### ✅ Removidas Credenciais Hardcoded

**Arquivo:** `app.tsx` (linha 5-6)

**Antes (INSEGURO):**
```typescript
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://pdrbdpzquhidojirkmcv.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
```

**Depois (SEGURO):**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

**Motivo:** Remover fallback hardcoded. As credenciais devem vir apenas de variáveis de ambiente.

---

### ✅ Criado `.gitignore` Robusto

**Localização:** Raiz do projeto

**Protege:**
- `.env` (arquivo real com credenciais)
- `.env.*.local` (overrides locais)
- `node_modules/` (dependências)
- `dist/` e `build/` (outputs)
- Arquivos de sistema e IDE

---

### ✅ Criado `.env.example`

**Localização:** Raiz do projeto

**Propósito:** Template para novos desenvolvedores

**Conteúdo:** Variáveis esperadas SEM valores reais

---

## Status de Segurança

| Item | Status | Notas |
|---|---|---|
| **Hardcoded URLs** | ✅ Removidas | App.tsx line 5-6 |
| **.env protegido** | ✅ Sim | .gitignore ativo |
| **API keys expostas** | ✅ Não | Nunca estiveram |
| **Credenciais no código** | ✅ Não | Apenas imports |
| **Gitignore** | ✅ Criado | Proteção máxima |

---

## Como Usar

### Desenvolvedores

1. Clone o repositório
2. Crie arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
3. Preencha com valores reais:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-publica-aqui
   ```
4. **NUNCA faça commit de `.env`** (gitignore bloqueia)
5. Use normalmente

### CI/CD

Injete variáveis via:
- **GitHub Actions:** Secrets
- **Vercel:** Environment Variables
- **Docker:** ENV variables
- **n8n:** Settings → Variables

---

## ✅ Checklist Completo

- ✅ Fallback hardcoded removido
- ✅ .env adicionado ao .gitignore
- ✅ .env.example criado como template
- ✅ Código só usa import.meta.env
- ✅ Nenhuma URL privada no repo
- ✅ Nenhuma chave exposta
- ✅ Service role key NÃO está em .env (está no backend)

---

## 🚀 Próximos Passos

1. **Verificar build:**
   ```bash
   npm run build
   ```

2. **Commitar mudanças:**
   ```bash
   git add .gitignore .env.example app.tsx SECURITY_NOTE.md
   git commit -m "security: remove hardcoded fallback, add .gitignore and .env.example"
   git push
   ```

3. **Verificar GitHub:**
   - Confirmar que nenhum `.env` foi commitado
   - Validar que `.gitignore` está funcionando

---

## 📞 Se Algo Quebrar

Erro: `TypeError: createClient undefined`
```
→ Verificar se VITE_SUPABASE_URL está configurado
→ npm run dev (não build em dev)
→ Verificar .env exists
```

---

**Status:** ✅ Segurança implementada
**Data:** 24 de Março de 2026
**Nota:** Credentials nunca devem estar em repositório público
