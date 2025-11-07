import { Container, Grid, Typography, Flex } from '@maxhub/max-ui';

function ProfilePage() {
  return (
    <Container style={{ flex: 1, paddingTop: 16, paddingBottom: 20, paddingLeft: 0, paddingRight: 0 }}>
      <Grid gap={20} cols={1}>
        <div style={{ paddingLeft: 'var(--spacing-size-xl, 16px)', paddingRight: 'var(--spacing-size-xl, 16px)' }}>
          <Typography.Title style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 0
          }}>
            Профиль
          </Typography.Title>
        </div>
      </Grid>
    </Container>
  );
}

export default ProfilePage;

