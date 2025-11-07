import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MaxUI } from '@maxhub/max-ui';
import '@maxhub/max-ui/dist/styles.css';
import App from './App';
import './index.css';
import './styles/colors.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaxUI 
      colorScheme="light"
      style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}
    >
      <App />
    </MaxUI>
  </StrictMode>
);

