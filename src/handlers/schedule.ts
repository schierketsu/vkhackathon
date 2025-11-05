import { Context, Keyboard } from '@maxhub/max-bot-api';
import { getTodaySchedule, getTomorrowSchedule, getCurrentWeekSchedule, formatSchedule, getAvailableGroups } from '../utils/timetable';
import { getUser, createUser, updateUserGroup, updateUserSubgroup } from '../utils/users';
import { getConfig } from '../utils/config';
import { getScheduleMenu, getMainMenu, getSettingsMenu } from '../utils/menu';

export function setupScheduleHandlers(bot: any) {
  const config = getConfig();

  // Команда /today
  bot.command('today', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    if (!user.group_name) {
      return ctx.reply(
        '❌ Группа не указана. Используйте команду /group для выбора группы.',
        {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.callback('📋 Выбрать группу', 'select_group')]
            ])
          ]
        }
      );
    }
    
    const schedule = getTodaySchedule(user.group_name, user.subgroup);
    const text = formatSchedule(schedule);
    
    await ctx.reply(text, {
      attachments: [getScheduleMenu()]
    });
  });

  // Команда /tomorrow
  bot.command('tomorrow', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    if (!user.group_name) {
      return ctx.reply(
        '❌ Группа не указана. Используйте команду /group для выбора группы.'
      );
    }
    
    const schedule = getTomorrowSchedule(user.group_name, user.subgroup);
    const text = formatSchedule(schedule);
    
    await ctx.reply(text, {
      attachments: [getScheduleMenu()]
    });
  });

  // Команда /week
  bot.command('week', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    if (!user.group_name) {
      return ctx.reply(
        '❌ Группа не указана. Используйте команду /group для выбора группы.'
      );
    }
    
    const weekSchedule = getCurrentWeekSchedule(user.group_name, user.subgroup);
    
    if (weekSchedule.length === 0) {
      return ctx.reply('📅 Расписание на текущую неделю не найдено.');
    }
    
    let text = '📅 Расписание на текущую неделю:\n\n';
    
    weekSchedule.forEach(day => {
      if (day.lessons.length > 0) {
        const formatted = formatSchedule(day);
        text += formatted + '\n\n';
      }
    });
    
    await ctx.reply(text.trim() || 'Расписание на текущую неделю не найдено.', {
      attachments: [getScheduleMenu()]
    });
  });

  // Команда /group
  bot.command('group', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    // Получаем доступные группы из расписания
    const availableGroups = getAvailableGroups();
    const groupsToShow = availableGroups.length > 0 ? availableGroups : config.groups;
    
    const buttons = groupsToShow.map(group => 
      [Keyboard.button.callback(group, `set_group:${group}`)]
    );
    
    let message = `📋 Выберите вашу группу:\n\n`;
    message += `Текущая группа: ${user.group_name || 'не указана'}\n`;
    message += `Текущая подгруппа: ${user.subgroup !== null && user.subgroup !== undefined ? user.subgroup : 'не указана'}`;
    
    await ctx.reply(message, {
      attachments: [Keyboard.inlineKeyboard(buttons)]
    });
  });

  // Команда /subgroup
  bot.command('subgroup', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    if (!user.group_name) {
      return ctx.reply(
        '❌ Сначала выберите группу командой /group'
      );
    }
    
    await ctx.reply(
      `👥 Выберите подгруппу:\n\nТекущая: ${user.subgroup !== null && user.subgroup !== undefined ? user.subgroup : 'не указана'}\n\nЕсли у вас нет подгрупп, выберите "Общая"`,
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [
              Keyboard.button.callback('Общая', 'set_subgroup:null'),
              Keyboard.button.callback('1', 'set_subgroup:1')
            ],
            [Keyboard.button.callback('2', 'set_subgroup:2')]
          ])
        ]
      }
    );
  });

  // Обработчик callback для выбора группы
  bot.action(/set_group:(.+)/, async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    const groupName = ctx.match?.[1];
    
    if (!groupName) {
      return ctx.answerOnCallback({
        notification: 'Ошибка при выборе группы'
      });
    }
    
    updateUserGroup(userId, groupName, null);
    
    await ctx.answerOnCallback({
      message: {
        text: `✅ Группа изменена на ${groupName}\n\nТеперь выберите подгруппу в настройках.`,
        attachments: [getSettingsMenu()]
      }
    });
  });

  // Обработчик callback для выбора подгруппы
  bot.action(/set_subgroup:(.+)/, async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    const subgroupStr = ctx.match?.[1];
    
    let subgroup: number | null = null;
    if (subgroupStr !== 'null') {
      subgroup = parseInt(subgroupStr || '');
      if (isNaN(subgroup)) {
        return ctx.answerOnCallback({
          notification: 'Ошибка при выборе подгруппы'
        });
      }
    }
    
    updateUserSubgroup(userId, subgroup);
    
    const subgroupText = subgroup === null ? 'Общая' : subgroup.toString();
    await ctx.answerOnCallback({
      message: {
        text: `✅ Подгруппа изменена на ${subgroupText}`,
        attachments: [getSettingsMenu()]
      }
    });
  });

  // Обработчик callback для выбора группы из /today
  bot.action('select_group', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const availableGroups = getAvailableGroups();
    const groupsToShow = availableGroups.length > 0 ? availableGroups : config.groups;
    
    const buttons = groupsToShow.map(group => 
      [Keyboard.button.callback(group, `set_group:${group}`)]
    );
    
    await ctx.answerOnCallback({
      message: {
        text: `📋 Выберите вашу группу:\n\nТекущая группа: ${user.group_name || 'не указана'}`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });
}
