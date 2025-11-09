import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from './config';
import { TimetableData, WeekSchedule, Lesson, DaySchedule, getWeekParity, getDayOfWeek } from './timetable';
import { database } from './database';

export interface TeacherSchedule {
  teacher: string;
  lessons: Array<{
    time: string;
    subject: string;
    room: string;
    day: string;
    weekParity: 'odd' | 'even' | 'both';
    group?: string;
    lessonType?: string;
  }>;
}

// Маппинг дней недели
const dayNames: { [key: string]: string } = {
  'Monday': 'Понедельник',
  'Tuesday': 'Вторник',
  'Wednesday': 'Среда',
  'Thursday': 'Четверг',
  'Friday': 'Пятница',
  'Saturday': 'Суббота',
  'Sunday': 'Воскресенье'
};

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Загружает данные расписания
 */
function loadTimetableData(): TimetableData | null {
  const config = getConfig();
  const timetablePath = path.join(process.cwd(), config.timetable_source);
  
  if (!fs.existsSync(timetablePath)) {
    return null;
  }

  const timetableData = fs.readFileSync(timetablePath, 'utf-8');
  return JSON.parse(timetableData) as TimetableData;
}

/**
 * Нормализует имя преподавателя - убирает титулы и (ДОТ)
 * "доц.  к.т.н. Андреева А. А." -> "Андреева А. А."
 * "Аринина Н. Н. (ДОТ)" -> "Аринина Н. Н."
 */
function normalizeTeacherName(name: string): string {
  let normalized = name.trim();
  
  // Убираем "(ДОТ)" в конце сначала
  normalized = normalized.replace(/\s*\(ДОТ\)\s*$/i, '').trim();
  
  // Убираем титулы в начале (могут быть множественные, разделенные пробелами)
  // Паттерны титулов: доц., проф., ст. преп., асс., к.т.н., к.пед.н., к.ф.н., к.и.н., к.х.н., к.ф.-м.н., д.филос.н., д.т.н., д.пед.н.
  // Могут быть с пробелами: "доц.  к.т.н." или "доц. к.т.н."
  // Сначала убираем множественные пробелы для упрощения
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  const titlePatterns = [
    /^доц\.\s*/gi,
    /^проф\.\s*/gi,
    /^ст\.\s*преп\.\s*/gi,
    /^асс\.\s*/gi,
    /^к\.\s*т\.\s*н\.\s*/gi,
    /^к\.\s*пед\.\s*н\.\s*/gi,
    /^к\.\s*ф\.\s*н\.\s*/gi,
    /^к\.\s*и\.\s*н\.\s*/gi,
    /^к\.\s*х\.\s*н\.\s*/gi,
    /^к\.\s*ф\.-м\.\s*н\.\s*/gi,
    /^д\.\s*филос\.\s*н\.\s*/gi,
    /^д\.\s*т\.\s*н\.\s*/gi,
    /^д\.\s*пед\.\s*н\.\s*/gi
  ];
  
  // Убираем титулы по одному, пока они есть
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) { // Защита от бесконечного цикла
    changed = false;
    iterations++;
    for (const pattern of titlePatterns) {
      const before = normalized;
      normalized = normalized.replace(pattern, '');
      if (normalized !== before) {
        changed = true;
        // Убираем пробелы после удаления титула
        normalized = normalized.replace(/\s+/g, ' ').trim();
      }
    }
  }
  
  // Финальная очистка множественных пробелов
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Создает маппинг нормализованных имен к оригинальным
 */
function createTeacherNameMapping(): Map<string, string> {
  const timetableData = loadTimetableData();
  const mapping = new Map<string, string>();
  
  if (!timetableData) {
    return mapping;
  }

  // Вспомогательная функция для обработки расписания группы
  const processGroupSchedule = (groupSchedule: WeekSchedule) => {
    for (const weekType of ['odd_week', 'even_week'] as const) {
      const week = groupSchedule[weekType];
      for (const day of Object.values(week)) {
        for (const lesson of day) {
          if (lesson.teacher && lesson.teacher.trim()) {
            const originalName = lesson.teacher.trim();
            if (isValidTeacherName(originalName)) {
              const normalized = normalizeTeacherName(originalName);
              // Сохраняем маппинг: нормализованное -> оригинальное
              // Если уже есть маппинг, берем первый найденный оригинал
              if (!mapping.has(normalized)) {
                mapping.set(normalized, originalName);
              }
            }
          }
        }
      }
    }
  };

  // Проходим по новой структуре с учебными заведениями
  if (timetableData.institutions) {
    for (const institutionName in timetableData.institutions) {
      const institution = timetableData.institutions[institutionName];
      if (institution.faculties) {
        for (const facultyName in institution.faculties) {
          const faculty = institution.faculties[facultyName];
          for (const studyFormat in faculty) {
            const format = faculty[studyFormat];
            for (const degree in format) {
              const degreeCourses = format[degree];
              for (const course in degreeCourses) {
                const courseGroups = degreeCourses[course];
                for (const groupName in courseGroups) {
                  const groupSchedule = courseGroups[groupName];
                  processGroupSchedule(groupSchedule);
                }
              }
            }
          }
        }
      }
    }
  }

  // Обратная совместимость со старой структурой
  if (timetableData.faculties) {
    for (const facultyName in timetableData.faculties) {
      const faculty = timetableData.faculties[facultyName];
      for (const studyFormat in faculty) {
        const format = faculty[studyFormat];
        for (const degree in format) {
          const degreeCourses = format[degree];
          for (const course in degreeCourses) {
            const courseGroups = degreeCourses[course];
            for (const groupName in courseGroups) {
              const groupSchedule = courseGroups[groupName];
              processGroupSchedule(groupSchedule);
            }
          }
        }
      }
    }
  }
  
  return mapping;
}

// Кэш маппинга имен
let teacherNameMappingCache: Map<string, string> | null = null;

/**
 * Получает оригинальное имя преподавателя по нормализованному
 */
function getOriginalTeacherName(normalizedName: string): string {
  if (!teacherNameMappingCache) {
    teacherNameMappingCache = createTeacherNameMapping();
  }
  
  return teacherNameMappingCache.get(normalizedName) || normalizedName;
}

/**
 * Извлекает всех уникальных преподавателей из расписания (нормализованные имена)
 */
export function getAllTeachers(): string[] {
  const timetableData = loadTimetableData();
  if (!timetableData) {
    return [];
  }

  const teachers = new Set<string>();

  // Проходим по новой структуре с учебными заведениями
  if (timetableData.institutions) {
    for (const institutionName in timetableData.institutions) {
      const institution = timetableData.institutions[institutionName];
      if (institution.faculties) {
        for (const facultyName in institution.faculties) {
          const faculty = institution.faculties[facultyName];
          for (const studyFormat in faculty) {
            const format = faculty[studyFormat];
            for (const degree in format) {
              const degreeCourses = format[degree];
              for (const course in degreeCourses) {
                const courseGroups = degreeCourses[course];
                for (const groupName in courseGroups) {
                  const groupSchedule = courseGroups[groupName];
                  extractTeachersFromSchedule(groupSchedule, teachers);
                }
              }
            }
          }
        }
      }
    }
  }

  // Обратная совместимость со старой структурой
  if (timetableData.faculties) {
    for (const facultyName in timetableData.faculties) {
      const faculty = timetableData.faculties[facultyName];
      for (const studyFormat in faculty) {
        const format = faculty[studyFormat];
        for (const degree in format) {
          const degreeCourses = format[degree];
          for (const course in degreeCourses) {
            const courseGroups = degreeCourses[course];
            for (const groupName in courseGroups) {
              const groupSchedule = courseGroups[groupName];
              extractTeachersFromSchedule(groupSchedule, teachers);
            }
          }
        }
      }
    }
  }

  // Нормализуем имена
  const normalizedTeachers = Array.from(teachers)
    .filter(name => isValidTeacherName(name))
    .map(name => normalizeTeacherName(name))
    .filter(name => name.length > 0);

  // Убираем дубликаты после нормализации
  return Array.from(new Set(normalizedTeachers)).sort();
}

/**
 * Проверяет, является ли строка именем преподавателя
 */
function isValidTeacherName(name: string): boolean {
  const trimmed = name.trim();
  
  // Исключаем слишком короткие строки
  if (trimmed.length < 3) {
    return false;
  }
  
  // Исключаем строки, которые не содержат русских букв
  if (!/[А-Яа-яЁё]/.test(trimmed)) {
    return false;
  }
  
  // Исключаем строки, которые начинаются с цифр и дефиса (например, "2-01 Литература")
  if (/^\d+-\d+/.test(trimmed)) {
    return false;
  }
  
  // Исключаем строки, которые выглядят как время (например, "13:17")
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return false;
  }
  
  // Исключаем строки, которые содержат только цифры и дефисы
  if (/^[\d\s-]+$/.test(trimmed)) {
    return false;
  }
  
  // Исключаем строки, которые выглядят как названия предметов
  // (содержат скобки с типами занятий в конце: лк, лб, пр и т.д.)
  // Но разрешаем скобки в середине/начале (например, "(ДОТ)")
  if (/\(лк|лб|пр|ср|кр|экз|зач|гз|из\)\s*$/i.test(trimmed)) {
    return false;
  }
  
  // Исключаем строки, которые начинаются с названия предмета
  // (например, "Литература (лк)" или "2-01 Литература")
  if (/^[А-Яа-яЁё]+\s+\(лк|лб|пр\)/i.test(trimmed)) {
    return false;
  }
  
  // Имена преподавателей обычно содержат фамилию и инициалы
  // Или титулы типа "доц.", "проф." и т.д.
  // Проверяем, что есть хотя бы одна заглавная русская буква (фамилия или инициал)
  // Используем более надежную проверку через Unicode диапазоны
  const hasCapitalLetter = /[\u0410-\u042F\u0401]/.test(trimmed);
  if (!hasCapitalLetter) {
    return false;
  }
  
  // Дополнительная проверка: имя должно содержать точку (инициалы или титулы) или быть достаточно длинным
  // Это помогает отфильтровать случайные строки
  // Но не требуем точку строго, так как могут быть преподаватели без инициалов
  const hasDot = /\./.test(trimmed);
  const isLongEnough = trimmed.length >= 5;
  
  // Если нет точки и строка короткая, отфильтровываем
  // Но если есть заглавная буква и строка достаточно длинная, пропускаем
  if (!hasDot && trimmed.length < 8) {
    return false;
  }
  
  // Проверяем, что это не просто набор цифр и дефисов
  if (/^[\d\s\-\.]+$/.test(trimmed)) {
    return false;
  }
  
  return true;
}

/**
 * Извлекает преподавателей из расписания группы
 */
function extractTeachersFromSchedule(schedule: WeekSchedule, teachers: Set<string>): void {
  for (const weekType of ['odd_week', 'even_week'] as const) {
    const week = schedule[weekType];
    for (const day of Object.values(week)) {
      for (const lesson of day) {
        if (lesson.teacher && lesson.teacher.trim()) {
          const teacherName = lesson.teacher.trim();
          // Фильтруем только валидные имена преподавателей
          if (isValidTeacherName(teacherName)) {
            teachers.add(teacherName);
          }
        }
      }
    }
  }
}

/**
 * Получает оригинальное имя преподавателя для поиска в расписании
 */
export function getOriginalTeacherNameForSearch(normalizedName: string): string {
  return getOriginalTeacherName(normalizedName);
}

/**
 * Получает расписание преподавателя на указанную дату
 * teacherName может быть нормализованным именем
 */
export function getTeacherScheduleForDate(teacherName: string, date: Date): DaySchedule | null {
  // Если имя нормализованное, получаем оригинальное для поиска
  const originalName = getOriginalTeacherName(teacherName);
  const weekScheduleFull = getTeacherWeekScheduleFull(originalName);
  if (!weekScheduleFull) {
    return null;
  }

  const config = getConfig();
  const semesterStart = new Date(config.semester_start || '2025-09-01');
  const weekParity = getWeekParity(date, semesterStart);
  const dayName = getDayOfWeek(date);

  const dayLessons = weekScheduleFull[`${weekParity}_week` as keyof WeekSchedule][dayName as keyof typeof weekScheduleFull.odd_week] || [];
  
  const dateStr = formatDate(date);

  return {
    date: dateStr,
    dayOfWeek: dayNames[dayName] || dayName,
    lessons: dayLessons
  };
}

/**
 * Получает расписание преподавателя на неделю (начиная с указанной даты)
 * teacherName может быть нормализованным именем
 */
export function getTeacherWeekSchedule(teacherName: string, startDate: Date): DaySchedule[] {
  // Если имя нормализованное, получаем оригинальное для поиска
  const originalName = getOriginalTeacherName(teacherName);
  const weekScheduleFull = getTeacherWeekScheduleFull(originalName);
  if (!weekScheduleFull) {
    return [];
  }

  const config = getConfig();
  const semesterStart = new Date(config.semester_start || '2025-09-01');
  const weekSchedule: DaySchedule[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const weekParity = getWeekParity(date, semesterStart);
    const dayName = getDayOfWeek(date);
    
    const dayLessons = weekScheduleFull[`${weekParity}_week` as keyof WeekSchedule][dayName as keyof typeof weekScheduleFull.odd_week] || [];
    
    const dateStr = formatDate(date);
    
    weekSchedule.push({
      date: dateStr,
      dayOfWeek: dayNames[dayName] || dayName,
      lessons: dayLessons
    });
  }

  return weekSchedule;
}

/**
 * Получает полное расписание преподавателя в формате WeekSchedule (как у групп)
 * Принимает оригинальное имя преподавателя (с титулами)
 */
export function getTeacherWeekScheduleFull(teacherName: string): WeekSchedule | null {
  const timetableData = loadTimetableData();
  
  if (!timetableData) {
    return null;
  }

  // Создаем пустое расписание
  const teacherSchedule: WeekSchedule = {
    odd_week: {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    },
    even_week: {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    }
  };

  // Вспомогательная функция для обработки расписания группы
  const processGroupScheduleForTeacher = (groupSchedule: WeekSchedule, groupName: string) => {
    // Проверяем обе недели
    for (const weekType of ['odd_week', 'even_week'] as const) {
      const week = groupSchedule[weekType];
      for (const dayKey in week) {
        const day = week[dayKey as keyof typeof week];
        for (const lesson of day) {
          // Сравниваем как оригинальное имя, так и нормализованное
          const lessonTeacher = lesson.teacher?.trim() || '';
          if (lessonTeacher && (
            lessonTeacher === teacherName.trim() || 
            normalizeTeacherName(lessonTeacher) === normalizeTeacherName(teacherName)
          )) {
            // Добавляем занятие в расписание преподавателя
            // Создаем копию урока с информацией о группе
            const teacherLesson: Lesson = {
              ...lesson,
              subject: `${lesson.subject} (${groupName})`
            };
            teacherSchedule[weekType][dayKey as keyof typeof teacherSchedule.odd_week].push(teacherLesson);
          }
        }
      }
    }
  };

  // Проходим по новой структуре с учебными заведениями
  if (timetableData.institutions) {
    for (const institutionName in timetableData.institutions) {
      const institution = timetableData.institutions[institutionName];
      if (institution.faculties) {
        for (const facultyName in institution.faculties) {
          const faculty = institution.faculties[facultyName];
          for (const studyFormat in faculty) {
            const format = faculty[studyFormat];
            for (const degree in format) {
              const degreeCourses = format[degree];
              for (const course in degreeCourses) {
                const courseGroups = degreeCourses[course];
                for (const groupName in courseGroups) {
                  const groupSchedule = courseGroups[groupName];
                  processGroupScheduleForTeacher(groupSchedule, groupName);
                }
              }
            }
          }
        }
      }
    }
  }

  // Обратная совместимость со старой структурой
  if (timetableData.faculties) {
    for (const facultyName in timetableData.faculties) {
      const faculty = timetableData.faculties[facultyName];
      for (const studyFormat in faculty) {
        const format = faculty[studyFormat];
        for (const degree in format) {
          const degreeCourses = format[degree];
          for (const course in degreeCourses) {
            const courseGroups = degreeCourses[course];
            for (const groupName in courseGroups) {
              const groupSchedule = courseGroups[groupName];
              processGroupScheduleForTeacher(groupSchedule, groupName);
            }
          }
        }
      }
    }
  }

  // Сортируем занятия по времени в каждом дне
  for (const weekType of ['odd_week', 'even_week'] as const) {
    for (const dayKey in teacherSchedule[weekType]) {
      const day = teacherSchedule[weekType][dayKey as keyof typeof teacherSchedule.odd_week];
      day.sort((a, b) => {
        const timeA = a.time.split('–')[0].trim();
        const timeB = b.time.split('–')[0].trim();
        return timeA.localeCompare(timeB);
      });
    }
  }

  return teacherSchedule;
}

/**
 * Получает полное расписание преподавателя (все недели) - старая версия для обратной совместимости
 */
export function getFullTeacherSchedule(teacherName: string): TeacherSchedule {
  const weekSchedule = getTeacherWeekScheduleFull(teacherName);
  const lessons: TeacherSchedule['lessons'] = [];

  if (!weekSchedule) {
    return { teacher: teacherName, lessons: [] };
  }

  // Преобразуем WeekSchedule в старый формат для обратной совместимости
  for (const weekType of ['odd_week', 'even_week'] as const) {
    const week = weekSchedule[weekType];
    for (const dayKey in week) {
      const day = week[dayKey as keyof typeof week];
      for (const lesson of day) {
        const weekParity = weekType === 'odd_week' ? 'odd' : 'even';
        // Извлекаем группу из subject (формат: "Предмет (Группа)")
        const groupMatch = lesson.subject.match(/\(([^)]+)\)$/);
        const group = groupMatch ? groupMatch[1] : undefined;
        const subject = lesson.subject.replace(/\s*\([^)]+\)$/, '');
        
        lessons.push({
          time: lesson.time,
          subject: subject,
          room: lesson.room,
          day: dayNames[dayKey] || dayKey,
          weekParity: weekParity,
          group: group,
          lessonType: lesson.lessonType
        });
      }
    }
  }

  return { teacher: teacherName, lessons };
}

/**
 * Форматирует расписание преподавателя для отображения
 */
export function formatTeacherSchedule(daySchedule: DaySchedule | null): string {
  if (!daySchedule) {
    return 'Расписание на этот день не найдено.';
  }
  
  const dateParts = daySchedule.date.split('.');
  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]);
  const monthNames = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  
  let text = `📅 ${daySchedule.dayOfWeek} (${day} ${monthNames[month - 1]}):\n\n`;
  
  if (daySchedule.lessons.length === 0) {
    text += 'Выходной день! 🎉';
  } else {
    daySchedule.lessons.forEach(lesson => {
      // Извлекаем группу из subject (формат: "Предмет (Группа)")
      const groupMatch = lesson.subject.match(/\(([^)]+)\)$/);
      const group = groupMatch ? groupMatch[1] : undefined;
      const subject = lesson.subject.replace(/\s*\([^)]+\)$/, '');
      
      text += `${lesson.time} — ${subject}`;
      if (group) {
        text += `\n   👥 Группа: ${group}`;
      }
      if (lesson.room) {
        text += `\n   📍 Ауд. ${lesson.room}`;
      }
      if (lesson.subgroup !== null && lesson.subgroup !== undefined) {
        text += `\n   🔢 Подгруппа ${lesson.subgroup}`;
      }
      if (lesson.lessonType) {
        text += `\n   📚 ${lesson.lessonType}`;
      }
      text += '\n\n';
    });
  }
  
  return text.trim();
}

/**
 * Поиск преподавателей по имени
 */
export function searchTeachers(query: string): string[] {
  const allTeachers = getAllTeachers();
  const lowerQuery = query.toLowerCase().trim();
  
  if (!lowerQuery) {
    return allTeachers;
  }

  return allTeachers.filter(teacher => 
    teacher.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Получить избранных преподавателей пользователя
 */
export function getFavoriteTeachers(userId: string): string[] {
  const stmt = database.prepare('SELECT teacher_name FROM favorite_teachers WHERE user_id = ? ORDER BY teacher_name');
  const rows = stmt.all(userId) as Array<{ teacher_name: string }>;
  return rows.map(row => row.teacher_name);
}

/**
 * Добавить преподавателя в избранное
 */
export function addFavoriteTeacher(userId: string, teacherName: string): boolean {
  try {
    const stmt = database.prepare(`
      INSERT INTO favorite_teachers (user_id, teacher_name)
      VALUES (?, ?)
      ON CONFLICT(user_id, teacher_name) DO NOTHING
    `);
    stmt.run(userId, teacherName);
    return true;
  } catch (error) {
    console.error('Ошибка при добавлении избранного преподавателя:', error);
    return false;
  }
}

/**
 * Удалить преподавателя из избранного
 */
export function removeFavoriteTeacher(userId: string, teacherName: string): boolean {
  try {
    const stmt = database.prepare('DELETE FROM favorite_teachers WHERE user_id = ? AND teacher_name = ?');
    stmt.run(userId, teacherName);
    return true;
  } catch (error) {
    console.error('Ошибка при удалении избранного преподавателя:', error);
    return false;
  }
}

/**
 * Проверить, является ли преподаватель избранным
 */
export function isFavoriteTeacher(userId: string, teacherName: string): boolean {
  const stmt = database.prepare('SELECT 1 FROM favorite_teachers WHERE user_id = ? AND teacher_name = ?');
  const result = stmt.get(userId, teacherName);
  return !!result;
}

