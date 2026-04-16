import React, { useState } from 'react';
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
} from 'react-native';
import axiosInstance from '../../../Src/Axios';

const AddInstitute = ({ onInstituteAdded }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        instituteName: formData.instituteName,
        instituteAddress: formData.instituteAddress,
        institutePhone: formData.institutePhone,
        instituteEmail: formData.instituteEmail,
        adminId: formData.adminId,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        pricePerMonth: Number(formData.pricePerMonth),
      };

      const response = await axiosInstance.post('/admins/add-institute', payload);

      if (response.data && response.data.success) {
        Alert.alert(
          'Success',
          `Institute "${formData.instituteName}" created successfully!\n\nAdmin ID: ${formData.adminId}\nEmail: ${formData.adminEmail}`,
          [
            {
              text: 'OK',
              onPress: () => {
                resetForm();
                if (onInstituteAdded && typeof onInstituteAdded === 'function') {
                  onInstituteAdded(response.data.data);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to create institute');
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

  const resetForm = () => {
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Text style={styles.pageHeaderIcon}>🏫</Text>
            <View>
              <Text style={styles.pageTitle}>Add New Institute</Text>
              <Text style={styles.pageSubtitle}>Fill in the details to register a new institute</Text>
            </View>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Institute Information ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Institute Information</Text>

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
              onPress={resetForm}
              disabled={loading}
            >
              <Text style={styles.resetButtonText}>Reset Form</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Create Institute</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0d1a',
  },

  // ── Page Header ──
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2140',
    backgroundColor: '#13172a',
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageHeaderIcon: {
    fontSize: 28,
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pageSubtitle: {
    color: '#8b92b4',
    fontSize: 12,
    marginTop: 2,
  },

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

  // ── Inputs ──
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#8b92b4',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: '#0b0d1a',
    borderWidth: 1,
    borderColor: '#1c2140',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
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