import { Context, Keyboard } from '@maxhub/max-bot-api';
import { 
  addDeadline, 
  getActiveDeadlines, 
  formatDeadlines,
  deleteDeadline 
} from '../utils/deadlines';
import { getUser, createUser, toggleNotifications, setUserState } from '../utils/users';
import { getDeadlinesMenu, getMainMenu } from '../utils/menu';
import { syncDeadlinesToMiniapp } from '../utils/max-bridge';

// Парсинг текста дедлайна (название и дата)
function parseDeadlineText(text: string): { title: string; date: string } | null {
  // Пытаемся найти дату в формате DD.MM.YYYY или DD.MM
  const datePattern = /\b(\d{1,2}\.\d{1,2}(?:\.\d{4})?)\b/;
  const match = text.match(datePattern);
  
  if (!match) {
    return null;
  }
  
  let dateStr = match[1];
  
  // Если год не указан, добавляем текущий или следующий
  if (!dateStr.includes('.2024') && !dateStr.includes('.2025') && !dateStr.includes('.2026')) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const dateParts = dateStr.split('.');
    const month = parseInt(dateParts[1]);
    
    // Если месяц уже прошел в этом году, берем следующий год
    if (month < currentMonth) {
      dateStr = `${dateStr}.${currentYear + 1}`;
    } else {
      dateStr = `${dateStr}.${currentYear}`;
    }
  }
  
  // Извлекаем название (все кроме даты)
  const title = text.replace(datePattern, '').trim();
  
  if (!title) {
    return null;
  }
  
  return { title, date: dateStr };
}

export function setupDeadlinesHandlers(bot: any) {
  // Команда /дедлайны
  bot.command('дедлайны', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    // Сбрасываем состояние при открытии меню
    setUserState(userId, null);
    
    const deadlines = getActiveDeadlines(userId);
    const text = formatDeadlines(deadlines);
    
    await ctx.reply(text, {
      attachments: [getDeadlinesMenu()]
    });
  });

  // Обработчик кнопки "Добавить" дедлайн
  bot.action('menu:add_deadline', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    
    // Устанавливаем состояние ожидания ввода дедлайна
    setUserState(userId, 'waiting_deadline');
    
    await ctx.answerOnCallback({
      message: {
        text: '➕ Добавление дедлайна\n\nВведите название и дату дедлайна в произвольном формате.\n\nПримеры:\n• РГР по ТРПО 20.11.2024\n• Курсовая работа 15.12.2024\n• Контрольная 10.11',
        attachments: [Keyboard.inlineKeyboard([
          [Keyboard.button.callback('❌ Отмена', 'menu:deadlines')]
        ])]
      }
    });
  });

  // Команда /новыйдедлайн (оставляем для обратной совместимости)
  bot.command('новыйдедлайн', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const messageText = ctx.message?.body?.text || '';
    const parts = messageText.split(' ').slice(1).join(' ');
    
    if (!parts) {
      return ctx.reply(
        '❌ Укажите название и дату дедлайна.\n\n' +
        'Пример: /новыйдедлайн РГР по ТРПО 20.11.2024'
      );
    }
    
    const parsed = parseDeadlineText(parts);
    
    if (!parsed) {
      return ctx.reply(
        '❌ Не удалось распознать дату. Используйте формат: DD.MM.YYYY или DD.MM\n\n' +
        'Пример: /новыйдедлайн РГР по ТРПО 20.11.2024'
      );
    }
    
    try {
      addDeadline(userId, parsed.title, parsed.date);
      
      // Синхронизация с мини-приложением
      await syncDeadlinesToMiniapp(userId);
      
      await ctx.reply(`✅ Дедлайн добавлен:\n\n"${parsed.title}" — ${parsed.date}`, {
        attachments: [getDeadlinesMenu()]
      });
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

