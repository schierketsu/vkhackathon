// Этот файл содержит адаптированные версии функций из src/utils
// для использования в API сервере мини-приложения

import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

// Типы для расписания
interface Lesson {
  time: string;
  subject: string;
  room: string;
  teacher?: string;
  subgroup?: number | null;
  lessonType?: string;
}

interface DaySchedule {
  date: string;
  dayOfWeek: string;
  lessons: Lesson[];
}

interface TimetableData {
  institutions?: {
    [institutionName: string]: {
      faculties: {
        [facultyName: string]: {
          [studyFormat: string]: {
            [degree: string]: {
              [course: string]: {
                [groupName: string]: any;
              };
            };
          };
        };
      };
    };
  };
  // Обратная совместимость со старой структурой
  faculties?: {
    [facultyName: string]: {
      [studyFormat: string]: {
        [degree: string]: {
          [course: string]: {
            [groupName: string]: any;
          };
        };
      };
    };
  };
}

const dbPath = path.join(__dirname, '../../data/campus.db');
let db: Database.Database | null = null;

export function initDatabase() {
  if (!fs.existsSync(dbPath)) {
    // Создаем базу данных если её нет
    db = new Database(dbPath);
    createTables();
  } else {
    db = new Database(dbPath);
  }
}

function createTables() {
  if (!db) return;

  // Таблица пользователей
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      group_name TEXT,
      subgroup INTEGER,
      institution_name TEXT,
      notifications_enabled INTEGER DEFAULT 1,
      events_subscribed INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Добавляем поле institution_name, если его нет (для существующих БД)
  try {
    db.exec('ALTER TABLE users ADD COLUMN institution_name TEXT');
  } catch (e) {
    // Колонка уже существует, игнорируем
  }

  // Таблица дедлайнов
  db.exec(`
    CREATE TABLE IF NOT EXISTS deadlines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      notified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  // Таблица избранных преподавателей
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorite_teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      teacher_name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, teacher_name),
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);
}

export function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

export interface User {
  user_id: string;
  group_name: string | null;
  subgroup: number | null;
  institution_name: string | null;
  notifications_enabled: number;
  events_subscribed: number;
  created_at: string;
}

export function getUser(userId: string): User | null {
  const database = getDatabase();
  if (!database) return null;
  const stmt = database.prepare('SELECT * FROM users WHERE user_id = ?');
  return (stmt.get(userId) as User) || null;
}

export function createUser(userId: string): User {
  const database = getDatabase();
  if (!database) throw new Error('База данных не инициализирована');
  
  const stmt = database.prepare(`
    INSERT INTO users (user_id, group_name, subgroup, institution_name, notifications_enabled, events_subscribed)
    VALUES (?, ?, ?, ?, 1, 1)
    ON CONFLICT(user_id) DO UPDATE SET user_id = user_id
  `);
  stmt.run(userId, null, null, null);
  
  return getUser(userId)!;
}

export function updateUserGroup(userId: string, groupName: string, subgroup?: number | null, institutionName?: string | null): void {
  const database = getDatabase();
  if (!database) return;
  const stmt = database.prepare('UPDATE users SET group_name = ?, subgroup = ?, institution_name = ? WHERE user_id = ?');
  stmt.run(groupName, subgroup || null, institutionName || null, userId);
}

export function updateUserInstitution(userId: string, institutionName: string | null): void {
  const database = getDatabase();
  if (!database) return;
  const stmt = database.prepare('UPDATE users SET institution_name = ? WHERE user_id = ?');
  stmt.run(institutionName, userId);
}

export function toggleNotifications(userId: string, enabled: boolean): void {
  const database = getDatabase();
  if (!database) return;
  const stmt = database.prepare('UPDATE users SET notifications_enabled = ? WHERE user_id = ?');
  stmt.run(enabled ? 1 : 0, userId);
}

export function toggleEventsSubscription(userId: string, subscribed: boolean): void {
  const database = getDatabase();
  if (!database) return;
  const stmt = database.prepare('UPDATE users SET events_subscribed = ? WHERE user_id = ?');
  stmt.run(subscribed ? 1 : 0, userId);
}

export interface Deadline {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  due_date: string;
  notified: number;
  created_at: string;
}

export function getActiveDeadlines(userId: string): Deadline[] {
  const database = getDatabase();
  if (!database) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const stmt = database.prepare(`
    SELECT * FROM deadlines 
    WHERE user_id = ? AND date(due_date) >= date(?)
    ORDER BY due_date ASC
  `);
  return stmt.all(userId, today.toISOString().split('T')[0]) as Deadline[];
}

export function addDeadline(userId: string, title: string, dueDate: string, description?: string): Deadline {
  const database = getDatabase();
  if (!database) throw new Error('База данных не инициализирована');
  
  const stmt = database.prepare(`
    INSERT INTO deadlines (user_id, title, description, due_date)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(userId, title, description || null, dueDate);
  
  const getStmt = database.prepare('SELECT * FROM deadlines WHERE id = ?');
  return getStmt.get(result.lastInsertRowid) as Deadline;
}

export function deleteDeadline(userId: string, id: number): void {
  const database = getDatabase();
  if (!database) return;
  const stmt = database.prepare('DELETE FROM deadlines WHERE id = ? AND user_id = ?');
  stmt.run(id, userId);
}

export interface Event {
  id?: number;
  date: string;
  title: string;
  location?: string;
  description?: string;
  link?: string;
}

export function getUpcomingEvents(days: number = 7): Event[] {
  const eventsPath = path.join(__dirname, '../../data/events.json');
  if (!fs.existsSync(eventsPath)) {
    return [];
  }
  
  const eventsData = fs.readFileSync(eventsPath, 'utf-8');
  const events = JSON.parse(eventsData) as Event[];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return events.filter(event => {
    const eventDate = new Date(event.date);
    const diff = eventDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff <= days;
  });
}

// Функции для работы с расписанием
// В реальной версии нужно импортировать из src/utils/timetable.ts
// или создать общий модуль

// Импортируем функции из src/utils (нужно адаптировать пути)
// ВНИМАНИЕ: Для работы необходимо, чтобы функции из src/utils были доступны
// В продакшене лучше переиспользовать код через общий пакет или библиотеку

// Временная реализация - в будущем нужно использовать функции из src/utils/timetable.ts
// Для этого можно:
// 1. Создать общий пакет с утилитами
// 2. Или использовать динамический импорт с правильными путями
// 3. Или скопировать необходимые функции с адаптацией путей

interface TimetableData {
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

interface WeekSchedule {
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

const dayNames: { [key: string]: string } = {
  'Monday': 'Понедельник',
  'Tuesday': 'Вторник',
  'Wednesday': 'Среда',
  'Thursday': 'Четверг',
  'Friday': 'Пятница',
  'Saturday': 'Суббота',
  'Sunday': 'Воскресенье'
};

function loadTimetableDataFromFile(): TimetableData | null {
  const timetablePath = path.join(__dirname, '../../data/timetable.json');
  if (!fs.existsSync(timetablePath)) {
    console.error('Файл расписания не найден:', timetablePath);
    return null;
  }
  try {
    const data = fs.readFileSync(timetablePath, 'utf-8');
    return JSON.parse(data) as TimetableData;
  } catch (error) {
    console.error('Ошибка загрузки расписания:', error);
    return null;
  }
}

function getConfigFromFile() {
  const configPath = path.join(__dirname, '../../config.json');
  if (!fs.existsSync(configPath)) {
    return { semester_start: '2025-09-01' };
  }
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Ошибка загрузки конфига:', error);
    return { semester_start: '2025-09-01' };
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const result = new Date(d);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function getWeekNumber(date: Date): number {
  const config = getConfigFromFile();
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

function getWeekParity(date: Date, semesterStart: Date): 'odd' | 'even' {
  const weekNumber = getWeekNumber(date);
  return weekNumber % 2 === 1 ? 'odd' : 'even';
}

function getDayOfWeek(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

function formatDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function findGroupSchedule(timetableData: TimetableData, groupName: string): WeekSchedule | null {
  // Проверяем новую структуру с учебными заведениями
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
                if (courseGroups[groupName]) {
                  return courseGroups[groupName];
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Обратная совместимость со старой структурой с факультетами
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
          if (typeof degreeGroups === 'object' && !Array.isArray(degreeGroups)) {
            if (degreeGroups[groupName]) {
              return degreeGroups[groupName];
            }
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

export function getTodaySchedule(groupName: string, subgroup: number | null): DaySchedule {
  try {
    const timetableData = loadTimetableDataFromFile();
    if (!timetableData) {
      const today = new Date();
      const dateStr = formatDate(today);
      return { 
        date: dateStr, 
        dayOfWeek: dayNames[getDayOfWeek(today)] || 'Понедельник', 
        lessons: [] 
      };
    }
    
    const weekSchedule = findGroupSchedule(timetableData, groupName);
    if (!weekSchedule) {
      console.warn(`Расписание для группы ${groupName} не найдено`);
      const today = new Date();
      const dateStr = formatDate(today);
      return { 
        date: dateStr, 
        dayOfWeek: dayNames[getDayOfWeek(today)] || 'Понедельник', 
        lessons: [] 
      };
    }
    
    const today = new Date();
    const config = getConfigFromFile();
    const semesterStart = new Date(config.semester_start || '2025-09-01');
    const weekParity = getWeekParity(today, semesterStart);
    const dayName = getDayOfWeek(today);
    
    const dayLessons = weekSchedule[`${weekParity}_week` as keyof WeekSchedule][dayName as keyof typeof weekSchedule.odd_week] || [];
    
    // Фильтруем по подгруппе
    const filteredLessons = dayLessons.filter((lesson: Lesson) => {
      if (lesson.subgroup === null) return true;
      if (subgroup === null || subgroup === undefined) return true;
      return lesson.subgroup === subgroup;
    });
    
    const dateStr = formatDate(today);
    
    return {
      date: dateStr,
      dayOfWeek: dayNames[dayName] || dayName,
      lessons: filteredLessons
    };
  } catch (error) {
    console.error('Ошибка получения расписания на сегодня:', error);
    const today = new Date();
    const dateStr = formatDate(today);
    return { 
      date: dateStr, 
      dayOfWeek: dayNames[getDayOfWeek(today)] || 'Понедельник', 
      lessons: [] 
    };
  }
}

export function getTomorrowSchedule(groupName: string, subgroup: number | null): DaySchedule {
  try {
    const timetableData = loadTimetableDataFromFile();
    if (!timetableData) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = formatDate(tomorrow);
      return { 
        date: dateStr, 
        dayOfWeek: dayNames[getDayOfWeek(tomorrow)] || 'Вторник', 
        lessons: [] 
      };
    }
    
    const weekSchedule = findGroupSchedule(timetableData, groupName);
    if (!weekSchedule) {
      console.warn(`Расписание для группы ${groupName} не найдено`);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = formatDate(tomorrow);
      return { 
        date: dateStr, 
        dayOfWeek: dayNames[getDayOfWeek(tomorrow)] || 'Вторник', 
        lessons: [] 
      };
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const config = getConfigFromFile();
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
  } catch (error) {
    console.error('Ошибка получения расписания на завтра:', error);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = formatDate(tomorrow);
    return { 
      date: dateStr, 
      dayOfWeek: dayNames[getDayOfWeek(tomorrow)] || 'Вторник', 
      lessons: [] 
    };
  }
}

export function getWeekScheduleFromDate(groupName: string, startDate: Date, subgroup: number | null): DaySchedule[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData) {
    return [];
  }
  
  const groupSchedule = findGroupSchedule(timetableData, groupName);
  if (!groupSchedule) {
    return [];
  }
  
  const config = getConfigFromFile();
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

export function getCurrentWeekSchedule(groupName: string, subgroup: number | null): DaySchedule[] {
  try {
    const today = new Date();
    // Находим понедельник текущей недели
    const weekStart = getWeekStart(today);
    weekStart.setHours(0, 0, 0, 0);
    return getWeekScheduleFromDate(groupName, weekStart, subgroup);
  } catch (error) {
    console.error('Ошибка получения расписания на неделю:', error);
    return [];
  }
}

// Функции для получения списка групп и структуры данных

export function getAvailableInstitutions(): string[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData) {
    return [];
  }
  
  if (timetableData.institutions) {
    return Object.keys(timetableData.institutions);
  }
  
  return [];
}

export function getAvailableFaculties(institutionName?: string): string[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData) {
    return [];
  }
  
  const faculties: string[] = [];
  
  // Проверяем новую структуру с учебными заведениями
  if (timetableData.institutions) {
    if (institutionName) {
      const institution = timetableData.institutions[institutionName];
      if (institution && institution.faculties) {
        return Object.keys(institution.faculties);
      }
    } else {
      for (const instName in timetableData.institutions) {
        const institution = timetableData.institutions[instName];
        if (institution.faculties) {
          faculties.push(...Object.keys(institution.faculties));
        }
      }
      return faculties;
    }
  }
  
  // Обратная совместимость со старой структурой
  if (timetableData.faculties) {
    return Object.keys(timetableData.faculties);
  }
  
  return [];
}

export function getStudyFormatsForFaculty(facultyName: string): string[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData || !timetableData.faculties || !timetableData.faculties[facultyName]) {
    return [];
  }
  return Object.keys(timetableData.faculties[facultyName]);
}

export function getDegreesForFacultyAndFormat(facultyName: string, studyFormat: string): string[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData || !timetableData.faculties || !timetableData.faculties[facultyName] || !timetableData.faculties[facultyName][studyFormat]) {
    return [];
  }
  return Object.keys(timetableData.faculties[facultyName][studyFormat]);
}

export function getCoursesForFacultyFormatDegree(facultyName: string, studyFormat: string, degree: string): number[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData || !timetableData.faculties || !timetableData.faculties[facultyName] || !timetableData.faculties[facultyName][studyFormat] || !timetableData.faculties[facultyName][studyFormat][degree]) {
    return [];
  }
  
  const degreeData = timetableData.faculties[facultyName][studyFormat][degree];
  // Проверяем, есть ли курсы в структуре
  if (typeof degreeData === 'object' && !Array.isArray(degreeData)) {
    const courses: number[] = [];
    for (const courseKey in degreeData) {
      const courseNum = parseInt(courseKey);
      if (!isNaN(courseNum)) {
        courses.push(courseNum);
      }
    }
    return courses.sort((a, b) => a - b);
  }
  return [];
}

export function getGroupsForFacultyFormatDegreeCourse(facultyName: string, studyFormat: string, degree: string, course: number): string[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData || !timetableData.faculties || !timetableData.faculties[facultyName] || !timetableData.faculties[facultyName][studyFormat] || !timetableData.faculties[facultyName][studyFormat][degree]) {
    return [];
  }
  
  const degreeData = timetableData.faculties[facultyName][studyFormat][degree];
  const courseKey = course.toString();
  
  // Проверяем, есть ли курсы в структуре
  if (typeof degreeData === 'object' && !Array.isArray(degreeData) && degreeData[courseKey]) {
    return Object.keys(degreeData[courseKey]);
  }
  
  return [];
}

export function getGroupsForFacultyFormatDegree(facultyName: string, studyFormat: string, degree: string): string[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData || !timetableData.faculties || !timetableData.faculties[facultyName] || !timetableData.faculties[facultyName][studyFormat] || !timetableData.faculties[facultyName][studyFormat][degree]) {
    return [];
  }
  
  const degreeData = timetableData.faculties[facultyName][studyFormat][degree];
  const groups: string[] = [];
  
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
  
  return groups;
}

export function getAvailableSubgroups(groupName: string): number[] {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData) {
    return [];
  }
  
  const weekSchedule = findGroupSchedule(timetableData, groupName);
  if (!weekSchedule) {
    return [];
  }
  
  const subgroups = new Set<number>();
  
  // Проходим по всем дням недели (нечетная и четная)
  const weekTypes: ('odd_week' | 'even_week')[] = ['odd_week', 'even_week'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
  
  for (const weekType of weekTypes) {
    for (const day of days) {
      const lessons = weekSchedule[weekType][day] || [];
      for (const lesson of lessons) {
        if (lesson.subgroup !== null && lesson.subgroup !== undefined) {
          subgroups.add(lesson.subgroup);
        }
      }
    }
  }
  
  return Array.from(subgroups).sort((a, b) => a - b);
}

export function getAvailableGroups(): string[] {
  const timetableData = loadTimetableDataFromFile();
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

// Загрузка данных из forparser.json для страницы практики
function loadForParserData() {
  // Пробуем разные пути в зависимости от того, где запущен сервер
  const possiblePaths = [
    path.join(__dirname, '../../data/forparser.json'),
    path.join(process.cwd(), 'data/forparser.json'),
    path.join(process.cwd(), 'miniapp/api/../../data/forparser.json'),
  ];

  for (const forParserPath of possiblePaths) {
    if (fs.existsSync(forParserPath)) {
      try {
        const content = fs.readFileSync(forParserPath, 'utf-8');
        console.log('Загружен forparser.json из:', forParserPath);
        return JSON.parse(content);
      } catch (error) {
        console.error('Ошибка загрузки forparser.json из', forParserPath, ':', error);
      }
    }
  }

  console.error('Файл forparser.json не найден. Проверенные пути:', possiblePaths);
  return null;
}

// Загрузка данных о компаниях для практики
function loadPracticeCompaniesData() {
  // Пробуем разные пути в зависимости от того, где запущен сервер
  const possiblePaths = [
    path.join(__dirname, '../../data/practice-companies.json'),
    path.join(process.cwd(), 'data/practice-companies.json'),
    path.join(process.cwd(), 'miniapp/api/../../data/practice-companies.json'),
  ];

  for (const practiceCompaniesPath of possiblePaths) {
    if (fs.existsSync(practiceCompaniesPath)) {
      try {
        const content = fs.readFileSync(practiceCompaniesPath, 'utf-8');
        console.log('Загружен practice-companies.json из:', practiceCompaniesPath);
        return JSON.parse(content);
      } catch (error) {
        console.error('Ошибка загрузки practice-companies.json из', practiceCompaniesPath, ':', error);
      }
    }
  }

  console.error('Файл practice-companies.json не найден. Проверенные пути:', possiblePaths);
  return null;
}

// Получение структуры учебных заведений и факультетов для страницы практики
export function getPracticeInstitutionsStructure() {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return { institutions: [] };
  }

  const structure: any = {
    institutions: []
  };

  // Структура: { "ЧувГУ им. И. Н. Ульянова": { "Факультет": [компании] } }
  for (const institutionName in practiceCompaniesData) {
    const institution = practiceCompaniesData[institutionName];
    const institutionData: any = {
      name: institutionName,
      faculties: []
    };

    for (const facultyName in institution) {
      const faculty = institution[facultyName];
      // Проверяем, что это массив компаний (факультет)
      if (Array.isArray(faculty)) {
        institutionData.faculties.push({
          name: facultyName
        });
      }
    }

    structure.institutions.push(institutionData);
  }

  return structure;
}

// Получение компаний для выбранного учебного заведения и факультета
export function getPracticeCompanies(institutionName: string, facultyName: string) {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return [];
  }

  if (
    practiceCompaniesData[institutionName] &&
    practiceCompaniesData[institutionName][facultyName]
  ) {
    return practiceCompaniesData[institutionName][facultyName];
  }

  return [];
}

// Получение всех уникальных тегов для фильтрации (для всего университета)
export function getAllPracticeTags() {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return [];
  }

  const tagsSet = new Set<string>();

  for (const institutionName in practiceCompaniesData) {
    const institution = practiceCompaniesData[institutionName];
    for (const facultyName in institution) {
      const companies = institution[facultyName];
      if (Array.isArray(companies)) {
        for (const company of companies) {
          if (company.tags && Array.isArray(company.tags)) {
            for (const tag of company.tags) {
              tagsSet.add(tag);
            }
          }
        }
      }
    }
  }

  return Array.from(tagsSet).sort();
}

// Получение тегов для конкретного факультета
export function getPracticeTagsForFaculty(institutionName: string, facultyName: string) {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return [];
  }

  const tagsSet = new Set<string>();

  if (
    practiceCompaniesData[institutionName] &&
    practiceCompaniesData[institutionName][facultyName]
  ) {
    const companies = practiceCompaniesData[institutionName][facultyName];
    if (Array.isArray(companies)) {
      for (const company of companies) {
        if (company.tags && Array.isArray(company.tags)) {
          for (const tag of company.tags) {
            tagsSet.add(tag);
          }
        }
      }
    }
  }

  return Array.from(tagsSet).sort();
}

export function getGroupsStructure(institutionName?: string) {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData) {
    return { institutions: [] };
  }
  
  // Проверяем новую структуру с учебными заведениями
  if (timetableData.institutions) {
    const structure: any = {
      institutions: []
    };
    
    const institutionsToProcess = institutionName 
      ? { [institutionName]: timetableData.institutions[institutionName] }
      : timetableData.institutions;
    
    for (const instName in institutionsToProcess) {
      const institution = institutionsToProcess[instName];
      const institutionData: any = {
        name: instName,
        faculties: []
      };
      
      if (institution.faculties) {
        for (const facultyName in institution.faculties) {
          const faculty = institution.faculties[facultyName];
          const facultyData: any = {
            name: facultyName,
            formats: []
          };
          
          for (const studyFormat in faculty) {
            const format = faculty[studyFormat];
            const formatData: any = {
              name: studyFormat,
              degrees: []
            };
            
            for (const degree in format) {
              const degreeData = format[degree];
              const degreeInfo: any = {
                name: degree
              };
              
              if (typeof degreeData === 'object' && !Array.isArray(degreeData)) {
                const courses: any[] = [];
                for (const courseKey in degreeData) {
                  const courseNum = parseInt(courseKey);
                  if (!isNaN(courseNum)) {
                    const courseGroups = degreeData[courseKey];
                    if (typeof courseGroups === 'object' && !Array.isArray(courseGroups)) {
                      courses.push({
                        number: courseNum,
                        groups: Object.keys(courseGroups)
                      });
                    }
                  }
                }
                if (courses.length > 0) {
                  degreeInfo.courses = courses;
                } else {
                  degreeInfo.groups = Object.keys(degreeData);
                }
              } else {
                degreeInfo.groups = Object.keys(degreeData);
              }
              
              formatData.degrees.push(degreeInfo);
            }
            
            facultyData.formats.push(formatData);
          }
          
          institutionData.faculties.push(facultyData);
        }
      }
      
      structure.institutions.push(institutionData);
    }
    
    return structure;
  }
  
  // Обратная совместимость со старой структурой (без institutions)
  if (timetableData.faculties) {
    const structure: any = {
      faculties: []
    };
    
    for (const facultyName in timetableData.faculties) {
      const faculty = timetableData.faculties[facultyName];
      const facultyData: any = {
        name: facultyName,
        formats: []
      };
      
      for (const studyFormat in faculty) {
        const format = faculty[studyFormat];
        const formatData: any = {
          name: studyFormat,
          degrees: []
        };
        
        for (const degree in format) {
          const degreeData = format[degree];
          const degreeInfo: any = {
            name: degree
          };
          
          if (typeof degreeData === 'object' && !Array.isArray(degreeData)) {
            const courses: any[] = [];
            for (const courseKey in degreeData) {
              const courseNum = parseInt(courseKey);
              if (!isNaN(courseNum)) {
                const courseGroups = degreeData[courseKey];
                if (typeof courseGroups === 'object' && !Array.isArray(courseGroups)) {
                  courses.push({
                    number: courseNum,
                    groups: Object.keys(courseGroups)
                  });
                }
              }
            }
            if (courses.length > 0) {
              degreeInfo.courses = courses;
            } else {
              degreeInfo.groups = Object.keys(degreeData);
            }
          } else {
            degreeInfo.groups = Object.keys(degreeData);
          }
          
          formatData.degrees.push(degreeInfo);
        }
        
        facultyData.formats.push(formatData);
      }
      
      structure.faculties.push(facultyData);
    }
    
    return structure;
  }
  
  return { institutions: [] };
}

// Извлекает преподавателей из расписания группы
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

// Функции для работы с преподавателями
export function getAllTeachers(): string[] {
  try {
    const timetable = loadTimetableDataFromFile();
    if (!timetable) return [];
    
    const teachers = new Set<string>();
    
    // Проходим по всем группам и извлекаем преподавателей
    // Проверяем новую структуру с учебными заведениями
    if (timetable.institutions) {
      for (const institutionName in timetable.institutions) {
        const institution = timetable.institutions[institutionName];
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
    if (timetable.faculties) {
      for (const facultyName in timetable.faculties) {
        const faculty = timetable.faculties[facultyName];
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
  } catch (error) {
    console.error('Ошибка получения списка преподавателей:', error);
    return [];
  }
}

export function searchTeachers(query: string): string[] {
  try {
    const allTeachers = getAllTeachers();
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return [];
    
    return allTeachers.filter(teacher => 
      teacher.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Ошибка поиска преподавателей:', error);
    return [];
  }
}

export function getFavoriteTeachers(userId: string): string[] {
  const database = getDatabase();
  if (!database) return [];
  
  const stmt = database.prepare('SELECT teacher_name FROM favorite_teachers WHERE user_id = ?');
  const results = stmt.all(userId) as Array<{ teacher_name: string }>;
  return results.map(r => r.teacher_name);
}

export function addFavoriteTeacher(userId: string, teacherName: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  
  try {
    const stmt = database.prepare('INSERT OR IGNORE INTO favorite_teachers (user_id, teacher_name) VALUES (?, ?)');
    stmt.run(userId, teacherName);
    return true;
  } catch {
    return false;
  }
}

export function removeFavoriteTeacher(userId: string, teacherName: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  
  try {
    const stmt = database.prepare('DELETE FROM favorite_teachers WHERE user_id = ? AND teacher_name = ?');
    stmt.run(userId, teacherName);
    return true;
  } catch {
    return false;
  }
}

// Проверяет, является ли строка именем преподавателя
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

// Нормализация имени преподавателя - убирает титулы и (ДОТ)
// "доц.  к.т.н. Андреева А. А." -> "Андреева А. А."
// "Аринина Н. Н. (ДОТ)" -> "Аринина Н. Н."
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

// Создает маппинг нормализованных имен к оригинальным
function createTeacherNameMapping(): Map<string, string> {
  const timetableData = loadTimetableDataFromFile();
  const mapping = new Map<string, string>();
  
  if (!timetableData) {
    return mapping;
  }

  // Проходим по всем группам и создаем маппинг
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
              
              for (const weekType of ['odd_week', 'even_week'] as const) {
                const week = groupSchedule[weekType];
                for (const day of Object.values(week)) {
                  for (const lesson of day) {
                    if (lesson.teacher && lesson.teacher.trim()) {
                      const originalName = lesson.teacher.trim();
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
          }
        }
      }
    }
  }
  
  return mapping;
}

// Кэш маппинга имен
let teacherNameMappingCache: Map<string, string> | null = null;

// Получает оригинальное имя преподавателя по нормализованному
function getOriginalTeacherName(normalizedName: string): string {
  if (!teacherNameMappingCache) {
    teacherNameMappingCache = createTeacherNameMapping();
  }
  
  return teacherNameMappingCache.get(normalizedName) || normalizedName;
}

// Получение полного расписания преподавателя в формате WeekSchedule
function getTeacherWeekScheduleFull(teacherName: string): WeekSchedule | null {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData) return null;

  // Нормализуем имя преподавателя для поиска
  const normalizedSearchName = normalizeTeacherName(teacherName);
  
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

  // Проходим по всем группам и собираем занятия преподавателя
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
              
              // Проверяем обе недели
              for (const weekType of ['odd_week', 'even_week'] as const) {
                const week = groupSchedule[weekType];
                for (const dayKey in week) {
                  const day = week[dayKey as keyof typeof week];
                  for (const lesson of day) {
                    // Сравниваем как оригинальное имя, так и нормализованное
                    const lessonTeacher = lesson.teacher?.trim() || '';
                    if (lessonTeacher) {
                      const normalizedLessonTeacher = normalizeTeacherName(lessonTeacher);
                      // Сравниваем нормализованные имена
                      if (normalizedLessonTeacher === normalizedSearchName || 
                          lessonTeacher === teacherName.trim()) {
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
              }
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

// Получение расписания преподавателя на неделю (начиная с указанной даты)
export function getTeacherWeekSchedule(teacherName: string, startDate: Date): DaySchedule[] {
  const weekScheduleFull = getTeacherWeekScheduleFull(teacherName);
  if (!weekScheduleFull) {
    return [];
  }

  const config = getConfigFromFile();
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

