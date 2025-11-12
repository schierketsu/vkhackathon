#!/bin/bash
# Скрипт для мониторинга и автоматического перезапуска API сервера
# Использование: bash watch-api.sh [--quiet]
# Используется cron для периодической проверки

# Режим тихого выполнения (для cron)
QUIET=false
if [[ "$1" == "--quiet" ]] || [[ "$1" == "-q" ]]; then
    QUIET=true
fi

# Цвета (только если не в тихом режиме)
if [ "$QUIET" = false ]; then
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    RED='\033[0;31m'
    NC='\033[0m'
else
    GREEN=''
    YELLOW=''
    RED=''
    NC=''
fi

# Определение директории
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "/www/maxhackathon.ru" ]; then
    DEPLOY_DIR="/www/maxhackathon.ru"
elif [[ "$SCRIPT_DIR" == *"maxhackathon.ru"* ]] || [[ -f "$SCRIPT_DIR/index.html" ]] || [[ -f "$SCRIPT_DIR/.htaccess" ]]; then
    DEPLOY_DIR="$SCRIPT_DIR"
else
    DEPLOY_DIR="$SCRIPT_DIR"
fi

# Создание директории для логов
mkdir -p "$DEPLOY_DIR/logs"

LOG_FILE="$DEPLOY_DIR/logs/watch.log"

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    if [ "$QUIET" = false ]; then
        echo "$1"
    fi
}

# Проверка, запущен ли сервер
check_server() {
    # Проверка по PID файлу
    if [ -f "$DEPLOY_DIR/logs/api.pid" ]; then
        OLD_PID=$(cat "$DEPLOY_DIR/logs/api.pid" 2>/dev/null)
        if [ -n "$OLD_PID" ] && ps -p $OLD_PID > /dev/null 2>&1; then
            # Процесс существует, проверяем порт
            if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
                # Проверяем health endpoint
                if curl -s -f http://localhost:3002/api/health > /dev/null 2>&1; then
                    return 0  # Сервер работает нормально
                else
                    log "${YELLOW}Сервер запущен, но не отвечает на health check${NC}"
                    return 1
                fi
            else
                log "${YELLOW}Процесс существует, но порт не слушается${NC}"
                return 1
            fi
        else
            # PID файл есть, но процесс не существует
            log "${YELLOW}PID файл найден, но процесс не запущен (PID: $OLD_PID)${NC}"
            rm -f "$DEPLOY_DIR/logs/api.pid"
            return 1
        fi
    fi
    
    # Проверка по порту
    if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
        PORT_PID=$(lsof -ti:3002)
        log "${YELLOW}Порт 3002 занят процессом $PORT_PID, но PID файл отсутствует${NC}"
        return 1
    fi
    
    # Сервер не запущен
    return 1
}

# Перезапуск сервера
restart_server() {
    log "${YELLOW}Попытка перезапуска API сервера...${NC}"
    
    # Остановка старого процесса, если есть
    if [ -f "$DEPLOY_DIR/logs/api.pid" ]; then
        OLD_PID=$(cat "$DEPLOY_DIR/logs/api.pid" 2>/dev/null)
        if [ -n "$OLD_PID" ] && ps -p $OLD_PID > /dev/null 2>&1; then
            log "Остановка старого процесса (PID: $OLD_PID)"
            kill $OLD_PID 2>/dev/null || true
            sleep 2
        fi
        rm -f "$DEPLOY_DIR/logs/api.pid"
    fi
    
    # Очистка порта, если занят
    if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
        PORT_PID=$(lsof -ti:3002)
        log "Освобождение порта 3002 (процесс: $PORT_PID)"
        kill $PORT_PID 2>/dev/null || true
        sleep 2
    fi
    
    # Запуск через start-api-daemon.sh
    if [ -f "$DEPLOY_DIR/start-api-daemon.sh" ]; then
        cd "$DEPLOY_DIR"
        # Запускаем в тихом режиме для cron
        if bash "$DEPLOY_DIR/start-api-daemon.sh" >> "$LOG_FILE" 2>&1; then
            sleep 3
            if check_server; then
                log "${GREEN}✓ API сервер успешно перезапущен${NC}"
                return 0
            else
                log "${RED}✗ Сервер запустился, но не отвечает${NC}"
                return 1
            fi
        else
            log "${RED}✗ Ошибка при запуске сервера${NC}"
            return 1
        fi
    else
        log "${RED}✗ Файл start-api-daemon.sh не найден в $DEPLOY_DIR${NC}"
        return 1
    fi
}

# Основная логика
main() {
    if check_server; then
        if [ "$QUIET" = false ]; then
            log "${GREEN}✓ API сервер работает нормально${NC}"
        fi
        exit 0
    else
        log "${RED}✗ API сервер не работает, выполняю перезапуск...${NC}"
        if restart_server; then
            exit 0
        else
            log "${RED}✗ Не удалось перезапустить сервер${NC}"
            exit 1
        fi
    fi
}

main
