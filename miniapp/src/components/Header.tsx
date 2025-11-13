import { useNavigate, useLocation } from 'react-router-dom';
import { Flex, Typography, Button } from '@maxhub/max-ui';

/**
 * Единый компонент Header для всех страниц приложения
 * Автоматически определяет заголовок и отображает либо кнопку назад, либо аватарку
 */
function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  // Маппинг путей к заголовкам
  const pageTitles: Record<string, string> = {
    '/': 'Главная',
    '/settings': 'Настройки',
    '/services': 'Сервисы',
    '/schedule': 'Расписание',
    '/events': 'Мероприятия',
    '/deadlines': 'Дедлайны',
    '/teachers': 'Преподаватели',
    '/profile': 'Профиль',
    '/practice': 'Практика',
    '/practice/applications': 'Мои заявки',
    '/support': 'Поддержка',
  };

  /**
   * Получает заголовок страницы на основе текущего пути
   */
  const getTitle = (): string => {
    // Проверяем точное совпадение
    if (pageTitles[location.pathname]) {
      return pageTitles[location.pathname];
    }
    
    // Проверяем динамические пути (например, /teachers/:teacherName)
    if (location.pathname.startsWith('/teachers/')) {
      return 'Преподаватели';
    }
    
    // Проверяем путь к компании
    if (location.pathname.startsWith('/practice/companies/')) {
      return 'Компания';
    }
    
    // По умолчанию
    return 'Главная';
  };

  /**
   * Определяет, нужно ли показывать кнопку назад
   * На главной странице показываем аватарку, на остальных - кнопку назад
   */
  const isMainPage = location.pathname === '/';
  const showBackButton = !isMainPage;

  /**
   * Рендерит кнопку "Назад"
   */
  const renderBackButton = () => {
    const handleBack = () => {
      // Если мы на странице практики, всегда идем на страницу сервисов
      if (location.pathname === '/practice') {
        navigate('/services');
      }
      // Если мы на странице заявок и есть сохраненное состояние фильтров, передаем его
      else if (location.pathname === '/practice/applications') {
        const practiceState = location.state as {
          selectedInstitution?: string | null;
          selectedFaculty?: string | null;
          selectedTags?: string[];
          filterStep?: string;
          searchQuery?: string;
        } | null;
        
        if (practiceState) {
          navigate('/practice', { state: practiceState });
        } else {
          navigate('/practice');
        }
      }
      // Если мы на странице компании, возвращаемся на страницу практики с сохраненными фильтрами
      else if (location.pathname.startsWith('/practice/companies/')) {
        // Пытаемся получить состояние из location.state
        const practiceState = location.state as {
          selectedInstitution?: string | null;
          selectedFaculty?: string | null;
          selectedTags?: string[];
          filterStep?: string;
          searchQuery?: string;
        } | null;
        
        // Если состояние не передано, пытаемся восстановить из sessionStorage
        if (practiceState) {
          navigate('/practice', { state: practiceState });
        } else {
          // Восстанавливаем состояние из sessionStorage
          const savedInstitution = sessionStorage.getItem('practice_selectedInstitution');
          const savedFaculty = sessionStorage.getItem('practice_selectedFaculty');
          const savedTags = sessionStorage.getItem('practice_selectedTags');
          const savedFilterStep = sessionStorage.getItem('practice_filterStep');
          const savedSearchQuery = sessionStorage.getItem('practice_searchQuery');
          
          if (savedInstitution || savedFaculty || savedFilterStep) {
            const restoredState = {
              selectedInstitution: savedInstitution || null,
              selectedFaculty: savedFaculty || null,
              selectedTags: savedTags ? JSON.parse(savedTags) : [],
              filterStep: savedFilterStep || 'companies',
              searchQuery: savedSearchQuery || '',
            };
            navigate('/practice', { state: restoredState });
          } else {
            navigate('/practice');
          }
        }
      } else {
        navigate(-1);
      }
    };

    return (
      <div
        onClick={handleBack}
        style={{
          width: 40,
          height: 40,
          minWidth: 40,
          maxWidth: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          borderRadius: '50%',
          transition: 'background-color 0.2s',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <img 
          src="/back.svg" 
          alt="Назад" 
          style={{
            width: 24,
            height: 24,
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>
    );
  };

  /**
   * Рендерит аватарку пользователя
   */
  const renderAvatar = () => (
    <div
      style={{
        width: 40,
        height: 40,
        minWidth: 40,
        maxWidth: 40,
        borderRadius: '50%',
        backgroundColor: '#2980F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <img 
        src="/star2.png" 
        alt="User" 
        style={{
          width: '60%',
          height: '60%',
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </div>
  );

  const isPracticePage = location.pathname === '/practice';

  return (
    <Flex
      align="center"
      justify="space-between"
      data-header
      style={{
        padding: '12px var(--spacing-size-xl, 16px)',
        paddingTop: `max(12px, calc(12px + env(safe-area-inset-top, 0px)))`,
        background: '#F5F5F5',
        borderBottom: 'none',
        position: 'sticky',
        top: 0,
        width: '100%',
        maxWidth: '100%',
        minHeight: 56,
        height: 'auto',
        boxSizing: 'border-box',
        margin: 0,
        flexShrink: 0,
        zIndex: 100,
      } as React.CSSProperties}
    >
      <Flex align="center" gap={12} style={{ flex: 1, alignItems: 'center' }}>
        {/* Кнопка назад (если не главная страница) */}
        {showBackButton && renderBackButton()}
        
        {/* Заголовок страницы */}
        <Typography.Title style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
          padding: 0,
          lineHeight: '40px',
          height: 40,
          display: 'flex',
          alignItems: 'center'
        }}>
          {getTitle()}
        </Typography.Title>
      </Flex>
      
      {/* Кнопка "Мои заявки" на странице Практика или аватарка на главной */}
      {isPracticePage ? (
        <Button
          mode="primary"
          onClick={() => {
            // Сохраняем состояние фильтров в sessionStorage для восстановления при возврате
            const practiceState = {
              selectedInstitution: sessionStorage.getItem('practice_selectedInstitution'),
              selectedFaculty: sessionStorage.getItem('practice_selectedFaculty'),
              selectedTags: sessionStorage.getItem('practice_selectedTags') ? JSON.parse(sessionStorage.getItem('practice_selectedTags')!) : [],
              filterStep: sessionStorage.getItem('practice_filterStep') || 'companies',
              searchQuery: sessionStorage.getItem('practice_searchQuery') || '',
            };
            navigate('/practice/applications', { state: practiceState });
          }}
          style={{
            fontSize: 14,
            padding: '8px 16px',
            height: 36,
            backgroundColor: '#2980F2',
            color: '#FFFFFF',
          }}
        >
          Мои заявки
        </Button>
      ) : !showBackButton ? (
        renderAvatar()
      ) : (
        <div style={{ width: 40, flexShrink: 0 }} />
      )}
    </Flex>
  );
}

export default Header;

