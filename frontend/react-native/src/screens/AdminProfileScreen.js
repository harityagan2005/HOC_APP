import React, { useContext } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView,
  Alert, Dimensions, PixelRatio, Platform, StatusBar,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;
const STATUSBAR_H = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const BLUE_DARK   = '#0D2B6E';
const BLUE_ACCENT = '#2563EB';
const BG          = '#F0F4F8';
const CARD_BG     = '#FFFFFF';
const TEXT_DARK   = '#1E293B';
const TEXT_GRAY   = '#64748B';
const BORDER      = '#E2E8F0';

const InfoRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
};

const AdminProfileScreen = ({ navigation }) => {
  const { user, signOut } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await signOut(); } },
    ]);
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const isAdmin = user?.role === 'Admin' || user?.role === 'admin';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE_DARK} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Profile</Text>
        <View style={{ width: wp(10) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={s.avatarCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.userName}>{user?.name || 'User'}</Text>
          <Text style={s.userEmail}>{user?.email || ''}</Text>
          <View style={[s.roleBadge, isAdmin && s.roleBadgeAdmin]}>
            <Text style={[s.roleText, isAdmin && s.roleTextAdmin]}>
              {isAdmin ? '🛡️  Admin' : '👤  User'}
            </Text>
          </View>
        </View>

        {/* Account Details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Account Details</Text>
          <InfoRow label="Full Name"    value={user?.name} />
          <InfoRow label="Email"        value={user?.email} />
          <InfoRow label="Employee ID"  value={user?.employee_id} />
          <InfoRow label="Role"         value={user?.role} />
          <InfoRow label="Department"   value={user?.department} />
          <InfoRow label="Company"      value={user?.company} />
        </View>

        {/* App Info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>App Information</Text>
          <InfoRow label="App Name"    value="HOC Safety App" />
          <InfoRow label="Version"     value="1.0.0" />
          <InfoRow label="System"      value="Hazard Observation Card" />
          <InfoRow label="Site"        value="KG-D6 • Reliance Industries" />
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={s.logoutText}>🚪  Logout</Text>
        </TouchableOpacity>

        <View style={{ height: hp(4) }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    height: Platform.OS === 'ios' ? hp(11) : hp(7.2) + STATUSBAR_H,
    paddingTop: Platform.OS === 'ios' ? hp(5) : STATUSBAR_H,
    backgroundColor: BLUE_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4.3),
    elevation: 4,
  },
  backBtn:     { padding: rs(6) },
  backIcon:    { fontSize: rf(22), color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: rf(17), fontWeight: '700', color: '#fff' },

  scroll: { padding: wp(4.3), paddingBottom: hp(4) },

  avatarCard: {
    backgroundColor: CARD_BG,
    borderRadius: rs(14),
    padding: wp(6),
    alignItems: 'center',
    marginBottom: hp(2),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: rs(4),
  },
  avatar: {
    width: wp(22),
    height: wp(22),
    borderRadius: wp(11),
    backgroundColor: BLUE_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.5),
    borderWidth: 3,
    borderColor: '#BFDBFE',
  },
  avatarText: { fontSize: rf(30), fontWeight: '800', color: '#fff', includeFontPadding: false },
  userName:   { fontSize: rf(20), fontWeight: '800', color: TEXT_DARK, marginBottom: hp(0.4) },
  userEmail:  { fontSize: rf(13), color: TEXT_GRAY, marginBottom: hp(1.5) },
  roleBadge:  { paddingHorizontal: wp(4), paddingVertical: hp(0.7), borderRadius: rs(20), backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: BORDER },
  roleBadgeAdmin: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  roleText:   { fontSize: rf(13), fontWeight: '700', color: TEXT_GRAY },
  roleTextAdmin: { color: BLUE_ACCENT },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: rs(12),
    padding: wp(4.8),
    marginBottom: hp(1.8),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: rs(2),
  },
  cardTitle: {
    fontSize: rf(12),
    fontWeight: '800',
    color: TEXT_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: hp(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    paddingBottom: hp(1),
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: { fontSize: rf(12.5), color: TEXT_GRAY, fontWeight: '500', flex: 1 },
  infoValue: { fontSize: rf(13), color: TEXT_DARK, fontWeight: '700', textAlign: 'right', flex: 1.5 },

  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: rs(12),
    paddingVertical: hp(2),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: hp(1),
  },
  logoutText: { fontSize: rf(15), fontWeight: '700', color: '#DC2626' },
});

export default AdminProfileScreen;
