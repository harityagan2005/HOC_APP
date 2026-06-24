import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  StatusBar,
  RefreshControl,
  Platform,
  PixelRatio,
} from 'react-native';
import { getUserDashboard } from '../services/reportService';
import { AuthContext } from '../../App';

// ─── Responsive Utilities ────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375; // design baseline (iPhone SE / 6 / 7 / 8)

/** Scale a pixel value relative to screen width */
const rs = (size) => Math.round((W / BASE_W) * size);

/** Responsive font — width-scaled + pixel-perfect rounding */
const rf = (size) => PixelRatio.roundToNearestPixel((W / BASE_W) * size);

/** Width percentage */
const wp = (pct) => (W * pct) / 100;

/** Height percentage */
const hp = (pct) => (H * pct) / 100;

const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

// ─── Theme ──────────────────────────────────────────────────────────
const BLUE_DARK   = '#0D2B6E';
const BLUE_ACCENT = '#2563EB';
const BG          = '#F0F4F8';
const CARD_BG     = '#FFFFFF';
const TEXT_DARK   = '#1E293B';
const TEXT_GRAY   = '#64748B';
const TEXT_LIGHT  = '#94A3B8';
const BORDER      = '#E2E8F0';

// ─── KPI Card ───────────────────────────────────────────────────────
const KpiCard = ({ label, value, subtitle, icon }) => (
  <View style={kpiStyles.card}>
    <View style={kpiStyles.topRow}>
      <Text style={kpiStyles.label} numberOfLines={1}>{label}</Text>
      {icon ? <Text style={kpiStyles.icon}>{icon}</Text> : null}
    </View>
    <Text style={kpiStyles.value}>{value}</Text>
    <Text style={kpiStyles.subtitle} numberOfLines={2}>{subtitle}</Text>
  </View>
);

const kpiStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: rs(10),
    padding: wp(3.8),
    marginHorizontal: wp(1.3),
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(1) },
    shadowOpacity: 0.06,
    shadowRadius: rs(3),
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.8),
  },
  label: {
    flex: 1,
    fontSize: rf(10),
    fontWeight: '700',
    color: TEXT_GRAY,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  icon: { fontSize: rf(17), marginLeft: wp(1) },
  value: {
    fontSize: rf(34),
    fontWeight: '800',
    color: TEXT_DARK,
    marginBottom: hp(0.4),
    includeFontPadding: false,
  },
  subtitle: { fontSize: rf(10), color: TEXT_LIGHT, lineHeight: rf(14) },
});

// ─── Severity Row ────────────────────────────────────────────────────
const SeverityRow = ({ label, count, color }) => (
  <View style={sevStyles.row}>
    <View style={[sevStyles.dot, { backgroundColor: color }]} />
    <Text style={sevStyles.label}>{label}</Text>
    <View style={[sevStyles.badge, { backgroundColor: color + '18' }]}>
      <Text style={[sevStyles.count, { color }]}>{count}</Text>
    </View>
  </View>
);

const sevStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  dot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    marginRight: wp(2.5),
    flexShrink: 0,
  },
  label: { flex: 1, fontSize: rf(13), fontWeight: '600', color: TEXT_DARK },
  badge: {
    minWidth: rs(32),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: rs(12),
    alignItems: 'center',
  },
  count: { fontSize: rf(12), fontWeight: '800' },
});

// ─── Main Dashboard ──────────────────────────────────────────────────
const DashboardScreen = ({ navigation }) => {
  const { user, signOut } = useContext(AuthContext);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isMenuOpen, setIsMenuOpen]   = useState(false);
  const [hazardExpanded, setHazardExpanded] = useState(true);
  const [slideAnim] = useState(new Animated.Value(-W * 0.80));

  const fetchDashboardData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
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
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => fetchDashboardData());
    return unsub;
  }, [navigation]);

  const onRefresh = () => { setRefreshing(true); fetchDashboardData(true); };

  const openMenu = () => {
    setIsMenuOpen(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, { toValue: -W * 0.80, duration: 220, useNativeDriver: true })
      .start(() => setIsMenuOpen(false));
  };

  const navigateToScreen = (screen) => { closeMenu(); navigation.navigate(screen); };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await signOut(); } },
    ]);
  };

  const comingSoon = (name) => { closeMenu(); Alert.alert(name, 'This section is coming soon.'); };

  const stats = dashboardData?.statistics || {
    total_reports: 0, critical_count: 0, high_count: 0, medium_count: 0, low_count: 0,
  };
  const total     = stats.total_reports || 0;
  const openCount = (stats.critical_count || 0) + (stats.high_count || 0);

  const getSeverityColor = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'critical': return '#DC2626';
      case 'high':     return '#EA580C';
      case 'medium':   return '#D97706';
      case 'low':      return '#16A34A';
      default:         return '#64748B';
    }
  };

  const getRelativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 1)  return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)  return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7)  return `${day}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD_BG} translucent={false} />

      {/* App Bar */}
      <View style={s.appBar}>
        <TouchableOpacity
          onPress={openMenu}
          style={s.menuBtn}
          hitSlop={{ top: rs(10), bottom: rs(10), left: rs(10), right: rs(10) }}
        >
          <View style={s.hamburger}>
            <View style={s.hLine} />
            <View style={[s.hLine, { width: rs(14) }]} />
            <View style={s.hLine} />
          </View>
        </TouchableOpacity>

        <View style={s.breadcrumb}>
          <Text style={s.bcGray}>SAFETY</Text>
          <Text style={s.bcSep}> / </Text>
          <Text style={s.bcActive}>MY DASHBOARD</Text>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          hitSlop={{ top: rs(10), bottom: rs(10), left: rs(10), right: rs(10) }}
        >
          <Text style={s.refreshIcon}>⟳</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={BLUE_ACCENT} />
          <Text style={s.loadingText}>Loading dashboard…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BLUE_ACCENT}
              colors={[BLUE_ACCENT]}
            />
          }
        >
          {/* Banner */}
          <View style={s.banner}>
            <View style={s.bannerContent}>
              <Text style={s.bannerTitle}>HSE Performance Dashboard</Text>
              <Text style={s.bannerSub}>
                Personal safety observations {'&'} closure performance
              </Text>
            </View>
            <View style={s.bannerRight}>
              <View style={s.bannerAvatar}>
                <Text style={s.bannerAvatarText}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
              <Text style={s.bannerUser} numberOfLines={1}>
                {user?.name || 'User'}
              </Text>
            </View>
          </View>

          {/* KPI */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Text style={s.secIcon}>📊</Text>
              <Text style={s.secText}>KEY PERFORMANCE INDICATORS</Text>
            </View>
            <View style={s.kpiRow}>
              <KpiCard label="Total Reported" value={total}     subtitle="All logged observations" icon="📋" />
              <KpiCard label="Open"           value={openCount} subtitle="Pending closure"          icon="🔔" />
            </View>
          </View>

          {/* Severity */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Text style={s.secIcon}>⚠️</Text>
              <Text style={s.secText}>SEVERITY BREAKDOWN</Text>
            </View>
            <View style={s.card}>
              <SeverityRow label="Critical" count={stats.critical_count || 0} color="#DC2626" />
              <SeverityRow label="High"     count={stats.high_count     || 0} color="#EA580C" />
              <SeverityRow label="Medium"   count={stats.medium_count   || 0} color="#D97706" />
              <SeverityRow label="Low"      count={stats.low_count      || 0} color="#16A34A" />
            </View>
          </View>

          {/* Quick Actions */}
          <View style={s.sectionBlock}>
            <View style={s.sectionHeader}>
              <Text style={s.secIcon}>⚡</Text>
              <Text style={s.secText}>QUICK ACTIONS</Text>
            </View>
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={[s.actionBtn, { borderColor: BLUE_ACCENT + '60' }]}
                onPress={() => navigation.navigate('ReportCreation')}
                activeOpacity={0.75}
              >
                <Text style={s.actionIcon}>⚠️</Text>
                <Text style={s.actionLabel}>{'New Hazard\nReport'}</Text>
              </TouchableOpacity>

              {(user?.role === 'Admin' || user?.role === 'admin') && (
                <>
                  <TouchableOpacity
                    style={[s.actionBtn, { borderColor: '#7C3AED60' }]}
                    onPress={() => navigation.navigate('VariantMaster')}
                    activeOpacity={0.75}
                  >
                    <Text style={s.actionIcon}>⚙️</Text>
                    <Text style={s.actionLabel}>{'Variant\nMaster'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, { borderColor: '#0891B260' }]}
                    onPress={() => navigation.navigate('EmployeeMaster')}
                    activeOpacity={0.75}
                  >
                    <Text style={s.actionIcon}>👥</Text>
                    <Text style={s.actionLabel}>{'Employee\nMaster'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Recent Reports */}
          <View style={s.sectionBlock}>
            <View style={[s.sectionHeader, { marginBottom: 0 }]}>
              <Text style={s.secIcon}>📝</Text>
              <Text style={[s.secText, { flex: 1 }]}>RECENT REPORTS</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ReportCreation')}>
                <Text style={s.addLink}>+ Add New</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: hp(1.5) }}>
              {dashboardData?.recent_reports?.length > 0 ? (
                dashboardData.recent_reports.map((item) => {
                  const col = getSeverityColor(item.severity);
                  return (
                    <View key={item.job_id.toString()} style={s.reportCard}>
                      <View style={[s.reportAccent, { backgroundColor: col }]} />
                      <View style={s.reportBody}>
                        <View style={s.reportTopRow}>
                          <Text style={s.reportId}>#{item.job_id}</Text>
                          <View style={[s.sevPill, { backgroundColor: col + '18' }]}>
                            <View style={[s.sevDot, { backgroundColor: col }]} />
                            <Text style={[s.sevText, { color: col }]}>{item.severity}</Text>
                          </View>
                        </View>
                        <Text style={s.reportFor}  numberOfLines={1}>{item.job_req_for}</Text>
                        <Text style={s.reportObs}  numberOfLines={2}>{item.observations}</Text>
                        <Text style={s.reportTime}>{getRelativeTime(item.created_date)}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={s.emptyCard}>
                  <Text style={s.emptyIcon}>📝</Text>
                  <Text style={s.emptyTitle}>No Reports Yet</Text>
                  <Text style={s.emptySub}>
                    Start by creating your first hazard observation report
                  </Text>
                  <TouchableOpacity
                    style={s.emptyBtn}
                    onPress={() => navigation.navigate('ReportCreation')}
                  >
                    <Text style={s.emptyBtnText}>Create Report</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={{ height: hp(4) }} />
        </ScrollView>
      )}

      {/* Sidebar Drawer */}
      {isMenuOpen && (
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={closeMenu}>
          <Animated.View style={[s.sidebar, { transform: [{ translateX: slideAnim }] }]}>
            <TouchableOpacity activeOpacity={1}>

              {/* Header */}
              <View style={s.sbHead}>
                <View style={s.sbAvatar}>
                  <Text style={s.sbAvatarText}>
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sbName}   numberOfLines={1}>{user?.name  || 'User'}</Text>
                  <Text style={s.sbEmail}  numberOfLines={1}>{user?.email || ''}</Text>
                </View>
              </View>

              <Text style={s.modulesLabel}>Modules</Text>

              {/* Hazard */}
              <TouchableOpacity
                style={s.moduleRow}
                onPress={() => setHazardExpanded(!hazardExpanded)}
                activeOpacity={0.7}
              >
                <Text style={s.moduleIcon}>⚠️</Text>
                <Text style={s.moduleTitle}>Hazard</Text>
                <Text style={s.moduleChevron}>{hazardExpanded ? '∧' : '∨'}</Text>
              </TouchableOpacity>

              {hazardExpanded && (
                <View style={s.subGroup}>
                  <TouchableOpacity style={s.subItem} onPress={() => comingSoon('Executive Dashboard')} activeOpacity={0.7}>
                    <Text style={s.subArrow}>→</Text>
                    <Text style={s.subLabel}>Executive Dashboard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.subItem, s.subActive]} onPress={closeMenu} activeOpacity={0.7}>
                    <Text style={s.subArrow}>→</Text>
                    <Text style={[s.subLabel, s.subLabelActive]}>My Dashboard</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.subItem} onPress={() => { closeMenu(); navigation.navigate('ReportCreation'); }} activeOpacity={0.7}>
                    <Text style={s.subArrow}>→</Text>
                    <Text style={s.subLabel}>My Safety Actions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.subItem} onPress={() => comingSoon('Reports')} activeOpacity={0.7}>
                    <Text style={s.subArrow}>→</Text>
                    <Text style={s.subLabel}>Reports</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Action Tracker */}
              <TouchableOpacity style={s.moduleRow} onPress={() => comingSoon('Action Tracker')} activeOpacity={0.7}>
                <Text style={s.moduleIcon}>☑️</Text>
                <Text style={s.moduleTitle}>Action Tracker</Text>
                <Text style={s.moduleChevron}>∨</Text>
              </TouchableOpacity>

              {(user?.role === 'Admin' || user?.role === 'admin') && (
                <>
                  <View style={s.divider} />
                  <Text style={s.adminLabel}>ADMIN</Text>
                  <TouchableOpacity style={s.subItem} onPress={() => navigateToScreen('VariantMaster')} activeOpacity={0.7}>
                    <Text style={s.subArrow}>⚙️</Text>
                    <Text style={s.subLabel}>Variant Master</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.subItem} onPress={() => navigateToScreen('EmployeeMaster')} activeOpacity={0.7}>
                    <Text style={s.subArrow}>👥</Text>
                    <Text style={s.subLabel}>Employee Master</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={s.divider} />
              <TouchableOpacity style={s.subItem} onPress={handleLogout} activeOpacity={0.7}>
                <Text style={s.subArrow}>🚪</Text>
                <Text style={[s.subLabel, { color: '#DC2626' }]}>Logout</Text>
              </TouchableOpacity>

              <View style={s.sbFooter}>
                <Text style={s.sbFooterText}>HOC App v1.0</Text>
                <Text style={s.sbFooterSub}>Reliance Industries • KG-D6</Text>
              </View>

            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: BG },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: TEXT_GRAY, marginTop: hp(1.5), fontSize: rf(13) },

  // App Bar
  appBar: {
    height: Platform.OS === 'ios' ? hp(11.5) : hp(7.2) + STATUSBAR_H,
    paddingTop: Platform.OS === 'ios' ? hp(5.5) : STATUSBAR_H,
    backgroundColor: CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4.3),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: rs(2),
  },
  menuBtn:     { padding: rs(6) },
  hamburger:   { gap: rs(5) },
  hLine:       { width: rs(22), height: rs(2), backgroundColor: TEXT_DARK, borderRadius: rs(1) },
  breadcrumb:  { flexDirection: 'row', alignItems: 'center' },
  bcGray:      { fontSize: rf(11), fontWeight: '600', color: TEXT_GRAY },
  bcSep:       { fontSize: rf(11), color: TEXT_LIGHT },
  bcActive:    { fontSize: rf(11), fontWeight: '800', color: BLUE_DARK },
  refreshIcon: { fontSize: rf(20), color: TEXT_GRAY },

  scroll: { paddingBottom: hp(2) },

  // Banner
  banner: {
    backgroundColor: BLUE_DARK,
    paddingHorizontal: wp(5.3),
    paddingVertical: hp(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerContent:    { flex: 1, marginRight: wp(3) },
  bannerTitle:      { fontSize: rf(19), fontWeight: '800', color: '#FFFFFF', marginBottom: hp(0.7), includeFontPadding: false },
  bannerSub:        { fontSize: rf(11.5), color: '#93C5FD', lineHeight: rf(17) },
  bannerRight:      { alignItems: 'center' },
  bannerAvatar: {
    width: wp(11.7),
    height: wp(11.7),
    borderRadius: wp(5.85),
    backgroundColor: BLUE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: rs(2),
    borderColor: '#93C5FD',
    marginBottom: hp(0.5),
  },
  bannerAvatarText: { fontSize: rf(17), fontWeight: '800', color: '#fff', includeFontPadding: false },
  bannerUser:       { fontSize: rf(9.5), color: '#93C5FD', fontWeight: '600', maxWidth: wp(18), textAlign: 'center' },

  // Section
  sectionBlock:  { marginTop: hp(2.5), paddingHorizontal: wp(4.3) },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(1.5) },
  secIcon:       { fontSize: rf(13), marginRight: wp(2) },
  secText:       { fontSize: rf(10), fontWeight: '800', color: TEXT_GRAY, letterSpacing: 0.9, flex: 1 },
  addLink:       { fontSize: rf(12), fontWeight: '700', color: BLUE_ACCENT },

  // KPI row
  kpiRow: { flexDirection: 'row', marginHorizontal: -wp(1.3) },

  // Generic card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: rs(10),
    padding: wp(4.3),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: rs(2),
  },

  // Quick Actions
  actionsRow: { flexDirection: 'row', gap: wp(2.7) },
  actionBtn: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: rs(10),
    paddingVertical: hp(2),
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: rs(2),
  },
  actionIcon:  { fontSize: rf(24), marginBottom: hp(0.9) },
  actionLabel: { fontSize: rf(10.5), fontWeight: '700', color: TEXT_DARK, textAlign: 'center', lineHeight: rf(15) },

  // Report cards
  reportCard: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: rs(8),
    marginBottom: hp(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: rs(2),
  },
  reportAccent:  { width: rs(4) },
  reportBody:    { flex: 1, padding: wp(3.2) },
  reportTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(0.6) },
  reportId:      { fontSize: rf(13), fontWeight: '800', color: TEXT_DARK },
  sevPill:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: wp(2), paddingVertical: hp(0.35), borderRadius: rs(10) },
  sevDot:        { width: rs(5), height: rs(5), borderRadius: rs(3), marginRight: wp(1.3) },
  sevText:       { fontSize: rf(10), fontWeight: '700' },
  reportFor:     { fontSize: rf(13), fontWeight: '600', color: TEXT_DARK, marginBottom: hp(0.4) },
  reportObs:     { fontSize: rf(11.5), color: TEXT_GRAY, lineHeight: rf(17), marginBottom: hp(0.7) },
  reportTime:    { fontSize: rf(10), color: TEXT_LIGHT, textAlign: 'right' },

  // Empty state
  emptyCard: {
    backgroundColor: CARD_BG,
    borderRadius: rs(10),
    padding: wp(8.5),
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },
  emptyIcon:    { fontSize: rf(36), marginBottom: hp(1.5) },
  emptyTitle:   { fontSize: rf(15), fontWeight: '800', color: TEXT_DARK, marginBottom: hp(0.7) },
  emptySub:     { fontSize: rf(12), color: TEXT_GRAY, textAlign: 'center', marginBottom: hp(2.5), lineHeight: rf(17) },
  emptyBtn:     { backgroundColor: BLUE_ACCENT, borderRadius: rs(8), paddingVertical: hp(1.2), paddingHorizontal: wp(6.4) },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(13) },

  // Sidebar / Drawer
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 100,
  },
  sidebar: {
    width: W * 0.80,
    height: H,
    backgroundColor: CARD_BG,
    paddingTop: Platform.OS === 'ios' ? hp(6.5) : STATUSBAR_H + hp(2),
    position: 'absolute', left: 0, top: 0,
    zIndex: 101,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: BORDER,
  },
  sbHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4.8),
    paddingBottom: hp(2.2),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    marginBottom: hp(1.5),
  },
  sbAvatar: {
    width: wp(10.7),
    height: wp(10.7),
    borderRadius: wp(5.35),
    backgroundColor: BLUE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3.2),
    flexShrink: 0,
  },
  sbAvatarText: { color: '#fff', fontSize: rf(17), fontWeight: '800', includeFontPadding: false },
  sbName:       { fontSize: rf(13.5), fontWeight: '700', color: TEXT_DARK },
  sbEmail:      { fontSize: rf(10.5), color: TEXT_GRAY, marginTop: hp(0.2) },

  modulesLabel: {
    fontSize: rf(10),
    fontWeight: '800',
    color: TEXT_GRAY,
    letterSpacing: 1.2,
    paddingHorizontal: wp(4.8),
    marginBottom: hp(0.8),
    marginTop: hp(0.5),
  },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4.8),
    paddingVertical: hp(1.6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  moduleIcon:    { fontSize: rf(15), marginRight: wp(2.7), width: wp(7) },
  moduleTitle:   { flex: 1, fontSize: rf(13.5), fontWeight: '700', color: TEXT_DARK },
  moduleChevron: { fontSize: rf(11), color: TEXT_GRAY, fontWeight: '700' },

  subGroup: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  subItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(6.4),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1F5F9',
  },
  subActive:      { backgroundColor: '#EFF6FF' },
  subArrow:       { fontSize: rf(12), color: TEXT_GRAY, marginRight: wp(2.7), width: wp(5.3) },
  subLabel:       { fontSize: rf(12.5), color: TEXT_GRAY, fontWeight: '500', flex: 1 },
  subLabelActive: { color: BLUE_ACCENT, fontWeight: '700' },

  adminLabel: {
    fontSize: rf(10),
    fontWeight: '800',
    color: TEXT_LIGHT,
    letterSpacing: 1.5,
    paddingHorizontal: wp(4.8),
    marginTop: hp(0.8),
    marginBottom: hp(0.5),
  },
  divider:  { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: hp(1) },

  sbFooter:     { alignItems: 'center', paddingVertical: hp(2.5), marginTop: hp(1.5), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  sbFooterText: { fontSize: rf(11), color: TEXT_GRAY, fontWeight: '600' },
  sbFooterSub:  { fontSize: rf(10), color: TEXT_LIGHT, marginTop: hp(0.3) },
});

export default DashboardScreen;
