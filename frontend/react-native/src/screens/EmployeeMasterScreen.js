import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Modal, FlatList, ScrollView,
  Dimensions, PixelRatio, Platform, StatusBar,
} from 'react-native';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../services/employeeService';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;
const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const EmployeeMasterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [isActive, setIsActive] = useState(true);

  const fetchEmployeesData = async () => {
    setLoading(true);
    try {
      const r = await getEmployees();
      if (r.success && r.data) setEmployees(r.data);
      else Alert.alert('Error', r.message || 'Failed to fetch employees');
    } catch (e) {
      Alert.alert('Error', e.message || (typeof e === 'string' ? e : 'Error loading employees'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployeesData(); }, []);

  const openAddModal = () => {
    setEditingEmployee(null);
    setEmpId(''); setName(''); setEmail(''); setPhone('');
    setPassword(''); setRole('User'); setIsActive(true);
    setFormModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingEmployee(item);
    setEmpId(item.employee_id); setName(item.name);
    setEmail(item.email); setPhone(item.phone || '');
    setRole(item.role); setIsActive(!!item.is_active); setPassword('');
    setFormModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return Alert.alert('Validation Error', 'Name is required');
    if (!email.trim()) return Alert.alert('Validation Error', 'Email is required');
    if (!phone.trim()) return Alert.alert('Validation Error', 'Phone is required');
    setSubmitting(true);
    try {
      if (editingEmployee) {
        const r = await updateEmployee(editingEmployee.id, { name, email, phone, role, is_active: isActive });
        if (r.success) { Alert.alert('Success', 'Employee updated'); setFormModalVisible(false); fetchEmployeesData(); }
        else Alert.alert('Error', r.message || 'Update failed');
      } else {
        if (!empId.trim()) return Alert.alert('Validation Error', 'Employee ID is required');
        if (!password || password.length < 6) return Alert.alert('Validation Error', 'Password must be at least 6 characters');
        const r = await addEmployee({ employee_id: empId, name, email, phone, password, role });
        if (r.success) { Alert.alert('Success', 'Employee added'); setFormModalVisible(false); fetchEmployeesData(); }
        else Alert.alert('Error', r.message || 'Add failed');
      }
    } catch (e) {
      Alert.alert('Error', e.message || (typeof e === 'string' ? e : 'Operation failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Confirm Delete', `Delete "${item.name}" (${item.employee_id})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const r = await deleteEmployee(item.id);
            if (r.success) { Alert.alert('Success', 'Employee deleted'); fetchEmployeesData(); }
            else Alert.alert('Error', r.message || 'Delete failed');
          } catch (e) { Alert.alert('Error', e.message || (typeof e === 'string' ? e : 'Delete failed')); }
        },
      },
    ]);
  };

  const filtered = employees.filter((e) =>
    e && (
      (e.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.employee_id || '').toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Employee Master</Text>
        <TouchableOpacity onPress={openAddModal} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Search by name, ID or email…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#0D2B6E" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <Text style={s.empName} numberOfLines={1}>{item.name}</Text>
                <View style={s.badgeRow}>
                  <View style={[s.badge, (item.role || '').toLowerCase() === 'admin' ? s.adminBadge : s.userBadge]}>
                    <Text style={[s.badgeText, (item.role || '').toLowerCase() === 'admin' ? s.adminBadgeText : s.userBadgeText]}>{item.role || 'User'}</Text>
                  </View>
                  <View style={[s.badge, item.is_active ? s.activeBadge : s.inactiveBadge]}>
                    <Text style={[s.badgeText, item.is_active ? s.activeBadgeText : s.inactiveBadgeText]}>{item.is_active ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
              </View>
              <Text style={s.detail}>ID: {item.employee_id}</Text>
              <Text style={s.detail}>Email: {item.email}</Text>
              <Text style={s.detail}>Phone: {item.phone || 'N/A'}</Text>
              <View style={s.divider} />
              <View style={s.cardActions}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={s.actionBtn}>
                  <Text style={s.editText}>✏️ Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={s.actionBtn}>
                  <Text style={s.deleteText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Text style={s.emptyText}>No employees found.</Text>
            </View>
          )}
        />
      )}

      {/* Modal */}
      <Modal visible={formModalVisible} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</Text>
            <ScrollView contentContainerStyle={s.modalScroll} showsVerticalScrollIndicator={false}>

              <Text style={s.label}>Employee ID *</Text>
              <TextInput style={[s.input, editingEmployee && s.inputDisabled]} placeholder="e.g. EMP102" placeholderTextColor="#9CA3AF"
                value={empId} onChangeText={setEmpId} editable={!editingEmployee} />

              <Text style={s.label}>Full Name *</Text>
              <TextInput style={s.input} placeholder="Enter full name" placeholderTextColor="#9CA3AF" value={name} onChangeText={setName} />

              <Text style={s.label}>Email *</Text>
              <TextInput style={s.input} placeholder="name@hocapp.com" placeholderTextColor="#9CA3AF"
                keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

              <Text style={s.label}>Phone *</Text>
              <TextInput style={s.input} placeholder="9876543210" placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

              {!editingEmployee && (
                <>
                  <Text style={s.label}>Password (min 6 chars) *</Text>
                  <TextInput style={s.input} placeholder="Enter password" placeholderTextColor="#9CA3AF"
                    secureTextEntry value={password} onChangeText={setPassword} />
                </>
              )}

              <Text style={s.label}>Role *</Text>
              <View style={s.btnGroup}>
                {['User', 'Admin'].map((r) => (
                  <TouchableOpacity key={r} style={[s.groupBtn, role === r && s.groupBtnActive]} onPress={() => setRole(r)}>
                    <Text style={[s.groupBtnText, role === r && s.groupBtnTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editingEmployee && (
                <>
                  <Text style={s.label}>Status *</Text>
                  <View style={s.btnGroup}>
                    {[{ label: 'Active', val: true }, { label: 'Inactive', val: false }].map((opt) => (
                      <TouchableOpacity key={opt.label} style={[s.groupBtn, isActive === opt.val && s.groupBtnActive]} onPress={() => setIsActive(opt.val)}>
                        <Text style={[s.groupBtnText, isActive === opt.val && s.groupBtnTextActive]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, s.cancelBtn]} onPress={() => setFormModalVisible(false)} disabled={submitting}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, s.saveBtn]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
  backBtn: { padding: rs(6) },
  backIcon: { fontSize: rf(22), color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: rf(17), fontWeight: '700', color: '#fff' },
  addBtn: { paddingVertical: hp(0.7), paddingHorizontal: wp(3.2), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: rs(6) },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(13) },

  searchWrap: { backgroundColor: '#fff', paddingHorizontal: wp(4.3), paddingVertical: hp(1.2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  searchInput: { backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: rs(8), paddingVertical: hp(1.2), paddingHorizontal: wp(3.7), fontSize: rf(13.5), color: '#1F2937' },

  listContent: { padding: wp(4.3), paddingBottom: hp(3) },
  card: {
    backgroundColor: '#fff',
    borderRadius: rs(10),
    padding: wp(4.3),
    marginBottom: hp(1.5),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: rs(3),
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(0.8) },
  empName: { fontSize: rf(14.5), fontWeight: '700', color: '#1E293B', flex: 1, marginRight: wp(2) },
  badgeRow: { flexDirection: 'row', gap: wp(1.3) },
  badge: { paddingHorizontal: wp(2.1), paddingVertical: hp(0.35), borderRadius: rs(10) },
  badgeText: { fontSize: rf(10), fontWeight: '700' },
  adminBadge: { backgroundColor: '#EFF6FF' },
  adminBadgeText: { color: '#1E40AF' },
  userBadge: { backgroundColor: '#F1F5F9' },
  userBadgeText: { color: '#475569' },
  activeBadge: { backgroundColor: '#ECFDF5' },
  activeBadgeText: { color: '#047857' },
  inactiveBadge: { backgroundColor: '#FEF2F2' },
  inactiveBadgeText: { color: '#DC2626' },
  detail: { fontSize: rf(12.5), color: '#64748B', marginTop: hp(0.35) },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E2E8F0', marginVertical: hp(1) },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { paddingVertical: hp(0.5), paddingHorizontal: wp(1) },
  editText: { fontSize: rf(12.5), color: '#2563EB', fontWeight: '700' },
  deleteText: { fontSize: rf(12.5), color: '#DC2626', fontWeight: '700' },

  empty: { backgroundColor: '#fff', borderRadius: rs(10), padding: wp(8), alignItems: 'center', marginTop: hp(2.5) },
  emptyText: { color: '#64748B', fontSize: rf(13) },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    maxHeight: H * 0.88,
    paddingHorizontal: wp(5.3),
    paddingTop: hp(2.5),
    paddingBottom: hp(2),
  },
  modalTitle: { fontSize: rf(16), fontWeight: '700', color: '#1E293B', marginBottom: hp(2), textAlign: 'center' },
  modalScroll: { paddingBottom: hp(1.5) },
  label: { fontSize: rf(12.5), fontWeight: '600', color: '#374151', marginBottom: hp(0.8), marginTop: hp(0.5) },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(8),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3.7),
    fontSize: rf(13.5),
    color: '#1F2937',
    marginBottom: hp(1.5),
  },
  inputDisabled: { backgroundColor: '#F1F5F9', color: '#94A3B8' },
  btnGroup: { flexDirection: 'row', gap: wp(2.7), marginBottom: hp(1.5) },
  groupBtn: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: rs(8), paddingVertical: hp(1.3), alignItems: 'center' },
  groupBtnActive: { backgroundColor: '#0D2B6E', borderColor: 'transparent' },
  groupBtnText: { fontSize: rf(13), fontWeight: '600', color: '#64748B' },
  groupBtnTextActive: { color: '#fff' },

  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: wp(2.7), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0', paddingTop: hp(1.8), marginTop: hp(0.5) },
  modalBtn: { flex: 1, paddingVertical: hp(1.6), borderRadius: rs(8), alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#64748B', fontWeight: '700', fontSize: rf(13) },
  saveBtn: { backgroundColor: '#0D2B6E' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(13) },
});

export default EmployeeMasterScreen;
