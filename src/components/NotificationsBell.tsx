"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { api, formatDateTime } from "@/lib/storage";
import type { AppNotification } from "@/lib/types";

export function NotificationsBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = useCallback(() => {
    api
      .getNotifications()
      .then(setNotifications)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unread = notifications.filter((n) => !n.read);
  const unreadCount = unread.length;

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      try {
        await api.markNotificationRead(id);
      } catch {
        load();
      }
    },
    [load]
  );

  const markAllRead = useCallback(async () => {
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.allSettled(ids.map((id) => api.markNotificationRead(id)));
  }, [notifications]);

  const openNotification = useCallback(
    (notification: AppNotification) => {
      if (!notification.read) markRead(notification.id);
      if (notification.link) router.push(notification.link);
    },
    [markRead, router]
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Notifications
            </span>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-500">
              You&apos;re all caught up
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {notifications.slice(0, 10).map((notification) => (
                <DropdownMenu.Item
                  key={notification.id}
                  onSelect={() => openNotification(notification)}
                  className="cursor-pointer border-b border-slate-50 px-4 py-3 outline-none last:border-b-0 hover:bg-slate-50 focus:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/60 dark:focus:bg-slate-800/60"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 flex-none rounded-full ${
                        notification.read ? "bg-transparent" : "bg-blue-600"
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`truncate text-sm ${
                          notification.read
                            ? "text-slate-600 dark:text-slate-400"
                            : "font-medium text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-slate-500">{notification.body}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </DropdownMenu.Item>
              ))}
            </div>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
