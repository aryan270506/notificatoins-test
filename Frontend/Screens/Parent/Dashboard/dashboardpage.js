/**
 * UniVerse – Dashboardpage
 * Consumes ThemeContext from Parentmaindashboard — no local theme state here.
 * Self-contained navigation: renders Message component when activeKey === 'Message'
 *
 * FIXED: Assignment stats (total, submitted, pending) are now fetched from the
 * real /assignments API using the student's year + division, mirroring Assignment.js.
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Import shared context from parent ────────────────────────────────────────
import { useTheme } from './Dashboard';
import Message from '../Message/Message';
import axiosInstance from '../../../Src/Axios';

// ─── Year code normalisation (mirrors Assignment.js) ─────────────────────────
const YEAR_REVERSE = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
const YEAR_MAP     = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
const toApiYear = (y) => {
  if (!y) return null;
  const up = String(y).trim().toUpperCase();
  return YEAR_REVERSE[up] ?? up;
};

// ─── Calculate overall attendance percentage from real data ───────────────────
function calculateOverallAttendance(attendanceData = []) {
  if (attendanceData.length === 0) return 0;
  const totalAttended = attendanceData.reduce((sum, item) => sum + item.attended, 0);
  const totalClasses  = attendanceData.reduce((sum, item) => sum + item.total,    0);
  return totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
}

// ─── Data Helper ──────────────────────────────────────────────────────────────
function pctColor(p, C) {
  if (p >= 90) return C.teal;
  if (p >= 80) return C.blueLight;
  return C.orange;
}

const BREAKPOINT = 768;

// ─── Greeting helper ──────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning',   icon: '☀️' };
  if (h < 17) return { text: 'Good Afternoon', icon: '🌤️' };
  return         { text: 'Good Evening',   icon: '🌙' };
}

// ─── Timetable slot times ─────────────────────────────────────────────────────
const SLOT_TIMES = {
  t1: { start: '10:30', end: '11:30', label: '10:30 AM – 11:30 AM' },
  t2: { start: '11:30', end: '12:30', label: '11:30 AM – 12:30 PM' },
  t3: { start: '13:15', end: '14:15', label: '1:15 PM – 2:15 PM'   },
  t4: { start: '14:15', end: '15:15', label: '2:15 PM – 3:15 PM'   },
  t5: { start: '15:30', end: '16:30', label: '3:30 PM – 4:30 PM'   },
  t6: { start: '16:30', end: '17:30', label: '4:30 PM – 5:30 PM'   },
};
const DAYS_MAP = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function getNextLecture(timetable) {
  if (!timetable) return null;
  const now      = new Date();
  const todayName = DAYS_MAP[now.getDay()];
  const dayData  = timetable[todayName];
  if (!dayData) return null;

  const nowMins = now.getHours() * 60 + now.getMinutes();
  const slots   = Object.keys(SLOT_TIMES).sort();
  for (const slotId of slots) {
    const slot = dayData[slotId];
    if (!slot) continue;
    const [sh, sm] = SLOT_TIMES[slotId].start.split(':').map(Number);
    const [eh, em] = SLOT_TIMES[slotId].end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins   = eh * 60 + em;
    if (endMins > nowMins) {
      const minsUntil = Math.max(0, startMins - nowMins);
      return {
        subject:     slot.subject,
        time:        SLOT_TIMES[slotId].label,
        room:        slot.room        || '—',
        teacherName: slot.teacherName || '',
        minsUntil,
        isOngoing: nowMins >= startMins,
      };
    }
  }
  return null;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, badge, badgeColor, label, value, sub, progress, progressColor }) {
  const { C } = useTheme();
  const s = makeStyles(C);
  return (
    <View style={s.statCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={s.statIcon}><Text style={{ fontSize: 18 }}>{icon}</Text></View>
        {badge && <Text style={[s.badge, { color: badgeColor }]}>{badge}</Text>}
      </View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
      {progress !== undefined && (
        <View style={s.progBg}>
          <View style={[s.progFill, { width: `${progress}%`, backgroundColor: progressColor }]} />
        </View>
      )}
    </View>
  );
}

// ─── Desktop Layout ───────────────────────────────────────────────────────────
function DesktopContent({
  onNavigate, attendance = [], selectedType = 'Subjects', onTypeChange,
  studentInfo = {}, nextLecture = null, parentName = '',
  totalAssignments = 0, totalSubmitted = 0, totalPending = 0, submissionPct = 0,
}) {
  const { C, toggleTheme } = useTheme();
  const s = makeStyles(C);
  const overallAttendance = calculateOverallAttendance(attendance);
  const greeting = getGreeting();

  const studentName   = studentInfo.name   || 'Loading...';
  const studentBranch = studentInfo.branch || '';
  const studentYear   = studentInfo.year   || '';
  const studentPrn    = studentInfo.prn    || '';
  const semester      = studentYear ? `Semester ${Number(studentYear) * 2}` : '';

  return (
    <View style={{ flex: 1 }}>
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={s.pageTitle}>
            {greeting.icon} {greeting.text}{parentName ? `, ${parentName}` : ''}!
          </Text>
          <View style={s.enrollBadge}>
            <View style={s.enrollDot} />
            <Text style={s.enrollTxt}>Active Enrollment</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={s.topIcon} onPress={toggleTheme} activeOpacity={0.75}>
            <Text style={{ fontSize: 18 }}>{C.mode === 'dark' ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.bodyDesktop} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <Text style={{ fontSize: 44 }}>🧑‍💻</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.profileName}>{studentName}</Text>
            <Text style={s.profileSub}>
              📋  {studentBranch}
              {studentYear ? ` | Year ${studentYear}` : ''}
              {studentPrn  ? ` | ${studentPrn}`       : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {semester ? (
                <View style={s.chip}><Text style={s.chipTxt}>{semester}</Text></View>
              ) : null}
            </View>
          </View>
          <View style={{ gap: 10, width: 220 }}>
            <TouchableOpacity
              style={s.btnWhite}
              activeOpacity={0.85}
              onPress={() => onNavigate('Message')}
            >
              <Text style={s.btnWhiteTxt}>💬  Contact Advisor</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stat Row — now uses real assignment data ── */}
        <View style={s.statRow}>
          <StatCard
            icon="📅"
            badge={overallAttendance > 85 ? '▲ +2%' : '▼ -2%'}
            badgeColor={overallAttendance > 85 ? C.teal : C.orange}
            label="Total Attendance"
            value={`${overallAttendance}%`}
            progress={overallAttendance}
            progressColor={C.blueLight}
          />
          <StatCard
            icon="📋"
            label="Total Assignments"
            value={String(totalAssignments)}
            sub="Semester-to-date count"
          />
          <StatCard
            icon="✅"
            badge="✔ Completed"
            badgeColor={C.teal}
            label="Submitted"
            value={String(totalSubmitted)}
            progress={submissionPct}
            progressColor={C.teal}
          />
          <StatCard
            icon="⏰"
            badge="Action Required"
            badgeColor={C.orange}
            label="Pending Tasks"
            value={String(totalPending)}
          />
        </View>

        {/* Bottom Row */}
        <View style={s.bottomRow}>
          {/* Attendance Trends */}
          <View style={[s.card, { flex: 3 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View>
                <Text style={s.cardTitle}>Attendance Trends</Text>
                <Text style={s.cardSub}>Lecture / Practical</Text>
                <Text style={s.cardSub}>Weekly semester engagement levels</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['Subjects', 'Labs'].map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => onTypeChange(type)}
                    style={[
                      s.toggleBtn,
                      selectedType === type && s.toggleBtnActive,
                      { backgroundColor: selectedType === type ? C.accent : C.cardBorder },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.toggleBtnText, { color: selectedType === type ? C.white : C.sub }]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.divider} />
            {attendance.length > 0 ? (
              attendance.map((row, i) => (
                <View key={i} style={[s.tableRow, i === attendance.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.tableSubject}>{row.subject}</Text>
                  <Text style={s.tableScore}>{row.attended}/{row.total}</Text>
                  <Text style={[s.tablePct, { color: pctColor(row.pct, C) }]}>{row.pct}%</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: C.sub, textAlign: 'center', paddingVertical: 14 }}>
                No attendance data available
              </Text>
            )}
          </View>

          {/* Next Lecture */}
          <View style={[s.card, { flex: 1.3, minWidth: 220 }]}>
            <Text style={s.cardTitle}>⏰  Next Lecture</Text>
            <Text style={[s.cardSub, { marginBottom: 14 }]}>Today's Schedule</Text>
            {nextLecture ? (
              <View style={s.lectureBox}>
                <Text style={s.urgentTxtLg}>
                  {nextLecture.isOngoing
                    ? 'ONGOING NOW'
                    : `UPCOMING IN ${nextLecture.minsUntil} MIN`}
                </Text>
                <Text style={s.lectureNameLg}>{nextLecture.subject}</Text>
                <View style={{ gap: 8, marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text>🕙</Text>
                    <Text style={s.lectureDetailTxt}>{nextLecture.time}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text>📍</Text>
                    <View style={s.hallBadge}>
                      <Text style={s.hallTxt}>{nextLecture.room}</Text>
                    </View>
                  </View>
                  {nextLecture.teacherName ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text>👩‍🏫</Text>
                      <Text style={s.lectureDetailTxt}>{nextLecture.teacherName}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : (
              <View style={[s.lectureBox, { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 }]}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
                  No Upcoming Classes
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Enjoy your free time today!
                </Text>
              </View>
            )}
            <TouchableOpacity style={s.btnWhite} activeOpacity={0.85} onPress={() => onNavigate('schedule')}>
              <Text style={s.btnWhiteTxt}>View Full Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Mobile Layout ────────────────────────────────────────────────────────────
function MobileContent({
  onNavigate, attendance = [], selectedType = 'Subjects', onTypeChange,
  studentInfo = {}, nextLecture = null, parentName = '',
  totalAssignments = 0, totalSubmitted = 0, totalPending = 0,
}) {
  const { C, toggleTheme } = useTheme();
  const s = makeStyles(C);
  const overallAttendance = calculateOverallAttendance(attendance);
  const greeting = getGreeting();

  const studentName   = studentInfo.name   || 'Loading...';
  const studentBranch = studentInfo.branch || '';
  const studentYear   = studentInfo.year   || '';
  const studentPrn    = studentInfo.prn    || '';
  const semester      = studentYear ? `Sem ${Number(studentYear) * 2}` : '';

  return (
    <ScrollView contentContainerStyle={s.bodyMobile} showsVerticalScrollIndicator={false}>
      {/* Sub-bar */}
      <View style={s.mobileSubBar}>
        <Text style={s.mobileSubTitle}>
          {greeting.icon} {greeting.text}{parentName ? `, ${parentName}` : ''}!
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={s.mobileThemeToggle} onPress={toggleTheme} activeOpacity={0.75}>
            <Text style={{ fontSize: 16 }}>{C.mode === 'dark' ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
          <View style={s.enrollBadgeSm}>
            <View style={s.enrollDot} />
            <Text style={s.enrollTxtSm}>Active Enrollment</Text>
          </View>
        </View>
      </View>

      {/* Profile */}
      <View style={s.mobileProfile}>
        <View style={s.mobileAvatar}>
          <Text style={{ fontSize: 32 }}>🧑‍💻</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.mobileName}>{studentName}</Text>
          <Text style={s.mobileSub}>{studentBranch}{studentYear ? ` • Year ${studentYear}` : ''}</Text>
          <Text style={[s.mobileSub, { color: C.muted, fontSize: 11, marginTop: 1 }]}>{studentPrn}</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {semester ? (
              <View style={s.chipSm}><Text style={s.chipSmTxt}>{semester}</Text></View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={[s.btnWhite, { flex: 1 }]}
          activeOpacity={0.85}
          onPress={() => onNavigate('Message')}
        >
          <Text style={[s.btnWhiteTxt, { fontSize: 12 }]}>💬 Advisor</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stat Grid — real assignment values ── */}
      <View style={s.mobileStatGrid}>
        {[
          { icon: '📅', label: 'Attendance',  value: `${overallAttendance}%`,     badge: overallAttendance > 85 ? '▲+2%' : '▼-2%', bc: overallAttendance > 85 ? C.teal : C.orange },
          { icon: '📋', label: 'Assignments', value: String(totalAssignments),     badge: 'Total',  bc: C.blueLight },
          { icon: '✅', label: 'Submitted',   value: String(totalSubmitted),       badge: 'Done',   bc: C.teal      },
          { icon: '⏰', label: 'Pending',     value: String(totalPending),         badge: 'Action', bc: C.orange    },
        ].map((sc, i) => (
          <View key={i} style={s.mobileStatCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 20 }}>{sc.icon}</Text>
              <Text style={[s.badge, { color: sc.bc, fontSize: 10 }]}>{sc.badge}</Text>
            </View>
            <Text style={s.mobileStatValue}>{sc.value}</Text>
            <Text style={s.mobileStatLabel}>{sc.label}</Text>
          </View>
        ))}
      </View>

      {/* Next Lecture */}
      <View style={s.mobileLectureCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={s.cardTitle}>⏰  Next Lecture</Text>
          {nextLecture ? (
            <View style={s.urgentBadge}>
              <Text style={s.urgentBadgeTxt}>
                {nextLecture.isOngoing ? 'NOW' : `${nextLecture.minsUntil} MIN`}
              </Text>
            </View>
          ) : null}
        </View>
        {nextLecture ? (
          <>
            <Text style={s.mobileLectureName}>{nextLecture.subject}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              <Text style={s.lectureDetailTxt}>🕙 {nextLecture.time}</Text>
              <Text style={s.lectureDetailTxt}>📍 {nextLecture.room}</Text>
              {nextLecture.teacherName
                ? <Text style={s.lectureDetailTxt}>👩‍🏫 {nextLecture.teacherName}</Text>
                : null}
            </View>
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 16 }}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>📭</Text>
            <Text style={{ color: C.white, fontSize: 14, fontWeight: '700' }}>No Upcoming Classes</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Enjoy your free time today!</Text>
          </View>
        )}
        <TouchableOpacity style={[s.btnWhite, { marginTop: 14 }]} activeOpacity={0.85} onPress={() => onNavigate('schedule')}>
          <Text style={s.btnWhiteTxt}>View Full Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Attendance Trends */}
      <View style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <View>
            <Text style={s.cardTitle}>Attendance Trends</Text>
            <Text style={[s.cardSub, { marginTop: 2 }]}>Lecture / Practical</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {['Subjects', 'Labs'].map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => onTypeChange(type)}
                style={[
                  s.toggleBtn, s.toggleBtnSmall,
                  selectedType === type && s.toggleBtnActive,
                  { backgroundColor: selectedType === type ? C.accent : C.cardBorder },
                ]}
                activeOpacity={0.7}
              >
                <Text style={[s.toggleBtnText, s.toggleBtnTextSmall, { color: selectedType === type ? C.white : C.sub }]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {attendance.length > 0 ? (
          attendance.map((row, i) => (
            <View key={i}>
              <View style={s.mobileAttRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.attSubject}>{row.subject}</Text>
                  <View style={s.attBarBg}>
                    <View style={[s.attBarFill, { width: `${row.pct}%`, backgroundColor: pctColor(row.pct, C) }]} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 12, minWidth: 60 }}>
                  <Text style={[s.tablePct, { color: pctColor(row.pct, C) }]}>{row.pct}%</Text>
                  <Text style={s.cardSub}>{row.attended}/{row.total}</Text>
                </View>
              </View>
              {i < attendance.length - 1 && <View style={s.divider} />}
            </View>
          ))
        ) : (
          <Text style={{ color: C.sub, textAlign: 'center', paddingVertical: 14 }}>
            No attendance data available
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function Dashboardpage({ setActiveKey }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= BREAKPOINT;
  const { C } = useTheme();

  // ── Attendance state ───────────────────────────────────────────────────────
  const [attendanceData,      setAttendanceData]      = useState([]);
  const [subjectAttendanceData, setSubjectAttendanceData] = useState([]);
  const [labAttendanceData,   setLabAttendanceData]   = useState([]);
  const [selectedType,        setSelectedType]        = useState('Subjects');
  const [loading,             setLoading]             = useState(true);
  const [studentInfo,         setStudentInfo]         = useState({});
  const [nextLecture,         setNextLecture]         = useState(null);
  const [parentName,          setParentName]          = useState('');

  // ── Assignment state (new) ─────────────────────────────────────────────────
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [totalSubmitted,   setTotalSubmitted]   = useState(0);
  const [totalPending,     setTotalPending]     = useState(0);
  const [submissionPct,    setSubmissionPct]    = useState(0);

  // ── Internal navigation ────────────────────────────────────────────────────
  const [activeScreen, setActiveScreen] = useState('dashboard');

  useEffect(() => {
    fetchParentData();
  }, []);

  // ── Fetch assignments for the child (mirrors Assignment.js logic) ──────────
  const fetchAssignmentStats = async (student) => {
    if (!student) return;
    try {
      const studentMongoId = student._id;
      const rawYear        = student.year  ?? student.class    ?? null;
      const rawDivision    = student.division ?? student.div   ?? student.section ?? null;
      const apiYear        = toApiYear(rawYear);
      const apiDiv         = rawDivision ? String(rawDivision).trim().toUpperCase() : null;

      // Fetch ALL assignments then filter client-side (same strategy as Assignment.js)
      const res = await axiosInstance.get('/assignments').catch(() => null);
      if (!res?.data?.success) return;

      const all = res.data.data ?? [];

      // Normalise and match by year + division
      const normYear = apiYear ? (YEAR_MAP[apiYear] ?? apiYear).toUpperCase() : null;
      const visible  = all.filter(a => {
        if (a.status !== 'ACTIVE' && a.status !== 'APPROVED') return false;
        const aYear = a.year     ? (YEAR_MAP[a.year] ?? a.year).toUpperCase()         : null;
        const aDiv  = a.division ? String(a.division).trim().toUpperCase()            : null;
        const yearMatch = !normYear || aYear === normYear;
        const divMatch  = !apiDiv   || aDiv  === apiDiv;
        return yearMatch && divMatch;
      });

      // Count submissions where this student is the submitter
      const sid        = String(studentMongoId ?? '');
      const submitted  = visible.filter(a =>
        (a.submissions ?? []).some(s => String(s.studentId) === sid)
      ).length;
      const total      = visible.length;
      const pending    = total - submitted;
      const pct        = total === 0 ? 0 : Math.round((submitted / total) * 100);

      setTotalAssignments(total);
      setTotalSubmitted(submitted);
      setTotalPending(pending);
      setSubmissionPct(pct);
    } catch (err) {
      console.log('[Dashboardpage] Assignment fetch error:', err.message);
    }
  };

  // ── Main data fetch ────────────────────────────────────────────────────────
  const fetchParentData = async () => {
    try {
      setLoading(true);
      const parentId   = await AsyncStorage.getItem('parentId') || await AsyncStorage.getItem('userId');
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) setParentName(storedName);
      if (!parentId) {
        console.log('No parentId found in storage');
        return;
      }

      // Fetch child info + subjects + timetable in parallel
      const [childRes, subjectsRes, ttRes] = await Promise.all([
        axiosInstance.get(`/parents/child-info/${parentId}`).catch(() => null),
        axiosInstance.get(`/parents/subjects/${parentId}`).catch(() => null),
        axiosInstance.get(`/timetable/parent/${parentId}`).catch(() => null),
      ]);

      const student = childRes?.data?.success ? childRes.data.student : null;
      if (student) setStudentInfo(student);

      const fetchedSubjects = subjectsRes?.data?.subjects || student?.subjects || [];
      const fetchedLabs     = subjectsRes?.data?.labs     || student?.labs     || [];

      // Fetch attendance
      const studentMongoId = student?._id;
      if (studentMongoId) {
        const attRes = await axiosInstance.get(`/attendance/student/${studentMongoId}`).catch(() => null);
        if (attRes?.data?.success && attRes.data.subjectSummary) {
          const attMap = {};
          for (const s of attRes.data.subjectSummary) {
            attMap[s.subject.toLowerCase()] = s;
          }
          const subjectRows = fetchedSubjects.map(name => {
            const real = attMap[name.toLowerCase()];
            return {
              subject:  name,
              attended: real ? real.present     : 0,
              total:    real ? real.total        : 0,
              pct:      real ? real.percentage   : 0,
            };
          });
          const labRows = fetchedLabs.map(name => {
            const real = attMap[name.toLowerCase()];
            return {
              subject:  name,
              attended: real ? real.present     : 0,
              total:    real ? real.total        : 0,
              pct:      real ? real.percentage   : 0,
            };
          });
          setAttendanceData(subjectRows);
          setSubjectAttendanceData(subjectRows);
          setLabAttendanceData(labRows);
        }
      }

      // Compute next lecture
      if (ttRes?.data?.success && ttRes.data.data?.timetable) {
        setNextLecture(getNextLecture(ttRes.data.data.timetable));
      }

      // Fetch real assignment stats for this child
      await fetchAssignmentStats(student);

    } catch (error) {
      console.log('Error fetching parent data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle between Subjects / Labs ────────────────────────────────────────
  const handleTypeChange = (type) => {
    setSelectedType(type);
    setAttendanceData(type === 'Subjects' ? subjectAttendanceData : labAttendanceData);
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNavigate = (key) => {
    if (key === 'Message') {
      setActiveScreen('Message');
    } else {
      setActiveScreen('dashboard');
      if (setActiveKey) setActiveKey(key);
    }
  };

  // ── Message screen ─────────────────────────────────────────────────────────
  if (activeScreen === 'Message') {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={backHeaderStyle(C)}>
          <TouchableOpacity
            onPress={() => setActiveScreen('dashboard')}
            activeOpacity={0.7}
            style={backBtnStyle(C)}
          >
            <Text style={{ color: C.white, fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Message />
      </View>
    );
  }

  // ── Dashboard screen ───────────────────────────────────────────────────────
  const sharedProps = {
    onNavigate:       handleNavigate,
    attendance:       attendanceData,
    selectedType,
    onTypeChange:     handleTypeChange,
    studentInfo,
    nextLecture,
    parentName,
    totalAssignments,
    totalSubmitted,
    totalPending,
    submissionPct,
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.white, fontSize: 14 }}>Loading dashboard data...</Text>
        </View>
      ) : (
        isDesktop
          ? <DesktopContent {...sharedProps} />
          : <MobileContent  {...sharedProps} />
      )}
    </View>
  );
}

// ─── Back header inline styles ────────────────────────────────────────────────
const backHeaderStyle = (C) => ({
  height: 52,
  backgroundColor: C.sidebar,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  borderBottomWidth: 1,
  borderBottomColor: C.cardBorder,
});

const backBtnStyle = (C) => ({
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 8,
  paddingRight: 16,
});

// ─── Dynamic Styles ───────────────────────────────────────────────────────────
function makeStyles(C) {
  return StyleSheet.create({
    topBar:            { height: 64, backgroundColor: C.sidebar, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    pageTitle:         { color: C.white, fontSize: 20, fontWeight: '800' },
    enrollBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.mode === 'dark' ? '#0e2a4a' : '#93b8e0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, gap: 6, borderWidth: 1, borderColor: C.blue },
    enrollBadgeSm:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.mode === 'dark' ? '#0e2a4a' : '#93b8e0', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3, gap: 5 },
    enrollDot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: C.teal },
    enrollTxt:         { color: C.blueLight, fontSize: 12, fontWeight: '600' },
    enrollTxtSm:       { color: C.blueLight, fontSize: 11, fontWeight: '600' },
    topIcon:           { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.cardBorder },
    bodyDesktop:       { padding: 22, gap: 18 },
    profileCard:       { backgroundColor: C.profileCard, borderRadius: 18, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
    avatarWrap:        { width: 86, height: 86, borderRadius: 43, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.blueLight },
    profileName:       { color: C.white, fontSize: 24, fontWeight: '900' },
    profileSub:        { color: C.sub, fontSize: 13, marginTop: 3 },
    chip:              { backgroundColor: C.chipBg, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5, borderWidth: 1, borderColor: C.cardBorder },
    chipTxt:           { color: C.sub, fontSize: 12, fontWeight: '500' },
    btnWhite:          { backgroundColor: C.btnBg, borderRadius: 30, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
    btnWhiteTxt:       { color: C.white, fontWeight: '800', fontSize: 17 },
    statRow:           { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
    statCard:          { flex: 1, minWidth: 140, backgroundColor: C.card, borderRadius: 14, padding: 16, gap: 5, borderWidth: 1, borderColor: C.cardBorder },
    statIcon:          { width: 38, height: 38, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
    badge:             { fontSize: 11, fontWeight: '700' },
    statLabel:         { color: C.sub, fontSize: 12, marginTop: 8 },
    statValue:         { color: C.white, fontSize: 30, fontWeight: '900' },
    statSub:           { color: C.muted, fontSize: 11, fontStyle: 'italic' },
    progBg:            { height: 4, backgroundColor: C.cardBorder, borderRadius: 2, marginTop: 8 },
    progFill:          { height: 4, borderRadius: 2 },
    bottomRow:         { flexDirection: 'row', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
    card:              { backgroundColor: C.card, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: C.cardBorder, minWidth: 260 },
    cardTitle:         { color: C.white, fontSize: 16, fontWeight: '700' },
    cardSub:           { color: C.sub, fontSize: 12 },
    divider:           { height: 1, backgroundColor: C.cardBorder, marginVertical: 4 },
    tableRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
    tableSubject:      { flex: 1, color: C.white, fontSize: 14 },
    tableScore:        { color: C.sub, fontSize: 13, width: 58, textAlign: 'right' },
    tablePct:          { fontSize: 15, fontWeight: '800', width: 50, textAlign: 'right' },
    lectureBox:        { backgroundColor: C.accent, borderRadius: 13, padding: 16, gap: 8, marginBottom: 16 },
    urgentTxtLg:       { color: C.mode === 'dark' ? C.blueLight : '#ffffff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
    lectureNameLg:     { color: '#ffffff', fontSize: 20, fontWeight: '900', lineHeight: 26, marginTop: 4 },
    lectureDetailTxt:  { color: C.sub, fontSize: 13 },
    hallBadge:         { backgroundColor: C.blue, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    hallTxt:           { color: '#ffffff', fontSize: 12, fontWeight: '600' },
    mobileSubBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.cardBorder, marginBottom: 4 },
    mobileSubTitle:    { color: C.white, fontSize: 15, fontWeight: '700' },
    mobileThemeToggle: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.cardBorder },
    bodyMobile:        { padding: 14, gap: 14 },
    mobileProfile:     { backgroundColor: C.profileCard, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    mobileAvatar:      { width: 70, height: 70, borderRadius: 35, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.blueLight },
    mobileName:        { color: C.white, fontSize: 18, fontWeight: '800' },
    mobileSub:         { color: C.sub, fontSize: 12, marginTop: 2 },
    chipSm:            { backgroundColor: C.chipBg, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: C.cardBorder },
    chipSmTxt:         { color: C.sub, fontSize: 11 },
    mobileStatGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    mobileStatCard:    { width: '47.5%', backgroundColor: C.card, borderRadius: 13, padding: 14, borderWidth: 1, borderColor: C.cardBorder, gap: 4 },
    mobileStatValue:   { color: C.white, fontSize: 26, fontWeight: '900', marginTop: 8 },
    mobileStatLabel:   { color: C.sub, fontSize: 12 },
    mobileLectureCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder },
    mobileLectureName: { color: C.white, fontSize: 19, fontWeight: '900' },
    urgentBadge:       { backgroundColor: C.mode === 'dark' ? '#2c1810' : '#fde8c8', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: C.orange },
    urgentBadgeTxt:    { color: C.orange, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
    mobileAttRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    attSubject:        { color: C.white, fontSize: 13, fontWeight: '500', marginBottom: 6 },
    attBarBg:          { height: 4, backgroundColor: C.cardBorder, borderRadius: 2 },
    attBarFill:        { height: 4, borderRadius: 2 },
    toggleBtn:         { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.cardBorder },
    toggleBtnActive:   { borderColor: C.accent },
    toggleBtnSmall:    { paddingHorizontal: 9, paddingVertical: 4 },
    toggleBtnText:     { fontSize: 13, fontWeight: '600' },
    toggleBtnTextSmall: { fontSize: 11 },
  });
}