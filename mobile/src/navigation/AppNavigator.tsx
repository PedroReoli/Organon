import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { useTheme } from '../hooks/useTheme'
import { AppDrawer } from '../components/drawer/AppDrawer'

// Screens
import { TodayScreen }    from '../screens/TodayScreen'
import { PlannerScreen }  from '../screens/PlannerScreen'
import { CalendarScreen } from '../screens/CalendarScreen'
import { NotesScreen }    from '../screens/NotesScreen'
import { CRMScreen }      from '../screens/CRMScreen'
import { PlaybookScreen } from '../screens/PlaybookScreen'
import { ShortcutsScreen } from '../screens/ShortcutsScreen'
import { ColorsScreen }   from '../screens/ColorsScreen'
import { HabitsScreen }   from '../screens/HabitsScreen'
import { StudyScreen }    from '../screens/StudyScreen'
import { FinancialScreen } from '../screens/FinancialScreen'
import { HistoryScreen }  from '../screens/HistoryScreen'
import { SettingsScreen } from '../screens/SettingsScreen'

const Drawer = createDrawerNavigator()

export function AppNavigator() {
  const theme = useTheme()

  return (
    <Drawer.Navigator
      drawerContent={(props) => <AppDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: theme.surface,
          width: 280,
        },
        drawerType: 'slide',
        overlayColor: '#00000060',
      }}
      initialRouteName="Today"
    >
      <Drawer.Screen name="Today"     component={TodayScreen} />
      <Drawer.Screen name="Planner"   component={PlannerScreen} />
      <Drawer.Screen name="Calendar"  component={CalendarScreen} />
      <Drawer.Screen name="Notes"     component={NotesScreen} />
      <Drawer.Screen name="CRM"       component={CRMScreen} />
      <Drawer.Screen name="Playbook"  component={PlaybookScreen} />
      <Drawer.Screen name="Shortcuts" component={ShortcutsScreen} />
      <Drawer.Screen name="Colors"    component={ColorsScreen} />
      <Drawer.Screen name="Habits"    component={HabitsScreen} />
      <Drawer.Screen name="Study"     component={StudyScreen} />
      <Drawer.Screen name="Financial" component={FinancialScreen} />
      <Drawer.Screen name="History"   component={HistoryScreen} />
      <Drawer.Screen name="Settings"  component={SettingsScreen} />
    </Drawer.Navigator>
  )
}
