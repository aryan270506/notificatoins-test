
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axiosInstance from '../../../Src/Axios';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    assignment: true,
    quiz: true,
    attendance: true,
    timetable: true,
    messages: true,
    doubts: true,
    examResults: true,
    finance: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load notification settings from backend
      const response = await axios.get('/api/user/notification-settings');
      if (response.data.settings) {
        setSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      
      // Save to backend
      await axios.put('/api/user/notification-settings', {
        [key]: value,
      });
    } catch (error) {
      console.error('Error updating setting:', error);
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: !value }));
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const settingItems = [
    {
      key: 'assignment',
      icon: 'document-text',
      title: 'Assignments',
      description: 'New assignments and grades',
      color: '#F5A623',
    },
    {
      key: 'quiz',
      icon: 'help-circle',
      title: 'Quizzes',
      description: 'New quizzes and results',
      color: '#7B61FF',
    },
    {
      key: 'attendance',
      icon: 'checkmark-circle',
      title: 'Attendance',
      description: 'Daily attendance updates',
      color: '#50C878',
    },
    {
      key: 'timetable',
      icon: 'calendar',
      title: 'Timetable',
      description: 'Schedule changes and updates',
      color: '#FF6B6B',
    },
    {
      key: 'messages',
      icon: 'chatbubble',
      title: 'Messages',
      description: 'New messages and announcements',
      color: '#4A90E2',
    },
    {
      key: 'doubts',
      icon: 'bulb',
      title: 'Doubts',
      description: 'Replies to your doubts',
      color: '#FFD700',
    },
    {
      key: 'examResults',
      icon: 'trophy',
      title: 'Exam Results',
      description: 'New exam marks and reports',
      color: '#E74C3C',
    },
    {
      key: 'finance',
      icon: 'cash',
      title: 'Finance',
      description: 'Fee reminders and receipts',
      color: '#27AE60',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <Text style={styles.headerSubtitle}>
          Manage which notifications you want to receive
        </Text>
      </View>

      {/* Master Toggle */}
      <View style={styles.masterToggle}>
        <View style={styles.masterToggleContent}>
          <Ionicons name="notifications" size={24} color="#4A90E2" />
          <View style={styles.masterToggleText}>
            <Text style={styles.masterToggleTitle}>All Notifications</Text>
            <Text style={styles.masterToggleSubtitle}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
        </View>
        <Switch
          value={settings.enabled}
          onValueChange={value => updateSetting('enabled', value)}
          trackColor={{ false: '#D1D1D6', true: '#4A90E2' }}
          thumbColor="#FFF"
        />
      </View>

      {/* Individual Settings */}
      {settingItems.map((item, index) => (
        <View
          key={item.key}
          style={[
            styles.settingItem,
            index === settingItems.length - 1 && styles.lastSettingItem,
          ]}
        >
          <View style={styles.settingContent}>
            <View
              style={[styles.settingIcon, { backgroundColor: item.color + '20' }]}
            >
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <View style={styles.settingText}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingDescription}>{item.description}</Text>
            </View>
          </View>
          <Switch
            value={settings[item.key] && settings.enabled}
            onValueChange={value => updateSetting(item.key, value)}
            disabled={!settings.enabled}
            trackColor={{ false: '#D1D1D6', true: item.color }}
            thumbColor="#FFF"
          />
        </View>
      ))}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle" size={20} color="#666" />
        <Text style={styles.infoText}>
          You can manage notification permissions in your device settings
        </Text>
      </View>

      {/* Test Notification Button */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={async () => {
          try {
            await axios.post('/notifications/test');
            Alert.alert('Success', 'Test notification sent!');
          } catch (error) {
            Alert.alert('Error', 'Failed to send test notification');
          }
        }}
      >
        <Ionicons name="send" size={20} color="#FFF" />
        <Text style={styles.testButtonText}>Send Test Notification</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  masterToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    marginTop: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  masterToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterToggleText: {
    marginLeft: 15,
  },
  masterToggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  masterToggleSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastSettingItem: {
    borderBottomWidth: 0,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 15,
    margin: 15,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 15,
    margin: 15,
    borderRadius: 10,
  },
  testButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default NotificationSettings;
