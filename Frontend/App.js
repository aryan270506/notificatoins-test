
import React, { useState, useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axiosInstance from './Src/Axios';

import LoginScreen from './Screens/Login/Login';
import Parentmaindashboard from "./Screens/Parent/Dashboard/Dashboard";
import Dashboardpage from "./Screens/Parent/Dashboard/dashboardpage";
import Analytics from "./Screens/Parent/Analytics/Analytics";
import Message from "./Screens/Parent/Message/Message";
import Examresult from "./Screens/Parent/EXAM/Examresult";
import ParentFinance from "./Screens/Parent/Finance/Finance";
import ParentSchedule from "./Screens/Parent/Schedule/Schedule";
import AdminMain from "./Screens/Admin/dashboard/AdminMain";
import TeacherStack from "./Screens/Teachers/TeacherStack";
import ComitteiSideBar from "./Screens/Comittie/Dashboard/ComittieMainDash";
import CommitteeDash from "./Screens/Comittie/Dashboard/CommitteeDash";
import StudentMain from "./Screens/Students/dashbord/StudentMain";

// Store navigation reference for use in axios interceptors
let navigationRef = null;

export const setNavigationRef = (ref) => {
  navigationRef = ref;
};

export const getNavigationRef = () => {
  return navigationRef;
};

const Stack = createNativeStackNavigator();

function RootNavigator({ navigationRef }) {
  const [initialRoute, setInitialRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  // Track current screen changes and save to AsyncStorage
  useEffect(() => {
    if (navigationRef?.current && !isLoading) {
      const unsubscribe = navigationRef.current.addListener('state', async () => {
        const state = navigationRef.current.getState();
        if (state && state.routes && state.routes.length > 0) {
          const currentRouteName = state.routes[state.index]?.name;
          if (currentRouteName && currentRouteName !== 'Login') {
            try {
              await AsyncStorage.setItem('currentScreen', currentRouteName);
              console.log(`📍 Current screen saved: ${currentRouteName}`);
            } catch (error) {
              console.error('Error saving current screen:', error);
            }
          }
        }
      });

      return unsubscribe;
    }
  }, [navigationRef, isLoading]);

  const bootstrapAsync = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      if (token) {
        try {
          const response = await axiosInstance.post('/auth/verify-token', {});

          if (response.data.valid) {
            const userRole = await AsyncStorage.getItem('userRole');
            const currentScreen = await AsyncStorage.getItem('currentScreen');

            if (currentScreen && userRole) {
              setInitialRoute(currentScreen);
            } else if (userRole === 'admin') {
              setInitialRoute('AdminMain');
            } else if (userRole === 'teacher') {
              setInitialRoute('TeacherStack');
            } else if (userRole === 'student') {
              setInitialRoute('StudentMain');
            } else if (userRole === 'parent') {
              setInitialRoute('Parentmaindashboard');
            } else if (userRole === 'committee') {
              setInitialRoute('ComitteiSideBar');
            } else {
              setInitialRoute('Login');
            }
          } else {
            setInitialRoute('Login');
          }
        } catch (error) {
          console.log('Token verification failed, showing login');
          await AsyncStorage.multiRemove([
            'authToken',
            'userId',
            'userRole',
            'userName',
            'currentScreen',
          ]);
          setInitialRoute('Login');
        }
      } else {
        setInitialRoute('Login');
      }
    } catch (error) {
      console.error('Bootstrap error:', error);
      setInitialRoute('Login');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRoute}
    >
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
  );
}

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    setNavigationRef(navigationRef);
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator navigationRef={navigationRef} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}