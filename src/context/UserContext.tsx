import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getContext } from '@microsoft/power-apps/app';

export interface CurrentUser {
  fullName: string;
  email: string;
  objectId: string;
  tenantId: string;
}

interface UserContextValue {
  user: CurrentUser;
  ready: boolean;
}

const EMPTY_USER: CurrentUser = { fullName: '', email: '', objectId: '', tenantId: '' };

const UserContext = createContext<UserContextValue | undefined>(undefined);

/**
 * Resolves the signed-in user from the Power Apps host context once and shares
 * it across the shell (avatar), dashboard greeting and profile page.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser>(EMPTY_USER);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const context = await getContext();
        const ctxUser = context.user;
        if (!active) return;
        setUser({
          fullName: ctxUser.fullName?.trim() || ctxUser.userPrincipalName?.trim() || 'User',
          email: ctxUser.userPrincipalName?.trim() ?? '',
          objectId: ctxUser.objectId ?? '',
          tenantId: ctxUser.tenantId ?? '',
        });
      } catch {
        if (active) setUser(EMPTY_USER);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => ({ user, ready }), [user, ready]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCurrentUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used within a UserProvider.');
  }
  return ctx;
}

/** First name for greetings; falls back gracefully. */
export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0]!;
}

/** Up-to-two-letter initials from a name. */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
