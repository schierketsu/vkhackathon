#!/bin/bash
# Быстрый деплой - все в одном скрипте
# Использование: bash quick-deploy.sh
# Запускайте из директории /www/maxhackathon.ru/ или из текущей директории с файлами

set -e

echo "========================================"
echo "Быстрый деплой мини-приложения"
echo "========================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Определение базовой директории
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$SCRIPT_DIR"

# Если мы в домашней директории или другой, пытаемся найти правильный путь
if [[ "$BASE_DIR" == *"maxhackathon.ru"* ]] || [[ -f "$BASE_DIR/index.html" ]] || [[ -f "$BASE_DIR/.htaccess" ]]; then
    DEPLOY_DIR="$BASE_DIR"
else
    # Пытаемся найти директорию maxhackathon.ru
    if [ -d "/www/maxhackathon.ru" ]; then
        DEPLOY_DIR="/www/maxhackathon.ru"
    elif [ -d "$HOME/maxhackathon.ru" ]; then
        DEPLOY_DIR="$HOME/maxhackathon.ru"
    else
        DEPLOY_DIR="$BASE_DIR"
        echo -e "${YELLOW}Предупреждение: используем текущую директорию: $DEPLOY_DIR${NC}"
    fi
fi

echo -e "${YELLOW}Рабочая директория: $DEPLOY_DIR${NC}"
echo ""

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Ошибка: Node.js не установлен${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}Node.js: $NODE_VERSION${NC}"

# Создание директорий
echo ""
echo -e "${YELLOW}Создание директорий...${NC}"
mkdir -p "$DEPLOY_DIR/api-server/dist"
mkdir -p "$DEPLOY_DIR/data"
mkdir -p "$DEPLOY_DIR/logs"
echo -e "${GREEN}Директории созданы${NC}"

# Автоматическое исправление структуры, если файлы загружены неправильно
if [ -f "$DEPLOY_DIR/api-server/server.js" ] && [ ! -f "$DEPLOY_DIR/api-server/dist/server.js" ]; then
    echo ""
    echo -e "${YELLOW}Исправление структуры файлов...${NC}"
    mkdir -p "$DEPLOY_DIR/api-server/dist"
    
    # Перемещаем все .js файлы из api-server/ в api-server/dist/
    for file in "$DEPLOY_DIR/api-server"/*.js; do
        if [ -f "$file" ]; then
            mv "$file" "$DEPLOY_DIR/api-server/dist/"
            echo -e "${GREEN}✓ $(basename "$file") перемещен в dist/${NC}"
        fi
    done
    echo -e "${GREEN}Структура исправлена${NC}"
fi

# Проверка скомпилированного кода
echo ""
echo -e "${YELLOW}Проверка скомпилированного кода...${NC}"
if [ ! -f "$DEPLOY_DIR/api-server/dist/server.js" ]; then
    echo -e "${RED}Ошибка: dist/server.js не найден${NC}"
    echo ""
    echo "Убедитесь, что проект собран локально и файлы загружены"
    echo "Проверьте наличие файла: $DEPLOY_DIR/api-server/dist/server.js"
    echo ""
    echo "Что нужно сделать:"
    echo "1. На локальном компьютере выполните: build.bat"
    echo "2. Загрузите содержимое папки deploy-package/www/ на сервер"
    echo "3. Убедитесь, что файлы находятся в api-server/dist/, а не в api-server/"
    echo ""
    echo "Или используйте скрипт проверки: ./check-files.sh"
    exit 1
fi
echo -e "${GREEN}Скомпилированный код найден${NC}"

# Установка зависимостей API
echo ""
echo -e "${YELLOW}Установка зависимостей API сервера...${NC}"
cd "$DEPLOY_DIR/api-server"

# Используем production package.json если есть, иначе обычный
if [ -f "package.production.json" ]; then
    echo "Используется package.production.json (совместимый с Node.js v10)"
    cp package.production.json package.json
elif [ -f "package.json" ]; then
    echo "Используется package.json"
    # Обновляем better-sqlite3 до совместимой версии для Node v10
    if grep -q "better-sqlite3" package.json; then
        echo "Обновление better-sqlite3 до версии, совместимой с Node.js v10..."
        sed -i 's/"better-sqlite3": "[^"]*"/"better-sqlite3": "^7.6.2"/' package.json 2>/dev/null || \
        sed -i '' 's/"better-sqlite3": "[^"]*"/"better-sqlite3": "^7.6.2"/' package.json 2>/dev/null || true
    fi
else
    echo -e "${RED}Ошибка: package.json не найден${NC}"
    exit 1
fi

# Для Node v10 используем флаги совместимости и игнорируем ошибки компиляции better-sqlite3
echo "Установка зависимостей (это может занять время)..."
npm install --production --no-optional 2>&1 | grep -v "npm WARN" | grep -v "prebuild-install" | grep -v "node-gyp" || true

# Проверяем и исправляем версии для Node.js v10
if [ ! -d "node_modules/axios" ] || [ -f "node_modules/axios/index.js" ] && grep -q "import axios" "node_modules/axios/index.js" 2>/dev/null; then
    echo -e "${YELLOW}Установка совместимой версии axios для Node.js v10...${NC}"
    npm install axios@0.27.2 --production --no-optional --no-save 2>&1 | grep -v "npm WARN" || true
fi

# Проверяем, установился ли better-sqlite3 и скомпилирован ли он
if [ ! -d "node_modules/better-sqlite3" ] || [ ! -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo -e "${YELLOW}Предупреждение: better-sqlite3 не установился или не скомпилирован${NC}"
    echo "Попытка установки и пересборки совместимой версии..."
    
    # Удаляем старую версию
    rm -rf node_modules/better-sqlite3
    
    # Пробуем установить с предкомпилированными бинарниками
    npm install better-sqlite3@7.6.2 --production --no-optional --no-save 2>&1 | grep -v "npm WARN" || true
    
    # Если бинарники не найдены, пробуем пересобрать
    if [ ! -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
        echo "Попытка пересборки из исходников..."
        npm install better-sqlite3@7.6.2 --production --no-optional --no-save --build-from-source 2>&1 | grep -v "npm WARN" || true
    fi
    
    # Проверка результата
    if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
        echo -e "${GREEN}✓ better-sqlite3 успешно установлен${NC}"
    else
        echo -e "${RED}✗ Не удалось установить better-sqlite3${NC}"
        echo "Возможно, на сервере нет компилятора. Попробуйте запустить: ./fix-better-sqlite3.sh"
    fi
fi

echo -e "${GREEN}Зависимости установлены${NC}"

# Остановка старого сервера (если запущен)
echo ""
echo -e "${YELLOW}Проверка запущенного сервера...${NC}"
if [ -f "$DEPLOY_DIR/logs/api.pid" ]; then
    OLD_PID=$(cat "$DEPLOY_DIR/logs/api.pid")
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo "Остановка старого сервера (PID: $OLD_PID)..."
        kill $OLD_PID 2>/dev/null || true
        sleep 1
    fi
fi

# Запуск нового сервера
echo ""
echo -e "${YELLOW}Запуск API сервера...${NC}"
cd "$DEPLOY_DIR/api-server"

export NODE_ENV=production
export PORT=3002
export DB_PATH="$DEPLOY_DIR/data/campus.db"

# Токен для сервиса "поддержка" (Qwen API от ai.io.net)
# Получить токен можно на: https://ai.io.net/ai/api-keys
# Укажите токен одним из способов:
# 1. Через переменную окружения: export QWEN_API_TOKEN="ваш_токен" && bash quick-deploy.sh
# 2. Или замените пустую строку ниже на ваш токен:
QWEN_API_TOKEN_VALUE="${QWEN_API_TOKEN:-}"
# Если токен не указан, можно раскомментировать и указать здесь:
# QWEN_API_TOKEN_VALUE="io-v2-ваш_токен_здесь"
export QWEN_API_TOKEN="$QWEN_API_TOKEN_VALUE"

nohup node dist/server.js > "$DEPLOY_DIR/logs/api.log" 2>&1 &
API_PID=$!

echo $API_PID > "$DEPLOY_DIR/logs/api.pid"

sleep 2

if ps -p $API_PID > /dev/null; then
    echo -e "${GREEN}API сервер запущен (PID: $API_PID)${NC}"
else
    echo -e "${RED}Ошибка: сервер не запустился${NC}"
    echo "Проверьте логи: cat $DEPLOY_DIR/logs/api.log"
    exit 1
fi

echo ""
echo "========================================"
echo -e "${GREEN}Деплой завершен!${NC}"
echo "========================================"
echo ""
echo "API сервер: http://localhost:3002"
echo "Логи: $DEPLOY_DIR/logs/api.log"
echo "PID: $API_PID"
echo ""
echo "Для остановки: bash $DEPLOY_DIR/stop-api.sh"
echo ""
