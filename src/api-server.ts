import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { initDatabase, database } from '../utils/database';
import { getUser, createUser, updateUserGroup, updateUserSubgroup, toggleNotifications, toggleEventsSubscription } from '../utils/users';
import { getTodaySchedule, getTomorrowSchedule, getCurrentWeekSchedule, getNextWeekSchedule, getAvailableFaculties, getStudyFormatsForFaculty, getDegreesForFacultyAndFormat, getGroupsForFacultyFormatDegree, getAvailableSubgroups } from '../utils/timetable';
import { getUpcomingEvents } from '../utils/events';
import { getActiveDeadlines, addDeadline, deleteDeadline } from '../utils/deadlines';
import { getAllTeachers, searchTeachers } from '../utils/teachers';

const app = express();
const PORT = process.env.PORT || 3000;

// Инициализация базы данных
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../mini-app')));

// API Routes

// Получить данные пользователя
app.get('/api/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    let user = getUser(userId);
    
    if (!user) {
      user = createUser(userId);
    }
    
    res.json(user);
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Ошибка получения пользователя' });
  }
});

// Обновить группу пользователя
app.put('/api/user/:userId/group', (req, res) => {
  try {
    const { userId } = req.params;
    const { group_name } = req.body;
    
    updateUserGroup(userId, group_name);
    const user = getUser(userId);
    
    res.json(user);
  } catch (error) {
    console.error('Ошибка обновления группы:', error);
    res.status(500).json({ error: 'Ошибка обновления группы' });
  }
});

// Обновить подгруппу пользователя
app.put('/api/user/:userId/subgroup', (req, res) => {
  try {
    const { userId } = req.params;
    const { subgroup } = req.body;
    
    updateUserSubgroup(userId, subgroup === null ? null : parseInt(subgroup));
    const user = getUser(userId);
    
    res.json(user);
  } catch (error) {
    console.error('Ошибка обновления подгруппы:', error);
    res.status(500).json({ error: 'Ошибка обновления подгруппы' });
  }
});

// Обновить настройку пользователя
app.put('/api/user/:userId/setting', (req, res) => {
  try {
    const { userId } = req.params;
    const { setting, value } = req.body;
    
    if (setting === 'notifications_enabled') {
      toggleNotifications(userId, value === 1);
    } else if (setting === 'events_subscribed') {
      toggleEventsSubscription(userId, value === 1);
    }
    
    const user = getUser(userId);
    res.json(user);
  } catch (error) {
    console.error('Ошибка обновления настройки:', error);
    res.status(500).json({ error: 'Ошибка обновления настройки' });
  }
});

// Получить расписание
app.get('/api/schedule/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query;
    
    const user = getUser(userId);
    if (!user || !user.group_name) {
      return res.status(400).json({ error: 'Группа не выбрана' });
    }
    
    let schedule;
    switch (period) {
      case 'today':
        schedule = getTodaySchedule(user.group_name, user.subgroup);
        res.json(schedule ? [schedule] : []);
        break;
      case 'tomorrow':
        schedule = getTomorrowSchedule(user.group_name, user.subgroup);
        res.json(schedule ? [schedule] : []);
        break;
      case 'week':
        schedule = getCurrentWeekSchedule(user.group_name, user.subgroup);
        res.json(schedule || []);
        break;
      default:
        schedule = getTodaySchedule(user.group_name, user.subgroup);
        res.json(schedule ? [schedule] : []);
    }
  } catch (error) {
    console.error('Ошибка получения расписания:', error);
    res.status(500).json({ error: 'Ошибка получения расписания' });
  }
});

// Получить список групп
app.get('/api/groups', (req, res) => {
  try {
    const faculties = getAvailableFaculties();
    const allGroups: string[] = [];
    
    faculties.forEach(faculty => {
      const formats = getStudyFormatsForFaculty(faculty);
      formats.forEach(format => {
        const degrees = getDegreesForFacultyAndFormat(faculty, format);
        degrees.forEach(degree => {
          const courses = Object.keys(getGroupsForFacultyFormatDegree(faculty, format, degree));
          courses.forEach(course => {
            const groups = Object.keys(getGroupsForFacultyFormatDegree(faculty, format, degree)[course]);
            allGroups.push(...groups);
          });
        });
      });
    });
    
    res.json(allGroups.sort());
  } catch (error) {
    console.error('Ошибка получения групп:', error);
    res.status(500).json({ error: 'Ошибка получения групп' });
  }
});

// Получить подгруппы для группы
app.get('/api/subgroups/:groupName', (req, res) => {
  try {
    const { groupName } = req.params;
    const subgroups = getAvailableSubgroups(groupName);
    res.json(subgroups);
  } catch (error) {
    console.error('Ошибка получения подгрупп:', error);
    res.status(500).json({ error: 'Ошибка получения подгрупп' });
  }
});

// Получить мероприятия
app.get('/api/events', (req, res) => {
  try {
    const events = getUpcomingEvents(7);
    res.json(events);
  } catch (error) {
    console.error('Ошибка получения мероприятий:', error);
    res.status(500).json({ error: 'Ошибка получения мероприятий' });
  }
});

// Получить дедлайны пользователя
app.get('/api/deadlines/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const deadlines = getActiveDeadlines(userId);
    res.json(deadlines);
  } catch (error) {
    console.error('Ошибка получения дедлайнов:', error);
    res.status(500).json({ error: 'Ошибка получения дедлайнов' });
  }
});

// Добавить дедлайн
app.post('/api/deadlines', (req, res) => {
  try {
    const { user_id, title, description, due_date } = req.body;
    
    if (!user_id || !title || !due_date) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }
    
    const deadline = addDeadline(user_id, title, due_date, description);
    res.json(deadline);
  } catch (error) {
    console.error('Ошибка добавления дедлайна:', error);
    res.status(500).json({ error: 'Ошибка добавления дедлайна' });
  }
});

// Удалить дедлайн
app.delete('/api/deadlines/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id обязателен' });
    }
    
    const success = deleteDeadline(parseInt(id), user_id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Дедлайн не найден' });
    }
  } catch (error) {
    console.error('Ошибка удаления дедлайна:', error);
    res.status(500).json({ error: 'Ошибка удаления дедлайна' });
  }
});

// Получить всех преподавателей
app.get('/api/teachers', (req, res) => {
  try {
    const teachers = getAllTeachers();
    res.json(teachers);
  } catch (error) {
    console.error('Ошибка получения преподавателей:', error);
    res.status(500).json({ error: 'Ошибка получения преподавателей' });
  }
});

// Поиск преподавателей
app.get('/api/teachers/search', (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.json([]);
    }
    
    const results = searchTeachers(q);
    res.json(results);
  } catch (error) {
    console.error('Ошибка поиска преподавателей:', error);
    res.status(500).json({ error: 'Ошибка поиска преподавателей' });
  }
});

// Главная страница - отдаем index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../mini-app/index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 API сервер запущен на порту ${PORT}`);
  console.log(`📱 Мини-приложение доступно по адресу: http://localhost:${PORT}`);
});

