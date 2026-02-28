import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';

const C = {
  bg: '#0d1b3e',
  card: '#152250',
  cardAlt: '#1a2a5e',
  accent: '#4f7cff',
  accentLight: '#7b9fff',
  green: '#2ecc71',
  greenBg: '#0d3320',
  yellow: '#f0a500',
  yellowBg: '#332200',
  red: '#e74c3c',
  redBg: '#330e0e',
  text: '#ffffff',
  textMuted: '#8899cc',
  border: '#1e3070',
};

function attColor(pct) {
  if (pct >= 75) return C.green;
  if (pct >= 50) return C.yellow;
  return C.red;
}
function attBg(pct) {
  if (pct >= 75) return C.greenBg;
  if (pct >= 50) return C.yellowBg;
  return C.redBg;
}
function attLabel(pct) {
  if (pct >= 75) return 'Good Standing';
  if (pct >= 50) return 'Needs Improvement';
  return 'Critical — Below 50%';
}

// Large donut chart
function BigDonut({ percent, size = 140 }) {
  const color = attColor(percent);
  const stroke = 14;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: C.cardAlt }} />
      {/* Fill */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: color,
        borderTopColor: percent < 25 ? C.cardAlt : color,
        borderRightColor: percent < 50 ? C.cardAlt : color,
        borderBottomColor: percent < 75 ? C.cardAlt : color,
        transform: [{ rotate: '-45deg' }],
      }} />
      <View style={{ alignItems: 'center' }}>
        <Text style={{ color, fontSize: 28, fontWeight: '900' }}>{percent}%</Text>
        <Text style={{ color: C.textMuted, fontSize: 10, fontWeight: '700' }}>Overall</Text>
      </View>
    </View>
  );
}

// Subject donut (small)
function SubjectDonut({ percent, size = 36 }) {
  const color = attColor(percent);
  const stroke = 4;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: C.cardAlt }} />
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: color,
        borderTopColor: percent < 25 ? C.cardAlt : color,
        borderRightColor: percent < 50 ? C.cardAlt : color,
        borderBottomColor: percent < 75 ? C.cardAlt : color,
        transform: [{ rotate: '-45deg' }],
      }} />
      <Text style={{ color, fontSize: 7, fontWeight: '900' }}>{percent}%</Text>
    </View>
  );
}

// Generate subject data for a student
function generateSubjects(studentId) {
  const subjectList = [
    { name: 'DBMS', icon: '🗃️', iconBg: '#ff6b35' },
    { name: 'Operating Systems', icon: '🖥️', iconBg: '#4f7cff' },
    { name: 'Data Structures', icon: '⚙️', iconBg: '#8b6fff' },
    { name: 'AI/ML Basics', icon: '🤖', iconBg: '#e74c3c' },
    { name: 'Computer Networks', icon: '🌐', iconBg: '#2ecc71' },
    { name: 'Software Engineering', icon: '📐', iconBg: '#f0a500' },
  ];
  // Use studentId as seed for reproducible "random" data
  return subjectList.map((sub, i) => {
    const seed = (studentId * 7 + i * 13) % 40;
    const total = 40 + (i % 3) * 5; // 40–50 total classes
    const attended = Math.min(total, 20 + seed);
    const pct = Math.round((attended / total) * 100);
    return { ...sub, total, attended, pct, id: i };
  });
}

export default function StudentDetailScreen({ student, year, division, onBack }) {
  const [subjects, setSubjects] = useState(() => generateSubjects(student?.id || 1));
  const [editingSubject, setEditingSubject] = useState(null); // subject being edited
  const [editValue, setEditValue] = useState('');
  const [saved, setSaved] = useState(false);

  const overallPct = Math.round(
    subjects.reduce((sum, s) => sum + s.pct, 0) / subjects.length
  );
  const color = attColor(overallPct);

  // Update attended classes directly
  const updateAttended = (subjectId, newAttended) => {
    if (isNaN(newAttended) || newAttended < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number');
      return;
    }

    setSubjects(prev => prev.map(s => {
      if (s.id !== subjectId) return s;
      
      const attendedNum = Math.min(newAttended, s.total); // Can't exceed total classes
      const newPct = Math.round((attendedNum / s.total) * 100);
      
      return { ...s, attended: attendedNum, pct: newPct };
    }));
    setEditingSubject(null);
    setEditValue('');
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const startEditing = (subject) => {
    setEditingSubject(subject.id);
    setEditValue(subject.attended.toString());
  };

  return (
    <SafeAreaView style={st.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Top Bar */}
      <View style={st.topBar}>
        <TouchableOpacity onPress={onBack} style={st.backBtn}>
          <Text style={st.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={st.title}>Student Profile</Text>
          <Text style={st.subtitle}>{year?.label}  ·  Division {division?.value}</Text>
        </View>
        <TouchableOpacity style={[st.saveBtn, saved && st.saveBtnDone]} onPress={handleSave}>
          <Text style={st.saveBtnText}>{saved ? '✓ Saved' : '💾 Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Student Header Card */}
        <View style={st.headerCard}>
          <View style={[st.avatarLg, { borderColor: color }]}>
            <Text style={st.avatarText}>{student?.avatar}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={st.studentName}>{student?.name}</Text>
            <Text style={st.rollNo}>Roll No: {student?.rollNo}</Text>
            <View style={[st.statusBadge, { backgroundColor: attBg(overallPct), borderColor: color }]}>
              <Text style={[st.statusText, { color }]}>{attLabel(overallPct)}</Text>
            </View>
          </View>
          <BigDonut percent={overallPct} size={100} />
        </View>

        {/* Stats Row */}
        <View style={st.statsRow}>
          <View style={st.statBox}>
            <Text style={[st.statNum, { color: C.green }]}>
              {subjects.filter(s => s.pct >= 75).length}
            </Text>
            <Text style={st.statLabel}>Good{'\n'}Subjects</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statBox}>
            <Text style={[st.statNum, { color: C.yellow }]}>
              {subjects.filter(s => s.pct >= 50 && s.pct < 75).length}
            </Text>
            <Text style={st.statLabel}>Average{'\n'}Subjects</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statBox}>
            <Text style={[st.statNum, { color: C.red }]}>
              {subjects.filter(s => s.pct < 50).length}
            </Text>
            <Text style={st.statLabel}>Low{'\n'}Subjects</Text>
          </View>
          <View style={st.statDivider} />
          <View style={st.statBox}>
            <Text style={[st.statNum, { color: C.accentLight }]}>
              {subjects.reduce((sum, s) => sum + s.total, 0)}
            </Text>
            <Text style={st.statLabel}>Total{'\n'}Classes</Text>
          </View>
        </View>

        {/* Color Legend */}
        <View style={st.legend}>
          <View style={st.legendItem}>
            <View style={[st.legendDot, { backgroundColor: C.green }]} />
            <Text style={st.legendText}>≥75% Good</Text>
          </View>
          <View style={st.legendItem}>
            <View style={[st.legendDot, { backgroundColor: C.yellow }]} />
            <Text style={st.legendText}>50–74% Average</Text>
          </View>
          <View style={st.legendItem}>
            <View style={[st.legendDot, { backgroundColor: C.red }]} />
            <Text style={st.legendText}>&lt;50% Low</Text>
          </View>
        </View>

        {/* Subject Table */}
        <View style={st.tableCard}>
          <Text style={st.sectionTitle}>Subject-wise Attendance</Text>

          {/* Table Header */}
          <View style={st.tableHeader}>
            <Text style={[st.thCell, { flex: 2.5 }]}>SUBJECT</Text>
            <Text style={st.thCell}>TOTAL</Text>
            <Text style={st.thCell}>ATTENDED</Text>
            <Text style={st.thCell}>%</Text>
            <Text style={st.thCell}>EDIT</Text>
          </View>

          {/* Table Rows */}
          {subjects.map((sub) => {
            const sc = attColor(sub.pct);
            const isEditing = editingSubject === sub.id;
            
            return (
              <View key={sub.id}>
                <View style={st.tableRow}>
                  {/* Subject */}
                  <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[st.subIcon, { backgroundColor: sub.iconBg }]}>
                      <Text style={{ fontSize: 12 }}>{sub.icon}</Text>
                    </View>
                    <Text style={st.subName} numberOfLines={2}>{sub.name}</Text>
                  </View>
                  
                  {/* Total */}
                  <Text style={st.tdCell}>{sub.total}</Text>
                  
                  {/* Attended - Editable field */}
                  {isEditing ? (
                    <TextInput
                      style={[st.tdCell, st.editInput, { color: sc }]}
                      value={editValue}
                      onChangeText={setEditValue}
                      keyboardType="numeric"
                      autoFocus
                      selectTextOnFocus
                      onSubmitEditing={() => updateAttended(sub.id, parseInt(editValue) || 0)}
                    />
                  ) : (
                    <TouchableOpacity 
                      style={{ flex: 1, alignItems: 'center' }}
                      onPress={() => startEditing(sub)}
                    >
                      <Text style={[st.tdCell, { color: sc }]}>{sub.attended}</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* % with donut */}
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <SubjectDonut percent={sub.pct} size={34} />
                  </View>
                  
                  {/* Edit/Save button */}
                  <TouchableOpacity
                    style={[st.editBtn, isEditing && st.saveEditBtn]}
                    onPress={() => {
                      if (isEditing) {
                        updateAttended(sub.id, parseInt(editValue) || 0);
                      } else {
                        startEditing(sub);
                      }
                    }}
                  >
                    <Text style={st.editBtnText}>
                      {isEditing ? '✓' : '✎'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick note for editing */}
                {isEditing && (
                  <View style={st.editNote}>
                    <Text style={st.editNoteText}>
                      Tap ✓ to save or ✕ to cancel
                    </Text>
                    <TouchableOpacity onPress={() => {
                      setEditingSubject(null);
                      setEditValue('');
                    }}>
                      <Text style={st.cancelBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[st.saveBigBtn, saved && st.saveBigBtnDone]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={st.saveBigBtnText}>{saved ? '✓  Changes Saved!' : '💾  Save Attendance'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  backArrow: { color: C.text, fontSize: 20, fontWeight: '700' },
  title: { color: C.text, fontSize: 17, fontWeight: '900' },
  subtitle: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  saveBtn: {
    backgroundColor: C.accent, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  saveBtnDone: { backgroundColor: '#1a5e2a' },
  saveBtnText: { color: C.text, fontSize: 12, fontWeight: '800' },

  // Header card
  headerCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, padding: 18,
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
  },
  avatarLg: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  avatarText: { color: C.text, fontSize: 22, fontWeight: '900' },
  studentName: { color: C.text, fontSize: 16, fontWeight: '900' },
  rollNo: { color: C.textMuted, fontSize: 11, marginTop: 3 },
  statusBadge: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: '800' },

  // Stats row
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 14,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: C.textMuted, fontSize: 9, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: C.border },

  // Legend
  legend: {
    flexDirection: 'row', justifyContent: 'center', gap: 20,
    marginBottom: 16, paddingHorizontal: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: C.textMuted, fontSize: 11, fontWeight: '600' },

  // Table
  tableCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 16,
  },
  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '900', marginBottom: 14 },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  thCell: { flex: 1, color: C.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tdCell: { flex: 1, color: C.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  subIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  subName: { color: C.text, fontSize: 11, fontWeight: '700', flex: 1 },
  markBtn: {
    flex: 1, height: 28, borderRadius: 8,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.accent,
  },
  markBtnText: { color: C.accent, fontSize: 16, fontWeight: '900' },

  // Mark Panel
  markPanel: {
    backgroundColor: C.cardAlt, borderRadius: 12,
    padding: 14, marginBottom: 4,
    borderWidth: 1, borderColor: C.accent + '55',
  },
  markPanelTitle: { color: C.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 10 },
  markBtnRow: { flexDirection: 'row', gap: 10 },
  presentBtn: {
    flex: 1, height: 42, borderRadius: 10,
    backgroundColor: C.greenBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.green,
  },
  presentBtnText: { color: C.green, fontSize: 14, fontWeight: '800' },
  absentBtn: {
    flex: 1, height: 42, borderRadius: 10,
    backgroundColor: C.redBg, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: C.red,
  },
  absentBtnText: { color: C.red, fontSize: 14, fontWeight: '800' },

  // Save big button
  saveBigBtn: {
    marginHorizontal: 16, height: 54, borderRadius: 16,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },
  saveBigBtnDone: { backgroundColor: '#1a5e2a' },
  saveBigBtnText: { color: C.text, fontSize: 15, fontWeight: '900' },
});