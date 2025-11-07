import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Panel } from '@maxhub/max-ui';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import MainMenu from './components/MainMenu';
import SchedulePage from './pages/SchedulePage';
import EventsPage from './pages/EventsPage';
import DeadlinesPage from './pages/DeadlinesPage';
import TeachersPage from './pages/TeachersPage';
import TeacherDetailPage from './pages/TeacherDetailPage';
import SettingsPage from './pages/SettingsPage';
import ServicesPage from './pages/ServicesPage';
import ProfilePage from './pages/ProfilePage';
import PracticePage from './pages/PracticePage';

function AppContent() {
  const location = useLocation();
  
  // Страницы, на которых должна отображаться нижняя навигация
  const showBottomNav = ['/', '/services', '/profile'].includes(location.pathname);

  return (
    <Panel mode="secondary" style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', position: 'relative', backgroundColor: '#F5F5F5', paddingBottom: showBottomNav ? '80px' : '0', gap: 0, margin: 0 }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/deadlines" element={<DeadlinesPage />} />
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/teachers/:teacherName" element={<TeacherDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {showBottomNav && <BottomNavigation />}
    </Panel>
  );
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent />
    </Router>
  );
}

export default App;

