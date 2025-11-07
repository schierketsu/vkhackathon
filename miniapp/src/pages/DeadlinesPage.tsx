import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, Typography, Button, Input, Switch, Flex } from '@maxhub/max-ui';
import api, { Deadline, User } from '../api/client';

function DeadlinesPage() {
  const navigate = useNavigate();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDeadline, setNewDeadline] = useState({
    title: '',
    dueDate: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deadlinesData, userData] = await Promise.all([
        api.getDeadlines(),
        api.getUser(),
      ]);
      setDeadlines(deadlinesData);
      setUser(userData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeadline = async () => {
    if (!newDeadline.title || !newDeadline.dueDate) {
      alert('Заполните название и дату');
      return;
    }

    try {
      await api.addDeadline(
        newDeadline.title,
        newDeadline.dueDate,
        newDeadline.description || undefined
      );
      setNewDeadline({ title: '', dueDate: '', description: '' });
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error('Ошибка добавления дедлайна:', error);
      alert('Ошибка добавления дедлайна');
    }
  };

  const handleDeleteDeadline = async (id: number) => {
    if (!confirm('Удалить дедлайн?')) return;

    try {
      await api.deleteDeadline(id);
      loadData();
    } catch (error) {
      console.error('Ошибка удаления дедлайна:', error);
      alert('Ошибка удаления дедлайна');
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    try {
      await api.toggleNotifications(enabled);
      if (user) {
        setUser({ ...user, notifications_enabled: enabled ? 1 : 0 });
      }
    } catch (error) {
      console.error('Ошибка изменения уведомлений:', error);
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

  const getDaysUntil = (dateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dateStr);
    deadline.setHours(0, 0, 0, 0);
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>
        <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)} 
            mode={showAddForm ? 'secondary' : 'primary'}
            style={{ 
              fontWeight: 600,
              padding: '12px 20px',
              marginTop: 0
            }}
          >
            {showAddForm ? '✕ Отмена' : '+ Добавить дедлайн'}
          </Button>
        </div>

        {user && (
          <CellList mode="island" filled style={{ marginBottom: 16 }}>
            <CellSimple
              after={
                <Switch
                  checked={user.notifications_enabled === 1}
                  onChange={(checked) => toggleNotifications(checked)}
                />
              }
              title="🔔 Уведомления о дедлайнах"
              subtitle={user.notifications_enabled === 1 ? 'Включены' : 'Выключены'}
            />
          </CellList>
        )}

        {showAddForm && (
          <CellList mode="island" filled style={{ marginBottom: 16 }}>
            <CellSimple>
              <Grid gap={14} cols={1}>
                <Input
                  placeholder="Название дедлайна"
                  value={newDeadline.title}
                  onChange={(e) => setNewDeadline({ ...newDeadline, title: e.target.value })}
                  style={{ fontSize: 14 }}
                />
                <Input
                  type="date"
                  placeholder="Дата"
                  value={newDeadline.dueDate}
                  onChange={(e) => setNewDeadline({ ...newDeadline, dueDate: e.target.value })}
                  style={{ fontSize: 14 }}
                />
                <Input
                  placeholder="Описание (необязательно)"
                  value={newDeadline.description}
                  onChange={(e) => setNewDeadline({ ...newDeadline, description: e.target.value })}
                  style={{ fontSize: 14 }}
                />
                <Button 
                  onClick={handleAddDeadline} 
                  mode="primary" 
                  disabled={!newDeadline.title || !newDeadline.dueDate}
                  style={{ 
                    fontWeight: 600,
                    padding: '12px 20px'
                  }}
                >
                  Добавить
                </Button>
              </Grid>
            </CellSimple>
          </CellList>
        )}

        {loading ? (
          <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
            <Flex justify="center" align="center" style={{ padding: '60px 0', minHeight: 200 }}>
              <Typography.Body style={{ color: 'var(--text-secondary)' }}>
                Загрузка...
              </Typography.Body>
            </Flex>
          </div>
        ) : deadlines.length === 0 ? (
          <CellList mode="island" filled>
            <CellSimple>
              <Flex align="center" justify="center" style={{ padding: '40px 0' }}>
                <Flex direction="column" align="center" gap={16}>
                  <Typography.Body variant="medium" style={{ 
                    fontSize: 48,
                    opacity: 0.3,
                    lineHeight: 1,
                    margin: 0
                  }}>
                    ⏰
                  </Typography.Body>
                  <Typography.Body variant="small" style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    textAlign: 'center',
                    margin: 0
                  }}>
                    Нет активных дедлайнов
                  </Typography.Body>
                </Flex>
              </Flex>
            </CellSimple>
          </CellList>
        ) : (
          <CellList mode="island" filled style={{ gap: 12 }}>
            {deadlines.map((deadline) => {
              const daysUntil = getDaysUntil(deadline.due_date);
              const isOverdue = daysUntil < 0;
              const isUrgent = daysUntil >= 0 && daysUntil <= 3;
              const borderColor = isOverdue 
                ? 'var(--text-negative)' 
                : isUrgent 
                  ? '#FF8A35' 
                  : 'var(--color-primary)';
              
              return (
                <CellSimple
                  key={deadline.id}
                  style={{
                    borderLeft: `3px solid ${borderColor}`,
                  }}
                  after={
                    <Button
                      onClick={() => handleDeleteDeadline(deadline.id)}
                      mode="tertiary"
                      size="s"
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      Удалить
                    </Button>
                  }
                >
                  <Flex direction="column" gap={10}>
                    <Typography.Body variant="medium" style={{ 
                      fontWeight: 600,
                      fontSize: 16,
                      lineHeight: 1.4
                    }}>
                      {deadline.title}
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
                          {formatDate(deadline.due_date)}
                        </Typography.Body>
                      </Flex>
                      <Typography.Body 
                        variant="small"
                        style={{ 
                          color: isOverdue 
                            ? 'var(--text-negative)' 
                            : isUrgent 
                              ? '#FF8A35' 
                              : 'var(--text-secondary)',
                          fontSize: 13,
                          fontWeight: isOverdue || isUrgent ? 600 : 500
                        }}
                      >
                        {daysUntil >= 0 && `⏳ Осталось дней: ${daysUntil}`}
                        {isOverdue && `⚠️ Просрочено на ${Math.abs(daysUntil)} дн.`}
                      </Typography.Body>
                      {deadline.description && (
                        <Typography.Body variant="small" style={{ 
                          color: 'var(--text-secondary)',
                          fontSize: 13,
                          lineHeight: 1.5,
                          marginTop: 2
                        }}>
                          {deadline.description}
                        </Typography.Body>
                      )}
                    </Flex>
                  </Flex>
                </CellSimple>
              );
            })}
          </CellList>
        )}
      </Grid>
    </Container>
  );
}

export default DeadlinesPage;

