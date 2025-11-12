import { useNavigate, useLocation } from 'react-router-dom';
import { Flex } from '@maxhub/max-ui';

function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      id: 'home',
      icon: '/home.png',
      label: 'Главная',
      path: '/'
    },
    {
      id: 'services',
      icon: '/services.png',
      label: 'Сервисы',
      path: '/services'
    },
    {
      id: 'profile',
      icon: '/profile.png',
      label: 'Профиль',
      path: '/settings'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E0E0E0',
        paddingTop: '8px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        zIndex: 1000,
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
        minHeight: 70
      }}
    >
      <Flex
        align="center"
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'space-around'
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '4px 8px 8px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <img 
              src={item.icon} 
              alt={item.label}
              style={{
                width: 26,
                height: 26,
                objectFit: 'contain',
                opacity: isActive(item.path) ? 1 : 0.5,
                display: 'block',
                flexShrink: 0
              }}
            />
            <span style={{
              fontSize: 13,
              fontWeight: isActive(item.path) ? 600 : 400,
              color: isActive(item.path) ? '#000000' : '#666666',
              lineHeight: 1.2,
              margin: 0,
              padding: 0,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              display: 'block'
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </Flex>
    </div>
  );
}

export default BottomNavigation;

