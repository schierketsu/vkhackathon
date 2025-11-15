import * as cron from 'node-cron';
import { getConfig } from './config';
import { getUser, toggleMorningAlarm } from './users';
import { getTodaySchedule, getTomorrowSchedule, formatSchedule } from './timetable';
import { getUpcomingEvents, formatEvents } from './events';
import { getUpcomingDeadlines, markDeadlineNotified, formatDeadlines, getUserDeadlines } from './deadlines';
import { database } from './database';

export interface BotApi {
  sendMessage: (userId: string, text: string) => Promise<void>;
}

let botApi: BotApi | null = null;

export function setBotApi(api: BotApi) {
  botApi = api;
}

export function startScheduler() {
  const config = getConfig();
  
  // Утренние уведомления (расписание на сегодня + события)
  const morningTime = config.notifications.morning_time.split(':');
  const morningHour = parseInt(morningTime[0]);
  const morningMinute = parseInt(morningTime[1]);
  
  cron.schedule(`${morningMinute} ${morningHour} * * *`, async () => {
    console.log('📅 Отправка утренних уведомлений...');
    await sendMorningNotifications();
  });
  
  // Вечерние уведомления (расписание на завтра)
  const eveningTime = config.notifications.evening_time.split(':');
  const eveningHour = parseInt(eveningTime[0]);
  const eveningMinute = parseInt(eveningTime[1]);
  
  cron.schedule(`${eveningMinute} ${eveningHour} * * *`, async () => {
    console.log('📅 Отправка вечерних уведомлений...');
    await sendEveningNotifications();
  });
  
  // Проверка дедлайнов каждые 6 часов
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Проверка дедлайнов...');
    await checkDeadlines();
  });
  
  // Проверка будильников к первой паре каждые 5 минут
  cron.schedule('*/5 * * * *', async () => {
    await checkMorningAlarms();
  });
  
  console.log('✅ Планировщик уведомлений запущен');
}

async function sendMorningNotifications() {
  if (!botApi) return;
  
  const stmt = database.prepare('SELECT * FROM users WHERE notifications_enabled = 1');
  const users = stmt.all() as any[];
  
  for (const user of users) {
    try {
      let message = `🌅 Доброе утро!\n\n`;
      
      // Расписание на сегодня
      if (user.group_name) {
        const schedule = getTodaySchedule(user.group_name, user.subgroup);
        if (schedule && schedule.lessons.length > 0) {
          message += formatSchedule(schedule) + '\n\n';
        }
      }
      
      // События на сегодня
      if (user.events_subscribed === 1) {
        const today = new Date();
        const todayStr = formatDate(today);
        const events = getUpcomingEvents(1);
        const todayEvents = events.filter(e => e.date === todayStr);
        
        if (todayEvents.length > 0) {
          message += '🎉 События сегодня:\n';
          todayEvents.forEach(event => {
            message += `• ${event.title}`;
            if (event.location) {
              message += ` (${event.location})`;
            }
            message += '\n';
          });
          message += '\n';
        }
      }
      
      // Активные дедлайны
      const deadlines = getUserDeadlines(user.user_id);
      const activeDeadlines = deadlines.filter(d => {
        const dueDate = parseDate(d.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate >= today;
      });
      
      if (activeDeadlines.length > 0) {
        message += '⏰ Активные дедлайны:\n';
        activeDeadlines.slice(0, 3).forEach(deadline => {
          const daysLeft = Math.ceil(
            (parseDate(deadline.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          message += `• ${deadline.title} (через ${daysLeft} дней)\n`;
        });
      }
      
      await botApi.sendMessage(user.user_id, message.trim());
    } catch (error) {
      console.error(`Ошибка при отправке уведомления пользователю ${user.user_id}:`, error);
    }
  }
}

async function sendEveningNotifications() {
  if (!botApi) return;
  
  const stmt = database.prepare('SELECT * FROM users WHERE notifications_enabled = 1');
  const users = stmt.all() as any[];
  
  for (const user of users) {
    try {
      if (!user.group_name) continue;
      
      const schedule = getTomorrowSchedule(user.group_name, user.subgroup);
      if (schedule && schedule.lessons.length > 0) {
        const message = `🌙 Добрый вечер!\n\n📅 Расписание на завтра:\n\n${formatSchedule(schedule)}`;
        await botApi.sendMessage(user.user_id, message);
      }
    } catch (error) {
      console.error(`Ошибка при отправке уведомления пользователю ${user.user_id}:`, error);
    }
  }
}

async function checkDeadlines() {
  if (!botApi) return;
  
  const config = getConfig();
  const hours = config.notifications.deadline_reminder_hours;
  
  const deadlines = getUpcomingDeadlines(hours);
  
  for (const deadline of deadlines) {
    try {
      const user = getUser(deadline.user_id);
      if (!user || user.notifications_enabled === 0) continue;
      
      const dueDate = parseDate(deadline.due_date);
      const now = new Date();
      const hoursLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
      
      let message = `⏰ Напоминание о дедлайне!\n\n`;
      message += `"${deadline.title}"`;
      if (deadline.description) {
        message += `\n${deadline.description}`;
      }
      
      if (hoursLeft <= 24) {
        message += `\n\n⚠️ Осталось ${hoursLeft} часов!`;
      } else {
        const daysLeft = Math.ceil(hoursLeft / 24);
        message += `\n\n⏰ Осталось ${daysLeft} дней`;
      }
      
      await botApi.sendMessage(deadline.user_id, message);
      markDeadlineNotified(deadline.id);
    } catch (error) {
      console.error(`Ошибка при отправке напоминания о дедлайне ${deadline.id}:`, error);
    }
  }
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseDate(dateStr: string): Date {
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

// Получить время начала первой пары из расписания
function getFirstLessonTime(schedule: any): Date | null {
  if (!schedule || !schedule.lessons || schedule.lessons.length === 0) {
    return null;
  }
  
  // Сортируем пары по времени начала
  const sortedLessons = [...schedule.lessons].sort((a, b) => {
    const timeA = a.time.split(/[–-]/)[0].trim();
    const timeB = b.time.split(/[–-]/)[0].trim();
    return timeA.localeCompare(timeB);
  });
  
  const firstLesson = sortedLessons[0];
  if (!firstLesson || !firstLesson.time) {
    return null;
  }
  
  // Извлекаем время начала (формат "08:00–09:35" или "08:00-09:35")
  const timeMatch = firstLesson.time.match(/^(\d{1,2}):(\d{2})/);
  if (!timeMatch) {
    return null;
  }
  
  const hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  
  // Создаем дату на сегодня с временем начала первой пары
  const today = new Date();
  today.setHours(hours, minutes, 0, 0);
  
  return today;
}

// Проверка и отправка будильников к первой паре
async function checkMorningAlarms() {
  if (!botApi) return;
  
  // Получаем пользователей с включенным будильником к первой паре
  const stmt = database.prepare('SELECT * FROM users WHERE morning_alarm_enabled = 1 AND notifications_enabled = 1 AND group_name IS NOT NULL');
  const users = stmt.all() as any[];
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Проверяем только в рабочее время (5:00 - 15:00)
  if (currentMinutes < 5 * 60 || currentMinutes > 15 * 60) {
    return;
  }
  
  for (const user of users) {
    try {
      const schedule = getTodaySchedule(user.group_name, user.subgroup);
      if (!schedule || schedule.lessons.length === 0) {
        continue;
      }
      
      const firstLessonTime = getFirstLessonTime(schedule);
      if (!firstLessonTime) {
        continue;
      }
      
      // Вычисляем разницу во времени в минутах
      const diffMinutes = Math.floor((firstLessonTime.getTime() - now.getTime()) / (1000 * 60));
      
      // Отправляем уведомление за 15 минут до первой пары
      if (diffMinutes === 15) {
        const firstLesson = schedule.lessons.sort((a: any, b: any) => {
          const timeA = a.time.split(/[–-]/)[0].trim();
          const timeB = b.time.split(/[–-]/)[0].trim();
          return timeA.localeCompare(timeB);
        })[0];
        
        let message = `⏰ Будильник! Первая пара через 15 минут!\n\n`;
        message += `${firstLesson.time} — ${firstLesson.subject}`;
        if (firstLesson.room) {
          message += `\n📍 Ауд. ${firstLesson.room}`;
        }
        if (firstLesson.teacher) {
          message += `\n👤 ${firstLesson.teacher}`;
        }
        
        await botApi.sendMessage(user.user_id, message);
      }
      
      // Также отправляем уведомление за 5 минут до первой пары
      if (diffMinutes === 5) {
        const firstLesson = schedule.lessons.sort((a: any, b: any) => {
          const timeA = a.time.split(/[–-]/)[0].trim();
          const timeB = b.time.split(/[–-]/)[0].trim();
          return timeA.localeCompare(timeB);
        })[0];
        
        let message = `🚨 Время собираться! Первая пара через 5 минут!\n\n`;
        message += `${firstLesson.time} — ${firstLesson.subject}`;
        if (firstLesson.room) {
          message += `\n📍 Ауд. ${firstLesson.room}`;
        }
        if (firstLesson.teacher) {
          message += `\n👤 ${firstLesson.teacher}`;
        }
        
        await botApi.sendMessage(user.user_id, message);
      }
    } catch (error) {
      console.error(`Ошибка при проверке будильника для пользователя ${user.user_id}:`, error);
    }
  }
}

