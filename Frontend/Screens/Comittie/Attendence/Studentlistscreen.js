import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
} from 'react-native';

const C = {
  bg: '#0d1b3e',
  card: '#152250',
  cardAlt: '#1a2a5e',
  accent: '#4f7cff',
  accentLight: '#7b9fff',
  green: '#2ecc71',
  yellow: '#f0a500',
  red: '#e74c3c',
  text: '#ffffff',
  textMuted: '#8899cc',
  border: '#1e3070',
};

// Attendance % → color
function attColor(pct) {
  if (pct >= 75) return C.green;
  if (pct >= 50) return C.yellow;
  return C.red;
}

// Mini donut ring
function MiniDonut({ percent, size = 44 }) {
  const color = attColor(percent);
  const stroke = 5;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: C.cardAlt }} />
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: stroke, borderColor: color,
        borderTopColor: percent < 25 ? C.cardAlt : color,
        borderRightColor: percent < 50 ? C.cardAlt : color,
        borderBottomColor: percent < 75 ? C.cardAlt : color,
        transform: [{ rotate: '-45deg' }],
      }} />
      <Text style={{ color, fontSize: 9, fontWeight: '900' }}>{percent}%</Text>
    </View>
  );
}

// Generate dummy students
function generateStudents(year, division) {
  const names = [
    'Aarav Shah', 'Priya Patel', 'Rohit Mehta', 'Sneha Joshi', 'Karan Desai',
    'Pooja Nair', 'Arjun Rao', 'Anjali Singh', 'Vivek Sharma', 'Neha Gupta',
    'Rahul Verma', 'Divya Iyer', 'Aditya Kumar', 'Riya Bose', 'Siddharth Malhotra',
    'Kavya Reddy', 'Manish Tiwari', 'Tanvi Kulkarni', 'Nikhil Patil', 'Shreya Das',
    'Amit Jain', 'Swati Mishra', 'Rohan Pillai', 'Meera Agarwal', 'Harsh Bajaj',
  ];
  return names.map((name, i) => ({
    id: i + 1,
    name,
    rollNo: `${year}${division}${String(i + 1).padStart(3, '0')}`,
    attendance: Math.floor(Math.random() * 45) + 50, // 50–95%
    present: Math.floor(Math.random() * 20) + 40,
    total: 65,
    avatar: name.charAt(0),
  }));
}

export default function StudentListScreen({ year, division, onBack, onSelectStudent }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // All | Good | Average | Low

  const students = generateStudents(year?.value || 1, division?.value || 'A');

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'Good') return s.attendance >= 75;
    if (filter === 'Average') return s.attendance >= 50 && s.attendance < 75;
    if (filter === 'Low') return s.attendance < 50;
    return true;
  });

  const avgAtt = Math.round(students.reduce((sum, s) => sum + s.attendance, 0) / students.length);
  const goodCount = students.filter(s => s.attendance >= 75).length;
  const avgCount = students.filter(s => s.attendance >= 50 && s.attendance < 75).length;
  const lowCount = students.filter(s => s.attendance < 50).length;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Top Bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.title}>Student List</Text>
          <Text style={s.subtitle}>{year?.label}  ·  Division {division?.value}  ·  {students.length} Students</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Summary Strip */}
        <View style={s.summaryStrip}>
          <View style={s.summaryItem}>
            <Text style={[s.summaryNum, { color: C.accentLight }]}>{avgAtt}%</Text>
            <Text style={s.summaryLabel}>Avg</Text>
          </View>
          <View style={s.summaryDivider} />
          <TouchableOpacity style={s.summaryItem} onPress={() => setFilter('Good')}>
            <Text style={[s.summaryNum, { color: C.green }]}>{goodCount}</Text>
            <Text style={s.summaryLabel}>≥75%</Text>
          </TouchableOpacity>
          <View style={s.summaryDivider} />
          <TouchableOpacity style={s.summaryItem} onPress={() => setFilter('Average')}>
            <Text style={[s.summaryNum, { color: C.yellow }]}>{avgCount}</Text>
            <Text style={s.summaryLabel}>50–74%</Text>
          </TouchableOpacity>
          <View style={s.summaryDivider} />
          <TouchableOpacity style={s.summaryItem} onPress={() => setFilter('Low')}>
            <Text style={[s.summaryNum, { color: C.red }]}>{lowCount}</Text>
            <Text style={s.summaryLabel}>&lt;50%</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchWrap}>
          <Text style={{ color: C.textMuted, fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or roll no..."
            placeholderTextColor={C.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: C.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
          {['All', 'Good', 'Average', 'Low'].map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filterTab, filter === f && s.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterTabText, filter === f && s.filterTabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results count */}
        <Text style={s.resultCount}>Showing {filtered.length} students</Text>

        {/* Student Cards */}
        <View style={s.listWrap}>
          {filtered.map((student) => {
            const color = attColor(student.attendance);
            return (
              <TouchableOpacity
                key={student.id}
                style={s.studentCard}
                onPress={() => onSelectStudent(student)}
                activeOpacity={0.75}
              >
                {/* Avatar */}
                <View style={[s.avatar, { borderColor: color }]}>
                  <Text style={s.avatarText}>{student.avatar}</Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={s.studentName}>{student.name}</Text>
                  <Text style={s.rollNo}>Roll No: {student.rollNo}</Text>
                  <View style={s.attBarRow}>
                    <View style={s.attBarTrack}>
                      <View style={[s.attBarFill, { width: `${student.attendance}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>

                {/* Donut */}
                <MiniDonut percent={student.attendance} />

                {/* Arrow */}
                <Text style={{ color: C.accent, fontSize: 18, fontWeight: '800', marginLeft: 8 }}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  backArrow: { color: C.text, fontSize: 20, fontWeight: '700' },
  title: { color: C.text, fontSize: 17, fontWeight: '900' },
  subtitle: { color: C.textMuted, fontSize: 11, marginTop: 2 },

  summaryStrip: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    paddingVertical: 14,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: C.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: C.border },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: C.card, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 13 },

  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  filterTabActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterTabText: { color: C.textMuted, fontSize: 12, fontWeight: '700' },
  filterTabTextActive: { color: C.text },

  resultCount: {
    color: C.textMuted, fontSize: 11, fontWeight: '600',
    paddingHorizontal: 20, marginBottom: 8,
  },

  listWrap: { paddingHorizontal: 16, gap: 10 },
  studentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  avatarText: { color: C.text, fontSize: 18, fontWeight: '900' },
  studentName: { color: C.text, fontSize: 14, fontWeight: '800' },
  rollNo: { color: C.textMuted, fontSize: 11, marginTop: 2 },
  attBarRow: { marginTop: 6 },
  attBarTrack: { height: 4, backgroundColor: C.border, borderRadius: 2 },
  attBarFill: { height: 4, borderRadius: 2 },
});