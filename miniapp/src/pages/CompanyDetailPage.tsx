import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, CellHeader, Typography, Button, Flex, Spinner } from '@maxhub/max-ui';
import api from '../api/client';

interface PracticeCompany {
  id: string;
  name: string;
  description?: string;
  location?: string;
  tags: string[];
  avatar?: string;
  rating?: number;
}

function CompanyDetailPage() {
  const navigate = useNavigate();
  const { companyId } = useParams<{ companyId: string }>();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<PracticeCompany | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [userReview, setUserReview] = useState<{
    id: number;
    rating: number;
    comment?: string;
  } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Получаем institution и faculty из state или query параметров
  const state = location.state as { institution?: string; faculty?: string } | null;
  const searchParams = new URLSearchParams(location.search);
  const institution = state?.institution || searchParams.get('institution') || '';
  const faculty = state?.faculty || searchParams.get('faculty') || '';

  // Функции для загрузки данных (определены до useEffect)
  const checkApplication = async () => {
    if (!companyId) return Promise.resolve();
    try {
      const applications = await api.getPracticeApplications();
      const application = applications.find(app => app.company_id === companyId);
      setHasApplied(!!application);
    } catch (error) {
      console.error('Ошибка проверки заявки:', error);
    }
    return Promise.resolve();
  };

  const loadUserReview = async () => {
    if (!companyId) return Promise.resolve();
    try {
      const review = await api.getUserCompanyReview(companyId);
      if (review) {
        setUserReview({ id: review.id, rating: review.rating, comment: review.comment });
        setReviewRating(review.rating);
        setReviewComment(review.comment || '');
      }
    } catch (error) {
      console.error('Ошибка загрузки отзыва:', error);
    }
    return Promise.resolve();
  };

  useEffect(() => {
    console.log('CompanyDetailPage useEffect:', { companyId, institution, faculty, state });
    
    const loadData = async () => {
      if (!companyId) return;
      
      let finalInstitution = institution;
      let finalFaculty = faculty;
      
      // Если institution или faculty не переданы, пытаемся получить из sessionStorage
      if (!finalInstitution || !finalFaculty) {
        console.warn('Не указаны institution или faculty, пытаемся загрузить из sessionStorage');
        const savedInstitution = sessionStorage.getItem('practice_selectedInstitution');
        const savedFaculty = sessionStorage.getItem('practice_selectedFaculty');
        if (savedInstitution && savedFaculty) {
          finalInstitution = savedInstitution;
          finalFaculty = savedFaculty;
        }
      }
      
      if (finalInstitution && finalFaculty) {
        setLoading(true);
        try {
          console.log('Загрузка компании с данными:', { companyId, finalInstitution, finalFaculty });
          const [companyData] = await Promise.all([
            api.getPracticeCompany(companyId, finalInstitution, finalFaculty),
            checkApplication(),
            loadUserReview(),
          ]);
          console.log('Компания загружена:', companyData);
          setCompany(companyData);
        } catch (error: any) {
          console.error('Ошибка загрузки данных компании:', error);
          console.error('Детали ошибки:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });
        } finally {
          setLoading(false);
        }
      } else {
        console.error('Не удалось получить institution или faculty');
        setLoading(false);
      }
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, institution, faculty]);

  const handleSubmitReview = async () => {
    if (!companyId || reviewRating < 1 || reviewRating > 5) return;
    
    setSubmittingReview(true);
    try {
      await api.createCompanyReview(companyId, reviewRating, reviewComment || undefined);
      await loadUserReview();
      
      // Обновляем рейтинг компании - перезагружаем данные компании
      const finalInstitution = institution || sessionStorage.getItem('practice_selectedInstitution') || '';
      const finalFaculty = faculty || sessionStorage.getItem('practice_selectedFaculty') || '';
      if (finalInstitution && finalFaculty) {
        try {
          const updatedCompany = await api.getPracticeCompany(companyId, finalInstitution, finalFaculty);
          setCompany(updatedCompany);
        } catch (error) {
          console.error('Ошибка обновления данных компании:', error);
        }
      }
      
      setShowReviewForm(false);
      alert('Отзыв успешно сохранен!');
    } catch (error) {
      console.error('Ошибка сохранения отзыва:', error);
      alert('Не удалось сохранить отзыв. Попробуйте позже.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!companyId || !userReview) return;
    
    if (!confirm('Вы уверены, что хотите удалить ваш отзыв?')) {
      return;
    }
    
    try {
      await api.deleteCompanyReview(companyId, userReview.id);
      setUserReview(null);
      setReviewRating(5);
      setReviewComment('');
      
      // Обновляем рейтинг компании - перезагружаем данные компании
      const finalInstitution = institution || sessionStorage.getItem('practice_selectedInstitution') || '';
      const finalFaculty = faculty || sessionStorage.getItem('practice_selectedFaculty') || '';
      if (finalInstitution && finalFaculty) {
        try {
          const updatedCompany = await api.getPracticeCompany(companyId, finalInstitution, finalFaculty);
          setCompany(updatedCompany);
        } catch (error) {
          console.error('Ошибка обновления данных компании:', error);
        }
      }
      
      alert('Отзыв успешно удален!');
    } catch (error) {
      console.error('Ошибка удаления отзыва:', error);
      alert('Не удалось удалить отзыв. Попробуйте позже.');
    }
  };

  const handleApply = async () => {
    if (!company || hasApplied) return;
    
    setApplying(true);
    try {
      await api.createPracticeApplication(company.id, company.name);
      setHasApplied(true);
      alert('Заявка успешно подана!');
    } catch (error: any) {
      console.error('Ошибка подачи заявки:', error);
      if (error.response?.data?.error?.includes('уже подана')) {
        setHasApplied(true);
      } else {
        alert('Не удалось подать заявку. Попробуйте позже.');
      }
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20 }}>
        <Flex direction="column" align="center" justify="center" style={{ minHeight: '50vh' }}>
          <Spinner size={32} />
          <Typography.Body style={{ color: 'var(--text-secondary)', marginTop: 16 }}>
            Загрузка...
          </Typography.Body>
        </Flex>
      </Container>
    );
  }

  if (!loading && !company) {
    return (
      <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20 }}>
        <CellList mode="island">
          <CellSimple style={{ padding: '32px 16px', textAlign: 'center' }}>
            <Typography.Body variant="medium" style={{
              fontSize: 16,
              color: '#666666',
              marginBottom: 8,
            }}>
              Компания не найдена
            </Typography.Body>
            {(!institution || !faculty) && (
              <Typography.Body variant="small" style={{
                fontSize: 14,
                color: '#999999',
                marginBottom: 16,
              }}>
                Не указаны учебное заведение или факультет
              </Typography.Body>
            )}
            <Button
              mode="secondary"
              onClick={() => navigate('/practice')}
              style={{ marginTop: 16 }}
            >
              Вернуться к списку компаний
            </Button>
          </CellSimple>
        </CellList>
      </Container>
    );
  }

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={16} cols={1}>
        {/* Основная информация о компании */}
        <CellList mode="island">
          <CellSimple style={{ padding: '20px 16px' }}>
            <Flex direction="column" gap={20}>
              {/* Аватарка, название и рейтинг */}
              <Flex gap={16} align="flex-start">
                {/* Аватарка */}
                <div style={{
                  width: 100,
                  height: 100,
                  minWidth: 100,
                  minHeight: 100,
                  borderRadius: 12,
                  backgroundColor: '#2980F2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}>
                  {company && company.avatar ? (
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
                    <Typography.Title style={{
                      fontSize: 40,
                      color: '#FFFFFF',
                      margin: 0,
                      fontWeight: 700,
                    }}>
                      {company?.name.charAt(0).toUpperCase() || '?'}
                    </Typography.Title>
                  )}
                </div>

                {/* Информация о компании */}
                {company && (
                  <>
                    <Flex direction="column" gap={8} style={{ flex: 1, minWidth: 0 }}>
                      <Typography.Title style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#000000',
                        margin: 0,
                        lineHeight: 1.2,
                      }}>
                        {company.name}
                      </Typography.Title>
                      
                      {/* Рейтинг и локация */}
                      <Flex direction="column" gap={6}>
                        {/* Рейтинг */}
                        <Flex gap={6} align="center">
                          <img 
                            src="/star.png" 
                            alt="⭐" 
                            style={{
                              width: 16,
                              height: 16,
                              objectFit: 'contain',
                            }}
                          />
                          <Typography.Body variant="medium" style={{
                            fontSize: 15,
                            color: '#000000',
                            fontWeight: 600,
                          }}>
                            {(company.rating ?? 0).toFixed(2)}
                          </Typography.Body>
                        </Flex>

                        {/* Локация */}
                        {company.location && (
                          <Flex gap={6} align="center">
                            <img 
                              src="/placeholder2.png" 
                              alt="📍" 
                              style={{
                                width: 14,
                                height: 14,
                                objectFit: 'contain',
                              }}
                            />
                            <Typography.Body variant="small" style={{
                              fontSize: 14,
                              color: '#666666',
                            }}>
                              {company.location}
                            </Typography.Body>
                          </Flex>
                        )}
                      </Flex>
                    </Flex>

                    {/* Разделитель */}
                    <div style={{
                      height: 1,
                      backgroundColor: '#E5E5E5',
                      width: '100%',
                    }} />

                    {/* Описание */}
                    {company.description && (
                      <div>
                        <Typography.Body variant="medium" style={{
                          fontSize: 15,
                          color: '#000000',
                          fontWeight: 600,
                          marginBottom: 10,
                          display: 'block',
                        }}>
                          О нас:
                        </Typography.Body>
                        <Typography.Body variant="small" style={{
                          fontSize: 14,
                          color: '#666666',
                          lineHeight: 1.6,
                          display: 'block',
                          marginTop: 4,
                        }}>
                          {company.description}
                        </Typography.Body>
                      </div>
                    )}

                    {/* Теги */}
                    {company.tags && company.tags.length > 0 && (
                      <div>
                        <Typography.Body variant="medium" style={{
                          fontSize: 15,
                          color: '#000000',
                          fontWeight: 600,
                          marginBottom: 10,
                        }}>
                          Направления
                        </Typography.Body>
                        <Flex gap={6} wrap="wrap" style={{ marginTop: 12 }}>
                          {company.tags.map((tag, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                backgroundColor: '#E8F4FD',
                              }}
                            >
                        <Typography.Body variant="small" style={{
                          fontSize: 13,
                          color: '#2980F2',
                          fontWeight: 500,
                        }}>
                          {tag}
                        </Typography.Body>
                            </div>
                          ))}
                        </Flex>
                      </div>
                    )}
                  </>
                )}
              </Flex>

              {/* Кнопка подачи заявки */}
              <Button
                mode={hasApplied ? 'secondary' : 'primary'}
                onClick={handleApply}
                disabled={hasApplied || applying}
                style={{
                  fontSize: 16,
                  padding: '14px 24px',
                  width: '100%',
                  fontWeight: 600,
                }}
              >
                {applying ? 'Отправка...' : hasApplied ? 'Заявка подана' : 'Подать заявку'}
              </Button>
            </Flex>
          </CellSimple>
        </CellList>

        {/* Отзыв */}
        <CellList mode="island" header={<CellHeader>Отзыв</CellHeader>}>
          {!showReviewForm ? (
            <CellSimple style={{ padding: '20px' }}>
              {userReview ? (
                <Flex direction="column" gap={16}>
                  <Flex justify="space-between" align="flex-start" gap={12}>
                    <Typography.Body variant="medium" style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#000000',
                    }}>
                      Ваш отзыв
                    </Typography.Body>
                    <div style={{
                      display: 'flex',
                      gap: 4,
                      flexShrink: 0,
                    }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <img
                          key={star}
                          src="/star.png"
                          alt="⭐"
                          style={{
                            width: 20,
                            height: 20,
                            objectFit: 'contain',
                            opacity: star <= userReview.rating ? 1 : 0.3,
                            filter: star <= userReview.rating ? 'none' : 'grayscale(100%)',
                          }}
                        />
                      ))}
                    </div>
                  </Flex>
                  {userReview.comment && (
                    <div style={{
                      padding: '14px 16px',
                      backgroundColor: '#F5F5F5',
                      borderRadius: 10,
                      border: '1px solid #E0E0E0',
                    }}>
                      <Typography.Body variant="small" style={{
                        fontSize: 14,
                        color: '#333333',
                        lineHeight: 1.6,
                        margin: 0,
                      }}>
                        {userReview.comment}
                      </Typography.Body>
                    </div>
                  )}
                  <Flex gap={10} wrap="wrap">
                    <Button
                      mode="secondary"
                      onClick={() => setShowReviewForm(true)}
                      style={{
                        fontSize: 14,
                        padding: '10px 20px',
                        flex: 1,
                        minWidth: 120,
                      }}
                    >
                      Изменить
                    </Button>
                    <Button
                      mode="secondary"
                      onClick={handleDeleteReview}
                      style={{
                        fontSize: 14,
                        padding: '10px 20px',
                        flex: 1,
                        minWidth: 120,
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
                      Удалить
                    </Button>
                  </Flex>
                </Flex>
              ) : (
                <Button
                  mode="secondary"
                  onClick={() => setShowReviewForm(true)}
                  style={{
                    fontSize: 15,
                    padding: '14px 24px',
                    width: '100%',
                    fontWeight: 500,
                  }}
                >
                  Оставить отзыв
                </Button>
              )}
            </CellSimple>
          ) : (
            <CellSimple style={{ padding: '20px' }}>
              <Flex direction="column" gap={20}>
                {/* Оценка */}
                <div style={{ margin: 0, padding: 0 }}>
                  <Typography.Body variant="medium" style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#000000',
                    marginBottom: 14,
                    marginTop: 0,
                    marginLeft: 0,
                    marginRight: 0,
                    padding: 0,
                    display: 'block',
                  }}>
                    Ваша оценка
                  </Typography.Body>
                  <div style={{ 
                    display: 'flex', 
                    gap: 8, 
                    alignItems: 'center', 
                    margin: 0, 
                    padding: 0, 
                    marginTop: 14,
                    marginLeft: 0,
                    width: 'fit-content'
                  }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          transition: 'all 0.2s ease',
                          borderRadius: 8,
                          width: 40,
                          height: 40,
                          minWidth: 40,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.2)';
                          e.currentTarget.style.backgroundColor = 'rgba(41, 128, 242, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <img
                          src="/star.png"
                          alt="⭐"
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: 'contain',
                            opacity: star <= reviewRating ? 1 : 0.3,
                            filter: star <= reviewRating ? 'none' : 'grayscale(100%)',
                            transition: 'all 0.2s ease',
                            margin: 0,
                            padding: 0,
                          }}
                        />
                      </button>
                    ))}
                  </div>
                  {reviewRating > 0 && (
                    <Typography.Body variant="small" style={{
                      fontSize: 13,
                      color: '#666666',
                      textAlign: 'center',
                      marginTop: 8,
                    }}>
                      {reviewRating === 5 && 'Отлично!'}
                      {reviewRating === 4 && 'Хорошо!'}
                      {reviewRating === 3 && 'Нормально'}
                      {reviewRating === 2 && 'Плохо'}
                      {reviewRating === 1 && 'Очень плохо'}
                    </Typography.Body>
                  )}
                </div>

                {/* Разделитель */}
                <div style={{
                  height: 1,
                  backgroundColor: '#E5E5E5',
                  width: '100%',
                }} />

                {/* Комментарий */}
                <div>
                  <Typography.Body variant="medium" style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#000000',
                    marginBottom: 12,
                  }}>
                    Комментарий
                  </Typography.Body>
                  <Typography.Body variant="small" style={{
                    fontSize: 13,
                    color: '#999999',
                    marginBottom: 10,
                  }}>
                    Поделитесь вашим опытом (необязательно)
                  </Typography.Body>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Напишите ваш отзыв о компании..."
                    rows={5}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: '#000000',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E0E0E0',
                      borderRadius: 10,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#2980F2';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E0E0E0';
                    }}
                  />
                </div>

                {/* Кнопки */}
                <Flex gap={10} style={{ width: '100%' }}>
                  <Button
                    mode="secondary"
                    onClick={() => {
                      setShowReviewForm(false);
                      if (userReview) {
                        setReviewRating(userReview.rating);
                        setReviewComment(userReview.comment || '');
                      } else {
                        setReviewRating(5);
                        setReviewComment('');
                      }
                    }}
                    style={{
                      flex: 1,
                      fontSize: 14,
                      padding: '10px 20px',
                      backgroundColor: '#FF3B30',
                      color: '#FFFFFF',
                      borderColor: '#FF3B30',
                      minWidth: 0,
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
                  <Button
                    mode="primary"
                    onClick={handleSubmitReview}
                    disabled={submittingReview || reviewRating < 1}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      padding: '12px 20px',
                      fontWeight: 600,
                      minWidth: 0,
                    }}
                  >
                    {submittingReview ? 'Сохранение...' : 'Сохранить отзыв'}
                  </Button>
                </Flex>
              </Flex>
            </CellSimple>
          )}
        </CellList>
      </Grid>
    </Container>
  );
}

export default CompanyDetailPage;

