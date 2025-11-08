import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, Typography, Flex, Button, Spinner } from '@maxhub/max-ui';
import api, { User, Schedule, Event } from '../api/client';

function MainMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<'today' | 'tomorrow' | number>('today');
  const [availableDates, setAvailableDates] = useState<Array<{ label: string; date: string; value: 'today' | 'tomorrow' | number }>>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadAvailableDates();
    loadEvents();
  }, []);

  useEffect(() => {
    loadScheduleForDate();
  }, [selectedDate, user]);

  const loadData = async () => {
    try {
      const userData = await api.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDates = () => {
    const dates: Array<{ label: string; date: string; value: 'today' | 'tomorrow' | number }> = [];
    const today = new Date();
    const dayNames = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

    // Сегодня
    dates.push({
      label: `Сегодня, ${dayNames[today.getDay()]}`,
      date: today.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      value: 'today'
    });

    // Завтра
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    dates.push({
      label: `Завтра, ${dayNames[tomorrow.getDay()]}`,
      date: tomorrow.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      value: 'tomorrow'
    });

    // Следующие 3 дня
    for (let i = 2; i <= 4; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        label: `${date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}, ${dayNames[date.getDay()]}`,
        date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        value: i
      });
    }

    setAvailableDates(dates);
  };

  const loadScheduleForDate = async () => {
    if (!user?.group_name) return;

    setScheduleLoading(true);
    try {
      let data: Schedule | null = null;
      if (selectedDate === 'today') {
        data = await api.getTodaySchedule();
      } else if (selectedDate === 'tomorrow') {
        data = await api.getTomorrowSchedule();
      } else {
        // Для других дат нужно получить недельное расписание и выбрать нужный день
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + selectedDate);
        targetDate.setHours(0, 0, 0, 0);
        
        // Вычисляем начало недели для нужной даты (понедельник)
        const dayOfWeek = targetDate.getDay();
        const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() + daysUntilMonday);
        weekStart.setHours(0, 0, 0, 0);
        
        // Получаем недельное расписание для нужной недели
        const weekSchedule = await api.getWeekSchedule(weekStart);
        
        // Форматируем дату в формате DD.MM.YYYY
        const dateStr = `${String(targetDate.getDate()).padStart(2, '0')}.${String(targetDate.getMonth() + 1).padStart(2, '0')}.${targetDate.getFullYear()}`;
        
        // Ищем нужный день в расписании
        data = Array.isArray(weekSchedule) 
          ? weekSchedule.find(day => day.date === dateStr) || null 
          : null;
      }
      setSchedule(data);
    } catch (error: any) {
      console.error('Ошибка загрузки расписания:', error);
      setSchedule(null);
    } finally {
      setScheduleLoading(false);
    }
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const data = await api.getEvents(7);
      setEvents(data);
    } catch (error: any) {
      console.error('Ошибка загрузки мероприятий:', error);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const renderLesson = (lesson: any, index: number) => {
    const timeParts = lesson.time.split('–');
    const startTime = timeParts[0]?.trim() || '';
    const endTime = timeParts[1]?.trim() || '';
    
    // Извлекаем тип занятия (ЛБ, ЛК, ПР и т.д.) из данных или названия предмета или room
    const getLessonTypeAndRoom = (room: string, subject: string, lessonTypeFromData?: string): { type: string; roomDisplay: string } => {
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
    };
    
    const { type: lessonType, roomDisplay } = getLessonTypeAndRoom(lesson.room, lesson.subject, lesson.lessonType);
    
    // Определяем цвет в зависимости от типа занятия
    const getLessonTypeColor = (type: string): string => {
      const normalizedType = type.toUpperCase();
      switch (normalizedType) {
        case 'ЛК':
          return '#248A3D'; // Темно-зеленый
        case 'ЛБ':
          return '#0051D5'; // Темно-синий
        case 'ПР':
          return '#CC7700'; // Темно-оранжевый
        default:
          return '#0051D5'; // Темно-синий по умолчанию
      }
    };
    
    const lessonTypeColor = lessonType ? getLessonTypeColor(lessonType) : '#0051D5';
    
    return (
      <div 
        key={index} 
        style={{
          marginBottom: 12,
          backgroundColor: '#EFEFEF',
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start'
        }}
      >
        {/* Левая секция - время */}
        <div style={{
          minWidth: 50,
          paddingRight: 16,
          borderRight: '1px solid #DDDDDD',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <Typography.Body variant="small" style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#333333',
            lineHeight: 1.5,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {startTime}
          </Typography.Body>
          {endTime && (
            <Typography.Body variant="small" style={{
              fontSize: 14,
              fontWeight: 400,
              color: '#333333',
              lineHeight: 1.5,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {endTime}
            </Typography.Body>
          )}
          <Typography.Body variant="small" style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#007AFF',
            lineHeight: 1.5,
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            МСК
          </Typography.Body>
        </div>
        
        {/* Правая секция - предмет и детали */}
        <Flex direction="column" gap={6} style={{ flex: 1 }}>
          <Typography.Body variant="medium" style={{
            fontWeight: 400,
            fontSize: 16,
            lineHeight: 1.4,
            color: '#333333',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {lesson.subject.replace(/\s*\([^)]+\)\s*$/, '')}
          </Typography.Body>
          <div style={{
            fontSize: 14,
            fontWeight: 400,
            color: '#333333',
            lineHeight: 1.4,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap'
          }}>
            {lessonType && (
              <span style={{ 
                color: lessonTypeColor,
                fontSize: 16,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
                lineHeight: 1.2
              }}>
                {lessonType}
              </span>
            )}
            <span>{roomDisplay}</span>
            <span style={{ color: '#999999' }}>
              {lesson.subgroup !== null && lesson.subgroup !== undefined 
                ? `${lesson.subgroup} подгруппа`
                : 'Общая пара'}
            </span>
          </div>
        </Flex>
      </div>
    );
  };

  if (loading) {
    return (
      <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 16 }}>
        <Flex direction="column" align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Spinner size={24} />
        </Flex>
      </Container>
    );
  }

  return (
        <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
          <Grid gap={24} cols={1}>
            {/* Заглушки новостей */}
            <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
              <div
                className="hide-scrollbar"
                style={{
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  paddingBottom: 8
                }}
              >
                <Flex gap={12} style={{ minWidth: 'max-content' }}>
                  {[1, 2, 3, 4].map((index) => (
                    <div
                      key={index}
                      style={{
                        width: 120,
                        height: 120,
                        backgroundColor: '#2980F2',
                        borderRadius: 12,
                        flexShrink: 0
                      }}
                    />
                  ))}
                </Flex>
              </div>
            </div>
        {/* Секция Расписание */}
        <div>
          {/* Белый контейнер с скругленными краями */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: '18px',
            marginTop: 8,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ marginBottom: 12 }}>
              <CellSimple
                onClick={() => navigate('/schedule')}
                showChevron
                style={{
                  padding: 0,
                  minHeight: 'auto',
                  cursor: 'pointer'
                }}
              >
                <Typography.Title style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Расписание
                </Typography.Title>
              </CellSimple>
            </div>

            {user?.group_name ? (
              <>
                {/* Табы с датами */}
                <div 
                  className="hide-scrollbar"
                  style={{
                    marginBottom: 16,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  <Flex gap={8} style={{ minWidth: 'max-content' }}>
                    {availableDates.map((date) => (
                      <Button
                        key={date.value}
                        mode={selectedDate === date.value ? 'primary' : 'secondary'}
                        size="small"
                        onClick={() => setSelectedDate(date.value)}
                        style={{
                          fontSize: 13,
                          fontWeight: selectedDate === date.value ? 600 : 500,
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          backgroundColor: selectedDate === date.value ? undefined : '#F5F5F5'
                        }}
                      >
                        {date.label}
                      </Button>
                    ))}
                  </Flex>
                </div>

                {/* Расписание */}
                {scheduleLoading ? (
                  <Flex justify="center" style={{ padding: '20px 0' }}>
                    <Spinner size={20} />
                  </Flex>
                ) : schedule && schedule.lessons.length > 0 ? (
                  <div>
                    {schedule.lessons.map((lesson, index) => renderLesson(lesson, index))}
                  </div>
                ) : schedule && schedule.lessons.length === 0 ? (
                  <div>
                    <CellList mode="island" filled>
                      <CellSimple>
                        <Flex align="center" justify="center" style={{ padding: '20px 0' }}>
                          <Typography.Body variant="small" style={{
                            color: 'var(--text-secondary)',
                            fontSize: 14
                          }}>
                            Выходной день! 🥳
                          </Typography.Body>
                        </Flex>
                      </CellSimple>
                    </CellList>
                  </div>
                ) : (
                  <div>
                    <CellList mode="island" filled>
                      <CellSimple>
                        <Flex align="center" justify="center" style={{ padding: '20px 0' }}>
                          <Typography.Body variant="small" style={{
                            color: 'var(--text-secondary)',
                            fontSize: 14
                          }}>
                            Выберите группу в настройках
                          </Typography.Body>
                        </Flex>
                      </CellSimple>
                    </CellList>
                  </div>
                )}
              </>
            ) : (
              <CellList mode="island" filled>
                <CellSimple onClick={() => navigate('/settings')}>
                  <Flex align="center" justify="center" style={{ padding: '20px 0' }}>
                    <Typography.Body variant="small" style={{
                      color: 'var(--text-secondary)',
                      fontSize: 14
                    }}>
                      Выберите группу в настройках
                    </Typography.Body>
                  </Flex>
                </CellSimple>
              </CellList>
            )}
          </div>
        </div>

        {/* Секция Мероприятия */}
        <div>
          {/* Белый контейнер с скругленными краями */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: '18px',
            marginTop: 8,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ marginBottom: 12 }}>
              <CellSimple
                onClick={() => navigate('/events')}
                showChevron
                style={{
                  padding: 0,
                  minHeight: 'auto',
                  cursor: 'pointer'
                }}
              >
                <Typography.Title style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  Мероприятия
                </Typography.Title>
              </CellSimple>
            </div>

            {/* Мероприятия */}
            {eventsLoading ? (
              <Flex justify="center" style={{ padding: '20px 0' }}>
                <Spinner size={20} />
              </Flex>
            ) : events.length > 0 ? (
              <div>
                {events.slice(0, 3).map((event, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: index < Math.min(events.length, 3) - 1 ? 12 : 0,
                      backgroundColor: '#EFEFEF',
                      borderRadius: 10,
                      padding: '12px 16px',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start'
                    }}
                  >
                    {/* Синий квадрат-заглушка */}
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        backgroundColor: '#2980F2',
                        borderRadius: 10,
                        flexShrink: 0
                      }}
                    />

                    {/* Информация о мероприятии */}
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        minWidth: 0
                      }}
                    >
                      <Typography.Body variant="medium" style={{
                        fontWeight: 600,
                        fontSize: 16,
                        lineHeight: 1.4,
                        color: '#333333'
                      }}>
                        {event.title}
                      </Typography.Body>
                      <Flex direction="column" gap={4}>
                        <Flex align="center" gap={6}>
                          <Typography.Body variant="small" style={{
                            color: '#666666',
                            fontSize: 13
                          }}>
                            📅
                          </Typography.Body>
                          <Typography.Body variant="small" style={{
                            color: '#666666',
                            fontSize: 13
                          }}>
                            {new Date(event.date).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </Typography.Body>
                        </Flex>
                        {event.location && (
                          <Flex align="center" gap={6}>
                            <Typography.Body variant="small" style={{
                              color: '#666666',
                              fontSize: 13
                            }}>
                              📍
                            </Typography.Body>
                            <Typography.Body variant="small" style={{
                              color: '#666666',
                              fontSize: 13
                            }}>
                              {event.location}
                            </Typography.Body>
                          </Flex>
                        )}
                      </Flex>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <CellList mode="island" filled>
                  <CellSimple>
                    <Flex align="center" justify="center" style={{ padding: '20px 0' }}>
                      <Typography.Body variant="small" style={{
                        color: 'var(--text-secondary)',
                        fontSize: 14
                      }}>
                        Нет предстоящих мероприятий
                      </Typography.Body>
                    </Flex>
                  </CellSimple>
                </CellList>
              </div>
            )}
          </div>
        </div>

      </Grid>
    </Container>
  );
}

export default MainMenu;

