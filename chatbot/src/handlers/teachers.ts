import { Context, Keyboard } from '@maxhub/max-bot-api';
import {
  getAllTeachers,
  searchTeachers,
  getTeacherScheduleForDate,
  getTeacherWeekSchedule,
  formatTeacherSchedule,
  getFavoriteTeachers,
  addFavoriteTeacher,
  removeFavoriteTeacher,
  isFavoriteTeacher
} from '../utils/teachers';
import { getTeachersMenu, getTeacherScheduleMenu, getTeacherSearchMenu } from '../utils/menu';
import { getMainMenu } from '../utils/menu';
import { setUserState, getUser } from '../utils/users';

export function setupTeachersHandlers(bot: any) {
  // Команда поиска преподавателя - обрабатывается напрямую в message_created
  // (аналогично модулю поддержки)
  bot.on('message_created', async (ctx: Context, next: () => Promise<void>) => {
    try {
      if (!ctx.user || !ctx.message) {
        return next();
      }

      const userId = ctx.user.user_id.toString();
      const user = getUser(userId);
      const messageText = ctx.message.body.text;

      // Пропускаем, если нет текста или это не команда /поиск
      if (!messageText || !messageText.startsWith('/поиск')) {
        return next();
      }

      console.log('🔍 [Teachers] Команда /поиск обнаружена в message_created');
      console.log('📝 [Teachers] Полный текст:', messageText);

      // Извлекаем запрос из команды
      const query = messageText.replace(/^\/поиск\s*/, '').trim();

      console.log('🔎 [Teachers] Извлеченный запрос:', query);

      // Если параметры не указаны, переводим в интерактивный режим
      if (!query) {
        setUserState(userId, 'waiting_teacher_search');
        await ctx.reply(
          '🔍 Поиск преподавателя\n\nВведите имя или фамилию преподавателя для поиска.\n\nПримеры:\n• Иванов\n• Ржавин\n• Петрова',
          {
            attachments: [Keyboard.inlineKeyboard([
              [Keyboard.button.callback('❌ Отмена', 'menu:teachers')]
            ])]
          }
        );
        return; // Не вызываем next(), чтобы команда не обрабатывалась дальше
      }

      // Если параметры указаны, выполняем поиск сразу
      const allTeachers = getAllTeachers();
      console.log('📊 [Teachers] Всего преподавателей в базе:', allTeachers.length);

      const results = searchTeachers(query);
      console.log('✅ [Teachers] Найдено преподавателей:', results.length);

      if (results.length === 0) {
        await ctx.reply(
          `❌ Преподаватели по запросу "${query}" не найдены.\n\n` +
          `Попробуйте ввести фамилию преподавателя, например:\n` +
          `• Иванов\n` +
          `• Андреева`,
          { attachments: [getTeacherSearchMenu()] }
        );
        return; // Не вызываем next()
      }

      // Если найден один преподаватель, показываем его расписание
      if (results.length === 1) {
        const teacherName = results[0];
        const today = new Date();
        const schedule = getTeacherScheduleForDate(teacherName, today);
        const text = formatTeacherSchedule(schedule);
        const favorite = isFavoriteTeacher(userId, teacherName);

        await ctx.reply(`👨‍🏫 ${teacherName}\n\n${text}`, {
          attachments: [getTeacherScheduleMenu(teacherName, favorite)]
        });
        return; // Не вызываем next()
      }

      // Если найдено несколько, показываем список
      let replyText = `🔍 Найдено преподавателей: ${results.length}\n\n`;
      const buttons: any[][] = [];

      const displayResults = results.slice(0, 20);
      for (let i = 0; i < displayResults.length; i += 2) {
        const row = displayResults.slice(i, i + 2).map(teacher =>
          Keyboard.button.callback(teacher, `teacher:${encodeURIComponent(teacher)}`)
        );
        buttons.push(row);
      }

      if (results.length > 20) {
        replyText += `Показано первых 20 результатов. Уточните запрос.\n\n`;
      }

      buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:teachers')]);

      await ctx.reply(replyText, {
        attachments: [Keyboard.inlineKeyboard(buttons)]
      });
      return; // Не вызываем next()
    } catch (error) {
      console.error('[Teachers] Ошибка в обработчике поиска:', error);
      // В случае ошибки передаем управление дальше
      return next();
    }
  });

  // Обработка интерактивного поиска (когда user_state === 'waiting_teacher_search')
  bot.on('message_created', async (ctx: Context, next: () => Promise<void>) => {
    try {
      if (!ctx.user || !ctx.message) {
        return next();
      }

      const userId = ctx.user.user_id.toString();
      const user = getUser(userId);
      const messageText = ctx.message.body.text;

      // Пропускаем команды
      if (!messageText || messageText.startsWith('/')) {
        return next();
      }

      // Проверяем состояние ожидания поиска преподавателя
      if (!user || user.user_state !== 'waiting_teacher_search') {
        return next();
      }

      console.log('🔍 [Teachers] Интерактивный поиск для пользователя:', userId);
      console.log('📝 [Teachers] Запрос:', messageText);

      const query = messageText.trim();

      if (!query) {
        await ctx.reply(
          '❌ Пустой запрос. Введите имя или фамилию преподавателя для поиска.\n\n' +
          'Примеры:\n• Иванов\n• Ржавин\n• Петрова',
          {
            attachments: [Keyboard.inlineKeyboard([
              [Keyboard.button.callback('❌ Отмена', 'menu:teachers')]
            ])]
          }
        );
        return;
      }

      const allTeachers = getAllTeachers();
      const results = searchTeachers(query);

      setUserState(userId, null);

      if (results.length === 0) {
        await ctx.reply(
          `❌ Преподаватели по запросу "${query}" не найдены.\n\n` +
          `Попробуйте ввести фамилию преподавателя, например:\n` +
          `• Иванов\n` +
          `• Андреева`,
          { attachments: [getTeacherSearchMenu()] }
        );
        return;
      }

      // Если найден один преподаватель, показываем его расписание
      if (results.length === 1) {
        const teacherName = results[0];
        const today = new Date();
        const schedule = getTeacherScheduleForDate(teacherName, today);
        const text = formatTeacherSchedule(schedule);
        const favorite = isFavoriteTeacher(userId, teacherName);

        await ctx.reply(`👨‍🏫 ${teacherName}\n\n${text}`, {
          attachments: [getTeacherScheduleMenu(teacherName, favorite)]
        });
        return;
      }

      // Если найдено несколько, показываем список
      let replyText = `🔍 Найдено преподавателей: ${results.length}\n\n`;
      const buttons: any[][] = [];

      const displayResults = results.slice(0, 20);
      for (let i = 0; i < displayResults.length; i += 2) {
        const row = displayResults.slice(i, i + 2).map(teacher =>
          Keyboard.button.callback(teacher, `teacher:${encodeURIComponent(teacher)}`)
        );
        buttons.push(row);
      }

      if (results.length > 20) {
        replyText += `Показано первых 20 результатов. Уточните запрос.\n\n`;
      }

      buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:teachers')]);

      await ctx.reply(replyText, {
        attachments: [Keyboard.inlineKeyboard(buttons)]
      });
      return;
    } catch (error) {
      console.error('[Teachers] Ошибка в обработчике интерактивного поиска:', error);
      return next();
    }
  });
  // Главное меню преподавателей
  bot.action('menu:teachers', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    
    // Сбрасываем состояние при открытии меню
    setUserState(userId, null);
    
    const favorites = getFavoriteTeachers(userId);
    const allTeachers = getAllTeachers();
    
    let message = `👨‍🏫 Преподаватели\n\n`;
    message += `Всего преподавателей: ${allTeachers.length}\n`;
    if (favorites.length > 0) {
      message += `Избранных: ${favorites.length}\n`;
    }
    message += `\nВыберите действие:`;
    
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: [getTeachersMenu(favorites.length > 0)]
      }
    });
  });

  // Поиск преподавателей
  bot.action('menu:teachers_search', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    
    // Устанавливаем состояние ожидания ввода имени преподавателя
    setUserState(userId, 'waiting_teacher_search');
    
    await ctx.answerOnCallback({
      message: {
        text: '🔍 Поиск преподавателя\n\nВведите имя или фамилию преподавателя для поиска.\n\nПримеры:\n• Иванов\n• Ржавин\n• Петрова',
        attachments: [Keyboard.inlineKeyboard([
          [Keyboard.button.callback('❌ Отмена', 'menu:teachers')]
        ])]
      }
    });
  });

  // Команда поиска преподавателя - регистрируется в bot.ts через обработчик message_created

  // Просмотр расписания преподавателя
  bot.action(/^teacher:(.+)$/, async (ctx: Context) => {
    if (!ctx.user) return;
    const teacherNameEncoded = ctx.match?.[1] || '';
    if (!teacherNameEncoded) return;
    
    let teacherName = teacherNameEncoded;
    try {
      teacherName = decodeURIComponent(teacherName);
    } catch (e) {
      // Если декодирование не удалось, используем исходное значение
    }
    await showTeacherSchedule(ctx, teacherName);
  });

  // Расписание преподавателя - сегодня
  bot.action(/^teacher_schedule:today:(.+)$/, async (ctx: Context) => {
    if (!ctx.user) return;
    const teacherNameEncoded = ctx.match?.[1] || '';
    if (!teacherNameEncoded) return;
    
    const userId = ctx.user.user_id.toString();
    let teacherName = teacherNameEncoded;
    try {
      teacherName = decodeURIComponent(teacherName);
    } catch (e) {
      // Если декодирование не удалось, используем исходное значение
    }
    const isFavorite = isFavoriteTeacher(userId, teacherName);
    const today = new Date();
    const schedule = getTeacherScheduleForDate(teacherName, today);
    const text = formatTeacherSchedule(schedule);
    
    await ctx.answerOnCallback({
      message: {
        text: `👨‍🏫 ${teacherName}\n\n${text}`,
        attachments: [getTeacherScheduleMenu(teacherName, isFavorite)]
      }
    });
  });

  // Расписание преподавателя - завтра
  bot.action(/^teacher_schedule:tomorrow:(.+)$/, async (ctx: Context) => {
    if (!ctx.user) return;
    const teacherNameEncoded = ctx.match?.[1] || '';
    if (!teacherNameEncoded) return;
    
    const userId = ctx.user.user_id.toString();
    let teacherName = teacherNameEncoded;
    try {
      teacherName = decodeURIComponent(teacherName);
    } catch (e) {
      // Если декодирование не удалось, используем исходное значение
    }
    const isFavorite = isFavoriteTeacher(userId, teacherName);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const schedule = getTeacherScheduleForDate(teacherName, tomorrow);
    const text = formatTeacherSchedule(schedule);
    
    await ctx.answerOnCallback({
      message: {
        text: `👨‍🏫 ${teacherName}\n\n${text}`,
        attachments: [getTeacherScheduleMenu(teacherName, isFavorite)]
      }
    });
  });

  // Расписание преподавателя - текущая неделя
  bot.action(/^teacher_schedule:week:(.+)$/, async (ctx: Context) => {
    if (!ctx.user) return;
    const teacherNameEncoded = ctx.match?.[1] || '';
    if (!teacherNameEncoded) return;
    
    const userId = ctx.user.user_id.toString();
    let teacherName = teacherNameEncoded;
    try {
      teacherName = decodeURIComponent(teacherName);
    } catch (e) {
      // Если декодирование не удалось, используем исходное значение
    }
    const isFavorite = isFavoriteTeacher(userId, teacherName);
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysUntilMonday);
    monday.setHours(0, 0, 0, 0);
    
    const weekSchedule = getTeacherWeekSchedule(teacherName, monday);
    
    if (weekSchedule.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: `👨‍🏫 ${teacherName}\n\n📅 Расписание на текущую неделю не найдено.`,
          attachments: [getTeacherScheduleMenu(teacherName)]
        }
      });
      return;
    }
    
    let text = `👨‍🏫 ${teacherName}\n\n📅 Расписание на текущую неделю:\n\n`;
    
    weekSchedule.forEach(day => {
      if (day.lessons.length > 0) {
        const formatted = formatTeacherSchedule(day);
        text += formatted + '\n\n';
      }
    });
    
    await ctx.answerOnCallback({
      message: {
        text: text.trim() || 'Расписание на текущую неделю не найдено.',
        attachments: [getTeacherScheduleMenu(teacherName, isFavorite)]
      }
    });
  });

  // Добавить в избранное
  bot.action(/^teacher_favorite:add:(.+)$/, async (ctx: Context) => {
    if (!ctx.user) return;
    const teacherNameEncoded = ctx.match?.[1] || '';
    if (!teacherNameEncoded) return;
    
    const userId = ctx.user.user_id.toString();
    let teacherName = teacherNameEncoded;
    try {
      teacherName = decodeURIComponent(teacherName);
    } catch (e) {
      // Если декодирование не удалось, используем исходное значение
    }
    
    if (addFavoriteTeacher(userId, teacherName)) {
      await ctx.answerOnCallback({
        message: {
          text: `✅ Преподаватель "${teacherName}" добавлен в избранное!`,
          attachments: [getTeacherScheduleMenu(teacherName, true)]
        }
      });
    } else {
      await ctx.answerOnCallback({
        message: {
          text: `❌ Ошибка при добавлении в избранное.`,
          attachments: [getTeacherScheduleMenu(teacherName, false)]
        }
      });
    }
  });

  // Удалить из избранного
  bot.action(/^teacher_favorite:remove:(.+)$/, async (ctx: Context) => {
    if (!ctx.user) return;
    const teacherNameEncoded = ctx.match?.[1] || '';
    if (!teacherNameEncoded) return;
    
    const userId = ctx.user.user_id.toString();
    let teacherName = teacherNameEncoded;
    try {
      teacherName = decodeURIComponent(teacherName);
    } catch (e) {
      // Если декодирование не удалось, используем исходное значение
    }
    
    if (removeFavoriteTeacher(userId, teacherName)) {
      await ctx.answerOnCallback({
        message: {
          text: `❌ Преподаватель "${teacherName}" удален из избранного.`,
          attachments: [getTeacherScheduleMenu(teacherName, false)]
        }
      });
    } else {
      await ctx.answerOnCallback({
        message: {
          text: `❌ Ошибка при удалении из избранного.`,
          attachments: [getTeacherScheduleMenu(teacherName, true)]
        }
      });
    }
  });

  // Список избранных преподавателей
  bot.action('menu:teachers_favorites', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const favorites = getFavoriteTeachers(userId);
    
    if (favorites.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: '⭐ Избранные преподаватели\n\nУ вас пока нет избранных преподавателей.\n\nИспользуйте поиск, чтобы найти преподавателя и добавить его в избранное.',
          attachments: [getTeachersMenu(false)]
        }
      });
      return;
    }
    
    let message = `⭐ Избранные преподаватели (${favorites.length}):\n\n`;
    const buttons: any[][] = [];
    
    for (let i = 0; i < favorites.length; i += 2) {
      const row = favorites.slice(i, i + 2).map(teacher =>
        Keyboard.button.callback(teacher, `teacher:${encodeURIComponent(teacher)}`)
      );
      buttons.push(row);
    }
    
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:teachers')]);
    
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Список всех преподавателей
  bot.action('menu:teachers_all', async (ctx: Context) => {
    const allTeachers = getAllTeachers();
    
    if (allTeachers.length === 0) {
      await ctx.answerOnCallback({
        message: {
          text: '❌ Преподаватели не найдены в расписании.',
          attachments: [getTeachersMenu(false)]
        }
      });
      return;
    }
    
    let message = `👨‍🏫 Все преподаватели (${allTeachers.length}):\n\n`;
    message += `Используйте поиск для быстрого поиска.\n\n`;
    message += `Показано первых 30 преподавателей:\n\n`;
    
    const buttons: any[][] = [];
    const displayTeachers = allTeachers.slice(0, 30);
    
    for (let i = 0; i < displayTeachers.length; i += 2) {
      const row = displayTeachers.slice(i, i + 2).map(teacher =>
        Keyboard.button.callback(teacher, `teacher:${encodeURIComponent(teacher)}`)
      );
      buttons.push(row);
    }
    
    if (allTeachers.length > 30) {
      buttons.push([Keyboard.button.callback('🔍 Поиск для просмотра всех', 'menu:teachers_search')]);
    }
    
    buttons.push([Keyboard.button.callback('◀️ Назад', 'menu:teachers')]);
    
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Вспомогательная функция для отображения расписания преподавателя
  async function showTeacherSchedule(ctx: Context, teacherName: string) {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    const today = new Date();
    const schedule = getTeacherScheduleForDate(teacherName, today);
    const text = formatTeacherSchedule(schedule);
    const isFavorite = isFavoriteTeacher(userId, teacherName);
    
    await ctx.answerOnCallback({
      message: {
        text: `👨‍🏫 ${teacherName}\n\n${text}`,
        attachments: [getTeacherScheduleMenu(teacherName, isFavorite)]
      }
    });
  }
}

