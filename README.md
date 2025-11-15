!!! Цифровой вуз.pptx Презентация с GIF !!! 

### Требования

- **Node.js 20+**
- **Docker** и **Docker Compose** (для запуска в Docker)

МИНИ-ПРИЛОЖЕНИЕ МЫ УЖЕ ЗАДЕПЛОИЛИ ПО АДРЕСУ https://maxhackathon.ru/, запуская тут вы будете работать с локальной веб-версией, а в чат-боте будет переход на деплой-версию

### ЛОКАЛЬНЫЙ ЗАПУСК

1. **Установите зависимости:**
```bash
npm install
cd chatbot && npm install
cd ../miniapp && npm install
cd ../miniapp/api-server && npm install
```

2. **Запустите API сервер:**
```bash
npm run api:dev
```

3. **Запустите чат-бота** (в другом терминале):
```bash
npm run dev:chatbot
```

4. **Запустите мини-приложение** (в третьем терминале):
```bash
cd miniapp && npm run dev
```

**Доступ:**
- API сервер: `http://localhost:3002/api`
- Мини-приложение: `http://localhost:3000`

### Запуск через Docker

 ̶1̶.̶ ̶*̶*̶С̶о̶з̶д̶а̶й̶т̶е̶ ̶ф̶а̶й̶л̶ ̶`̶.̶e̶n̶v̶`̶:̶*̶*̶

2. **Запустите все сервисы:**
```bash
docker-compose up --build -d
```

3. **Проверьте статус:**
```bash
docker-compose ps
docker-compose logs -f
```

4. **Остановка:**
```bash
docker-compose down
```

**Доступ:**
- API сервер: `http://localhost:3002/api`
- Мини-приложение: `http://localhost:3000`

## Описание Docker-образов

Проект использует Docker для контейнеризации и состоит из трех основных сервисов, которые можно запустить как отдельно, так и вместе через `docker-compose`.

### Структура Docker-образов

#### 1. **API Server** (`Dockerfile`)
- **Базовый образ:** `node:20-alpine`
- **Архитектура:** Многоэтапная сборка (builder + production)
- **Назначение:** Backend API сервер для мини-приложения
- **Порт:** 3002
- **Особенности:**
  - Собирает TypeScript код для API сервера, чат-бота и мини-приложения
  - Использует только production зависимости в финальном образе
  - Требует системные зависимости (python3, make, g++) для сборки `better-sqlite3`
  - Монтирует `data/` и `config.json` как volumes
- **Переменные окружения:**
  - `NODE_ENV=production`
  - `PORT=3002`
  - `DB_PATH=/app/data/campus.db`
  - `QWEN_API_TOKEN` (опционально)

#### 2. **Chatbot** (`Dockerfile.chatbot`)
- **Базовый образ:** `node:20-alpine`
- **Назначение:** Чат-бот для VK MAX
- **Особенности:**
  - Отдельный сервис, работающий независимо от API
  - Компилирует TypeScript код чат-бота
  - Ищет `config.json` на 3 уровня выше от `dist/bot.js`
  - Монтирует `data/` и `config.json` как volumes
- **Переменные окружения:**
  - `NODE_ENV=production`
  - `BOT_TOKEN` (токен VK бота)
  - `API_URL=http://api-server:3002/api` (URL для обращения к API серверу)

#### 3. **Miniapp** (`Dockerfile.miniapp`)
- **Базовый образ:** `node:20-alpine` (builder) + `nginx:alpine` (production)
- **Архитектура:** Многоэтапная сборка
- **Назначение:** Frontend мини-приложение
- **Порт:** 80 (внутри контейнера), маппится на 3000 хоста
- **Особенности:**
  - Собирает React/Vite приложение на этапе builder
  - Использует nginx для раздачи статических файлов
  - Использует кастомную конфигурацию nginx из `nginx.conf`
  - Не требует volumes, так как все файлы копируются в образ

### Docker Compose

`docker-compose.yml` оркестрирует все три сервиса:

- **api-server** — основной API сервер
- **chatbot** — чат-бот (зависит от api-server)
- **miniapp** — фронтенд приложение (зависит от api-server)

Все сервисы работают в одной сети `campus-network` и могут общаться друг с другом по именам сервисов.

### Переменные окружения

Перед запуском через Docker Compose убедитесь, что установлены следующие переменные окружения (можно через `.env` файл или экспорт):

- `BOT_TOKEN` — токен VK бота
- `QWEN_API_TOKEN` — токен для Qwen API (опционально)

### Сборка отдельных образов

Если нужно собрать образы отдельно:

```bash
# API Server
docker build -f Dockerfile -t campus-api-server .

# Chatbot
docker build -f Dockerfile.chatbot -t campus-chatbot .

# Miniapp
docker build -f Dockerfile.miniapp -t campus-miniapp .
```
