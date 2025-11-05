import { Context, Keyboard } from '@maxhub/max-bot-api';
import { getUpcomingEvents, formatEvents } from '../utils/events';
import { getUser, createUser, toggleEventsSubscription } from '../utils/users';
import { getEventsMenu, getMainMenu } from '../utils/menu';

export function setupEventsHandlers(bot: any) {
  // Команда /events
  bot.command('events', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const events = getUpcomingEvents(7);
    const text = formatEvents(events);
    
    await ctx.reply(text, {
      attachments: [getEventsMenu()]
    });
  });

  // Команда /subscribe
  bot.command('subscribe', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const isSubscribed = user.events_subscribed === 1;
    
    await ctx.reply(
      `🔔 Подписка на уведомления о мероприятиях: ${isSubscribed ? '✅ Включена' : '❌ Выключена'}\n\n` +
      'Выберите действие:',
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [
              Keyboard.button.callback(
                isSubscribed ? '❌ Отписаться' : '✅ Подписаться',
                isSubscribed ? 'unsubscribe_events' : 'subscribe_events'
              )
            ]
          ])
        ]
      }
    );
  });

  // Обработчик подписки на события
  bot.action('subscribe_events', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    toggleEventsSubscription(userId, true);
    
    await ctx.answerOnCallback({
      message: {
        text: '✅ Вы подписались на уведомления о мероприятиях!',
        attachments: []
      }
    });
  });

  // Обработчик отписки от событий
  bot.action('unsubscribe_events', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    toggleEventsSubscription(userId, false);
    
    await ctx.answerOnCallback({
      message: {
        text: '❌ Вы отписались от уведомлений о мероприятиях.',
        attachments: []
      }
    });
  });
}

