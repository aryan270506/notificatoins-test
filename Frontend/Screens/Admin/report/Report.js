import React, { useState, useRef, useEffect, useContext } from 'react';
import axiosInstance from '../../../Src/Axios';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import AttendanceReportFlow from './AttendanceReportFlow';
import { ThemeContext } from '../dashboard/AdminDashboard';

const API_BASE_URL = axiosInstance.defaults.baseURL.replace(/\/api$/, "");

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const YEARS = [
  { label: '1st Year', short: '1st', color: '#4FC3F7', icon: '🎓' },
  { label: '2nd Year', short: '2nd', color: '#66BB6A', icon: '📚' },
  { label: '3rd Year', short: '3rd', color: '#FFA726', icon: '🔬' },
  { label: '4th Year', short: '4th', color: '#CE93D8', icon: '🏆' },
];

// Year background tints — generated relative to the year's accent colour,
// but we still need a base canvas colour from the theme, so bg is handled
// inline using colors.surface + a small alpha tint of the year colour.
const DIVS = ['A', 'B', 'C'];

export default function ReportYearDivSelection({ onBack, onConfirm }) {
  const { colors, isDark } = useContext(ThemeContext); // ← consume theme
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedDiv, setSelectedDiv] = useState(null);
  const [showStudentList, setShowStudentList] = useState(false);

  // ── Backend student count fetch ───────────────────────────────────────────
  const [yearCounts, setYearCounts]   = useState({});  // { '1': 42, '2': 38, ... }
  const [divCounts, setDivCounts]     = useState({});   // { 'A': 15, 'B': 13, 'C': 14 }
  const [countsLoading, setCountsLoading] = useState(false);

  // Fetch total student count for each year (across all divisions)
  useEffect(() => {
    (async () => {
      const counts = {};
      for (const yr of YEARS) {
        const yearNum = yr.short.replace(/\D/g, '');
        try {
          let total = 0;
          for (const div of DIVS) {
            const res = await axiosInstance.get('/students/by-class', {
              params: { year: yearNum, division: div }
            });
            const data = res.data;
            total += Array.isArray(data) ? data.length : 0;
          }
          counts[yearNum] = total;
        } catch (_) { /* keep undefined — UI falls back to '—' */ }
      }
      setYearCounts(counts);
    })();
  }, []);

  // Fetch per-division counts when a year is selected
  useEffect(() => {
    if (!selectedYear) return;
    (async () => {
      setCountsLoading(true);
      const yearNum = selectedYear.short.replace(/\D/g, '');
      const counts = {};
      for (const div of DIVS) {
        try {
          const res = await axiosInstance.get('/students/by-class', {
            params: { year: yearNum, division: div }
          });
          const data = res.data;
          counts[div] = Array.isArray(data) ? data.length : 0;
        } catch (_) {}
      }
      setDivCounts(counts);
      setCountsLoading(false);
    })();
  }, [selectedYear?.short]);
  // ──────────────────────────────────────────────────────────────────────────

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(30)).current;
  const confirmScale = useRef(new Animated.Value(1)).current;
  const divFade    = useRef(new Animated.Value(0)).current;
  const divSlide   = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      divFade.setValue(0);
      divSlide.setValue(10);
      Animated.parallel([
        Animated.timing(divFade,  { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(divSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [selectedYear]);

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setSelectedDiv(null);
  };

  const canConfirm = selectedYear && selectedDiv;
  const accentColor = selectedYear ? selectedYear.color : colors.accent;

  const handleConfirm = () => {
    if (!canConfirm) return;
    Animated.sequence([
      Animated.timing(confirmScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(confirmScale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start(() => {
      setShowStudentList(true);
    });
  };

  if (showStudentList) {
    return (
      <AttendanceReportFlow
        year={selectedYear}
        division={selectedDiv}
        onBack={() => setShowStudentList(false)}
      />
    );
  }

  // ── Dynamic style helpers (depend on current theme) ──────────────────────
  const s = dynamicStyles(colors, isDark);

  return (
    <View style={s.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Select Year & Division</Text>
          <Text style={s.headerSub}>Filter attendance report by class</Text>
        </View>
        {canConfirm && (
          <View style={[s.selectionBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
            <Text style={[s.selectionBadgeText, { color: accentColor }]}>
              {selectedYear.short} · Div {selectedDiv}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Step 1 — Year */}
          <View style={s.stepRow}>
            <View style={[s.stepNumber, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
              <Text style={[s.stepNumberText, { color: accentColor }]}>1</Text>
            </View>
            <Text style={s.stepTitle}>Choose Academic Year</Text>
          </View>

          <View style={s.yearGrid}>
            {YEARS.map((year) => {
              const isActive = selectedYear?.short === year.short;
              return (
                <TouchableOpacity
                  key={year.short}
                  onPress={() => handleYearSelect(year)}
                  activeOpacity={0.8}
                  style={[
                    s.yearCard,
                    {
                      backgroundColor: isActive
                        ? year.color + (isDark ? '18' : '12')
                        : colors.surface,
                      borderColor: isActive ? year.color : colors.border,
                      borderWidth: isActive ? 1.5 : 1,
                    },
                  ]}
                >
                  <View style={[s.yearCardBar, { backgroundColor: isActive ? year.color : colors.border }]} />
                  <View style={s.yearCardInner}>
                    <Text style={s.yearCardIcon}>{year.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.yearCardLabel, { color: isActive ? year.color : colors.textMuted }]}>
                        {year.label}
                      </Text>
                      <Text style={[s.yearCardSub, { color: colors.textMuted }]}>
                        {yearCounts[year.short.replace(/\D/g, '')] != null
                          ? `${yearCounts[year.short.replace(/\D/g, '')]} students`
                          : 'Loading…'}
                      </Text>
                    </View>
                    <View style={[s.radioOuter, { borderColor: isActive ? year.color : colors.border }]}>
                      {isActive && <View style={[s.radioInner, { backgroundColor: year.color }]} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Step 2 — Division */}
          {selectedYear && (
            <Animated.View style={{ opacity: divFade, transform: [{ translateY: divSlide }] }}>
              <View style={[s.stepRow, { marginTop: 28 }]}>
                <View style={[s.stepNumber, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
                  <Text style={[s.stepNumberText, { color: accentColor }]}>2</Text>
                </View>
                <Text style={s.stepTitle}>Choose Division</Text>
              </View>

              <View style={s.divRow}>
                {DIVS.map((div) => {
                  const isActive = selectedDiv === div;
                  return (
                    <TouchableOpacity
                      key={div}
                      onPress={() => setSelectedDiv(div)}
                      activeOpacity={0.8}
                      style={[
                        s.divCard,
                        {
                          backgroundColor: isActive ? accentColor + '15' : colors.surface,
                          borderColor: isActive ? accentColor : colors.border,
                          borderWidth: isActive ? 1.5 : 1,
                        },
                      ]}
                    >
                      <View style={[s.divCircle, {
                        backgroundColor: isActive ? accentColor + '25' : colors.surfaceAlt,
                        borderColor: isActive ? accentColor + '60' : colors.border,
                      }]}>
                        <Text style={[s.divLetter, { color: isActive ? accentColor : colors.textMuted }]}>
                          {div}
                        </Text>
                      </View>
                      <Text style={[s.divLabel, { color: isActive ? accentColor + 'CC' : colors.textMuted }]}>
                        Division
                      </Text>
                      <Text style={[s.divStudents, { color: colors.textMuted }]}>
                        {divCounts[div] != null ? `${divCounts[div]} students` : countsLoading ? '…' : '—'}
                      </Text>
                      {isActive && (
                        <View style={[s.divCheck, { backgroundColor: accentColor }]}>
                          <Text style={s.divCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Summary card */}
              {selectedDiv && (
                <Animated.View style={[s.summaryCard, { borderColor: accentColor + '40', backgroundColor: accentColor + '08' }]}>
                  <Text style={[s.summaryLabel, { color: colors.textMuted }]}>SELECTED CLASS</Text>
                  <Text style={[s.summaryValue, { color: accentColor }]}>
                    {selectedYear.label} · Division {selectedDiv}
                  </Text>
                  <Text style={[s.summarySub, { color: colors.textSec }]}>
                    Viewing monthly attendance data for this group
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={[s.bottomBar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <Animated.View style={{ transform: [{ scale: confirmScale }], flex: 1 }}>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!canConfirm}
            activeOpacity={0.85}
            style={[
              s.confirmBtn,
              {
                backgroundColor: canConfirm ? accentColor : colors.surface,
                borderColor: canConfirm ? accentColor : colors.border,
                opacity: canConfirm ? 1 : 0.5,
              },
            ]}
          >
            <Text style={[s.confirmBtnText, { color: canConfirm ? colors.bg : colors.textMuted }]}>
              {canConfirm
                ? `View Report · ${selectedYear.short} Year Div ${selectedDiv}`
                : 'Select Year & Division to Continue'}
            </Text>
            {canConfirm && <Text style={[s.confirmArrow, { color: colors.bg }]}>→</Text>}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Dynamic styles (recreated when theme changes) ────────────────────────────
function dynamicStyles(colors, isDark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },

    header: {
      paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: colors.bg,
    },
    backBtn: {
      width: 38, height: 38, backgroundColor: colors.surface, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
    },
    backArrow: { color: colors.textSec, fontSize: 18, fontWeight: '700' },
    headerTitle: { color: colors.textPrim, fontSize: 16, fontWeight: '700' },
    headerSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
    selectionBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    selectionBadgeText: { fontSize: 11, fontWeight: '700' },

    scroll: { paddingHorizontal: 16, paddingTop: 24 },

    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    stepNumber: {
      width: 26, height: 26, borderRadius: 13, alignItems: 'center',
      justifyContent: 'center', borderWidth: 1,
    },
    stepNumberText: { fontSize: 12, fontWeight: '800' },
    stepTitle: { color: colors.textSec, fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

    yearGrid: { gap: 10 },
    yearCard: { borderRadius: 14, overflow: 'hidden' },
    yearCardBar: { height: 3, width: '100%' },
    yearCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    yearCardIcon: { fontSize: 22 },
    yearCardLabel: { fontSize: 14, fontWeight: '700' },
    yearCardSub: { fontSize: 11, marginTop: 2 },
    radioOuter: {
      width: 20, height: 20, borderRadius: 10, borderWidth: 2,
      alignItems: 'center', justifyContent: 'center',
    },
    radioInner: { width: 10, height: 10, borderRadius: 5 },

    divRow: { flexDirection: 'row', gap: 12 },
    divCard: {
      flex: 1, borderRadius: 14, padding: 16, alignItems: 'center',
      position: 'relative',
    },
    divCircle: {
      width: 60, height: 60, borderRadius: 30, alignItems: 'center',
      justifyContent: 'center', borderWidth: 1, marginBottom: 8,
    },
    divLetter: { fontSize: 28, fontWeight: '800' },
    divLabel: { fontSize: 11, fontWeight: '600' },
    divStudents: { fontSize: 10, marginTop: 2 },
    divCheck: {
      position: 'absolute', top: 10, right: 10,
      width: 18, height: 18, borderRadius: 9,
      alignItems: 'center', justifyContent: 'center',
    },
    divCheckText: { color: '#fff', fontSize: 10, fontWeight: '900' },

    summaryCard: {
      marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 16,
    },
    summaryLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    summaryValue: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
    summarySub: { fontSize: 12 },

    bottomBar: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 16, paddingBottom: 34, paddingTop: 12,
      borderTopWidth: 1,
      flexDirection: 'row',
    },
    confirmBtn: {
      borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, gap: 8,
    },
    confirmBtnText: { fontSize: 14, fontWeight: '800' },
    confirmArrow: { fontSize: 16, fontWeight: '900' },
  });
}