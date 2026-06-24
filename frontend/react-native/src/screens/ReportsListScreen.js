import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, RefreshControl, Dimensions, PixelRatio, Platform, StatusBar,
} from 'react-native';
import { getReports, deleteReport } from '../services/reportService';
import { AuthContext } from '../../App';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;
const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const SEVERITY_FILTERS = ['All', 'Critical', 'High', 'Medium', 'Low'];
const SEV_COLOR = { Critical: '#DC2626', High: '#EA580C', Medium: '#D97706', Low: '#16A34A' };

const ReportsListScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const mode  = route?.params?.mode || 'my'; // 'my' | 'all'
  const title = mode === 'all' ? 'All Reports' : 'My Safety Actions';

  const [reports, setReports]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(true);
  const [totalCount, setTotalCount]   = useState(0);

  const fetchReports = useCallback(async (pg = 1, sev = severityFilter, search = searchQuery, replace = true) => {
    if (pg === 1 && replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await getReports(pg, 15, sev === 'All' ? null : sev, search || null);
      if (res.success) {
        const newData = res.data.reports || [];
        setReports(prev => replace ? newData : [...prev, ...newData]);
        setTotalCount(res.data.pagination?.total || 0);
        setHasMore(pg < (res.data.pagination?.pages || 1));
        setPage(pg);
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [severityFilter, searchQuery]);

  useEffect(() => { fetchReports(1, severityFilter, searchQuery, true); }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => fetchReports(1, severityFilter, searchQuery, true));
    return unsub;
  }, [navigation, severityFilter, searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports(1, severityFilter, searchQuery, true);
  };

  const handleSeverityFilter = (sev) => {
    setSeverityFilter(sev);
    fetchReports(1, sev, searchQuery, true);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    fetchReports(1, severityFilter, text, true);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) fetchReports(page + 1, severityFilter, searchQuery, false);
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Report', `Delete report #${item.job_id}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const r = await deleteReport(item.job_id);
            if (r.success) {
              Alert.alert('Deleted', 'Report deleted successfully');
              fetchReports(1, severityFilter, searchQuery, true);
            } else {
              Alert.alert('Error', r.message || 'Delete failed');
            }
          } catch (e) { Alert.alert('Error', e?.message || 'Delete failed'); }
        },
      },
    ]);
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
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  };

  const isAdmin = user?.role === 'Admin' || user?.role === 'admin';

  const renderItem = ({ item }) => {
    const col = SEV_COLOR[item.severity] || '#64748B';
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('ReportDetail', { reportId: item.job_id })}
        activeOpacity={0.82}
      >
        <View style={[s.accent, { backgroundColor: col }]} />
        <View style={s.cardBody}>
          <View style={s.cardTop}>
            <Text style={s.cardId}>#{item.job_id}</Text>
            <View style={[s.sevPill, { backgroundColor: col + '20' }]}>
              <View style={[s.sevDot, { backgroundColor: col }]} />
              <Text style={[s.sevText, { color: col }]}>{item.severity}</Text>
            </View>
            <Text style={s.cardTime}>{getRelativeTime(item.created_date)}</Text>
          </View>

          <Text style={s.cardFor} numberOfLines={1}>{item.job_req_for}</Text>
          <Text style={s.cardObs} numberOfLines={2}>{item.observations}</Text>

          <View style={s.cardMeta}>
            {item.location_name ? (
              <View style={s.metaTag}>
                <Text style={s.metaTagText}>📍 {item.location_name}</Text>
              </View>
            ) : null}
            {item.stop_job === 'Yes' ? (
              <View style={[s.metaTag, { backgroundColor: '#FEE2E2' }]}>
                <Text style={[s.metaTagText, { color: '#DC2626' }]}>🛑 Stop Job</Text>
              </View>
            ) : null}
            {mode === 'all' && item.reporter_name ? (
              <View style={[s.metaTag, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[s.metaTagText, { color: '#1D4ED8' }]}>👤 {item.reporter_name}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {isAdmin && (
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={s.deleteBtnText}>🗑️</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{title}</Text>
          {!loading && <Text style={s.headerCount}>{totalCount} report{totalCount !== 1 ? 's' : ''}</Text>}
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ReportCreation')}
          style={s.addBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by title or description…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* Severity Filter */}
      <View style={s.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SEVERITY_FILTERS}
          keyExtractor={i => i}
          contentContainerStyle={s.filterList}
          renderItem={({ item }) => {
            const active = severityFilter === item;
            const col = SEV_COLOR[item] || '#0D2B6E';
            return (
              <TouchableOpacity
                style={[s.filterChip, active && { backgroundColor: col, borderColor: col }]}
                onPress={() => handleSeverityFilter(item)}
              >
                <Text style={[s.filterChipText, active && { color: '#fff' }]}>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0D2B6E" />
          <Text style={s.loadingText}>Loading reports…</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={item => item.job_id.toString()}
          contentContainerStyle={s.listContent}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D2B6E']} tintColor="#0D2B6E" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => loadingMore ? (
            <ActivityIndicator color="#0D2B6E" style={{ marginVertical: hp(2) }} />
          ) : hasMore && reports.length > 0 ? (
            <TouchableOpacity style={s.loadMoreBtn} onPress={loadMore}>
              <Text style={s.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          ) : null}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📋</Text>
              <Text style={s.emptyTitle}>No Reports Found</Text>
              <Text style={s.emptySub}>
                {searchQuery || severityFilter !== 'All'
                  ? 'Try clearing your filters'
                  : 'Create your first hazard observation report'}
              </Text>
              {!searchQuery && severityFilter === 'All' && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate('ReportCreation')}>
                  <Text style={s.emptyBtnText}>Create Report</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F4F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: wp(5) },
  loadingText: { marginTop: hp(1.5), fontSize: rf(13), color: '#64748B' },

  header: {
    height: Platform.OS === 'ios' ? hp(11) : hp(7.2) + STATUSBAR_H,
    paddingTop: Platform.OS === 'ios' ? hp(5) : STATUSBAR_H,
    backgroundColor: '#0D2B6E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4.3),
    elevation: 4,
  },
  backBtn:      { padding: rs(6) },
  backIcon:     { fontSize: rf(22), color: '#fff', fontWeight: '700' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: rf(16), fontWeight: '700', color: '#fff' },
  headerCount:  { fontSize: rf(11), color: '#93C5FD', marginTop: hp(0.2) },
  addBtn:       { paddingVertical: hp(0.7), paddingHorizontal: wp(3.2), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: rs(6) },
  addBtnText:   { color: '#fff', fontWeight: '700', fontSize: rf(12.5) },

  searchRow: { backgroundColor: '#fff', paddingHorizontal: wp(4.3), paddingVertical: hp(1.2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: rs(8), paddingVertical: hp(1.1), paddingHorizontal: wp(3.7), fontSize: rf(13.5), color: '#1F2937' },

  filterRow:  { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  filterList: { paddingHorizontal: wp(4), paddingVertical: hp(1.2), gap: wp(2) },
  filterChip: { paddingHorizontal: wp(3.7), paddingVertical: hp(0.8), borderRadius: rs(20), borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F8FAFC' },
  filterChipText: { fontSize: rf(12), fontWeight: '600', color: '#64748B' },

  listContent: { padding: wp(4.3), paddingBottom: hp(4) },

  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: rs(10),
    marginBottom: hp(1.3),
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: rs(3),
  },
  accent:   { width: rs(4) },
  cardBody: { flex: 1, padding: wp(3.7) },
  cardTop:  { flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.6) },
  cardId:   { fontSize: rf(12), fontWeight: '800', color: '#1E293B', marginRight: wp(2) },
  sevPill:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: rs(10), marginRight: 'auto' },
  sevDot:   { width: rs(5), height: rs(5), borderRadius: rs(3), marginRight: wp(1) },
  sevText:  { fontSize: rf(10.5), fontWeight: '700' },
  cardTime: { fontSize: rf(10), color: '#94A3B8' },
  cardFor:  { fontSize: rf(13.5), fontWeight: '700', color: '#1E293B', marginBottom: hp(0.4) },
  cardObs:  { fontSize: rf(12), color: '#64748B', lineHeight: rf(17), marginBottom: hp(0.8) },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(1.6) },
  metaTag:  { backgroundColor: '#F1F5F9', paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: rs(4) },
  metaTagText: { fontSize: rf(10.5), color: '#475569', fontWeight: '600' },

  deleteBtn:     { padding: wp(3), justifyContent: 'center' },
  deleteBtnText: { fontSize: rf(16) },

  loadMoreBtn:  { alignSelf: 'center', marginVertical: hp(1.5), paddingVertical: hp(1.2), paddingHorizontal: wp(8), backgroundColor: '#EFF6FF', borderRadius: rs(20), borderWidth: 1, borderColor: '#BFDBFE' },
  loadMoreText: { fontSize: rf(13), fontWeight: '700', color: '#1D4ED8' },

  empty:     { alignItems: 'center', paddingTop: hp(8) },
  emptyIcon: { fontSize: rf(40), marginBottom: hp(1.5) },
  emptyTitle: { fontSize: rf(16), fontWeight: '800', color: '#1E293B', marginBottom: hp(0.8) },
  emptySub:  { fontSize: rf(12.5), color: '#64748B', textAlign: 'center', marginBottom: hp(2.5), paddingHorizontal: wp(8), lineHeight: rf(18) },
  emptyBtn:  { backgroundColor: '#0D2B6E', borderRadius: rs(8), paddingVertical: hp(1.3), paddingHorizontal: wp(6) },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(13) },
});

export default ReportsListScreen;
