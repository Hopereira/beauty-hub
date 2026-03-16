# 🚀 COMANDOS PARA INICIAR O SISTEMA BEAUTYHUB

**Data:** 27/02/2026  
**Sistema:** BeautyHub SaaS Multi-Tenant  
**Ambiente:** Desenvolvimento

---

## ⚡ INÍCIO RÁPIDO (Quick Start)

### Opção 1: Iniciar Tudo de Uma Vez

```bash
# 1. Navegar até o diretório do projeto
cd d:\Ficando_rico\Projetos\beatyhub

# 2. Subir todos os containers (Nginx + Backend + PostgreSQL)
docker-compose up -d

# 3. Aguardar containers iniciarem (30-60 segundos)
# Verificar status
docker-compose ps

# 4. Verificar logs (opcional)
docker-compose logs -f
```

**Pronto! Sistema rodando em:**
- **Landing Page:** http://localhost:8080 (página pública de vendas)
- **Login Master:** http://localhost:8080/login
- **Backend API:** http://localhost:5001/api/health
- **Database:** localhost:5433

---

## 📋 PASSO A PASSO DETALHADO

### 1️⃣ Pré-requisitos

```bash
# Verificar se Docker está instalado
docker --version

# Verificar se Docker Compose está instalado
docker-compose --version

# Verificar se Docker está rodando
docker ps
```

**Versões recomendadas:**
- Docker: 20.10+
- Docker Compose: 2.0+

---

### 2️⃣ Preparar Ambiente

```bash
# Navegar até o diretório do projeto
cd d:\Ficando_rico\Projetos\beatyhub

# Verificar se arquivos existem
dir docker-compose.yml
dir backend\Dockerfile
dir nginx\nginx.conf
```

---

### 3️⃣ Iniciar Containers

```bash
# Subir todos os containers em modo detached (background)
docker-compose up -d

# OU subir com logs visíveis (foreground)
docker-compose up
```

**Saída esperada:**
```
Creating network "beautyhub_network" ... done
Creating volume "beautyhub_db_data" ... done
Creating beautyhub_database ... done
Creating beautyhub_backend  ... done
Creating beautyhub_nginx    ... done
```

---

### 4️⃣ Verificar Status dos Containers

```bash
# Ver status de todos os containers
docker-compose ps

# Verificar se estão "Up" e "healthy"
```

**Saída esperada:**
```
NAME                  STATUS                    PORTS
beautyhub_nginx       Up 30 seconds            0.0.0.0:8080->80/tcp
beautyhub_backend     Up 30 seconds (healthy)  0.0.0.0:5001->5001/tcp
beautyhub_database    Up 30 seconds (healthy)  0.0.0.0:5433->5432/tcp
```

---

### 5️⃣ Executar Migrations e Seeds (Primeira Vez)

```bash
# Entrar no container do backend
docker exec -it beautyhub_backend sh

# Dentro do container:

# Executar migrations (criar tabelas)
npm run migrate

# Executar seeds (popular dados de teste)
npm run seed

# Sair do container
exit
```

**OU executar direto (sem entrar no container):**

```bash
# Executar migrations
docker exec -it beautyhub_backend npm run migrate

# Executar seeds
docker exec -it beautyhub_backend npm run seed
```

**Saída esperada do seed:**
```
✅ Seed data created successfully!

📋 Test Credentials:
─────────────────────────────────────
MASTER:  master@beautyhub.com / 123456
OWNER:   owner@belezapura.com / 123456
ADMIN:   admin@belezapura.com / 123456
PROF:    prof@belezapura.com / 123456
─────────────────────────────────────
Tenant Slug: beleza-pura
```

---

### 6️⃣ Verificar Health Check

```bash
# Verificar saúde do backend
curl http://localhost:5001/api/health

# OU abrir no navegador:
# http://localhost:5001/api/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-27T12:00:00.000Z",
  "uptime": 123.45
}
```

---

### 7️⃣ Acessar o Sistema

**Landing Page (Página Pública):**
```bash
# Abrir landing page de vendas
start http://localhost:8080

# OU manualmente:
# Abrir navegador e acessar: http://localhost:8080
```

**Login Master:**
```bash
# Acessar área administrativa
start http://localhost:8080/login

# Credenciais:
# Email: master@beautyhub.com
# Senha: 123456
```

**APIs Públicas (sem autenticação):**
```bash
# Listar planos disponíveis
curl http://localhost:5001/api/public/plans

# Testar registro público
curl -X POST http://localhost:5001/api/public/register \
  -H "Content-Type: application/json" \
  -d '{"accountType":"establishment","business":{"name":"Teste"}}'
```

---

## 🌐 LANDING PAGE E REGISTRO PÚBLICO

### Funcionalidades da Landing Page

A landing page (http://localhost:8080) inclui:

1. **Hero Section** - Apresentação do sistema
2. **Seção de Funcionalidades** - 8 cards destacando recursos
3. **Seção de Planos** - Busca dinâmica do banco de dados
4. **Formulário de Cadastro** - Registro completo de novos clientes

### Registrar Novo Tenant via Landing Page

1. Acesse: http://localhost:8080
2. Clique em "Escolher Plano" em qualquer plano
3. Preencha o formulário:
   - Tipo de conta (Estabelecimento ou Profissional)
   - Dados do negócio (nome, CNPJ, telefone, email)
   - Endereço completo
   - Dados do responsável (nome, CPF, email, senha)
4. Clique em "Criar Conta e Começar"

**Resultado:**
- Tenant criado automaticamente
- Subdomain baseado no nome do negócio
- Usuário owner com credenciais fornecidas
- Plano selecionado com período trial

---

## 🔍 VERIFICAÇÕES E LOGS

### Ver Logs em Tempo Real

```bash
# Logs de todos os containers
docker-compose logs -f

# Logs apenas do backend
docker-compose logs -f backend

# Logs apenas do nginx
docker-compose logs -f nginx

# Logs apenas do database
docker-compose logs -f database

# Últimas 100 linhas
docker-compose logs --tail=100 backend
```

---

### Verificar Containers Individualmente

```bash
# Status detalhado
docker-compose ps

# Inspecionar container específico
docker inspect beautyhub_backend

# Verificar recursos (CPU, memória)
docker stats beautyhub_backend
```

---

### Verificar Banco de Dados

```bash
# Conectar ao PostgreSQL
docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db

# Dentro do PostgreSQL:

# Listar tabelas
\dt

# Ver usuários
SELECT email, role, tenant_id FROM users;

# Ver tenants
SELECT name, slug, status FROM tenants;

# Sair
\q
```

---

## 🛑 PARAR O SISTEMA

### Parar Containers (Mantém Dados)

```bash
# Parar todos os containers
docker-compose stop

# Parar container específico
docker-compose stop backend
```

---

### Parar e Remover Containers (Mantém Dados)

```bash
# Parar e remover containers
docker-compose down

# Containers são removidos, mas volumes (dados) são mantidos
```

---

### Parar e Remover TUDO (Incluindo Dados)

```bash
# ⚠️ CUIDADO: Remove containers, networks E volumes (dados)
docker-compose down -v

# Use apenas se quiser resetar completamente o sistema
```

---

## 🔄 REINICIAR O SISTEMA

### Reiniciar Todos os Containers

```bash
# Reiniciar tudo
docker-compose restart

# Aguardar 30 segundos
docker-compose ps
```

---

### Reiniciar Container Específico

```bash
# Reiniciar apenas backend
docker-compose restart backend

# Reiniciar apenas nginx
docker-compose restart nginx

# Reiniciar apenas database
docker-compose restart database
```

---

### Rebuild Completo (Após Mudanças no Código)

```bash
# Parar containers
docker-compose down

# Rebuild imagens
docker-compose build --no-cache

# Subir novamente
docker-compose up -d

# Verificar
docker-compose ps
```

---

## 🔧 TROUBLESHOOTING

### Problema: Container não inicia

```bash
# Ver logs de erro
docker-compose logs backend

# Verificar se porta está em uso
netstat -ano | findstr :5001
netstat -ano | findstr :8080
netstat -ano | findstr :5433

# Matar processo na porta (se necessário)
# Identificar PID e:
taskkill /PID <numero_do_pid> /F
```

---

### Problema: Banco de dados não conecta

```bash
# Verificar se database está healthy
docker-compose ps

# Ver logs do database
docker-compose logs database

# Tentar conectar manualmente
docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db
```

---

### Problema: Backend retorna erro 500

```bash
# Ver logs detalhados
docker-compose logs -f backend

# Verificar variáveis de ambiente
docker exec -it beautyhub_backend env | grep DB

# Verificar conexão com database
docker exec -it beautyhub_backend npm run migrate
```

---

### Problema: Frontend não carrega

```bash
# Verificar se nginx está rodando
docker-compose ps nginx

# Ver logs do nginx
docker-compose logs nginx

# Verificar se arquivos dist existem
docker exec -it beautyhub_nginx ls -la /usr/share/nginx/html

# Testar diretamente o backend
curl http://localhost:5001/api/health
```

---

### Resetar Completamente o Sistema

```bash
# 1. Parar e remover tudo
docker-compose down -v

# 2. Remover imagens antigas
docker-compose rm -f

# 3. Rebuild
docker-compose build --no-cache

# 4. Subir novamente
docker-compose up -d

# 5. Executar migrations e seeds
docker exec -it beautyhub_backend npm run migrate
docker exec -it beautyhub_backend npm run seed

# 6. Verificar
docker-compose ps
curl http://localhost:5001/api/health
```

---

## 📊 COMANDOS ÚTEIS

### Gerenciamento de Containers

```bash
# Listar todos os containers (incluindo parados)
docker ps -a

# Remover containers parados
docker container prune

# Remover imagens não utilizadas
docker image prune

# Limpar tudo (cuidado!)
docker system prune -a
```

---

### Monitoramento

```bash
# Ver uso de recursos em tempo real
docker stats

# Ver uso de disco
docker system df

# Inspecionar rede
docker network inspect beautyhub_network

# Inspecionar volume
docker volume inspect beautyhub_db_data
```

---

### Backup do Banco de Dados

```bash
# Criar backup
docker exec -t beautyhub_database pg_dump -U beautyhub_user beautyhub_db > backup.sql

# Restaurar backup
cat backup.sql | docker exec -i beautyhub_database psql -U beautyhub_user -d beautyhub_db
```

---

## 🎯 FLUXO COMPLETO DE DESENVOLVIMENTO

### Primeira Vez (Setup Inicial)

```bash
# 1. Clonar/navegar para o projeto
cd d:\Ficando_rico\Projetos\beatyhub

# 2. Subir containers
docker-compose up -d

# 3. Aguardar containers ficarem healthy (30-60s)
docker-compose ps

# 4. Executar migrations
docker exec -it beautyhub_backend npm run migrate

# 5. Executar seeds
docker exec -it beautyhub_backend npm run seed

# 6. Verificar health
curl http://localhost:5001/api/health

# 7. Acessar frontend
start http://localhost:8080

# 8. Fazer login com:
# master@beautyhub.com / 123456
# owner@belezapura.com / 123456
```

---

### Dia a Dia (Desenvolvimento)

```bash
# Manhã: Iniciar sistema
cd d:\Ficando_rico\Projetos\beatyhub
docker-compose up -d
docker-compose logs -f backend

# Durante o dia: Ver logs
docker-compose logs -f backend

# Após mudanças no código: Rebuild
docker-compose restart backend

# Fim do dia: Parar sistema
docker-compose stop
```

---

### Após Mudanças no Código Backend

```bash
# 1. Parar backend
docker-compose stop backend

# 2. Rebuild
docker-compose build backend

# 3. Subir novamente
docker-compose up -d backend

# 4. Verificar logs
docker-compose logs -f backend
```

---

### Após Mudanças no Frontend

```bash
# 1. Build do frontend (fora do Docker)
npm run build

# 2. Reiniciar nginx
docker-compose restart nginx

# 3. Limpar cache do navegador
# Ctrl + Shift + R
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

Após iniciar o sistema, verificar:

- [ ] Containers estão "Up" e "healthy"
  ```bash
  docker-compose ps
  ```

- [ ] Backend responde no health check
  ```bash
  curl http://localhost:5001/api/health
  ```

- [ ] Frontend carrega
  ```bash
  start http://localhost:8080
  ```

- [ ] Banco de dados aceita conexões
  ```bash
  docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db -c "SELECT 1;"
  ```

- [ ] Seeds foram executados
  ```bash
  docker exec -it beautyhub_database psql -U beautyhub_user -d beautyhub_db -c "SELECT COUNT(*) FROM users;"
  ```
  Deve retornar 4 (MASTER, OWNER, ADMIN, PROFESSIONAL)

- [ ] Login funciona
  - Acessar http://localhost:8080
  - Login: `master@beautyhub.com` / `123456`

---

## 🔗 LINKS IMPORTANTES

- **Frontend:** http://localhost:8080
- **Backend API:** http://localhost:5001
- **Health Check:** http://localhost:5001/api/health
- **API Docs:** (se configurado) http://localhost:5001/api-docs

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verificar logs: `docker-compose logs -f`
2. Verificar status: `docker-compose ps`
3. Verificar health: `curl http://localhost:5001/api/health`
4. Consultar troubleshooting acima
5. Resetar sistema se necessário

---

**FIM DO GUIA**

**Status:** ✅ Pronto para uso  
**Última Atualização:** 27/02/2026
