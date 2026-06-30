import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  Caption1,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Tab,
  TabList,
  Text,
  Tooltip,
  makeStyles,
  tokens,
  type SelectTabData,
  type SelectTabEvent,
} from '@fluentui/react-components';
import {
  HomeRegular,
  HomeFilled,
  AddCircleRegular,
  AddCircleFilled,
  DocumentTableRegular,
  DocumentTableFilled,
  QuestionCircleRegular,
  QuestionCircleFilled,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  WrenchRegular,
  PersonRegular,
  SignOutRegular,
  bundleIcon,
} from '@fluentui/react-icons';
import type { ReactElement } from 'react';
import { useThemeMode } from './ThemeModeProvider';
import { useCurrentUser, initialsFromName } from '../context/UserContext';
import { ErrorBoundary } from './ErrorBoundary';

const HomeIcon = bundleIcon(HomeFilled, HomeRegular);
const ApplyIcon = bundleIcon(AddCircleFilled, AddCircleRegular);
const MyAppsIcon = bundleIcon(DocumentTableFilled, DocumentTableRegular);
const HelpIcon = bundleIcon(QuestionCircleFilled, QuestionCircleRegular);

interface NavItem {
  path: string;
  label: string;
  icon: ReactElement;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/user/home', label: 'Home', icon: <HomeIcon /> },
  { path: '/user/apply-loan', label: 'Apply Loan', icon: <ApplyIcon /> },
  { path: '/user/my-applications', label: 'My Applications', icon: <MyAppsIcon /> },
  { path: '/user/help', label: 'Help', icon: <HelpIcon /> },
];

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
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    height: '60px',
    paddingInline: tokens.spacingHorizontalXL,
    boxSizing: 'border-box',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: `color-mix(in srgb, ${tokens.colorNeutralBackground1} 80%, transparent)`,
    backdropFilter: 'blur(20px)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    padding: 0,
    color: 'inherit',
  },
  logoTile: {
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusLarge,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorNeutralForegroundOnBrand,
    fontWeight: tokens.fontWeightBold,
    fontSize: '15px',
    backgroundImage: `linear-gradient(135deg, ${tokens.colorBrandBackground}, ${tokens.colorBrandBackgroundPressed})`,
    boxShadow: tokens.shadow4,
  },
  brandName: {
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: 'nowrap',
    '@media (max-width: 900px)': { display: 'none' },
  },
  centerNav: {
    flexShrink: 0,
    marginInline: 'auto',
    overflowX: 'auto',
    '@media (max-width: 520px)': { display: 'none' },
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
  },
  avatarButton: {
    border: 'none',
    background: 'none',
    padding: 0,
    cursor: 'pointer',
    borderRadius: tokens.borderRadiusCircular,
    display: 'flex',
  },
  menuUser: {
    display: 'flex',
    flexDirection: 'column',
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
    maxWidth: '240px',
  },
  menuHead: {
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground3,
  },
  muted: { color: tokens.colorNeutralForeground3 },
  content: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'auto',
    boxSizing: 'border-box',
    padding: tokens.spacingHorizontalXXL,
    '@media (max-width: 640px)': { padding: tokens.spacingHorizontalL },
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
 * Layout for the Applicant portal (`/user/*`): a Fluent v9 header with responsive
 * navigation, a content area (routed pages via <Outlet />), and an avatar menu
 * containing the portal switcher.
 */
export function UserLayout() {
  const styles = useStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useThemeMode();
  const { user } = useCurrentUser();

  const selected =
    NAV_ITEMS.find(
      (item) =>
        location.pathname === item.path ||
        (item.path !== '/user/home' && location.pathname.startsWith(item.path)),
    )?.path ?? '/user/home';

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    navigate(data.value as string);
  };

  const isDark = mode === 'dark';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button
          className={styles.brand}
          onClick={() => navigate('/user/home')}
          aria-label="Innorve Loan Portal home"
        >
          <span className={styles.logoTile} aria-hidden>
            IL
          </span>
          <Text className={styles.brandName} size={400}>
            Innorve Loan Portal
          </Text>
        </button>

        <nav className={styles.centerNav} aria-label="Primary">
          <TabList appearance="subtle" selectedValue={selected} onTabSelect={onTabSelect}>
            {NAV_ITEMS.map((item) => (
              <Tab key={item.path} value={item.path} icon={item.icon}>
                {item.label}
              </Tab>
            ))}
          </TabList>
        </nav>

        <div className={styles.right}>
          <Tooltip content={isDark ? 'Light mode' : 'Dark mode'} relationship="label">
            <Button
              appearance="subtle"
              icon={isDark ? <WeatherSunnyRegular /> : <WeatherMoonRegular />}
              onClick={toggle}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            />
          </Tooltip>

          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <button className={styles.avatarButton} aria-label="Account menu">
                <Avatar
                  name={user.fullName || 'User'}
                  initials={initialsFromName(user.fullName || 'User')}
                  color="colorful"
                  size={32}
                />
              </button>
            </MenuTrigger>
            <MenuPopover>
              <div className={styles.menuUser}>
                <Text weight="semibold" truncate wrap={false}>
                  {user.fullName || 'User'}
                </Text>
                {user.email && (
                  <Caption1 className={styles.muted} truncate wrap={false}>
                    {user.email}
                  </Caption1>
                )}
              </div>
              <MenuDivider />
              <Caption1 className={styles.menuHead}>Switch portal</Caption1>
              <MenuList>
                <MenuItem icon={<WrenchRegular />} onClick={() => navigate('/admin/dashboard')}>
                  Admin Portal
                </MenuItem>
                <MenuItem icon={<PersonRegular />} onClick={() => navigate('/user/home')}>
                  Applicant Portal
                </MenuItem>
                <MenuDivider />
                <Tooltip content="Sign out is managed by the Power Apps host" relationship="label">
                  <MenuItem icon={<SignOutRegular />} disabled>
                    Sign out
                  </MenuItem>
                </Tooltip>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.contentInner}>
          <ErrorBoundary homePath="/user/home">
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default UserLayout;
