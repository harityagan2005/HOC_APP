import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, RefreshControl, Dimensions, PixelRatio,
  Platform, StatusBar, Modal,
} from 'react-native';
import { getReports, deleteReport } from '../services/reportService';
import { AuthContext } from '../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;
const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const SEVERITY_OPTIONS = ['All', 'High', 'Medium', 'Low'];
const STATUS_OPTIONS   = ['All', 'Open', 'In Progress', 'Closed', 'Resolved'];
const DURATION_OPTIONS = ['All Time', 'Today', 'This Week', 'This Month', 'Last Month'];

const SEV_COLOR    = { High: '#EA580C', Medium: '#D97706', Low: '#16A34A' };
const STATUS_COLOR = { Open: '#2563EB', 'In Progress': '#D97706', Closed: '#16A34A', Resolved: '#7C3AED' };

const getDateRange = (duration) => {
  if (duration === 'All Time') return { dateFrom: null, dateTo: null };
  const now   = new Date();
  const today = now.toISOString().split('T')[0];
  if (duration === 'Today') return { dateFrom: today, dateTo: today };
  if (duration === 'This Week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { dateFrom: start.toISOString().split('T')[0], dateTo: today };
  }
  if (duration === 'This Month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: start.toISOString().split('T')[0], dateTo: today };
  }
  if (duration === 'Last Month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end   = new Date(now.getFullYear(), now.getMonth(), 0);
    return { dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] };
  }
  return { dateFrom: null, dateTo: null };
};

// ─── Dropdown Picker ─────────────────────────────────────────────────
const DropdownPicker = ({ label, value, options, colorMap, onSelect }) => {
  const [open, setOpen] = useState(false);
  const activeColor = colorMap?.[value];

  return (
    <>
      <TouchableOpacity
        style={[s.dropBtn, activeColor && value !== 'All' && value !== 'All Time' && { borderColor: activeColor, backgroundColor: activeColor + '12' }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.dropLabel}>{label}</Text>
          <Text style={[s.dropValue, activeColor && value !== 'All' && value !== 'All Time' && { color: activeColor, fontWeight: '800' }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
        <Text style={[s.dropArrow, activeColor && value !== 'All' && value !== 'All Time' && { color: activeColor }]}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{label}</Text>
            {options.map((opt) => {
              const isActive = value === opt;
              const col = colorMap?.[opt];
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.modalOption, isActive && { backgroundColor: (col || '#0D2B6E') + '14' }]}
                  onPress={() => { onSelect(opt); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  {col && opt !== 'All' ? (
                    <View style={[s.optDot, { backgroundColor: col }]} />
                  ) : (
                    <View style={[s.optDot, { backgroundColor: '#CBD5E1' }]} />
                  )}
                  <Text style={[s.optText, isActive && { color: col || '#0D2B6E', fontWeight: '800' }]}>
                    {opt}
                  </Text>
                  {isActive && <Text style={[s.optCheck, { color: col || '#0D2B6E' }]}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────
const ReportsListScreen = ({ navigation, route }) => {
  const { user } = useContext(AuthContext);
  const mode         = route?.params?.mode            || 'all';
  const initSeverity = route?.params?.initialSeverity || 'All';
  const initStatus   = route?.params?.initialStatus   || 'All';
  const title        = 'All Reports';

  const [reports, setReports]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [severityFilter, setSeverityFilter] = useState(initSeverity);
  const [statusFilter, setStatusFilter]     = useState(initStatus);
  const [durationFilter, setDurationFilter] = useState('All Time');
  const [page, setPage]                     = useState(1);
  const [hasMore, setHasMore]               = useState(true);
  const [totalCount, setTotalCount]         = useState(0);

  const fetchReports = useCallback(async (
    pg = 1, sev = severityFilter, search = searchQuery,
    statF = statusFilter, dur = durationFilter, replace = true
  ) => {
    if (pg === 1 && replace) setLoading(true);
    else setLoadingMore(true);
    try {
      const { dateFrom, dateTo } = getDateRange(dur);
      const res = await getReports(
        pg, 15,
        sev === 'All' ? null : sev,
        search || null,
        statF === 'All' ? null : statF,
        dateFrom,
        dateTo
      );
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
  }, [severityFilter, searchQuery, statusFilter, durationFilter]);

  useEffect(() => {
    fetchReports(1, initSeverity, '', initStatus, 'All Time', true);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () =>
      fetchReports(1, severityFilter, searchQuery, statusFilter, durationFilter, true)
    );
    return unsub;
  }, [navigation, severityFilter, searchQuery, statusFilter, durationFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports(1, severityFilter, searchQuery, statusFilter, durationFilter, true);
  };

  const handleSeverity  = (v) => { setSeverityFilter(v);  fetchReports(1, v, searchQuery, statusFilter, durationFilter, true); };
  const handleStatus    = (v) => { setStatusFilter(v);    fetchReports(1, severityFilter, searchQuery, v, durationFilter, true); };
  const handleDuration  = (v) => { setDurationFilter(v);  fetchReports(1, severityFilter, searchQuery, statusFilter, v, true); };
  const handleSearch    = (t) => { setSearchQuery(t);     fetchReports(1, severityFilter, t, statusFilter, durationFilter, true); };

  const loadMore = () => {
    if (!loadingMore && hasMore)
      fetchReports(page + 1, severityFilter, searchQuery, statusFilter, durationFilter, false);
  };

  const clearAll = () => {
    setSeverityFilter('All'); setStatusFilter('All');
    setDurationFilter('All Time'); setSearchQuery('');
    fetchReports(1, 'All', '', 'All', 'All Time', true);
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
              fetchReports(1, severityFilter, searchQuery, statusFilter, durationFilter, true);
            } else Alert.alert('Error', r.message || 'Delete failed');
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
  const hasActiveFilter = severityFilter !== 'All' || statusFilter !== 'All' || durationFilter !== 'All Time' || !!searchQuery;

  const renderItem = ({ item }) => {
    const col   = SEV_COLOR[item.severity]     || '#64748B';
    const stCol = STATUS_COLOR[item.status_name] || '#64748B';
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
            {item.status_name ? (
              <View style={[s.statusPill, { backgroundColor: stCol + '18', borderColor: stCol + '40' }]}>
                <Text style={[s.statusPillText, { color: stCol }]}>{item.status_name}</Text>
              </View>
            ) : null}
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
            {item.reporter_name ? (
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
          {!loading && (
            <Text style={s.headerCount}>
              {totalCount} report{totalCount !== 1 ? 's' : ''}{hasActiveFilter ? ' (filtered)' : ''}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('ReportCreation')} style={s.addBtn}>
          <Text style={s.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="Search reports…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {hasActiveFilter && (
          <TouchableOpacity style={s.clearBtn} onPress={clearAll}>
            <Text style={s.clearBtnText}>✕ Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dropdown Filter Row */}
      <View style={s.filterBar}>
        <DropdownPicker
          label="Status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          colorMap={STATUS_COLOR}
          onSelect={handleStatus}
        />
        <View style={s.filterDivider} />
        <DropdownPicker
          label="Severity"
          value={severityFilter}
          options={SEVERITY_OPTIONS}
          colorMap={SEV_COLOR}
          onSelect={handleSeverity}
        />
        <View style={s.filterDivider} />
        <DropdownPicker
          label="Period"
          value={durationFilter}
          options={DURATION_OPTIONS}
          onSelect={handleDuration}
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
                {hasActiveFilter ? 'Try clearing your filters' : 'Create your first hazard observation report'}
              </Text>
              {!hasActiveFilter && (
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

  searchRow: {
    backgroundColor: '#fff',
    paddingHorizontal: wp(4.3),
    paddingVertical: hp(1.1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F0F4F8',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(8),
    paddingVertical: hp(1),
    paddingHorizontal: wp(3.5),
    fontSize: rf(13),
    color: '#1F2937',
  },
  clearBtn:     { paddingVertical: hp(0.8), paddingHorizontal: wp(3), backgroundColor: '#FEE2E2', borderRadius: rs(6) },
  clearBtnText: { fontSize: rf(11.5), fontWeight: '700', color: '#DC2626' },

  // ── Filter bar (3 dropdowns side by side) ──
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    elevation: 1,
  },
  filterDivider: { width: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0' },

  dropBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    borderWidth: 0,
  },
  dropLabel: { fontSize: rf(9.5), fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: hp(0.2) },
  dropValue: { fontSize: rf(12.5), fontWeight: '700', color: '#1E293B' },
  dropArrow: { fontSize: rf(14), color: '#94A3B8', marginLeft: wp(1) },

  // ── Dropdown Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
    paddingTop: hp(1.5),
    elevation: 10,
  },
  modalHandle: {
    width: wp(10),
    height: rs(4),
    backgroundColor: '#CBD5E1',
    borderRadius: rs(2),
    alignSelf: 'center',
    marginBottom: hp(1.5),
  },
  modalTitle: {
    fontSize: rf(14),
    fontWeight: '800',
    color: '#0D2B6E',
    marginBottom: hp(1),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(3),
    borderRadius: rs(8),
    marginBottom: hp(0.4),
  },
  optDot:   { width: rs(8), height: rs(8), borderRadius: rs(4), marginRight: wp(3) },
  optText:  { flex: 1, fontSize: rf(14), color: '#374151', fontWeight: '600' },
  optCheck: { fontSize: rf(16), fontWeight: '800' },

  // ── List ──
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
  cardTop:  { flexDirection: 'row', alignItems: 'center', marginBottom: hp(0.6), flexWrap: 'wrap', gap: wp(1.5) },
  cardId:   { fontSize: rf(12), fontWeight: '800', color: '#1E293B' },

  sevPill:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: rs(10) },
  sevDot:         { width: rs(5), height: rs(5), borderRadius: rs(3), marginRight: wp(1) },
  sevText:        { fontSize: rf(10.5), fontWeight: '700' },
  statusPill:     { paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: rs(8), borderWidth: 1 },
  statusPillText: { fontSize: rf(10), fontWeight: '700' },
  cardTime:       { fontSize: rf(10), color: '#94A3B8', marginLeft: 'auto' },

  cardFor:  { fontSize: rf(13.5), fontWeight: '700', color: '#1E293B', marginBottom: hp(0.4) },
  cardObs:  { fontSize: rf(12), color: '#64748B', lineHeight: rf(17), marginBottom: hp(0.8) },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(1.6) },
  metaTag:  { backgroundColor: '#F1F5F9', paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: rs(4) },
  metaTagText: { fontSize: rf(10.5), color: '#475569', fontWeight: '600' },

  deleteBtn:     { padding: wp(3), justifyContent: 'center' },
  deleteBtnText: { fontSize: rf(16) },

  loadMoreBtn:  { alignSelf: 'center', marginVertical: hp(1.5), paddingVertical: hp(1.2), paddingHorizontal: wp(8), backgroundColor: '#EFF6FF', borderRadius: rs(20), borderWidth: 1, borderColor: '#BFDBFE' },
  loadMoreText: { fontSize: rf(13), fontWeight: '700', color: '#1D4ED8' },

  empty:      { alignItems: 'center', paddingTop: hp(8) },
  emptyIcon:  { fontSize: rf(40), marginBottom: hp(1.5) },
  emptyTitle: { fontSize: rf(16), fontWeight: '800', color: '#1E293B', marginBottom: hp(0.8) },
  emptySub:   { fontSize: rf(12.5), color: '#64748B', textAlign: 'center', marginBottom: hp(2.5), paddingHorizontal: wp(8), lineHeight: rf(18) },
  emptyBtn:   { backgroundColor: '#0D2B6E', borderRadius: rs(8), paddingVertical: hp(1.3), paddingHorizontal: wp(6) },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(13) },
});

export default ReportsListScreen;
