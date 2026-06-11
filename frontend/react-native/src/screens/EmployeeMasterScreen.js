import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import {
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
} from '../services/employeeService';

const EmployeeMasterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); // null for Add, employee object for Edit

  // Form Fields
  const [empId, setEmpId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User'); // 'User', 'Admin'
  const [isActive, setIsActive] = useState(true);

  const fetchEmployeesData = async () => {
    setLoading(true);
    try {
      const response = await getEmployees();
      if (response.success && response.data) {
        setEmployees(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch employees');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'Error loading employee list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesData();
  }, []);

  const openAddModal = () => {
    setEditingEmployee(null);
    setEmpId('');
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('User');
    setIsActive(true);
    setFormModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingEmployee(item);
    setEmpId(item.employee_id); // Not editable usually, but prefilled
    setName(item.name);
    setEmail(item.email);
    setPhone(item.phone || '');
    setRole(item.role);
    setIsActive(!!item.is_active);
    setPassword(''); // Don't show password for editing
    setFormModalVisible(true);
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!name.trim()) return Alert.alert('Validation Error', 'Name is required');
    if (!email.trim()) return Alert.alert('Validation Error', 'Email is required');
    if (!phone.trim()) return Alert.alert('Validation Error', 'Phone is required');

    setSubmitting(true);

    try {
      if (editingEmployee) {
        // Update
        const employeeData = {
          name,
          email,
          phone,
          role,
          is_active: isActive,
        };

        const response = await updateEmployee(editingEmployee.id, employeeData);
        if (response.success) {
          Alert.alert('Success', 'Employee updated successfully');
          setFormModalVisible(false);
          fetchEmployeesData();
        } else {
          Alert.alert('Error', response.message || 'Failed to update employee');
        }
      } else {
        // Create
        if (!empId.trim()) return Alert.alert('Validation Error', 'Employee ID is required');
        if (!password.trim() || password.length < 6) {
          return Alert.alert('Validation Error', 'Password is required and must be at least 6 characters');
        }

        const employeeData = {
          employee_id: empId,
          name,
          email,
          phone,
          password,
          role,
        };

        const response = await addEmployee(employeeData);
        if (response.success) {
          Alert.alert('Success', 'Employee added successfully');
          setFormModalVisible(false);
          fetchEmployeesData();
        } else {
          Alert.alert('Error', response.message || 'Failed to add employee');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete employee "${item.name}" (ID: ${item.employee_id})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteEmployee(item.id);
              if (response.success) {
                Alert.alert('Success', 'Employee deleted successfully');
                fetchEmployeesData();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete employee');
              }
            } catch (error) {
              console.error(error);
              Alert.alert('Error', error.message || 'Delete operation failed');
            }
          },
        },
      ]
    );
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Master</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Text style={styles.addIcon}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D32F2F" />
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.employeeCard}>
              <View style={styles.empInfo}>
                <View style={styles.empHeaderRow}>
                  <Text style={styles.empName}>{item.name}</Text>
                  <View style={styles.badgeRow}>
                    <Text
                      style={[
                        styles.roleBadge,
                        item.role.toLowerCase() === 'admin'
                          ? styles.adminBadge
                          : styles.userBadge,
                      ]}
                    >
                      {item.role}
                    </Text>
                    <Text
                      style={[
                        styles.statusBadge,
                        item.is_active ? styles.activeBadge : styles.inactiveBadge,
                      ]}
                    >
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.empDetail}>Employee ID: {item.employee_id}</Text>
                <Text style={styles.empDetail}>Email: {item.email}</Text>
                <Text style={styles.empDetail}>Phone: {item.phone || 'N/A'}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.empActions}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
                  <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
                  <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No employees matching search.</Text>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={formModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingEmployee ? 'Edit Employee Details' : 'Add New Employee'}
            </Text>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.label}>Employee ID *</Text>
              <TextInput
                style={[styles.input, editingEmployee && styles.disabledInput]}
                placeholder="e.g. EMP102"
                placeholderTextColor="#999"
                value={empId}
                onChangeText={setEmpId}
                editable={!editingEmployee}
              />

              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. name@hocapp.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              {!editingEmployee && (
                <>
                  <Text style={styles.label}>Password (Min 6 chars) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </>
              )}

              <Text style={styles.label}>User Role *</Text>
              <View style={styles.buttonGroup}>
                {['User', 'Admin'].map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.groupButton,
                      role === r && styles.activeGroupButton,
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text
                      style={[
                        styles.groupButtonText,
                        role === r && styles.activeGroupButtonText,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editingEmployee && (
                <>
                  <Text style={styles.label}>Account Status *</Text>
                  <View style={styles.buttonGroup}>
                    {[
                      { label: 'Active', value: true },
                      { label: 'Inactive', value: false },
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        style={[
                          styles.groupButton,
                          isActive === opt.value && styles.activeGroupButton,
                        ]}
                        onPress={() => setIsActive(opt.value)}
                      >
                        <Text
                          style={[
                            styles.groupButtonText,
                            isActive === opt.value && styles.activeGroupButtonText,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setFormModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Details</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
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
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  addIcon: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  empInfo: {
    marginBottom: 10,
  },
  empHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  empName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    flex: 0.6,
  },
  badgeRow: {
    flexDirection: 'row',
    flex: 0.4,
    justifyContent: 'flex-end',
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 4,
    overflow: 'hidden',
  },
  adminBadge: {
    backgroundColor: '#EEF2F6',
    color: '#1E3A8A',
  },
  userBadge: {
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  activeBadge: {
    backgroundColor: '#ECFDF5',
    color: '#047857',
  },
  inactiveBadge: {
    backgroundColor: '#FEF2F2',
    color: '#DC2626',
  },
  empDetail: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 5,
  },
  empActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 5,
  },
  actionButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  editButtonText: {
    color: '#1E3A8A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalScroll: {
    paddingBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
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
    marginBottom: 12,
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  groupButton: {
    flex: 0.48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGroupButton: {
    backgroundColor: '#4B5563',
    borderColor: 'transparent',
  },
  groupButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  activeGroupButtonText: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 15,
  },
  modalButton: {
    flex: 0.48,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#D32F2F',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default EmployeeMasterScreen;
