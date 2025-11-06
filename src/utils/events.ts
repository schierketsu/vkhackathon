import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from './config';
import { database } from './database';

export interface Event {
  id?: number;
  date: string;
  title: string;
  location?: string;
  description?: string;
  link?: string;
}

export function loadEventsFromFile(): Event[] {
  const config = getConfig();
  const eventsPath = path.join(process.cwd(), config.events_source);
  
  if (!fs.existsSync(eventsPath)) {
    return [];
  }

  const eventsData = fs.readFileSync(eventsPath, 'utf-8');
  return JSON.parse(eventsData) as Event[];
}

export function loadEventsFromDB(): Event[] {
  const stmt = database.prepare('SELECT * FROM events ORDER BY date ASC');
  return stmt.all() as Event[];
}

export function getAllEvents(): Event[] {
  const dbEvents = loadEventsFromDB();
  const fileEvents = loadEventsFromFile();
  
  // Объединяем события из БД и файла
  const allEvents = [...dbEvents, ...fileEvents];
  
  // Сортируем по дате
  return allEvents.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });
}

export function getUpcomingEvents(days: number = 7): Event[] {
  const events = getAllEvents();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  
  return events.filter(event => {
    const eventDate = parseDate(event.date);
    return eventDate >= today && eventDate <= futureDate;
  });
}

export function addEvent(event: Event): void {
  const stmt = database.prepare(`
    INSERT INTO events (date, title, location, description, link)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    event.date,
    event.title,
    event.location || null,
    event.description || null,
    event.link || null
  );
}

function parseDate(dateStr: string): Date {
  // Формат: DD.MM.YYYY
  const parts = dateStr.split('.');
  if (parts.length !== 3) {
    return new Date(dateStr);
  }
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);
  return new Date(year, month, day);
}

export function formatEvents(events: Event[]): string {
  if (events.length === 0) {
    return '🎓 Мероприятий на ближайшее время не запланировано.';
  }
  
  let text = '🎓 Ближайшие мероприятия:\n\n';
  
  events.forEach(event => {
    const dateParts = event.date.split('.');
    const day = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const monthNames = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    text += `• ${day} ${monthNames[month - 1]} — ${event.title}`;
    if (event.location) {
      text += ` (${event.location})`;
    }
    if (event.description) {
      text += `\n  ${event.description}`;
    }
    text += '\n\n';
  });
  
  return text.trim();
}

