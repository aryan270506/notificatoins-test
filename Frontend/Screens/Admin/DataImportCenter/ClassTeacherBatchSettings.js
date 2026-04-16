import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../../Teachers/TeacherStack';
import axiosInstance from '../../../Src/Axios';

// ──────────────────────────────────────────────────────────────
// THEMES
// ──────────────────────────────────────────────────────────────
const DARK = {
  bg: '#07090F',
  surface: '#0D1120',
  surfaceEl: '#111827',
  card: '#0F1523',
  border: '#1A2035',
  accent: '#3B82F6',
  accentSoft: 'rgba(59,130,246,0.14)',
  green: '#10B981',
  greenSoft: 'rgba(16,185,129,0.14)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.14)',
  textPrimary: '#EEF2FF',
  textSec: '#8B96BE',
  textMuted: '#3D4A6A',
};

const LIGHT = {
  bg: '#F0F4FF',
  surface: '#FFFFFF',
  surfaceEl: '#E8EEFB',
  card: '#FFFFFF',
  border: '#DDE3F4',
  accent: '#3B82F6',
  accentSoft: 'rgba(59,130,246,0.09)',
  green: '#059669',
  greenSoft: 'rgba(5,150,105,0.10)',
  red: '#DC2626',
  redSoft: 'rgba(220,38,38,0.10)',
  textPrimary: '#0F172A',
  textSec: '#4B5563',
  textMuted: '#9CA3AF',
};

// ──────────────────────────────────────────────────────────────
// COMPONENT
// ──────────────────────────────────────────────────────────────
export default function ClassTeacherBatchSettings({ teacherId, classInfo }) {
  const { isDark } = useContext(ThemeContext);
  const colors = isDark ? DARK : LIGHT;

  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Batch Modal States
  const [createBatchModalVisible, setCreateBatchModalVisible] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Edit Batch Modal States
  const [editBatchModalVisible, setEditBatchModalVisible] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [editBatchName, setEditBatchName] = useState('');
  const [editingStudents, setEditingStudents] = useState([]);

  // ──────────────────────────────────────────────────────────────
  // FETCH BATCHES AND STUDENTS
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBatchesAndStudents();
  }, []);

  const fetchBatchesAndStudents = async () => {
    try {
      setLoading(true);

      // Fetch batches
      const batchRes = await axiosInstance.get(`/api/teachers/${teacherId}/batches`);
      setBatches(batchRes.data.data || []);

      // Fetch students for this class
      const studentRes = await axiosInstance.get(`/api/teachers/${teacherId}/students-for-class`);
      setStudents(studentRes.data.data || []);
    } catch (error) {
      console.error('Error fetching batches/students:', error.message);
      Alert.alert('Error', 'Failed to load batches and students');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // CREATE BATCH
  // ──────────────────────────────────────────────────────────────
  const handleCreateBatch = async () => {
    if (!batchName.trim()) {
      Alert.alert('Validation', 'Please enter a batch name');
      return;
    }

    if (selectedStudents.length === 0) {
      Alert.alert('Validation', 'Please select at least one student');
      return;
    }

    try {
      setCreatingBatch(true);

      await axiosInstance.post(`/api/teachers/${teacherId}/create-batch`, {
        batchName: batchName.trim(),
        studentIds: selectedStudents,
      });

      Alert.alert('Success', 'Batch created successfully');
      setCreateBatchModalVisible(false);
      setBatchName('');
      setSelectedStudents([]);
      fetchBatchesAndStudents();
    } catch (error) {
      console.error('Error creating batch:', error.message);
      Alert.alert('Error', 'Failed to create batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // UPDATE BATCH
  // ──────────────────────────────────────────────────────────────
  const handleUpdateBatch = async () => {
    if (!editBatchName.trim()) {
      Alert.alert('Validation', 'Please enter a batch name');
      return;
    }

    try {
      setCreatingBatch(true);

      await axiosInstance.put(`/api/teachers/${teacherId}/batch/${editingBatch._id}`, {
        batchName: editBatchName.trim(),
        studentIds: editingStudents.map((s) => s._id),
      });

      Alert.alert('Success', 'Batch updated successfully');
      setEditBatchModalVisible(false);
      setEditingBatch(null);
      setEditBatchName('');
      setEditingStudents([]);
      fetchBatchesAndStudents();
    } catch (error) {
      console.error('Error updating batch:', error.message);
      Alert.alert('Error', 'Failed to update batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // DELETE BATCH
  // ──────────────────────────────────────────────────────────────
  const handleDeleteBatch = (batchId) => {
    Alert.alert('Delete Batch', 'Are you sure you want to delete this batch?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await axiosInstance.delete(`/api/teachers/${teacherId}/batch/${batchId}`);
            Alert.alert('Success', 'Batch deleted successfully');
            fetchBatchesAndStudents();
          } catch (error) {
            console.error('Error deleting batch:', error.message);
            Alert.alert('Error', 'Failed to delete batch');
          }
        },
      },
    ]);
  };

  // ──────────────────────────────────────────────────────────────
  // TOGGLE STUDENT SELECTION
  // ──────────────────────────────────────────────────────────────
  const toggleStudentSelection = (studentMongoId) => {
    if (selectedStudents.includes(studentMongoId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentMongoId));
    } else {
      setSelectedStudents([...selectedStudents, studentMongoId]);
    }
  };

  const toggleEditStudentSelection = (student) => {
    const isSelected = editingStudents.some((s) => s._id === student._id);
    if (isSelected) {
      setEditingStudents(editingStudents.filter((s) => s._id !== student._id));
    } else {
      setEditingStudents([...editingStudents, student]);
    }
  };

  // ──────────────────────────────────────────────────────────────
  // RENDER BATCH CARD
  // ──────────────────────────────────────────────────────────────
  const renderBatchCard = (batch) => (
    <View key={batch._id} style={[styles.batchCard, { backgroundColor: colors.surfaceEl, borderColor: colors.border }]}>
      <View style={styles.batchHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.batchName, { color: colors.textPrimary }]}>{batch.batchName}</Text>
          <Text style={[styles.batchSubtitle, { color: colors.textMuted }]}>
            {batch.students.length} student{batch.students.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.batchActions}>
          <TouchableOpacity
            onPress={() => {
              setEditingBatch(batch);
              setEditBatchName(batch.batchName);
              setEditingStudents(
                students.filter((s) =>
                  batch.students.some((bs) => bs.studentId === s.id)
                )
              );
              setEditBatchModalVisible(true);
            }}
            style={[styles.actionBtn, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="pencil" size={16} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteBatch(batch._id)}
            style={[styles.actionBtn, { backgroundColor: colors.redSoft }]}>
            <Ionicons name="trash" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.studentsList, { borderTopColor: colors.border }]}>
        {batch.students.slice(0, 3).map((student) => (
          <View key={student.studentId} style={styles.studentItem}>
            <Ionicons name="person-circle" size={24} color={colors.accent} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.studentName, { color: colors.textPrimary }]}>{student.studentName}</Text>
              <Text style={[styles.studentEmail, { color: colors.textMuted }]}>{student.studentEmail}</Text>
            </View>
          </View>
        ))}
        {batch.students.length > 3 && (
          <Text style={[styles.moreStudents, { color: colors.textMuted }]}>
            +{batch.students.length - 3} more student{batch.students.length - 3 !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Batch Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {classInfo.year} - Division {classInfo.division}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setBatchName('');
            setSelectedStudents([]);
            setCreateBatchModalVisible(true);
          }}
          style={[styles.createBtn, { backgroundColor: colors.accent }]}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.createBtnText}>New Batch</Text>
        </TouchableOpacity>
      </View>

      {/* BATCHES LIST */}
      <View style={styles.batchesList}>
        {batches.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.surfaceEl }]}>
            <Ionicons name="layers" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No batches created yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Create your first batch to organize students</Text>
          </View>
        ) : (
          batches.map((batch) => renderBatchCard(batch))
        )}
      </View>

      {/* CREATE BATCH MODAL */}
      <Modal visible={createBatchModalVisible} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Create New Batch</Text>
              <TouchableOpacity onPress={() => setCreateBatchModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* BATCH NAME INPUT */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Batch Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surfaceEl }]}
                placeholder="e.g., A1, A2, etc."
                placeholderTextColor={colors.textMuted}
                value={batchName}
                onChangeText={setBatchName}
              />

              {/* STUDENTS SELECTION */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                Select Students ({selectedStudents.length})
              </Text>
              <View style={[styles.studentSelection, { backgroundColor: colors.surfaceEl, borderColor: colors.border }]}>
                {students.length === 0 ? (
                  <Text style={[styles.noStudentsText, { color: colors.textMuted }]}>No students available for this class</Text>
                ) : (
                  students.map((student) => (
                    <TouchableOpacity
                      key={student._id}
                      onPress={() => toggleStudentSelection(student._id)}
                      style={[
                        styles.studentCheckbox,
                        {
                          backgroundColor: selectedStudents.includes(student._id) ? colors.accentSoft : colors.surfaceEl,
                          borderColor: selectedStudents.includes(student._id) ? colors.accent : colors.border,
                        },
                      ]}>
                      <Ionicons
                        name={selectedStudents.includes(student._id) ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={selectedStudents.includes(student._id) ? colors.accent : colors.textMuted}
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.studentCheckboxName, { color: colors.textPrimary }]}>{student.name}</Text>
                        <Text style={[styles.studentCheckboxId, { color: colors.textMuted }]}>{student.id}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>

            {/* MODAL ACTIONS */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setCreateBatchModalVisible(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateBatch}
                disabled={creatingBatch}
                style={[styles.createBatchBtn, { backgroundColor: colors.accent, opacity: creatingBatch ? 0.6 : 1 }]}>
                {creatingBatch ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.createBatchBtnText}>Create Batch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT BATCH MODAL */}
      <Modal visible={editBatchModalVisible} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Batch</Text>
              <TouchableOpacity onPress={() => setEditBatchModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* BATCH NAME INPUT */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Batch Name</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surfaceEl }]}
                placeholder="e.g., A1, A2, etc."
                placeholderTextColor={colors.textMuted}
                value={editBatchName}
                onChangeText={setEditBatchName}
              />

              {/* STUDENTS SELECTION */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 16 }]}>
                Select Students ({editingStudents.length})
              </Text>
              <View style={[styles.studentSelection, { backgroundColor: colors.surfaceEl, borderColor: colors.border }]}>
                {students.map((student) => (
                  <TouchableOpacity
                    key={student._id}
                    onPress={() => toggleEditStudentSelection(student)}
                    style={[
                      styles.studentCheckbox,
                      {
                        backgroundColor: editingStudents.some((s) => s._id === student._id) ? colors.accentSoft : colors.surfaceEl,
                        borderColor: editingStudents.some((s) => s._id === student._id) ? colors.accent : colors.border,
                      },
                    ]}>
                    <Ionicons
                      name={editingStudents.some((s) => s._id === student._id) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={editingStudents.some((s) => s._id === student._id) ? colors.accent : colors.textMuted}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.studentCheckboxName, { color: colors.textPrimary }]}>{student.name}</Text>
                      <Text style={[styles.studentCheckboxId, { color: colors.textMuted }]}>{student.id}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* MODAL ACTIONS */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setEditBatchModalVisible(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateBatch}
                disabled={creatingBatch}
                style={[styles.createBatchBtn, { backgroundColor: colors.accent, opacity: creatingBatch ? 0.6 : 1 }]}>
                {creatingBatch ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.createBatchBtnText}>Update Batch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ──────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  batchesList: {
    marginBottom: 30,
  },
  batchCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchName: {
    fontSize: 16,
    fontWeight: '700',
  },
  batchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  batchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 11,
    marginTop: 2,
  },
  moreStudents: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  studentSelection: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    maxHeight: 300,
  },
  studentCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  studentCheckboxName: {
    fontSize: 13,
    fontWeight: '600',
  },
  studentCheckboxId: {
    fontSize: 11,
    marginTop: 2,
  },
  noStudentsText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createBatchBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBatchBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
