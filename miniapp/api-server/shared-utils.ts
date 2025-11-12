
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

// Путь к БД - настраивается через переменную окружения или по умолчанию
let dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/campus.db');
let db: Database.Database | null = null;

export function setDatabasePath(path: string) {
  dbPath = path;
}

export function initDatabase(customPath?: string) {
  const finalPath = customPath || dbPath;
  
  // Создаем директорию для БД, если её нет
  const dbDir = path.dirname(finalPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  if (!fs.existsSync(finalPath)) {
    // Создаем базу данных если её нет
    db = new Database(finalPath);
  } else {
    db = new Database(finalPath);
  }
  // Всегда создаем таблицы (CREATE TABLE IF NOT EXISTS безопасно)
  createTables();
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

  // Таблица заявок на практику
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  // Таблица отзывов о компаниях
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);
}

export function getDatabase() {
  if (!db) {
    initDatabase();
  }
  if (!db) {
    throw new Error('База данных не инициализирована');
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

function parseDate(dateStr: string): Date {
  // Формат: DD.MM.YYYY или DD.MM.YYYY HH:MM или YYYY-MM-DD
  if (dateStr.includes('-') && !dateStr.includes('.')) {
    // Формат YYYY-MM-DD или YYYY-MM-DDTHH:MM
    return new Date(dateStr);
  }
  
  // Формат DD.MM.YYYY или DD.MM.YYYY HH:MM
  const parts = dateStr.split(' ');
  const datePart = parts[0];
  const timePart = parts[1];
  
  const dateParts = datePart.split('.');
  if (dateParts.length !== 3) {
    return new Date(dateStr);
  }
  
  const day = parseInt(dateParts[0]);
  const month = parseInt(dateParts[1]) - 1;
  const year = parseInt(dateParts[2]);
  
  if (timePart) {
    // Есть время в формате HH:MM
    const timeParts = timePart.split(':');
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    return new Date(year, month, day, hours, minutes);
  }
  
  return new Date(year, month, day);
}

export function getActiveDeadlines(userId: string): Deadline[] {
  const database = getDatabase();
  if (!database) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Получаем все дедлайны пользователя
  const stmt = database.prepare(`
    SELECT * FROM deadlines 
    WHERE user_id = ?
  `);
  const allDeadlines = stmt.all(userId) as Deadline[];
  
  const activeDeadlines = allDeadlines
    .filter(deadline => {
      try {
        const dueDate = parseDate(deadline.due_date);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= today;
      } catch (error) {
        console.error('Ошибка парсинга даты:', deadline.due_date, error);
        return false;
      }
    })
    .sort((a, b) => {
      try {
        const dateA = parseDate(a.due_date);
        const dateB = parseDate(b.due_date);
        return dateA.getTime() - dateB.getTime();
      } catch (error) {
        return 0;
      }
    });
  
  return activeDeadlines;
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

export interface PracticeCompany {
  id: string;
  name: string;
  description: string;
  location: string;
  tags: string[];
}

export function getUpcomingEvents(days: number = 7): Event[] {
  const possiblePaths = [
    path.join(__dirname, '../../data/events.json'),
    path.join(process.cwd(), 'data/events.json'),
    path.join(process.cwd(), 'miniapp/api-server/../../data/events.json'),
  ];
  
  let eventsPath: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      eventsPath = possiblePath;
      break;
    }
  }
  
  if (!eventsPath) {
    return [];
  }
  
  const eventsData = fs.readFileSync(eventsPath, 'utf-8');
  const events = JSON.parse(eventsData) as Event[];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  
  return events.filter(event => {
    const eventDate = parseDate(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today && eventDate <= futureDate;
  });
}

// Функции для работы с расписанием
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
  const possiblePaths = [
    path.join(__dirname, '../../data/timetable.json'),
    path.join(process.cwd(), 'data/timetable.json'),
    path.join(process.cwd(), 'miniapp/api-server/../../data/timetable.json'),
  ];
  
  for (const timetablePath of possiblePaths) {
    if (fs.existsSync(timetablePath)) {
      try {
        const data = fs.readFileSync(timetablePath, 'utf-8');
        return JSON.parse(data) as TimetableData;
      } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
      }
    }
  }
  
  console.error('Файл расписания не найден');
  return null;
}

function getConfigFromFile() {
  const possiblePaths = [
    path.join(__dirname, '../../config.json'),
    path.join(process.cwd(), 'config.json'),
    path.join(process.cwd(), 'miniapp/api-server/../../config.json'),
  ];
  
  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      try {
        const data = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
      } catch (error) {
        console.error('Ошибка загрузки конфига:', error);
      }
    }
  }
  
  return { semester_start: '2025-09-01' };
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
  
  const dateWeekStart = getWeekStart(date);
  dateWeekStart.setHours(0, 0, 0, 0);
  
  const semesterDayOfWeek = semesterStart.getDay();
  let firstWeekMonday: Date;
  
  if (semesterDayOfWeek === 1) {
    firstWeekMonday = new Date(semesterStart);
  } else if (semesterDayOfWeek === 0) {
    firstWeekMonday = new Date(semesterStart);
    firstWeekMonday.setDate(semesterStart.getDate() + 1);
  } else {
    const daysUntilMonday = 8 - semesterDayOfWeek;
    firstWeekMonday = new Date(semesterStart);
    firstWeekMonday.setDate(semesterStart.getDate() + daysUntilMonday);
  }
  firstWeekMonday.setHours(0, 0, 0, 0);
  
  const diffMs = dateWeekStart.getTime() - firstWeekMonday.getTime();
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
    const weekStart = getWeekStart(today);
    weekStart.setHours(0, 0, 0, 0);
    return getWeekScheduleFromDate(groupName, weekStart, subgroup);
  } catch (error) {
    console.error('Ошибка получения расписания на неделю:', error);
    return [];
  }
}

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

export function getGroupsStructure(institutionName?: string) {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData) {
    return { institutions: [] };
  }
  
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

// Функции для работы с преподавателями
function isValidTeacherName(name: string): boolean {
  const trimmed = name.trim();
  
  if (trimmed.length < 3) {
    return false;
  }
  
  if (!/[А-Яа-яЁё]/.test(trimmed)) {
    return false;
  }
  
  if (/^\d+-\d+/.test(trimmed)) {
    return false;
  }
  
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return false;
  }
  
  if (/^[\d\s-]+$/.test(trimmed)) {
    return false;
  }
  
  if (/\(лк|лб|пр|ср|кр|экз|зач|гз|из\)\s*$/i.test(trimmed)) {
    return false;
  }
  
  if (/^[А-Яа-яЁё]+\s+\(лк|лб|пр\)/i.test(trimmed)) {
    return false;
  }
  
  const hasCapitalLetter = /[\u0410-\u042F\u0401]/.test(trimmed);
  if (!hasCapitalLetter) {
    return false;
  }
  
  const hasDot = /\./.test(trimmed);
  if (!hasDot && trimmed.length < 8) {
    return false;
  }
  
  if (/^[\d\s\-\.]+$/.test(trimmed)) {
    return false;
  }
  
  return true;
}

function normalizeTeacherName(name: string): string {
  let normalized = name.trim();
  
  normalized = normalized.replace(/\s*\(ДОТ\)\s*$/i, '').trim();
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
  
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    for (const pattern of titlePatterns) {
      const before = normalized;
      normalized = normalized.replace(pattern, '');
      if (normalized !== before) {
        changed = true;
        normalized = normalized.replace(/\s+/g, ' ').trim();
      }
    }
  }
  
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

function extractTeachersFromSchedule(schedule: WeekSchedule, teachers: Set<string>): void {
  for (const weekType of ['odd_week', 'even_week'] as const) {
    const week = schedule[weekType];
    for (const day of Object.values(week)) {
      for (const lesson of day) {
        if (lesson.teacher && lesson.teacher.trim()) {
          const teacherName = lesson.teacher.trim();
          if (isValidTeacherName(teacherName)) {
            teachers.add(teacherName);
          }
        }
      }
    }
  }
}

export function getAllTeachers(): string[] {
  try {
    const timetable = loadTimetableDataFromFile();
    if (!timetable) return [];
    
    const teachers = new Set<string>();
    
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
    
    const normalizedTeachers = Array.from(teachers)
      .filter(name => isValidTeacherName(name))
      .map(name => normalizeTeacherName(name))
      .filter(name => name.length > 0);
    
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

function getTeacherWeekScheduleFull(teacherName: string): WeekSchedule | null {
  const timetableData = loadTimetableDataFromFile();
  if (!timetableData) return null;

  const normalizedSearchName = normalizeTeacherName(teacherName);
  
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

  const processGroupSchedule = (groupSchedule: WeekSchedule, groupName: string) => {
    for (const weekType of ['odd_week', 'even_week'] as const) {
      const week = groupSchedule[weekType];
      for (const dayKey in week) {
        const day = week[dayKey as keyof typeof week];
        for (const lesson of day) {
          const lessonTeacher = (lesson.teacher && lesson.teacher.trim) ? lesson.teacher.trim() : '';
          if (lessonTeacher) {
            const normalizedLessonTeacher = normalizeTeacherName(lessonTeacher);
            if (normalizedLessonTeacher === normalizedSearchName || 
                lessonTeacher === teacherName.trim()) {
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
  };

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
                  processGroupSchedule(groupSchedule, groupName);
                }
              }
            }
          }
        }
      }
    }
  }

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
              processGroupSchedule(groupSchedule, groupName);
            }
          }
        }
      }
    }
  }

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

// Практика
function loadPracticeCompaniesData() {
  const possiblePaths = [
    path.join(__dirname, '../../data/practice-companies.json'),
    path.join(process.cwd(), 'data/practice-companies.json'),
    path.join(process.cwd(), 'miniapp/api-server/../../data/practice-companies.json'),
  ];

  for (const practiceCompaniesPath of possiblePaths) {
    if (fs.existsSync(practiceCompaniesPath)) {
      try {
        const content = fs.readFileSync(practiceCompaniesPath, 'utf-8');
        return JSON.parse(content);
      } catch (error) {
        console.error('Ошибка загрузки practice-companies.json из', practiceCompaniesPath, ':', error);
      }
    }
  }

  return null;
}

export function getPracticeInstitutionsStructure() {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return { institutions: [] };
  }

  const structure: any = {
    institutions: []
  };

  for (const institutionName in practiceCompaniesData) {
    const institution = practiceCompaniesData[institutionName];
    const institutionData: any = {
      name: institutionName,
      faculties: []
    };

    for (const facultyName in institution) {
      const faculty = institution[facultyName];
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

export function getPracticeCompanies(institutionName: string, facultyName: string): PracticeCompany[] {
  const practiceCompaniesData = loadPracticeCompaniesData();
  if (!practiceCompaniesData) {
    return [];
  }

  if (
    practiceCompaniesData[institutionName] &&
    practiceCompaniesData[institutionName][facultyName]
  ) {
    return practiceCompaniesData[institutionName][facultyName] as PracticeCompany[];
  }

  return [];
}

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

// Заявки на практику
export interface PracticeApplication {
  id: number;
  user_id: string;
  company_id: string;
  company_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export function createPracticeApplication(userId: string, companyId: string, companyName: string): PracticeApplication {
  const database = getDatabase();
  if (!database) throw new Error('База данных не инициализирована');
  
  const stmt = database.prepare(`
    INSERT INTO practice_applications (user_id, company_id, company_name, status)
    VALUES (?, ?, ?, 'pending')
  `);
  const result = stmt.run(userId, companyId, companyName);
  
  return getPracticeApplication(result.lastInsertRowid as number)!;
}

export function getPracticeApplication(id: number): PracticeApplication | null {
  const database = getDatabase();
  if (!database) return null;
  const stmt = database.prepare('SELECT * FROM practice_applications WHERE id = ?');
  return (stmt.get(id) as PracticeApplication) || null;
}

export function getUserPracticeApplications(userId: string): PracticeApplication[] {
  const database = getDatabase();
  if (!database) return [];
  const stmt = database.prepare('SELECT * FROM practice_applications WHERE user_id = ? ORDER BY created_at DESC');
  return (stmt.all(userId) as PracticeApplication[]) || [];
}

export function hasUserAppliedToCompany(userId: string, companyId: string): boolean {
  const database = getDatabase();
  if (!database) return false;
  const stmt = database.prepare('SELECT COUNT(*) as count FROM practice_applications WHERE user_id = ? AND company_id = ?');
  const result = stmt.get(userId, companyId) as { count: number };
  return result.count > 0;
}

export function deletePracticeApplication(userId: string, applicationId: number): boolean {
  const database = getDatabase();
  if (!database) return false;
  const stmt = database.prepare('DELETE FROM practice_applications WHERE id = ? AND user_id = ?');
  const result = stmt.run(applicationId, userId);
  return result.changes > 0;
}

// Отзывы о компаниях
export interface CompanyReview {
  id: number;
  user_id: string;
  company_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export function createCompanyReview(userId: string, companyId: string, rating: number, comment?: string): CompanyReview {
  const database = getDatabase();
  if (!database) throw new Error('База данных не инициализирована');
  
  const existingReview = getUserCompanyReview(userId, companyId);
  if (existingReview) {
    const stmt = database.prepare(`
      UPDATE company_reviews 
      SET rating = ?, comment = ?
      WHERE id = ?
    `);
    stmt.run(rating, comment || null, existingReview.id);
    return getCompanyReview(existingReview.id)!;
  }
  
  const stmt = database.prepare(`
    INSERT INTO company_reviews (user_id, company_id, rating, comment)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(userId, companyId, rating, comment || null);
  
  return getCompanyReview(result.lastInsertRowid as number)!;
}

export function getCompanyReview(id: number): CompanyReview | null {
  const database = getDatabase();
  if (!database) return null;
  const stmt = database.prepare('SELECT * FROM company_reviews WHERE id = ?');
  return (stmt.get(id) as CompanyReview) || null;
}

export function getCompanyReviews(companyId: string): CompanyReview[] {
  const database = getDatabase();
  if (!database) return [];
  const stmt = database.prepare('SELECT * FROM company_reviews WHERE company_id = ? ORDER BY created_at DESC');
  return (stmt.all(companyId) as CompanyReview[]) || [];
}

export function getUserCompanyReview(userId: string, companyId: string): CompanyReview | null {
  const database = getDatabase();
  if (!database) return null;
  const stmt = database.prepare('SELECT * FROM company_reviews WHERE user_id = ? AND company_id = ?');
  return (stmt.get(userId, companyId) as CompanyReview) || null;
}

export function getCompanyRating(companyId: string): number {
  try {
    const database = getDatabase();
    const stmt = database.prepare('SELECT AVG(rating) as avg_rating FROM company_reviews WHERE company_id = ?');
    const result = stmt.get(companyId) as { avg_rating: number | null } | undefined;
    if (!result || result.avg_rating === null) {
      return 0;
    }
    return Math.round(result.avg_rating * 100) / 100;
  } catch (error) {
    console.error('Ошибка получения рейтинга компании:', error);
    return 0;
  }
}

export function deleteCompanyReview(userId: string, reviewId: number): boolean {
  const database = getDatabase();
  if (!database) return false;
  const stmt = database.prepare('DELETE FROM company_reviews WHERE id = ? AND user_id = ?');
  const result = stmt.run(reviewId, userId);
  return result.changes > 0;
}

