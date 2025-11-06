import { Bot, Keyboard } from '@maxhub/max-bot-api';
import { initDatabase } from './utils/database';
import { setupScheduleHandlers } from './handlers/schedule';
import { setupEventsHandlers } from './handlers/events';
import { setupDeadlinesHandlers } from './handlers/deadlines';
import { setupMenuHandlers } from './handlers/menu';
import { setupTeachersHandlers } from './handlers/teachers';
import { searchTeachers, getTeacherScheduleForDate, formatTeacherSchedule, isFavoriteTeacher, getAllTeachers } from './utils/teachers';
import { getTeacherSearchMenu, getTeachersMenu, getTeacherScheduleMenu, getMainMenu } from './utils/menu';
import { startScheduler, setBotApi } from './utils/scheduler';
import { createUser, getUser } from './utils/users';
import { getTodaySchedule, formatSchedule } from './utils/timetable';
import { getUpcomingEvents, formatEvents } from './utils/events';

// Токен бота из переменной окружения или захардкоженный
const BOT_TOKEN = process.env.BOT_TOKEN || 'f9LHodD0cOIt4K8Vo1cVPjs6fgvu-1qb-jPkrptyJK32kQ2mGItB-uyU0pChqMe3yY6pvDHctFo3VXFTjZOk';

// Создаем экземпляр бота
const bot = new Bot(BOT_TOKEN);

// Инициализация базы данных
initDatabase();

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

// Обработчик данных от мини-приложения и поиска преподавателя
bot.on('message_created', async (ctx) => {
  try {
    if (!ctx.user) return;
    
    const message = ctx.message as any;
    
    // Сначала проверяем данные от мини-приложения
    const data = message?.body?.data;
    if (data) {
      try {
        const appData = typeof data === 'string' ? JSON.parse(data) : data;
        const userId = ctx.user?.user_id?.toString() || '';
        
        console.log('Получены данные от мини-приложения:', appData);
        
        // Обрабатываем различные действия
        switch (appData.action) {
          case 'deadline_added':
            await ctx.reply(`✅ Дедлайн "${appData.title}" успешно добавлен!`);
            break;
          case 'deadline_deleted':
            await ctx.reply('✅ Дедлайн удален');
            break;
          case 'group_updated':
            await ctx.reply(`✅ Группа обновлена: ${appData.group_name}`);
            break;
          case 'setting_updated':
            const settingName = appData.setting === 'notifications_enabled' ? 'уведомления' : 'подписка на мероприятия';
            await ctx.reply(`✅ Настройка "${settingName}" обновлена`);
            break;
          default:
            console.log('Неизвестное действие от мини-приложения:', appData.action);
        }
        return; // Выходим, если обработали данные от мини-приложения
      } catch (error) {
        console.error('Ошибка обработки данных от мини-приложения:', error);
      }
    }
    
    // Обработка поиска преподавателя
    const messageText = message?.body?.text || '';
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
    let message = `🔍 Найдено преподавателей: ${results.length}\n\n`;
    const buttons: any[][] = [];
    
    const displayResults = results.slice(0, 20);
    for (let i = 0; i < displayResults.length; i += 2) {
      const row = displayResults.slice(i, i + 2).map(teacher =>
        Keyboard.button.callback(teacher, `teacher:${encodeURIComponent(teacher)}`)
      );
      buttons.push(row);
    }
    
    if (results.length > 20) {
      message += `Показано первых 20 результатов. Уточните запрос.\n\n`;
    }
    
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:teachers')]);
    
    await ctx.reply(message, {
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

// Запуск бота
async function main() {
  try {
    console.log('🚀 Запуск бота...');
    console.log('🔍 Проверка подключения к API...');
    
    // Получаем информацию о боте для проверки токена
    const botInfo = await bot.api.getMyInfo();
    console.log(`✅ Бот успешно подключен! Имя: ${botInfo.username || 'Не указано'}`);
    
    // Запускаем планировщик уведомлений
    startScheduler();
    
    console.log('🔄 Запуск long polling...');
    console.log('⏳ Ожидание обновлений...');
    console.log('✨ Бот готов к работе!');
    
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
