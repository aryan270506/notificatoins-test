import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Sidebar        from './Sidebar';
import MainDash       from './MainDash';
import Attendance     from './Attendance';
import Timetable      from './Timetable';
import QuizSession    from './QuizzSessionScreen';
import Analytics      from './StudentAttendanceScreen';
import QuizBuilder    from './QuizBuilderScreen';
import Addquizz       from './Addquizz';
import TeacherExamScreen from './TeacherExamScreen';
import Assignments from  './AssignmentScreen'; 
import Lessonplanner  from './LessonPlanner';
import DoubtSession   from './Doubtsessionscreen';
import Messages       from './Messages';
import Quizresultscreen from './Quizresultscreen';


const Stack = createNativeStackNavigator();

const TeacherStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="DashboardScreen"   // Dashboard is the default page
      screenOptions={{ headerShown: false }} 
    >
      {/* ── Route names MUST match the route strings in Sidebar.js NAV_ITEMS ── */}

      <Stack.Screen name="DashboardScreen">
        {() => (
          <Sidebar activeScreen="dashboard">
            <MainDash />
          </Sidebar>
        )}
      </Stack.Screen>

      <Stack.Screen name="AttendanceScreen">
        {() => (
          <Sidebar activeScreen="attendance">
            <Attendance />
          </Sidebar>
        )}
      </Stack.Screen>

      <Stack.Screen name="AssignmentScreen">
        {() => (
          <Sidebar activeScreen="assignments">
            <Assignments />
          </Sidebar>
        )}
      </Stack.Screen>

      <Stack.Screen name="StudentAttendanceScreen">
        {() => (
          <Sidebar activeScreen="Attendance">
            <Analytics />
          </Sidebar>
        )}
      </Stack.Screen>

      <Stack.Screen name="PlannerScreen">
        {() => (
          <Sidebar activeScreen="planner">
            <Lessonplanner />
          </Sidebar>
        )}
      </Stack.Screen>

      

      <Stack.Screen name="QuizzSessionScreen">
        {() => (
          <Sidebar activeScreen="quizSessions">
            <QuizSession />
          </Sidebar>
        )}
      </Stack.Screen>

      <Stack.Screen name="DoubtScreen">
        {() => (
          <Sidebar activeScreen="doubt">
            <DoubtSession />
          </Sidebar>
        )}
      </Stack.Screen>
      <Stack.Screen name="TeacherExamScreen">
        {() => (
          <Sidebar activeScreen="exams">
            <TeacherExamScreen />
          </Sidebar>
        )}
      </Stack.Screen>

      <Stack.Screen name="MessagesScreen">
        {() => (
          <Sidebar activeScreen="messages">
            <Messages />
          </Sidebar>
        )}
      </Stack.Screen>

      <Stack.Screen name="TimetableScreen">
        {() => (
          <Sidebar activeScreen="timetable">
            <Timetable />
          </Sidebar>
        )}
      </Stack.Screen>
      
      <Stack.Screen name="QuizBuilderScreen">  
        {() => (
          <Sidebar activeScreen="QuizBuilder">
            <Addquizz />
          </Sidebar>
        )}  
      </Stack.Screen>
      <Stack.Screen name="QuizResultScreen" component={Quizresultscreen} />
    </Stack.Navigator>
  );
};

export default TeacherStack;