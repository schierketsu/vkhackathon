import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, CellHeader, Typography, Button, Switch, Flex } from '@maxhub/max-ui';
import api, { User } from '../api/client';

interface GroupsStructure {
  faculties: Array<{
    name: string;
    formats: Array<{
      name: string;
      degrees: Array<{
        name: string;
        courses?: Array<{
          number: number;
          groups: string[];
        }>;
        groups?: string[];
      }>;
    }>;
  }>;
}

type SelectionStep = 'faculty' | 'format' | 'degree' | 'course' | 'group';

function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupsStructure, setGroupsStructure] = useState<GroupsStructure | null>(null);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('faculty');
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, groupsData] = await Promise.all([
        api.getUser(),
        api.getAvailableGroups(),
      ]);
      setUser(userData);
      setGroupsStructure(groupsData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = async (groupName: string, subgroup?: number | null) => {
    try {
      await api.updateUserGroup(groupName, subgroup);
      loadData();
      setShowGroupSelector(false);
      resetSelection();
    } catch (error) {
      console.error('Ошибка обновления группы:', error);
      alert('Ошибка обновления группы');
    }
  };

  const resetSelection = () => {
    setSelectionStep('faculty');
    setSelectedFaculty(null);
    setSelectedFormat(null);
    setSelectedDegree(null);
    setSelectedCourse(null);
  };

  const handleOpenGroupSelector = () => {
    setShowGroupSelector(true);
    resetSelection();
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

  const toggleEventsSubscription = async (subscribed: boolean) => {
    try {
      await api.toggleEventsSubscription(subscribed);
      if (user) {
        setUser({ ...user, events_subscribed: subscribed ? 1 : 0 });
      }
    } catch (error) {
      console.error('Ошибка изменения подписки:', error);
    }
  };

  if (loading) {
    return (
      <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20 }}>
        <Flex direction="column" align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Typography.Body style={{ color: 'var(--text-secondary)' }}>
            Загрузка...
          </Typography.Body>
        </Flex>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
        <CellList mode="island">
          <CellSimple>
            <Typography.Body variant="small" style={{ color: 'var(--text-secondary)' }}>
              Ошибка загрузки данных
            </Typography.Body>
          </CellSimple>
        </CellList>
      </Container>
    );
  }

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>

            <CellList mode="island" header={<CellHeader>Группа и подгруппа</CellHeader>}>
              <CellSimple
                onClick={handleOpenGroupSelector}
                style={{ padding: '14px 16px' }}
              >
                <Flex align="center" gap={12}>
                  <Typography.Body variant="medium" style={{ fontSize: 20 }}>
                    🎓
                  </Typography.Body>
                  <Flex direction="column" gap={4} style={{ flex: 1 }}>
                    <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                      Группа
                    </Typography.Body>
                    <Typography.Body variant="small" style={{ 
                      color: user.group_name ? 'var(--text-secondary)' : 'var(--text-negative)',
                      fontSize: 13
                    }}>
                      {user.group_name || 'Не указана'}
                    </Typography.Body>
                  </Flex>
                  <Typography.Body variant="small" style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: 18
                  }}>
                    {user.group_name ? '✓' : '⚠️'}
                  </Typography.Body>
                </Flex>
              </CellSimple>

              {user.group_name && (
                <CellSimple style={{ padding: '14px 16px' }}>
                  <Flex direction="column" gap={12}>
                    <Flex direction="column" gap={6}>
                      <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                        👥 Подгруппа
                      </Typography.Body>
                      <Typography.Body variant="small" style={{ 
                        color: 'var(--text-secondary)',
                        fontSize: 13
                      }}>
                        {user.subgroup !== null && user.subgroup !== undefined
                          ? `Текущая: Подгруппа ${user.subgroup}`
                          : 'Текущая: Общая'}
                      </Typography.Body>
                    </Flex>
                    <Flex gap={8} wrap="wrap">
                      {[null, 1, 2].map((sub) => (
                        <Button
                          key={sub ?? 'null'}
                          mode={user.subgroup === sub ? 'primary' : 'secondary'}
                          onClick={() => handleGroupSelect(user.group_name!, sub)}
                          size="s"
                          style={{ 
                            fontWeight: user.subgroup === sub ? 600 : 500,
                            padding: '8px 14px'
                          }}
                        >
                          {sub === null ? 'Общая' : `Подгруппа ${sub}`}
                        </Button>
                      ))}
                    </Flex>
                  </Flex>
                </CellSimple>
              )}
            </CellList>

            {showGroupSelector && groupsStructure && (
              <CellList mode="island" header={<CellHeader>Выбор группы</CellHeader>}>
                {selectionStep === 'faculty' && (
                  <>
                    <CellSimple style={{ padding: '14px 16px' }}>
                      <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                        Выберите факультет:
                      </Typography.Body>
                    </CellSimple>
                    {groupsStructure.faculties.map((faculty, idx) => (
                      <CellSimple
                        key={idx}
                        onClick={() => {
                          setSelectedFaculty(faculty.name);
                          setSelectionStep('format');
                        }}
                        style={{ padding: '14px 16px' }}
                      >
                        <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                          {faculty.name}
                        </Typography.Body>
                      </CellSimple>
                    ))}
                    <CellSimple 
                      onClick={() => setShowGroupSelector(false)}
                      style={{ padding: '14px 16px' }}
                    >
                      <Typography.Body variant="medium" style={{ 
                        color: 'var(--text-secondary)',
                        fontWeight: 500
                      }}>
                        Отмена
                      </Typography.Body>
                    </CellSimple>
                  </>
                )}

                {selectionStep === 'format' && selectedFaculty && (
                  <>
                    <CellSimple 
                      onClick={() => setSelectionStep('faculty')}
                      style={{ padding: '14px 16px' }}
                    >
                      <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                        ← Назад
                      </Typography.Body>
                    </CellSimple>
                    <CellSimple style={{ padding: '14px 16px' }}>
                      <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                        Выберите форму обучения:
                      </Typography.Body>
                    </CellSimple>
                    {groupsStructure.faculties
                      .find(f => f.name === selectedFaculty)
                      ?.formats.map((format, idx) => (
                        <CellSimple
                          key={idx}
                          onClick={() => {
                            setSelectedFormat(format.name);
                            setSelectionStep('degree');
                          }}
                          style={{ padding: '14px 16px' }}
                        >
                          <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                            {format.name}
                          </Typography.Body>
                        </CellSimple>
                      ))}
                  </>
                )}

                {selectionStep === 'degree' && selectedFaculty && selectedFormat && (
                  <>
                    <CellSimple 
                      onClick={() => setSelectionStep('format')}
                      style={{ padding: '14px 16px' }}
                    >
                      <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                        ← Назад
                      </Typography.Body>
                    </CellSimple>
                    <CellSimple style={{ padding: '14px 16px' }}>
                      <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                        Выберите степень:
                      </Typography.Body>
                    </CellSimple>
                    {groupsStructure.faculties
                      .find(f => f.name === selectedFaculty)
                      ?.formats.find(f => f.name === selectedFormat)
                      ?.degrees.map((degree, idx) => (
                        <CellSimple
                          key={idx}
                          onClick={() => {
                            setSelectedDegree(degree.name);
                            const hasCourses = degree.courses && degree.courses.length > 0;
                            if (hasCourses) {
                              setSelectionStep('course');
                            } else {
                              setSelectionStep('group');
                            }
                          }}
                          style={{ padding: '14px 16px' }}
                        >
                          <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                            {degree.name}
                          </Typography.Body>
                        </CellSimple>
                      ))}
                  </>
                )}

                {selectionStep === 'course' && selectedFaculty && selectedFormat && selectedDegree && (
                  <>
                    <CellSimple 
                      onClick={() => setSelectionStep('degree')}
                      style={{ padding: '14px 16px' }}
                    >
                      <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                        ← Назад
                      </Typography.Body>
                    </CellSimple>
                    <CellSimple style={{ padding: '14px 16px' }}>
                      <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                        Выберите курс:
                      </Typography.Body>
                    </CellSimple>
                    {groupsStructure.faculties
                      .find(f => f.name === selectedFaculty)
                      ?.formats.find(f => f.name === selectedFormat)
                      ?.degrees.find(d => d.name === selectedDegree)
                      ?.courses?.map((course, idx) => (
                        <CellSimple
                          key={idx}
                          onClick={() => {
                            setSelectedCourse(course.number);
                            setSelectionStep('group');
                          }}
                          style={{ padding: '14px 16px' }}
                        >
                          <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                            {course.number} курс
                          </Typography.Body>
                        </CellSimple>
                      ))}
                  </>
                )}

                {selectionStep === 'group' && selectedFaculty && selectedFormat && selectedDegree && (
                  <>
                    <CellSimple 
                      onClick={() => {
                        const degree = groupsStructure.faculties
                          .find(f => f.name === selectedFaculty)
                          ?.formats.find(f => f.name === selectedFormat)
                          ?.degrees.find(d => d.name === selectedDegree);
                        if (degree?.courses && degree.courses.length > 0) {
                          setSelectionStep('course');
                        } else {
                          setSelectionStep('degree');
                        }
                      }}
                      style={{ padding: '14px 16px' }}
                    >
                      <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                        ← Назад
                      </Typography.Body>
                    </CellSimple>
                    <CellSimple style={{ padding: '14px 16px' }}>
                      <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                        Выберите группу:
                      </Typography.Body>
                    </CellSimple>
                    {(() => {
                      const degree = groupsStructure.faculties
                        .find(f => f.name === selectedFaculty)
                        ?.formats.find(f => f.name === selectedFormat)
                        ?.degrees.find(d => d.name === selectedDegree);
                      
                      const groups = selectedCourse !== null
                        ? degree?.courses?.find(c => c.number === selectedCourse)?.groups || []
                        : degree?.groups || [];
                      
                      return groups.map((group, idx) => (
                        <CellSimple
                          key={idx}
                          onClick={() => handleGroupSelect(group)}
                          style={{ padding: '14px 16px' }}
                        >
                          <Typography.Body variant="medium" style={{ fontWeight: 500 }}>
                            {group}
                          </Typography.Body>
                        </CellSimple>
                      ));
                    })()}
                  </>
                )}
              </CellList>
            )}

        <CellList mode="island" header={<CellHeader>Уведомления</CellHeader>}>
              <CellSimple
                after={
                  <Switch
                    checked={user.notifications_enabled === 1}
                    onChange={(checked) => toggleNotifications(checked)}
                  />
                }
                style={{ padding: '14px 16px' }}
              >
                <Flex direction="column" gap={4}>
                  <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                    🔔 Уведомления о дедлайнах
                  </Typography.Body>
                  <Typography.Body variant="small" style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: 13
                  }}>
                    {user.notifications_enabled === 1 ? 'Включены' : 'Выключены'}
                  </Typography.Body>
                </Flex>
              </CellSimple>

              <CellSimple
                after={
                  <Switch
                    checked={user.events_subscribed === 1}
                    onChange={(checked) => toggleEventsSubscription(checked)}
                  />
                }
                style={{ padding: '14px 16px' }}
              >
                <Flex direction="column" gap={4}>
                  <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                    🎉 Подписка на мероприятия
                  </Typography.Body>
                  <Typography.Body variant="small" style={{ 
                    color: 'var(--text-secondary)',
                    fontSize: 13
                  }}>
                    {user.events_subscribed === 1 ? 'Включена' : 'Выключена'}
                  </Typography.Body>
                </Flex>
              </CellSimple>
            </CellList>
      </Grid>
    </Container>
  );
}

export default SettingsPage;

