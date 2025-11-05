import { Bot } from '@maxhub/max-bot-api';
import { initDatabase } from './utils/database';
import { setupScheduleHandlers } from './handlers/schedule';
import { setupEventsHandlers } from './handlers/events';
import { setupDeadlinesHandlers } from './handlers/deadlines';
import { setupMenuHandlers } from './handlers/menu';
import { getMainMenu } from './utils/menu';
import { startScheduler, setBotApi } from './utils/scheduler';
import { createUser, getUser } from './utils/users';
import { getTodaySchedule, formatSchedule } from './utils/timetable';
import { getUpcomingEvents, formatEvents } from './utils/events';
import { Keyboard } from '@maxhub/max-bot-api';

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
    `  /today — пары на сегодня\n` +
    `  /tomorrow — пары на завтра\n` +
    `  /week — расписание недели\n` +
    `  /group — выбрать группу\n` +
    `  /subgroup — выбрать подгруппу\n\n` +
    `🎉 Мероприятия:\n` +
    `  /events — ближайшие события\n` +
    `  /subscribe — подписка на уведомления\n\n` +
    `⏰ Дедлайны:\n` +
    `  /deadlines — список активных дедлайнов\n` +
    `  /adddeadline <название> <дата> — добавить дедлайн\n` +
    `  /notifyon — настройки уведомлений\n\n` +
    `Пример добавления дедлайна:\n` +
    `  /adddeadline РГР по ТРПО 20.11.2024`;
  
  await ctx.reply(helpText, {
    attachments: [getMainMenu()]
  });
});

// Настройка обработчиков
setupScheduleHandlers(bot);
setupEventsHandlers(bot);
setupDeadlinesHandlers(bot);
setupMenuHandlers(bot);

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
