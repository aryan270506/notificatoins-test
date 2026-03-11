import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Image } from 'react-native';
import axiosInstance from '../../../Src/Axios';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isTabletOrDesktop = SCREEN_WIDTH >= 768;
const TABLE_MIN_WIDTH = 1040;

export default function StudentExamResults({ C, onThemeToggle, user }) {
  const [loading,    setLoading]    = useState(true);
  const [marksData,  setMarksData]  = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pressedRow, setPressedRow] = useState(null);

  // ── Theme fallbacks ───────────────────────────────────────────────────────
  const bg        = C?.bg          ?? '#0d1b2e';
  const card      = C?.card        ?? '#112240';
  const cardAlt   = C?.cardAlt     ?? '#0d1b2e';
  const border    = C?.border      ?? '#1e3a5f';
  const textPri   = C?.textPrimary ?? '#e2e8f0';
  const textMut   = C?.textMuted   ?? '#475569';
  const textSub   = C?.textSub     ?? '#94a3b8';
  const accent    = C?.accent      ?? '#2563eb';
  const green     = C?.green       ?? '#22c55e';
  const moonIcon  = C?.moonIcon    ?? '🌙';
  const statusBar = C?.statusBar   ?? 'light-content';

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?._id && !user?.id) return;
    fetchStudentData();
  }, [user]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const studentId = user.id || user._id;

      // 1. Fetch student profile
      const studentRes  = await axiosInstance.get(`/students/${studentId}`);
      const studentData = studentRes.data;
      if (!studentData) { setLoading(false); return; }

      const theorySubjects = studentData.subjects || [];
      const labSubjects    = studentData.lab       || [];
      const year           = studentData.year;
      const division       = studentData.division;

      // 2. Fetch exam marks — backend returns cat1Max, cat2Max, fetMax, internalMax
      const marksRes      = await axiosInstance.get('/exam-marks/student-results', {
        params: { studentId, year, division },
      });
      const existingMarks = marksRes.data?.success ? marksRes.data.data : [];

      console.log('[StudentExam] existingMarks:', JSON.stringify(existingMarks));

      // 3. Build subject rows
      const allSubjects = [];

      // Subjects that have marks — ALL max values come from backend
      existingMarks.forEach(entry => {
        const internalMax = entry.internalMax || (entry.classType === 'Lab' ? 50 : 40);
        const internal    = entry.internal    || 0;
        const barPercent  = internalMax > 0 ? internal / internalMax : 0;

        let barColor = '#22c55e';
        if (barPercent < 0.4)      barColor = '#ef4444';
        else if (barPercent < 0.7) barColor = '#f59e0b';

        allSubjects.push({
          code:       entry.subjectCode,
          name:       entry.subjectName,
          classType:  entry.classType,
          batch:      entry.batch   || null,
          cat1:       entry.cat1    || 0,
          cat1Max:    entry.cat1Max || 0,
          cat2:       entry.cat2    || 0,
          cat2Max:    entry.cat2Max || 0,
          fet:        entry.fet     || 0,
          fetMax:     entry.fetMax  || 0,
          internal,
          internalMax,
          status:     entry.status  || '-',
          barColor,
          barPercent,
        });
      });

      // Subjects with no marks yet
      const markedNames = new Set(existingMarks.map(m => m.subjectName.toUpperCase()));

      (theorySubjects || []).forEach(subName => {
        if (markedNames.has(subName.toUpperCase())) return;
        allSubjects.push({
          code: subName, name: subName, classType: 'Theory', batch: null,
          cat1: 0, cat1Max: 0, cat2: 0, cat2Max: 0, fet: 0, fetMax: 0,
          internal: 0, internalMax: 40, status: '-',
          barColor: '#475569', barPercent: 0,
        });
      });

      (labSubjects || []).forEach(labName => {
        if (markedNames.has(labName.toUpperCase())) return;
        allSubjects.push({
          code: labName, name: labName, classType: 'Lab', batch: null,
          cat1: 0, cat1Max: 0, cat2: 0, cat2Max: 0, fet: 0, fetMax: 0,
          internal: 0, internalMax: 50, status: '-',
          barColor: '#475569', barPercent: 0,
        });
      });

      setMarksData(allSubjects);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching student exam data:', err);
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentData().finally(() => setRefreshing(false));
  };

  // ── Overall performance — dynamic ─────────────────────────────────────────
  const overallPerf = useMemo(() => {
    const graded = marksData.filter(s => s.status !== '-' && s.internalMax > 0);
    if (!graded.length) return { pct: '—', label: 'NO DATA', color: '#475569' };

    const avg = graded.reduce((sum, s) => sum + s.barPercent, 0) / graded.length;
    const pct = Math.round(avg * 100);

    let label = 'POOR';
    let color = '#ef4444';
    if (pct >= 85)      { label = 'EXCELLENT'; color = '#22c55e'; }
    else if (pct >= 70) { label = 'GOOD';      color = '#3b82f6'; }
    else if (pct >= 50) { label = 'AVERAGE';   color = '#f59e0b'; }

    return { pct: `${pct}%`, label, color };
  }, [marksData]);

  // ── Status badge colors ───────────────────────────────────────────────────
  const getStatusColors = (status) => {
    switch (status) {
      case 'PASS':   return { bg: 'rgba(34,197,94,0.12)',   border: '#22c55e', text: '#22c55e' };
      case 'FAIL':   return { bg: 'rgba(244,63,94,0.12)',   border: '#f43f5e', text: '#f43f5e' };
      case 'ABSENT': return { bg: 'rgba(244,63,94,0.12)',   border: '#f43f5e', text: '#f43f5e' };
      default:       return { bg: 'rgba(100,100,100,0.12)', border: '#475569', text: '#475569' };
    }
  };

  const passedCount = useMemo(
    () => marksData.filter(s => s.status === 'PASS').length,
    [marksData]
  );

  // Format "obtained/max" — shows "—" if max is 0 (exam not uploaded yet)
  const fmtMark = (obtained, max) => max === 0 ? '—' : `${obtained}/${max}`;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle={statusBar} backgroundColor={bg} />

      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: card, borderBottomColor: border }]}>
        <Text style={[styles.topBarTitle, { color: textPri }]}>Exam Results</Text>
        {onThemeToggle && (
          <TouchableOpacity
            style={[styles.themeBtn, { backgroundColor: cardAlt, borderColor: border }]}
            onPress={onThemeToggle}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 16 }}>{moonIcon}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
        }
      >
        {/* Breadcrumb */}
        <View style={styles.breadcrumb}>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.breadcrumbLink, { color: textMut }]}>Home</Text>
          </TouchableOpacity>
          <Text style={[styles.breadcrumbSep, { color: border }]}> / </Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={[styles.breadcrumbLink, { color: textMut }]}>Exam Results</Text>
          </TouchableOpacity>
          <Text style={[styles.breadcrumbSep, { color: border }]}> / </Text>
          <Text style={[styles.breadcrumbActive, { color: textSub }]}>CAT Results</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.profileLeft}>
            <View style={styles.avatarWrapper}>
              {user?.profilePhoto ? (
                <Image
                  source={{ uri: user.profilePhoto }}
                  style={{ width: 56, height: 56, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: C?.accentBg ?? '#1e3a5f' }]}>
                  <Text style={[styles.avatarInitials, { color: accent }]}>
                    {user?.name
                      ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                      : 'ST'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: textPri }]}>{user?.name || 'Student'}</Text>
              <View style={styles.profileTags}>
                {[
                  { label: 'ID',  value: user?.id || '—' },
                  { label: 'DEP', value: user?.department ? `B.Sc. ${user.department}` : '—' },
                  { label: 'SEM', value: 'Autumn 2026' },
                ].map((t) => (
                  <View key={t.label} style={styles.tag}>
                    <Text style={[styles.tagLabel, { color: textMut, backgroundColor: C?.cardAlt ?? '#1e293b' }]}>
                      {t.label}
                    </Text>
                    <Text style={[styles.tagValue, { color: textSub }]}>{t.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <View style={styles.profileActions}>
            <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: accent }]} activeOpacity={0.75}>
              <Text style={styles.downloadIcon}>↓</Text>
              <Text style={styles.downloadText}>Download Transcript</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrowBtn, { backgroundColor: C?.accentBg ?? '#1e3a5f', borderColor: border }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.arrowBtnText, { color: accent }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Exam Header — dynamic overall */}
        <View style={styles.examHeader}>
          <View>
            <Text style={[styles.examTitle, { color: textPri }]}>CAT Exam Results</Text>
            <Text style={[styles.examSubtitle, { color: textMut }]}>Continuous Assessment Test</Text>
          </View>
          <View style={[styles.overallPerf, { alignItems: isTabletOrDesktop ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.overallLabel, { color: textMut }]}>OVERALL PERFORMANCE</Text>
            <View style={styles.overallScoreRow}>
              <Text style={[styles.overallScore, { color: overallPerf.color }]}>
                {overallPerf.pct}
              </Text>
              <View style={[
                styles.perfBadge,
                { borderColor: overallPerf.color, backgroundColor: C?.accentBg ?? '#0c2d3f' },
              ]}>
                <Text style={[styles.perfBadgeText, { color: overallPerf.color }]}>
                  {overallPerf.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Row — no hardcoded values */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={[styles.statCard, { backgroundColor: card, borderColor: border }]} activeOpacity={0.8}>
            <View style={[styles.statIconWrap, { backgroundColor: C?.accentBg ?? '#0f2a50' }]}>
              <Text style={styles.statIcon}>✅</Text>
            </View>
            <View>
              <Text style={[styles.statLabel, { color: textMut }]}>PASSED</Text>
              <Text style={[styles.statValue, { color: textPri }]}>
                {passedCount}/{marksData.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.statCard, { backgroundColor: card, borderColor: border }]} activeOpacity={0.8}>
            <View style={[styles.statIconWrap, { backgroundColor: C?.orangeBg ?? '#3d2a1e' }]}>
              <Text style={styles.statIcon}>📖</Text>
            </View>
            <View>
              <Text style={[styles.statLabel, { color: textMut }]}>SUBJECTS</Text>
              <Text style={[styles.statValue, { color: textPri }]}>{marksData.length}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Subjects Table ── */}
        <View style={[styles.tableCard, { backgroundColor: card, borderColor: border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
            <View style={{ minWidth: TABLE_MIN_WIDTH }}>

              {/* Table Header */}
              <View style={[styles.tableHeader, { backgroundColor: cardAlt, borderBottomColor: border }]}>
                <Text style={[styles.colHeader, { color: textMut, width: 220 }]}>SUBJECT NAME</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 180 }]}>INTERNAL</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 120, textAlign: 'center' }]}>CAT 1</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 120, textAlign: 'center' }]}>CAT 2</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 120, textAlign: 'center' }]}>FET</Text>
                <Text style={[styles.colHeader, { color: textMut, width: 100, textAlign: 'right' }]}>STATUS</Text>
              </View>

              {marksData.length === 0 && (
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <Text style={{ color: textMut, fontSize: 14 }}>
                    {loading ? 'Loading…' : 'No subjects found for this student.'}
                  </Text>
                </View>
              )}

              {marksData.map((subject, index) => {
                const sc = getStatusColors(subject.status);
                return (
                  <TouchableOpacity
                    key={`${subject.code}_${subject.classType}_${index}`}
                    style={[
                      styles.tableRow,
                      { borderBottomColor: border },
                      pressedRow === index && { backgroundColor: C?.accentBg ?? '#162d4a' },
                      index === marksData.length - 1 && styles.tableRowLast,
                    ]}
                    activeOpacity={0.85}
                    onPressIn={() => setPressedRow(index)}
                    onPressOut={() => setPressedRow(null)}
                  >
                    {/* Subject name + type badge */}
                    <View style={{ width: 220, paddingRight: 8 }}>
                      <Text style={[styles.subjectName, { color: textPri }]} numberOfLines={2}>
                        {subject.name}
                      </Text>
                      
                    </View>

                    {/* Internal — obtained/total from backend */}
                    <View style={{ width: 180, paddingRight: 10 }}>
                      <Text style={[styles.marksText, { color: textSub }]}>
                        {subject.internal}/{subject.internalMax}
                      </Text>
                      <View style={[styles.barTrack, { backgroundColor: border }]}>
                        <View style={[
                          styles.barFill,
                          {
                            width: `${Math.min(subject.barPercent * 100, 100)}%`,
                            backgroundColor: subject.barColor,
                          },
                        ]} />
                      </View>
                    </View>

                    {/* CAT 1: obtained/max */}
                    <View style={{ width: 120, alignItems: 'center' }}>
                      <Text style={[styles.marksText, { color: textSub }]}>
                        {fmtMark(subject.cat1, subject.cat1Max)}
                      </Text>
                    </View>

                    {/* CAT 2: obtained/max */}
                    <View style={{ width: 120, alignItems: 'center' }}>
                      <Text style={[styles.marksText, { color: textSub }]}>
                        {fmtMark(subject.cat2, subject.cat2Max)}
                      </Text>
                    </View>

                    {/* FET: obtained/max */}
                    <View style={{ width: 120, alignItems: 'center' }}>
                      <Text style={[styles.marksText, { color: textSub }]}>
                        {fmtMark(subject.fet, subject.fetMax)}
                      </Text>
                    </View>

                    {/* Status — dynamic color */}
                    <View style={{ width: 100, alignItems: 'flex-end' }}>
                      <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                        <Text style={[styles.statusBadgeText, { color: sc.text }]}>
                          {subject.status}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1,
  },
  topBarTitle: { fontSize: 16, fontWeight: '700' },
  themeBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  container: { padding: isTabletOrDesktop ? 32 : 16, paddingBottom: 40 },

  breadcrumb:       { flexDirection: 'row', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  breadcrumbLink:   { fontSize: 13 },
  breadcrumbSep:    { fontSize: 13 },
  breadcrumbActive: { fontSize: 13, fontWeight: '600' },

  profileCard: {
    borderRadius: 16, padding: 20,
    flexDirection: isTabletOrDesktop ? 'row' : 'column',
    alignItems: isTabletOrDesktop ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24, gap: 16, borderWidth: 1,
  },
  profileLeft:       { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatarWrapper:     { width: 56, height: 56, borderRadius: 12, overflow: 'hidden' },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarInitials:    { fontSize: 20, fontWeight: '700' },
  profileInfo:       { flex: 1 },
  profileName:       { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  profileTags:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:               { flexDirection: 'row', gap: 4, alignItems: 'center' },
  tagLabel:          { fontSize: 11, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  tagValue:          { fontSize: 12 },
  profileActions:    { flexDirection: 'row', gap: 10, alignItems: 'center' },
  downloadBtn:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 6 },
  downloadIcon:      { color: '#fff', fontSize: 14 },
  downloadText:      { color: '#fff', fontSize: 13, fontWeight: '600' },
  arrowBtn:          { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  arrowBtnText:      { fontSize: 18 },

  examHeader: {
    flexDirection: isTabletOrDesktop ? 'row' : 'column',
    justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 20, gap: 12,
  },
  examTitle:       { fontSize: 22, fontWeight: '700' },
  examSubtitle:    { fontSize: 13, marginTop: 2 },
  overallPerf:     {},
  overallLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  overallScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  overallScore:    { fontSize: 36, fontWeight: '800' },
  perfBadge:       { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  perfBadgeText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  statsRow:     { flexDirection: 'row', gap: 16, marginBottom: 20 },
  statCard:     { flex: 1, borderRadius: 14, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1 },
  statIconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statIcon:     { fontSize: 20 },
  statLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  statValue:    { fontSize: 24, fontWeight: '700' },

  tableCard:       { borderRadius: 16, overflow: 'hidden', borderWidth: 1, marginBottom: 8 },
  tableHeader:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1 },
  colHeader:       { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  tableRow:        { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 1 },
  tableRowLast:    { borderBottomWidth: 0 },

  subjectName:     { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  typeBadgeRow:    { flexDirection: 'row' },
  typeBadge:       { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText:   { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  marksText:       { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  barTrack:        { height: 5, borderRadius: 3, overflow: 'hidden', width: '100%' },
  barFill:         { height: 5, borderRadius: 3 },
  statusBadge:     { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
});