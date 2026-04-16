/**
 * TeacherAssignmentModal.js
 *
 * Component for assigning class teachers to years and divisions
 * Allows admins to manage class teacher assignments for years 1-4 with divisions A, B, C
 */

import React, { useState, useContext, useEffect } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { ThemeContext } from '../dashboard/AdminDashboard';
import axiosInstance from '../../../Src/Axios';

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const DIVISIONS = ['A', 'B', 'C'];

export default function TeacherAssignmentModal({ visible, onClose, onSuccess }) {
  const { colors } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('view'); // 'view' or 'assign'
  const [assignments, setAssignments] = useState({});
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState('1st Year');
  const [selectedDivision, setSelectedDivision] = useState('A');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Fetch assignments and teachers when modal opens
  useEffect(() => {
    if (visible) {
      fetchAssignments();
      fetchTeachers();
    }
  }, [visible]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/teachers/class-teachers');
      if (response.data?.success) {
        setAssignments(response.data.assignments || {});
      }
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      Alert.alert('Error', 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axiosInstance.get('/teachers/all');
      if (response.data?.success) {
        setTeachers(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
    }
  };

  const filteredTeachers = teachers.filter(
    teacher =>
      teacher.name.toLowerCase().includes(searchInput.toLowerCase()) ||
      teacher.id.toLowerCase().includes(searchInput.toLowerCase())
  );

  const handleAssignTeacher = async () => {
    if (!selectedTeacher) {
      Alert.alert('Error', 'Please select a teacher');
      return;
    }

    setAssigning(true);
    try {
      const response = await axiosInstance.post('/teachers/assign-class-teacher', {
        teacherId: selectedTeacher._id,
        year: selectedYear,
        division: selectedDivision,
      });

      if (response.data?.success) {
        Alert.alert('✅ Success', response.data.message);
        setSelectedTeacher(null);
        setSearchInput('');
        setActiveTab('view');
        await fetchAssignments();
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Assignment error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to assign teacher');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (teacherId) => {
    Alert.alert(
      '⚠️ Remove Assignment',
      'Are you sure you want to remove this class teacher assignment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await axiosInstance.delete(`/teachers/class-teachers/${teacherId}`);
              if (response.data?.success) {
                Alert.alert('✅ Success', response.data.message);
                await fetchAssignments();
                if (onSuccess) onSuccess();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove assignment');
            }
          },
        },
      ]
    );
  };

  const getAssignmentKey = (year, division) => `${year}-${division}`;
  const getAssignment = (year, division) => assignments[getAssignmentKey(year, division)];

  const AssignmentGrid = () => (
    <View style={styles.gridContainer}>
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={{ marginTop: 12, color: colors.textMuted, fontSize: 13 }}>
            Loading assignments...
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
          <View>
            {/* Header Row */}
            <View style={[styles.gridRow, styles.gridHeader, { borderBottomColor: colors.border, borderBottomWidth: 2 }]}>
              <View style={[styles.gridCell, styles.headerCell, { width: 110, backgroundColor: colors.bg }]}>
                <Text style={[styles.gridText, styles.headerText, { color: colors.textMuted }]}>Year</Text>
              </View>
              {DIVISIONS.map(div => (
                <View key={div} style={[styles.gridCell, styles.headerCell, { width: 130, backgroundColor: colors.bg }]}>
                  <Text style={[styles.gridText, styles.headerText, { color: colors.textMuted }]}>Div {div}</Text>
                </View>
              ))}
            </View>

            {/* Data Rows */}
            {YEARS.map((year, yearIdx) => (
              <View key={year} style={[styles.gridRow, { borderBottomColor: colors.border }]}>
                {/* Year Label */}
                <View
                  style={[
                    styles.gridCell,
                    styles.yearCell,
                    {
                      width: 110,
                      backgroundColor: yearIdx % 2 === 0 ? colors.bg : colors.surface,
                      borderBottomColor: colors.border,
                      borderRightWidth: 2,
                      borderRightColor: colors.border,
                    },
                  ]}>
                  <Text style={[styles.gridText, { color: colors.textPrim, fontWeight: '700', fontSize: 12 }]}>
                    {year.replace('st ', '').replace('nd ', '').replace('rd ', '').replace('th ', '')}
                  </Text>
                </View>

                {/* Division Cells */}
                {DIVISIONS.map((div, divIdx) => {
                  const assignment = getAssignment(year, div);
                  return (
                    <Pressable
                      key={div}
                      onPress={() => {
                        setSelectedYear(year);
                        setSelectedDivision(div);
                        setActiveTab('assign');
                      }}
                      style={[
                        styles.gridCell,
                        {
                          width: 130,
                          minHeight: 95,
                          backgroundColor: yearIdx % 2 === 0 ? colors.bg : colors.surface,
                          borderBottomColor: colors.border,
                          borderRightWidth: divIdx === DIVISIONS.length - 1 ? 0 : 1,
                          borderRightColor: colors.border,
                          padding: 10,
                        },
                      ]}
                      android_ripple={{ color: '#e2e8f0' }}>
                      {assignment ? (
                        <View style={{ alignItems: 'center', width: '100%', justifyContent: 'center', flex: 1 }}>
                          <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: '700',
                                color: '#10b981',
                                marginBottom: 3,
                                letterSpacing: 0.5,
                              }}>
                              ✓ ASSIGNED
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: colors.textPrim,
                                textAlign: 'center',
                                lineHeight: 16,
                              }}
                              numberOfLines={3}>
                              {assignment.name}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 8, color: colors.textMuted, textAlign: 'center', marginBottom: 8, marginTop: 2 }}>
                            ID: {assignment.teacherId.slice(-6)}
                          </Text>
                          {assignment.assignedAt && (
                            <Text style={{ fontSize: 7, color: colors.textMuted, textAlign: 'center', marginBottom: 6 }}>
                              {new Date(assignment.assignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                          )}
                          <TouchableOpacity
                            onPress={() => handleRemoveAssignment(assignment.teacherId)}
                            hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                            style={{ marginTop: 4 }}>
                            <Text style={{ fontSize: 9, color: '#ef4444', fontWeight: '700' }}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                          <Text style={{ fontSize: 24, color: colors.textMuted, marginBottom: 6 }}>+</Text>
                          <Text style={{ fontSize: 9, color: colors.textMuted, textAlign: 'center', fontWeight: '500' }}>
                            Tap to assign
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  const AssignmentForm = () => (
    <View style={styles.formContainer}>
      {/* Year Selection */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.label, { color: colors.textPrim }]}>Select Year</Text>
        <View style={styles.buttonGroup}>
          {YEARS.map(year => (
            <TouchableOpacity
              key={year}
              onPress={() => setSelectedYear(year)}
              style={[
                styles.groupButton,
                {
                  backgroundColor: selectedYear === year ? '#6366f1' : colors.bg,
                  borderColor: selectedYear === year ? '#6366f1' : colors.border,
                },
              ]}
              activeOpacity={0.75}>
              <Text
                style={{
                  color: selectedYear === year ? '#fff' : colors.textPrim,
                  fontWeight: '700',
                  fontSize: 12,
                }}>
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Division Selection */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.label, { color: colors.textPrim }]}>Select Division</Text>
        <View style={[styles.buttonGroup, { maxWidth: '60%' }]}>
          {DIVISIONS.map(div => (
            <TouchableOpacity
              key={div}
              onPress={() => setSelectedDivision(div)}
              style={[
                styles.groupButton,
                {
                  backgroundColor: selectedDivision === div ? '#6366f1' : colors.bg,
                  borderColor: selectedDivision === div ? '#6366f1' : colors.border,
                  flex: 1,
                },
              ]}
              activeOpacity={0.75}>
              <Text
                style={{
                  color: selectedDivision === div ? '#fff' : colors.textPrim,
                  fontWeight: '700',
                  fontSize: 13,
                }}>
                {div}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selected Class Display */}
      <View
        style={[
          styles.selectedClassBox,
          { backgroundColor: '#6366f1', borderColor: '#6366f1' },
        ]}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
          Selected Class: {selectedYear} - Division {selectedDivision}
        </Text>
      </View>

      {/* Teacher Search */}
      <View style={{ marginTop: 20, marginBottom: 20 }}>
        <Text style={[styles.label, { color: colors.textPrim }]}>Search & Select Teacher</Text>
        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.textPrim,
            },
          ]}
          placeholder="Search by name or ID"
          placeholderTextColor={colors.textMuted}
          value={searchInput}
          onChangeText={setSearchInput}
        />
      </View>

      {/* Teacher List */}
      <FlatList
        data={filteredTeachers}
        keyExtractor={item => item._id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedTeacher(item);
              setSearchInput('');
            }}
            style={[
              styles.teacherCard,
              {
                backgroundColor:
                  selectedTeacher?._id === item._id
                    ? '#6366f1'
                    : colors.bg,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={0.75}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.teacherName,
                  {
                    color: selectedTeacher?._id === item._id ? '#fff' : colors.textPrim,
                  },
                ]}>
                {item.name}
              </Text>
              <Text
                style={[
                  styles.teacherId,
                  {
                    color: selectedTeacher?._id === item._id
                      ? 'rgba(255,255,255,0.7)'
                      : colors.textMuted,
                  },
                ]}>
                ID: {item.id}
              </Text>
            </View>
            {selectedTeacher?._id === item._id && <Text style={{ fontSize: 18 }}>✓</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptySearch}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {searchInput
                ? 'No teachers found'
                : 'Search to find teachers'}
            </Text>
          </View>
        }
      />

      {/* Assign Button */}
      <TouchableOpacity
        onPress={handleAssignTeacher}
        disabled={!selectedTeacher || assigning}
        style={[
          styles.assignButton,
          {
            backgroundColor:
              selectedTeacher && !assigning ? '#10b981' : '#94a3b8',
          },
        ]}
        activeOpacity={0.75}>
        {assigning ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.assignButtonText}>
            ✓ Assign Teacher to {selectedYear} Div {selectedDivision}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.80)', justifyContent: 'flex-end' }}
        onPress={onClose}>
        <Pressable
          style={{
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            borderWidth: 1,
            borderBottomWidth: 0,
            maxHeight: '95%',
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }}
          onPress={() => {}}>
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              alignSelf: 'center',
              marginTop: 12,
              backgroundColor: colors.border,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingTop: 12,
              paddingBottom: 12,
            }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: '#818cf8',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}>
              <Text style={{ fontSize: 18 }}>👨‍🏫</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: colors.textPrim,
                }}>
                Class Teacher Assignment
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  marginTop: 1,
                }}>
                Assign teachers to years 1-4
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.7}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSec }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border }} />

          {/* Tab Buttons */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 12,
              paddingTop: 12,
              paddingBottom: 8,
            }}>
            {['view', 'assign'].map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  marginHorizontal: 4,
                  borderRadius: 10,
                  backgroundColor: activeTab === tab ? '#6366f1' : colors.bg,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor:
                    activeTab === tab ? '#6366f1' : colors.border,
                }}
                activeOpacity={0.75}>
                <Text
                  style={{
                    fontWeight: '700',
                    color: activeTab === tab ? '#fff' : colors.textSec,
                    fontSize: 13,
                  }}>
                  {tab === 'view' ? '📊 View All' : '✏️ Assign New'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 40,
            }}
            showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator color="#6366f1" size="large" />
                <Text
                  style={{
                    marginTop: 12,
                    color: colors.textMuted,
                    fontSize: 13,
                  }}>
                  Loading assignments...
                </Text>
              </View>
            ) : activeTab === 'view' ? (
              <AssignmentGrid />
            ) : (
              <AssignmentForm />
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  groupButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginBottom: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedClassBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 12,
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  teacherName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  teacherId: {
    fontSize: 11,
    marginTop: 2,
  },
  emptySearch: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  assignButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 50,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  gridContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  gridHeader: {
    backgroundColor: '#f8fafc',
  },
  gridCell: {
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 75,
  },
  headerCell: {
    backgroundColor: '#f8fafc',
  },
  yearCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  gridText: {
    fontSize: 12,
    textAlign: 'center',
  },
  headerText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  formContainer: {
    paddingTop: 8,
  },
});
