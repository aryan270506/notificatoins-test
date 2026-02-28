import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_DESKTOP = SCREEN_WIDTH >= 768;

import AIDoubtResolver from '../Doubts/Ai-Doubt';

// ─── Circular Attendance Ring ────────────────────────────────────────────────
const AttendanceRing = ({ percent, C }) => (
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
      <Text style={{ fontSize: 13, fontWeight: '700', color: C.green, marginTop: 2 }}>
        On Track
      </Text>
    </View>
  </View>
);

const ring = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  outer: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  inner:   { alignItems: 'center', justifyContent: 'center' },
  percent: { fontSize: 13, fontWeight: '800' },
});

// ─── Header ──────────────────────────────────────────────────────────────────
const Header = ({ C, onThemeToggle }) => (
  <View style={styles.header}>
    <View style={styles.headerLeft}>
      <Text style={[styles.welcomeText, { color: C.textPrimary }]}>Welcome back, Alex</Text>
      <Text style={[styles.headerSub, { color: C.textMuted }]}>
        Department of Computer Science & Engineering
      </Text>
      <Text style={[styles.headerSub, { color: C.textMuted }]}>PRN: 242124005</Text>
    </View>

    <View style={styles.headerRight}>
      <AttendanceRing percent={88} C={C} />
      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}
      >
        <View style={styles.notifDot} />
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
const UpNextCard = ({ C, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.88}
    onPress={onPress}
    style={[styles.card, styles.upNextCard, { backgroundColor: C.upNextBg, borderColor: C.upNextBorder }]}
  >
    <View style={styles.upNextBadgeRow}>
      <View style={[styles.upNextBadge, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
        <Text style={[styles.upNextBadgeText, { color: C.textPrimary }]}>UP NEXT</Text>
      </View>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={styles.bookmarkIcon}>🔖</Text>
      </TouchableOpacity>
    </View>
    <Text style={[styles.upNextTitle, { color: C.textPrimary }]}>Advanced Algorithms</Text>
    <View style={styles.upNextMeta}>
      <Text style={styles.upNextMetaIcon}>🕐</Text>
      <Text style={[styles.upNextMetaText, { color: C.upNextText }]}>10:30 AM - 12:00 PM</Text>
    </View>
    <View style={styles.upNextMeta}>
      <Text style={styles.upNextMetaIcon}>📍</Text>
      <Text style={[styles.upNextMetaText, { color: C.upNextText }]}>Block C, Room 402</Text>
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
      <Text style={[styles.assignTitle, { color: C.textPrimary }]}>{title}</Text>
      <Text style={[styles.assignCourse, { color: C.textMuted }]}>{course}</Text>
    </View>
    <View style={styles.assignRight}>
      <Text style={[styles.assignUrgency, { color: urgent ? C.red : C.orange }]}>{urgency}</Text>
      <Text style={[styles.assignTime, { color: C.textMuted }]}>{time}</Text>
    </View>
  </TouchableOpacity>
);

const AssignmentsCard = ({ C, onNavigate }) => (
  <View style={[styles.card, styles.assignmentsCard, { backgroundColor: C.card, borderColor: C.border }]}>
    <View style={styles.cardHeaderRow}>
      <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Assignments Due</Text>
      
    </View>
    <AssignmentRow
      icon="📄" title="OS Final Project" course="CS-302 Operating Systems"
      urgency="2h Left" time="Today, 5 PM" urgent C={C}
      onPress={() => onNavigate?.('Assignment')}
    />
    <View style={[styles.assignDivider, { backgroundColor: C.border }]} />
    <AssignmentRow
      icon="📋" title="Database Quiz II" course="CS-305 Databases"
      urgency="Tomorrow" time="11:00 AM" C={C}
      onPress={() => onNavigate?.('Assignment')}
    />
  </View>
);

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
      style={[styles.askAiBtn, {
        backgroundColor: 'rgba(108,99,255,0.15)',
        borderColor: 'rgba(108,99,255,0.3)',
      }]}
      onPress={onAskAi}
    >
      <Text style={[styles.askAiBtnText, { color: C.accentPurple }]}>ASK AI NOW</Text>
    </TouchableOpacity>
  </View>
);

// ─── Subject Attendance ───────────────────────────────────────────────────────
const subjects = [
  { name: 'Engineering Mathematics', lec: { total: 30, attended: 27 }, prac: { total: 0,  attended: 0  }, type: 'theory' },
  { name: 'Applied Physics',         lec: { total: 28, attended: 21 }, prac: { total: 0,  attended: 0  }, type: 'theory' },
  { name: 'Computer Networks',       lec: { total: 32, attended: 29 }, prac: { total: 0,  attended: 0  }, type: 'theory' },
  { name: 'Data Structures',         lec: { total: 26, attended: 22 }, prac: { total: 0,  attended: 0  }, type: 'theory' },
  { name: 'Operating Systems',       lec: { total: 24, attended: 18 }, prac: { total: 0,  attended: 0  }, type: 'theory' },
  { name: 'Physics Lab',             lec: { total: 0,  attended: 0  }, prac: { total: 20, attended: 16 }, type: 'lab'    },
  { name: 'Programming Lab',         lec: { total: 0,  attended: 0  }, prac: { total: 22, attended: 20 }, type: 'lab'    },
  { name: 'Data Structures Lab',     lec: { total: 0,  attended: 0  }, prac: { total: 18, attended: 15 }, type: 'lab'    },
  { name: 'Networks Lab',            lec: { total: 0,  attended: 0  }, prac: { total: 19, attended: 14 }, type: 'lab'    },
  { name: 'OS Lab',                  lec: { total: 0,  attended: 0  }, prac: { total: 17, attended: 15 }, type: 'lab'    },
];

const SubjectAttendance = ({ C }) => {
  const [mode, setMode] = useState('theory');
  const filtered = subjects.filter(s => s.type === (mode === 'theory' ? 'theory' : 'lab'));

  const calcPct = (lec, prac) => {
    const total    = lec.total    + prac.total;
    const attended = lec.attended + prac.attended;
    return total === 0 ? 0 : Math.round((attended / total) * 100);
  };

  return (
    <View style={[styles.card, styles.attendanceCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Subject Attendance</Text>
          <Text style={[styles.cardSub, { color: C.textMuted }]}>
            Detailed breakdown of your attendance
          </Text>
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

      <View style={[styles.tableHeader, { borderBottomColor: C.border }]}>
        <Text style={[styles.tableHeaderText, { flex: 2, color: C.textMuted }]}>SUBJECT NAME</Text>
        <Text style={[styles.tableHeaderText, { color: C.textMuted }]}>
          {mode === 'theory' ? 'LECTURE' : 'PRACTICAL'}
        </Text>
        <Text style={[styles.tableHeaderText, { color: C.textMuted }]}>PERCENTAGE</Text>
      </View>

      {filtered.map((s, i) => {
        const pct    = calcPct(s.lec, s.prac);
        const isGood = pct >= 75;
        return (
          <View key={i} style={[styles.tableRow, { borderBottomColor: C.rowBorder }]}>
            <Text style={[styles.tableCell, { flex: 2, color: C.textPrimary, fontWeight: '500' }]}>
              {s.name}
            </Text>
            <Text style={[styles.tableCell, { color: C.textSub }]}>
              {mode === 'theory'
                ? `${s.lec.attended} / ${s.lec.total}`
                : `${s.prac.attended} / ${s.prac.total}`}
            </Text>
            <View style={[styles.pctBadge, { backgroundColor: isGood ? C.greenBg : C.orangeBg }]}>
              <Text style={[styles.pctText, { color: isGood ? C.green : C.orange }]}>{pct}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ─── Achievements Card ────────────────────────────────────────────────────────
const badgeData = [
  { icon: '💡', name: 'Early Bird',  desc: '100% On-time submissions' },
  { icon: '🧩', name: 'Solver',      desc: 'Solved 50+ AI Doubts'     },
  { icon: '📈', name: 'Top Scorer',  desc: 'Top 5% in Algorithms'     },
  { icon: '👥', name: 'Team Lead',   desc: 'Led 3 group projects'      },
];

const AchievementsCard = ({ C }) => {
  const bgs = [C.orangeBg, C.greenBg, C.accentBg, 'rgba(108,99,255,0.15)'];
  return (
    <View style={[styles.card, styles.achievementsCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeaderRow}>
        <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Achievements</Text>
      </View>
      <View style={styles.badgeGrid}>
        {badgeData.map((b, i) => (
          <TouchableOpacity key={i} activeOpacity={0.8} style={styles.badgeItem}>
            <View style={[styles.badgeIcon, { backgroundColor: bgs[i] }]}>
              <Text style={styles.badgeEmoji}>{b.icon}</Text>
            </View>
            <Text style={[styles.badgeName, { color: C.textPrimary }]}>{b.name}</Text>
            <Text style={[styles.badgeDesc, { color: C.textMuted }]}>{b.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ─── Announcement Banner ──────────────────────────────────────────────────────
const AnnouncementBanner = ({ C, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[styles.announcement, { backgroundColor: C.announceBg, borderColor: C.border }]}
  >
    <Text style={styles.announcementIcon}>📢</Text>
    <View style={styles.announcementText}>
      <Text style={[styles.announcementTitle, { color: C.textPrimary }]}>
        New Campus Announcement
      </Text>
      <Text style={[styles.announcementBody, { color: C.textMuted }]}>
        The library will be open 24/7 during the final examination week starting next Monday.
      </Text>
    </View>
    <TouchableOpacity activeOpacity={0.7}>
      <Text style={[styles.dismissText, { color: C.textMuted }]}>Dismiss</Text>
    </TouchableOpacity>
    </TouchableOpacity>
 
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboardpage({ C, onThemeToggle, onNavigateToTab }) {
  const [showAiDoubt, setShowAiDoubt] = useState(false);

  if (showAiDoubt) {
    return (
      <AIDoubtResolver
        onBack={() => setShowAiDoubt(false)}
        themeC={C}
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
        <Header C={C} onThemeToggle={onThemeToggle} />

        <View style={styles.topRow}>
          {/* Tapping the card navigates to the timetable tab in StudentMain */}
          <UpNextCard C={C} onPress={() => onNavigateToTab?.('timetable')} />
          <AssignmentsCard C={C}  onNavigate={onNavigateToTab} />
          <AiDoubtsCard onAskAi={() => setShowAiDoubt(true)} C={C} />
        </View>

        <View style={styles.bottomRow}>
          <SubjectAttendance C={C} />
          <AchievementsCard C={C} />
        </View>

       <AnnouncementBanner C={C} onPress={() => onNavigateToTab?.('chat')} />
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

  card: { borderRadius: 16, borderWidth: 1, padding: 20 },
  cardHeaderRow: {
    flexDirection: 'row', alignItems: IS_DESKTOP ? 'flex-start' : 'center',
    justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardSub:   { fontSize: 12, marginTop: 3, maxWidth: 260 },
  viewAll:   { fontSize: 13, fontWeight: '600' },

  topRow:    { flexDirection: IS_DESKTOP ? 'row' : 'column', gap: 14, alignItems: IS_DESKTOP ? 'stretch' : undefined },
  bottomRow: { flexDirection: IS_DESKTOP ? 'row' : 'column', gap: 14, alignItems: IS_DESKTOP ? 'stretch' : undefined },

  upNextCard:        { flex: IS_DESKTOP ? 1.2 : undefined, gap: 10 },
  upNextBadgeRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upNextBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  upNextBadgeText:   { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bookmarkIcon:      { fontSize: 18, opacity: 0.7 },
  upNextTitle:       { fontSize: IS_DESKTOP ? 25 : 17, fontWeight: '800' },
  upNextMeta:        { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  upNextMetaIcon:    { fontSize: 16 },
  upNextMetaText:    { fontSize: 16 },
  upNextTapHint:     { marginTop: 6, alignItems: 'flex-end' },
  upNextTapHintText: { fontSize: 11, fontWeight: '600', opacity: 0.6 },

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

  announcement:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  announcementIcon:  { fontSize: 22 },
  announcementText:  { flex: 1 },
  announcementTitle: { fontSize: 13, fontWeight: '700' },
  announcementBody:  { fontSize: 12, marginTop: 2, lineHeight: 17 },
  dismissText:       { fontSize: 13, fontWeight: '600' },
});