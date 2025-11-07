import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, CellHeader, Typography, Button, SearchInput, Flex, Spinner } from '@maxhub/max-ui';
import api from '../api/client';
import { formatFacultyName } from '../utils/formatters';

interface PracticeCompany {
  id: string;
  name: string;
  description?: string;
  location?: string;
  tags: string[];
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
  const [loading, setLoading] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [institutionsStructure, setInstitutionsStructure] = useState<PracticeInstitutionsStructure | null>(null);
  const [filterStep, setFilterStep] = useState<FilterStep>('institution');
  
  // Фильтры
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Данные
  const [companies, setCompanies] = useState<PracticeCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<PracticeCompany[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  useEffect(() => {
    loadData();
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
                <div
                  onClick={resetFilters}
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
                    color: '#FF3B30',
                    fontWeight: 500,
                    fontSize: 16
                  }}>
                    Сбросить фильтры
                  </Typography.Body>
                </div>
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
                      // TODO: Переход на страницу компании или открытие модального окна
                      console.log('Selected company:', company);
                    }}
                    style={{ padding: '16px', cursor: 'pointer' }}
                  >
                    <Flex direction="column" gap={8}>
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

