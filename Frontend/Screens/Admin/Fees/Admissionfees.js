import React, { useState, useMemo, useContext, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, StatusBar, TextInput, Alert, Modal, ActivityIndicator, Platform,
} from 'react-native';
import { ThemeContext } from '../dashboard/AdminDashboard';
import axiosInstance from '../../../Src/Axios';

// ─── Cross-platform alert helper (works on web + mobile) ─────────────────────
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

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

const FEE_CATEGORIES = [
  { id: 'tuition', label: 'Tuition Fee',    icon: '📖', base: 45000 },
  { id: 'lab',     label: 'Lab Fee',         icon: '🔬', base: 8000  },
  { id: 'library', label: 'Library Fee',     icon: '📚', base: 3000  },
  { id: 'sports',  label: 'Sports Fee',      icon: '🏅', base: 2000  },
  { id: 'exam',    label: 'Examination Fee', icon: '📝', base: 5000  },
];

const SESSION_LABEL = '2024–25';

// ─── Generate base student objects (no mock fee data — real data comes from finance API) ─
const generateFeeDataFromStudents = (students, yearId) =>
  students.map((student, i) => {
    const _id = student._id || student.id;
    // Fee categories with base amounts (used only for proportional breakdown in detail view)
    const totalFee = FEE_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = Math.round(cat.base * (1 + (yearId - 1) * 0.05));
      return acc;
    }, {});
    const grandTotal = Object.values(totalFee).reduce((a, b) => a + b, 0);
    // All financial figures start as null — they are replaced by real API data.
    // null signals "not yet fetched / no record found" in the UI.
    return {
      id: i + 1,
      _id,
      name: student.name,
      rollNo: student.roll_no || student.id,
      totalFee,
      grandTotal:        null,
      paidTotal:         null,
      paidFee:           null,
      remaining:         null,
      paidPct:           0,
      session:           SESSION_LABEL,
      hasPendingRequest: false,   // never true until real finance data confirms a pending payment
      requests:          [],
    };
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtINR      = (n) => '₹' + n.toLocaleString('en-IN');
const getPayColor = (pct) => pct >= 90 ? '#00e676' : pct >= 60 ? '#69f0ae' : pct >= 40 ? '#ffb300' : '#ff5252';
const getPayStatus= (pct) => pct >= 90 ? 'Cleared' : pct >= 60 ? 'Partial' : pct >= 40 ? 'Due' : 'Overdue';

// ─── Compute real paid/remaining/pct from a finance DB record ────────────────
// Used identically by the list screen (batch) and the detail screen (single).
const computeFinanceSummary = (financeDoc, fallbackGrandTotal = 0) => {
  if (!financeDoc?.yearlyData?.length) return null;

  let totalTuition  = 0;
  let totalAid      = 0;
  let totalApproved = 0;
  let hasPending    = false;

  financeDoc.yearlyData.forEach(yr => {
    const payments = yr.payments || [];
    if (!payments.length) return;
    const latest    = payments[payments.length - 1];
    totalTuition   += latest?.tuitionFee   || 0;
    totalAid       += latest?.financialAid || 0;
    totalApproved  += payments.filter(p => p.status === 'approved').reduce((s, p) => s + p.amount, 0);
    if (payments.some(p => p.status === 'pending')) hasPending = true;
  });

  const netOwed    = Math.max(0, totalTuition - totalAid);
  const grandTotal = netOwed > 0 ? netOwed : fallbackGrandTotal;
  const remaining  = Math.max(0, grandTotal - totalApproved);
  const paidPct    = grandTotal > 0 ? Math.min(100, Math.round((totalApproved / grandTotal) * 100)) : 0;

  // Latest year-row DB status
  const lastYr   = financeDoc.yearlyData[financeDoc.yearlyData.length - 1];
  const dbStatus = lastYr?.status || null;

  return { paidTotal: totalApproved, remaining, paidPct, grandTotal, hasPending, dbStatus };
};

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

// ─── Admin Reject Modal ───────────────────────────────────────────────────────
function AdminRejectModal({ visible, onClose, payment, yearKey, onConfirm, isDark, C }) {
  const [remarks, setRemarks]   = useState('');
  const [loading, setLoading]   = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(remarks);
    setLoading(false);
    setRemarks('');
  };

  if (!payment) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' }}>
        <View style={[rm.sheet, { backgroundColor: C.bg, borderColor: C.border }]}>
          <View style={rm.header}>
            <View style={{ flex: 1 }}>
              <Text style={[rm.headerTitle, { color: C.textPrim }]}>Reject Payment</Text>
              <Text style={[rm.headerSub, { color: C.textSec }]}>{yearKey} · {fmtINR(payment.amount)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[rm.closeBtn, { backgroundColor: C.surface, borderColor: C.border }]} activeOpacity={0.7}>
              <Text style={[rm.closeTxt, { color: C.textSec }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={[rm.accentDivider, { backgroundColor: '#ff5252' }]} />
          <ScrollView contentContainerStyle={rm.body} showsVerticalScrollIndicator={false}>
            <Text style={[rm.fieldLabel, { color: C.textMuted }]}>REJECTION REASON (OPTIONAL)</Text>
            <TextInput
              style={[rm.noteInput, { backgroundColor: C.surface, borderColor: C.border, color: C.textPrim }]}
              placeholder="Add a note for the student..."
              placeholderTextColor={C.textMuted}
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>
          <View style={[rm.footer, { backgroundColor: C.bg, borderTopColor: C.border }]}>
            <TouchableOpacity
              style={[rm.submitBtn, { backgroundColor: '#ff5252' }, loading && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.85}>
              <Text style={rm.submitIcon}>{loading ? '⏳' : '✕'}</Text>
              <Text style={[rm.submitTxt, { color: '#fff' }]}>{loading ? 'Processing…' : 'Confirm Rejection'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Student Fee Detail Screen ────────────────────────────────────────────────
function AdmissionfeeStudentDetail({ student: initialStudent, year, division, onBack, onStudentUpdated }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  const [student, setStudent]                   = useState(initialStudent);
  const [financeData, setFinanceData]           = useState(null);
  const [financeLoading, setFinanceLoading]     = useState(true);
  const [financeError, setFinanceError]         = useState(null);
  const [rejectModal, setRejectModal]           = useState({ visible: false, payment: null, yearKey: '' });
  const [actionLoading, setActionLoading]       = useState(false);

  // Use MongoDB _id if available, otherwise fall back to rollNo
  const studentId = student._id || student.rollNo;

  useEffect(() => { fetchFinanceData(); }, [studentId]);

  const fetchFinanceData = async () => {
    try {
      setFinanceLoading(true);
      setFinanceError(null);
      const { data } = await axiosInstance.get(`/student-finance/${studentId}`);
      if (data.success) {
        setFinanceData(data.data);
        syncFeeOverview(data.data);   // ← update fee overview immediately on load
      } else {
        setFinanceData(null);
      }
    } catch (err) {
      if (err.response?.status !== 404) setFinanceError('Could not load payment submissions.');
      else setFinanceData(null);
    } finally {
      setFinanceLoading(false);
    }
  };

  // ── Recalculate student fee overview from real financeData ─────────────────
  const syncFeeOverview = (fd) => {
    const summary = computeFinanceSummary(fd, initialStudent.grandTotal);
    if (!summary) return;

    // Distribute paid proportionally across fee categories for breakdown table
    const paidFee = {};
    FEE_CATEGORIES.forEach(cat => {
      const catTotal = student.totalFee?.[cat.id] || 0;
      paidFee[cat.id] = summary.grandTotal > 0
        ? Math.min(catTotal, Math.round((summary.paidTotal / summary.grandTotal) * catTotal))
        : 0;
    });

    const updated = {
      ...student,
      paidTotal:  summary.paidTotal,
      remaining:  summary.remaining,
      paidPct:    summary.paidPct,
      paidFee,
      grandTotal: summary.grandTotal,
      hasPendingRequest: summary.hasPending,
      dbStatus:   summary.dbStatus,
    };
    setStudent(updated);
    // Notify parent list so the card refreshes without a full re-fetch
    onStudentUpdated?.(updated);
  };

  const handleApprove = async (payment) => {
    try {
      setActionLoading(true);
      await axiosInstance.patch(
        `/student-finance/${studentId}/payment/${payment.id}/status`,
        { status: 'approved', remarks: '' }
      );
      showAlert('✅ Approved', `Payment of ${fmtINR(payment.amount)} has been approved.`);
      fetchFinanceData();   // re-fetch → syncFeeOverview runs → overview updates
    } catch (err) {
      console.error('Approve error:', err.response?.data || err.message);
      showAlert('Error', err.response?.data?.message || 'Failed to approve payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (remarks) => {
    const { payment } = rejectModal;
    try {
      setActionLoading(true);
      await axiosInstance.patch(
        `/student-finance/${studentId}/payment/${payment.id}/status`,
        { status: 'rejected', remarks }
      );
      showAlert('✕ Rejected', 'Payment has been rejected.');
      setRejectModal({ visible: false, payment: null, yearKey: '' });
      fetchFinanceData();   // re-fetch → syncFeeOverview runs → overview updates
    } catch (err) {
      console.error('Reject error:', err.response?.data || err.message);
      showAlert('Error', err.response?.data?.message || 'Failed to reject payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = (s) => s === 'approved' ? '#00e676' : s === 'rejected' ? '#ff5252' : '#ffb300';
  const statusLabel = (s) => s === 'approved' ? '✓ Approved' : s === 'rejected' ? '✕ Rejected' : '⏳ Pending';

  // Flatten all payments across all year rows
  const allPayments = (financeData?.yearlyData || []).flatMap(yr =>
    (yr.payments || []).map(p => ({ ...p, yearLabel: yr.year }))
  );
  const pendingCount = allPayments.filter(p => p.status === 'pending').length;
  const pendingTotal = allPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

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
        {pendingCount > 0 && (
          <View style={[sh.selectedBadge, { borderColor: '#ffb300', backgroundColor: '#ffb30022' }]}>
            <Text style={[sh.selectedBadgeText, { color: '#ffb300' }]}>⏳ {pendingCount} Pending</Text>
          </View>
        )}
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
            <Text style={[fd.studentMeta, { color: C.textSec }]}>{year.label} · Division {division.id} · Session {SESSION_LABEL}</Text>
          </View>
        </View>

        {/* ── Yearly Financial Breakdown (from Student Finance) ── */}
        {financeLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>Loading fee breakdown…</Text>
          </View>
        ) : (() => {
          // Build table rows from financeData (same shape as StudentFinance FinanceTable)
          const AF_COLS = [
            { key: 'year',    label: 'Academic Year',  flex: 1.6 },
            { key: 'tuition', label: 'Tuition & Fees', flex: 1.2 },
            { key: 'aid',     label: 'Financial Aid',  flex: 1.1 },
            { key: 'parent',  label: 'Total Fee Paid', flex: 1.2 },
            { key: 'net',     label: 'Net Balance',    flex: 1.0 },
            { key: 'status',  label: 'Status',         flex: 1.3 },
          ];

          const afParseINR = (str) => parseInt(String(str || '0').replace(/[^0-9]/g, '')) || 0;
          const afFmtINR   = (n)   => '₹' + Number(n).toLocaleString('en-IN');

          const statusCfg = {
            paid:             { dotColor: '#00e676', badgeBg: '#00e67618', textColor: '#00e676' },
            pending:          { dotColor: '#ffb300', badgeBg: '#ffb30018', textColor: '#ffb300' },
            'pending-review': { dotColor: C.accent,  badgeBg: C.accent + '18', textColor: C.accent },
            partial:          { dotColor: '#ffb300', badgeBg: '#ffb30018', textColor: '#ffb300' },
            rejected:         { dotColor: '#ff5252', badgeBg: '#ff525218', textColor: '#ff5252' },
          };

          const rows = financeData?.yearlyData || [];
          const visRows = rows.filter(r => r.payments && r.payments.length > 0);

          const headerBg = isDark ? '#0d1520' : '#f0f4f8';
          const footerBg = isDark ? '#0d1520' : '#e8eef5';
          const evenBg   = isDark ? '#0a1118' : '#f8fafc';
          const oddBg    = isDark ? C.surface  : '#ffffff';
          const bc       = C.border;

          return (
            <View style={[fd.afTableWrap, { borderColor: C.border }]}>
              {/* Section header */}
              <View style={[fd.afTableHeader, { borderBottomColor: C.border }]}>
                <Text style={[fd.afTableTitle, { color: C.textPrim }]}>Yearly Financial Breakdown</Text>
                {financeData && !financeLoading && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00e67618', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#00e67650' }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e676' }} />
                    <Text style={{ color: '#00e676', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }}>LIVE</Text>
                  </View>
                )}
              </View>

              {/* Column headers */}
              <View style={[fd.afTRow, { backgroundColor: headerBg, borderBottomWidth: 2, borderBottomColor: bc }]}>
                {AF_COLS.map((col, ci) => (
                  <View key={col.key} style={[fd.afTCell, { flex: col.flex }, ci < AF_COLS.length - 1 && { borderRightWidth: 1, borderRightColor: bc }]}>
                    <Text style={[fd.afTHeadText, { color: C.textMuted }]}>{col.label}</Text>
                  </View>
                ))}
              </View>

              {/* Empty state */}
              {visRows.length === 0 && (
                <View style={{ paddingVertical: 32, alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 30 }}>📋</Text>
                  <Text style={{ fontSize: 13, color: C.textMuted }}>No payment records found</Text>
                </View>
              )}

              {/* Data rows */}
              {visRows.map((item, rowIdx) => {
                const cfg        = statusCfg[item.statusType] || statusCfg.pending;
                const rowBg      = rowIdx % 2 === 0 ? evenBg : oddBg;
                const hasPending = (item.payments || []).some(p => p.status === 'pending');

                // Derive display values from raw financeData row
                const tuitionNum = afParseINR(item.tuition);
                const aidNum     = afParseINR((item.aid || '0').replace('- ', '').replace('-', ''));
                const parentNum  = afParseINR(item.parent);
                const netNum     = afParseINR(item.net);

                return (
                  <View key={item.year || rowIdx}>
                    {/* Year row */}
                    <View style={[fd.afTRow, { backgroundColor: rowBg, borderBottomWidth: 1, borderBottomColor: bc }]}>
                      <View style={[fd.afTCell, { flex: AF_COLS[0].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                        <Text style={[fd.afTCellBold, { color: C.textPrim }]}>{item.year}</Text>
                        {hasPending && <Text style={{ color: '#ffb300', fontSize: 9, marginTop: 2 }}>⏳ Under Review</Text>}
                      </View>
                      <View style={[fd.afTCell, { flex: AF_COLS[1].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                        <Text style={[fd.afTCellMono, { color: C.textPrim }]}>{afFmtINR(tuitionNum)}</Text>
                      </View>
                      <View style={[fd.afTCell, { flex: AF_COLS[2].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                        <Text style={[fd.afTCellMono, { color: '#ff5252' }]}>- {afFmtINR(aidNum)}</Text>
                      </View>
                      <View style={[fd.afTCell, { flex: AF_COLS[3].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                        <Text style={[fd.afTCellMono, { color: C.textPrim }]}>{afFmtINR(parentNum)}</Text>
                      </View>
                      <View style={[fd.afTCell, { flex: AF_COLS[4].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                        <Text style={[fd.afTCellMono, { color: item.statusType === 'rejected' ? '#ff5252' : item.statusType === 'paid' ? '#00e676' : C.accent, fontWeight: '700' }]}>
                          {afFmtINR(netNum)}
                        </Text>
                      </View>
                      <View style={[fd.afTCell, { flex: AF_COLS[5].flex }]}>
                        <View style={[fd.afTBadge, { backgroundColor: cfg.badgeBg }]}>
                          <View style={[fd.afTDot, { backgroundColor: cfg.dotColor }]} />
                          <Text style={[fd.afTBadgeText, { color: cfg.textColor }]}>{item.status || 'Pending'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Payment sub-rows */}
                    {(item.payments || []).map((p) => (
                      <View key={String(p.id || p._id)} style={[fd.afTRow, { backgroundColor: isDark ? '#060d14' : '#f2f6fa', borderBottomWidth: 1, borderBottomColor: bc }]}>
                        <View style={[fd.afTCell, { flex: AF_COLS[0].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                          <Text style={[fd.afTSubText, { color: C.textMuted }]}>  ↳ {p.date}</Text>
                        </View>
                        <View style={[fd.afTCell, { flex: AF_COLS[1].flex + AF_COLS[2].flex + AF_COLS[3].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                          <Text style={[fd.afTSubText, { color: C.textMuted }]} numberOfLines={1}>{p.description || 'Payment'}</Text>
                        </View>
                        <View style={[fd.afTCell, { flex: AF_COLS[4].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                          <Text style={[fd.afTCellMono, { color: C.textPrim, fontSize: 11 }]}>{afFmtINR(p.amount)}</Text>
                        </View>
                        <View style={[fd.afTCell, { flex: AF_COLS[5].flex }]}>
                          <View style={[fd.afTBadge, {
                            backgroundColor: p.status === 'approved' ? '#00e67618' : p.status === 'rejected' ? '#ff525218' : '#ffb30018',
                          }]}>
                            <View style={[fd.afTDot, { backgroundColor: p.status === 'approved' ? '#00e676' : p.status === 'rejected' ? '#ff5252' : '#ffb300' }]} />
                            <Text style={[fd.afTBadgeText, { color: p.status === 'approved' ? '#00e676' : p.status === 'rejected' ? '#ff5252' : '#ffb300' }]}>
                              {p.status === 'approved' ? '✓ Approved' : p.status === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}

              {/* Footer totals row */}
              {visRows.length > 0 && (() => {
                const totalTuition = visRows.reduce((s, r) => s + afParseINR(r.tuition), 0);
                const totalAid     = visRows.reduce((s, r) => s + afParseINR((r.aid || '0').replace('- ', '').replace('-', '')), 0);
                const totalParent  = visRows.reduce((s, r) => s + afParseINR(r.parent), 0);
                const totalNet     = visRows.reduce((s, r) => s + afParseINR(r.net), 0);
                const pendingCnt   = visRows.filter(r => r.statusType !== 'paid').length;
                return (
                  <View style={[fd.afTRow, { backgroundColor: footerBg, borderTopWidth: 2, borderTopColor: bc }]}>
                    <View style={[fd.afTCell, { flex: AF_COLS[0].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                      <Text style={[fd.afTFootLabel, { color: C.textPrim }]}>TOTAL ({visRows.length} Yr{visRows.length > 1 ? 's' : ''})</Text>
                    </View>
                    <View style={[fd.afTCell, { flex: AF_COLS[1].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                      <Text style={[fd.afTFootVal, { color: C.textPrim }]}>{afFmtINR(totalTuition)}</Text>
                    </View>
                    <View style={[fd.afTCell, { flex: AF_COLS[2].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                      <Text style={[fd.afTFootVal, { color: '#ff5252' }]}>- {afFmtINR(totalAid)}</Text>
                    </View>
                    <View style={[fd.afTCell, { flex: AF_COLS[3].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                      <Text style={[fd.afTFootVal, { color: C.textPrim }]}>{afFmtINR(totalParent)}</Text>
                    </View>
                    <View style={[fd.afTCell, { flex: AF_COLS[4].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                      <Text style={[fd.afTFootVal, { color: C.accent }]}>{afFmtINR(totalNet)}</Text>
                    </View>
                    <View style={[fd.afTCell, { flex: AF_COLS[5].flex }]}>
                      <Text style={[fd.afTFootLabel, { color: C.textMuted }]}>{pendingCnt} Pending</Text>
                    </View>
                  </View>
                );
              })()}
            </View>
          );
        })()}

        {/* ── Payment Submissions from Student Finance Portal ── */}
        <View style={[fd.sectionTitleRow, { marginTop: 20 }]}>
          <Text style={fd.sectionIcon}>📥</Text>
          <Text style={[fd.sectionTitle, { color: C.textPrim }]}>Student Payment Submissions</Text>
          {pendingCount > 0 && (
            <View style={[fd.countBadge, { backgroundColor: '#ffb30022', borderColor: '#ffb300' }]}>
              <Text style={[fd.countBadgeTxt, { color: '#ffb300' }]}>{pendingCount} pending</Text>
            </View>
          )}
        </View>

        {financeLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: 28 }}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={{ color: C.textMuted, fontSize: 12, marginTop: 8 }}>Loading payment submissions…</Text>
          </View>
        ) : financeError ? (
          <View style={[fd.emptyRequests, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={fd.emptyIcon}>⚠️</Text>
            <Text style={[fd.emptyText, { color: '#ff5252' }]}>{financeError}</Text>
            <TouchableOpacity onPress={fetchFinanceData} style={{ marginTop: 8 }}>
              <Text style={{ color: C.accent, fontWeight: '700', fontSize: 13 }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : allPayments.length === 0 ? (
          <View style={[fd.emptyRequests, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={fd.emptyIcon}>📭</Text>
            <Text style={[fd.emptyText, { color: C.textMuted }]}>No payment submissions found</Text>
          </View>
        ) : (
          <>
            {pendingCount > 0 && (
              <View style={{ borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffb30012', borderColor: '#ffb30055' }}>
                <Text style={{ fontSize: 20 }}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#ffb300', fontWeight: '700', fontSize: 13 }}>{pendingCount} payment(s) awaiting your review</Text>
                  <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 2 }}>Total pending: {fmtINR(pendingTotal)}</Text>
                </View>
              </View>
            )}
            {allPayments.map((p) => (
              <View key={String(p.id)} style={[fd.requestCard, { backgroundColor: C.surface, borderColor: p.status === 'pending' ? '#ffb300' : C.border }]}>
                <View style={fd.reqHeader}>
                  <View>
                    <Text style={[fd.reqId, { color: C.textSec }]}>{p.yearLabel}</Text>
                    <Text style={{ color: C.textMuted, fontSize: 10, marginTop: 2 }}>Submitted: {p.date}</Text>
                  </View>
                  <View style={[fd.reqStatus, { borderColor: statusColor(p.status), backgroundColor: statusColor(p.status) + '22' }]}>
                    <Text style={[fd.reqStatusTxt, { color: statusColor(p.status) }]}>{statusLabel(p.status)}</Text>
                  </View>
                </View>
                <View style={fd.reqAmountRow}>
                  <View>
                    <Text style={[fd.reqAmountLabel, { color: C.textSec }]}>Amount Submitted</Text>
                    <Text style={[fd.reqAmount, { color: C.accent }]}>{fmtINR(p.amount)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {p.tuitionFee > 0 && <Text style={{ color: C.textMuted, fontSize: 10 }}>Tuition: {fmtINR(p.tuitionFee)}</Text>}
                    {p.financialAid > 0 && <Text style={{ color: '#00e676', fontSize: 10 }}>Aid: -{fmtINR(p.financialAid)}</Text>}
                    {p.receipt?.fileType && <Text style={{ color: C.textMuted, fontSize: 10 }}>Receipt: {p.receipt.fileType === 'photo' ? '🖼️ Image' : '📄 PDF'}</Text>}
                  </View>
                </View>
                {p.description ? <Text style={[fd.reqNote, { color: C.textMuted }]}>"{p.description}"</Text> : null}
                {p.status === 'rejected' && p.adminRemarks
                  ? <Text style={{ color: '#ff5252', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>Remark: {p.adminRemarks}</Text>
                  : null}
                {p.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      style={{ flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderColor: '#ff5252' }}
                      onPress={() => setRejectModal({ visible: true, payment: p, yearKey: p.yearLabel })}
                      disabled={actionLoading}
                      activeOpacity={0.8}>
                      <Text style={{ color: '#ff5252', fontWeight: '700', fontSize: 14 }}>✕  Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 2, borderRadius: 10, paddingVertical: 11, alignItems: 'center', backgroundColor: '#00e676', justifyContent: 'center' }}
                      onPress={() => handleApprove(p)}
                      disabled={actionLoading}
                      activeOpacity={0.8}>
                      {actionLoading
                        ? <ActivityIndicator size="small" color={isDark ? '#060d1a' : '#fff'} />
                        : <Text style={{ color: isDark ? '#060d1a' : '#fff', fontWeight: '700', fontSize: 14 }}>✓  Approve</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      <AdminRejectModal
        visible={rejectModal.visible}
        onClose={() => setRejectModal({ visible: false, payment: null, yearKey: '' })}
        payment={rejectModal.payment}
        yearKey={rejectModal.yearKey}
        onConfirm={handleReject}
        isDark={isDark}
        C={C}
      />
    </SafeAreaView>
  );
}

// ─── Class Fee Report Screen ──────────────────────────────────────────────────
function ClassFeeScreen({ year, division, onBack, onStudentSelect, updatedStudents = {} }) {
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  // ── API state ───────────────────────────────────────────────────────────────
  const [dbStudents,    setDbStudents]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [apiError,      setApiError]      = useState(null);
  // liveData: map of studentId → { paidTotal, remaining, paidPct, grandTotal, hasPending, dbStatus }
  const [liveData,      setLiveData]      = useState({});
  const [liveLoading,   setLiveLoading]   = useState(false);

  // ── Fetch students ──────────────────────────────────────────────────────────
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setApiError(null);
      const res = await axiosInstance.get('/students');
      if (!res.data.success) throw new Error('Invalid response from server');
      const filtered = res.data.data.filter(
        s => String(s.year) === String(year.id) && String(s.division) === String(division.id)
      );
      setDbStudents(filtered);
      // Fetch finance data for all students in background
      fetchAllFinanceData(filtered);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setApiError('Could not load students. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Batch-fetch finance records for every student and build liveData map ────
  const fetchAllFinanceData = async (students) => {
    if (!students.length) return;
    setLiveLoading(true);
    try {
      const results = await Promise.allSettled(
        students.map(s =>
          axiosInstance.get(`/student-finance/${s._id || s.id}`)
            .then(r => ({ studentId: s._id || s.id, doc: r.data?.success ? r.data.data : null }))
            .catch(() => ({ studentId: s._id || s.id, doc: null }))
        )
      );
      const map = {};
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.doc) {
          const base    = generateFeeDataFromStudents(
            students.filter(s => (s._id || s.id) === r.value.studentId), year.id
          )[0];
          const summary = computeFinanceSummary(r.value.doc, base?.grandTotal || 0);
          if (summary) map[r.value.studentId] = summary;
        }
      });
      setLiveData(map);
    } catch (e) {
      console.error('Finance batch fetch error:', e);
    } finally {
      setLiveLoading(false);
    }
  };

  // Called from root when admin approves/rejects in detail — refresh just that student
  const refreshStudentFinance = async (studentId, fallbackGrandTotal) => {
    try {
      const { data } = await axiosInstance.get(`/student-finance/${studentId}`);
      if (data.success) {
        const summary = computeFinanceSummary(data.data, fallbackGrandTotal);
        if (summary) setLiveData(prev => ({ ...prev, [studentId]: summary }));
      }
    } catch (e) { /* silent */ }
  };

  useEffect(() => { fetchStudents(); }, [year.id, division.id]);

  // ── Merge base student objects with real finance figures ─────────────────────
  // Base objects have null for all fee fields. They are replaced only when real
  // finance data is available. hasPendingRequest is NEVER set from mock data.
  const allData = useMemo(() => {
    const base = generateFeeDataFromStudents(dbStudents, year.id);
    return base.map(st => {
      const studentId = st._id;
      // Priority: updatedStudents (from detail screen) > liveData (batch fetch)
      const updated = updatedStudents[studentId] || updatedStudents[st.rollNo];
      if (updated) {
        return { ...st, ...updated, _refreshFinance: refreshStudentFinance };
      }
      const live = liveData[studentId];
      // No finance record found → keep nulls and hasPendingRequest: false
      if (!live) return st;

      // Real finance record found → populate fee figures
      const paidFee = {};
      FEE_CATEGORIES.forEach(cat => {
        const catTotal = st.totalFee[cat.id] || 0;
        paidFee[cat.id] = (live.grandTotal != null && live.grandTotal > 0)
          ? Math.min(catTotal, Math.round(((live.paidTotal || 0) / live.grandTotal) * catTotal))
          : null;
      });
      return {
        ...st,
        paidTotal:         live.paidTotal   ?? null,
        remaining:         live.remaining   ?? null,
        paidPct:           live.paidPct     ?? 0,
        grandTotal:        live.grandTotal  ?? null,
        paidFee,
        // Only true when the finance API actually has a pending payment record
        hasPendingRequest: live.hasPending  === true,
        dbStatus:          live.dbStatus,
        _refreshFinance:   refreshStudentFinance,
      };
    });
  }, [dbStudents, year.id, liveData, updatedStudents]);

  const [searchQuery,   setSearchQuery]   = useState('');
  const [filterStatus,  setFilterStatus]  = useState('all');

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

  const totalFeeCollected = allData.reduce((a, st) => a + (st.paidTotal  ?? 0), 0);
  const totalFeePending   = allData.reduce((a, st) => a + (st.remaining  ?? 0), 0);
  const totalGrand        = allData.reduce((a, st) => a + (st.grandTotal ?? 0), 0);
  const overallPct        = totalGrand > 0 ? Math.round((totalFeeCollected / totalGrand) * 100) : 0;

  const FILTER_OPTIONS = [
    { key: 'all', label: 'All' }, { key: 'cleared', label: 'Cleared' },
    { key: 'partial', label: 'Partial' }, { key: 'due', label: 'Due' },
    { key: 'overdue', label: 'Overdue' },
  ];

  return (
    <SafeAreaView style={[sh.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Header */}
      <View style={[sh.topHeader, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onBack} style={[sh.headerIconBox, { backgroundColor: C.surface, borderColor: C.border }]} activeOpacity={0.7}>
          <Text style={[sh.headerIconText, { color: C.accent }]}>←</Text>
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[sh.topHeaderTitle, { color: C.textPrim }]}>{year.label} · Division {division.id}</Text>
          <Text style={[sh.topHeaderSub, { color: C.textSec }]}>Admission Fee Report · {SESSION_LABEL}</Text>
        </View>
        {liveLoading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent + '18', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.accent + '40' }}>
            <ActivityIndicator size="small" color={C.accent} />
            <Text style={{ color: C.accent, fontSize: 10, fontWeight: '700' }}>Syncing…</Text>
          </View>
        )}
        {!liveLoading && Object.keys(liveData).length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#00e67618', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#00e67640' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#00e676' }} />
            <Text style={{ color: '#00e676', fontSize: 10, fontWeight: '700' }}>Live</Text>
          </View>
        )}
      </View>
      <View style={[sh.accentDivider, { backgroundColor: C.accent }]} />

      {/* ── Loading State ─────────────────────────────────────────────────────── */}
      {loading && (
        <View style={sh.centeredState}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={[sh.centeredStateText, { color: C.textSec }]}>Loading students...</Text>
        </View>
      )}

      {/* ── Error State ───────────────────────────────────────────────────────── */}
      {!loading && apiError && (
        <View style={sh.centeredState}>
          <Text style={sh.centeredStateIcon}>⚠️</Text>
          <Text style={[sh.centeredStateText, { color: '#ff5252' }]}>{apiError}</Text>
          <TouchableOpacity
            style={[sh.retryBtn, { backgroundColor: C.accent }]}
            onPress={fetchStudents}
            activeOpacity={0.85}>
            <Text style={[sh.retryBtnText, { color: isDark ? '#060d1a' : '#fff' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Empty State (loaded but no students found) ─────────────────────── */}
      {!loading && !apiError && dbStudents.length === 0 && (
        <View style={sh.centeredState}>
          <Text style={sh.centeredStateIcon}>🎓</Text>
          <Text style={[sh.centeredStateText, { color: C.textSec }]}>
            No students found for {year.label} · Division {division.id}
          </Text>
          <TouchableOpacity
            style={[sh.retryBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
            onPress={fetchStudents}
            activeOpacity={0.85}>
            <Text style={[sh.retryBtnText, { color: C.accent }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      {!loading && !apiError && dbStudents.length > 0 && (
        <>
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
                          <Text style={[fl.miniVal, { color: '#00e676' }]}>
                            {student.paidTotal != null ? fmtINR(student.paidTotal) : '—'}
                          </Text>
                          <Text style={[fl.miniLbl, { color: C.textMuted }]}>Paid</Text>
                        </View>
                        <View style={fl.miniStat}>
                          <Text style={[fl.miniVal, { color: student.remaining == null ? C.textMuted : student.remaining > 0 ? '#ff5252' : '#00e676' }]}>
                            {student.remaining == null ? '—' : student.remaining > 0 ? fmtINR(student.remaining) : 'Nil'}
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
                      {student.dbStatus && (() => {
                        const dbc = student.dbStatus === 'Paid Full' ? '#00e676'
                                  : student.dbStatus === 'Partial'   ? '#ffb300'
                                  : student.dbStatus === 'Rejected'  ? '#ff5252'
                                  : '#60A5FA';
                        return (
                          <View style={{ backgroundColor: dbc + '22', borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: dbc + '55', marginTop: 2 }}>
                            <Text style={{ color: dbc, fontSize: 8, fontWeight: '800' }}>{student.dbStatus}</Text>
                          </View>
                        );
                      })()}
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
        </>
      )}
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
  // Holds updated student objects that came back from the detail screen
  const [updatedStudents, setUpdatedStudents]   = useState({});

  const handleStudentUpdated = (student) => {
    setUpdatedStudents(prev => ({ ...prev, [student._id || student.rollNo]: student }));
  };

  if (screen === 'detail' && selectedStudent) {
    return (
      <AdmissionfeeStudentDetail
        student={selectedStudent}
        year={selectedYear}
        division={selectedDivision}
        onBack={() => setScreen('list')}
        onStudentUpdated={handleStudentUpdated}
      />
    );
  }

  if (screen === 'list') {
    return (
      <ClassFeeScreen
        year={selectedYear}
        division={selectedDivision}
        onBack={() => setScreen('selector')}
        updatedStudents={updatedStudents}
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

  // ── Yearly Financial Breakdown table ──────────────────────────────────────
  afTableWrap:    { borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  afTableHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  afTableTitle:   { fontSize: 15, fontWeight: '700' },
  afTRow:         { flexDirection: 'row', width: '100%' },
  afTCell:        { paddingVertical: 10, paddingHorizontal: 7, justifyContent: 'center' },
  afTHeadText:    { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  afTCellBold:    { fontSize: 11, fontWeight: '600' },
  afTCellMono:    { fontSize: 11 },
  afTSubText:     { fontSize: 10, fontStyle: 'italic' },
  afTBadge:       { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20, gap: 4 },
  afTDot:         { width: 5, height: 5, borderRadius: 3 },
  afTBadgeText:   { fontSize: 9, fontWeight: '700' },
  afTFootLabel:   { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  afTFootVal:     { fontSize: 11, fontWeight: '700' },



  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4, gap: 8 },
  sectionIcon:     { fontSize: 17 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', flex: 1 },
  countBadge:      { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  countBadgeTxt:   { fontSize: 11, fontWeight: '800' },



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

  // ── Centered states (loading / error / empty) ──────────────────────────────
  centeredState:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, gap: 14 },
  centeredStateIcon: { fontSize: 42 },
  centeredStateText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  retryBtn:          { borderRadius: 10, paddingHorizontal: 28, paddingVertical: 12 },
  retryBtnText:      { fontSize: 14, fontWeight: '700' },

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