import React, { useState, useContext } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Image, KeyboardAvoidingView,
  Platform, ScrollView, TouchableWithoutFeedback, Keyboard,
  Dimensions, PixelRatio,
} from 'react-native';
import { login } from '../services/authService';
import { AuthContext } from '../../App';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;

const LoginScreen = ({ navigation }) => {
  const { signIn } = useContext(AuthContext);
  const [employeeId, setEmployeeId]   = useState('');
  const [password, setPassword]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    const normalizedEmployeeId = employeeId.trim();

    if (!normalizedEmployeeId || !password) {
      Alert.alert('Error', 'Please enter both Employee ID and Password');
      return;
    }
    setLoading(true);
    try {
      const response = await login(normalizedEmployeeId, password);
      if (response.success && response.data) {
        await signIn(response.data.token, response.data.user);
      } else {
        Alert.alert('Error', response.message || 'Login failed');
      }
    } catch (error) {
      const msg = error?.message || (typeof error === 'string' ? error : 'Login failed. Check network connection.');
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? hp(11) : hp(2.5)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Header */}
          <View style={s.header}>
            <View style={s.logoBox}>
              <Image
                source={require('../../assets/reliance-logo.png')}
                style={s.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={s.title}>KG-D6</Text>
            <Text style={s.subtitle}>Reliance Industries</Text>
          </View>

          {/* Form */}
          <View style={s.card}>
            <Text style={s.label}>Employee ID</Text>
            <TextInput
              style={s.input}
              placeholder="Enter your Employee ID"
              placeholderTextColor="#9CA3AF"
              value={employeeId}
              onChangeText={setEmployeeId}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={s.label}>Password</Text>
            <View style={s.pwdRow}>
              <TextInput
                style={s.pwdInput}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={s.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.loginBtn, loading && s.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.loginBtnText}>Login</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F0F4F8' },
  scroll:      { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: hp(3),
    paddingHorizontal: wp(5.3),
  },

  // Header
  header:   { alignItems: 'center', marginBottom: hp(4) },
  logoBox: {
    width: wp(24),
    height: wp(24),
    borderRadius: wp(12),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1.8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.1,
    shadowRadius: rs(4),
    elevation: 4,
    overflow: 'hidden',
  },
  logo:     { width: wp(18), height: wp(18) },
  title:    { fontSize: rf(26), fontWeight: '800', color: '#0D2B6E' },
  subtitle: { fontSize: rf(13), color: '#64748B', marginTop: hp(0.6) },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: rs(14),
    padding: wp(6.4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.08,
    shadowRadius: rs(6),
    elevation: 4,
  },
  label: {
    fontSize: rf(13),
    fontWeight: '600',
    color: '#374151',
    marginBottom: hp(0.9),
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(8),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.7),
    fontSize: rf(14),
    color: '#1F2937',
    marginBottom: hp(2.2),
  },

  // Password row
  pwdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(8),
    marginBottom: hp(2.8),
  },
  pwdInput: {
    flex: 1,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.7),
    fontSize: rf(14),
    color: '#1F2937',
  },
  eyeBtn:  { paddingRight: wp(3.2) },
  eyeIcon: { fontSize: rf(18) },

  // Button
  loginBtn: {
    backgroundColor: '#0D2B6E',
    borderRadius: rs(8),
    paddingVertical: hp(1.8),
    alignItems: 'center',
    marginTop: hp(0.5),
  },
  loginBtnDisabled: { opacity: 0.65 },
  loginBtnText: { color: '#fff', fontSize: rf(15), fontWeight: '700' },
});

export default LoginScreen;
