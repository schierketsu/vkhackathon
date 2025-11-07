import { useNavigate } from 'react-router-dom';
import { Container, Grid, Typography, Flex } from '@maxhub/max-ui';

function ServicesPage() {
  const navigate = useNavigate();

  const services = [
    {
      id: 'schedule',
      title: 'Расписание',
      icon: '/расписание.png',
      path: '/schedule',
      color: '#4A90E2'
    },
    {
      id: 'events',
      title: 'Мероприятия',
      icon: '/мероприятия.png',
      path: '/events',
      color: '#E94B8B'
    },
    {
      id: 'teachers',
      title: 'Преподаватели',
      icon: '/преподаватели.png',
      path: '/teachers',
      color: '#7B7B7B'
    },
    {
      id: 'deadlines',
      title: 'Дедлайны',
      icon: '/дедлайн.png',
      path: '/deadlines',
      color: '#9B59B6'
    },
    {
      id: 'library',
      title: 'Библиотека',
      icon: '/библиотека.png',
      path: '#',
      color: '#3498DB'
    },
    {
      id: 'contacts',
      title: 'Контакты',
      icon: '/звонки.png',
      path: '#',
      color: '#E94B8B'
    }
  ];

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
      <Grid gap={12} cols={2}>
        {services.map((service) => (
          <div
            key={service.id}
            onClick={() => service.path !== '#' && navigate(service.path)}
            style={{
              backgroundColor: '#F5F5F5',
              borderRadius: 16,
              padding: '16px',
              minHeight: 100,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              cursor: service.path !== '#' ? 'pointer' : 'default',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              transition: 'transform 0.2s, box-shadow 0.2s',
              border: '1px solid #E8E8E8'
            }}
            onMouseEnter={(e) => {
              if (service.path !== '#') {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
            }}
          >
            <Flex align="center" justify="space-between" style={{ width: '100%', flex: 1 }}>
              <Typography.Body
                variant="medium"
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#333333',
                  lineHeight: 1.4,
                  flex: 1,
                  marginRight: 8
                }}
              >
                {service.title}
              </Typography.Body>
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
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
                  <span style={{ fontSize: 32, lineHeight: 1 }}>
                    {service.icon}
                  </span>
                )}
              </div>
            </Flex>
          </div>
        ))}
      </Grid>
    </Container>
  );
}

export default ServicesPage;

