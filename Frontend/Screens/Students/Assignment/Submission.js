/**
 * Submission.js  (AssignmentSubmission screen)
 *
 * ✅ Shows teacher-attached resources (photos / documents) in Instructions panel
 * ✅ After integrity check → saves AI % + similarity % + fileName in DB
 * ✅ Submission row in DB carries verificationStatus: "pending" until teacher verifies
 */

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  useWindowDimensions, StatusBar, TextInput, Platform,
  Modal, ActivityIndicator, Alert, Image, Linking,
} from 'react-native';
import axiosInstance from '../../../Src/Axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color }) => {
  const icons = {
    home:'⊞',bell:'🔔',clock:'⏱',person:'👤',calendar:'📅',document:'📄',
    clip:'📎',pdf:'📕',docx:'📘',upload:'☁',download:'⬇',check:'✓',
    help:'❓',chevron:'›',file:'📄',back:'←',ai:'🤖',similarity:'🔍',
    shield:'🛡',warning:'⚠',trash:'🗑',checkCircle:'✅',xCircle:'❌',
    image:'🖼',attach:'📎',
  };
  return <Text style={{ fontSize:size, color }}>{icons[name]||'•'}</Text>;
};

// ─── Top Nav ──────────────────────────────────────────────────────────────────
const TopNav = ({ onBack, C }) => (
  <View style={[s.nav,{ backgroundColor:C.card??C.surface, borderBottomColor:C.border }]}>
    <TouchableOpacity style={[s.backBtn,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border }]} activeOpacity={0.7} onPress={onBack}>
      <Icon name="back" size={18} color={C.textPrimary} />
      <Text style={[s.backText,{ color:C.textPrimary }]}>Back</Text>
    </TouchableOpacity>
    <View style={s.navBrand}>
      <View style={[s.navLogoBox,{ backgroundColor:C.accent }]}><Text style={s.navLogoText}>✦</Text></View>
      <Text style={[s.navTitle,{ color:C.textPrimary }]}>UniVerse</Text>
    </View>
    <View style={s.breadcrumb} />
  </View>
);

// ─── Tag / Badge ──────────────────────────────────────────────────────────────
const Tag = ({ label, variant='default', C }) => {
  const getColors = () => {
    switch (variant) {
      case 'warn':    return { bg:(C.orange??'#e67700')+'22', text:C.orange??'#e67700' };
      case 'success': return { bg:(C.green ??'#2f9e44')+'22', text:C.green ??'#2f9e44' };
      case 'danger':  return { bg:(C.red   ??'#e03131')+'22', text:C.red   ??'#e03131' };
      case 'pending': return { bg:(C.yellow??'#f59e0b')+'22', text:C.yellow??'#f59e0b' };
      default:        return { bg:C.accent+'22', text:C.accent };
    }
  };
  const { bg, text } = getColors();
  return (
    <View style={[s.tag,{ backgroundColor:bg, borderColor:text, borderWidth:1 }]}>
      <Text style={[s.tagText,{ color:text }]}>{label}</Text>
    </View>
  );
};

// ─── Resource File Card (teacher-attached) ────────────────────────────────────
const ResourceCard = ({ resource, C }) => {
  const isImage = resource.type === 'image';
  const baseURL = axiosInstance.defaults.baseURL?.replace('/api','') ?? '';
  const url = resource.url?.startsWith('http') ? resource.url : `${baseURL}${resource.url}`;

  const handleOpen = () => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open this file.'));
    }
  };

  return (
    <TouchableOpacity onPress={handleOpen} activeOpacity={0.8}
      style={[s.resourceCard,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border }]}>
      {isImage ? (
        <View style={[s.resourceIconBox,{ backgroundColor:(C.purple??'#7c3aed')+'22' }]}>
          <Image source={{ uri:url }} style={s.resourceThumb} resizeMode="cover"
            defaultSource={require('expo/AppEntry')} // fallback; swap for your placeholder
          />
        </View>
      ) : (
        <View style={[s.resourceIconBox,{ backgroundColor:C.accent+'22' }]}>
          <Icon name="pdf" size={20} color={C.accent} />
        </View>
      )}
      <View style={s.resourceInfo}>
        <Text style={[s.resourceName,{ color:C.textPrimary }]} numberOfLines={1}>{resource.name}</Text>
        <Text style={[s.resourceMeta,{ color:C.textMuted }]}>
          {isImage?'Image':'Document'}
          {resource.size ? `  ·  ${(resource.size/1024).toFixed(0)} KB` : ''}
        </Text>
      </View>
      <Icon name="download" size={14} color={C.textMuted} />
    </TouchableOpacity>
  );
};

// ─── Circular Risk Meter ──────────────────────────────────────────────────────
const RiskMeter = ({ percent, label, color, C }) => (
  <View style={s.riskMeterWrap}>
    <View style={[s.riskCircle,{ borderColor:color, borderWidth:5, backgroundColor:C.cardAlt??C.surfaceAlt }]}>
      <Text style={[s.riskPct,{ color }]}>{percent}%</Text>
    </View>
    <Text style={[s.riskLabel,{ color:C.textMuted }]}>{label}</Text>
  </View>
);

// ─── Analysis Result Modal ────────────────────────────────────────────────────
const AnalysisModal = ({ visible, results, onSubmit, onCancel, C, submitting }) => {
  if (!results) return null;
  const warnColor    = C.orange??'#e67700';
  const successColor = C.green ??'#2f9e44';
  const dangerColor  = C.red   ??'#e03131';
  const aiRisk   = results.aiPercent;
  const simRisk  = results.similarityPercent;
  const aiColor  = aiRisk  > 50 ? dangerColor : aiRisk  > 25 ? warnColor : successColor;
  const simColor = simRisk > 40 ? dangerColor : simRisk > 20 ? warnColor : successColor;
  const overallOk = aiRisk <= 25 && simRisk <= 20;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.modalOverlay}>
        <View style={[s.modalCard,{ backgroundColor:C.card??C.surface, borderColor:C.border }]}>
          <View style={s.modalHeader}>
            <Icon name="shield" size={22} color={C.accent} />
            <Text style={[s.modalTitle,{ color:C.textPrimary }]}>Integrity Analysis Report</Text>
          </View>
          <Text style={[s.modalSubtitle,{ color:C.textMuted }]}>Results for: {results.fileName}</Text>

          <View style={s.metersRow}>
            <RiskMeter percent={aiRisk}  label="AI Content" color={aiColor}  C={C} />
            <View style={[s.meterDivider,{ backgroundColor:C.border }]} />
            <RiskMeter percent={simRisk} label="Similarity"  color={simColor} C={C} />
          </View>

          <View style={[s.breakdownBox,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border }]}>
            <Text style={[s.breakdownTitle,{ color:C.textMuted }]}>DETAILED BREAKDOWN</Text>
            {[
              { icon:'ai',         label:'AI-Generated Content', val:aiRisk,  clr:aiColor  },
              { icon:'similarity', label:'Similarity Index',     val:simRisk, clr:simColor },
            ].map(b => (
              <View key={b.label} style={s.breakdownRow}>
                <Icon name={b.icon} size={14} color={C.textMuted} />
                <Text style={[s.breakdownLabel,{ color:C.textMuted }]}>{b.label}</Text>
                <View style={[s.breakdownBar,{ backgroundColor:C.border }]}>
                  <View style={[s.breakdownFill,{ width:`${b.val}%`, backgroundColor:b.clr }]} />
                </View>
                <Text style={[s.breakdownPct,{ color:b.clr }]}>{b.val}%</Text>
              </View>
            ))}
          </View>

          {results.analysisUnavailable && (
            <View style={[s.statusBanner,{ backgroundColor:(C.orange??'#e67700')+'22', borderColor:C.orange??'#e67700', marginBottom:8 }]}>
              <Icon name="warning" size={16} />
              <Text style={[s.statusText,{ color:C.orange??'#e67700' }]}>
                AI analysis service is offline. Showing 0% — you can still submit.
              </Text>
            </View>
          )}

          <View style={[s.statusBanner,{ backgroundColor:(overallOk?successColor:warnColor)+'22', borderColor:overallOk?successColor:warnColor }]}>
            <Icon name={overallOk?'checkCircle':'warning'} size={16} />
            <Text style={[s.statusText,{ color:overallOk?successColor:warnColor }]}>
              {overallOk
                ? 'Your submission passes integrity checks.'
                : 'High AI or similarity detected. Proceed with caution.'}
            </Text>
          </View>

          <View style={s.modalActions}>
            <TouchableOpacity style={[s.cancelBtn,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border }]}
              activeOpacity={0.8} onPress={onCancel} disabled={submitting}>
              <Text style={[s.cancelBtnText,{ color:C.textMuted }]}>✕  Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.submitFinalBtn,{ backgroundColor:C.accent }, submitting&&{opacity:0.6}]}
              activeOpacity={0.85} onPress={onSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.submitFinalText}>✓  Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Checking Loader Modal ────────────────────────────────────────────────────
const CheckingModal = ({ visible, step, C }) => {
  const successColor = C.green??'#2f9e44';
  const steps = [
    { key:'upload', label:'Uploading file…'         },
    { key:'ai',     label:'Scanning for AI content…' },
    { key:'sim',    label:'Running similarity index…' },
    { key:'done',   label:'Finalising report…'       },
  ];
  const current = steps.findIndex(st => st.key===step);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={s.modalOverlay}>
        <View style={[s.modalCard,{ backgroundColor:C.card??C.surface, borderColor:C.border, alignItems:'center', paddingVertical:32 }]}>
          <ActivityIndicator size="large" color={C.accent} style={{ marginBottom:20 }} />
          <Text style={[s.checkingTitle,{ color:C.textPrimary }]}>Checking Your Work</Text>
          <View style={{ width:'100%', marginTop:20, gap:10 }}>
            {steps.map((st,i) => {
              const done = i < current; const active = i === current;
              return (
                <View key={st.key} style={s.stepRow}>
                  <View style={[s.stepDot,{ backgroundColor:C.textMuted }, done&&{backgroundColor:successColor}, active&&{backgroundColor:C.accent}]} />
                  <Text style={[s.stepLabel,{ color:C.textMuted }, active&&{color:C.textPrimary,fontWeight:'600'}, done&&{color:successColor}]}>
                    {st.label}
                  </Text>
                  {done && <Text style={{ color:successColor, marginLeft:'auto' }}>✓</Text>}
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
        type:['application/pdf','application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory:true, multiple:false,
      });
      if (!result.canceled && result.assets?.length > 0) onFileSelected(result.assets[0]);
    } catch (err) { console.warn('DocumentPicker error:', err); }
  };

  return (
    <View style={{ marginBottom:14 }}>
      <TouchableOpacity style={[s.uploadZone,{ borderColor:C.border, backgroundColor:C.cardAlt??C.surfaceAlt }]}
        activeOpacity={0.8} onPress={handlePick}>
        <Icon name="upload" size={32} color={C.accent} />
        <Text style={[s.uploadTitle,{ color:C.textPrimary }]}>Click to upload or drag & drop</Text>
        <Text style={[s.uploadSub,{ color:C.textMuted }]}>PDF, DOCX up to 10MB</Text>
      </TouchableOpacity>
      {uploadedFiles.map((file,idx) => (
        <View key={idx} style={[s.uploadedFileRow,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border }]}>
          <Icon name="file" size={13} color={C.accent} />
          <Text style={[s.uploadedFileName,{ color:C.textPrimary }]} numberOfLines={1}>{file.name}</Text>
          <Text style={[s.uploadedFileSize,{ color:C.textMuted }]}>{file.size?`${(file.size/1024).toFixed(1)} KB`:''}</Text>
          <TouchableOpacity onPress={() => onRemoveFile(idx)} style={{ marginLeft:8 }}>
            <Icon name="trash" size={14} color={C.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

// ─── Helper: build FormData ───────────────────────────────────────────────────
async function buildFormData(asset) {
  const formData = new FormData();
  const ext = (asset.name??'').split('.').pop()?.toLowerCase();
  const mimeFromExt = ext==='pdf'?'application/pdf':ext==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':ext==='doc'?'application/msword':'application/octet-stream';
  const resolvedMime = asset.mimeType ?? mimeFromExt;
  const fileName     = asset.name    ?? `upload.${ext??'bin'}`;
  if (Platform.OS==='web') {
    if (asset.file instanceof File) formData.append('file', asset.file, fileName);
    else {
      const blob = await fetch(asset.uri).then(r=>r.blob());
      formData.append('file', new File([blob], fileName, { type:resolvedMime }));
    }
  } else {
    formData.append('file', { uri:decodeURIComponent(asset.uri), name:fileName, type:resolvedMime });
  }
  return formData;
}

function getAuthToken() {
  return (axiosInstance.defaults.headers.common?.['Authorization'] ?? axiosInstance.defaults.headers?.['Authorization'] ?? '');
}

// ─── Work Panel ───────────────────────────────────────────────────────────────
const WorkPanel = ({ C, assignment, studentId, studentName, onSubmitted, alreadySubmitted, submissionRecord }) => {
  const [comment,        setComment]        = useState('');
  const [uploadedFiles,  setUploadedFiles]  = useState([]);
  const [checking,       setChecking]       = useState(false);
  const [checkStep,      setCheckStep]      = useState('upload');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showResult,     setShowResult]     = useState(false);
  const [submitted,      setSubmitted]      = useState(alreadySubmitted ?? false);
  const [submitting,     setSubmitting]     = useState(false);

  // ── If already submitted: show summary ──────────────────────────────────────
  if (submitted || alreadySubmitted) {
    const rec = submissionRecord;
    const verMeta = {
      pending:  { label:'Pending Review',  icon:'⏳', color: C.yellow??'#f59e0b' },
      verified: { label:'Verified ✅',      icon:'✅', color: C.green ??'#22c55e' },
      rejected: { label:'Rejected ❌',      icon:'❌', color: C.red   ??'#ef4444' },
    };
    const vm = rec ? (verMeta[rec.verificationStatus]||verMeta.pending) : verMeta.pending;

    return (
      <View style={[s.panel,{ backgroundColor:C.card??C.surface, borderColor:C.border }]}>
        <View style={{ alignItems:'center', paddingVertical:12, gap:8, marginBottom:12 }}>
          <Text style={{ fontSize:32 }}>{submitted && !rec ? '🎉' : vm.icon}</Text>
          <Text style={[s.panelTitle,{ color:C.textPrimary, textAlign:'center' }]}>
            {rec ? 'Your Submission' : 'Submitted Successfully!'}
          </Text>
          <View style={{ flexDirection:'row', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
            <Tag label="SUBMITTED" variant="success" C={C} />
            {rec && <Tag label={vm.label} variant={rec.verificationStatus==='verified'?'success':rec.verificationStatus==='rejected'?'danger':'pending'} C={C} />}
          </View>
        </View>

        {rec?.fileName && (
          <View style={[s.uploadedFileRow,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border, marginBottom:12 }]}>
            <Icon name="file" size={13} color={C.accent} />
            <Text style={[s.uploadedFileName,{ color:C.textPrimary }]} numberOfLines={1}>{rec.fileName}</Text>
          </View>
        )}

        {/* AI / Similarity scores */}
        {rec?.analysisAvailable && (
          <View style={[s.breakdownBox,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border, marginBottom:12 }]}>
            <Text style={[s.breakdownTitle,{ color:C.textMuted }]}>INTEGRITY ANALYSIS</Text>
            {[
              { label:'AI Content', val:rec.aiPercent??0,         clr: rec.aiPercent>50?(C.red??'#ef4444'):rec.aiPercent>25?(C.yellow??'#f59e0b'):(C.green??'#22c55e') },
              { label:'Similarity', val:rec.similarityPercent??0, clr: rec.similarityPercent>40?(C.red??'#ef4444'):rec.similarityPercent>20?(C.yellow??'#f59e0b'):(C.green??'#22c55e') },
            ].map(b => (
              <View key={b.label} style={{ marginBottom:10 }}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
                  <Text style={[s.breakdownLabel,{ color:C.textMuted }]}>{b.label}</Text>
                  <Text style={{ fontSize:12, fontWeight:'800', color:b.clr }}>{b.val}%</Text>
                </View>
                <View style={[s.breakdownBar,{ backgroundColor:C.border }]}>
                  <View style={[s.breakdownFill,{ width:`${b.val}%`, backgroundColor:b.clr }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {rec?.comment && (
          <View style={[s.breakdownBox,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border, marginBottom:12 }]}>
            <Text style={[s.breakdownTitle,{ color:C.textMuted }]}>YOUR COMMENT</Text>
            <Text style={[s.bodyText,{ color:C.textMuted, marginBottom:0 }]}>{rec.comment}</Text>
          </View>
        )}

        {rec?.teacherNote && (
          <View style={[s.breakdownBox,{ backgroundColor:(C.teal??'#14b8a6')+'15', borderColor:(C.teal??'#14b8a6')+'40', marginBottom:12 }]}>
            <Text style={[s.breakdownTitle,{ color:C.teal??'#14b8a6' }]}>TEACHER FEEDBACK</Text>
            <Text style={[s.bodyText,{ color:C.textMuted, marginBottom:0 }]}>{rec.teacherNote}</Text>
          </View>
        )}

        <Text style={[s.submitNote,{ color:C.textMuted }]}>
          Submitted: {rec?.submittedAt
            ? new Date(rec.submittedAt).toLocaleString([], { dateStyle:'medium', timeStyle:'short' })
            : 'recently'}
        </Text>
      </View>
    );
  }

  // ── Check-in flow ───────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
  if (uploadedFiles.length === 0) { 
    Alert.alert('No file', 'Please upload a file before checking in.'); 
    return; 
  }
  const asset = uploadedFiles[uploadedFiles.length - 1];
  setChecking(true); setCheckStep('upload');
  try {
    const formData = await buildFormData(asset);

    // ── On web: also cache the File object on the asset NOW
    // so saveSubmissionToMongo can use it later without re-fetching the blob
    if (Platform.OS === 'web' && !(asset.file instanceof File)) {
      try {
        const blob = await fetch(asset.uri).then(r => r.blob());
        const file = new File([blob], asset.name, {
          type: asset.mimeType || blob.type || 'application/octet-stream',
        });
        // Mutate the asset in uploadedFiles to cache the File object
        setUploadedFiles(prev => prev.map((f, i) =>
          i === prev.length - 1 ? { ...f, file } : f
        ));
      } catch (e) {
        console.warn('Could not cache file object:', e);
      }
    }

    setCheckStep('ai');
    const baseURL = axiosInstance.defaults.baseURL;
    const token   = getAuthToken();
    const response = await fetch(`${baseURL}/ai/analyze`, {
      method: 'POST', body: formData,
      headers: { Accept: 'application/json', ...(token ? { Authorization: token } : {}) },
    });
    setCheckStep('sim'); setCheckStep('done');
    await new Promise(r => setTimeout(r, 600));
    if (response.ok) {
      const data = await response.json();
      const ai = data.ai_detection ?? {}; 
      const cp = data.copy_detection ?? {};
      setAnalysisResult({ 
        fileName: asset.name, 
        aiPercent: Math.round(ai.final_ai_probability_percent ?? 0), 
        similarityPercent: Math.round(cp.final_copy_percent ?? 0) 
      });
    } else {
      setAnalysisResult({ fileName: asset.name, aiPercent: 0, similarityPercent: 0, analysisUnavailable: true });
    }
    setShowResult(true);
  } catch (err) {
    console.warn('Check-in error:', err.message);
    setAnalysisResult({ fileName: asset.name, aiPercent: 0, similarityPercent: 0, analysisUnavailable: true });
    setShowResult(true);
  } finally { 
    setChecking(false); 
  }
};

  // ── Final submit (saves to DB with AI scores) ─────────────────────────────
  const saveSubmissionToMongo = async () => {
  if (!assignment?._id) { Alert.alert('Error', 'Assignment ID missing.'); return; }
  if (!studentId) { Alert.alert('Error', 'Student ID is missing. Please log in again.'); return; }
  if (!studentName) { Alert.alert('Error', 'Student name is missing. Please log in again.'); return; }

  setSubmitting(true);
  try {
    const asset = uploadedFiles[uploadedFiles.length - 1];
    const formData = new FormData();

    formData.append('studentId',         String(studentId));
    formData.append('name',              String(studentName));
    formData.append('roll',              '');
    formData.append('comment',           comment || '');
    formData.append('fileName',          analysisResult?.fileName || asset?.name || '');
    formData.append('aiPercent',         String(analysisResult?.aiPercent         ?? 0));
    formData.append('similarityPercent', String(analysisResult?.similarityPercent ?? 0));
    formData.append('analysisAvailable', String(!(analysisResult?.analysisUnavailable ?? true)));

    // ── Attach file based on platform ──
    if (asset) {
      if (Platform.OS === 'web') {
        const file = asset.file instanceof File
          ? asset.file
          : new File(
              [await fetch(asset.uri).then(r => r.blob())],
              asset.name,
              { type: asset.mimeType || 'application/octet-stream' }
            );
        formData.append('file', file);
      } else {
        // iOS / Android
        formData.append('file', {
          uri:  decodeURIComponent(asset.uri),
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
        });
      }
    }

    console.log('📤 Submitting:', studentId, '|', studentName, '| file:', asset?.name, '| platform:', Platform.OS);

    if (Platform.OS === 'web') {
      // ── WEB: native fetch bypasses axios interceptors so Content-Type boundary is preserved ──
      const baseURL = axiosInstance.defaults.baseURL;
      const token   = getAuthToken();

      const response = await fetch(
        `${baseURL}/assignments/${assignment._id}/submissions`,
        {
          method:  'POST',
          body:    formData,
          // NO Content-Type header — browser sets it with boundary automatically
          headers: {
            ...(token ? { Authorization: token } : {}),
          },
        }
      );

      const data = await response.json();

      if (response.status === 409) {
        Alert.alert('Already Submitted', 'You have already submitted this assignment.');
        setShowResult(false);
        setSubmitted(true);
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message ?? 'Submission failed');
      }

      setShowResult(false);
      setSubmitted(true);
      onSubmitted?.();

    } else {
      // ── iOS / Android: axios works correctly with FormData on native ──
      const res = await axiosInstance.post(
        `/assignments/${assignment._id}/submissions`,
        formData
        // no headers — axios auto-detects FormData and sets multipart/form-data with boundary
      );

      if (res.status === 409) {
        Alert.alert('Already Submitted', 'You have already submitted this assignment.');
        setShowResult(false);
        setSubmitted(true);
        return;
      }

      if (!res.data?.success) {
        throw new Error(res.data?.message ?? 'Submission failed');
      }

      setShowResult(false);
      setSubmitted(true);
      onSubmitted?.();
    }

  } catch (err) {
    if (err?.response?.status === 409) {
      Alert.alert('Already Submitted', 'You have already submitted this assignment.');
      setShowResult(false);
      setSubmitted(true);
    } else {
      Alert.alert('Submission Failed', err?.response?.data?.message ?? err.message);
    }
  } finally {
    setSubmitting(false);
  }
};
  return (
    <View style={[s.panel,{ backgroundColor:C.card??C.surface, borderColor:C.border }]}>
      <View style={s.panelHeader}>
        <Text style={[s.panelTitle,{ color:C.textPrimary }]}>Your Work</Text>
        <Tag label="Assigned" C={C} />
      </View>
      <UploadZone onFileSelected={f => setUploadedFiles(p=>[...p,f])} uploadedFiles={uploadedFiles} onRemoveFile={i=>setUploadedFiles(p=>p.filter((_,x)=>x!==i))} C={C} />
      <Text style={[s.commentLabel,{ color:C.textMuted }]}>Private Comment to Teacher</Text>
      <TextInput style={[s.commentInput,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border, color:C.textPrimary }]}
        placeholder="Add a comment…" placeholderTextColor={C.textMuted} value={comment} onChangeText={setComment} multiline numberOfLines={4} textAlignVertical="top" />
      <TouchableOpacity style={[s.submitBtn,{ backgroundColor:C.accent }, uploadedFiles.length===0&&s.submitBtnDisabled]}
        activeOpacity={0.85} onPress={handleCheckIn} disabled={uploadedFiles.length===0}>
        <Text style={s.submitText}>CHECK IN ▶</Text>
      </TouchableOpacity>
      <Text style={[s.submitNote,{ color:C.textMuted }]}>
        Clicking Check In will run an integrity analysis before final submission.
      </Text>
      <View style={[s.helpBox,{ backgroundColor:C.cardAlt??C.surfaceAlt, borderColor:C.border }]}>
        <Icon name="help" size={16} color={C.accent} />
        <View style={{ flex:1, marginLeft:8 }}>
          <Text style={[s.helpTitle,{ color:C.textPrimary }]}>Need help?</Text>
          <Text style={[s.helpText,{ color:C.textMuted }]}>
            If you're having trouble uploading, check our help center or contact IT support.
          </Text>
        </View>
      </View>
      <CheckingModal visible={checking} step={checkStep} C={C} />
      <AnalysisModal visible={showResult} results={analysisResult} onSubmit={saveSubmissionToMongo} onCancel={() => setShowResult(false)} C={C} submitting={submitting} />
    </View>
  );
};

// ─── Instructions Panel (shows description + teacher resources) ───────────────
const InstructionsPanel = ({ assignment, C }) => {
  const bullets = assignment.description
    ? assignment.description.split('\n').filter(Boolean)
    : ['Complete and upload your work as a PDF or DOCX file.'];

  const resources = assignment.resources ?? [];

  return (
    <View style={[s.panel,{ backgroundColor:C.card??C.surface, borderColor:C.border }]}>
      <View style={s.panelHeader}>
        <Icon name="document" size={18} color={C.accent} />
        <Text style={[s.panelTitle,{ color:C.textPrimary, marginLeft:8 }]}>Instructions</Text>
      </View>
      <Text style={[s.bodyText,{ color:C.textMuted }]}>
        {assignment.unit ? `Unit: ${assignment.unit}` : 'Complete the assignment as instructed.'}
      </Text>
      {bullets.map((b,i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={[s.bullet,{ color:C.textMuted }]}>•</Text>
          <Text style={[s.bulletText,{ color:C.textMuted }]}>{b}</Text>
        </View>
      ))}

      {/* Teacher resources */}
      {resources.length > 0 && (
        <View style={{ marginTop:16, gap:8 }}>
          <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
            <Icon name="attach" size={13} color={C.accent} />
            <Text style={{ fontSize:12, fontWeight:'700', color:C.textMuted, letterSpacing:0.5 }}>
              TEACHER RESOURCES ({resources.length})
            </Text>
          </View>
          {resources.map((r,i) => <ResourceCard key={i} resource={r} C={C} />)}
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AssignmentSubmission({
  assignment, onBack, C,
  studentId   = '',
  studentName = '',
  onSubmitted,
}) {
  const { width } = useWindowDimensions();
  const isWide    = width >= 768;

  const dueText = assignment?.dueDate && assignment.dueDate !== 'TBD'
    ? `Due ${assignment.dueDate}${assignment.dueTime ? ', '+assignment.dueTime : ''}`
    : 'No deadline set';

  // Check if this student already submitted
  const submissionRecord = (assignment?.submissions ?? []).find(sub =>
    String(sub.studentId) === String(studentId)
  );
  const alreadySubmitted = !!submissionRecord;

  return (
    <SafeAreaView style={[s.root,{ backgroundColor:C.bg }]}>
      <StatusBar barStyle={C.statusBar??'light-content'} backgroundColor={C.bg} />
      <TopNav onBack={onBack} C={C} />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Assignment Header */}
        <View style={s.assignHeader}>
          <View style={s.tagRow}>
            <Tag label={assignment?.subject??'Assignment'} C={C} />
            {assignment?.dueDate && assignment.dueDate!=='TBD' && (
              <Tag label={`⏱ ${dueText}`} variant="warn" C={C} />
            )}
            {alreadySubmitted && (
              <Tag label={`✓ ${submissionRecord.verificationStatus==='verified'?'Verified':submissionRecord.verificationStatus==='rejected'?'Rejected':'Pending Review'}`}
                variant={submissionRecord.verificationStatus==='verified'?'success':submissionRecord.verificationStatus==='rejected'?'danger':'pending'} C={C} />
            )}
          </View>
          <View style={s.titleRow}>
            <Text style={[s.assignTitle,{ color:C.textPrimary }]}>{assignment?.title??'Assignment'}</Text>
          </View>
          <View style={s.metaRow}>
            <Icon name="person" size={13} color={C.textMuted} />
            <Text style={[s.metaText,{ color:C.textMuted }]}>
              {assignment?.teacherId?`Teacher ID: ${assignment.teacherId}`:'UniVerse'}
            </Text>
            <Text style={[s.metaDot,{ color:C.textMuted }]}>•</Text>
            <Icon name="calendar" size={13} color={C.textMuted} />
            <Text style={[s.metaText,{ color:C.textMuted }]}>{dueText}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={[s.content, isWide&&s.contentWide]}>
          <View style={[s.leftCol, isWide&&{flex:1.2}]}>
            <InstructionsPanel assignment={assignment??{}} C={C} />
          </View>
          <View style={[s.rightCol, isWide&&{flex:1}]}>
            <WorkPanel
              C={C}
              assignment={assignment}
              studentId={studentId}
              studentName={studentName}
              onSubmitted={onSubmitted}
              alreadySubmitted={alreadySubmitted}
              submissionRecord={submissionRecord}
            />
          </View>
        </View>

        <View style={[s.footer,{ borderTopColor:C.border }]}>
          <Text style={[s.footerText,{ color:C.textMuted }]}>© 2024 UniVerse Education Platforms Inc.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex:1 },
  nav:  { flexDirection:'row', alignItems:'center', borderBottomWidth:1, paddingHorizontal:20, paddingVertical:12, flexWrap:'wrap', gap:8 },
  backBtn:  { flexDirection:'row', alignItems:'center', marginRight:8, paddingVertical:4, paddingHorizontal:8, borderRadius:8, borderWidth:1 },
  backText: { fontSize:13, fontWeight:'600', marginLeft:4 },
  navBrand:    { flexDirection:'row', alignItems:'center', marginRight:16 },
  navLogoBox:  { width:32, height:32, borderRadius:8, justifyContent:'center', alignItems:'center' },
  navLogoText: { color:'#fff', fontSize:16, fontWeight:'700' },
  navTitle:    { fontSize:16, fontWeight:'700', marginLeft:8 },
  breadcrumb:  { flexDirection:'row', alignItems:'center', flexWrap:'wrap' },

  scrollContent: { paddingBottom:40 },
  assignHeader:  { paddingHorizontal:20, paddingTop:24, paddingBottom:16 },
  tagRow:        { flexDirection:'row', gap:8, marginBottom:12, flexWrap:'wrap' },
  titleRow:      { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 },
  assignTitle:   { fontSize:26, fontWeight:'700', flex:1, letterSpacing:-0.5 },
  metaRow:       { flexDirection:'row', alignItems:'center', gap:6, marginTop:10, flexWrap:'wrap' },
  metaText:      { fontSize:13 },
  metaDot:       { fontSize:13 },

  content:     { paddingHorizontal:20, gap:16 },
  contentWide: { flexDirection:'row', alignItems:'flex-start' },
  leftCol:     { gap:16 },
  rightCol:    { gap:16 },

  panel:       { borderRadius:14, padding:20, borderWidth:1 },
  panelHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:14 },
  panelTitle:  { fontSize:16, fontWeight:'700' },

  tag:     { paddingHorizontal:10, paddingVertical:4, borderRadius:6 },
  tagText: { fontSize:11, fontWeight:'700', letterSpacing:0.5 },

  bodyText:   { fontSize:14, lineHeight:22, marginBottom:14 },
  bulletRow:  { flexDirection:'row', marginBottom:8 },
  bullet:     { fontSize:14, marginRight:8 },
  bulletText: { fontSize:14, lineHeight:20, flex:1 },

  // Resources
  resourceCard:    { flexDirection:'row', alignItems:'center', borderRadius:10, padding:12, borderWidth:1, marginBottom:6 },
  resourceIconBox: { width:40, height:40, borderRadius:8, justifyContent:'center', alignItems:'center', marginRight:12, overflow:'hidden' },
  resourceThumb:   { width:40, height:40 },
  resourceInfo:    { flex:1 },
  resourceName:    { fontSize:13, fontWeight:'600' },
  resourceMeta:    { fontSize:11, marginTop:2 },

  uploadZone:       { borderWidth:2, borderStyle:'dashed', borderRadius:12, padding:28, alignItems:'center', marginBottom:10 },
  uploadTitle:      { fontSize:14, fontWeight:'600', marginTop:10 },
  uploadSub:        { fontSize:12, marginTop:4 },
  uploadedFileRow:  { flexDirection:'row', alignItems:'center', borderRadius:8, paddingVertical:8, paddingHorizontal:12, borderWidth:1, marginBottom:6, gap:6 },
  uploadedFileName: { fontSize:13, flex:1 },
  uploadedFileSize: { fontSize:11 },

  commentLabel: { fontSize:13, fontWeight:'600', marginBottom:8 },
  commentInput: { borderRadius:10, borderWidth:1, fontSize:14, padding:12, minHeight:80, marginBottom:16 },

  submitBtn:         { borderRadius:10, paddingVertical:14, alignItems:'center', marginBottom:8 },
  submitBtnDisabled: { opacity:0.4 },
  submitText:        { color:'#fff', fontSize:15, fontWeight:'700', letterSpacing:0.3 },
  submitNote:        { fontSize:11, textAlign:'center', marginBottom:16 },

  helpBox:   { flexDirection:'row', alignItems:'flex-start', borderRadius:10, padding:14, borderWidth:1 },
  helpTitle: { fontSize:13, fontWeight:'700', marginBottom:4 },
  helpText:  { fontSize:12, lineHeight:18 },

  footer:      { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:32, borderTopWidth:1, marginTop:16, gap:8 },
  footerText:  { fontSize:12 },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.75)', justifyContent:'center', alignItems:'center', padding:20 },
  modalCard:    { borderRadius:18, padding:24, width:'100%', maxWidth:440, borderWidth:1 },
  modalHeader:  { flexDirection:'row', alignItems:'center', marginBottom:4, gap:8 },
  modalTitle:   { fontSize:17, fontWeight:'700' },
  modalSubtitle:{ fontSize:12, marginBottom:20 },

  metersRow:     { flexDirection:'row', justifyContent:'space-around', marginBottom:20 },
  meterDivider:  { width:1 },
  riskMeterWrap: { alignItems:'center', flex:1 },
  riskCircle:    { width:80, height:80, borderRadius:40, justifyContent:'center', alignItems:'center', marginBottom:8 },
  riskPct:       { fontSize:20, fontWeight:'800' },
  riskLabel:     { fontSize:12, fontWeight:'600' },

  breakdownBox:   { borderRadius:10, padding:14, marginBottom:16, borderWidth:1 },
  breakdownTitle: { fontSize:11, fontWeight:'700', letterSpacing:1, marginBottom:10 },
  breakdownRow:   { flexDirection:'row', alignItems:'center', marginBottom:8, gap:6 },
  breakdownLabel: { fontSize:12, width:130 },
  breakdownBar:   { flex:1, height:4, borderRadius:4, overflow:'hidden' },
  breakdownFill:  { height:4, borderRadius:4 },
  breakdownPct:   { fontSize:12, fontWeight:'700', width:34, textAlign:'right' },

  statusBanner:  { flexDirection:'row', alignItems:'center', borderRadius:10, padding:12, marginBottom:20, gap:8, borderWidth:1 },
  statusText:    { fontSize:13, fontWeight:'600', flex:1 },

  modalActions:    { flexDirection:'row', gap:12 },
  cancelBtn:       { flex:1, paddingVertical:13, borderRadius:10, alignItems:'center', borderWidth:1 },
  cancelBtnText:   { fontSize:14, fontWeight:'600' },
  submitFinalBtn:  { flex:1, paddingVertical:13, borderRadius:10, alignItems:'center' },
  submitFinalText: { color:'#fff', fontSize:14, fontWeight:'700' },

  checkingTitle: { fontSize:16, fontWeight:'700' },
  stepRow:       { flexDirection:'row', alignItems:'center', gap:10, paddingVertical:4 },
  stepDot:       { width:10, height:10, borderRadius:5 },
  stepLabel:     { fontSize:13, flex:1 },
});