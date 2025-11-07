import express from 'express';
import cors from 'cors';
import {
  initDatabase,
  getUser,
  createUser,
  updateUserGroup,
  toggleNotifications,
  toggleEventsSubscription,
  getActiveDeadlines,
  addDeadline,
  deleteDeadline,
  getUpcomingEvents,
  getTodaySchedule,
  getTomorrowSchedule,
  getCurrentWeekSchedule,
  getAllTeachers,
  searchTeachers,
  getFavoriteTeachers,
  addFavoriteTeacher,
  removeFavoriteTeacher,
  getGroupsStructure,
  getAvailableSubgroups,
  getWeekNumber,
  getTeacherWeekSchedule,
  getWeekScheduleFromDate,
  getPracticeInstitutionsStructure,
  getPracticeCompanies,
  getAllPracticeTags,
  getPracticeTagsForFaculty,
} from './shared-utils';

const app = express();
const PORT = 3001;

// Инициализация базы данных
initDatabase();

app.use(cors());
app.use(express.json());

// API Routes

// Расписание
app.get('/api/schedule/today', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const user = getUser(userId) || createUser(userId);
    
    if (!user || !user.group_name) {
      return res.status(400).json({ error: 'Группа не указана' });
    }

    const schedule = getTodaySchedule(user.group_name, user.subgroup);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/schedule/tomorrow', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const user = getUser(userId) || createUser(userId);
    
    if (!user || !user.group_name) {
      return res.status(400).json({ error: 'Группа не указана' });
    }

    const schedule = getTomorrowSchedule(user.group_name, user.subgroup);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/schedule/week', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const user = getUser(userId) || createUser(userId);
    
    if (!user || !user.group_name) {
      return res.status(400).json({ error: 'Группа не указана' });
    }

    // Если указана дата начала недели, используем её
    const weekStartParam = req.query.weekStart as string;
    if (weekStartParam) {
      const weekStart = new Date(weekStartParam);
      const schedule = getWeekScheduleFromDate(user.group_name, weekStart, user.subgroup);
      return res.json(schedule);
    }

    // Иначе возвращаем текущую неделю
    const schedule = getCurrentWeekSchedule(user.group_name, user.subgroup);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// События
app.get('/api/events', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const events = getUpcomingEvents(days);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/events/subscription', (req, res) => {
  try {
    const { userId, subscribed } = req.body;
    toggleEventsSubscription(userId, subscribed);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Дедлайны
app.get('/api/deadlines', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const deadlines = getActiveDeadlines(userId);
    res.json(deadlines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deadlines', (req, res) => {
  try {
    const { userId, title, dueDate, description } = req.body;
    const deadline = addDeadline(userId, title, dueDate, description);
    res.json(deadline);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/deadlines/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;
    deleteDeadline(userId, parseInt(id));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deadlines/notifications', (req, res) => {
  try {
    const { userId, enabled } = req.body;
    toggleNotifications(userId, enabled);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Преподаватели
app.get('/api/teachers', (req, res) => {
  try {
    const teachers = getAllTeachers();
    res.json(teachers.map(name => ({ name })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/search', (req, res) => {
  try {
    const query = req.query.query as string;
    const teachers = searchTeachers(query);
    res.json(teachers.map(name => ({ name })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/schedule', (req, res) => {
  try {
    const teacherName = req.query.teacherName as string;
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    // TODO: Реализовать получение расписания преподавателя
    res.json({ teacher: teacherName, lessons: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/teachers/favorites', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const favorites = getFavoriteTeachers(userId);
    res.json(favorites.map(name => ({ name })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teachers/favorites', (req, res) => {
  try {
    const { userId, teacherName } = req.body;
    const success = addFavoriteTeacher(userId, teacherName);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/teachers/favorites', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const teacherName = req.query.teacherName as string;
    const success = removeFavoriteTeacher(userId, teacherName);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Пользователь
app.get('/api/user', (req, res) => {
  try {
    const userId = req.query.userId as string;
    const user = getUser(userId) || createUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/group', (req, res) => {
  try {
    const { userId, groupName, subgroup } = req.body;
    updateUserGroup(userId, groupName, subgroup);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups', (req, res) => {
  try {
    const structure = getGroupsStructure();
    res.json(structure);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Практика
app.get('/api/practice/institutions', (req, res) => {
  console.log('[API] GET /api/practice/institutions');
  try {
    const structure = getPracticeInstitutionsStructure();
    console.log('[API] Структура загружена:', structure);
    res.json(structure);
  } catch (error: any) {
    console.error('[API] Ошибка получения структуры:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/companies', (req, res) => {
  console.log('[API] GET /api/practice/companies', req.query);
  try {
    const institutionName = req.query.institution as string;
    const facultyName = req.query.faculty as string;
    
    if (!institutionName || !facultyName) {
      return res.status(400).json({ error: 'Не указано учебное заведение или факультет' });
    }

    const companies = getPracticeCompanies(institutionName, facultyName);
    console.log('[API] Найдено компаний:', companies.length);
    res.json(companies);
  } catch (error: any) {
    console.error('[API] Ошибка получения компаний:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/tags', (req, res) => {
  console.log('[API] GET /api/practice/tags', req.query);
  try {
    const institutionName = req.query.institution as string;
    const facultyName = req.query.faculty as string;
    
    let tags: string[];
    
    // Если указаны institution и faculty, возвращаем теги только для этого факультета
    if (institutionName && facultyName) {
      tags = getPracticeTagsForFaculty(institutionName, facultyName);
      console.log(`[API] Найдено тегов для ${institutionName} -> ${facultyName}:`, tags.length);
    } else {
      // Иначе возвращаем все теги
      tags = getAllPracticeTags();
      console.log('[API] Найдено всех тегов:', tags.length);
    }
    
    res.json({ tags });
  } catch (error: any) {
    console.error('[API] Ошибка получения тегов:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups/subgroups', (req, res) => {
  try {
    const groupName = req.query.groupName as string;
    if (!groupName) {
      return res.status(400).json({ error: 'Не указано имя группы' });
    }
    const subgroups = getAvailableSubgroups(groupName);
    res.json({ subgroups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/week/current', (req, res) => {
  try {
    const today = new Date();
    const weekNumber = getWeekNumber(today);
    res.json({ weekNumber });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Расписание преподавателя на неделю
app.get('/api/teachers/week-schedule', (req, res) => {
  try {
    const teacherName = req.query.teacherName as string;
    const weekStart = req.query.weekStart as string; // ISO date string
    
    if (!teacherName) {
      return res.status(400).json({ error: 'Не указано имя преподавателя' });
    }

    const startDate = weekStart ? new Date(weekStart) : new Date();
    // Если дата не указана, находим понедельник текущей недели
    if (!weekStart) {
      const dayOfWeek = startDate.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate.setDate(startDate.getDate() + daysUntilMonday);
      startDate.setHours(0, 0, 0, 0);
    }

    const schedule = getTeacherWeekSchedule(teacherName, startDate);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API сервер запущен на порту ${PORT}`);
});

