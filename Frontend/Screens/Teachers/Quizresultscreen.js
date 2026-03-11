// QuizStudentAnalyticsScreen.js — UniVerse
// Teacher view: Quiz Results & Student Analytics
// Backend integrated: GET /api/quizzes/:id/results

import React, { useRef, useEffect, useState, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import axiosInstance from '../../Src/Axios'; // adjust path as needed
import { ThemeContext } from './TeacherStack';

const { width: W } = Dimensions.get('window');

/* ─── Theme ──────────────────────────────────────────────────────────────── */
const C_DARK = {
  bg:            '#0D0F1A',
  surface:       '#131627',
  surfaceEl:     '#181C2E',
  border:        '#1E2336',
  border2:       '#252A40',
  accent:        '#5C6EF8',
  accentSoft:    'rgba(92,110,248,0.18)',
  green:         '#22C55E',
  greenSoft:     'rgba(34,197,94,0.15)',
  orange:        '#F59E0B',
  orangeSoft:    'rgba(245,158,11,0.15)',
  red:           '#EF4444',
  redSoft:       'rgba(239,68,68,0.15)',
  purple:        '#A78BFA',
  purpleSoft:    'rgba(167,139,250,0.15)',
  cyan:          '#22D3EE',
  textPrimary:   '#E8EAF6',
  textSecondary: '#8B93B3',
  textMuted:     '#6B7299',
  dimmer:        '#3D4466',
  white:         '#FFFFFF',
};
const C_LIGHT = {
  bg:            '#F1F4FD',
  surface:       '#FFFFFF',
  surfaceEl:     '#EAEEf9',
  border:        '#DDE3F4',
  border2:       '#CBD5E1',
  accent:        '#4F5FE0',
  accentSoft:    'rgba(79,95,224,0.09)',
  green:         '#059669',
  greenSoft:     'rgba(5,150,105,0.09)',
  orange:        '#D97706',
  orangeSoft:    'rgba(217,119,6,0.09)',
  red:           '#DC2626',
  redSoft:       'rgba(220,38,38,0.08)',
  purple:        '#7C3AED',
  purpleSoft:    'rgba(124,58,237,0.09)',
  cyan:          '#0891B2',
  textPrimary:   '#0F172A',
  textSecondary: '#4B5563',
  textMuted:     '#9CA3AF',
  dimmer:        '#CBD5E1',
  white:         '#FFFFFF',
};
const FONTS = { heading: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

const PAGES = [1, 2, 3, '...', 12];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const scoreColor = (s, C) => s >= 80 ? C.green : s >= 60 ? C.accent : s >= 45 ? C.orange : C.red;

const statusStyle = (type, C) => ({
  'On Time': { bg: C.greenSoft,  color: C.green  },
  'Late':    { bg: C.orangeSoft, color: C.orange },
  'Flagged': { bg: C.redSoft,    color: C.red    },
}[type] ?? { bg: C.border, color: C.textMuted });

const initials = (name) => (name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  ['#667EEA','#764BA2'],
  ['#F093FB','#F5576C'],
  ['#4FACFE','#00F2FE'],
  ['#FA709A','#FEE140'],
  ['#43E97B','#38F9D7'],
  ['#F7971E','#FFD200'],
];

/* ─── Animated Bar ───────────────────────────────────────────────────────── */
const AnimBar = ({ pct, color, height = 5, delay = 0 }) => {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, delay, useNativeDriver: false }).start();
  }, [pct]);
  return (
    <View style={{ height, backgroundColor: C.border2, borderRadius: height, overflow: 'hidden', flex: 1 }}>
      <Animated.View style={{
        height: '100%', borderRadius: height, backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════════════ */
export default function Quizresultscreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? C_DARK : C_LIGHT;
  const s = makeS(C);

  // Accept either a full quiz object or just an _id
  const quizParam = route.params?.quiz ?? {};
  const quizId = quizParam._id || route.params?.quizId;

  const [resultsData,  setResultsData]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activePage,   setActivePage]   = useState(1);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeFilter, setActiveFilter] = useState(null);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  /* ── GET /api/quizzes/:id/results ── */
  useEffect(() => {
    const fetchResults = async () => {
      if (!quizId) {
        setError('No quiz ID provided');
        setLoading(false);
        return;
      }
      try {
        const { data } = await axiosInstance.get(`/quiz/${quizId}/results`);
        if (data.success) {
          setResultsData(data.data);
        } else {
          setError(data.message || 'Failed to load results');
        }
      } catch (err) {
        console.error('Fetch results error:', err);
        setError(err?.response?.data?.message || 'Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [quizId]);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  /* ── Download PDF ── */
  const handleDownloadPDF = async () => {
    if (!resultsData) return;
    try {
      const { printToFileAsync } = require('expo-print');
      const Sharing = require('expo-sharing');
      const FileSystem = require('expo-file-system');

      const date = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      // Always use ALL students — not the filtered subset
      const { quiz, students, kpi } = resultsData;
      const allStudents = students || [];

      const tableRows = allStudents.map((st, i) => {
        const scorePct = st.totalMarks > 0 ? Math.round((st.score / st.totalMarks) * 100) : 0;
        const barColor = scorePct >= 80 ? '#22C55E' : scorePct >= 60 ? '#5C6EF8' : scorePct >= 45 ? '#F59E0B' : '#EF4444';
        const statusColor = st.status === 'On Time' ? '#22C55E' : st.status === 'Late' ? '#F59E0B' : '#EF4444';
        const statusBg    = st.status === 'On Time' ? '#dcfce7' : st.status === 'Late' ? '#fef9c3' : '#fee2e2';
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8faff';
        return `
          <tr style="background:${rowBg};">
            <td style="padding:10px 14px; text-align:center; color:#6b7299; font-weight:600;">${i + 1}</td>
            <td style="padding:10px 14px;">
              <div style="font-weight:700; color:#1e2336; font-size:13px;">${st.studentName}</div>
              <div style="color:#6b7299; font-size:11px; margin-top:2px;">ID: ${st.studentId}</div>
            </td>
            <td style="padding:10px 14px; text-align:center;">
              <span style="background:${statusBg}; color:${statusColor}; padding:3px 10px; border-radius:5px; font-size:11px; font-weight:700;">${st.status}</span>
            </td>
            <td style="padding:10px 14px; text-align:center;">
              <div style="font-weight:800; font-size:15px; color:${barColor};">${st.score}/${st.totalMarks}</div>
              <div style="background:#e5e7eb; border-radius:3px; height:5px; margin-top:4px; overflow:hidden;">
                <div style="width:${scorePct}%; height:5px; background:${barColor}; border-radius:3px;"></div>
              </div>
            </td>
            <td style="padding:10px 14px; text-align:center; color:#6b7299; font-size:12px;">${st.duration || '—'}</td>
          </tr>`;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; background:#f0f2ff; padding:32px; }
            .card { background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
            .header { background:linear-gradient(135deg,#0D0F1A 0%,#1e2a5e 100%); padding:28px 32px; }
            .header-top { display:flex; justify-content:space-between; align-items:flex-start; }
            .logo { font-size:13px; font-weight:800; color:#5C6EF8; letter-spacing:1px; text-transform:uppercase; }
            .badge { background:rgba(34,197,94,0.2); color:#22C55E; padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; }
            .title { font-size:26px; font-weight:900; color:#fff; margin:12px 0 6px; }
            .subtitle { font-size:12px; color:#8B93B3; }
            .meta-row { display:flex; gap:20px; margin-top:16px; }
            .meta-item { font-size:11px; color:#8B93B3; }
            .meta-item strong { color:#E8EAF6; }
            .kpi-row { display:flex; gap:0; border-bottom:1px solid #e5e7eb; }
            .kpi { flex:1; padding:18px 20px; text-align:center; border-right:1px solid #e5e7eb; }
            .kpi:last-child { border-right:none; }
            .kpi-label { font-size:10px; font-weight:700; letter-spacing:1px; color:#6b7299; text-transform:uppercase; margin-bottom:6px; }
            .kpi-value { font-size:26px; font-weight:900; }
            table { width:100%; border-collapse:collapse; }
            thead tr { background:#f8faff; }
            thead th { padding:10px 14px; text-align:left; font-size:10px; font-weight:700; letter-spacing:1px; color:#6b7299; text-transform:uppercase; border-bottom:2px solid #e5e7eb; }
            thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5) { text-align:center; }
            tbody tr { border-bottom:1px solid #f0f2ff; }
            .footer { padding:16px 32px; background:#f8faff; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; align-items:center; }
            .footer-left { font-size:11px; color:#6b7299; }
            .footer-right { font-size:11px; color:#5C6EF8; font-weight:700; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="header-top">
                <div class="logo">📚 UniVerse LMS</div>
                <div class="badge">✓ ${quiz?.status || 'COMPLETED'}</div>
              </div>
              <div class="title">${quiz?.title || 'Quiz Results'}</div>
              <div class="meta-row">
                <div class="meta-item">📅 <strong>${date}</strong></div>
                <div class="meta-item">📖 <strong>${quiz?.subject || quiz?.class || '—'}</strong></div>
                <div class="meta-item">👥 <strong>${allStudents.length} Students</strong></div>
              </div>
            </div>

            <div class="kpi-row">
              <div class="kpi">
                <div class="kpi-label">Class Average</div>
                <div class="kpi-value" style="color:#5C6EF8;">${kpi?.avg ?? 0}%</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Highest Score</div>
                <div class="kpi-value" style="color:#F59E0B;">${kpi?.high ?? 0}%</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Participation</div>
                <div class="kpi-value" style="color:#A78BFA;">${kpi?.participation ?? 0}%</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:40px;">#</th>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>

            <div class="footer">
              <div class="footer-left">Generated on ${date} · UniVerse LMS</div>
              <div class="footer-right">Total Students: ${allStudents.length}</div>
            </div>
          </div>
        </body>
        </html>`;

      // Generate PDF file directly (no print dialog)
      const { uri } = await printToFileAsync({ html, base64: false });

      const fileName = `${(quiz?.title || 'Quiz').replace(/\s+/g, '_')}_Results_${Date.now()}.pdf`;
      const pdfUri = FileSystem.documentDirectory + fileName;

      await FileSystem.moveAsync({ from: uri, to: pdfUri });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${fileName}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF saved to:\n${pdfUri}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Download Failed', 'Could not generate PDF. Please try again.');
    }
  };

  /* ── Loading state ── */
  if (loading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={{ color: C.textSecondary, marginTop: 16, fontSize: 14 }}>Loading results…</Text>
      </View>
    );
  }

  /* ── Error state ── */
  if (error || !resultsData) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={C.red} />
        <Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 16 }}>Failed to load</Text>
        <Text style={{ color: C.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8 }}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.accent, borderRadius: 12 }}>
          <Text style={{ color: C.white, fontWeight: '700' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { quiz, students, kpi, total, submitted } = resultsData;

  const KPI_DATA = [
    { label: 'CLASS AVERAGE', value: `${kpi.avg}%`,         barPct: kpi.avg / 100,         barColor: C.accent,  icon: 'bar-chart-outline',   iconColor: C.accent,  iconBg: 'rgba(92,110,248,0.15)',  deltaUp: null, delta: '' },
    { label: 'HIGHEST SCORE', value: `${kpi.high}%`,        barPct: kpi.high / 100,        barColor: C.orange,  icon: 'trophy-outline',       iconColor: C.orange,  iconBg: 'rgba(245,158,11,0.15)',  deltaUp: null, delta: '' },
    { label: 'PARTICIPATION', value: `${kpi.participation}%`, barPct: kpi.participation / 100, barColor: C.purple, icon: 'people-outline',       iconColor: C.purple,  iconBg: 'rgba(167,139,250,0.15)', deltaUp: null, delta: '' },
  ];

  const filteredStudents = (students || []).filter(s =>
    (s.studentName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.studentId || '').includes(searchQuery)
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── BREADCRUMB ── */}
          <View style={s.breadcrumb}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
              <Ionicons name="chevron-back" size={16} color={C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={s.breadcrumbLink}>Quizzes</Text>
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={11} color={C.dimmer} />
            <Text style={s.breadcrumbCurrent} numberOfLines={1}>{quiz.title} Results</Text>
          </View>

          {/* ── PAGE HEADER ── */}
          <View style={s.pageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.pageTitle}>{quiz.title}</Text>
              <Text style={s.pageSub}>
                {quiz.subject ? `${quiz.subject} · ` : ''}{quiz.class || ''} · {submitted} of {total || '?'} students submitted
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={s.headerActions}>
            <TouchableOpacity style={s.btnPrimary} onPress={handleDownloadPDF} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={14} color={C.white} />
              <Text style={s.btnPrimaryText}>Download PDF</Text>
            </TouchableOpacity>
          </View>

          {/* ── KPI CARDS ── */}
          <View style={s.kpiGrid}>
            {KPI_DATA.map((k, i) => (
              <View key={i} style={s.kpiCard}>
                <View style={s.kpiTopRow}>
                  <Text style={s.kpiLabel}>{k.label}</Text>
                  <View style={[s.kpiIconWrap, { backgroundColor: k.iconBg }]}>
                    <Ionicons name={k.icon} size={14} color={k.iconColor} />
                  </View>
                </View>
                <View style={s.kpiValueRow}>
                  <Text style={s.kpiValue}>{k.value}</Text>
                </View>
                <AnimBar pct={k.barPct} color={k.barColor} height={5} delay={i * 120} />
              </View>
            ))}
          </View>

          {/* ── TABLE SECTION ── */}
          <View style={s.tableSection}>

            {/* Filters row */}
            <View style={s.filtersRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[
                  { key: 'grade',   icon: 'options-outline',   label: 'Grade Range' },
                  { key: 'status',  icon: 'time-outline',      label: 'Status'      },
                  { key: 'section', icon: 'grid-outline',      label: 'Section'     },
                ].map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.filterBtn, activeFilter === f.key && s.filterBtnActive]}
                    onPress={() => setActiveFilter(activeFilter === f.key ? null : f.key)}
                    activeOpacity={0.8}>
                    <Ionicons name={f.icon} size={12} color={activeFilter === f.key ? C.accent : C.textMuted} />
                    <Text style={[s.filterBtnText, activeFilter === f.key && { color: C.accent }]}>{f.label}</Text>
                    <Ionicons name="chevron-down" size={11} color={activeFilter === f.key ? C.accent : C.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.showingText}>
                Showing <Text style={s.showingBold}>{filteredStudents.length}</Text> of {(students || []).length}
              </Text>
            </View>

            {/* Table header */}
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2 }]}>STUDENT NAME</Text>
              <Text style={[s.th, { width: 80 }]}>STATUS</Text>
              <Text style={[s.th, { flex: 1.4 }]}>SCORE</Text>
              <Text style={[s.th, { width: 72 }]}>DURATION</Text>
            </View>

            {/* Student rows */}
            {filteredStudents.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: C.textMuted, fontSize: 14 }}>No submissions yet</Text>
              </View>
            ) : (
              filteredStudents.map((student, i) => {
                const sc    = scoreColor(student.percentage ?? Math.round((student.score / student.totalMarks) * 100), C);
                const st    = statusStyle(student.status, C);
                const inits = initials(student.studentName);
                const avatarBg = AVATAR_COLORS[i % AVATAR_COLORS.length][0];
                const isLast = i === filteredStudents.length - 1;

                return (
                  <View
                    key={student.studentId + i}
                    style={[s.tableRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>

                    {/* Avatar + name */}
                    <View style={[s.studentCell, { flex: 2 }]}>
                      <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                        <Text style={s.avatarText}>{inits}</Text>
                      </View>
                      <View>
                        <Text style={s.studentName}>{student.studentName}</Text>
                        <Text style={s.studentId}>ID: {student.studentId}</Text>
                      </View>
                    </View>

                    {/* Status */}
                    <View style={{ width: 80 }}>
                      <View style={[s.badge, { backgroundColor: st.bg }]}>
                        <Text style={[s.badgeText, { color: st.color }]}>{student.status}</Text>
                      </View>
                    </View>

                    {/* Score bar */}
                    <View style={[s.scoreCell, { flex: 1.4 }]}>
                      <Text style={[s.scorePct, { color: sc }]}>{student.score}/{student.totalMarks}</Text>
                      <View style={{ flex: 1 }}>
                        <AnimBar pct={student.totalMarks > 0 ? student.score / student.totalMarks : 0} color={sc} height={6} delay={i * 80} />
                      </View>
                    </View>

                    {/* Duration */}
                    <Text style={[s.duration, { width: 72 }]}>{student.duration || '—'}</Text>

                  </View>
                );
              })
            )}

            {/* Pagination (UI only — server returns all) */}
            <View style={s.pagination}>
              <TouchableOpacity style={[s.pageNav, activePage === 1 && s.pageNavDisabled]} activeOpacity={0.75}
                onPress={() => setActivePage(p => Math.max(1, p - 1))}>
                <Ionicons name="arrow-back" size={13} color={activePage === 1 ? C.dimmer : C.textSecondary} />
                <Text style={[s.pageNavText, activePage === 1 && { color: C.dimmer }]}>Previous</Text>
              </TouchableOpacity>

              <View style={s.pageNumbers}>
                {PAGES.map((p, i) =>
                  p === '...'
                    ? <Text key={i} style={s.pageEllipsis}>...</Text>
                    : (
                      <TouchableOpacity
                        key={i}
                        style={[s.pageNum, activePage === p && s.pageNumActive]}
                        onPress={() => setActivePage(p)}
                        activeOpacity={0.75}>
                        <Text style={[s.pageNumText, activePage === p && s.pageNumTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    )
                )}
              </View>

              <TouchableOpacity style={s.pageNav} activeOpacity={0.75}
                onPress={() => setActivePage(p => Math.min(12, p + 1))}>
                <Text style={s.pageNavText}>Next</Text>
                <Ionicons name="arrow-forward" size={13} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

          </View>

          {/* ── FOOTER ── */}
          <View style={s.footer}>
            <Text style={s.footerCopy}>© 2024 UniVerse LMS. All rights reserved.</Text>
            <View style={s.footerLinks}>
              {['Support', 'Privacy Policy', 'Terms of Service'].map((l, i) => (
                <TouchableOpacity key={i} activeOpacity={0.75}>
                  <Text style={s.footerLink}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const makeS = (C) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  backBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border2, alignItems: 'center', justifyContent: 'center' },
  breadcrumbLink:    { fontSize: 11.5, color: C.textMuted },
  breadcrumbCurrent: { fontSize: 11.5, color: C.textPrimary, flex: 1 },
  pageHeader: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  pageTitle: { fontSize: W > 500 ? 34 : 28, fontWeight: '900', color: C.textPrimary, fontFamily: FONTS.heading, lineHeight: W > 500 ? 40 : 34, marginBottom: 6 },
  pageSub: { fontSize: 12.5, color: C.textMuted, lineHeight: 19, maxWidth: 480 },
  headerActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  btnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border2, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnOutlineText: { fontSize: 12.5, fontWeight: '600', color: C.textPrimary },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  btnPrimaryText: { fontSize: 12.5, fontWeight: '700', color: C.white },
  kpiGrid: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, gap: 12 },
  kpiCard: { flex: 1, height: 110, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, justifyContent: 'space-between' },
  kpiTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  kpiLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.0, color: C.textMuted, textTransform: 'uppercase' },
  kpiIconWrap: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  kpiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '900', color: C.textPrimary, fontFamily: FONTS.heading, lineHeight: 26 },
  kpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  kpiDelta:    { fontSize: 10, fontWeight: '600' },
  kpiDeltaFlat: { fontSize: 10, fontWeight: '500', color: C.textMuted },
  tableSection: { marginHorizontal: 20, marginTop: 16, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  filtersRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, gap: 10 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border2, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  filterBtnActive: { borderColor: C.accent, backgroundColor: 'rgba(92,110,248,0.1)' },
  filterBtnText:   { fontSize: 12, fontWeight: '500', color: C.textPrimary },
  showingText: { fontSize: 12, color: C.textMuted, flexShrink: 0 },
  showingBold: { fontWeight: '700', color: C.textPrimary },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  th: { fontSize: 10, fontWeight: '700', letterSpacing: 0.9, color: C.textMuted, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 8 },
  studentCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  studentName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  studentId:   { fontSize: 10.5, color: C.textMuted, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  scoreCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scorePct: { fontSize: 13, fontWeight: '700', width: 48, flexShrink: 0 },
  duration: { fontSize: 12.5, color: C.textMuted },
  actionLink: { fontSize: 12, fontWeight: '600', color: C.accent },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.border },
  pageNav:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pageNavDisabled: { opacity: 0.35 },
  pageNavText:     { fontSize: 12.5, fontWeight: '500', color: C.textSecondary },
  pageNumbers:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageNum: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  pageNumActive: { backgroundColor: C.accent },
  pageNumText:       { fontSize: 12.5, fontWeight: '500', color: C.textMuted },
  pageNumTextActive: { color: C.white, fontWeight: '700' },
  pageEllipsis:      { fontSize: 12.5, color: C.dimmer, paddingHorizontal: 2 },
  footer: { marginTop: 24, paddingHorizontal: 20, paddingBottom: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16, gap: 10 },
  footerCopy:  { fontSize: 11.5, color: C.textMuted },
  footerLinks: { flexDirection: 'row', gap: 16 },
  footerLink:  { fontSize: 11.5, color: C.textMuted },
});