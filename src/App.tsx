import { Navigate, Route, Routes } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TopNav } from './components/TopNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Applications } from './pages/Applications';
import { ApplicationDetails } from './pages/ApplicationDetails';
import { Analytics } from './pages/Analytics';
import { NewApplication } from './pages/NewApplication';
import { MyProfile } from './pages/MyProfile';

const useStyles = makeStyles({
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground3,
    backgroundImage: `radial-gradient(1100px 600px at 100% -8%, ${tokens.colorBrandBackground2} 0%, transparent 55%), radial-gradient(900px 500px at -8% 108%, ${tokens.colorPaletteTealBackground2} 0%, transparent 55%)`,
    backgroundAttachment: 'fixed',
  },
  content: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: tokens.spacingHorizontalXXL,
    '@media (max-width: 640px)': {
      padding: tokens.spacingHorizontalL,
    },
  },
  contentInner: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '1360px',
    marginInline: 'auto',
  },
});

export function App() {
  const styles = useStyles();
  return (
    <div className={styles.shell}>
      <TopNav />
      <main className={styles.content}>
        <div className={styles.contentInner}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/applications/:id" element={<ApplicationDetails />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/new-application" element={<NewApplication />} />
              <Route path="/my-profile" element={<MyProfile />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default App;
