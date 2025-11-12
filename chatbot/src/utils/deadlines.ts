import { database } from './database';

export interface Deadline {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  due_date: string;
  notified: number;
  created_at: string;
}

export function addDeadline(userId: string, title: string, dueDate: string, description?: string): Deadline {
  const stmt = database.prepare(`
    INSERT INTO deadlines (user_id, title, description, due_date)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(userId, title, description || null, dueDate);
  
  return getDeadline(result.lastInsertRowid as number);
}

export function getDeadline(id: number): Deadline {
  const stmt = database.prepare('SELECT * FROM deadlines WHERE id = ?');
  return stmt.get(id) as Deadline;
}

export function getUserDeadlines(userId: string): Deadline[] {
  const stmt = database.prepare(`
    SELECT * FROM deadlines 
    WHERE user_id = ? 
    ORDER BY due_date ASC
  `);
  return stmt.all(userId) as Deadline[];
}

export function getActiveDeadlines(userId: string): Deadline[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadlines = getUserDeadlines(userId);
  
  return deadlines.filter(deadline => {
    const dueDate = parseDate(deadline.due_date);
    return dueDate >= today;
  });
}

export function getUpcomingDeadlines(hours: number = 24): Deadline[] {
  const now = new Date();
  const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
  
  const stmt = database.prepare(`
    SELECT * FROM deadlines 
    WHERE notified = 0 
    AND due_date <= ? 
    AND due_date > ?
    ORDER BY due_date ASC
  `);
  
  const allDeadlines = stmt.all(
    formatDateForDB(future),
    formatDateForDB(now)
  ) as Deadline[];
  
  return allDeadlines;
}

export function markDeadlineNotified(deadlineId: number): void {
  const stmt = database.prepare('UPDATE deadlines SET notified = 1 WHERE id = ?');
  stmt.run(deadlineId);
}

export function deleteDeadline(id: number, userId: string): boolean {
  const stmt = database.prepare('DELETE FROM deadlines WHERE id = ? AND user_id = ?');
  const result = stmt.run(id, userId);
  return result.changes > 0;
}

function parseDate(dateStr: string): Date {
  // Формат: DD.MM.YYYY или YYYY-MM-DD
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  const parts = dateStr.split('.');
  if (parts.length !== 3) {
    return new Date(dateStr);
  }
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  return new Date(year, month, day);
}

function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDeadlines(deadlines: Deadline[]): string {
  if (deadlines.length === 0) {
    return '⏰ Активных дедлайнов нет.';
  }
  
  let text = '⏰ Активные дедлайны:\n\n';
  
  deadlines.forEach(deadline => {
    const dateParts = deadline.due_date.split(/[-.]/);
    const day = parseInt(dateParts[2] || dateParts[0]);
    const month = parseInt(dateParts[1]);
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    const dueDate = parseDate(deadline.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    text += `• ${deadline.title}`;
    if (deadline.description) {
      text += `\n  ${deadline.description}`;
    }
    text += `\n  📅 ${day} ${monthNames[month - 1]}`;
    
    if (daysLeft === 0) {
      text += ' (сегодня!)';
    } else if (daysLeft === 1) {
      text += ' (завтра)';
    } else {
      text += ` (через ${daysLeft} дней)`;
    }
    text += '\n\n';
  });
  
  return text.trim();
}

