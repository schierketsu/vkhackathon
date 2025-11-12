#!/bin/bash
# Скрипт для автоматической настройки cron для автозапуска и мониторинга API сервера
# Использование: bash setup-cron-autostart.sh

set -e

echo "========================================"
echo "Настройка автозапуска через cron"
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

echo -e "${YELLOW}Рабочая директория: $DEPLOY_DIR${NC}"
echo ""

# Проверка наличия необходимых скриптов
if [ ! -f "$DEPLOY_DIR/start-api-daemon.sh" ]; then
    echo -e "${RED}Ошибка: start-api-daemon.sh не найден${NC}"
    exit 1
fi

if [ ! -f "$DEPLOY_DIR/watch-api.sh" ]; then
    echo -e "${RED}Ошибка: watch-api.sh не найден${NC}"
    exit 1
fi

# Установка прав на выполнение
echo -e "${YELLOW}Установка прав на выполнение...${NC}"
chmod +x "$DEPLOY_DIR/start-api-daemon.sh"
chmod +x "$DEPLOY_DIR/watch-api.sh"
chmod +x "$DEPLOY_DIR/setup-cron-autostart.sh" 2>/dev/null || true

# Создание директории для логов
mkdir -p "$DEPLOY_DIR/logs"

# Получение абсолютных путей
START_SCRIPT=$(cd "$DEPLOY_DIR" && pwd)/start-api-daemon.sh
WATCH_SCRIPT=$(cd "$DEPLOY_DIR" && pwd)/watch-api.sh
LOGS_DIR=$(cd "$DEPLOY_DIR/logs" && pwd)

# Проверка текущего crontab
echo -e "${YELLOW}Проверка текущего crontab...${NC}"
CRONTAB_FILE=$(mktemp)
crontab -l > "$CRONTAB_FILE" 2>/dev/null || touch "$CRONTAB_FILE"

# Удаление старых записей для этого проекта (если есть)
echo -e "${YELLOW}Удаление старых записей cron для этого проекта...${NC}"
grep -v "start-api-daemon.sh\|watch-api.sh" "$CRONTAB_FILE" > "${CRONTAB_FILE}.new" || true
mv "${CRONTAB_FILE}.new" "$CRONTAB_FILE"

# Добавление новых записей
echo -e "${YELLOW}Добавление новых записей в cron...${NC}"

# @reboot - автозапуск при перезагрузке
echo "@reboot cd $DEPLOY_DIR && bash $START_SCRIPT >> $LOGS_DIR/reboot.log 2>&1" >> "$CRONTAB_FILE"

# Периодическая проверка каждые 5 минут
echo "*/5 * * * * cd $DEPLOY_DIR && bash $WATCH_SCRIPT --quiet >> $LOGS_DIR/watch.log 2>&1" >> "$CRONTAB_FILE"

# Установка нового crontab
crontab "$CRONTAB_FILE"
rm "$CRONTAB_FILE"

echo ""
echo -e "${GREEN}✓ Cron настроен успешно!${NC}"
echo ""
echo "Добавлены следующие задачи:"
echo "  1. @reboot - автозапуск при перезагрузке сервера"
echo "  2. */5 * * * * - проверка и перезапуск каждые 5 минут"
echo ""
echo "Проверка настроек:"
echo "  crontab -l"
echo ""
echo "Логи:"
echo "  Автозапуск при перезагрузке: $LOGS_DIR/reboot.log"
echo "  Мониторинг: $LOGS_DIR/watch.log"
echo ""
echo -e "${YELLOW}Для немедленного запуска выполните:${NC}"
echo "  bash $START_SCRIPT"
echo ""

