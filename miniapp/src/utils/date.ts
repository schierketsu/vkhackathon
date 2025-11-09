/**
 * Утилиты для работы с датами
 */

/**
 * Парсит строку даты в различных форматах
 * Поддерживает: DD.MM.YYYY, DD.MM.YYYY HH:MM, YYYY-MM-DD, YYYY-MM-DDTHH:MM
 */
export function parseDate(dateStr: string): Date {
  // Формат YYYY-MM-DD или YYYY-MM-DDTHH:MM
  if (dateStr.includes('-') && !dateStr.includes('.')) {
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

/**
 * Форматирует дату в формат DD.MM.YYYY
 */
export function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Вычисляет количество дней до указанной даты
 * Возвращает отрицательное число, если дата прошла
 */
export function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = parseDate(dateStr);
  deadline.setHours(0, 0, 0, 0);
  const diff = deadline.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Форматирует дату недели в формат DD.MM
 */
export function formatWeekDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

/**
 * Получает начало недели (понедельник) для указанной даты
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const result = new Date(d);
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

