import { useNavigate, useLocation } from 'react-router-dom';
import { Flex, Typography } from '@maxhub/max-ui';

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
  const renderBackButton = () => (
    <div
      onClick={() => navigate(-1)}
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
        src="/back.png" 
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
        src="/user.png" 
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

  return (
    <Flex
      align="center"
      justify="space-between"
      style={{
        padding: '12px var(--spacing-size-xl, 16px)',
        background: '#F5F5F5',
        borderBottom: '1px solid var(--background-surface-ground)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        minHeight: 56,
      }}
    >
      <Flex align="center" gap={12} style={{ flex: 1, alignItems: 'center' }}>
        {/* Условный рендеринг: кнопка назад или аватарка */}
        {showBackButton ? renderBackButton() : renderAvatar()}
        
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
      
      {/* Пустой блок справа для симметрии */}
      <div style={{ width: 40, flexShrink: 0 }} />
    </Flex>
  );
}

export default Header;

