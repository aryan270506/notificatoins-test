import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 768;

import AIDoubtResolver from '../Doubts/Ai-Doubt';
import StudentExamResults from '../Exam/StudentExam';
import axiosInstance, { doubtAPI } from '../../../Src/Axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const YEAR_REVERSE = { '1': 'FY', '2': 'SY', '3': 'TY', '4': 'LY' };
const toApiYear = (y) => {
  if (!y) return null;
  const up = String(y).trim().toUpperCase();
  return YEAR_REVERSE[up] ?? up;
};

const getDueLabel = (dueDate) => {
  if (!dueDate || dueDate === 'TBD') return 'No deadline';
  const due = new Date(dueDate);
  if (isNaN(due)) return dueDate;
  const h = Math.max(0, Math.round((due - Date.now()) / 36e5));
  if (h < 1)  return 'Due now';
  if (h < 24) return `${h}h left`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'Tomorrow' : `${d} days`;
};

const isUrgent = (dueDate) => {
  if (!dueDate || dueDate === 'TBD') return false;
  const d = new Date(dueDate);
  return !isNaN(d) && (d - Date.now()) < 24 * 3600e3;
};

function normalizeStudent(user) {
  if (!user) return { academicYear: null, division: null };
  let year = user.year ?? user.academicYear ?? user.academic_year ?? null;
  if (year !== null) {
    year = String(year).trim();
    const match = year.match(/^(\d)/);
    if (match) year = match[1];
  }
  let div = user.division ?? user.div ?? user.section ?? null;
  if (div !== null) {
    div = String(div).trim().toUpperCase();
    const match = div.match(/([ABC])$/);
    if (match) div = match[1];
  }
  return { academicYear: year, division: div };
}

// ─── Attendance Ring ──────────────────────────────────────────────────────────
const AttendanceRing = ({ percent, C }) => {
  const status = percent >= 75 ? 'On Track' : percent > 0 ? 'Low' : '—';
  const statusColor = percent >= 75 ? C.green : percent > 0 ? '#FFA726' : C.textMuted;
  return (
    <View style={ring.wrap}>
      <View style={[ring.outer, { borderColor: C.accent, backgroundColor: C.accentBg }]}>
        <View style={ring.inner}>
          <Text style={[ring.percent, { color: C.textPrimary }]}>{percent}%</Text>
        </View>
      </View>
      <View>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted, letterSpacing: 0.8 }}>
          ATTENDANCE
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: statusColor, marginTop: 2 }}>
          {status}
        </Text>
      </View>
    </View>
  );
};

const ring = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  outer:   { width: 64, height: 64, borderRadius: 32, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
  inner:   { alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 13, fontWeight: '800' },
});

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ C, onThemeToggle, user, overallPct, onNavigateToTab, hasUnread }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <Text style={[styles.welcomeText, { color: C.textPrimary }]}>
        {getGreeting()}, {user?.name ? user.name.split(' ')[0] : 'Student'}
      </Text>
      <Text style={[styles.headerSub, { color: C.textMuted }]}>
        Department of {user?.branch || 'Computer Science & Engineering'}
      </Text>
      <Text style={[styles.headerSub, { color: C.textMuted }]}>PRN: {user?.prn || '—'}</Text>
    </View>
    <View style={styles.headerRight}>
      <AttendanceRing percent={overallPct} C={C} />
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={() => onNavigateToTab?.('chat')}
      >
        {hasUnread && <View style={styles.notifDot} />}
        <Text style={styles.iconBtnText}>🔔</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}
        onPress={onThemeToggle}
      >
        <Text style={styles.iconBtnText}>{C.moonIcon}</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ─── Up Next Card ─────────────────────────────────────────────────────────────
const UpNextCard = ({ C, onPress, data }) => (
  <TouchableOpacity
    activeOpacity={0.88}
    onPress={onPress}
    style={[styles.card, styles.upNextCard, { backgroundColor: C.upNextBg, borderColor: C.upNextBorder }]}
  >
    <View style={styles.upNextBadgeRow}>
      <View style={[styles.upNextBadge, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
        <Text style={[styles.upNextBadgeText, { color: C.textPrimary }]}>🟢 NOW</Text>
      </View>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={styles.bookmarkIcon}>🔖</Text>
      </TouchableOpacity>
    </View>
    <Text style={[styles.upNextTitle, { color: C.textPrimary }]} numberOfLines={1}>
      {data?.current?.subject || 'No ongoing class'}
    </Text>
    <View style={styles.upNextMeta}>
      <Text style={styles.upNextMetaIcon}>🕐</Text>
      <Text style={[{ fontSize: 13, color: C.upNextText }]}>{data?.current?.timeLabel || '—'}</Text>
      <Text style={[{ fontSize: 13, color: C.upNextText, marginLeft: 8 }]}>📍 {data?.current?.room || '—'}</Text>
    </View>
    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <View style={[styles.upNextBadge, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
        <Text style={[styles.upNextBadgeText, { color: C.textPrimary }]}>⏭ UP NEXT</Text>
      </View>
    </View>
    <Text style={[{ fontSize: 15, fontWeight: '700', color: C.textPrimary }]} numberOfLines={1}>
      {data?.next?.subject || 'No upcoming class'}
    </Text>
    <View style={styles.upNextMeta}>
      <Text style={styles.upNextMetaIcon}>🕐</Text>
      <Text style={[{ fontSize: 13, color: C.upNextText }]}>{data?.next?.timeLabel || '—'}</Text>
      <Text style={[{ fontSize: 13, color: C.upNextText, marginLeft: 8 }]}>📍 {data?.next?.room || '—'}</Text>
    </View>
  </TouchableOpacity>
);

// ─── Assignments Card ─────────────────────────────────────────────────────────
const AssignmentRow = ({ icon, title, course, urgency, time, urgent, C, onPress }) => (
  <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.assignRow}>
    <View style={[styles.assignIcon, { backgroundColor: urgent ? C.redBg : C.orangeBg }]}>
      <Text style={styles.assignIconText}>{icon}</Text>
    </View>
    <View style={styles.assignInfo}>
      <Text style={[styles.assignTitle, { color: C.textPrimary }]} numberOfLines={1}>{title}</Text>
      <Text style={[styles.assignCourse, { color: C.textMuted }]} numberOfLines={1}>{course}</Text>
    </View>
    <View style={styles.assignRight}>
      <Text style={[styles.assignUrgency, { color: urgent ? C.red : C.orange }]}>{urgency}</Text>
      <Text style={[styles.assignTime, { color: C.textMuted }]}>{time}</Text>
    </View>
  </TouchableOpacity>
);

const AssignmentsCard = ({ C, onNavigate, assignments, studentId, loading }) => {
  const pending = assignments
    .filter(a => !(a.submissions ?? []).some(s => s.studentId === studentId))
    .sort((a, b) => {
      if (!a.dueDate || a.dueDate === 'TBD') return 1;
      if (!b.dueDate || b.dueDate === 'TBD') return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    })
    .slice(0, 2);

  return (
    <View style={[styles.card, styles.assignmentsCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Assignments Due</Text>
      </View>
      {loading ? (
        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={C.accent} />
        </View>
      ) : pending.length === 0 ? (
        <View style={{ paddingVertical: 16, alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 22 }}>📭</Text>
          <Text style={{ color: C.textMuted, fontSize: 13 }}>No assignments assigned yet...</Text>
        </View>
      ) : (
        pending.map((a, i) => (
          <React.Fragment key={a._id}>
            <AssignmentRow
              icon="📄"
              title={a.title}
              course={`${a.subject}`}
              urgency={getDueLabel(a.dueDate)}
              time={
                a.dueDate && a.dueDate !== 'TBD'
                  ? new Date(a.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : 'No deadline'
              }
              urgent={isUrgent(a.dueDate)}
              C={C}
              onPress={() => onNavigate?.('Assignment')}
            />
            {i < pending.length - 1 && (
              <View style={[styles.assignDivider, { backgroundColor: C.border }]} />
            )}
          </React.Fragment>
        ))
      )}
    </View>
  );
};

// ─── AI Doubts Card ───────────────────────────────────────────────────────────
const AiDoubtsCard = ({ onAskAi, C }) => (
  <View style={[styles.card, styles.aiCard, { backgroundColor: C.aiCardBg, borderColor: C.aiCardBorder }]}>
    <View style={[styles.aiIconWrap, { backgroundColor: 'rgba(108,99,255,0.2)' }]}>
      <Text style={styles.aiEmoji}>✨</Text>
    </View>
    <Text style={[styles.aiTitle, { color: C.textPrimary }]}>Stuck on a topic?</Text>
    <Text style={[styles.aiSub, { color: C.aiSubText }]}>
      Our AI Assistant is ready to help with your complex doubts.
    </Text>
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.askAiBtn, { backgroundColor: 'rgba(108,99,255,0.15)', borderColor: 'rgba(108,99,255,0.3)' }]}
      onPress={onAskAi}
    >
      <Text style={[styles.askAiBtnText, { color: C.accentPurple }]}>ASK AI NOW</Text>
    </TouchableOpacity>
  </View>
);

// ─── Subject Attendance ───────────────────────────────────────────────────────
const SubjectAttendance = ({ C, subjects, labs, loading, attendanceMap }) => {
  const [mode, setMode] = useState('theory');

  const buildRows = (names) => {
    const lowerMap = {};
    if (attendanceMap) {
      Object.keys(attendanceMap).forEach(k => { lowerMap[k.toLowerCase()] = attendanceMap[k]; });
    }
    return names.map(name => {
      const match = lowerMap[name.toLowerCase()];
      return { name, total: match ? match.total : 0, attended: match ? match.present : 0 };
    });
  };

  const filtered = mode === 'theory' ? buildRows(subjects) : buildRows(labs);

  return (
    <View style={[styles.card, styles.attendanceCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Subject Attendance</Text>
          <Text style={[styles.cardSub, { color: C.textMuted }]}>Detailed breakdown of your attendance</Text>
        </View>
        <View style={[styles.toggleContainer, { backgroundColor: C.toggleBg }]}>
          {['theory', 'labs'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.toggleBtn, mode === tab && { backgroundColor: C.accent }]}
              onPress={() => setMode(tab)}
            >
              <Text style={[styles.toggleText, { color: mode === tab ? '#fff' : C.textMuted }]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {loading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 10 }}>Loading subjects…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <Text style={{ fontSize: 28 }}>📭</Text>
          <Text style={{ color: C.textMuted, fontSize: 13, marginTop: 8 }}>
            No {mode === 'theory' ? 'subjects' : 'labs'} found
          </Text>
        </View>
      ) : (
        <>
          <View style={[styles.tableHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.tableHeaderText, { flex: 2, color: C.textMuted }]}>SUBJECT NAME</Text>
            <Text style={[styles.tableHeaderText, { color: C.textMuted }]}>CLASSES</Text>
            <Text style={[styles.tableHeaderText, { color: C.textMuted }]}>PERCENTAGE</Text>
          </View>
          {filtered.map((s, i) => {
            const pct    = s.total === 0 ? 0 : Math.round((s.attended / s.total) * 100);
            const isGood = pct >= 75;
            return (
              <View key={i} style={[styles.tableRow, { borderBottomColor: C.rowBorder }]}>
                <Text style={[styles.tableCell, { flex: 2, color: C.textPrimary, fontWeight: '500', textAlign: 'left' }]}>
                  {s.name}
                </Text>
                <Text style={[styles.tableCell, { color: C.textSub }]}>{s.attended} / {s.total}</Text>
                <View style={[styles.pctBadge, { backgroundColor: isGood ? C.greenBg : C.orangeBg }]}>
                  <Text style={[styles.pctText, { color: isGood ? C.green : C.orange }]}>{pct}%</Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
};

// ─── Shared Quadrant-Arc Progress Ring ───────────────────────────────────────
// Used by all three achievement badges (Early Bird, Solver, Top Scorer).
// `fillPct`      : 0–100, controls how much of the ring is filled
// `displayLabel` : text shown in the centre (e.g. "76%", "12")
// `ringColor`    : colour of the filled arc
const ProgressRing = ({ fillPct = 0, displayLabel, ringColor, C }) => {
  const SIZE     = 58;
  const BORDER_W = 5;
  const HALF     = SIZE / 2;
  const trackColor = (C.border ?? '#1C2B3A') + 'BB';

  const clamped       = Math.min(Math.max(Math.round(fillPct), 0), 100);
  const fullQuarters  = Math.floor(clamped / 25);
  const partialDegRaw = ((clamped % 25) / 25) * 90;

  const QuarterArc = ({ quadrant, active, rotDeg }) => {
    const clipPos = [
      { top: 0,    left: HALF },
      { top: HALF, left: HALF },
      { top: HALF, left: 0    },
      { top: 0,    left: 0    },
    ][quadrant];
    const circleOffset = [
      { top: 0,     left: -HALF },
      { top: -HALF, left: -HALF },
      { top: -HALF, left: 0     },
      { top: 0,     left: 0     },
    ][quadrant];
    return (
      <View style={[{ position: 'absolute', width: HALF, height: HALF, overflow: 'hidden' }, clipPos]}>
        <View style={[
          { position: 'absolute', width: SIZE, height: SIZE, borderRadius: HALF, borderWidth: BORDER_W,
            borderColor: active ? ringColor : trackColor },
          circleOffset,
          rotDeg != null && { transform: [{ rotate: `${rotDeg}deg` }] },
        ]} />
      </View>
    );
  };

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <View style={{ position: 'absolute', width: SIZE, height: SIZE, borderRadius: HALF, borderWidth: BORDER_W, borderColor: trackColor }} />
      {[0, 1, 2, 3].map(q => {
        const isFull    = q < fullQuarters;
        const isPartial = q === fullQuarters && clamped % 25 > 0;
        return (
          <QuarterArc
            key={q} quadrant={q}
            active={isFull || isPartial}
            rotDeg={isPartial ? partialDegRaw - 90 : undefined}
          />
        );
      })}
      <View style={{ position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{
          fontSize:    String(displayLabel).length > 4 ? 9 : 11,
          fontWeight:  '800',
          color:       ringColor,
          letterSpacing: -0.3,
        }}>
          {displayLabel}
        </Text>
      </View>
    </View>
  );
};





// ─── Achievements Card ────────────────────────────────────────────────────────
const AchievementsCard = ({
  C,
  onTimePct    = 0,
  doubtCount   = 0,
  examPct      = 0,
  quizAvgScore = 0,
  onNavigate,
  onAskAi,
  onNavigateExam,
}) => {
  // Solver ring fills proportionally against a 50-doubt milestone
  const SOLVER_MILESTONE = 50;
  const solverFillPct    = Math.min(Math.round((doubtCount / SOLVER_MILESTONE) * 100), 100);

  const earlyBirdColor =
    onTimePct >= 90 ? (C.green  ?? '#00C48C') :
    onTimePct >= 60 ? (C.orange ?? '#FF8A65') :
                      (C.red    ?? '#FF5A5A');

  const solverColor =
    doubtCount >= SOLVER_MILESTONE ? (C.green  ?? '#00C48C') :
    doubtCount >= 20               ? (C.accent ?? '#00D4FF') :
    doubtCount >= 5                ? (C.orange ?? '#FF8A65') :
                                     (C.red    ?? '#FF5A5A');

  // ✅ Top Scorer uses examPct — identical to StudentExamResults OVERALL PERFORMANCE
const topScorerColor =
    examPct >= 85 ? (C.green  ?? '#00C48C') :
    examPct >= 70 ? (C.accent ?? '#00D4FF') :
    examPct >= 50 ? (C.orange ?? '#FF8A65') :
                    (C.red    ?? '#FF5A5A');

  const quizColor =
    quizAvgScore >= 85 ? (C.green  ?? '#00C48C') :
    quizAvgScore >= 70 ? (C.accent ?? '#00D4FF') :
    quizAvgScore >= 50 ? (C.orange ?? '#FF8A65') :
                         (C.red    ?? '#FF5A5A');

const badgeData = [
  {
    name: 'Early Bird',
    desc: 'On-time submissions',
    ring: (
      <ProgressRing
        fillPct={onTimePct}
        displayLabel={`${onTimePct}%`}
        ringColor={earlyBirdColor}
        C={C}
      />
    ),
    onPress: () => onNavigate?.('Assignment'),
  },
  {
    name: 'Solver',
    desc: 'AI doubts asked',
    ring: (
      <ProgressRing
        fillPct={solverFillPct}
        displayLabel={`${doubtCount}`}
        ringColor={solverColor}
        C={C}
      />
    ),
    onPress: () => onAskAi?.(),
  },
  {
    name: 'Top Scorer',
    desc: 'Overall exam score',
    ring: (
      <ProgressRing
        fillPct={examPct}
        displayLabel={`${examPct}%`}
        ringColor={topScorerColor}
        C={C}
      />
    ),
    onPress: () => onNavigateExam?.(),
  },
{
  name: 'Quiz',
  desc: 'Avg quiz score',
  ring: (
    <ProgressRing
      fillPct={quizAvgScore}
      displayLabel={`${quizAvgScore}%`}
      ringColor={quizColor}
      C={C}
    />
  ),
  onPress: () => onNavigate?.('StudentQuiz'),
},
];

  return (
    <View style={[styles.card, styles.achievementsCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Achievements</Text>
      </View>
      <View style={styles.badgeGrid}>
        {badgeData.map((b, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={b.onPress ? 0.8 : 1}
            style={styles.badgeItem}
            onPress={b.onPress}
          >
            {b.ring}
            <Text style={[styles.badgeName, { color: C.textPrimary }]}>{b.name}</Text>
            <Text style={[styles.badgeDesc, { color: C.textMuted }]}>{b.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ─── Announcement Banner ──────────────────────────────────────────────────────
const AnnouncementBanner = ({ C, onPress, message }) => {
  const senderName = message?.senderName || 'Campus Administration';
  const body       = message?.content    || 'The library will be open 24/7 during the final examination week starting next Monday.';
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.announcement, { backgroundColor: C.announceBg, borderColor: C.border }]}
    >
      <Text style={styles.announcementIcon}>📢</Text>
      <View style={styles.announcementText}>
        <Text style={[styles.announcementTitle, { color: C.textPrimary }]}>New Campus Announcement</Text>
        <Text style={[styles.announcementSender, { color: C.textMuted }]}>From: {senderName}</Text>
        <Text style={[styles.announcementBody, { color: C.textMuted }]} numberOfLines={2}>{body}</Text>
      </View>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={[styles.dismissText, { color: C.textMuted }]}>Dismiss</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboardpage({ C, onThemeToggle, onNavigateToTab, user }) {
  const [showAiDoubt,   setShowAiDoubt]   = useState(false);
  const [subjects,      setSubjects]      = useState([]);
  const [labs,          setLabs]          = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [overallPct,    setOverallPct]    = useState(0);
  const [upNext,        setUpNext]        = useState(null);
  const [hasUnread,     setHasUnread]     = useState(false);
  const [latestMessage, setLatestMessage] = useState(null);
  const [assignments,   setAssignments]   = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [doubtCount,    setDoubtCount]    = useState(0);
  const [examPct,       setExamPct]       = useState(0);
  const [quizAvgScore, setQuizAvgScore] = useState(0);

  const { academicYear, division } = normalizeStudent(user);
  const studentId = String(user?._id ?? user?.id ?? '');

  const onTimePct = React.useMemo(() => {
    if (assignments.length === 0) return 0;
    const submitted = assignments.filter(a =>
      (a.submissions ?? []).some(s => String(s.studentId) === studentId)
    );
    if (submitted.length === 0) return 0;
    const onTime = submitted.filter(a => {
      const sub = (a.submissions ?? []).find(s => String(s.studentId) === studentId);
      if (!sub) return false;
      if (!a.dueDate || a.dueDate === 'TBD') return true;
      const dueMs = new Date(a.dueDate).getTime();
      if (isNaN(dueMs)) return true;
      const subMs = new Date(sub.submittedAt ?? sub.createdAt ?? 0).getTime();
      return subMs <= dueMs;
    });
    return Math.round((onTime.length / submitted.length) * 100);
  }, [assignments, studentId]);

  useEffect(() => {
  if (user?._id || user?.id) {
    fetchStudentData();
    fetchUpNext();
    fetchAssignments();
    fetchUnreadStatus();
    fetchLatestMessage();
    fetchDoubtCount();
    fetchExamPct();
    fetchQuizAvgScore(); // ← add this
  }
}, [user?._id, user?.id]);

  const fetchQuizAvgScore = async () => {
  try {
    const mongoId = user?._id || user?.id;
    if (!mongoId) return;
    const res = await axiosInstance.get(`/quiz/student/${mongoId}`, {
      params: {
        year: user.year,
        division: user.division,
      },
    });
    if (res.data?.success) {
      const quizzes = res.data.data;
      const scores = quizzes
        .filter(q => q.submitted && q.score !== null && q.totalMarks)
        .map(q => (q.score / q.totalMarks) * 100);
      const avg = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
      setQuizAvgScore(avg);
    }
  } catch (err) {
    console.warn('Dashboard: quiz avg fetch error:', err?.message);
  }
};

  const fetchUpNext = async () => {
    try {
      const now        = new Date();
      const days       = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const currentDay = days[now.getDay()];
      let { year, division, batch } = user;
      if (!batch) {
        const raw = await AsyncStorage.getItem('studentData');
        if (raw) {
          const stored = JSON.parse(raw);
          year     = year     || stored.year;
          division = division || stored.division;
          batch    = stored.batch;
        }
      }
      if (!year || !division || !batch) return;
      const res = await axiosInstance.get('/timetable', {
        params: { year, division: String(division).toUpperCase(), batch: String(batch).toUpperCase() },
      });
      if (!res.data?.success) return;
      const timetable = res.data.data || {};
      const daySlots  = timetable[currentDay];
      if (!daySlots) return;
      const slots      = ['t1','t2','t3','t4','t5','t6'];
      const timeMap    = { t1:'10:30', t2:'11:30', t3:'13:15', t4:'14:15', t5:'15:30', t6:'16:30' };
      const slotEndMap = { t1:'11:30', t2:'12:30', t3:'14:15', t4:'15:15', t5:'16:30', t6:'17:30' };
      const labelMap   = {
        t1:'10:30 AM - 11:30 AM', t2:'11:30 AM - 12:30 PM',
        t3:'1:15 PM - 2:15 PM',   t4:'2:15 PM - 3:15 PM',
        t5:'3:30 PM - 4:30 PM',   t6:'4:30 PM - 5:30 PM',
      };
      const getMinutes = (str) => { const [h, m] = str.split(':').map(Number); return h * 60 + m; };
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      let currentSlot = null, nextSlot = null;
      for (const sId of slots) {
        if (!daySlots[sId]?.subject) continue;
        const startMin = getMinutes(timeMap[sId]);
        const endMin   = getMinutes(slotEndMap[sId]);
        if (startMin <= nowMinutes && nowMinutes < endMin && !currentSlot)
          currentSlot = { ...daySlots[sId], timeLabel: labelMap[sId], ongoing: true };
        if (startMin > nowMinutes && !nextSlot)
          nextSlot = { ...daySlots[sId], timeLabel: labelMap[sId], ongoing: false };
      }
      setUpNext({ current: currentSlot, next: nextSlot });
    } catch (err) { console.log('Error fetching up next:', err); }
  };

  const fetchStudentData = async () => {
    const customId = user.id || user._id;
    const mongoId  = user._id || user.id;
    try {
      setLoading(true);
      const res  = await axiosInstance.get(`/students/subjects/${customId}`);
      const data = res.data;
      setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
      setLabs(Array.isArray(data.lab) ? data.lab : []);
      const attRes  = await axiosInstance.get(`/attendance/student/${mongoId}`);
      const attData = attRes.data;
      if (attData.success && Array.isArray(attData.subjectSummary)) {
        const map = {};
        attData.subjectSummary.forEach(s => {
          map[s.subject] = { present: s.present || 0, total: s.total || 0, pct: s.percentage || 0 };
        });
        setAttendanceMap(map);
        setOverallPct(attData.overall?.percentage || 0);
      }
    } catch (err) {
      console.log('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      setAssignLoading(true);
      const apiYear = toApiYear(user.year);
      const params  = {};
      if (apiYear)       params.year     = apiYear;
      if (user.division) params.division = String(user.division).toUpperCase();
      const res = await axiosInstance.get('/assignments', { params });
      if (res.data?.success) {
        setAssignments(res.data.data.filter(a => a.status === 'ACTIVE' || a.status === 'APPROVED'));
      }
    } catch (err) {
      console.warn('Dashboard: assignment fetch error:', err?.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const fetchDoubtCount = async () => {
    try {
      const userId = user?._id || user?.id || 'anonymous';
      const { data } = await doubtAPI.recent(userId, 9999);
      const list = Array.isArray(data) ? data : (data.doubts ?? []);
      setDoubtCount(list.length);
    } catch (err) {
      console.warn('Dashboard: could not fetch doubt count:', err?.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ✅ FIXED fetchExamPct — now mirrors StudentExamResults overallPerf exactly:
  //
  //   StudentExamResults filters: graded = marksData where status !== '-'
  //   Then averages barPercent (= internal / internalMax) across graded only.
  //
  //   Old code averaged ALL marks (including 0/40 ungraded) → gave ~8% instead of 76%.
  //   New code filters to status !== '-' first → gives the same 76% shown on screen.
  // ─────────────────────────────────────────────────────────────────────────────
const fetchExamPct = async () => {
  try {
    const studentId = user.id || user._id;
    if (!studentId) return;

    // same API call as exam screen
    const studentRes = await axiosInstance.get(`/students/${studentId}`);
    const studentData = studentRes.data;

    const year = studentData.year;
    const division = studentData.division;

    const marksRes = await axiosInstance.get('/exam-marks/student-results', {
      params: { studentId, year, division },
    });

    const existingMarks = marksRes.data?.success ? marksRes.data.data : [];

    // build same structure as exam screen
    const marksData = existingMarks.map(entry => {
      const internalMax = entry.internalMax || (entry.classType === 'Lab' ? 50 : 40);
      const internal = entry.internal || 0;

      return {
        status: entry.status || '-',
        internalMax,
        barPercent: internalMax > 0 ? internal / internalMax : 0,
      };
    });

    const graded = marksData.filter(
      s => s.status !== '-' && s.internalMax > 0
    );

    if (!graded.length) {
      setExamPct(0);
      return;
    }

    const avg =
      graded.reduce((sum, s) => sum + s.barPercent, 0) / graded.length;

    const pct = Math.round(avg * 100);

    setExamPct(pct);

  } catch (err) {
    console.warn("Dashboard exam % error:", err);
  }
};

  const fetchUnreadStatus = async () => {
    if (!academicYear || !division) return;
    try {
      const lastReadStr  = await AsyncStorage.getItem('lastReadChat');
      const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;
      const params = { recipientRole: 'student', academicYear, division };
      const res = await axiosInstance.get('/messages/filter/by-recipient', { params });
      if (res.data?.success) {
        const messages = res.data.data || [];
        setHasUnread(messages.some(msg =>
          new Date(msg.timestamp || msg.createdAt).getTime() > lastReadTime
        ));
      }
    } catch (err) { console.log('Error fetching unread status:', err); }
  };

  const fetchLatestMessage = async () => {
    if (!academicYear || !division) return;
    try {
      const params = { recipientRole: 'student', academicYear, division };
      const res = await axiosInstance.get('/messages/filter/by-recipient', { params });
      if (res.data?.success) {
        const messages = res.data.data || [];
        if (messages.length > 0) {
          const sorted = [...messages].sort((a, b) =>
            new Date(b.timestamp || b.createdAt).getTime() -
            new Date(a.timestamp || a.createdAt).getTime()
          );
          setLatestMessage(sorted[0]);
        }
      }
    } catch (err) { console.log('Error fetching latest message:', err); }
  };

  if (showAiDoubt) {
    return (
      <AIDoubtResolver
        onBack={() => setShowAiDoubt(false)}
        themeC={C}
        user={user}
        onThemeToggle={onThemeToggle}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header
          C={C}
          onThemeToggle={onThemeToggle}
          user={user}
          overallPct={overallPct}
          onNavigateToTab={onNavigateToTab}
          hasUnread={hasUnread}
        />

        <View style={styles.topRow}>
          <UpNextCard C={C} onPress={() => onNavigateToTab?.('timetable')} data={upNext} />
          <AssignmentsCard
            C={C}
            onNavigate={onNavigateToTab}
            assignments={assignments}
            studentId={studentId}
            loading={assignLoading}
          />
          <AiDoubtsCard onAskAi={() => setShowAiDoubt(true)} C={C} />
        </View>

        <View style={styles.bottomRow}>
          <SubjectAttendance
            C={C}
            subjects={subjects}
            labs={labs}
            loading={loading}
            attendanceMap={attendanceMap}
          />
          <AchievementsCard
  C={C}
  onTimePct={onTimePct}
  doubtCount={doubtCount}
  examPct={examPct}
  quizAvgScore={quizAvgScore}
  onNavigate={onNavigateToTab}
  onAskAi={() => setShowAiDoubt(true)}
  onNavigateExam={() => onNavigateToTab?.('StudentExam')}
/>
        </View>

        <AnnouncementBanner C={C} onPress={() => onNavigateToTab?.('chat')} message={latestMessage} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { padding: IS_DESKTOP ? 28 : 16, gap: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4,
  },
  headerLeft:  { flex: 1, minWidth: 180 },
  welcomeText: { fontSize: IS_DESKTOP ? 26 : 20, fontWeight: '800', marginBottom: 4 },
  headerSub:   { fontSize: 13, lineHeight: 18 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  iconBtnText: { fontSize: 16 },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: 'transparent', zIndex: 1,
  },

  card:          { borderRadius: 16, borderWidth: 1, padding: 20 },
  cardHeaderRow: {
    flexDirection: 'row', alignItems: IS_DESKTOP ? 'flex-start' : 'center',
    justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub:   { fontSize: 12, marginTop: 3, maxWidth: 260 },

  topRow:    { flexDirection: IS_DESKTOP ? 'row' : 'column', gap: 14, alignItems: IS_DESKTOP ? 'stretch' : undefined },
  bottomRow: { flexDirection: IS_DESKTOP ? 'row' : 'column', gap: 14, alignItems: IS_DESKTOP ? 'stretch' : undefined },

  upNextCard:      { flex: IS_DESKTOP ? 1.2 : undefined, gap: 10 },
  upNextBadgeRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upNextBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  upNextBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bookmarkIcon:    { fontSize: 18, opacity: 0.7 },
  upNextTitle:     { fontSize: IS_DESKTOP ? 25 : 17, fontWeight: '800' },
  upNextMeta:      { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  upNextMetaIcon:  { fontSize: 16 },

  assignmentsCard: { flex: IS_DESKTOP ? 1.5 : undefined },
  assignRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  assignIcon:      { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  assignIconText:  { fontSize: 18 },
  assignInfo:      { flex: 1 },
  assignTitle:     { fontSize: 13, fontWeight: '600' },
  assignCourse:    { fontSize: 11, marginTop: 2 },
  assignRight:     { alignItems: 'flex-end' },
  assignUrgency:   { fontSize: 12, fontWeight: '700' },
  assignTime:      { fontSize: 11, marginTop: 2 },
  assignDivider:   { height: 1, marginVertical: 12 },

  aiCard:       { flex: IS_DESKTOP ? 1 : undefined, alignItems: 'center', gap: 8 },
  aiIconWrap:   { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  aiEmoji:      { fontSize: 22 },
  aiTitle:      { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  aiSub:        { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  askAiBtn:     { marginTop: 8, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1 },
  askAiBtnText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },

  attendanceCard:  { flex: IS_DESKTOP ? 1.8 : undefined },
  toggleContainer: { flexDirection: 'row', borderRadius: 8, padding: 4 },
  toggleBtn:       { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  toggleText:      { fontSize: 13, fontWeight: '500' },
  tableHeader:     { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, marginBottom: 4 },
  tableHeaderText: { flex: 1, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textAlign: 'center' },
  tableRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  tableCell:       { flex: 1, fontSize: 13, textAlign: 'center' },
  pctBadge:        { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, paddingVertical: 4 },
  pctText:         { fontSize: 13, fontWeight: '700' },

  achievementsCard: { flex: IS_DESKTOP ? 1 : undefined },
  badgeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  badgeItem:        { width: '44%', alignItems: 'center', gap: 6 },
  badgeIcon:        { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  badgeEmoji:       { fontSize: 22 },
  badgeName:        { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  badgeDesc:        { fontSize: 10, textAlign: 'center', lineHeight: 14 },

  announcement:       { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  announcementIcon:   { fontSize: 22 },
  announcementText:   { flex: 1 },
  announcementTitle:  { fontSize: 13, fontWeight: '700' },
  announcementSender: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  announcementBody:   { fontSize: 12, marginTop: 2, lineHeight: 17 },
  dismissText:        { fontSize: 13, fontWeight: '600' },
});