# 🚀 COMO INICIAR O SISTEMA - GUIA RÁPIDO

## ⚡ SOLUÇÃO RÁPIDA

### Se você está usando PowerShell (padrão do Windows):

```powershell
# Execute este comando:
.\start.ps1
```

### Se você está usando CMD (Prompt de Comando):

```cmd
start.bat
```

---

## 🔍 IDENTIFICAR SEU TERMINAL

### PowerShell (Mais Comum)
- Prompt aparece como: `PS D:\Ficando_rico\Projetos\beatyhub>`
- **Use:** `.\start.ps1`

### CMD (Prompt de Comando)
- Prompt aparece como: `D:\Ficando_rico\Projetos\beatyhub>`
- **Use:** `start.bat`

---

## 📋 COMANDOS POR TERMINAL

### PowerShell (Recomendado)

```powershell
# Iniciar sistema
.\start.ps1

# Parar sistema
docker-compose stop

# Ver logs
docker-compose logs -f backend

# Ver status
docker-compose ps
```

### CMD (Prompt de Comando)

```cmd
# Iniciar sistema
start.bat

# Parar sistema
stop.bat

# Ver logs
logs.bat

# Ver status
docker-compose ps
```

---

## ⚠️ ERRO COMUM

### "start.bat is not recognized"

**Causa:** Você está no PowerShell, não no CMD

**Solução 1 (Recomendada):** Use o script PowerShell
```powershell
.\start.ps1
```

**Solução 2:** Abra o CMD
```powershell
# No PowerShell, digite:
cmd

# Depois execute:
start.bat
```

**Solução 3:** Execute o .bat no PowerShell
```powershell
.\start.bat
```

---

## 🎯 PASSO A PASSO COMPLETO

### 1. Abrir Terminal

**Opção A: PowerShell (Recomendado)**
- Pressione `Win + X`
- Escolha "Windows PowerShell" ou "Terminal"

**Opção B: CMD**
- Pressione `Win + R`
- Digite `cmd`
- Pressione Enter

### 2. Navegar até o Projeto

```powershell
cd D:\Ficando_rico\Projetos\beatyhub
```

### 3. Executar Script

**PowerShell:**
```powershell
.\start.ps1
```

**CMD:**
```cmd
start.bat
```

### 4. Aguardar Inicialização

O script vai:
- ✅ Verificar Docker
- ✅ Iniciar containers
- ✅ Executar migrations
- ✅ Executar seeds
- ✅ Verificar health
- ✅ Exibir URLs e credenciais

### 5. Acessar Sistema

Quando aparecer:
```
Deseja abrir o frontend no navegador? (S/N):
```

Digite `S` e pressione Enter.

Ou abra manualmente:
- **Landing Page:** http://localhost:8080 (página pública de vendas)
- **Login Master:** http://localhost:8080/login
- **API Backend:** http://localhost:5001/api/health

---

## 🔧 ALTERNATIVA: Executar Manualmente

Se os scripts não funcionarem, execute manualmente:

```powershell
# 1. Subir containers
docker-compose up -d

# 2. Aguardar 30 segundos
Start-Sleep -Seconds 30

# 3. Executar migrations
docker exec beautyhub_backend npm run migrate

# 4. Executar seeds
docker exec beautyhub_backend npm run seed

# 5. Verificar health
curl http://localhost:5001/api/health

# 6. Abrir navegador
start http://localhost:8080
```

---

## 📊 VERIFICAR SE ESTÁ FUNCIONANDO

### 1. Verificar Containers

```powershell
docker-compose ps
```

**Esperado:**
```
NAME                  STATUS
beautyhub_nginx       Up (healthy)
beautyhub_backend     Up (healthy)
beautyhub_database    Up (healthy)
```

### 2. Verificar Backend

```powershell
curl http://localhost:5001/api/health
```

**Esperado:**
```json
{"status":"ok","timestamp":"..."}
```

### 3. Verificar Frontend

Abrir navegador em: http://localhost:8080

**Esperado:** Landing Page do BeautyHub (página pública de vendas)

Para acessar o login: http://localhost:8080/login

---

## 🛑 PARAR O SISTEMA

```powershell
docker-compose stop
```

---

## 📝 RESUMO DOS SCRIPTS

| Terminal | Iniciar | Parar | Remover | Resetar | Logs |
|----------|---------|-------|---------|---------|------|
| **PowerShell** | `.\start.ps1` | `.\stop.ps1` | `.\down.ps1` | `.\reset.ps1` | `.\logs.ps1` |
| **CMD** | `start.bat` | `stop.bat` | `down.bat` | `reset.bat` | `logs.bat` |

### Diferença entre os comandos:

- **stop** → Para containers (mantém tudo, pode reiniciar rápido)
- **down** → Remove containers (mantém dados, precisa recriar containers)
- **reset** → ⚠️ APAGA TUDO (remove containers E dados)

---

## 🆘 PROBLEMAS COMUNS

### Docker não está rodando

**Erro:** "Docker is not running"

**Solução:**
1. Abrir Docker Desktop
2. Aguardar inicializar
3. Executar script novamente

### Porta já em uso

**Erro:** "Port 8080 is already in use"

**Solução:**
```powershell
# Parar containers antigos
docker-compose down

# Verificar portas
netstat -ano | findstr :8080
netstat -ano | findstr :5001
netstat -ano | findstr :5433

# Matar processo (se necessário)
# Identificar PID e executar:
taskkill /PID <numero> /F
```

### Backend não responde

**Erro:** "Backend is not responding"

**Solução:**
```powershell
# Ver logs
docker-compose logs backend

# Reiniciar backend
docker-compose restart backend

# Aguardar 30 segundos
Start-Sleep -Seconds 30

# Tentar novamente
curl http://localhost:5001/api/health
```

---

## 🌐 LANDING PAGE E REGISTRO PÚBLICO

### Acessar Landing Page

Abra: http://localhost:8080

A landing page inclui:
- **Hero Section** com apresentação do sistema
- **Funcionalidades** (8 cards destacando recursos)
- **Planos** (busca dinâmica do banco de dados)
- **Formulário de Cadastro** para novos clientes

### Registrar Novo Tenant

1. Acesse a landing page: http://localhost:8080
2. Clique em "Escolher Plano" em qualquer plano
3. Preencha o formulário completo:
   - Tipo de conta (Estabelecimento ou Profissional)
   - Dados do negócio
   - Endereço completo
   - Dados do responsável
4. Clique em "Criar Conta e Começar"
5. Aguarde a criação do tenant
6. Faça login com as credenciais criadas

**Resultado:** Um novo tenant será criado automaticamente com:
- Subdomain baseado no nome do negócio
- Usuário owner com as credenciais fornecidas
- Plano selecionado com período trial

### Testar API Pública

```powershell
# Listar planos públicos
curl http://localhost:5001/api/public/plans

# Ver estrutura de registro
curl -X POST http://localhost:5001/api/public/register -H "Content-Type: application/json" -d "{}"
```

## ✅ CHECKLIST FINAL

Após executar o script, verificar:

- [ ] Script completou sem erros
- [ ] Mensagem "Sistema Iniciado com Sucesso!" apareceu
- [ ] 3 containers estão "Up" e "healthy"
- [ ] Backend responde em http://localhost:5001/api/health
- [ ] Landing page abre em http://localhost:8080
- [ ] Login Master funciona em http://localhost:8080/login
- [ ] Credenciais Master: `master@beautyhub.com` / `123456`
- [ ] API pública de planos funciona: http://localhost:5001/api/public/plans

---

## 🎯 COMANDOS MAIS USADOS

```powershell
# Iniciar tudo
.\start.ps1

# Ver logs em tempo real
docker-compose logs -f backend

# Ver status
docker-compose ps

# Parar tudo
docker-compose stop

# Reiniciar backend
docker-compose restart backend

# Resetar tudo (apaga dados)
docker-compose down -v
.\start.ps1
```

---

**Use `.\start.ps1` no PowerShell ou `start.bat` no CMD! 🚀**
