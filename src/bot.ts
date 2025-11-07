import { Bot, Keyboard } from '@maxhub/max-bot-api';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './utils/database';
import { setupScheduleHandlers } from './handlers/schedule';
import { setupEventsHandlers } from './handlers/events';
import { setupDeadlinesHandlers } from './handlers/deadlines';
import { setupMenuHandlers } from './handlers/menu';
import { setupTeachersHandlers } from './handlers/teachers';
import { searchTeachers, getTeacherScheduleForDate, formatTeacherSchedule, isFavoriteTeacher, getAllTeachers, getTeacherWeekSchedule, getFavoriteTeachers, addFavoriteTeacher, removeFavoriteTeacher } from './utils/teachers';
import { getTeacherSearchMenu, getTeachersMenu, getTeacherScheduleMenu, getMainMenu } from './utils/menu';
import { startScheduler, setBotApi } from './utils/scheduler';
import { createUser, getUser, updateUserGroup, toggleNotifications, toggleEventsSubscription } from './utils/users';
import { getTodaySchedule, getTomorrowSchedule, getCurrentWeekSchedule, getWeekScheduleFromDate, getWeekNumber, getGroupsStructure, getAvailableSubgroups, formatSchedule } from './utils/timetable';
import { getUpcomingEvents, formatEvents } from './utils/events';
import { getActiveDeadlines, addDeadline, deleteDeadline } from './utils/deadlines';
import 'dotenv/config';

// Токен бота из переменной окружения или захардкоженный
const BOT_TOKEN = process.env.BOT_TOKEN || 'f9LHodD0cOIt4K8Vo1cVPjs6fgvu-1qb-jPkrptyJK32kQ2mGItB-uyU0pChqMe3yY6pvDHctFo3VXFTjZOk';

// Создаем экземпляр бота
const bot = new Bot(BOT_TOKEN);

// Инициализация базы данных
initDatabase();

// Настройка Express API сервера для мини-приложения
const app = express();
const API_PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3001;

app.use(cors());
app.use(express.json());

// API Routes для мини-приложения

// Расписание
app.get('/api/schedule/today', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const user = getUser(userId) || createUser(userId);
    
    if (!user || !user.group_name) {
      return res.status(400).json({ error: 'Группа не указана' });
    }

    const schedule = getTodaySchedule(user.group_name, user.subgroup);
    if (!schedule) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/schedule/tomorrow', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const user = getUser(userId) || createUser(userId);
    
    if (!user || !user.group_name) {
      return res.status(400).json({ error: 'Группа не указана' });
    }

    const schedule = getTomorrowSchedule(user.group_name, user.subgroup);
    if (!schedule) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/schedule/week', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const user = getUser(userId) || createUser(userId);
    
    if (!user || !user.group_name) {
      return res.status(400).json({ error: 'Группа не указана' });
    }

    // Если указана дата начала недели, используем её
    const weekStartParam = req.query.weekStart as string;
    if (weekStartParam) {
      const weekStart = new Date(weekStartParam);
      const schedule = getWeekScheduleFromDate(user.group_name, weekStart, user.subgroup);
      return res.json(schedule);
    }

    // Иначе возвращаем текущую неделю
    const schedule = getCurrentWeekSchedule(user.group_name, user.subgroup);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// События
app.get('/api/events', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const events = getUpcomingEvents(days);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events/subscription', (req, res) => {
  try {
    const { userId, subscribed } = req.body;
    toggleEventsSubscription(userId, subscribed);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Дедлайны
app.get('/api/deadlines', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const deadlines = getActiveDeadlines(userId);
    res.json(deadlines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deadlines', (req, res) => {
  try {
    const { userId, title, dueDate, description } = req.body;
    const deadline = addDeadline(userId, title, dueDate, description);
    res.status(201).json(deadline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/deadlines/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.query.userId as string;
    const success = deleteDeadline(id, userId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deadlines/notifications', (req, res) => {
  try {
    const { userId, enabled } = req.body;
    toggleNotifications(userId, enabled);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Преподаватели
app.get('/api/teachers', (req, res) => {
  try {
    const teachers = getAllTeachers();
    res.json(teachers.map(name => ({ name })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/search', (req, res) => {
  try {
    const query = req.query.query as string;
    const teachers = searchTeachers(query);
    res.json(teachers.map(name => ({ name })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/favorites', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const favorites = getFavoriteTeachers(userId);
    res.json(favorites.map(name => ({ name })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers/favorites', (req, res) => {
  try {
    const { userId, teacherName } = req.body;
    const success = addFavoriteTeacher(userId, teacherName);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/teachers/favorites', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const teacherName = req.query.teacherName as string;
    const success = removeFavoriteTeacher(userId, teacherName);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Расписание преподавателя на неделю
app.get('/api/teachers/week-schedule', (req, res) => {
  try {
    const teacherName = req.query.teacherName as string;
    const weekStart = req.query.weekStart as string; // ISO date string
    
    if (!teacherName) {
      return res.status(400).json({ error: 'Не указано имя преподавателя' });
    }

    const startDate = weekStart ? new Date(weekStart) : new Date();
    // Если дата не указана, находим понедельник текущей недели
    if (!weekStart) {
      const dayOfWeek = startDate.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate.setDate(startDate.getDate() + daysUntilMonday);
      startDate.setHours(0, 0, 0, 0);
    }

    const schedule = getTeacherWeekSchedule(teacherName, startDate);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Пользователь
app.get('/api/user', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const user = getUser(userId) || createUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/group', (req, res) => {
  try {
    const { userId, groupName, subgroup } = req.body;
    updateUserGroup(userId, groupName, subgroup);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups', (req, res) => {
  try {
    const structure = getGroupsStructure();
    res.json(structure);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups/subgroups', (req, res) => {
  try {
    const groupName = req.query.groupName as string;
    if (!groupName) {
      return res.status(400).json({ error: 'Не указано имя группы' });
    }
    const subgroups = getAvailableSubgroups(groupName);
    res.json({ subgroups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/week/current', (req, res) => {
  try {
    const today = new Date();
    const weekNumber = getWeekNumber(today);
    res.json({ weekNumber });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Настройка API для планировщика
setBotApi({
  sendMessage: async (userId: string, text: string) => {
    try {
      await bot.api.sendMessageToUser(parseInt(userId), text);
    } catch (error) {
      console.error(`Ошибка отправки сообщения пользователю ${userId}:`, error);
    }
  }
});

// Обработчик команды /start
bot.on('bot_started', async (ctx) => {
  if (!ctx.user) return;
  
  const user = ctx.user as { user_id: number; name?: string };
  const userId = user.user_id.toString();
  let dbUser = getUser(userId);
  
  if (!dbUser) {
    dbUser = createUser(userId);
  }
  
  const userName = user.name || 'Иван';
  
  let message = `👋 Привет, ${userName}!\n\n`;
  message += 'Я ваш помощник в учебе! Я могу помочь с:\n\n';
  message += '📅 Расписанием занятий\n';
  message += '🎉 Календарем мероприятий\n';
  message += '⏰ Уведомлениями о дедлайнах\n\n';
  message += 'Используйте кнопки меню для быстрого доступа!';
  
  await ctx.reply(message, {
    attachments: [getMainMenu()]
  });
});

// Команда /start
bot.command('start', async (ctx) => {
  if (!ctx.user) return;
  
  const user = ctx.user as { user_id: number; name?: string };
  const userId = user.user_id.toString();
  let dbUser = getUser(userId);
  
  if (!dbUser) {
    dbUser = createUser(userId);
  }
  
  const userName = user.name || 'Иван';
  
  // Если группа не указана, предлагаем выбрать
  if (!dbUser.group_name) {
    await ctx.reply(
      `👋 Привет, ${userName}!\n\n` +
      'Для начала работы укажите вашу группу:',
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Выбрать группу', 'select_group')]
          ])
        ]
      }
    );
    return;
  }
  
  // Показываем краткую сводку на сегодня
  let message = `👋 Привет, ${userName}!\n\n`;
  
  // Расписание на сегодня
  const schedule = getTodaySchedule(dbUser.group_name, dbUser.subgroup);
  if (schedule && schedule.lessons.length > 0) {
    message += '📅 Сегодня у тебя:\n\n';
    message += formatSchedule(schedule) + '\n\n';
  }
  
  // События на сегодня
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
  const events = getUpcomingEvents(1);
  const todayEvents = events.filter(e => e.date === todayStr);
  
  if (todayEvents.length > 0) {
    message += '🎉 События сегодня:\n';
    todayEvents.forEach(event => {
      message += `• ${event.title}`;
      if (event.location) {
        message += ` (${event.location})`;
      }
      message += '\n';
    });
    message += '\n';
  }
  
  message += 'Используйте кнопки меню для навигации!';
  
  await ctx.reply(message, {
    attachments: [getMainMenu()]
  });
});

// Команда /help
bot.command('help', async (ctx) => {
  const helpText = `📚 Доступные команды:\n\n` +
    `📅 Расписание:\n` +
    `  /сегодня — пары на сегодня\n` +
    `  /завтра — пары на завтра\n` +
    `  /неделя — расписание недели\n` +
    `  /группа — выбрать группу\n` +
    `  /подгруппа — выбрать подгруппу\n\n` +
    `👨‍🏫 Преподаватели:\n` +
    `  /поиск <имя> — поиск преподавателя\n\n` +
    `🎉 Мероприятия:\n` +
    `  /мероприятия — ближайшие мероприятия\n` +
    `  /подписка — подписка на уведомления\n\n` +
    `⏰ Дедлайны:\n` +
    `  /дедлайны — список активных дедлайнов\n` +
    `  /новыйдедлайн <название> <дата> — добавить дедлайн\n` +
    `  /уведомления — настройки уведомлений\n\n` +
    `Пример добавления дедлайна:\n` +
    `  /новыйдедлайн РГР по ТРПО 20.11.2024\n\n` +
    `💡 Совет: Используйте кнопки меню для быстрого доступа!`;
  
  await ctx.reply(helpText, {
    attachments: [getMainMenu()]
  });
});

// Обработчик поиска преподавателя
bot.on('message_created', async (ctx) => {
  try {
    if (!ctx.user) return;
    
    const msg = ctx.message as any;
    
    // Обработка поиска преподавателя
    const messageText = msg?.body?.text || '';
    if (!messageText) return;
    
    // Проверяем, начинается ли сообщение с /поиск
    const isSearchCommand = messageText.startsWith('/поиск ');
    if (!isSearchCommand) return;
    
    console.log('🔍 Команда поиска преподавателя обнаружена');
    console.log('📝 Текст сообщения:', messageText);
    
    // Извлекаем запрос
    const parts = messageText.split(' ');
    const query = parts.slice(1).join(' ').trim();
    
    console.log('🔎 Запрос для поиска:', query);
    
    if (!query) {
      await ctx.reply(
        '❌ Укажите имя преподавателя для поиска.\n\nПример: /поиск Иванов',
        { attachments: [getTeacherSearchMenu()] }
      );
      return;
    }

    console.log('🔍 Начинаю поиск...');
    const allTeachers = getAllTeachers();
    console.log('📊 Всего преподавателей в базе:', allTeachers.length);
    
    const results = searchTeachers(query);
    console.log('✅ Найдено преподавателей:', results.length);
    if (results.length > 0) {
      console.log('📋 Первые результаты:', results.slice(0, 3));
    } else {
      console.log('⚠️ Результаты поиска пусты');
      console.log('🔍 Примеры преподавателей в базе:', allTeachers.slice(0, 5));
    }
    
    if (results.length === 0) {
      await ctx.reply(
        `❌ Преподаватели по запросу "${query}" не найдены.\n\n` +
        `Попробуйте ввести фамилию преподавателя, например:\n` +
        `/поиск Иванов\n` +
        `/поиск Андреева`,
        { attachments: [getTeacherSearchMenu()] }
      );
      return;
    }

    // Если найден один преподаватель, показываем его расписание
    if (results.length === 1) {
      const teacherName = results[0];
      const userId = (ctx.user as any)?.user_id?.toString() || '';
      const today = new Date();
      const schedule = getTeacherScheduleForDate(teacherName, today);
      const text = formatTeacherSchedule(schedule);
      const favorite = isFavoriteTeacher(userId, teacherName);
      
      await ctx.reply(`👨‍🏫 ${teacherName}\n\n${text}`, {
        attachments: [getTeacherScheduleMenu(teacherName, favorite)]
      });
      return;
    }

    // Если найдено несколько, показываем список
    let replyText = `🔍 Найдено преподавателей: ${results.length}\n\n`;
    const buttons: any[][] = [];
    
    const displayResults = results.slice(0, 20);
    for (let i = 0; i < displayResults.length; i += 2) {
      const row = displayResults.slice(i, i + 2).map(teacher =>
        Keyboard.button.callback(teacher, `teacher:${encodeURIComponent(teacher)}`)
      );
      buttons.push(row);
    }
    
    if (results.length > 20) {
      replyText += `Показано первых 20 результатов. Уточните запрос.\n\n`;
    }
    
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:teachers')]);
    
    await ctx.reply(replyText, {
      attachments: [Keyboard.inlineKeyboard(buttons)]
    });
  } catch (error) {
    console.error('Ошибка в обработчике сообщений:', error);
    // Не отвечаем на ошибку, чтобы не мешать другим обработчикам
  }
});

// Настройка обработчиков
setupScheduleHandlers(bot);
setupEventsHandlers(bot);
setupDeadlinesHandlers(bot);
setupMenuHandlers(bot);
setupTeachersHandlers(bot);

// Обработка ошибок
bot.catch((error, ctx) => {
  console.error('Ошибка в боте:', error);
  if (ctx) {
    ctx.reply('Произошла ошибка. Попробуйте позже.').catch(console.error);
  }
});

// Запуск бота и API сервера
async function main() {
  try {
    // Запускаем Express API сервер
    app.listen(API_PORT, () => {
      console.log(`🌐 API сервер запущен на порту ${API_PORT}`);
      console.log(`📡 API доступен по адресу: http://localhost:${API_PORT}/api`);
    });
    
    console.log('🚀 Запуск бота...');
    console.log('🔍 Проверка подключения к API...');
    
    // Получаем информацию о боте для проверки токена
    const botInfo = await bot.api.getMyInfo();
    console.log(`✅ Бот успешно подключен! Имя: ${botInfo.username || 'Не указано'}`);
    
    // Запускаем планировщик уведомлений
    startScheduler();
    
    console.log('🔄 Запуск long polling...');
    console.log('⏳ Ожидание обновлений...');
    console.log('✨ Бот и API сервер готовы к работе!');
    
    // Запускаем polling
    await bot.start();
  } catch (error) {
    console.error('❌ Критическая ошибка при запуске бота:');
    console.error(error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('❌ Ошибка: Неверный токен бота! Проверьте токен.');
      } else if (error.message.includes('fetch') || error.message.includes('network')) {
        console.error('❌ Ошибка: Проблема с подключением к интернету или к серверам Max.');
      } else {
        console.error(`❌ Ошибка: ${error.message}`);
      }
    }
    
    process.exit(1);
  }
}

main();
