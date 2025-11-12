import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, CellHeader, Typography, Button, Flex, Spinner } from '@maxhub/max-ui';
import api, { Schedule } from '../api/client';

function TeacherDetailPage() {
  const { teacherName } = useParams<{ teacherName: string }>();
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<Schedule[]>([]);
  const [nextWeekSchedule, setNextWeekSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState<'current' | 'next'>('current');

  useEffect(() => {
    if (teacherName) {
      loadSchedules();
    }
  }, [teacherName]);

  const loadSchedules = async () => {
    if (!teacherName) return;
    
    setLoading(true);
    try {
      const decodedName = decodeURIComponent(teacherName);
      
      // Получаем понедельник текущей недели
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const currentWeekMonday = new Date(today);
      currentWeekMonday.setDate(today.getDate() + daysUntilMonday);
      currentWeekMonday.setHours(0, 0, 0, 0);

      // Получаем понедельник следующей недели
      const nextWeekMonday = new Date(currentWeekMonday);
      nextWeekMonday.setDate(currentWeekMonday.getDate() + 7);

      const [currentWeek, nextWeek] = await Promise.all([
        api.getTeacherWeekSchedule(decodedName, currentWeekMonday),
        api.getTeacherWeekSchedule(decodedName, nextWeekMonday),
      ]);

      setCurrentWeekSchedule(currentWeek);
      setNextWeekSchedule(nextWeek);
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderLesson = (lesson: any, index: number) => (
    <CellSimple 
      key={index}
      style={{
        borderLeft: '3px solid #2980F2',
      }}
    >
      <Flex direction="column" gap={10}>
        <Flex direction="column" gap={6}>
          <Typography.Body variant="medium" style={{ 
            fontWeight: 600,
            fontSize: 16,
            flex: 1
          }}>
            {lesson.subject}
          </Typography.Body>
          <Typography.Body variant="small" style={{ 
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 500
          }}>
            🕐 {lesson.time}
          </Typography.Body>
        </Flex>
        <Flex direction="column" gap={6}>
          {lesson.room && (
            <Flex align="center" gap={6}>
              <Typography.Body variant="small" style={{ 
                color: 'var(--text-secondary)',
                fontSize: 13
              }}>
                🏛️
              </Typography.Body>
              <Typography.Body variant="small" style={{ 
                color: 'var(--text-secondary)',
                fontSize: 13
              }}>
                {lesson.room}
              </Typography.Body>
            </Flex>
          )}
        </Flex>
      </Flex>
    </CellSimple>
  );

  const renderDaySchedule = (daySchedule: Schedule) => (
    <div key={daySchedule.date} style={{ marginBottom: 24 }}>
      <CellList 
        mode="island" 
        filled 
        style={{ gap: 10 }}
        header={
          <CellHeader>
            <Flex align="center" gap={12}>
              <Typography.Body variant="medium" style={{ 
                fontWeight: 700,
                fontSize: 15,
                color: '#2980F2'
              }}>
                {daySchedule.dayOfWeek}
              </Typography.Body>
              <div style={{
                width: 1,
                height: 16,
                background: 'rgba(60, 53, 242, 0.3)'
              }} />
              <Typography.Body variant="medium" style={{ 
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--text-secondary)'
              }}>
                {daySchedule.date}
              </Typography.Body>
            </Flex>
          </CellHeader>
        }
      >
        {daySchedule.lessons.length === 0 ? (
          <CellSimple>
            <Flex align="center" justify="center" style={{ padding: '20px 0' }}>
              <Typography.Body variant="small" style={{ 
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontStyle: 'italic'
              }}>
                Нет занятий
              </Typography.Body>
            </Flex>
          </CellSimple>
        ) : (
          daySchedule.lessons.map((lesson, index) => renderLesson(lesson, index))
        )}
      </CellList>
    </div>
  );

  const displaySchedule = activeWeek === 'current' ? currentWeekSchedule : nextWeekSchedule;

  if (loading) {
    return (
      <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
        <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
          <Flex justify="center" align="center" style={{ minHeight: '50vh' }}>
            <Spinner size={24} />
          </Flex>
        </div>
      </Container>
    );
  }

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>
        <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
          <Typography.Title style={{ 
            fontSize: 24, 
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 0
          }}>
            {teacherName ? decodeURIComponent(teacherName) : 'Преподаватель'}
          </Typography.Title>

          <Flex gap={10} wrap="wrap" style={{ marginTop: 20, marginBottom: 16 }}>
          <Button
            mode={activeWeek === 'current' ? 'primary' : 'secondary'}
            onClick={() => setActiveWeek('current')}
            style={{ 
              fontWeight: activeWeek === 'current' ? 600 : 500,
              padding: '8px 16px'
            }}
          >
            Текущая неделя
          </Button>
          <Button
            mode={activeWeek === 'next' ? 'primary' : 'secondary'}
            onClick={() => setActiveWeek('next')}
            style={{ 
              fontWeight: activeWeek === 'next' ? 600 : 500,
              padding: '8px 16px'
            }}
          >
            Следующая неделя
          </Button>
          </Flex>
        </div>

        {displaySchedule.length === 0 ? (
          <CellList mode="island" filled>
            <CellSimple>
              <Flex align="center" justify="center" style={{ padding: '40px 0' }}>
                <Flex direction="column" align="center" gap={8}>
                  <Typography.Body variant="medium" style={{ 
                    fontSize: 48,
                    opacity: 0.3
                  }}>
                    📅
                  </Typography.Body>
                  <Typography.Body variant="small" style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: 14
                  }}>
                    Нет занятий на {activeWeek === 'current' ? 'текущую' : 'следующую'} неделю
                  </Typography.Body>
                </Flex>
              </Flex>
            </CellSimple>
          </CellList>
        ) : (
          <Grid gap={20} cols={1}>
            {displaySchedule.map((day) => renderDaySchedule(day))}
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default TeacherDetailPage;

