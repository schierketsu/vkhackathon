import { useState, useEffect } from 'react';
import { Container, Grid, CellSimple, CellList, CellHeader, Typography, Button, Switch, Flex } from '@maxhub/max-ui';
import api, { User } from '../api/client';
import { formatFacultyName } from '../utils/formatters';

interface GroupsStructure {
  institutions?: Array<{
    name: string;
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
  }>;
  // Обратная совместимость
  faculties?: Array<{
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

type SelectionStep = 'institution' | 'faculty' | 'format' | 'degree' | 'course' | 'group';

function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupsStructure, setGroupsStructure] = useState<GroupsStructure | null>(null);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const [showInstitutionSelector, setShowInstitutionSelector] = useState(false);
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('faculty');
  const [_selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
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
      const [userData, institutionsData] = await Promise.all([
        api.getUser(),
        api.getAvailableInstitutions(),
      ]);
      setUser(userData);
      setInstitutions(institutionsData.institutions || []);
      
      // Если у пользователя есть учебное заведение, загружаем структуру групп для него
      // Иначе загружаем все группы
      const groupsData = await api.getAvailableGroups(userData?.institution_name || undefined);
      setGroupsStructure(groupsData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupSelect = async (groupName: string, subgroup?: number | null) => {
    try {
      await api.updateUserGroup(groupName, subgroup, user?.institution_name || null);
      loadData();
      setShowGroupSelector(false);
      resetSelection();
    } catch (error) {
      console.error('Ошибка обновления группы:', error);
      alert('Ошибка обновления группы');
    }
  };

  const handleInstitutionSelect = async (institutionName: string | null) => {
    try {
      await api.updateUserInstitution(institutionName);
      loadData();
      setShowInstitutionSelector(false);
      // Если выбрано учебное заведение, обновляем структуру групп
      if (institutionName) {
        const groupsData = await api.getAvailableGroups(institutionName);
        setGroupsStructure(groupsData);
      }
    } catch (error) {
      console.error('Ошибка обновления учебного заведения:', error);
      alert('Ошибка обновления учебного заведения');
    }
  };

  const resetSelection = () => {
    setSelectionStep('faculty');
    setSelectedInstitution(null);
    setSelectedFaculty(null);
    setSelectedFormat(null);
    setSelectedDegree(null);
    setSelectedCourse(null);
  };

  const handleOpenGroupSelector = () => {
    if (showGroupSelector) {
      setShowGroupSelector(false);
    } else {
      setShowGroupSelector(true);
      resetSelection();
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
      <Container style={{ flex: 1, paddingTop: 8, paddingBottom: 20 }}>
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
      <Container style={{ flex: 1, paddingTop: 8, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
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
            <CellList mode="island" header={<CellHeader>Моя группа</CellHeader>}>
              <CellSimple
                onClick={() => setShowInstitutionSelector(!showInstitutionSelector)}
                showChevron
                style={{ padding: '16px' }}
              >
                <Flex direction="column" gap={6} style={{ flex: 1 }}>
                  <Typography.Body variant="medium" style={{ 
                    fontWeight: 600,
                    fontSize: 16,
                    color: '#000000'
                  }}>
                    Учебное заведение
                  </Typography.Body>
                  <Typography.Body variant="small" style={{ 
                    color: user.institution_name ? '#666666' : '#FF3B30',
                    fontSize: 14
                  }}>
                    {user.institution_name || 'Не указано'}
                  </Typography.Body>
                </Flex>
              </CellSimple>

              <CellSimple
                onClick={handleOpenGroupSelector}
                showChevron
                style={{ padding: '16px' }}
              >
                <Flex direction="column" gap={6} style={{ flex: 1 }}>
                  <Typography.Body variant="medium" style={{ 
                    fontWeight: 600,
                    fontSize: 16,
                    color: '#000000'
                  }}>
                    Группа
                  </Typography.Body>
                  <Typography.Body variant="small" style={{ 
                    color: user.group_name ? '#666666' : '#FF3B30',
                    fontSize: 14
                  }}>
                    {user.group_name || 'Не указана'}
                  </Typography.Body>
                </Flex>
              </CellSimple>

              {user.group_name && (
                <CellSimple style={{ padding: '16px' }}>
                  <Flex direction="column" gap={12}>
                    <Typography.Body variant="medium" style={{ 
                      fontWeight: 600,
                      fontSize: 16,
                      color: '#000000'
                    }}>
                      Подгруппа
                    </Typography.Body>
                    <Flex gap={8} wrap="wrap">
                      {[null, 1, 2].map((sub) => (
                        <Button
                          key={sub ?? 'null'}
                          mode={user.subgroup === sub ? 'primary' : 'secondary'}
                          onClick={() => handleGroupSelect(user.group_name!, sub)}
                          style={{ 
                            fontWeight: user.subgroup === sub ? 600 : 500,
                            padding: '10px 16px',
                            minWidth: 100,
                            ...(user.subgroup !== sub && {
                              backgroundColor: '#F1F2F4'
                            })
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

            {showInstitutionSelector && (
              <CellList mode="island" header={<CellHeader>Выберите учебное заведение</CellHeader>}>
                {institutions.map((institution, idx) => (
                  <CellSimple
                    key={idx}
                    onClick={() => handleInstitutionSelect(institution)}
                    style={{ padding: '16px' }}
                  >
                    <Typography.Body variant="medium" style={{ 
                      fontWeight: 500,
                      fontSize: 16,
                      color: '#000000'
                    }}>
                      {institution}
                    </Typography.Body>
                  </CellSimple>
                ))}
                <Flex gap={8} style={{ padding: '16px' }}>
                  <Button
                    mode="secondary"
                    onClick={() => setShowInstitutionSelector(false)}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      padding: '10px 20px',
                      backgroundColor: '#FF3B30',
                      color: '#FFFFFF',
                      borderColor: '#FF3B30',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FF2D20';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FF3B30';
                    }}
                  >
                    Отмена
                  </Button>
                </Flex>
              </CellList>
            )}

            {showGroupSelector && groupsStructure && (
              <CellList mode="island" header={
                <CellHeader>
                  {selectionStep === 'faculty' && 'Выберите факультет'}
                  {selectionStep === 'format' && 'Выберите форму обучения'}
                  {selectionStep === 'degree' && 'Выберите степень'}
                  {selectionStep === 'course' && 'Выберите курс'}
                  {selectionStep === 'group' && 'Выберите группу'}
                </CellHeader>
              }>
                {selectionStep === 'faculty' && (
                  <>
                    {(() => {
                      // Поддерживаем как новую структуру с institutions, так и старую с faculties
                      const faculties = groupsStructure.institutions 
                        ? groupsStructure.institutions.flatMap(inst => inst.faculties)
                        : (groupsStructure.faculties || []);
                      
                      return faculties.map((faculty, idx) => (
                        <CellSimple
                          key={idx}
                          onClick={() => {
                            setSelectedFaculty(faculty.name);
                            setSelectionStep('format');
                          }}
                          style={{ padding: '16px' }}
                        >
                          <Typography.Body variant="medium" style={{ 
                            fontWeight: 500,
                            fontSize: 16,
                            color: '#000000'
                          }}>
                            {formatFacultyName(faculty.name)}
                          </Typography.Body>
                        </CellSimple>
                      ));
                    })()}
                    <Flex gap={8} style={{ padding: '16px' }}>
                      <Button
                        mode="secondary"
                        onClick={() => setShowGroupSelector(false)}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#FF3B30',
                          color: '#FFFFFF',
                          borderColor: '#FF3B30',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF2D20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF3B30';
                        }}
                      >
                        Отмена
                      </Button>
                    </Flex>
                  </>
                )}

                {selectionStep === 'format' && selectedFaculty && (
                  <>
                    {(() => {
                      // Поддерживаем как новую структуру с institutions, так и старую с faculties
                      const faculties = groupsStructure.institutions 
                        ? groupsStructure.institutions.flatMap(inst => inst.faculties)
                        : (groupsStructure.faculties || []);
                      
                      return faculties
                        .find(f => f.name === selectedFaculty)
                        ?.formats.map((format, idx) => (
                        <CellSimple
                          key={idx}
                          onClick={() => {
                            setSelectedFormat(format.name);
                            setSelectionStep('degree');
                          }}
                          style={{ padding: '16px' }}
                        >
                          <Typography.Body variant="medium" style={{ 
                            fontWeight: 500,
                            fontSize: 16,
                            color: '#000000'
                          }}>
                            {format.name}
                          </Typography.Body>
                        </CellSimple>
                      ));
                    })()}
                    <Flex gap={8} style={{ padding: '16px' }}>
                      <Button
                        mode="secondary"
                        onClick={() => setSelectionStep('faculty')}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#F1F2F4',
                          color: '#2980F2',
                          borderColor: '#F1F2F4',
                        }}
                      >
                        Назад
                      </Button>
                      <Button
                        mode="secondary"
                        onClick={() => setShowGroupSelector(false)}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#FF3B30',
                          color: '#FFFFFF',
                          borderColor: '#FF3B30',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF2D20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF3B30';
                        }}
                      >
                        Отмена
                      </Button>
                    </Flex>
                  </>
                )}

                {selectionStep === 'degree' && selectedFaculty && selectedFormat && (
                  <>
                    {(() => {
                      // Поддерживаем как новую структуру с institutions, так и старую с faculties
                      const faculties = groupsStructure.institutions 
                        ? groupsStructure.institutions.flatMap(inst => inst.faculties)
                        : (groupsStructure.faculties || []);
                      
                      return faculties
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
                          style={{ padding: '16px' }}
                        >
                          <Typography.Body variant="medium" style={{ 
                            fontWeight: 500,
                            fontSize: 16,
                            color: '#000000'
                          }}>
                            {degree.name}
                          </Typography.Body>
                        </CellSimple>
                      ));
                    })()}
                    <Flex gap={8} style={{ padding: '16px' }}>
                      <Button
                        mode="secondary"
                        onClick={() => setSelectionStep('format')}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#F1F2F4',
                          color: '#2980F2',
                          borderColor: '#F1F2F4',
                        }}
                      >
                        Назад
                      </Button>
                      <Button
                        mode="secondary"
                        onClick={() => setShowGroupSelector(false)}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#FF3B30',
                          color: '#FFFFFF',
                          borderColor: '#FF3B30',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF2D20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF3B30';
                        }}
                      >
                        Отмена
                      </Button>
                    </Flex>
                  </>
                )}

                {selectionStep === 'course' && selectedFaculty && selectedFormat && selectedDegree && (
                  <>
                    {(() => {
                      // Поддерживаем как новую структуру с institutions, так и старую с faculties
                      const faculties = groupsStructure.institutions 
                        ? groupsStructure.institutions.flatMap(inst => inst.faculties)
                        : (groupsStructure.faculties || []);
                      
                      return faculties
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
                          style={{ padding: '16px' }}
                        >
                          <Typography.Body variant="medium" style={{ 
                            fontWeight: 500,
                            fontSize: 16,
                            color: '#000000'
                          }}>
                            {course.number} курс
                          </Typography.Body>
                        </CellSimple>
                      ));
                    })()}
                    <Flex gap={8} style={{ padding: '16px' }}>
                      <Button
                        mode="secondary"
                        onClick={() => setSelectionStep('degree')}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#F1F2F4',
                          color: '#2980F2',
                          borderColor: '#F1F2F4',
                        }}
                      >
                        Назад
                      </Button>
                      <Button
                        mode="secondary"
                        onClick={() => setShowGroupSelector(false)}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#FF3B30',
                          color: '#FFFFFF',
                          borderColor: '#FF3B30',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF2D20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF3B30';
                        }}
                      >
                        Отмена
                      </Button>
                    </Flex>
                  </>
                )}

                {selectionStep === 'group' && selectedFaculty && selectedFormat && selectedDegree && (
                  <>
                    {(() => {
                      // Поддерживаем как новую структуру с institutions, так и старую с faculties
                      const faculties = groupsStructure.institutions 
                        ? groupsStructure.institutions.flatMap(inst => inst.faculties)
                        : (groupsStructure.faculties || []);
                      
                      const degree = faculties
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
                          style={{ padding: '16px' }}
                        >
                          <Typography.Body variant="medium" style={{ 
                            fontWeight: 500,
                            fontSize: 16,
                            color: '#000000'
                          }}>
                            {group}
                          </Typography.Body>
                        </CellSimple>
                      ));
                    })()}
                    <Flex gap={8} style={{ padding: '16px' }}>
                      <Button
                        mode="secondary"
                        onClick={() => {
                          // Поддерживаем как новую структуру с institutions, так и старую с faculties
                          const faculties = groupsStructure.institutions 
                            ? groupsStructure.institutions.flatMap(inst => inst.faculties)
                            : (groupsStructure.faculties || []);
                          
                          const degree = faculties
                            .find(f => f.name === selectedFaculty)
                            ?.formats.find(f => f.name === selectedFormat)
                            ?.degrees.find(d => d.name === selectedDegree);
                          if (degree?.courses && degree.courses.length > 0) {
                            setSelectionStep('course');
                          } else {
                            setSelectionStep('degree');
                          }
                        }}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#F1F2F4',
                          color: '#2980F2',
                          borderColor: '#F1F2F4',
                        }}
                      >
                        Назад
                      </Button>
                      <Button
                        mode="secondary"
                        onClick={() => setShowGroupSelector(false)}
                        style={{
                          flex: 1,
                          fontSize: 14,
                          padding: '10px 20px',
                          backgroundColor: '#FF3B30',
                          color: '#FFFFFF',
                          borderColor: '#FF3B30',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF2D20';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FF3B30';
                        }}
                      >
                        Отмена
                      </Button>
                    </Flex>
                  </>
                )}
              </CellList>
            )}

        <CellList mode="island" header={<CellHeader>Уведомления</CellHeader>}>
              <CellSimple
                after={
                  <Switch
                    checked={user.notifications_enabled === 1}
                    onChange={(e) => toggleNotifications(e.target.checked)}
                  />
                }
                style={{ padding: '14px 16px' }}
              >
                <Flex direction="column" gap={4}>
                  <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                    Уведомления о дедлайнах
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
                    onChange={(e) => toggleEventsSubscription(e.target.checked)}
                  />
                }
                style={{ padding: '14px 16px' }}
              >
                <Flex direction="column" gap={4}>
                  <Typography.Body variant="medium" style={{ fontWeight: 600 }}>
                    Подписка на мероприятия
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

