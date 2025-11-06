import { Context, Keyboard } from '@maxhub/max-bot-api';
import { 
  getTodaySchedule, 
  getTomorrowSchedule, 
  getCurrentWeekSchedule, 
  formatSchedule, 
  getAvailableGroups,
  getAvailableFaculties,
  getStudyFormatsForFaculty,
  getDegreesForFacultyAndFormat,
  getCoursesForFacultyFormatDegree,
  getGroupsForFacultyFormatDegreeCourse,
  getGroupsForFacultyFormatDegree,
  getAvailableSubgroups
} from '../utils/timetable';
import { getUser, createUser, updateUserGroup, updateUserSubgroup } from '../utils/users';
import { getConfig } from '../utils/config';
import { getScheduleMenu, getMainMenu, getSettingsMenu } from '../utils/menu';
import { formatFacultyName, formatCourseButton, formatCourseNumber } from '../utils/formatters';

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

  // Команда /group - начинаем с выбора факультета
  bot.command('group', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    // Получаем список факультетов
    const faculties = getAvailableFaculties();
    
    if (faculties.length === 0) {
      return ctx.reply('❌ Факультеты не найдены в расписании.');
    }
    
    const buttons = faculties.map((faculty: string) => 
      [Keyboard.button.callback(formatFacultyName(faculty), `select_faculty:${faculty}`)]
    );
    
    let message = `📋 Выберите факультет:\n\n`;
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

  // Обработчик выбора факультета (используется и в menu.ts)
  bot.action(/select_faculty:(.+)/, async (ctx: Context) => {
    const facultyName = decodeURIComponent(ctx.match?.[1] || '');
    
    if (!facultyName) {
      return ctx.answerOnCallback({
        notification: 'Ошибка при выборе факультета'
      });
    }
    
    // Получаем формы обучения для факультета
    const studyFormats = getStudyFormatsForFaculty(facultyName);
    
    if (studyFormats.length === 0) {
      return ctx.answerOnCallback({
        notification: 'Формы обучения не найдены'
      });
    }
    
    const buttons = studyFormats.map((format: string) => 
      [Keyboard.button.callback(format, `select_format:${encodeURIComponent(facultyName)}:${encodeURIComponent(format)}`)]
    );
    buttons.push([Keyboard.button.callback('◀️ Назад', 'select_group_start')]);
    
    await ctx.answerOnCallback({
      message: {
        text: `📋 Выберите форму обучения:\n\nФакультет: ${formatFacultyName(facultyName)}`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Обработчик выбора формы обучения
  bot.action(/select_format:(.+):(.+)/, async (ctx: Context) => {
    const facultyName = decodeURIComponent(ctx.match?.[1] || '');
    const studyFormat = decodeURIComponent(ctx.match?.[2] || '');
    
    if (!facultyName || !studyFormat) {
      return ctx.answerOnCallback({
        notification: 'Ошибка при выборе формы обучения'
      });
    }
    
    // Получаем степени для факультета и формы обучения
    const degrees = getDegreesForFacultyAndFormat(facultyName, studyFormat);
    
    if (degrees.length === 0) {
      return ctx.answerOnCallback({
        notification: 'Степени не найдены'
      });
    }
    
    const buttons = degrees.map((degree: string) => 
      [Keyboard.button.callback(degree, `select_degree:${encodeURIComponent(facultyName)}:${encodeURIComponent(studyFormat)}:${encodeURIComponent(degree)}`)]
    );
    // Кнопка "Назад" - возвращаем к выбору формы обучения
    buttons.push([Keyboard.button.callback('◀️ Назад', `select_format:${encodeURIComponent(facultyName)}:${encodeURIComponent(studyFormat)}`)]);
    
    await ctx.answerOnCallback({
      message: {
        text: `📋 Выберите степень:\n\nФакультет: ${formatFacultyName(facultyName)}\nФорма обучения: ${studyFormat}`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Обработчик выбора степени
  bot.action(/select_degree:(.+):(.+):(.+)/, async (ctx: Context) => {
    const facultyName = decodeURIComponent(ctx.match?.[1] || '');
    const studyFormat = decodeURIComponent(ctx.match?.[2] || '');
    const degree = decodeURIComponent(ctx.match?.[3] || '');
    
    if (!facultyName || !studyFormat || !degree) {
      return ctx.answerOnCallback({
        notification: 'Ошибка при выборе степени'
      });
    }
    
    // Получаем курсы для факультета, формы обучения и степени
    const courses = getCoursesForFacultyFormatDegree(facultyName, studyFormat, degree);
    
    if (courses.length === 0) {
      return ctx.answerOnCallback({
        notification: 'Курсы не найдены'
      });
    }
    
    const buttons = courses.map((course: number) => 
      [Keyboard.button.callback(formatCourseButton(course), `select_course:${encodeURIComponent(facultyName)}:${encodeURIComponent(studyFormat)}:${encodeURIComponent(degree)}:${course}`)]
    );
    buttons.push([Keyboard.button.callback('◀️ Назад', `select_format:${encodeURIComponent(facultyName)}:${encodeURIComponent(studyFormat)}`)]);

    await ctx.answerOnCallback({
      message: {
        text: `📋 Выберите курс:\n\nФакультет: ${formatFacultyName(facultyName)}\nФорма обучения: ${studyFormat}\nУровень обучения: ${degree}`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Обработчик выбора курса
  bot.action(/select_course:(.+):(.+):(.+):(\d+)/, async (ctx: Context) => {
    const facultyName = decodeURIComponent(ctx.match?.[1] || '');
    const studyFormat = decodeURIComponent(ctx.match?.[2] || '');
    const degree = decodeURIComponent(ctx.match?.[3] || '');
    const course = parseInt(ctx.match?.[4] || '0');
    
    if (!facultyName || !studyFormat || !degree || isNaN(course)) {
      return ctx.answerOnCallback({
        notification: 'Ошибка при выборе курса'
      });
    }
    
    // Получаем группы для факультета, формы обучения, степени и курса
    const groups = getGroupsForFacultyFormatDegreeCourse(facultyName, studyFormat, degree, course);
    
    if (groups.length === 0) {
      return ctx.answerOnCallback({
        notification: 'Группы не найдены'
      });
    }
    
    // Разбиваем группы на кнопки (по 2 в ряд для компактности)
    const buttons: any[][] = [];
    for (let i = 0; i < groups.length; i += 2) {
      const row = groups.slice(i, i + 2).map((group: string) => 
        Keyboard.button.callback(group, `select_group:${encodeURIComponent(facultyName)}:${encodeURIComponent(studyFormat)}:${encodeURIComponent(degree)}:${course}:${encodeURIComponent(group)}`)
      );
      buttons.push(row);
    }
    buttons.push([Keyboard.button.callback('◀️ Назад', `select_degree:${encodeURIComponent(facultyName)}:${encodeURIComponent(studyFormat)}:${encodeURIComponent(degree)}`)]);
    
    await ctx.answerOnCallback({
      message: {
        text: `📋 Выберите группу:\n\nФакультет: ${formatFacultyName(facultyName)}\nФорма обучения: ${studyFormat}\nУровень обучения: ${degree}\nКурс: ${formatCourseNumber(course)}`,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });

  // Обработчик выбора группы (финальный шаг)
  // Поддерживает как старую структуру (4 параметра), так и новую (5 параметров с курсом)
  bot.action(/select_group:(.+):(.+):(.+):(.+)(?::(.+))?/, async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    const facultyName = decodeURIComponent(ctx.match?.[1] || '');
    const studyFormat = decodeURIComponent(ctx.match?.[2] || '');
    const degree = decodeURIComponent(ctx.match?.[3] || '');
    const fourthParam = decodeURIComponent(ctx.match?.[4] || '');
    const fifthParam = ctx.match?.[5] ? decodeURIComponent(ctx.match[5]) : null;
    
    let groupName: string;
    
    // Если есть 5-й параметр, значит это новая структура с курсом
    if (fifthParam) {
      groupName = fifthParam;
    } else {
      // Старая структура без курса (обратная совместимость)
      groupName = fourthParam;
    }
    
    if (!groupName) {
      return ctx.answerOnCallback({
        notification: 'Ошибка при выборе группы'
      });
    }
    
    // Получаем доступные подгруппы для этой группы
    const subgroups = getAvailableSubgroups(groupName);
    
    updateUserGroup(userId, groupName, null);
    
    // Если есть подгруппы, предлагаем выбрать
    if (subgroups.length > 0) {
      const subButtons = subgroups.map((sub: number) => 
        [Keyboard.button.callback(`Подгруппа ${sub}`, `set_subgroup:${sub}`)]
      );
      subButtons.push([Keyboard.button.callback('Общая (без подгруппы)', 'set_subgroup:null')]);
      
      await ctx.answerOnCallback({
        message: {
          text: `✅ Группа изменена на ${groupName}\n\nВыберите подгруппу:`,
          attachments: [Keyboard.inlineKeyboard(subButtons)]
        }
      });
    } else {
      await ctx.answerOnCallback({
        message: {
          text: `✅ Группа изменена на ${groupName}`,
          attachments: [getSettingsMenu()]
        }
      });
    }
  });

  // Обработчик для начала выбора группы (кнопка "Назад" к списку факультетов)
  bot.action('select_group_start', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const faculties = getAvailableFaculties();
    
    if (faculties.length === 0) {
      return ctx.answerOnCallback({
        notification: 'Факультеты не найдены'
      });
    }
    
    const buttons = faculties.map((faculty: string) => 
      [Keyboard.button.callback(formatFacultyName(faculty), `select_faculty:${faculty}`)]
    );
    
    let message = `📋 Выберите факультет:\n\n`;
    message += `Текущая группа: ${user.group_name || 'не указана'}\n`;
    message += `Текущая подгруппа: ${user.subgroup !== null && user.subgroup !== undefined ? user.subgroup : 'не указана'}`;
    
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: [Keyboard.inlineKeyboard(buttons)]
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

  // Обработчик callback для выбора группы из /today и других мест
  bot.action('select_group', async (ctx: Context) => {
    const userId = ctx.user?.user_id?.toString() || '';
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    const faculties = getAvailableFaculties();
    
    if (faculties.length === 0) {
      return ctx.answerOnCallback({
        notification: 'Факультеты не найдены'
      });
    }
    
    const buttons = faculties.map(faculty => 
      [Keyboard.button.callback(faculty, `select_faculty:${faculty}`)]
    );
    
    let message = `📋 Выберите факультет:\n\n`;
    message += `Текущая группа: ${user.group_name || 'не указана'}\n`;
    message += `Текущая подгруппа: ${user.subgroup !== null && user.subgroup !== undefined ? user.subgroup : 'не указана'}`;
    
    await ctx.answerOnCallback({
      message: {
        text: message,
        attachments: [Keyboard.inlineKeyboard(buttons)]
      }
    });
  });
}
