import { useState, useEffect } from 'react';
import { Container, Grid, CellSimple, CellList, CellHeader, Typography, Flex, Button } from '@maxhub/max-ui';
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

function SetupPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupsStructure, setGroupsStructure] = useState<GroupsStructure | null>(null);
  const [institutions, setInstitutions] = useState<string[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedDegree, setSelectedDegree] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState<number | null>(null);
  const [availableSubgroups, setAvailableSubgroups] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedInstitution) {
      loadGroupsStructure();
    }
  }, [selectedInstitution]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, institutionsData] = await Promise.all([
        api.getUser(),
        api.getAvailableInstitutions(),
      ]);
      setUser(userData);
      setInstitutions(institutionsData.institutions || []);
      
      // Если уже все настроено, редиректим на главную
      if (userData.institution_name && userData.group_name) {
        window.location.href = '/';
        return;
      }
      
      // Если уже выбрано учебное заведение, загружаем структуру
      if (userData.institution_name) {
        setSelectedInstitution(userData.institution_name);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupsStructure = async () => {
    if (!selectedInstitution) return;
    try {
      const groupsData = await api.getAvailableGroups(selectedInstitution);
      setGroupsStructure(groupsData);
    } catch (error) {
      console.error('Ошибка загрузки структуры групп:', error);
    }
  };

  const handleInstitutionSelect = async (institutionName: string) => {
    // Если кликнули на уже выбранное учебное заведение - сбрасываем выбор
    if (selectedInstitution === institutionName) {
      setSelectedInstitution(null);
      setSelectedFaculty(null);
      setSelectedFormat(null);
      setSelectedDegree(null);
      setSelectedCourse(null);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
      setGroupsStructure(null);
    } else {
      try {
        await api.updateUserInstitution(institutionName);
        setSelectedInstitution(institutionName);
        // Сбрасываем все зависимые выборы
        setSelectedFaculty(null);
        setSelectedFormat(null);
        setSelectedDegree(null);
        setSelectedCourse(null);
        setSelectedGroup(null);
        setSelectedSubgroup(null);
        await loadGroupsStructure();
      } catch (error) {
        console.error('Ошибка обновления учебного заведения:', error);
        alert('Ошибка обновления учебного заведения');
      }
    }
  };

  const handleFacultySelect = (facultyName: string) => {
    // Если кликнули на уже выбранный факультет - сбрасываем выбор
    if (selectedFaculty === facultyName) {
      setSelectedFaculty(null);
      setSelectedFormat(null);
      setSelectedDegree(null);
      setSelectedCourse(null);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
    } else {
      setSelectedFaculty(facultyName);
      setSelectedFormat(null);
      setSelectedDegree(null);
      setSelectedCourse(null);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
    }
  };

  const handleFormatSelect = (formatName: string) => {
    // Если кликнули на уже выбранную форму обучения - сбрасываем выбор
    if (selectedFormat === formatName) {
      setSelectedFormat(null);
      setSelectedDegree(null);
      setSelectedCourse(null);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
    } else {
      setSelectedFormat(formatName);
      setSelectedDegree(null);
      setSelectedCourse(null);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
    }
  };

  const handleDegreeSelect = (degreeName: string) => {
    // Если кликнули на уже выбранную степень - сбрасываем выбор
    if (selectedDegree === degreeName) {
      setSelectedDegree(null);
      setSelectedCourse(null);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
    } else {
      setSelectedDegree(degreeName);
      setSelectedCourse(null);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
    }
  };

  const handleCourseSelect = (courseNumber: number) => {
    // Если кликнули на уже выбранный курс - сбрасываем выбор
    if (selectedCourse === courseNumber) {
      setSelectedCourse(null);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
    } else {
      setSelectedCourse(courseNumber);
      setSelectedGroup(null);
      setSelectedSubgroup(null);
    }
  };

  const handleGroupSelect = async (groupName: string) => {
    try {
      setSelectedGroup(groupName);
      
      // Проверяем, нужна ли подгруппа
      const subgroupsData = await api.getAvailableSubgroups(groupName);
      if (subgroupsData.subgroups && subgroupsData.subgroups.length > 0) {
        setAvailableSubgroups(subgroupsData.subgroups);
      } else {
        // Сохраняем группу без подгруппы и редиректим
        await api.updateUserGroup(groupName, null, selectedInstitution);
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Ошибка обновления группы:', error);
      alert('Ошибка обновления группы');
    }
  };

  const handleSubgroupSelect = async (subgroup: number | null) => {
    try {
      if (selectedGroup) {
        await api.updateUserGroup(selectedGroup, subgroup, selectedInstitution);
        setSelectedSubgroup(subgroup);
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Ошибка обновления подгруппы:', error);
      alert('Ошибка обновления подгруппы');
    }
  };

  // Получение данных для отображения (используем ту же логику, что и в SettingsPage)
  const getFaculties = () => {
    if (!groupsStructure) return [];
    
    // Поддерживаем как новую структуру с institutions, так и старую с faculties
    if (groupsStructure.institutions) {
      // Всегда используем flatMap, так как структура уже отфильтрована по учебному заведению
      return groupsStructure.institutions.flatMap(inst => inst.faculties);
    }
    return groupsStructure.faculties || [];
  };

  const getFormats = () => {
    if (!selectedFaculty || !groupsStructure) return [];
    const faculties = getFaculties();
    // Используем точное сравнение имен, как в SettingsPage
    const faculty = faculties.find(f => f.name === selectedFaculty);
    
    // Отладка
    if (!faculty) {
      console.log('Faculty not found:', {
        selectedFaculty,
        availableFaculties: faculties.map(f => f.name),
        groupsStructureInstitutions: groupsStructure.institutions?.map(i => i.name)
      });
    } else {
      console.log('Faculty found:', faculty.name, 'Formats:', faculty.formats?.map(f => f.name));
    }
    
    return faculty?.formats || [];
  };

  const getDegrees = () => {
    if (!selectedFormat || !selectedFaculty || !groupsStructure) return [];
    const formats = getFormats();
    // Используем точное сравнение имен, как в SettingsPage
    const format = formats.find(f => f.name === selectedFormat);
    return format?.degrees || [];
  };

  const getCourses = () => {
    if (!selectedDegree || !selectedFormat || !selectedFaculty || !groupsStructure) return [];
    const degrees = getDegrees();
    const degree = degrees.find(d => d.name === selectedDegree);
    return degree?.courses || [];
  };

  const getGroups = () => {
    if (!selectedDegree || !selectedFormat || !selectedFaculty || !groupsStructure) return [];
    const degrees = getDegrees();
    const degree = degrees.find(d => d.name === selectedDegree);
    if (!degree) return [];
    
    if (selectedCourse !== null) {
      const course = degree.courses?.find(c => c.number === selectedCourse);
      return course?.groups || [];
    }
    return degree.groups || [];
  };

  if (loading) {
    return (
      <div style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0, backgroundColor: 'transparent', minHeight: '100vh', height: '100%', width: '100%' }}>
        <Grid gap={20} cols={1}>
          <Flex align="center" justify="center" style={{ padding: '40px 0', minHeight: '50vh' }}>
            <Typography.Body variant="medium" style={{ color: '#FFFFFF' }}>Загрузка...</Typography.Body>
          </Flex>
        </Grid>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, paddingTop: 16, paddingBottom: 0, paddingLeft: 0, paddingRight: 0, backgroundColor: 'transparent', minHeight: '100%', width: '100%' }}>
      <div style={{ paddingBottom: '20px' }}>
        <Grid gap={20} cols={1}>
        <div style={{ 
          paddingLeft: 'var(--spacing-size-xl, 16px)', 
          paddingRight: 'var(--spacing-size-xl, 16px)',
          paddingTop: 40,
          paddingBottom: 20,
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <img 
              src="/рукопажатие1.png" 
              alt="Приветствие"
              style={{
                width: 120,
                height: 120,
                objectFit: 'contain'
              }}
            />
          </div>
          <Typography.Title style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: 'center', color: '#FFFFFF' }}>
            Добро пожаловать!
          </Typography.Title>
          <div style={{ textAlign: 'center' }}>
            <Typography.Body variant="medium" style={{ color: '#FFFFFF', fontSize: 16, lineHeight: 1.5, textAlign: 'center', display: 'block', opacity: 0.9 }}>
              Давайте настроим ваш профиль для начала работы.
            </Typography.Body>
          </div>
        </div>

        {/* Учебное заведение */}
        <CellList mode="island" header={<CellHeader><Typography.Body variant="medium" style={{ color: '#FFFFFF', fontWeight: 600 }}>Учебное заведение</Typography.Body></CellHeader>}>
          {institutions
            .filter(institution => !selectedInstitution || institution === selectedInstitution)
            .map((institution, idx) => (
              <CellSimple
                key={idx}
                onClick={() => handleInstitutionSelect(institution)}
                style={{ 
                  padding: '16px',
                  cursor: 'pointer',
                  backgroundColor: selectedInstitution === institution ? '#F0F7FF' : 'transparent'
                }}
              >
                <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                  <Typography.Body variant="medium" style={{ 
                    fontWeight: selectedInstitution === institution ? 600 : 500,
                    fontSize: 16,
                    color: selectedInstitution === institution ? '#2980F2' : '#000000'
                  }}>
                    {institution}
                  </Typography.Body>
                  {selectedInstitution === institution && (
                    <img 
                      src="/edit.svg" 
                      alt="Изменить"
                      style={{
                        width: 20,
                        height: 20,
                        objectFit: 'contain'
                      }}
                    />
                  )}
                </Flex>
              </CellSimple>
            ))}
        </CellList>

        {/* Факультет */}
        {selectedInstitution && groupsStructure && (
          <CellList mode="island" header={<CellHeader><Typography.Body variant="medium" style={{ color: '#FFFFFF', fontWeight: 600 }}>Факультет</Typography.Body></CellHeader>}>
            {getFaculties().length > 0 ? (
              getFaculties()
                .filter(faculty => !selectedFaculty || faculty.name === selectedFaculty)
                .map((faculty, idx) => (
                  <CellSimple
                    key={idx}
                    onClick={() => {
                      console.log('Selecting faculty:', faculty.name);
                      handleFacultySelect(faculty.name);
                    }}
                    style={{ 
                      padding: '16px',
                      cursor: 'pointer',
                      backgroundColor: selectedFaculty === faculty.name ? '#F0F7FF' : 'transparent'
                    }}
                  >
                    <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                      <Typography.Body variant="medium" style={{ 
                        fontWeight: selectedFaculty === faculty.name ? 600 : 500,
                        fontSize: 16,
                        color: selectedFaculty === faculty.name ? '#2980F2' : '#000000'
                      }}>
                        {formatFacultyName(faculty.name)}
                      </Typography.Body>
                      {selectedFaculty === faculty.name && (
                        <img 
                          src="/edit.svg" 
                          alt="Изменить"
                          style={{
                            width: 20,
                            height: 20,
                            objectFit: 'contain'
                          }}
                        />
                      )}
                    </Flex>
                  </CellSimple>
                ))
            ) : (
              <CellSimple style={{ padding: '16px' }}>
                <Typography.Body variant="medium" style={{ 
                  color: '#FF3B30',
                  fontSize: 14
                }}>
                  Факультеты загружаются...
                </Typography.Body>
              </CellSimple>
            )}
          </CellList>
        )}

        {/* Форма обучения */}
        {selectedFaculty && getFormats().length > 0 && (
          <CellList mode="island" header={<CellHeader><Typography.Body variant="medium" style={{ color: '#FFFFFF', fontWeight: 600 }}>Форма обучения</Typography.Body></CellHeader>}>
            {getFormats()
              .filter(format => !selectedFormat || format.name === selectedFormat)
              .map((format, idx) => (
                <CellSimple
                  key={idx}
                  onClick={() => handleFormatSelect(format.name)}
                  style={{ 
                    padding: '16px',
                    cursor: 'pointer',
                    backgroundColor: selectedFormat === format.name ? '#F0F7FF' : 'transparent'
                  }}
                >
                  <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                    <Typography.Body variant="medium" style={{ 
                      fontWeight: selectedFormat === format.name ? 600 : 500,
                      fontSize: 16,
                      color: selectedFormat === format.name ? '#2980F2' : '#000000'
                    }}>
                      {format.name}
                    </Typography.Body>
                    {selectedFormat === format.name && (
                      <img 
                        src="/edit.svg" 
                        alt="Изменить"
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: 'contain'
                        }}
                      />
                    )}
                  </Flex>
                </CellSimple>
              ))}
          </CellList>
        )}

        {/* Степень образования */}
        {selectedFormat && getDegrees().length > 0 && (
          <CellList mode="island" header={<CellHeader><Typography.Body variant="medium" style={{ color: '#FFFFFF', fontWeight: 600 }}>Степень образования</Typography.Body></CellHeader>}>
            {getDegrees()
              .filter(degree => !selectedDegree || degree.name === selectedDegree)
              .map((degree, idx) => (
                <CellSimple
                  key={idx}
                  onClick={() => handleDegreeSelect(degree.name)}
                  style={{ 
                    padding: '16px',
                    cursor: 'pointer',
                    backgroundColor: selectedDegree === degree.name ? '#F0F7FF' : 'transparent'
                  }}
                >
                  <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                    <Typography.Body variant="medium" style={{ 
                      fontWeight: selectedDegree === degree.name ? 600 : 500,
                      fontSize: 16,
                      color: selectedDegree === degree.name ? '#2980F2' : '#000000'
                    }}>
                      {degree.name}
                    </Typography.Body>
                    {selectedDegree === degree.name && (
                      <img 
                        src="/edit.svg" 
                        alt="Изменить"
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: 'contain'
                        }}
                      />
                    )}
                  </Flex>
                </CellSimple>
              ))}
          </CellList>
        )}

        {/* Курс */}
        {selectedDegree && getCourses().length > 0 && (
          <CellList mode="island" header={<CellHeader><Typography.Body variant="medium" style={{ color: '#FFFFFF', fontWeight: 600 }}>Курс</Typography.Body></CellHeader>}>
            {getCourses()
              .filter(course => selectedCourse === null || course.number === selectedCourse)
              .map((course, idx) => (
                <CellSimple
                  key={idx}
                  onClick={() => handleCourseSelect(course.number)}
                  style={{ 
                    padding: '16px',
                    cursor: 'pointer',
                    backgroundColor: selectedCourse === course.number ? '#F0F7FF' : 'transparent'
                  }}
                >
                  <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                    <Typography.Body variant="medium" style={{ 
                      fontWeight: selectedCourse === course.number ? 600 : 500,
                      fontSize: 16,
                      color: selectedCourse === course.number ? '#2980F2' : '#000000'
                    }}>
                      {course.number} курс
                    </Typography.Body>
                    {selectedCourse === course.number && (
                      <img 
                        src="/edit.svg" 
                        alt="Изменить"
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: 'contain'
                        }}
                      />
                    )}
                  </Flex>
                </CellSimple>
              ))}
          </CellList>
        )}

        {/* Группа */}
        {((selectedDegree && getCourses().length === 0) || selectedCourse) && getGroups().length > 0 && (
          <CellList 
            mode="island" 
            header={<CellHeader><Typography.Body variant="medium" style={{ color: '#FFFFFF', fontWeight: 600 }}>Группа</Typography.Body></CellHeader>}
            style={availableSubgroups.length === 0 && selectedGroup ? { marginBottom: '40px' } : {}}
          >
            {getGroups()
              .filter(group => !selectedGroup || group === selectedGroup)
              .map((group, idx) => (
                <CellSimple
                  key={idx}
                  onClick={() => {
                    // Если группа уже выбрана и еще не перешли к подгруппам, позволяем изменить выбор
                    if (selectedGroup === group && availableSubgroups.length === 0) {
                      setSelectedGroup(null);
                      setSelectedSubgroup(null);
                    } else {
                      handleGroupSelect(group);
                    }
                  }}
                  style={{ 
                    padding: '16px',
                    cursor: 'pointer',
                    backgroundColor: selectedGroup === group ? '#F0F7FF' : 'transparent'
                  }}
                >
                  <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                    <Typography.Body variant="medium" style={{ 
                      fontWeight: selectedGroup === group ? 600 : 500,
                      fontSize: 16,
                      color: selectedGroup === group ? '#2980F2' : '#000000'
                    }}>
                      {group}
                    </Typography.Body>
                    {selectedGroup === group && availableSubgroups.length === 0 && (
                      <img 
                        src="/edit.svg" 
                        alt="Изменить"
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: 'contain'
                        }}
                      />
                    )}
                    {selectedGroup === group && availableSubgroups.length > 0 && (
                      <Typography.Body variant="small" style={{ color: '#2980F2', fontSize: 14 }}>
                        ✓
                      </Typography.Body>
                    )}
                  </Flex>
                </CellSimple>
              ))}
          </CellList>
        )}

        {/* Подгруппа */}
        {selectedGroup && availableSubgroups.length > 0 && (
          <CellList mode="island" header={<CellHeader><Typography.Body variant="medium" style={{ color: '#FFFFFF', fontWeight: 600 }}>Подгруппа</Typography.Body></CellHeader>} style={{ marginBottom: '40px' }}>
            <CellSimple
              onClick={() => handleSubgroupSelect(null)}
              style={{ padding: '16px' }}
            >
              <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                <Typography.Body variant="medium" style={{ 
                  fontWeight: 500,
                  fontSize: 16,
                  color: '#000000'
                }}>
                  Общая (без подгруппы)
                </Typography.Body>
                {selectedSubgroup === null && (
                  <Typography.Body variant="small" style={{ color: '#2980F2', fontSize: 14 }}>
                    ✓
                  </Typography.Body>
                )}
              </Flex>
            </CellSimple>
            {availableSubgroups.map((sub, idx) => (
              <CellSimple
                key={sub}
                onClick={() => handleSubgroupSelect(sub)}
                style={{ padding: '16px' }}
              >
                <Flex align="center" justify="space-between" style={{ width: '100%' }}>
                  <Typography.Body variant="medium" style={{ 
                    fontWeight: 500,
                    fontSize: 16,
                    color: '#000000'
                  }}>
                    Подгруппа {sub}
                  </Typography.Body>
                  {selectedSubgroup === sub && (
                    <Typography.Body variant="small" style={{ color: '#2980F2', fontSize: 14 }}>
                      ✓
                    </Typography.Body>
                  )}
                </Flex>
              </CellSimple>
            ))}
          </CellList>
        )}

        {/* Универсальный отступ внизу - всегда в конце */}
        <div style={{ height: '20px', minHeight: '30px', width: '100%' }} />

        </Grid>
      </div>
    </div>
  );
}

export default SetupPage;
