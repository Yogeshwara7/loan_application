import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Caption1,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  SearchBox,
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
  GridRegular,
  GridFilled,
  DocumentTableRegular,
  DocumentTableFilled,
  AddCircleRegular,
  AddCircleFilled,
  DataTrendingRegular,
  DataTrendingFilled,
  AlertRegular,
  WeatherMoonRegular,
  WeatherSunnyRegular,
  PersonRegular,
  SettingsRegular,
  SignOutRegular,
  bundleIcon,
} from '@fluentui/react-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useThemeMode } from './ThemeModeProvider';
import { useLoanData } from '../context/LoanDataContext';
import { useCurrentUser, initialsFromName } from '../context/UserContext';
import { computeDashboardMetrics } from '../models/loan';

const DashboardIcon = bundleIcon(GridFilled, GridRegular);
const ApplicationsIcon = bundleIcon(DocumentTableFilled, DocumentTableRegular);
const NewAppIcon = bundleIcon(AddCircleFilled, AddCircleRegular);
const AnalyticsIcon = bundleIcon(DataTrendingFilled, DataTrendingRegular);

interface NavItem {
  path: string;
  label: string;
  icon: ReactElement;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/applications', label: 'Applications', icon: <ApplicationsIcon /> },
  { path: '/new-application', label: 'New Application', icon: <NewAppIcon /> },
  { path: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
];

const useStyles = makeStyles({
  root: {
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
    '@media (max-width: 900px)': {
      display: 'none',
    },
  },
  centerNav: {
    flexShrink: 0,
    marginInline: 'auto',
    overflowX: 'auto',
    '@media (max-width: 640px)': {
      display: 'none',
    },
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
  },
  search: {
    width: '220px',
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
  notifyButton: {
    position: 'relative',
  },
  notifyDot: {
    position: 'absolute',
    top: '6px',
    right: '6px',
  },
  notifyHead: {
    paddingInline: tokens.spacingHorizontalM,
    paddingBlock: tokens.spacingVerticalS,
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
  muted: {
    color: tokens.colorNeutralForeground3,
  },
});

/** Global top navigation: brand, center nav, search, notifications, avatar menu. */
export function TopNav() {
  const styles = useStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggle } = useThemeMode();
  const { records, status } = useLoanData();
  const { user } = useCurrentUser();
  const [query, setQuery] = useState('');

  const selected =
    NAV_ITEMS.find(
      (item) =>
        location.pathname === item.path ||
        (item.path !== '/dashboard' && location.pathname.startsWith(item.path)),
    )?.path ?? '/dashboard';

  const metrics = useMemo(() => computeDashboardMetrics(records), [records]);

  const onTabSelect = (_event: SelectTabEvent, data: SelectTabData) => {
    navigate(data.value as string);
  };

  const runSearch = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      navigate(`/applications${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''}`);
    }
  };

  const isDark = mode === 'dark';
  const hasNotifications = metrics.review > 0;

  return (
    <header className={styles.root}>
      <button className={styles.brand} onClick={() => navigate('/dashboard')} aria-label="Innorve Loan Manager home">
        <span className={styles.logoTile} aria-hidden>
          IL
        </span>
        <Text className={styles.brandName} size={400}>
          Innorve Loan Manager
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
        <SearchBox
          className={styles.search}
          placeholder="Search applications…"
          value={query}
          onChange={(_e, data) => setQuery(data.value)}
          onKeyDown={runSearch}
          aria-label="Global search"
        />

        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Tooltip content="Notifications" relationship="label">
              <Button
                className={styles.notifyButton}
                appearance="subtle"
                icon={<AlertRegular />}
                aria-label="Notifications"
              >
                {hasNotifications && (
                  <Badge className={styles.notifyDot} size="tiny" color="danger" aria-hidden />
                )}
              </Button>
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <div className={styles.notifyHead}>
              <Text weight="semibold">Notifications</Text>
            </div>
            <MenuDivider />
            <MenuList>
              {status === 'ready' ? (
                <>
                  {metrics.review > 0 && (
                    <MenuItem onClick={() => navigate('/applications?status=review')}>
                      {metrics.review} application{metrics.review === 1 ? '' : 's'} need review
                    </MenuItem>
                  )}
                  {metrics.received > 0 && (
                    <MenuItem onClick={() => navigate('/applications?status=received')}>
                      {metrics.received} newly received
                    </MenuItem>
                  )}
                  <MenuItem onClick={() => navigate('/applications')}>
                    {metrics.total} total applications
                  </MenuItem>
                </>
              ) : (
                <MenuItem disabled>Loading…</MenuItem>
              )}
            </MenuList>
          </MenuPopover>
        </Menu>

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
            <MenuList>
              <MenuItem icon={<PersonRegular />} onClick={() => navigate('/my-profile')}>
                Profile
              </MenuItem>
              <MenuItem icon={<SettingsRegular />} onClick={() => navigate('/my-profile')}>
                Settings
              </MenuItem>
              <MenuDivider />
              <Tooltip
                content="Sign out is managed by the Power Apps host"
                relationship="label"
              >
                <MenuItem icon={<SignOutRegular />} disabled>
                  Sign out
                </MenuItem>
              </Tooltip>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </header>
  );
}

export default TopNav;
