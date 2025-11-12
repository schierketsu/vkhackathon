import { Keyboard } from '@maxhub/max-bot-api';

// Тип для inline keyboard
type InlineKeyboard = ReturnType<typeof Keyboard.inlineKeyboard>;

// Главное меню с основными кнопками
export function getMainMenu(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('📅 Расписание', 'menu:schedule'),
      Keyboard.button.callback('👨‍🏫 Преподаватели', 'menu:teachers')
    ],
    [
      Keyboard.button.callback('🎉 Мероприятия', 'menu:events'),
      Keyboard.button.callback('⏰ Дедлайны', 'menu:deadlines')
    ],
    [
      Keyboard.button.callback('💼 Практика', 'menu:practice'),
      Keyboard.button.callback('💬 Поддержка', 'menu:support')
    ],
    [
      Keyboard.button.link('🌐 Открыть сайт', 'https://maxhackathon.ru/')
    ],
    [
      Keyboard.button.callback('👤 Профиль', 'menu:profile'),
      Keyboard.button.callback('🛠️ Сервисы', 'menu:services')
    ],
    [
      Keyboard.button.callback('❔', 'menu:help'),
      Keyboard.button.callback('⚙️', 'menu:settings')
    ]
  ]);
}

// Меню настроек
export function getSettingsMenu(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('🏫 Учебное заведение', 'menu:institution'),
      Keyboard.button.callback('👥 Группа', 'menu:group')
    ],
    [
      Keyboard.button.callback('🔢 Подгруппа', 'menu:subgroup')
    ],
    [
      Keyboard.button.callback('🔔 Уведомления', 'menu:notifications'),
      Keyboard.button.callback('📢 Мероприятия', 'menu:events_subscribe')
    ],
    [
      Keyboard.button.callback('◀️ Назад', 'menu:main')
    ]
  ]);
}

// Меню расписания (главное)
export function getScheduleMainMenu(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('📅 Сегодня', 'menu:today'),
      Keyboard.button.callback('📆 Завтра', 'menu:tomorrow')
    ],
    [
      Keyboard.button.callback('📚 Текущая неделя', 'menu:current_week'),
      Keyboard.button.callback('📆 Следующая неделя', 'menu:next_week')
    ],
    [
      Keyboard.button.callback('👥 Настройки группы', 'menu:group')
    ],
    [
      Keyboard.button.callback('◀️ Главное меню', 'menu:main')
    ]
  ]);
}

// Меню расписания (для ответов с расписанием)
export function getScheduleMenu(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('📅 Сегодня', 'menu:today'),
      Keyboard.button.callback('📆 Завтра', 'menu:tomorrow')
    ],
    [
      Keyboard.button.callback('📚 Текущая неделя', 'menu:current_week'),
      Keyboard.button.callback('📆 Следующая неделя', 'menu:next_week')
    ],
    [
      Keyboard.button.callback('⚙️ Расписание', 'menu:schedule')
    ],
    [
      Keyboard.button.callback('◀️ Главное меню', 'menu:main')
    ]
  ]);
}

// Меню дедлайнов
export function getDeadlinesMenu(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('📋 Список', 'menu:deadlines'),
      Keyboard.button.callback('➕ Добавить', 'menu:add_deadline')
    ],
    [
      Keyboard.button.callback('🔔 Уведомления', 'menu:notifications')
    ],
    [
      Keyboard.button.callback('◀️ Главное меню', 'menu:main')
    ]
  ]);
}

// Меню событий
export function getEventsMenu(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('📋 Список', 'menu:events'),
      Keyboard.button.callback('🔔 Подписка', 'menu:events_subscribe')
    ],
    [
      Keyboard.button.callback('◀️ Главное меню', 'menu:main')
    ]
  ]);
}

// Меню преподавателей
export function getTeachersMenu(hasFavorites: boolean): InlineKeyboard {
  const buttons: any[][] = [
    [
      Keyboard.button.callback('🔍 Поиск', 'menu:teachers_search'),
      Keyboard.button.callback('📋 Все', 'menu:teachers_all')
    ]
  ];
  
  if (hasFavorites) {
    buttons.push([
      Keyboard.button.callback('⭐ Избранные', 'menu:teachers_favorites')
    ]);
  }
  
  buttons.push([
    Keyboard.button.callback('◀️ Главное меню', 'menu:main')
  ]);
  
  return Keyboard.inlineKeyboard(buttons);
}

// Меню расписания преподавателя
export function getTeacherScheduleMenu(teacherName: string, isFavorite: boolean = false): InlineKeyboard {
  const encodedName = encodeURIComponent(teacherName);
  const buttons: any[][] = [
    [
      Keyboard.button.callback('📅 Сегодня', `teacher_schedule:today:${encodedName}`),
      Keyboard.button.callback('📆 Завтра', `teacher_schedule:tomorrow:${encodedName}`)
    ],
    [
      Keyboard.button.callback('📚 Неделя', `teacher_schedule:week:${encodedName}`)
    ]
  ];
  
  if (isFavorite) {
    buttons.push([
      Keyboard.button.callback('❌ Удалить из избранного', `teacher_favorite:remove:${encodedName}`)
    ]);
  } else {
    buttons.push([
      Keyboard.button.callback('⭐ Добавить в избранное', `teacher_favorite:add:${encodedName}`)
    ]);
  }
  
  buttons.push([
    Keyboard.button.callback('◀️ Преподаватели', 'menu:teachers')
  ]);
  
  return Keyboard.inlineKeyboard(buttons);
}

// Меню поиска преподавателей
export function getTeacherSearchMenu(): InlineKeyboard {
  return Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback('◀️ Назад', 'menu:teachers')
    ]
  ]);
}

