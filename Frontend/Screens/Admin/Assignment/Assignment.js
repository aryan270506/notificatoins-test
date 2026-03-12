/**
 * ╔══════════════════════════════════════════════════════╗
 * ║  SCREEN 1 — Assignment.js                           ║
 * ║  Pick Year & Division → goes to AssignmentStudentList║
 * ╚══════════════════════════════════════════════════════╝
 */

import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, StatusBar,
} from 'react-native';

import { ThemeContext } from '../dashboard/AdminDashboard';
import AssignmentStudentList from './AssignmentStudentList';

// ─── Data ─────────────────────────────────────────────────────────────────────

const YEARS = [
  { label: '1st Year', short: '1st', color: '#4FC3F7', bg: '#0d2a3d', icon: '🎓' },
  { label: '2nd Year', short: '2nd', color: '#66BB6A', bg: '#0d2a14', icon: '📚' },
  { label: '3rd Year', short: '3rd', color: '#FFA726', bg: '#2a1a05', icon: '🔬' },
  { label: '4th Year', short: '4th', color: '#CE93D8', bg: '#1e0d2a', icon: '🏆' },
];
const DIVS = ['A', 'B', 'C'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Assignment({ onBack }) {
  // ✅ FIXED: Correctly destructure { isDark, colors } from ThemeContext
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedDiv,  setSelectedDiv]  = useState(null);
  const [goNext,       setGoNext]       = useState(false);

  const fadeAnim     = useRef(new Animated.Value(0)).current;
  const slideAnim    = useRef(new Animated.Value(30)).current;
  const confirmScale = useRef(new Animated.Value(1)).current;
  const divFade      = useRef(new Animated.Value(0)).current;
  const divSlide     = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      divFade.setValue(0); divSlide.setValue(10);
      Animated.parallel([
        Animated.timing(divFade,  { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(divSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]).start();
    }
  }, [selectedYear]);

  const canConfirm  = !!(selectedYear && selectedDiv);
  const accentColor = selectedYear ? selectedYear.color : '#4FC3F7';

  const handleYearSelect = (year) => { setSelectedYear(year); setSelectedDiv(null); };

  const handleConfirm = () => {
    if (!canConfirm) return;
    Animated.sequence([
      Animated.timing(confirmScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(confirmScale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start(() => setGoNext(true));
  };

  if (goNext) {
    return (
      <AssignmentStudentList
        selectedYear={selectedYear}
        selectedDivision={selectedDiv}
        onBack={() => setGoNext(false)}
      />
    );
  }

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={C.bg}
      />

      {/* Header */}
      <View style={[s.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          onPress={onBack}
          style={[s.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}
        >
          <Text style={[s.backArrow, { color: C.textSec }]}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: C.textPrim }]}>Select Year & Division</Text>
          <Text style={[s.headerSub,   { color: C.textSec }]}>Filter assignment report by class</Text>
        </View>
        {canConfirm && (
          <View style={[s.badge, { backgroundColor: accentColor + '30', borderColor: accentColor + '60' }]}>
            <Text style={[s.badgeText, { color: accentColor }]}>{selectedYear.short} · Div {selectedDiv}</Text>
          </View>
        )}
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Step 1 */}
          <StepLabel number="1" label="Choose Academic Year" accent={accentColor} textColor={C.textPrim} />

          <View style={s.yearGrid}>
            {YEARS.map((year) => {
              const isActive = selectedYear?.short === year.short;
              // ✅ FIXED: In light mode use C.surface instead of dark year.bg
              const cardBg = isActive
                ? (isDark ? year.bg : accentColor + '18')
                : C.surface;

              return (
                <TouchableOpacity
                  key={year.short}
                  onPress={() => handleYearSelect(year)}
                  activeOpacity={0.8}
                  style={[
                    s.yearCard,
                    {
                      backgroundColor: cardBg,
                      borderColor:     isActive ? year.color : C.border,
                      borderWidth:     isActive ? 2 : 1,
                    },
                  ]}
                >
                  {/* Accent top bar */}
                  <View style={[s.yearBar, { backgroundColor: isActive ? year.color : year.color + '55' }]} />

                  <View style={s.yearInner}>
                    <Text style={s.yearIcon}>{year.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.yearLabel, { color: isActive ? year.color : C.textPrim }]}>
                        {year.label}
                      </Text>
                      
                    </View>
                    <View style={[s.radioOuter, { borderColor: isActive ? year.color : C.border }]}>
                      {isActive && <View style={[s.radioInner, { backgroundColor: year.color }]} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Step 2 */}
          {selectedYear && (
            <Animated.View style={{ opacity: divFade, transform: [{ translateY: divSlide }] }}>
              <StepLabel
                number="2"
                label="Choose Division"
                accent={accentColor}
                textColor={C.textPrim}
                style={{ marginTop: 28 }}
              />

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
                          // ✅ FIXED: theme-aware background
                          backgroundColor: isActive ? accentColor + '22' : C.surface,
                          borderColor:     isActive ? accentColor : C.border,
                          borderWidth:     isActive ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={[
                        s.divCircle,
                        {
                          backgroundColor: isActive ? accentColor + '30' : C.surfaceAlt,
                          borderColor:     isActive ? accentColor : C.border,
                        },
                      ]}>
                        <Text style={[s.divLetter, { color: isActive ? accentColor : C.textPrim }]}>
                          {div}
                        </Text>
                      </View>
                      <Text style={[s.divLabel2,   { color: isActive ? accentColor : C.textSec }]}>Division</Text>
                      <Text style={[s.divStudents, { color: C.textSec }]}></Text>
                      {isActive && (
                        <View style={[s.divCheck, { backgroundColor: accentColor }]}>
                          <Text style={s.divCheckText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedDiv && (
                <View style={[
                  s.summaryCard,
                  {
                    borderColor:     accentColor + '60',
                    backgroundColor: accentColor + '12',
                  },
                ]}>
                  <Text style={[s.summaryLabel, { color: C.textSec }]}>SELECTED CLASS</Text>
                  <Text style={[s.summaryValue, { color: accentColor }]}>
                    {selectedYear.label} · Division {selectedDiv}
                  </Text>
                  <Text style={[s.summarySub, { color: C.textSec }]}>
                    Tap the button below to view students
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

        </Animated.View>
      </ScrollView>

      {/* Confirm button */}
      <View style={[s.bottomBar, { backgroundColor: C.bg, borderTopColor: C.border }]}>
        <Animated.View style={{ transform: [{ scale: confirmScale }], flex: 1 }}>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!canConfirm}
            activeOpacity={0.85}
            style={[
              s.confirmBtn,
              {
                backgroundColor: canConfirm ? accentColor : C.surface,
                borderColor:     canConfirm ? accentColor : C.border,
                opacity: canConfirm ? 1 : 0.5,
              },
            ]}
          >
            {/* ✅ FIXED: text color works on both light and dark */}
            <Text style={[s.confirmBtnText, { color: canConfirm ? (isDark ? '#0d1117' : '#fff') : C.textSec }]}>
              {canConfirm
                ? `View Students · ${selectedYear.short} Year Div ${selectedDiv}`
                : 'Select Year & Division to Continue'}
            </Text>
            {canConfirm && (
              <Text style={[s.confirmArrow, { color: isDark ? '#0d1117' : '#fff' }]}>→</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Step label sub-component ─────────────────────────────────────────────────

function StepLabel({ number, label, accent, textColor, style }) {
  return (
    <View style={[s.stepRow, style]}>
      <View style={[s.stepNum, { backgroundColor: accent + '25', borderColor: accent + '60' }]}>
        <Text style={[s.stepNumText, { color: accent }]}>{number}</Text>
      </View>
      {/* ✅ FIXED: uses passed textColor (C.textPrim) directly */}
      <Text style={[s.stepTitle, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:   { flex: 1 },
  header: {
    paddingTop: 52, paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1,
  },
  backBtn:     { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  backArrow:   { fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub:   { fontSize: 11, marginTop: 1 },
  badge:       { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  badgeText:   { fontSize: 11, fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingTop: 24 },

  stepRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  stepNum:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  stepNumText: { fontSize: 13, fontWeight: '800' },
  stepTitle:   { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },

  yearGrid:  { gap: 10 },
  yearCard:  { borderRadius: 14, overflow: 'hidden' },
  yearBar:   { height: 4 },
  yearInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  yearIcon:  { fontSize: 24 },
  yearLabel: { fontSize: 15, fontWeight: '700' },
  yearSub:   { fontSize: 12, marginTop: 2 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 11, height: 11, borderRadius: 6 },

  divRow:     { flexDirection: 'row', gap: 12 },
  divCard:    { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', position: 'relative' },
  divCircle:  { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginBottom: 8 },
  divLetter:  { fontSize: 30, fontWeight: '800' },
  divLabel2:  { fontSize: 12, fontWeight: '600' },
  divStudents: { fontSize: 11, marginTop: 3 },
  divCheck:   { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divCheckText: { fontSize: 11, fontWeight: '900', color: '#fff' },

  summaryCard:  { marginTop: 16, borderRadius: 14, borderWidth: 1.5, padding: 16 },
  summaryLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  summarySub:   { fontSize: 12 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, flexDirection: 'row',
  },
  confirmBtn: {
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, gap: 8,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '800' },
  confirmArrow:   { fontSize: 16, fontWeight: '900' },
});