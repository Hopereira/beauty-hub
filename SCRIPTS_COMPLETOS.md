# 🎯 GUIA COMPLETO DE SCRIPTS - BEAUTYHUB

**Todos os scripts disponíveis para gerenciar o sistema**

---

## 📋 LISTA COMPLETA DE SCRIPTS

### PowerShell (.ps1)

| Script | Função | Comando |
|--------|--------|---------|
| **start.ps1** | ✅ Inicia TODO o sistema | `.\start.ps1` |
| **stop.ps1** | ⏸️ Para o sistema (mantém dados) | `.\stop.ps1` |
| **down.ps1** | 🗑️ Remove containers (mantém dados) | `.\down.ps1` |
| **reset.ps1** | ⚠️ RESETA TUDO (apaga dados) | `.\reset.ps1` |
| **logs.ps1** | 📊 Mostra logs em tempo real | `.\logs.ps1` |

### CMD (.bat)

| Script | Função | Comando |
|--------|--------|---------|
| **start.bat** | ✅ Inicia TODO o sistema | `start.bat` |
| **stop.bat** | ⏸️ Para o sistema (mantém dados) | `stop.bat` |
| **down.bat** | 🗑️ Remove containers (mantém dados) | `down.bat` |
| **reset.bat** | ⚠️ RESETA TUDO (apaga dados) | `reset.bat` |
| **logs.bat** | 📊 Mostra logs em tempo real | `logs.bat` |

---

## 🔍 DIFERENÇA ENTRE OS COMANDOS

### 1. **start** - Iniciar Sistema
```powershell
.\start.ps1  # PowerShell
start.bat    # CMD
```

**O que faz:**
- ✅ Verifica Docker
- ✅ Para containers antigos
- ✅ Inicia containers (Nginx + Backend + PostgreSQL)
- ✅ Aguarda containers ficarem prontos
- ✅ Executa migrations (cria tabelas)
- ✅ Executa seeds (popula dados de teste)
- ✅ Verifica health do backend
- ✅ Exibe URLs e credenciais

**Quando usar:** Toda vez que quiser iniciar o sistema

---

### 2. **stop** - Parar Sistema
```powershell
.\stop.ps1   # PowerShell
stop.bat     # CMD
```

**O que faz:**
- ⏸️ Para todos os containers
- ✅ Mantém containers (não remove)
- ✅ Mantém dados (volumes preservados)
- ✅ Reinício rápido (não precisa recriar containers)

**Quando usar:** Fim do dia, pausa para almoço, etc.

**Vantagem:** Reiniciar é muito rápido (só `docker-compose start`)

---

### 3. **down** - Remover Containers
```powershell
.\down.ps1   # PowerShell
down.bat     # CMD
```

**O que faz:**
- 🗑️ Para containers
- 🗑️ Remove containers
- ✅ Mantém dados (volumes preservados)
- ⚠️ Precisa recriar containers ao reiniciar

**Quando usar:** 
- Liberar recursos do sistema
- Após mudanças no docker-compose.yml
- Limpar containers antigos

**Vantagem:** Libera mais memória que `stop`

---

### 4. **reset** - Resetar TUDO
```powershell
.\reset.ps1  # PowerShell
reset.bat    # CMD
```

**O que faz:**
- ⚠️ Para containers
- ⚠️ Remove containers
- ⚠️ **APAGA DADOS** (remove volumes)
- ⚠️ Remove imagens antigas
- ⚠️ Limpa cache do Docker

**Quando usar:**
- Problemas graves que não resolvem
- Quer começar do zero
- Banco de dados corrompido
- Testar instalação limpa

**⚠️ CUIDADO:** Você perderá TODOS os dados!

---

### 5. **logs** - Ver Logs
```powershell
.\logs.ps1   # PowerShell
logs.bat     # CMD
```

**O que faz:**
- 📊 Mostra logs do backend em tempo real
- 🔄 Atualiza automaticamente
- 🐛 Útil para debug

**Quando usar:**
- Debugar problemas
- Monitorar requisições
- Ver erros em tempo real

**Sair:** Pressione `Ctrl+C`

---

## 🎯 FLUXOS DE USO COMUNS

### Fluxo 1: Dia Normal de Trabalho

```powershell
# Manhã
.\start.ps1

# Durante o dia (se precisar ver logs)
.\logs.ps1

# Fim do dia
.\stop.ps1
```

---

### Fluxo 2: Após Mudanças no Código

```powershell
# Parar sistema
.\stop.ps1

# Rebuild (se necessário)
docker-compose build

# Iniciar novamente
.\start.ps1
```

---

### Fluxo 3: Liberar Recursos do PC

```powershell
# Remover containers (libera mais memória)
.\down.ps1

# Quando quiser usar novamente
.\start.ps1
```

---

### Fluxo 4: Resolver Problemas Graves

```powershell
# Resetar tudo
.\reset.ps1

# Iniciar do zero
.\start.ps1
```

---

### Fluxo 5: Atualizar docker-compose.yml

```powershell
# Remover containers antigos
.\down.ps1

# Editar docker-compose.yml
# ...

# Iniciar com nova configuração
.\start.ps1
```

---

## 📊 COMPARAÇÃO DE RECURSOS

| Ação | stop | down | reset |
|------|------|------|-------|
| Para containers | ✅ | ✅ | ✅ |
| Remove containers | ❌ | ✅ | ✅ |
| Remove dados | ❌ | ❌ | ✅ |
| Remove imagens | ❌ | ❌ | ✅ |
| Limpa cache | ❌ | ❌ | ✅ |
| Reinício rápido | ✅ | ❌ | ❌ |
| Libera memória | 🟡 Pouco | 🟢 Médio | 🟢 Muito |

---

## ⚡ COMANDOS RÁPIDOS

### PowerShell

```powershell
# Iniciar
.\start.ps1

# Parar (mantém tudo)
.\stop.ps1

# Remover containers (mantém dados)
.\down.ps1

# Resetar tudo (apaga dados)
.\reset.ps1

# Ver logs
.\logs.ps1

# Status
docker-compose ps

# Reiniciar apenas backend
docker-compose restart backend
```

### CMD

```cmd
# Iniciar
start.bat

# Parar (mantém tudo)
stop.bat

# Remover containers (mantém dados)
down.bat

# Resetar tudo (apaga dados)
reset.bat

# Ver logs
logs.bat

# Status
docker-compose ps

# Reiniciar apenas backend
docker-compose restart backend
```

---

## 🔧 COMANDOS DOCKER ÚTEIS

```powershell
# Ver containers rodando
docker-compose ps

# Ver logs de um container específico
docker-compose logs backend
docker-compose logs nginx
docker-compose logs database

# Reiniciar container específico
docker-compose restart backend

# Entrar no container
docker exec -it beautyhub_backend sh

# Ver uso de recursos
docker stats

# Limpar tudo do Docker (cuidado!)
docker system prune -a --volumes
```

---

## 📁 ESTRUTURA DE DADOS

### O que cada comando preserva:

```
Sistema BeautyHub
├── Containers (removidos por down/reset)
├── Imagens (removidas por reset)
├── Volumes/Dados
│   ├── Banco de dados (preservado por stop/down)
│   └── Uploads (preservado por stop/down)
└── Cache (limpo por reset)
```

---

## ⚠️ AVISOS IMPORTANTES

### stop.ps1 / stop.bat
- ✅ Seguro para uso diário
- ✅ Não perde dados
- ✅ Reinício rápido

### down.ps1 / down.bat
- ⚠️ Remove containers
- ✅ Não perde dados
- ⚠️ Reinício mais lento

### reset.ps1 / reset.bat
- ⛔ **APAGA TODOS OS DADOS**
- ⛔ Não tem volta
- ⛔ Use apenas se tiver certeza
- ✅ Pede confirmação dupla

---

## 🆘 TROUBLESHOOTING

### Script não executa

**PowerShell:**
```powershell
# Verificar política de execução
Get-ExecutionPolicy

# Se estiver Restricted, alterar para:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Executar script
.\start.ps1
```

**CMD:**
```cmd
# Executar diretamente
start.bat
```

---

### Containers não param

```powershell
# Forçar parada
docker-compose kill

# Remover forçado
docker-compose rm -f
```

---

### Erro ao remover volumes

```powershell
# Parar tudo primeiro
docker-compose down

# Remover volumes manualmente
docker volume rm beautyhub_db_data

# Ou remover todos volumes não usados
docker volume prune
```

---

## ✅ CHECKLIST DE DECISÃO

**Qual comando usar?**

- [ ] Fim do dia? → `.\stop.ps1`
- [ ] Liberar memória? → `.\down.ps1`
- [ ] Problemas graves? → `.\reset.ps1`
- [ ] Ver o que está acontecendo? → `.\logs.ps1`
- [ ] Iniciar sistema? → `.\start.ps1`

---

## 🎓 RESUMO PARA INICIANTES

### Comandos Essenciais

```powershell
# 1. Iniciar sistema (use todo dia)
.\start.ps1

# 2. Ver logs (quando tiver problema)
.\logs.ps1

# 3. Parar sistema (fim do dia)
.\stop.ps1

# 4. Resetar (só em emergência)
.\reset.ps1
```

**90% do tempo você vai usar apenas `.\start.ps1` e `.\stop.ps1`**

---

**Use os scripts corretos para seu terminal (PowerShell ou CMD)! 🚀**
