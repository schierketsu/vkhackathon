import { Bot, Keyboard, Context } from '@maxhub/max-bot-api';
import * as fs from 'fs';
import * as path from 'path';
import { initDatabase } from './utils/database';
import { setupScheduleHandlers } from './handlers/schedule';
import { setupEventsHandlers } from './handlers/events';
import { setupDeadlinesHandlers } from './handlers/deadlines';
import { setupMenuHandlers } from './handlers/menu';
import { setupTeachersHandlers } from './handlers/teachers';
import { setupPracticeHandlers } from './handlers/practice';
import { setupSupportHandlers } from './handlers/support';
import { setupProfileHandlers } from './handlers/profile';
import { setupServicesHandlers } from './handlers/services';
import { getMainMenu } from './utils/menu';
import { startScheduler, setBotApi } from './utils/scheduler';
import { initBridge, syncDeadlinesToMiniapp, syncUserSettingsToMiniapp } from './utils/max-bridge';
import { createUser, getUser, updateUserGroup, updateUserInstitution, toggleNotifications, toggleEventsSubscription, setUserState } from './utils/users';
import { addDeadline } from './utils/deadlines';
import { getDeadlinesMenu } from './utils/menu';
import { getTodaySchedule, getTomorrowSchedule, getCurrentWeekSchedule, getWeekScheduleFromDate, getWeekNumber, getGroupsStructure, getAvailableSubgroups, getAvailableInstitutions, formatSchedule } from './utils/timetable';
import { getUpcomingEvents, formatEvents } from './utils/events';
import { getActiveDeadlines, deleteDeadline } from './utils/deadlines';
import { getConfig } from './utils/config';
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

// Инициализация Max Bridge
const bridgeConfig = getConfig();
if (bridgeConfig.bridge) {
  initBridge({
    miniappApiUrl: bridgeConfig.bridge.miniapp_api_url || 'http://localhost:3002',
    enabled: bridgeConfig.bridge.enabled !== false
  });
}

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
  
  // Показываем красивое приветствие с краткой сводкой
  let message = `✨ **Добро пожаловать, ${userName}!** ✨\n\n`;
  message += `🎓 Я твой помощник в учебе. Вот что я могу:\n\n`;
  message += `📅 **Расписание занятий** — всегда актуальное\n`;
  message += `🎉 **Календарь мероприятий** — не пропусти ничего\n`;
  message += `⏰ **Уведомления о дедлайнах** — всё под контролем\n`;
  message += `👨‍🏫 **Поиск преподавателей** — быстро и удобно\n\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;
  
  // Расписание на сегодня
  const schedule = getTodaySchedule(dbUser.group_name, dbUser.subgroup);
  if (schedule && schedule.lessons.length > 0) {
    message += `📅 **Сегодня у тебя:**\n\n`;
    message += formatSchedule(schedule) + '\n\n';
    message += `━━━━━━━━━━━━━━━━━━\n\n`;
  }
  
  // События на сегодня
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
  const events = getUpcomingEvents(1);
  const todayEvents = events.filter(e => e.date === todayStr);
  
  if (todayEvents.length > 0) {
    message += `🎉 **События сегодня:**\n\n`;
    todayEvents.forEach(event => {
      message += `• *${event.title}*`;
      if (event.location) {
        message += ` — ${event.location}`;
      }
      message += '\n';
    });
    message += '\n━━━━━━━━━━━━━━━━━━\n\n';
  }
  
  message += `💡 Используй кнопки меню для быстрого доступа!`;
  
  await ctx.reply(message, {
    format: 'markdown',
    attachments: [getMainMenu()]
  });
});

// Команда поиска преподавателя обрабатывается в bot.on('message_created')
// для обеспечения правильной работы (аналогично модулю поддержки)

bot.command('help', async (ctx: Context) => {
  const helpText = `📚 **Справка по командам**\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `📅 **Расписание:**\n` +
    `  \`/сегодня\` — пары на сегодня\n` +
    `  \`/завтра\` — пары на завтра\n` +
    `  \`/неделя\` — расписание недели\n` +
    `  \`/группа\` — выбрать группу\n` +
    `  \`/подгруппа\` — выбрать подгруппу\n\n` +
    `👨‍🏫 **Преподаватели:**\n` +
    `  \`/поиск <имя>\` — поиск преподавателя\n\n` +
    `🎉 **Мероприятия:**\n` +
    `  \`/мероприятия\` — ближайшие мероприятия\n` +
    `  \`/подписка\` — подписка на уведомления\n\n` +
    `⏰ **Дедлайны:**\n` +
    `  \`/дедлайны\` — список активных дедлайнов\n` +
    `  \`/новыйдедлайн <название> <дата>\` — добавить дедлайн\n` +
    `  \`/уведомления\` — настройки уведомлений\n\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `💡 *Пример:*\n` +
    `\`/новыйдедлайн РГР по ТРПО 20.11.2024\`\n\n` +
    `💡 *Совет:* Используй кнопки меню для быстрого доступа!`;
  
  await ctx.reply(helpText, {
    format: 'markdown',
    attachments: [getMainMenu()]
  });
});

bot.on('message_created', async (ctx: Context, next: () => Promise<void>) => {
  try {
    if (!ctx.user || !ctx.message) {
      return next();
    }
    
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    const messageText = ctx.message.body.text;
    
    if (!messageText) {
      return next();
    }
    
    // Пропускаем команды - они обрабатываются через bot.command() или в других модулях
    if (messageText.startsWith('/')) {
      return next();
    }
    
    // Обработка состояний пользователя для создания дедлайнов
    if (user && user.user_state === 'waiting_deadline') {
      // Парсинг текста дедлайна
      const datePattern = /\b(\d{1,2}\.\d{1,2}(?:\.\d{4})?)\b/;
      const match = messageText.match(datePattern);
      
      if (!match) {
        await ctx.reply(
          '❌ Не удалось распознать дату в вашем сообщении.\n\n' +
          'Пожалуйста, укажите дату в формате DD.MM.YYYY или DD.MM\n\n' +
          'Примеры:\n• РГР по ТРПО 20.11.2024\n• Курсовая работа 15.12.2024',
          {
            attachments: [Keyboard.inlineKeyboard([
              [Keyboard.button.callback('❌ Отмена', 'menu:deadlines')]
            ])]
          }
        );
        return;
      }
      
      let dateStr = match[1];
      
      // Если год не указан, добавляем текущий или следующий
      if (!dateStr.includes('.2024') && !dateStr.includes('.2025') && !dateStr.includes('.2026')) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const dateParts = dateStr.split('.');
        const month = parseInt(dateParts[1]);
        
        if (month < currentMonth) {
          dateStr = `${dateStr}.${currentYear + 1}`;
        } else {
          dateStr = `${dateStr}.${currentYear}`;
        }
      }
      
      const title = messageText.replace(datePattern, '').trim();
      
      if (!title) {
        await ctx.reply(
          '❌ Не удалось найти название дедлайна.\n\n' +
          'Пожалуйста, укажите название и дату, например:\n• РГР по ТРПО 20.11.2024',
          {
            attachments: [Keyboard.inlineKeyboard([
              [Keyboard.button.callback('❌ Отмена', 'menu:deadlines')]
            ])]
          }
        );
        return;
      }
      
      try {
        addDeadline(userId, title, dateStr);
        setUserState(userId, null);
        await ctx.reply(`✅ Дедлайн добавлен:\n\n"${title}" — ${dateStr}`, {
          attachments: [getDeadlinesMenu()]
        });
      } catch (error) {
        await ctx.reply('❌ Ошибка при добавлении дедлайна. Попробуйте еще раз.');
      }
      return;
    }
    
    // Обработка состояний пользователя для поиска преподавателей
    // перенесена в handlers/teachers.ts (аналогично модулю поддержки)
    
    // Команды обрабатываются через bot.command() или в других модулях, передаем управление дальше
    return next();
  } catch (error) {
    console.error('Ошибка в обработчике сообщений:', error);
    // В случае ошибки передаем управление дальше
    return next();
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
// ВАЖНО: setupSupportHandlers должен быть вызван ПЕРЕД setupTeachersHandlers,
// чтобы обработчик поддержки регистрировался раньше и имел приоритет
setupScheduleHandlers(bot);
setupEventsHandlers(bot);
setupDeadlinesHandlers(bot);
setupMenuHandlers(bot);
setupSupportHandlers(bot); // Перемещено выше для приоритета
setupTeachersHandlers(bot);
setupPracticeHandlers(bot);
setupProfileHandlers(bot);
setupServicesHandlers(bot);

bot.catch((error: any, ctx?: Context) => {
  console.error('Ошибка в боте:', error);
  if (error.response) {
    console.error('Ответ API:', error.response);
  }
  if (ctx) {
    try {
      if (ctx.callback) {
        ctx.answerOnCallback({
          notification: 'Произошла ошибка. Попробуйте позже.'
        }).catch(console.error);
      } else {
        ctx.reply('Произошла ошибка. Попробуйте позже.').catch(console.error);
      }
    } catch (e) {
      console.error('Не удалось отправить сообщение об ошибке:', e);
    }
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
