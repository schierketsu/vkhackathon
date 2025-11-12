import { useState, useEffect } from 'react';
import { CellSimple, CellList, Typography, Switch, Flex, Spinner } from '@maxhub/max-ui';
import api, { Event, User } from '../api/client';
import { formatDate } from '../utils/date';

function EventsPage() {
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

  return (
    <div style={{ flex: 1, paddingTop: 8, paddingBottom: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)', marginBottom: 20 }}>
        {/* Переключатель уведомлений */}
        {user && (
          <CellList mode="island" filled>
            <CellSimple
              after={
                <Switch
                  checked={user.events_subscribed === 1}
                  onChange={(e) => toggleSubscription(e.target.checked)}
                />
              }
            >
              <Flex direction="column" gap={4}>
                <Flex align="center" gap={8}>
                  <img 
                    src="/notification.png" 
                    alt="Notification" 
                    style={{
                      width: 20,
                      height: 20,
                      objectFit: 'contain'
                    }}
                  />
                  <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                    Уведомления о мероприятиях
                  </Typography.Body>
                </Flex>
                <Typography.Body variant="small" style={{ 
                  color: 'var(--text-secondary)',
                  fontSize: 13
                }}>
                  {user.events_subscribed === 1 ? 'Включены' : 'Выключены'}
                </Typography.Body>
              </Flex>
            </CellSimple>
          </CellList>
        )}
      </div>

      {/* Белый контейнер с мероприятиями - на всю ширину */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '18px',
        marginTop: 8,
        width: '100%',
        boxSizing: 'border-box'
      }}>
            {loading ? (
              <Flex justify="center" style={{ padding: '20px 0' }}>
                <Spinner size={20} />
              </Flex>
            ) : events.length === 0 ? (
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
            ) : (
              <div>
                {events.map((event, index) => (
                  <div
                    key={index}
                    style={{
                      marginBottom: index < events.length - 1 ? 12 : 0,
                      backgroundColor: '#F1F2F4',
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
                          <img 
                            src="/calendar.png" 
                            alt="Calendar" 
                            style={{
                              width: 16,
                              height: 16,
                              objectFit: 'contain'
                            }}
                          />
                          <Typography.Body variant="small" style={{
                            color: '#666666',
                            fontSize: 13
                          }}>
                            {formatDate(event.date)}
                          </Typography.Body>
                        </Flex>
                        {event.location && (
                          <Flex align="center" gap={6}>
                            <img 
                              src="/placeholder2.png" 
                              alt="Location" 
                              style={{
                                width: 16,
                                height: 16,
                                objectFit: 'contain'
                              }}
                            />
                            <Typography.Body variant="small" style={{
                              color: '#666666',
                              fontSize: 13
                            }}>
                              {event.location}
                            </Typography.Body>
                          </Flex>
                        )}
                        {event.description && (
                          <Typography.Body variant="small" style={{
                            color: '#666666',
                            fontSize: 13,
                            lineHeight: 1.5,
                            marginTop: 4
                          }}>
                            {event.description}
                          </Typography.Body>
                        )}
                      </Flex>
                    </div>
                  </div>
                ))}
              </div>
            )}
      </div>
    </div>
  );
}

export default EventsPage;

