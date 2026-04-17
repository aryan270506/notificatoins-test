// utils/socket.js
import { io } from "socket.io-client";
import axiosInstance from "../Src/Axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import pushNotificationManager from './pushNotificationManager';

let socket = null;
let hasRegisteredSession = false;

// Keep a live reference to the current user so reconnect events
// always use the latest user object, not a stale closure.
let currentUser = null;

// ─────────────────────────────────────────────────────────────────────────────
// enrichUserFromStorage
// If any critical field is missing, try to fill it from AsyncStorage.
// This handles the case where connectSocket is called before full user
// data is available (e.g. from TeacherStack before AsyncStorage is read).
// ─────────────────────────────────────────────────────────────────────────────
const enrichUserFromStorage = async (user) => {
  try {
    const _id =
      (user?._id)
      || (await AsyncStorage.getItem('teacherId'))
      || (await AsyncStorage.getItem('userId'))
      || '';

    const name =
      (user?.name && user.name !== 'Unknown' ? user.name : null)
      || (await AsyncStorage.getItem('teacherName'))
      || (await AsyncStorage.getItem('userName'))
      || 'Unknown';

    const role =
      (user?.role)
      || (await AsyncStorage.getItem('teacherRole'))
      || (await AsyncStorage.getItem('userRole'))
      || 'teacher';

    // Email is optional on the frontend but required by the backend route.
    // Generate a safe synthetic fallback so it's never an empty string.
    const email =
      (user?.email && user.email.includes('@') ? user.email : null)
      || (await AsyncStorage.getItem('teacherEmail'))
      || (await AsyncStorage.getItem('userEmail'))
      || (_id ? `${_id}@universe.local` : 'unknown@universe.local');

    const profilePhoto =
      user?.profilePhoto
      || (await AsyncStorage.getItem('profilePhoto'))
      || null;

    return { _id, name, role, email, profilePhoto };
  } catch {
    // If AsyncStorage fails for any reason, return what we have
    return user || {};
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Register session with the backend (called on every connect / reconnect)
// ─────────────────────────────────────────────────────────────────────────────
const registerSession = async (user, socketId) => {
  // ── Enrich with AsyncStorage values for any missing fields ────────────────
  const enriched = await enrichUserFromStorage(user);

  const safeUser = {
    _id:          enriched?._id          ? String(enriched._id)   : '',
    name:         enriched?.name         ? String(enriched.name)  : 'Unknown',
    role:         enriched?.role         ? String(enriched.role)  : 'teacher',
    email:        enriched?.email        ? String(enriched.email) : `${enriched?._id || 'user'}@universe.local`,
    profilePhoto: enriched?.profilePhoto || null,
  };

  // ── Hard guard: _id must be a real non-empty value ────────────────────────
  if (!safeUser._id) {
    console.warn("⚠️ Skipping session registration — no valid _id found", safeUser);
    return;
  }

  console.log("📡 Registering session with:", {
    userId: safeUser._id,
    name:   safeUser.name,
    role:   safeUser.role,
    email:  safeUser.email,
  });

  try {
    const response = await axiosInstance.post("/users/register-session", {
      userId:       safeUser._id,
      socketId,
      name:         safeUser.name,
      email:        safeUser.email,
      role:         safeUser.role,
      profilePhoto: safeUser.profilePhoto,
    });
    console.log("✅ Session registered:", response.data);

    // ── Update currentUser with enriched data so future reconnects
    //    also have complete information ─────────────────────────────────────
    currentUser = { ...safeUser };
  } catch (error) {
    console.error("❌ Error registering session:", {
      message: error.message,
      status:  error.response?.status,
      data:    error.response?.data,
      url:     error.config?.url,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// connectSocket(user)
//   • Creates the socket once (singleton).
//   • Attaches persistent event handlers once.
//   • Always merges incoming user data into currentUser (never discards
//     fields that were already enriched in a previous call).
//   • If the socket is already connected, re-registers immediately so a
//     screen that calls connectSocket with a fuller user object takes effect.
// ─────────────────────────────────────────────────────────────────────────────
export const connectSocket = (user) => {
  // ── Merge rather than replace — keep previously enriched fields ──────────
  currentUser = {
    ...currentUser,
    ...user,
    _id: user?._id ? String(user._id) : currentUser?._id || '',
  };

  if (socket) {
    // Socket already exists; do not re-register repeatedly.
    // This keeps the API hit to a single call for this app session.
    return socket;
  }

  // ── Build socket URL from axios baseURL ───────────────────────────────────
  const baseURL   = axiosInstance.defaults.baseURL || "http://localhost:5000/api";
  const socketURL = baseURL.replace(/\/api\/?$/, ""); // strip trailing /api

  socket = io(socketURL, {
    transports:           ["websocket"],
    reconnection:         true,
    reconnectionDelay:    1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  // ── connect fires on first connect AND every reconnect ───────────────────
  socket.on("connect", async () => {
    console.log("🔥 Socket connected:", {
      socketId: socket.id,
      userId:   currentUser?._id,
      name:     currentUser?.name,
      role:     currentUser?.role,
    });

    if (!hasRegisteredSession) {
      // registerSession handles its own enrichment + guards internally
      await registerSession(currentUser, socket.id);

      if (currentUser?._id) {
        socket.emit("userConnected", {
          _id:          currentUser._id,
          name:         currentUser.name         || 'Unknown',
          role:         currentUser.role         || 'teacher',
          email:        currentUser.email        || '',
          profilePhoto: currentUser.profilePhoto || null,
        });
      }
      hasRegisteredSession = true;
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason, "| user:", currentUser?.name);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", {
      message: error.message,
      type:    error.type,
    });
  });

  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });

  // Listen for notification events from server
  socket.on('new_notification', async (data) => {
    console.log('New notification received:', data);
    
    // Show local notification if app is in foreground
    await pushNotificationManager.showLocalNotification(
      data.title,
      data.body,
      data.data
    );
  });

  return socket;
};

// ─────────────────────────────────────────────────────────────────────────────
// getSocket — returns the active socket instance (or null if not yet created)
// ─────────────────────────────────────────────────────────────────────────────
export const getSocket = () => {
  if (!socket) {
    console.warn("⚠️ Socket not initialised yet — call connectSocket(user) first");
  }
  return socket;
};

// ─────────────────────────────────────────────────────────────────────────────
// disconnectSocket — clean teardown (call on logout)
// ─────────────────────────────────────────────────────────────────────────────
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket      = null;
    currentUser = null;
    hasRegisteredSession = false;
    console.log("🔌 Socket disconnected and reset.");
  }
};