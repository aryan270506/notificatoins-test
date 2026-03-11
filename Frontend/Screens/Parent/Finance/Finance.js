import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../Dashboard/Dashboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '../../../Src/Axios';

// ─── Cross-platform alert helper ─────────────────────────────────────────────
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatINR(num) {
  if (!num && num !== 0) return '\u20B90';
  return '\u20B9' + Number(num).toLocaleString('en-IN');
}
function parseINR(str) {
  if (!str) return 0;
  return parseInt(String(str).replace(/[^0-9]/g, '')) || 0;
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────
const StatCard = ({ title, value, sub, showBar, barPercent, style, s, C }) => (
  <View style={[s.statCard, style]}>
    <Text style={s.statTitle}>{title}</Text>
    <Text style={s.statValue}>{value}</Text>
    {sub && !showBar && <Text style={s.statSub}>{sub}</Text>}
    {showBar && (
      <View style={s.barWrap}>
        <View style={s.barBg}>
          <View style={[s.barFill, { width: `${barPercent || 0}%` }]} />
        </View>
        <Text style={s.barLabel}>{barPercent || 0}%</Text>
      </View>
    )}
  </View>
);

const StatusBadge = ({ type, label, C }) => {
  const colorMap = {
    paid:     { bg: C.mode === 'dark' ? '#052e16' : '#dcfce7', text: '#10B981' },
    pending:  { bg: C.mode === 'dark' ? '#431407' : '#fef3c7', text: '#F59E0B' },
    partial:  { bg: C.mode === 'dark' ? '#431407' : '#fef3c7', text: '#F59E0B' },
    rejected: { bg: C.mode === 'dark' ? '#3b0808' : '#fde8e8', text: '#EF4444' },
  };
  const c = colorMap[type] || colorMap.pending;
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 5,
      backgroundColor: c.bg,
    }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.text }} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.text }}>{label}</Text>
    </View>
  );
};

// ─── Table Row ───────────────────────────────────────────────────────────────
const TableRow = ({ item, index, isLaptop, C, s }) => {
  const [pressed, setPressed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => setExpanded(prev => !prev)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[s.tableRow, index % 2 === 0 && s.tableRowAlt, pressed && s.tableRowPressed]}
    >
      {isLaptop ? (
        <View>
          <View style={s.tableRowInner}>
            <Text style={[s.cellText, { flex: 2 }]}>{item.year}</Text>
            <Text style={[s.cellText, { flex: 1.5, textAlign: 'center' }]}>{item.tuition}</Text>
            <Text style={[s.cellText, s.aidText, { flex: 1.5, textAlign: 'center' }]}>{item.aid}</Text>
            <Text style={[s.cellText, { flex: 1.5, textAlign: 'center' }]}>{item.parent}</Text>
            <Text style={[s.cellText, { flex: 1.2, textAlign: 'center' },
              item.statusType === 'pending' && s.pendingAmount,
              item.statusType === 'rejected' && { color: '#EF4444' },
            ]}>
              {item.net}
            </Text>
            <View style={{ flex: 1.2, alignItems: 'center' }}>
              <StatusBadge type={item.statusType} label={item.status} C={C} />
            </View>
          </View>

          {/* Expanded payment details on desktop */}
          {expanded && item.payments && item.payments.length > 0 && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.sub, marginBottom: 4 }}>Payment History:</Text>
              {item.payments.map((pay, pi) => (
                <View key={pi} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: pi < item.payments.length - 1 ? 1 : 0, borderBottomColor: C.cardBorder }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: C.sub }}>{pay.description || `Payment ${pi + 1}`}</Text>
                    <Text style={{ fontSize: 10, color: C.muted }}>{pay.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: C.white }}>{formatINR(pay.amount)}</Text>
                    <StatusBadge type={pay.status} label={pay.status} C={C} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={s.mobileRow}>
          <View style={s.mobileRowHeader}>
            <Text style={s.mobileRowYear}>{item.year}</Text>
            <StatusBadge type={item.statusType} label={item.status} C={C} />
          </View>
          <View style={s.mobileRowGrid}>
            <View style={s.mobileCell}>
              <Text style={s.mobileCellLabel}>Tuition &amp; Fees</Text>
              <Text style={s.mobileCellValue}>{item.tuition}</Text>
            </View>
            <View style={s.mobileCell}>
              <Text style={s.mobileCellLabel}>Financial Aid</Text>
              <Text style={[s.mobileCellValue, s.aidText]}>{item.aid}</Text>
            </View>
            <View style={s.mobileCell}>
              <Text style={s.mobileCellLabel}>Total Fee Paid</Text>
              <Text style={s.mobileCellValue}>{item.parent}</Text>
            </View>
            <View style={s.mobileCell}>
              <Text style={s.mobileCellLabel}>Net Balance</Text>
              <Text style={[s.mobileCellValue,
                item.statusType === 'pending' && s.pendingAmount,
                item.statusType === 'rejected' && { color: '#EF4444' },
              ]}>{item.net}</Text>
            </View>
          </View>

          {/* Payment details on mobile */}
          {expanded && item.payments && item.payments.length > 0 && (
            <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.cardBorder }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.sub, marginBottom: 6 }}>Payment History:</Text>
              {item.payments.map((pay, pi) => (
                <View key={pi} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: C.sub }}>{pay.description || pay.date}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: C.white }}>{formatINR(pay.amount)}</Text>
                    <StatusBadge type={pay.status} label={pay.status} C={C} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {item.payments && item.payments.length > 0 && (
            <Text style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 6 }}>
              {expanded ? 'Tap to collapse' : 'Tap to see payments'}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Donut Chart ─────────────────────────────────────────────────────────────
const DonutChart = ({ isLaptop, C, s, totalCost, totalPaid }) => {
  const size = isLaptop ? 120 : 90;
  const stroke = 14;
  const inner = size - stroke * 2;
  const paidPct = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;
  return (
    <View style={s.donutWrapper}>
      <View style={[s.donutPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[s.donutInner, { width: inner, height: inner, borderRadius: inner / 2 }]}>
          <Text style={s.donutCenter}>{paidPct}%</Text>
          <Text style={s.donutSub}>PAID</Text>
        </View>
      </View>
      <View style={s.legendWrap}>
        {[
          { label: 'Total Paid', color: '#10B981', pct: paidPct },
          { label: 'Remaining',  color: '#F59E0B', pct: 100 - paidPct },
        ].map((src) => (
          <View key={src.label} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: src.color }]} />
            <Text style={s.legendText}>
              {src.label} <Text style={{ color: C.sub }}>{src.pct}%</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ─── Cost Trend Bars ─────────────────────────────────────────────────────────
const CostTrendBars = ({ isLaptop, s, yearlyData }) => {
  if (!yearlyData || yearlyData.length === 0) {
    return <Text style={{ color: '#6b90b8', textAlign: 'center', padding: 16, fontSize: 12 }}>No data yet</Text>;
  }
  const maxVal = Math.max(...yearlyData.map(y => Math.max(parseINR(y.tuition), parseINR(y.aid))), 1);
  const barH = isLaptop ? 100 : 80;
  return (
    <View style={s.trendWrap}>
      {yearlyData.map((y, i) => {
        const tuitionVal = parseINR(y.tuition);
        const aidVal = parseINR(y.aid);
        const yearMatch = y.year.match(/\(([^)]+)\)/);
        const label = yearMatch ? yearMatch[1] : `Y${i + 1}`;
        return (
          <View key={i} style={s.trendGroup}>
            <View style={[s.trendBars, { height: barH }]}>
              <View style={[s.trendBar, { height: (tuitionVal / maxVal) * barH, backgroundColor: '#6366F1', marginRight: 2 }]} />
              <View style={[s.trendBar, { height: (aidVal / maxVal) * barH, backgroundColor: '#10B981' }]} />
            </View>
            <Text style={s.trendLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── Full Report Modal ───────────────────────────────────────────────────────
function FullReportModal({ visible, onClose, C, isLaptop, yearlyData, studentInfo, totalCost, totalPaid, remaining }) {
  const [expanded, setExpanded] = useState(null);
  const toggle = (i) => setExpanded(prev => prev === i ? null : i);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={rms.overlay}>
          <TouchableWithoutFeedback>
            <View style={[rms.sheet, {
              backgroundColor: C.card,
              borderColor: C.cardBorder,
              width: isLaptop ? 680 : '94%',
              maxHeight: '90%',
            }]}>
              {/* Header */}
              <View style={[rms.modalHeader, { borderBottomColor: C.cardBorder }]}>
                <View>
                  <Text style={[rms.modalTitle, { color: C.white }]}>Full Financial Report</Text>
                  <Text style={[rms.modalSub, { color: C.sub }]}>
                    {studentInfo.branch || ''} {studentInfo.name ? `\u00B7 ${studentInfo.name}` : ''} {studentInfo.prn ? `\u00B7 PRN: ${studentInfo.prn}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={[rms.closeBtn, { backgroundColor: C.mode === 'dark' ? '#162840' : '#e2ecf5', borderColor: C.cardBorder }]}
                >
                  <Text style={{ color: C.sub, fontSize: 16, fontWeight: '700' }}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, gap: 14 }}>
                {/* Summary Strip */}
                <View style={[rms.summaryRow, { backgroundColor: C.mode === 'dark' ? '#0f1e30' : '#eaf2fb', borderColor: C.cardBorder }]}>
                  {[
                    { label: 'Total Cost',  value: formatINR(totalCost), color: C.white },
                    { label: 'Total Paid',  value: formatINR(totalPaid), color: '#10B981' },
                    { label: 'Outstanding', value: formatINR(remaining), color: '#F59E0B' },
                  ].map((item, i) => (
                    <View key={i} style={rms.summaryItem}>
                      <Text style={[rms.summaryVal, { color: item.color }]}>{item.value}</Text>
                      <Text style={[rms.summaryLabel, { color: C.sub }]}>{item.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Per-Year Accordion */}
                {yearlyData.map((rd, i) => {
                  const isOpen = expanded === i;
                  const isPaid = rd.statusType === 'paid';
                  const isRejected = rd.statusType === 'rejected';
                  return (
                    <View key={i} style={[rms.accordion, { backgroundColor: C.mode === 'dark' ? '#0f1e30' : '#f5f9ff', borderColor: C.cardBorder }]}>
                      <TouchableOpacity activeOpacity={0.75} onPress={() => toggle(i)} style={rms.accHeader}>
                        <View style={[rms.yearDot, { backgroundColor: isPaid ? '#10B981' : isRejected ? '#EF4444' : '#F59E0B' }]} />
                        <Text style={[rms.accYear, { color: C.white }]}>{rd.year}</Text>
                        <StatusBadge type={rd.statusType} label={rd.status} C={C} />
                        <Text style={[rms.chevron, { color: C.sub }]}>{isOpen ? '\u25B2' : '\u25BC'}</Text>
                      </TouchableOpacity>

                      {isOpen && (
                        <View style={[rms.accBody, { borderTopColor: C.cardBorder }]}>
                          {/* Summary */}
                          <View style={[rms.totalsBox, { backgroundColor: C.mode === 'dark' ? '#162840' : '#ddeaf8', borderColor: C.cardBorder }]}>
                            <View style={rms.totalRow}>
                              <Text style={[rms.totalLabel, { color: C.sub }]}>Tuition & Fees</Text>
                              <Text style={[rms.totalVal, { color: C.white }]}>{rd.tuition || '\u20B90'}</Text>
                            </View>
                            <View style={rms.totalRow}>
                              <Text style={[rms.totalLabel, { color: C.sub }]}>Financial Aid</Text>
                              <Text style={[rms.totalVal, { color: '#10B981' }]}>{rd.aid || '\u20B90'}</Text>
                            </View>
                            <View style={rms.totalRow}>
                              <Text style={[rms.totalLabel, { color: C.sub }]}>Amount Paid</Text>
                              <Text style={[rms.totalVal, { color: '#10B981' }]}>{rd.parent || '\u20B90'}</Text>
                            </View>
                            <View style={[rms.totalRow, { borderTopWidth: 1, borderTopColor: C.cardBorder, paddingTop: 8, marginTop: 4 }]}>
                              <Text style={[rms.totalLabel, { color: C.white, fontWeight: '700' }]}>Balance Due</Text>
                              <Text style={[rms.totalVal, { color: parseINR(rd.net) === 0 ? '#10B981' : '#F59E0B', fontWeight: '800' }]}>
                                {rd.net || '\u20B90'}
                              </Text>
                            </View>
                          </View>

                          {/* Payment History */}
                          {rd.payments && rd.payments.length > 0 && (
                            <View style={{ marginTop: 10, gap: 6 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: C.white, marginBottom: 2 }}>Payment History</Text>
                              {rd.payments.map((pay, j) => (
                                <View key={j} style={[rms.lineItem, { borderBottomColor: C.cardBorder }]}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={[rms.lineLabel, { color: C.sub }]}>{pay.description || `Payment ${j + 1}`}</Text>
                                    <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{pay.date}</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={[rms.lineAmt, { color: C.white }]}>{formatINR(pay.amount)}</Text>
                                    <StatusBadge type={pay.status} label={pay.status} C={C} />
                                  </View>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                {yearlyData.length === 0 && (
                  <Text style={{ color: C.muted, textAlign: 'center', padding: 20 }}>
                    No finance records found for this student.
                  </Text>
                )}

                <Text style={[rms.footerNote, { color: C.muted }]}>
                  * Auto-generated from UniVerse finance records. For disputes contact the finance office.
                </Text>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Report Modal styles
const rms = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  sheet:        { borderRadius: 20, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle:   { fontSize: 18, fontWeight: '800' },
  modalSub:     { fontSize: 12, marginTop: 2 },
  closeBtn:     { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 14, padding: 16, borderWidth: 1 },
  summaryItem:  { alignItems: 'center' },
  summaryVal:   { fontSize: 17, fontWeight: '800' },
  summaryLabel: { fontSize: 11, marginTop: 3 },
  accordion:    { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  accHeader:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  yearDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  accYear:      { flex: 1, fontSize: 14, fontWeight: '700' },
  chevron:      { fontSize: 12 },
  accBody:      { borderTopWidth: 1, padding: 14, gap: 8 },
  lineItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  lineLabel:    { fontSize: 13 },
  lineAmt:      { fontSize: 13, fontWeight: '600' },
  totalsBox:    { borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  totalRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel:   { fontSize: 13 },
  totalVal:     { fontSize: 13, fontWeight: '700' },
  footerNote:   { fontSize: 11, textAlign: 'center', paddingHorizontal: 10, paddingBottom: 10 },
});

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function ParentFinanceDashboard() {
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const isLaptop = width >= 768;
  const s = makeStyles(C, isLaptop);

  const [reportVisible, setReportVisible] = useState(false);
  const [reportPressed, setReportPressed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic data from backend
  const [yearlyData, setYearlyData] = useState([]);
  const [studentInfo, setStudentInfo] = useState({ name: '', branch: '', prn: '', year: '', rollNo: '' });

  // Computed totals
  const totalCost = yearlyData.reduce((sum, y) => sum + parseINR(y.tuition), 0);
  const totalPaid = yearlyData.reduce((sum, y) => {
    if (!y.payments) return sum;
    return sum + y.payments
      .filter(p => p.status === 'approved')
      .reduce((s2, p) => s2 + (p.amount || 0), 0);
  }, 0);
  const remaining = Math.max(0, totalCost - totalPaid);
  const paidPercent = totalCost > 0 ? Math.round((totalPaid / totalCost) * 100) : 0;

  // ── Fetch finance data via parent route ────────────────────────────────────
  const fetchFinanceData = useCallback(async () => {
    try {
      setError(null);
      const parentId =
        (await AsyncStorage.getItem('parentId')) ||
        (await AsyncStorage.getItem('userId'));

      if (!parentId) {
        setError('No parent ID found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axiosInstance.get(`/parents/finance/${parentId}`);

      if (response.data.success) {
        const record = response.data.data;
        const student = response.data.student || {};

        setStudentInfo({
          name:   student.name || '',
          branch: student.branch || '',
          prn:    student.prn || '',
          year:   student.year || '',
          rollNo: student.rollNo || '',
        });

        // Build yearly data rows from backend
        const rows = (record.yearlyData || []).map((yr) => {
          const payments = yr.payments || [];
          const approvedPays = payments.filter(p => p.status === 'approved');
          const totalApproved = approvedPays.reduce((s2, p) => s2 + p.amount, 0);
          const hasPending = payments.some(p => p.status === 'pending');
          const allRejected = payments.length > 0 && payments.every(p => p.status === 'rejected');

          const tuitionNum = payments[0]?.tuitionFee || parseINR(yr.tuition) || 0;
          const aidNum = payments[0]?.financialAid || parseINR(yr.aid) || 0;
          const netOwed = Math.max(0, tuitionNum - aidNum);
          const netBalance = Math.max(0, netOwed - totalApproved);

          let status, statusType;
          if (allRejected) {
            status = 'Rejected'; statusType = 'rejected';
          } else if (totalApproved >= netOwed && netOwed > 0) {
            status = 'Paid Full'; statusType = 'paid';
          } else if (hasPending) {
            status = 'Pending'; statusType = 'pending';
          } else if (totalApproved > 0 && totalApproved < netOwed) {
            status = 'Partial'; statusType = 'partial';
          } else {
            status = yr.status || 'Pending';
            statusType = yr.statusType || 'pending';
          }

          return {
            year:       yr.year,
            tuition:    yr.tuition || formatINR(tuitionNum),
            aid:        yr.aid || (aidNum > 0 ? `- ${formatINR(aidNum)}` : '\u20B90'),
            parent:     formatINR(totalApproved),
            net:        formatINR(netBalance),
            status,
            statusType,
            payments,
          };
        });

        setYearlyData(rows);
      }
    } catch (err) {
      console.error('[ParentFinance] fetch error:', err.message);
      if (err.response?.status === 404) {
        setError(err.response.data?.message || 'No finance records found.');
        setYearlyData([]);
      } else {
        setError('Failed to load finance data. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFinanceData();
  }, [fetchFinanceData]);

  // ── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={{ color: C.sub, marginTop: 12, fontSize: 13 }}>Loading finance data...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Full Report Modal */}
      <FullReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        C={C}
        isLaptop={isLaptop}
        yearlyData={yearlyData}
        studentInfo={studentInfo}
        totalCost={totalCost}
        totalPaid={totalPaid}
        remaining={remaining}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.container, isLaptop && s.containerLaptop]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />
        }
      >
        {/* HEADER */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle}>
              {studentInfo.name ? `${studentInfo.name}'s Financial Overview` : 'Financial Overview'}
            </Text>
            <Text style={s.headerSub}>
              {studentInfo.branch || ''}
              {studentInfo.prn ? ` \u00B7 PRN: ${studentInfo.prn}` : ''}
              {studentInfo.rollNo ? ` \u00B7 Roll: ${studentInfo.rollNo}` : ''}
            </Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity
              style={[s.refreshBtn, { backgroundColor: C.card, borderColor: C.cardBorder }]}
              activeOpacity={0.7}
              onPress={onRefresh}
            >
              <Text style={{ fontSize: 16 }}>{'\uD83D\uDD04'}</Text>
            </TouchableOpacity>
            {yearlyData.length > 0 && (
              <TouchableOpacity
                style={[s.reportBtn, reportPressed && s.reportBtnActive]}
                activeOpacity={0.7}
                onPressIn={() => setReportPressed(true)}
                onPressOut={() => setReportPressed(false)}
                onPress={() => setReportVisible(true)}
              >
                <Text style={s.reportBtnText}>{'\uD83D\uDCCA'} Full Report</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Error State */}
        {error && (
          <View style={[s.errorBox, { backgroundColor: C.mode === 'dark' ? '#1c0808' : '#fde8e8', borderColor: C.mode === 'dark' ? '#3b0808' : '#f5c6c0' }]}>
            <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={{ marginTop: 8 }}>
              <Text style={{ color: C.blue, fontSize: 13, fontWeight: '600' }}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STAT CARDS */}
        {yearlyData.length > 0 && (
          <View style={[s.statsRow, isLaptop && s.statsRowLaptop]}>
            <StatCard
              title={`TOTAL ${yearlyData.length}-YEAR COST`}
              value={formatINR(totalCost)}
              sub="Includes tuition & campus fees"
              s={s} C={C}
            />
            <StatCard
              title="TOTAL PAID (APPROVED)"
              value={formatINR(totalPaid)}
              showBar
              barPercent={paidPercent}
              s={s} C={C}
            />
            <View style={s.statCard}>
              <Text style={s.statTitle}>REMAINING BALANCE</Text>
              <Text style={[s.statValue, { color: remaining > 0 ? '#F59E0B' : '#10B981' }]}>
                {formatINR(remaining)}
              </Text>
            </View>
          </View>
        )}

        {/* YEARLY BREAKDOWN TABLE */}
        {yearlyData.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Yearly Financial Breakdown</Text>
              <Text style={{ fontSize: 11, color: C.muted }}>Tap a row to see payments</Text>
            </View>

            {isLaptop && (
              <View style={s.tableHeader}>
                {['ACADEMIC YEAR', 'TUITION & FEES', 'FINANCIAL AID', 'TOTAL FEE PAID', 'NET BALANCE', 'STATUS'].map((h, i) => (
                  <Text
                    key={h}
                    style={[s.tableHeaderText, { flex: i === 0 ? 2 : (i === 4 || i === 5) ? 1.2 : 1.5, textAlign: i === 0 ? 'left' : 'center' }]}
                  >
                    {h}
                  </Text>
                ))}
              </View>
            )}

            {yearlyData.map((item, i) => (
              <TableRow key={item.year} item={item} index={i} isLaptop={isLaptop} C={C} s={s} />
            ))}
          </View>
        )}

        {/* Empty State */}
        {yearlyData.length === 0 && !error && (
          <View style={[s.section, { padding: 40, alignItems: 'center' }]}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{'\uD83D\uDCCB'}</Text>
            <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 6 }}>No Finance Records</Text>
            <Text style={{ color: C.sub, fontSize: 13, textAlign: 'center' }}>
              No fee payment records have been submitted yet for your child's account.
            </Text>
          </View>
        )}

        {/* BOTTOM ROW: Charts */}
        {yearlyData.length > 0 && (
          <View style={[s.bottomRow, isLaptop && s.bottomRowLaptop]}>
            <View style={[s.bottomCard, isLaptop && { flex: 1 }]}>
              <Text style={s.sectionTitle}>Cost Trends</Text>
              <Text style={s.sectionSub}>Yearly Tuition vs Financial Aid</Text>
              <CostTrendBars isLaptop={isLaptop} s={s} yearlyData={yearlyData} />
              <View style={s.trendLegend}>
                <View style={s.trendLegItem}>
                  <View style={[s.legendDot, { backgroundColor: '#6366F1' }]} />
                  <Text style={s.legendText}>Tuition</Text>
                </View>
                <View style={s.trendLegItem}>
                  <View style={[s.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={s.legendText}>Aid</Text>
                </View>
              </View>
            </View>

            <View style={[s.bottomCard, isLaptop && { flex: 1 }]}>
              <Text style={s.sectionTitle}>Payment Progress</Text>
              <Text style={s.sectionSub}>Overall fee completion status</Text>
              <DonutChart isLaptop={isLaptop} C={C} s={s} totalCost={totalCost} totalPaid={totalPaid} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── DYNAMIC STYLES ───────────────────────────────────────────────────────────
function makeStyles(C, isLaptop) {
  const bg        = C.bg;
  const surface   = C.card;
  const surface2  = C.mode === 'dark' ? '#1c2233' : '#c8daf0';
  const border    = C.cardBorder;
  const accent    = C.blue;
  const text      = C.white;
  const textSub   = C.sub;
  const textMuted = C.muted;

  return StyleSheet.create({
    root:             { flex: 1, backgroundColor: bg },
    scroll:           { flex: 1 },
    container:        { padding: 16, paddingBottom: 40 },
    containerLaptop:  { padding: 28, maxWidth: 1100, alignSelf: 'center', width: '100%' },
    header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
    headerLeft:       { flex: 1, minWidth: 180 },
    headerTitle:      { fontSize: isLaptop ? 22 : 17, fontWeight: '700', color: text, letterSpacing: 0.2 },
    headerSub:        { fontSize: 12, color: textMuted, marginTop: 3 },
    headerRight:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
    refreshBtn:       { borderRadius: 10, padding: 10, borderWidth: 1 },
    reportBtn:        { backgroundColor: accent, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14 },
    reportBtnActive:  { backgroundColor: C.blueLight },
    reportBtnText:    { color: '#fff', fontWeight: '600', fontSize: 13 },
    errorBox:         { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: 'center' },
    statsRow:         { flexDirection: 'column', gap: 12, marginBottom: 20 },
    statsRowLaptop:   { flexDirection: 'row' },
    statCard:         { backgroundColor: surface, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: border, flex: 1 },
    statTitle:        { fontSize: 10, fontWeight: '600', color: textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    statValue:        { fontSize: isLaptop ? 28 : 24, fontWeight: '800', color: text },
    statSub:          { fontSize: 11, color: textSub, marginTop: 6 },
    barWrap:          { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
    barBg:            { flex: 1, height: 6, backgroundColor: border, borderRadius: 4, overflow: 'hidden' },
    barFill:          { height: '100%', backgroundColor: '#10B981', borderRadius: 4 },
    barLabel:         { fontSize: 12, color: '#10B981', fontWeight: '700' },
    section:          { backgroundColor: surface, borderRadius: 14, borderWidth: 1, borderColor: border, overflow: 'hidden', marginBottom: 20 },
    sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: border },
    sectionTitle:     { fontSize: 15, fontWeight: '700', color: text },
    sectionSub:       { fontSize: 11, color: textSub, marginTop: 3, marginBottom: 12 },
    tableHeader:      { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: border },
    tableHeaderText:  { fontSize: 10, fontWeight: '600', color: textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
    tableRow:         { borderBottomWidth: 1, borderBottomColor: border },
    tableRowAlt:      { backgroundColor: 'transparent' },
    tableRowPressed:  { backgroundColor: surface2 },
    tableRowInner:    { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
    cellText:         { fontSize: 13, color: textSub },
    aidText:          { color: '#F87171' },
    pendingAmount:    { color: accent },
    mobileRow:        { padding: 14 },
    mobileRowHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    mobileRowYear:    { fontSize: 13, fontWeight: '700', color: text },
    mobileRowGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    mobileCell:       { width: '47%' },
    mobileCellLabel:  { fontSize: 10, color: textMuted, letterSpacing: 0.6, marginBottom: 3, textTransform: 'uppercase' },
    mobileCellValue:  { fontSize: 13, color: textSub, fontWeight: '500' },
    bottomRow:        { gap: 16 },
    bottomRowLaptop:  { flexDirection: 'row' },
    bottomCard:       { backgroundColor: surface, borderRadius: 14, borderWidth: 1, borderColor: border, padding: 18 },
    trendWrap:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: 16, marginBottom: 12 },
    trendGroup:       { alignItems: 'center', gap: 4 },
    trendBars:        { flexDirection: 'row', alignItems: 'flex-end' },
    trendBar:         { width: isLaptop ? 18 : 14, borderRadius: 3 },
    trendLabel:       { fontSize: 10, color: textMuted },
    trendLegend:      { flexDirection: 'row', gap: 16 },
    trendLegItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
    donutWrapper:     { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 20, flexWrap: 'wrap' },
    donutPlaceholder: { backgroundColor: 'transparent', borderWidth: 14, borderColor: '#F59E0B', borderTopColor: '#10B981', borderLeftColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
    donutInner:       { backgroundColor: surface, justifyContent: 'center', alignItems: 'center' },
    donutCenter:      { fontSize: 18, fontWeight: '800', color: text },
    donutSub:         { fontSize: 9, color: textMuted, letterSpacing: 1 },
    legendWrap:       { gap: 8 },
    legendItem:       { flexDirection: 'row', alignItems: 'center', gap: 7 },
    legendDot:        { width: 10, height: 10, borderRadius: 5 },
    legendText:       { fontSize: 12, color: textSub },
  });
}
