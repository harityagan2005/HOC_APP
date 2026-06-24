import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, PixelRatio, Platform, StatusBar,
} from 'react-native';
import { getReportDetail, deleteReport, updateReport } from '../services/reportService';
import { getVariants } from '../services/variantService';
import { AuthContext } from '../../App';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;
const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const SEV_COLOR = { Critical: '#DC2626', High: '#EA580C', Medium: '#D97706', Low: '#16A34A' };
const STATUS_OPTIONS = ['Open', 'In Progress', 'Closed', 'Resolved'];

const Field = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <View style={f.row}>
      <Text style={f.label}>{label}</Text>
      <Text style={f.value}>{value}</Text>
    </View>
  );
};

const f = StyleSheet.create({
  row:   { marginBottom: hp(1.4), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F1F5F9', paddingBottom: hp(1.2) },
  label: { fontSize: rf(11), fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: hp(0.3) },
  value: { fontSize: rf(13.5), color: '#1E293B', lineHeight: rf(19) },
});

const ReportDetailScreen = ({ navigation, route }) => {
  const { reportId } = route.params;
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'Admin' || user?.role === 'admin';

  const [report, setReport]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusVariants, setStatusVariants] = useState([]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await getReportDetail(reportId);
      if (res.success) setReport(res.data);
      else Alert.alert('Error', res.message || 'Failed to load report');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    getVariants().then(res => {
      if (res.success && res.data) {
        setStatusVariants(res.data.filter(v => v.variant_type.toLowerCase() === 'status'));
      }
    }).catch(() => {});
  }, [reportId]);

  const handleDelete = () => {
    Alert.alert('Delete Report', `Permanently delete report #${reportId}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            const res = await deleteReport(reportId);
            if (res.success) {
              Alert.alert('Deleted', 'Report deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert('Error', res.message || 'Delete failed');
            }
          } catch (e) {
            Alert.alert('Error', e?.message || 'Delete failed');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const handleStatusUpdate = (newStatus) => {
    if (!report) return;
    const variant = statusVariants.find(v => v.variant_name.toLowerCase() === newStatus.toLowerCase());
    if (!variant) {
      Alert.alert('Error', `Status "${newStatus}" not found. Please sync variants first.`);
      return;
    }
    Alert.alert('Update Status', `Change status to "${newStatus}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          setUpdatingStatus(true);
          try {
            const res = await updateReport(reportId, { status_id: variant.id });
            if (res.success) {
              setReport(prev => ({ ...prev, status_name: newStatus, status_id: variant.id }));
              Alert.alert('Updated', `Status changed to "${newStatus}"`);
            } else {
              Alert.alert('Error', res.message || 'Update failed');
            }
          } catch (e) {
            Alert.alert('Error', e?.message || 'Update failed');
          } finally {
            setUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Report Detail</Text>
          <View style={{ width: wp(12) }} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0D2B6E" />
          <Text style={s.loadingText}>Loading report…</Text>
        </View>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Report Detail</Text>
          <View style={{ width: wp(12) }} />
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: rf(14), color: '#64748B' }}>Report not found.</Text>
        </View>
      </View>
    );
  }

  const sevColor = SEV_COLOR[report.severity] || '#64748B';

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Report #{report.job_id}</Text>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => navigation.navigate('ReportCreation', { editReport: report })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.editBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[s.banner, { borderLeftColor: sevColor }]}>
          <View style={s.bannerLeft}>
            <Text style={s.bannerFor} numberOfLines={2}>{report.job_req_for}</Text>
            {report.company ? <Text style={s.bannerCompany}>{report.company}</Text> : null}
          </View>
          <View style={s.bannerRight}>
            <View style={[s.sevBadge, { backgroundColor: sevColor + '20', borderColor: sevColor + '60' }]}>
              <Text style={[s.sevBadgeText, { color: sevColor }]}>{report.severity}</Text>
            </View>
            {report.stop_job === 'Yes' && (
              <View style={s.stopJobBadge}>
                <Text style={s.stopJobText}>🛑 Stop Job</Text>
              </View>
            )}
          </View>
        </View>

        {/* Status chips */}
        {isAdmin && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Status Update</Text>
            <View style={s.statusRow}>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[s.statusChip, report.status_name === opt && s.statusChipActive]}
                  onPress={() => handleStatusUpdate(opt)}
                  disabled={updatingStatus}
                >
                  <Text style={[s.statusChipText, report.status_name === opt && s.statusChipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {updatingStatus && <ActivityIndicator size="small" color="#0D2B6E" style={{ marginTop: hp(1) }} />}
          </View>
        )}

        {/* Basic Info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Basic Information</Text>
          <Field label="Report ID"       value={`#${report.job_id}`} />
          <Field label="Observer Name"   value={report.observer_name} />
          <Field label="Observation Date" value={formatDate(report.observation_date)} />
          <Field label="Reported By"     value={report.reporter_name ? `${report.reporter_name} (${report.reporter_emp_id})` : null} />
          <Field label="Status"          value={report.status_name || '—'} />
          <Field label="FY Year"         value={report.fy_year} />
          <Field label="Created"         value={formatDate(report.created_date)} />
        </View>

        {/* Location */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Location {'&'} Category</Text>
          <Field label="Location"    value={report.location_name} />
          <Field label="Area"        value={report.area_name} />
          <Field label="Category"    value={report.category_name} />
          <Field label="Department"  value={report.department_name} />
        </View>

        {/* Findings */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Observation Findings</Text>
          <Field label="Severity"           value={report.severity} />
          <Field label="Stop Job Triggered" value={report.stop_job} />
          <Field label="Operation / Activity" value={report.oper_act} />
          <Field label="Observations"       value={report.observations} />
          <Field label="Corrective Actions" value={report.corrective_actions} />
        </View>

        {/* Responsibility */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Responsibility {'&'} Closure</Text>
          <Field label="Accountable Person" value={report.accountable_person} />
          <Field label="Responsible Person" value={report.responsible_person} />
          <Field label="HOD"               value={report.hod} />
          <Field label="End Date"          value={formatDate(report.end_date)} />
          <Field label="Remarks"           value={report.remarks} />
        </View>

        {/* Admin delete */}
        {isAdmin && (
          <TouchableOpacity
            style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.8}
          >
            {deleting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.deleteBtnText}>🗑️  Delete Report</Text>
            }
          </TouchableOpacity>
        )}

        <View style={{ height: hp(4) }} />
      </ScrollView>
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
  editBtn:     { paddingVertical: hp(0.7), paddingHorizontal: wp(3), backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: rs(6) },
  editBtnText: { color: '#fff', fontSize: rf(12), fontWeight: '700' },

  scroll: { padding: wp(4.3), paddingBottom: hp(3) },

  banner: {
    backgroundColor: '#fff',
    borderRadius: rs(10),
    padding: wp(4.3),
    marginBottom: hp(1.5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderLeftWidth: rs(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: rs(3),
  },
  bannerLeft:    { flex: 1, marginRight: wp(3) },
  bannerFor:     { fontSize: rf(15), fontWeight: '800', color: '#1E293B', lineHeight: rf(21) },
  bannerCompany: { fontSize: rf(12), color: '#64748B', marginTop: hp(0.5) },
  bannerRight:   { alignItems: 'flex-end', gap: hp(0.7) },
  sevBadge:      { paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: rs(12), borderWidth: 1 },
  sevBadgeText:  { fontSize: rf(12), fontWeight: '800' },
  stopJobBadge:  { backgroundColor: '#FEE2E2', paddingHorizontal: wp(2.5), paddingVertical: hp(0.4), borderRadius: rs(10) },
  stopJobText:   { fontSize: rf(10.5), fontWeight: '700', color: '#DC2626' },

  card: {
    backgroundColor: '#fff',
    borderRadius: rs(10),
    padding: wp(4.3),
    marginBottom: hp(1.5),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: rs(2),
  },
  cardTitle: {
    fontSize: rf(13), fontWeight: '800', color: '#0D2B6E', textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: hp(1.5), borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0', paddingBottom: hp(1),
  },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2) },
  statusChip: { paddingHorizontal: wp(3.7), paddingVertical: hp(0.9), borderRadius: rs(20), borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F8FAFC' },
  statusChipActive: { backgroundColor: '#0D2B6E', borderColor: '#0D2B6E' },
  statusChipText: { fontSize: rf(12), fontWeight: '600', color: '#64748B' },
  statusChipTextActive: { color: '#fff' },

  deleteBtn: {
    backgroundColor: '#DC2626', borderRadius: rs(10), paddingVertical: hp(2),
    alignItems: 'center', marginTop: hp(0.5), elevation: 2,
    shadowColor: '#DC2626', shadowOffset: { width: 0, height: rs(2) }, shadowOpacity: 0.3, shadowRadius: rs(4),
  },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(14) },
});

export default ReportDetailScreen;
