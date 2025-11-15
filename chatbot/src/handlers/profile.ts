import { Context, Keyboard } from '@maxhub/max-bot-api';
import { getUser } from '../utils/users';
import { getMainMenu } from '../utils/menu';
import { getActiveDeadlines } from '../utils/deadlines';
import { getUserPracticeApplications } from '../utils/practice';
import { getFavoriteTeachers } from '../utils/teachers';

export function setupProfileHandlers(bot: any) {
  // Профиль пользователя
  bot.action('menu:profile', async (ctx: Context) => {
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

    const userName = (ctx.user as any).name || 'Пользователь';
    
    // Получаем статистику
    const deadlines = getActiveDeadlines(userId);
    const applications = getUserPracticeApplications(userId);
    const favoriteTeachers = getFavoriteTeachers(userId);

    let text = `👤 Профиль\n\n`;
    text += `Имя: ${userName}\n`;
    text += `🏫 Учебное заведение: ${user.institution_name || 'не указано'}\n`;
    text += `👥 Группа: ${user.group_name || 'не указана'}\n`;
    
    if (user.subgroup !== null && user.subgroup !== undefined) {
      text += `🔢 Подгруппа: ${user.subgroup}\n`;
    }
    
    text += `\n📊 Статистика:\n`;
    text += `⏰ Активных дедлайнов: ${deadlines.length}\n`;
    text += `💼 Заявок на практику: ${applications.length}\n`;
    text += `⭐ Избранных преподавателей: ${favoriteTeachers.length}\n`;
    
    text += `\n⚙️ Настройки:\n`;
    text += `🔔 Уведомления: ${user.notifications_enabled ? '✅ Включены' : '❌ Выключены'}\n`;
    text += `📢 Подписка на мероприятия: ${user.events_subscribed ? '✅ Включена' : '❌ Выключена'}\n`;
    text += `⏰ Будильник к первой паре: ${user.morning_alarm_enabled !== 0 ? '✅ Включен' : '❌ Выключен'}\n`;

    await ctx.answerOnCallback({
      message: {
        text,
        attachments: [Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⚙️ Настройки', 'menu:settings')],
          [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
        ])]
      }
    });
  });
  
  // Обработчик "Будильник к первой паре" перенесен в handlers/menu.ts
}

