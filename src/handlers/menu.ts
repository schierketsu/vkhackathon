import { Context, Keyboard } from '@maxhub/max-bot-api';
import { getTodaySchedule, getTomorrowSchedule, getCurrentWeekSchedule, getNextWeekSchedule, formatSchedule } from '../utils/timetable';
import { getUpcomingEvents, formatEvents } from '../utils/events';
import { getActiveDeadlines, formatDeadlines } from '../utils/deadlines';
import { getUser, toggleNotifications, toggleEventsSubscription, updateUserGroup, updateUserSubgroup } from '../utils/users';
import { getConfig } from '../utils/config';
import { getAvailableGroups } from '../utils/timetable';
import { getMainMenu, getSettingsMenu, getScheduleMenu, getScheduleMainMenu, getDeadlinesMenu, getEventsMenu } from '../utils/menu';

export function setupMenuHandlers(bot: any) {
  // Главное меню
  bot.action('menu:main', async (ctx: Context) => {
    const message = `🏠 Главное меню\n\nВыберите действие:`;
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: [getMainMenu()]
      }
    });
  });

  // Меню расписания (главное)
  bot.action('menu:schedule', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    let message = `📅 Расписание\n\n`;
    if (user && user.group_name) {
      message += `Группа: ${user.group_name}\n`;
      if (user.subgroup !== null && user.subgroup !== undefined) {
        message += `Подгруппа: ${user.subgroup}\n`;
      }
      message += `\nВыберите период:`;
    } else {
      message += `❌ Группа не указана. Сначала выберите группу в настройках.`;
    }
    
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: user && user.group_name ? [getScheduleMainMenu()] : [getSettingsMenu()]
      }
    });
  });

  // Расписание - сегодня
  bot.action('menu:today', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    let user = getUser(userId);
    
    if (!user || !user.group_name) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Группа не указана. Сначала выберите группу в настройках.',
          attachments: [getSettingsMenu()]
        }
      });
      return;
    }
    
    const schedule = getTodaySchedule(user.group_name, user.subgroup);
    const text = formatSchedule(schedule);
    
    await ctx.answerOnCallback({
      message: {
        text: text,
        attachments: [getScheduleMenu()]
      }
    });
  });

  // Расписание - завтра
  bot.action('menu:tomorrow', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    let user = getUser(userId);
    
    if (!user || !user.group_name) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Группа не указана. Сначала выберите группу в настройках.',
          attachments: [getSettingsMenu()]
        }
      });
      return;
    }
    
    const schedule = getTomorrowSchedule(user.group_name, user.subgroup);
    const text = formatSchedule(schedule);
    
    await ctx.answerOnCallback({
      message: {
        text: text,
        attachments: [getScheduleMenu()]
      }
    });
  });

  // Расписание - текущая неделя
  bot.action('menu:current_week', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    let user = getUser(userId);
    
    if (!user || !user.group_name) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Группа не указана. Сначала выберите группу в настройках.',
          attachments: [getSettingsMenu()]
        }
      });
      return;
    }
    
    const weekSchedule = getCurrentWeekSchedule(user.group_name, user.subgroup);
    
    if (weekSchedule.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: '📅 Расписание на текущую неделю не найдено.',
          attachments: [getScheduleMenu()]
        }
      });
      return;
    }
    
    let text = '📅 Расписание на текущую неделю:\n\n';
    
    weekSchedule.forEach(day => {
      if (day.lessons.length > 0) {
        const formatted = formatSchedule(day);
        text += formatted + '\n\n';
      }
    });
    
    await ctx.answerOnCallback({
      message: {
        text: text.trim() || 'Расписание на текущую неделю не найдено.',
        attachments: [getScheduleMenu()]
      }
    });
  });

  // Расписание - следующая неделя
  bot.action('menu:next_week', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    let user = getUser(userId);
    
    if (!user || !user.group_name) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Группа не указана. Сначала выберите группу в настройках.',
          attachments: [getSettingsMenu()]
        }
      });
      return;
    }
    
    const weekSchedule = getNextWeekSchedule(user.group_name, user.subgroup);
    
    if (weekSchedule.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: '📅 Расписание на следующую неделю не найдено.',
          attachments: [getScheduleMenu()]
        }
      });
      return;
    }
    
    let text = '📆 Расписание на следующую неделю:\n\n';
    
    weekSchedule.forEach(day => {
      if (day.lessons.length > 0) {
        const formatted = formatSchedule(day);
        text += formatted + '\n\n';
      }
    });
    
    await ctx.answerOnCallback({
      message: {
        text: text.trim() || 'Расписание на следующую неделю не найдено.',
        attachments: [getScheduleMenu()]
      }
    });
  });

  // События
  bot.action('menu:events', async (ctx: Context) => {
    const events = getUpcomingEvents(7);
    const text = formatEvents(events);
    
    await ctx.answerOnCallback({
      message: {
        text: text,
        attachments: [getEventsMenu()]
      }
    });
  });

  // Дедлайны
  bot.action('menu:deadlines', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    if (!user) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Ошибка получения данных пользователя.',
          attachments: [getMainMenu()]
        }
      });
      return;
    }
    
    const deadlines = getActiveDeadlines(userId);
    const text = formatDeadlines(deadlines);
    
    await ctx.answerOnCallback({
      message: {
        text: text,
        attachments: [getDeadlinesMenu()]
      }
    });
  });

  // Настройки
  bot.action('menu:settings', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    if (!user) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Ошибка получения данных пользователя.',
          attachments: [getMainMenu()]
        }
      });
      return;
    }
    
    let message = `⚙️ Настройки\n\n`;
    message += `👥 Группа: ${user.group_name || 'не указана'}\n`;
    message += `🔢 Подгруппа: ${user.subgroup !== null && user.subgroup !== undefined ? user.subgroup : 'не указана'}\n`;
    message += `🔔 Уведомления: ${user.notifications_enabled ? '✅ Включены' : '❌ Выключены'}\n`;
    message += `📢 Подписка на события: ${user.events_subscribed ? '✅ Включена' : '❌ Выключена'}\n\n`;
    message += `Выберите настройку:`;
    
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: [getSettingsMenu()]
      }
    });
  });

  // Быстрый доступ к группе из настроек
  bot.action('menu:group', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    const availableGroups = getAvailableGroups();
    const config = getConfig();
    const groupsToShow = availableGroups.length > 0 ? availableGroups : config.groups;
    
    const buttons = groupsToShow.map(group => 
      [Keyboard.button.callback(group, `set_group:${group}`)]
    );
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:settings')]);
    
    await ctx.answerOnCallback({
      message: {
        text: `📋 Выберите вашу группу:\n\nТекущая группа: ${user?.group_name || 'не указана'}`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Быстрый доступ к подгруппе
  bot.action('menu:subgroup', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    if (!user || !user.group_name) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Сначала выберите группу.',
          attachments: [getSettingsMenu()]
        }
      });
      return;
    }
    
    await ctx.answerOnCallback({
      message: {
        text: `👥 Выберите подгруппу:\n\nТекущая: ${user.subgroup !== null && user.subgroup !== undefined ? user.subgroup : 'не указана'}\n\nЕсли у вас нет подгрупп, выберите "Общая"`,
        attachments: [
          Keyboard.inlineKeyboard([
            [
              Keyboard.button.callback('Общая', 'set_subgroup:null'),
              Keyboard.button.callback('1', 'set_subgroup:1')
            ],
            [
              Keyboard.button.callback('2', 'set_subgroup:2'),
              Keyboard.button.callback('◀️ Назад', 'menu:settings')
            ]
          ])
        ]
      }
    });
  });

  // Уведомления
  bot.action('menu:notifications', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    if (!user) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Ошибка получения данных пользователя.',
          attachments: [getMainMenu()]
        }
      });
      return;
    }
    
    const isEnabled = user.notifications_enabled === 1;
    
    await ctx.answerOnCallback({
      message: {
        text: `🔔 Уведомления о дедлайнах: ${isEnabled ? '✅ Включены' : '❌ Выключены'}\n\nВыберите действие:`,
        attachments: [
          Keyboard.inlineKeyboard([
            [
              Keyboard.button.callback(
                isEnabled ? '❌ Выключить' : '✅ Включить',
                isEnabled ? 'disable_notifications' : 'enable_notifications'
              )
            ],
            [
              Keyboard.button.callback('◀️ Назад', 'menu:settings')
            ]
          ])
        ]
      }
    });
  });

  // Обработчики включения/выключения уведомлений
  bot.action('enable_notifications', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    toggleNotifications(userId, true);
    
    await ctx.answerOnCallback({
      message: {
        text: '✅ Уведомления о дедлайнах включены!',
        attachments: [getSettingsMenu()]
      }
    });
  });

  bot.action('disable_notifications', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    toggleNotifications(userId, false);
    
    await ctx.answerOnCallback({
      message: {
        text: '❌ Уведомления о дедлайнах выключены.',
        attachments: [getSettingsMenu()]
      }
    });
  });

  // Подписка на события
  bot.action('menu:events_subscribe', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    if (!user) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Ошибка получения данных пользователя.',
          attachments: [getMainMenu()]
        }
      });
      return;
    }
    
    const isSubscribed = user.events_subscribed === 1;
    
    await ctx.answerOnCallback({
      message: {
        text: `🔔 Подписка на уведомления о мероприятиях: ${isSubscribed ? '✅ Включена' : '❌ Выключена'}\n\nВыберите действие:`,
        attachments: [
          Keyboard.inlineKeyboard([
            [
              Keyboard.button.callback(
                isSubscribed ? '❌ Отписаться' : '✅ Подписаться',
                isSubscribed ? 'unsubscribe_events' : 'subscribe_events'
              )
            ],
            [
              Keyboard.button.callback('◀️ Назад', 'menu:settings')
            ]
          ])
        ]
      }
    });
  });

  // Обработчики подписки на события (используются и из events.ts)
  bot.action('subscribe_events', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    toggleEventsSubscription(userId, true);
    
    await ctx.answerOnCallback({
      message: {
        text: '✅ Вы подписались на уведомления о мероприятиях!',
        attachments: [getSettingsMenu()]
      }
    });
  });

  bot.action('unsubscribe_events', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    toggleEventsSubscription(userId, false);
    
    await ctx.answerOnCallback({
      message: {
        text: '❌ Вы отписались от уведомлений о мероприятиях.',
        attachments: [getSettingsMenu()]
      }
    });
  });

  // Добавить дедлайн
  bot.action('menu:add_deadline', async (ctx: Context) => {
    await ctx.answerOnCallback({
      message: {
        text: '➕ Добавление дедлайна\n\nИспользуйте команду:\n/adddeadline <название> <дата>\n\nПример:\n/adddeadline РГР по ТРПО 20.11.2024',
        attachments: [getDeadlinesMenu()]
      }
    });
  });

  // Помощь
  bot.action('menu:help', async (ctx: Context) => {
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
      `💡 Совет: Используйте кнопки меню для быстрого доступа!`;
    
    await ctx.answerOnCallback({
      message: {
        text: helpText,
        attachments: [getMainMenu()]
      }
    });
  });
}

