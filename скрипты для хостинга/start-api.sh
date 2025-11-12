#!/bin/bash
# Скрипт для запуска API сервера
# Использование: bash start-api.sh

set -e

echo "========================================"
echo "Запуск API сервера"
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

# Проверка наличия данных
if [ ! -d "$DEPLOY_DIR/data" ]; then
    echo -e "${YELLOW}Предупреждение: директория data не найдена${NC}"
fi

# Установка переменных окружения
export NODE_ENV=production
export PORT=3002
export DB_PATH="$DEPLOY_DIR/data/campus.db"

# Токен для сервиса "поддержка" (Qwen API от ai.io.net)
# Получить токен можно на: https://ai.io.net/ai/api-keys
# Укажите токен одним из способов:
# 1. Через переменную окружения: export QWEN_API_TOKEN="ваш_токен" && bash start-api.sh
# 2. Или замените пустую строку ниже на ваш токен:
QWEN_API_TOKEN_VALUE="${QWEN_API_TOKEN:-}"
# Если токен не указан, можно раскомментировать и указать здесь:
# QWEN_API_TOKEN_VALUE="io-v2-ваш_токен_здесь"
export QWEN_API_TOKEN="$QWEN_API_TOKEN_VALUE"

# Проверка, не запущен ли уже сервер
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}Предупреждение: порт 3002 уже занят${NC}"
    echo "Остановите существующий процесс или измените PORT в скрипте"
    exit 1
fi

# Запуск сервера
echo -e "${GREEN}Запуск API сервера на порту 3002...${NC}"
echo "Логи будут сохранены в $DEPLOY_DIR/logs/api.log"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""

# Создание директории для логов
mkdir -p "$DEPLOY_DIR/logs"

# Запуск с перенаправлением логов
node dist/server.js 2>&1 | tee "$DEPLOY_DIR/logs/api.log"
