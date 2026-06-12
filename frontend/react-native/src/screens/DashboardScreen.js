import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { getUserDashboard } from '../services/reportService';
import { AuthContext } from '../../App';

const { width, height } = Dimensions.get('window');
const DashboardScreen = ({ navigation }) => {
  const { user, signOut } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-width * 0.75));

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await getUserDashboard();
      if (response.success) {
        setDashboardData(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen for screen focus to refresh dashboard data (e.g. after creating a report)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboardData();
    });
    return unsubscribe;
  }, [navigation]);

  const toggleMenu = () => {
    if (isMenuOpen) {
      Animated.timing(slideAnim, {
        toValue: -width * 0.75,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setIsMenuOpen(false));
    } else {
      setIsMenuOpen(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const navigateToScreen = (screenName) => {
    toggleMenu();
    navigation.navigate(screenName);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return '#DC2626'; // Crimson red
      case 'high':
        return '#EA580C'; // Bright Orange
      case 'medium':
        return '#D97706'; // Gold/Amber
      case 'low':
        return '#0D9488'; // Teal
      default:
        return '#4B5563'; // Slate gray
    }
  };

  const stats = dashboardData?.statistics || {
    total_reports: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HOC Dashboard</Text>
        <TouchableOpacity onPress={fetchDashboardData} style={styles.refreshButton}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D32F2F" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Welcome User Card */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userNameText}>{user?.name || 'User'}</Text>
            <Text style={styles.userRoleText}>{user?.role} • ID: {user?.employee_id || 'N/A'}</Text>
          </View>

          {/* Stats Section */}
          <Text style={styles.sectionTitle}>Observation Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, { width: '100%', backgroundColor: '#EFF6FF', borderColor: '#3B82F6' }]}>
              <Text style={[styles.statValue, { color: '#1D4ED8' }]}>{stats.total_reports || 0}</Text>
              <Text style={[styles.statLabel, { color: '#1E40AF' }]}>Total Hazards Reported</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.critical_count || 0}</Text>
                <Text style={[styles.statLabel, { color: '#991B1B' }]}>Critical</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#FFF7ED', borderColor: '#FFEDD5' }]}>
                <Text style={[styles.statValue, { color: '#EA580C' }]}>{stats.high_count || 0}</Text>
                <Text style={[styles.statLabel, { color: '#9A3412' }]}>High</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                <Text style={[styles.statValue, { color: '#D97706' }]}>{stats.medium_count || 0}</Text>
                <Text style={[styles.statLabel, { color: '#92400E' }]}>Medium</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: '#F0FDFA', borderColor: '#CCFBF1' }]}>
                <Text style={[styles.statValue, { color: '#0D9488' }]}>{stats.low_count || 0}</Text>
                <Text style={[styles.statLabel, { color: '#115E59' }]}>Low</Text>
              </View>
            </View>
          </View>

          {/* Recent Reports List */}
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>My Recent Reports</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReportCreation')}>
              <Text style={styles.addNewReportLink}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {dashboardData?.recent_reports && dashboardData.recent_reports.length > 0 ? (
            dashboardData.recent_reports.map((item) => (
              <View key={item.job_id.toString()} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportJobId}>Job ID: #{item.job_id}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                    <Text style={styles.severityText}>{item.severity}</Text>
                  </View>
                </View>
                <Text style={styles.reportFor} numberOfLines={1}>
                  Requirement: {item.job_req_for}
                </Text>
                <Text style={styles.reportObservation} numberOfLines={2}>
                  {item.observations}
                </Text>
                <Text style={styles.reportDate}>
                  Reported on: {new Date(item.created_date).toLocaleDateString()}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hazard reports submitted yet.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('ReportCreation')}
              >
                <Text style={styles.emptyButtonText}>Create First Report</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Sidebar Drawer Menu Overlay */}
      {isMenuOpen && (
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={toggleMenu}>
          <Animated.View
            style={[
              styles.sidebar,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <View style={styles.drawerUserIcon}>
                <Text style={styles.drawerUserInitial}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
              </View>
              <Text style={styles.drawerUserName}>{user?.name || 'User'}</Text>
              <Text style={styles.drawerUserEmail}>{user?.email || ''}</Text>
              <Text style={styles.drawerUserBadge}>{user?.role}</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.drawerMenuItems}>
              <TouchableOpacity style={styles.drawerItem} onPress={toggleMenu}>
                <Text style={styles.drawerItemIcon}>📊</Text>
                <Text style={[styles.drawerItemText, styles.activeItemText]}>My Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => navigateToScreen('ReportCreation')}
              >
                <Text style={styles.drawerItemIcon}>⚠️</Text>
                <Text style={styles.drawerItemText}>Create Hazard Report</Text>
              </TouchableOpacity>

              {/* Admin Only Options */}
              {(user?.role === 'Admin' || user?.role === 'admin') && (
                <>
                  <View style={styles.drawerDivider} />
                  <Text style={styles.drawerSectionHeader}>Admin Console</Text>

                  <TouchableOpacity
                    style={styles.drawerItem}
                    onPress={() => navigateToScreen('VariantMaster')}
                  >
                    <Text style={styles.drawerItemIcon}>⚙️</Text>
                    <Text style={styles.drawerItemText}>Variant Master</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.drawerItem}
                    onPress={() => navigateToScreen('EmployeeMaster')}
                  >
                    <Text style={styles.drawerItemIcon}>👥</Text>
                    <Text style={styles.drawerItemText}>Employee Master</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.drawerDivider} />

              <TouchableOpacity style={[styles.drawerItem, styles.logoutItem]} onPress={handleLogout}>
                <Text style={styles.drawerItemIcon}>🔑</Text>
                <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* Drawer Footer */}
            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>HOC App v1.0.0</Text>
              <Text style={styles.drawerFooterSubtext}>Reliance Industries</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 60,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  menuButton: {
    padding: 5,
  },
  menuIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 5,
  },
  refreshIcon: {
    fontSize: 20,
  },
  scrollContent: {
    padding: 15,
  },
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#D32F2F',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  userNameText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  userRoleText: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 5,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statBox: {
    flex: 0.48,
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
  },
  addNewReportLink: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportJobId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  severityBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  severityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  reportFor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reportObservation: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 8,
  },
  reportDate: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 15,
  },
  emptyButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  sidebar: {
    width: width * 0.75,
    height: height,
    backgroundColor: '#1F2937', // Dark gray/black background for side drawer
    paddingTop: 50,
    paddingHorizontal: 20,
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 101,
  },
  drawerHeader: {
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    paddingBottom: 20,
  },
  drawerUserIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  drawerUserInitial: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  drawerUserName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerUserEmail: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  drawerUserBadge: {
    backgroundColor: '#10B981',
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 8,
  },
  drawerMenuItems: {
    flex: 1,
  },
  drawerSectionHeader: {
    color: '#9CA3AF',
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 15,
    marginBottom: 10,
    paddingLeft: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  drawerItemIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  drawerItemText: {
    color: '#D1D5DB',
    fontSize: 15,
    fontWeight: '500',
  },
  activeItemText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 10,
  },
  logoutItem: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutText: {
    color: '#EF4444',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 15,
    paddingBottom: 30,
    alignItems: 'center',
  },
  drawerFooterText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  drawerFooterSubtext: {
    color: '#6B7280',
    fontSize: 10,
    marginTop: 2,
  },
});

export default DashboardScreen;
