// Screens/Teachers/StudentAttendanceScreen.js
// Student Attendance — select Year → Division → Roll No → view subject-wise & overall attendance

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

/* ─── Theme ──────────────────────────────────────────────────────────────── */
const C = {
  bg:         '#07090F',
  surface:    '#0E1117',
  card:       '#121820',
  cardEl:     '#181F2B',
  border:     '#1A2235',
  borderGlow: '#252E44',
  accent:     '#6366F1',
  accentSoft: 'rgba(99,102,241,0.14)',
  green:      '#22C55E',
  greenSoft:  'rgba(34,197,94,0.13)',
  yellow:     '#F59E0B',
  yellowSoft: 'rgba(245,158,11,0.13)',
  red:        '#EF4444',
  redSoft:    'rgba(239,68,68,0.13)',
  cyan:       '#06B6D4',
  cyanSoft:   'rgba(6,182,212,0.13)',
  purple:     '#A855F7',
  purpleSoft: 'rgba(168,85,247,0.13)',
  textPri:    '#F0F4FF',
  textSec:    '#7C8BA8',
  textMuted:  '#2E3A52',
  white:      '#FFFFFF',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/* ─── Data ───────────────────────────────────────────────────────────────── */
const YEARS     = ['FY', 'SY', 'TY'];
const DIVISIONS = { FY: ['A', 'B', 'C'], SY: ['A', 'B'], TY: ['A', 'B', 'C', 'D'] };

// Subjects per year
const SUBJECTS_BY_YEAR = {
  FY: ['Engineering Maths', 'Engineering Physics', 'Engineering Chemistry', 'Basic Electronics', 'Programming (C)', 'Engineering Graphics'],
  SY: ['Data Structures', 'Digital Electronics', 'Discrete Maths', 'Object Oriented Programming', 'Computer Organisation', 'Microprocessors'],
  TY: ['Database Systems', 'Computer Networks', 'Operating Systems', 'Theory of Computation', 'Software Engineering', 'Web Technology'],
};

// Generate students per year+division
const generateStudents = (year, div) => {
  const names = [
    ['Ananya Sharma', 'Rohan Mehta', 'Priya Kulkarni', 'Dev Patel', 'Sneha Iyer',
     'Arjun Singh', 'Kavya Nair', 'Mihir Shah', 'Ritika Das', 'Varun Gupta',
     'Pooja Desai', 'Sameer Khan'],
    ['Aditya Verma', 'Nisha Reddy', 'Karan Joshi', 'Divya Pillai', 'Rahul Sharma',
     'Meera Krishnan', 'Vivek Tiwari', 'Anjali Singh', 'Siddharth Roy', 'Tanvi Gupta',
     'Harsh Pandey', 'Deepika More'],
    ['Amit Bhatt', 'Shreya Doshi', 'Nikhil Pawar', 'Riya Nair', 'Manish Kumar',
     'Swati Chavan', 'Gaurav Desai', 'Komal Shah', 'Tejas Jadhav', 'Ayesha Khan',
     'Rajesh Patil', 'Nidhi Iyer'],
    ['Vishal More', 'Ankita Sharma', 'Pratik Jain', 'Shruti Mehta', 'Sahil Yadav',
     'Pallavi Rao', 'Deepak Nair', 'Simran Kaur', 'Akash Dubey', 'Prachi Joshi',
     'Kunal Desai', 'Madhuri Pillai'],
  ];

  const divIndex = DIVISIONS[year].indexOf(div);
  const pool     = names[divIndex % names.length];
  const subjects = SUBJECTS_BY_YEAR[year];
  const seed     = year.charCodeAt(0) + div.charCodeAt(0);

  return pool.map((name, i) => {
    const rollNum = String(i + 1).padStart(3, '0');
    const roll    = `${year}${div}-${rollNum}`;

    // Deterministic pseudo-random attendance per subject
    const subjectAttendance = subjects.map((sub, si) => {
      const base     = ((seed + i * 7 + si * 13) % 30) + 55; // 55–84
      const present  = Math.min(base, 90);
      const total    = 90;
      return { subject: sub, present, total, pct: Math.round((present / total) * 100) };
    });

    const totalPresent = subjectAttendance.reduce((a, s) => a + s.present, 0);
    const totalClasses = subjectAttendance.reduce((a, s) => a + s.total, 0);
    const overallPct   = Math.round((totalPresent / totalClasses) * 100);

    const status = overallPct >= 85 ? 'Excellent'
                 : overallPct >= 75 ? 'Regular'
                 : overallPct >= 60 ? 'At Risk'
                 : 'Critical';

    return { name, roll, rollNum, subjectAttendance, overallPct, status };
  });
};

const STATUS_META = {
  Excellent: { color: C.green,  bg: C.greenSoft,  icon: 'star'          },
  Regular:   { color: C.cyan,   bg: C.cyanSoft,   icon: 'checkmark-circle' },
  'At Risk': { color: C.yellow, bg: C.yellowSoft, icon: 'warning'       },
  Critical:  { color: C.red,    bg: C.redSoft,    icon: 'alert-circle'  },
};

/* ─── Animated ring progress ─────────────────────────────────────────────── */
const RingProgress = ({ pct, size = 80, stroke = 7 }) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const color   = pct >= 85 ? C.green : pct >= 75 ? C.cyan : pct >= 60 ? C.yellow : C.red;

  useEffect(() => {
    Animated.timing(animVal, { toValue: pct, duration: 900, useNativeDriver: false }).start();
  }, [pct]);

  const r   = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background track */}
      <View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: C.border,
      }} />
      {/* Colored arc — approximated with border */}
      <View style={{
        position: 'absolute',
        width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke,
        borderColor: 'transparent',
        borderTopColor: color,
        borderRightColor: pct > 25 ? color : 'transparent',
        borderBottomColor: pct > 50 ? color : 'transparent',
        borderLeftColor: pct > 75 ? color : 'transparent',
        transform: [{ rotate: '-90deg' }],
        opacity: 0.9,
      }} />
      <Text style={{ fontSize: size * 0.22, fontWeight: '900', color, fontFamily: SERIF }}>
        {pct}%
      </Text>
    </View>
  );
};

/* ─── Horizontal bar ─────────────────────────────────────────────────────── */
const SubjectBar = ({ data, index }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const color = data.pct >= 85 ? C.green : data.pct >= 75 ? C.cyan : data.pct >= 60 ? C.yellow : C.red;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: data.pct / 100,
      duration: 600,
      delay: index * 60,
      useNativeDriver: false,
    }).start();
  }, [data.pct]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={bar.wrap}>
      <View style={bar.labelRow}>
        <Text style={bar.subject} numberOfLines={1}>{data.subject}</Text>
        <Text style={[bar.pct, { color }]}>{data.pct}%</Text>
      </View>
      <View style={bar.track}>
        <Animated.View style={[bar.fill, { width, backgroundColor: color }]} />
      </View>
      <Text style={bar.classes}>{data.present}/{data.total} classes</Text>
    </View>
  );
};

const bar = StyleSheet.create({
  wrap:     { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  subject:  { fontSize: 12, fontWeight: '600', color: C.textSec, flex: 1, marginRight: 8 },
  pct:      { fontSize: 13, fontWeight: '900' },
  track:    { height: 7, backgroundColor: C.border, borderRadius: 4, overflow: 'hidden', marginBottom: 3 },
  fill:     { height: '100%', borderRadius: 4 },
  classes:  { fontSize: 10, color: C.textMuted },
});

/* ─── Chip ───────────────────────────────────────────────────────────────── */
const Chip = ({ label, active, onPress, color = C.accent }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[
      chip.base,
      active && { borderColor: color, backgroundColor: color + '1A' },
    ]}>
    <Text style={[chip.text, active && { color }]}>{label}</Text>
  </TouchableOpacity>
);
const chip = StyleSheet.create({
  base: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 24, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.card,
  },
  text: { fontSize: 13, fontWeight: '700', color: C.textMuted },
});

/* ─── Step dot ───────────────────────────────────────────────────────────── */
const StepDot = ({ num, done, active, label }) => (
  <View style={{ alignItems: 'center', gap: 5 }}>
    <View style={[
      st.dot,
      done   && st.dotDone,
      active && st.dotActive,
    ]}>
      {done
        ? <Ionicons name="checkmark" size={12} color={C.white} />
        : <Text style={[st.num, active && { color: C.accent }]}>{num}</Text>
      }
    </View>
    <Text style={[st.label, (done || active) && { color: C.textPri }]}>{label}</Text>
  </View>
);
const st = StyleSheet.create({
  dot:       { width: 28, height: 28, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dotDone:   { backgroundColor: C.green, borderColor: C.green },
  dotActive: { borderColor: C.accent, backgroundColor: C.accentSoft },
  num:       { fontSize: 12, fontWeight: '800', color: C.textMuted },
  label:     { fontSize: 10, fontWeight: '600', color: C.textMuted, textAlign: 'center' },
});

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function StudentAttendanceScreen() {
  const navigation      = useNavigation();
  const { width }       = useWindowDimensions();
  const isWide          = width >= 768;

  const [selYear,  setSelYear]  = useState(null);
  const [selDiv,   setSelDiv]   = useState(null);
  const [selRoll,  setSelRoll]  = useState(null);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('subjects'); // 'subjects' | 'overall'

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  // Trigger card entrance
  useEffect(() => {
    if (selRoll) {
      cardAnim.setValue(0);
      Animated.spring(cardAnim, { toValue: 1, tension: 70, friction: 13, useNativeDriver: true }).start();
    }
  }, [selRoll]);

  const handleYearSelect = (y) => {
    setSelYear(y === selYear ? null : y);
    setSelDiv(null);
    setSelRoll(null);
    setStudents([]);
  };

  const handleDivSelect = (d) => {
    setSelDiv(d === selDiv ? null : d);
    setSelRoll(null);
    if (selYear) setStudents(generateStudents(selYear, d));
  };

  const handleRollSelect = (roll) => setSelRoll(roll === selRoll ? null : roll);

  const selectedStudent = students.find(s => s.roll === selRoll);

  /* Step logic */
  const step = !selYear ? 1 : !selDiv ? 2 : !selRoll ? 3 : 4;

  /* Class averages for overview tab */
  const classAvgBySubject = students.length
    ? SUBJECTS_BY_YEAR[selYear]?.map(sub => {
        const vals = students.map(s => s.subjectAttendance.find(a => a.subject === sub)?.pct ?? 0);
        return { subject: sub, pct: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) };
      })
    : [];

  const classOverallAvg = students.length
    ? Math.round(students.reduce((a, s) => a + s.overallPct, 0) / students.length)
    : 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Header ──────────────────────────────────────────────────── */}
          <View style={[s.header, isWide && s.headerWide]}>
            <View style={{ flex: 1 }}>
              <Text style={s.breadcrumb}>Attendance  ›  Student View</Text>
              <Text style={s.title}>Student Attendance</Text>
              <Text style={s.sub}>
                {selectedStudent
                  ? `${selectedStudent.name}  ·  ${selectedStudent.roll}`
                  : selDiv
                    ? `${selYear}-${selDiv}  ·  Select a roll number`
                    : selYear
                      ? `${selYear}  ·  Select division`
                      : 'Select year, division and roll number'}
              </Text>
            </View>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={14} color={C.textPri} />
              <Text style={s.backBtnText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* ── Step progress ────────────────────────────────────────────── */}
          <View style={s.stepRow}>
            <StepDot num={1} label="Year"     done={!!selYear} active={!selYear} />
            <View style={s.stepLine} />
            <StepDot num={2} label="Division" done={!!selDiv}  active={!!selYear && !selDiv} />
            <View style={s.stepLine} />
            <StepDot num={3} label="Roll No." done={!!selRoll} active={!!selDiv && !selRoll} />
            <View style={s.stepLine} />
            <StepDot num={4} label="Details"  done={false}     active={!!selRoll} />
          </View>

          {/* ── Selection panel ──────────────────────────────────────────── */}
          <View style={s.selPanel}>

            {/* Year */}
            <View style={s.selSection}>
              <View style={s.selLabelRow}>
                <Ionicons name="school-outline" size={14} color={C.accent} />
                <Text style={s.selLabel}>Select Year</Text>
              </View>
              <View style={s.chipRow}>
                {YEARS.map(y => (
                  <Chip key={y} label={y} active={selYear === y} onPress={() => handleYearSelect(y)} color={C.accent} />
                ))}
              </View>
            </View>

            {/* Division */}
            {selYear && (
              <View style={s.selSection}>
                <View style={s.selLabelRow}>
                  <Ionicons name="git-branch-outline" size={14} color={C.purple} />
                  <Text style={s.selLabel}>Select Division</Text>
                </View>
                <View style={s.chipRow}>
                  {DIVISIONS[selYear].map(d => (
                    <Chip key={d} label={d} active={selDiv === d} onPress={() => handleDivSelect(d)} color={C.purple} />
                  ))}
                </View>
              </View>
            )}

            {/* Roll number grid */}
            {selDiv && students.length > 0 && (
              <View style={s.selSection}>
                <View style={s.selLabelRow}>
                  <Ionicons name="person-outline" size={14} color={C.cyan} />
                  <Text style={s.selLabel}>Select Roll Number</Text>
                </View>
                <View style={s.rollGrid}>
                  {students.map(stu => {
                    const isActive = selRoll === stu.roll;
                    const meta     = STATUS_META[stu.status];
                    return (
                      <TouchableOpacity
                        key={stu.roll}
                        onPress={() => handleRollSelect(stu.roll)}
                        activeOpacity={0.8}
                        style={[
                          s.rollChip,
                          isActive && { borderColor: meta.color, backgroundColor: meta.color + '18' },
                        ]}>
                        <Text style={[s.rollNum, isActive && { color: meta.color }]}>{stu.rollNum}</Text>
                        {isActive && (
                          <View style={[s.rollDot, { backgroundColor: meta.color }]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* ── Student detail card ─────────────────────────────────────── */}
          {selectedStudent && (
            <Animated.View style={{
              opacity: cardAnim,
              transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
            }}>

              {/* Identity card */}
              <View style={s.identityCard}>
                {/* Avatar + name row */}
                <View style={s.identityTop}>
                  <View style={[s.avatar, { backgroundColor: STATUS_META[selectedStudent.status].color + '22' }]}>
                    <Text style={[s.avatarText, { color: STATUS_META[selectedStudent.status].color }]}>
                      {selectedStudent.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.studentName}>{selectedStudent.name}</Text>
                    <Text style={s.studentRoll}>{selectedStudent.roll}  ·  {selYear}-{selDiv}</Text>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_META[selectedStudent.status].bg }]}>
                      <Ionicons name={STATUS_META[selectedStudent.status].icon} size={11} color={STATUS_META[selectedStudent.status].color} />
                      <Text style={[s.statusBadgeText, { color: STATUS_META[selectedStudent.status].color }]}>
                        {selectedStudent.status}
                      </Text>
                    </View>
                  </View>
                  {/* Overall ring */}
                  <RingProgress pct={selectedStudent.overallPct} size={isWide ? 88 : 76} stroke={8} />
                </View>

                {/* Summary strip */}
                <View style={s.summaryStrip}>
                  {[
                    { label: 'Overall', value: `${selectedStudent.overallPct}%`, color: selectedStudent.overallPct >= 75 ? C.green : C.red },
                    { label: 'Subjects', value: SUBJECTS_BY_YEAR[selYear].length, color: C.accent },
                    { label: 'Below 75%', value: selectedStudent.subjectAttendance.filter(a => a.pct < 75).length, color: C.yellow },
                    { label: 'Critical', value: selectedStudent.subjectAttendance.filter(a => a.pct < 60).length, color: C.red },
                  ].map((item, i) => (
                    <View key={i} style={[s.summaryItem, { borderColor: item.color + '30', backgroundColor: item.color + '0D' }]}>
                      <Text style={[s.summaryVal, { color: item.color }]}>{item.value}</Text>
                      <Text style={s.summaryLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Tab switcher */}
              <View style={s.tabRow}>
                {[
                  { key: 'subjects', label: 'Subject-wise', icon: 'bar-chart-outline' },
                  { key: 'overall',  label: 'Class Overview', icon: 'people-outline'   },
                ].map(tab => (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[s.tab, activeTab === tab.key && s.tabActive]}
                    activeOpacity={0.8}>
                    <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? C.accent : C.textMuted} />
                    <Text style={[s.tabText, activeTab === tab.key && { color: C.accent }]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject-wise tab */}
              {activeTab === 'subjects' && (
                <View style={s.detailCard}>
                  <Text style={s.cardTitle}>Subject-wise Attendance</Text>

                  {/* Attendance threshold notice */}
                  <View style={s.thresholdRow}>
                    <Ionicons name="information-circle-outline" size={13} color={C.textMuted} />
                    <Text style={s.thresholdText}>Minimum required: <Text style={{ color: C.green, fontWeight: '700' }}>75%</Text></Text>
                  </View>

                  {/* Bars */}
                  {selectedStudent.subjectAttendance.map((sub, i) => (
                    <SubjectBar key={sub.subject} data={sub} index={i} />
                  ))}

                  {/* Legend */}
                  <View style={s.legendRow}>
                    {[[C.green,'≥85% Excellent'],[C.cyan,'≥75% Regular'],[C.yellow,'60-74% At Risk'],[C.red,'<60% Critical']].map(([clr, lbl]) => (
                      <View key={lbl} style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: clr }]} />
                        <Text style={s.legendText}>{lbl}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Class overview tab */}
              {activeTab === 'overall' && (
                <View style={s.detailCard}>
                  <View style={s.overviewHeader}>
                    <Text style={s.cardTitle}>Class Overview  ·  {selYear}-{selDiv}</Text>
                    <View style={s.classAvgBadge}>
                      <Text style={s.classAvgText}>Class Avg</Text>
                      <Text style={[s.classAvgVal, { color: classOverallAvg >= 75 ? C.green : C.red }]}>{classOverallAvg}%</Text>
                    </View>
                  </View>

                  {/* Class subject averages */}
                  <Text style={s.subSectionLabel}>Class Average by Subject</Text>
                  {classAvgBySubject.map((sub, i) => (
                    <SubjectBar key={sub.subject} data={{ ...sub, present: '-', total: '-' }} index={i} />
                  ))}

                  {/* Classmate comparison table */}
                  <Text style={[s.subSectionLabel, { marginTop: 20 }]}>All Students — Overall Attendance</Text>
                  <View style={s.table}>
                    <View style={s.tableHeader}>
                      <Text style={[s.thCell, { flex: 0.8 }]}>Roll</Text>
                      <Text style={[s.thCell, { flex: 2 }]}>Name</Text>
                      <Text style={[s.thCell, { textAlign: 'right' }]}>Overall</Text>
                      <Text style={[s.thCell, { textAlign: 'right' }]}>Status</Text>
                    </View>
                    {students.map(stu => {
                      const isMe  = stu.roll === selRoll;
                      const meta  = STATUS_META[stu.status];
                      return (
                        <TouchableOpacity
                          key={stu.roll}
                          onPress={() => handleRollSelect(stu.roll)}
                          activeOpacity={0.8}
                          style={[s.tableRow, isMe && { backgroundColor: C.accentSoft, borderColor: C.accent + '50' }]}>
                          <Text style={[s.tdCell, { flex: 0.8, color: isMe ? C.accent : C.textSec, fontWeight: isMe ? '800' : '500' }]}>
                            {stu.rollNum}
                          </Text>
                          <Text style={[s.tdCell, { flex: 2, color: isMe ? C.textPri : C.textSec }]} numberOfLines={1}>
                            {isMe ? `◉ ${stu.name}` : stu.name}
                          </Text>
                          <Text style={[s.tdCell, { textAlign: 'right', color: stu.overallPct >= 75 ? C.green : C.red, fontWeight: '800' }]}>
                            {stu.overallPct}%
                          </Text>
                          <View style={[s.miniStatus, { backgroundColor: meta.bg }]}>
                            <Text style={[s.miniStatusText, { color: meta.color }]}>{stu.status}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

            </Animated.View>
          )}

          {/* ── Empty state ──────────────────────────────────────────────── */}
          {!selectedStudent && selDiv && (
            <View style={s.emptyHint}>
              <Ionicons name="person-circle-outline" size={48} color={C.textMuted} />
              <Text style={s.emptyHintTitle}>Select a roll number</Text>
              <Text style={s.emptyHintSub}>Tap any number above to view attendance details</Text>
            </View>
          )}

          {!selYear && (
            <View style={s.emptyHint}>
              <Ionicons name="school-outline" size={48} color={C.textMuted} />
              <Text style={s.emptyHintTitle}>Select Year to begin</Text>
              <Text style={s.emptyHintSub}>Choose FY, SY or TY above to get started</Text>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },

  header:    { padding: 20, paddingTop: Platform.OS === 'ios' ? 24 : 20, gap: 8, marginBottom: 4 },
  headerWide:{ flexDirection: 'row', alignItems: 'center' },
  breadcrumb:{ fontSize: 11, color: C.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  title:     { fontSize: 28, fontWeight: '800', color: C.textPri, fontFamily: SERIF, marginBottom: 3 },
  sub:       { fontSize: 13, color: C.textSec },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignSelf: 'flex-start', marginTop: 8 },
  backBtnText:{ fontSize: 13, fontWeight: '600', color: C.textPri },

  /* Steps */
  stepRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: 18 },
  stepLine: { flex: 1, height: 1, backgroundColor: C.border, marginHorizontal: 6, marginBottom: 16 },

  /* Selection panel */
  selPanel:  { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, gap: 20 },
  selSection:{ gap: 10 },
  selLabelRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  selLabel:  { fontSize: 12, fontWeight: '700', color: C.textSec, letterSpacing: 0.3 },
  chipRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  /* Roll grid */
  rollGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rollChip:  {
    width: 52, height: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
  },
  rollNum:   { fontSize: 13, fontWeight: '800', color: C.textMuted },
  rollDot:   { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  /* Identity card */
  identityCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: C.surface,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 18,
  },
  identityTop:  { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatar:       { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 16, fontWeight: '900' },
  studentName:  { fontSize: 16, fontWeight: '800', color: C.textPri, marginBottom: 2 },
  studentRoll:  { fontSize: 12, color: C.textSec, marginBottom: 6 },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  statusBadgeText:{ fontSize: 11, fontWeight: '700' },

  summaryStrip: { flexDirection: 'row', gap: 8 },
  summaryItem:  { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 2 },
  summaryVal:   { fontSize: 18, fontWeight: '900', fontFamily: SERIF },
  summaryLabel: { fontSize: 9, fontWeight: '700', color: C.textMuted, textAlign: 'center' },

  /* Tabs */
  tabRow:    { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 4, gap: 4 },
  tab:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 9 },
  tabActive: { backgroundColor: C.accentSoft, borderWidth: 1, borderColor: C.accent + '40' },
  tabText:   { fontSize: 13, fontWeight: '700', color: C.textMuted },

  /* Detail card */
  detailCard: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: C.surface,
    borderRadius: 18, borderWidth: 1, borderColor: C.border,
    padding: 18,
  },
  cardTitle:      { fontSize: 15, fontWeight: '800', color: C.textPri, marginBottom: 14 },
  thresholdRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, backgroundColor: C.card, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: C.border },
  thresholdText:  { fontSize: 11, color: C.textMuted },
  legendRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:      { width: 7, height: 7, borderRadius: 4 },
  legendText:     { fontSize: 10, color: C.textMuted },

  /* Overview tab */
  overviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  classAvgBadge:  { alignItems: 'center', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 8 },
  classAvgText:   { fontSize: 9, color: C.textMuted, fontWeight: '600' },
  classAvgVal:    { fontSize: 20, fontWeight: '900', fontFamily: SERIF },
  subSectionLabel:{ fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 0.6, marginBottom: 12 },

  /* Table */
  table:        { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  tableHeader:  { flexDirection: 'row', backgroundColor: C.cardEl, paddingHorizontal: 12, paddingVertical: 10 },
  thCell:       { flex: 1, fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.5 },
  tableRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  tdCell:       { flex: 1, fontSize: 12, color: C.textSec },
  miniStatus:   { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  miniStatusText:{ fontSize: 9, fontWeight: '800' },

  /* Empty hints */
  emptyHint:      { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyHintTitle: { fontSize: 16, fontWeight: '700', color: C.textSec },
  emptyHintSub:   { fontSize: 13, color: C.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});