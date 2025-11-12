import { Bot, Keyboard, Context } from '@maxhub/max-bot-api';
import * as fs from 'fs';
import * as path from 'path';
import { initDatabase } from './utils/database';
import { setupScheduleHandlers } from './handlers/schedule';
import { setupEventsHandlers } from './handlers/events';
import { setupDeadlinesHandlers } from './handlers/deadlines';
import { setupMenuHandlers } from './handlers/menu';
import { setupTeachersHandlers } from './handlers/teachers';
import { searchTeachers, getTeacherScheduleForDate, formatTeacherSchedule, isFavoriteTeacher, getAllTeachers, getTeacherWeekSchedule, getFavoriteTeachers, addFavoriteTeacher, removeFavoriteTeacher } from './utils/teachers';
import { getTeacherSearchMenu, getTeachersMenu, getTeacherScheduleMenu, getMainMenu } from './utils/menu';
import { startScheduler, setBotApi } from './utils/scheduler';
import { createUser, getUser, updateUserGroup, updateUserInstitution, toggleNotifications, toggleEventsSubscription } from './utils/users';
import { getTodaySchedule, getTomorrowSchedule, getCurrentWeekSchedule, getWeekScheduleFromDate, getWeekNumber, getGroupsStructure, getAvailableSubgroups, getAvailableInstitutions, formatSchedule } from './utils/timetable';
import { getUpcomingEvents, formatEvents } from './utils/events';
import { getActiveDeadlines, addDeadline, deleteDeadline } from './utils/deadlines';
import 'dotenv/config';

const BOT_TOKEN = process.env.BOT_TOKEN || 'f9LHodD0cOIt4K8Vo1cVPjs6fgvu-1qb-jPkrptyJK32kQ2mGItB-uyU0pChqMe3yY6pvDHctFo3VXFTjZOk';

const bot = new Bot(BOT_TOKEN, {
  clientOptions: {
    baseUrl: 'https://platform-api.max.ru' as any
  }
});

initDatabase();

setBotApi({
  sendMessage: async (userId: string, text: string) => {
    try {
      await bot.api.sendMessageToUser(parseInt(userId), text);
    } catch (error) {
      console.error(`Ошибка отправки сообщения пользователю ${userId}:`, error);
    }
  }
});

bot.on('bot_started', async (ctx: Context) => {
  if (!ctx.user) return;
  
  const user = ctx.user as { user_id: number; name?: string };
  const userId = user.user_id.toString();
  let dbUser = getUser(userId);
  
  if (!dbUser) {
    dbUser = createUser(userId);
  }
  
  const userName = user.name || 'Иван';
  
  // Если учебное заведение не указано, предлагаем выбрать
  if (!dbUser.institution_name) {
    const institutions = getAvailableInstitutions();
    
    if (institutions.length === 0) {
      await ctx.reply(
        `👋 Привет, ${userName}!\n\n` +
        'Я ваш помощник в учебе! К сожалению, учебные заведения не найдены.',
        {
          attachments: [getMainMenu()]
        }
      );
      return;
    }
    
    const buttons = institutions.map(inst => 
      [Keyboard.button.callback(inst, `select_institution:${encodeURIComponent(inst)}`)]
    );
    buttons.push([Keyboard.button.callback('⏭️ Выбрать позже', 'skip_institution')]);
    
    await ctx.reply(
      `👋 Привет, ${userName}!\n\n` +
      'Я ваш помощник в учебе! Я могу помочь с:\n\n' +
      '📅 Расписанием занятий\n' +
      '🎉 Календарем мероприятий\n' +
      '⏰ Уведомлениями о дедлайнах\n\n' +
      'Для начала выберите ваше учебное заведение:',
      {
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    );
    return;
  }
  
  // Если группа не указана, предлагаем выбрать
  if (!dbUser.group_name) {
    await ctx.reply(
      `👋 Привет, ${userName}!\n\n` +
      `Учебное заведение: ${dbUser.institution_name}\n\n` +
      'Для начала работы укажите вашу группу:',
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Выбрать группу', 'select_group_start')],
            [Keyboard.button.callback('⏭️ Выбрать позже', 'skip_group')]
          ])
        ]
      }
    );
    return;
  }
  
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

bot.command('start', async (ctx: Context) => {
  if (!ctx.user) return;
  
  const user = ctx.user as { user_id: number; name?: string };
  const userId = user.user_id.toString();
  let dbUser = getUser(userId);
  
  if (!dbUser) {
    dbUser = createUser(userId);
  }
  
  const userName = user.name || 'Иван';
  
  // Если учебное заведение не указано, предлагаем выбрать
  if (!dbUser.institution_name) {
    const institutions = getAvailableInstitutions();
    
    if (institutions.length === 0) {
      await ctx.reply(
        `👋 Привет, ${userName}!\n\n` +
        'Я ваш помощник в учебе! К сожалению, учебные заведения не найдены.',
        {
          attachments: [getMainMenu()]
        }
      );
      return;
    }
    
    const buttons = institutions.map(inst => 
      [Keyboard.button.callback(inst, `select_institution:${encodeURIComponent(inst)}`)]
    );
    buttons.push([Keyboard.button.callback('⏭️ Выбрать позже', 'skip_institution')]);
    
    await ctx.reply(
      `👋 Привет, ${userName}!\n\n` +
      'Я ваш помощник в учебе! Я могу помочь с:\n\n' +
      '📅 Расписанием занятий\n' +
      '🎉 Календарем мероприятий\n' +
      '⏰ Уведомлениями о дедлайнах\n\n' +
      'Для начала выберите ваше учебное заведение:',
      {
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    );
    return;
  }
  
  // Если группа не указана, предлагаем выбрать
  if (!dbUser.group_name) {
    await ctx.reply(
      `👋 Привет, ${userName}!\n\n` +
      `Учебное заведение: ${dbUser.institution_name}\n\n` +
      'Для начала работы укажите вашу группу:',
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📋 Выбрать группу', 'select_group_start')],
            [Keyboard.button.callback('⏭️ Выбрать позже', 'skip_group')]
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

bot.command('help', async (ctx: Context) => {
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

bot.on('message_created', async (ctx: Context) => {
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

// Обработчик выбора учебного заведения
bot.action(/select_institution:(.+)/, async (ctx: Context) => {
  if (!ctx.user) return;
  const userId = ctx.user.user_id.toString();
  const institutionName = decodeURIComponent(ctx.match?.[1] || '');
  
  if (!institutionName) {
    return ctx.answerOnCallback({
      notification: 'Ошибка при выборе учебного заведения'
    });
  }
  
  updateUserInstitution(userId, institutionName);
  const user = getUser(userId);
  
  // После выбора учебного заведения предлагаем выбрать группу
  await ctx.answerOnCallback({
    message: {
      text: `✅ Учебное заведение изменено на ${institutionName}\n\nТеперь выберите вашу группу:`,
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('📋 Выбрать группу', 'select_group_start')],
          [Keyboard.button.callback('⏭️ Выбрать позже', 'skip_group')]
        ])
      ]
    }
  });
});

// Обработчик пропуска выбора учебного заведения
bot.action('skip_institution', async (ctx: Context) => {
  if (!ctx.user) return;
  const userId = ctx.user.user_id.toString();
  const user = getUser(userId);
  const userName = (ctx.user as any).name || 'Иван';
  
  await ctx.answerOnCallback({
    message: {
      text: `👋 Привет, ${userName}!\n\n` +
        'Я ваш помощник в учебе! Я могу помочь с:\n\n' +
        '📅 Расписанием занятий\n' +
        '🎉 Календарем мероприятий\n' +
        '⏰ Уведомлениями о дедлайнах\n\n' +
        'Вы можете выбрать учебное заведение и группу позже в настройках.',
      attachments: [getMainMenu()]
    }
  });
});

// Обработчик пропуска выбора группы
bot.action('skip_group', async (ctx: Context) => {
  if (!ctx.user) return;
  const userId = ctx.user.user_id.toString();
  const user = getUser(userId);
  const userName = (ctx.user as any).name || 'Иван';
  
  await ctx.answerOnCallback({
    message: {
      text: `👋 Привет, ${userName}!\n\n` +
        'Я ваш помощник в учебе! Я могу помочь с:\n\n' +
        '📅 Расписанием занятий\n' +
        '🎉 Календарем мероприятий\n' +
        '⏰ Уведомлениями о дедлайнах\n\n' +
        'Вы можете выбрать группу позже в настройках.',
      attachments: [getMainMenu()]
    }
  });
});

// Настройка обработчиков
setupScheduleHandlers(bot);
setupEventsHandlers(bot);
setupDeadlinesHandlers(bot);
setupMenuHandlers(bot);
setupTeachersHandlers(bot);

bot.catch((error: any, ctx?: Context) => {
  console.error('Ошибка в боте:', error);
  if (ctx) {
    ctx.reply('Произошла ошибка. Попробуйте позже.').catch(console.error);
  }
});

// Запуск бота
async function main() {
  try {
    console.log('🚀 Запуск бота...');
    console.log('📡 Попытка подключения к API MAX...');
    
    const botInfo = await bot.api.getMyInfo();
    console.log(`✅ Бот успешно подключен! Имя: ${botInfo.username || 'Не указано'}`);
    
    startScheduler();
    
    console.log('🔄 Запуск long polling...');
    console.log('✨ Бот готов к работе!');
    
    // Запускаем polling
    await bot.start();
  } catch (error) {
    console.error('❌ Критическая ошибка при запуске бота:');
    console.error(error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('❌ Ошибка: Неверный токен бота! Проверьте токен в переменной окружения BOT_TOKEN.');
      } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('ECONNRESET') || error.message.includes('ECONNREFUSED')) {
        console.error('❌ Ошибка: Проблема с подключением к интернету или к серверам Max.');
        console.error('');
        console.error('🔍 Возможные причины:');
        console.error('   1. Нет подключения к интернету');
        console.error('   2. Сервер platform-api.max.ru временно недоступен');
        console.error('   3. Файрвол или антивирус блокирует соединение');
        console.error('   4. Проблемы с прокси/VPN');
        console.error('');
        console.error('💡 Что попробовать:');
        console.error('   - Проверьте интернет-соединение');
        console.error('   - Временно отключите файрвол/антивирус');
        console.error('   - Попробуйте запустить через несколько минут');
        console.error('   - Проверьте, не используете ли вы прокси/VPN');
        if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
          console.error('');
          console.error(`   Код ошибки: ${error.cause.code}`);
        }
      } else {
        console.error(`❌ Ошибка: ${error.message}`);
        if (error.cause) {
          console.error(`   Причина: ${error.cause}`);
        }
      }
    }
    
    process.exit(1);
  }
}

main();
