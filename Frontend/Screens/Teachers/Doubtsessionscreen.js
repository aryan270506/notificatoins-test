// Screens/Teacher/Doubtsessionscreen.js
// ═══════════════════════════════════════════════════════════════════════════════
//  UniVerse — Doubt Management Hub  (Teacher View)
//  • Fetches all doubts          →  GET    /api/doubts
//  • Fetches teacher subjects    →  GET    /api/timetable/teacher/:teacherId
//  • Update doubt status         →  PATCH  /api/doubts/:id/status
//  • Delete doubt                →  DELETE /api/doubts/:id
//  • Broadcast answer            →  POST   /api/doubts/broadcast
//  • Tap card                    →  DoubtSolveScreen
//  • Responsive: 3-col desktop | 2-col tablet | 1-col mobile
//  • Resolved doubts hidden from grid but counted in stats chips
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useRef, useEffect, useState, useCallback, useContext } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Animated, Platform, StatusBar, useWindowDimensions,
  ActivityIndicator, RefreshControl, Modal, Alert, ActionSheetIOS,
} from 'react-native';
import { Ionicons }  from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axiosInstance from '../../Src/Axios';
import { ThemeContext } from './TeacherStack';

/* ─── Original Themes ────────────────────────────────────────────────────────── */
const DARK = {
  bg: '#07090F', surface: '#0D1120', surfaceEl: '#111827', card: '#0F1523',
  border: '#1A2035',
  accent: '#3B82F6', accentSoft: 'rgba(59,130,246,0.14)', accentBright: '#60A5FA',
  green: '#10B981',  greenSoft:  'rgba(16,185,129,0.14)',
  yellow: '#F59E0B', yellowSoft: 'rgba(245,158,11,0.14)',
  red: '#EF4444',    redSoft:    'rgba(239,68,68,0.14)',
  purple: '#8B5CF6', purpleSoft: 'rgba(139,92,246,0.14)',
  cyan: '#06B6D4',   cyanSoft:   'rgba(6,182,212,0.14)',
  orange: '#F97316', orangeSoft: 'rgba(249,115,22,0.14)',
  pink: '#EC4899',   pinkSoft:   'rgba(236,72,153,0.14)',
  textPrimary: '#EEF2FF', textSec: '#8B96BE', textMuted: '#3D4A6A',
  statusBar: 'light-content', shadow: '#000',
};
const LIGHT = {
  bg: '#F5F7FF', surface: '#FFFFFF', surfaceEl: '#EEF2FF', card: '#FFFFFF',
  border: '#E2E8F4',
  accent: '#3B6FE8', accentSoft: 'rgba(59,111,232,0.09)', accentBright: '#3B6FE8',
  green: '#059669',  greenSoft:  'rgba(5,150,105,0.10)',
  yellow: '#D97706', yellowSoft: 'rgba(217,119,6,0.10)',
  red: '#DC2626',    redSoft:    'rgba(220,38,38,0.10)',
  purple: '#7C3AED', purpleSoft: 'rgba(124,58,237,0.10)',
  cyan: '#0891B2',   cyanSoft:   'rgba(8,145,178,0.10)',
  orange: '#EA580C', orangeSoft: 'rgba(234,88,12,0.10)',
  pink: '#DB2777',   pinkSoft:   'rgba(219,39,119,0.10)',
  textPrimary: '#0F172A', textSec: '#4B5563', textMuted: '#94A3B8',
  statusBar: 'dark-content', shadow: '#8492B4',
};
const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

/* ─── Subject colour palette (theme-aware, cycles) ───────────────────────────── */
const PALETTE = (T) => [
  { text: T.accentBright, bg: T.accentSoft  },
  { text: T.purple,       bg: T.purpleSoft  },
  { text: T.cyan,         bg: T.cyanSoft    },
  { text: T.green,        bg: T.greenSoft   },
  { text: T.yellow,       bg: T.yellowSoft  },
  { text: T.orange,       bg: T.orangeSoft  },
  { text: T.pink,         bg: T.pinkSoft    },
  { text: T.red,          bg: T.redSoft     },
];

const buildColorMap = (subjects, T) => {
  const p = PALETTE(T);
  const m = {};
  subjects.forEach((s, i) => { m[s.toLowerCase()] = p[i % p.length]; });
  return m;
};

const getSubColor = (subject = '', map, T) => {
  const k = subject.toLowerCase().trim();
  if (map[k]) return map[k];
  const hit = Object.keys(map).find(key => k.includes(key) || key.includes(k));
  if (hit) return map[hit];
  const p = PALETTE(T);
  let h = 0;
  for (let i = 0; i < subject.length; i++) h = (h * 31 + subject.charCodeAt(i)) >>> 0;
  return p[h % p.length];
};

/* ─── Status config (teacher labels) ────────────────────────────────────────── */
const ST = (T) => ({
  'PENDING':   { label: 'PENDING REVIEW', bg: T.yellowSoft, text: T.yellow       },
  'IN REVIEW': { label: 'REPLIED',        bg: T.accentSoft, text: T.accentBright },
  'RESOLVED':  { label: 'RESOLVED',       bg: T.greenSoft,  text: T.green        },
});
const stCfg = (s, T) => ST(T)[s] || ST(T)['PENDING'];

/* ─── Priority config (theme-aware) ─────────────────────────────────────────── */
const getPriorityCfg = (priority, T) => {
  switch (priority) {
    case 'HIGH':   return { label: 'EXAM PREP – HIGH PRIORITY', icon: 'warning',            color: T.red,    bg: T.redSoft,    border: T.red    };
    case 'MEDIUM': return { label: 'MID-TERM PRIORITY',         icon: 'alert-circle',       color: T.yellow, bg: T.yellowSoft, border: T.yellow };
    default:       return { label: 'REGULAR INQUIRY',           icon: 'information-circle', color: T.accent, bg: T.accentSoft, border: T.accent };
  }
};

/* ─── Nav filter tabs ─────────────────────────────────────────────────────────── */
const NAV_TABS = [
  { label: 'All',        key: 'All'       },
  { label: 'Unanswered', key: 'PENDING'   },
  { label: 'Urgent',     key: 'URGENT'    },
  { label: 'Replied',    key: 'IN REVIEW' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */
const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60)     return `${s}s ago`;
  if (s < 3600)   return `${Math.floor(s / 60)} mins ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

/* ═══════════════════════════════════════════════════════════════════════════════
 *  BROADCAST MODAL
 * ═══════════════════════════════════════════════════════════════════════════════ */
const BroadcastModal = ({ visible, onClose, teacherId, subjects, T }) => {
  const [broadcastText,   setBroadcastText]   = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [sending,         setSending]         = useState(false);

  const handleSend = async () => {
    if (!broadcastText.trim()) {
      Alert.alert('Empty Message', 'Please enter a broadcast message.');
      return;
    }
    setSending(true);
    try {
      await axiosInstance.post('/doubts/broadcast', {
        teacherId,
        subject: selectedSubject || null,
        message: broadcastText.trim(),
      });
      Alert.alert('Broadcast Sent', 'Your answer has been sent to all relevant students.');
      setBroadcastText('');
      setSelectedSubject('');
      onClose();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to send broadcast. Please try again.');
    } finally {
      setSending(false);
    }
  };

 
};

/* ═══════════════════════════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════ */
export default function DoubtSessionScreen() {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const { isDark } = useContext(ThemeContext);
  const T          = isDark ? DARK : LIGHT;
  const isDesktop  = width >= 900;
  const isTablet   = width >= 600;
  const numCols    = isDesktop ? 3 : isTablet ? 2 : 1;

  /* ── State ── */
  const [teacherId,      setTeacherId]      = useState(null);
  const [teacherName,    setTeacherName]    = useState('Teacher');
  const [teacherRole,    setTeacherRole]    = useState('Senior Faculty');
  const [doubts,         setDoubts]         = useState([]);     // active only (no resolved)
  const [apiStats,       setApiStats]       = useState(null);   // ← NEW: full stats from API
  const [subjects,       setSubjects]       = useState([]);
  const [colorMap,       setColorMap]       = useState({});
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [search,         setSearch]         = useState('');
  const [activeNav,      setActiveNav]      = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showBroadcast,  setShowBroadcast]  = useState(false);
  const [showAdvFilters, setShowAdvFilters] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 14, useNativeDriver: true }),
    ]).start();
    initLoad();
  }, []);

  /* Re-fetch on screen focus — merge incoming with any locally-resolved cards */
  useFocusEffect(useCallback(() => {
    fetchDoubts();
  }, []));

  const initLoad = async () => {
    try {
      const id   = await AsyncStorage.getItem('teacherId');
      const name = await AsyncStorage.getItem('teacherName');
      const role = await AsyncStorage.getItem('teacherRole');
      if (id)   setTeacherId(id);
      if (name) setTeacherName(name);
      if (role) setTeacherRole(role);
      await Promise.all([fetchDoubts(), fetchSubjects(id)]);
    } catch (_) {
      await fetchDoubts();
    }
  };

  /* ──────────────────────────────────────────────────────────────────────
   *  GET /api/doubts
   *  Response now includes:
   *    - doubts: active (non-resolved) only  → shown as cards
   *    - stats:  { total, resolved, pending, review, urgent }  → stat chips
   * ────────────────────────────────────────────────────────────────────── */
  const fetchDoubts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/doubts');
      if (res.data?.success) {
        const incoming = res.data.doubts || [];
        // Merge: preserve any locally-resolved cards that the API no longer returns
        setDoubts(prev => {
          const incomingIds = new Set(incoming.map(d => d._id));
          const localResolved = prev.filter(
            d => d.status === 'RESOLVED' && !incomingIds.has(d._id)
          );
          return [...incoming, ...localResolved];
        });
        if (res.data.stats) {
          setApiStats(res.data.stats);
        } else {
          setApiStats(null);
        }
      }
    } catch (e) {
      console.warn('fetchDoubts:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ──────────────────────────────────────────────────────────────────────
   *  GET /api/timetable/teacher/:teacherId
   * ────────────────────────────────────────────────────────────────────── */
  const fetchSubjects = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await axiosInstance.get(`/timetable/teacher/${id}`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        const unique = [...new Set(res.data.data.map(s => s.subject).filter(Boolean))].sort();
        setSubjects(unique);
        setColorMap(buildColorMap(unique, T));
      }
    } catch (e) {
      console.warn('fetchSubjects:', e.message);
    }
  }, [T]);

  /* ──────────────────────────────────────────────────────────────────────
   *  PATCH /api/doubts/:id/status
   * ────────────────────────────────────────────────────────────────────── */
  const updateStatus = async (doubtId, status) => {
    try {
      const res = await axiosInstance.patch(`/doubts/${doubtId}/status`, { status });
      if (res.data?.success) {
        // Always update in-place — card stays in grid, resolved banner appears
        setDoubts(prev => prev.map(d => d._id === doubtId ? { ...d, status } : d));
        // NOTE: no fetchDoubts() here — it would overwrite local resolved state
        // Stats will refresh on next pull-to-refresh or screen focus
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to update status.');
    }
  };

  /* ──────────────────────────────────────────────────────────────────────
   *  DELETE /api/doubts/:id
   * ────────────────────────────────────────────────────────────────────── */
  const deleteDoubt = (doubtId) => {
    Alert.alert(
      'Delete Doubt',
      'Are you sure you want to delete this doubt thread permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/doubts/${doubtId}`);
              setDoubts(prev => prev.filter(d => d._id !== doubtId));
              // Refetch to update stats after deletion
              await fetchDoubts();
            } catch (e) {
              Alert.alert('Error', e?.response?.data?.error || 'Failed to delete doubt.');
            }
          },
        },
      ]
    );
  };

  /* ── Per-card more options sheet ── */
  const showMoreOptions = (doubt) => {
    const options   = ['Mark as Resolved', 'Mark as Pending', 'Delete Thread', 'Cancel'];
    const destI     = 2;
    const cancelI   = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destI, cancelButtonIndex: cancelI },
        (i) => {
          if (i === 0) updateStatus(doubt._id, 'RESOLVED');
          if (i === 1) updateStatus(doubt._id, 'PENDING');
          if (i === 2) deleteDoubt(doubt._id);
        }
      );
    } else {
      Alert.alert('Options', `"${doubt.title || doubt.subject}"`, [
        { text: 'Mark as Resolved', onPress: () => updateStatus(doubt._id, 'RESOLVED') },
        { text: 'Mark as Pending',  onPress: () => updateStatus(doubt._id, 'PENDING')  },
        { text: 'Delete Thread',    style: 'destructive', onPress: () => deleteDoubt(doubt._id) },
        { text: 'Cancel',           style: 'cancel' },
      ]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchDoubts(), fetchSubjects(teacherId)]);
    setRefreshing(false);
  };

  const openDoubt = (doubt) =>
    navigation.navigate('DoubtSolveScreen', { doubtId: doubt._id, teacherId });

  /* ── Filtering (only over active doubts — resolved are already excluded) ── */
  const filtered = doubts.filter(d => {
    const q     = search.toLowerCase().trim();
    let matchNav = true;
    if (activeNav === 'PENDING')   matchNav = d.status === 'PENDING';
    if (activeNav === 'IN REVIEW') matchNav = d.status === 'IN REVIEW';
    if (activeNav === 'URGENT')    matchNav = d.priority === 'HIGH';

    const matchPri    = priorityFilter === 'All' || d.priority === priorityFilter;
    const matchSearch = !q ||
      d.subject?.toLowerCase().includes(q)     ||
      d.title?.toLowerCase().includes(q)       ||
      d.studentName?.toLowerCase().includes(q);

    return matchNav && matchPri && matchSearch;
  });

  /* ── Stats ─────────────────────────────────────────────────────────────────
   * Prefer server-provided stats (includes resolved count).
   * Fall back to local derivation if the server hasn't been updated yet.
   * ───────────────────────────────────────────────────────────────────────── */
  const stats = apiStats
    ? apiStats
    : {
        total:    doubts.length,
        pending:  doubts.filter(d => d.status === 'PENDING').length,
        review:   doubts.filter(d => d.status === 'IN REVIEW').length,
        resolved: 0,   // unknown without server support
        urgent:   doubts.filter(d => d.priority === 'HIGH').length,
      };

  const cardShadow = isDark
    ? {}
    : { shadowColor: T.shadow, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 3 };

  /* ═══════════════════════════════════════════════════════════════════
   *  DOUBT CARD
   * ═══════════════════════════════════════════════════════════════════ */
  const DoubtCard = ({ doubt: d }) => {
    const sc        = getSubColor(d.subject, colorMap, T);
    const st        = stCfg(d.status, T);
    const pri       = getPriorityCfg(d.priority || 'LOW', T);
    const isPending = d.status === 'PENDING';
    const isReview  = d.status === 'IN REVIEW';

    const ctaLabel  = isPending ? 'Write Reply →' : 'View Thread →';
    const ctaBg     = isPending ? T.red : T.accentBright;
    const accentLeft= isPending ? T.red : isReview ? T.accentBright : T.green;

    return (
      <TouchableOpacity
        onPress={() => openDoubt(d)}
        activeOpacity={0.87}
        style={[
          s.card,
          { backgroundColor: T.card, borderColor: T.border },
          cardShadow,
          { borderLeftWidth: 3, borderLeftColor: accentLeft },
        ]}
      >
        {/* Row 1: subject · time · status */}
        <View style={s.cardTop}>
          <View style={[s.subTag, { backgroundColor: sc.bg }]}>
            <Text style={[s.subTagTxt, { color: sc.text }]}>
              {(d.subject || 'GENERAL').toUpperCase()}
            </Text>
          </View>
          <Text style={[s.cardTime, { color: T.textMuted }]} numberOfLines={1}>
            {timeAgo(d.updatedAt || d.createdAt)}
          </Text>
          <View style={[s.stBadge, { backgroundColor: st.bg }]}>
            <Text style={[s.stBadgeTxt, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[s.cardTitle, { color: T.textPrimary }]} numberOfLines={2}>
          {d.title || d.subject || 'Untitled Question'}
        </Text>

        {/* Student info */}
        <View style={s.studentRow}>
          <View style={[s.avatarCircle, { backgroundColor: T.purpleSoft }]}>
            <Text style={[s.avatarTxt, { color: T.purple }]}>
              {getInitials(d.studentName || 'ST')}
            </Text>
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={[s.studentName, { color: T.textPrimary }]}>
              {d.studentName || 'Student'}
            </Text>
            <Text style={[s.studentMeta, { color: T.textMuted }]}>
              {[d.studentClass && `Class ${d.studentClass}`, d.division && `Section ${d.division}`]
                .filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {/* Priority banner */}
        <View style={[s.priBanner, { backgroundColor: pri.bg, borderColor: pri.border + '55' }]}>
          <Ionicons name={pri.icon} size={11} color={pri.color} />
          <Text style={[s.priTxt, { color: pri.color }]}>{pri.label}</Text>
        </View>

        {/* Footer: CTA + more */}
        {/* ── Resolved overlay banner ── */}
      {d.status === 'RESOLVED' && (
        <View style={[s.resolvedOverlay, { backgroundColor: 'rgba(16,185,129,0.10)', borderColor: 'rgba(16,185,129,0.30)', borderTopWidth: 1 }]}>
          <Ionicons name="checkmark-circle" size={15} color={T.green} />
          <Text style={[s.resolvedOverlayTxt, { color: T.green }]}>Doubt Resolved</Text>
        </View>
      )}

      {/* Footer: CTA + more */}
      {/* ── Resolved banner ── */}
        {d.status === 'RESOLVED' && (
          <View style={[s.resolvedCardBanner, {
            backgroundColor: T.greenSoft,
            borderColor: T.green + '44',
          }]}>
            <Ionicons name="checkmark-circle" size={15} color={T.green} />
            <Text style={[s.resolvedCardBannerTxt, { color: T.green }]}>
              Doubt Resolved
            </Text>
          </View>
        )}

        {/* Footer: CTA + more */}
        <View style={[s.cardFooter, d.status === 'RESOLVED' && { opacity: 0.4, pointerEvents: 'none' }]}>
          <TouchableOpacity
            onPress={() => openDoubt(d)}
            style={[s.ctaBtn, { backgroundColor: ctaBg }]}
            activeOpacity={0.82}
          >
            <Text style={[s.ctaBtnTxt, { color: '#fff' }]}>{ctaLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => showMoreOptions(d)}
            style={[s.moreBtn, { backgroundColor: T.surfaceEl, borderColor: T.border }]}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={T.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  /* ── Broadcast teaser card ── */


  /* ═══════════════════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════════════════ */
  return (
    <View style={[s.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle={T.statusBar} backgroundColor={T.surface} />

      <Animated.View style={[
        { flex: 1 },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}>

        {/* ══ TOP HEADER BAR ══ */}
        <View style={[s.topBar, { backgroundColor: T.surface, borderBottomColor: T.border }]}>

          <Text style={[s.topBarTitle, { color: T.textPrimary, fontFamily: SERIF }]}>
            Doubt Management Hub
          </Text>

          {/* Global search */}
          <View style={[s.searchBox, { backgroundColor: T.surfaceEl, borderColor: T.border }]}>
            <Ionicons name="search-outline" size={13} color={T.textMuted} style={{ marginRight: 6 }} />
            <TextInput
              style={[s.searchInput, { color: T.textPrimary }]}
              placeholder="Global Search: Student name, keyword…"
              placeholderTextColor={T.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={14} color={T.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Nav filter tabs — "Archived" tab removed (resolved hidden from grid) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabsRow}
          >
            {NAV_TABS.map(tab => {
              const active = activeNav === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveNav(tab.key)}
                  style={[s.tab, active && { borderBottomColor: T.accentBright }]}
                >
                  <Text style={[
                    s.tabTxt,
                    { color: active ? T.accentBright : T.textSec },
                    active && { fontWeight: '700' },
                  ]}>
                    {tab.label}
                  </Text>
                  {tab.key === 'PENDING' && stats.pending > 0 && (
                    <View style={[s.tabBadge, { backgroundColor: T.red }]}>
                      <Text style={s.tabBadgeTxt}>{stats.pending}</Text>
                    </View>
                  )}
                  {tab.key === 'URGENT' && stats.urgent > 0 && (
                    <View style={[s.tabBadge, { backgroundColor: T.orange }]}>
                      <Text style={s.tabBadgeTxt}>{stats.urgent}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Teacher profile chip */}
          <View style={s.profileChip}>
            <View style={[s.profileAvatar, { backgroundColor: T.accentBright }]}>
              <Text style={s.profileAvatarTxt}>{getInitials(teacherName)}</Text>
            </View>
            <View style={{ marginLeft: 8 }}>
              <Text style={[s.profileName, { color: T.textPrimary }]}>{teacherName}</Text>
              <Text style={[s.profileRole, { color: T.textMuted }]}>{teacherRole}</Text>
            </View>
          </View>
        </View>

        {/* ══ PAGE HEADER ══ */}
        <View style={[s.pageHead, { backgroundColor: T.bg }]}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Text style={[s.pageTitle, { color: T.textPrimary, fontFamily: SERIF }]}>
              Student Queries
            </Text>
            <Text style={[s.pageSub, { color: T.textSec }]}>
              Manage and respond to student doubts. Prioritize urgent exam-prep questions first.
            </Text>
          </View>

          
        </View>

        {/* ══ ADVANCED FILTERS ══ */}
        {showAdvFilters && (
          <View style={[s.advFilterPanel, { backgroundColor: T.surface, borderColor: T.border }]}>
            <Text style={[s.advFilterLabel, { color: T.textSec }]}>Priority</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'All Priorities', key: 'All'    },
                { label: 'High',           key: 'HIGH'   },
                { label: 'Medium',         key: 'MEDIUM' },
                { label: 'Low',            key: 'LOW'    },
              ].map(p => {
                const active = priorityFilter === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => setPriorityFilter(p.key)}
                    style={[
                      s.filterChip,
                      { backgroundColor: T.surfaceEl, borderColor: T.border },
                      active && { backgroundColor: T.accentBright, borderColor: T.accentBright },
                    ]}
                  >
                    <Text style={[
                      s.filterChipTxt,
                      { color: T.textSec },
                      active && { color: '#fff' },
                    ]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ══ CARDS / LOADING / EMPTY ══ */}
        {loading ? (
          <View style={s.centerState}>
            <ActivityIndicator color={T.accentBright} size="large" />
            <Text style={[s.centerTxt, { color: T.textMuted, marginTop: 12 }]}>
              Loading student doubts…
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.centerState}>
            <View style={[s.emptyBox, { backgroundColor: T.surfaceEl }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color={T.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: T.textPrimary }]}>
              {search ? 'No Matches' : doubts.length === 0 ? 'No Active Doubts' : 'All Clear Here'}
            </Text>
            <Text style={[s.centerTxt, { color: T.textMuted }]}>
              {search
                ? `No questions match "${search}"`
                : doubts.length === 0
                  ? `Student questions will appear here once submitted.\n${stats.resolved > 0 ? `${stats.resolved} doubt(s) already resolved.` : ''}`
                  : 'No questions in this filter. Try another tab.'}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={T.accentBright}
                colors={[T.accentBright]}
              />
            }
            contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 14 }}
          >
            {/* ── Stat chips — show TOTAL (all-time) and RESOLVED count ── */}
            <View style={s.statsRow}>
              {[
                { label: 'Total',      val: stats.total,    color: T.textSec,      key: 'All'       },
                { label: 'Unanswered', val: stats.pending,  color: T.red,          key: 'PENDING'   },
                { label: 'In Review',  val: stats.review,   color: T.accentBright, key: 'IN REVIEW' },
                { label: 'Resolved',   val: stats.resolved, color: T.green,        key: null        }, // no filter — resolved hidden from grid
              ].map(st => (
                <TouchableOpacity
                  key={st.label}
                  onPress={() => st.key && setActiveNav(st.key)}
                  activeOpacity={st.key ? 0.75 : 1}
                  style={[
                    s.statChip,
                    { backgroundColor: T.surfaceEl, borderColor: T.border },
                    !st.key && { opacity: 0.85 },   // resolved chip is not tappable
                  ]}
                >
                  <Text style={[s.statChipVal, { color: st.color, fontFamily: SERIF }]}>{st.val}</Text>
                  <Text style={[s.statChipLabel, { color: T.textMuted }]}>{st.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Grid rows */}
            {(() => {
              const rows = chunk(filtered, numCols);
              return rows.map((row, ri) => {
                const isLast  = ri === rows.length - 1;
                const hasSlot = isLast && row.length < numCols && numCols >= 2;
                return (
                  <View key={ri} style={{ flexDirection: 'row', gap: 14 }}>
                    {row.map(d => (
                      <View key={d._id} style={{ flex: 1 }}>
                        <DoubtCard doubt={d} />
                      </View>
                    ))}
                    {isLast && Array.from({
                      length: numCols - row.length - (hasSlot ? 1 : 0),
                    }).map((_, i) => (
                      <View key={`ph-${i}`} style={{ flex: 1 }} />
                    ))}
                   
                  </View>
                );
              });
            })()}

            {/* Standalone broadcast card for single-column layout */}
           
          </ScrollView>
        )}

      </Animated.View>

      {/* ══ BROADCAST MODAL ══ */}
      <BroadcastModal
        visible={showBroadcast}
        onClose={() => setShowBroadcast(false)}
        teacherId={teacherId}
        subjects={subjects}
        T={T}
      />

      {/* ══ MOBILE FAB ══ */}
    
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1 },

  /* ── Top bar ── */
  topBar: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16,
    paddingTop:    Platform.OS === 'ios' ? 0 : 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topBarTitle: { fontSize: 17, fontWeight: '800' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    flex: 1, minWidth: 120, maxWidth: 300,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  tabsRow:    { gap: 2, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 3,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabTxt:      { fontSize: 13 },
  tabBadge:    {
    minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  tabBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },
  profileChip:      { flexDirection: 'row', alignItems: 'center' },
  profileAvatar:    {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  profileName:      { fontSize: 12, fontWeight: '700' },
  profileRole:      { fontSize: 10, marginTop: 1 },

  /* ── Page header ── */
  pageHead: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10,
  },
  pageTitle: { fontSize: 26, fontWeight: '900' },
  pageSub:   { fontSize: 13, marginTop: 4, lineHeight: 18, maxWidth: 400 },
  pageActions: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  },
  advFilterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  /* ── Resolved overlay on card ── */
  resolvedOverlay: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 10, marginTop: 4,
    borderRadius: 10, borderWidth: 1,
  },
  resolvedOverlayTxt: { fontSize: 13, fontWeight: '700' },
  advFilterTxt:       { fontSize: 13, fontWeight: '500' },
  broadcastTopBtn:    {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9,
  },
  broadcastTopBtnTxt: { fontSize: 13, color: '#fff', fontWeight: '700' },

  /* ── Advanced filters panel ── */
  advFilterPanel: {
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 10, padding: 14, borderWidth: 1,
  },
  /* ── Resolved card banner ── */
  resolvedCardBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
    marginTop: 2,
  },
  resolvedCardBannerTxt: {
    fontSize: 13, fontWeight: '700',
  },
  advFilterLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  filterChip:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipTxt: { fontSize: 12, fontWeight: '600' },

  /* ── Stats row ── */
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 },
  statChip: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, minWidth: 64,
  },
  statChipVal:   { fontSize: 20, fontWeight: '900' },
  statChipLabel: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  /* ── Card ── */
  card: {
    flex: 1, borderRadius: 16, borderWidth: 1,
    padding: 16, gap: 10, overflow: 'hidden',
  },
  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  subTag:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  subTagTxt:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardTime:   { flex: 1, fontSize: 11, textAlign: 'right' },
  stBadge:    { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  stBadgeTxt: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  cardTitle:  { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:    { fontSize: 11, fontWeight: '800' },
  studentName:  { fontSize: 13, fontWeight: '700' },
  studentMeta:  { fontSize: 11, marginTop: 1 },
  priBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1,
  },
  priTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2,
  },
  ctaBtn:    { flex: 1, borderRadius: 8, paddingVertical: 9, alignItems: 'center' },
  ctaBtnTxt: { fontSize: 13, fontWeight: '700' },
  moreBtn: {
    width: 32, height: 32, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── Broadcast teaser card ── */
  broadcastCard: {
    alignItems: 'center', justifyContent: 'center',
    gap: 10, minHeight: 220,
  },
  broadcastIcon:  {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  broadcastTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  broadcastSub:   { fontSize: 12, textAlign: 'center', lineHeight: 17, maxWidth: 200 },
  broadcastCta:   { fontSize: 12, fontWeight: '900', letterSpacing: 0.6, marginTop: 2 },

  /* ── Empty / loading ── */
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 },
  centerTxt:   { fontSize: 13, textAlign: 'center' },
  emptyBox:    {
    width: 68, height: 68, borderRadius: 34,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },

  /* ── Mobile FAB ── */
  fab: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  fabTxt: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

/* ─── Broadcast Modal Styles ──────────────────────────────────────────────────── */
const bm = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  sheet: {
    width: '100%', maxWidth: 520, borderRadius: 18, padding: 22, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 17, fontWeight: '800' },
  subtitle:   { fontSize: 12, marginTop: 2 },
  closeBtn:   { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label:      { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  subPill:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  subPillTxt: { fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontSize: 14, marginBottom: 18, minHeight: 110,
  },
  actions:   { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { fontSize: 14, fontWeight: '600' },
  sendBtn:   {
    flex: 2, borderRadius: 10, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  sendTxt:   { fontSize: 14, color: '#fff', fontWeight: '700' },
});