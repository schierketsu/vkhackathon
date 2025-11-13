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
