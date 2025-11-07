import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, Typography, Button, Switch, Flex } from '@maxhub/max-ui';
import api, { Event, User } from '../api/client';

function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, userData] = await Promise.all([
        api.getEvents(7),
        api.getUser(),
      ]);
      setEvents(eventsData);
      setUser(userData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubscription = async (subscribed: boolean) => {
    try {
      await api.toggleEventsSubscription(subscribed);
      if (user) {
        setUser({ ...user, events_subscribed: subscribed ? 1 : 0 });
      }
    } catch (error) {
      console.error('Ошибка изменения подписки:', error);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>
        <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
          <Typography.Title style={{ 
            fontSize: 24, 
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 24
          }}>
            Мероприятия
          </Typography.Title>
        </div>

        {user && (
          <CellList mode="island" filled style={{ marginBottom: 16 }}>
            <CellSimple
              after={
                <Switch
                  checked={user.events_subscribed === 1}
                  onChange={(checked) => toggleSubscription(checked)}
                />
              }
              title="🔔 Уведомления о мероприятиях"
              subtitle={user.events_subscribed === 1 ? 'Включены' : 'Выключены'}
            />
          </CellList>
        )}

        {loading ? (
          <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
            <Flex justify="center" align="center" style={{ padding: '60px 0', minHeight: 200 }}>
              <Flex direction="column" align="center" gap={12}>
                <Typography.Body style={{ color: 'var(--text-secondary)' }}>
                  Загрузка...
                </Typography.Body>
              </Flex>
            </Flex>
          </div>
        ) : events.length === 0 ? (
          <CellList mode="island" filled>
            <CellSimple>
              <Flex align="center" justify="center" style={{ padding: '40px 0' }}>
                <Flex direction="column" align="center" gap={8}>
                  <Typography.Body variant="medium" style={{ 
                    fontSize: 48,
                    opacity: 0.3
                  }}>
                    🎉
                  </Typography.Body>
                  <Typography.Body variant="small" style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: 14
                  }}>
                    Нет предстоящих мероприятий
                  </Typography.Body>
                </Flex>
              </Flex>
            </CellSimple>
          </CellList>
        ) : (
          <CellList mode="island" filled style={{ gap: 12 }}>
            {events.map((event, index) => (
              <CellSimple 
                key={index}
                style={{
                  borderLeft: '3px solid #2980F2',
                }}
              >
                <Flex direction="column" gap={10}>
                  <Typography.Body variant="medium" style={{ 
                    fontWeight: 600,
                    fontSize: 16,
                    lineHeight: 1.4
                  }}>
                    {event.title}
                  </Typography.Body>
                  <Flex direction="column" gap={6}>
                    <Flex align="center" gap={8}>
                      <Typography.Body variant="small" style={{ 
                        color: 'var(--text-secondary)',
                        fontSize: 13
                      }}>
                        📅
                      </Typography.Body>
                      <Typography.Body variant="small" style={{ 
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 500
                      }}>
                        {formatDate(event.date)}
                      </Typography.Body>
                    </Flex>
                    {event.location && (
                      <Flex align="center" gap={8}>
                        <Typography.Body variant="small" style={{ 
                          color: 'var(--text-secondary)',
                          fontSize: 13
                        }}>
                          📍
                        </Typography.Body>
                        <Typography.Body variant="small" style={{ 
                          color: 'var(--text-secondary)',
                          fontSize: 13
                        }}>
                          {event.location}
                        </Typography.Body>
                      </Flex>
                    )}
                    {event.description && (
                      <Typography.Body variant="small" style={{ 
                        color: 'var(--text-secondary)',
                        fontSize: 13,
                        lineHeight: 1.5,
                        marginTop: 4
                      }}>
                        {event.description}
                      </Typography.Body>
                    )}
                  </Flex>
                </Flex>
              </CellSimple>
            ))}
          </CellList>
        )}
      </Grid>
    </Container>
  );
}

export default EventsPage;

