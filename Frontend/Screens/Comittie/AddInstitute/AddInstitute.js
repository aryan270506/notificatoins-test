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
  Modal,
} from 'react-native';
import axiosInstance from '../../../Src/Axios';

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

  // Current department form data
  const [currentDepartmentData, setCurrentDepartmentData] = useState({
    departmentName: '',
    adminId: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
  });

  // Fetch institutes on mount
  useEffect(() => {
    fetchInstitutes();
  }, []);

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

  const validateInstituteForm = () => {
    if (!formData.instituteName.trim()) {
      Alert.alert('Validation Error', 'Institute name is required');
      return false;
    }
    if (!formData.adminId.trim()) {
      Alert.alert('Validation Error', 'Admin ID is required');
      return false;
    }
    if (!formData.adminEmail.trim()) {
      Alert.alert('Validation Error', 'Admin email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.adminPassword) {
      Alert.alert('Validation Error', 'Password is required');
      return false;
    }
    if (formData.adminPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }
    if (formData.adminPassword !== formData.confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }
    if (!formData.pricePerMonth.trim()) {
      Alert.alert('Validation Error', 'Price per month is required');
      return false;
    }
    if (isNaN(formData.pricePerMonth) || Number(formData.pricePerMonth) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price per month');
      return false;
    }
    return true;
  };

  const validateDepartmentForm = () => {
    if (!currentDepartmentData.departmentName.trim()) {
      Alert.alert('Validation Error', 'Department name is required');
      return false;
    }
    if (!currentDepartmentData.adminId.trim()) {
      Alert.alert('Validation Error', 'Admin ID is required');
      return false;
    }
    if (!currentDepartmentData.adminEmail.trim()) {
      Alert.alert('Validation Error', 'Admin email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentDepartmentData.adminEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (!currentDepartmentData.adminPassword) {
      Alert.alert('Validation Error', 'Password is required');
      return false;
    }
    if (currentDepartmentData.adminPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }
    if (currentDepartmentData.adminPassword !== currentDepartmentData.confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const validateNumberOfDepartments = () => {
    if (!numberOfDepartments.trim()) {
      Alert.alert('Validation Error', 'Please enter number of departments');
      return false;
    }
    const num = parseInt(numberOfDepartments);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid number greater than 0');
      return false;
    }
    return true;
  };

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

      if (response.data && response.data.success) {
        Alert.alert(
          'Success',
          `Institute "${formData.instituteName}" created successfully!`,
          [
            {
              text: 'Add Departments',
              onPress: () => {
                setSelectedInstitute(response.data.data);
                setCurrentScreen('selectDepartments');
                setNumberOfDepartments('');
                setDepartmentsData([]);
                setCurrentDepartmentIndex(0);
                resetInstituteForm();
              },
            },
            {
              text: 'Done',
              onPress: () => {
                fetchInstitutes();
                setCurrentScreen('list');
                resetInstituteForm();
                if (onInstituteAdded && typeof onInstituteAdded === 'function') {
                  onInstituteAdded(response.data.data);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Institute created but no data returned. Please check the response format.');
        console.error('Unexpected response structure:', response.data);
      }
    } catch (error) {
      console.error('Error creating institute:', error);
      let errorMessage = 'Failed to create institute. Please try again.';
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDepartmentSetup = () => {
    if (!validateNumberOfDepartments()) return;

    const num = parseInt(numberOfDepartments);
    // Initialize empty departments array
    const depts = Array(num).fill(null).map((_, i) => ({
      departmentName: '',
      adminId: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
      index: i + 1,
    }));
    
    setDepartmentsData(depts);
    setCurrentDepartmentIndex(0);
    setCurrentDepartmentData(depts[0]);
    setCurrentScreen('addDepartmentAdmin');
  };

  const handleAddDepartmentAdmin = async () => {
    if (!validateDepartmentForm()) return;

    // Update current department in the array
    const updatedDepts = [...departmentsData];
    updatedDepts[currentDepartmentIndex] = {
      ...currentDepartmentData,
    };
    setDepartmentsData(updatedDepts);

    // If this is the last department, save all departments
    if (currentDepartmentIndex === departmentsData.length - 1) {
      await saveAllDepartments(updatedDepts);
    } else {
      // Move to next department
      const nextIndex = currentDepartmentIndex + 1;
      setCurrentDepartmentIndex(nextIndex);
      setCurrentDepartmentData(updatedDepts[nextIndex]);
      // Reset the form for next department
      resetCurrentDepartmentForm();
      Alert.alert(
        'Department Added',
        `Department ${currentDepartmentIndex + 1} added.\n\nNow adding department ${nextIndex + 1}...`
      );
    }
  };

  const saveAllDepartments = async (depts) => {
    setLoading(true);
    try {
      // Save all departments
      for (const dept of depts) {
        const payload = {
          instituteId,
          departmentName: dept.departmentName,
          adminId: dept.adminId,
          adminEmail: dept.adminEmail,
          adminPassword: dept.adminPassword,
        };

        const response = await axiosInstance.post('/admins/add-department', payload);
        if (!response.data || !response.data.success) {
          throw new Error(response.data?.message || 'Failed to add department');
        }
      }

      Alert.alert(
        'Success',
        `All ${depts.length} departments added successfully!`,
        [
          {
            text: 'Done',
            onPress: () => {
              fetchInstitutes();
              setCurrentScreen('list');
              setSelectedInstitute(null);
              setNumberOfDepartments('');
              setDepartmentsData([]);
              setCurrentDepartmentIndex(0);
              resetCurrentDepartmentForm();
            },
          },
          {
            text: 'Add More Institutes',
            onPress: () => {
              setCurrentScreen('list');
              setSelectedInstitute(null);
              setNumberOfDepartments('');
              setDepartmentsData([]);
              setCurrentDepartmentIndex(0);
              resetCurrentDepartmentForm();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving departments:', error);
      let errorMessage = 'Failed to add departments. Please try again.';
      if (error.response) {
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error.request) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to add department');
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetInstituteForm = () => {
    setFormData({
      instituteName: '',
      instituteAddress: '',
      institutePhone: '',
      instituteEmail: '',
      adminId: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
      pricePerMonth: '',
    });
  };

  const resetCurrentDepartmentForm = () => {
    setCurrentDepartmentData({
      departmentName: '',
      adminId: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    });
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
          onPress={() => {
            resetInstituteForm();
            setCurrentScreen('addInstitute');
          }}
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
              <View key={institute._id || institute.id || index} style={styles.instituteCard}>
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
                      setCurrentScreen('selectDepartments');
                      setNumberOfDepartments('');
                      setDepartmentsData([]);
                      setCurrentDepartmentIndex(0);
                      resetCurrentDepartmentForm();
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Page Header ── */}
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
              <TextInput
                style={styles.input}
                value={formData.instituteName}
                onChangeText={(text) => handleChange('instituteName', text)}
                placeholder="Enter institute name"
                placeholderTextColor="#4a5070"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institute Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.instituteAddress}
                onChangeText={(text) => handleChange('instituteAddress', text)}
                placeholder="Enter institute address"
                placeholderTextColor="#4a5070"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>Institute Phone</Text>
                <TextInput
                  style={styles.input}
                  value={formData.institutePhone}
                  onChangeText={(text) => handleChange('institutePhone', text)}
                  placeholder="Phone number"
                  placeholderTextColor="#4a5070"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Institute Email</Text>
                <TextInput
                  style={styles.input}
                  value={formData.instituteEmail}
                  onChangeText={(text) => handleChange('instituteEmail', text)}
                  placeholder="Institute email"
                  placeholderTextColor="#4a5070"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price Per Month (₹) *</Text>
              <View style={styles.priceInputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={formData.pricePerMonth}
                  onChangeText={(text) => handleChange('pricePerMonth', text)}
                  placeholder="0.00"
                  placeholderTextColor="#4a5070"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* ── Admin Account Information ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Admin Account Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin ID *</Text>
              <TextInput
                style={styles.input}
                value={formData.adminId}
                onChangeText={(text) => handleChange('adminId', text)}
                placeholder="Enter admin ID"
                placeholderTextColor="#4a5070"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Email *</Text>
              <TextInput
                style={styles.input}
                value={formData.adminEmail}
                onChangeText={(text) => handleChange('adminEmail', text)}
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
                  value={formData.adminPassword}
                  onChangeText={(text) => handleChange('adminPassword', text)}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#4a5070"
                  secureTextEntry
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleChange('confirmPassword', text)}
                  placeholder="Confirm password"
                  placeholderTextColor="#4a5070"
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          {/* ── Action Buttons ── */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetInstituteForm}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>Reset Form</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmitInstitute}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Institute</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: SELECT NUMBER OF DEPARTMENTS SCREEN
  // ═══════════════════════════════════════════════════════════
  const renderSelectDepartmentsScreen = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <TouchableOpacity
            onPress={() => {
              setCurrentScreen('list');
              setSelectedInstitute(null);
              setNumberOfDepartments('');
            }}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageHeaderIcon}>🏢</Text>
            <View>
              <Text style={styles.pageTitle}>Select Departments</Text>
              <Text style={styles.pageSubtitle}>
                {selectedInstitute?.instituteName}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Info Card ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Number of Departments</Text>
            <Text style={styles.infoText}>
              How many departments does this institute have? Each department will have its own admin and separate credentials.
            </Text>
          </View>

          {/* ── Number Input ── */}
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Number of Departments *</Text>
              <TextInput
                style={styles.input}
                value={numberOfDepartments}
                onChangeText={setNumberOfDepartments}
                placeholder="e.g., 3, 5, 10"
                placeholderTextColor="#4a5070"
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* ── Action Buttons ── */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => setNumberOfDepartments('')}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleStartDepartmentSetup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: ADD DEPARTMENT ADMIN SCREEN
  // ═══════════════════════════════════════════════════════════
  const renderAddDepartmentAdminScreen = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <TouchableOpacity
            onPress={() => {
              setCurrentScreen('selectDepartments');
              resetCurrentDepartmentForm();
            }}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageHeaderIcon}>🏫</Text>
            <View>
              <Text style={styles.pageTitle}>Department Admin</Text>
              <Text style={styles.pageSubtitle}>
                Department {currentDepartmentIndex + 1} of {departmentsData.length}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Department Information ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Department Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department Name *</Text>
              <TextInput
                style={styles.input}
                value={currentDepartmentData.departmentName}
                onChangeText={(text) => handleDepartmentChange('departmentName', text)}
                placeholder="e.g., Computer Science, Engineering, Arts"
                placeholderTextColor="#4a5070"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* ── Department Admin Information ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Department Admin</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin ID *</Text>
              <TextInput
                style={styles.input}
                value={currentDepartmentData.adminId}
                onChangeText={(text) => handleDepartmentChange('adminId', text)}
                placeholder="Enter admin ID"
                placeholderTextColor="#4a5070"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Email *</Text>
              <TextInput
                style={styles.input}
                value={currentDepartmentData.adminEmail}
                onChangeText={(text) => handleDepartmentChange('adminEmail', text)}
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
                  value={currentDepartmentData.adminPassword}
                  onChangeText={(text) => handleDepartmentChange('adminPassword', text)}
                  placeholder="Min. 6 characters"
                  placeholderTextColor="#4a5070"
                  secureTextEntry
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                  style={styles.input}
                  value={currentDepartmentData.confirmPassword}
                  onChangeText={(text) => handleDepartmentChange('confirmPassword', text)}
                  placeholder="Confirm password"
                  placeholderTextColor="#4a5070"
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetCurrentDepartmentForm}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>Reset Form</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleAddDepartmentAdmin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : currentDepartmentIndex === departmentsData.length - 1 ? (
                <Text style={styles.submitButtonText}>Save All ({departmentsData.length})</Text>
              ) : (
                <Text style={styles.submitButtonText}>Next Department</Text>
              )}
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
      {currentScreen === 'selectDepartments' && renderSelectDepartmentsScreen()}
      {currentScreen === 'addDepartmentAdmin' && renderAddDepartmentAdminScreen()}
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

  // ── Scroll Content ──
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },

  // ── Cards ──
  card: {
    backgroundColor: '#13172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1c2140',
    padding: 20,
  },
  sectionTitle: {
    color: '#4b6cf7',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 18,
  },

  // ── Info Note ──
  infoNote: {
    backgroundColor: 'rgba(75,108,247,0.08)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(75,108,247,0.25)', padding: 14,
  },
  infoNoteText: { color: '#8b92b4', fontSize: 13, lineHeight: 20 },

  // ── Add New Card ──
  addNewCard: {
    backgroundColor: 'rgba(75, 108, 247, 0.1)',
    borderWidth: 2,
    borderColor: '#4b6cf7',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
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
    backgroundColor: '#13172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1c2140',
    padding: 16,
    marginBottom: 12,
  },
  instituteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  instituteName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  instituteAdmin: {
    color: '#8b92b4',
    fontSize: 12,
    marginTop: 4,
  },
  priceBadge: {
    backgroundColor: '#4b6cf7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  instituteAddress: {
    color: '#8b92b4',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 18,
  },
  instituteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1c2140',
  },
  instituteEmail: {
    color: '#8b92b4',
    fontSize: 12,
  },
  addDeptButton: {
    backgroundColor: '#4b6cf7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addDeptText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 12,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtext: {
    color: '#8b92b4',
    fontSize: 13,
  },

  // ── Inputs ──
  row: { flexDirection: 'row' },
  inputGroup: { marginBottom: 16 },
  label: { color: '#8b92b4', fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: {
    backgroundColor: '#0b0d1a',
    borderWidth: 1,
    borderColor: '#1c2140',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b0d1a',
    borderWidth: 1,
    borderColor: '#1c2140',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    color: '#4b6cf7',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
  },

  // ── Buttons ──
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  resetButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1c2140',
    borderWidth: 1,
    borderColor: '#2a3060',
  },
  resetButtonText: {
    color: '#8b92b4',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#4b6cf7',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AddInstitute;