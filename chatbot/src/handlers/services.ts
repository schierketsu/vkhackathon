import { Context, Keyboard } from '@maxhub/max-bot-api';
import { getMainMenu } from '../utils/menu';

export function setupServicesHandlers(bot: any) {
  // Меню услуг
  bot.action('menu:services', async (ctx: Context) => {
    const text = `🛠️ Услуги\n\nДоступные сервисы:\n\n` +
      `📅 Расписание - просмотр расписания занятий\n` +
      `🎉 Мероприятия - календарь событий\n` +
      `👨‍🏫 Преподаватели - поиск и расписание преподавателей\n` +
      `⏰ Дедлайны - управление дедлайнами и уведомлениями\n` +
      `💼 Практика - поиск компаний для практики\n` +
      `💬 Поддержка - чат с психологом\n` +
      `👤 Профиль - информация о пользователе\n\n` +
      `Выберите нужный сервис:`;

    await ctx.answerOnCallback({
      message: {
        text,
        attachments: [Keyboard.inlineKeyboard([
          [
            Keyboard.button.callback('📅 Расписание', 'menu:schedule'),
            Keyboard.button.callback('👨‍🏫 Преподаватели', 'menu:teachers')
          ],
          [
            Keyboard.button.callback('🎉 Мероприятия', 'menu:events'),
            Keyboard.button.callback('⏰ Дедлайны', 'menu:deadlines')
          ],
          [
            Keyboard.button.callback('💼 Практика', 'menu:practice'),
            Keyboard.button.callback('💬 Поддержка', 'menu:support')
          ],
          [
            Keyboard.button.callback('👤 Профиль', 'menu:profile')
          ],
          [
            Keyboard.button.callback('◀️ Главное меню', 'menu:main')
          ]
        ])]
      }
    });
  });
}

