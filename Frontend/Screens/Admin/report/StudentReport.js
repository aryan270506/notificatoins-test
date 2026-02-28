import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const INITIAL_SUBJECTS = [
  { name: 'DBMS', total: 40, attended: 27 },
  { name: 'Operating Systems', total: 45, attended: 40 },
  { name: 'Data Structures', total: 50, attended: 50 },
  { name: 'AI/ML Basics', total: 40, attended: 26 },
  { name: 'Computer Networks', total: 45, attended: 39 },
  { name: 'Software Engineering', total: 50, attended: 50 },
];

function getColor(percent) {
  if (percent >= 75) return '#4CAF50';
  if (percent >= 60) return '#FFA726';
  return '#EF5350';
}

export default function StudentReport({ onBack }) {
  const [subjects, setSubjects] = useState(INITIAL_SUBJECTS);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editAttended, setEditAttended] = useState('');
  const [inputError, setInputError] = useState('');

  // Computed stats
  const totalClasses  = subjects.reduce((s, sub) => s + sub.total, 0);
  const totalAttended = subjects.reduce((s, sub) => s + sub.attended, 0);
  const overall       = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  const overallColor  = getColor(overall);

  const good = subjects.filter(s => Math.round((s.attended / s.total) * 100) >= 75).length;
  const avg  = subjects.filter(s => { const p = Math.round((s.attended / s.total) * 100); return p >= 60 && p < 75; }).length;
  const low  = subjects.filter(s => Math.round((s.attended / s.total) * 100) < 60).length;

  const openEdit = (index) => {
    setEditingIndex(index);
    setEditAttended(String(subjects[index].attended));
    setInputError('');
  };

  const saveEdit = () => {
    const val   = parseInt(editAttended);
    const total = subjects[editingIndex].total;

    if (isNaN(val) || val < 0) {
      setInputError('Please enter a valid number.');
      return;
    }
    if (val > total) {
      setInputError(`Cannot exceed total classes (${total}).`);
      return;
    }

    const updated = [...subjects];
    updated[editingIndex] = { ...updated[editingIndex], attended: val };
    setSubjects(updated);
    setEditingIndex(null);
  };

  const editingSubject = editingIndex !== null ? subjects[editingIndex] : null;
  const previewPercent =
    editingSubject && editAttended !== ''
      ? Math.round((Math.min(parseInt(editAttended) || 0, editingSubject.total) / editingSubject.total) * 100)
      : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Student Profile</Text>
          <Text style={styles.subtitle}>2nd Year · Division B</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn}>
          <Text style={styles.saveText}>💾 Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>Aarav Shah</Text>
            <Text style={styles.roll}>Roll No: 2B001</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Good Standing</Text>
            </View>
          </View>
          <View style={[styles.overallCircle, { borderColor: overallColor }]}>
            <Text style={[styles.overallPercent, { color: overallColor }]}>{overall}%</Text>
            <Text style={styles.overallLabel}>Overall</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatBox number={String(good)}        label="Good Subjects"  color="#4CAF50" />
          <StatBox number={String(avg)}          label="Avg Subjects"   color="#FFA726" />
          <StatBox number={String(low)}          label="Low Subjects"   color="#EF5350" />
          <StatBox number={String(totalClasses)} label="Total Classes"  color="#90CAF9" />
        </View>

        {/* Subject Table */}
        <View style={styles.tableCard}>
          <Text style={styles.sectionTitle}>Subject-wise Attendance</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.subjectName, styles.headerText]}>Subject</Text>
            <Text style={[styles.cell, styles.headerText]}>Total</Text>
            <Text style={[styles.cell, styles.headerText]}>Done</Text>
            <Text style={[styles.cell, styles.headerText]}>%</Text>
            <View style={{ width: 34 }} />
          </View>

          {subjects.map((sub, index) => {
            const percent = Math.round((sub.attended / sub.total) * 100);
            const color   = getColor(percent);
            return (
              <View key={index} style={styles.row}>
                <Text style={styles.subjectName}>{sub.name}</Text>
                <Text style={styles.cell}>{sub.total}</Text>
                <Text style={[styles.cell, { color }]}>{sub.attended}</Text>
                <Text style={[styles.cell, { color }]}>{percent}%</Text>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(index)}>
                  <Ionicons name="pencil" size={14} color="#4F7CF7" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveAttendanceBtn}>
          <Text style={styles.saveAttendanceText}>💾 Save Attendance</Text>
        </TouchableOpacity>
      </View>

      {/* ── Edit Modal ── */}
      <Modal visible={editingIndex !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="pencil" size={18} color="#4F7CF7" />
              </View>
              <Text style={styles.modalTitle}>Edit Attendance</Text>
            </View>

            {editingSubject && (
              <>
                <Text style={styles.modalSubjectName}>{editingSubject.name}</Text>

                {/* Info chips */}
                <View style={styles.infoRow}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Total Classes</Text>
                    <Text style={styles.infoValue}>{editingSubject.total}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>Current</Text>
                    <Text style={[styles.infoValue, { color: getColor(Math.round((editingSubject.attended / editingSubject.total) * 100)) }]}>
                      {editingSubject.attended}
                    </Text>
                  </View>
                  {previewPercent !== null && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>New %</Text>
                      <Text style={[styles.infoValue, { color: getColor(previewPercent) }]}>
                        {previewPercent}%
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.inputLabel}>Attended Classes</Text>
                <TextInput
                  style={[styles.input, inputError ? styles.inputBorderError : null]}
                  keyboardType="number-pad"
                  value={editAttended}
                  onChangeText={(v) => { setEditAttended(v); setInputError(''); }}
                  placeholder={`0 – ${editingSubject.total}`}
                  placeholderTextColor="#4A6A8A"
                  autoFocus
                />
                {!!inputError && <Text style={styles.errorText}>{inputError}</Text>}

                <View style={styles.modalBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingIndex(null)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={saveEdit}>
                    <Text style={styles.confirmText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatBox({ number, label, color }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statNumber, { color }]}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1C2D' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn:  { backgroundColor: '#142B44', padding: 10, borderRadius: 8 },
  title:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#7FA3C8', fontSize: 12 },
  saveBtn:  { backgroundColor: '#4F7CF7', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  saveText: { color: '#fff', fontWeight: '600' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#132C46', margin: 16, padding: 16, borderRadius: 16,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1F3E5B', alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  avatarText:   { color: '#4CAF50', fontSize: 24, fontWeight: '800' },
  studentName:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  roll:         { color: '#7FA3C8', fontSize: 12, marginVertical: 4 },
  badge:        { backgroundColor: '#1B5E20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText:    { color: '#4CAF50', fontSize: 11, fontWeight: '600' },
  overallCircle:{ width: 80, height: 80, borderRadius: 40, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  overallPercent:{ fontSize: 18, fontWeight: '800' },
  overallLabel: { color: '#7FA3C8', fontSize: 10 },

  statsRow:   { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 },
  statBox:    { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '800' },
  statLabel:  { color: '#7FA3C8', fontSize: 11 },

  tableCard:    { backgroundColor: '#132C46', margin: 16, padding: 16, borderRadius: 16 },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 12 },

  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: '#1E3C5A', marginBottom: 2,
  },
  headerText: { color: '#7FA3C8', fontSize: 12, fontWeight: '600' },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E3C5A',
  },
  subjectName: { color: '#fff', flex: 1, fontSize: 13 },
  cell:        { width: 45, textAlign: 'center', color: '#7FA3C8', fontSize: 13 },

  editBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#0D2137',
    borderWidth: 1, borderColor: '#1E3C5A',
    alignItems: 'center', justifyContent: 'center',
  },

  bottomBar:         { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#0B1C2D' },
  saveAttendanceBtn: { backgroundColor: '#4F7CF7', padding: 16, borderRadius: 14, alignItems: 'center' },
  saveAttendanceText:{ color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard:    { backgroundColor: '#132C46', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },

  modalHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  modalIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#0D2137', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  modalTitle:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalSubjectName: { color: '#7FA3C8', fontSize: 13, marginBottom: 16, marginLeft: 42 },

  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  infoBox: { flex: 1, backgroundColor: '#0D2137', borderRadius: 10, padding: 12, alignItems: 'center' },
  infoLabel:{ color: '#7FA3C8', fontSize: 11, marginBottom: 4 },
  infoValue:{ color: '#fff', fontSize: 18, fontWeight: '800' },

  inputLabel:      { color: '#7FA3C8', fontSize: 13, marginBottom: 8 },
  input:           { backgroundColor: '#0D2137', borderWidth: 1, borderColor: '#1E3C5A', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, marginBottom: 6 },
  inputBorderError:{ borderColor: '#EF5350' },
  errorText:       { color: '#EF5350', fontSize: 12, marginBottom: 8 },

  modalBtns:  { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn:  { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#0D2137', borderWidth: 1, borderColor: '#1E3C5A', alignItems: 'center' },
  cancelText: { color: '#7FA3C8', fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#4F7CF7', alignItems: 'center' },
  confirmText:{ color: '#fff', fontWeight: '700' },
});