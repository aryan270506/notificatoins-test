/**
 * Submission.js  (AssignmentSubmission screen)
 *
 * Features:
 *  1. Real file picker via expo-document-picker
 *  2. "Check In" triggers AI content + similarity analysis (simulated)
 *  3. Results screen with Submit / Cancel buttons
 *  4. No hardcoded palette — all colours come from C prop (passed from AssignmentPortal)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  StatusBar,
  TextInput,
  Platform,
  Modal,
  ActivityIndicator,
  Animated,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color }) => {
  const icons = {
    home: '⊞', bell: '🔔', clock: '⏱', person: '👤',
    calendar: '📅', document: '📄', clip: '📎', pdf: '📕',
    docx: '📘', upload: '☁', download: '⬇', check: '✓',
    help: '❓', chevron: '›', file: '📄', back: '←',
    ai: '🤖', similarity: '🔍', shield: '🛡', warning: '⚠',
    trash: '🗑', checkCircle: '✅', xCircle: '❌',
  };
  return <Text style={{ fontSize: size, color }}>{icons[name] || '•'}</Text>;
};

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
const Breadcrumb = ({ onBack }) => (
  <View style={s.breadcrumb}>
  </View>
);

// ─── Top Nav ──────────────────────────────────────────────────────────────────
const TopNav = ({ onBack, C }) => (
  <View style={[s.nav, { backgroundColor: C.card ?? C.surface, borderBottomColor: C.border }]}>
    <TouchableOpacity
      style={[s.backBtn, { backgroundColor: C.cardAlt ?? C.surfaceAlt, borderColor: C.border }]}
      activeOpacity={0.7}
      onPress={onBack}
    >
      <Icon name="back" size={18} color={C.textPrimary} />
      <Text style={[s.backText, { color: C.textPrimary }]}>Back</Text>
    </TouchableOpacity>
    <View style={s.navBrand}>
      <View style={[s.navLogoBox, { backgroundColor: C.accent }]}>
        <Text style={s.navLogoText}>✦</Text>
      </View>
      <Text style={[s.navTitle, { color: C.textPrimary }]}>Campus360</Text>
    </View>
    <Breadcrumb onBack={onBack} />
  </View>
);

// ─── Tag / Badge ──────────────────────────────────────────────────────────────
const Tag = ({ label, variant = 'default', C }) => {
  const getColors = () => {
    switch (variant) {
      case 'warn':    return { bg: (C.orange ?? C.warn ?? '#e67700') + '22', text: C.orange ?? C.warn ?? '#e67700' };
      case 'success': return { bg: (C.green ?? C.success ?? '#2f9e44') + '22', text: C.green ?? C.success ?? '#2f9e44' };
      case 'danger':  return { bg: (C.red ?? C.danger ?? '#e03131') + '22', text: C.red ?? C.danger ?? '#e03131' };
      default:        return { bg: C.accent + '22', text: C.accent };
    }
  };
  const { bg, text } = getColors();
  return (
    <View style={[s.tag, { backgroundColor: bg, borderColor: text, borderWidth: 1 }]}>
      <Text style={[s.tagText, { color: text }]}>{label}</Text>
    </View>
  );
};

// ─── Reference File Card ──────────────────────────────────────────────────────
const RefFile = ({ name, size, type, C }) => (
  <TouchableOpacity
    style={[s.refFile, { backgroundColor: C.cardAlt ?? C.surfaceAlt, borderColor: C.border }]}
    activeOpacity={0.75}
  >
    <View style={[s.refIcon, {
      backgroundColor: type === 'pdf'
        ? (C.red ?? C.danger ?? '#e03131') + '22'
        : C.accent + '22'
    }]}>
      <Icon
        name={type === 'pdf' ? 'pdf' : 'docx'}
        size={20}
        color={type === 'pdf' ? (C.red ?? C.danger ?? '#e03131') : C.accent}
      />
    </View>
    <View style={s.refInfo}>
      <Text style={[s.refName, { color: C.textPrimary }]} numberOfLines={1}>{name}</Text>
      <Text style={[s.refSize, { color: C.textMuted }]}>{size}</Text>
    </View>
    <TouchableOpacity style={s.refDownload} activeOpacity={0.7}>
      <Icon name="download" size={14} color={C.textMuted} />
    </TouchableOpacity>
  </TouchableOpacity>
);

// ─── Circular Progress Ring ───────────────────────────────────────────────────
const RiskMeter = ({ percent, label, color, C }) => (
  <View style={s.riskMeterWrap}>
    <View style={[s.riskCircle, {
      borderColor: color,
      borderWidth: 5,
      backgroundColor: C.cardAlt ?? C.surfaceAlt,
    }]}>
      <Text style={[s.riskPct, { color }]}>{percent}%</Text>
    </View>
    <Text style={[s.riskLabel, { color: C.textMuted }]}>{label}</Text>
  </View>
);

// ─── Analysis Result Modal ────────────────────────────────────────────────────
const AnalysisModal = ({ visible, results, onSubmit, onCancel, C }) => {
  if (!results) return null;

  const warnColor    = C.orange ?? C.warn    ?? '#e67700';
  const successColor = C.green  ?? C.success ?? '#2f9e44';
  const dangerColor  = C.red    ?? C.danger  ?? '#e03131';

  const aiRisk    = results.aiPercent;
  const simRisk   = results.similarityPercent;
  const aiColor   = aiRisk  > 50 ? dangerColor : aiRisk  > 25 ? warnColor : successColor;
  const simColor  = simRisk > 40 ? dangerColor : simRisk > 20 ? warnColor : successColor;
  const overallOk = aiRisk <= 25 && simRisk <= 20;

  const statusBg    = overallOk ? successColor + '22' : warnColor + '22';
  const statusBorder = overallOk ? successColor : warnColor;
  const statusText  = overallOk ? successColor : warnColor;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.modalOverlay}>
        <View style={[s.modalCard, { backgroundColor: C.card ?? C.surface, borderColor: C.border }]}>
          {/* Header */}
          <View style={s.modalHeader}>
            <Icon name="shield" size={22} color={C.accent} />
            <Text style={[s.modalTitle, { color: C.textPrimary }]}>Integrity Analysis Report</Text>
          </View>
          <Text style={[s.modalSubtitle, { color: C.textMuted }]}>Results for: {results.fileName}</Text>

          {/* Meters */}
          <View style={s.metersRow}>
            <RiskMeter percent={aiRisk}  label="AI Content"  color={aiColor}  C={C} />
            <View style={[s.meterDivider, { backgroundColor: C.border }]} />
            <RiskMeter percent={simRisk} label="Similarity"  color={simColor} C={C} />
          </View>

          {/* Breakdown */}
          <View style={[s.breakdownBox, {
            backgroundColor: C.cardAlt ?? C.surfaceAlt,
            borderColor: C.border,
          }]}>
            <Text style={[s.breakdownTitle, { color: C.textMuted }]}>DETAILED BREAKDOWN</Text>

            <View style={s.breakdownRow}>
              <Icon name="ai" size={14} color={C.textMuted} />
              <Text style={[s.breakdownLabel, { color: C.textMuted }]}>AI-Generated Content</Text>
              <View style={[s.breakdownBar, { backgroundColor: C.border }]}>
                <View style={[s.breakdownFill, { width: `${aiRisk}%`, backgroundColor: aiColor }]} />
              </View>
              <Text style={[s.breakdownPct, { color: aiColor }]}>{aiRisk}%</Text>
            </View>

            <View style={s.breakdownRow}>
              <Icon name="similarity" size={14} color={C.textMuted} />
              <Text style={[s.breakdownLabel, { color: C.textMuted }]}>Similarity Index</Text>
              <View style={[s.breakdownBar, { backgroundColor: C.border }]}>
                <View style={[s.breakdownFill, { width: `${simRisk}%`, backgroundColor: simColor }]} />
              </View>
              <Text style={[s.breakdownPct, { color: simColor }]}>{simRisk}%</Text>
            </View>
          </View>

          {/* Sources detected */}
          {results.sources && results.sources.length > 0 && (
            <View style={[s.sourcesBox, {
              backgroundColor: C.cardAlt ?? C.surfaceAlt,
              borderColor: C.border,
            }]}>
              <Text style={[s.sourcesTitle, { color: C.textMuted }]}>MATCHED SOURCES</Text>
              {results.sources.map((src, i) => (
                <View key={i} style={s.sourceRow}>
                  <Text style={[s.sourceDot, { color: C.textMuted }]}>•</Text>
                  <Text style={[s.sourceText, { color: C.textMuted }]} numberOfLines={1}>{src.name}</Text>
                  <Text style={[s.sourcePct, { color: src.match > 15 ? warnColor : C.textMuted }]}>
                    {src.match}%
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Status Banner */}
          <View style={[s.statusBanner, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <Icon name={overallOk ? 'checkCircle' : 'warning'} size={16} />
            <Text style={[s.statusText, { color: statusText }]}>
              {overallOk
                ? 'Your submission passes integrity checks.'
                : 'High AI or similarity detected. Proceed with caution.'}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={s.modalActions}>
            <TouchableOpacity
              style={[s.cancelBtn, {
                backgroundColor: C.cardAlt ?? C.surfaceAlt,
                borderColor: C.border,
              }]}
              activeOpacity={0.8}
              onPress={onCancel}
            >
              <Text style={[s.cancelBtnText, { color: C.textMuted }]}>✕  Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitFinalBtn, { backgroundColor: C.accent }]}
              activeOpacity={0.85}
              onPress={onSubmit}
            >
              <Text style={s.submitFinalText}>✓  Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Checking Loader Modal ────────────────────────────────────────────────────
const CheckingModal = ({ visible, step, C }) => {
  const successColor = C.green ?? C.success ?? '#2f9e44';
  const steps = [
    { key: 'upload', label: 'Uploading file…'           },
    { key: 'ai',     label: 'Scanning for AI content…'  },
    { key: 'sim',    label: 'Running similarity index…' },
    { key: 'done',   label: 'Finalising report…'        },
  ];
  const current = steps.findIndex(s => s.key === step);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.modalOverlay}>
        <View style={[s.modalCard, {
          backgroundColor: C.card ?? C.surface,
          borderColor: C.border,
          alignItems: 'center',
          paddingVertical: 32,
        }]}>
          <ActivityIndicator size="large" color={C.accent} style={{ marginBottom: 20 }} />
          <Text style={[s.checkingTitle, { color: C.textPrimary }]}>Checking Your Work</Text>
          <View style={{ width: '100%', marginTop: 20, gap: 10 }}>
            {steps.map((st, i) => {
              const done   = i < current;
              const active = i === current;
              return (
                <View key={st.key} style={s.stepRow}>
                  <View style={[
                    s.stepDot,
                    { backgroundColor: C.textMuted },
                    done   && { backgroundColor: successColor },
                    active && { backgroundColor: C.accent },
                  ]} />
                  <Text style={[
                    s.stepLabel,
                    { color: C.textMuted },
                    active && { color: C.textPrimary, fontWeight: '600' },
                    done   && { color: successColor },
                  ]}>
                    {st.label}
                  </Text>
                  {done && <Text style={{ color: successColor, marginLeft: 'auto' }}>✓</Text>}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Upload Zone ──────────────────────────────────────────────────────────────
const UploadZone = ({ onFileSelected, uploadedFiles, onRemoveFile, C }) => {
  const handlePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        onFileSelected(result.assets[0]);
      }
    } catch (err) {
      console.warn('DocumentPicker error:', err);
    }
  };

  return (
    <View style={{ marginBottom: 14 }}>
      <TouchableOpacity
        style={[s.uploadZone, {
          borderColor: C.border,
          backgroundColor: C.cardAlt ?? C.surfaceAlt,
        }]}
        activeOpacity={0.8}
        onPress={handlePick}
      >
        <Icon name="upload" size={32} color={C.accent} />
        <Text style={[s.uploadTitle, { color: C.textPrimary }]}>Click to upload or drag & drop</Text>
        <Text style={[s.uploadSub, { color: C.textMuted }]}>PDF, DOCX up to 10MB</Text>
      </TouchableOpacity>

      {uploadedFiles.map((file, idx) => (
        <View key={idx} style={[s.uploadedFileRow, {
          backgroundColor: C.cardAlt ?? C.surfaceAlt,
          borderColor: C.border,
        }]}>
          <Icon name="file" size={13} color={C.accent} />
          <Text style={[s.uploadedFileName, { color: C.textPrimary }]} numberOfLines={1}>{file.name}</Text>
          <Text style={[s.uploadedFileSize, { color: C.textMuted }]}>
            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
          </Text>
          <TouchableOpacity onPress={() => onRemoveFile(idx)} style={{ marginLeft: 8 }}>
            <Icon name="trash" size={14} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

// ─── Work Panel ───────────────────────────────────────────────────────────────
const WorkPanel = ({ C }) => {
  const [comment,        setComment]        = useState('');
  const [uploadedFiles,  setUploadedFiles]  = useState([]);
  const [checking,       setChecking]       = useState(false);
  const [checkStep,      setCheckStep]      = useState('upload');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showResult,     setShowResult]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);

  const handleFileSelected = (file) => setUploadedFiles(prev => [...prev, file]);
  const handleRemoveFile   = (idx)  => setUploadedFiles(prev => prev.filter((_, i) => i !== idx));

  const handleCheckIn = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload a file before checking in.');
      return;
    }
    const file = uploadedFiles[uploadedFiles.length - 1];
    setChecking(true);
    setCheckStep('upload');

    await new Promise(r => setTimeout(r, 900));  setCheckStep('ai');
    await new Promise(r => setTimeout(r, 1000)); setCheckStep('sim');
    await new Promise(r => setTimeout(r, 1000)); setCheckStep('done');
    await new Promise(r => setTimeout(r, 700));

    const result = {
      fileName:           file.name,
      aiPercent:          Math.floor(Math.random() * 60),
      similarityPercent:  Math.floor(Math.random() * 55),
      sources: [
        { name: 'Bauhaus and Modern Architecture – Smith, 2019', match: Math.floor(Math.random() * 20) + 1 },
        { name: 'Wikipedia – Bauhaus movement',                  match: Math.floor(Math.random() * 15) + 1 },
        { name: 'Journal of Architectural Theory vol.4',         match: Math.floor(Math.random() * 10) + 1 },
      ],
    };

    setChecking(false);
    setAnalysisResult(result);
    setShowResult(true);
  };

  const handleFinalSubmit = () => { setShowResult(false); setSubmitted(true); };
  const handleCancel      = () =>   setShowResult(false);

  if (submitted) {
    return (
      <View style={[s.panel, {
        backgroundColor: C.card ?? C.surface,
        borderColor: C.border,
        alignItems: 'center',
        paddingVertical: 32,
      }]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🎉</Text>
        <Text style={[s.panelTitle, { color: C.textPrimary, textAlign: 'center', marginBottom: 8 }]}>
          Submitted Successfully!
        </Text>
        <Text style={[s.bodyText, { color: C.textMuted, textAlign: 'center' }]}>
          Your assignment has been submitted and is pending review.
        </Text>
        <Tag label="SUBMITTED" variant="success" C={C} />
      </View>
    );
  }

  return (
    <View style={[s.panel, { backgroundColor: C.card ?? C.surface, borderColor: C.border }]}>
      <View style={s.panelHeader}>
        <Text style={[s.panelTitle, { color: C.textPrimary }]}>Your Work</Text>
        <Tag label="Assigned" C={C} />
      </View>

      <UploadZone
        onFileSelected={handleFileSelected}
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleRemoveFile}
        C={C}
      />

      <Text style={[s.commentLabel, { color: C.textMuted }]}>Private Comment to Teacher</Text>
      <TextInput
        style={[s.commentInput, {
          backgroundColor: C.cardAlt ?? C.surfaceAlt,
          borderColor: C.border,
          color: C.textPrimary,
        }]}
        placeholder="Add a comment…"
        placeholderTextColor={C.textMuted}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[
          s.submitBtn,
          { backgroundColor: C.accent },
          uploadedFiles.length === 0 && s.submitBtnDisabled,
        ]}
        activeOpacity={0.85}
        onPress={handleCheckIn}
        disabled={uploadedFiles.length === 0}
      >
        <Text style={s.submitText}>CHECK IN ▶</Text>
      </TouchableOpacity>

      <Text style={[s.submitNote, { color: C.textMuted }]}>
        Clicking Check In will run an integrity analysis before final submission.
      </Text>

      <View style={[s.helpBox, {
        backgroundColor: C.cardAlt ?? C.surfaceAlt,
        borderColor: C.border,
      }]}>
        <Icon name="help" size={16} color={C.accent} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[s.helpTitle, { color: C.textPrimary }]}>Need help?</Text>
          <Text style={[s.helpText, { color: C.textMuted }]}>
            If you're having trouble uploading, check our help center or contact IT support.
          </Text>
        </View>
      </View>

      <CheckingModal visible={checking}   step={checkStep} C={C} />
      <AnalysisModal
        visible={showResult}
        results={analysisResult}
        onSubmit={handleFinalSubmit}
        onCancel={handleCancel}
        C={C}
      />
    </View>
  );
};

// ─── Instructions Panel ───────────────────────────────────────────────────────
const InstructionsPanel = ({ C }) => {
  const bullets = [
    'Define the core principles of Bauhaus design.',
    'Select three specific contemporary buildings as case studies.',
    'Discuss the synthesis of form and function in your chosen examples.',
    'Cite at least 5 academic sources using APA 7th edition.',
  ];
  return (
    <View style={[s.panel, { backgroundColor: C.card ?? C.surface, borderColor: C.border }]}>
      <View style={s.panelHeader}>
        <Icon name="document" size={18} color={C.accent} />
        <Text style={[s.panelTitle, { color: C.textPrimary, marginLeft: 8 }]}>Instructions</Text>
      </View>
      <Text style={[s.bodyText, { color: C.textMuted }]}>
        In this assignment, you are required to analyze the influence of the Bauhaus movement on
        contemporary residential architecture. Your paper should be between 1,500 and 2,000 words.
      </Text>
      {bullets.map((b, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={[s.bullet, { color: C.textMuted }]}>•</Text>
          <Text style={[s.bulletText, { color: C.textMuted }]}>{b}</Text>
        </View>
      ))}
    </View>
  );
};

// ─── References Panel ─────────────────────────────────────────────────────────
const ReferencesPanel = ({ C }) => (
  <View style={[s.panel, { backgroundColor: C.card ?? C.surface, borderColor: C.border }]}>
    <View style={s.panelHeader}>
      <Icon name="clip" size={18} color={C.accent} />
      <Text style={[s.panelTitle, { color: C.textPrimary, marginLeft: 8 }]}>Reference Materials</Text>
    </View>
    <View style={s.refGrid}>
      <RefFile name="Bauhaus_History_Guide.pdf"      size="2.4 MB • PDF"  type="pdf"  C={C} />
      <RefFile name="Citation_Guidelines_APA7.docx"  size="1.1 MB • DOCX" type="docx" C={C} />
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AssignmentSubmission({ assignment, onBack, C }) {
  const { width } = useWindowDimensions();
  const isWide    = width >= 768;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.statusBar ?? 'light-content'} backgroundColor={C.bg} />
      <TopNav onBack={onBack} C={C} />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Assignment Header */}
        <View style={s.assignHeader}>
          <View style={s.tagRow}>
            <Tag label="HISTORY 101"    C={C} />
            <Tag label="⏱ 2 DAYS LEFT" variant="warn" C={C} />
          </View>
          <View style={s.titleRow}>
            <Text style={[s.assignTitle, { color: C.textPrimary }]}>
              Research Paper: Modern Architecture
            </Text>
          </View>
          <View style={s.metaRow}>
            <Icon name="person"   size={13} color={C.textMuted} />
            <Text style={[s.metaText, { color: C.textMuted }]}>Prof. Helena Vance</Text>
            <Text style={[s.metaDot, { color: C.textMuted }]}>•</Text>
            <Icon name="calendar" size={13} color={C.textMuted} />
            <Text style={[s.metaText, { color: C.textMuted }]}>Due Oct 24, 2023, 11:59 PM</Text>
          </View>
        </View>

        {/* Content */}
        <View style={[s.content, isWide && s.contentWide]}>
          <View style={[s.leftCol, isWide && { flex: 1.2 }]}>
            <InstructionsPanel C={C} />
            <ReferencesPanel   C={C} />
          </View>
          <View style={[s.rightCol, isWide && { flex: 1 }]}>
            <WorkPanel C={C} />
          </View>
        </View>

        {/* Footer */}
        <View style={[s.footer, { borderTopColor: C.border }]}>
          <Text style={[s.footerText, { color: C.textMuted }]}>
            © 2023 Campus360 Education Platforms Inc.
          </Text>
          <View style={s.footerLinks}>
            {['Privacy Policy', 'Terms of Service', 'Accessibility'].map((l) => (
              <TouchableOpacity key={l} activeOpacity={0.7} style={{ marginLeft: 16 }}>
                <Text style={[s.footerLink, { color: C.textMuted }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles (no colours — all injected inline) ────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Nav
  nav: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 20, paddingVertical: 12, flexWrap: 'wrap', gap: 8,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', marginRight: 8,
    paddingVertical: 4, paddingHorizontal: 8,
    borderRadius: 8, borderWidth: 1,
  },
  backText:    { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  navBrand:    { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  navLogoBox:  { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  navLogoText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  navTitle:    { fontSize: 16, fontWeight: '700', marginLeft: 8 },

  // Breadcrumb
  breadcrumb:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  breadcrumbLink:  { fontSize: 13 },
  breadcrumbSep:   { fontSize: 13 },
  breadcrumbActive:{ fontSize: 13, fontWeight: '600' },

  // Scroll + Header
  scrollContent: { paddingBottom: 40 },
  assignHeader:  { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  tagRow:        { flexDirection: 'row', gap: 8, marginBottom: 12 },
  titleRow:      {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
  },
  assignTitle: { fontSize: 26, fontWeight: '700', flex: 1, letterSpacing: -0.5 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  metaText:    { fontSize: 13 },
  metaDot:     { fontSize: 13 },

  // Layout
  content:     { paddingHorizontal: 20, gap: 16 },
  contentWide: { flexDirection: 'row', alignItems: 'flex-start' },
  leftCol:     { gap: 16 },
  rightCol:    { gap: 16 },

  // Panel
  panel:       { borderRadius: 14, padding: 20, borderWidth: 1 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  panelTitle:  { fontSize: 16, fontWeight: '700' },

  // Tag
  tag:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Body
  bodyText:   { fontSize: 14, lineHeight: 22, marginBottom: 14 },
  bulletRow:  { flexDirection: 'row', marginBottom: 8 },
  bullet:     { fontSize: 14, marginRight: 8 },
  bulletText: { fontSize: 14, lineHeight: 20, flex: 1 },

  // Ref files
  refGrid:     { gap: 10 },
  refFile:     { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, borderWidth: 1 },
  refIcon:     { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  refInfo:     { flex: 1 },
  refName:     { fontSize: 13, fontWeight: '600' },
  refSize:     { fontSize: 11, marginTop: 2 },
  refDownload: { padding: 6 },

  // Upload
  uploadZone: {
    borderWidth: 2, borderStyle: 'dashed',
    borderRadius: 12, padding: 28, alignItems: 'center', marginBottom: 10,
  },
  uploadTitle: { fontSize: 14, fontWeight: '600', marginTop: 10 },
  uploadSub:   { fontSize: 12, marginTop: 4 },

  // Uploaded file rows
  uploadedFileRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 1, marginBottom: 6, gap: 6,
  },
  uploadedFileName: { fontSize: 13, flex: 1 },
  uploadedFileSize: { fontSize: 11 },

  // Comment
  commentLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  commentInput: { borderRadius: 10, borderWidth: 1, fontSize: 14, padding: 12, minHeight: 80, marginBottom: 16 },

  // Submit button
  submitBtn:         { borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  submitBtnDisabled: { opacity: 0.4 },
  submitText:        { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  submitNote:        { fontSize: 11, textAlign: 'center', marginBottom: 16 },

  // Help box
  helpBox:   { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 10, padding: 14, borderWidth: 1 },
  helpTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  helpText:  { fontSize: 12, lineHeight: 18 },

  // Footer
  footer: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 32,
    borderTopWidth: 1, marginTop: 16, gap: 8,
  },
  footerText:  { fontSize: 12 },
  footerLinks: { flexDirection: 'row', flexWrap: 'wrap' },
  footerLink:  { fontSize: 12 },

  // Modal base
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalCard: { borderRadius: 18, padding: 24, width: '100%', maxWidth: 440, borderWidth: 1 },
  modalHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  modalTitle:    { fontSize: 17, fontWeight: '700' },
  modalSubtitle: { fontSize: 12, marginBottom: 20 },

  // Risk meters
  metersRow:     { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  meterDivider:  { width: 1 },
  riskMeterWrap: { alignItems: 'center', flex: 1 },
  riskCircle:    { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  riskPct:       { fontSize: 20, fontWeight: '800' },
  riskLabel:     { fontSize: 12, fontWeight: '600' },

  // Breakdown
  breakdownBox:   { borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1 },
  breakdownTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  breakdownRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  breakdownLabel: { fontSize: 12, width: 110 },
  breakdownBar:   { flex: 1, height: 4, borderRadius: 4, overflow: 'hidden' },
  breakdownFill:  { height: 4, borderRadius: 4 },
  breakdownPct:   { fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right' },

  // Sources
  sourcesBox:   { borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1 },
  sourcesTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  sourceRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  sourceDot:    { fontSize: 12 },
  sourceText:   { fontSize: 12, flex: 1 },
  sourcePct:    { fontSize: 12, fontWeight: '700' },

  // Status banner
  statusBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, marginBottom: 20, gap: 8, borderWidth: 1 },
  statusText:   { fontSize: 13, fontWeight: '600', flex: 1 },

  // Modal action buttons
  modalActions:    { flexDirection: 'row', gap: 12 },
  cancelBtn:       { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  cancelBtnText:   { fontSize: 14, fontWeight: '600' },
  submitFinalBtn:  { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  submitFinalText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Checking modal
  checkingTitle: { fontSize: 16, fontWeight: '700' },
  stepRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  stepDot:       { width: 10, height: 10, borderRadius: 5 },
  stepLabel:     { fontSize: 13, flex: 1 },
});