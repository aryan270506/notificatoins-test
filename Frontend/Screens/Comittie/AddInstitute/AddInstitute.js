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
  Modal,
  SafeAreaView,
} from 'react-native';
import axiosInstance from '../Src/Axios';

const AddInstitute = ({ visible, onClose, onInstituteAdded }) => {
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
    branch: ''
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
    if (!formData.branch.trim()) {
      Alert.alert('Validation Error', 'Branch is required');
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
        branch: formData.branch
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
                if (onClose && typeof onClose === 'function') {
                  onClose();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to create institute');
      }
    } catch (error) {
      console.error('Error creating institute:', error);
      let errorMessage = 'Failed to create institute. Please try again.';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.message || error.response.data?.error || errorMessage;
      } else if (error.request) {
        // Request was made but no response
        errorMessage = 'Network error. Please check your connection.';
      } else {
        // Something else happened
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
      branch: ''
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (onClose) onClose();
      }}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Institute</Text>
            <TouchableOpacity 
              onPress={() => {
                if (onClose) onClose();
              }} 
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Institute Information Section */}
            <Text style={styles.sectionTitle}>Institute Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institute Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.instituteName}
                onChangeText={(text) => handleChange('instituteName', text)}
                placeholder="Enter institute name"
                placeholderTextColor="#666"
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
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institute Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.institutePhone}
                onChangeText={(text) => handleChange('institutePhone', text)}
                placeholder="Enter institute phone number"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Institute Email</Text>
              <TextInput
                style={styles.input}
                value={formData.instituteEmail}
                onChangeText={(text) => handleChange('instituteEmail', text)}
                placeholder="Enter institute email"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Branch *</Text>
              <TextInput
                style={styles.input}
                value={formData.branch}
                onChangeText={(text) => handleChange('branch', text)}
                placeholder="Enter branch (e.g., Computer Science, Engineering)"
                placeholderTextColor="#666"
              />
            </View>

            {/* Admin Account Information */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Admin Account Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Admin ID *</Text>
              <TextInput
                style={styles.input}
                value={formData.adminId}
                onChangeText={(text) => handleChange('adminId', text)}
                placeholder="Enter admin ID"
                placeholderTextColor="#666"
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
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={formData.adminPassword}
                onChangeText={(text) => handleChange('adminPassword', text)}
                placeholder="Enter password (min. 6 characters)"
                placeholderTextColor="#666"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                placeholder="Confirm password"
                placeholderTextColor="#666"
                secureTextEntry
              />
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  if (onClose) onClose();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
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
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#13172a',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#1c2140',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1c2140',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1c2140',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#4b6cf7',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: '#8b92b4',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 5,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#1c2140',
  },
  cancelButtonText: {
    color: '#8b92b4',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#4b6cf7',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default AddInstitute;