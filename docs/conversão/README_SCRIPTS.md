# 🚀 Scripts de Inicialização BeautyHub

Scripts automatizados para gerenciar o sistema BeautyHub de forma simples e rápida.

---

## 📁 Scripts Disponíveis

### Windows (.bat)

| Script | Descrição | Comando |
|--------|-----------|---------|
| **start.bat** | Inicia todo o sistema automaticamente | `start.bat` |
| **stop.bat** | Para o sistema | `stop.bat` |
| **logs.bat** | Mostra logs em tempo real | `logs.bat` |

### Linux/Mac (.sh)

| Script | Descrição | Comando |
|--------|-----------|---------|
| **start.sh** | Inicia todo o sistema automaticamente | `./start.sh` |
| **stop.sh** | Para o sistema | `./stop.sh` |
| **logs.sh** | Mostra logs em tempo real | `./logs.sh` |

---

## ⚡ Uso Rápido

### Windows

```bash
# Iniciar sistema completo
start.bat

# Parar sistema
stop.bat

# Ver logs
logs.bat
```

### Linux/Mac

```bash
# Dar permissão de execução (primeira vez)
chmod +x start.sh stop.sh logs.sh

# Iniciar sistema completo
./start.sh

# Parar sistema
./stop.sh

# Ver logs
./logs.sh
```

---

## 🔧 O que o start.bat / start.sh faz?

O script de inicialização executa **automaticamente** todas as etapas necessárias:

1. ✅ **Verifica se Docker está rodando**
2. ✅ **Para containers antigos** (se existirem)
3. ✅ **Inicia containers** (Nginx + Backend + PostgreSQL)
4. ✅ **Aguarda containers ficarem prontos** (30 segundos)
5. ✅ **Verifica status dos containers**
6. ✅ **Executa migrations** (cria tabelas no banco)
7. ✅ **Executa seeds** (popula dados de teste)
8. ✅ **Verifica health do backend**
9. ✅ **Exibe informações de acesso**
10. ✅ **Opção de abrir navegador automaticamente**

### Recursos Inteligentes

- ⏱️ **Retry automático**: Se backend não estiver pronto, aguarda e tenta novamente
- 🔍 **Verificações de saúde**: Garante que tudo está funcionando antes de prosseguir
- 🎨 **Output colorido** (Linux/Mac): Facilita visualização de erros e sucessos
- ⚠️ **Tratamento de erros**: Para execução se algo falhar
- 📊 **Informações completas**: Exibe URLs e credenciais ao final

---

## 📋 Exemplo de Execução

### Windows

```
D:\Ficando_rico\Projetos\beatyhub> start.bat

========================================
 BeautyHub - Iniciando Sistema
========================================

[1/8] Verificando Docker...
[OK] Docker esta rodando

[2/8] Parando containers antigos...
[OK] Containers antigos parados

[3/8] Iniciando containers (Nginx + Backend + PostgreSQL)...
[OK] Containers iniciados

[4/8] Aguardando containers ficarem prontos (30 segundos)...
[OK] Aguardando concluido

[5/8] Verificando status dos containers...
NAME                  STATUS                    PORTS
beautyhub_nginx       Up 30 seconds            0.0.0.0:8080->80/tcp
beautyhub_backend     Up 30 seconds (healthy)  0.0.0.0:5001->5001/tcp
beautyhub_database    Up 30 seconds (healthy)  0.0.0.0:5433->5432/tcp

[6/8] Executando migrations (criando tabelas)...
[OK] Migrations executadas

[7/8] Executando seeds (populando dados de teste)...
✅ Seed data created successfully!
[OK] Seeds executados

[8/8] Verificando health do backend...
[OK] Backend esta respondendo

========================================
 Sistema Iniciado com Sucesso!
========================================

URLs de Acesso:
  Frontend:  http://localhost:8080
  Backend:   http://localhost:5001
  Health:    http://localhost:5001/api/health

Credenciais de Teste:
  MASTER:  master@beautyhub.com / 123456
  OWNER:   owner@belezapura.com / 123456
  ADMIN:   admin@belezapura.com / 123456
  PROF:    prof@belezapura.com / 123456

Tenant: beleza-pura

Deseja abrir o frontend no navegador? (S/N): S
Abrindo navegador...

Para ver logs em tempo real, execute:
  docker-compose logs -f backend

Para parar o sistema, execute:
  docker-compose stop
```

---

## 🛑 Parar o Sistema

### Windows
```bash
stop.bat
```

### Linux/Mac
```bash
./stop.sh
```

**O que faz:**
- Para todos os containers
- Mantém os dados (volumes não são removidos)
- Sistema pode ser reiniciado com `start.bat` / `start.sh`

---

## 📊 Ver Logs em Tempo Real

### Windows
```bash
logs.bat
```

### Linux/Mac
```bash
./logs.sh
```

**O que faz:**
- Mostra logs do backend em tempo real
- Útil para debug e monitoramento
- Pressione `Ctrl+C` para sair

---

## 🔄 Fluxo de Trabalho Diário

### Manhã (Iniciar trabalho)
```bash
# Windows
start.bat

# Linux/Mac
./start.sh
```

### Durante o dia (Ver logs)
```bash
# Windows
logs.bat

# Linux/Mac
./logs.sh
```

### Fim do dia (Parar sistema)
```bash
# Windows
stop.bat

# Linux/Mac
./stop.sh
```

---

## ⚠️ Troubleshooting

### Script não executa (Windows)

**Problema:** "Acesso negado" ou "Não é reconhecido como comando"

**Solução:**
```bash
# Executar como Administrador
# Botão direito no start.bat > Executar como administrador
```

### Script não executa (Linux/Mac)

**Problema:** "Permission denied"

**Solução:**
```bash
# Dar permissão de execução
chmod +x start.sh stop.sh logs.sh

# Executar
./start.sh
```

### Backend não inicia

**Problema:** Script fica tentando conectar ao backend

**Solução:**
```bash
# Ver logs detalhados
docker-compose logs backend

# Verificar se porta 5001 está em uso
netstat -ano | findstr :5001  # Windows
lsof -i :5001                 # Linux/Mac

# Resetar completamente
docker-compose down -v
start.bat  # ou ./start.sh
```

### Containers não iniciam

**Problema:** Docker não está rodando

**Solução:**
1. Abrir Docker Desktop
2. Aguardar Docker iniciar completamente
3. Executar script novamente

---

## 🎯 Comandos Manuais (Se Necessário)

Se preferir executar manualmente:

```bash
# 1. Subir containers
docker-compose up -d

# 2. Aguardar 30 segundos
timeout /t 30  # Windows
sleep 30       # Linux/Mac

# 3. Executar migrations
docker exec beautyhub_backend npm run migrate

# 4. Executar seeds
docker exec beautyhub_backend npm run seed

# 5. Verificar health
curl http://localhost:5001/api/health

# 6. Abrir frontend
start http://localhost:8080  # Windows
open http://localhost:8080   # Mac
xdg-open http://localhost:8080  # Linux
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar logs: `logs.bat` ou `./logs.sh`
2. Verificar status: `docker-compose ps`
3. Resetar sistema: `docker-compose down -v` e executar `start.bat` novamente
4. Consultar `START_SYSTEM.md` para troubleshooting detalhado

---

## ✅ Checklist Rápida

Após executar `start.bat` / `start.sh`, verificar:

- [ ] Script completou sem erros
- [ ] Mensagem "Sistema Iniciado com Sucesso!" apareceu
- [ ] Frontend abre em http://localhost:8080
- [ ] Login funciona com `master@beautyhub.com` / `123456`

---

**Tudo pronto! Use `start.bat` (Windows) ou `./start.sh` (Linux/Mac) para iniciar o sistema completo em um único comando! 🚀**
