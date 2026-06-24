import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Dimensions, PixelRatio, Platform, StatusBar,
} from 'react-native'; 
import { getAdminDashboard } from '../services/reportService';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;
const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const SEV_COLOR = { Critical: '#DC2626', High: '#EA580C', Medium: '#D97706', Low: '#16A34A' };

const StatCard = ({ label, value, color, icon }) => (
  <View style={[st.statCard, { borderTopColor: color, borderTopWidth: rs(3) }]}>
    <Text style={st.statIcon}>{icon}</Text>
    <Text style={[st.statValue, { color }]}>{value ?? 0}</Text>
    <Text style={st.statLabel}>{label}</Text>
  </View>
);

const st = StyleSheet.create({
  statCard:  { flex: 1, backgroundColor: '#fff', borderRadius: rs(10), padding: wp(3.5), alignItems: 'center', marginHorizontal: wp(1), elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: rs(2) },
  statIcon:  { fontSize: rf(20), marginBottom: hp(0.6) },
  statValue: { fontSize: rf(28), fontWeight: '900', includeFontPadding: false },
  statLabel: { fontSize: rf(10), color: '#64748B', fontWeight: '600', textAlign: 'center', marginTop: hp(0.4) },
});

const ExecutiveDashboardScreen = ({ navigation }) => {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await getAdminDashboard();
      if (res.success) setData(res.data);
      else Alert.alert('Error', res.message || 'Failed to load admin dashboard');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(true); };

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 1)  return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24)  return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  };

  const stats = data?.statistics || {};

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Executive Dashboard</Text>
        <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.refreshIcon}>⟳</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0D2B6E" />
          <Text style={s.loadingText}>Loading executive data…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D2B6E']} tintColor="#0D2B6E" />}
        >
          {/* Banner */}
          <View style={s.banner}>
            <Text style={s.bannerTitle}>KG-D6 HSE Overview</Text>
            <Text style={s.bannerSub}>All hazard observations across Reliance Industries</Text>
            <View style={s.bannerStats}>
              <View style={s.bannerStat}>
                <Text style={s.bannerStatValue}>{stats.this_month ?? 0}</Text>
                <Text style={s.bannerStatLabel}>This Month</Text>
              </View>
              <View style={s.bannerDivider} />
              <View style={s.bannerStat}>
                <Text style={s.bannerStatValue}>{stats.last_month ?? 0}</Text>
                <Text style={s.bannerStatLabel}>Last Month</Text>
              </View>
              <View style={s.bannerDivider} />
              <View style={s.bannerStat}>
                <Text style={[s.bannerStatValue, { color: '#FCA5A5' }]}>{stats.stop_job_count ?? 0}</Text>
                <Text style={s.bannerStatLabel}>Stop Jobs</Text>
              </View>
            </View>
          </View>

          {/* Total KPI */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionIcon}>📊</Text>
              <Text style={s.sectionTitle}>KEY PERFORMANCE INDICATORS</Text>
            </View>
            <View style={s.totalCard}>
              <Text style={s.totalValue}>{stats.total_reports ?? 0}</Text>
              <Text style={s.totalLabel}>Total Reports Submitted</Text>
            </View>
          </View>

          {/* Severity grid */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionIcon}>⚠️</Text>
              <Text style={s.sectionTitle}>SEVERITY BREAKDOWN</Text>
            </View>
            <View style={s.statRow}>
              <StatCard label="Critical" value={stats.critical_count} color="#DC2626" icon="🔴" />
              <StatCard label="High"     value={stats.high_count}     color="#EA580C" icon="🟠" />
            </View>
            <View style={[s.statRow, { marginTop: hp(1.2) }]}>
              <StatCard label="Medium"   value={stats.medium_count}   color="#D97706" icon="🟡" />
              <StatCard label="Low"      value={stats.low_count}      color="#16A34A" icon="🟢" />
            </View>
          </View>

          {/* Status breakdown */}
          {data?.status_breakdown?.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionIcon}>📋</Text>
                <Text style={s.sectionTitle}>STATUS BREAKDOWN</Text>
              </View>
              <View style={s.card}>
                {data.status_breakdown.map((row, i) => {
                  const pct = stats.total_reports > 0 ? Math.round((row.count / stats.total_reports) * 100) : 0;
                  return (
                    <View key={i} style={s.statusRow}>
                      <Text style={s.statusName}>{row.status_name}</Text>
                      <View style={s.statusBarWrap}>
                        <View style={[s.statusBar, { width: `${pct}%`, backgroundColor: '#0D2B6E' }]} />
                      </View>
                      <Text style={s.statusCount}>{row.count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Top reporters */}
          {data?.top_reporters?.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionIcon}>🏆</Text>
                <Text style={s.sectionTitle}>TOP REPORTERS</Text>
              </View>
              <View style={s.card}>
                {data.top_reporters.map((rep, i) => (
                  <View key={i} style={[s.reporterRow, i < data.top_reporters.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' }]}>
                    <View style={[s.rankBadge, i === 0 && { backgroundColor: '#FEF3C7' }]}>
                      <Text style={s.rankText}>{i + 1}</Text>
                    </View>
                    <View style={s.reporterInfo}>
                      <Text style={s.reporterName}>{rep.name}</Text>
                      <Text style={s.reporterEmp}>{rep.employee_id}</Text>
                    </View>
                    <View style={s.reporterStats}>
                      <Text style={s.reporterCount}>{rep.report_count}</Text>
                      <Text style={s.reporterCountLabel}>reports</Text>
                    </View>
                    {rep.critical_count > 0 && (
                      <View style={s.criticalTag}>
                        <Text style={s.criticalTagText}>{rep.critical_count} 🔴</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recent activity */}
          {data?.recent_reports?.length > 0 && (
            <View style={s.section}>
              <View style={[s.sectionHeader, { marginBottom: 0 }]}>
                <Text style={s.sectionIcon}>⏱️</Text>
                <Text style={[s.sectionTitle, { flex: 1 }]}>RECENT ACTIVITY</Text>
                <TouchableOpacity onPress={() => navigation.navigate('ReportsList', { mode: 'all' })}>
                  <Text style={s.viewAllLink}>View All →</Text>
                </TouchableOpacity>
              </View>

              <View style={{ marginTop: hp(1.5) }}>
                {data.recent_reports.map((r) => {
                  const col = SEV_COLOR[r.severity] || '#64748B';
                  return (
                    <TouchableOpacity
                      key={r.job_id}
                      style={s.recentCard}
                      onPress={() => navigation.navigate('ReportDetail', { reportId: r.job_id })}
                      activeOpacity={0.82}
                    >
                      <View style={[s.recentAccent, { backgroundColor: col }]} />
                      <View style={s.recentBody}>
                        <View style={s.recentTop}>
                          <Text style={s.recentId}>#{r.job_id}</Text>
                          <View style={[s.sevPill, { backgroundColor: col + '20' }]}>
                            <Text style={[s.sevText, { color: col }]}>{r.severity}</Text>
                          </View>
                          <Text style={s.recentTime}>{getRelativeTime(r.created_date)}</Text>
                        </View>
                        <Text style={s.recentFor} numberOfLines={1}>{r.job_req_for}</Text>
                        <Text style={s.recentReporter}>👤 {r.reporter_name} ({r.reporter_emp_id})</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ height: hp(4) }} />
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F4F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: hp(1.5), fontSize: rf(13), color: '#64748B' },

  header: {
    height: Platform.OS === 'ios' ? hp(11) : hp(7.2) + STATUSBAR_H,
    paddingTop: Platform.OS === 'ios' ? hp(5) : STATUSBAR_H,
    backgroundColor: '#0D2B6E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4.3),
    elevation: 4,
  },
  backBtn:     { padding: rs(6) },
  backIcon:    { fontSize: rf(22), color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: rf(16), fontWeight: '700', color: '#fff' },
  refreshIcon: { fontSize: rf(20), color: '#93C5FD' },

  scroll: { paddingBottom: hp(2) },

  banner: {
    backgroundColor: '#0D2B6E',
    paddingHorizontal: wp(5.3),
    paddingVertical: hp(2.8),
    marginBottom: hp(0),
  },
  bannerTitle: { fontSize: rf(18), fontWeight: '800', color: '#fff', marginBottom: hp(0.5) },
  bannerSub:   { fontSize: rf(11.5), color: '#93C5FD', marginBottom: hp(2) },
  bannerStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: rs(10), padding: wp(3) },
  bannerStat:  { flex: 1, alignItems: 'center' },
  bannerStatValue: { fontSize: rf(22), fontWeight: '900', color: '#fff' },
  bannerStatLabel: { fontSize: rf(10), color: '#93C5FD', fontWeight: '600', marginTop: hp(0.3) },
  bannerDivider:   { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: hp(0.5) },

  section:      { paddingHorizontal: wp(4.3), marginTop: hp(2.5) },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(1.5) },
  sectionIcon:  { fontSize: rf(13), marginRight: wp(2) },
  sectionTitle: { fontSize: rf(10), fontWeight: '800', color: '#64748B', letterSpacing: 0.9 },
  viewAllLink:  { fontSize: rf(12), fontWeight: '700', color: '#2563EB' },

  totalCard: {
    backgroundColor: '#0D2B6E',
    borderRadius: rs(12),
    padding: wp(6),
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#0D2B6E',
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3,
    shadowRadius: rs(8),
  },
  totalValue: { fontSize: rf(52), fontWeight: '900', color: '#fff', includeFontPadding: false },
  totalLabel: { fontSize: rf(13), color: '#93C5FD', fontWeight: '600', marginTop: hp(0.5) },

  statRow: { flexDirection: 'row', marginHorizontal: -wp(1) },

  card: {
    backgroundColor: '#fff',
    borderRadius: rs(10),
    padding: wp(4),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: rs(2),
  },

  statusRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: hp(1), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9' },
  statusName:   { width: wp(22), fontSize: rf(12.5), fontWeight: '600', color: '#334155' },
  statusBarWrap: { flex: 1, height: rs(6), backgroundColor: '#F1F5F9', borderRadius: rs(3), marginHorizontal: wp(2), overflow: 'hidden' },
  statusBar:    { height: '100%', borderRadius: rs(3), minWidth: rs(4) },
  statusCount:  { width: wp(8), fontSize: rf(12), fontWeight: '700', color: '#0D2B6E', textAlign: 'right' },

  reporterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: hp(1.3) },
  rankBadge:   { width: rs(26), height: rs(26), borderRadius: rs(13), backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: wp(2.7) },
  rankText:    { fontSize: rf(12), fontWeight: '800', color: '#0D2B6E' },
  reporterInfo: { flex: 1 },
  reporterName: { fontSize: rf(13), fontWeight: '700', color: '#1E293B' },
  reporterEmp:  { fontSize: rf(11), color: '#94A3B8', marginTop: hp(0.2) },
  reporterStats: { alignItems: 'center', marginRight: wp(2) },
  reporterCount: { fontSize: rf(18), fontWeight: '900', color: '#0D2B6E', includeFontPadding: false },
  reporterCountLabel: { fontSize: rf(9), color: '#94A3B8', fontWeight: '600' },
  criticalTag:  { backgroundColor: '#FEE2E2', paddingHorizontal: wp(1.6), paddingVertical: hp(0.4), borderRadius: rs(6) },
  criticalTagText: { fontSize: rf(10.5), fontWeight: '700', color: '#DC2626' },

  recentCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: rs(8), marginBottom: hp(1), overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: rs(2) },
  recentAccent: { width: rs(4) },
  recentBody:   { flex: 1, padding: wp(3.2) },
  recentTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.5) },
  recentId:     { fontSize: rf(12), fontWeight: '800', color: '#1E293B', marginRight: wp(2) },
  sevPill:      { paddingHorizontal: wp(2), paddingVertical: hp(0.25), borderRadius: rs(10), marginRight: 'auto' },
  sevText:      { fontSize: rf(10.5), fontWeight: '700' },
  recentTime:   { fontSize: rf(10), color: '#94A3B8' },
  recentFor:    { fontSize: rf(13), fontWeight: '700', color: '#1E293B', marginBottom: hp(0.4) },
  recentReporter: { fontSize: rf(11), color: '#64748B' },
});

export default ExecutiveDashboardScreen;
