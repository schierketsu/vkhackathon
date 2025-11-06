import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from './config';

export interface Lesson {
  time: string;
  subject: string;
  room: string;
  teacher?: string;
  subgroup?: number | null;
  lessonType?: string; // Вид занятия: лб, лк, пр и т.д.
  weekParity?: 'odd' | 'even' | null; // Нечетная/четная неделя
  weeks?: number[]; // Массив номеров недель, когда проводится занятие
  substitutions?: Array<{
    date: string;
    teacher?: string;
    room?: string;
    note?: string;
  }>; // Замены
}

export interface DaySchedule {
  date: string;
  dayOfWeek: string;
  lessons: Lesson[];
}

export interface WeekSchedule {
  odd_week: {
    Monday: Lesson[];
    Tuesday: Lesson[];
    Wednesday: Lesson[];
    Thursday: Lesson[];
    Friday: Lesson[];
    Saturday: Lesson[];
    Sunday: Lesson[];
  };
  even_week: {
    Monday: Lesson[];
    Tuesday: Lesson[];
    Wednesday: Lesson[];
    Thursday: Lesson[];
    Friday: Lesson[];
    Saturday: Lesson[];
    Sunday: Lesson[];
  };
}

export interface TimetableData {
  faculties: {
    [facultyName: string]: {
      [studyFormat: string]: {
        [degree: string]: {
          [course: string]: {
            [groupName: string]: WeekSchedule;
          };
        };
      };
    };
  };
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

// Определение четности недели относительно начала семестра
// 1-я неделя начинается с 1 сентября (нечетная), 2-я неделя - четная и т.д.
export function getWeekParity(date: Date, semesterStart: Date): 'odd' | 'even' {
  // Получаем номер недели (1-я неделя = 1 сентября)
  const weekNumber = getWeekNumber(date);
  
  // Нечетные номера недель (1, 3, 5...) = odd, четные (2, 4, 6...) = even
  return weekNumber % 2 === 1 ? 'odd' : 'even';
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Понедельник = 1, воскресенье = 0
  // Если воскресенье (0), то отнимаем 6 дней, иначе отнимаем (day - 1) дней
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const result = new Date(d);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

function getDayOfWeek(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

export function loadTimetableData(): TimetableData | null {
  const config = getConfig();
  const timetablePath = path.join(process.cwd(), config.timetable_source);
  
  if (!fs.existsSync(timetablePath)) {
    return null;
  }

  const timetableData = fs.readFileSync(timetablePath, 'utf-8');
  return JSON.parse(timetableData) as TimetableData;
}

/**
 * Поиск расписания группы в новой структуре с факультетами
 */
function findGroupSchedule(timetableData: TimetableData, groupName: string): WeekSchedule | null {
  // Проверяем новую структуру с факультетами
  if (timetableData.faculties) {
    for (const facultyName in timetableData.faculties) {
      const faculty = timetableData.faculties[facultyName];
      for (const studyFormat in faculty) {
        const format = faculty[studyFormat];
        for (const degree in format) {
          const degreeCourses = format[degree];
          for (const course in degreeCourses) {
            const courseGroups = degreeCourses[course];
            if (courseGroups[groupName]) {
              return courseGroups[groupName];
            }
          }
        }
      }
    }
  }
  
  // Обратная совместимость со старой структурой (без курсов)
  if ((timetableData as any).faculties) {
    for (const facultyName in (timetableData as any).faculties) {
      const faculty = (timetableData as any).faculties[facultyName];
      for (const studyFormat in faculty) {
        const format = faculty[studyFormat];
        for (const degree in format) {
          const degreeGroups = format[degree];
          if (degreeGroups[groupName]) {
            return degreeGroups[groupName];
          }
        }
      }
    }
  }
  
  // Обратная совместимость со старой структурой
  if ((timetableData as any).groups && (timetableData as any).groups[groupName]) {
    return (timetableData as any).groups[groupName];
  }
  
  return null;
}

export function getTodaySchedule(group: string, subgroup?: number | null): DaySchedule | null {
  const timetableData = loadTimetableData();
  if (!timetableData) {
    return null;
  }
  
  const weekSchedule = findGroupSchedule(timetableData, group);
  if (!weekSchedule) {
    return null;
  }
  
  const today = new Date();
  const config = getConfig();
  const semesterStart = new Date(config.semester_start || '2025-09-01');
  const weekParity = getWeekParity(today, semesterStart);
  const dayName = getDayOfWeek(today);
  
  const dayLessons = weekSchedule[`${weekParity}_week` as keyof WeekSchedule][dayName as keyof typeof weekSchedule.odd_week] || [];
  
  // Фильтруем по подгруппе
  const filteredLessons = dayLessons.filter((lesson: Lesson) => {
    if (lesson.subgroup === null) return true; // Общие занятия
    if (subgroup === null || subgroup === undefined) return true; // Если подгруппа не указана, показываем все
    return lesson.subgroup === subgroup;
  });
  
  const dateStr = formatDate(today);
  
  return {
    date: dateStr,
    dayOfWeek: dayNames[dayName] || dayName,
    lessons: filteredLessons
  };
}

export function getTomorrowSchedule(group: string, subgroup?: number | null): DaySchedule | null {
  const timetableData = loadTimetableData();
  if (!timetableData) {
    return null;
  }
  
  const weekSchedule = findGroupSchedule(timetableData, group);
  if (!weekSchedule) {
    return null;
  }
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const config = getConfig();
  const semesterStart = new Date(config.semester_start || '2025-09-01');
  const weekParity = getWeekParity(tomorrow, semesterStart);
  const dayName = getDayOfWeek(tomorrow);
  
  const dayLessons = weekSchedule[`${weekParity}_week` as keyof WeekSchedule][dayName as keyof typeof weekSchedule.odd_week] || [];
  
  // Фильтруем по подгруппе
  const filteredLessons = dayLessons.filter((lesson: Lesson) => {
    if (lesson.subgroup === null) return true;
    if (subgroup === null || subgroup === undefined) return true;
    return lesson.subgroup === subgroup;
  });
  
  const dateStr = formatDate(tomorrow);
  
  return {
    date: dateStr,
    dayOfWeek: dayNames[dayName] || dayName,
    lessons: filteredLessons
  };
}

// Получить расписание на неделю начиная с указанной даты
function getWeekScheduleFromDate(group: string, startDate: Date, subgroup?: number | null): DaySchedule[] {
  const timetableData = loadTimetableData();
  if (!timetableData) {
    return [];
  }
  
  const groupSchedule = findGroupSchedule(timetableData, group);
  if (!groupSchedule) {
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
    
    const dayLessons = groupSchedule[`${weekParity}_week` as keyof WeekSchedule][dayName as keyof typeof groupSchedule.odd_week] || [];
    
    // Фильтруем по подгруппе
    const filteredLessons = dayLessons.filter((lesson: Lesson) => {
      if (lesson.subgroup === null) return true;
      if (subgroup === null || subgroup === undefined) return true;
      return lesson.subgroup === subgroup;
    });
    
    const dateStr = formatDate(date);
    
    weekSchedule.push({
      date: dateStr,
      dayOfWeek: dayNames[dayName] || dayName,
      lessons: filteredLessons
    });
  }
  
  return weekSchedule;
}

export function getWeekSchedule(group: string, subgroup?: number | null): DaySchedule[] {
  const today = new Date();
  return getWeekScheduleFromDate(group, today, subgroup);
}

// Получить номер недели относительно начала семестра (1 неделя начинается с 1 сентября)
export function getWeekNumber(date: Date): number {
  const config = getConfig();
  const semesterStart = new Date(config.semester_start || '2025-09-01');
  semesterStart.setHours(0, 0, 0, 0);
  
  // Находим понедельник недели, в которую попадает дата
  const dateWeekStart = getWeekStart(date);
  dateWeekStart.setHours(0, 0, 0, 0);
  
  // Находим понедельник 1-й недели
  // Если 1 сентября - понедельник, то это начало 1-й недели
  // Если нет, то понедельник 1-й недели - это следующий понедельник после 1 сентября
  const semesterDayOfWeek = semesterStart.getDay(); // 0 = воскресенье, 1 = понедельник
  let firstWeekMonday: Date;
  
  if (semesterDayOfWeek === 1) {
    // 1 сентября - понедельник, это начало 1-й недели
    firstWeekMonday = new Date(semesterStart);
  } else if (semesterDayOfWeek === 0) {
    // 1 сентября - воскресенье, понедельник 1-й недели - следующий день (2 сентября)
    firstWeekMonday = new Date(semesterStart);
    firstWeekMonday.setDate(semesterStart.getDate() + 1);
  } else {
    // 1 сентября - вторник-суббота, понедельник 1-й недели - следующий понедельник
    const daysUntilMonday = 8 - semesterDayOfWeek;
    firstWeekMonday = new Date(semesterStart);
    firstWeekMonday.setDate(semesterStart.getDate() + daysUntilMonday);
  }
  firstWeekMonday.setHours(0, 0, 0, 0);
  
  // Разница в миллисекундах
  const diffMs = dateWeekStart.getTime() - firstWeekMonday.getTime();
  // Разница в неделях (начиная с 1)
  // Если дата раньше начала семестра, возвращаем 1
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  
  return diffWeeks > 0 ? diffWeeks : 1;
}

// Получить расписание на текущую неделю (начиная с понедельника текущей недели)
export function getCurrentWeekSchedule(group: string, subgroup?: number | null): DaySchedule[] {
  const today = new Date();
  // Находим понедельник текущей недели
  const weekStart = getWeekStart(today);
  weekStart.setHours(0, 0, 0, 0);
  return getWeekScheduleFromDate(group, weekStart, subgroup);
}

// Получить расписание на следующую неделю (начиная с понедельника следующей недели)
export function getNextWeekSchedule(group: string, subgroup?: number | null): DaySchedule[] {
  const today = new Date();
  // Находим понедельник следующей недели
  const dayOfWeek = today.getDay();
  const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Если воскресенье, то через 1 день, иначе через 8 - день недели
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysUntilNextMonday);
  nextMonday.setHours(0, 0, 0, 0);
  
  return getWeekScheduleFromDate(group, nextMonday, subgroup);
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatSchedule(daySchedule: DaySchedule | null): string {
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
    // Сортируем занятия по времени
    const sortedLessons = [...daySchedule.lessons].sort((a, b) => {
      const timeA = a.time.split('–')[0].trim();
      const timeB = b.time.split('–')[0].trim();
      return timeA.localeCompare(timeB);
    });
    
    sortedLessons.forEach(lesson => {
      text += `${lesson.time} — ${lesson.subject}`;
      if (lesson.room) {
        text += `\n   📍 Ауд. ${lesson.room}`;
      }
      if (lesson.teacher) {
        text += `\n   👤 ${lesson.teacher}`;
      }
      if (lesson.subgroup !== null && lesson.subgroup !== undefined) {
        text += `\n   👥 Подгруппа ${lesson.subgroup}`;
      }
      text += '\n\n';
    });
  }
  
  return text.trim();
}

// Получить список доступных факультетов
export function getAvailableFaculties(): string[] {
  const timetableData = loadTimetableData();
  if (!timetableData || !timetableData.faculties) {
    return [];
  }
  
  return Object.keys(timetableData.faculties);
}

// Получить список форм обучения для факультета
export function getStudyFormatsForFaculty(facultyName: string): string[] {
  const timetableData = loadTimetableData();
  if (!timetableData || !timetableData.faculties || !timetableData.faculties[facultyName]) {
    return [];
  }
  
  return Object.keys(timetableData.faculties[facultyName]);
}

// Получить список степеней для факультета и формы обучения
export function getDegreesForFacultyAndFormat(facultyName: string, studyFormat: string): string[] {
  const timetableData = loadTimetableData();
  if (!timetableData || !timetableData.faculties || 
      !timetableData.faculties[facultyName] || 
      !timetableData.faculties[facultyName][studyFormat]) {
    return [];
  }
  
  return Object.keys(timetableData.faculties[facultyName][studyFormat]);
}

// Получить список курсов для факультета, формы обучения и степени
export function getCoursesForFacultyFormatDegree(facultyName: string, studyFormat: string, degree: string): number[] {
  const timetableData = loadTimetableData();
  if (!timetableData || !timetableData.faculties || 
      !timetableData.faculties[facultyName] || 
      !timetableData.faculties[facultyName][studyFormat] ||
      !timetableData.faculties[facultyName][studyFormat][degree]) {
    return [];
  }
  
  // Получаем все ключи курсов и преобразуем в числа, сортируем
  const courses = Object.keys(timetableData.faculties[facultyName][studyFormat][degree])
    .map(c => parseInt(c))
    .filter(c => !isNaN(c) && c > 0)
    .sort((a, b) => a - b);
  
  return courses;
}

// Получить список групп для факультета, формы обучения, степени и курса
export function getGroupsForFacultyFormatDegreeCourse(facultyName: string, studyFormat: string, degree: string, course: number): string[] {
  const timetableData = loadTimetableData();
  if (!timetableData || !timetableData.faculties || 
      !timetableData.faculties[facultyName] || 
      !timetableData.faculties[facultyName][studyFormat] ||
      !timetableData.faculties[facultyName][studyFormat][degree] ||
      !timetableData.faculties[facultyName][studyFormat][degree][course.toString()]) {
    return [];
  }
  
  return Object.keys(timetableData.faculties[facultyName][studyFormat][degree][course.toString()]);
}

// Получить список групп для факультета, формы обучения и степени (для обратной совместимости)
export function getGroupsForFacultyFormatDegree(facultyName: string, studyFormat: string, degree: string): string[] {
  const timetableData = loadTimetableData();
  if (!timetableData || !timetableData.faculties || 
      !timetableData.faculties[facultyName] || 
      !timetableData.faculties[facultyName][studyFormat] ||
      !timetableData.faculties[facultyName][studyFormat][degree]) {
    return [];
  }
  
  // Проверяем новую структуру с курсами
  const degreeData = timetableData.faculties[facultyName][studyFormat][degree];
  if (typeof degreeData === 'object' && !Array.isArray(degreeData)) {
    // Если это объект с курсами
    const allGroups: string[] = [];
    for (const courseKey in degreeData) {
      const courseGroups = degreeData[courseKey];
      if (typeof courseGroups === 'object' && !Array.isArray(courseGroups)) {
        allGroups.push(...Object.keys(courseGroups));
      }
    }
    return allGroups;
  }
  
  // Обратная совместимость со старой структурой
  return Object.keys(degreeData);
}

// Получить список доступных подгрупп для группы
export function getAvailableSubgroups(groupName: string): number[] {
  const timetableData = loadTimetableData();
  if (!timetableData) {
    return [];
  }
  
  const weekSchedule = findGroupSchedule(timetableData, groupName);
  if (!weekSchedule) {
    return [];
  }
  
  const subgroups = new Set<number>();
  
  // Проходим по всем неделям и дням
  for (const weekType of ['odd_week', 'even_week'] as const) {
    const week = weekSchedule[weekType];
    for (const day of Object.values(week)) {
      for (const lesson of day) {
        if (lesson.subgroup !== null && lesson.subgroup !== undefined) {
          subgroups.add(lesson.subgroup);
        }
      }
    }
  }
  
  return Array.from(subgroups).sort((a, b) => a - b);
}

// Получить список доступных групп (для обратной совместимости)
export function getAvailableGroups(): string[] {
  const timetableData = loadTimetableData();
  if (!timetableData) {
    return [];
  }
  
  const groups: string[] = [];
  
  // Обрабатываем новую структуру с факультетами
  if (timetableData.faculties) {
    for (const facultyName in timetableData.faculties) {
      const faculty = timetableData.faculties[facultyName];
      for (const studyFormat in faculty) {
        const format = faculty[studyFormat];
        for (const degree in format) {
          const degreeData = format[degree];
          // Проверяем, есть ли курсы в структуре
          if (typeof degreeData === 'object' && !Array.isArray(degreeData)) {
            for (const courseKey in degreeData) {
              const courseGroups = degreeData[courseKey];
              if (typeof courseGroups === 'object' && !Array.isArray(courseGroups)) {
                groups.push(...Object.keys(courseGroups));
              }
            }
          } else {
            // Обратная совместимость
            groups.push(...Object.keys(degreeData));
          }
        }
      }
    }
  }
  
  // Обратная совместимость со старой структурой
  if ((timetableData as any).groups) {
    groups.push(...Object.keys((timetableData as any).groups));
  }
  
  return groups;
}
