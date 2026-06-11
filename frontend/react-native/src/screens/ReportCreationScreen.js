import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { createReport } from '../services/reportService';
import { getVariants } from '../services/variantService';
import { AuthContext } from '../../App';

const ReportCreationScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(true);

  // Variant lists
  const [variants, setVariants] = useState([]);
  const [locations, setLocations] = useState([]);
  const [areas, setAreas] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Form Fields
  const [jobReqFor, setJobReqFor] = useState('');
  const [company, setCompany] = useState('');
  const [observerName, setObserverName] = useState(user?.name || '');
  const [observationDate, setObservationDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [operAct, setOperAct] = useState('');
  const [observations, setObservations] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');
  const [accountablePerson, setAccountablePerson] = useState('');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [hod, setHod] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [stopJob, setStopJob] = useState('No');
  const [endDate, setEndDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [severity, setSeverity] = useState('Low');
  const [fyYear, setFyYear] = useState('');

  // Custom Selector Modals State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(''); // 'location', 'area', 'status', 'category', 'department'
  const [modalData, setModalData] = useState([]);

  // Fetch Variants
  const fetchAllVariants = async () => {
    setLoadingVariants(true);
    try {
      const response = await getVariants();
      if (response.success && response.data) {
        const data = response.data;
        setVariants(data);

        // Filter variants by type
        const locList = data.filter((v) => v.variant_type.toLowerCase() === 'location');
        const areaList = data.filter((v) => v.variant_type.toLowerCase() === 'area');
        const statList = data.filter((v) => v.variant_type.toLowerCase() === 'status');
        const catList = data.filter((v) => v.variant_type.toLowerCase() === 'category');
        const deptList = data.filter(
          (v) =>
            v.variant_type.toLowerCase() === 'department' ||
            v.variant_type.toLowerCase() === 'action department'
        );

        setLocations(locList);
        setAreas(areaList);
        setStatuses(statList);
        setCategories(catList);
        setDepartments(deptList);

        // Pre-fill default status 'Open' if exists
        const openStatus = statList.find((s) => s.variant_name.toLowerCase() === 'open');
        if (openStatus) {
          setSelectedStatus(openStatus);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch variants for dropdown lists');
    } finally {
      setLoadingVariants(false);
    }
  };

  useEffect(() => {
    fetchAllVariants();
    
    // Set default financial year (e.g. 2026-27)
    const currentYear = new Date().getFullYear();
    const nextYearSuffix = (currentYear + 1).toString().slice(-2);
    setFyYear(`${currentYear}-${nextYearSuffix}`);
  }, []);

  const openSelectorModal = (type) => {
    setModalType(type);
    switch (type) {
      case 'location':
        setModalData(locations);
        break;
      case 'area':
        setModalData(areas);
        break;
      case 'status':
        setModalData(statuses);
        break;
      case 'category':
        setModalData(categories);
        break;
      case 'department':
        setModalData(departments);
        break;
      default:
        setModalData([]);
    }
    setModalVisible(true);
  };

  const handleSelectItem = (item) => {
    switch (modalType) {
      case 'location':
        setSelectedLocation(item);
        break;
      case 'area':
        setSelectedArea(item);
        break;
      case 'status':
        setSelectedStatus(item);
        break;
      case 'category':
        setSelectedCategory(item);
        break;
      case 'department':
        setSelectedDepartment(item);
        break;
    }
    setModalVisible(false);
  };

  const handleSubmit = async () => {
    // Validate inputs
    if (!jobReqFor.trim()) return Alert.alert('Validation Error', 'Job requirement field is required');
    if (!observerName.trim()) return Alert.alert('Validation Error', 'Observer name is required');
    if (!selectedLocation) return Alert.alert('Validation Error', 'Location is required');
    if (!selectedArea) return Alert.alert('Validation Error', 'Area is required');
    if (!selectedStatus) return Alert.alert('Validation Error', 'Status is required');
    if (!selectedCategory) return Alert.alert('Validation Error', 'Category is required');
    if (!observations.trim()) return Alert.alert('Validation Error', 'Observations description is required');

    setLoading(true);

    const reportData = {
      job_req_for: jobReqFor,
      company: company || null,
      observer_name: observerName,
      observation_date: observationDate,
      location_id: selectedLocation.id,
      area_id: selectedArea.id,
      status_id: selectedStatus.id,
      category_id: selectedCategory.id,
      action_department_id: selectedDepartment ? selectedDepartment.id : null,
      oper_act: operAct || null,
      observations: observations,
      corrective_actions: correctiveActions || null,
      accountable_person: accountablePerson || null,
      responsible_person: responsiblePerson || null,
      hod: hod || null,
      image_url: imageUrl || null,
      stop_job: stopJob,
      end_date: endDate || null,
      remarks: remarks || null,
      severity: severity,
      fy_year: fyYear || null,
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
      console.error(error);
      Alert.alert('Error', error.message || 'Error occurred during submission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f9f9f9' }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Hazard Report</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadingVariants ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text style={styles.loadingText}>Fetching variants list...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Observation Details</Text>

            <Text style={styles.label}>Job Requirement For *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Scaffolding, Hot Work, Excavation"
              placeholderTextColor="#999"
              value={jobReqFor}
              onChangeText={setJobReqFor}
            />

            <Text style={styles.label}>Company / Contractor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Reliance, Contractors Ltd."
              placeholderTextColor="#999"
              value={company}
              onChangeText={setCompany}
            />

            <Text style={styles.label}>Observer Name *</Text>
            <TextInput
              style={styles.input}
              value={observerName}
              onChangeText={setObserverName}
            />

            <Text style={styles.label}>Observation Date (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-06-10"
              placeholderTextColor="#999"
              value={observationDate}
              onChangeText={setObservationDate}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Categorization & Location</Text>

            {/* Location Selector */}
            <Text style={styles.label}>Location *</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => openSelectorModal('location')}
            >
              <Text style={selectedLocation ? styles.selectorText : styles.placeholderSelectorText}>
                {selectedLocation ? selectedLocation.variant_name : 'Select Location'}
              </Text>
              <Text style={styles.selectorArrow}>▼</Text>
            </TouchableOpacity>

            {/* Area Selector */}
            <Text style={styles.label}>Area *</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => openSelectorModal('area')}
            >
              <Text style={selectedArea ? styles.selectorText : styles.placeholderSelectorText}>
                {selectedArea ? selectedArea.variant_name : 'Select Area'}
              </Text>
              <Text style={styles.selectorArrow}>▼</Text>
            </TouchableOpacity>

            {/* Category Selector */}
            <Text style={styles.label}>Hazard Category *</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => openSelectorModal('category')}
            >
              <Text style={selectedCategory ? styles.selectorText : styles.placeholderSelectorText}>
                {selectedCategory ? selectedCategory.variant_name : 'Select Hazard Category'}
              </Text>
              <Text style={styles.selectorArrow}>▼</Text>
            </TouchableOpacity>

            {/* Status Selector */}
            <Text style={styles.label}>Status *</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => openSelectorModal('status')}
            >
              <Text style={selectedStatus ? styles.selectorText : styles.placeholderSelectorText}>
                {selectedStatus ? selectedStatus.variant_name : 'Select Status'}
              </Text>
              <Text style={styles.selectorArrow}>▼</Text>
            </TouchableOpacity>

            {/* Action Department Selector */}
            <Text style={styles.label}>Action Department</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => openSelectorModal('department')}
            >
              <Text style={selectedDepartment ? styles.selectorText : styles.placeholderSelectorText}>
                {selectedDepartment ? selectedDepartment.variant_name : 'Select Department (Optional)'}
              </Text>
              <Text style={styles.selectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Observation Findings</Text>

            <Text style={styles.label}>Severity Level *</Text>
            <View style={styles.buttonGroup}>
              {['Low', 'Medium', 'High', 'Critical'].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.groupButton,
                    severity === level && {
                      backgroundColor:
                        level === 'Critical'
                          ? '#DC2626'
                          : level === 'High'
                          ? '#EA580C'
                          : level === 'Medium'
                          ? '#D97706'
                          : '#0D9488',
                      borderColor: 'transparent',
                    },
                  ]}
                  onPress={() => setSeverity(level)}
                >
                  <Text style={[styles.groupButtonText, severity === level && { color: '#fff' }]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Stop Job Triggered? *</Text>
            <View style={styles.buttonGroup}>
              {['Yes', 'No'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.groupButton,
                    stopJob === option && {
                      backgroundColor: option === 'Yes' ? '#DC2626' : '#4B5563',
                      borderColor: 'transparent',
                    },
                    { flex: 0.48 },
                  ]}
                  onPress={() => setStopJob(option)}
                >
                  <Text style={[styles.groupButtonText, stopJob === option && { color: '#fff' }]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Operation / Activity being observed</Text>
            <TextInput
              style={styles.input}
              placeholder="What activity was being performed?"
              placeholderTextColor="#999"
              value={operAct}
              onChangeText={setOperAct}
            />

            <Text style={styles.label}>Observations / Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what you observed. Highlight the safety hazard."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={observations}
              onChangeText={setObservations}
            />

            <Text style={styles.label}>Immediate Corrective Actions Taken</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What actions were taken immediately to mitigate the hazard?"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={correctiveActions}
              onChangeText={setCorrectiveActions}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Responsibility & Closure</Text>

            <Text style={styles.label}>Accountable Person</Text>
            <TextInput
              style={styles.input}
              placeholder="Name of accountable person"
              placeholderTextColor="#999"
              value={accountablePerson}
              onChangeText={setAccountablePerson}
            />

            <Text style={styles.label}>Responsible Person</Text>
            <TextInput
              style={styles.input}
              placeholder="Name of responsible person"
              placeholderTextColor="#999"
              value={responsiblePerson}
              onChangeText={setResponsiblePerson}
            />

            <Text style={styles.label}>HOD (Head of Department)</Text>
            <TextInput
              style={styles.input}
              placeholder="Name of HOD"
              placeholderTextColor="#999"
              value={hod}
              onChangeText={setHod}
            />

            <Text style={styles.label}>End Date (Closure Deadline) (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-06-30"
              placeholderTextColor="#999"
              value={endDate}
              onChangeText={setEndDate}
            />

            <Text style={styles.label}>Financial Year</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-2027"
              placeholderTextColor="#999"
              value={fyYear}
              onChangeText={setFyYear}
            />

            <Text style={styles.label}>Image URL</Text>
            <TextInput
              style={styles.input}
              placeholder="Link to observation photo"
              placeholderTextColor="#999"
              value={imageUrl}
              onChangeText={setImageUrl}
            />

            <Text style={styles.label}>Remarks / Extra Comments</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any additional remarks..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={remarks}
              onChangeText={setRemarks}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Dynamic Selector Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {modalType.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeModalButton}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            {modalData.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Text style={styles.modalEmptyText}>No values found for {modalType}.</Text>
                {(user?.role === 'Admin' || user?.role === 'admin') && (
                  <Text style={styles.modalHelpText}>
                    Please add values via the Variant Master screen.
                  </Text>
                )}
              </View>
            ) : (
              <FlatList
                data={modalData}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => handleSelectItem(item)}
                  >
                    <View>
                      <Text style={styles.modalItemName}>{item.variant_name}</Text>
                      {item.variant_code && (
                        <Text style={styles.modalItemCode}>Code: {item.variant_code}</Text>
                      )}
                    </View>
                    <Text style={styles.selectArrowIcon}>→</Text>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.modalItemSeparator} />}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    elevation: 4,
  },
  backButton: {
    padding: 10,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 18,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  selectorText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  placeholderSelectorText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectorArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  groupButton: {
    flex: 0.23,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  groupButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  submitButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeModalButton: {
    padding: 5,
  },
  closeModalText: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  modalItemName: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  modalItemCode: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  selectArrowIcon: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  modalItemSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  modalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalHelpText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ReportCreationScreen;
