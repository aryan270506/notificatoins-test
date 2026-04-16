import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Animated,
  StatusBar,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import axiosInstance from '../../../Src/Axios';

// ─── Stat Card ────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, valueColor, iconEmoji, delay = 0 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 450, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.statCard, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.statIconWrap}>
        <Text style={styles.statIcon}>{iconEmoji}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, valueColor && { color: valueColor }]}>
          {value}
        </Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </Animated.View>
  );
};

// ─── Teacher Management Dashboard ────────────────────────────────────────
const TeacherManagementDashboard = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/teachers');
      setTeachers(response.data || []);
      setStats({
        total: response.data?.length || 0,
        active: response.data?.filter(t => t.isActive)?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewDetails = (teacher) => {
    setSelectedTeacher(teacher);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📚 Teacher Management</Text>
          <Text style={styles.headerSubtitle}>
            Monitor and manage all teachers
          </Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard
            title="Total Teachers"
            value={stats.total.toString()}
            iconEmoji="👨‍🏫"
            delay={100}
          />
          <StatCard
            title="Active"
            value={stats.active.toString()}
            valueColor="#4ade80"
            iconEmoji="✅"
            delay={200}
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or ID..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Teachers List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fbbf24" />
          </View>
        ) : (
          <View style={styles.teachersList}>
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => (
                <TouchableOpacity
                  key={teacher._id}
                  style={styles.teacherCard}
                  onPress={() => handleViewDetails(teacher)}
                >
                  <View style={styles.teacherCardHeader}>
                    <Text style={styles.teacherName}>{teacher.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: teacher.isActive ? '#4ade80' : '#ef4444' },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {teacher.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.teacherId}>ID: {teacher.id}</Text>
                  {teacher.divisions && (
                    <Text style={styles.teacherMeta}>
                      Divisions: {teacher.divisions.join(', ')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No teachers found' : 'No teachers available'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Teacher Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </Pressable>
            {selectedTeacher && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>{selectedTeacher.name}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID:</Text>
                  <Text style={styles.detailValue}>{selectedTeacher.id}</Text>
                </View>
                {selectedTeacher.divisions && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Divisions:</Text>
                    <Text style={styles.detailValue}>
                      {selectedTeacher.divisions.join(', ')}
                    </Text>
                  </View>
                )}
                {selectedTeacher.subjects && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subjects:</Text>
                    <Text style={styles.detailValue}>
                      {Object.values(selectedTeacher.subjects)
                        .flat()
                        .join(', ')}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  statsRow: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  statCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#fbbf24',
  },
  statIconWrap: {
    marginRight: 12,
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 32,
  },
  statContent: {
    flex: 1,
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fbbf24',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  loadingContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teachersList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  teacherCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  teacherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  teacherId: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  teacherMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingBottom: 16,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
});

export default TeacherManagementDashboard;