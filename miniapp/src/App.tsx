import React, { useEffect, useState } from 'react';
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
import SetupPage from './pages/SetupPage';
import api from './api/client';

// Компонент для защищенных маршрутов (требуют настройки)
function ProtectedRoute({ children, needsSetup }: { children: React.ReactElement; needsSetup: boolean }) {
  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }
  return children;
}

function AppContent() {
  const location = useLocation();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Страницы, на которых должна отображаться нижняя навигация
  const showBottomNav = ['/', '/services', '/profile'].includes(location.pathname);
  
  // Страницы настройки (без Header и BottomNavigation)
  const isSetupPage = location.pathname === '/setup';

  useEffect(() => {
    checkSetup();
  }, [location.pathname]);

  const checkSetup = async () => {
    try {
      const user = await api.getUser();
      const needs = !user.institution_name || !user.group_name;
      setNeedsSetup(needs);
      
      // Если мы на странице setup и настройка завершена, редиректим на главную
      if (location.pathname === '/setup' && !needs) {
        // Не делаем редирект здесь, чтобы избежать циклов
      }
    } catch (error) {
      console.error('Ошибка проверки настройки:', error);
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  };

  // Показываем loading только если проверяем настройку
  if (loading && needsSetup === null) {
    return (
      <Panel mode="secondary" style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', position: 'relative', backgroundColor: '#F5F5F5' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Можно добавить спиннер */}
        </div>
      </Panel>
    );
  }

  // Если это страница setup, не показываем Header и BottomNavigation
  // Но если настройка уже завершена, редиректим на главную
  if (isSetupPage) {
    if (needsSetup === false) {
      return <Navigate to="/" replace />;
    }
    return (
      <Panel mode="secondary" style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', position: 'relative', backgroundColor: '#2980F2', margin: 0, padding: 0 }}>
        <Routes>
          <Route path="/setup" element={<SetupPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </Panel>
    );
  }

  return (
    <Panel mode="secondary" style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', position: 'relative', backgroundColor: '#F5F5F5', paddingBottom: showBottomNav ? '80px' : '0', gap: 0, margin: 0 }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: 0, padding: 0 }}>
        <Routes>
          <Route path="/" element={<ProtectedRoute needsSetup={needsSetup || false}><MainMenu /></ProtectedRoute>} />
          <Route path="/schedule" element={<ProtectedRoute needsSetup={needsSetup || false}><SchedulePage /></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute needsSetup={needsSetup || false}><EventsPage /></ProtectedRoute>} />
          <Route path="/deadlines" element={<ProtectedRoute needsSetup={needsSetup || false}><DeadlinesPage /></ProtectedRoute>} />
          <Route path="/teachers" element={<ProtectedRoute needsSetup={needsSetup || false}><TeachersPage /></ProtectedRoute>} />
          <Route path="/teachers/:teacherName" element={<ProtectedRoute needsSetup={needsSetup || false}><TeacherDetailPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute needsSetup={needsSetup || false}><SettingsPage /></ProtectedRoute>} />
          <Route path="/services" element={<ProtectedRoute needsSetup={needsSetup || false}><ServicesPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute needsSetup={needsSetup || false}><ProfilePage /></ProtectedRoute>} />
          <Route path="/practice" element={<ProtectedRoute needsSetup={needsSetup || false}><PracticePage /></ProtectedRoute>} />
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

