import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as https from 'https';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { WeekSchedule, Lesson } from './timetable';
import { getConfig } from './config';

// Интерфейс для группы
export interface Group {
  value: string;
  name: string;
  ссылка: string;
  faculty?: string;
  studyFormat?: string;
  degree?: string;
  course?: number | null;
}

/**
 * Определение курса по названию группы
 * Берет первые два числа после второго дефиса
 * "25" - 1 курс, "24" - 2 курс, "23" - 3 курс, "22" - 4 курс, "21" - 5 курс
 */
export function getCourseFromGroupName(groupName: string): number | null {
  // Разбиваем по дефисам
  const parts = groupName.split('-');
  if (parts.length < 3) {
    return null;
  }
  
  // Берем часть после второго дефиса
  const afterSecondDash = parts[2];
  
  // Извлекаем первые два числа
  const match = afterSecondDash.match(/^(\d{2})/);
  if (!match) {
    return null;
  }
  
  const yearCode = match[1];
  
  // Маппинг: "25" -> 1, "24" -> 2, "23" -> 3, "22" -> 4, "21" -> 5
  const courseMap: { [key: string]: number } = {
    '25': 1,
    '24': 2,
    '23': 3,
    '22': 4,
    '21': 5
  };
  
  return courseMap[yearCode] || null;
}

// Конфигурация авторизации
const AUTH_CONFIG = {
  email: 'crumplemi@gmail.com',
  password: 'crumcrum666',
  authUrl: 'https://tt.chuvsu.ru/auth',
  baseUrl: 'https://tt.chuvsu.ru'
};

// Создаем экземпляр axios с поддержкой cookies
let axiosInstance: AxiosInstance | null = null;
let cookies: string = '';

/**
 * Инициализация axios с поддержкой cookies
 */
function getAxiosInstance(): AxiosInstance {
  if (!axiosInstance) {
    // Создаем https agent с отключенной проверкой сертификата (для локального использования)
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false
    });
    
    axiosInstance = axios.create({
      baseURL: AUTH_CONFIG.baseUrl,
      timeout: 30000,
      httpsAgent: httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    
    // Перехватываем ответы для сохранения cookies
    axiosInstance.interceptors.response.use((response: AxiosResponse) => {
      const setCookieHeaders = response.headers['set-cookie'] || response.headers['Set-Cookie'];
      if (setCookieHeaders) {
        const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
        const cookieMap = new Map<string, string>();
        
        // Парсим существующие cookies
        if (cookies) {
          cookies.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
              cookieMap.set(name, value);
            }
          });
        }
        
        // Добавляем новые cookies
        cookieArray.forEach((cookie: string) => {
          const [nameValue] = cookie.split(';');
          const [name, value] = nameValue.trim().split('=');
          if (name && value) {
            cookieMap.set(name, value);
          }
        });
        
        // Обновляем строку cookies
        cookies = Array.from(cookieMap.entries())
          .map(([name, value]) => `${name}=${value}`)
          .join('; ');
      }
      return response;
    });
  }
  
  // Добавляем cookies в заголовки, если они есть
  if (cookies) {
    axiosInstance.defaults.headers.common['Cookie'] = cookies;
  }
  
  return axiosInstance;
}

/**
 * Получение пути к папке debug и создание её, если она не существует
 */
function getDebugDir(): string {
  const debugDir = path.join(process.cwd(), 'debug');
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }
  return debugDir;
}

/**
 * Авторизация на сайте
 */
export async function authenticate(): Promise<boolean> {
  try {
    const axios = getAxiosInstance();
    
    // Сначала получаем страницу авторизации для получения cookies
    console.log('🔐 Получение страницы авторизации...');
    const authPageResponse = await axios.get(AUTH_CONFIG.authUrl);
    
    // Парсим HTML для проверки формы
    const $ = cheerio.load(authPageResponse.data);
    
    // Отправляем данные авторизации
    console.log('🔑 Выполнение авторизации...');
    
    // Проверяем, есть ли скрытые поля в форме
    const hiddenInputs = $('input[type="hidden"]');
    const formData = new URLSearchParams();
    
    // Добавляем скрытые поля, если они есть
    hiddenInputs.each((_, input) => {
      const name = $(input).attr('name');
      const value = $(input).attr('value') || '';
      if (name) {
        formData.append(name, value);
      }
    });
    
    // Добавляем данные авторизации
    formData.append('wname', AUTH_CONFIG.email);
    formData.append('wpass', AUTH_CONFIG.password);
    formData.append('wauto', '1'); // 1 = Обучающийся
    formData.append('pertt', '1'); // 1 = ВО (высшее образование)
    formData.append('auth', 'Войти'); // Кнопка отправки
    
    // Проверяем метод формы (обычно POST, но на всякий случай)
    const formMethod = $('#authtt').attr('method') || 'post';
    const formAction = $('#authtt').attr('action') || AUTH_CONFIG.authUrl;
    const submitUrl = formAction.startsWith('http') ? formAction : `${AUTH_CONFIG.baseUrl}${formAction}`;
    
    const response = await axios.post(submitUrl, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': AUTH_CONFIG.authUrl,
        'Origin': AUTH_CONFIG.baseUrl,
        'Cookie': cookies
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Разрешаем 400-е статусы для проверки ошибок
    });
    
    // Проверяем, что авторизация прошла успешно
    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const response$ = cheerio.load(responseText);
    
    // Проверяем наличие ошибки авторизации
    const errorDiv = response$('#errtext');
    const hasErrorText = errorDiv.length > 0 && errorDiv.text().trim().length > 0;
    
    // Проверяем наличие формы авторизации (если она есть, значит авторизация не прошла)
    const authForm = response$('#authtt, form[id*="auth"]');
    const hasAuthForm = authForm.length > 0;
    
    // Проверяем наличие элементов, которые появляются после успешной авторизации
    const hasLoggedInContent = responseText.includes('Расписание занятий') || 
                               responseText.includes('grouptt') ||
                               response$('table').length > 0;
    
    // Проверяем URL редиректа
    const finalUrl = (response as any).request?.res?.responseUrl || 
                     (response as any).config?.url || 
                     response.request?.responseURL || '';
    
    if (hasErrorText) {
      const errorMessage = errorDiv.text().trim();
      console.log(`❌ Ошибка авторизации: ${errorMessage || 'неверный логин или пароль'}`);
      return false;
    }
    
    // Если форма авторизации отсутствует и есть контент после авторизации, или URL не содержит /auth
    if ((!hasAuthForm && hasLoggedInContent) || (finalUrl && !finalUrl.includes('/auth'))) {
      console.log('✅ Авторизация успешна');
      return true;
    }
    
    // Если все еще на странице авторизации без ошибки, возможно нужна дополнительная проверка
    if (hasAuthForm && !hasErrorText) {
      console.log('⚠️  Форма авторизации все еще присутствует, но ошибок нет. Проверяем статус ответа...');
      console.log(`HTTP статус: ${response.status}`);
      console.log(`URL: ${finalUrl || 'не определен'}`);
      // Если статус 200 и форма есть, возможно авторизация не прошла
      if (response.status === 200) {
        console.log('❌ Авторизация не удалась (форма все еще присутствует)');
        return false;
      }
    }
    
    console.log('✅ Авторизация успешна (по умолчанию)');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при авторизации:', error);
    if (axios.isAxiosError(error)) {
      console.error(`HTTP статус: ${error.response?.status}`);
      console.error(`URL: ${error.config?.url}`);
      if (error.response?.data) {
        console.error('Ответ сервера:', error.response.data.substring(0, 500));
      }
    }
    return false;
  }
}

/**
 * Парсинг расписания для группы
 */
export async function parseGroupTimetable(groupUrl: string, groupName: string): Promise<WeekSchedule | null> {
  try {
    const axios = getAxiosInstance();
    
    console.log(`📖 Парсинг расписания для ${groupName}...`);
    
    // Если URL полный, используем его как есть, иначе формируем относительный путь
    let url = groupUrl;
    if (!url.startsWith('http')) {
      // Если относительный путь, добавляем базовый URL
      url = url.startsWith('/') ? `${AUTH_CONFIG.baseUrl}${url}` : `${AUTH_CONFIG.baseUrl}/${url}`;
    }
    
    console.log(`  🔗 URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Referer': AUTH_CONFIG.baseUrl,
        'Cookie': cookies
      },
      validateStatus: (status) => status < 600 // Разрешаем все статусы, чтобы получить ответ даже при ошибках
    });
    
    // Проверяем, что не получили ошибку сервера
    if (response.status >= 500) {
      console.log(`  ⚠️  Сервер вернул ошибку ${response.status} для ${groupName} (возможно, группа не существует или данные недоступны)`);
      return null;
    }
    
    // Проверяем, что это не страница с ошибкой
    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    if (responseText.includes('Application error') || responseText.includes('ОШИБКА!') || responseText.includes('An error occurred')) {
      console.log(`  ⚠️  Страница содержит ошибку для ${groupName}`);
      return null;
    }
    
    // Проверяем, что страница действительно содержит расписание, а не просто ошибку
    if (response.status !== 200) {
      console.log(`  ⚠️  Неожиданный статус ${response.status} для ${groupName}`);
      return null;
    }
    
    const $ = cheerio.load(response.data);
    
    // Сохраняем HTML для отладки (только для первых нескольких групп)
    if (groupName.includes('-25') || groupName.includes('-24')) {
      const debugDir = getDebugDir();
      const safeGroupName = groupName.replace(/[^a-zA-Z0-9]/g, '-');
      const debugPath = path.join(debugDir, `${safeGroupName}.html`);
      fs.writeFileSync(debugPath, $.html(), 'utf-8');
    }
    
    const schedule: WeekSchedule = {
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
    
    // Маппинг дней недели на русском
    const dayMap: { [key: string]: keyof typeof schedule.odd_week } = {
      'Понедельник': 'Monday',
      'Вторник': 'Tuesday',
      'Среда': 'Wednesday',
      'Четверг': 'Thursday',
      'Пятница': 'Friday',
      'Суббота': 'Saturday',
      'Воскресенье': 'Sunday'
    };
    
    // Ищем основную таблицу расписания
    const mainTable = $('#groupstt');
    if (mainTable.length === 0) {
      console.log(`⚠️  Таблица расписания не найдена для ${groupName}`);
      return parseGroupTimetableAlternative($, groupName);
    }
    
    let currentDay: keyof typeof schedule.odd_week | null = null;
    let currentTime = '';
    
    // Проходим по строкам основной таблицы
    mainTable.find('tbody tr').each((rowIndex, row) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      if (cells.length === 0) return;
      
      const rowText = $row.text().trim();
      
      // Проверка на день недели (обычно в строке с серым фоном)
      const bgColor = $row.css('background-color') || '';
      const bg = $row.css('background') || '';
      if ($row.hasClass('trfd') || bgColor.includes('lightgray') || bg.includes('lightgray')) {
        for (const [ruDay, enDay] of Object.entries(dayMap)) {
          if (rowText.includes(ruDay)) {
            currentDay = enDay;
            currentTime = '';
            return;
          }
        }
      }
      
      // Проверка на время (в ячейке с классом trf или trdata)
      const timeCell = cells.eq(0);
      if (timeCell.length > 0) {
        const timeText = timeCell.text().trim();
        const timeMatch = timeText.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
        if (timeMatch) {
          currentTime = `${timeMatch[1]}–${timeMatch[2]}`;
        }
      }
      
      // Ищем ячейки с классом "want" (занятия)
      if (currentDay && currentTime) {
        const lessonsCell = cells.eq(1);
        if (lessonsCell.length > 0) {
          // Ищем вложенные таблицы с ячейками want
          lessonsCell.find('td.want').each((_, wantCell) => {
            const lesson = parseLessonCell($(wantCell), currentTime, $);
            if (lesson) {
              // Определяем неделю на основе звездочек
              const weekType = lesson.weekParity === 'odd' ? 'odd_week' : 
                             lesson.weekParity === 'even' ? 'even_week' : null;
              
              if (weekType && currentDay) {
                // Добавляем занятие в соответствующую неделю
                schedule[weekType][currentDay].push(lesson);
              } else if (currentDay) {
                // Если неделя не указана, добавляем в обе недели (клонируем объект)
                const lessonCopy = { ...lesson };
                schedule.odd_week[currentDay].push({ ...lesson });
                schedule.even_week[currentDay].push(lessonCopy);
              }
            }
          });
        }
      }
    });
    
    // Если расписание пустое, пробуем альтернативный метод парсинга
    const totalLessons = Object.values(schedule.odd_week).reduce((sum, day) => sum + day.length, 0) +
                         Object.values(schedule.even_week).reduce((sum, day) => sum + day.length, 0);
    
    if (totalLessons === 0) {
      console.log(`⚠️  Стандартный парсинг не дал результатов для ${groupName}, пробуем альтернативный метод...`);
      return parseGroupTimetableAlternative($, groupName);
    }
    
    console.log(`✅ Расписание для ${groupName} успешно распарсено (${totalLessons} пар)`);
    return schedule;
  } catch (error) {
    // Обрабатываем ошибки сервера (500) как нормальные случаи
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const responseText = typeof error.response?.data === 'string' 
        ? error.response.data 
        : JSON.stringify(error.response?.data || '');
      
      if (status === 500) {
        console.log(`  ⚠️  Сервер вернул ошибку 500 для ${groupName} (возможно, группа не существует или данные недоступны)`);
        return null;
      }
      
      if (status === 404) {
        console.log(`  ⚠️  Страница не найдена (404) для ${groupName}`);
        return null;
      }
      
      // Проверяем, что это не страница с ошибкой
      if (responseText.includes('Application error') || responseText.includes('ОШИБКА!') || responseText.includes('An error occurred')) {
        console.log(`  ⚠️  Страница содержит ошибку для ${groupName}`);
        return null;
      }
      
      console.error(`❌ Ошибка при парсинге расписания для ${groupName}:`);
      console.error(`HTTP статус: ${status || 'не определен'}`);
      console.error(`URL: ${error.config?.url || 'не определен'}`);
    } else {
      console.error(`❌ Неожиданная ошибка при парсинге расписания для ${groupName}:`, error);
    }
    return null;
  }
}

/**
 * Определение номера недели относительно начала семестра
 */
function getWeekNumber(date: Date): number | null {
  try {
    const config = getConfig();
    if (!config.semester_start) {
      return null;
    }
    
    const semesterStart = new Date(config.semester_start);
    // Находим начало недели (понедельник) для обеих дат
    const dateWeekStart = getWeekStart(date);
    const semesterWeekStart = getWeekStart(semesterStart);
    
    // Разница в миллисекундах
    const diffMs = dateWeekStart.getTime() - semesterWeekStart.getTime();
    // Разница в неделях (начиная с 1)
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    return diffWeeks > 0 ? diffWeeks : null;
  } catch (e) {
    return null;
  }
}

/**
 * Начало недели (понедельник) для даты
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Понедельник = 1
  const result = new Date(d);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Генерация массива номеров недель с учетом четности и исключением замен
 */
function generateWeekNumbers(start: number, end: number, parity: 'odd' | 'even', excludeWeeks: number[]): number[] {
  const weeks: number[] = [];
  
  for (let week = start; week <= end; week++) {
    // Проверяем четность недели (нечетная = 1, 3, 5...; четная = 2, 4, 6...)
    const isOdd = week % 2 === 1;
    const isEven = week % 2 === 0;
    
    // Проверяем, соответствует ли неделя требуемой четности
    const matchesParity = (parity === 'odd' && isOdd) || (parity === 'even' && isEven);
    
    if (matchesParity && !excludeWeeks.includes(week)) {
      weeks.push(week);
    }
  }
  
  return weeks;
}

/**
 * Парсинг ячейки с занятием (td.want)
 * Формат: <sup>*</sup>Б-303 <span style="color: blue;">Информатика</span> (лб) (1 - 16 нед.) <br>Юрьева Е. В.<br><i>2 подгруппа</i>
 */
function parseLessonCell($cell: cheerio.Cheerio<any>, time: string, $: cheerio.CheerioAPI): Lesson | null {
  try {
    // Клонируем элемент для работы
    const cellHtml = $cell.html() || '';
    if (!cellHtml.trim()) return null;
    
    // 1. Определяем неделю по количеству звезд в <sup>
    let weekParity: 'odd' | 'even' | null = null;
    const supElements = $cell.find('sup');
    if (supElements.length > 0) {
      const supText = supElements.first().text().trim();
      const starCount = (supText.match(/\*/g) || []).length;
      if (starCount === 1) {
        weekParity = 'odd'; // Нечетная неделя
      } else if (starCount === 2) {
        weekParity = 'even'; // Четная неделя
      }
    }
    
    // 2. Извлекаем кабинет (обычно после звездочек, до названия дисциплины)
    let room = '';
    const cellText = $cell.text().trim();
    // Убираем звездочки из начала
    const textWithoutStars = cellText.replace(/^\s*\*+\s*/, '');
    // Ищем паттерн кабинета (например, Б-303, Г-201, Дистанционно)
    // Кабинет идет сразу после звездочек, перед названием дисциплины
    const roomMatch = textWithoutStars.match(/^(Дистанционно|[А-ЯЁ]-?\d+[А-ЯЁ]?\d*|[А-ЯЁ]+\d+)\s/);
    if (roomMatch) {
      room = roomMatch[1];
    }
    
    // 3. Извлекаем название дисциплины из <span style="color: blue;">
    let subject = '';
    const subjectSpan = $cell.find('span[style*="color: blue"], span[style*="color:blue"]').first();
    if (subjectSpan.length > 0) {
      subject = subjectSpan.text().trim();
    } else {
      // Если нет синего span, пытаемся извлечь из текста
      // Ищем текст между кабинетом и скобками с видом занятия
      const afterRoom = textWithoutStars.replace(/^Дистанционно\s+|[А-ЯЁ]-?\d+[А-ЯЁ]?\d*\s+/, '');
      const beforeBrackets = afterRoom.split('(')[0].trim();
      if (beforeBrackets) {
        subject = beforeBrackets;
      }
    }
    
    // 4. Извлекаем вид занятия из первой скобки (лб, лк, пр и т.д.)
    let lessonType = '';
    const firstBracketMatch = cellText.match(/\(([^)]+)\)/);
    if (firstBracketMatch) {
      const bracketContent = firstBracketMatch[1].trim();
      // Проверяем, это вид занятия (лб, лк, пр) или недели
      if (/^(лб|лк|пр|ср|кр|экз|зач)$/i.test(bracketContent)) {
        lessonType = bracketContent.toLowerCase();
      }
    }
    
    // 5. Извлекаем преподавателя (обычно после <br>)
    let teacher = '';
    // Находим все <br> элементы
    const allText = $cell.html() || '';
    const parts = allText.split(/<br\s*\/?>/i);
    if (parts.length > 1) {
      // Берем текст после первого <br> (обычно там преподаватель)
      const teacherPart = parts[1];
      // Создаем временный элемент для парсинга
      const tempDiv = $('<div>').html(teacherPart);
      let teacherText = tempDiv.text().trim();
      
      // Убираем подгруппу из текста (если она там есть)
      teacherText = teacherText.replace(/\d+\s+подгрупп[аы]?/gi, '').trim();
      
      // Убираем замены (div с красной рамкой)
      tempDiv.find('div[style*="border"], div[style*="red"]').remove();
      teacherText = tempDiv.text().trim().replace(/\d+\s+подгрупп[аы]?/gi, '').trim();
      
      if (teacherText && !teacherText.match(/^\d+\s*подгрупп[аы]?$/i)) {
        teacher = teacherText;
      }
    }
    
    // 6. Извлекаем подгруппу из <i>...</i> или из текста
    let subgroup: number | null = null;
    const italicElement = $cell.find('i');
    if (italicElement.length > 0) {
      const italicText = italicElement.text().trim();
      // Ищем паттерны: "1 подгруппа", "2 подгруппа", "1 подгруппы" и т.д.
      const subgroupMatch = italicText.match(/(\d+)\s*подгрупп[аы]?/i);
      if (subgroupMatch) {
        subgroup = parseInt(subgroupMatch[1]);
      }
    }
    // Также проверяем весь текст ячейки на наличие подгруппы
    if (subgroup === null) {
      const fullText = $cell.text();
      const subgroupMatch = fullText.match(/(\d+)\s*подгрупп[аы]?/i);
      if (subgroupMatch) {
        subgroup = parseInt(subgroupMatch[1]);
      }
    }
    
    // 7. Извлекаем период проведения пар (1 - 16 нед.) или (5 нед.)
    // Ищем все скобки с неделями, пропуская первую скобку с видом занятия
    let weekRange: { start: number; end: number } | null = null;
    
    // Сначала ищем формат диапазона: (1 - 16 нед.)
    const weekRangeMatch = cellText.match(/\((\d+)\s*[-–]\s*(\d+)\s*нед\.?\)/i);
    if (weekRangeMatch) {
      weekRange = {
        start: parseInt(weekRangeMatch[1]),
        end: parseInt(weekRangeMatch[2])
      };
    } else {
      // Проверяем формат с одной неделей: (5 нед.)
      // Ищем все скобки и проверяем, какая из них содержит неделю
      const allBrackets = cellText.match(/\([^)]+\)/g);
      if (allBrackets) {
        for (const bracket of allBrackets) {
          // Пропускаем скобку, если она содержит вид занятия (лб, лк, пр и т.д.)
          const bracketContent = bracket.replace(/[()]/g, '').trim();
          if (/^(лб|лк|пр|ср|кр|экз|зач)$/i.test(bracketContent)) {
            continue;
          }
          // Проверяем, содержит ли скобка номер недели
          const singleWeekMatch = bracket.match(/\((\d+)\s*нед\.?\)/i);
          if (singleWeekMatch) {
            const weekNum = parseInt(singleWeekMatch[1]);
            weekRange = {
              start: weekNum,
              end: weekNum
            };
            break;
          }
        }
      }
    }
    
    // 8. Извлекаем замены из div с красной рамкой
    const substitutions: Array<{ date: string; teacher?: string; room?: string; note?: string }> = [];
    const substitutionWeekNumbers: number[] = []; // Номера недель с заменами для исключения
    // Ищем все div элементы и проверяем их стиль на наличие красной рамки
    $cell.find('div').each((_, div) => {
      const $div = $(div);
      const style = $div.attr('style') || '';
      // Проверяем, что это div с красной рамкой (border содержит red или border: 2px solid red)
      if (style.includes('border') && style.includes('red')) {
        const divText = $div.text().trim();
        
        // Извлекаем дату
        const dateMatch = divText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        let date = '';
        if (dateMatch) {
          date = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;
          
          // Определяем номер недели для даты замены
          try {
            const subDate = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
            const weekNumber = getWeekNumber(subDate);
            if (weekNumber) {
              substitutionWeekNumbers.push(weekNumber);
            }
          } catch (e) {
            // Игнорируем ошибки парсинга даты
          }
        }
        
        // Извлекаем преподавателя замены
        let subTeacher = '';
        const teacherSpan = $div.find('span.blue, span[class="blue"], span[style*="color: blue"], span[style*="color:blue"]');
        if (teacherSpan.length > 0) {
          subTeacher = teacherSpan.text().trim();
        } else {
          // Ищем текст после "Преподаватель:"
          const teacherMatch = divText.match(/Преподаватель:\s*([^\n\r]+)/);
          if (teacherMatch) {
            subTeacher = teacherMatch[1].trim();
          }
        }
        
        // Извлекаем заметку
        const noteMatch = divText.match(/замена на:\s*([^\n]+)/);
        const note = noteMatch ? noteMatch[1].trim() : '';
        
        if (date || subTeacher || note) {
          substitutions.push({
            date,
            teacher: subTeacher || undefined,
            note: note || undefined
          });
        }
      }
    });
    
    // 9. Генерируем массив недель с учетом четности и исключая замены
    let weeks: number[] | undefined = undefined;
    if (weekRange && weekParity !== null) {
      weeks = generateWeekNumbers(weekRange.start, weekRange.end, weekParity, substitutionWeekNumbers);
    } else if (weekRange) {
      // Если четность не указана, включаем все недели в диапазоне
      weeks = [];
      for (let i = weekRange.start; i <= weekRange.end; i++) {
        if (!substitutionWeekNumbers.includes(i)) {
          weeks.push(i);
        }
      }
    }
    
    // Если не удалось извлечь предмет, пропускаем занятие
    if (!subject) {
      return null;
    }
    
    const lesson: Lesson = {
      time,
      subject,
      room: room || '',
      teacher: teacher || undefined,
      subgroup: subgroup,
      lessonType: lessonType || undefined,
      weekParity: weekParity || null,
      weeks: weeks,
      substitutions: substitutions.length > 0 ? substitutions : undefined
    };
    
    return lesson;
  } catch (error) {
    console.error('Ошибка при парсинге ячейки занятия:', error);
    return null;
  }
}

/**
 * Альтернативный метод парсинга (если основной не работает)
 */
function parseGroupTimetableAlternative($: cheerio.CheerioAPI, groupName: string): WeekSchedule | null {
  const schedule: WeekSchedule = {
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
  
  // Сохраняем HTML для отладки
  const debugDir = getDebugDir();
  const safeGroupName = groupName.replace(/[^a-zA-Z0-9]/g, '-');
  const debugPath = path.join(debugDir, `${safeGroupName}.html`);
  fs.writeFileSync(debugPath, $.html(), 'utf-8');
  console.log(`💾 HTML сохранен для отладки: ${debugPath}`);
  
  // Здесь можно добавить альтернативную логику парсинга
  // Пока возвращаем null, чтобы можно было доработать позже
  
  return null;
}

/**
 * Получение всех групп из forparser.json с информацией о факультете и форме обучения
 */
export function getAllGroupsFromFile(): Group[] {
  const filePath = path.join(process.cwd(), 'data', 'forparser.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ Файл forparser.json не найден');
    return [];
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const groups: Group[] = [];
  
  // Извлекаем все группы из структуры
  // Структура: { "Факультет": { "форма": { "степень": [группы] } } }
  for (const facultyKey in data) {
    const faculty = data[facultyKey];
    for (const formatKey in faculty) {
      const format = faculty[formatKey];
      for (const degreeKey in format) {
        const degreeGroups = format[degreeKey];
        if (Array.isArray(degreeGroups)) {
          // Добавляем информацию о факультете, форме обучения, степени и курсе
          const enrichedGroups = degreeGroups.map((group: Group) => ({
            ...group,
            faculty: facultyKey,
            studyFormat: formatKey,
            degree: degreeKey,
            course: getCourseFromGroupName(group.value)
          }));
          groups.push(...enrichedGroups);
        }
      }
    }
  }
  
  return groups;
}

/**
 * Получение списка всех групп (для обратной совместимости)
 */
export async function getAllGroups(): Promise<Array<{ id: number; name: string }>> {
  // Эта функция больше не используется, так как мы берем группы из файла
  // Но оставляем для обратной совместимости
  return [];
}

