// Navigation/TeacherStack.js

import React, { useState, useEffect, createContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import axiosInstance from '../../Src/Axios';

export const ThemeContext = createContext({ isDark: true, toggleTheme: () => {} });

import Sidebar            from './Sidebar';
import MainDash           from './MainDash';
import Attendance         from './Attendance';
import AttendanceRecord   from './AttendanceRecords';
import Timetable          from './Timetable';
import QuizSession        from './QuizzSessionScreen';
import Analytics          from './StudentAttendanceScreen';
import Addquizz           from './Addquizz';
import TeacherExamScreen  from './TeacherExamScreen';
import Assignments        from './AssignmentScreen';
import Lessonplanner      from './LessonPlanner';
import DoubtSession       from './Doubtsessionscreen';
import DoubtSolveScreen   from './Doubtsolvescreen';
import SelectionScreen    from './Selectionscreen';
import MessagingScreen    from './Messagingscreen';
import Quizresultscreen   from './Quizresultscreen';

const Stack = createNativeStackNavigator();

// ─── Locked Screen ────────────────────────────────────────────────────────────
const LockedScreen = () => (
  <View style={{
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0d0d20', gap: 12,
  }}>
    <Text style={{ fontSize: 48 }}>🔒</Text>
    <Text style={{ fontSize: 18, fontWeight: '700', color: '#e2e8f0' }}>
      Access Restricted
    </Text>
    <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 260 }}>
      Access denied by developers
    </Text>
  </View>
);

export default function TeacherStack({ route }) {
  const user = route?.params?.user || {};
  const [isDark,     setIsDark]     = useState(true);
  const [tabAccess,  setTabAccess]  = useState({});
  const toggleTheme = () => setIsDark(p => !p);

  // ── Fetch tab access for Teacher role ──────────────────────────────────────
  useEffect(() => {
    axiosInstance.get('/permissions/check/Teacher')
      .then(res => {
        console.log('🔐 Teacher tabAccess:', res.data.tabAccess);
        setTabAccess(res.data.tabAccess || {});
      })
      .catch(() => setTabAccess({}));
  }, []);

  // ── Helper: returns LockedScreen if tab is locked, else the real screen ────
  const guard = (tabKey, screen) =>
    tabAccess[tabKey] === false ? <LockedScreen /> : screen;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <Stack.Navigator
        initialRouteName="DashboardScreen"
        screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      >
        {/* Dashboard — never locked */}
        <Stack.Screen name="DashboardScreen">
          {() => (
            <Sidebar activeScreen="dashboard" user={user} tabAccess={tabAccess}>
              <MainDash user={user} />
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Attendance Marking */}
        <Stack.Screen name="AttendanceScreen">
          {() => (
            <Sidebar activeScreen="attendanceMarking" user={user} tabAccess={tabAccess}>
              {guard('attendanceMarking', <Attendance user={user} />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Student Attendance */}
        <Stack.Screen name="StudentAttendanceScreen">
          {() => (
            <Sidebar activeScreen="studentAttendance" user={user} tabAccess={tabAccess}>
              {guard('studentAttendance', <Analytics user={user} />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Assignments */}
        <Stack.Screen name="AssignmentScreen">
          {() => (
            <Sidebar activeScreen="assignments" user={user} tabAccess={tabAccess}>
              {guard('assignments', <Assignments user={user} />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Lesson Planner */}
        <Stack.Screen name="PlannerScreen">
          {() => (
            <Sidebar activeScreen="planner" user={user} tabAccess={tabAccess}>
              {guard('planner', <Lessonplanner user={user} />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Exams */}
        <Stack.Screen name="TeacherExamScreen">
          {() => (
            <Sidebar activeScreen="exams" user={user} tabAccess={tabAccess}>
              {guard('exams', <TeacherExamScreen user={user} />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Quiz Session */}
        <Stack.Screen name="QuizzSessionScreen">
          {() => (
            <Sidebar activeScreen="quiz" user={user} tabAccess={tabAccess}>
              {guard('quiz', <QuizSession user={user} />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Add Quiz */}
        <Stack.Screen name="QuizBuilderScreen">
          {() => (
            <Sidebar activeScreen="addquizz" user={user} tabAccess={tabAccess}>
              {guard('addquizz', <Addquizz user={user} />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Doubt Session */}
        <Stack.Screen name="DoubtScreen">
          {() => (
            <Sidebar activeScreen="doubt" user={user} tabAccess={tabAccess}>
              {guard('doubt', <DoubtSession />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Messages */}
        <Stack.Screen name="MessagesScreen">
          {() => (
            <Sidebar activeScreen="messages" user={user} tabAccess={tabAccess}>
              {guard('messages', <SelectionScreen />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* Timetable */}
        <Stack.Screen name="TimetableScreen">
          {() => (
            <Sidebar activeScreen="timetable" user={user} tabAccess={tabAccess}>
              {guard('timetable', <Timetable user={user} />)}
            </Sidebar>
          )}
        </Stack.Screen>

        {/* ── Full-screen screens — no Sidebar, no lock needed ─────────── */}
        <Stack.Screen
          name="DoubtSolveScreen"
          component={DoubtSolveScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="SelectionScreen"  component={SelectionScreen}  />
        <Stack.Screen name="MessagingScreen"  component={MessagingScreen}  />
        <Stack.Screen name="AttendanceRecord">
          {({ route }) => <AttendanceRecord route={route} />}
        </Stack.Screen>
        <Stack.Screen name="QuizResultScreen" component={Quizresultscreen} />

      </Stack.Navigator>
    </ThemeContext.Provider>
  );
}