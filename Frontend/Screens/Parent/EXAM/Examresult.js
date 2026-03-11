import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../Dashboard/Dashboard';
import axiosInstance from '../../../Src/Axios';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ─── BAR COLORS (cycle through these for each subject) ──────────────────────
const BAR_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];



// ─── PDF HTML BUILDER — uses dynamic data ────────────────────────────────────
function buildTranscriptHTML(subjectsList, studentData) {

  const getStatus = (pct) => {
    if (pct >= 90) return { label: 'Excellent', color: '#16a34a', bg: '#dcfce7', border: '#16a34a' };
    if (pct >= 75) return { label: 'Good',      color: '#ca8a04', bg: '#fef9c3', border: '#ca8a04' };
    if (pct >= 50) return { label: 'Average',   color: '#d97706', bg: '#fef3c7', border: '#d97706' };
    return               { label: 'Poor',       color: '#dc2626', bg: '#fee2e2', border: '#dc2626' };
  };

  const pctColor = (pct) =>
    pct >= 90 ? '#16a34a' : pct >= 75 ? '#ca8a04' : pct >= 50 ? '#d97706' : '#dc2626';

  const tableRows = subjectsList.map((s) => {
    const pct1 = s.cat1Max ? Math.round((s.cat1 / s.cat1Max) * 100) : 0;
    const pct2 = s.cat2Max ? Math.round((s.cat2 / s.cat2Max) * 100) : 0;
    const avg  = Math.round((pct1 + pct2) / 2);
    const st   = getStatus(avg);

    return `
      <tr>
        <td class="subj">
          <span class="code">${s.code}</span>
          <span class="sname">${s.name}</span>
        </td>
        <td class="c">${s.cat1 ?? '-'}/${s.cat1Max ?? '-'}</td>
        <td class="c" style="color:${pctColor(pct1)}">${s.cat1Max ? pct1 + '%' : '-'}</td>
        <td class="c">${s.cat2 ?? '-'}/${s.cat2Max ?? '-'}</td>
        <td class="c" style="color:${pctColor(pct2)}">${s.cat2Max ? pct2 + '%' : '-'}</td>
        <td class="c">
          <span class="badge" style="color:${st.color};background:${st.bg};border:1px solid ${st.border}">
            ${st.label}
          </span>
        </td>
      </tr>`;
  }).join('');

  // Totals
  const cat1Total = subjectsList.reduce((a, s) => a + (s.cat1 ?? 0), 0);
  const cat1Max   = subjectsList.reduce((a, s) => a + (s.cat1Max ?? 0), 0);
  const cat2Total = subjectsList.reduce((a, s) => a + (s.cat2 ?? 0), 0);
  const cat2Max   = subjectsList.reduce((a, s) => a + (s.cat2Max ?? 0), 0);
  const cat1Pct   = cat1Max ? Math.round((cat1Total / cat1Max) * 100) : 0;
  const cat2Pct   = cat2Max ? Math.round((cat2Total / cat2Max) * 100) : 0;
  const overall   = Math.round((cat1Pct + cat2Pct) / 2);
  const overallSt = getStatus(overall);

  const sName    = studentData.name   || 'Student';
  const sRollNo  = studentData.rollNo || studentData.prn || '-';
  const sBranch  = studentData.branch || '-';
  const sYear    = studentData.year   || '-';

  const genDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box }
  body { font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background:#fff; color:#111827; padding:40px 36px }

  .header { text-align:center; border-bottom:3px solid #10b981; padding-bottom:20px; margin-bottom:26px }
  .header h1 { font-size:17px; font-weight:700; color:#111827 }
  .header h2 { font-size:22px; font-weight:900; color:#10b981; margin:7px 0 }
  .header p  { font-size:11px; color:#9ca3af }

  .student {
    display:flex; gap:32px; flex-wrap:wrap;
    background:#f9fafb; border-left:4px solid #10b981;
    border-radius:6px; padding:12px 18px; margin-bottom:26px; font-size:13px;
  }
  .student .lbl { color:#6b7280; font-weight:600 }
  .student .val { color:#111827; font-weight:700 }

  table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:26px }
  thead tr { background:#10b981 }
  th { padding:11px 14px; color:#fff; font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase }
  th.c { text-align:center }
  tbody tr:nth-child(even) { background:#f9fafb }
  td { padding:13px 14px; border-bottom:1px solid #e5e7eb; vertical-align:middle }
  tbody tr:last-child td { border-bottom:none }
  .subj { display:flex; flex-direction:column; gap:3px }
  .code  { font-weight:700; font-size:13px; color:#111827 }
  .sname { font-size:11px; color:#6b7280 }
  td.c  { text-align:center; font-weight:600; color:#374151 }
  .badge { display:inline-block; padding:3px 12px; border-radius:4px; font-size:11px; font-weight:700 }

  .summary { display:flex; gap:14px; margin-bottom:30px }
  .box { flex:1; text-align:center; padding:16px 10px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px }
  .box.hi { background:#ecfdf5; border-color:#6ee7b7 }
  .box p { font-size:10px; font-weight:700; color:#9ca3af; letter-spacing:0.6px; text-transform:uppercase; margin-bottom:6px }
  .box b { font-size:30px; font-weight:900; color:#10b981; display:block }
  .box small { font-size:11px; font-weight:700; margin-top:4px; display:block }

  .footer { border-top:1px solid #e5e7eb; padding-top:14px; text-align:center; font-size:10px; color:#9ca3af }
</style>
</head>
<body>

  <div class="header">
    <h1>CampusQR Educational Institution</h1>
    <h2>CAT EXAM RESULTS</h2>
    <p>Generated on ${genDate}</p>
  </div>

  <div class="student">
    <div><span class="lbl">Student: </span><span class="val">${sName}</span></div>
    <div><span class="lbl">Roll No: </span><span class="val">${sRollNo}</span></div>
    <div><span class="lbl">Program: </span><span class="val">${sBranch}</span></div>
    <div><span class="lbl">Year: </span><span class="val">${sYear}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36%;text-align:left">Subject</th>
        <th class="c" style="width:12%">CAT 1</th>
        <th class="c" style="width:12%">CAT 1 %</th>
        <th class="c" style="width:12%">CAT 2</th>
        <th class="c" style="width:12%">CAT 2 %</th>
        <th class="c" style="width:16%">Status</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="summary">
    <div class="box">
      <p>CAT 1 Overall</p>
      <b>${cat1Pct}%</b>
      <small style="color:${pctColor(cat1Pct)}">${getStatus(cat1Pct).label}</small>
    </div>
    <div class="box">
      <p>CAT 2 Overall</p>
      <b>${cat2Pct}%</b>
      <small style="color:${pctColor(cat2Pct)}">${getStatus(cat2Pct).label}</small>
    </div>
    <div class="box hi">
      <p>Combined Overall</p>
      <b>${overall}%</b>
      <small style="color:${overallSt.color}">${overallSt.label}</small>
    </div>
  </div>

  <div class="footer">
    This is an official academic document issued by CampusQR. For queries, contact the Academic Affairs office.
  </div>

</body>
</html>`;
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
const ProgressBar = ({ value, max, color, isTablet, C }) => {
  const pct = max ? Math.min(value / max, 1) : 0;
  const BAR_W = isTablet ? 90 : 64;
  return (
    <View style={{ width: BAR_W, height: 5, backgroundColor: C.cardBorder, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ height: 5, borderRadius: 3, width: BAR_W * pct, backgroundColor: color }} />
    </View>
  );
};

// ─── PASS / FAIL / AWAITING BADGE ────────────────────────────────────────────
const StatusBadge = ({ item }) => {
  const hasAnyMark = item.cat1 !== null || item.cat2 !== null || item.fet !== null;
  if (!hasAnyMark) {
    return (
      <View style={{ borderWidth: 1, borderColor: '#6b7280', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 }}>
        <Text style={{ color: '#6b7280', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>AWAITING</Text>
      </View>
    );
  }
  const total = (item.cat1 ?? 0) + (item.cat2 ?? 0) + (item.fet ?? 0);
  const maxTotal = (item.cat1Max ?? 0) + (item.cat2Max ?? 0) + (item.fetMax ?? 0);
  const pct = maxTotal ? Math.round((total / maxTotal) * 100) : 0;
  const pass = pct >= 40;
  return (
    <View style={{ borderWidth: 1, borderColor: pass ? '#22c55e' : '#ef4444', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ color: pass ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>
        {pass ? 'PASS' : 'FAIL'}
      </Text>
    </View>
  );
};

// ─── SUBJECT ROW ─────────────────────────────────────────────────────────────
const SubjectRow = ({ item, last, isTablet, C, s }) => (
  <View style={[s.row, last && s.rowLast]}>
    <View style={s.colSubject}>
      <Text style={s.code}>{item.code}</Text>
      <Text style={s.subName}>{item.name}</Text>
    </View>
    <View style={s.colInternal}>
      <Text style={s.cell}>{item.internal ?? '-'}/{item.internalMax ?? '-'}</Text>
      <ProgressBar value={item.internal ?? 0} max={item.internalMax ?? 1} color={item.barColor} isTablet={isTablet} C={C} />
    </View>
    <View style={s.colSmall}><Text style={s.cell}>{item.cat1 ?? '-'}/{item.cat1Max ?? '-'}</Text></View>
    <View style={s.colSmall}><Text style={s.cell}>{item.cat2 ?? '-'}/{item.cat2Max ?? '-'}</Text></View>
    <View style={s.colSmall}><Text style={s.cell}>{item.fet ?? '-'}/{item.fetMax ?? '-'}</Text></View>
    <View style={s.colStatus}><StatusBadge item={item} /></View>
  </View>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Examresult() {
  const { C } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const PAD = isTablet ? 32 : 14;
  const s = makeStyles(C, isTablet, PAD);

  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [studentData, setStudentData] = useState({});

  // ── Computed statistics (only count subjects that have at least one mark) ──
  const subjectsWithMarks = subjects.filter((sb) =>
    sb.cat1 !== null || sb.cat2 !== null || sb.fet !== null
  );

  const overallPct = (() => {
    if (!subjectsWithMarks.length) return '0.0';
    let totalMarks = 0, totalMax = 0;
    subjectsWithMarks.forEach((sb) => {
      totalMarks += (sb.cat1 ?? 0) + (sb.cat2 ?? 0) + (sb.fet ?? 0);
      totalMax   += (sb.cat1Max ?? 0) + (sb.cat2Max ?? 0) + (sb.fetMax ?? 0);
    });
    return totalMax ? ((totalMarks / totalMax) * 100).toFixed(1) : '0.0';
  })();

  const overallLabel = (() => {
    const p = parseFloat(overallPct);
    if (p >= 90) return 'EXCELLENT';
    if (p >= 75) return 'GOOD';
    if (p >= 50) return 'AVERAGE';
    return 'NEEDS IMPROVEMENT';
  })();

  const creditsEarned = subjectsWithMarks.filter((sb) => {
    const total = (sb.cat1 ?? 0) + (sb.cat2 ?? 0) + (sb.fet ?? 0);
    const max   = (sb.cat1Max ?? 0) + (sb.cat2Max ?? 0) + (sb.fetMax ?? 0);
    return max ? (total / max) >= 0.4 : false;
  }).length;

  // ── Fetch exam results from backend ──────────────────────────────────────
  const fetchExamResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const parentId = await AsyncStorage.getItem('parentId') || await AsyncStorage.getItem('userId');
      if (!parentId) {
        setError('No parent ID found. Please log in again.');
        return;
      }

      const response = await axiosInstance.get(`/parents/exam-results/${parentId}`);
      if (response.data?.success) {
        const { student, subjects: fetchedSubjects } = response.data;
        setStudentData(student || {});

        const mapped = (fetchedSubjects || []).map((sb, i) => ({
          code:        sb.subjectCode,
          name:        sb.subjectName,
          internal:    sb.internal,
          internalMax: sb.internalMax,
          barColor:    BAR_COLORS[i % BAR_COLORS.length],
          cat1:        sb.cat1,
          cat1Max:     sb.cat1Max,
          cat2:        sb.cat2,
          cat2Max:     sb.cat2Max,
          fet:         sb.fet,
          fetMax:      sb.fetMax,
        }));
        setSubjects(mapped);
      } else {
        setError(response.data?.message || 'Failed to load exam results.');
      }
    } catch (err) {
      console.error('Exam results fetch error:', err.message);
      setError(err.response?.data?.message || 'Unable to fetch exam results. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExamResults();
  }, [fetchExamResults]);

  const handleDownloadTranscript = async () => {
    setDownloading(true);
    try {
      const html = buildTranscriptHTML(subjects, studentData);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Academic Transcript',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (err) {
      console.error('Transcript PDF error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const DownloadButton = ({ mobile }) => (
    <TouchableOpacity
      style={mobile ? s.downloadBtnMobile : s.downloadBtn}
      activeOpacity={0.8}
      onPress={handleDownloadTranscript}
      disabled={downloading || !subjects.length}
    >
      {downloading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={s.downloadText}>⬇  Download Transcript</Text>
      }
    </TouchableOpacity>
  );

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.safe, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.blue} />
        <Text style={{ color: C.sub, marginTop: 12, fontSize: 14 }}>Loading exam results...</Text>
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={[s.safe, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
        <Text style={{ color: C.white, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>{error}</Text>
        <TouchableOpacity
          style={{ backgroundColor: C.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 14 }}
          onPress={fetchExamResults}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Derived student display values ─────────────────────────────────────────
  const sName   = studentData.name   || 'Student';
  const sRollNo = studentData.rollNo || studentData.prn || '-';
  const sBranch = studentData.branch || '-';
  const sYear   = studentData.year   || '-';

  return (
    <View style={s.safe}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.breadcrumb}>
          {['Home', 'Exam Results', 'CAT 1 Results'].map((crumb, i, arr) => (
            <View key={crumb} style={s.breadcrumbItem}>
              {i < arr.length - 1 ? (
                <>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text style={s.breadLink}>{crumb}</Text>
                  </TouchableOpacity>
                  <Text style={s.breadSep}> › </Text>
                </>
              ) : (
                <Text style={s.breadCurrent}>{crumb}</Text>
              )}
            </View>
          ))}
        </View>

        <View style={s.profileCard}>
          <View style={s.leftBar} />
          {isTablet ? (
            <View style={s.profileRowTablet}>
              <View style={s.profileAvatar}>
                <Text style={s.profileAvatarIcon}>🪪</Text>
              </View>
              <View style={s.profileInfoTablet}>
                <Text style={s.profileName}>{sName}</Text>
                <View style={s.profileMetaTablet}>
                  <Text style={s.metaItem}>📋 {sRollNo}</Text>
                  <Text style={s.metaItem}>🎓 {sBranch}</Text>
                  <Text style={s.metaItem}>📅 Year {sYear}</Text>
                </View>
              </View>
              <View style={s.profileActionsTablet}>
                <DownloadButton mobile={false} />
                <TouchableOpacity style={s.shareBtn} activeOpacity={0.8}>
                  <Text style={s.shareText}>⤴</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.profileMobileWrap}>
              <View style={s.profileTopRow}>
                <View style={s.profileAvatar}>
                  <Text style={s.profileAvatarIcon}>🪪</Text>
                </View>
                <View style={s.profileInfoMobile}>
                  <Text style={s.profileName}>{sName}</Text>
                  <Text style={s.metaItem}>📋 {sRollNo}</Text>
                  <Text style={s.metaItem}>🎓 {sBranch}</Text>
                  <Text style={s.metaItem}>📅 Year {sYear}</Text>
                </View>
              </View>
              <View style={s.profileActionsMobile}>
                <DownloadButton mobile />
                <TouchableOpacity style={s.shareBtn} activeOpacity={0.8}>
                  <Text style={s.shareText}>⤴</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={[s.sectionHeader, { flexDirection: isTablet ? 'row' : 'column' }]}>
          <View>
            <Text style={s.sectionTitle}>Exam Results</Text>
            <Text style={s.sectionSub}>CAT 1, CAT 2 &amp; FET Results</Text>
          </View>
          <View style={[s.overallWrap, { alignItems: isTablet ? 'flex-end' : 'flex-start' }]}>
            <Text style={s.overallLabel}>OVERALL PERFORMANCE</Text>
            <View style={s.overallRow}>
              <Text style={s.overallPct}>{overallPct}%</Text>
              <View style={s.excellentBadge}>
                <Text style={s.excellentText}>{overallLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.statRow}>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: C.mode === 'dark' ? '#1e3a5f' : '#dbeafe' }]}>
              <Text style={s.statIconText}>📗</Text>
            </View>
            <View>
              <Text style={s.statLabel}>CREDITS EARNED</Text>
              <Text style={s.statValue}>{creditsEarned} / {subjects.length}</Text>
            </View>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: C.mode === 'dark' ? '#431407' : '#fef3c7' }]}>
              <Text style={s.statIconText}>📚</Text>
            </View>
            <View>
              <Text style={s.statLabel}>SUBJECTS</Text>
              <Text style={s.statValue}>{subjects.length}</Text>
            </View>
          </View>
        </View>

        {subjects.length === 0 ? (
          <View style={[s.table, { padding: 30, alignItems: 'center' }]}>
            <Text style={{ fontSize: 36, marginBottom: 10 }}>📋</Text>
            <Text style={{ color: C.sub, fontSize: 14, textAlign: 'center' }}>No exam results available yet.</Text>
          </View>
        ) : (
          <View style={s.table}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={!isTablet}
              scrollEnabled={!isTablet}
              bounces={false}
            >
              <View style={{ minWidth: 1229 }}>
                <View style={s.tableHead}>
                  <Text style={[s.headText, s.colSubject]}>SUBJECT CODE &amp; NAME</Text>
                  <Text style={[s.headText, s.colInternal]}>INTERNAL MARKS</Text>
                  <Text style={[s.headText, s.colSmall]}>CAT 1</Text>
                  <Text style={[s.headText, s.colSmall]}>CAT 2</Text>
                  <Text style={[s.headText, s.colSmall]}>FET</Text>
                  <Text style={[s.headText, s.colStatus]}>                    STATUS</Text>
                </View>
                {subjects.map((item, i) => (
                  <SubjectRow
                    key={item.code}
                    item={item}
                    last={i === subjects.length - 1}
                    isTablet={isTablet}
                    C={C}
                    s={s}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── DYNAMIC STYLES ───────────────────────────────────────────────────────────
function makeStyles(C, isTablet, PAD) {
  const bg        = C.bg;
  const surface   = C.card;
  const surface2  = C.mode === 'dark' ? '#1c2233' : '#d4e4f5';
  const border    = C.cardBorder;
  const accent    = C.blue;
  const green     = '#22c55e';
  const text      = C.white;
  const textSub   = C.sub;
  const textMuted = C.muted;

  return StyleSheet.create({
    safe:          { flex: 1, backgroundColor: bg },
    scroll:        { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    breadcrumb:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingHorizontal: PAD, paddingVertical: 14 },
    breadcrumbItem: { flexDirection: 'row', alignItems: 'center' },
    breadLink:      { color: textSub, fontSize: 13 },
    breadSep:       { color: textMuted, fontSize: 13 },
    breadCurrent:   { color: text, fontSize: 13, fontWeight: '700' },

    profileCard:          { backgroundColor: surface, marginHorizontal: PAD, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 20, paddingLeft: 24, marginBottom: 24, overflow: 'hidden' },
    leftBar:              { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: accent },
    profileRowTablet:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
    profileInfoTablet:    { flex: 1 },
    profileMetaTablet:    { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 },
    profileActionsTablet: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    profileMobileWrap:    { gap: 14 },
    profileTopRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    profileInfoMobile:    { flex: 1, gap: 3 },
    profileActionsMobile: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    profileAvatar:        { width: 64, height: 64, borderRadius: 10, backgroundColor: surface2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    profileAvatarIcon:    { fontSize: 30 },
    profileName:          { color: text, fontSize: isTablet ? 24 : 20, fontWeight: '800', marginBottom: 4 },
    metaItem:             { color: textSub, fontSize: 13 },
    downloadBtn:          { backgroundColor: accent, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, minWidth: 160, alignItems: 'center' },
    downloadBtnMobile:    { flex: 1, backgroundColor: accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    downloadText:         { color: '#fff', fontWeight: '700', fontSize: 13 },
    shareBtn:             { width: 38, height: 38, borderRadius: 8, backgroundColor: surface2, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    shareText:            { color: text, fontSize: 17 },

    sectionHeader:  { justifyContent: 'space-between', paddingHorizontal: PAD, marginBottom: 14, gap: isTablet ? 0 : 10 },
    sectionTitle:   { color: text, fontSize: isTablet ? 20 : 17, fontWeight: '800' },
    sectionSub:     { color: textSub, fontSize: 12, marginTop: 3 },
    overallWrap:    {},
    overallLabel:   { color: textSub, fontSize: 11, letterSpacing: 0.8, marginBottom: 3 },
    overallRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
    overallPct:     { color: accent, fontSize: isTablet ? 34 : 28, fontWeight: '900' },
    excellentBadge: { backgroundColor: C.mode === 'dark' ? '#052e16' : '#dcfce7', borderWidth: 1, borderColor: green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    excellentText:  { color: green, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },

    statRow:      { flexDirection: 'row', gap: 12, paddingHorizontal: PAD, marginBottom: 18 },
    statCard:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: surface, borderRadius: 10, borderWidth: 1, borderColor: border, padding: 14 },
    statIcon:     { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    statIconText: { fontSize: 20 },
    statLabel:    { color: textSub, fontSize: 11, letterSpacing: 0.7, marginBottom: 3 },
    statValue:    { color: text, fontSize: isTablet ? 22 : 18, fontWeight: '800' },
    rankRow:      { flexDirection: 'row', alignItems: 'center' },
    rankUp:       { color: green, fontSize: 13, fontWeight: '700' },

    table:     { marginHorizontal: PAD, backgroundColor: surface, borderRadius: 10, borderWidth: 1, borderColor: border, overflow: 'hidden', marginBottom: 24 },
    tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, backgroundColor: surface2, borderBottomWidth: 1, borderBottomColor: border },
    headText:  { color: textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },

    row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: border },
    rowLast: { borderBottomWidth: 0 },

    colSubject:  { flex: isTablet ? 2.4 : 2.0 },
    colInternal: { flex: isTablet ? 2.2 : 1.9, flexDirection: 'row', alignItems: 'center', gap: 7 },
    colSmall:    { flex: isTablet ? 1.1 : 1.0 },
    colStatus:   { flex: isTablet ? 0.9 : 0.85, alignItems: 'flex-end' },

    code:    { color: text, fontWeight: '700', fontSize: isTablet ? 14 : 13 },
    subName: { color: textSub, fontSize: isTablet ? 12 : 11, marginTop: 2 },
    cell:    { color: text, fontWeight: '600', fontSize: isTablet ? 14 : 13 },
  });
}