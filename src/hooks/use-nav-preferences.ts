import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ALL_NAV_ITEMS, type NavItem } from "@/lib/nav-items";

export interface NavItemPreference {
  id: string;
  visible: boolean;
  order: number;
}

const getStorageKey = (userId: string) => `nav-preferences-${userId}`;
const NAV_PREF_CHANGED = "nav-preferences-changed";

function buildDefaultPreferences(): NavItemPreference[] {
  return ALL_NAV_ITEMS.map((item, index) => ({
    id: item.id,
    visible: true,
    order: index,
  }));
}

function mergeWithDefaults(saved: NavItemPreference[]): NavItemPreference[] {
  const defaults = buildDefaultPreferences();
  const savedIds = new Set(saved.map((p) => p.id));
  const maxOrder = saved.reduce((max, p) => Math.max(max, p.order), -1);
  const missing = defaults
    .filter((d) => !savedIds.has(d.id))
    .map((d, i) => ({ ...d, order: maxOrder + i + 1 }));
  const validIds = new Set(ALL_NAV_ITEMS.map((item) => item.id));
  const filtered = saved.filter((p) => validIds.has(p.id));
  return [...filtered, ...missing];
}

function loadFromStorage(userId: string): NavItemPreference[] {
  const saved = localStorage.getItem(getStorageKey(userId));
  if (!saved) return buildDefaultPreferences();
  try {
    return mergeWithDefaults(JSON.parse(saved) as NavItemPreference[]);
  } catch {
    return buildDefaultPreferences();
  }
}

export function useNavPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NavItemPreference[]>([]);

  // 초기 로드
  useEffect(() => {
    setPreferences(user?.id ? loadFromStorage(String(user.id)) : buildDefaultPreferences());
  }, [user?.id]);

  // 다른 훅 인스턴스가 저장했을 때 동기화
  useEffect(() => {
    if (!user?.id) return;
    const handleChange = (e: CustomEvent<{ userId: string; prefs: NavItemPreference[] }>) => {
      if (String(e.detail.userId) === String(user.id)) {
        setPreferences(e.detail.prefs);
      }
    };
    window.addEventListener(NAV_PREF_CHANGED, handleChange as EventListener);
    return () => window.removeEventListener(NAV_PREF_CHANGED, handleChange as EventListener);
  }, [user?.id]);

  const savePreferences = useCallback(
    (prefs: NavItemPreference[]) => {
      if (!user?.id) return;
      localStorage.setItem(getStorageKey(String(user.id)), JSON.stringify(prefs));
      setPreferences(prefs);
      window.dispatchEvent(
        new CustomEvent(NAV_PREF_CHANGED, { detail: { userId: String(user.id), prefs } })
      );
    },
    [user?.id]
  );

  const getVisibleNavItems = useCallback(
    (isAdmin: boolean): NavItem[] =>
      ALL_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
        .map((item) => {
          const pref = preferences.find((p) => p.id === item.id);
          return { item, pref };
        })
        .filter(({ pref }) => pref?.visible !== false)
        .sort((a, b) => (a.pref?.order ?? Infinity) - (b.pref?.order ?? Infinity))
        .map(({ item }) => item),
    [preferences]
  );

  const resetToDefault = useCallback(() => {
    savePreferences(buildDefaultPreferences());
  }, [savePreferences]);

  return { preferences, getVisibleNavItems, savePreferences, resetToDefault };
}
