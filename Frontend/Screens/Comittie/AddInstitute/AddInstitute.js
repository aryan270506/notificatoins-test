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

// ─── Wizard steps ───────────────────────────────────────────
// 'list'            → existing institutes
// 'addInstitute'    → Step 1: institute info
// 'departments'     → Step 2: manage departments (with modal for adding)
// 'addDepartment'   → add a single dept to an EXISTING institute (from list card)

const EMPTY_DEPT = () => ({
  departmentName: '',
  adminId: '',
  adminEmail: '',
  adminPassword: '',
  confirmPassword: '',
});

// ─── Platform Detection ─────────────────────────────────────
const isWeb = Platform.OS === 'web';
const isIOS = Platform.OS === 'ios';

// ─── Helper for platform-specific styles ─────────────────
const getContainerStyle = () => {
  if (isWeb) {
    return {
      maxWidth: 900,
      alignSelf: 'center',
      width: '100%',
      paddingHorizontal: 20,
    };
  }
  return {};
};

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

  // Step 2 — Array of department objects
  const [departments, setDepartments] = useState([]);

  // Newly created institute (used between Step 1 → Step 2 API calls)
  const [createdInstitute, setCreatedInstitute] = useState(null);

  // Modal state for adding departments
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptForm, setNewDeptForm] = useState(EMPTY_DEPT());

  // Single-dept form for "Add Dept" from list card
  const [singleDept, setSingleDept] = useState(EMPTY_DEPT());

  // Edit institute state
  const [editingInstitute, setEditingInstitute] = useState(null);
  const [editFormData, setEditFormData] = useState({
    instituteName: '',
    instituteAddress: '',
    institutePhone: '',
    instituteEmail: '',
    pricePerMonth: '',
  });

  // Edit department state
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showEditDeptModal, setShowEditDeptModal] = useState(false);
  const [editDeptForm, setEditDeptForm] = useState(EMPTY_DEPT());

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

  const handleNewDeptChange = (field, value) => setNewDeptForm(prev => ({ ...prev, [field]: value }));

  const resetInstituteForm = () => setFormData({
    instituteName: '', instituteAddress: '', institutePhone: '',
    instituteEmail: '', pricePerMonth: '',
  });

  const resetAllWizard = () => {
    resetInstituteForm();
    setDepartments([]);
    setCreatedInstitute(null);
    setNewDeptForm(EMPTY_DEPT());
    setShowAddDeptModal(false);
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

  const validateDeptAdmins = () => {
    if (departments.length === 0) return showErr('Please add at least one department');
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
      
      console.log('Submitting institute payload:', payload);
      const response = await axiosInstance.post('/admins/add-institute', payload);
      console.log('Institute API Response:', response.data);
      
      // Check different possible response structures
      let instituteData = null;
      if (response.data?.success && response.data?.data) {
        instituteData = response.data.data;
      } else if (response.data?.data && !response.data?.success) {
        instituteData = response.data.data;
      } else if (response.data?.institute) {
        instituteData = response.data.institute;
      } else if (response.data && typeof response.data === 'object' && (response.data._id || response.data.id)) {
        instituteData = response.data;
      }
      
      if (instituteData && (instituteData._id || instituteData.id)) {
        // Store the created institute data
        setCreatedInstitute(instituteData);
        
        // Immediately add the new institute to the list
        setInstitutes(prevInstitutes => [instituteData, ...prevInstitutes]);
        
        // Move to departments screen
        setCurrentScreen('departments');
      } else {
        Alert.alert('Error', 'Institute created but no data returned. Please check the response format.');
        console.error('Unexpected response structure:', response.data);
      }
    } catch (error) {
      console.error('API Error:', error);
      console.error('Error response:', error.response?.data);
      handleApiError(error, 'create institute');
    } finally {
      setLoading(false);
    }
  };

  /** Add department from modal */
  const handleAddDepartmentFromModal = () => {
    // Validation
    if (!newDeptForm.departmentName.trim()) {
      const msg = 'Department name is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }
    if (!newDeptForm.adminId.trim()) {
      const msg = 'Admin ID is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }
    if (!newDeptForm.adminEmail.trim()) {
      const msg = 'Admin email is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }
    if (!emailRegex.test(newDeptForm.adminEmail)) {
      const msg = 'Please enter a valid email address';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }
    if (!newDeptForm.adminPassword) {
      const msg = 'Password is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }
    if (newDeptForm.adminPassword.length < 6) {
      const msg = 'Password must be at least 6 characters';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }
    if (newDeptForm.adminPassword !== newDeptForm.confirmPassword) {
      const msg = 'Passwords do not match';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }

    // Add to departments array
    setDepartments(prev => [...prev, { ...newDeptForm }]);
    
    // Close modal and reset form
    setShowAddDeptModal(false);
    setNewDeptForm(EMPTY_DEPT());
    
    // Feedback
    const msg = `✓ "${newDeptForm.departmentName}" added to queue`;
    isWeb ? alert(msg) : Alert.alert('Added', msg);
  };

  /** Remove department from list */
  const handleRemoveDepartment = (index) => {
    Alert.alert(
      'Remove Department',
      'Are you sure you want to remove this department?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Remove',
          onPress: () => {
            setDepartments(prev => prev.filter((_, i) => i !== index));
          },
          style: 'destructive'
        }
      ]
    );
  };

  /** Step 3 — submit all departments with their admins */
  const handleSubmitAllDepartments = async () => {
    if (!validateDeptAdmins()) return;
    setLoading(true);
    try {
      const instituteId = createdInstitute._id || createdInstitute.id;
      console.log('📤 Submitting departments for institute:', instituteId);
      console.log('📋 Departments to submit:', JSON.stringify(departments, null, 2));
      
      let successCount = 0;
      
      // Submit departments sequentially
      for (const dept of departments) {
        const payload = {
          instituteId,
          departmentName: dept.departmentName,
          adminId: dept.adminId,
          adminEmail: dept.adminEmail,
          adminPassword: dept.adminPassword,
        };
        console.log(`📤 Adding department: ${dept.departmentName}`, payload);
        
        const response = await axiosInstance.post('/admins/add-department', payload);
        console.log(`✅ Response for ${dept.departmentName}:`, response.data);
        
        if (response.data?.success) {
          successCount++;
          console.log(`✓ Successfully added: ${dept.departmentName}`);
        } else {
          const errorMsg = response.data?.message || 'Unknown error';
          console.error(`✗ Failed to add ${dept.departmentName}:`, errorMsg);
          const msg = `Failed to add department "${dept.departmentName}": ${errorMsg}`;
          isWeb ? alert(msg) : Alert.alert('Error', msg);
          setLoading(false);
          return;
        }
      }
      
      // Refresh the institutes list to show the updated department count
      await fetchInstitutes();
      
      const successMsg = `Institute "${createdInstitute.instituteName}" created with ${successCount} department(s) successfully! 🎉`;
      console.log('✅ All departments created successfully:', successMsg);
      
      if (isWeb) {
        alert(successMsg);
      } else {
        Alert.alert('Success 🎉', successMsg, [{
          text: 'Done',
          onPress: () => {
            resetAllWizard();
            setCurrentScreen('list');
            if (typeof onInstituteAdded === 'function') onInstituteAdded(createdInstitute);
          },
        }]);
      }
      
      resetAllWizard();
      setCurrentScreen('list');
      if (typeof onInstituteAdded === 'function') onInstituteAdded(createdInstitute);
      
    } catch (error) {
      console.error('❌ Error adding departments:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to add departments';
      console.error('Error details:', errorMsg);
      const msg = `Error: ${errorMsg}`;
      isWeb ? alert(msg) : handleApiError(error, 'add departments');
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
      console.log('Adding single department payload:', payload);
      const response = await axiosInstance.post('/admins/add-department', payload);
      if (response.data?.success) {
        // Refresh the institutes list to show updated department count
        await fetchInstitutes();
        
        Alert.alert(
          'Success',
          `Department "${singleDept.departmentName}" added successfully!`,
          [
            { 
              text: 'Add More', 
              onPress: () => setSingleDept(EMPTY_DEPT()) 
            },
            {
              text: 'Done',
              onPress: () => {
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
      console.error('Error adding department:', error);
      handleApiError(error, 'add department');
    } finally {
      setLoading(false);
    }
  };

  /** Start editing an institute */
  const handleStartEditInstitute = (institute) => {
    setEditingInstitute(institute);
    setEditFormData({
      instituteName: institute.instituteName,
      instituteAddress: institute.instituteAddress || '',
      institutePhone: institute.institutePhone || '',
      instituteEmail: institute.instituteEmail || '',
      pricePerMonth: String(institute.pricePerMonth || ''),
    });
    setCurrentScreen('editInstitute');
  };

  /** Submit edited institute data */
  const handleSubmitEditInstitute = async () => {
    if (!editFormData.instituteName.trim()) {
      const msg = 'Institute name is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }
    if (!editFormData.pricePerMonth.trim()) {
      const msg = 'Price is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }
    if (isNaN(editFormData.pricePerMonth) || Number(editFormData.pricePerMonth) <= 0) {
      const msg = 'Price must be a positive number';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        instituteName: editFormData.instituteName,
        instituteAddress: editFormData.instituteAddress,
        institutePhone: editFormData.institutePhone,
        instituteEmail: editFormData.instituteEmail,
        pricePerMonth: Number(editFormData.pricePerMonth),
      };

      console.log('📤 Updating institute:', editingInstitute._id, payload);
      const response = await axiosInstance.put(`/admins/institutes/${editingInstitute._id}`, payload);

      if (response.data?.success) {
        console.log('✅ Institute updated successfully');
        await fetchInstitutes();
        
        const msg = `"${editFormData.instituteName}" updated successfully! 🎉`;
        if (isWeb) {
          alert(msg);
        } else {
          Alert.alert('Success', msg, [{
            text: 'OK',
            onPress: () => {
              setCurrentScreen('list');
              setEditingInstitute(null);
              setEditFormData({ instituteName: '', instituteAddress: '', institutePhone: '', instituteEmail: '', pricePerMonth: '' });
            },
          }]);
        }
        setCurrentScreen('list');
        setEditingInstitute(null);
      } else {
        const msg = response.data?.message || 'Failed to update institute';
        isWeb ? alert(msg) : Alert.alert('Error', msg);
      }
    } catch (error) {
      console.error('❌ Error updating institute:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update institute';
      const msg = `Error: ${errorMsg}`;
      isWeb ? alert(msg) : handleApiError(error, 'update institute');
    } finally {
      setLoading(false);
    }
  };

  /** Start editing a department */
  const handleStartEditDepartment = (dept) => {
    setEditingDepartment(dept);
    setEditDeptForm({
      departmentName: dept.departmentName || '',
      adminId: dept.adminId || '',
      adminEmail: dept.adminEmail || '',
      adminPassword: '', // Don't pre-fill password for security
      confirmPassword: '',
    });
    setShowEditDeptModal(true);
  };

  /** Handle department edit form changes */
  const handleEditDeptChange = (field, value) => {
    setEditDeptForm(prev => ({ ...prev, [field]: value }));
  };

  /** Validate edited department form */
  const validateEditDeptForm = () => {
    if (!editDeptForm.departmentName.trim()) {
      const msg = 'Department name is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return false;
    }
    if (!editDeptForm.adminId.trim()) {
      const msg = 'Admin ID is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return false;
    }
    if (!editDeptForm.adminEmail.trim()) {
      const msg = 'Admin email is required';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return false;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editDeptForm.adminEmail)) {
      const msg = 'Invalid email format';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return false;
    }
    // Only validate password if one is provided (allowing no change)
    if (editDeptForm.adminPassword && editDeptForm.adminPassword.length < 6) {
      const msg = 'Password must be at least 6 characters';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return false;
    }
    if (editDeptForm.adminPassword !== editDeptForm.confirmPassword) {
      const msg = 'Passwords do not match';
      isWeb ? alert(msg) : Alert.alert('Validation Error', msg);
      return false;
    }
    return true;
  };

  /** Submit edited department */
  const handleSubmitEditDepartment = async () => {
    if (!validateEditDeptForm()) return;
    setLoading(true);
    try {
      const payload = {
        departmentName: editDeptForm.departmentName,
        adminId: editDeptForm.adminId,
        adminEmail: editDeptForm.adminEmail,
        ...(editDeptForm.adminPassword && { adminPassword: editDeptForm.adminPassword }), // Only include if provided
      };

      console.log('📤 Updating department:', editingDepartment._id || editingDepartment.departmentCode, payload);
      const response = await axiosInstance.put(
        `/admins/institutes/${editingInstitute._id}/departments/${editingDepartment._id || editingDepartment.departmentCode}`,
        payload
      );

      if (response.data?.success) {
        console.log('✅ Department updated successfully');
        await fetchInstitutes();
        
        const msg = `"${editDeptForm.departmentName}" updated successfully! 🎉`;
        if (isWeb) {
          alert(msg);
        } else {
          Alert.alert('Success', msg);
        }
        setShowEditDeptModal(false);
        setEditingDepartment(null);
        setEditDeptForm(EMPTY_DEPT());
      } else {
        const msg = response.data?.message || 'Failed to update department';
        isWeb ? alert(msg) : Alert.alert('Error', msg);
      }
    } catch (error) {
      console.error('❌ Error updating department:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update department';
      const msg = `Error: ${errorMsg}`;
      isWeb ? alert(msg) : handleApiError(error, 'update department');
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
          onPress={() => { 
            resetAllWizard(); 
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
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleStartEditInstitute(institute)}
                    >
                      <Text style={styles.editButtonText}>✎ Edit</Text>
                    </TouchableOpacity>
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
        behavior={isWeb ? undefined : (isIOS ? 'padding' : undefined)}
      >
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
                onChangeText={t => handleChange('instituteName', t)}
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
                onChangeText={t => handleChange('instituteAddress', t)}
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
                  onChangeText={t => handleChange('institutePhone', t)}
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
                  onChangeText={t => handleChange('instituteEmail', t)}
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
                  onChangeText={t => handleChange('pricePerMonth', t)}
                  placeholder="0.00" 
                  placeholderTextColor="#4a5070" 
                  keyboardType="numeric" 
                />
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
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
              onPress={handleSubmitInstitute} 
              disabled={loading}
            >
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
  // ═══════════════════════════════════════════════════════════
  // RENDER: STEP 2 — MANAGE DEPARTMENTS (with modal)
  // ═══════════════════════════════════════════════════════════
  const renderDepartmentsScreen = () => {
    // Safety check - if no createdInstitute, go back
    if (!createdInstitute) {
      Alert.alert('Error', 'Institute data missing. Please start over.');
      setCurrentScreen('addInstitute');
      return null;
    }

    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={isWeb ? undefined : (isIOS ? 'padding' : undefined)}
        >
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => setCurrentScreen('addInstitute')} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.pageHeaderLeft}>
              <Text style={styles.pageHeaderIcon}>🏫</Text>
              <View>
                <Text style={styles.pageTitle}>Step 2 of 2</Text>
                <Text style={styles.pageSubtitle}>Manage Departments</Text>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressStep, styles.progressDone]} />
            <View style={[styles.progressStep, styles.progressActive]} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{createdInstitute?.instituteName}</Text>
              <Text style={styles.deptSubtitle}>Add departments for this institute</Text>
            </View>

            {/* Add Department Button Card */}
            <TouchableOpacity 
              style={styles.addDeptCard}
              onPress={() => {
                setNewDeptForm(EMPTY_DEPT());
                setShowAddDeptModal(true);
              }}
            >
              <Text style={styles.addDeptIcon}>➕</Text>
              <View style={styles.addDeptContent}>
                <Text style={styles.addDeptTitle}>Add Department</Text>
                <Text style={styles.addDeptSubtitle}>Click to add a new department</Text>
              </View>
              <Text style={styles.deptArrow}>→</Text>
            </TouchableOpacity>

            {/* Departments List */}
            {departments.length > 0 ? (
              <View style={styles.departmentsList}>
                <Text style={styles.listTitle}>Added Departments ({departments.length})</Text>
                {departments.map((dept, i) => (
                  <View key={i} style={styles.deptListCard}>
                    <View style={styles.deptListHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.deptListName}>{dept.departmentName}</Text>
                        <Text style={styles.deptListAdmin}>Admin ID: {dept.adminId}</Text>
                        <Text style={styles.deptListEmail}>{dept.adminEmail}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deptDeleteBtn}
                        onPress={() => handleRemoveDepartment(i)}
                      >
                        <Text style={styles.deptDeleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyDeptsState}>
                <Text style={styles.emptyDeptsIcon}>📚</Text>
                <Text style={styles.emptyDeptsText}>No departments added yet</Text>
                <Text style={styles.emptyDeptsSubtext}>Click the + button above to add departments</Text>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.resetButton} 
                onPress={() => {
                  resetInstituteForm();
                  setCurrentScreen('list');
                }}
              >
                <Text style={styles.resetButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, departments.length === 0 && styles.submitButtonDisabled]} 
                onPress={handleSubmitAllDepartments} 
                disabled={loading || departments.length === 0}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Create Institute ✓</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Modal for Adding Department */}
          <Modal
            visible={showAddDeptModal}
            animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
            transparent={true}
            onRequestClose={() => setShowAddDeptModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Department</Text>
                  <TouchableOpacity 
                    style={styles.modalClose}
                    onPress={() => setShowAddDeptModal(false)}
                  >
                    <Text style={styles.modalCloseIcon}>✕</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Department Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={newDeptForm.departmentName}
                      onChangeText={t => handleNewDeptChange('departmentName', t)}
                      placeholder="e.g., Computer Science"
                      placeholderTextColor="#4a5070"
                      autoCapitalize="words"
                    />
                  </View>

                  <Text style={styles.deptAdminLabel}>🔐 Admin Account</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Admin ID *</Text>
                    <TextInput
                      style={styles.input}
                      value={newDeptForm.adminId}
                      onChangeText={t => handleNewDeptChange('adminId', t)}
                      placeholder="e.g., cs_admin_001"
                      placeholderTextColor="#4a5070"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Admin Email *</Text>
                    <TextInput
                      style={styles.input}
                      value={newDeptForm.adminEmail}
                      onChangeText={t => handleNewDeptChange('adminEmail', t)}
                      placeholder="admin@example.com"
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
                        value={newDeptForm.adminPassword}
                        onChangeText={t => handleNewDeptChange('adminPassword', t)}
                        placeholder="Min. 6 chars"
                        placeholderTextColor="#4a5070"
                        secureTextEntry
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={styles.label}>Confirm *</Text>
                      <TextInput
                        style={styles.input}
                        value={newDeptForm.confirmPassword}
                        onChangeText={t => handleNewDeptChange('confirmPassword', t)}
                        placeholder="Confirm"
                        placeholderTextColor="#4a5070"
                        secureTextEntry
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity 
                    style={styles.resetButton} 
                    onPress={() => setShowAddDeptModal(false)}
                  >
                    <Text style={styles.resetButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.submitButton}
                    onPress={handleAddDepartmentFromModal}
                  >
                    <Text style={styles.submitButtonText}>Add Department</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // MODAL: EDIT DEPARTMENT (from edit institute screen)
  // ═══════════════════════════════════════════════════════════
  const renderEditDepartmentModal = () => (
    <Modal
      visible={showEditDeptModal}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      transparent={true}
      onRequestClose={() => {
        setShowEditDeptModal(false);
        setEditingDepartment(null);
        setEditDeptForm(EMPTY_DEPT());
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Department</Text>
            <TouchableOpacity 
              style={styles.modalClose}
              onPress={() => {
                setShowEditDeptModal(false);
                setEditingDepartment(null);
                setEditDeptForm(EMPTY_DEPT());
              }}
            >
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Department Name *</Text>
              <TextInput
                style={styles.input}
                value={editDeptForm.departmentName}
                onChangeText={t => handleEditDeptChange('departmentName', t)}
                placeholder="Enter department name"
                placeholderTextColor="#4a5070"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin ID *</Text>
              <TextInput
                style={styles.input}
                value={editDeptForm.adminId}
                onChangeText={t => handleEditDeptChange('adminId', t)}
                placeholder="Admin ID"
                placeholderTextColor="#4a5070"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Email *</Text>
              <TextInput
                style={styles.input}
                value={editDeptForm.adminEmail}
                onChangeText={t => handleEditDeptChange('adminEmail', t)}
                placeholder="Admin email"
                placeholderTextColor="#4a5070"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password (Optional)</Text>
              <TextInput
                style={styles.input}
                value={editDeptForm.adminPassword}
                onChangeText={t => handleEditDeptChange('adminPassword', t)}
                placeholder="Leave blank to keep current password"
                placeholderTextColor="#4a5070"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={editDeptForm.confirmPassword}
                onChangeText={t => handleEditDeptChange('confirmPassword', t)}
                placeholder="Confirm password"
                placeholderTextColor="#4a5070"
                secureTextEntry
              />
            </View>
          </ScrollView>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={() => {
                setShowEditDeptModal(false);
                setEditingDepartment(null);
                setEditDeptForm(EMPTY_DEPT());
              }}
            >
              <Text style={styles.resetButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmitEditDepartment}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Save Department</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ═══════════════════════════════════════════════════════════
  // RENDER: EDIT INSTITUTE
  // ═══════════════════════════════════════════════════════════
  const renderEditInstituteScreen = () => (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={isWeb ? undefined : (isIOS ? 'padding' : undefined)}
      >
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => setCurrentScreen('list')} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageHeaderIcon}>✏️</Text>
            <View>
              <Text style={styles.pageTitle}>Edit Institute</Text>
              <Text style={styles.pageSubtitle}>{editingInstitute?.instituteName}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Institute Details</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institute Name *</Text>
              <TextInput 
                style={styles.input} 
                value={editFormData.instituteName} 
                onChangeText={t => setEditFormData(prev => ({ ...prev, instituteName: t }))}
                placeholder="Enter institute name" 
                placeholderTextColor="#4a5070" 
                autoCapitalize="words" 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institute Address</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={editFormData.instituteAddress} 
                onChangeText={t => setEditFormData(prev => ({ ...prev, instituteAddress: t }))}
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
                  value={editFormData.institutePhone} 
                  onChangeText={t => setEditFormData(prev => ({ ...prev, institutePhone: t }))}
                  placeholder="Phone number" 
                  placeholderTextColor="#4a5070" 
                  keyboardType="phone-pad" 
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Institute Email</Text>
                <TextInput 
                  style={styles.input} 
                  value={editFormData.instituteEmail} 
                  onChangeText={t => setEditFormData(prev => ({ ...prev, instituteEmail: t }))}
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
                  value={editFormData.pricePerMonth} 
                  onChangeText={t => setEditFormData(prev => ({ ...prev, pricePerMonth: t }))}
                  placeholder="0.00" 
                  placeholderTextColor="#4a5070" 
                  keyboardType="numeric" 
                />
              </View>
            </View>
          </View>

          {/* Departments Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Departments ({editingInstitute?.departments?.length || 0})</Text>
            
            {editingInstitute?.departments && editingInstitute.departments.length > 0 ? (
              <View>
                {editingInstitute.departments.map((dept, index) => (
                  <View key={dept._id || dept.departmentCode || index} style={styles.departmentItem}>
                    <View style={styles.departmentInfo}>
                      <Text style={styles.departmentName}>{dept.departmentName}</Text>
                      <Text style={styles.departmentAdmin}>Admin: {dept.adminId}</Text>
                      <Text style={styles.departmentEmail}>{dept.adminEmail}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.editDeptButton}
                      onPress={() => handleStartEditDepartment(dept)}
                    >
                      <Text style={styles.editDeptButtonText}>✎ Edit</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDepartmentsState}>
                <Text style={styles.noDepartmentsText}>No departments yet</Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={() => setCurrentScreen('list')}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
              onPress={handleSubmitEditInstitute} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Save Changes</Text>}
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
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={isWeb ? undefined : (isIOS ? 'padding' : undefined)}
      >
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
              <TextInput 
                style={styles.input} 
                value={singleDept.departmentName} 
                onChangeText={t => handleSingleDeptChange('departmentName', t)}
                placeholder="e.g., Computer Science, Engineering" 
                placeholderTextColor="#4a5070" 
                autoCapitalize="words" 
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Department Admin</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin ID *</Text>
              <TextInput 
                style={styles.input} 
                value={singleDept.adminId} 
                onChangeText={t => handleSingleDeptChange('adminId', t)}
                placeholder="Enter admin ID" 
                placeholderTextColor="#4a5070" 
                autoCapitalize="none" 
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin Email *</Text>
              <TextInput 
                style={styles.input} 
                value={singleDept.adminEmail} 
                onChangeText={t => handleSingleDeptChange('adminEmail', t)}
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
                  value={singleDept.adminPassword} 
                  onChangeText={t => handleSingleDeptChange('adminPassword', t)}
                  placeholder="Min. 6 characters" 
                  placeholderTextColor="#4a5070" 
                  secureTextEntry 
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput 
                  style={styles.input} 
                  value={singleDept.confirmPassword} 
                  onChangeText={t => handleSingleDeptChange('confirmPassword', t)}
                  placeholder="Confirm password" 
                  placeholderTextColor="#4a5070" 
                  secureTextEntry 
                />
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
      {currentScreen === 'departments' && renderDepartmentsScreen()}
      {currentScreen === 'editInstitute' && renderEditInstituteScreen()}
      {currentScreen === 'addDepartment' && renderAddDepartmentScreen()}
      {renderEditDepartmentModal()}
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
  scrollContent: { 
    padding: 20, 
    paddingBottom: 40, 
    gap: 16,
    ...(isWeb && {
      maxWidth: 900,
      alignSelf: 'center',
      width: '100%'
    })
  },

  // ── Cards ──
  card: { 
    backgroundColor: '#13172a', 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: '#1c2140', 
    padding: 20,
    ...(isWeb && {
      transition: 'all 200ms ease'
    })
  },
  sectionTitle: { color: '#4b6cf7', fontSize: 15, fontWeight: 'bold', marginBottom: 18 },

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
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 200ms ease',
      transform: 'translateY(0px)',
      backgroundColor: 'rgba(75, 108, 247, 0.08)'
    })
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
    ...(isWeb && {
      transition: 'all 200ms ease',
      cursor: 'default'
    })
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
  editButton: { 
    backgroundColor: '#4b6cf7', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6,
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 200ms ease',
      borderWidth: 1,
      borderColor: '#4b6cf7'
    })
  },
  editButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  addDeptButton: { 
    backgroundColor: '#4b6cf7', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 6,
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 200ms ease',
      borderWidth: 1,
      borderColor: '#4b6cf7'
    })
  },
  addDeptText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  // ── Department Items (in edit institute screen) ──
  departmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1c2140',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4b6cf7',
  },
  departmentInfo: { flex: 1 },
  departmentName: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  departmentAdmin: { color: '#8b92b4', fontSize: 12, marginBottom: 2 },
  departmentEmail: { color: '#8b92b4', fontSize: 11 },
  editDeptButton: {
    backgroundColor: '#4b6cf7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 10,
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 200ms ease',
    }),
  },
  editDeptButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '600' },
  noDepartmentsState: { alignItems: 'center', paddingVertical: 20 },
  noDepartmentsText: { color: '#8b92b4', fontSize: 13 },

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
    backgroundColor: '#0b0d1a', 
    borderWidth: 1, 
    borderColor: '#1c2140',
    borderRadius: 8, 
    padding: isWeb ? 14 : 12, 
    color: '#ffffff', 
    fontSize: isWeb ? 15 : 14,
    ...(isWeb && {
      outlineStyle: 'none',
      cursor: 'text',
      transitionDuration: '200ms'
    })
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  priceInputWrapper: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0b0d1a',
    borderWidth: 1, 
    borderColor: '#1c2140', 
    borderRadius: 8, 
    paddingHorizontal: isWeb ? 14 : 12,
  },
  currencySymbol: { color: '#4b6cf7', fontSize: 16, fontWeight: 'bold', marginRight: 6 },
  priceInput: { 
    flex: 1, 
    paddingVertical: isWeb ? 14 : 12, 
    color: '#ffffff', 
    fontSize: isWeb ? 15 : 14,
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...(isWeb && {
      outlineStyle: 'none',
      cursor: 'text'
    })
  },

  // ── Buttons ──
  buttonContainer: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 4,
    ...(isWeb && {
      marginTop: 20
    })
  },
  resetButton: {
    flex: 1, 
    padding: isWeb ? 16 : 14, 
    borderRadius: 10, 
    alignItems: 'center',
    backgroundColor: '#1c2140', 
    borderWidth: 1, 
    borderColor: '#2a3060',
    ...(isWeb && {
      cursor: 'pointer',
      transitionDuration: '200ms',
      userSelect: 'none'
    })
  },
  resetButtonText: { color: '#8b92b4', fontWeight: '600', fontSize: isWeb ? 15 : 14 },
  submitButton: { 
    flex: 2, 
    padding: isWeb ? 16 : 14, 
    borderRadius: 10, 
    alignItems: 'center', 
    backgroundColor: '#4b6cf7',
    ...(isWeb && {
      cursor: 'pointer',
      transitionDuration: '200ms',
      userSelect: 'none'
    })
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: isWeb ? 15 : 14 },

  // ── Add Dept Card ──
  addDeptCard: {
    backgroundColor: 'rgba(75, 108, 247, 0.1)', 
    borderWidth: 2, 
    borderColor: '#4b6cf7',
    borderRadius: 14, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    ...(isWeb && {
      cursor: 'pointer',
      transition: 'all 200ms ease',
      backgroundColor: 'rgba(75, 108, 247, 0.08)'
    })
  },
  addDeptIcon: { fontSize: 32, marginRight: 12 },
  addDeptContent: { flex: 1 },
  addDeptTitle: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  addDeptSubtitle: { color: '#8b92b4', fontSize: 12, marginTop: 2 },
  deptArrow: { fontSize: 20, color: '#4b6cf7', fontWeight: 'bold' },
  deptSubtitle: { color: '#8b92b4', fontSize: 12, marginTop: 2 },

  // ── Departments List ──
  departmentsList: { marginTop: 20 },
  deptListCard: {
    backgroundColor: '#13172a', 
    borderRadius: 12, 
    borderWidth: 1,
    borderColor: '#1c2140', 
    padding: 16, 
    marginBottom: 12,
    ...(isWeb && {
      transition: 'all 200ms ease',
      borderColor: '#1c2140'
    })
  },
  deptListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deptListName: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  deptListAdmin: { color: '#8b92b4', fontSize: 12, marginTop: 4 },
  deptListEmail: { color: '#8b92b4', fontSize: 11, marginTop: 2 },
  deptDeleteBtn: { 
    padding: 8,
    ...(isWeb && {
      cursor: 'pointer',
      borderRadius: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      transition: 'all 200ms ease'
    })
  },
  deptDeleteIcon: { fontSize: 18 },

  // ── Empty Depts State ──
  emptyDeptsState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyDeptsIcon: { fontSize: 60, marginBottom: 12 },
  emptyDeptsText: { color: '#ffffff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  emptyDeptsSubtext: { color: '#8b92b4', fontSize: 13 },

  // ── Modal ──
  modalOverlay: {
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingHorizontal: 20,
    ...(isWeb && { paddingVertical: 40 })
  },
  modalContent: {
    backgroundColor: '#13172a', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#1c2140',
    width: isWeb ? '100%' : '100%',
    maxHeight: isWeb ? '85vh' : '90%', 
    maxWidth: isWeb ? 700 : 600,
    ...(isWeb && { minWidth: 400 })
  },
  modalHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1c2140',
    ...(isWeb && { 
      cursor: 'default',
      userSelect: 'none'
    })
  },
  modalTitle: { 
    color: '#ffffff', 
    fontSize: isWeb ? 20 : 18, 
    fontWeight: 'bold' 
  },
  modalClose: { 
    padding: 8,
    ...(isWeb && { 
      cursor: 'pointer',
      borderRadius: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      marginRight: -8
    })
  },
  modalCloseIcon: { 
    fontSize: 20, 
    color: '#8b92b4', 
    fontWeight: 'bold' 
  },
  modalScroll: { 
    padding: 20, 
    maxHeight: isWeb ? 'calc(85vh - 160px)' : '70%',
    ...(isWeb && {
      overflowY: 'auto'
    })
  },
  modalButtonContainer: {
    flexDirection: 'row', 
    gap: 12, 
    padding: 20, 
    borderTopWidth: 1, 
    borderTopColor: '#1c2140',
    ...(isWeb && {
      backgroundColor: '#0f1119',
    })
  },
});

export default AddInstitute;