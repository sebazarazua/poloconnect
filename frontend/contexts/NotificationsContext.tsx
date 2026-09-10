import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getNotifications, markAllNotificationsRead } from "@/services/api/notifications";

type NotificationsContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  setServerUnreadCount: (count: number) => void;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function normalizeUnreadCount(count: number) {
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

export function NotificationsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadCountRef = useRef(0);
  const requestVersionRef = useRef(0);
  const readAllRequestRef = useRef<object | null>(null);
  const userId = user?.id;

  const setKnownUnreadCount = useCallback((count: number) => {
    const normalizedCount = normalizeUnreadCount(count);
    unreadCountRef.current = normalizedCount;
    setUnreadCount(normalizedCount);
  }, []);

  useEffect(() => {
    requestVersionRef.current += 1;
    readAllRequestRef.current = null;
    setKnownUnreadCount(0);
  }, [setKnownUnreadCount, userId]);

  const setServerUnreadCount = useCallback((count: number) => {
    if (readAllRequestRef.current) {
      return;
    }

    setKnownUnreadCount(count);
  }, [setKnownUnreadCount]);

  const refreshUnreadCount = useCallback(async () => {
    if (!userId || readAllRequestRef.current) {
      return;
    }

    const requestVersion = ++requestVersionRef.current;

    try {
      const response = await getNotifications({ limit: 1, read: "false" });
      if (requestVersion === requestVersionRef.current && !readAllRequestRef.current) {
        setKnownUnreadCount(response.unreadCount);
      }
    } catch {
      // Preserve the last confirmed state during a transient network failure.
    }
  }, [setKnownUnreadCount, userId]);

  const markAllAsRead = useCallback(async () => {
    if (!userId || readAllRequestRef.current) {
      return;
    }

    const request = {};
    const requestVersion = ++requestVersionRef.current;
    const previousUnreadCount = unreadCountRef.current;
    let shouldRefreshAfterFailure = false;
    readAllRequestRef.current = request;
    setKnownUnreadCount(0);

    try {
      await markAllNotificationsRead();
      if (requestVersion === requestVersionRef.current) {
        setKnownUnreadCount(0);
      }
    } catch {
      if (requestVersion === requestVersionRef.current) {
        setKnownUnreadCount(previousUnreadCount);
        shouldRefreshAfterFailure = true;
      }
    } finally {
      if (readAllRequestRef.current === request) {
        readAllRequestRef.current = null;
        if (shouldRefreshAfterFailure) {
          void refreshUnreadCount();
        }
      }
    }
  }, [refreshUnreadCount, setKnownUnreadCount, userId]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnreadCount, setServerUnreadCount, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications debe usarse dentro de NotificationsProvider.");
  }

  return context;
}
