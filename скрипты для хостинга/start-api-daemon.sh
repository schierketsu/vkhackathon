#!/bin/bash
# Скрипт для запуска API сервера в фоновом режиме (демон)
# Использование: bash start-api-daemon.sh

set -e

echo "========================================"
echo "Запуск API сервера в фоновом режиме"
echo "========================================"
echo ""

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Определение директории
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "/www/maxhackathon.ru" ]; then
    DEPLOY_DIR="/www/maxhackathon.ru"
elif [[ "$SCRIPT_DIR" == *"maxhackathon.ru"* ]] || [[ -f "$SCRIPT_DIR/index.html" ]] || [[ -f "$SCRIPT_DIR/.htaccess" ]]; then
    DEPLOY_DIR="$SCRIPT_DIR"
else
    DEPLOY_DIR="$SCRIPT_DIR"
fi

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Ошибка: Node.js не установлен${NC}"
    exit 1
fi

# Переход в директорию API сервера
cd "$DEPLOY_DIR/api-server"

# Проверка наличия скомпилированного сервера
if [ ! -f "dist/server.js" ]; then
    echo -e "${RED}Ошибка: dist/server.js не найден. Запустите сначала deploy.sh${NC}"
    exit 1
fi

# Проверка, не запущен ли уже сервер
if [ -f "$DEPLOY_DIR/logs/api.pid" ]; then
    OLD_PID=$(cat "$DEPLOY_DIR/logs/api.pid")
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Сервер уже запущен (PID: $OLD_PID)${NC}"
        echo "Используйте stop-api.sh для остановки перед повторным запуском"
        exit 0
    else
        # PID файл есть, но процесс не запущен - удаляем старый PID
        rm -f "$DEPLOY_DIR/logs/api.pid"
    fi
fi

# Проверка по порту
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PORT_PID=$(lsof -ti:3002)
    echo -e "${YELLOW}Порт 3002 уже занят процессом $PORT_PID${NC}"
    echo "Остановите существующий процесс перед повторным запуском"
    exit 1
fi

# Установка переменных окружения
export NODE_ENV=production
export PORT=3002
export DB_PATH="$DEPLOY_DIR/data/campus.db"

# Токен для сервиса "поддержка" (Qwen API от ai.io.net)
# Получить токен можно на: https://ai.io.net/ai/api-keys
# Укажите токен одним из способов:
# 1. Через переменную окружения: export QWEN_API_TOKEN="ваш_токен" && bash start-api-daemon.sh
# 2. Или замените пустую строку ниже на ваш токен:
QWEN_API_TOKEN_VALUE="${QWEN_API_TOKEN:-}"
# Если токен не указан, можно раскомментировать и указать здесь:
# QWEN_API_TOKEN_VALUE="io-v2-ваш_токен_здесь"
export QWEN_API_TOKEN="$QWEN_API_TOKEN_VALUE"

# Создание директории для логов
mkdir -p "$DEPLOY_DIR/logs"

# Запуск в фоновом режиме
echo -e "${GREEN}Запуск API сервера в фоновом режиме...${NC}"
cd "$DEPLOY_DIR/api-server"

# Запуск с перенаправлением логов и сохранением PID
nohup node dist/server.js > "$DEPLOY_DIR/logs/api.log" 2>&1 &
API_PID=$!

# Сохранение PID
echo $API_PID > "$DEPLOY_DIR/logs/api.pid"

# Небольшая задержка для проверки запуска
sleep 3

# Проверка, что сервер запустился
if ps -p $API_PID > /dev/null; then
    # Дополнительная проверка - сервер должен отвечать на запросы
    sleep 2
    if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API сервер успешно запущен и отвечает на запросы${NC}"
    else
        echo -e "${GREEN}✓ API сервер запущен (PID: $API_PID)${NC}"
        echo -e "${YELLOW}Предупреждение: сервер не отвечает на health check (может потребоваться время для инициализации)${NC}"
    fi
else
    echo -e "${RED}Ошибка: сервер не запустился${NC}"
    echo "Проверьте логи: cat $DEPLOY_DIR/logs/api.log"
    rm -f "$DEPLOY_DIR/logs/api.pid"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}API сервер запущен!${NC}"
echo "========================================"
echo ""
echo "PID: $API_PID"
echo "Логи: $DEPLOY_DIR/logs/api.log"
echo "PID файл: $DEPLOY_DIR/logs/api.pid"
echo ""
echo "Для остановки используйте:"
echo "  bash $DEPLOY_DIR/stop-api.sh"
echo ""
echo "Для проверки статуса:"
echo "  ps aux | grep $API_PID"
echo "  curl http://localhost:3002/api/health"
echo ""

