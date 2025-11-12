import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, CellHeader, Typography, Button, SearchInput, Flex, Spinner } from '@maxhub/max-ui';
import api from '../api/client';
import { formatFacultyName } from '../utils/formatters';

interface PracticeCompany {
  id: string;
  name: string;
  description?: string;
  location?: string;
  tags: string[];
  avatar?: string;
  rating?: number;
}

interface PracticeInstitutionsStructure {
  institutions: Array<{
    name: string;
    faculties: Array<{
      name: string;
    }>;
  }>;
}

type FilterStep = 'institution' | 'faculty' | 'interests' | 'companies';

function PracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [institutionsStructure, setInstitutionsStructure] = useState<PracticeInstitutionsStructure | null>(null);
  
  // Получаем состояние фильтров из location.state или sessionStorage, или инициализируем значениями по умолчанию
  const savedState = location.state as {
    selectedInstitution?: string | null;
    selectedFaculty?: string | null;
    selectedTags?: string[];
    filterStep?: FilterStep;
    searchQuery?: string;
  } | null;

  // Если нет состояния в location.state, пытаемся восстановить из sessionStorage
  const getInitialState = () => {
    if (savedState) {
      return savedState;
    }
    // Fallback на sessionStorage
    const savedInstitution = sessionStorage.getItem('practice_selectedInstitution');
    const savedFaculty = sessionStorage.getItem('practice_selectedFaculty');
    const savedTags = sessionStorage.getItem('practice_selectedTags');
    const savedFilterStep = sessionStorage.getItem('practice_filterStep');
    const savedSearchQuery = sessionStorage.getItem('practice_searchQuery');
    
    if (savedInstitution || savedFaculty || savedFilterStep) {
      return {
        selectedInstitution: savedInstitution || null,
        selectedFaculty: savedFaculty || null,
        selectedTags: savedTags ? JSON.parse(savedTags) : [],
        filterStep: (savedFilterStep as FilterStep) || 'institution',
        searchQuery: savedSearchQuery || '',
      };
    }
    return null;
  };

  const initialState = getInitialState();

  const [filterStep, setFilterStep] = useState<FilterStep>(initialState?.filterStep || 'institution');
  
  // Фильтры
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(initialState?.selectedInstitution || null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(initialState?.selectedFaculty || null);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialState?.selectedTags || []);
  const [searchQuery, setSearchQuery] = useState(initialState?.searchQuery || '');
  
  // Данные
  const [companies, setCompanies] = useState<PracticeCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<PracticeCompany[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Сохраняем состояние фильтров в sessionStorage при изменении
  useEffect(() => {
    sessionStorage.setItem('practice_selectedInstitution', selectedInstitution || '');
    sessionStorage.setItem('practice_selectedFaculty', selectedFaculty || '');
    sessionStorage.setItem('practice_selectedTags', JSON.stringify(selectedTags));
    sessionStorage.setItem('practice_filterStep', filterStep);
    sessionStorage.setItem('practice_searchQuery', searchQuery);
  }, [selectedInstitution, selectedFaculty, selectedTags, filterStep, searchQuery]);

  useEffect(() => {
    loadData();
  }, []);

  // Обновляем состояние фильтров при изменении location.state (например, при возврате со страницы компании)
  useEffect(() => {
    if (savedState) {
      // Обновляем состояние фильтров из location.state
      if (savedState.selectedInstitution !== undefined) {
        setSelectedInstitution(savedState.selectedInstitution);
      }
      if (savedState.selectedFaculty !== undefined) {
        setSelectedFaculty(savedState.selectedFaculty);
      }
      if (savedState.selectedTags !== undefined) {
        setSelectedTags(savedState.selectedTags);
      }
      if (savedState.filterStep !== undefined) {
        setFilterStep(savedState.filterStep);
      }
      if (savedState.searchQuery !== undefined) {
        setSearchQuery(savedState.searchQuery);
      }
    }
  }, [location.state]);

  // Восстанавливаем состояние при возврате со страницы заявок или компании
  useEffect(() => {
    if (initialState) {
      // Если есть сохраненное состояние, восстанавливаем его
      if (initialState.selectedInstitution && initialState.selectedFaculty) {
        // Если были выбраны institution и faculty, загружаем компании и теги
        if (initialState.filterStep === 'companies') {
          // Загружаем компании асинхронно
          const loadCompaniesAsync = async () => {
            if (!initialState.selectedInstitution || !initialState.selectedFaculty) return;
            setLoading(true);
            try {
              const companiesData = await api.getPracticeCompanies(initialState.selectedInstitution, initialState.selectedFaculty);
              setCompanies(companiesData);
              setFilteredCompanies(companiesData);
            } catch (error) {
              console.error('Ошибка загрузки компаний:', error);
            } finally {
              setLoading(false);
            }
          };
          loadCompaniesAsync();
        } else if (initialState.filterStep === 'interests') {
          loadTagsForFaculty();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterCompanies();
  }, [selectedTags, searchQuery, companies]);

  // Загружаем теги при переходе на шаг выбора интересов
  useEffect(() => {
    if (selectedInstitution && selectedFaculty && filterStep === 'interests') {
      loadTagsForFaculty();
    }
  }, [selectedInstitution, selectedFaculty, filterStep]);

  const loadData = async () => {
    setLoading(true);
    try {
      const institutionsData = await api.getPracticeInstitutions();
      setInstitutionsStructure(institutionsData);
      // Теги будут загружены после выбора факультета
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTagsForFaculty = async () => {
    if (!selectedInstitution || !selectedFaculty) return;

    setLoadingTags(true);
    try {
      const tagsData = await api.getPracticeTags(selectedInstitution, selectedFaculty);
      setAvailableTags(tagsData.tags);
    } catch (error) {
      console.error('Ошибка загрузки тегов:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const loadCompanies = async () => {
    if (!selectedInstitution || !selectedFaculty) return;

    setLoading(true);
    try {
      const companiesData = await api.getPracticeCompanies(selectedInstitution, selectedFaculty);
      setCompanies(companiesData);
      setFilteredCompanies(companiesData);
    } catch (error) {
      console.error('Ошибка загрузки компаний:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompanies = () => {
    let filtered = [...companies];

    // Фильтр по тегам
    if (selectedTags.length > 0) {
      filtered = filtered.filter(company => 
        selectedTags.some(tag => 
          company.tags && company.tags.includes(tag)
        )
      );
    }

    // Фильтр по поисковому запросу
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(query) ||
        company.description?.toLowerCase().includes(query) ||
        company.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredCompanies(filtered);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const resetFilters = () => {
    setFilterStep('institution');
    setSelectedInstitution(null);
    setSelectedFaculty(null);
    setSelectedTags([]);
    setSearchQuery('');
    setCompanies([]);
    setFilteredCompanies([]);
    setAvailableTags([]);
  };

  const handleInstitutionSelect = (institution: string) => {
    setSelectedInstitution(institution);
    setFilterStep('faculty');
  };

  const handleFacultySelect = (faculty: string) => {
    setSelectedFaculty(faculty);
    setFilterStep('interests');
    // Теги загрузятся автоматически через useEffect
  };

  const handleInterestsComplete = () => {
    setFilterStep('companies');
    loadCompanies();
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

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>

        {/* Фильтр 1: Учебное заведение */}
        {filterStep === 'institution' && institutionsStructure && (
          <CellList mode="island" header={<CellHeader>Выберите учебное заведение</CellHeader>}>
            {institutionsStructure.institutions.map((institution, idx) => (
              <CellSimple
                key={idx}
                onClick={() => handleInstitutionSelect(institution.name)}
                style={{ padding: '16px' }}
              >
                <Typography.Body variant="medium" style={{
                  fontWeight: 500,
                  fontSize: 16,
                  color: '#000000'
                }}>
                  {institution.name}
                </Typography.Body>
              </CellSimple>
            ))}
          </CellList>
        )}

        {/* Фильтр 2: Факультет */}
        {filterStep === 'faculty' && selectedInstitution && institutionsStructure && (
          <CellList mode="island" header={<CellHeader>Выберите факультет</CellHeader>}>
            {institutionsStructure.institutions
              .find(inst => inst.name === selectedInstitution)
              ?.faculties.map((faculty, idx) => (
                <CellSimple
                  key={idx}
                  onClick={() => handleFacultySelect(faculty.name)}
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
              ))}
            <Flex gap={8} style={{ padding: '16px' }}>
              <div
                onClick={() => {
                  setFilterStep('institution');
                  setAvailableTags([]);
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 8,
                  backgroundColor: '#F5F5F5'
                }}
              >
                <Typography.Body variant="medium" style={{
                  color: '#2980F2',
                  fontWeight: 500,
                  fontSize: 16
                }}>
                  Назад
                </Typography.Body>
              </div>
            </Flex>
          </CellList>
        )}

        {/* Фильтр 3: Интересы (теги) */}
        {filterStep === 'interests' && selectedFaculty && (
          <CellList mode="island" header={<CellHeader>Меня интересует</CellHeader>}>
            <Flex direction="column" gap={12} style={{ padding: '16px' }}>
              <Typography.Body variant="small" style={{
                fontSize: 14,
                color: '#666666',
                marginBottom: 8
              }}>
                Выберите одну или несколько технологий/направлений, которые вас интересуют
              </Typography.Body>
              {loadingTags ? (
                <Flex justify="center" style={{ padding: '20px 0' }}>
                  <Spinner size={24} />
                </Flex>
              ) : availableTags.length === 0 ? (
                <Typography.Body variant="small" style={{
                  fontSize: 14,
                  color: '#999999',
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  Теги не найдены для выбранного факультета
                </Typography.Body>
              ) : (
                <Flex gap={8} wrap="wrap">
                  {availableTags.map((tag) => (
                      <Button
                        key={tag}
                        mode={selectedTags.includes(tag) ? 'primary' : 'secondary'}
                        onClick={() => toggleTag(tag)}
                        style={{
                          fontWeight: selectedTags.includes(tag) ? 600 : 500,
                          padding: '10px 16px',
                        }}
                      >
                        {tag}
                      </Button>
                  ))}
                </Flex>
              )}
            </Flex>
            <Flex gap={8} style={{ padding: '16px' }}>
              <div
                onClick={() => {
                  setFilterStep('faculty');
                  setSelectedTags([]);
                  setAvailableTags([]);
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 8,
                  backgroundColor: '#F5F5F5'
                }}
              >
                <Typography.Body variant="medium" style={{
                  color: '#2980F2',
                  fontWeight: 500,
                  fontSize: 16
                }}>
                  Назад
                </Typography.Body>
              </div>
              <div
                onClick={handleInterestsComplete}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 8,
                  backgroundColor: '#F5F5F5'
                }}
              >
                <Typography.Body variant="medium" style={{
                  color: '#2980F2',
                  fontWeight: 500,
                  fontSize: 16
                }}>
                  Продолжить
                </Typography.Body>
              </div>
            </Flex>
          </CellList>
        )}

        {/* Результаты: Список компаний */}
        {filterStep === 'companies' && (
          <>
            {/* Поиск */}
            <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск компаний..."
              />
            </div>

            {/* Информация о выбранных фильтрах */}
            <CellList mode="island" header={<CellHeader>Выбранные фильтры</CellHeader>}>
              <CellSimple style={{ padding: '16px' }}>
                <Flex direction="column" gap={8}>
                  <Typography.Body variant="small" style={{ fontSize: 14, color: '#666666' }}>
                    Учебное заведение: {selectedInstitution}
                  </Typography.Body>
                  <Typography.Body variant="small" style={{ fontSize: 14, color: '#666666' }}>
                    Факультет: {selectedFaculty ? formatFacultyName(selectedFaculty) : 'Не выбран'}
                  </Typography.Body>
                  {selectedTags.length > 0 && (
                    <Typography.Body variant="small" style={{ fontSize: 14, color: '#666666' }}>
                      Интересы: {selectedTags.join(', ')}
                    </Typography.Body>
                  )}
                </Flex>
              </CellSimple>
              <Flex gap={8} style={{ padding: '16px' }}>
                <Button
                  mode="secondary"
                  onClick={resetFilters}
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
                  Сбросить фильтры
                </Button>
              </Flex>
            </CellList>

            {/* Список компаний */}
            <CellList mode="island" header={<CellHeader>Доступные компании</CellHeader>}>
              {filteredCompanies.length === 0 ? (
                <CellSimple style={{ padding: '16px' }}>
                  <Typography.Body variant="medium" style={{
                    fontSize: 16,
                    color: '#666666',
                    textAlign: 'center'
                  }}>
                    Компании не найдены
                  </Typography.Body>
                </CellSimple>
              ) : (
                filteredCompanies.map((company) => (
                  <CellSimple
                    key={company.id}
                    onClick={() => {
                      // Передаем все состояние фильтров при переходе на страницу компании
                      const practiceState = {
                        institution: selectedInstitution,
                        faculty: selectedFaculty,
                        selectedInstitution: selectedInstitution,
                        selectedFaculty: selectedFaculty,
                        selectedTags: selectedTags,
                        filterStep: filterStep,
                        searchQuery: searchQuery,
                      };
                      navigate(`/practice/companies/${company.id}`, {
                        state: practiceState,
                      });
                    }}
                    style={{ padding: '16px', cursor: 'pointer' }}
                  >
                    <Flex gap={12} align="flex-start" justify="space-between">
                      <Flex direction="column" gap={8} style={{ flex: 1 }}>
                        <Typography.Body variant="medium" style={{
                          fontWeight: 600,
                          fontSize: 16,
                          color: '#000000'
                        }}>
                          {company.name}
                        </Typography.Body>
                        {company.description && (
                          <Typography.Body variant="small" style={{
                            fontSize: 14,
                            color: '#666666',
                            lineHeight: 1.4
                          }}>
                            {company.description}
                          </Typography.Body>
                        )}
                        <Flex gap={8} wrap="wrap" style={{ marginTop: 4 }}>
                          {company.tags && company.tags.map((tag, tagIdx) => (
                            <Typography.Body key={tagIdx} variant="small" style={{
                              fontSize: 12,
                              color: '#2980F2',
                              backgroundColor: '#E8F4FD',
                              padding: '4px 8px',
                              borderRadius: 4
                            }}>
                              {tag}
                            </Typography.Body>
                          ))}
                        </Flex>
                      </Flex>
                      
                      {/* Аватарка компании справа */}
                      <Flex direction="column" gap={8} align="center" style={{ flexShrink: 0 }}>
                        <div style={{
                          width: 56,
                          height: 56,
                          minWidth: 56,
                          minHeight: 56,
                          borderRadius: 8,
                          backgroundColor: '#2980F2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {company.avatar ? (
                            <img
                              src={company.avatar}
                              alt={company.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <Typography.Body variant="medium" style={{
                              fontSize: 24,
                              color: '#FFFFFF',
                              fontWeight: 700,
                              margin: 0,
                            }}>
                              {company.name.charAt(0).toUpperCase()}
                            </Typography.Body>
                          )}
                        </div>
                        {/* Оценка под аватаркой */}
                        <Flex gap={4} align="center">
                          <img 
                            src="/star.png" 
                            alt="⭐" 
                            style={{
                              width: 16,
                              height: 16,
                              objectFit: 'contain',
                            }}
                          />
                          <Typography.Body variant="small" style={{
                            fontSize: 13,
                            color: '#000000',
                            fontWeight: 500,
                          }}>
                            {(company.rating ?? 0).toFixed(2)}
                          </Typography.Body>
                        </Flex>
                      </Flex>
                    </Flex>
                  </CellSimple>
                ))
              )}
            </CellList>
          </>
        )}
      </Grid>
    </Container>
  );
}

export default PracticePage;

