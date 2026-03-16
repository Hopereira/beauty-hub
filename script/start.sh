#!/bin/bash
# ============================================================================
# BeautyHub - Script de Inicializacao Completa
# Executa todos os comandos necessarios para iniciar o sistema
# ============================================================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================"
echo "  BeautyHub - Iniciando Sistema"
echo "========================================"
echo ""

# Verificar se Docker esta rodando
echo -e "${BLUE}[1/8] Verificando Docker...${NC}"
if ! docker ps &> /dev/null; then
    echo -e "${RED}[ERRO] Docker nao esta rodando!${NC}"
    echo "Por favor, inicie o Docker e tente novamente."
    exit 1
fi
echo -e "${GREEN}[OK] Docker esta rodando${NC}"
echo ""

# Parar containers antigos (se existirem)
echo -e "${BLUE}[2/8] Parando containers antigos...${NC}"
docker-compose down &> /dev/null
echo -e "${GREEN}[OK] Containers antigos parados${NC}"
echo ""

# Subir containers
echo -e "${BLUE}[3/8] Iniciando containers (Nginx + Backend + PostgreSQL)...${NC}"
if ! docker-compose up -d; then
    echo -e "${RED}[ERRO] Falha ao iniciar containers!${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Containers iniciados${NC}"
echo ""

# Aguardar containers ficarem prontos
echo -e "${BLUE}[4/8] Aguardando containers ficarem prontos (30 segundos)...${NC}"
sleep 30
echo -e "${GREEN}[OK] Aguardando concluido${NC}"
echo ""

# Verificar status dos containers
echo -e "${BLUE}[5/8] Verificando status dos containers...${NC}"
docker-compose ps
echo ""

# Executar migrations com retry
echo -e "${BLUE}[6/8] Executando migrations (criando tabelas)...${NC}"
MAX_RETRIES=5
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec beautyhub_backend npm run migrate; then
        echo -e "${GREEN}[OK] Migrations executadas${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}[AVISO] Backend ainda nao esta pronto, aguardando 10 segundos... (tentativa $RETRY_COUNT/$MAX_RETRIES)${NC}"
            sleep 10
        else
            echo -e "${RED}[ERRO] Falha ao executar migrations apos $MAX_RETRIES tentativas${NC}"
            exit 1
        fi
    fi
done
echo ""

# Executar seeds
echo -e "${BLUE}[7/8] Executando seeds (populando dados de teste)...${NC}"
if docker exec beautyhub_backend npm run seed; then
    echo -e "${GREEN}[OK] Seeds executados${NC}"
else
    echo -e "${YELLOW}[AVISO] Seeds podem ja ter sido executados anteriormente${NC}"
fi
echo ""

# Verificar health do backend com retry
echo -e "${BLUE}[8/8] Verificando health do backend...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:5001/api/health &> /dev/null; then
        echo -e "${GREEN}[OK] Backend esta respondendo${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT+1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo -e "${YELLOW}[AVISO] Backend ainda nao esta respondendo, aguardando 5 segundos... (tentativa $RETRY_COUNT/$MAX_RETRIES)${NC}"
            sleep 5
        else
            echo -e "${RED}[ERRO] Backend nao esta respondendo apos $MAX_RETRIES tentativas${NC}"
            exit 1
        fi
    fi
done
echo ""

# Exibir informacoes finais
echo "========================================"
echo -e "${GREEN}  Sistema Iniciado com Sucesso!${NC}"
echo "========================================"
echo ""
echo "URLs de Acesso:"
echo "  Frontend:  http://localhost:8080"
echo "  Backend:   http://localhost:5001"
echo "  Health:    http://localhost:5001/api/health"
echo ""
echo "Credenciais de Teste:"
echo "  MASTER:  master@beautyhub.com / 123456"
echo "  OWNER:   owner@belezapura.com / 123456"
echo "  ADMIN:   admin@belezapura.com / 123456"
echo "  PROF:    prof@belezapura.com / 123456"
echo ""
echo "Tenant: beleza-pura"
echo ""

# Perguntar se deseja abrir o navegador
read -p "Deseja abrir o frontend no navegador? (s/n): " OPEN_BROWSER
if [[ "$OPEN_BROWSER" =~ ^[Ss]$ ]]; then
    echo "Abrindo navegador..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open http://localhost:8080
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        xdg-open http://localhost:8080
    fi
fi

echo ""
echo "Para ver logs em tempo real, execute:"
echo "  docker-compose logs -f backend"
echo ""
echo "Para parar o sistema, execute:"
echo "  docker-compose stop"
echo ""
