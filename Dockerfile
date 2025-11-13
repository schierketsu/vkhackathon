# Dockerfile для проекта "Кампус - Чат-бот для MAX"
# Многоэтапная сборка для оптимизации размера образа

# Этап 1: Сборка зависимостей и компиляция
FROM node:20-alpine AS builder

WORKDIR /app

# Установка системных зависимостей для сборки нативных модулей (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Копирование файлов конфигурации
COPY package*.json ./
COPY chatbot/package*.json ./chatbot/
COPY miniapp/package*.json ./miniapp/
COPY miniapp/api-server/package*.json ./miniapp/api-server/

# Установка зависимостей
RUN npm install && \
    cd chatbot && npm install && \
    cd ../miniapp && npm install && \
    cd api-server && npm install

# Копирование исходного кода
COPY . .

# Сборка проекта
RUN npm run build:chatbot && \
    npm run build:api && \
    npm run build:miniapp

# Этап 2: Production образ
FROM node:20-alpine

WORKDIR /app

# Установка системных зависимостей для сборки better-sqlite3
RUN apk add --no-cache python3 make g++

# Копирование package.json для production зависимостей
COPY miniapp/api-server/package*.json ./miniapp/api-server/

# Установка только production зависимостей
RUN cd miniapp/api-server && npm install --production

# Копирование собранных файлов из builder
COPY --from=builder /app/chatbot/dist ./chatbot/dist
COPY --from=builder /app/miniapp/api-server/dist ./miniapp/api-server/dist
COPY --from=builder /app/miniapp/dist ./miniapp/dist

# Копирование данных и конфигурации
COPY data ./data
COPY config.json ./
COPY miniapp/api-server/shared-utils.ts ./miniapp/api-server/
COPY miniapp/api-server/package.json ./miniapp/api-server/

# Создание директории для логов
RUN mkdir -p /app/logs

# Переменные окружения
ENV NODE_ENV=production
ENV PORT=3002
ENV DB_PATH=/app/data/campus.db

# Открытие портов
EXPOSE 3002

# Запуск API сервера
WORKDIR /app/miniapp/api-server
CMD ["node", "dist/server.js"]

