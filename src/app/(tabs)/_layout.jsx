// The app's main tabs. Their paths mirror the website: / (home), /matches,
// /tournaments, /rankings; "More" holds the rest (teams, players, news,
// following, the account and the website's information pages).
import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fontFamily } from '../../theme/fonts.js';
import { useTheme } from '../../theme/useTheme.js';

const TABS = Object.freeze([
  { name: 'index', label: 'nav.home', icon: 'home' },
  { name: 'matches', label: 'nav.matches', icon: 'pulse' },
  { name: 'tournaments', label: 'nav.tournaments', icon: 'trophy' },
  { name: 'rankings', label: 'nav.rankings', icon: 'podium' },
  { name: 'more', label: 'nav.more', icon: 'menu' },
]);

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandStrong,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: {
          fontFamily: fontFamily({ language: i18n.language, weight: 'semibold' }),
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? tab.icon : `${tab.icon}-outline`}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
