import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import { ThemeModeProvider } from './components/ThemeModeProvider';
import { UserProvider } from './context/UserContext';
import { LoanDataProvider } from './context/LoanDataContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeModeProvider>
      <UserProvider>
        <LoanDataProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </LoanDataProvider>
      </UserProvider>
    </ThemeModeProvider>
  </StrictMode>,
);
