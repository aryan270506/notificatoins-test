import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  TextInput,
  Modal,
  Animated,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

// ── Data ────────────────────────────────────────────────────────────────────
const initialYearlyData = [
  {
    year: 'Year 1 (2021-22)',
    tuition: '₹5,50,000',
    aid: '- ₹1,00,000',
    parent: '₹4,50,000',
    net: '₹0',
    status: 'Paid Full',
    statusType: 'paid',
    bars: { tuition: 0.55, aid: 0.18 },
    payments: [],
  },
  {
    year: 'Year 2 (2022-23)',
    tuition: '₹5,80,000',
    aid: '- ₹1,80,000',
    parent: '₹4,80,000',
    net: '₹0',
    status: 'Paid Full',
    statusType: 'paid',
    bars: { tuition: 0.68, aid: 0.28 },
    payments: [],
  },
  {
    year: 'Year 3 (2023-24)',
    tuition: '₹6,20,000',
    aid: '- ₹1,20,000',
    parent: '₹5,06,000',
    net: '₹0',
    status: 'Paid Full',
    statusType: 'paid',
    bars: { tuition: 0.82, aid: 0.22 },
    payments: [],
  },
  {
    year: 'Year 4 (2024-25)',
    tuition: '₹6,50,000',
    aid: '- ₹1,20,000',
    parent: '₹1,30,000',
    net: '₹4,00,000',
    status: 'Pending',
    statusType: 'pending',
    bars: { tuition: 1.0, aid: 0.32 },
    payments: [],
  },
];

const fundingSources = [
  { label: 'Personal Funds', pct: 65 },
  { label: 'Scholarships',   pct: 20 },
  { label: 'Other',          pct: 15 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatINR(num) {
  if (!num) return '₹0';
  return '₹' + Number(num).toLocaleString('en-IN');
}
function parseINR(str) {
  return parseInt(str.replace(/[^0-9]/g, '')) || 0;
}

// ── Sub-components ───────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, sub, progress, accent, C }) => (
  <View style={[
    styles.summaryCard,
    { backgroundColor: C.card, borderColor: C.border },
    accent && { borderTopColor: accent, borderTopWidth: 2 },
  ]}>
    <Text style={[styles.summaryLabel, { color: C.textMuted }]}>{label}</Text>
    <Text style={[styles.summaryValue, { color: accent ?? C.textPrimary }]}>{value}</Text>
    {sub && <Text style={[styles.summarySub, { color: C.textMuted }]}>{sub}</Text>}
    {progress !== undefined && (
      <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accent ?? C.green }]} />
        <Text style={[styles.progressText, { color: C.textMuted }]}>{progress}%</Text>
      </View>
    )}
  </View>
);

const BarGroup = ({ bars, C }) => {
  const BAR_MAX = isTablet ? 100 : 70;
  return (
    <View style={styles.barGroup}>
      <View style={[styles.bar, { height: Math.round(bars.tuition * BAR_MAX), backgroundColor: C.accent }]} />
      <View style={[styles.bar, { height: Math.round(bars.aid * BAR_MAX), backgroundColor: C.green }]} />
    </View>
  );
};

const DonutChart = ({ C }) => {
  const SIZE   = isTablet ? 160 : 130;
  const STROKE = 22;
  return (
    <View style={[styles.donutWrapper, { width: SIZE, height: SIZE }]}>
      <View style={[styles.donutRing, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderColor: C.orange }]} />
      <View style={[styles.donutRingOverlay, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderTopColor: C.green, borderRightColor: C.green, borderBottomColor: 'transparent', borderLeftColor: 'transparent', transform: [{ rotate: '234deg' }] }]} />
      <View style={[styles.donutRingOverlay, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderTopColor: C.accent, borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent', transform: [{ rotate: '162deg' }] }]} />
      <View style={styles.donutCenter}>
        <Text style={[styles.donutTotal, { color: C.textPrimary }]}>24L</Text>
        <Text style={[styles.donutSub, { color: C.textMuted }]}>TOTAL</Text>
      </View>
    </View>
  );
};

// ── Payment Modal ─────────────────────────────────────────────────────────────
const PaymentModal = ({ visible, onClose, onSubmit, C }) => {
  const [amount, setAmount]               = useState('');
  const [description, setDescription]     = useState('');
  const [paymentMode, setPaymentMode]     = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [attachedFile, setAttachedFile]   = useState(null);
  const [attachType, setAttachType]       = useState(null);
  const [step, setStep]                   = useState(1);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    if (visible) {
      setStep(1);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setAmount(''); setDescription(''); setPaymentMode('');
      setTransactionId(''); setAttachedFile(null); setAttachType(null);
    }
  }, [visible]);

  const simulateFilePick = (type) => {
    setAttachType(type);
    setAttachedFile(type === 'photo' ? 'payment_receipt_photo.jpg' : 'payment_slip.pdf');
  };

  const handleSubmit = () => {
    if (!amount || isNaN(parseINR(amount))) { Alert.alert('Missing Amount', 'Please enter the payment amount.'); return; }
    if (!attachedFile) { Alert.alert('No Slip Attached', 'Please attach a payment slip.'); return; }
    setStep(2);
  };

  const handleConfirm = () => {
    onSubmit({
      amount: parseINR(amount), description: description || 'Payment submitted',
      paymentMode, transactionId, file: attachedFile, fileType: attachType,
      date: new Date().toLocaleDateString('en-IN'), id: Date.now(),
    });
    onClose();
  };

  const paymentModes = ['NEFT / RTGS', 'UPI', 'Cheque', 'DD', 'Cash'];
  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[styles.modalSheet, { backgroundColor: C.card, transform: [{ translateY: slideAnim }] }]}>
            <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
                  {step === 1 ? '💳  Submit Payment' : '✅  Confirm Submission'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: C.textMuted }]}>
                  {step === 1 ? 'Fill in payment details and attach your slip' : 'Review and confirm your payment details'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.modalClose, { backgroundColor: C.cardAlt }]}>
                <Text style={[styles.modalCloseIcon, { color: C.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.65 }}>
              {step === 1 ? (
                <View style={styles.modalBody}>
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>PAYMENT AMOUNT *</Text>
                    <View style={[styles.amountInputRow, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                      <Text style={[styles.currencyPrefix, { color: C.accent }]}>₹</Text>
                      <TextInput style={[styles.amountInput, { color: C.textPrimary }]} placeholder="0" placeholderTextColor={C.textMuted} keyboardType="numeric" value={amount} onChangeText={setAmount} maxLength={10} />
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>PAYMENT MODE</Text>
                    <View style={styles.modeRow}>
                      {paymentModes.map((m) => (
                        <TouchableOpacity key={m} onPress={() => setPaymentMode(m)} style={[styles.modeChip, { backgroundColor: C.cardAlt, borderColor: C.border }, paymentMode === m && { backgroundColor: C.accentBg, borderColor: C.accent }]}>
                          <Text style={[styles.modeChipText, { color: paymentMode === m ? C.accent : C.textMuted }, paymentMode === m && { fontWeight: '600' }]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>TRANSACTION / REF ID</Text>
                    <TextInput style={[styles.textInput, { backgroundColor: C.cardAlt, borderColor: C.border, color: C.textPrimary }]} placeholder="e.g. TXN123456789" placeholderTextColor={C.textMuted} value={transactionId} onChangeText={setTransactionId} autoCapitalize="characters" />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>REMARKS / DESCRIPTION</Text>
                    <TextInput style={[styles.textInput, styles.textArea, { backgroundColor: C.cardAlt, borderColor: C.border, color: C.textPrimary }]} placeholder="e.g. Semester 8 tuition fee payment" placeholderTextColor={C.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>PAYMENT SLIP *</Text>
                    {attachedFile ? (
                      <View style={[styles.filePreview, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                        <View style={[styles.fileIconBox, { backgroundColor: C.card }]}>
                          <Text style={styles.fileIconEmoji}>{attachType === 'photo' ? '🖼️' : '📄'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fileName, { color: C.textPrimary }]}>{attachedFile}</Text>
                          <Text style={[styles.fileSize, { color: C.textMuted }]}>{attachType === 'photo' ? 'Image file' : 'PDF document'} · Ready to upload</Text>
                        </View>
                        <TouchableOpacity onPress={() => { setAttachedFile(null); setAttachType(null); }}>
                          <Text style={[styles.fileRemove, { color: C.textMuted }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.attachRow}>
                        <TouchableOpacity onPress={() => simulateFilePick('photo')} style={[styles.attachBtn, { borderColor: C.accent }]}>
                          <Text style={styles.attachIcon}>📷</Text>
                          <Text style={[styles.attachText, { color: C.accent }]}>Upload Photo</Text>
                          <Text style={[styles.attachHint, { color: C.textMuted }]}>JPG, PNG</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => simulateFilePick('pdf')} style={[styles.attachBtn, { borderColor: C.accentPurple }]}>
                          <Text style={styles.attachIcon}>📋</Text>
                          <Text style={[styles.attachText, { color: C.accentPurple }]}>Upload PDF</Text>
                          <Text style={[styles.attachHint, { color: C.textMuted }]}>PDF only</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: C.accent }]} onPress={handleSubmit} activeOpacity={0.85}>
                    <Text style={styles.submitBtnText}>Review Submission →</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.modalBody}>
                  <View style={[styles.confirmCard, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                    <View style={[styles.confirmAmountRow, { borderBottomColor: C.border }]}>
                      <Text style={[styles.confirmAmountLabel, { color: C.textMuted }]}>Payment Amount</Text>
                      <Text style={[styles.confirmAmount, { color: C.green }]}>{formatINR(amount)}</Text>
                    </View>
                    {[
                      { label: 'Mode',           value: paymentMode    || 'Not specified' },
                      { label: 'Transaction ID', value: transactionId  || 'Not provided'  },
                      { label: 'Remarks',        value: description    || 'None'           },
                      { label: 'Attachment',     value: attachedFile                       },
                    ].map((row) => (
                      <View key={row.label} style={[styles.confirmRow, { borderBottomColor: C.border }]}>
                        <Text style={[styles.confirmRowLabel, { color: C.textMuted }]}>{row.label}</Text>
                        <Text style={[styles.confirmRowValue, { color: C.textPrimary }]} numberOfLines={1}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={[styles.pendingNotice, { backgroundColor: C.orangeBg, borderColor: C.orange + '55' }]}>
                    <Text style={styles.pendingNoticeIcon}>⏳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingNoticeTitle, { color: C.orange }]}>Pending Admin Approval</Text>
                      <Text style={[styles.pendingNoticeText, { color: C.textMuted }]}>Your payment will be marked as pending until an admin reviews and approves the slip.</Text>
                    </View>
                  </View>
                  <View style={styles.confirmActions}>
                    <TouchableOpacity style={[styles.backBtn2, { borderColor: C.border }]} onPress={() => setStep(1)}>
                      <Text style={[styles.backBtnText, { color: C.textMuted }]}>← Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.green }]} onPress={handleConfirm} activeOpacity={0.85}>
                      <Text style={[styles.confirmBtnText, { color: C.isDark ? '#0D1117' : '#fff' }]}>Submit for Approval</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

// ── Admin Modal ───────────────────────────────────────────────────────────────
const AdminModal = ({ visible, onClose, pendingPayments, onApprove, onReject, C }) => {
  if (!visible) return null;
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: C.card, maxHeight: SCREEN_HEIGHT * 0.85 }]}>
          <View style={[styles.sheetHandle, { backgroundColor: C.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: C.textPrimary }]}>🛡️  Admin Panel</Text>
              <Text style={[styles.modalSubtitle, { color: C.textMuted }]}>{pendingPayments.length} payment(s) awaiting approval</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.modalClose, { backgroundColor: C.cardAlt }]}>
              <Text style={[styles.modalCloseIcon, { color: C.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.65 }} showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              {pendingPayments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>✅</Text>
                  <Text style={[styles.emptyText, { color: C.textMuted }]}>No pending payments</Text>
                </View>
              ) : (
                pendingPayments.map((p) => (
                  <View key={p.id} style={[styles.adminCard, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                    <View style={styles.adminCardHeader}>
                      <View>
                        <Text style={[styles.adminYear, { color: C.textPrimary }]}>{p.yearLabel}</Text>
                        <Text style={[styles.adminDate, { color: C.textMuted }]}>Submitted: {p.date}</Text>
                      </View>
                      <Text style={[styles.adminAmount, { color: C.green }]}>{formatINR(p.amount)}</Text>
                    </View>
                    <View style={styles.adminMeta}>
                      {p.paymentMode   ? <View style={[styles.adminTag, { backgroundColor: C.card }]}><Text style={[styles.adminTagText, { color: C.textMuted }]}>{p.paymentMode}</Text></View> : null}
                      {p.transactionId ? <View style={[styles.adminTag, { backgroundColor: C.card }]}><Text style={[styles.adminTagText, { color: C.textMuted }]}>Ref: {p.transactionId}</Text></View> : null}
                    </View>
                    <View style={[styles.filePreview, { backgroundColor: C.card, borderColor: C.border }]}>
                      <Text style={styles.fileIconEmoji}>{p.fileType === 'photo' ? '🖼️' : '📄'}</Text>
                      <Text style={[styles.fileName, { color: C.textPrimary, marginLeft: 8 }]}>{p.file}</Text>
                    </View>
                    {p.description ? <Text style={[styles.adminRemarks, { color: C.textMuted }]}>"{p.description}"</Text> : null}
                    <View style={styles.adminActions}>
                      <TouchableOpacity style={[styles.rejectBtn, { borderColor: C.red }]} onPress={() => onReject(p.id)}>
                        <Text style={[styles.rejectBtnText, { color: C.red }]}>✕  Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.approveBtn, { backgroundColor: C.green }]} onPress={() => onApprove(p.id)}>
                        <Text style={[styles.approveBtnText, { color: C.isDark ? '#0D1117' : '#fff' }]}>✓  Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Proper Full-Width Finance Table ───────────────────────────────────────────
const COLS = [
  { key: 'year',    label: 'Academic Year',      flex: 1.6 },
  { key: 'tuition', label: 'Tuition & Fees',     flex: 1.2 },
  { key: 'aid',     label: 'Financial Aid',       flex: 1.1 },
  { key: 'parent',  label: 'Parent Contrib.',     flex: 1.2 },
  { key: 'net',     label: 'Net Balance',         flex: 1.0 },
  { key: 'status',  label: 'Status',              flex: 1.2 },
  { key: 'action',  label: '',                    flex: 0.7 },
];

const FinanceTable = ({ rows, onUpdatePress, C }) => {
  const statusConfig = {
    paid:             { dotColor: C.green,  badgeBg: C.greenBg,  textColor: C.green  },
    pending:          { dotColor: C.orange, badgeBg: C.orangeBg, textColor: C.orange },
    'pending-review': { dotColor: C.accent, badgeBg: C.accentBg, textColor: C.accent },
  };

  const bc       = C.border;
  const headerBg = C.isDark ? '#0d1520' : '#f0f4f8';
  const footerBg = C.isDark ? '#0d1520' : '#e8eef5';
  const evenBg   = C.isDark ? '#0a1118' : '#f8fafc';
  const oddBg    = C.card;

  // Shared row renderer keeps flex columns aligned
  const renderRow = (cells, bg, borderBottomW, borderTopW) => (
    <View style={[
      styles.tRow,
      { backgroundColor: bg },
      borderBottomW && { borderBottomWidth: borderBottomW, borderBottomColor: bc },
      borderTopW    && { borderTopWidth:    borderTopW,    borderTopColor:    bc },
    ]}>
      {cells}
    </View>
  );

  const cell = (flex, content, isLast = false) => (
    <View
      key={flex + String(Math.random())}
      style={[
        styles.tCell,
        { flex },
        !isLast && { borderRightWidth: 1, borderRightColor: bc },
      ]}
    >
      {content}
    </View>
  );

  return (
    // No horizontal ScrollView — table fills 100% width
    <View style={styles.tTable}>

      {/* ── Header ── */}
      {renderRow(
        COLS.map((col, ci) => (
          <View
            key={col.key}
            style={[
              styles.tCell,
              { flex: col.flex },
              ci < COLS.length - 1 && { borderRightWidth: 1, borderRightColor: bc },
            ]}
          >
            <Text style={[styles.tHeadText, { color: C.textMuted }]}>{col.label}</Text>
          </View>
        )),
        headerBg, 2, 0
      )}

      {/* ── Data rows ── */}
      {rows.map((item, rowIdx) => {
        const cfg    = statusConfig[item.statusType] || statusConfig.pending;
        const rowBg  = rowIdx % 2 === 0 ? evenBg : oddBg;
        const hasPending = item.payments?.some(p => p.adminStatus === 'pending');

        return (
          <View key={item.year}>
            {/* Main data row */}
            <View style={[styles.tRow, { backgroundColor: rowBg, borderBottomWidth: 1, borderBottomColor: bc }]}>

              <View style={[styles.tCell, { flex: COLS[0].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                <Text style={[styles.tCellBold, { color: C.textPrimary }]}>{item.year}</Text>
                {hasPending && <Text style={[styles.tReviewTag, { color: C.orange }]}>⏳ Under Review</Text>}
              </View>

              <View style={[styles.tCell, { flex: COLS[1].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                <Text style={[styles.tCellMono, { color: C.textPrimary }]}>{item.tuition}</Text>
              </View>

              <View style={[styles.tCell, { flex: COLS[2].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                <Text style={[styles.tCellMono, { color: C.red }]}>{item.aid}</Text>
              </View>

              <View style={[styles.tCell, { flex: COLS[3].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                <Text style={[styles.tCellMono, { color: C.textPrimary }]}>{item.parent}</Text>
              </View>

              <View style={[styles.tCell, { flex: COLS[4].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                <Text style={[styles.tCellMono, { color: item.statusType === 'pending' ? C.accent : C.green, fontWeight: '700' }]}>
                  {item.net}
                </Text>
              </View>

              <View style={[styles.tCell, { flex: COLS[5].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                <View style={[styles.tBadge, { backgroundColor: cfg.badgeBg }]}>
                  <View style={[styles.tDot, { backgroundColor: cfg.dotColor }]} />
                  <Text style={[styles.tBadgeText, { color: cfg.textColor }]}>{item.status}</Text>
                </View>
              </View>

              <View style={[styles.tCell, { flex: COLS[6].flex, alignItems: 'center' }]}>
                {item.statusType !== 'paid' ? (
                  <TouchableOpacity
                    style={[styles.tPayBtn, { backgroundColor: C.accentBg, borderColor: C.accent }]}
                    onPress={() => onUpdatePress(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.tPayBtnText, { color: C.accent }]}>+ Pay</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={{ color: C.green, fontSize: 16, fontWeight: '700' }}>✓</Text>
                )}
              </View>
            </View>

            {/* Payment history sub-rows */}
            {item.payments?.map((p) => (
              <View key={p.id} style={[styles.tRow, { backgroundColor: C.isDark ? '#060d14' : '#f2f6fa', borderBottomWidth: 1, borderBottomColor: bc }]}>
                <View style={[styles.tCell, { flex: COLS[0].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                  <Text style={[styles.tSubText, { color: C.textMuted }]}>  ↳ {p.date}</Text>
                </View>
                <View style={[styles.tCell, { flex: COLS[1].flex + COLS[2].flex + COLS[3].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                  <Text style={[styles.tSubText, { color: C.textMuted }]} numberOfLines={1}>{p.description || 'Payment'}</Text>
                </View>
                <View style={[styles.tCell, { flex: COLS[4].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                  <Text style={[styles.tCellMono, { color: C.textPrimary, fontSize: 12 }]}>{formatINR(p.amount)}</Text>
                </View>
                <View style={[styles.tCell, { flex: COLS[5].flex + COLS[6].flex }]}>
                  <View style={[styles.tBadge, {
                    backgroundColor: p.adminStatus === 'approved' ? C.greenBg : p.adminStatus === 'rejected' ? C.redBg : C.orangeBg,
                  }]}>
                    <View style={[styles.tDot, {
                      backgroundColor: p.adminStatus === 'approved' ? C.green : p.adminStatus === 'rejected' ? C.red : C.orange,
                    }]} />
                    <Text style={[styles.tBadgeText, {
                      color: p.adminStatus === 'approved' ? C.green : p.adminStatus === 'rejected' ? C.red : C.orange,
                    }]}>
                      {p.adminStatus === 'approved' ? '✓ Approved' : p.adminStatus === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        );
      })}

      {/* ── Footer / Totals ── */}
      <View style={[styles.tRow, { backgroundColor: footerBg, borderTopWidth: 2, borderTopColor: bc }]}>
        <View style={[styles.tCell, { flex: COLS[0].flex, borderRightWidth: 1, borderRightColor: bc }]}>
          <Text style={[styles.tFootLabel, { color: C.textPrimary }]}>TOTAL (4 Years)</Text>
        </View>
        <View style={[styles.tCell, { flex: COLS[1].flex, borderRightWidth: 1, borderRightColor: bc }]}>
          <Text style={[styles.tFootVal, { color: C.textPrimary }]}>₹24,00,000</Text>
        </View>
        <View style={[styles.tCell, { flex: COLS[2].flex, borderRightWidth: 1, borderRightColor: bc }]}>
          <Text style={[styles.tFootVal, { color: C.red }]}>- ₹5,20,000</Text>
        </View>
        <View style={[styles.tCell, { flex: COLS[3].flex, borderRightWidth: 1, borderRightColor: bc }]}>
          <Text style={[styles.tFootVal, { color: C.textPrimary }]}>₹15,66,000</Text>
        </View>
        <View style={[styles.tCell, { flex: COLS[4].flex, borderRightWidth: 1, borderRightColor: bc }]}>
          <Text style={[styles.tFootVal, { color: C.accent }]}>₹4,00,000</Text>
        </View>
        <View style={[styles.tCell, { flex: COLS[5].flex + COLS[6].flex }]}>
          <Text style={[styles.tFootLabel, { color: C.textMuted }]}>1 Pending</Text>
        </View>
      </View>

    </View>
  );
};

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function StudentFinance({ C, onThemeToggle }) {
  const [yearlyData, setYearlyData]                   = useState(initialYearlyData);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [adminModalVisible, setAdminModalVisible]     = useState(false);
  const [selectedYear, setSelectedYear]               = useState(null);
  const [adminTaps, setAdminTaps]                     = useState(0);
  const [toast, setToast]                             = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const allPendingPayments = yearlyData.flatMap((yr) =>
    (yr.payments || [])
      .filter((p) => p.adminStatus === 'pending')
      .map((p) => ({ ...p, yearLabel: yr.year, yearKey: yr.year }))
  );

  const showToast = (msg, color) => {
    setToast({ msg, color: color ?? C.green });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const handleUpdatePress = (year) => { setSelectedYear(year); setPaymentModalVisible(true); };

  const handlePaymentSubmit = (paymentData) => {
    setYearlyData((prev) =>
      prev.map((yr) => {
        if (yr.year !== selectedYear.year) return yr;
        const newPayments = [...(yr.payments || []), { ...paymentData, adminStatus: 'pending' }];
        return { ...yr, payments: newPayments, status: 'Under Review', statusType: 'pending-review' };
      })
    );
    showToast('Payment submitted! Awaiting admin approval 🕐', C.orange);
  };

  const handleAdminApprove = (paymentId) => {
    setYearlyData((prev) =>
      prev.map((yr) => {
        const payment = yr.payments?.find((p) => p.id === paymentId);
        if (!payment) return yr;
        const updatedPayments = yr.payments.map((p) => p.id === paymentId ? { ...p, adminStatus: 'approved' } : p);
        const totalPaid = updatedPayments.filter((p) => p.adminStatus === 'approved').reduce((sum, p) => sum + p.amount, 0);
        const netBalance = parseINR(yr.net.replace('- ', '')) - totalPaid;
        const allApproved = netBalance <= 0;
        return {
          ...yr, payments: updatedPayments,
          status: allApproved ? 'Paid Full' : 'Partial',
          statusType: allApproved ? 'paid' : 'pending',
          net: allApproved ? '₹0' : formatINR(Math.max(0, netBalance)),
        };
      })
    );
    showToast('Payment approved successfully! ✅', C.green);
  };

  const handleAdminReject = (paymentId) => {
    setYearlyData((prev) =>
      prev.map((yr) => {
        const payment = yr.payments?.find((p) => p.id === paymentId);
        if (!payment) return yr;
        const updatedPayments = yr.payments.map((p) => p.id === paymentId ? { ...p, adminStatus: 'rejected' } : p);
        const stillPending = updatedPayments.some((p) => p.adminStatus === 'pending');
        return { ...yr, payments: updatedPayments, status: stillPending ? 'Under Review' : 'Pending', statusType: stillPending ? 'pending-review' : 'pending' };
      })
    );
    showToast('Payment rejected ✕', C.red);
  };

  const handleTitlePress = () => {
    const next = adminTaps + 1;
    setAdminTaps(next);
    if (next >= 5) { setAdminTaps(0); setAdminModalVisible(true); }
  };

  const totalPaid = yearlyData.reduce((sum, yr) =>
    sum + (yr.payments || []).filter(p => p.adminStatus === 'approved').reduce((s, p) => s + p.amount, 0), 1800000
  );
  const progress = Math.min(100, Math.round((totalPaid / 2400000) * 100));
  const fundingColors = [C.orange, C.green, C.accent];

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      {toast && (
        <Animated.View style={[
          styles.toast,
          { backgroundColor: toast.color, opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
        ]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <TouchableOpacity onPress={handleTitlePress} activeOpacity={1}>
              <Text style={[styles.title, { color: C.textPrimary }]}>4-Year Graduation Financial Overview</Text>
            </TouchableOpacity>
            <Text style={[styles.subtitle, { color: C.textMuted }]}>B.Tech in Computer Science &amp; Engineering (2021 - 2025)</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => { if (allPendingPayments.length > 0) setAdminModalVisible(true); else showToast('No pending notifications', C.textMuted); }}
            >
              <Text style={styles.iconBtnIcon}>🔔</Text>
              {allPendingPayments.length > 0 && (
                <View style={[styles.notifBadge, { backgroundColor: C.red }]}>
                  <Text style={styles.notifBadgeText}>{allPendingPayments.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            {onThemeToggle && (
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={onThemeToggle} activeOpacity={0.8}>
                <Text style={{ fontSize: 18 }}>{C.moonIcon}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Summary Cards ── */}
        <View style={styles.summaryRow}>
          <SummaryCard label="TOTAL 4-YEAR COST"  value="₹24,00,000" sub="Tuition, campus fees & insurance" C={C} />
          <SummaryCard label="TOTAL PAID"          value={formatINR(totalPaid)} progress={progress} accent={C.green} C={C} />
          <SummaryCard label="REMAINING BALANCE"   value={formatINR(Math.max(0, 2400000 - totalPaid))} accent={C.red} C={C} />
        </View>

        {/* ── Yearly Table — full-width section, no padding around table ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          {/* Header row inside the card, with padding */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Yearly Financial Breakdown</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.reportBtn, { backgroundColor: C.accent }]}
              onPress={() => handleUpdatePress(yearlyData.find(y => y.statusType !== 'paid') || yearlyData[3])}
            >
              <Text style={styles.reportBtnText}>✏️ Update</Text>
            </TouchableOpacity>
          </View>

          {/* Table stretches edge-to-edge inside the card */}
          <View style={[styles.tableWrap, { borderColor: C.border }]}>
            <FinanceTable rows={yearlyData} onUpdatePress={handleUpdatePress} C={C} />
          </View>
        </View>

        {/* ── Bottom Charts ── */}
        <View style={styles.chartsRow}>
          <View style={[styles.section, styles.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Cost Trends over 4 Years</Text>
            <Text style={[styles.chartSub, { color: C.textMuted }]}>Yearly Tuition vs Scholarship impact</Text>
            <View style={styles.barsContainer}>
              {yearlyData.map((d) => (
                <View key={d.year} style={styles.barCol}>
                  <BarGroup bars={d.bars} C={C} />
                  <Text style={[styles.barLabel, { color: C.textMuted }]}>{d.year.split('(')[1]?.replace(')', '')}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chartLegend}>
              <View style={styles.chartLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: C.accent }]} />
                <Text style={[styles.legendText, { color: C.textPrimary }]}>Tuition</Text>
              </View>
              <View style={styles.chartLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: C.green }]} />
                <Text style={[styles.legendText, { color: C.textPrimary }]}>Aid</Text>
              </View>
            </View>
          </View>

          <View style={[styles.section, styles.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Funding Sources</Text>
            <Text style={[styles.chartSub, { color: C.textMuted }]}>Total distribution of funding</Text>
            <View style={styles.fundingBody}>
              <DonutChart C={C} />
              <View style={styles.legend}>
                {fundingSources.map((s, i) => (
                  <View key={s.label} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: fundingColors[i] }]} />
                    <Text style={[styles.legendText, { color: C.textPrimary }]}>
                      {s.label}{'  '}
                      <Text style={[styles.legendPct, { color: C.textMuted }]}>{s.pct}%</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <Text style={[styles.adminHint, { color: C.border }]}>💡 Tap the title 5× to open Admin Panel</Text>
      </ScrollView>

      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSubmit={handlePaymentSubmit}
        C={C}
      />
      <AdminModal
        visible={adminModalVisible}
        onClose={() => setAdminModalVisible(false)}
        pendingPayments={allPendingPayments}
        onApprove={handleAdminApprove}
        onReject={handleAdminReject}
        C={C}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: {
    paddingHorizontal: isTablet ? 28 : 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 40, gap: 16,
  },

  toast: {
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 44,
    alignSelf: 'center', zIndex: 999,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 12 },
  headerText:    { flex: 1 },
  title:         { fontSize: isTablet ? 26 : 20, fontWeight: '700', letterSpacing: -0.5 },
  subtitle:      { fontSize: isTablet ? 14 : 12, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:       { width: 42, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconBtnIcon:   { fontSize: 18 },
  notifBadge:    { position: 'absolute', top: -4, right: -4, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText:{ color: '#fff', fontSize: 10, fontWeight: '700' },
  reportBtn:     { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  reportBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  summaryRow:    { flexDirection: isTablet ? 'row' : 'column', gap: 12 },
  summaryCard:   { flex: 1, borderRadius: 14, borderWidth: 1, padding: isTablet ? 24 : 18, gap: 8 },
  summaryLabel:  { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  summaryValue:  { fontSize: isTablet ? 32 : 26, fontWeight: '700', letterSpacing: -0.5 },
  summarySub:    { fontSize: 12 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  progressFill:  { height: '100%', borderRadius: 4 },
  progressText:  { position: 'absolute', right: 0, top: -18, fontSize: 12 },

  // Section card — title has its own padding, table goes edge-to-edge
  section:       { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: isTablet ? 20 : 14,
    paddingTop:        isTablet ? 20 : 14,
    paddingBottom:     isTablet ? 16 : 12,
  },
  sectionTitle:  { fontSize: isTablet ? 18 : 16, fontWeight: '700' },

  // Chart sections still need internal padding
  chartCard: { padding: isTablet ? 20 : 14 },

  // Table wrapper — sits flush inside the section card
  tableWrap: {
    width: '100%',
    borderTopWidth: 1,
    // bottom corners follow the parent card's borderRadius
  },

  // ── Table internals ──────────────────────────────────────────────────────
  tTable: { width: '100%' },
  tRow:   { flexDirection: 'row', width: '100%' },
  tCell:  { paddingVertical: 11, paddingHorizontal: 8, justifyContent: 'center' },

  tHeadText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  tCellBold:  { fontSize: 12, fontWeight: '600' },
  tCellMono:  { fontSize: 12, fontVariant: ['tabular-nums'] },
  tReviewTag: { fontSize: 9,  marginTop: 2, fontWeight: '500' },
  tSubText:   { fontSize: 11, fontStyle: 'italic' },

  tBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, gap: 4,
  },
  tDot:       { width: 6, height: 6, borderRadius: 3 },
  tBadgeText: { fontSize: 10, fontWeight: '600' },

  tPayBtn:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tPayBtnText: { fontSize: 10, fontWeight: '600' },

  tFootLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tFootVal:   { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // ── Charts ───────────────────────────────────────────────────────────────
  chartsRow:      { flexDirection: isTablet ? 'row' : 'column', gap: 16 },
  chartSub:       { fontSize: 12, marginBottom: 16 },
  barsContainer:  { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: isTablet ? 120 : 90, marginTop: 8 },
  barCol:         { alignItems: 'center', gap: 6 },
  barGroup:       { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  bar:            { width: isTablet ? 16 : 12, borderRadius: 4 },
  barLabel:       { fontSize: 10 },
  chartLegend:    { flexDirection: 'row', gap: 16, marginTop: 12 },
  chartLegendItem:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  fundingBody:    { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 8, flexWrap: 'wrap' },
  donutWrapper:   { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutRing:      { position: 'absolute' },
  donutRingOverlay: { position: 'absolute' },
  donutCenter:    { position: 'absolute', alignItems: 'center' },
  donutTotal:     { fontSize: 22, fontWeight: '700' },
  donutSub:       { fontSize: 10, letterSpacing: 1 },
  legend:         { gap: 12 },
  legendRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:      { width: 10, height: 10, borderRadius: 5 },
  legendText:     { fontSize: 14 },
  legendPct:      { fontSize: 13 },
  adminHint:      { fontSize: 11, textAlign: 'center', marginTop: 4 },

  // ── Modals ────────────────────────────────────────────────────────────────
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle:     { fontSize: 20, fontWeight: '700' },
  modalSubtitle:  { fontSize: 13, marginTop: 4 },
  modalClose:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalCloseIcon: { fontSize: 14, fontWeight: '600' },
  modalBody:      { padding: 20, gap: 20 },

  formGroup:      { gap: 8 },
  formLabel:      { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  amountInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  currencyPrefix: { fontSize: 24, fontWeight: '700', marginRight: 8 },
  amountInput:    { flex: 1, fontSize: 32, fontWeight: '700', paddingVertical: 14, letterSpacing: -1 },
  textInput:      { borderRadius: 12, borderWidth: 1, fontSize: 15, paddingHorizontal: 16, paddingVertical: 12 },
  textArea:       { minHeight: 80, textAlignVertical: 'top' },
  modeRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  modeChipText:   { fontSize: 13, fontWeight: '500' },
  attachRow:      { flexDirection: 'row', gap: 12 },
  attachBtn:      { flex: 1, borderWidth: 1.5, borderRadius: 14, borderStyle: 'dashed', padding: 16, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)' },
  attachIcon:     { fontSize: 28 },
  attachText:     { fontWeight: '600', fontSize: 14 },
  attachHint:     { fontSize: 11 },
  filePreview:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  fileIconBox:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileIconEmoji:  { fontSize: 20 },
  fileName:       { fontSize: 14, fontWeight: '500', flex: 1 },
  fileSize:       { fontSize: 12, marginTop: 2 },
  fileRemove:     { fontSize: 18, padding: 4 },
  submitBtn:      { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  submitBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },

  confirmCard:        { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  confirmAmountRow:   { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmAmountLabel: { fontSize: 14 },
  confirmAmount:      { fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  confirmRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  confirmRowLabel:    { fontSize: 13 },
  confirmRowValue:    { fontSize: 13, fontWeight: '500', maxWidth: '60%' },
  pendingNotice:      { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  pendingNoticeIcon:  { fontSize: 22 },
  pendingNoticeTitle: { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  pendingNoticeText:  { fontSize: 12, lineHeight: 18 },
  confirmActions:     { flexDirection: 'row', gap: 12 },
  backBtn2:           { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  backBtnText:        { fontWeight: '600', fontSize: 15 },
  confirmBtn:         { flex: 2, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText:     { fontWeight: '700', fontSize: 15 },

  adminCard:       { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  adminCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  adminYear:       { fontWeight: '700', fontSize: 15 },
  adminDate:       { fontSize: 12, marginTop: 2 },
  adminAmount:     { fontWeight: '700', fontSize: 22 },
  adminMeta:       { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  adminTag:        { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  adminTagText:    { fontSize: 12 },
  adminRemarks:    { fontSize: 13, fontStyle: 'italic' },
  adminActions:    { flexDirection: 'row', gap: 10 },
  rejectBtn:       { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  rejectBtnText:   { fontWeight: '600', fontSize: 14 },
  approveBtn:      { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  approveBtnText:  { fontWeight: '700', fontSize: 14 },
  emptyState:      { alignItems: 'center', padding: 40, gap: 12 },
  emptyEmoji:      { fontSize: 48 },
  emptyText:       { fontSize: 16 },
});