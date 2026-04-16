import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import axiosInstance from '../../../Src/Axios';

// ─── Wizard steps ───────────────────────────────────────────
// 'list'            → existing institutes
// 'addInstitute'    → Step 1: institute info
// 'deptCount'       → Step 2: how many departments?
// 'deptAdmins'      → Step 3: fill each dept name + admin
// 'addDepartment'   → add a single dept to an EXISTING institute (from list card)

const EMPTY_DEPT = () => ({
  departmentName: '',
  adminId: '',
  adminEmail: '',
  adminPassword: '',
  confirmPassword: '',
});

const AddInstitute = ({ onInstituteAdded }) => {
  const [currentScreen, setCurrentScreen] = useState('list');
  const [institutes, setInstitutes] = useState([]);
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Step 1 — Institute info (no admin fields)
  const [formData, setFormData] = useState({
    instituteName: '',
    instituteAddress: '',
    institutePhone: '',
    instituteEmail: '',
    pricePerMonth: '',
  });

  // Step 2 — How many departments
  const [deptCount, setDeptCount] = useState('');

  // Step 3 — Array of department objects
  const [departments, setDepartments] = useState([EMPTY_DEPT()]);

  // Newly created institute (used between Step 1 → Step 3 API calls)
  const [createdInstitute, setCreatedInstitute] = useState(null);

  // Single-dept form for "Add Dept" from list card
  const [singleDept, setSingleDept] = useState(EMPTY_DEPT());

  // ── Fetch ─────────────────────────────────────────────────
  useEffect(() => { fetchInstitutes(); }, []);

  const fetchInstitutes = async () => {
    try {
      setRefreshing(true);
      const response = await axiosInstance.get('/admins/get-institutes');
      if (response.data && Array.isArray(response.data.data)) {
        setInstitutes(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching institutes:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────
  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleDeptChange = (index, field, value) => {
    setDepartments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSingleDeptChange = (field, value) => setSingleDept(prev => ({ ...prev, [field]: value }));

  const resetInstituteForm = () => setFormData({
    instituteName: '', instituteAddress: '', institutePhone: '',
    instituteEmail: '', pricePerMonth: '',
  });

  const resetAllWizard = () => {
    resetInstituteForm();
    setDeptCount('');
    setDepartments([EMPTY_DEPT()]);
    setCreatedInstitute(null);
  };

  // ── Validations ───────────────────────────────────────────
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateInstituteForm = () => {
    if (!formData.instituteName.trim()) return showErr('Institute name is required');
    if (!formData.pricePerMonth.trim()) return showErr('Price per month is required');
    if (isNaN(formData.pricePerMonth) || Number(formData.pricePerMonth) <= 0)
      return showErr('Please enter a valid price per month');
    return true;
  };

  const validateDeptCount = () => {
    const n = parseInt(deptCount, 10);
    if (!deptCount.trim() || isNaN(n) || n < 1)
      return showErr('Please enter a valid number of departments (minimum 1)');
    return true;
  };

  const validateDeptAdmins = () => {
    for (let i = 0; i < departments.length; i++) {
      const d = departments[i];
      const label = `Department ${i + 1}`;
      if (!d.departmentName.trim()) return showErr(`${label}: Department name is required`);
      if (!d.adminId.trim()) return showErr(`${label}: Admin ID is required`);
      if (!d.adminEmail.trim()) return showErr(`${label}: Admin email is required`);
      if (!emailRegex.test(d.adminEmail)) return showErr(`${label}: Invalid email address`);
      if (!d.adminPassword) return showErr(`${label}: Password is required`);
      if (d.adminPassword.length < 6) return showErr(`${label}: Password must be at least 6 characters`);
      if (d.adminPassword !== d.confirmPassword) return showErr(`${label}: Passwords do not match`);
    }
    return true;
  };

  const validateSingleDept = () => {
    if (!singleDept.departmentName.trim()) return showErr('Department name is required');
    if (!singleDept.adminId.trim()) return showErr('Admin ID is required');
    if (!singleDept.adminEmail.trim()) return showErr('Admin email is required');
    if (!emailRegex.test(singleDept.adminEmail)) return showErr('Please enter a valid email address');
    if (!singleDept.adminPassword) return showErr('Password is required');
    if (singleDept.adminPassword.length < 6) return showErr('Password must be at least 6 characters');
    if (singleDept.adminPassword !== singleDept.confirmPassword) return showErr('Passwords do not match');
    return true;
  };

  const showErr = (msg) => { Alert.alert('Validation Error', msg); return false; };

  // ── API Calls ─────────────────────────────────────────────

  /** Step 1 submit — create institute only */
  const handleSubmitInstitute = async () => {
    if (!validateInstituteForm()) return;
    setLoading(true);
    try {
      const payload = {
        instituteName: formData.instituteName,
        instituteAddress: formData.instituteAddress,
        institutePhone: formData.institutePhone,
        instituteEmail: formData.instituteEmail,
        pricePerMonth: Number(formData.pricePerMonth),
      };
      const response = await axiosInstance.post('/admins/add-institute', payload);
      if (response.data?.success) {
        setCreatedInstitute(response.data.data);
        setCurrentScreen('deptCount');
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to create institute');
      }
    } catch (error) {
      handleApiError(error, 'create institute');
    } finally {
      setLoading(false);
    }
  };

  /** Step 2 — confirm dept count, build departments array */
  const handleConfirmDeptCount = () => {
    if (!validateDeptCount()) return;
    const n = parseInt(deptCount, 10);
    setDepartments(Array.from({ length: n }, () => EMPTY_DEPT()));
    setCurrentScreen('deptAdmins');
  };

  /** Step 3 — submit all departments with their admins */
  const handleSubmitAllDepartments = async () => {
    if (!validateDeptAdmins()) return;
    setLoading(true);
    try {
      const instituteId = createdInstitute._id || createdInstitute.id;
      // Submit departments sequentially
      for (const dept of departments) {
        const payload = {
          instituteId,
          departmentName: dept.departmentName,
          adminId: dept.adminId,
          adminEmail: dept.adminEmail,
          adminPassword: dept.adminPassword,
        };
        const response = await axiosInstance.post('/admins/add-department', payload);
        if (!response.data?.success) {
          Alert.alert('Error', `Failed to add department "${dept.departmentName}": ${response.data?.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
      }
      Alert.alert(
        'Success 🎉',
        `Institute "${createdInstitute.instituteName}" created with ${departments.length} department(s) successfully!`,
        [{
          text: 'Done',
          onPress: () => {
            fetchInstitutes();
            setCurrentScreen('list');
            resetAllWizard();
            if (typeof onInstituteAdded === 'function') onInstituteAdded(createdInstitute);
          },
        }]
      );
    } catch (error) {
      handleApiError(error, 'add departments');
    } finally {
      setLoading(false);
    }
  };

  /** Add single dept to an existing institute (from list card) */
  const handleAddSingleDepartment = async () => {
    if (!validateSingleDept()) return;
    setLoading(true);
    try {
      const payload = {
        instituteId: selectedInstitute._id || selectedInstitute.id,
        departmentName: singleDept.departmentName,
        adminId: singleDept.adminId,
        adminEmail: singleDept.adminEmail,
        adminPassword: singleDept.adminPassword,
      };
      const response = await axiosInstance.post('/admins/add-department', payload);
      if (response.data?.success) {
        Alert.alert(
          'Success',
          `Department "${singleDept.departmentName}" added successfully!`,
          [
            { text: 'Add More', onPress: () => setSingleDept(EMPTY_DEPT()) },
            {
              text: 'Done',
              onPress: () => {
                fetchInstitutes();
                setCurrentScreen('list');
                setSelectedInstitute(null);
                setSingleDept(EMPTY_DEPT());
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to add department');
      }
    } catch (error) {
      handleApiError(error, 'add department');
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = (error, action) => {
    let msg = `Failed to ${action}. Please try again.`;
    if (error.response) msg = error.response.data?.message || error.response.data?.error || msg;
    else if (error.request) msg = 'Network error. Please check your connection.';
    else msg = error.message || msg;
    Alert.alert('Error', msg);
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER: INSTITUTE LIST
  // ═══════════════════════════════════════════════════════════
  const renderInstituteListScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <Text style={styles.pageHeaderIcon}>🎓</Text>
          <View>
            <Text style={styles.pageTitle}>Institutes</Text>
            <Text style={styles.pageSubtitle}>{institutes.length} institutes registered</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchInstitutes} />}
      >
        <TouchableOpacity
          style={styles.addNewCard}
          onPress={() => { resetAllWizard(); setCurrentScreen('addInstitute'); }}
        >
          <View style={styles.addNewContent}>
            <Text style={styles.addNewIcon}>➕</Text>
            <View style={styles.addNewText}>
              <Text style={styles.addNewTitle}>Add New Institute</Text>
              <Text style={styles.addNewSubtitle}>Create institute + assign department admins</Text>
            </View>
          </View>
          <Text style={styles.arrowIcon}>→</Text>
        </TouchableOpacity>

        {institutes.length > 0 ? (
          <View style={styles.institutesList}>
            <Text style={styles.listTitle}>Existing Institutes</Text>
            {institutes.map((institute, index) => (
              <View key={index} style={styles.instituteCard}>
                <View style={styles.instituteCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instituteName}>{institute.instituteName}</Text>
                    {institute.departments?.length > 0 && (
                      <Text style={styles.instituteAdmin}>
                        {institute.departments.length} department(s)
                      </Text>
                    )}
                  </View>
                  <View style={styles.priceBadge}>
                    <Text style={styles.badgeText}>₹{institute.pricePerMonth}/mo</Text>
                  </View>
                </View>
                {institute.instituteAddress && (
                  <Text style={styles.instituteAddress}>{institute.instituteAddress}</Text>
                )}
                <View style={styles.instituteFooter}>
                  <Text style={styles.instituteEmail}>{institute.instituteEmail}</Text>
                  <TouchableOpacity
                    style={styles.addDeptButton}
                    onPress={() => {
                      setSelectedInstitute(institute);
                      setSingleDept(EMPTY_DEPT());
                      setCurrentScreen('addDepartment');
                    }}
                  >
                    <Text style={styles.addDeptText}>+ Add Dept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No institutes yet</Text>
            <Text style={styles.emptySubtext}>Create your first institute to get started</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: STEP 1 — ADD INSTITUTE INFO
  // ═══════════════════════════════════════════════════════════
  const renderAddInstituteScreen = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => { setCurrentScreen('list'); resetAllWizard(); }} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageHeaderIcon}>🏫</Text>
            <View>
              <Text style={styles.pageTitle}>Step 1 of 3</Text>
              <Text style={styles.pageSubtitle}>Institute Information</Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.progressActive]} />
          <View style={[styles.progressStep, styles.progressInactive]} />
          <View style={[styles.progressStep, styles.progressInactive]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Institute Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institute Name *</Text>
              <TextInput style={styles.input} value={formData.instituteName} onChangeText={t => handleChange('instituteName', t)}
                placeholder="Enter institute name" placeholderTextColor="#4a5070" autoCapitalize="words" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institute Address</Text>
              <TextInput style={[styles.input, styles.textArea]} value={formData.instituteAddress} onChangeText={t => handleChange('instituteAddress', t)}
                placeholder="Enter institute address" placeholderTextColor="#4a5070" multiline numberOfLines={3} textAlignVertical="top" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Institute Phone</Text>
                <TextInput style={styles.input} value={formData.institutePhone} onChangeText={t => handleChange('institutePhone', t)}
                  placeholder="Phone number" placeholderTextColor="#4a5070" keyboardType="phone-pad" />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Institute Email</Text>
                <TextInput style={styles.input} value={formData.instituteEmail} onChangeText={t => handleChange('instituteEmail', t)}
                  placeholder="Institute email" placeholderTextColor="#4a5070" keyboardType="email-address" autoCapitalize="none" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price Per Month (₹) *</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput style={styles.priceInput} value={formData.pricePerMonth} onChangeText={t => handleChange('pricePerMonth', t)}
                  placeholder="0.00" placeholderTextColor="#4a5070" keyboardType="numeric" />
              </View>
            </View>
          </View>

          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              ℹ️ You'll assign department admins in the next steps. Each department will have its own dedicated admin account.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.resetButton} onPress={resetInstituteForm} disabled={loading}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmitInstitute} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Next: Departments →</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: STEP 2 — HOW MANY DEPARTMENTS?
  // ═══════════════════════════════════════════════════════════
  const renderDeptCountScreen = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => setCurrentScreen('addInstitute')} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.pageHeaderLeft}>
          <Text style={styles.pageHeaderIcon}>🏢</Text>
          <View>
            <Text style={styles.pageTitle}>Step 2 of 3</Text>
            <Text style={styles.pageSubtitle}>Department Setup</Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressStep, styles.progressDone]} />
        <View style={[styles.progressStep, styles.progressActive]} />
        <View style={[styles.progressStep, styles.progressInactive]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.deptCountHeader}>
            <Text style={styles.deptCountIcon}>🏗️</Text>
            <Text style={styles.sectionTitle}>How many departments does</Text>
            <Text style={styles.instituteLabelBig}>"{createdInstitute?.instituteName}"</Text>
            <Text style={styles.sectionTitle}>have?</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Number of Departments *</Text>
            <TextInput
              style={[styles.input, styles.deptCountInput]}
              value={deptCount}
              onChangeText={t => {
                // only allow digits
                const cleaned = t.replace(/[^0-9]/g, '');
                setDeptCount(cleaned);
              }}
              placeholder="e.g., 3"
              placeholderTextColor="#4a5070"
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          {/* Quick-select chips */}
          <View style={styles.chipRow}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, deptCount === String(n) && styles.chipActive]}
                onPress={() => setDeptCount(String(n))}
              >
                <Text style={[styles.chipText, deptCount === String(n) && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.resetButton} onPress={() => setDeptCount('')}>
            <Text style={styles.resetButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleConfirmDeptCount}>
            <Text style={styles.submitButtonText}>Next: Assign Admins →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: STEP 3 — DEPARTMENT ADMIN FORMS
  // ═══════════════════════════════════════════════════════════
  const renderDeptAdminsScreen = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => setCurrentScreen('deptCount')} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageHeaderIcon}>👤</Text>
            <View>
              <Text style={styles.pageTitle}>Step 3 of 3</Text>
              <Text style={styles.pageSubtitle}>Assign Admins — {departments.length} department(s)</Text>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.progressDone]} />
          <View style={[styles.progressStep, styles.progressDone]} />
          <View style={[styles.progressStep, styles.progressActive]} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {departments.map((dept, i) => (
            <View key={i} style={styles.deptCard}>
              {/* Dept header badge */}
              <View style={styles.deptCardBadge}>
                <Text style={styles.deptCardBadgeText}>Department {i + 1}</Text>
              </View>

              {/* Dept name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department Name *</Text>
                <TextInput
                  style={styles.input}
                  value={dept.departmentName}
                  onChangeText={t => handleDeptChange(i, 'departmentName', t)}
                  placeholder="e.g., Computer Science, Engineering"
                  placeholderTextColor="#4a5070"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.deptDivider} />
              <Text style={styles.deptAdminLabel}>🔐 Admin Account</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Admin ID *</Text>
                <TextInput
                  style={styles.input}
                  value={dept.adminId}
                  onChangeText={t => handleDeptChange(i, 'adminId', t)}
                  placeholder="Enter admin ID"
                  placeholderTextColor="#4a5070"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Admin Email *</Text>
                <TextInput
                  style={styles.input}
                  value={dept.adminEmail}
                  onChangeText={t => handleDeptChange(i, 'adminEmail', t)}
                  placeholder="Enter admin email"
                  placeholderTextColor="#4a5070"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={dept.adminPassword}
                    onChangeText={t => handleDeptChange(i, 'adminPassword', t)}
                    placeholder="Min. 6 chars"
                    placeholderTextColor="#4a5070"
                    secureTextEntry
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={dept.confirmPassword}
                    onChangeText={t => handleDeptChange(i, 'confirmPassword', t)}
                    placeholder="Confirm"
                    placeholderTextColor="#4a5070"
                    secureTextEntry
                  />
                </View>
              </View>
            </View>
          ))}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.resetButton} onPress={() => setDepartments(Array.from({ length: departments.length }, () => EMPTY_DEPT()))} disabled={loading}>
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleSubmitAllDepartments} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Create Institute ✓</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: ADD SINGLE DEPARTMENT (from existing institute list)
  // ═══════════════════════════════════════════════════════════
  const renderAddDepartmentScreen = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => { setCurrentScreen('list'); setSelectedInstitute(null); setSingleDept(EMPTY_DEPT()); }} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageHeaderIcon}>🏢</Text>
            <View>
              <Text style={styles.pageTitle}>Add Department</Text>
              <Text style={styles.pageSubtitle}>{selectedInstitute?.instituteName}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Department Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department Name *</Text>
              <TextInput style={styles.input} value={singleDept.departmentName} onChangeText={t => handleSingleDeptChange('departmentName', t)}
                placeholder="e.g., Computer Science, Engineering" placeholderTextColor="#4a5070" autoCapitalize="words" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Department Admin</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin ID *</Text>
              <TextInput style={styles.input} value={singleDept.adminId} onChangeText={t => handleSingleDeptChange('adminId', t)}
                placeholder="Enter admin ID" placeholderTextColor="#4a5070" autoCapitalize="none" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Email *</Text>
              <TextInput style={styles.input} value={singleDept.adminEmail} onChangeText={t => handleSingleDeptChange('adminEmail', t)}
                placeholder="Enter admin email" placeholderTextColor="#4a5070" keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Password *</Text>
                <TextInput style={styles.input} value={singleDept.adminPassword} onChangeText={t => handleSingleDeptChange('adminPassword', t)}
                  placeholder="Min. 6 characters" placeholderTextColor="#4a5070" secureTextEntry />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput style={styles.input} value={singleDept.confirmPassword} onChangeText={t => handleSingleDeptChange('confirmPassword', t)}
                  placeholder="Confirm password" placeholderTextColor="#4a5070" secureTextEntry />
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.resetButton} onPress={() => setSingleDept(EMPTY_DEPT())} disabled={loading}>
              <Text style={styles.resetButtonText}>Reset Form</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleAddSingleDepartment} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Add Department</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════
  // ROOT RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      {currentScreen === 'list' && renderInstituteListScreen()}
      {currentScreen === 'addInstitute' && renderAddInstituteScreen()}
      {currentScreen === 'deptCount' && renderDeptCountScreen()}
      {currentScreen === 'deptAdmins' && renderDeptAdminsScreen()}
      {currentScreen === 'addDepartment' && renderAddDepartmentScreen()}
    </>
  );
};

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d1a' },

  // ── Page Header ──
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: '#1c2140', backgroundColor: '#13172a',
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  pageHeaderIcon: { fontSize: 28 },
  pageTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  pageSubtitle: { color: '#8b92b4', fontSize: 12, marginTop: 2 },
  backButton: { marginRight: 12, padding: 8 },
  backIcon: { fontSize: 20, color: '#4b6cf7' },

  // ── Progress Bar ──
  progressBar: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10,
    gap: 6, backgroundColor: '#13172a',
    borderBottomWidth: 1, borderBottomColor: '#1c2140',
  },
  progressStep: { flex: 1, height: 4, borderRadius: 2 },
  progressActive: { backgroundColor: '#4b6cf7' },
  progressDone: { backgroundColor: '#22c55e' },
  progressInactive: { backgroundColor: '#1c2140' },

  // ── Scroll ──
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },

  // ── Cards ──
  card: { backgroundColor: '#13172a', borderRadius: 14, borderWidth: 1, borderColor: '#1c2140', padding: 20 },
  sectionTitle: { color: '#4b6cf7', fontSize: 15, fontWeight: 'bold', marginBottom: 18 },

  // ── Info Note ──
  infoNote: {
    backgroundColor: 'rgba(75,108,247,0.08)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(75,108,247,0.25)', padding: 14,
  },
  infoNoteText: { color: '#8b92b4', fontSize: 13, lineHeight: 20 },

  // ── Add New Card ──
  addNewCard: {
    backgroundColor: 'rgba(75, 108, 247, 0.1)', borderWidth: 2, borderColor: '#4b6cf7',
    borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4,
  },
  addNewContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  addNewIcon: { fontSize: 32 },
  addNewText: { flex: 1 },
  addNewTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  addNewSubtitle: { color: '#8b92b4', fontSize: 12, marginTop: 2 },
  arrowIcon: { fontSize: 20, color: '#4b6cf7', fontWeight: 'bold' },

  // ── Institutes List ──
  institutesList: { marginTop: 20 },
  listTitle: { color: '#4b6cf7', fontSize: 14, fontWeight: 'bold', marginBottom: 12, letterSpacing: 0.5 },
  instituteCard: {
    backgroundColor: '#13172a', borderRadius: 12, borderWidth: 1,
    borderColor: '#1c2140', padding: 16, marginBottom: 12,
  },
  instituteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  instituteName: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  instituteAdmin: { color: '#8b92b4', fontSize: 12, marginTop: 4 },
  priceBadge: { backgroundColor: '#4b6cf7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  instituteAddress: { color: '#8b92b4', fontSize: 12, marginBottom: 10, lineHeight: 18 },
  instituteFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1c2140',
  },
  instituteEmail: { color: '#8b92b4', fontSize: 12 },
  addDeptButton: { backgroundColor: '#4b6cf7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  addDeptText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  // ── Empty State ──
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 60, marginBottom: 12 },
  emptyText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptySubtext: { color: '#8b92b4', fontSize: 13 },

  // ── Dept Count Screen ──
  deptCountHeader: { alignItems: 'center', marginBottom: 20 },
  deptCountIcon: { fontSize: 48, marginBottom: 10 },
  instituteLabelBig: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginVertical: 4 },
  deptCountInput: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', letterSpacing: 4, color: '#4b6cf7' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  chip: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0b0d1a', borderWidth: 1, borderColor: '#1c2140',
  },
  chipActive: { backgroundColor: 'rgba(75,108,247,0.2)', borderColor: '#4b6cf7' },
  chipText: { color: '#8b92b4', fontSize: 16, fontWeight: '600' },
  chipTextActive: { color: '#4b6cf7' },

  // ── Dept Admin Cards ──
  deptCard: {
    backgroundColor: '#13172a', borderRadius: 14, borderWidth: 1,
    borderColor: '#1c2140', padding: 20,
  },
  deptCardBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(75,108,247,0.15)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(75,108,247,0.3)',
  },
  deptCardBadgeText: { color: '#4b6cf7', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },
  deptDivider: { height: 1, backgroundColor: '#1c2140', marginVertical: 14 },
  deptAdminLabel: { color: '#8b92b4', fontSize: 13, fontWeight: '600', marginBottom: 14 },

  // ── Inputs ──
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  label: { color: '#8b92b4', fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: {
    backgroundColor: '#0b0d1a', borderWidth: 1, borderColor: '#1c2140',
    borderRadius: 8, padding: 12, color: '#ffffff', fontSize: 14,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  priceInputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0b0d1a',
    borderWidth: 1, borderColor: '#1c2140', borderRadius: 8, paddingHorizontal: 12,
  },
  currencySymbol: { color: '#4b6cf7', fontSize: 16, fontWeight: 'bold', marginRight: 6 },
  priceInput: { flex: 1, paddingVertical: 12, color: '#ffffff', fontSize: 14 },

  // ── Buttons ──
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 4 },
  resetButton: {
    flex: 1, padding: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1c2140', borderWidth: 1, borderColor: '#2a3060',
  },
  resetButtonText: { color: '#8b92b4', fontWeight: '600', fontSize: 14 },
  submitButton: { flex: 2, padding: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#4b6cf7' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});

export default AddInstitute;