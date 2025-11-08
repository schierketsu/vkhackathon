import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'campus.db');
const dbDir = path.dirname(dbPath);

// Создаем директорию data, если её нет
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Инициализация базы данных
export function initDatabase() {
  // Таблица пользователей
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      group_name TEXT,
      subgroup INTEGER,
      notifications_enabled INTEGER DEFAULT 1,
      events_subscribed INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Добавляем поле subgroup, если его нет (для существующих БД)
  try {
    db.exec('ALTER TABLE users ADD COLUMN subgroup INTEGER');
  } catch (e) {
    // Колонка уже существует, игнорируем
  }

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

  // Таблица мероприятий
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT,
      description TEXT,
      link TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

  console.log('✅ База данных инициализирована');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const database: any = db;

