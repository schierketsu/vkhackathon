import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, Typography, Button, Spinner, Flex } from '@maxhub/max-ui';
import api, { Schedule } from '../api/client';

function SchedulePage() {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // Находим понедельник текущей недели
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysUntilMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  useEffect(() => {
    loadSchedule();
  }, [currentWeekStart]);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const data = await api.getWeekSchedule(currentWeekStart);
      setSchedule(data);
    } catch (error: any) {
      console.error('Ошибка загрузки расписания:', error);
      if (error.response?.status === 400) {
        alert('Сначала выберите группу в настройках');
        navigate('/settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const formatWeekDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const result = new Date(d);
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  };

  const getWeekNumber = (date: Date): number => {
    // Начало семестра - 1 сентября
    const semesterStart = new Date(new Date().getFullYear(), 8, 1); // 8 = сентябрь (0-indexed)
    semesterStart.setHours(0, 0, 0, 0);
    
    const dateWeekStart = getWeekStart(date);
    dateWeekStart.setHours(0, 0, 0, 0);
    
    const semesterDayOfWeek = semesterStart.getDay();
    let firstWeekMonday: Date;
    
    if (semesterDayOfWeek === 1) {
      firstWeekMonday = new Date(semesterStart);
    } else if (semesterDayOfWeek === 0) {
      firstWeekMonday = new Date(semesterStart);
      firstWeekMonday.setDate(semesterStart.getDate() + 1);
    } else {
      const daysUntilMonday = 8 - semesterDayOfWeek;
      firstWeekMonday = new Date(semesterStart);
      firstWeekMonday.setDate(semesterStart.getDate() + daysUntilMonday);
    }
    firstWeekMonday.setHours(0, 0, 0, 0);
    
    const diffMs = dateWeekStart.getTime() - firstWeekMonday.getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    return diffWeeks > 0 ? diffWeeks : 1;
  };

  const getAvailableWeeks = () => {
    const weeks: Array<{ number: number; startDate: Date; label: string }> = [];
    
    // Начало семестра - 1 сентября
    const semesterStart = new Date(new Date().getFullYear(), 8, 1); // 8 = сентябрь (0-indexed)
    semesterStart.setHours(0, 0, 0, 0);
    
    const semesterDayOfWeek = semesterStart.getDay();
    let firstWeekMonday: Date;
    
    if (semesterDayOfWeek === 1) {
      firstWeekMonday = new Date(semesterStart);
    } else if (semesterDayOfWeek === 0) {
      firstWeekMonday = new Date(semesterStart);
      firstWeekMonday.setDate(semesterStart.getDate() + 1);
    } else {
      const daysUntilMonday = 8 - semesterDayOfWeek;
      firstWeekMonday = new Date(semesterStart);
      firstWeekMonday.setDate(semesterStart.getDate() + daysUntilMonday);
    }
    firstWeekMonday.setHours(0, 0, 0, 0);
    
    // Генерируем 16 недель семестра
    for (let i = 0; i < 16; i++) {
      const weekStart = new Date(firstWeekMonday);
      weekStart.setDate(firstWeekMonday.getDate() + i * 7);
      const weekNumber = i + 1;
      weeks.push({
        number: weekNumber,
        startDate: weekStart,
        label: `${weekNumber} неделя с ${formatWeekDate(weekStart)}`
      });
    }
    
    return weeks;
  };

  const formatDayDate = (dateStr: string): string => {
    // dateStr формат: "DD.MM.YYYY" или "DD.MM"
    const parts = dateStr.split('.');
    if (parts.length < 2) return dateStr;

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();

    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    return `${day} ${months[month - 1]}`;
  };

  const getLessonTypeAndRoom = (room: string, subject: string, lessonTypeFromData?: string): { type: string; roomDisplay: string } => {
    if (lessonTypeFromData) {
      return {
        type: lessonTypeFromData.toUpperCase(),
        roomDisplay: room
      };
    }

    const subjectMatch = subject.match(/\(([ЛБКПРСлбкпрс]{2,3})\)/);
    if (subjectMatch) {
      return {
        type: subjectMatch[1].toUpperCase(),
        roomDisplay: room
      };
    }

    const roomMatch = room.match(/^([ЛБКПРСлбкпрс]{2,3})\s+(.+)$/);
    if (roomMatch) {
      return {
        type: roomMatch[1].toUpperCase(),
        roomDisplay: roomMatch[2]
      };
    }

    const isRoomNumber = /^[А-Яа-яЁё]-\d+/.test(room);
    if (isRoomNumber) {
      return { type: '', roomDisplay: room };
    }

    return { type: '', roomDisplay: room };
  };

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
        return '#0051D5';
    }
  };

  const renderLesson = (lesson: any, index: number) => {
    const timeParts = lesson.time.split('–');
    const startTime = timeParts[0]?.trim() || '';
    const endTime = timeParts[1]?.trim() || '';

    const { type: lessonType, roomDisplay } = getLessonTypeAndRoom(lesson.room, lesson.subject, lesson.lessonType);
    const lessonTypeColor = lessonType ? getLessonTypeColor(lessonType) : '#0051D5';

    const subgroupText = lesson.subgroup !== null && lesson.subgroup !== undefined 
      ? `${lesson.subgroup} подгруппа`
      : 'Общая пара';

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
            <span style={{ color: '#999999' }}>{subgroupText}</span>
          </div>
        </Flex>
      </div>
    );
  };

  const renderDaySchedule = (daySchedule: Schedule) => {
    const dayName = daySchedule.dayOfWeek;
    const formattedDate = formatDayDate(daySchedule.date);
    const fullDayText = `${dayName}, ${formattedDate} по МСК`;

    return (
      <div key={daySchedule.date} style={{ marginBottom: 20 }}>
        {/* Белый контейнер с скругленными краями - на всю ширину */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 20,
          padding: '18px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Заголовок дня */}
          <Typography.Title style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#000000',
            marginBottom: 0,
            marginTop: 0
          }}>
            {fullDayText}
          </Typography.Title>

          {/* Карточки занятий */}
          <div style={{ marginTop: 20 }}>
            {daySchedule.lessons.length === 0 ? (
              <div style={{
                backgroundColor: '#EFEFEF',
                borderRadius: 10,
                padding: '20px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <span style={{ fontSize: 24 }}>🎒</span>
                <Flex direction="column" gap={4}>
                  <Typography.Body variant="medium" style={{
                    fontSize: 16,
                    fontWeight: 400,
                    color: '#333333'
                  }}>
                    Нет занятий
                  </Typography.Body>
                  <Typography.Body variant="small" style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: '#999999'
                  }}>
                    Занятий нет
                  </Typography.Body>
                </Flex>
              </div>
            ) : (
              daySchedule.lessons.map((lesson, index) => renderLesson(lesson, index))
            )}
          </div>
        </div>
      </div>
    );
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisWeekMonday = new Date(today);
    thisWeekMonday.setDate(today.getDate() + daysUntilMonday);
    thisWeekMonday.setHours(0, 0, 0, 0);

    return currentWeekStart.getTime() === thisWeekMonday.getTime();
  };

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>
        {/* Навигация по неделям */}
        <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
          <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
            <Flex direction="column" gap={4} style={{ flex: 1 }}>
              <Flex align="center" gap={8}>
                <Typography.Body variant="medium" style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#000000'
                }}>
                  {isCurrentWeek() ? 'Текущая неделя' : 'Неделя'} с {formatWeekDate(currentWeekStart)}
                </Typography.Body>
                <button
                  onClick={() => setShowWeekPicker(!showWeekPicker)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: 'none',
                    backgroundColor: '#F5F5F5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: 16,
                    color: '#666666',
                    padding: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E8E8E8';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F5F5F5';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ›
                </button>
              </Flex>
              <Typography.Body variant="small" style={{
                fontSize: 14,
                fontWeight: 400,
                color: '#999999'
              }}>
                {isCurrentWeek() ? 'Текущая' : 'Другая неделя'}
              </Typography.Body>
            </Flex>
            <Flex gap={8}>
              <button
                onClick={() => navigateWeek('prev')}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: '#F5F5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: 20,
                  color: '#000000',
                  fontWeight: 400,
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E8E8E8';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                ←
              </button>
              <button
                onClick={() => navigateWeek('next')}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: '#F5F5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: 20,
                  color: '#000000',
                  fontWeight: 400,
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E8E8E8';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                →
              </button>
            </Flex>
          </Flex>
          
          {/* Выпадающее меню выбора недели */}
          {showWeekPicker && (
            <div style={{
              marginTop: 12,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E8E8E8',
              maxHeight: 300,
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              {getAvailableWeeks().map((week, index) => {
                const isSelected = week.startDate.getTime() === currentWeekStart.getTime();
                return (
                  <div
                    key={index}
                    onClick={() => {
                      setCurrentWeekStart(week.startDate);
                      setShowWeekPicker(false);
                    }}
                    style={{
                      padding: '14px 16px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#F0F7FF' : 'transparent',
                      borderBottom: index < getAvailableWeeks().length - 1 ? '1px solid #F5F5F5' : 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = '#F5F5F5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Typography.Body variant="medium" style={{
                      fontSize: 15,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? '#2980F2' : '#000000'
                    }}>
                      {week.label}
                    </Typography.Body>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Расписание */}
        {loading ? (
          <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
            <Flex justify="center" style={{ padding: '40px 0' }}>
              <Spinner size={24} />
            </Flex>
          </div>
        ) : schedule.length > 0 ? (
          <div>
            {schedule.map((day) => renderDaySchedule(day))}
          </div>
        ) : (
          <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
            <CellList mode="island" filled>
              <CellSimple>
                <Typography.Body variant="small" style={{ color: 'var(--text-secondary)' }}>
                  Нет данных
                </Typography.Body>
              </CellSimple>
            </CellList>
          </div>
        )}
      </Grid>
    </Container>
  );
}

export default SchedulePage;
