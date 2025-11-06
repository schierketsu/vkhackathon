import { Context, Keyboard } from '@maxhub/max-bot-api';
import { 
  addDeadline, 
  getActiveDeadlines, 
  formatDeadlines,
  deleteDeadline 
} from '../utils/deadlines';
import { getUser, createUser, toggleNotifications } from '../utils/users';
import { getDeadlinesMenu, getMainMenu } from '../utils/menu';

export function setupDeadlinesHandlers(bot: any) {
  // Команда /дедлайны
  bot.command('дедлайны', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const deadlines = getActiveDeadlines(userId);
    const text = formatDeadlines(deadlines);
    
    await ctx.reply(text, {
      attachments: [getDeadlinesMenu()]
    });
  });

  // Команда /новыйдедлайн
  bot.command('новыйдедлайн', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const messageText = ctx.message?.body?.text || '';
    const parts = messageText.split(' ').slice(1);
    
    if (parts.length < 2) {
      return ctx.reply(
        '❌ Неверный формат команды.\n\n' +
        'Использование: /новыйдедлайн <название> <дата>\n\n' +
        'Пример: /новыйдедлайн РГР по ТРПО 20.11.2024\n' +
        'Или: /новыйдедлайн "Курсовая работа" 15.12.2024'
      );
    }
    
    // Пытаемся найти дату в формате DD.MM.YYYY или DD.MM
    let dateStr = '';
    let titleParts: string[] = [];
    
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      // Проверяем формат даты
      if (/^\d{1,2}\.\d{1,2}(\.\d{4})?$/.test(part)) {
        dateStr = part;
        titleParts = parts.slice(0, i);
        break;
      }
    }
    
    if (!dateStr) {
      return ctx.reply(
        '❌ Дата не найдена. Используйте формат: DD.MM.YYYY или DD.MM\n\n' +
        'Пример: /новыйдедлайн РГР по ТРПО 20.11.2024'
      );
    }
    
    // Если год не указан, добавляем текущий или следующий
    if (!dateStr.includes('.2024') && !dateStr.includes('.2025')) {
      const currentYear = new Date().getFullYear();
      dateStr = `${dateStr}.${currentYear}`;
    }
    
    const title = titleParts.join(' ') || 'Дедлайн';
    
    try {
      addDeadline(userId, title, dateStr);
      await ctx.reply(`✅ Дедлайн добавлен:\n\n"${title}" — ${dateStr}`);
    } catch (error) {
      await ctx.reply('❌ Ошибка при добавлении дедлайна. Попробуйте еще раз.');
    }
  });

  // Команда /уведомления
  bot.command('уведомления', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const isEnabled = user.notifications_enabled === 1;
    
    await ctx.reply(
      `⏰ Уведомления о дедлайнах: ${isEnabled ? '✅ Включены' : '❌ Выключены'}\n\n` +
      'Выберите действие:',
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [
              Keyboard.button.callback(
                isEnabled ? '❌ Выключить' : '✅ Включить',
                isEnabled ? 'disable_notifications' : 'enable_notifications'
              )
            ]
          ])
        ]
      }
    );
  });

  // Обработчик включения уведомлений
  bot.action('enable_notifications', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    toggleNotifications(userId, true);
    
    await ctx.answerOnCallback({
      message: {
        text: '✅ Уведомления о дедлайнах включены!',
        attachments: []
      }
    });
  });

  // Обработчик выключения уведомлений
  bot.action('disable_notifications', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    toggleNotifications(userId, false);
    
    await ctx.answerOnCallback({
      message: {
        text: '❌ Уведомления о дедлайнах выключены.',
        attachments: []
      }
    });
  });
}

