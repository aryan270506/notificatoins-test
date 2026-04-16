import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import axiosInstance from '../../../Src/Axios';

const { width } = Dimensions.get('window');

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0a1628',
  card: '#0f1f3d',
  cardBorder: '#1a2d50',
  accent: '#3b5bdb',
  accentLight: '#4c6ef5',
  green: '#12b886',
  orange: '#fd7e14',
  textPrimary: '#ffffff',
  textSecondary: '#8899bb',
  textMuted: '#4a5d80',
  activeTag: '#1a3a2a',
  activeTagText: '#2dd4a0',
  inactiveTag: '#2a2a2a',
  inactiveTagText: '#8899bb',
  gold: '#f59e0b',
  goldLight: '#fcd34d',
  goldBg: '#1a1500',
};

// ─── Doubts Resolved Bar Chart ────────────────────────────────────────────────
const DoubtsResolvedChart = ({ doubtsData }) => {
  const data = doubtsData && doubtsData.length > 0 ? doubtsData : [{ year: '-', resolved: 0 }];
  const maxVal = Math.max(...data.map(d => d.resolved), 1);
  const totalResolved = data.reduce((s, d) => s + d.resolved, 0);
  const CHART_HEIGHT = 110;
  const animVals = useRef(data.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = data.map((d, i) =>
      Animated.timing(animVals[i], {
        toValue: d.resolved / maxVal,
        duration: 700,
        delay: i * 80,
        useNativeDriver: false,
      })
    );
    Animated.stagger(80, animations).start();
  }, [doubtsData]);

  return (
    <View>
      <View style={chartStyles.summaryRow}>
        <View>
          <Text style={chartStyles.totalNum}>{totalResolved.toLocaleString()}</Text>
          <Text style={chartStyles.totalLabel}>Teachers per Year</Text>
        </View>
        <View style={chartStyles.trendBadge}>
          <Text style={chartStyles.trendText}>📚 All Years</Text>
        </View>
      </View>
      <View style={chartStyles.barsContainer}>
        {data.map((d, i) => {
          const isHighest = d.resolved === maxVal;
          const barHeight = animVals[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0, CHART_HEIGHT],
          });
          return (
            <View key={d.year} style={chartStyles.barCol}>
              <Text style={[chartStyles.barVal, isHighest && { color: '#a78bfa' }]}>
                {d.resolved}
              </Text>
              <View style={[chartStyles.barTrack, { height: CHART_HEIGHT }]}>
                <Animated.View
                  style={[
                    chartStyles.barFill,
                    { height: barHeight },
                    isHighest ? chartStyles.barFillHighlight : chartStyles.barFillNormal,
                  ]}
                />
                <Animated.View
                  style={[
                    chartStyles.glowDot,
                    isHighest ? chartStyles.glowDotHighlight : chartStyles.glowDotNormal,
                    { bottom: barHeight },
                  ]}
                />
              </View>
              <Text style={[chartStyles.yearLabel, isHighest && { color: '#a78bfa' }]}>
                {d.year}
              </Text>
            </View>
          );
        })}
      </View>
      {[0.25, 0.5, 0.75, 1].map(pct => (
        <View
          key={pct}
          pointerEvents="none"
          style={[chartStyles.gridLine, { bottom: 32 + pct * CHART_HEIGHT }]}
        />
      ))}
    </View>
  );
};

const chartStyles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  totalNum: { color: '#ffffff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  totalLabel: { color: '#8899bb', fontSize: 10, marginTop: 2 },
  trendBadge: {
    backgroundColor: '#1a2d50',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2a4070',
  },
  trendText: { color: '#2dd4a0', fontSize: 10, fontWeight: '700' },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    position: 'relative',
  },
  barCol: { alignItems: 'center', flex: 1 },
  barVal: { color: '#8899bb', fontSize: 9, fontWeight: '700', marginBottom: 4 },
  barTrack: {
    width: 18,
    backgroundColor: '#1a2d50',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  barFill: { width: '100%', borderRadius: 10, position: 'absolute', bottom: 0 },
  barFillNormal: {
    backgroundColor: '#3b5bdb',
    shadowColor: '#4c6ef5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  barFillHighlight: {
    backgroundColor: '#7c3aed',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  glowDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: -4,
    zIndex: 2,
  },
  glowDotNormal: {
    backgroundColor: '#4c6ef5',
    shadowColor: '#4c6ef5',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  glowDotHighlight: {
    backgroundColor: '#a78bfa',
    shadowColor: '#a78bfa',
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  yearLabel: { color: '#4a5d80', fontSize: 8, marginTop: 6, fontWeight: '600', textAlign: 'center' },
  gridLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 1,
    backgroundColor: '#1a2d50',
    opacity: 0.6,
  },
});

// ─── Donut Chart ──────────────────────────────────────────────────────────────
const DonutChart = ({ active = 91, inactive = 9, total = 85 }) => {
  const SIZE = 140;
  const STROKE = 16;
  const activeDeg = (active / 100) * 360;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: SIZE, height: SIZE }}>
      <View
        style={{
          position: 'absolute',
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE / 2,
          borderWidth: STROKE,
          borderColor: '#1e2d4a',
        }}
      />
      {activeDeg <= 180 ? (
        <View style={{ position: 'absolute' }}>
          <View
            style={[
              styles.donutHalf,
              {
                width: SIZE,
                height: SIZE,
                borderRadius: SIZE / 2,
                borderWidth: STROKE,
                borderColor: C.accentLight,
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                transform: [{ rotate: `${activeDeg - 90}deg` }],
              },
            ]}
          />
        </View>
      ) : (
        <>
          <View
            style={{
              position: 'absolute',
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: STROKE,
              borderColor: C.accentLight,
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
              transform: [{ rotate: '90deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: STROKE,
              borderColor: C.accentLight,
              borderRightColor: activeDeg >= 270 ? C.accentLight : 'transparent',
              borderBottomColor: activeDeg >= 270 ? C.accentLight : 'transparent',
              borderLeftColor: activeDeg >= 360 ? C.accentLight : 'transparent',
              transform: [{ rotate: `${activeDeg - 270}deg` }],
            }}
          />
        </>
      )}
      <Text style={{ color: C.textPrimary, fontSize: 26, fontWeight: '800' }}>{total}</Text>
      <Text style={{ color: C.textSecondary, fontSize: 10, letterSpacing: 1.5 }}>TOTAL</Text>
    </View>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, change, positive }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardTop}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={[styles.changeBadge, { backgroundColor: positive ? '#0d2e1a' : '#2e1010' }]}>
        <Text style={{ color: positive ? '#12b886' : '#ff6b6b', fontSize: 11, fontWeight: '700' }}>
          {change}
        </Text>
      </View>
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

// ─── Recent Faculty Row ────────────────────────────────────────────────────────
const FacultyRow = ({ item }) => {
  const isActive = item.status === 'ACTIVE';
  return (
    <View style={styles.facultyRow}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.facultyName}>{item.name}</Text>
        <Text style={styles.facultyDept}>{item.dept}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.facultyEvent}>{item.event}</Text>
        <Text style={styles.facultyTime}>{item.time}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isActive ? C.activeTag : C.inactiveTag },
          ]}>
          <Text
            style={[
              styles.statusBadgeText,
              { color: isActive ? C.activeTagText : C.inactiveTagText },
            ]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Class Teacher Assignment Modal ──────────────────────────────────────────
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const DIVISIONS = ['A', 'B', 'C'];

const ClassTeacherModal = ({ visible, onClose, teachers, assignments, onAssign, initialYear, initialDiv }) => {
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [selectedDiv, setSelectedDiv] = useState('A');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // ✅ FIX: Use initialYear and initialDiv when modal opens
  useEffect(() => {
    if (visible) {
      // If grid cell was clicked, use those values
      if (initialYear && initialDiv) {
        setSelectedYear(initialYear);
        setSelectedDiv(initialDiv);
      } else {
        // Otherwise default to 1st Year, A
        setSelectedYear('1st Year');
        setSelectedDiv('A');
      }
      // Clear search when modal opens
      setTeacherSearch('');
    }
  }, [visible, initialYear, initialDiv]);

  const key = `${selectedYear}-${selectedDiv}`;
  const currentAssignment = assignments[key];

  const filtered = teachers.filter(t =>
    (t.name || '').toLowerCase().includes(teacherSearch.toLowerCase())
  );

  const handleAssign = async teacher => {
    setSaving(true);
    await onAssign(selectedYear, selectedDiv, teacher);
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Handle bar */}
          <View style={modalStyles.handle} />

          {/* Header */}
          <View style={modalStyles.modalHeader}>
            <View>
              <Text style={modalStyles.modalTitle}>Assign Class Teacher</Text>
              <Text style={modalStyles.modalSubtitle}>Select year, division & faculty</Text>
            </View>
            <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
              <Text style={{ color: C.textSecondary, fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Content Container */}
          <ScrollView 
            style={{ flex: 1 }} 
            showsVerticalScrollIndicator={false}>
            
            {/* Year & Division Selector - Side by Side */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              {/* Year Selector - Left */}
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.sectionLabel}>ACADEMIC YEAR</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={{ paddingVertical: 6 }}
                  scrollEventThrottle={16}>
                  <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 8 }}>
                  {YEARS.map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        modalStyles.yearChip,
                        modalStyles.yearChipCompact,
                        selectedYear === y && modalStyles.yearChipActive,
                      ]}
                      onPress={() => setSelectedYear(y)}>
                      <Text
                        style={[
                          modalStyles.yearChipText,
                          selectedYear === y && modalStyles.yearChipTextActive,
                        ]}>
                        {y.replace(' Year', '')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              </View>

              {/* Division Selector - Right */}
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.sectionLabel}>DIVISION</Text>
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 8 }}>
                  {DIVISIONS.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        modalStyles.divChip,
                        modalStyles.divChipCompact,
                        selectedDiv === d && modalStyles.divChipActive,
                      ]}
                      onPress={() => setSelectedDiv(d)}>
                      <Text
                        style={[
                          modalStyles.divChipText,
                          selectedDiv === d && modalStyles.divChipTextActive,
                        ]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

          {/* Current Assignment Banner */}
          {currentAssignment ? (
            <View style={modalStyles.currentBanner}>
              <Image
                source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentAssignment.name)}&background=f59e0b&color=fff&size=36` }}
                style={modalStyles.bannerAvatar}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={modalStyles.bannerLabel}>Currently Assigned</Text>
                <Text style={modalStyles.bannerName}>{currentAssignment.name}</Text>
              </View>
              <View style={modalStyles.crownBadge}>
                <Text style={{ fontSize: 14 }}>👑</Text>
              </View>
            </View>
          ) : (
            <View style={modalStyles.unassignedBanner}>
              <Text style={modalStyles.unassignedText}>
                ⚠️  No class teacher assigned for {selectedYear} Div {selectedDiv}
              </Text>
            </View>
          )}
          
          </ScrollView>

          {/* Teacher Search */}
          <Text style={[modalStyles.sectionLabel, { marginTop: 12 }]}>SELECT FACULTY</Text>
          <View style={modalStyles.searchBox}>
            <Text style={{ color: C.textMuted, marginRight: 8 }}>🔍</Text>
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search teacher name..."
              placeholderTextColor={C.textMuted}
              value={teacherSearch}
              onChangeText={setTeacherSearch}
            />
          </View>

          {/* Teacher List */}
          <FlatList
            data={filtered}
            keyExtractor={(_, i) => String(i)}
            style={modalStyles.teacherList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isCurrentCT = currentAssignment?.name === item.name;
              return (
                <TouchableOpacity
                  style={[
                    modalStyles.teacherItem,
                    isCurrentCT && modalStyles.teacherItemActive,
                  ]}
                  onPress={() => handleAssign(item)}
                  disabled={saving}>
                  <Image
                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'T')}&background=3b5bdb&color=fff&size=40` }}
                    style={modalStyles.teacherAvatar}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={modalStyles.teacherName}>{item.name || 'Unknown'}</Text>
                    <Text style={modalStyles.teacherSub}>
                      {item.years ? `Year ${item.years.join(', ')}` : 'Faculty'}
                    </Text>
                  </View>
                  {isCurrentCT ? (
                    <View style={modalStyles.assignedPill}>
                      <Text style={modalStyles.assignedPillText}>👑 CT</Text>
                    </View>
                  ) : (
                    <View style={modalStyles.assignBtn}>
                      <Text style={modalStyles.assignBtnText}>Assign</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: C.textMuted, textAlign: 'center', padding: 20 }}>
                No teachers found
              </Text>
            }
          />

          {saving && (
            <View style={modalStyles.savingOverlay}>
              <ActivityIndicator color={C.gold} size="small" />
              <Text style={{ color: C.gold, marginLeft: 8, fontWeight: '700' }}>Saving...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d1e38',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1a2d50',
    borderBottomWidth: 0,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#1a2d50',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2d50',
    marginBottom: 16,
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a2d50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#0f1f3d',
    borderWidth: 1.5,
    borderColor: '#1a2d50',
    marginVertical: 2,
  },
  yearChipCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  yearChipActive: {
    backgroundColor: '#1a2d4a',
    borderColor: C.accentLight,
    borderWidth: 2,
  },
  yearChipText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  yearChipTextActive: { color: C.accentLight, fontWeight: '700' },
  divChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0f1f3d',
    borderWidth: 1,
    borderColor: '#1a2d50',
    alignItems: 'center',
  },
  divChipCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flex: 0,
  },
  divChipActive: {
    backgroundColor: '#1a0a00',
    borderColor: C.gold,
  },
  divChipText: { color: C.textSecondary, fontSize: 14, fontWeight: '700' },
  divChipTextActive: { color: C.goldLight },
  currentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1100',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3d2800',
    marginHorizontal: 16,
    padding: 12,
  },
  bannerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#3d2800' },
  bannerLabel: { color: C.gold, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bannerName: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  crownBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3d2800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unassignedBanner: {
    backgroundColor: '#1a1200',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a2800',
    marginHorizontal: 16,
    padding: 12,
  },
  unassignedText: { color: '#fd7e14', fontSize: 12, fontWeight: '600' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1f3d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a2d50',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  teacherList: { maxHeight: 280, paddingHorizontal: 16 },
  teacherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#0f1f3d',
    borderWidth: 1,
    borderColor: '#1a2d50',
  },
  teacherItemActive: {
    backgroundColor: '#1a1100',
    borderColor: '#3d2800',
  },
  teacherAvatar: { width: 40, height: 40, borderRadius: 20 },
  teacherName: { color: '#fff', fontSize: 13, fontWeight: '700' },
  teacherSub: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  assignedPill: {
    backgroundColor: '#3d2800',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.gold,
  },
  assignedPillText: { color: C.goldLight, fontSize: 11, fontWeight: '700' },
  assignBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  assignBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  savingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
});

// ─── Class Teacher Grid Card ──────────────────────────────────────────────────
const ClassTeacherGrid = ({ assignments, onPressCell }) => {
  return (
    <View style={styles.card}>
      <View style={styles.facultyHeader}>
        <View>
          <Text style={styles.cardTitle}>Class Teachers</Text>
          <Text style={{ color: C.textSecondary, fontSize: 11, marginTop: -4, marginBottom: 8 }}>
            Year × Division assignment map
          </Text>
        </View>
        <View style={ctStyles.crownTag}>
          <Text style={{ fontSize: 12 }}>👑</Text>
          <Text style={ctStyles.crownTagText}>CT Board</Text>
        </View>
      </View>

      {/* Header row */}
      <View style={ctStyles.gridRow}>
        <View style={ctStyles.gridLabelCell} />
        {DIVISIONS.map(d => (
          <View key={d} style={ctStyles.gridHeaderCell}>
            <Text style={ctStyles.gridHeaderText}>Div {d}</Text>
          </View>
        ))}
      </View>

      {/* Data rows */}
      {YEARS.map(year => (
        <View key={year} style={ctStyles.gridRow}>
          <View style={ctStyles.gridLabelCell}>
            <Text style={ctStyles.gridLabelText}>{year.replace(' Year', '')}</Text>
          </View>
          {DIVISIONS.map(div => {
            const key = `${year}-${div}`;
            const assigned = assignments[key];
            return (
              <TouchableOpacity
                key={div}
                style={[ctStyles.gridCell, assigned && ctStyles.gridCellAssigned]}
                onPress={() => onPressCell(year, div)}>
                {assigned ? (
                  <>
                    <Image
                      source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(assigned.name)}&background=f59e0b&color=fff&size=28` }}
                      style={ctStyles.cellAvatar}
                    />
                    <Text style={ctStyles.cellName} numberOfLines={2}>
                      {assigned.name}
                    </Text>
                    <Text style={{ fontSize: 8 }}>👑</Text>
                  </>
                ) : (
                  <>
                    <Text style={ctStyles.cellPlus}>+</Text>
                    <Text style={ctStyles.cellEmpty}>Assign</Text>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const ctStyles = StyleSheet.create({
  crownTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1100',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#3d2800',
    gap: 4,
  },
  crownTagText: { color: C.goldLight, fontSize: 11, fontWeight: '700' },
  gridRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'stretch' },
  gridLabelCell: { width: 56, justifyContent: 'center', paddingRight: 8 },
  gridLabelText: { color: C.textSecondary, fontSize: 11, fontWeight: '700' },
  gridHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2d50',
    marginHorizontal: 3,
  },
  gridHeaderText: { color: C.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  gridCell: {
    flex: 1,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: '#0a1628',
    borderWidth: 1,
    borderColor: '#1a2d50',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 80,
  },
  gridCellAssigned: {
    backgroundColor: '#1a1100',
    borderColor: '#3d2800',
    borderStyle: 'solid',
  },
  cellAvatar: { width: 28, height: 28, borderRadius: 14, marginBottom: 4, borderWidth: 1, borderColor: C.gold },
  cellName: { color: '#fff', fontSize: 8, fontWeight: '700', textAlign: 'center', marginBottom: 2, lineHeight: 12 },
  cellPlus: { color: C.textMuted, fontSize: 18, fontWeight: '300', lineHeight: 20 },
  cellEmpty: { color: C.textMuted, fontSize: 9, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TeacherManagementDashboard() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState([]);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [activeTeachers, setActiveTeachers] = useState(0);
  const [inactiveTeachers, setInactiveTeachers] = useState(0);
  const [yearData, setYearData] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);

  // ── Class Teacher state ──
  const [ctAssignments, setCtAssignments] = useState({});
  const [ctModalVisible, setCtModalVisible] = useState(false);
  const [ctInitialYear, setCtInitialYear] = useState(null);
  const [ctInitialDiv, setCtInitialDiv] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teacherRes, activeRes, ctRes] = await Promise.all([
          axiosInstance.get('/teachers/all').catch(() => ({ data: { data: [] } })),
          axiosInstance.get('/users/active-users').catch(() => ({ data: { users: [] } })),
          // Fetch existing class teacher assignments from your backend
          axiosInstance.get('/teachers/class-teachers').catch(() => ({ data: { assignments: {} } })),
        ]);

        const allTeachers = teacherRes.data?.data || [];
        const total = allTeachers.length;

        const activeUsers = activeRes.data?.users || [];
        const onlineTeacherEmails = new Set(
          activeUsers.filter(u => u.role === 'teacher').map(u => u.email)
        );
        const active =
          allTeachers.filter(t => onlineTeacherEmails.has(t.email || t.id)).length ||
          Math.max(total - Math.floor(total * 0.1), 0);
        const inactive = total - active;

        setTotalTeachers(total);
        setActiveTeachers(active);
        setInactiveTeachers(inactive);
        setTeachers(allTeachers);

        // Year-wise distribution
        const yearCounts = {};
        allTeachers.forEach(t => {
          (t.years || []).forEach(y => {
            const label =
              y === 1
                ? '1st Year'
                : y === 2
                ? '2nd Year'
                : y === 3
                ? '3rd Year'
                : `${y}th Year`;
            yearCounts[label] = (yearCounts[label] || 0) + 1;
          });
        });
        const yd = Object.entries(yearCounts).map(([year, count]) => ({ year, resolved: count }));
        yd.sort((a, b) => a.year.localeCompare(b.year));
        setYearData(yd);

        // Recent updates
        const recent = allTeachers.slice(0, 5).map((t, i) => {
          const subjectsList = [];
          if (t.subjects) {
            Object.values(t.subjects).forEach(arr => {
              if (Array.isArray(arr)) subjectsList.push(...arr);
            });
          }
          const dept =
            subjectsList.length > 0
              ? `Subjects: ${[...new Set(subjectsList)].slice(0, 3).join(', ')}`
              : 'Faculty';
          return {
            id: i,
            name: t.name || t.id || 'Teacher',
            dept,
            event: `Teaches Year ${(t.years || []).join(', ')}`,
            time: (t.divisions || []).map(d => `Div ${d}`).join(', ') || '',
            status: 'ACTIVE',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name || 'T')}&background=3b5bdb&color=fff&size=48`,
          };
        });
        setRecentUpdates(recent);

        // Load existing CT assignments (backend returns {year-div: {name, id, ...}})
        const existingCT = ctRes.data?.assignments || {};
        setCtAssignments(existingCT);
      } catch (err) {
        console.error('Teacher fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const openCTModal = (year = null, div = null) => {
    setCtInitialYear(year);
    setCtInitialDiv(div);
    setCtModalVisible(true);
  };

  const handleAssignCT = async (year, div, teacher) => {
    const key = `${year}-${div}`;
    try {
      // ✅ Use MongoDB _id for the assignment
      const teacherId = teacher._id || teacher.id;
      if (!teacherId) {
        Alert.alert('Error', 'Teacher ID not found. Please refresh and try again.');
        return;
      }

      console.log(`Assigning ${teacher.name} (${teacherId}) to ${year} Division ${div}`);

      // POST to backend to persist the assignment
      const response = await axiosInstance.post('/teachers/assign-class-teacher', {
        year,
        division: div,
        teacherId: teacherId, // ✅ Always send MongoDB ObjectId
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Assignment failed');
      }

      // ✅ Update UI with success
      setCtAssignments(prev => ({
        ...prev,
        [key]: { 
          name: teacher.name, 
          teacherId: teacherId,
          assignedAt: new Date().toISOString()
        },
      }));

      Alert.alert(
        '✅ Success',
        `${teacher.name} has been saved as Class Teacher for ${year} Division ${div}`
      );

      // 🔄 Refetch assignments to verify they were saved
      setTimeout(() => {
        axiosInstance
          .get('/teachers/class-teachers')
          .then(res => {
            if (res.data?.assignments) {
              // Build the flat map like the backend returns
              const assignments = {};
              Object.keys(res.data.assignments).forEach(keyStr => {
                const ct = res.data.assignments[keyStr];
                assignments[keyStr] = { name: ct.name, teacherId: ct.teacherId };
              });
              setCtAssignments(assignments);
              console.log('✅ Assignments verified from database:', assignments);
            }
          })
          .catch(err => console.warn('Could not verify assignments:', err.message));
      }, 500);
    } catch (e) {
      console.error('Assignment error:', e);
      Alert.alert(
        '❌ Error',
        `Failed to save assignment: ${e.message || 'Please try again.'}`
      );
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Teacher Management</Text>
            <Text style={styles.headerSubtitle}>
              Overview of faculty enrollment and status health indicators.
            </Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={{ color: C.textMuted, marginRight: 8, fontSize: 16 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search teachers..."
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={{ padding: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={C.accentLight} />
            <Text style={{ color: C.textMuted, marginTop: 12, fontSize: 13 }}>
              Loading teacher data...
            </Text>
          </View>
        ) : (
          <>
            {/* Stat Cards */}
            <View style={styles.statsRow}>
              <StatCard icon="👥" label="Total Teachers" value={String(totalTeachers)} change="" positive={true} />
              <StatCard icon="✅" label="Active" value={String(activeTeachers)} change="Online" positive={true} />
              <StatCard icon="⏸" label="Inactive" value={String(inactiveTeachers)} change="Offline" positive={false} />
            </View>

            {/* ── Class Teacher Assignment Grid ─────────────────────── */}
            <ClassTeacherGrid
              assignments={ctAssignments}
              onPressCell={(year, div) => openCTModal(year, div)}
            />

            {/* Assign Button */}
            <TouchableOpacity style={styles.assignCTBtn} onPress={() => openCTModal()}>
              <Text style={{ fontSize: 16 }}>👑</Text>
              <Text style={styles.assignCTBtnText}>Manage Class Teacher Assignments</Text>
              <Text style={{ color: C.textMuted, fontSize: 14 }}>›</Text>
            </TouchableOpacity>

            {/* Middle Row */}
            <View style={styles.middleRow}>
              <View style={[styles.card, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.cardTitle}>Teachers per Year</Text>
                <Text style={{ color: C.textSecondary, fontSize: 10, marginBottom: 8, marginTop: -4 }}>
                  Year-wise assignment breakdown
                </Text>
                <DoubtsResolvedChart doubtsData={yearData} />
              </View>

              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardTitle}>Teacher Distribution</Text>
                <View style={{ alignItems: 'center', marginVertical: 12 }}>
                  <DonutChart
                    active={totalTeachers > 0 ? Math.round((activeTeachers / totalTeachers) * 100) : 0}
                    inactive={totalTeachers > 0 ? Math.round((inactiveTeachers / totalTeachers) * 100) : 0}
                    total={totalTeachers}
                  />
                </View>
                <View style={styles.distRow}>
                  <View style={[styles.dot, { backgroundColor: C.accentLight }]} />
                  <View style={{ marginLeft: 8 }}>
                    <View style={styles.distLabelRow}>
                      <Text style={styles.distLabel}>Active</Text>
                      <Text style={styles.distPct}>
                        {totalTeachers > 0 ? Math.round((activeTeachers / totalTeachers) * 100) : 0}%
                      </Text>
                    </View>
                    <Text style={styles.distSub}>{activeTeachers} Enrolled Faculty</Text>
                  </View>
                </View>
                <View style={[styles.distRow, { marginTop: 10 }]}>
                  <View style={[styles.dot, { backgroundColor: C.textMuted }]} />
                  <View style={{ marginLeft: 8 }}>
                    <View style={styles.distLabelRow}>
                      <Text style={styles.distLabel}>Inactive</Text>
                      <Text style={styles.distPct}>
                        {totalTeachers > 0 ? Math.round((inactiveTeachers / totalTeachers) * 100) : 0}%
                      </Text>
                    </View>
                    <Text style={styles.distSub}>{inactiveTeachers} On Leave/Resigned</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Recent Faculty Updates */}
            <View style={[styles.card, { marginTop: 0 }]}>
              <View style={styles.facultyHeader}>
                <Text style={styles.cardTitle}>Faculty List</Text>
                <TouchableOpacity>
                  <Text style={{ color: C.accentLight, fontSize: 12, fontWeight: '600' }}>
                    {totalTeachers} TOTAL
                  </Text>
                </TouchableOpacity>
              </View>
              {recentUpdates.length > 0 ? (
                recentUpdates.map((item, i) => (
                  <React.Fragment key={item.id}>
                    <FacultyRow item={item} />
                    {i < recentUpdates.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))
              ) : (
                <Text style={{ color: C.textMuted, textAlign: 'center', padding: 20, fontSize: 13 }}>
                  No teachers found
                </Text>
              )}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Class Teacher Modal */}
      <ClassTeacherModal
        visible={ctModalVisible}
        onClose={() => setCtModalVisible(false)}
        teachers={teachers}
        assignments={ctAssignments}
        onAssign={handleAssignCT}
        initialYear={ctInitialYear}
        initialDiv={ctInitialDiv}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, paddingTop: 52 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  headerTitle: { color: C.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerSubtitle: { color: C.textSecondary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  bellBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: 14 },
  statsRow: { flexDirection: 'row', marginBottom: 14, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: { fontSize: 20 },
  changeBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  statLabel: { color: C.textSecondary, fontSize: 11, marginBottom: 4 },
  statValue: { color: C.textPrimary, fontSize: 28, fontWeight: '800' },
  middleRow: { flexDirection: 'row', marginBottom: 14 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { color: C.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  donutHalf: { overflow: 'hidden' },
  distRow: { flexDirection: 'row', alignItems: 'flex-start' },
  distLabelRow: { flexDirection: 'row', alignItems: 'center' },
  distLabel: { color: C.textPrimary, fontSize: 13, fontWeight: '700', marginRight: 8 },
  distPct: { color: C.textPrimary, fontSize: 13, fontWeight: '700' },
  distSub: { color: C.textSecondary, fontSize: 10, marginTop: 2 },
  facultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  facultyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardBorder },
  facultyName: { color: C.textPrimary, fontSize: 13, fontWeight: '700' },
  facultyDept: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  facultyEvent: { color: C.textSecondary, fontSize: 11, textAlign: 'right' },
  facultyTime: { color: C.textMuted, fontSize: 10, marginTop: 2, textAlign: 'right' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: C.cardBorder },
  assignCTBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1100',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3d2800',
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  assignCTBtnText: {
    flex: 1,
    color: C.goldLight,
    fontSize: 14,
    fontWeight: '700',
  },
});