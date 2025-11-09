import { useNavigate } from 'react-router-dom';
import { Typography, Flex } from '@maxhub/max-ui';

function ServicesPage() {
  const navigate = useNavigate();

  const services = [
    {
      id: 'schedule',
      title: 'Расписание',
      icon: '/расписание.png',
      path: '/schedule',
    },
    {
      id: 'webinars',
      title: 'Мероприятия',
      icon: '/мероприятия.png',
      path: '/events',
    },
    {
      id: 'teachers',
      title: 'Преподаватели',
      icon: '/преподаватели.png',
      path: '/teachers',
    },
    {
      id: 'references',
      title: 'Дедлайны',
      icon: '/дедлайн.png',
      path: '/deadlines',
    },
    {
      id: 'library',
      title: 'Библиотека',
      icon: '/библиотека.png',
      path: '#',
    },
    {
      id: 'practice',
      title: 'Практика',
      icon: '/практика.png',
      path: '/practice',
    },
    {
      id: 'support',
      title: 'Поддержка',
      icon: '/хелп.png',
      path: '/support',
    },
    {
      id: 'volunteering',
      title: 'Волонтерство',
      icon: '/анималзабота.png',
      path: '#',
    },
    {
      id: 'certificates',
      title: 'Справки',
      icon: '/справки.png',
      path: '#',
    },
    {
      id: 'contacts',
      title: 'Контакты',
      icon: '/звонки.png',
      path: '#',
    }
  ];

  return (
    <div style={{ flex: 1, paddingTop: 16, paddingBottom: 20, display: 'flex', flexDirection: 'column' }}>
      {/* Белый контейнер с сервисами */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: '18px',
        marginTop: 8,
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Сетка сервисов 3x2 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px'
        }}>
          {services.map((service) => (
            <div
              key={service.id}
              onClick={() => service.path !== '#' && navigate(service.path)}
              style={{
                backgroundColor: '#EFEFEF',
                borderRadius: 16,
                padding: '16px',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: service.path !== '#' ? 'pointer' : 'default',
                border: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (service.path !== '#') {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Текст вверху слева */}
              <Typography.Body
                variant="medium"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#000000',
                  lineHeight: 1.4,
                  marginBottom: 'auto',
                  zIndex: 1,
                  position: 'relative'
                }}
              >
                {service.title}
              </Typography.Body>

              {/* Иконка внизу справа */}
              <div
                style={{
                  width: 60,
                  height: 60,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                  marginTop: 'auto',
                  marginLeft: 'auto',
                  zIndex: 1,
                  position: 'relative'
                }}
              >
                {service.icon.startsWith('/') ? (
                  <img 
                    src={service.icon} 
                    alt={service.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 48, lineHeight: 1 }}>
                    {service.icon}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ServicesPage;

