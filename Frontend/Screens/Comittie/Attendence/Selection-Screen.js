import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import StudentListScreen from './Studentlistscreen';
import StudentDetailScreen from './Studentdetailscreen';

const C = {
  bg: '#0d1b3e',
  card: '#152250',
  cardAlt: '#1a2a5e',
  accent: '#4f7cff',
  accentLight: '#7b9fff',
  green: '#2ecc71',
  yellow: '#f0a500',
  purple: '#8b6fff',
  text: '#ffffff',
  textMuted: '#8899cc',
  border: '#1e3070',
};

const YEARS = [
  { label: '1st Year', value: 1, icon: '🎓', color: '#4466cc' },
  { label: '2nd Year', value: 2, icon: '📘', color: '#4f7cff' },
  { label: '3rd Year', value: 3, icon: '📗', color: '#8b6fff' },
  { label: '4th Year', value: 4, icon: '🏅', color: '#2ecc71' },
];

const DIVISIONS = [
  { label: 'Division A', value: 'A', color: '#4f7cff' },
  { label: 'Division B', value: 'B', color: '#8b6fff' },
  { label: 'Division C', value: 'C', color: '#2ecc71' },
];

export default function SelectionScreen({ onBack }) {
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedDiv, setSelectedDiv] = useState(null);

  // Screen stack: 'select' → 'studentList' → 'studentDetail'
  const [screen, setScreen] = useState('select');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const canProceed = selectedYear !== null && selectedDiv !== null;
  const selYear = YEARS.find(y => y.value === selectedYear);
  const selDiv = DIVISIONS.find(d => d.value === selectedDiv);

  // ── StudentDetail Screen ──
  if (screen === 'studentDetail' && selectedStudent) {
    return (
      <StudentDetailScreen
        student={selectedStudent}
        year={selYear}
        division={selDiv}
        onBack={() => setScreen('studentList')}
      />
    );
  }

  // ── StudentList Screen ──
  if (screen === 'studentList') {
    return (
      <StudentListScreen
        year={selYear}
        division={selDiv}
        onBack={() => setScreen('select')}
        onSelectStudent={(student) => {
          setSelectedStudent(student);
          setScreen('studentDetail');
        }}
      />
    );
  }

  // ── Selection Screen ──
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.screenTitle}>Edit Attendance</Text>
          <Text style={styles.screenSub}>Select year & division to continue</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          <View style={styles.stepDone}><Text style={styles.stepNumDone}>1</Text></View>
          <View style={[styles.stepLine, canProceed && styles.stepLineDone]} />
          <View style={[canProceed ? styles.stepDone : styles.stepInactive]}>
            <Text style={canProceed ? styles.stepNumDone : styles.stepNumInactive}>2</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}><Text style={styles.stepNumInactive}>3</Text></View>
        </View>
        <View style={styles.stepLabels}>
          <Text style={[styles.stepLabelText, styles.stepLabelActive]}>Select</Text>
          <Text style={[styles.stepLabelText, canProceed && styles.stepLabelActive]}>Students</Text>
          <Text style={styles.stepLabelText}>Edit</Text>
        </View>

        {/* Year Selection */}
        <Text style={styles.sectionLabel}>SELECT YEAR</Text>
        <View style={styles.yearGrid}>
          {YEARS.map(y => {
            const active = selectedYear === y.value;
            return (
              <TouchableOpacity
                key={y.value}
                style={[styles.yearCard, active && { borderColor: y.color, backgroundColor: y.color + '18' }]}
                onPress={() => setSelectedYear(y.value)}
                activeOpacity={0.75}
              >
                {active && (
                  <View style={[styles.checkBadge, { backgroundColor: y.color }]}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
                <Text style={styles.yearIcon}>{y.icon}</Text>
                <Text style={[styles.yearLabel, active && { color: y.color }]}>{y.label}</Text>
                <View style={[styles.yearPill, { backgroundColor: active ? y.color : C.border }]}>
                  <Text style={[styles.yearPillText, { color: active ? '#fff' : C.textMuted }]}>Year {y.value}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Division Selection */}
        <Text style={styles.sectionLabel}>SELECT DIVISION</Text>
        <View style={styles.divRow}>
          {DIVISIONS.map(d => {
            const active = selectedDiv === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[styles.divCard, active && { borderColor: d.color, backgroundColor: d.color + '18' }]}
                onPress={() => setSelectedDiv(d.value)}
                activeOpacity={0.75}
              >
                {active && (
                  <View style={[styles.checkBadge, { backgroundColor: d.color }]}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
                <View style={[styles.divCircle, { borderColor: active ? d.color : C.border }]}>
                  <Text style={[styles.divLetter, active && { color: d.color }]}>{d.value}</Text>
                </View>
                <Text style={[styles.divLabel, active && { color: d.color }]}>{d.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Summary or Hint */}
        {canProceed ? (
          <View style={styles.summaryCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>YOUR SELECTION</Text>
              <Text style={styles.summaryDetail}>
                <Text style={{ color: selYear?.color, fontWeight: '800' }}>{selYear?.label}</Text>
                {'  ·  '}
                <Text style={{ color: selDiv?.color, fontWeight: '800' }}>Division {selDiv?.value}</Text>
              </Text>
            </View>
            <View style={[styles.summaryBadge, { backgroundColor: selYear?.color + '22', borderColor: selYear?.color }]}>
              <Text style={{ fontSize: 22 }}>{selYear?.icon}</Text>
              <Text style={[styles.summaryBadgeLetter, { color: selDiv?.color }]}>{selDiv?.value}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.hintCard}>
            <Text style={styles.hintText}>
              👆 Select a <Text style={{ color: C.accentLight, fontWeight: '700' }}>Year</Text> and{' '}
              <Text style={{ color: C.accentLight, fontWeight: '700' }}>Division</Text> above to continue
            </Text>
          </View>
        )}

        {/* Proceed Button */}
        <TouchableOpacity
          style={[styles.proceedBtn, !canProceed && styles.proceedBtnDisabled]}
          activeOpacity={canProceed ? 0.8 : 1}
          onPress={() => canProceed && setScreen('studentList')}
        >
          <Text style={[styles.proceedBtnText, !canProceed && styles.proceedBtnTextDisabled]}>
            {canProceed ? '👥   View Student List' : 'Select Year & Division to Continue'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },

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
  screenTitle: { color: C.text, fontSize: 18, fontWeight: '900' },
  screenSub: { color: C.textMuted, fontSize: 11, marginTop: 2 },

  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepDone: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
  },
  stepInactive: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  stepNumDone: { color: C.text, fontSize: 13, fontWeight: '900' },
  stepNumInactive: { color: C.textMuted, fontSize: 13, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, backgroundColor: C.border, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: C.accent },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  stepLabelText: { color: C.textMuted, fontSize: 11, fontWeight: '700', flex: 1 },
  stepLabelActive: { color: C.accentLight },

  sectionLabel: { color: C.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 14 },

  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  yearCard: {
    width: '47.5%', backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 24, paddingHorizontal: 16,
    alignItems: 'center', position: 'relative',
  },
  yearIcon: { fontSize: 32, marginBottom: 10 },
  yearLabel: { color: C.text, fontSize: 15, fontWeight: '900', marginBottom: 10 },
  yearPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  yearPillText: { fontSize: 10, fontWeight: '700' },

  divRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  divCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 24, alignItems: 'center', position: 'relative',
  },
  divCircle: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  divLetter: { color: C.text, fontSize: 28, fontWeight: '900' },
  divLabel: { color: C.textMuted, fontSize: 11, fontWeight: '700' },

  checkBadge: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontSize: 11, fontWeight: '900' },

  summaryCard: {
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.accent + '55',
    padding: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  summaryTitle: { color: C.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  summaryDetail: { fontSize: 15 },
  summaryBadge: {
    width: 58, height: 58, borderRadius: 16,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  summaryBadgeLetter: { fontSize: 13, fontWeight: '900' },

  hintCard: {
    backgroundColor: C.card, borderRadius: 14,
    borderWidth: 1, borderColor: C.border, borderStyle: 'dashed',
    padding: 16, marginBottom: 24, alignItems: 'center',
  },
  hintText: { color: C.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  proceedBtn: {
    backgroundColor: C.accent, borderRadius: 16,
    height: 54, alignItems: 'center', justifyContent: 'center',
  },
  proceedBtnDisabled: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  proceedBtnText: { color: C.text, fontSize: 15, fontWeight: '900' },
  proceedBtnTextDisabled: { color: C.textMuted },
});