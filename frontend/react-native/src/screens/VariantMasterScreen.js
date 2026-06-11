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
  getVariants,
  createVariant,
  updateVariant,
  deleteVariant,
} from '../services/variantService';

const VariantMasterScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState([]);
  const [activeTab, setActiveTab] = useState('Location'); // 'Location', 'Area', 'Status', 'Category'

  // Modal State for Add/Edit
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null); // null for Add, variant object for Edit

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const fetchVariantsData = async () => {
    setLoading(true);
    try {
      // Fetch variants for the activeTab filter
      const response = await getVariants(activeTab);
      if (response.success && response.data) {
        setVariants(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch variants');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message || 'Error fetching variants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVariantsData();
  }, [activeTab]);

  const openAddModal = () => {
    setEditingVariant(null);
    setName('');
    setCode('');
    setDescription('');
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
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Variant name is required');
      return;
    }

    setSubmitting(true);
    const variantData = {
      variant_type: activeTab,
      variant_name: name,
      variant_code: code || null,
      description: description || null,
    };

    try {
      if (editingVariant) {
        // Update
        const response = await updateVariant(editingVariant.id, variantData);
        if (response.success) {
          Alert.alert('Success', 'Variant updated successfully');
          setFormModalVisible(false);
          fetchVariantsData();
        } else {
          Alert.alert('Error', response.message || 'Failed to update variant');
        }
      } else {
        // Create
        const response = await createVariant(variantData);
        if (response.success) {
          Alert.alert('Success', 'Variant created successfully');
          setFormModalVisible(false);
          fetchVariantsData();
        } else {
          Alert.alert('Error', response.message || 'Failed to create variant');
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
      `Are you sure you want to delete "${item.variant_name}"? This may affect existing reports referencing this value.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteVariant(item.id);
              if (response.success) {
                Alert.alert('Success', 'Variant deleted successfully');
                fetchVariantsData();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete variant');
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Variant Master</Text>
        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Text style={styles.addIcon}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['Location', 'Area', 'Status', 'Category'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#D32F2F" />
        </View>
      ) : (
        <FlatList
          data={variants}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.variantRow}>
              <View style={styles.variantInfo}>
                <Text style={styles.variantName}>{item.variant_name}</Text>
                {item.variant_code && (
                  <Text style={styles.variantCode}>Code: {item.variant_code}</Text>
                )}
                {item.description && (
                  <Text style={styles.variantDesc}>{item.description}</Text>
                )}
              </View>
              <View style={styles.actionsContainer}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionButton}>
                  <Text style={styles.editButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionButton}>
                  <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No {activeTab}s configured yet.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                <Text style={styles.emptyButtonText}>Add First {activeTab}</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={formModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingVariant ? `Edit ${activeTab}` : `Add New ${activeTab}`}
            </Text>

            <Text style={styles.label}>{activeTab} Name *</Text>
            <TextInput
              style={styles.input}
              placeholder={`Enter name (e.g. Floor 3, Safety Area)`}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>{activeTab} Code (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. FLR3, SAFE"
              placeholderTextColor="#999"
              value={code}
              onChangeText={setCode}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter brief description..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

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
                  <Text style={styles.saveButtonText}>Save</Text>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#D32F2F',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 15,
  },
  variantRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    elevation: 1,
  },
  variantInfo: {
    flex: 0.65,
  },
  variantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  variantCode: {
    fontSize: 12,
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    fontWeight: '600',
  },
  variantDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 18,
  },
  actionsContainer: {
    flex: 0.3,
    justifyContent: 'space-around',
    alignItems: 'flex-end',
  },
  actionButton: {
    paddingVertical: 4,
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
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    marginBottom: 15,
  },
  emptyButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '100%',
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
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
    height: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
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

export default VariantMasterScreen;
