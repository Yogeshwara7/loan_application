import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TopNav } from './TopNav';
import { ErrorBoundary } from './ErrorBoundary';
import { LoadingState } from './LoadingState';

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

/**
 * Layout for the Admin portal (`/admin/*`): the existing top-nav shell with the
 * routed admin pages rendered via <Outlet />. Error boundary + Suspense wrap the
 * routed content so the shell stays usable and lazy pages keep working.
 */
export function AdminLayout() {
  const styles = useStyles();
  return (
    <div className={styles.shell}>
      <TopNav />
      <main className={styles.content}>
        <div className={styles.contentInner}>
          <ErrorBoundary homePath="/admin/dashboard">
            <Suspense fallback={<LoadingState label="Loading page…" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
