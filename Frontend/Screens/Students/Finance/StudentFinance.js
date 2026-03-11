import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, Platform, TextInput, Modal,
  Animated, Alert, KeyboardAvoidingView, Image,
} from 'react-native';
import axiosInstance from '../../../Src/Axios';

// ─── Cross-platform alert helper (works on web + mobile) ─────────────────────
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

let ImagePicker = null;
let DocumentPicker = null;
try { ImagePicker = require('expo-image-picker'); } catch (e) {}
try { DocumentPicker = require('expo-document-picker'); } catch (e) {}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;

// No hardcoded years — students add years manually when they pay
const initialYearlyData = [];

const fundingSources = [
  { label: 'Personal Funds', pct: 65 },
  { label: 'Scholarships',   pct: 20 },
  { label: 'Other',          pct: 15 },
];

function formatINR(num) {
  if (!num) return '₹0';
  return '₹' + Number(num).toLocaleString('en-IN');
}
function parseINR(str) {
  return parseInt(String(str).replace(/[^0-9]/g, '')) || 0;
}

const SummaryCard = ({ label, value, sub, progress, accent, C }) => (
  <View style={[styles.summaryCard, { backgroundColor: C.card, borderColor: C.border }, accent && { borderTopColor: accent, borderTopWidth: 2 }]}>
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

// tuitionPx / aidPx are pixel heights already computed by the parent (scaled to max)
const BarGroup = ({ tuitionPx, aidPx, C }) => (
  <View style={styles.barGroup}>
    <View style={[styles.bar, { height: Math.max(2, tuitionPx), backgroundColor: C.accent }]} />
    <View style={[styles.bar, { height: Math.max(2, aidPx),     backgroundColor: C.green  }]} />
  </View>
);

const DonutChart = ({ C, totalCost }) => {
  const SIZE = isTablet ? 160 : 130, STROKE = 22;
  const displayTotal = totalCost >= 100000 ? `${(totalCost / 100000).toFixed(totalCost % 100000 === 0 ? 0 : 1)}L` : formatINR(totalCost);
  return (
    <View style={[styles.donutWrapper, { width: SIZE, height: SIZE }]}>
      <View style={[styles.donutRing, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderColor: C.orange }]} />
      <View style={[styles.donutRingOverlay, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderTopColor: C.green, borderRightColor: C.green, borderBottomColor: 'transparent', borderLeftColor: 'transparent', transform: [{ rotate: '234deg' }] }]} />
      <View style={[styles.donutRingOverlay, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderTopColor: C.accent, borderRightColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: 'transparent', transform: [{ rotate: '162deg' }] }]} />
      <View style={styles.donutCenter}>
        <Text style={[styles.donutTotal, { color: C.textPrimary }]}>{displayTotal}</Text>
        <Text style={[styles.donutSub, { color: C.textMuted }]}>TOTAL</Text>
      </View>
    </View>
  );
};

// ── Payment Modal ─────────────────────────────────────────────────────────────
const PaymentModal = ({ visible, onClose, onSubmit, selectedYear, C, user }) => {
  const [academicYear, setAcademicYear] = useState('');
  const [tuitionFee,   setTuitionFee]   = useState('');
  const [financialAid, setFinancialAid] = useState('');
  const [remaining,    setRemaining]    = useState('');
  const [payingNow,    setPayingNow]    = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachType,   setAttachType]   = useState(null);
  const [step,         setStep]         = useState(1);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      setStep(1);
      const yr          = selectedYear;
      const hasPayments = (yr?.payments?.length ?? 0) > 0;
      setAcademicYear(yr?.year ?? '');
      if (hasPayments) {
        // Existing year — pre-fill locked fields from row data
        const rawTuition = yr?.tuition ? String(parseINR(yr.tuition)) : '';
        const rawAid     = yr?.aid     ? String(parseINR(yr.aid.replace('- ', ''))) : '';
        const rawNet     = yr?.net     ? String(parseINR(yr.net)) : '0';
        setTuitionFee(rawTuition);
        setFinancialAid(rawAid);
        setRemaining(rawNet);
        setPayingNow(rawNet); // pre-fill; student can edit
      } else {
        // New year — all blank, student fills everything
        setTuitionFee('');
        setFinancialAid('');
        setRemaining('');
        setPayingNow('');
      }
      setAttachedFile(null);
      setAttachType(null);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  const handlePickPhoto = async () => {
    if (!ImagePicker) { showAlert('Package Missing', 'Run: expo install expo-image-picker'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showAlert('Permission Required', 'Please allow photo library access.'); return; }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.85 });
      if (!result.canceled && result.assets?.length > 0) {
        const img = result.assets[0], ext = img.uri.split('.').pop() || 'jpg';
        setAttachedFile({ uri: img.uri, name: img.fileName || `receipt_${Date.now()}.${ext}`, type: 'photo', mimeType: img.mimeType || `image/${ext}`, size: img.fileSize ?? null });
        setAttachType('photo');
      }
    } catch { showAlert('Error', 'Could not open the photo library.'); }
  };

  const handlePickPDF = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'application/pdf,image/jpeg,image/png';
      input.onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const uri = URL.createObjectURL(file), isImage = file.type.startsWith('image/');
        setAttachedFile({ uri, name: file.name, type: isImage ? 'photo' : 'pdf', mimeType: file.type, size: file.size, webFile: file });
        setAttachType(isImage ? 'photo' : 'pdf');
      };
      input.click(); return;
    }
    if (!DocumentPicker) { return; }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = () => {
    if (!academicYear.trim())                       { showAlert('Error', 'Academic year is missing.'); return; }
    if (!tuitionFee || isNaN(parseINR(tuitionFee))) { showAlert('Error', 'Please enter the tuition fee.'); return; }
    if (!payingNow  || isNaN(parseINR(payingNow)))  { showAlert('Missing Amount', 'Please enter the amount you are paying now.'); return; }
    if (parseINR(payingNow) <= 0)                   { showAlert('Invalid Amount', 'Amount must be greater than ₹0.'); return; }
    if (!attachedFile)                              { showAlert('No Receipt', 'Please attach a payment receipt.'); return; }
    setStep(2);
  };

  const handleConfirm = async () => {
    try {
      if (!user?._id) { showAlert('Error', 'Student ID not found. Please log in again.'); return; }
      const formData = new FormData();
      formData.append('amount',       String(parseINR(payingNow)));
      formData.append('tuitionFee',   String(parseINR(tuitionFee)));
      formData.append('financialAid', String(parseINR(financialAid)));
      formData.append('description',  `${academicYear} tuition payment`);
      formData.append('date',         new Date().toLocaleDateString('en-IN'));
      formData.append('yearKey',      academicYear.trim());
      formData.append('fileType',     attachType);
      if (Platform.OS === 'web') {
        if (attachedFile.webFile) { formData.append('receipt', attachedFile.webFile); }
        else {
          const blob = await (await fetch(attachedFile.uri)).blob();
          formData.append('receipt', new File([blob], attachedFile.name, { type: attachedFile.mimeType }));
        }
      } else {
        formData.append('receipt', { uri: attachedFile.uri, name: attachedFile.name, type: attachedFile.mimeType });
      }
      const response = await axiosInstance.post(
        `/student-finance/${user._id}/payment`, formData,
        { 
          headers: { 
            'Content-Type': 'multipart/form-data' 
          } 
        }
      );
      const newPayment = {
        id: response.data.data?._id || `temp_${Date.now()}`,
        amount: parseINR(payingNow),
        description: `${academicYear} tuition payment`,
        date: new Date().toLocaleDateString('en-IN'),
        adminStatus: 'pending',
        fileType: attachType,
        file: attachedFile?.name ?? '',
        fileSize: attachedFile?.size ?? null,
      };
      onSubmit({
        yearKey:      academicYear.trim(),
        payment:      newPayment,
        tuitionFee:   parseINR(tuitionFee),
        financialAid: parseINR(financialAid),
      });
      showAlert('Submitted for Approval ✅', 'Your payment receipt has been sent to the admin for review.');
      onClose();
    } catch (error) {
      console.error('handleConfirm error:', error.response?.data || error.message);
      showAlert('Submission Failed', error.response?.data?.message || 'Could not connect to the server. Please try again.');
    }
  };

  if (!visible) return null;

  // ── Key logic: lock top fields only when year already has payments ──────────
  // New year (+Pay)    → isExistingYear = false → all fields editable
  // Old year (✏️ Pay)  → isExistingYear = true  → top 4 fields locked
  const isExistingYear = (selectedYear?.payments?.length ?? 0) > 0;
  const remainingAfter = Math.max(0, parseINR(remaining) - parseINR(payingNow));

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
                  {step === 1
                    ? (isExistingYear ? 'Edit amount & attach receipt' : 'Fill in all payment details')
                    : 'Review details before submitting'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.modalClose, { backgroundColor: C.cardAlt }]}>
                <Text style={[styles.modalCloseIcon, { color: C.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.72 }}>
              {step === 1 ? (
                <View style={styles.modalBody}>

                  {/* ── Mode banner ── */}
                  {isExistingYear ? (
                    <View style={[styles.modeBanner, { backgroundColor: C.orangeBg, borderColor: C.orange + '55' }]}>
                      <Text style={{ fontSize: 15 }}>🔒</Text>
                      <Text style={[styles.modeBannerText, { color: C.orange }]}>
                        Completing remaining fee — year details are locked. Only edit the amount you're paying now.
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.modeBanner, { backgroundColor: C.accentBg, borderColor: C.accent + '55' }]}>
                      <Text style={{ fontSize: 15 }}>✏️</Text>
                      <Text style={[styles.modeBannerText, { color: C.accent }]}>
                        New year payment — fill in all the details below.
                      </Text>
                    </View>
                  )}

                  {/* ── Academic Year ── */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>ACADEMIC YEAR *</Text>
                    {isExistingYear ? (
                      <View style={[styles.readOnlyField, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                        <Text style={[styles.readOnlyText, { color: C.textPrimary }]}>{academicYear || '—'}</Text>
                        <Text style={styles.lockIcon}>🔒</Text>
                      </View>
                    ) : (
                      <TextInput
                        style={[styles.textInput, { backgroundColor: C.cardAlt, borderColor: C.border, color: C.textPrimary }]}
                        placeholder="e.g. Year 4 (2024-25)"
                        placeholderTextColor={C.textMuted}
                        value={academicYear}
                        onChangeText={setAcademicYear}
                      />
                    )}
                  </View>

                  {/* ── Total Tuition Fee ── */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>TOTAL TUITION FEE *</Text>
                    {isExistingYear ? (
                      <View style={[styles.readOnlyField, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                        <Text style={[styles.readOnlyPrefix, { color: C.accent }]}>₹</Text>
                        <Text style={[styles.readOnlyAmount, { color: C.textPrimary }]}>
                          {tuitionFee ? Number(tuitionFee).toLocaleString('en-IN') : '0'}
                        </Text>
                        <Text style={styles.lockIcon}>🔒</Text>
                      </View>
                    ) : (
                      <View style={[styles.amountInputRow, { backgroundColor: C.cardAlt, borderColor: C.border, borderWidth: 1 }]}>
                        <Text style={[styles.currencyPrefix, { color: C.accent }]}>₹</Text>
                        <TextInput
                          style={[styles.amountInput, { color: C.textPrimary }]}
                          placeholder="0" placeholderTextColor={C.textMuted}
                          keyboardType="numeric" value={tuitionFee}
                          onChangeText={setTuitionFee} maxLength={10}
                        />
                      </View>
                    )}
                  </View>

                  {/* ── Financial Aid ── */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>FINANCIAL AID (optional)</Text>
                    {isExistingYear ? (
                      <View style={[styles.readOnlyField, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                        <Text style={[styles.readOnlyPrefix, { color: C.green }]}>₹</Text>
                        <Text style={[styles.readOnlyAmount, { color: C.textPrimary }]}>
                          {financialAid ? Number(financialAid).toLocaleString('en-IN') : '0'}
                        </Text>
                        <Text style={styles.lockIcon}>🔒</Text>
                      </View>
                    ) : (
                      <View style={[styles.amountInputRow, { backgroundColor: C.cardAlt, borderColor: C.border, borderWidth: 1 }]}>
                        <Text style={[styles.currencyPrefix, { color: C.green }]}>₹</Text>
                        <TextInput
                          style={[styles.amountInput, { color: C.textPrimary }]}
                          placeholder="0" placeholderTextColor={C.textMuted}
                          keyboardType="numeric" value={financialAid}
                          onChangeText={setFinancialAid} maxLength={10}
                        />
                      </View>
                    )}
                  </View>

                  {/* ── Remaining Balance — only shown & locked for existing years ── */}
                  {isExistingYear && (
                    <View style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: C.textMuted }]}>REMAINING BALANCE</Text>
                      <View style={[styles.readOnlyField, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                        <Text style={[styles.readOnlyPrefix, { color: C.orange }]}>₹</Text>
                        <Text style={[styles.readOnlyAmount, { color: C.orange, fontWeight: '700' }]}>
                          {remaining ? Number(remaining).toLocaleString('en-IN') : '0'}
                        </Text>
                        <Text style={styles.lockIcon}>🔒</Text>
                      </View>
                    </View>
                  )}

                  {/* ── Amount Paying Now — ALWAYS editable ── */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>
                      {isExistingYear ? 'AMOUNT PAYING NOW *' : 'AMOUNT PAID *'}
                    </Text>
                    <View style={[styles.amountInputRow, { backgroundColor: C.cardAlt, borderColor: C.accent, borderWidth: 2 }]}>
                      <Text style={[styles.currencyPrefix, { color: C.green }]}>₹</Text>
                      <TextInput
                        style={[styles.amountInput, { color: C.textPrimary }]}
                        placeholder="Enter amount" placeholderTextColor={C.textMuted}
                        keyboardType="numeric" value={payingNow}
                        onChangeText={setPayingNow} maxLength={10}
                      />
                    </View>
                    {isExistingYear && payingNow !== '' && parseINR(payingNow) > parseINR(remaining) && (
                      <Text style={{ color: C.orange, fontSize: 11, marginTop: 4 }}>
                        ⚠️ Amount exceeds remaining balance of {formatINR(remaining)}
                      </Text>
                    )}
                  </View>

                  {/* ── Upload Receipt — ALWAYS editable ── */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: C.textMuted }]}>UPLOAD RECEIPT *</Text>
                    {attachedFile ? (
                      <View style={[styles.filePreview, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                        {attachType === 'photo' && attachedFile.uri ? (
                          <Image source={{ uri: attachedFile.uri }} style={styles.fileThumb} resizeMode="cover" />
                        ) : (
                          <View style={[styles.fileIconBox, { backgroundColor: C.card }]}>
                            <Text style={styles.fileIconEmoji}>{attachType === 'photo' ? '🖼️' : '📄'}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fileName, { color: C.textPrimary }]} numberOfLines={1}>{attachedFile.name}</Text>
                          <Text style={[styles.fileSize, { color: C.textMuted }]}>
                            {attachType === 'photo' ? 'Image' : 'PDF'}
                            {attachedFile.size ? ` · ${formatFileSize(attachedFile.size)}` : ''}
                            {' · '}<Text style={{ color: C.green }}>Ready to upload</Text>
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => { setAttachedFile(null); setAttachType(null); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                          <Text style={[styles.fileRemove, { color: C.textMuted }]}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.attachRow}>
                        <TouchableOpacity onPress={handlePickPhoto} style={[styles.attachBtn, { borderColor: C.accent }]} activeOpacity={0.7}>
                          <Text style={styles.attachIcon}>🖼️</Text>
                          <Text style={[styles.attachText, { color: C.accent }]}>Upload Photo</Text>
                          <Text style={[styles.attachHint, { color: C.textMuted }]}>From Gallery</Text>
                          <Text style={[styles.attachHint, { color: C.textMuted }]}>JPG / PNG</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handlePickPDF} style={[styles.attachBtn, { borderColor: C.accentPurple }]} activeOpacity={0.7}>
                          <Text style={styles.attachIcon}>📋</Text>
                          <Text style={[styles.attachText, { color: C.accentPurple }]}>Upload PDF</Text>
                          <Text style={[styles.attachHint, { color: C.textMuted }]}>From Files app</Text>
                          <Text style={[styles.attachHint, { color: C.textMuted }]}>PDF only</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {attachedFile && (
                      <View style={styles.changeFileRow}>
                        <TouchableOpacity onPress={attachType === 'photo' ? handlePickPhoto : handlePickPDF} style={[styles.changeFileBtn, { borderColor: C.border }]}>
                          <Text style={[styles.changeFileBtnText, { color: C.textMuted }]}>🔄 Change {attachType === 'photo' ? 'Photo' : 'PDF'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setAttachedFile(null); setAttachType(null); }} style={[styles.changeFileBtn, { borderColor: C.border }]}>
                          <Text style={[styles.changeFileBtnText, { color: C.textMuted }]}>🔀 Switch Type</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity style={[styles.submitBtn, { backgroundColor: C.accent }]} onPress={handleSubmit} activeOpacity={0.85}>
                    <Text style={styles.submitBtnText}>Review Submission →</Text>
                  </TouchableOpacity>
                </View>

              ) : (
                /* ══ STEP 2 — CONFIRM ══ */
                <View style={styles.modalBody}>
                  <View style={[styles.confirmCard, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                    <View style={[styles.confirmAmountRow, { borderBottomColor: C.border }]}>
                      <View>
                        <Text style={[styles.confirmAmountLabel, { color: C.textMuted }]}>Paying Now</Text>
                        <Text style={[styles.confirmAmount, { color: C.green }]}>{formatINR(payingNow)}</Text>
                      </View>
                      <View style={[styles.confirmAmountBadge, { backgroundColor: C.orangeBg }]}>
                        <Text style={[styles.confirmAmountBadgeText, { color: C.orange }]}>⏳ Pending</Text>
                      </View>
                    </View>
                    {[
                      { label: 'Academic Year',     value: academicYear },
                      { label: 'Total Tuition Fee', value: formatINR(tuitionFee) },
                      {
                        label: 'Financial Aid',
                        value: financialAid && parseINR(financialAid) > 0 ? `- ${formatINR(financialAid)}` : 'None',
                        valueColor: financialAid && parseINR(financialAid) > 0 ? C.green : null,
                      },
                      { label: 'Amount Paying Now', value: formatINR(payingNow), valueColor: C.green },
                      ...(isExistingYear ? [{
                        label: 'Remaining After This Payment',
                        value: formatINR(remainingAfter),
                        valueColor: remainingAfter <= 0 ? C.green : C.orange,
                      }] : []),
                      { label: 'Receipt File', value: attachedFile?.name ?? '—' },
                      { label: 'File Type',    value: attachType === 'photo' ? '🖼️ Image' : '📄 PDF' },
                      ...(attachedFile?.size ? [{ label: 'File Size', value: formatFileSize(attachedFile.size) }] : []),
                    ].map((row) => (
                      <View key={row.label} style={[styles.confirmRow, { borderBottomColor: C.border }]}>
                        <Text style={[styles.confirmRowLabel, { color: C.textMuted }]}>{row.label}</Text>
                        <Text style={[styles.confirmRowValue, { color: row.valueColor ?? C.textPrimary }]} numberOfLines={1}>{row.value}</Text>
                      </View>
                    ))}
                    {attachType === 'photo' && attachedFile?.uri && (
                      <View style={{ padding: 12 }}>
                        <Image source={{ uri: attachedFile.uri }} style={styles.confirmThumb} resizeMode="cover" />
                      </View>
                    )}
                  </View>
                  <View style={[styles.pendingNotice, { backgroundColor: C.orangeBg, borderColor: C.orange + '55' }]}>
                    <Text style={styles.pendingNoticeIcon}>⏳</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingNoticeTitle, { color: C.orange }]}>Awaiting Admin Approval</Text>
                      <Text style={[styles.pendingNoticeText, { color: C.textMuted }]}>
                        Your receipt will be reviewed by an admin. You cannot approve your own payment. Status updates once admin acts.
                      </Text>
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
export const AdminModal = ({ visible, onClose, pendingPayments, onApprove, onReject, C }) => {
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
              ) : pendingPayments.map((p) => (
                <View key={p.id} style={[styles.adminCard, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
                  <View style={styles.adminCardHeader}>
                    <View>
                      <Text style={[styles.adminYear, { color: C.textPrimary }]}>{p.yearLabel}</Text>
                      <Text style={[styles.adminDate, { color: C.textMuted }]}>Submitted: {p.date}</Text>
                    </View>
                    <Text style={[styles.adminAmount, { color: C.green }]}>{formatINR(p.amount)}</Text>
                  </View>
                  <View style={[styles.filePreview, { backgroundColor: C.card, borderColor: C.border }]}>
                    {p.fileType === 'photo' && p.fileUri
                      ? <Image source={{ uri: p.fileUri }} style={styles.adminThumb} resizeMode="cover" />
                      : <Text style={styles.fileIconEmoji}>{p.fileType === 'photo' ? '🖼️' : '📄'}</Text>}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.fileName, { color: C.textPrimary }]} numberOfLines={1}>{p.file}</Text>
                    </View>
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
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Finance Table ─────────────────────────────────────────────────────────────
const COLS = [
  { key: 'year',    label: 'Academic Year',  flex: 1.6 },
  { key: 'tuition', label: 'Tuition & Fees', flex: 1.2 },
  { key: 'aid',     label: 'Financial Aid',  flex: 1.1 },
  { key: 'parent',  label: 'Total fee paid', flex: 1.2 },
  { key: 'net',     label: 'Net Balance',    flex: 1.0 },
  { key: 'status',  label: 'Status',         flex: 1.2 },
  { key: 'action',  label: '',               flex: 0.7 },
];

const FinanceTable = ({ rows, onUpdatePress, onAddYear, C }) => {
  const statusConfig = {
    paid:             { dotColor: C.green,  badgeBg: C.greenBg,  textColor: C.green  },
    pending:          { dotColor: C.orange, badgeBg: C.orangeBg, textColor: C.orange },
    'pending-review': { dotColor: C.accent, badgeBg: C.accentBg, textColor: C.accent },
    partial:          { dotColor: C.orange, badgeBg: C.orangeBg, textColor: C.orange },
    rejected:         { dotColor: C.red,    badgeBg: C.redBg ?? (C.red + '18'), textColor: C.red },
  };
  const bc = C.border, headerBg = C.isDark ? '#0d1520' : '#f0f4f8', footerBg = C.isDark ? '#0d1520' : '#e8eef5';
  const evenBg = C.isDark ? '#0a1118' : '#f8fafc', oddBg = C.card;

  return (
    <View style={styles.tTable}>
      <View style={[styles.tRow, { backgroundColor: headerBg, borderBottomWidth: 2, borderBottomColor: bc }]}>
        {COLS.map((col, ci) => (
          <View key={col.key} style={[styles.tCell, { flex: col.flex }, ci < COLS.length - 1 && { borderRightWidth: 1, borderRightColor: bc }]}>
            <Text style={[styles.tHeadText, { color: C.textMuted }]}>{col.label}</Text>
          </View>
        ))}
      </View>

      {rows.filter(r => r.payments && r.payments.length > 0).length === 0 && (
        <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 36 }}>📋</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#888' }}>No payments yet</Text>
          <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center', paddingHorizontal: 24 }}>
            Tap "+ New Payment" to add an academic year and submit your first payment.
          </Text>
          <TouchableOpacity
            onPress={onAddYear}
            style={{ marginTop: 12, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
            activeOpacity={0.8}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>+ New Payment</Text>
          </TouchableOpacity>
        </View>
      )}

      {rows.filter(r => r.payments && r.payments.length > 0).map((item, rowIdx) => {
        const cfg = statusConfig[item.statusType] || statusConfig.pending;
        const rowBg = rowIdx % 2 === 0 ? evenBg : oddBg;
        const hasPending = item.payments?.some(p => p.adminStatus === 'pending');
        return (
          <View key={item.year}>
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
                <Text style={[styles.tCellMono, { color: item.statusType === 'rejected' ? C.red : item.statusType === 'paid' ? C.green : C.accent, fontWeight: '700' }]}>{item.net}</Text>
              </View>
              <View style={[styles.tCell, { flex: COLS[5].flex, borderRightWidth: 1, borderRightColor: bc }]}>
                <View style={[styles.tBadge, { backgroundColor: cfg.badgeBg }]}>
                  <View style={[styles.tDot, { backgroundColor: cfg.dotColor }]} />
                  <Text style={[styles.tBadgeText, { color: cfg.textColor }]}>{item.status}</Text>
                </View>
              </View>
              <View style={[styles.tCell, { flex: COLS[6].flex, alignItems: 'center' }]}>
                {item.statusType === 'paid' ? (
                  <Text style={{ color: C.green, fontSize: 16, fontWeight: '700' }}>✓</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.tPayBtn, {
                      backgroundColor: item.payments?.length > 0 ? C.card    : C.accentBg,
                      borderColor:     item.payments?.length > 0 ? C.orange  : C.accent,
                    }]}
                    onPress={() => onUpdatePress(item)} activeOpacity={0.75}
                  >
                    <Text style={[styles.tPayBtnText, { color: item.payments?.length > 0 ? C.orange : C.accent }]}>
                      {item.payments?.length > 0 ? '✏️ Pay' : '+ Pay'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

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
                  <View style={[styles.tBadge, { backgroundColor: p.adminStatus === 'approved' ? C.greenBg : p.adminStatus === 'rejected' ? C.redBg : C.orangeBg }]}>
                    <View style={[styles.tDot, { backgroundColor: p.adminStatus === 'approved' ? C.green : p.adminStatus === 'rejected' ? C.red : C.orange }]} />
                    <Text style={[styles.tBadgeText, { color: p.adminStatus === 'approved' ? C.green : p.adminStatus === 'rejected' ? C.red : C.orange }]}>
                      {p.adminStatus === 'approved' ? '✓ Approved' : p.adminStatus === 'rejected' ? '✕ Rejected' : '⏳ Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        );
      })}

      {rows.filter(r => r.payments && r.payments.length > 0).length > 0 && (() => {
        const vis = rows.filter(r => r.payments && r.payments.length > 0);
        const totalTuition = vis.reduce((s, r) => s + parseINR(r.tuition), 0);
        const totalAid     = vis.reduce((s, r) => s + parseINR(r.aid.replace('- ', '')), 0);
        const totalParent  = vis.reduce((s, r) => s + parseINR(r.parent), 0);
        const totalNet     = vis.reduce((s, r) => s + parseINR(r.net), 0);
        const pendingCount = vis.filter(r => r.statusType !== 'paid').length;
        return (
          <View style={[styles.tRow, { backgroundColor: footerBg, borderTopWidth: 2, borderTopColor: bc }]}>
            <View style={[styles.tCell, { flex: COLS[0].flex, borderRightWidth: 1, borderRightColor: bc }]}>
              <Text style={[styles.tFootLabel, { color: C.textPrimary }]}>TOTAL ({vis.length} Yr{vis.length > 1 ? 's' : ''})</Text>
            </View>
            <View style={[styles.tCell, { flex: COLS[1].flex, borderRightWidth: 1, borderRightColor: bc }]}>
              <Text style={[styles.tFootVal, { color: C.textPrimary }]}>{formatINR(totalTuition)}</Text>
            </View>
            <View style={[styles.tCell, { flex: COLS[2].flex, borderRightWidth: 1, borderRightColor: bc }]}>
              <Text style={[styles.tFootVal, { color: C.red }]}>- {formatINR(totalAid)}</Text>
            </View>
            <View style={[styles.tCell, { flex: COLS[3].flex, borderRightWidth: 1, borderRightColor: bc }]}>
              <Text style={[styles.tFootVal, { color: C.textPrimary }]}>{formatINR(totalParent)}</Text>
            </View>
            <View style={[styles.tCell, { flex: COLS[4].flex, borderRightWidth: 1, borderRightColor: bc }]}>
              <Text style={[styles.tFootVal, { color: C.accent }]}>{formatINR(totalNet)}</Text>
            </View>
            <View style={[styles.tCell, { flex: COLS[5].flex + COLS[6].flex }]}>
              <Text style={[styles.tFootLabel, { color: C.textMuted }]}>{pendingCount} Pending</Text>
            </View>
          </View>
        );
      })()}
    </View>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function StudentFinance({ C, onThemeToggle, user }) {
  const [yearlyData,          setYearlyData]          = useState(initialYearlyData);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedYear,        setSelectedYear]        = useState(null);
  const [toast,               setToast]               = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { if (!user?._id) return; fetchFinanceData(); }, [user?._id]);

  const fetchFinanceData = async () => {
    try {
      const { data } = await axiosInstance.get(`/student-finance/${user._id}`);
      if (data.success && data.data?.yearlyData?.length > 0) {
        // Build year rows directly from backend data (dynamic, no hardcoded years)
        const backendRows = data.data.yearlyData.map(backendRow => {
          const payments = (backendRow.payments || []).map(p => ({ ...p, adminStatus: p.status }));
          // Derive year-row status from individual payment statuses
          const hasPending  = payments.some(p => p.adminStatus === 'pending');
          const hasApproved = payments.some(p => p.adminStatus === 'approved');
          const allRejected = payments.length > 0 && payments.every(p => p.adminStatus === 'rejected');
          let derivedStatus     = backendRow.status     || 'Pending';
          let derivedStatusType = backendRow.statusType  || 'pending';
          if (allRejected) {
            derivedStatus     = 'Rejected';
            derivedStatusType = 'rejected';
          } else if (hasPending && !hasApproved) {
            derivedStatus     = 'Pending';
            derivedStatusType = 'pending';
          } else if (hasPending && hasApproved) {
            derivedStatus     = 'Partial';
            derivedStatusType = 'partial';
          }
          const REF = 1000000;
          const tuitionNum = parseINR(backendRow.tuition || '0');
          const aidNum     = parseINR((backendRow.aid || '0').replace('- ', ''));
          return {
            year:       backendRow.year,
            tuition:    backendRow.tuition  || '₹0',
            aid:        backendRow.aid      || '- ₹0',
            parent:     backendRow.parent   || '₹0',
            net:        backendRow.net      || '₹0',
            bars:       backendRow.bars     || { tuition: Math.min(1, tuitionNum / REF), aid: Math.min(1, aidNum / REF) },
            payments,
            status:     derivedStatus,
            statusType: derivedStatusType,
          };
        });
        setYearlyData(backendRows);
      }
    } catch (err) { if (err.response?.status !== 404) console.warn('Could not fetch finance data:', err.message); }
  };

  const showToast = (msg, color) => {
    setToast({ msg, color: color ?? C.green });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const handleUpdatePress = (year) => { setSelectedYear(year); setPaymentModalVisible(true); };

  const handlePaymentSubmit = ({ yearKey, payment, tuitionFee, financialAid }) => {
    setYearlyData(prev => {
      const existingIdx = prev.findIndex(yr => yr.year === yearKey);
      const REF = 1000000;

      const buildRow = (existing) => {
        const rowTuition = tuitionFee  > 0 ? tuitionFee  : parseINR(existing?.tuition || '0');
        const rowAid     = financialAid >= 0 ? financialAid : parseINR((existing?.aid || '0').replace('- ', ''));
        const updatedPayments = [...(existing?.payments || []), payment];
        const approvedTotal   = updatedPayments.filter(p => p.adminStatus === 'approved').reduce((s, p) => s + p.amount, 0);
        const pendingTotal    = updatedPayments.filter(p => p.adminStatus === 'pending').reduce((s, p) => s + p.amount, 0);
        const totalOwed       = rowTuition - rowAid;
        const remaining       = Math.max(0, totalOwed - approvedTotal - pendingTotal);
        return {
          ...(existing || {}),
          year:       yearKey,
          tuition:    formatINR(rowTuition),
          aid:        `- ${formatINR(rowAid)}`,
          parent:     formatINR(approvedTotal + pendingTotal),
          bars:       { tuition: Math.min(1, rowTuition / REF), aid: Math.min(1, rowAid / REF) },
          payments:   updatedPayments,
          net:        remaining <= 0 ? '₹0' : formatINR(remaining),
          status:     remaining <= 0 ? 'Under Review' : 'Partial',
          statusType: 'pending-review',
        };
      };

      if (existingIdx >= 0) {
        // Update existing year row
        const updated = [...prev];
        updated[existingIdx] = buildRow(prev[existingIdx]);
        return updated;
      } else {
        // Add a brand new year row
        return [...prev, buildRow(null)];
      }
    });
    showToast('Payment submitted! Awaiting admin approval 🕐', C.orange);
    setTimeout(() => fetchFinanceData(), 1500);
  };

  const totalTuitionCost = yearlyData.reduce((sum, yr) => sum + parseINR(yr.tuition), 0);
  const totalAidAll       = yearlyData.reduce((sum, yr) => sum + parseINR(yr.aid.replace('- ', '')), 0);
  // Sum only approved payments as "total paid" (most accurate source of truth)
  const totalPaid         = yearlyData.reduce((sum, yr) => sum + (yr.payments || []).filter(p => p.adminStatus === 'approved').reduce((s, p) => s + p.amount, 0), 0);
  const progress          = totalTuitionCost > 0 ? Math.min(100, Math.round((totalPaid / totalTuitionCost) * 100)) : 0;
  const fundingColors     = [C.orange, C.green, C.accent];

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      {toast && (
        <Animated.View style={[styles.toast, { backgroundColor: toast.color, opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }]}>
          <Text style={styles.toastText}>{toast.msg}</Text>
        </Animated.View>
      )}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: C.textPrimary }]}>Financial Overview</Text>
            <Text style={[styles.subtitle, { color: C.textMuted }]}>Track tuition payments &amp; approvals</Text>
          </View>
          <View style={styles.headerActions}>
            {onThemeToggle && (
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={onThemeToggle} activeOpacity={0.8}>
                <Text style={{ fontSize: 18 }}>{C.moonIcon}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="TOTAL TUITION COST"  value={formatINR(totalTuitionCost)} sub={yearlyData.length > 0 ? `Across ${yearlyData.length} academic year${yearlyData.length > 1 ? 's' : ''}` : 'No payments yet'} C={C} />
          <SummaryCard label="TOTAL PAID"          value={formatINR(totalPaid)} progress={progress} accent={C.green} C={C} />
          <SummaryCard label="REMAINING BALANCE"   value={formatINR(Math.max(0, totalTuitionCost - totalPaid))} accent={C.red} C={C} />
        </View>

        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Yearly Financial Breakdown</Text>
            <TouchableOpacity activeOpacity={0.7} style={[styles.reportBtn, { backgroundColor: C.accent }]}
              onPress={() => { setSelectedYear(null); setPaymentModalVisible(true); }}>
              <Text style={styles.reportBtnText}>+ New Payment</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.tableWrap, { borderColor: C.border }]}>
            <FinanceTable rows={yearlyData} onUpdatePress={handleUpdatePress} onAddYear={() => { setSelectedYear(null); setPaymentModalVisible(true); }} C={C} />
          </View>
        </View>

        <View style={styles.chartsRow}>
          <View style={[styles.section, styles.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Cost Trends</Text>
            <Text style={[styles.chartSub, { color: C.textMuted }]}>Yearly Tuition vs Financial Aid</Text>
            {yearlyData.length > 0 ? (() => {
              const BAR_MAX  = isTablet ? 100 : 80;
              // Scale bars relative to the largest tuition value across all years
              const maxVal   = Math.max(1, ...yearlyData.map(d => parseINR(d.tuition)));
              return (
                <View style={styles.barsContainer}>
                  {yearlyData.map(d => {
                    const tuitionVal = parseINR(d.tuition);
                    const aidVal     = parseINR((d.aid || '').replace('- ', '').replace('-', ''));
                    const tuitionPx  = Math.round((tuitionVal / maxVal) * BAR_MAX);
                    const aidPx      = Math.round((aidVal     / maxVal) * BAR_MAX);
                    // Shorten label: prefer text inside parens, else first word
                    const yearLabel  = d.year.includes('(')
                      ? d.year.split('(')[1]?.replace(')', '') || d.year
                      : d.year.length > 8 ? d.year.slice(0, 7) + '…' : d.year;
                    return (
                      <View key={d.year} style={styles.barCol}>
                        <Text style={[styles.barValLabel, { color: C.textMuted }]}>
                          {tuitionVal >= 100000
                            ? `₹${(tuitionVal / 100000).toFixed(1)}L`
                            : tuitionVal > 0 ? `₹${(tuitionVal / 1000).toFixed(0)}K` : ''}
                        </Text>
                        <BarGroup tuitionPx={tuitionPx} aidPx={aidPx} C={C} />
                        <Text style={[styles.barLabel, { color: C.textMuted }]} numberOfLines={1}>{yearLabel}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })() : (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ color: C.textMuted, fontSize: 12 }}>Add a payment to see trends</Text>
              </View>
            )}
            <View style={styles.chartLegend}>
              <View style={styles.chartLegendItem}><View style={[styles.legendDot, { backgroundColor: C.accent }]} /><Text style={[styles.legendText, { color: C.textPrimary }]}>Tuition</Text></View>
              <View style={styles.chartLegendItem}><View style={[styles.legendDot, { backgroundColor: C.green }]} /><Text style={[styles.legendText, { color: C.textPrimary }]}>Aid</Text></View>
            </View>
          </View>
          <View style={[styles.section, styles.chartCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Funding Sources</Text>
            <Text style={[styles.chartSub, { color: C.textMuted }]}>Total distribution of funding</Text>
            <View style={styles.fundingBody}>
              <DonutChart C={C} totalCost={totalTuitionCost} />
              <View style={styles.legend}>
                {fundingSources.map((s, i) => (
                  <View key={s.label} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: fundingColors[i] }]} />
                    <Text style={[styles.legendText, { color: C.textPrimary }]}>{s.label}{'  '}<Text style={[styles.legendPct, { color: C.textMuted }]}>{s.pct}%</Text></Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        onSubmit={handlePaymentSubmit}
        selectedYear={selectedYear}
        C={C} user={user}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: isTablet ? 28 : 16, paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 40, gap: 16 },
  toast:  { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 44, alignSelf: 'center', zIndex: 999, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 12 },
  headerText:    { flex: 1 },
  title:         { fontSize: isTablet ? 26 : 20, fontWeight: '700', letterSpacing: -0.5 },
  subtitle:      { fontSize: isTablet ? 14 : 12, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:       { width: 42, height: 42, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
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
  section:       { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: isTablet ? 20 : 14, paddingTop: isTablet ? 20 : 14, paddingBottom: isTablet ? 16 : 12 },
  sectionTitle:  { fontSize: isTablet ? 18 : 16, fontWeight: '700' },
  chartCard:     { padding: isTablet ? 20 : 14 },
  tableWrap:     { width: '100%', borderTopWidth: 1 },
  tTable:     { width: '100%' },
  tRow:       { flexDirection: 'row', width: '100%' },
  tCell:      { paddingVertical: 11, paddingHorizontal: 8, justifyContent: 'center' },
  tHeadText:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  tCellBold:  { fontSize: 12, fontWeight: '600' },
  tCellMono:  { fontSize: 12, fontVariant: ['tabular-nums'] },
  tReviewTag: { fontSize: 9, marginTop: 2, fontWeight: '500' },
  tSubText:   { fontSize: 11, fontStyle: 'italic' },
  tBadge:     { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, gap: 4 },
  tDot:       { width: 6, height: 6, borderRadius: 3 },
  tBadgeText: { fontSize: 10, fontWeight: '600' },
  tPayBtn:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  tPayBtnText:{ fontSize: 10, fontWeight: '600' },
  tFootLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tFootVal:   { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  chartsRow:       { flexDirection: isTablet ? 'row' : 'column', gap: 16 },
  chartSub:        { fontSize: 12, marginBottom: 16 },
  barsContainer:   { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: isTablet ? 140 : 110, marginTop: 12, marginBottom: 4 },
  barCol:          { alignItems: 'center', gap: 4, flex: 1 },
  barGroup:        { flexDirection: 'row', gap: 3, alignItems: 'flex-end' },
  bar:             { width: isTablet ? 14 : 10, borderRadius: 4 },
  barValLabel:     { fontSize: 9, fontWeight: '600', marginBottom: 2 },
  barLabel:        { fontSize: 9, textAlign: 'center', maxWidth: 50 },
  chartLegend:     { flexDirection: 'row', gap: 16, marginTop: 12 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fundingBody:     { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 8, flexWrap: 'wrap' },
  donutWrapper:    { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  donutRing:       { position: 'absolute' },
  donutRingOverlay:{ position: 'absolute' },
  donutCenter:     { position: 'absolute', alignItems: 'center' },
  donutTotal:      { fontSize: 22, fontWeight: '700' },
  donutSub:        { fontSize: 10, letterSpacing: 1 },
  legend:          { gap: 12 },
  legendRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:       { width: 10, height: 10, borderRadius: 5 },
  legendText:      { fontSize: 14 },
  legendPct:       { fontSize: 13 },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  sheetHandle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12, borderBottomWidth: 1 },
  modalTitle:    { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginTop: 4 },
  modalClose:    { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalCloseIcon:{ fontSize: 14, fontWeight: '600' },
  modalBody:     { padding: 20, gap: 20 },
  modeBanner:     { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, padding: 12, gap: 10 },
  modeBannerText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  formGroup:       { gap: 8 },
  formLabel:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  readOnlyField:   { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, opacity: 0.75 },
  readOnlyText:    { flex: 1, fontSize: 15, fontWeight: '500' },
  readOnlyPrefix:  { fontSize: 24, fontWeight: '700', marginRight: 8 },
  readOnlyAmount:  { flex: 1, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  lockIcon:        { fontSize: 14, marginLeft: 8 },
  amountInputRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  currencyPrefix:  { fontSize: 24, fontWeight: '700', marginRight: 8 },
  amountInput:     { flex: 1, fontSize: 32, fontWeight: '700', paddingVertical: 14, letterSpacing: -1 },
  textInput:       { borderRadius: 12, borderWidth: 1, fontSize: 15, paddingHorizontal: 16, paddingVertical: 12 },
  attachRow:         { flexDirection: 'row', gap: 12 },
  attachBtn:         { flex: 1, borderWidth: 1.5, borderRadius: 14, borderStyle: 'dashed', padding: 16, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)' },
  attachIcon:        { fontSize: 28 },
  attachText:        { fontWeight: '600', fontSize: 14 },
  attachHint:        { fontSize: 11 },
  filePreview:       { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  fileThumb:         { width: 52, height: 52, borderRadius: 8 },
  fileIconBox:       { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileIconEmoji:     { fontSize: 20 },
  fileName:          { fontSize: 14, fontWeight: '500', flex: 1 },
  fileSize:          { fontSize: 12, marginTop: 2 },
  fileRemove:        { fontSize: 18, padding: 4 },
  changeFileRow:     { flexDirection: 'row', gap: 8, marginTop: 6 },
  changeFileBtn:     { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  changeFileBtnText: { fontSize: 12, fontWeight: '500' },
  submitBtn:         { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  submitBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  confirmCard:            { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  confirmAmountRow:       { padding: 20, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmAmountLabel:     { fontSize: 14 },
  confirmAmount:          { fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  confirmAmountBadge:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start' },
  confirmAmountBadgeText: { fontSize: 12, fontWeight: '700' },
  confirmRow:             { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1 },
  confirmRowLabel:        { fontSize: 13 },
  confirmRowValue:        { fontSize: 13, fontWeight: '500', maxWidth: '60%' },
  confirmThumb:           { width: '100%', height: 180, borderRadius: 10 },
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
  adminRemarks:    { fontSize: 13, fontStyle: 'italic' },
  adminActions:    { flexDirection: 'row', gap: 10 },
  rejectBtn:       { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  rejectBtnText:   { fontWeight: '600', fontSize: 14 },
  approveBtn:      { flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  approveBtnText:  { fontWeight: '700', fontSize: 14 },
  adminThumb:      { width: 48, height: 48, borderRadius: 8 },
  emptyState:      { alignItems: 'center', padding: 40, gap: 12 },
  emptyEmoji:      { fontSize: 48 },
  emptyText:       { fontSize: 16 },
});