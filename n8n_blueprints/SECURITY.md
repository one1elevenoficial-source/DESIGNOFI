# ⚠️ SEGURANÇA CRÍTICA — LEIA ANTES DE TUDO

## 🚨 NÃO COMMITE CREDENCIAIS!

Este repositório contém código de produçãoAberta ao público (GitHub). **NUNCA** faça push de:

- ❌ API keys / tokens
- ❌ Senhas do banco de dados
- ❌ URLs privadas
- ❌ IDs de workspace reais
- ❌ Números de telefone
- ❌ Arquivos `.env` com valores reais

---

## ✅ O que PODE ir no repos

```
✅ Estrutura dos workflows (JSONs sem credenciais)
✅ Documentação
✅ `.env.example` com placeholders
✅ `README.md` com instruções genéricas
✅ Arquitetura e diagrama
✅ Guia de deployment
```

---

## ⚙️ Como Configurar (Localmente)

### 1️⃣ Clone o repositório

```bash
git clone https://github.com/seu-user/one-eleven.git
cd one-eleven/n8n_blueprints
```

### 2️⃣ Crie arquivo `.env` (local, NUNCA commita)

```bash
cp n8n_variables.env.example .env
```

### 3️⃣ Preencha com SEUS valores

```bash
nano .env

# Edite:
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
ANTHROPIC_API_KEY=sk-ant-...
# ... resto das variáveis
```

### 4️⃣ Configure no n8n

```
n8n → Settings → Variables
(copie cada variável de .env para aqui)
```

### 5️⃣ Importe workflows

Sequência obrigatória:
```
1. ___ERROR_HANDLER.json
2. __ONBOARD_INSTANCE_v2.json
3. 0_COMPANY_CONFIG_SETUP.json
4. 0_CEREBRO_AUTONOMO_v1.json
... (ver README.md para lista completa)
```

---

## 🔐 Best Practices

### Nunca:
```bash
❌ git add .env
❌ git push credenciais.json
❌ echo $ANTHROPIC_API_KEY em repositório
❌ Copiar valores reais para commits de teste
```

### Sempre:
```bash
✅ .gitignore com *.env, *_credentials.json
✅ Use variáveis de ambiente
✅ Rotate keys regularmente
✅ Use secrets manager (Vault, 1Password, etc)
✅ Audit quem tem acesso às credenciais
```

---

## 🛡️ Se Acidentalmente Commitar Credentials

1. **Revoke imediatamente:**
   ```bash
   # Supabase: Settings → API → Create new key
   # Anthropic: Account → API Keys → Delete compromised key
   # Evolution: Create new API key
   ```

2. **Remova do histórico git:**
   ```bash
   git log --oneline | grep "credentials\|.env"
   git show <commit-hash> -- .env  # Ver o que foi exposto
   
   # Opção 1: Rebase (se poucos commits)
   git rebase -i <commit-antes-do-acidente>
   
   # Opção 2: Usar BFG (mais seguro para histórico longo)
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now
   ```

3. **Notifique a equipe**: Alguém pode ter visto o commit

---

## 📋 Checklist de Segurança

- [ ] `.gitignore` contém `*.env`, `*.credentials.json`
- [ ] Acesso a credenciais limitado a:
  - [ ] Você (dev)
  - [ ] DevOps
  - [ ] Ninguém mais
- [ ] Variáveis de ambiente em servidor DE PRODUÇÃO
- [ ] Chaves rotacionadas a cada 90 dias
- [ ] Nenhum valor real em repositório
- [ ] n8n integrado com secret manager
- [ ] Audit logs ativos no Supabase

---

## 🔄 Rotation de Chaves (Trimestral)

**Supabase:**
```
1. Settings → API
2. Create new anon key
3. Update em n8n
4. Espere 24h para distribuição
5. Delete a chave antiga
```

**Anthropic:**
```
1. account.anthropic.com → API Keys
2. Create new key
3. Update em n8n
4. Delete a chave antiga
```

**Evolution:**
```
1. Seu dashboard Evolution
2. Settings → API Keys
3. Generate new
4. Update em n8n
5. Revoke a antiga
```

---

## 🚨 Em Caso de Breach

1. **PÁRE TUDO:**
   ```
   - Revoque todas as chaves imediatamente
   - Pause n8n workflows
   - Notifique equipe
   ```

2. **INVESTIGUE:**
   ```
   - Quem tinha acesso?
   - Quando foi exposto?
   - O que foi acessado?
   ```

3. **REMEDEIE:**
   ```
   - Gere novas chaves
   - Update em todos os lugares
   - Audit logs do Supabase
   - Procure atividade suspeita
   ```

4. **DOCUMENTE:**
   ```
   - Crie incident report
   - Timeline do evento
   - Ações tomadas
   - Prevenções futuras
   ```

---

## 📚 Recursos Recomendados

- [OWASP: Secrets Management](https://owasp.org/www-community/attacks/API_Abuse)
- [GitHub: Secret Scanning](https://github.blog/changelog/2021-11-15-secret-scanning-push-protection/)
- [Supabase: API Security](https://supabase.com/docs/guides/api#security)
- [Anthropic: Security](https://console.anthropic.com/docs/security)

---

## ❓ FAQ

**P: Posso usar valores reais em develo local?**
R: SIM, mas em arquivo `.env` que nunca é commitado.

**P: Como compartilhar credenciais com equipe?**
R: Use secret manager (Vault, 1Password, AWS Secrets Manager)
Nunca via email, Slack ou comentários de código.

**P: n8n detecta credenciais?**
R: Sim! n8n avisa se credenciais forem expostas em outputs.
Sempre verifique antes de salvar workflows.

**P: Como fazer deploy sem expor chaves?**
R: Injete via variáveis de ambiente do server:
```bash
docker run -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY n8n
```

---

## 📞 Suporte

Se alguém descobrir credenciais expostas:
1. Não distribua mais
2. Notifique admin imediatamente
3. Revogue a chave
4. Abra issue privada no GitHub (se aplicável)

---

**NUNCA é "só uma chave pequena", "apenas teste" ou "vou remover depois"**
**Uma credencial exposta = Acesso total ao seu sistema**

---

**Última atualização:** 24 de Março de 2026
**Status:** Obrigatório para todos os devs
