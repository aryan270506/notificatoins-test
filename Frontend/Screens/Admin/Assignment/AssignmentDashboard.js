/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  SCREEN 3 — AssignmentDashboard.js                      ║
 * ║  Per-student assignment dashboard                       ║
 * ╚══════════════════════════════════════════════════════════╝
 * Props: student, year, division, onBack
 */

import React, { useState, useRef, useEffect, useContext } from 'react';
import axiosInstance from '../../../Src/Axios';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  StyleSheet, StatusBar, Animated, ActivityIndicator,
} from 'react-native';

import { ThemeContext } from '../dashboard/AdminDashboard';

// ─── API Config ───────────────────────────────────────────────────────────────
const API_BASE_URL = axiosInstance.defaults.baseURL.replace(/\/api$/, "");

// ─── Semantic status colours (always vivid) ───────────────────────────────────
const S = {
  green:  '#4ADE80',
  orange: '#FB923C',
  red:    '#F87171',
  yellow: '#FBBF24',
};

// ─── Subject colour / icon helpers ────────────────────────────────────────────
const SUB_COLORS = ['#4FC3F7','#FB923C','#A78BFA','#4ADE80','#F472B6','#FBBF24','#34D399','#F87171','#60A5FA','#E879F9'];
const SUB_ICONS  = ['📘','⚙️','🗄️','🌐','🤖','📐','🧪','📊','💻','🔬'];

// Build subject list from real student data — map each subject name to a UI-friendly object

// Map fetched assignments to subject objects, creating assignment entries per subject
function calcStats(assignments) {
  const total=assignments.length;
  const submitted=assignments.filter(a=>a.status==='submitted').length;
  return {total,submitted,pending:total-submitted,pct:total?Math.round(submitted/total*100):0};
}

const pctColor  = p=>p>=80?S.green:p>=50?S.yellow:S.red;

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, color, height=6, delay=0, borderColor }) {
  const anim=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    Animated.timing(anim,{toValue:pct/100,duration:900,delay,useNativeDriver:false}).start();
  },[]);
  const w=anim.interpolate({inputRange:[0,1],outputRange:['0%','100%']});
  return (
    <View style={{height,borderRadius:99,overflow:'hidden',backgroundColor: borderColor || '#1e3a5f',flex:1}}>
      <Animated.View style={{height,borderRadius:99,width:w,backgroundColor:color}}/>
    </View>
  );
}

// ─── Subject modal ────────────────────────────────────────────────────────────
function SubjectModal({ sub, visible, onClose }) {
  // ✅ FIXED: correctly destructure ThemeContext
  const { colors } = useContext(ThemeContext);
  const C = colors;

  if (!sub) return null;
  const stats=calcStats(sub.assignments);
  const pc=pctColor(stats.pct);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.80)',justifyContent:'flex-end'}}>
        <View style={[m.sheet,{backgroundColor:C.surface}]}>
          <View style={[m.handle,{backgroundColor:C.border}]}/>
          <View style={m.hdr}>
            <View style={[m.iconBox,{backgroundColor:sub.color+'22',borderColor:sub.color+'44'}]}>
              <Text style={{fontSize:22}}>{sub.icon}</Text>
            </View>
            <View style={{flex:1,marginLeft:12}}>
              <Text style={[m.title,{color:C.textPrim}]}>{sub.name}</Text>
              <Text style={[m.sub,{color:C.textSec}]}>{stats.submitted}/{stats.total} · {stats.pct}% done</Text>
            </View>
            <Text style={[m.bigPct,{color:pc}]}>{stats.pct}%</Text>
          </View>
          <ProgressBar pct={stats.pct} color={pc} height={8} borderColor={C.border}/>
          <View style={m.statsRow}>
            {[
              {l:'Total',v:stats.total,c:C.accentBlue},
              {l:'Submitted',v:stats.submitted,c:S.green},
              {l:'Pending',v:stats.pending,c:S.red},
            ].map(st=>(
              <View key={st.l} style={[m.statBox,{backgroundColor:C.surfaceAlt,borderColor:C.border}]}>
                <Text style={[m.statVal,{color:st.c}]}>{st.v}</Text>
                <Text style={[m.statLbl,{color:C.textSec}]}>{st.l}</Text>
              </View>
            ))}
          </View>
          <Text style={[m.listHdr,{color:C.textPrim}]}>All Assignments</Text>
          <ScrollView style={{maxHeight:310}} showsVerticalScrollIndicator={false}>
            {sub.assignments.map((a,i)=>{
              const done=a.status==='submitted';
              return (
                <View key={a.id} style={[m.row,{borderBottomColor:C.border}]}>
                  <View style={[m.dot,{backgroundColor:done?S.green:S.red}]}>
                    <Text style={{color:'#fff',fontSize:9,fontWeight:'900'}}>{i+1}</Text>
                  </View>
                  <View style={{flex:1,marginLeft:10}}>
                    <Text style={[m.rowTitle,{color:C.textPrim}]}>{a.title}</Text>
                    <Text style={[m.rowDue,{color:C.textSec}]}>Due {a.due}</Text>
                  </View>
                  <View style={[m.pill,{backgroundColor:done?S.green+'20':S.red+'20'}]}>
                    <Text style={[m.pillTxt,{color:done?S.green:S.red}]}>{done?'✓ Done':'⏳ Pending'}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={[m.closeBtn,{backgroundColor:sub.color}]}>
            <Text style={m.closeTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  sheet:    {borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingBottom:40},
  handle:   {width:40,height:4,borderRadius:2,alignSelf:'center',marginBottom:20},
  hdr:      {flexDirection:'row',alignItems:'center',marginBottom:14},
  iconBox:  {width:52,height:52,borderRadius:16,alignItems:'center',justifyContent:'center',borderWidth:1},
  title:    {fontSize:15,fontWeight:'800'},
  sub:      {fontSize:12,marginTop:2},
  bigPct:   {fontSize:24,fontWeight:'900'},
  statsRow: {flexDirection:'row',gap:10,marginTop:14,marginBottom:16},
  statBox:  {flex:1,borderRadius:12,padding:10,alignItems:'center',borderWidth:1},
  statVal:  {fontSize:20,fontWeight:'900'},
  statLbl:  {fontSize:10,marginTop:2},
  listHdr:  {fontSize:13,fontWeight:'700',marginBottom:10},
  row:      {flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1},
  dot:      {width:22,height:22,borderRadius:11,alignItems:'center',justifyContent:'center'},
  rowTitle: {fontSize:13,fontWeight:'600'},
  rowDue:   {fontSize:11,marginTop:2},
  pill:     {paddingHorizontal:8,paddingVertical:4,borderRadius:8},
  pillTxt:  {fontSize:11,fontWeight:'700'},
  closeBtn: {marginTop:18,padding:14,borderRadius:14,alignItems:'center'},
  closeTxt: {color:'#fff',fontWeight:'800',fontSize:14},
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AssignmentDashboard({ student, year, division, assignments: passedAssignments, onBack }) {
  // ✅ FIXED: correctly destructure { isDark, colors } from ThemeContext
  const { isDark, colors } = useContext(ThemeContext);
  const C = colors;

  // ── Subject / assignment state ──────────────────────────────────────────
  const [subjects,   setSubjects]   = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Builds subject rows from a raw assignments array.
  // Derives subjects from assignment.subject fields (not student.subjects[])
  // so data always shows even when student profile subjects are empty.
  const buildSubjects = (rawAssignments) => {
    const sid = String(student._id || student.id || '');

    // Unique subject names from the assignments themselves
    const fromAssignments = [...new Set(rawAssignments.map(a => a.subject).filter(Boolean))];
    // Supplement with anything on the student profile
    const labSet      = new Set(student.lab || []);
    const profileSubs = [...(student.subjects || []), ...(student.lab || [])];
    const allNames    = [...new Set([...fromAssignments, ...profileSubs])];

    return allNames.map((name, i) => ({
      code:  name,
      name:  name,
      color: SUB_COLORS[i % SUB_COLORS.length],
      icon:  SUB_ICONS[i % SUB_ICONS.length],
      isLab: labSet.has(name),
      assignments: rawAssignments
        .filter(a => a.subject === name)
        .map(a => ({
          id:     a._id,
          title:  a.title,
          due:    a.dueDate || 'N/A',
          status: (a.submissions || []).some(s => String(s.studentId) === sid)
                  ? 'submitted' : 'pending',
        })),
    }));
  };

  useEffect(() => {
    // ── Path A: parent (StudentList) already fetched — use directly, zero extra requests
    if (Array.isArray(passedAssignments)) {
      setSubjects(buildSubjects(passedAssignments));
      setIsLoading(false);
      return;
    }

    // ── Path B: opened standalone (deep-link / direct mount) — fetch independently
    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const yearNum = typeof year === 'string' ? year.replace(/\D/g, '') : String(year || '');
        const res     = await axiosInstance.get('/assignments', {
          params: { year: yearNum, division: division || '' },
        });
        const raw = res.data?.data || res.data || [];
        setSubjects(buildSubjects(Array.isArray(raw) ? raw : []));
      } catch (err) {
        console.error('AssignmentDashboard fetch error:', err.message);
        setFetchError(err.message);
        setSubjects(buildSubjects([]));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [student._id, student.id, passedAssignments]);
  // ──────────────────────────────────────────────────────────────────────

  const allA     = subjects.flatMap(s=>s.assignments);
  const overall  = calcStats(allA);
  const oColor   = pctColor(overall.pct);
  // attendance may be null — fall back to neutral colour
  const att    = student.attendance;
  const aColor = att != null
    ? (att >= 75 ? S.green : att >= 50 ? S.yellow : S.red)
    : '#888';

  const [modalSub, setModalSub]   = useState(null);
  const [modalOpen,setModalOpen]  = useState(false);
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(()=>{
    Animated.timing(fadeIn,{toValue:1,duration:500,useNativeDriver:true}).start();
  },[]);

  return (
    <View style={[d.root,{backgroundColor:C.bg}]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bg}/>

      {/* Top Bar */}
      <View style={[d.topBar, { borderBottomColor: C.border, backgroundColor: C.bg }]}>
        <TouchableOpacity onPress={onBack} style={[d.backBtn, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={{fontSize:18,fontWeight:'700',color:C.textSec}}>←</Text>
        </TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={[d.brandName, { color: C.textPrim }]}>UniVerse</Text>
          <Text style={[d.brandSub, { color: C.textSec }]}>Student Portal</Text>
        </View>
        <View style={[d.attPill,{backgroundColor:aColor+'20',borderColor:aColor+'50'}]}>
          <Text style={[d.attTxt,{color:aColor}]}>
            Attendance {att != null ? `${att}%` : '—'}
          </Text>
        </View>
      </View>

      {/* Error banner — only shown on standalone fallback failure */}
      {fetchError && !isLoading && (
        <View style={{
          marginHorizontal: 16, marginTop: 8, padding: 10,
          backgroundColor: '#ff525218', borderRadius: 10,
          borderWidth: 1, borderColor: '#ff5252',
          flexDirection: 'row', alignItems: 'center', gap: 8,
        }}>
          <Text style={{ fontSize: 14 }}>⚠️</Text>
          <Text style={{ color: '#ff5252', fontSize: 12, flex: 1 }}>
            Could not load assignments. Showing available data.
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:50}}>
        <Animated.View style={{opacity:fadeIn}}>

          {/* Banner */}
          <View style={[d.banner, { borderBottomColor: C.border, backgroundColor: C.surfaceAlt }]}>
            <View style={{flex:1}}>
              <Text style={[d.welcome, { color: C.textPrim }]}>Welcome back,{'\n'}{student.name} 👋</Text>
              <Text style={[d.dept, { color: C.textSec }]}>Department of Computer Science & Engineering</Text>
              <Text style={[d.prn, { color: C.textSec }]}>PRN: {student.rollNo||student.id} · {year} · Division {division}</Text>
            </View>
            <View style={[d.avatarBig,{backgroundColor:aColor+'20',borderColor:aColor+'50'}]}>
              <Text style={[d.avatarLetter,{color:aColor}]}>{student.name.charAt(0)}</Text>
            </View>
          </View>

          {/* 3 stat cards */}
          <View style={d.cardRow}>
            {[
              {icon:'📋',label:'Total\nAssignments',    value:overall.total,                              color:C.accentBlue, hint:`across ${subjects.length} subjects`, hintColor:C.textSec,  showBar:false},
              {icon:'✅',label:'Submitted\nAssignments',value:overall.submitted,                          color:S.green,      hint:`${overall.pct}% Success`, hintColor:C.textSec, showBar:true},
              {icon:'⏳',label:'Pending\nAssignments',  value:String(overall.pending).padStart(2,'0'),    color:S.orange,     hint:`${overall.pending} remaining`, hintColor:S.red, showBar:false},
            ].map((c,i)=>(
              <View key={i} style={[d.statCard, { backgroundColor: C.surface, borderColor: c.color+'44' }]}>
                <View style={d.cardTop}>
                  <Text style={d.cardIcon}>{c.icon}</Text>
                  <Text style={[d.cardLabel,{color:C.textSec}]}>{c.label}</Text>
                </View>
                <Text style={[d.cardNum,{color:c.color}]}>{c.value}</Text>
                {c.showBar
                  ?<View style={{gap:4}}><ProgressBar pct={overall.pct} color={S.green} height={4} borderColor={C.border}/><Text style={[d.cardHint,{color:c.hintColor}]}>{c.hint}</Text></View>
                  :<Text style={[d.cardHint,{color:c.hintColor}]}>{c.hint}</Text>
                }
              </View>
            ))}
          </View>

          {/* Progress per subject */}
          <View style={d.section}>
            <View style={d.sectionHdr}>
              <Text style={[d.sectionTitle, { color: C.textPrim }]}>Assignment Progress</Text>
              <Text style={[d.viewAll,{color:C.accentBlue}]}>{subjects.length} Subjects</Text>
            </View>
            {isLoading ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <ActivityIndicator size="large" color={C.accentBlue} />
                <Text style={{ color: C.textSec, marginTop: 10, fontSize: 12 }}>Loading subjects & assignments…</Text>
              </View>
            ) : subjects.length === 0 ? (
              <View style={[d.emptyRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={{ fontSize: 26 }}>📚</Text>
                <Text style={[d.emptyTxt, { color: C.textSec }]}>No subjects found for this student.</Text>
              </View>
            ) : subjects.map((sub,idx)=>{
              const stats=calcStats(sub.assignments);
              return (
                <TouchableOpacity key={sub.code} activeOpacity={0.8}
                  onPress={()=>{setModalSub(sub);setModalOpen(true);}}
                  style={[d.progressRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <View style={d.progressLeft}>
                    <Text style={{fontSize:16}}>{sub.icon}</Text>
                    <Text style={[d.progressName, { color: C.textPrim }]}>{sub.name}</Text>
                  </View>
                  <View style={d.progressRight}>
                    <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                      <ProgressBar pct={stats.pct} color={sub.color} height={6} delay={idx*100} borderColor={C.border}/>
                      <Text style={[d.progressFrac,{color:C.textSec}]}>{stats.submitted}/{stats.total}</Text>
                    </View>
                    <Text style={[d.progressDone,{color:C.textSec}]}>completed</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Overall card */}
          <View style={[d.overallCard,{backgroundColor:C.surface,borderColor:C.border}]}>
            <View style={d.overallTop}>
              <Text style={[d.overallLbl,{color:C.textSec}]}>Overall Submission Rate</Text>
              <Text style={[d.overallPct,{color:oColor}]}>{overall.pct}%</Text>
            </View>
            <ProgressBar pct={overall.pct} color={oColor} height={10} borderColor={C.border}/>
            <Text style={[d.overallSub,{color:C.textSec}]}>{overall.submitted} of {overall.total} submitted · {overall.pending} still pending</Text>
          </View>

        </Animated.View>
      </ScrollView>

      <SubjectModal sub={modalSub} visible={modalOpen} onClose={()=>setModalOpen(false)}/>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const d = StyleSheet.create({
  root: {flex:1},

  topBar:    {paddingTop:20,paddingHorizontal:16,paddingBottom:14,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1},
  backBtn:   {width:36,height:36,borderRadius:10,borderWidth:1,alignItems:'center',justifyContent:'center'},
  brandName: {fontSize:16,fontWeight:'900',letterSpacing:0.3},
  brandSub:  {fontSize:10,marginTop:1},
  attPill:   {borderRadius:10,paddingHorizontal:10,paddingVertical:6,borderWidth:1},
  attTxt:    {fontSize:11,fontWeight:'700'},

  banner:       {flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingTop:18,paddingBottom:18,borderBottomWidth:1},
  welcome:      {fontSize:17,fontWeight:'900',lineHeight:24,marginBottom:6},
  dept:         {fontSize:11,marginTop:2},
  prn:          {fontSize:11,marginTop:2},
  avatarBig:    {width:64,height:64,borderRadius:32,borderWidth:2,alignItems:'center',justifyContent:'center',marginLeft:12},
  avatarLetter: {fontSize:26,fontWeight:'900'},

  cardRow:   {flexDirection:'row',paddingHorizontal:12,paddingTop:16,gap:8},
  statCard:  {flex:1,borderRadius:16,padding:12,borderWidth:1,gap:6},
  cardTop:   {flexDirection:'row',alignItems:'flex-start',gap:5},
  cardIcon:  {fontSize:14},
  cardLabel: {fontSize:10,fontWeight:'600',flex:1,lineHeight:14},
  cardNum:   {fontSize:27,fontWeight:'900',letterSpacing:-1},
  cardHint:  {fontSize:10,fontWeight:'600'},

  section:      {paddingHorizontal:16,paddingTop:22},
  sectionHdr:   {flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},
  sectionTitle: {fontSize:16,fontWeight:'800'},
  viewAll:      {fontSize:12,fontWeight:'600'},

  progressRow:   {flexDirection:'row',alignItems:'center',borderRadius:14,borderWidth:1,padding:14,gap:10,marginBottom:8},
  progressLeft:  {flexDirection:'row',alignItems:'center',gap:8,width:135},
  progressName:  {fontSize:12,fontWeight:'700',flex:1},
  progressRight: {flex:1,gap:4},
  progressFrac:  {fontSize:11,fontWeight:'700',minWidth:30},
  progressDone:  {fontSize:10},

  overallCard: {marginHorizontal:16,marginTop:16,borderRadius:16,borderWidth:1,padding:16},
  overallTop:  {flexDirection:'row',justifyContent:'space-between',marginBottom:10},
  overallLbl:  {fontSize:13,fontWeight:'700'},
  overallPct:  {fontSize:13,fontWeight:'800'},
  overallSub:  {fontSize:11,marginTop:8},

  emptyRow: {flexDirection:'row',alignItems:'center',gap:12,borderRadius:14,borderWidth:1,padding:20,marginTop:10},
  emptyTxt: {fontSize:13,fontWeight:'600'},
});