// QuizStudentAnalyticsScreen.js — Campus360
// Teacher view: Quiz Results & Student Analytics (matches screenshot design)

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, Dimensions, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: W } = Dimensions.get('window');

/* ─── Theme ──────────────────────────────────────────────────────────────── */
const C = {
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
const FONTS = { heading: Platform.OS === 'ios' ? 'Georgia' : 'serif' };

/* ─── Seed Data ──────────────────────────────────────────────────────────── */
const QUIZ_META = {
  title:   'Midterm Data Structures',
  course:  'CS201 - Spring 2024',
  desc:    'Analysis of performance for CS201 - Spring 2024. Includes automated grading and time-tracking metrics.',
};

const KPI_DATA = [
  { label: 'CLASS AVERAGE', value: '76%', delta: '+2.5%',  deltaUp: true,  barPct: 0.76, barColor: C.accent,  barEnd: '#818CF8', icon: 'bar-chart-outline',   iconColor: C.accent,  iconBg: 'rgba(92,110,248,0.15)'  },
  { label: 'HIGHEST SCORE', value: '98%', delta: '0% change', deltaUp: null, barPct: 0.98, barColor: C.orange, barEnd: '#FBBF24', icon: 'trophy-outline',       iconColor: C.orange,  iconBg: 'rgba(245,158,11,0.15)'  },
  { label: 'PARTICIPATION', value: '94%', delta: '-1.2%',  deltaUp: false, barPct: 0.94, barColor: C.purple,  barEnd: '#C4B5FD', icon: 'people-outline',       iconColor: C.purple,  iconBg: 'rgba(167,139,250,0.15)' },
];

const STUDENTS = [
  { name: 'Alex Rivera',   id: '#44291', status: 'On Time',   statusType: 'green',  score: 96, totalMarks: 100, duration: '42m 15s',
    avatarBg: ['#667EEA','#764BA2'] },
  { name: 'Sarah Jenkins', id: '#44102', status: 'Late (+2h)', statusType: 'orange', score: 82, totalMarks: 100, duration: '58m 04s',
    avatarBg: ['#F093FB','#F5576C'] },
  { name: 'Michael Chen',  id: '#44381', status: 'On Time',   statusType: 'green',  score: 64, totalMarks: 100, duration: '35m 22s',
    avatarBg: ['#4FACFE','#00F2FE'] },
  { name: 'Emily Watson',  id: '#44512', status: 'Flagged',   statusType: 'red',    score: 45, totalMarks: 100, duration: '1h 12m',
    avatarBg: ['#FA709A','#FEE140'] },
];

const PAGES = [1, 2, 3, '...', 12];

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const scoreColor = (s) => s >= 80 ? C.green : s >= 60 ? C.accent : s >= 45 ? C.orange : C.red;

const statusStyle = (type) => ({
  green:  { bg: C.greenSoft,  color: C.green  },
  orange: { bg: C.orangeSoft, color: C.orange },
  red:    { bg: C.redSoft,    color: C.red    },
}[type] ?? { bg: C.border, color: C.textMuted });

const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

/* ─── Animated Bar ───────────────────────────────────────────────────────── */
const AnimBar = ({ pct, color, height = 5, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 900, delay, useNativeDriver: false }).start();
  }, []);
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

  const quizParam = route.params?.quiz ?? {};
  const meta = {
    title:  quizParam.title  ?? QUIZ_META.title,
    course: quizParam.course ?? QUIZ_META.course,
    desc:   quizParam.desc   ?? QUIZ_META.desc,
  };

  const [activePage,   setActivePage]   = useState(1);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [activeFilter, setActiveFilter] = useState(null); // 'grade' | 'status' | 'section'

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  const filteredStudents = STUDENTS.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.includes(searchQuery)
  );

  /* ── Download PDF ── */
  const handleDownloadPDF = async () => {
    try {
      const Print   = require('expo-print');
      const Sharing = require('expo-sharing');

      const date = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
      });

      const tableRows = STUDENTS.map((s, i) => {
        const scorePct = Math.round((s.score / s.totalMarks) * 100);
        const barColor = scorePct >= 80 ? '#22C55E' : scorePct >= 60 ? '#5C6EF8' : scorePct >= 45 ? '#F59E0B' : '#EF4444';
        const statusColor = s.statusType === 'green' ? '#22C55E' : s.statusType === 'orange' ? '#F59E0B' : '#EF4444';
        const statusBg    = s.statusType === 'green' ? '#dcfce7' : s.statusType === 'orange' ? '#fef9c3' : '#fee2e2';
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8faff';
        return `
          <tr style="background:${rowBg};">
            <td style="padding:10px 14px; text-align:center; color:#6b7299; font-weight:600;">${i + 1}</td>
            <td style="padding:10px 14px;">
              <div style="font-weight:700; color:#1e2336; font-size:13px;">${s.name}</div>
              <div style="color:#6b7299; font-size:11px; margin-top:2px;">ID: ${s.id}</div>
            </td>
            <td style="padding:10px 14px; text-align:center;">
              <span style="background:${statusBg}; color:${statusColor}; padding:3px 10px; border-radius:5px; font-size:11px; font-weight:700;">${s.status}</span>
            </td>
            <td style="padding:10px 14px; text-align:center;">
              <div style="font-weight:800; font-size:15px; color:${barColor};">${s.score}/${s.totalMarks}</div>
              <div style="background:#e5e7eb; border-radius:3px; height:5px; margin-top:4px; overflow:hidden;">
                <div style="width:${scorePct}%; height:5px; background:${barColor}; border-radius:3px;"></div>
              </div>
            </td>
            <td style="padding:10px 14px; text-align:center; color:#6b7299; font-size:12px;">${s.duration}</td>
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
            .kpi-delta { font-size:11px; font-weight:600; margin-top:3px; }
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
                <div class="logo">📚 Campus360 LMS</div>
                <div class="badge">✓ COMPLETED</div>
              </div>
              <div class="title">${meta.title}</div>
              <div class="subtitle">${meta.desc}</div>
              <div class="meta-row">
                <div class="meta-item">📅 <strong>${date}</strong></div>
                <div class="meta-item">📖 <strong>${meta.course}</strong></div>
                <div class="meta-item">👥 <strong>${STUDENTS.length} Students</strong></div>
              </div>
            </div>

            <div class="kpi-row">
              <div class="kpi">
                <div class="kpi-label">Class Average</div>
                <div class="kpi-value" style="color:#5C6EF8;">76%</div>
                <div class="kpi-delta" style="color:#22C55E;">↑ +2.5%</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Highest Score</div>
                <div class="kpi-value" style="color:#F59E0B;">98%</div>
                <div class="kpi-delta" style="color:#6b7299;">0% change</div>
              </div>
              <div class="kpi">
                <div class="kpi-label">Participation</div>
                <div class="kpi-value" style="color:#A78BFA;">94%</div>
                <div class="kpi-delta" style="color:#EF4444;">↓ -1.2%</div>
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
              <div class="footer-left">Generated on ${date} · Campus360 LMS</div>
              <div class="footer-right">Total Students: ${STUDENTS.length}</div>
            </div>
          </div>
        </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });

      const fileName = `${meta.title.replace(/\s+/g, '_')}_Results.pdf`;
      const FileSystem = require('expo-file-system');
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
        Alert.alert('Saved', `PDF saved to: ${pdfUri}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Download Failed', 'Could not generate PDF. Please try again.');
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── BREADCRUMB ──────────────────────────────────────────────── */}
          <View style={s.breadcrumb}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.75}>
              <Ionicons name="chevron-back" size={16} color={C.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={s.breadcrumbLink}>Quizzes</Text>
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={11} color={C.dimmer} />
            <Text style={s.breadcrumbCurrent}>Midterm Data Structures Results</Text>
          </View>

          {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
          <View style={s.pageHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.pageTitle}>{meta.title}</Text>
              <Text style={s.pageSub}>{meta.desc}</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={s.headerActions}>
            <TouchableOpacity style={s.btnPrimary} onPress={handleDownloadPDF} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={14} color={C.white} />
              
            </TouchableOpacity>
          </View>

          {/* ── KPI CARDS ───────────────────────────────────────────────── */}
          <View style={s.kpiGrid}>
            {KPI_DATA.map((k, i) => (
              <View key={i} style={s.kpiCard}>
                {/* label + icon */}
                <View style={s.kpiTopRow}>
                  <Text style={s.kpiLabel}>{k.label}</Text>
                  <View style={[s.kpiIconWrap, { backgroundColor: k.iconBg }]}>
                    <Ionicons name={k.icon} size={14} color={k.iconColor} />
                  </View>
                </View>

                {/* value + delta */}
                <View style={s.kpiValueRow}>
                  <Text style={s.kpiValue}>{k.value}</Text>
                  {k.deltaUp === null
                    ? <Text style={s.kpiDeltaFlat}>{k.delta}</Text>
                    : (
                      <View style={s.kpiDeltaRow}>
                        <Ionicons
                          name={k.deltaUp ? 'trending-up' : 'trending-down'}
                          size={12}
                          color={k.deltaUp ? C.green : C.red}
                        />
                        <Text style={[s.kpiDelta, { color: k.deltaUp ? C.green : C.red }]}>{k.delta}</Text>
                      </View>
                    )
                  }
                </View>

                {/* bar */}
                <AnimBar pct={k.barPct} color={k.barColor} height={5} delay={i * 120} />
              </View>
            ))}
          </View>

          {/* ── TABLE SECTION ───────────────────────────────────────────── */}
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
                Showing <Text style={s.showingBold}>48</Text> of 52 Students
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
            {filteredStudents.map((student, i) => {
              const sc    = scoreColor(student.score);
              const st    = statusStyle(student.statusType);
              const inits = initials(student.name);
              const isLast = i === filteredStudents.length - 1;

              return (
                <View
                  key={i}
                  style={[s.tableRow, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}>

                  {/* Avatar + name */}
                  <View style={[s.studentCell, { flex: 2 }]}>
                    <View style={[s.avatar, { backgroundColor: student.avatarBg[0] }]}>
                      <Text style={s.avatarText}>{inits}</Text>
                    </View>
                    <View>
                      <Text style={s.studentName}>{student.name}</Text>
                      <Text style={s.studentId}>ID: {student.id}</Text>
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
                      <AnimBar pct={student.score / student.totalMarks} color={sc} height={6} delay={i * 80} />
                    </View>
                  </View>

                  {/* Duration */}
                  <Text style={[s.duration, { width: 72 }]}>{student.duration}</Text>

                </View>
              );
            })}

            {/* Pagination */}
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

          </View>{/* /tableSection */}

          {/* ── FOOTER ──────────────────────────────────────────────────── */}
          <View style={s.footer}>
            <Text style={s.footerCopy}>© 2024 Campus360 LMS. All rights reserved.</Text>
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
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  /* Breadcrumb */
  breadcrumb: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6,
  },
  backBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: C.surfaceEl,
    borderWidth: 1, borderColor: C.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  breadcrumbLink:    { fontSize: 11.5, color: C.textMuted },
  breadcrumbCurrent: { fontSize: 11.5, color: C.textPrimary },

  /* Page header */
  pageHeader: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6,
  },
  pageTitle: {
    fontSize: W > 500 ? 34 : 28,
    fontWeight: '900',
    color: C.textPrimary,
    fontFamily: FONTS.heading,
    lineHeight: W > 500 ? 40 : 34,
    marginBottom: 6,
  },
  pageSub: {
    fontSize: 12.5, color: C.textMuted, lineHeight: 19, maxWidth: 480,
  },

  /* Header action buttons */
  headerActions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6,
  },
  btnOutline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surfaceEl, borderWidth: 1, borderColor: C.border2,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  btnOutlineText: { fontSize: 12.5, fontWeight: '600', color: C.textPrimary },
  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.accent,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  btnPrimaryText: { fontSize: 12.5, fontWeight: '700', color: C.white },

  /* KPI grid */
  kpiGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6,
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    height: 110,
    backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 12,
    justifyContent: 'space-between',
  },
  kpiTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  kpiLabel: {
    fontSize: 9, fontWeight: '700', letterSpacing: 1.0,
    color: C.textMuted, textTransform: 'uppercase',
  },
  kpiIconWrap: {
    width: 24, height: 24, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center',
  },
  kpiValueRow: {
    flexDirection: 'row', alignItems: 'baseline',
    gap: 6, marginBottom: 8,
  },
  kpiValue: {
    fontSize: 22, fontWeight: '900',
    color: C.textPrimary, fontFamily: FONTS.heading, lineHeight: 26,
  },
  kpiDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  kpiDelta:    { fontSize: 10, fontWeight: '600' },
  kpiDeltaFlat: { fontSize: 10, fontWeight: '500', color: C.textMuted },

  /* Table section */
  tableSection: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: C.surface,
    borderRadius: 16, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },

  /* Filters */
  filtersRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
    gap: 10,
  },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.surfaceEl,
    borderWidth: 1, borderColor: C.border2,
    borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7,
  },
  filterBtnActive: { borderColor: C.accent, backgroundColor: 'rgba(92,110,248,0.1)' },
  filterBtnText:   { fontSize: 12, fontWeight: '500', color: C.textPrimary },
  showingText: { fontSize: 12, color: C.textMuted, flexShrink: 0 },
  showingBold: { fontWeight: '700', color: C.textPrimary },

  /* Table header */
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  th: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.9,
    color: C.textMuted, textTransform: 'uppercase',
  },

  /* Table row */
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14, gap: 8,
  },

  /* Student cell */
  studentCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  studentName: { fontSize: 13, fontWeight: '600', color: C.textPrimary },
  studentId:   { fontSize: 10.5, color: C.textMuted, marginTop: 1 },

  /* Badge */
  badge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '600' },

  /* Score */
  scoreCell: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  scorePct: {
    fontSize: 13, fontWeight: '700', width: 48, flexShrink: 0,
  },

  /* Duration */
  duration: { fontSize: 12.5, color: C.textMuted },

  /* Action */
  actionLink: { fontSize: 12, fontWeight: '600', color: C.accent },

  /* Pagination */
  pagination: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  pageNav:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pageNavDisabled: { opacity: 0.35 },
  pageNavText:     { fontSize: 12.5, fontWeight: '500', color: C.textSecondary },
  pageNumbers:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageNum: {
    width: 28, height: 28, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  pageNumActive: { backgroundColor: C.accent },
  pageNumText:       { fontSize: 12.5, fontWeight: '500', color: C.textMuted },
  pageNumTextActive: { color: C.white, fontWeight: '700' },
  pageEllipsis:      { fontSize: 12.5, color: C.dimmer, paddingHorizontal: 2 },

  /* Footer */
  footer: {
    marginTop: 24, paddingHorizontal: 20, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: C.border,
    paddingTop: 16,
    gap: 10,
  },
  footerCopy:  { fontSize: 11.5, color: C.textMuted },
  footerLinks: { flexDirection: 'row', gap: 16 },
  footerLink:  { fontSize: 11.5, color: C.textMuted },
});