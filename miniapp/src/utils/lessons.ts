/**
 * Утилиты для работы с занятиями
 */

export interface LessonTypeAndRoom {
  type: string;
  roomDisplay: string;
}

/**
 * Извлекает тип занятия (ЛК, ЛБ, ПР и т.д.) и отображаемое название аудитории
 */
export function getLessonTypeAndRoom(
  room: string,
  subject: string,
  lessonTypeFromData?: string
): LessonTypeAndRoom {
  // 1. Если тип занятия есть в данных, используем его
  if (lessonTypeFromData) {
    return {
      type: lessonTypeFromData.toUpperCase(),
      roomDisplay: room
    };
  }

  // 2. Ищем тип занятия в названии предмета в скобках (например, "Предмет (ЛБ)")
  const subjectMatch = subject.match(/\(([ЛБКПРСлбкпрс]{2,3})\)/);
  if (subjectMatch) {
    return {
      type: subjectMatch[1].toUpperCase(),
      roomDisplay: room
    };
  }

  // 3. Извлекаем из room, если там есть тип в начале (например, "ЛБ Б-116")
  const roomMatch = room.match(/^([ЛБКПРСлбкпрс]{2,3})\s+(.+)$/);
  if (roomMatch) {
    return {
      type: roomMatch[1].toUpperCase(),
      roomDisplay: roomMatch[2]
    };
  }

  // 4. Если room начинается с букв (например, "Б-116"), это не тип занятия
  // Проверяем, не является ли это просто номером аудитории
  const isRoomNumber = /^[А-Яа-яЁё]-\d+/.test(room);
  if (isRoomNumber) {
    return { type: '', roomDisplay: room };
  }

  return { type: '', roomDisplay: room };
}

/**
 * Возвращает цвет для типа занятия
 */
export function getLessonTypeColor(type: string): string {
  const normalizedType = type.toUpperCase();
  switch (normalizedType) {
    case 'ЛК':
      return '#08824D'; // Синий
    case 'ЛБ':
      return '#348AF6'; // Зеленый
    case 'ПР':
      return '#FF9D06'; // Оранжевый
    default:
      return '#348AF6'; // Синий по умолчанию
  }
}

