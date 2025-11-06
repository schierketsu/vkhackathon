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

export function setupTeachersHandlers(bot: any) {
  // Главное меню преподавателей
  bot.action('menu:teachers', async (ctx: Context) => {
    if (!ctx.user) return;
    const userId = ctx.user.user_id.toString();
    
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
    await ctx.answerOnCallback({
      message: {
        text: '🔍 Поиск преподавателя\n\nВведите имя преподавателя для поиска:\n\nИспользуйте команду:\n/поиск <имя>\n\nПример:\n/поиск Иванов',
        attachments: [getTeacherSearchMenu()]
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

