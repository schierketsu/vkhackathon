import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Grid, CellSimple, CellList, CellHeader, Typography, Button, Flex, Spinner } from '@maxhub/max-ui';
import api from '../api/client';

interface PracticeApplication {
  id: number;
  user_id: string;
  company_id: string;
  company_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

function PracticeApplicationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<PracticeApplication[]>([]);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const data = await api.getPracticeApplications();
      setApplications(data);
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (applicationId: number) => {
    if (!confirm('Вы уверены, что хотите отменить заявку?')) {
      return;
    }
    try {
      await api.deletePracticeApplication(applicationId);
      await loadApplications();
    } catch (error) {
      console.error('Ошибка удаления заявки:', error);
      alert('Не удалось отменить заявку');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'На рассмотрении';
      case 'accepted':
        return 'Принята';
      case 'rejected':
        return 'Отклонена';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'accepted':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      default:
        return '#666666';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>
        {applications.length === 0 ? (
          <CellList mode="island" header={<CellHeader>Мои заявки</CellHeader>}>
            <CellSimple style={{ padding: '32px 16px', textAlign: 'center' }}>
              <Typography.Body variant="medium" style={{
                fontSize: 16,
                color: '#666666',
              }}>
                У вас пока нет поданных заявок
              </Typography.Body>
            </CellSimple>
          </CellList>
        ) : (
          <CellList mode="island" header={<CellHeader>Мои заявки ({applications.length})</CellHeader>}>
            {applications.map((application) => (
              <CellSimple key={application.id} style={{ padding: '16px' }}>
                <Flex direction="column" gap={12}>
                  <Flex justify="space-between" align="center" gap={8}>
                    <Typography.Body variant="medium" style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: '#000000',
                      flex: 1,
                    }}>
                      {application.company_name}
                    </Typography.Body>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      backgroundColor: getStatusColor(application.status) + '20',
                      flexShrink: 0,
                    }}>
                      <Typography.Body variant="small" style={{
                        fontSize: 12,
                        color: getStatusColor(application.status),
                        fontWeight: 500,
                      }}>
                        {getStatusText(application.status)}
                      </Typography.Body>
                    </div>
                  </Flex>
                  <Typography.Body variant="small" style={{
                    fontSize: 14,
                    color: '#666666',
                  }}>
                    Подана: {formatDate(application.created_at)}
                  </Typography.Body>
                  {application.status === 'pending' && (
                    <Button
                      mode="secondary"
                      onClick={() => handleDelete(application.id)}
                      style={{
                        marginTop: 8,
                        fontSize: 14,
                        padding: '8px 16px',
                      }}
                    >
                      Отменить заявку
                    </Button>
                  )}
                </Flex>
              </CellSimple>
            ))}
          </CellList>
        )}
      </Grid>
    </Container>
  );
}

export default PracticeApplicationsPage;

