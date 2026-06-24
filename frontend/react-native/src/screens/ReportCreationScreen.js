import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal, FlatList, KeyboardAvoidingView, Platform,
  Dimensions, PixelRatio, StatusBar,
} from 'react-native';
import { createReport } from '../services/reportService';
import { getVariants } from '../services/variantService';
import { AuthContext } from '../../App';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;
const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const ReportCreationScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);

  const [loading, setLoading]               = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [locations, setLocations]           = useState([]);
  const [areas, setAreas]                   = useState([]);
  const [statuses, setStatuses]             = useState([]);
  const [categories, setCategories]         = useState([]);
  const [departments, setDepartments]       = useState([]);

  const [jobReqFor, setJobReqFor]           = useState('');
  const [company, setCompany]               = useState('');
  const [observerName, setObserverName]     = useState(user?.name || '');
  const [observationDate, setObservationDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLocation, setSelectedLocation]   = useState(null);
  const [selectedArea, setSelectedArea]           = useState(null);
  const [selectedStatus, setSelectedStatus]       = useState(null);
  const [selectedCategory, setSelectedCategory]   = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [operAct, setOperAct]               = useState('');
  const [observations, setObservations]     = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [accountablePerson, setAccountablePerson] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [hod, setHod]                       = useState('');
  const [imageUrl, setImageUrl]             = useState('');
  const [stopJob, setStopJob]               = useState('No');
  const [endDate, setEndDate]               = useState('');
  const [remarks, setRemarks]               = useState('');
  const [severity, setSeverity]             = useState('Low');
  const [fyYear, setFyYear]                 = useState('');

  const [modalVisible, setModalVisible]     = useState(false);
  const [modalType, setModalType]           = useState('');
  const [modalData, setModalData]           = useState([]);

  const fetchAllVariants = async () => {
    setLoadingVariants(true);
    try {
      const response = await getVariants();
      if (response.success && response.data) {
        const data = response.data;
        const locList  = data.filter((v) => v.variant_type.toLowerCase() === 'location');
        const areaList = data.filter((v) => v.variant_type.toLowerCase() === 'area');
        const statList = data.filter((v) => v.variant_type.toLowerCase() === 'status');
        const catList  = data.filter((v) => v.variant_type.toLowerCase() === 'category');
        const deptList = data.filter((v) =>
          v.variant_type.toLowerCase() === 'department' ||
          v.variant_type.toLowerCase() === 'action department'
        );
        setLocations(locList); setAreas(areaList); setStatuses(statList);
        setCategories(catList); setDepartments(deptList);
        const openStatus = statList.find((s) => s.variant_name.toLowerCase() === 'open');
        if (openStatus) setSelectedStatus(openStatus);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch variants for dropdown lists');
    } finally {
      setLoadingVariants(false);
    }
  };

  useEffect(() => {
    fetchAllVariants();
    const y = new Date().getFullYear();
    setFyYear(`${y}-${(y + 1).toString().slice(-2)}`);
  }, []);

  const openSelectorModal = (type) => {
    setModalType(type);
    const map = { location: locations, area: areas, status: statuses, category: categories, department: departments };
    setModalData(map[type] || []);
    setModalVisible(true);
  };

  const handleSelectItem = (item) => {
    const setters = {
      location: setSelectedLocation, area: setSelectedArea, status: setSelectedStatus,
      category: setSelectedCategory, department: setSelectedDepartment,
    };
    setters[modalType]?.(item);
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    if (!jobReqFor.trim())   return Alert.alert('Validation Error', 'Job requirement field is required');
    if (!observerName.trim()) return Alert.alert('Validation Error', 'Observer name is required');
    if (!selectedLocation)    return Alert.alert('Validation Error', 'Location is required');
    if (!selectedArea)        return Alert.alert('Validation Error', 'Area is required');
    if (!selectedStatus)      return Alert.alert('Validation Error', 'Status is required');
    if (!selectedCategory)    return Alert.alert('Validation Error', 'Category is required');
    if (!observations.trim()) return Alert.alert('Validation Error', 'Observations description is required');

    setLoading(true);
    const reportData = {
      job_req_for: jobReqFor, company: company || null, observer_name: observerName,
      observation_date: observationDate, location_id: selectedLocation.id,
      area_id: selectedArea.id, status_id: selectedStatus.id, category_id: selectedCategory.id,
      action_department_id: selectedDepartment?.id || null, oper_act: operAct || null,
      observations, corrective_actions: correctiveActions || null,
      accountable_person: accountablePerson || null, responsible_person: responsiblePerson || null,
      hod: hod || null, image_url: imageUrl || null, stop_job: stopJob,
      end_date: endDate || null, remarks: remarks || null, severity, fy_year: fyYear || null,
    };
    try {
      const response = await createReport(reportData);
      if (response.success) {
        Alert.alert('Success', 'Hazard observation report created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to submit report');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Error occurred during submission');
    } finally {
      setLoading(false);
    }
  };

  const Selector = ({ label, value, placeholder, type }) => (
    <>
      <Text style={s.label}>{label}</Text>
      <TouchableOpacity style={s.selectorBtn} onPress={() => openSelectorModal(type)}>
        <Text style={[s.selectorTxt, !value && s.selectorPlaceholder]}>
          {value ? value.variant_name : placeholder}
        </Text>
        <Text style={s.selectorArrow}>▼</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.root}
    >
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Hazard Report</Text>
        <View style={{ width: wp(10.7) }} />
      </View>

      {loadingVariants ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0D2B6E" />
          <Text style={s.loadingText}>Fetching variants list…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent}>
          {/* Card 1: Basic Details */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Basic Observation Details</Text>

            <Text style={s.label}>Job Requirement For *</Text>
            <TextInput style={s.input} placeholder="e.g. Scaffolding, Hot Work, Excavation" placeholderTextColor="#9CA3AF" value={jobReqFor} onChangeText={setJobReqFor} />

            <Text style={s.label}>Company / Contractor Name</Text>
            <TextInput style={s.input} placeholder="e.g. Reliance, Contractors Ltd." placeholderTextColor="#9CA3AF" value={company} onChangeText={setCompany} />

            <Text style={s.label}>Observer Name *</Text>
            <TextInput style={s.input} value={observerName} onChangeText={setObserverName} />

            <Text style={s.label}>Observation Date (YYYY-MM-DD) *</Text>
            <TextInput style={s.input} placeholder="e.g. 2026-06-10" placeholderTextColor="#9CA3AF" value={observationDate} onChangeText={setObservationDate} />
          </View>

          {/* Card 2: Categorization */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Categorization {'&'} Location</Text>
            <Selector label="Location *" value={selectedLocation} placeholder="Select Location" type="location" />
            <Selector label="Area *" value={selectedArea} placeholder="Select Area" type="area" />
            <Selector label="Hazard Category *" value={selectedCategory} placeholder="Select Hazard Category" type="category" />
            <Selector label="Status *" value={selectedStatus} placeholder="Select Status" type="status" />
            <Selector label="Action Department" value={selectedDepartment} placeholder="Select Department (Optional)" type="department" />
          </View>

          {/* Card 3: Findings */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Observation Findings</Text>

            <Text style={s.label}>Severity Level *</Text>
            <View style={s.btnGroup}>
              {['Low', 'Medium', 'High', 'Critical'].map((level) => {
                const activeColor = { Critical: '#DC2626', High: '#EA580C', Medium: '#D97706', Low: '#0D9488' }[level];
                return (
                  <TouchableOpacity
                    key={level}
                    style={[s.groupBtn, severity === level && { backgroundColor: activeColor, borderColor: 'transparent' }]}
                    onPress={() => setSeverity(level)}
                  >
                    <Text style={[s.groupBtnText, severity === level && { color: '#fff' }]}>{level}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Stop Job Triggered? *</Text>
            <View style={s.btnGroup}>
              {['Yes', 'No'].map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[s.groupBtn, { flex: 0.48 }, stopJob === opt && { backgroundColor: opt === 'Yes' ? '#DC2626' : '#4B5563', borderColor: 'transparent' }]}
                  onPress={() => setStopJob(opt)}
                >
                  <Text style={[s.groupBtnText, stopJob === opt && { color: '#fff' }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Operation / Activity being observed</Text>
            <TextInput style={s.input} placeholder="What activity was being performed?" placeholderTextColor="#9CA3AF" value={operAct} onChangeText={setOperAct} />

            <Text style={s.label}>Observations / Description *</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Describe what you observed. Highlight the safety hazard." placeholderTextColor="#9CA3AF" multiline numberOfLines={4} value={observations} onChangeText={setObservations} />

            <Text style={s.label}>Immediate Corrective Actions Taken</Text>
            <TextInput style={[s.input, s.textAreaSm]} placeholder="What actions were taken immediately to mitigate the hazard?" placeholderTextColor="#9CA3AF" multiline numberOfLines={3} value={correctiveActions} onChangeText={setCorrectiveActions} />
          </View>

          {/* Card 4: Responsibility */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Responsibility {'&'} Closure</Text>

            <Text style={s.label}>Accountable Person</Text>
            <TextInput style={s.input} placeholder="Name of accountable person" placeholderTextColor="#9CA3AF" value={accountablePerson} onChangeText={setAccountablePerson} />

            <Text style={s.label}>Responsible Person</Text>
            <TextInput style={s.input} placeholder="Name of responsible person" placeholderTextColor="#9CA3AF" value={responsiblePerson} onChangeText={setResponsiblePerson} />

            <Text style={s.label}>HOD (Head of Department)</Text>
            <TextInput style={s.input} placeholder="Name of HOD" placeholderTextColor="#9CA3AF" value={hod} onChangeText={setHod} />

            <Text style={s.label}>End Date (YYYY-MM-DD)</Text>
            <TextInput style={s.input} placeholder="e.g. 2026-06-30" placeholderTextColor="#9CA3AF" value={endDate} onChangeText={setEndDate} />

            <Text style={s.label}>Financial Year</Text>
            <TextInput style={s.input} placeholder="e.g. 2026-2027" placeholderTextColor="#9CA3AF" value={fyYear} onChangeText={setFyYear} />

            <Text style={s.label}>Image URL</Text>
            <TextInput style={s.input} placeholder="Link to observation photo" placeholderTextColor="#9CA3AF" value={imageUrl} onChangeText={setImageUrl} />

            <Text style={s.label}>Remarks / Extra Comments</Text>
            <TextInput style={[s.input, s.textAreaSm]} placeholder="Any additional remarks..." placeholderTextColor="#9CA3AF" multiline numberOfLines={3} value={remarks} onChangeText={setRemarks} />
          </View>

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnText}>Submit Report</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Selector Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select {modalType.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalData.length === 0 ? (
              <View style={s.modalEmpty}>
                <Text style={s.modalEmptyText}>No values found for {modalType}.</Text>
                {(user?.role === 'Admin' || user?.role === 'admin') && (
                  <Text style={s.modalHelpText}>Please add values via the Variant Master screen.</Text>
                )}
              </View>
            ) : (
              <FlatList
                data={modalData}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.modalItem} onPress={() => handleSelectItem(item)}>
                    <View>
                      <Text style={s.modalItemName}>{item.variant_name}</Text>
                      {item.variant_code ? <Text style={s.modalItemCode}>Code: {item.variant_code}</Text> : null}
                    </View>
                    <Text style={s.modalArrow}>→</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={s.sep} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F4F8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: wp(5.3) },
  loadingText: { marginTop: hp(1.2), fontSize: rf(13.5), color: '#64748B' },

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
  headerTitle: { fontSize: rf(17), fontWeight: '700', color: '#fff' },

  scrollContent: { padding: wp(4.3), paddingBottom: hp(5) },

  card: {
    backgroundColor: '#fff',
    borderRadius: rs(10),
    padding: wp(4.8),
    marginBottom: hp(1.8),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: rs(3),
  },
  cardTitle: {
    fontSize: rf(15),
    fontWeight: '700',
    color: '#0D2B6E',
    marginBottom: hp(1.8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    paddingBottom: hp(0.9),
  },
  label: { fontSize: rf(12.5), fontWeight: '600', color: '#374151', marginBottom: hp(0.8), marginTop: hp(0.5) },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(7),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3.7),
    fontSize: rf(13.5),
    color: '#1F2937',
    marginBottom: hp(1.5),
  },
  textArea:   { height: hp(10), textAlignVertical: 'top' },
  textAreaSm: { height: hp(8),  textAlignVertical: 'top' },

  selectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(7),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3.7),
    backgroundColor: '#fff',
    marginBottom: hp(1.5),
  },
  selectorTxt:         { fontSize: rf(13.5), color: '#1F2937', fontWeight: '600', flex: 1 },
  selectorPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  selectorArrow:       { fontSize: rf(12), color: '#6B7280', marginLeft: wp(1.3) },

  btnGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(1.5) },
  groupBtn: { flex: 0.23, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: rs(7), paddingVertical: hp(1.2), alignItems: 'center' },
  groupBtnText: { fontSize: rf(12), fontWeight: '700', color: '#4B5563' },

  submitBtn: {
    backgroundColor: '#0D2B6E',
    borderRadius: rs(10),
    paddingVertical: hp(2),
    alignItems: 'center',
    marginTop: hp(0.5),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.15,
    shadowRadius: rs(4),
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { color: '#fff', fontSize: rf(15), fontWeight: '700' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: rs(20),
    borderTopRightRadius: rs(20),
    maxHeight: H * 0.75,
    padding: wp(5.3),
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: hp(2.2), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0', paddingBottom: hp(1.5),
  },
  modalTitle:  { fontSize: rf(15), fontWeight: '700', color: '#1E293B' },
  modalClose:  { fontSize: rf(18), color: '#94A3B8', fontWeight: '700', padding: rs(4) },
  modalItem:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: hp(1.8), paddingHorizontal: wp(1.3) },
  modalItemName: { fontSize: rf(14.5), color: '#1F2937', fontWeight: '600' },
  modalItemCode: { fontSize: rf(12), color: '#6B7280', marginTop: hp(0.35) },
  modalArrow:  { fontSize: rf(15), color: '#94A3B8' },
  sep:         { height: StyleSheet.hairlineWidth, backgroundColor: '#F3F4F6' },
  modalEmpty:  { padding: hp(5), alignItems: 'center' },
  modalEmptyText: { fontSize: rf(13.5), color: '#6B7280', fontWeight: '600', textAlign: 'center' },
  modalHelpText:  { fontSize: rf(12), color: '#9CA3AF', marginTop: hp(0.9), textAlign: 'center' },
});

export default ReportCreationScreen;
