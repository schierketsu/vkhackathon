import { Context, Keyboard } from '@maxhub/max-bot-api';
import axios from 'axios';
import { getMainMenu } from '../utils/menu';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3002/api';

// Хранилище истории чата для каждого пользователя (в реальном приложении лучше использовать БД)
const chatHistory: { [userId: string]: Array<{ text: string; sender: 'user' | 'ai' }> } = {};

// Флаг активной сессии поддержки для каждого пользователя
const activeSupportSessions: { [userId: string]: boolean } = {};

export function setupSupportHandlers(bot: any) {
  // Команда для активации режима поддержки
  bot.command('поддержка', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    
    // Активируем сессию поддержки
    activeSupportSessions[userId] = true;
    
    // Инициализируем историю, если её нет
    if (!chatHistory[userId]) {
      chatHistory[userId] = [
        {
          text: 'Привет! Я здесь, чтобы поддержать тебя. Понимаю, что учеба и жизнь студента могут быть непростыми. Расскажи, что у тебя на душе? Я слушаю.',
          sender: 'ai'
        }
      ];
    }

    await ctx.reply(
      '💬 Поддержка\n\nЯ здесь, чтобы помочь тебе. Можешь написать мне о любых переживаниях, вопросах или проблемах.\n\nПросто напиши сообщение, и я отвечу.\n\nИспользуй /выход для завершения сессии поддержки.',
      {
        attachments: [Keyboard.inlineKeyboard([
          [Keyboard.button.callback('🔄 Начать заново', 'support:reset')],
          [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
        ])]
      }
    );
  });

  // Команда для выхода из режима поддержки
  bot.command('выход', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    
    activeSupportSessions[userId] = false;
    
    await ctx.reply('✅ Режим поддержки завершен. Используй /поддержка, чтобы начать новый разговор.', {
      attachments: [getMainMenu()]
    });
  });
  // Главное меню поддержки
  bot.action('menu:support', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();

    console.log(`[Support] Активация сессии поддержки для пользователя ${userId}`);

    // Активируем сессию поддержки
    activeSupportSessions[userId] = true;

    // Инициализируем историю, если её нет
    if (!chatHistory[userId]) {
      chatHistory[userId] = [
        {
          text: 'Привет! Я здесь, чтобы поддержать тебя. Понимаю, что учеба и жизнь студента могут быть непростыми. Расскажи, что у тебя на душе? Я слушаю.',
          sender: 'ai'
        }
      ];
    }

    console.log(`[Support] Сессия поддержки активирована для пользователя ${userId}`);

    await ctx.answerOnCallback({
      message: {
        text: '💬 Поддержка\n\nЯ здесь, чтобы помочь тебе. Можешь написать мне о любых переживаниях, вопросах или проблемах.\n\nПросто напиши сообщение, и я отвечу.\n\nИспользуй /выход для завершения сессии поддержки.',
        attachments: [Keyboard.inlineKeyboard([
          [Keyboard.button.callback('🔄 Начать заново', 'support:reset')],
          [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
        ])]
      }
    });
  });

  // Сброс истории чата
  bot.action('support:reset', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();

    chatHistory[userId] = [
      {
        text: 'Привет! Я здесь, чтобы поддержать тебя. Понимаю, что учеба и жизнь студента могут быть непростыми. Расскажи, что у тебя на душе? Я слушаю.',
        sender: 'ai'
      }
    ];

    // Активируем сессию поддержки
    activeSupportSessions[userId] = true;

    await ctx.answerOnCallback({
      message: {
        text: '✅ История чата очищена. Можешь начать новый разговор.\n\nИспользуй /выход для завершения сессии поддержки.',
        attachments: [Keyboard.inlineKeyboard([
          [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
        ])]
      }
    });
  });

  // Обработка текстовых сообщений для поддержки
  // Важно: этот обработчик должен регистрироваться ДО других обработчиков message_created
  bot.on('message_created', async (ctx: Context, next: () => Promise<void>) => {
    try {
      if (!ctx.user || !ctx.message) {
        return next();
      }

      // Получаем текст сообщения правильно для MAX API
      const messageText = ctx.message.body.text;
      
      // Пропускаем, если нет текста или это команда
      if (!messageText || messageText.startsWith('/')) {
        return next();
      }

      const userId = ctx.user.user_id.toString();
      
      // Проверяем, активна ли сессия поддержки
      if (!activeSupportSessions[userId]) {
        // Не обрабатываем, если сессия не активна - передаем управление другим обработчикам
        return next();
      }

      console.log(`[Support] Обработка сообщения от пользователя ${userId}: "${messageText}"`);
      
      // Обрабатываем сообщение для поддержки
      await handleSupportMessage(ctx, messageText, userId);
      // Не вызываем next(), чтобы другие обработчики не обрабатывали это сообщение
    } catch (error) {
      console.error('[Support] Ошибка в обработчике поддержки:', error);
      // В случае ошибки передаем управление дальше
      return next();
    }
  });

  // Функция обработки сообщения поддержки
  async function handleSupportMessage(ctx: Context, messageText: string, userId: string) {
    try {
      
      // Инициализируем историю, если её нет
      if (!chatHistory[userId]) {
        chatHistory[userId] = [
          {
            text: 'Привет! Я здесь, чтобы поддержать тебя. Понимаю, что учеба и жизнь студента могут быть непростыми. Расскажи, что у тебя на душе? Я слушаю.',
            sender: 'ai'
          }
        ];
      }

      // Добавляем сообщение пользователя в историю
      chatHistory[userId].push({
        text: messageText,
        sender: 'user'
      });

      // Отправляем запрос к API поддержки
      try {
        console.log(`[Support] Отправка запроса к API: ${API_BASE_URL}/support/chat`);
        console.log(`[Support] История сообщений:`, chatHistory[userId].length, 'сообщений');
        
        const response = await axios.post(
          `${API_BASE_URL}/support/chat`,
          {
            messages: chatHistory[userId]
          },
          {
            timeout: 30000
          }
        );

        const aiResponse = response.data.text || 'Извините, не удалось получить ответ. Попробуйте еще раз.';
        
        console.log(`[Support] Получен ответ от API:`, aiResponse.substring(0, 100) + '...');
        
        // Добавляем ответ ИИ в историю
        chatHistory[userId].push({
          text: aiResponse,
          sender: 'ai'
        });

        // Ограничиваем историю последними 20 сообщениями
        if (chatHistory[userId].length > 20) {
          chatHistory[userId] = chatHistory[userId].slice(-20);
        }

        await ctx.reply(aiResponse, {
          attachments: [Keyboard.inlineKeyboard([
            [Keyboard.button.callback('🔄 Начать заново', 'support:reset')],
            [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
          ])]
        });
      } catch (error: any) {
        console.error('[Support] Ошибка запроса к API поддержки:', error.message);
        if (error.response) {
          console.error('[Support] Ответ сервера:', error.response.status, error.response.data);
        }
        
        // Fallback ответ
        const fallbackResponse = 'Понимаю, что тебе непросто. Спасибо, что поделился со мной - это уже важный шаг. Расскажи, что именно тебя беспокоит больше всего?';
        
        chatHistory[userId].push({
          text: fallbackResponse,
          sender: 'ai'
        });

        await ctx.reply(
          fallbackResponse + '\n\n⚠️ Примечание: Связь с сервером поддержки временно недоступна. Ответ может быть неполным.',
          {
            attachments: [Keyboard.inlineKeyboard([
              [Keyboard.button.callback('🔄 Начать заново', 'support:reset')],
              [Keyboard.button.callback('◀️ Главное меню', 'menu:main')]
            ])]
          }
        );
      }
    } catch (error) {
      console.error('[Support] Ошибка в обработчике поддержки:', error);
    }
  }
}

