import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from 'react-native';

// 🌐 Base URL setup
const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return "http://localhost:5000/api";
  } else {
    return "http://10.145.59.173:5000/api"; // ✅ change if needed
  }
};

const API_BASE = getBaseURL();

const axiosInstance = axios.create({
  baseURL: API_BASE,
});

// ─── REQUEST INTERCEPTOR ─────────────────────────────
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("authToken");

      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`🔑 Token present: ${token ? 'YES (length: ' + token.length + ')' : 'NO'}`);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("🔐 Token attached to request");
      } else {
        console.log("⚠️ No token found in AsyncStorage - request will be sent without authorization");
      }

    } catch (error) {
      console.error("❌ Token retrieval error:", error);
    }

    return config;
  },
  (error) => {
    console.error("🔴 Request Error:", error);
    return Promise.reject(error);
  }
);

// ─── RESPONSE INTERCEPTOR ────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    // 🔥 FULL ERROR DEBUGGING
    if (error.response) {
      console.error("🔴 API Error:");
      console.error("Status:", error.response.status);
      console.error("URL:", error.config?.url);
      console.error("Method:", error.config?.method);
      console.error("Response Data:", error.response.data);

    } else if (error.request) {
      console.error("🌐 Network Error:");
      console.error("No response received from server");
      console.error(error.request);

    } else {
      console.error("⚠️ Axios Setup Error:", error.message);
    }

    // 🔐 Handle 401 (Unauthorized)
    if (error.response?.status === 401) {
      console.log("⏰ Session expired → Logging out...");

      await AsyncStorage.multiRemove([
        "authToken",
        "userId",
        "userRole",
        "userName",
        "teacherId",
        "parentId",
        "currentScreen",
      ]);

      try {
        const { getNavigationRef } = require('../App');
        const nav = getNavigationRef();

        if (nav && typeof nav.reset === 'function') {
          nav.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        } else if (nav && nav.navigate && typeof nav.navigate === 'function') {
          nav.navigate('Login');
        }
      } catch (e) {
        console.error("❌ Navigation error:", e);
      }
    }

    return Promise.reject(error);
  }
);

// ─── AI API ──────────────────────────────────────────
export const doubtAPI = {
  solve:  (question, userId) => axiosInstance.post('/ai-doubts/solve', { question, userId }),
  recent: (userId, limit = 6) => axiosInstance.get(`/ai-doubts/recent?userId=${userId}&limit=${limit}`),
};

export default axiosInstance;