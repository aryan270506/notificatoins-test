import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = "http://localhost:5000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE,
 
});

// ─── Interceptor to add JWT token to all requests ───────────────────
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("📤 Sending request with JWT token");
        console.log("   URL:", config.url);
        console.log("   Method:", config.method);
      } else {
        console.log("⚠️  No auth token found in storage");
      }
    } catch (error) {
      console.error("❌ Error retrieving token from storage:", error);
    }
    return config;
  },
  (error) => {
    console.error("🔴 Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// ─── Response interceptor to handle token expiration ────────────────
axiosInstance.interceptors.response.use(
  (response) => {
    console.log("✅ Response received:", response.status, response.config.url);
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.log("⏰ Token expired (401), clearing storage and redirecting to login...");
      
      // Clear all auth data
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("userRole");
      await AsyncStorage.removeItem("userName");
      await AsyncStorage.removeItem("teacherId");
      await AsyncStorage.removeItem("parentId");
      await AsyncStorage.removeItem("currentScreen");
      
      // Get navigation reference and navigate to login
      try {
        const { getNavigationRef } = require('../App');
        const nav = getNavigationRef();
        if (nav) {
          nav.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } catch (e) {
        console.error("Error navigating to login:", e);
      }
    } else {
      console.error("🔴 API Error:", error.response?.status, error.response?.data?.message);
    }
    return Promise.reject(error);
  }
);

// ─── AI Doubt Resolver helpers ───────────────────────────────────────
// Go through the same axiosInstance so JWT is automatically attached.
// Backend routes: POST /api/doubts/solve  |  GET /api/doubts/recent
export const doubtAPI = {
   solve:  (question, userId) => axiosInstance.post('/ai-doubts/solve', { question, userId }),
  recent: (userId, limit = 6) => axiosInstance.get(`/ai-doubts/recent?userId=${userId}&limit=${limit}`),
};

export default axiosInstance;