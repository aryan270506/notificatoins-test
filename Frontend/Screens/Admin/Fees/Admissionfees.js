import React, { useState, useMemo, useContext } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, StatusBar, TextInput, Alert, Modal,
} from 'react-native';
import { ThemeContext } from '../dashboard/AdminDashboard';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const YEARS = [
  { id: 1, label: '1st Year', students: '~3,200 students', icon: '🎒' },
  { id: 2, label: '2nd Year', students: '~3,050 students', icon: '📚' },
  { id: 3, label: '3rd Year', students: '~3,100 students', icon: '🔬' },
  { id: 4, label: '4th Year', students: '~3,130 students', icon: '🏆' },
];
const DIVISIONS = [
  { id: 'A', students: '~1,050' },
  { id: 'B', students: '~1,050' },
  { id: 'C', students: '~1,050' },
];

const STUDENT_NAMES = [
  'Aarav Sharma','Priya Patel','Rohan Mehta','Ananya Singh','Karan Verma',
  'Sneha Joshi','Arjun Nair','Divya Reddy','Vikram Gupta','Pooja Iyer',
  'Aditya Kumar','Riya Desai','Siddharth Rao','Kavya Menon','Harsh Thakur',
];

const FEE_CATEGORIES = [
  { id: 'tuition', label: 'Tuition Fee',    icon: '📖', base: 45000 },
  { id: 'lab',     label: 'Lab Fee',         icon: '🔬', base: 8000  },
  { id: 'library', label: 'Library Fee',     icon: '📚', base: 3000  },
  { id: 'sports',  label: 'Sports Fee',      icon: '🏅', base: 2000  },
  { id: 'exam',    label: 'Examination Fee', icon: '📝', base: 5000  },
];

const SESSION_LABEL = '2024–25';

const generateFeeData = (year, division) =>
  STUDENT_NAMES.map((name, i) => {
    const totalFee = FEE_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = Math.round(cat.base * (1 + (year - 1) * 0.05));
      return acc;
    }, {});
    const grandTotal = Object.values(totalFee).reduce((a, b) => a + b, 0);
    const paidPct    = 0.4 + Math.random() * 0.6;
    const paidTotal  = Math.round(grandTotal * paidPct / 100) * 100;
    const remaining  = grandTotal - paidTotal;
    const paidFee    = {};
    FEE_CATEGORIES.forEach(cat => {
      paidFee[cat.id] = Math.min(totalFee[cat.id], Math.round(totalFee[cat.id] * paidPct / 100) * 100);
    });
    const hasPendingRequest = Math.random() > 0.7;
    return {
      id: i + 1, name,
      rollNo: `${year}${division}${String(i + 1).padStart(3, '0')}`,
      totalFee, grandTotal, paidTotal, paidFee, remaining,
      paidPct: Math.round(paidPct * 100),
      session: SESSION_LABEL, hasPendingRequest,
      requests: hasPendingRequest ? [{
        id: `REQ-${year}${division}${String(i + 1).padStart(3, '0')}-01`,
        date: '12 Jan 2025',
        amount: Math.round(remaining * 0.5 / 100) * 100,
        status: 'pending',
        note: 'Requesting partial fee submission for second semester.',
      }] : [],
    };
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR      = (n) => '₹' + n.toLocaleString('en-IN');
const getPayColor = (pct) => pct >= 90 ? '#00e676' : pct >= 60 ? '#69f0ae' : pct >= 40 ? '#ffb300' : '#ff5252';
const getPayStatus= (pct) => pct >= 90 ? 'Cleared' : pct >= 60 ? 'Partial' : pct >= 40 ? 'Due' : 'Overdue';

// ─── Highlight matching text ──────────────────────────────────────────────────
function HighlightText({ text, query, style, highlightStyle }) {
  if (!query || !query.trim()) return <Text style={style}>{text}</Text>;
  const lowerText  = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, idx)}
      <Text style={highlightStyle}>{text.slice(idx, idx + query.trim().length)}</Text>
      {text.slice(idx + query.trim().length)}
    </Text>
  );
}

// ─── Request Modal ────────────────────────────────────────────────────────────
function RequestModal({ visible, onClose, student, onSubmit }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [amount, setAmount]         = useState('');
  const [note, setNote]             = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = () => {
    const val = parseInt(amount.replace(/\D/g, ''), 10);
    if (!val || val <= 0) { Alert.alert('Invalid Amount', 'Enter a valid fee amount.'); return; }
    if (val > student.remaining) {
      Alert.alert('Exceeds Remaining', `Amount cannot exceed remaining fee of ${fmtINR(student.remaining)}.`);
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSubmit({ amount: val, note });
      setAmount(''); setNote('');
      onClose();
    }, 800);
  };

  if (!student) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' }}>
        <View style={[rm.sheet, { backgroundColor: C.bg, borderColor: C.border }]}>
          {/* Header */}
          <View style={rm.header}>
            <View style={{ flex: 1 }}>
              <Text style={[rm.headerTitle, { color: C.textPrim }]}>Fee Payment Request</Text>
              <Text style={[rm.headerSub, { color: C.textSec }]}>{student.name} · {student.rollNo}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[rm.closeBtn, { backgroundColor: C.surface, borderColor: C.border }]} activeOpacity={0.7}>
              <Text style={[rm.closeTxt, { color: C.textSec }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={[rm.accentDivider, { backgroundColor: C.accent }]} />

          <ScrollView contentContainerStyle={rm.body} showsVerticalScrollIndicator={false}>
            {/* Summary strip */}
            <View style={[rm.summaryStrip, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={rm.summaryItem}>
                <Text style={[rm.summaryLabel, { color: C.textMuted }]}>Session Total</Text>
                <Text style={[rm.summaryValue, { color: '#00c8ff' }]}>{fmtINR(student.grandTotal)}</Text>
              </View>
              <View style={[rm.summaryDivider, { backgroundColor: C.border }]} />
              <View style={rm.summaryItem}>
                <Text style={[rm.summaryLabel, { color: C.textMuted }]}>Paid</Text>
                <Text style={[rm.summaryValue, { color: '#00e676' }]}>{fmtINR(student.paidTotal)}</Text>
              </View>
              <View style={[rm.summaryDivider, { backgroundColor: C.border }]} />
              <View style={rm.summaryItem}>
                <Text style={[rm.summaryLabel, { color: C.textMuted }]}>Remaining</Text>
                <Text style={[rm.summaryValue, { color: '#ff5252' }]}>{fmtINR(student.remaining)}</Text>
              </View>
            </View>

            {/* Amount input */}
            <Text style={[rm.fieldLabel, { color: C.textMuted }]}>AMOUNT TO PAY (₹)</Text>
            <View style={[rm.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[rm.rupeeIcon, { color: C.accent }]}>₹</Text>
              <TextInput
                style={[rm.textInput, { color: C.textPrim }]}
                placeholder="Enter amount"
                placeholderTextColor={C.textMuted}
                value={amount}
                onChangeText={t => setAmount(t.replace(/\D/g, ''))}
                keyboardType="numeric"
                returnKeyType="done"
              />
              {student.remaining > 0 && (
                <TouchableOpacity
                  style={[rm.fullPayBtn, { backgroundColor: C.accent + '22', borderLeftColor: C.accent }]}
                  onPress={() => setAmount(String(student.remaining))}
                  activeOpacity={0.7}>
                  <Text style={[rm.fullPayTxt, { color: C.accent }]}>Full</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Note input */}
            <Text style={[rm.fieldLabel, { color: C.textMuted, marginTop: 14 }]}>NOTE (OPTIONAL)</Text>
            <TextInput
              style={[rm.noteInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrim }]}
              placeholder="Add a note for this request..."
              placeholderTextColor={C.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={[rm.footer, { backgroundColor: C.bg, borderTopColor: C.border }]}>
            <TouchableOpacity
              style={[rm.submitBtn, { backgroundColor: C.accent }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}>
              <Text style={rm.submitIcon}>{submitting ? '⏳' : '📤'}</Text>
              <Text style={[rm.submitTxt, { color: isDark ? '#060d1a' : '#fff' }]}>{submitting ? 'Submitting…' : 'Submit Request'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Student Fee Detail Screen ────────────────────────────────────────────────
function AdmissionfeeStudentDetail({ student: initialStudent, year, division, onBack }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [student, setStudent]       = useState(initialStudent);
  const [requestOpen, setRequestOpen] = useState(false);

  const handleSubmitRequest = ({ amount, note }) => {
    const newReq = {
      id: `REQ-${student.rollNo}-${String(student.requests.length + 1).padStart(2, '0')}`,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      amount, status: 'pending',
      note: note || 'Fee payment request submitted.',
    };
    setStudent(prev => ({ ...prev, requests: [newReq, ...prev.requests] }));
    Alert.alert('Request Submitted', `Your payment request of ${fmtINR(amount)} has been submitted successfully.`);
  };

  const statusColor = (s) => s === 'approved' ? '#00e676' : s === 'rejected' ? '#ff5252' : '#ffb300';
  const statusLabel = (s) => s === 'approved' ? '✓ Approved' : s === 'rejected' ? '✕ Rejected' : '⏳ Pending';

  return (
    <SafeAreaView style={[sh.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[sh.topHeader, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={[sh.headerIconBox, { backgroundColor: C.surface, borderColor: C.border }]} activeOpacity={0.7}>
          <Text style={[sh.headerIconText, { color: C.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[sh.topHeaderTitle, { color: C.textPrim }]} numberOfLines={1}>{student.name}</Text>
          <Text style={[sh.topHeaderSub, { color: C.textSec }]}>Roll: {student.rollNo} · {year.label} Div {division.id}</Text>
        </View>
        <View style={[sh.selectedBadge, { borderColor: getPayColor(student.paidPct), backgroundColor: getPayColor(student.paidPct) + '22' }]}>
          <Text style={[sh.selectedBadgeText, { color: getPayColor(student.paidPct) }]}>{getPayStatus(student.paidPct)}</Text>
        </View>
      </View>
      <View style={[sh.accentDivider, { backgroundColor: C.accent }]} />

      <ScrollView contentContainerStyle={sh.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Student Info Card */}
        <View style={[fd.infoCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[fd.avatarCircle, { backgroundColor: C.accent + '22', borderColor: C.accent }]}>
            <Text style={[fd.avatarText, { color: C.accent }]}>{student.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[fd.studentName, { color: C.textPrim }]}>{student.name}</Text>
            <Text style={[fd.studentMeta, { color: C.textSec }]}>Roll No: {student.rollNo}</Text>
            <Text style={[fd.studentMeta, { color: C.textSec }]}>{year.label} · Division {division.id} · Session {student.session}</Text>
          </View>
        </View>

        {/* Fee Overview Card */}
        <View style={[fd.overviewCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[fd.overviewTitle, { color: C.textSec }]}>Session Fee Overview — {student.session}</Text>
          <View style={fd.feeRow}>
            <View style={fd.feeItem}>
              <Text style={[fd.feeLabel, { color: C.textMuted }]}>Total Fee</Text>
              <Text style={[fd.feeValue, { color: '#00c8ff' }]}>{fmtINR(student.grandTotal)}</Text>
            </View>
            <View style={[fd.feeDivider, { backgroundColor: C.border }]} />
            <View style={fd.feeItem}>
              <Text style={[fd.feeLabel, { color: C.textMuted }]}>Paid</Text>
              <Text style={[fd.feeValue, { color: '#00e676' }]}>{fmtINR(student.paidTotal)}</Text>
            </View>
            <View style={[fd.feeDivider, { backgroundColor: C.border }]} />
            <View style={fd.feeItem}>
              <Text style={[fd.feeLabel, { color: C.textMuted }]}>Remaining</Text>
              <Text style={[fd.feeValue, { color: student.remaining > 0 ? '#ff5252' : '#00e676' }]}>
                {student.remaining > 0 ? fmtINR(student.remaining) : 'Nil'}
              </Text>
            </View>
          </View>
          <View style={[fd.progressTrack, { backgroundColor: C.surfaceAlt }]}>
            <View style={[fd.progressFill, { width: `${student.paidPct}%`, backgroundColor: getPayColor(student.paidPct) }]} />
          </View>
          <Text style={[fd.progressLabel, { color: getPayColor(student.paidPct) }]}>
            {student.paidPct}% Paid · {getPayStatus(student.paidPct)}
          </Text>
        </View>

        {/* Category Breakdown */}
        <View style={fd.sectionTitleRow}>
          <Text style={fd.sectionIcon}>💳</Text>
          <Text style={[fd.sectionTitle, { color: C.textPrim }]}>Fee Breakdown</Text>
        </View>
        <View style={[fd.table, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[fd.thead, { backgroundColor: C.surfaceAlt, borderBottomColor: C.accent }]}>
            <Text style={[fd.th, { flex: 2.2, color: C.accent }]}>Category</Text>
            <Text style={[fd.th, { flex: 1.2, textAlign: 'right', color: C.accent }]}>Total</Text>
            <Text style={[fd.th, { flex: 1.2, textAlign: 'right', color: C.accent }]}>Paid</Text>
            <Text style={[fd.th, { flex: 1.2, textAlign: 'right', color: C.accent }]}>Due</Text>
          </View>
          {FEE_CATEGORIES.map((cat, idx) => {
            const total = student.totalFee[cat.id];
            const paid  = student.paidFee[cat.id];
            const due   = total - paid;
            return (
              <View key={cat.id} style={[fd.tr, { borderBottomColor: C.border }, idx % 2 === 1 && { backgroundColor: C.surfaceAlt }]}>
                <View style={[fd.tdName, { flex: 2.2 }]}>
                  <Text style={fd.catIcon}>{cat.icon}</Text>
                  <Text style={[fd.catLabel, { color: C.textPrim }]}>{cat.label}</Text>
                </View>
                <Text style={[fd.td, { flex: 1.2, color: C.textSec }]}>{fmtINR(total)}</Text>
                <Text style={[fd.td, { flex: 1.2, color: '#00e676' }]}>{fmtINR(paid)}</Text>
                <Text style={[fd.td, { flex: 1.2, color: due > 0 ? '#ff5252' : C.textMuted }]}>
                  {due > 0 ? fmtINR(due) : '—'}
                </Text>
              </View>
            );
          })}
          <View style={[fd.totalRow, { backgroundColor: C.surfaceAlt, borderTopColor: C.border }]}>
            <Text style={[fd.totalTd, { flex: 2.2, color: C.textSec }]}>Grand Total</Text>
            <Text style={[fd.totalTd, { flex: 1.2, color: '#00c8ff' }]}>{fmtINR(student.grandTotal)}</Text>
            <Text style={[fd.totalTd, { flex: 1.2, color: '#00e676' }]}>{fmtINR(student.paidTotal)}</Text>
            <Text style={[fd.totalTd, { flex: 1.2, color: student.remaining > 0 ? '#ff5252' : C.textMuted }]}>
              {student.remaining > 0 ? fmtINR(student.remaining) : '—'}
            </Text>
          </View>
        </View>

        {/* Payment Requests */}
        <View style={[fd.sectionTitleRow, { marginTop: 20 }]}>
          <Text style={fd.sectionIcon}>📤</Text>
          <Text style={[fd.sectionTitle, { color: C.textPrim }]}>Payment Requests</Text>
          {student.requests.length > 0 && (
            <View style={[fd.countBadge, { backgroundColor: C.accent + '22', borderColor: C.accent }]}>
              <Text style={[fd.countBadgeTxt, { color: C.accent }]}>{student.requests.length}</Text>
            </View>
          )}
        </View>

        {student.requests.length === 0 ? (
          <View style={[fd.emptyRequests, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={fd.emptyIcon}>📭</Text>
            <Text style={[fd.emptyText, { color: C.textMuted }]}>No requests submitted yet</Text>
          </View>
        ) : (
          student.requests.map((req) => (
            <View key={req.id} style={[fd.requestCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={fd.reqHeader}>
                <Text style={[fd.reqId, { color: C.textSec }]}>{req.id}</Text>
                <View style={[fd.reqStatus, { borderColor: statusColor(req.status), backgroundColor: statusColor(req.status) + '22' }]}>
                  <Text style={[fd.reqStatusTxt, { color: statusColor(req.status) }]}>{statusLabel(req.status)}</Text>
                </View>
              </View>
              <View style={fd.reqAmountRow}>
                <Text style={[fd.reqAmountLabel, { color: C.textSec }]}>Amount Requested</Text>
                <Text style={[fd.reqAmount, { color: C.accent }]}>{fmtINR(req.amount)}</Text>
              </View>
              {req.note ? <Text style={[fd.reqNote, { color: C.textMuted }]}>{req.note}</Text> : null}
              <Text style={[fd.reqDate, { color: C.textMuted }]}>Submitted: {req.date}</Text>
            </View>
          ))
        )}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Fixed footer */}
      {student.remaining > 0 && (
        <View style={[sh.fixedFooter, { backgroundColor: C.bg, borderTopColor: C.border }]}>
          <TouchableOpacity
            style={[sh.footerBtn, { backgroundColor: C.accent }]}
            onPress={() => setRequestOpen(true)}
            activeOpacity={0.85}>
            <Text style={sh.footerBtnIcon}>📤</Text>
            <Text style={[sh.footerBtnText, { color: isDark ? '#060d1a' : '#fff' }]}>Send Fee Request</Text>
          </TouchableOpacity>
        </View>
      )}

      <RequestModal
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        student={student}
        onSubmit={handleSubmitRequest}
      />
    </SafeAreaView>
  );
}

// ─── Class Fee Report Screen ──────────────────────────────────────────────────
function ClassFeeScreen({ year, division, onBack, onStudentSelect }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const allData = useMemo(() => generateFeeData(year.id, division.id), [year.id, division.id]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredData = useMemo(() => {
    let list = allData;
    if (searchQuery.trim()) {
      list = list.filter(st =>
        st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.rollNo.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterStatus !== 'all') {
      list = list.filter(st => getPayStatus(st.paidPct).toLowerCase() === filterStatus);
    }
    return list;
  }, [allData, searchQuery, filterStatus]);

  const totalFeeCollected = allData.reduce((a, st) => a + st.paidTotal, 0);
  const totalFeePending   = allData.reduce((a, st) => a + st.remaining, 0);
  const totalGrand        = allData.reduce((a, st) => a + st.grandTotal, 0);
  const overallPct        = Math.round((totalFeeCollected / totalGrand) * 100);

  const FILTER_OPTIONS = [
    { key: 'all', label: 'All' }, { key: 'cleared', label: 'Cleared' },
    { key: 'partial', label: 'Partial' }, { key: 'due', label: 'Due' },
    { key: 'overdue', label: 'Overdue' },
  ];

  return (
    <SafeAreaView style={[sh.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      <View style={[sh.topHeader, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={[sh.headerIconBox, { backgroundColor: C.surface, borderColor: C.border }]} activeOpacity={0.7}>
          <Text style={[sh.headerIconText, { color: C.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[sh.topHeaderTitle, { color: C.textPrim }]}>{year.label} · Division {division.id}</Text>
          <Text style={[sh.topHeaderSub, { color: C.textSec }]}>Admission Fee Report · {SESSION_LABEL}</Text>
        </View>
      </View>
      <View style={[sh.accentDivider, { backgroundColor: C.accent }]} />

      {/* Search + Filters */}
      <View style={[fl.stickyTop, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <View style={[fl.searchWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={fl.searchIcon}>🔍</Text>
          <TextInput
            style={[fl.searchInput, { color: C.textPrim }]}
            placeholder="Search by name or roll no..."
            placeholderTextColor={C.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={fl.clearBtn} activeOpacity={0.7}>
              <Text style={[fl.clearTxt, { color: C.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={fl.filterRow} contentContainerStyle={{ gap: 8 }}>
          {FILTER_OPTIONS.map(opt => {
            const active = filterStatus === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[fl.chip, { backgroundColor: C.surface, borderColor: C.border }, active && { borderColor: C.accent, backgroundColor: C.accent + '18' }]}
                onPress={() => setFilterStatus(opt.key)}
                activeOpacity={0.8}>
                <Text style={[fl.chipTxt, { color: C.textSec }, active && { color: C.accent, fontWeight: '700' }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {searchQuery.trim().length > 0 && (
          <Text style={[fl.resultCount, { color: C.textMuted }]}>
            {filteredData.length} result{filteredData.length !== 1 ? 's' : ''} for "{searchQuery.trim()}"
          </Text>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={sh.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Summary chips */}
        <View style={sh.summaryRow}>
          <View style={[sh.summaryChip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[sh.summaryVal, { color: '#00c8ff' }]}>{fmtINR(totalGrand)}</Text>
            <Text style={[sh.summaryLbl, { color: C.textSec }]}>Total Fee</Text>
          </View>
          <View style={[sh.summaryChip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[sh.summaryVal, { color: '#00e676' }]}>{fmtINR(totalFeeCollected)}</Text>
            <Text style={[sh.summaryLbl, { color: C.textSec }]}>Collected</Text>
          </View>
          <View style={[sh.summaryChip, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[sh.summaryVal, { color: '#ff5252' }]}>{fmtINR(totalFeePending)}</Text>
            <Text style={[sh.summaryLbl, { color: C.textSec }]}>Pending</Text>
          </View>
        </View>

        {/* Overall progress */}
        <View style={[fl.overallBar, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={fl.overallBarHeader}>
            <Text style={[fl.overallBarLabel, { color: C.textSec }]}>Overall Collection</Text>
            <Text style={[fl.overallBarPct, { color: getPayColor(overallPct) }]}>{overallPct}%</Text>
          </View>
          <View style={[fl.progressTrack, { backgroundColor: C.surfaceAlt }]}>
            <View style={[fl.progressFill, { width: `${overallPct}%`, backgroundColor: getPayColor(overallPct) }]} />
          </View>
        </View>

        <View style={[fl.hintBox, { backgroundColor: C.accent + '12', borderColor: C.accent + '40' }]}>
          <Text style={[fl.hintText, { color: C.accent }]}>💡 Tap a student to view detailed fee breakdown & submit payment request</Text>
        </View>

        {/* Student list */}
        {filteredData.length === 0 ? (
          <View style={fl.noResults}>
            <Text style={fl.noResultsIcon}>🔍</Text>
            <Text style={[fl.noResultsText, { color: C.textSec }]}>No students found</Text>
          </View>
        ) : (
          filteredData.map((student, idx) => {
            const color  = getPayColor(student.paidPct);
            const status = getPayStatus(student.paidPct);
            return (
              <TouchableOpacity
                key={student.id}
                style={[fl.studentCard, { backgroundColor: C.surface, borderColor: C.border }, idx % 2 === 0 && { backgroundColor: C.surfaceAlt }]}
                onPress={() => onStudentSelect(student)}
                activeOpacity={0.75}>
                <View style={[fl.avatarSmall, { backgroundColor: C.accentBlue + '22', borderColor: C.accentBlue }]}>
                  <Text style={[fl.avatarSmallText, { color: C.accentBlue }]}>{student.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <HighlightText
                    text={student.name}
                    query={searchQuery}
                    style={[fl.studentName, { color: C.textPrim }]}
                    highlightStyle={[fl.highlightMatch, { backgroundColor: C.accent + '33', color: C.accent }]}
                  />
                  <HighlightText
                    text={student.rollNo}
                    query={searchQuery}
                    style={[fl.studentRoll, { color: C.textSec }]}
                    highlightStyle={[fl.highlightMatchRoll, { backgroundColor: C.accentBlue + '22', color: C.accentBlue }]}
                  />
                  <View style={fl.miniStats}>
                    <View style={fl.miniStat}>
                      <Text style={[fl.miniVal, { color: '#00e676' }]}>{fmtINR(student.paidTotal)}</Text>
                      <Text style={[fl.miniLbl, { color: C.textMuted }]}>Paid</Text>
                    </View>
                    <View style={fl.miniStat}>
                      <Text style={[fl.miniVal, { color: '#ff5252' }]}>
                        {student.remaining > 0 ? fmtINR(student.remaining) : 'Nil'}
                      </Text>
                      <Text style={[fl.miniLbl, { color: C.textMuted }]}>Due</Text>
                    </View>
                    {student.hasPendingRequest && (
                      <View style={[fl.pendingChip, { backgroundColor: '#2a1a00', borderColor: '#ffb300' }]}>
                        <Text style={fl.pendingChipTxt}>⏳ Request</Text>
                      </View>
                    )}
                  </View>
                  <View style={[fl.miniTrack, { backgroundColor: C.surfaceAlt }]}>
                    <View style={[fl.miniFill, { width: `${student.paidPct}%`, backgroundColor: color }]} />
                  </View>
                </View>
                <View style={fl.cardRight}>
                  <View style={[fl.badge, { borderColor: color, backgroundColor: color + '22' }]}>
                    <Text style={[fl.badgeTxt, { color }]}>{student.paidPct}%</Text>
                  </View>
                  <Text style={[fl.statusTxt, { color }]}>{status}</Text>
                  <Text style={[fl.cardArrow, { color: C.textMuted }]}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Legend */}
        <View style={[sh.legend, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[sh.legendTitle, { color: C.textSec }]}>Legend</Text>
          <View style={sh.legendRow}>
            <View style={[sh.legendDot, { backgroundColor: '#00e676' }]} /><Text style={[sh.legendText, { color: C.textSec }]}>{'>90% Cleared'}</Text>
            <View style={[sh.legendDot, { backgroundColor: '#69f0ae', marginLeft: 12 }]} /><Text style={[sh.legendText, { color: C.textSec }]}>60–90% Partial</Text>
            <View style={[sh.legendDot, { backgroundColor: '#ffb300', marginLeft: 12 }]} /><Text style={[sh.legendText, { color: C.textSec }]}>40–60% Due</Text>
            <View style={[sh.legendDot, { backgroundColor: '#ff5252', marginLeft: 12 }]} /><Text style={[sh.legendText, { color: C.textSec }]}>{'<40% Overdue'}</Text>
          </View>
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Step 1: Year & Division Selector ────────────────────────────────────────
function SelectorScreen({ onContinue }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [selectedYear, setSelectedYear]         = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const canContinue = selectedYear && selectedDivision;

  return (
    <SafeAreaView style={[sh.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      <View style={[sh.topHeader, { borderBottomColor: C.border }]}>
        <View style={sh.topHeaderLeft}>
          <View style={[sh.headerIconBox, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[sh.headerIconText, { color: C.accent }]}>💳</Text>
          </View>
          <View>
            <Text style={[sh.topHeaderTitle, { color: C.textPrim }]}>Admission Fee</Text>
            <Text style={[sh.topHeaderSub, { color: C.textSec }]}>Select year and division</Text>
          </View>
        </View>
        {canContinue && (
          <View style={[sh.selectedBadge, { backgroundColor: C.accent + '22', borderColor: C.accent }]}>
            <Text style={[sh.selectedBadgeText, { color: C.accent }]}>{selectedYear.id}yr · Div {selectedDivision.id}</Text>
          </View>
        )}
      </View>
      <View style={[sh.accentDivider, { backgroundColor: C.accent }]} />

      <View style={sh.selectorBody}>
        {/* Step 1 — Year */}
        <View style={sh.sectionHeader}>
          <View style={[sh.stepBadge, { backgroundColor: C.accent }]}>
            <Text style={[sh.stepNum, { color: isDark ? '#060d1a' : '#fff' }]}>1</Text>
          </View>
          <Text style={[sh.sectionTitle, { color: C.textPrim }]}>Choose Academic Year</Text>
        </View>
        <View style={sh.yearsGrid}>
          {YEARS.map((year) => {
            const isSel = selectedYear?.id === year.id;
            return (
              <TouchableOpacity
                key={year.id}
                style={[sh.yearCard, { backgroundColor: C.surface, borderColor: C.border }, isSel && { borderColor: C.accent, backgroundColor: C.accent + '12' }]}
                onPress={() => setSelectedYear(year)} activeOpacity={0.8}>
                <Text style={sh.yearCardIcon}>{year.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[sh.yearCardLabel, { color: C.textSec }, isSel && { color: C.accent }]}>{year.label}</Text>
                  <Text style={[sh.yearCardStudents, { color: C.textMuted }]}>{year.students}</Text>
                </View>
                {isSel && (
                  <View style={[sh.yearCardCheck, { backgroundColor: C.accent }]}>
                    <Text style={[sh.yearCardCheckTxt, { color: isDark ? '#060d1a' : '#fff' }]}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Step 2 — Division */}
        <View style={[sh.sectionHeader, { marginTop: 16 }]}>
          <View style={[sh.stepBadge, { backgroundColor: C.accent }]}>
            <Text style={[sh.stepNum, { color: isDark ? '#060d1a' : '#fff' }]}>2</Text>
          </View>
          <Text style={[sh.sectionTitle, { color: C.textPrim }]}>Choose Division</Text>
        </View>
        <View style={sh.divisionsRow}>
          {DIVISIONS.map((div) => {
            const isSel = selectedDivision?.id === div.id;
            return (
              <TouchableOpacity
                key={div.id}
                style={[sh.divCard, { backgroundColor: C.surface, borderColor: C.border }, isSel && { borderColor: C.accent, backgroundColor: C.accent + '12' }]}
                onPress={() => setSelectedDivision(div)} activeOpacity={0.8}>
                {isSel && (
                  <View style={[sh.divCheckBadge, { backgroundColor: C.accent }]}>
                    <Text style={[sh.divCheckText, { color: isDark ? '#060d1a' : '#fff' }]}>✓</Text>
                  </View>
                )}
                <View style={[sh.divCircle, { backgroundColor: C.surfaceAlt }, isSel && { backgroundColor: C.accent + '22' }]}>
                  <Text style={[sh.divLetter, { color: C.textMuted }, isSel && { color: C.accent }]}>{div.id}</Text>
                </View>
                <Text style={[sh.divLabel, { color: C.textSec }, isSel && { color: C.accent }]}>Division</Text>
                <Text style={[sh.divStudents, { color: C.textMuted }]}>{div.students}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {canContinue && (
          <View style={[sh.selectedClassBox, { backgroundColor: C.accent + '12', borderColor: C.accent }]}>
            <Text style={[sh.selectedClassLabel, { color: C.accent }]}>SELECTED CLASS</Text>
            <Text style={[sh.selectedClassValue, { color: C.accent }]}>{selectedYear.label} · Division {selectedDivision.id}</Text>
          </View>
        )}
      </View>

      <View style={[sh.footer, { backgroundColor: C.bg, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[sh.viewBtn, { backgroundColor: C.surface, borderColor: C.border }, canContinue && { backgroundColor: C.accent, borderColor: C.accent }]}
          onPress={() => canContinue && onContinue(selectedYear, selectedDivision)}
          disabled={!canContinue} activeOpacity={0.85}>
          <Text style={[sh.viewBtnText, { color: C.textMuted }, canContinue && { color: isDark ? '#060d1a' : '#fff', fontWeight: '800' }]}>
            {canContinue
              ? 'View Fee Report · ' + selectedYear.label + ' Div ' + selectedDivision.id + '  →'
              : 'Select Year & Division to Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function AdmissionFees() {
  const [screen, setScreen]                     = useState('selector');
  const [selectedYear, setSelectedYear]         = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedStudent, setSelectedStudent]   = useState(null);

  if (screen === 'detail' && selectedStudent) {
    return (
      <AdmissionfeeStudentDetail
        student={selectedStudent}
        year={selectedYear}
        division={selectedDivision}
        onBack={() => setScreen('list')}
      />
    );
  }

  if (screen === 'list') {
    return (
      <ClassFeeScreen
        year={selectedYear}
        division={selectedDivision}
        onBack={() => setScreen('selector')}
        onStudentSelect={(student) => { setSelectedStudent(student); setScreen('detail'); }}
      />
    );
  }

  return (
    <SelectorScreen
      onContinue={(year, division) => {
        setSelectedYear(year);
        setSelectedDivision(division);
        setScreen('list');
      }}
    />
  );
}

// ─── Fee Detail Styles ────────────────────────────────────────────────────────
const fd = StyleSheet.create({
  infoCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
  avatarCircle:   { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText:     { fontSize: 24, fontWeight: '800' },
  studentName:    { fontSize: 17, fontWeight: '700' },
  studentMeta:    { fontSize: 12, marginTop: 2 },

  overviewCard:   { borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1 },
  overviewTitle:  { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 14 },
  feeRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  feeItem:        { flex: 1, alignItems: 'center' },
  feeLabel:       { fontSize: 11, marginBottom: 4 },
  feeValue:       { fontSize: 15, fontWeight: '800' },
  feeDivider:     { width: 1, height: 36 },

  progressTrack:  { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill:   { height: '100%', borderRadius: 4 },
  progressLabel:  { fontSize: 12, fontWeight: '700', textAlign: 'right' },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4, gap: 8 },
  sectionIcon:     { fontSize: 17 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', flex: 1 },
  countBadge:      { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  countBadgeTxt:   { fontSize: 11, fontWeight: '800' },

  table:    { borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginBottom: 4 },
  thead:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 2 },
  th:       { fontSize: 10, fontWeight: '700' },
  tr:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 10, borderBottomWidth: 1 },
  tdName:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catIcon:  { fontSize: 13 },
  catLabel: { fontSize: 12, fontWeight: '600' },
  td:       { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  totalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderTopWidth: 1 },
  totalTd:  { fontSize: 12, fontWeight: '700', textAlign: 'right' },

  emptyRequests: { alignItems: 'center', paddingVertical: 28, borderRadius: 12, borderWidth: 1 },
  emptyIcon:     { fontSize: 32, marginBottom: 8 },
  emptyText:     { fontSize: 13 },

  requestCard:    { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  reqHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reqId:          { fontSize: 11, fontWeight: '700' },
  reqStatus:      { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  reqStatusTxt:   { fontSize: 11, fontWeight: '700' },
  reqAmountRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  reqAmountLabel: { fontSize: 12 },
  reqAmount:      { fontSize: 16, fontWeight: '800' },
  reqNote:        { fontSize: 12, marginBottom: 6, lineHeight: 18 },
  reqDate:        { fontSize: 11 },
});

// ─── Class Fee List Styles ────────────────────────────────────────────────────
const fl = StyleSheet.create({
  stickyTop:   { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 48 },
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  clearBtn:    { padding: 4 },
  clearTxt:    { fontSize: 14, fontWeight: '700' },
  resultCount: { fontSize: 12, marginTop: 4, marginLeft: 2 },

  filterRow: { marginTop: 8 },
  chip:      { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipTxt:   { fontSize: 12, fontWeight: '600' },

  overallBar:       { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  overallBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  overallBarLabel:  { fontSize: 12, fontWeight: '600' },
  overallBarPct:    { fontSize: 14, fontWeight: '800' },
  progressTrack:    { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 4 },

  hintBox:       { borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1 },
  hintText:      { fontSize: 12 },
  noResults:     { alignItems: 'center', paddingVertical: 40 },
  noResultsIcon: { fontSize: 36, marginBottom: 8 },
  noResultsText: { fontSize: 14 },

  studentCard:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6, borderWidth: 1 },
  avatarSmall:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  avatarSmallText:{ fontSize: 16, fontWeight: '800' },
  studentName:    { fontSize: 14, fontWeight: '700' },
  studentRoll:    { fontSize: 11, marginTop: 1 },
  miniStats:      { flexDirection: 'row', marginTop: 5, gap: 10, alignItems: 'center' },
  miniStat:       { flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniVal:        { fontSize: 11, fontWeight: '700' },
  miniLbl:        { fontSize: 10 },
  pendingChip:    { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  pendingChipTxt: { color: '#ffb300', fontSize: 9, fontWeight: '700' },
  miniTrack:      { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 6, marginRight: 4 },
  miniFill:       { height: '100%', borderRadius: 2 },
  cardRight:      { alignItems: 'center', gap: 3 },
  badge:          { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  badgeTxt:       { fontSize: 13, fontWeight: '800' },
  statusTxt:      { fontSize: 10, fontWeight: '700' },
  cardArrow:      { fontSize: 20, fontWeight: '300' },
  highlightMatch:     { fontWeight: '800', borderRadius: 2 },
  highlightMatchRoll: { fontWeight: '700', borderRadius: 2 },
});

// ─── Request Modal Styles ─────────────────────────────────────────────────────
const rm = StyleSheet.create({
  sheet:       { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderBottomWidth: 0, maxHeight: '80%' },
  header:      { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  headerSub:   { fontSize: 12, marginTop: 3 },
  closeBtn:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  closeTxt:    { fontSize: 14, fontWeight: '700' },
  accentDivider: { height: 2 },
  body:        { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },

  summaryStrip:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  summaryItem:   { flex: 1, alignItems: 'center', paddingVertical: 14 },
  summaryLabel:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue:  { fontSize: 14, fontWeight: '800' },
  summaryDivider:{ width: 1, height: 36 },

  fieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  inputWrap:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, overflow: 'hidden', height: 54 },
  rupeeIcon:  { paddingHorizontal: 14, fontSize: 18, fontWeight: '700' },
  textInput:  { flex: 1, fontSize: 18, fontWeight: '700' },
  fullPayBtn: { paddingHorizontal: 14, height: 54, borderLeftWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fullPayTxt: { fontSize: 12, fontWeight: '800' },

  noteInput:  { borderRadius: 12, borderWidth: 1, fontSize: 14, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, minHeight: 80 },

  footer:        { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1 },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 15, gap: 10 },
  submitIcon:    { fontSize: 19 },
  submitTxt:     { fontSize: 15, fontWeight: '800' },
});

// ─── Shared Styles ────────────────────────────────────────────────────────────
const sh = StyleSheet.create({
  container:     { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  accentDivider: { height: 2, marginBottom: 4 },

  topHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  topHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  topHeaderTitle:{ fontSize: 16, fontWeight: '700' },
  topHeaderSub:  { fontSize: 12, marginTop: 2 },
  headerIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerIconText:{ fontSize: 16, fontWeight: '700' },
  selectedBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  selectedBadgeText: { fontSize: 11, fontWeight: '700' },

  selectorBody:  { flex: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 },
  stepBadge:     { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNum:       { fontWeight: '800', fontSize: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '600' },

  yearsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  yearCard:          { width: '48%', borderRadius: 12, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, position: 'relative' },
  yearCardIcon:      { fontSize: 22 },
  yearCardLabel:     { fontSize: 14, fontWeight: '600' },
  yearCardStudents:  { fontSize: 10, marginTop: 1 },
  yearCardCheck:     { position: 'absolute', top: 6, right: 8, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  yearCardCheckTxt:  { fontSize: 10, fontWeight: '900' },

  divisionsRow:  { flexDirection: 'row', gap: 10, marginBottom: 12 },
  divCard:       { flex: 1, borderRadius: 14, alignItems: 'center', paddingVertical: 16, borderWidth: 1, position: 'relative' },
  divCheckBadge: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  divCheckText:  { fontSize: 10, fontWeight: '900' },
  divCircle:     { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  divLetter:     { fontSize: 20, fontWeight: '700' },
  divLabel:      { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  divStudents:   { fontSize: 10 },

  selectedClassBox:   { borderRadius: 10, padding: 12, borderWidth: 1, borderStyle: 'dashed' },
  selectedClassLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 3 },
  selectedClassValue: { fontSize: 16, fontWeight: '700' },

  footer:      { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  viewBtn:     { borderRadius: 12, paddingVertical: 15, alignItems: 'center', borderWidth: 1 },
  viewBtnText: { fontSize: 14, fontWeight: '600' },

  fixedFooter: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  footerBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 15, gap: 10 },
  footerBtnIcon:{ fontSize: 20 },
  footerBtnText:{ fontSize: 15, fontWeight: '800' },

  summaryRow:  { flexDirection: 'row', gap: 8, marginBottom: 10 },
  summaryChip: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  summaryVal:  { fontSize: 14, fontWeight: '800' },
  summaryLbl:  { fontSize: 11, marginTop: 2 },

  legend:      { marginVertical: 16, borderRadius: 12, padding: 14, borderWidth: 1 },
  legendTitle: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  legendDot:   { width: 10, height: 10, borderRadius: 5 },
  legendText:  { fontSize: 12, marginLeft: 6 },
});