import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isMobile = width < 768;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectSocket } from "../../utils/socket";
import axiosInstance from "../../Src/Axios";
import pushNotificationManager from '../../utils/pushNotificationManager';


const LoginScreen = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  


  const handleLogin = async () => {
  // Hardcoded committee credentials
  if (email === "committee" && password === "committee123") {
    await AsyncStorage.setItem('userId', 'committee_user');
    await AsyncStorage.setItem('userRole', 'committee');
    await AsyncStorage.setItem('userName', 'Committee Member');
    await AsyncStorage.setItem('currentScreen', 'ComitteiSideBar');
    connectSocket({ _id: 'committee_user', name: 'Committee Member', role: 'committee' });
    navigation.navigate('ComitteiSideBar');
    return;
  }

  try {
    const response = await axiosInstance.post("/auth/login", {
      email,
      password,
      role,
    });

    const data = response.data;

    // Store JWT token
    if (data.token) {
      await AsyncStorage.setItem('authToken', data.token);
    }

    switch (data.role) {

      case "admin":
        console.log("✅ Admin Logged In:", data.user.name);
        await AsyncStorage.setItem('userId', data.user._id);
        await AsyncStorage.setItem('userRole', 'admin');
        await AsyncStorage.setItem('userName', data.user.name);
        await AsyncStorage.setItem('currentScreen', 'AdminMain');
        connectSocket({ ...data.user, role: data.role });
        navigation.navigate("AdminMain");
        break;

      case "teacher":
        console.log("✅ Teacher Logged In:", data.user.name);
        await AsyncStorage.setItem('teacherId', data.user._id);
        await AsyncStorage.setItem('userId', data.user._id);
        await AsyncStorage.setItem('userRole', 'teacher');
        await AsyncStorage.setItem('userName', data.user.name);
        await AsyncStorage.setItem('currentScreen', 'TeacherStack');
        connectSocket({ ...data.user, role: data.role });
        navigation.navigate("TeacherStack", { user: data.user });
        break;

      case "student":
        console.log("✅ Student Logged In:", data.user.name);
        await AsyncStorage.setItem('userId', data.user._id);
        await AsyncStorage.setItem('userRole', 'student');
        await AsyncStorage.setItem('userName', data.user.name);
        await AsyncStorage.setItem('currentScreen', 'StudentMain');
        
        // ─── Extract batch from roll_no or use student.batch ───────────────────
        // roll_no format: "FY-A2-36" → batch should be "A2"
        let batch = data.user.batch;
        if (!batch && data.user.roll_no) {
          const parts = data.user.roll_no.split('-');
          batch = parts[1] || null; // Extract "A2" from "FY-A2-36"
        }
        
        // Store full student data for later use (timetable, subjects, etc.)
        const studentData = {
          _id: data.user._id,
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          prn: data.user.prn,
          roll_no: data.user.roll_no,
          year: data.user.year,
          division: data.user.division,
          batch: batch,
          branch: data.user.branch,
          subjects: data.user.subjects || [],
          lab: data.user.lab || [],
        };
        await AsyncStorage.setItem('studentData', JSON.stringify(studentData));
        console.log('📚 Student data stored:', { year: data.user.year, division: data.user.division, batch });
        
        connectSocket({ ...data.user, role: data.role });
        navigation.navigate("StudentMain", { user: data.user });
        break;

      case "parent":
  console.log("✅ Parent Logged In:", data.user.name);
  await AsyncStorage.setItem('userId',   data.user._id);
  await AsyncStorage.setItem('parentId', data.user._id);  // ← ADD THIS
  await AsyncStorage.setItem('userRole', 'parent');
  await AsyncStorage.setItem('userName', data.user.name);
  await AsyncStorage.setItem('currentScreen', 'Parentmaindashboard');
  connectSocket({ ...data.user, role: data.role });
  navigation.navigate("Parentmaindashboard");
  break;


      default:
        alert("Unknown role");
    }

    // After login is successful and token is saved:
    console.log('✅ Login successful, registering for notifications...');
    
    // Register for push notifications
    try {
      const expoPushToken = await pushNotificationManager.registerForPushNotificationsAsync();
      if (expoPushToken) {
        console.log('🎉 Expo Push Token:', expoPushToken);
        await pushNotificationManager.sendTokenToBackend(expoPushToken);
        console.log('✅ Push notifications registered!');
      }
    } catch (notifError) {
      console.error('⚠️  Notification registration failed (non-critical):', notifError.message);
      // Don't block login if notifications fail
    }
    
  } catch (error) {
    console.log("Login error:", error.response?.data || error.message);
    alert(error.response?.data?.message || "Login failed");
  }
};





  const renderLoginCard = () => (
    <View style={styles.loginCard}>
      <Text style={styles.welcomeTitle}>Welcome Back</Text>
      {isWeb && !isMobile && (
  <Text style={styles.welcomeSubtitle}>
    Enter your credentials to access{'\n'}your dashboard.
  </Text>
)}


      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>University Email</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="name@university.edu"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.passwordHeader}>
          <Text style={styles.inputLabel}>Password</Text>
          
        </View>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setRememberMe(!rememberMe)}
      >
        <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
          {rememberMe && <Ionicons name="checkmark" size={16} color="#3B82F6" />}
        </View>
        <Text style={styles.checkboxLabel}>Keep me logged in on this device</Text>
      </TouchableOpacity>

      <TouchableOpacity  
      style={styles.signInButton} onPress={handleLogin}>
        <Text  style={styles.signInButtonText}>Sign In to Portal</Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.arrowIcon} />
      </TouchableOpacity>

      
    </View>
  );

  const renderWebLayout = () => (
    <ImageBackground
      source={require('../../assets/login.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />
      
      <ScrollView contentContainerStyle={styles.webContainer}>
        <View style={styles.leftSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <View style={styles.logoIcon}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.logoDot,
                      { transform: [{ rotate: `${i * 60}deg` }] }
                    ]}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.logoText}>UniVerse</Text>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>The Smart University{'\n'}Operating System</Text>
            <Text style={styles.heroSubtitle}>
              Empowering students and faculty with an integrated{'\n'}
              digital ecosystem for learning, administration, and{'\n'}
              collaboration.
            </Text>

            <View style={styles.securityBadge}>
              <View style={styles.securityIcon}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.securityTitle}>SECURITY</Text>
                <Text style={styles.securitySubtitle}>Enterprise Grade AES-256</Text>
              </View>
            </View>
          </View>

          <Text style={styles.copyright}>
            © 2026 UniVerse OS. All rights reserved. Built for the future of education.
          </Text>
        </View>

        <View style={styles.rightSection}>
          {renderLoginCard()}
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>🌐 English (US)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );

  const renderMobileLayout = () => (
    <ImageBackground
      source={require('../../assets/login.jpg')}
      style={styles.mobileContainer}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.mobileOverlay} />
      <ScrollView 
        contentContainerStyle={styles.mobileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mobileBrandingContainer}>
          <View style={styles.mobileLogo}>
            <View style={styles.mobileLogoIcon}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.mobileLogoDot,
                    { transform: [{ rotate: `${i * 60}deg` }] }
                  ]}
                />
              ))}
            </View>
          </View>
          <Text style={styles.mobileLogoText}>UniVerse</Text>
        </View>
        {renderLoginCard()}
      </ScrollView>
    </ImageBackground>
  );

  return isWeb && !isMobile ? renderWebLayout() : renderMobileLayout();
};

const styles = StyleSheet.create({
  // Background
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
  },

  // Web Container
  webContainer: {
    flexDirection: 'row',
    minHeight: '100vh',
    paddingHorizontal: isWeb ? 80 : 20,
    paddingVertical: 40,
  },

  // Left Section
  leftSection: {
    flex: 1,
    justifyContent: 'space-between',
    paddingRight: 60,
    zIndex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoIcon: {
    width: 32,
    height: 32,
    position: 'relative',
  },
  logoDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E40AF',
    top: 0,
    left: 13,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 64,
    marginBottom: 24,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#CBD5E1',
    lineHeight: 28,
    marginBottom: 48,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    alignSelf: 'flex-start',
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  securityTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  securitySubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  copyright: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 40,
  },

  // Right Section
  rightSection: {
    width: 480,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  // Login Card
  loginCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
borderRadius: isMobile ? 16 : 24,
  padding: isMobile ? 24 : 40,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
      },
      android: {
        elevation: 24,
        shadowColor: '#000',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Input
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    outlineStyle: 'none',
  },
  eyeIcon: {
    padding: 4,
  },

  // Checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    backgroundColor: 'transparent',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },

  // Sign In Button
  signInButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  arrowIcon: {
    marginLeft: 4,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginHorizontal: 16,
    letterSpacing: 0.5,
  },

  // SSO Buttons
  ssoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  ssoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    height: 52,
    marginHorizontal: 6,
  },
  ssoButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#E2E8F0',
    marginLeft: 8,
  },

  // Request Access
  requestAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestAccessText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  requestAccessLink: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
  },

  // Footer
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerLink: {
    fontSize: 13,
    color: '#64748B',
    marginHorizontal: 8,
  },
  footerDot: {
    fontSize: 13,
    color: '#64748B',
  },

  // Mobile Container
  mobileContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  mobileScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
});

export default LoginScreen;