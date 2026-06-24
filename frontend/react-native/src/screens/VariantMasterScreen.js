import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Modal, FlatList,
  Dimensions, PixelRatio, Platform,
} from 'react-native';
import { getVariants, createVariant, updateVariant, deleteVariant } from '../services/variantService';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;

const TABS = ['Location', 'Area', 'Status', 'Category'];

const VariantMasterScreen = ({ navigation }) => {
  const [loading, setLoading]               = useState(true);
  const [variants, setVariants]             = useState([]);
  const [activeTab, setActiveTab]           = useState('Location');
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [name, setName]                     = useState('');
  const [code, setCode]                     = useState('');
  const [description, setDescription]       = useState('');

  const fetchVariantsData = async () => {
    setLoading(true);
    try {
      const response = await getVariants(activeTab);
      if (response.success && response.data) setVariants(response.data);
      else Alert.alert('Error', response.message || 'Failed to fetch variants');
    } catch (e) {
      Alert.alert('Error', e.message || 'Error fetching variants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVariantsData(); }, [activeTab]);

  const openAddModal = () => {
    setEditingVariant(null); setName(''); setCode(''); setDescription('');
    setFormModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingVariant(item);
    setName(item.variant_name);
    setCode(item.variant_code || '');
    setDescription(item.description || '');
    setFormModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) { Alert.alert('Validation Error', 'Variant name is required'); return; }
    setSubmitting(true);
    const data = { variant_type: activeTab, variant_name: name, variant_code: code || null, description: description || null };
    try {
      const fn = editingVariant ? updateVariant(editingVariant.id, data) : createVariant(data);
      const response = await fn;
      if (response.success) {
        Alert.alert('Success', editingVariant ? 'Variant updated' : 'Variant created');
        setFormModalVisible(false);
        fetchVariantsData();
      } else {
        Alert.alert('Error', response.message || 'Operation failed');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Confirm Delete', `Delete "${item.variant_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            const r = await deleteVariant(item.id);
            if (r.success) { Alert.alert('Success', 'Deleted'); fetchVariantsData(); }
            else Alert.alert('Error', r.message || 'Delete failed');
          } catch (e) { Alert.alert('Error', e.message || 'Delete failed'); }
        },
      },
    ]);
  };

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Variant Master</Text>
        <TouchableOpacity onPress={openAddModal} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#0D2B6E" /></View>
      ) : (
        <FlatList
          data={variants}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={s.rowInfo}>
                <Text style={s.rowName}>{item.variant_name}</Text>
                {item.variant_code ? (
                  <View style={s.codeBadge}>
                    <Text style={s.codeText}>{item.variant_code}</Text>
                  </View>
                ) : null}
                {item.description ? <Text style={s.rowDesc} numberOfLines={2}>{item.description}</Text> : null}
              </View>
              <View style={s.rowActions}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={s.actionBtn}>
                  <Text style={s.editText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={s.actionBtn}>
                  <Text style={s.deleteText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Text style={s.emptyText}>No {activeTab}s configured yet.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={openAddModal}>
                <Text style={s.emptyBtnText}>Add First {activeTab}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Modal */}
      <Modal visible={formModalVisible} transparent animationType="fade">
        <View style={s.modalBackdrop}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{editingVariant ? `Edit ${activeTab}` : `Add New ${activeTab}`}</Text>

            <Text style={s.label}>{activeTab} Name *</Text>
            <TextInput style={s.input} placeholder="Enter name" placeholderTextColor="#9CA3AF" value={name} onChangeText={setName} />

            <Text style={s.label}>Code (Optional)</Text>
            <TextInput style={s.input} placeholder="e.g. LOC01" placeholderTextColor="#9CA3AF" value={code} onChangeText={setCode} />

            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="Enter description..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

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
  root:  { flex: 1, backgroundColor: '#F0F4F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    height: Platform.OS === 'ios' ? hp(11) : hp(7.2),
    paddingTop: Platform.OS === 'ios' ? hp(5) : 0,
    backgroundColor: '#0D2B6E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4.3),
    elevation: 4,
  },
  backBtn:      { padding: rs(6) },
  backIcon:     { fontSize: rf(22), color: '#fff', fontWeight: '700' },
  headerTitle:  { fontSize: rf(17), fontWeight: '700', color: '#fff' },
  addBtn:       { paddingVertical: hp(0.7), paddingHorizontal: wp(3.2), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: rs(6) },
  addBtnText:   { color: '#fff', fontWeight: '700', fontSize: rf(13) },

  tabs: { flexDirection: 'row', backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: rs(2) },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: hp(1.8), borderBottomWidth: rs(3), borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: '#0D2B6E' },
  tabText:      { fontSize: rf(12.5), fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#0D2B6E', fontWeight: '700' },

  listContent: { padding: wp(4.3), paddingBottom: hp(3) },
  row: {
    backgroundColor: '#fff',
    borderRadius: rs(10),
    padding: wp(4),
    marginBottom: hp(1.2),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: rs(2),
  },
  rowInfo:    { flex: 1, marginRight: wp(2.7) },
  rowName:    { fontSize: rf(14), fontWeight: '700', color: '#1E293B' },
  codeBadge:  { alignSelf: 'flex-start', backgroundColor: '#EFF6FF', paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: rs(4), marginTop: hp(0.5) },
  codeText:   { fontSize: rf(11), color: '#2563EB', fontWeight: '700' },
  rowDesc:    { fontSize: rf(12), color: '#64748B', marginTop: hp(0.6), lineHeight: rf(17) },
  rowActions: { gap: hp(0.8), alignItems: 'flex-end' },
  actionBtn:  { paddingVertical: hp(0.5), paddingHorizontal: wp(1) },
  editText:   { fontSize: rf(12.5), color: '#2563EB', fontWeight: '700' },
  deleteText: { fontSize: rf(12.5), color: '#DC2626', fontWeight: '700' },

  empty:       { backgroundColor: '#fff', borderRadius: rs(10), padding: wp(10), alignItems: 'center', marginTop: hp(2.5) },
  emptyText:   { color: '#64748B', fontSize: rf(13), marginBottom: hp(1.8) },
  emptyBtn:    { backgroundColor: '#0D2B6E', borderRadius: rs(8), paddingVertical: hp(1.2), paddingHorizontal: wp(5.3) },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(13) },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: wp(5.3) },
  modalBox: { backgroundColor: '#fff', borderRadius: rs(14), width: '100%', padding: wp(5.3), elevation: 6 },
  modalTitle: { fontSize: rf(16), fontWeight: '700', color: '#1E293B', marginBottom: hp(2.2), textAlign: 'center' },
  label:  { fontSize: rf(12.5), fontWeight: '600', color: '#374151', marginBottom: hp(0.8) },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(8),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3.7),
    fontSize: rf(13.5),
    color: '#1F2937',
    marginBottom: hp(1.8),
  },
  textArea: { height: hp(9), textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: hp(0.5) },
  modalBtn:     { flex: 0.48, paddingVertical: hp(1.5), borderRadius: rs(8), alignItems: 'center' },
  cancelBtn:    { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#D1D5DB' },
  cancelBtnText: { color: '#64748B', fontWeight: '700', fontSize: rf(13) },
  saveBtn:      { backgroundColor: '#0D2B6E' },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: rf(13) },
});

export default VariantMasterScreen;
