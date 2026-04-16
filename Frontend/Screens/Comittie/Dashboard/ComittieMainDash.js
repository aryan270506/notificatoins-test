import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import CommitteeDash from './CommitteeDash';
import StudentManagementDashboard from '../Students/Students';
import TeacherManagementDashboard from '../Teacher/Teacher';
import ParentManagementDashboard from '../Parent/Parent';
import AttendanceDashboard from '../Attendence/Attendence';
import PermissionDashboard from '../Permission/Permission';

// ── Admin screens reused by Committee ──
import { ThemeContext, DARK_COLORS } from '../../Admin/dashboard/AdminDashboard';
import TimeTableScreen from '../../Admin/timetable/TimeTableManagement';
import SelectionScreen from '../../Admin/Message/Selectionscreen';
import Assignment from '../../Admin/Assignment/Assignment';
import Admissionfees from '../../Admin/Fees/Admissionfees';
import DataImportCenter from '../../Admin/DataImportCenter/DataImportCenter';
import axiosInstance from '../../../Src/Axios';


// ---------------- ICONS ----------------
const Icon = ({ name, color = '#fff', size = 20 }) => {
  const icons = {
    dashboard:    '⊞',
    students:     '👥',
    faculty:      '👨‍🏫',
    parents:      '👨‍👩‍👧',
    attendance:   '📅',
    permission:   '🔑',
    reports:      '📊',
    timetable:    '🕐',
    messages:     '✉️',
    assignment:   '📝',
    finance:      '💰',
    securitylogs: '🔒',
    dataimport:   '📥',
    addinstitute: '🏫',
    logout:       '🚪',
  };

  return (
    <Text style={{ fontSize: size, color }}>
      {icons[name] || '•'}
    </Text>
  );
};


// ---------------- NAV ITEMS ----------------
const navItems = [
  { id: 'dashboard',    label: 'Dashboard',      icon: 'dashboard' },
  { id: 'students',     label: 'Students',       icon: 'students' },
  { id: 'faculty',      label: 'Faculty',        icon: 'faculty' },
  { id: 'parents',      label: 'Parents',        icon: 'parents' },
  { id: 'attendance',   label: 'Attendance',     icon: 'attendance' },
  { id: 'timetable',    label: 'Timetable',      icon: 'timetable' },
  { id: 'messages',     label: 'Messages',       icon: 'messages' },
  { id: 'assignment',   label: 'Assignments',    icon: 'assignment' },
  { id: 'finance',      label: 'Finance / Fees', icon: 'finance' },
  { id: 'permission',   label: 'Permissions',    icon: 'permission' },
  { id: 'dataimport',   label: 'Data Import',    icon: 'dataimport' },
  { id: 'addinstitute', label: 'Add Institute',  icon: 'addinstitute' },
];

const bottomItems = [
  { id: 'logout', label: 'Logout', icon: 'logout', danger: true },
];


// ================= ADD INSTITUTE SCREEN =================
const AddInstituteScreen = () => {
  // ── Institute fields ──
  const [instituteName,    setInstituteName]    = useState('');
  const [instituteCode,    setInstituteCode]    = useState('');
  const [instituteAddress, setInstituteAddress] = useState('');
  const [institutePhone,   setInstitutePhone]   = useState('');
  const [instituteEmail,   setInstituteEmail]   = useState('');
  const [instituteType,    setInstituteType]    = useState('');

  // ── Admin credential fields ──
  const [adminName,     setAdminName]     = useState('');
  const [adminEmail,    setAdminEmail]    = useState('');
  const [adminId,       setAdminId]       = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPass,   setConfirmPass]   = useState('');
  const [showPassword,  setShowPassword]  = useState(false);

  // ── UI state ──
  const [loading,    setLoading]    = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg,   setErrorMsg]   = useState('');

  const resetForm = () => {
    setInstituteName(''); setInstituteCode(''); setInstituteAddress('');
    setInstitutePhone(''); setInstituteEmail(''); setInstituteType('');
    setAdminName(''); setAdminEmail(''); setAdminId('');
    setAdminPassword(''); setConfirmPass('');
    setSuccessMsg(''); setErrorMsg('');
  };

  const handleSubmit = async () => {
    // ── Basic validation ──
    if (!instituteName.trim()) { setErrorMsg('Institute name is required.'); return; }
    if (!instituteCode.trim()) { setErrorMsg('Institute code is required.'); return; }
    if (!adminId.trim())       { setErrorMsg('Admin ID is required.');       return; }
    if (!adminEmail.trim())    { setErrorMsg('Admin email is required.');    return; }
    if (!adminPassword)        { setErrorMsg('Admin password is required.'); return; }
    if (adminPassword !== confirmPass) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (adminPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      /**
       * POST /api/committee/institute/create
       *
       * Adjust the endpoint path to match your backend route.
       * The body sends institute details + admin credentials together.
       * Your backend should hash the password before saving to the DB.
       */
      const payload = {
        institute: {
          name:    instituteName.trim(),
          code:    instituteCode.trim(),
          address: instituteAddress.trim(),
          phone:   institutePhone.trim(),
          email:   instituteEmail.trim(),
          type:    instituteType.trim(),
        },
        admin: {
          name:     adminName.trim(),
          email:    adminEmail.trim(),
          adminId:  adminId.trim(),
          password: adminPassword,   // plain-text — backend must hash (bcrypt etc.)
        },
      };

      const response = await axiosInstance.post(
        '/committee/institute/create',
        payload,
      );

      if (response.data?.success) {
        setSuccessMsg(
          `✅ Institute "${instituteName}" created successfully! Admin ID: ${adminId}`,
        );
        resetForm();
      } else {
        setErrorMsg(response.data?.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      const serverMsg = err?.response?.data?.message;
      setErrorMsg(serverMsg || 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Reusable labelled input ──
  const Field = ({
    label, value, onChangeText, placeholder,
    keyboardType = 'default', secureTextEntry = false,
    rightElement, autoCapitalize = 'sentences',
  }) => (
    <View style={ais.fieldWrap}>
      <Text style={ais.fieldLabel}>{label}</Text>
      <View style={ais.inputRow}>
        <TextInput
          style={[ais.input, rightElement && { paddingRight: 48 }]}
          value={value}
          onChangeText={(t) => {
            setErrorMsg('');
            onChangeText(t);
          }}
          placeholder={placeholder}
          placeholderTextColor="#4a5568"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {rightElement && (
          <View style={ais.inputRight}>{rightElement}</View>
        )}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={ais.container}
        contentContainerStyle={ais.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ── */}
        <View style={ais.pageHeader}>
          <Text style={ais.pageIcon}>🏫</Text>
          <View>
            <Text style={ais.pageTitle}>Add New Institute</Text>
            <Text style={ais.pageSub}>
              Register an institution and set up its administrator account
            </Text>
          </View>
        </View>

        {/* ── Success / Error banners ── */}
        {successMsg !== '' && (
          <View style={ais.successBanner}>
            <Text style={ais.successTxt}>{successMsg}</Text>
          </View>
        )}
        {errorMsg !== '' && (
          <View style={ais.errorBanner}>
            <Text style={ais.errorTxt}>⚠️  {errorMsg}</Text>
          </View>
        )}

        {/* ════════════════════════════════
            SECTION 1 — INSTITUTE DETAILS
        ════════════════════════════════ */}
        <View style={ais.card}>
          <View style={ais.cardHeader}>
            <View style={[ais.cardHeaderDot, { backgroundColor: '#3b82f6' }]} />
            <Text style={ais.cardTitle}>Institute Details</Text>
          </View>

          <View style={ais.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="Institute Name *"
                value={instituteName}
                onChangeText={setInstituteName}
                placeholder="e.g. Springfield University"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Institute Code *"
                value={instituteCode}
                onChangeText={setInstituteCode}
                placeholder="e.g. SPU-001"
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Field
            label="Address"
            value={instituteAddress}
            onChangeText={setInstituteAddress}
            placeholder="Full postal address"
          />

          <View style={ais.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="Phone Number"
                value={institutePhone}
                onChangeText={setInstitutePhone}
                placeholder="+91 00000 00000"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Institute Email"
                value={instituteEmail}
                onChangeText={setInstituteEmail}
                placeholder="contact@institute.edu"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <Field
            label="Type / Category"
            value={instituteType}
            onChangeText={setInstituteType}
            placeholder="e.g. University, College, School"
          />
        </View>

        {/* ════════════════════════════════
            SECTION 2 — ADMIN CREDENTIALS
        ════════════════════════════════ */}
        <View style={ais.card}>
          <View style={ais.cardHeader}>
            <View style={[ais.cardHeaderDot, { backgroundColor: '#8b5cf6' }]} />
            <Text style={ais.cardTitle}>Admin Account Setup</Text>
          </View>
          <Text style={ais.cardHint}>
            These credentials will be stored securely in the admin database.
            The admin will use the Admin ID and password to sign in.
          </Text>

          <View style={ais.twoCol}>
            <View style={{ flex: 1 }}>
              <Field
                label="Admin Full Name"
                value={adminName}
                onChangeText={setAdminName}
                placeholder="e.g. Dr. John Doe"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Admin Email *"
                value={adminEmail}
                onChangeText={setAdminEmail}
                placeholder="admin@institute.edu"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <Field
            label="Admin ID *"
            value={adminId}
            onChangeText={setAdminId}
            placeholder="Unique login ID e.g. ADM-SPU-001"
            autoCapitalize="characters"
          />

          <Field
            label="Password *"
            value={adminPassword}
            onChangeText={setAdminPassword}
            placeholder="Min. 8 characters"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                <Text style={ais.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            }
          />

          <Field
            label="Confirm Password *"
            value={confirmPass}
            onChangeText={setConfirmPass}
            placeholder="Re-enter password"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />

          {/* Password strength hints */}
          {adminPassword.length > 0 && (
            <View style={ais.strengthWrap}>
              {[
                { ok: adminPassword.length >= 8,          text: '8+ characters' },
                { ok: /[A-Z]/.test(adminPassword),        text: 'Uppercase letter' },
                { ok: /[0-9]/.test(adminPassword),        text: 'Number' },
                { ok: /[^A-Za-z0-9]/.test(adminPassword), text: 'Special character' },
              ].map(({ ok, text }) => (
                <View key={text} style={ais.strengthRow}>
                  <Text style={{ color: ok ? '#22c55e' : '#4a5568', fontSize: 12 }}>
                    {ok ? '✓' : '○'}
                  </Text>
                  <Text style={[ais.strengthTxt, { color: ok ? '#22c55e' : '#4a5568' }]}>
                    {text}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Submit Button ── */}
        <TouchableOpacity
          style={[ais.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={ais.submitTxt}>🏫  Create Institute & Admin Account</Text>
          )}
        </TouchableOpacity>

        {/* Reset link */}
        <TouchableOpacity onPress={resetForm} style={ais.resetBtn}>
          <Text style={ais.resetTxt}>Clear all fields</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ── AddInstituteScreen Styles ──
const ais = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f1c',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },

  // Header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  pageIcon: { fontSize: 40 },
  pageTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pageSub: {
    color: '#8b92b4',
    fontSize: 13,
    marginTop: 2,
  },

  // Banners
  successBanner: {
    backgroundColor: '#052e16',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  successTxt: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: '#2d0a0a',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  errorTxt: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Cards
  card: {
    backgroundColor: '#13172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1c2140',
    padding: 20,
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardHeaderDot: {
    width: 4,
    height: 20,
    borderRadius: 2,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cardHint: {
    color: '#8b92b4',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: -8,
  },

  // Two-column row
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },

  // Fields
  fieldWrap: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#8b92b4',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputRow: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#0f1624',
    borderWidth: 1,
    borderColor: '#1c2140',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
    color: '#ffffff',
    fontSize: 14,
  },
  inputRight: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 18,
  },

  // Password strength
  strengthWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  strengthTxt: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Submit button
  submitBtn: {
    backgroundColor: '#1d3461',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitTxt: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Reset
  resetBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  resetTxt: {
    color: '#4a5568',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});


// ================= SIDEBAR CONTENT =================
const SidebarContent = ({ active, setActive, onClose, isMobile }) => {
  const renderNavItem = ({ id, label, icon, danger }) => {
    const isActive = active === id;

    return (
      <TouchableOpacity
        key={id}
        style={[
          styles.navItem,
          isActive && styles.navItemActive,
        ]}
        onPress={() => {
          setActive(id);
          if (isMobile && onClose) onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.navIconWrap}>
          <Icon
            name={icon}
            color={danger ? '#f87171' : isActive ? '#fff' : '#8a9ab5'}
            size={18}
          />
        </View>

        <Text
          style={[
            styles.navLabel,
            isActive && styles.navLabelActive,
            danger && styles.navLabelDanger,
          ]}
        >
          {label}
        </Text>

        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sidebar}>
      {/* Logo Row */}
      <View style={styles.logoContainer}>
        <View style={styles.logoIconWrap}>
          <Text style={styles.logoIcon}>⊞</Text>
        </View>
        <Text style={styles.logoText}>UniVerse</Text>

        {isMobile && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        {navItems.map(renderNavItem)}
      </ScrollView>

      <View style={styles.divider} />

      <View style={styles.bottomSection}>
        {bottomItems.map(renderNavItem)}
      </View>
    </View>
  );
};


// ================= MAIN COMPONENT =================
const ComitteiSideBar = () => {
  const [active, setActive] = useState('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const themeValue = useMemo(() => ({ isDark: true, colors: DARK_COLORS }), []);

  const renderContent = () => {
    switch (active) {
      case 'dashboard':    return <CommitteeDash onNavigate={setActive} />;
      case 'students':     return <StudentManagementDashboard />;
      case 'faculty':      return <TeacherManagementDashboard />;
      case 'parents':      return <ParentManagementDashboard />;
      case 'attendance':   return <AttendanceDashboard />;
      case 'permission':   return <PermissionDashboard />;
      case 'timetable':    return <TimeTableScreen />;
      case 'messages':     return <SelectionScreen />;
      case 'assignment':   return <Assignment />;
      case 'finance':      return <Admissionfees />;
      case 'dataimport':   return <DataImportCenter />;
      case 'addinstitute': return <AddInstituteScreen />;
      default:             return <CommitteeDash onNavigate={setActive} />;
    }
  };

  return (
    <ThemeContext.Provider value={themeValue}>
      <View style={styles.mainContainer}>

        {/* ---- DESKTOP: persistent sidebar ---- */}
        {!isMobile && (
          <SidebarContent
            active={active}
            setActive={setActive}
            isMobile={false}
          />
        )}

        {/* ---- MOBILE: slide-in drawer via Modal ---- */}
        {isMobile && (
          <Modal
            visible={drawerOpen}
            transparent
            animationType="none"
            onRequestClose={() => setDrawerOpen(false)}
          >
            <Pressable
              style={styles.backdrop}
              onPress={() => setDrawerOpen(false)}
            />
            <View style={styles.drawerPanel}>
              <SidebarContent
                active={active}
                setActive={setActive}
                isMobile={true}
                onClose={() => setDrawerOpen(false)}
              />
            </View>
          </Modal>
        )}

        {/* ---- CONTENT AREA ---- */}
        <View style={styles.contentArea}>

          {isMobile && (
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => setDrawerOpen(true)}
                style={styles.hamburgerBtn}
                activeOpacity={0.7}
              >
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
                <View style={styles.hamburgerLine} />
              </TouchableOpacity>
              <Text style={styles.topBarTitle}>UniVerse</Text>
            </View>
          )}

          {renderContent()}
        </View>

      </View>
    </ThemeContext.Provider>
  );
};


const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
  },

  // ---- Sidebar ----
  sidebar: {
    width: 230,
    backgroundColor: '#0f1624',
    height: '100%',
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'column',
  },

  // ---- Content ----
  contentArea: {
    flex: 1,
  },

  // ---- Mobile Drawer ----
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 240,
  },

  // ---- Top Bar (mobile) ----
  topBar: {
    height: 56,
    backgroundColor: '#0f1624',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // ---- Hamburger ----
  hamburgerBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    gap: 5,
  },
  hamburgerLine: {
    width: 24,
    height: 2.5,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },

  // ---- Logo ----
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  logoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 18,
    color: '#60a5fa',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
    flex: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#8a9ab5',
    fontSize: 16,
  },

  // ---- Divider ----
  divider: {
    height: 1,
    backgroundColor: '#1e2d45',
    marginHorizontal: 16,
    marginVertical: 8,
  },

  // ---- Nav Items ----
  navScroll: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: '#1d3461',
  },
  navIconWrap: {
    width: 26,
    alignItems: 'center',
    marginRight: 12,
  },
  navLabel: {
    fontSize: 14,
    color: '#8a9ab5',
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  navLabelDanger: {
    color: '#f87171',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3b82f6',
  },

  // ---- Bottom Section ----
  bottomSection: {
    paddingHorizontal: 12,
    paddingTop: 4,
    gap: 2,
  },
});

export default ComitteiSideBar;