import { Context, Keyboard } from '@maxhub/max-bot-api';
import { 
  getTodaySchedule, 
  getTomorrowSchedule, 
  getCurrentWeekSchedule, 
  getNextWeekSchedule, 
  formatSchedule,
  getAvailableFaculties,
  getAvailableInstitutions,
  getStudyFormatsForFaculty,
  getDegreesForFacultyAndFormat,
  getGroupsForFacultyFormatDegree,
  getAvailableSubgroups
} from '../utils/timetable';
import { getUpcomingEvents, formatEvents } from '../utils/events';
import { getActiveDeadlines, formatDeadlines } from '../utils/deadlines';
import { getUser, toggleNotifications, toggleEventsSubscription, updateUserGroup, updateUserSubgroup, updateUserInstitution } from '../utils/users';
import { getConfig } from '../utils/config';
import { getMainMenu, getSettingsMenu, getScheduleMenu, getScheduleMainMenu, getDeadlinesMenu, getEventsMenu } from '../utils/menu';
import { formatFacultyName } from '../utils/formatters';

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

  // Открыть приложение
  bot.action('menu:open_app', async (ctx: Context) => {
    const appUrl = 'http://localhost:3000/';
    const message = `📱 Мини-приложение\n\n` +
      `🔗 Ссылка для открытия:\n` +
      `${appUrl}\n\n` +
      `💡 Скопируйте ссылку выше и откройте в браузере.\n\n` +
      `⚠️ Убедитесь, что мини-приложение запущено:\n` +
      `cd miniapp\n` +
      `npm run dev`;
    
    await ctx.reply(message, {
      attachments: [getMainMenu()]
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

  // Мероприятия
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

  // Преподаватели - обработчик перенесен в teachers.ts

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
    message += `🏫 Учебное заведение: ${user.institution_name || 'не указано'}\n`;
    message += `👥 Группа: ${user.group_name || 'не указана'}\n`;
    message += `🔢 Подгруппа: ${user.subgroup !== null && user.subgroup !== undefined ? user.subgroup : 'не указана'}\n`;
    message += `🔔 Уведомления: ${user.notifications_enabled ? '✅ Включены' : '❌ Выключены'}\n`;
    message += `📢 Подписка на мероприятия: ${user.events_subscribed ? '✅ Включена' : '❌ Выключена'}\n\n`;
    message += `Выберите настройку:`;
    
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: [getSettingsMenu()]
      }
    });
  });

  // Быстрый доступ к выбору учебного заведения из настроек
  bot.action('menu:institution', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    const institutions = getAvailableInstitutions();
    
    if (institutions.length === 0) {
      return ctx.answerOnCallback({
        message: {
          text: '❌ Учебные заведения не найдены в расписании.',
          attachments: [getSettingsMenu()]
        }
      });
    }
    
    const buttons = institutions.map(inst => 
      [Keyboard.button.callback(inst, `select_institution_settings:${encodeURIComponent(inst)}`)]
    );
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:settings')]);
    
    await ctx.answerOnCallback({
      message: {
        text: `🏫 Выберите учебное заведение:\n\nТекущее: ${user?.institution_name || 'не указано'}`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Обработчик выбора учебного заведения из настроек
  bot.action(/select_institution_settings:(.+)/, async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const institutionName = decodeURIComponent(ctx.match?.[1] || '');
    
    if (!institutionName) {
      return ctx.answerOnCallback({
        notification: 'Ошибка при выборе учебного заведения'
      });
    }
    
    updateUserInstitution(userId, institutionName);
    
    await ctx.answerOnCallback({
      message: {
        text: `✅ Учебное заведение изменено на ${institutionName}`,
        attachments: [getSettingsMenu()]
      }
    });
  });

  // Быстрый доступ к группе из настроек - начинаем с выбора факультета
  bot.action('menu:group', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const user = getUser(userId);
    
    // Если учебное заведение указано, показываем факультеты только для этого заведения
    // Иначе показываем все факультеты
    const faculties = user?.institution_name 
      ? getAvailableFaculties(user.institution_name)
      : getAvailableFaculties();
    
    if (faculties.length === 0) {
      return ctx.answerOnCallback({
        message: {
          text: '❌ Факультеты не найдены в расписании. Попробуйте выбрать учебное заведение.',
          attachments: [getSettingsMenu()]
        }
      });
    }
    
    const buttons = faculties.map(faculty => 
      [Keyboard.button.callback(formatFacultyName(faculty), `select_faculty:${faculty}`)]
    );
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:settings')]);
    
    let message = `📋 Выберите факультет:\n\n`;
    if (user?.institution_name) {
      message += `Учебное заведение: ${user.institution_name}\n`;
    }
    message += `Текущая группа: ${user?.group_name || 'не указана'}`;
    
    await ctx.answerOnCallback({
      message: {
        text: message,
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
    
    // Получаем доступные подгруппы для группы
    const subgroups = getAvailableSubgroups(user.group_name);
    
    const buttons: any[][] = [];
    
    // Если есть подгруппы в расписании, показываем их
    if (subgroups.length > 0) {
      for (let i = 0; i < subgroups.length; i += 2) {
        const row = subgroups.slice(i, i + 2).map(sub => 
          Keyboard.button.callback(`Подгруппа ${sub}`, `set_subgroup:${sub}`)
        );
        buttons.push(row);
      }
    }
    
    // Всегда добавляем опцию "Общая"
    buttons.push([Keyboard.button.callback('Общая (без подгруппы)', 'set_subgroup:null')]);
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:settings')]);
    
    await ctx.answerOnCallback({
      message: {
        text: `👥 Выберите подгруппу:\n\nТекущая: ${user.subgroup !== null && user.subgroup !== undefined ? user.subgroup : 'не указана'}\nГруппа: ${user.group_name}\n\nЕсли у вас нет подгрупп, выберите "Общая"`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
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
        text: '➕ Добавление дедлайна\n\nИспользуйте команду:\n/новыйдедлайн <название> <дата>\n\nПример:\n/новыйдедлайн РГР по ТРПО 20.11.2024',
        attachments: [getDeadlinesMenu()]
      }
    });
  });

  // Помощь
  bot.action('menu:help', async (ctx: Context) => {
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
    
    await ctx.answerOnCallback({
      message: {
        text: helpText,
        attachments: [getMainMenu()]
      }
    });
  });
}

