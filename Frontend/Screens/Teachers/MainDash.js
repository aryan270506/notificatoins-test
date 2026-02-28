// Screens/Teachers/MainDash.js
// Fully responsive Dashboard — Dark & Light mode support

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

/* ─── Theme Definitions ──────────────────────────────────────────────────── */
const DARK = {
  bg:              '#0B0E1A',
  surface:         '#131929',
  surfaceEl:       '#1A2235',
  card:            '#151C2E',
  border:          '#1E2740',
  accent:          '#5B5FEF',
  accentSoft:      'rgba(91,95,239,0.18)',
  accentBright:    '#6C6FF5',
  green:           '#22C55E',
  greenSoft:       'rgba(34,197,94,0.15)',
  yellow:          '#FBBF24',
  red:             '#F43F5E',
  textPrimary:     '#EEF2FF',
  textSec:         '#8B96BE',
  textMuted:       '#3D4A6A',
  nowBg:           '#1C2B1E',
  nowText:         '#4ADE80',
  nowBorder:       'rgba(34,197,94,0.30)',
  doubtCardBg:     '#0F1336',
  doubtCardBorder: 'rgba(91,95,239,0.40)',
  barSecondary:    '#2A3260',
  notifUnread:     'rgba(91,95,239,0.06)',
  reviewBtnBg:     '#FFFFFF',
  reviewBtnColor:  '#0B0E1A',
  toggleBg:        '#1A2235',
  toggleBorder:    '#2A3260',
  toggleIconColor: '#FBBF24',
  shadowColor:     '#000000',
  shadowOpacity:   0,
  statusBar:       'light-content',
};

const LIGHT = {
  bg:              '#F1F4FD',
  surface:         '#FFFFFF',
  surfaceEl:       '#EAEEf9',
  card:            '#FFFFFF',
  border:          '#DDE3F4',
  accent:          '#4A4EE8',
  accentSoft:      'rgba(74,78,232,0.09)',
  accentBright:    '#4A4EE8',
  green:           '#16A34A',
  greenSoft:       'rgba(22,163,74,0.10)',
  yellow:          '#D97706',
  red:             '#DC2626',
  textPrimary:     '#0F172A',
  textSec:         '#4B5563',
  textMuted:       '#9CA3AF',
  nowBg:           '#F0FDF4',
  nowText:         '#15803D',
  nowBorder:       'rgba(22,163,74,0.22)',
  doubtCardBg:     '#EDEEFF',
  doubtCardBorder: 'rgba(74,78,232,0.28)',
  barSecondary:    '#CBD1F4',
  notifUnread:     'rgba(74,78,232,0.05)',
  reviewBtnBg:     '#4A4EE8',
  reviewBtnColor:  '#FFFFFF',
  toggleBg:        '#E8EBFF',
  toggleBorder:    '#C5CAF5',
  toggleIconColor: '#4A4EE8',
  shadowColor:     '#8492B4',
  shadowOpacity:   0.08,
  statusBar:       'dark-content',
};

/* ─── Static data ────────────────────────────────────────────────────────── */
const CHART = [
  { label: 'Sec A', b2024: 62, b2023: 48 },
  { label: 'Sec B', b2024: 50, b2023: 60 },
  { label: 'Sec C', b2024: 78, b2023: 55 },
  { label: 'Sec D', b2024: 72, b2023: 65 },
];

const SCHEDULE = [
  { time: 'NOW HAPPENING', subject: 'Data Structures & Algos', code: 'CS101 • Section A • Room 402', present: '82% Present', now: true  },
  { time: '11:30 AM – 12:45 PM',   subject: 'Systems Design',   code: 'CS304 • Section C • Lab 02',    present: null,          now: false },
  { time: '02:00 PM – 03:00 PM',   subject: 'Faculty Seminar',  code: 'Conference Hall B',             present: null,          now: false },
];

const MESSAGES = [
  { name: 'Liam Johnson',      preview: "Can we reschedule tomorrow's session?",   time: '2m ago',  initials: 'LJ', color: '#A78BFA' },
  { name: 'Prof. Elena Grace', preview: 'The faculty meeting has been moved...',   time: '1h ago',  initials: 'EG', color: '#34D399' },
];

const QUICK = [
  { icon: 'cloud-upload-outline', label: 'Upload Notes',  route: 'PlannerScreen'   },
  { icon: 'calendar-outline',     label: 'Reschedule',    route: 'TimetableScreen' },
  { icon: 'create-outline',       label: 'Grading Desk',  route: 'TeacherExamScreen' },
  { icon: 'people-outline',       label: 'Advisory',      route: 'MessagesScreen'  },
];

const INIT_NOTIFS = [
  { id: 1, read: false, icon: 'help-circle',      iconColor: '#F43F5E', iconBg: 'rgba(244,63,94,0.15)',    tag: 'Urgent',   tagColor: '#F43F5E', title: 'New Doubt Submitted',      body: 'Riya Desai asked about entropy in an isothermal process — CS201',    time: '2 min ago'  },
  { id: 2, read: false, icon: 'chatbubble',        iconColor: '#A78BFA', iconBg: 'rgba(167,139,250,0.15)', tag: 'Message',  tagColor: '#A78BFA', title: 'Message from Liam Johnson', body: "Can we reschedule tomorrow's session to 3 PM?",                      time: '8 min ago'  },
  { id: 3, read: false, icon: 'megaphone',         iconColor: '#FBBF24', iconBg: 'rgba(251,191,36,0.15)',  tag: 'Admin',    tagColor: '#FBBF24', title: 'Admin Announcement',        body: 'End-term paper submissions are due by Friday, Oct 27.',              time: '1 hr ago'   },
  { id: 4, read: false, icon: 'calendar',          iconColor: '#22D3EE', iconBg: 'rgba(34,211,238,0.15)',  tag: 'Schedule', tagColor: '#22D3EE', title: 'Timetable Updated',         body: 'Your Thursday 2 PM slot has been moved to Friday 10 AM by admin.',   time: '3 hr ago'   },
  { id: 5, read: true,  icon: 'checkmark-circle',  iconColor: '#22C55E', iconBg: 'rgba(34,197,94,0.15)',   tag: 'System',   tagColor: '#22C55E', title: 'Grades Submitted',          body: 'Mid-term grades for CS101 Section A have been submitted successfully.', time: 'Yesterday'  },
  { id: 6, read: true,  icon: 'people',            iconColor: '#6C6FF5', iconBg: 'rgba(108,111,245,0.15)', tag: 'Meeting',  tagColor: '#6C6FF5', title: 'Faculty Meeting Reminder',  body: 'Department meeting scheduled tomorrow at 10 AM in Conf. Hall B.',     time: 'Yesterday'  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function MainDash() {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const isDesktop  = width >= 768;

  /* ── Theme ── */
  const [isDark, setIsDark] = useState(true);
  const T = isDark ? DARK : LIGHT;

  /* A subtle scale pulse on toggle for polish */
  const themeScale = useRef(new Animated.Value(1)).current;
  const toggleTheme = () => {
    Animated.sequence([
      Animated.timing(themeScale, { toValue: 0.97, duration: 80,  useNativeDriver: true }),
      Animated.timing(themeScale, { toValue: 1,    duration: 150, useNativeDriver: true }),
    ]).start();
    setIsDark(p => !p);
  };

  /* ── Entrance animations ── */
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(22)).current;
  const barAnims  = CHART.map(() => useRef(new Animated.Value(0)).current);

  /* ── Notification panel ── */
  const [notifs,    setNotifs]    = useState(INIT_NOTIFS);
  const [notifOpen, setNotifOpen] = useState(false);
  const panelAnim   = useRef(new Animated.Value(340)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const unreadCount = notifs.filter(n => !n.read).length;

  const openPanel = () => {
    setNotifOpen(true);
    Animated.parallel([
      Animated.spring(panelAnim,   { toValue: 0,   useNativeDriver: true, tension: 80, friction: 14 }),
      Animated.timing(overlayAnim, { toValue: 1,   useNativeDriver: true, duration: 240 }),
    ]).start();
  };
  const closePanel = (onDone) => {
    Animated.parallel([
      Animated.timing(panelAnim,   { toValue: 340, useNativeDriver: true, duration: 270 }),
      Animated.timing(overlayAnim, { toValue: 0,   useNativeDriver: true, duration: 210 }),
    ]).start(() => { setNotifOpen(false); if (onDone) onDone(); });
  };

  const markRead     = id => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead  = ()  => setNotifs(p => p.map(n => ({ ...n, read: true })));
  const dismissNotif = id  => setNotifs(p => p.filter(n => n.id !== id));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    Animated.stagger(90, barAnims.map(a =>
      Animated.timing(a, { toValue: 1, duration: 680, delay: 180, useNativeDriver: false })
    )).start();
  }, []);

  /* ── Helper: card shadow ── */
  const cardShadow = {
    shadowColor:   T.shadowColor,
    shadowOpacity: T.shadowOpacity,
    shadowRadius:  12,
    shadowOffset:  { width: 0, height: 4 },
    elevation:     isDark ? 0 : 3,
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <View style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.bg} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: 52 }]}
        showsVerticalScrollIndicator={false}>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: themeScale }] }}>

          {/* ══ HEADER ══════════════════════════════════════════════════ */}
          <View style={[s.header, isDesktop && s.headerDesktop]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.greeting, { color: T.textPrimary }]}>
                Good Morning, Dr. Smith 👋
              </Text>
              <Text style={[s.subGreeting, { color: T.textSec }]}>
                Monday, October 23rd  •  Semester Fall 2024
              </Text>
            </View>

            <View style={s.headerActions}>
              {/* Theme Toggle */}
              <TouchableOpacity
                style={[s.headerBtn, { backgroundColor: T.toggleBg, borderColor: T.toggleBorder }]}
                onPress={toggleTheme}
                activeOpacity={0.75}>
                <Ionicons
                  name={isDark ? 'sunny' : 'moon'}
                  size={19}
                  color={T.toggleIconColor}
                />
              </TouchableOpacity>

              {/* Bell */}
              <TouchableOpacity
                style={[s.headerBtn, { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                onPress={openPanel}
                activeOpacity={0.8}>
                <Ionicons
                  name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
                  size={20}
                  color={T.textPrimary}
                />
                {unreadCount > 0 && (
                  <View style={[s.bellDot, { backgroundColor: T.red, borderColor: T.bg }]}>
                    <Text style={s.bellDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* ══ MAIN GRID ═══════════════════════════════════════════════ */}
          <View style={[s.mainGrid, isDesktop && s.mainGridDesktop]}>

            {/* ─ LEFT COLUMN ──────────────────────────────────────────── */}
            <View style={[s.leftCol, isDesktop && { flex: 1 }]}>

              {/* Bar Chart */}
              <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}>
                <View style={s.cardHeaderRow}>
                  <View>
                    <Text style={[s.cardTitle, { color: T.textPrimary }]}>Class Average Performance</Text>
                    <Text style={[s.cardSub,   { color: T.textSec     }]}>Mid-term Comparison (2024)</Text>
                  </View>
                  <View style={s.legendRow}>
                    {/* 2024 legend */}
                    <View style={[s.legendPill, { backgroundColor: T.accentSoft, borderColor: T.accent + '55' }]}>
                      <View style={[s.legendDot, { backgroundColor: T.accentBright }]} />
                      <Text style={[s.legendText, { color: T.accentBright }]}>Batch 2024</Text>
                    </View>
                    {/* 2023 legend */}
                    <View style={[s.legendPill, { backgroundColor: 'transparent', borderColor: T.border }]}>
                      <View style={[s.legendDot, { backgroundColor: T.barSecondary }]} />
                      <Text style={[s.legendText, { color: T.textSec }]}>Batch 2023</Text>
                    </View>
                  </View>
                </View>

                <View style={s.chartArea}>
                  {CHART.map((item, i) => (
                    <View key={i} style={s.barGroup}>
                      <View style={s.barPair}>
                        <Animated.View style={[s.bar, {
                          backgroundColor: T.accentBright,
                          height: barAnims[i].interpolate({ inputRange: [0,1], outputRange: [0, item.b2024 * 1.4] }),
                        }]} />
                        <Animated.View style={[s.bar, {
                          backgroundColor: T.barSecondary,
                          height: barAnims[i].interpolate({ inputRange: [0,1], outputRange: [0, item.b2023 * 1.4] }),
                        }]} />
                      </View>
                      <Text style={[s.barLabel, { color: T.textMuted }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Messages + Quick Actions */}
              <View style={[s.bottomRow, isDesktop && s.bottomRowDesktop]}>

                {/* Recent Messages */}
                <View style={[s.card, s.halfCard, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}>
                  <View style={s.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[s.cardIconBubble, { backgroundColor: T.accentSoft }]}>
                        <Ionicons name="chatbubble-outline" size={14} color={T.accentBright} />
                      </View>
                      <Text style={[s.cardTitle, { color: T.textPrimary }]}>Recent Messages</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('MessagesScreen')}>
                      <Text style={[s.viewAll, { color: T.accent }]}>View All</Text>
                    </TouchableOpacity>
                  </View>

                  {MESSAGES.map((m, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.messageRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: T.border, marginTop: 12, paddingTop: 12 }]}
                      onPress={() => navigation.navigate('MessagesScreen')}
                      activeOpacity={0.7}>
                      <View style={[s.msgAvatar, { backgroundColor: m.color + '22' }]}>
                        <Text style={[s.msgAvatarText, { color: m.color }]}>{m.initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[s.msgName,    { color: T.textPrimary }]}>{m.name}</Text>
                          <Text style={[s.msgTime,    { color: T.textMuted   }]}>{m.time}</Text>
                        </View>
                        <Text style={[s.msgPreview, { color: T.textSec }]} numberOfLines={1}>{m.preview}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quick Actions */}
                <View style={[s.card, s.halfCard, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <View style={[s.cardIconBubble, { backgroundColor: T.accentSoft }]}>
                      <Ionicons name="flash-outline" size={14} color={T.accentBright} />
                    </View>
                    <Text style={[s.cardTitle, { color: T.textPrimary }]}>Quick Actions</Text>
                  </View>
                  <View style={s.quickGrid}>
                    {QUICK.map((q, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.quickItem, { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                        onPress={() => navigation.navigate(q.route)}
                        activeOpacity={0.75}>
                        <View style={[s.quickIconWrap, { backgroundColor: T.accentSoft }]}>
                          <Ionicons name={q.icon} size={22} color={T.accentBright} />
                        </View>
                        <Text style={[s.quickLabel, { color: T.textPrimary }]}>{q.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

              </View>
            </View>

            {/* ─ RIGHT COLUMN ─────────────────────────────────────────── */}
            <View style={[s.rightCol, isDesktop && { width: 300 }]}>

              {/* Pending Doubts */}
              <View style={[s.card, {
                backgroundColor:  T.doubtCardBg,
                borderColor:      T.doubtCardBorder,
                shadowColor:      T.accent,
                shadowOpacity:    isDark ? 0.18 : 0.10,
                shadowRadius:     18,
                shadowOffset:     { width: 0, height: 6 },
                elevation:        5,
              }]}>
                <View style={s.cardHeaderRow}>
                  <Text style={[s.cardTitle, { color: T.textPrimary }]}>Pending Doubts</Text>
                  <View style={[s.doubtBellWrap, { backgroundColor: T.accent }]}>
                    <Ionicons name="notifications" size={16} color="#fff" />
                  </View>
                </View>
                <Text style={[s.doubtCount, { color: T.textPrimary }]}>12</Text>
                <Text style={[s.doubtSub,   { color: T.textSec     }]}>4 urgent queries from CS201 class</Text>
                <TouchableOpacity
                  style={[s.reviewBtn, { backgroundColor: T.reviewBtnBg,
                    shadowColor: T.accent, shadowOpacity: isDark ? 0 : 0.25, shadowRadius: 8, shadowOffset: { width:0, height:4 }, elevation: isDark ? 0 : 3 }]}
                  onPress={() => navigation.navigate('DoubtScreen')}
                  activeOpacity={0.85}>
                  <Text style={[s.reviewBtnText, { color: T.reviewBtnColor }]}>Review Doubts</Text>
                </TouchableOpacity>
              </View>

              {/* Today's Schedule */}
              <View style={[s.card, { backgroundColor: T.card, borderColor: T.border }, cardShadow]}>
                <View style={s.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.cardIconBubble, { backgroundColor: T.accentSoft }]}>
                      <Ionicons name="calendar-outline" size={14} color={T.accentBright} />
                    </View>
                    <Text style={[s.cardTitle, { color: T.textPrimary }]}>Today's Schedule</Text>
                  </View>
                  <View style={[s.dateBadge, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
                    <Text style={[s.dateBadgeText, { color: T.textMuted }]}>OCT 23</Text>
                  </View>
                </View>

                {SCHEDULE.map((item, i) => (
                  <View key={i} style={s.scheduleItem}>
                    <View style={s.scheduleTimeline}>
                      <View style={[s.scheduleDot,
                        { backgroundColor: item.now ? T.accent : T.border },
                        item.now && { shadowColor: T.accent, shadowOpacity: 0.7, shadowRadius: 5, elevation: 3 },
                      ]} />
                      {i < SCHEDULE.length - 1 && <View style={[s.scheduleLine, { backgroundColor: T.border }]} />}
                    </View>

                    <View style={[s.scheduleBody,
                      item.now && {
                        backgroundColor: T.nowBg, borderRadius: 12, padding: 12,
                        borderWidth: 1, borderColor: T.nowBorder, marginBottom: 8,
                      }]}>
                      {item.now
                        ? <Text style={[s.nowLabel, { color: T.nowText }]}>● NOW HAPPENING</Text>
                        : <Text style={[s.scheduleTime, { color: T.textMuted }]}>{item.time}</Text>
                      }
                      <Text style={[s.scheduleSubject, { color: item.now ? T.textPrimary : T.textSec }]}>
                        {item.subject}
                      </Text>
                      <Text style={[s.scheduleCode, { color: T.textMuted }]}>{item.code}</Text>
                      {item.present && (
                        <View style={[s.presentPill, { backgroundColor: T.greenSoft, borderColor: T.green + '40' }]}>
                          <Text style={[s.presentText, { color: T.green }]}>{item.present}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>

            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* ══ NOTIFICATION PANEL ══════════════════════════════════════════════ */}
      <Modal visible={notifOpen} transparent animationType="none" onRequestClose={closePanel}>
        <View style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={closePanel}>
            <Animated.View style={[s.notifOverlay, { opacity: overlayAnim }]} />
          </TouchableWithoutFeedback>

          <Animated.View style={[s.notifPanel, {
            backgroundColor: T.surface,
            borderLeftColor: T.border,
            shadowColor:     T.shadowColor,
            shadowOpacity:   isDark ? 0.5 : 0.12,
            transform: [{ translateX: panelAnim }],
          }]}>
            {/* Header */}
            <View style={[s.notifPanelHeader, { borderBottomColor: T.border }]}>
              <View>
                <Text style={[s.notifTitle, { color: T.textPrimary }]}>Notifications</Text>
                <Text style={[s.notifSub,   { color: T.textSec     }]}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up ✓'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={[s.markAllBtn, { backgroundColor: T.accentSoft }]}
                    onPress={markAllRead}>
                    <Text style={[s.markAllText, { color: T.accentBright }]}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.closePanelBtn, { backgroundColor: T.surfaceEl, borderColor: T.border }]}
                  onPress={closePanel}>
                  <Ionicons name="close" size={18} color={T.textSec} />
                </TouchableOpacity>
              </View>
            </View>

            {/* List */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {notifs.length === 0 ? (
                <View style={s.emptyNotif}>
                  <Ionicons name="notifications-off-outline" size={44} color={T.textMuted} />
                  <Text style={[s.emptyText, { color: T.textMuted }]}>No notifications</Text>
                </View>
              ) : notifs.map(n => (
                <TouchableOpacity
                  key={n.id}
                  style={[s.notifItem, { borderBottomColor: T.border },
                    !n.read && { backgroundColor: T.notifUnread }]}
                  onPress={() => markRead(n.id)}
                  activeOpacity={0.75}>
                  {!n.read && <View style={[s.unreadBar, { backgroundColor: n.iconColor }]} />}
                  <View style={[s.notifIconWrap, { backgroundColor: n.iconBg }]}>
                    <Ionicons name={n.icon} size={20} color={n.iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <View style={[s.notifTagPill, { backgroundColor: n.iconBg }]}>
                        <Text style={[s.notifTagText, { color: n.tagColor }]}>{n.tag}</Text>
                      </View>
                      <Text style={[s.notifTime, { color: T.textMuted }]}>{n.time}</Text>
                    </View>
                    <Text style={[s.notifItemTitle, { color: n.read ? T.textSec : T.textPrimary }]}>
                      {n.title}
                    </Text>
                    <Text style={[s.notifItemBody, { color: T.textMuted }]} numberOfLines={2}>
                      {n.body}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.dismissBtn}
                    onPress={() => dismissNotif(n.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={16} color={T.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>

          {/* Footer */}
           <View style={[s.notifFooter, { borderTopColor: T.border }]}>
              <TouchableOpacity
               style={[s.seeAllBtn, { backgroundColor: T.accentSoft }]}
               onPress={() => closePanel(() => navigation.navigate('MessagesScreen'))}>
              <Text style={[s.seeAllText, { color: T.accent }]}>See all activity</Text>
              <Ionicons name="arrow-forward" size={14} color={T.accent} />
              </TouchableOpacity>
           </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── Layout-only styles (no hardcoded colors) ───────────────────────────── */
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const s = StyleSheet.create({
  root:    { flex: 1 },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 58 : 20 },

  /* Header */
  header:        { flexDirection: 'column', gap: 14, marginBottom: 22 },
  headerDesktop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting:      { fontSize: 26, fontWeight: '800', fontFamily: SERIF, marginBottom: 4 },
  subGreeting:   { fontSize: 13 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBtn: {
    width: 42, height: 42, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  bellDot: {
    position: 'absolute', top: 5, right: 5,
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5,
  },
  bellDotText: { fontSize: 9, fontWeight: '900', color: '#fff' },

  /* Grid */
  mainGrid:        { flexDirection: 'column', gap: 16 },
  mainGridDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  leftCol:         { gap: 16 },
  rightCol:        { gap: 16 },

  /* Card */
  card: { borderRadius: 16, borderWidth: 1, padding: 18 },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8,
  },
  cardTitle:      { fontSize: 15, fontWeight: '700' },
  cardSub:        { fontSize: 12, marginTop: 2 },
  cardIconBubble: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  viewAll:        { fontSize: 13, fontWeight: '600' },

  /* Legend */
  legendRow:  { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  legendPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  legendDot:  { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '700' },

  /* Bar chart */
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 160, paddingTop: 10 },
  barGroup:  { alignItems: 'center', flex: 1, gap: 8 },
  barPair:   { flexDirection: 'row', alignItems: 'flex-end', gap: 5, flex: 1 },
  bar:       { width: 18, borderRadius: 6, minHeight: 4 },
  barLabel:  { fontSize: 10, textAlign: 'center' },

  /* Bottom row */
  bottomRow:        { flexDirection: 'column', gap: 16 },
  bottomRowDesktop: { flexDirection: 'row', gap: 16 },
  halfCard:         { flex: 1 },

  /* Messages */
  messageRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  msgAvatar:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: 13, fontWeight: '800' },
  msgName:       { fontSize: 13, fontWeight: '700' },
  msgTime:       { fontSize: 11 },
  msgPreview:    { fontSize: 12, marginTop: 2 },

  /* Quick Actions */
  quickGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickItem:    { width: '47%', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  quickIconWrap:{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickLabel:   { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  /* Doubts */
  doubtBellWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  doubtCount:    { fontSize: 52, fontWeight: '900', fontFamily: SERIF, lineHeight: 60, marginBottom: 4 },
  doubtSub:      { fontSize: 13, marginBottom: 14 },
  reviewBtn:     { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  reviewBtnText: { fontSize: 14, fontWeight: '700' },

  /* Schedule */
  scheduleItem:    { flexDirection: 'row', gap: 12, marginBottom: 4 },
  scheduleTimeline:{ alignItems: 'center', width: 14, paddingTop: 4 },
  scheduleDot:     { width: 10, height: 10, borderRadius: 5 },
  scheduleLine:    { width: 2, flex: 1, marginTop: 4, marginBottom: 4, minHeight: 20 },
  scheduleBody:    { flex: 1, paddingBottom: 14, paddingLeft: 4 },
  nowLabel:        { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, marginBottom: 4 },
  scheduleTime:    { fontSize: 11, marginBottom: 3 },
  scheduleSubject: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  scheduleCode:    { fontSize: 12 },
  presentPill:     { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  presentText:     { fontSize: 11, fontWeight: '700' },
  dateBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  dateBadgeText:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  /* Notification panel */
  notifOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.52)' },
  notifPanel: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: 340,
    borderLeftWidth: 1, shadowOffset: { width: -4, height: 0 }, shadowRadius: 22, elevation: 22,
    paddingTop: Platform.OS === 'ios' ? 58 : 20,
  },
  notifPanelHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, marginBottom: 4,
  },
  notifTitle:    { fontSize: 18, fontWeight: '800', fontFamily: SERIF },
  notifSub:      { fontSize: 12, marginTop: 2 },
  markAllBtn:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  markAllText:   { fontSize: 11, fontWeight: '700' },
  closePanelBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notifItem:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1, position: 'relative' },
  unreadBar:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  notifIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifTagPill:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  notifTagText:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  notifTime:     { fontSize: 10, flex: 1, textAlign: 'right' },
  notifItemTitle:{ fontSize: 13, fontWeight: '700', marginBottom: 3 },
  notifItemBody: { fontSize: 12, lineHeight: 17 },
  dismissBtn:    { paddingTop: 2, flexShrink: 0 },
  emptyNotif:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText:     { fontSize: 14 },
  notifFooter:   { padding: 16, borderTopWidth: 1 },
  seeAllBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  seeAllText:    { fontSize: 13, fontWeight: '700' },
});