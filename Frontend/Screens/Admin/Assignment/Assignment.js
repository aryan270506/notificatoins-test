import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import AssignmentStudentListScreen from './AssigenmentStudentList';
import { ThemeContext } from '../dashboard/AdminDashboard';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const YEARS = [
  { label: '1st Year', short: '1st', color: '#4FC3F7', bg: '#051520', icon: '🎓' },
  { label: '2nd Year', short: '2nd', color: '#66BB6A', bg: '#051505', icon: '📚' },
  { label: '3rd Year', short: '3rd', color: '#FFA726', bg: '#150A00', icon: '🔬' },
  { label: '4th Year', short: '4th', color: '#CE93D8', bg: '#0F0515', icon: '🏆' },
];

const DIVS = ['A', 'B', 'C'];

export default function Assignment({ onBack, onConfirm }) {
  const { isDark, colors } = useContext(ThemeContext);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedDiv, setSelectedDiv] = useState(null);
  const [showStudentList, setShowStudentList] = useState(false);

  // Themed color shortcuts
  const C = {
    bg:        colors.bg,
    surface:   colors.surface,
    surfaceAlt:colors.surfaceAlt,
    border:    colors.border,
    textPrim:  colors.textPrim,
    textSec:   colors.textSec,
    textMuted: colors.textMuted,
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const confirmScale = useRef(new Animated.Value(1)).current;
  const divFade = useRef(new Animated.Value(0)).current;
  const divSlide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Animate div section in when year is selected
  useEffect(() => {
    if (selectedYear) {
      divFade.setValue(0);
      divSlide.setValue(10);
      Animated.parallel([
        Animated.timing(divFade, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(divSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [selectedYear]);

  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setSelectedDiv(null); // reset div on year change
  };

  const handleConfirm = () => {
    if (!selectedYear || !selectedDiv) return;
    Animated.sequence([
      Animated.timing(confirmScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(confirmScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => {
       if (!canConfirm) return;
  setShowStudentList(true);
    });
  };

  const canConfirm = selectedYear && selectedDiv;
  const accentColor = selectedYear ? selectedYear.color : '#4FC3F7';

  if (showStudentList) {
  return (
    <AssignmentStudentListScreen
      selectedYear={selectedYear}
      selectedDivision={selectedDiv}
      onBack={() => setShowStudentList(false)}
    />
  );
}

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.backArrow, { color: C.textSec }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: C.textPrim }]}>Select Year & Division</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>Filter attendance report by class</Text>
        </View>
        {canConfirm && (
          <View style={[styles.selectionBadge, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
            <Text style={[styles.selectionBadgeText, { color: accentColor }]}>
              {selectedYear.short} · Div {selectedDiv}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Step 1 — Year */}
          <View style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
              <Text style={[styles.stepNumberText, { color: accentColor }]}>1</Text>
            </View>
            <Text style={[styles.stepTitle, { color: C.textSec }]}>Choose Academic Year</Text>
          </View>

          <View style={styles.yearGrid}>
            {YEARS.map((year) => {
              const isActive = selectedYear?.short === year.short;
              return (
                <TouchableOpacity
                  key={year.short}
                  onPress={() => handleYearSelect(year)}
                  activeOpacity={0.8}
                  style={[
                    styles.yearCard,
                    {
                      backgroundColor: isActive ? year.bg : C.surface,
                      borderColor: isActive ? year.color : C.border,
                      borderWidth: isActive ? 1.5 : 1,
                    },
                  ]}
                >
                  {/* Glow bar at top */}
                  <View style={[styles.yearCardBar, { backgroundColor: isActive ? year.color : C.border }]} />

                  <View style={styles.yearCardInner}>
                    <Text style={styles.yearCardIcon}>{year.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.yearCardLabel, { color: isActive ? year.color : C.textMuted }]}>
                        {year.label}
                      </Text>
                      <Text style={[styles.yearCardSub, { color: C.textMuted }]}>
                        {year.short === '1st' ? '~3,200 students' : year.short === '2nd' ? '~3,050 students' : year.short === '3rd' ? '~3,100 students' : '~3,130 students'}
                      </Text>
                    </View>
                    <View style={[
                      styles.radioOuter,
                      { borderColor: isActive ? year.color : C.border },
                    ]}>
                      {isActive && <View style={[styles.radioInner, { backgroundColor: year.color }]} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Step 2 — Division (shown after year selected) */}
          {selectedYear && (
            <Animated.View style={{ opacity: divFade, transform: [{ translateY: divSlide }] }}>
              <View style={[styles.stepRow, { marginTop: 28 }]}>
                <View style={[styles.stepNumber, { backgroundColor: accentColor + '20', borderColor: accentColor + '40' }]}>
                  <Text style={[styles.stepNumberText, { color: accentColor }]}>2</Text>
                </View>
                <Text style={[styles.stepTitle, { color: C.textSec }]}>Choose Division</Text>
              </View>

              <View style={styles.divRow}>
                {DIVS.map((div) => {
                  const isActive = selectedDiv === div;
                  return (
                    <TouchableOpacity
                      key={div}
                      onPress={() => setSelectedDiv(div)}
                      activeOpacity={0.8}
                      style={[
                        styles.divCard,
                        {
                          backgroundColor: isActive ? accentColor + '15' : C.surface,
                          borderColor: isActive ? accentColor : C.border,
                          borderWidth: isActive ? 1.5 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.divCircle, {
                        backgroundColor: isActive ? accentColor + '25' : C.surfaceAlt,
                        borderColor: isActive ? accentColor + '60' : C.border,
                      }]}>
                        <Text style={[styles.divLetter, { color: isActive ? accentColor : C.textMuted }]}>
                          {div}
                        </Text>
                      </View>
                      <Text style={[styles.divLabel, { color: isActive ? accentColor + 'CC' : C.textMuted }]}>
                        Division
                      </Text>
                      <Text style={[styles.divStudents, { color: C.textMuted }]}>~1,050</Text>
                      {isActive && (
                        <View style={[styles.divCheck, { backgroundColor: accentColor }]}>
                          <Text style={styles.divCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Summary card */}
              {selectedDiv && (
                <Animated.View
                  style={[styles.summaryCard, { borderColor: accentColor + '40', backgroundColor: accentColor + '08' }]}
                >
                  <Text style={[styles.summaryLabel, { color: C.textMuted }]}>SELECTED CLASS</Text>
                  <Text style={[styles.summaryValue, { color: accentColor }]}>
                    {selectedYear.label} · Division {selectedDiv}
                  </Text>
                  <Text style={[styles.summarySub, { color: C.textSec }]}>
                    Viewing monthly attendance data for this group
                  </Text>
                </Animated.View>
              )}
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Confirm Button — Fixed at bottom */}
      <View style={[styles.bottomBar, { backgroundColor: C.bg, borderTopColor: C.border }]}>
        <Animated.View style={{ transform: [{ scale: confirmScale }], flex: 1 }}>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!canConfirm}
            activeOpacity={0.85}
            style={[
              styles.confirmBtn,
              {
                backgroundColor: canConfirm ? accentColor : C.surface,
                borderColor: canConfirm ? accentColor : C.border,
                opacity: canConfirm ? 1 : 0.5,
              },
            ]}
          >
            <Text style={[styles.confirmBtnText, { color: canConfirm ? C.bg : C.textMuted }]}>
              {canConfirm
                ? `View Report · ${selectedYear.short} Year Div ${selectedDiv}`
                : 'Select Year & Division to Continue'}
            </Text>
            {canConfirm && <Text style={[styles.confirmArrow, { color: C.bg }]}>→</Text>}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  backArrow: { fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 1 },
  selectionBadge: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1,
  },
  selectionBadgeText: { fontSize: 11, fontWeight: '700' },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 24 },

  // Step indicator
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  stepNumber: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1,
  },
  stepNumberText: { fontSize: 12, fontWeight: '800' },
  stepTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  // Year cards
  yearGrid: { gap: 10 },
  yearCard: {
    borderRadius: 14, overflow: 'hidden',
  },
  yearCardBar: { height: 3, width: '100%' },
  yearCardInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16,
  },
  yearCardIcon: { fontSize: 22 },
  yearCardLabel: { fontSize: 14, fontWeight: '700' },
  yearCardSub: { fontSize: 11, marginTop: 2 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  // Division cards
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
  divCheckText: { fontSize: 10, fontWeight: '900' },

  // Summary card
  summaryCard: {
    marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 16,
  },
  summaryLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  summarySub: { fontSize: 12 },

  // Bottom confirm bar
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