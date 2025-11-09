import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Получаем userId из localStorage или используем тестовый
function getUserId(): string {
  // В реальном приложении это должно приходить через MAX Bridge
  return localStorage.getItem('userId') || 'test_user_1';
}

export interface Schedule {
  date: string;
  dayOfWeek: string;
  lessons: Array<{
    time: string;
    subject: string;
    room: string;
    teacher?: string;
    subgroup?: number | null;
    lessonType?: string;
  }>;
}

export interface Event {
  id?: number;
  date: string;
  title: string;
  location?: string;
  description?: string;
  link?: string;
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

export interface Teacher {
  name: string;
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

export const api = {
  // Расписание
  getTodaySchedule: async (): Promise<Schedule | null> => {
    const response = await apiClient.get('/schedule/today', {
      params: { userId: getUserId() },
    });
    return response.data;
  },

  getTomorrowSchedule: async (): Promise<Schedule | null> => {
    const response = await apiClient.get('/schedule/tomorrow', {
      params: { userId: getUserId() },
    });
    return response.data;
  },

      getWeekSchedule: async (weekStart?: Date): Promise<Schedule[]> => {
        const params: any = { userId: getUserId() };
        if (weekStart) {
          params.weekStart = weekStart.toISOString();
        }
        const response = await apiClient.get('/schedule/week', { params });
        return response.data;
      },

  // События
  getEvents: async (days: number = 7): Promise<Event[]> => {
    const response = await apiClient.get('/events', {
      params: { days },
    });
    return response.data;
  },

  toggleEventsSubscription: async (subscribed: boolean): Promise<void> => {
    await apiClient.post('/events/subscription', {
      userId: getUserId(),
      subscribed,
    });
  },

  // Дедлайны
  getDeadlines: async (): Promise<Deadline[]> => {
    const response = await apiClient.get('/deadlines', {
      params: { userId: getUserId() },
    });
    return response.data;
  },

  addDeadline: async (title: string, dueDate: string, description?: string): Promise<Deadline> => {
    const response = await apiClient.post('/deadlines', {
      userId: getUserId(),
      title,
      dueDate,
      description,
    });
    return response.data;
  },

  deleteDeadline: async (id: number): Promise<void> => {
    await apiClient.delete(`/deadlines/${id}`, {
      params: { userId: getUserId() },
    });
  },

  toggleNotifications: async (enabled: boolean): Promise<void> => {
    await apiClient.post('/deadlines/notifications', {
      userId: getUserId(),
      enabled,
    });
  },

  // Преподаватели
  searchTeachers: async (query: string): Promise<Teacher[]> => {
    const response = await apiClient.get('/teachers/search', {
      params: { query },
    });
    return response.data;
  },

  getAllTeachers: async (): Promise<Teacher[]> => {
    const response = await apiClient.get('/teachers');
    return response.data;
  },

  getTeacherSchedule: async (teacherName: string, date?: Date): Promise<any> => {
    const response = await apiClient.get('/teachers/schedule', {
      params: {
        teacherName,
        date: date?.toISOString(),
      },
    });
    return response.data;
  },

  getTeacherWeekSchedule: async (teacherName: string, weekStart?: Date): Promise<Schedule[]> => {
    const response = await apiClient.get('/teachers/week-schedule', {
      params: {
        teacherName,
        weekStart: weekStart?.toISOString(),
      },
    });
    return response.data;
  },

  getFavoriteTeachers: async (): Promise<Teacher[]> => {
    const response = await apiClient.get('/teachers/favorites', {
      params: { userId: getUserId() },
    });
    return response.data;
  },

  addFavoriteTeacher: async (teacherName: string): Promise<void> => {
    await apiClient.post('/teachers/favorites', {
      userId: getUserId(),
      teacherName,
    });
  },

  removeFavoriteTeacher: async (teacherName: string): Promise<void> => {
    await apiClient.delete('/teachers/favorites', {
      params: { userId: getUserId(), teacherName },
    });
  },

  // Настройки
  getUser: async (): Promise<User> => {
    const response = await apiClient.get('/user', {
      params: { userId: getUserId() },
    });
    return response.data;
  },

  updateUserGroup: async (groupName: string, subgroup?: number | null, institutionName?: string | null): Promise<void> => {
    await apiClient.post('/user/group', {
      userId: getUserId(),
      groupName,
      subgroup,
      institutionName,
    });
  },

  updateUserInstitution: async (institutionName: string | null): Promise<void> => {
    await apiClient.post('/user/institution', {
      userId: getUserId(),
      institutionName,
    });
  },

  getAvailableGroups: async (institutionName?: string): Promise<any> => {
    const params: any = {};
    if (institutionName) {
      params.institution = institutionName;
    }
    const response = await apiClient.get('/groups', { params });
    return response.data;
  },

  getAvailableInstitutions: async (): Promise<{ institutions: string[] }> => {
    const response = await apiClient.get('/institutions');
    return response.data;
  },

  getAvailableSubgroups: async (groupName: string): Promise<{ subgroups: number[] }> => {
    const response = await apiClient.get('/groups/subgroups', {
      params: { groupName },
    });
    return response.data;
  },

  getCurrentWeek: async (): Promise<{ weekNumber: number }> => {
    const response = await apiClient.get('/week/current');
    return response.data;
  },

  // Практика
  getPracticeInstitutions: async (): Promise<{ institutions: Array<{ name: string; faculties: Array<{ name: string }> }> }> => {
    const response = await apiClient.get('/practice/institutions');
    return response.data;
  },

  getPracticeCompanies: async (institution: string, faculty: string): Promise<Array<{
    id: string;
    name: string;
    description?: string;
    location?: string;
    tags: string[];
  }>> => {
    const response = await apiClient.get('/practice/companies', {
      params: { institution, faculty },
    });
    return response.data;
  },

  getPracticeTags: async (institution?: string, faculty?: string): Promise<{ tags: string[] }> => {
    const params: any = {};
    if (institution) params.institution = institution;
    if (faculty) params.faculty = faculty;
    const response = await apiClient.get('/practice/tags', { params });
    return response.data;
  },

  // Поддержка (чат с ИИ)
  sendChatMessage: async (messages: Array<{ text: string; sender: 'user' | 'ai' }>): Promise<{ text: string }> => {
    const response = await apiClient.post('/support/chat', { messages });
    return response.data;
  },
};

export default api;

