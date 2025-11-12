import express from 'express';
import cors from 'cors';
import axios from 'axios';
import {
  initDatabase,
  getUser,
  createUser,
  updateUserGroup,
  updateUserInstitution,
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
  getAvailableInstitutions,
  getAvailableSubgroups,
  getWeekNumber,
  getTeacherWeekSchedule,
  getWeekScheduleFromDate,
  getPracticeInstitutionsStructure,
  getPracticeCompanies,
  getAllPracticeTags,
  getPracticeTagsForFaculty,
  createPracticeApplication,
  getUserPracticeApplications,
  hasUserAppliedToCompany,
  deletePracticeApplication,
  PracticeApplication,
  createCompanyReview,
  getCompanyReviews,
  getUserCompanyReview,
  getCompanyRating,
  deleteCompanyReview,
  CompanyReview,
} from './shared-utils';

const app = express();
const PORT = process.env.PORT || 3002;

// Токен Qwen API от ai.io.net
// Получен с: https://ai.io.net/ai/api-keys
const QWEN_API_TOKEN = process.env.QWEN_API_TOKEN || 'io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6IjdiMDk5OGIyLWE2NmYtNGVkMy1iNjdhLWRhYzY3MTEyYzVlNyIsImV4cCI6NDkxNjI5MDMyNH0.OEnhQNY8LniHmNQF36Y0xHzRHsAtUHu0kPtGiZk--MCh5uckEFRfehqm9VX2QUVaxJFKPGHPiNYSrZbqOlXRIA';

// API URL и модель для ai.io.net
const IOI_API_URL = 'https://api.intelligence.io.solutions/api/v1';
const IOI_MODEL = 'Qwen/Qwen3-Next-80B-A3B-Instruct';

// Промпт для психолога
const PSYCHOLOGIST_PROMPT = `Ты — добрый и понимающий психолог, который работает со студентами. Твоя главная задача — создать атмосферу тепла, поддержки и понимания.

ВАЖНЫЕ ПРАВИЛА:
1. Будь КРАТКИМ: отвечай 2-4 предложениями, максимум 100-150 слов
2. Будь ТЕПЛЫМ: используй эмпатию, поддерживающие слова, покажи, что понимаешь чувства студента
3. Будь ИСКРЕННИМ: говори от сердца, используй простые, человеческие слова
4. Будь ПОЛЕЗНЫМ: давай практические, конкретные советы, которые можно применить прямо сейчас

Твой стиль общения:
- Очень дружелюбный, теплый и открытый, как близкий друг
- Используй эмпатию: "Понимаю тебя", "Это действительно непросто", "Ты молодец, что делишься"
- Задавай короткие, но важные вопросы для понимания ситуации
- Предлагай простые, практичные решения
- Используй ободряющие слова и выражения поддержки
- Будь искренним и человечным, избегай формальностей
- Говори простым языком, без сложных терминов
- Покажи, что студент не одинок в своих переживаниях

ФОРМАТ ОТВЕТА:
- Начни с проявления понимания и поддержки (1 предложение)
- Дай короткий, но полезный совет или вопрос (1-2 предложения)
- Закончи теплым, ободряющим словом (1 предложение)

Важно: Если студент говорит о серьезных проблемах (суицидальные мысли, тяжелая депрессия), вежливо и тепло порекомендуй обратиться к специалисту очно, но сделай это мягко и поддерживающе.

Помни: твоя главная цель — чтобы студент почувствовал тепло, поддержку и понимание, а не получил длинную лекцию.`;

const dbPath = process.env.DB_PATH;
if (dbPath) {
  initDatabase(dbPath);
} else {
  initDatabase();
}

const allowedOrigins = [
  'http://localhost:3000',
  'https://maxhackathon.ru',
  'http://maxhackathon.ru',
  'https://www.maxhackathon.ru',
  'http://www.maxhackathon.ru',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
    const { userId, groupName, subgroup, institutionName } = req.body;
    updateUserGroup(userId, groupName, subgroup, institutionName);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user/institution', (req, res) => {
  try {
    const { userId, institutionName } = req.body;
    updateUserInstitution(userId, institutionName);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/groups', (req, res) => {
  try {
    const institutionName = req.query.institution as string | undefined;
    const structure = getGroupsStructure(institutionName);
    res.json(structure);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/institutions', (req, res) => {
  try {
    const institutions = getAvailableInstitutions();
    res.json({ institutions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/institutions', (req, res) => {
  try {
    const structure = getPracticeInstitutionsStructure();
    res.json(structure);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/companies', (req, res) => {
  try {
    const institutionName = req.query.institution as string;
    const facultyName = req.query.faculty as string;
    
    if (!institutionName || !facultyName) {
      return res.status(400).json({ error: 'Не указано учебное заведение или факультет' });
    }

    const companies = getPracticeCompanies(institutionName, facultyName);
    
    const companiesWithRatings = companies.map(company => {
      try {
        const rating = getCompanyRating(company.id);
        return {
          ...company,
          rating
        };
      } catch (ratingError: any) {
        return {
          ...company,
          rating: 0
        };
      }
    });
    
    res.json(companiesWithRatings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
});

app.get('/api/practice/tags', (req, res) => {
  try {
    const institutionName = req.query.institution as string;
    const facultyName = req.query.faculty as string;
    
    let tags: string[];
    
    if (institutionName && facultyName) {
      tags = getPracticeTagsForFaculty(institutionName, facultyName);
    } else {
      tags = getAllPracticeTags();
    }
    
    res.json({ tags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/applications', (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'Не указан userId' });
    }
    const applications = getUserPracticeApplications(userId);
    res.json(applications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/practice/applications', (req, res) => {
  try {
    const { userId, companyId, companyName } = req.body;
    if (!userId || !companyId || !companyName) {
      return res.status(400).json({ error: 'Не указаны обязательные поля' });
    }
    
    if (hasUserAppliedToCompany(userId, companyId)) {
      return res.status(400).json({ error: 'Заявка на эту компанию уже подана' });
    }
    
    const application = createPracticeApplication(userId, companyId, companyName);
    res.json(application);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/practice/applications/:id', (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'Не указан userId' });
    }
    const success = deletePracticeApplication(userId, parseInt(id));
    if (!success) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/companies/:id', (req, res) => {
  try {
    const companyId = req.params.id;
    const institutionName = req.query.institution as string;
    const facultyName = req.query.faculty as string;
    
    if (!institutionName || !facultyName) {
      return res.status(400).json({ error: 'Не указано учебное заведение или факультет' });
    }
    
    const companies = getPracticeCompanies(institutionName, facultyName);
    const company = companies.find(c => c.id === companyId);
    
    if (!company) {
      return res.status(404).json({ error: 'Компания не найдена' });
    }
    
    const rating = getCompanyRating(companyId);
    const companyWithRating = { ...company, rating };
    
    res.json(companyWithRating);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/companies/:id/reviews', (req, res) => {
  try {
    const companyId = req.params.id;
    const reviews = getCompanyReviews(companyId);
    res.json(reviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/practice/companies/:id/reviews', (req, res) => {
  try {
    const companyId = req.params.id;
    const { userId, rating, comment } = req.body;
    
    if (!userId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Не указаны обязательные поля или неверный рейтинг (1-5)' });
    }
    
    const review = createCompanyReview(userId, companyId, rating, comment);
    res.json(review);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/practice/companies/:id/reviews/my', (req, res) => {
  try {
    const companyId = req.params.id;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'Не указан userId' });
    }
    
    const review = getUserCompanyReview(userId, companyId);
    res.json(review || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/practice/companies/:id/reviews/:reviewId', (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'Не указан userId' });
    }
    
    const success = deleteCompanyReview(userId, parseInt(reviewId));
    if (!success) {
      return res.status(404).json({ error: 'Отзыв не найден' });
    }
    res.json({ success: true });
  } catch (error: any) {
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

app.post('/api/support/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Сообщения не указаны' });
    }

    const qwenMessages = [
      {
        role: 'system',
        content: PSYCHOLOGIST_PROMPT
      },
      ...messages.map((msg: { text: string; sender: string }) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }))
    ];

    let response;
    const errors: string[] = [];

    if (QWEN_API_TOKEN.startsWith('io-v2-')) {
      try {
        const aionetResponse = await axios.post(
          `${IOI_API_URL}/chat/completions`,
          {
            model: IOI_MODEL,
            messages: qwenMessages,
            temperature: 0.8,
            max_tokens: 150,
            top_p: 0.9
          },
          {
            headers: {
              'Authorization': `Bearer ${QWEN_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          }
        );

        if (aionetResponse.data && aionetResponse.data.choices && aionetResponse.data.choices[0]) {
          response = {
            text: aionetResponse.data.choices[0].message.content
          };
        }
      } catch (aionetError: any) {
        const errorMsg = aionetError.response?.data ? JSON.stringify(aionetError.response.data) : aionetError.message;
        errors.push(`ai.io.net: ${errorMsg}`);
      }
    }

    if (!response && QWEN_API_TOKEN.startsWith('io-v2-')) {
      try {
        const aimlapiResponse = await axios.post(
          'https://api.aimlapi.com/v1/chat/completions',
          {
            model: 'qwen/qwen-turbo',
            messages: qwenMessages,
            temperature: 0.7,
            max_tokens: 2000
          },
          {
            headers: {
              'Authorization': `Bearer ${QWEN_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (aimlapiResponse.data && aimlapiResponse.data.choices && aimlapiResponse.data.choices[0]) {
          response = {
            text: aimlapiResponse.data.choices[0].message.content
          };
        }
      } catch (aimlapiError: any) {
        const errorMsg = aimlapiError.response?.data ? JSON.stringify(aimlapiError.response.data) : aimlapiError.message;
        errors.push(`AIMLAPI: ${errorMsg}`);
      }
    }

    if (!response) {
      try {
        const dashscopeResponse = await axios.post(
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            model: 'qwen-turbo',
            input: {
              messages: qwenMessages
            },
            parameters: {
              temperature: 0.7,
              max_tokens: 2000,
              top_p: 0.8
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${QWEN_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (dashscopeResponse.data && dashscopeResponse.data.output && dashscopeResponse.data.output.text) {
          response = {
            text: dashscopeResponse.data.output.text
          };
        } else {
          throw new Error('Неожиданный формат ответа от DashScope API');
        }
      } catch (dashscopeError: any) {
        const errorMsg = dashscopeError.response?.data ? JSON.stringify(dashscopeError.response.data) : dashscopeError.message;
        errors.push(`DashScope: ${errorMsg}`);
      }
    }

    if (!response) {
      const lastUserMessage = messages[messages.length - 1]?.text.toLowerCase() || '';
      const messageLength = lastUserMessage.length;
      let fallbackResponse = '';
      
      if (lastUserMessage.includes('стресс') || lastUserMessage.includes('нерв') || lastUserMessage.includes('тревож')) {
        fallbackResponse = 'Понимаю, как тяжело бывает, когда накатывает стресс или тревога. Ты не один в этом - многие студенты проходят через подобное. Попробуй сделать несколько глубоких вдохов прямо сейчас. Что именно больше всего тебя тревожит?';
      } else if (lastUserMessage.includes('учеба') || lastUserMessage.includes('экзамен') || lastUserMessage.includes('сессия')) {
        fallbackResponse = 'Экзамены - это действительно непросто, и твои переживания абсолютно нормальны. Помни: ты уже делаешь все, что можешь. Разбей большую задачу на маленькие шаги - так будет легче. Как ты обычно справляешься с подготовкой?';
      } else if (lastUserMessage.includes('устал') || lastUserMessage.includes('усталост') || lastUserMessage.includes('выгоран')) {
        fallbackResponse = 'Чувство усталости и выгорания - это серьезный сигнал, который важно услышать. Твое тело и психика просят отдыха. Попробуй сегодня выделить хотя бы час только для себя - для того, что тебе действительно нравится. Что обычно помогает тебе восстановить силы?';
      } else if (lastUserMessage.includes('одинок') || lastUserMessage.includes('друзья') || lastUserMessage.includes('общение')) {
        fallbackResponse = 'Одиночество может быть очень тяжелым чувством. Знай, что ты не один - многие студенты испытывают подобное. Попробуй найти единомышленников через учебу или студенческие активности. Что тебе мешает найти близкое общение?';
      } else {
        const generalResponses = [
          'Понимаю, что тебе непросто. Спасибо, что поделился со мной - это уже важный шаг. Расскажи, что именно тебя беспокоит больше всего?',
          'Ты молодец, что обратился за поддержкой. Это показывает заботу о себе. Давай разберемся вместе - что происходит?',
          'Чувствую, что тебе сейчас нелегко. Ты не один в своих переживаниях - многие студенты сталкиваются с похожими трудностями. Что бы ты хотел обсудить?',
          'Спасибо за доверие. Понимаю, что быть студентом - это непросто. Расскажи, с чем именно ты сейчас борешься?',
          'Важно, что ты здесь и делишься своими чувствами. Это уже проявление силы. Что тебя больше всего беспокоит?'
        ];
        fallbackResponse = generalResponses[messageLength % generalResponses.length];
      }
      
      response = {
        text: fallbackResponse
      };
    }

    if (!response) {
      return res.status(500).json({
        error: 'Не удалось получить ответ',
        details: errors.join('; ')
      });
    }

    res.json({ text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 API сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу: http://localhost:${PORT}/api`);
  if (dbPath) {
    console.log(`🗄️ База данных: ${dbPath}`);
  }
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Порт ${PORT} уже занят. Возможно, сервер уже запущен.`);
    process.exit(1);
  } else {
    console.error('Ошибка запуска сервера:', err);
    process.exit(1);
  }
});

