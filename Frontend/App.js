import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from './Screens/Login/Login';



//import Timetable from "./Screens/Students/timetable";
import Parentmaindashboard from "./Screens/Parent/Dashboard/Dashboard";
import Dashboardpage from "./Screens/Parent/Dashboard/dashboardpage";
import Analytics from "./Screens/Parent/Analytics/Analytics";
import Message from "./Screens/Parent/Message/Message";
import Examresult from "./Screens/Parent/EXAM/Examresult";
import ParentFinance  from "./Screens/Parent/Finance/Finance";
import ParentSchedule from "./Screens/Parent/Schedule/Schedule";
import AdminMain from "./Screens/Admin/dashboard/AdminMain";
import TeacherStack  from "./Screens/Teachers/TeacherStack";


//Comittiee Screens
import ComitteiSideBar from "./Screens/Comittie/Dashboard/ComittieMainDash";
import CommitteeDash from "./Screens/Comittie/Dashboard/CommitteeDash";
import StudentMain from "./Screens/Students/dashbord/StudentMain";


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
     
           <Stack.Screen name="Parentmaindashboard" component={Parentmaindashboard} />
           <Stack.Screen name="Dashboardpage" component={Dashboardpage} />
           <Stack.Screen name="Analytics" component={Analytics} />
           <Stack.Screen name="Message" component={Message} />
            <Stack.Screen name="Examresult" component={Examresult} /> 
            <Stack.Screen name="ParentFinance" component={ParentFinance} />
            <Stack.Screen name="ParentSchedule" component={ParentSchedule} />
            <Stack.Screen name="TeacherStack" component={TeacherStack} />

                 
            <Stack.Screen name="ComitteiSideBar" component={ComitteiSideBar} />
           <Stack.Screen name="CommitteeDash" component={CommitteeDash} />
            <Stack.Screen name="AdminMain" component={AdminMain} />
            <Stack.Screen name="StudentMain" component={StudentMain} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}