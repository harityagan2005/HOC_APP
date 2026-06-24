import React, { useState, useEffect, useContext } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  Dimensions, PixelRatio,
} from 'react-native';
import { verifyOTP, requestOTP } from '../services/authService';
import { AuthContext } from '../../App';

const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 375;
const rs = (n) => Math.round((W / BASE_W) * n);
const rf = (n) => PixelRatio.roundToNearestPixel((W / BASE_W) * n);
const wp = (p) => (W * p) / 100;
const hp = (p) => (H * p) / 100;

const OTPVerificationScreen = ({ route, navigation }) => {
  const { userId, phone } = route.params;
  const { signIn } = useContext(AuthContext);

  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [timer, setTimer]       = useState(30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((p) => p - 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Validation Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyOTP(userId, otp);
      if (response.success && response.data) {
        await signIn(response.data.token, response.data.user);
        Alert.alert('Success', 'Logged in successfully!');
      } else {
        Alert.alert('Error', response.message || 'OTP verification failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResending(true);
    try {
      Alert.alert('Info', 'Please return to the Login Screen to request a new OTP.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>{'← Back to Login'}</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>2FA</Text>
          </View>
          <Text style={s.title}>Two-Factor Authentication</Text>
          <Text style={s.subtitle}>
            Enter the 6-digit OTP code sent to your registered phone number ending in {phone || '***'}
          </Text>
        </View>

        {/* Form */}
        <View style={s.card}>
          <Text style={s.label}>Enter 6-Digit OTP</Text>
          <TextInput
            style={s.input}
            placeholder="• • • • • •"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ''))}
            editable={!loading}
            textAlign="center"
            letterSpacing={rs(8)}
          />

          <TouchableOpacity
            style={[s.verifyBtn, (loading || otp.length !== 6) && s.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.length !== 6}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.verifyBtnText}>Verify {'&'} Login</Text>
            }
          </TouchableOpacity>

          <View style={s.resendRow}>
            {timer > 0
              ? <Text style={s.timerText}>Resend code in {timer}s</Text>
              : (
                <TouchableOpacity onPress={handleResend} disabled={resending}>
                  <Text style={s.resendText}>{"Didn't receive code? Request another OTP"}</Text>
                </TouchableOpacity>
              )
            }
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4F8' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(5.3),
    paddingVertical: hp(3),
  },
  backBtn: {
    position: 'absolute',
    top: hp(6.5),
    left: wp(5.3),
    padding: rs(8),
    zIndex: 1,
  },
  backBtnText: { color: '#0D2B6E', fontSize: rf(14), fontWeight: '600' },

  header: { alignItems: 'center', marginBottom: hp(4), marginTop: hp(6) },
  logoBox: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    backgroundColor: '#0D2B6E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1.8),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.15,
    shadowRadius: rs(4),
  },
  logoText:  { fontSize: rf(20), fontWeight: '800', color: '#fff' },
  title:     { fontSize: rf(20), fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  subtitle:  {
    fontSize: rf(13),
    color: '#64748B',
    marginTop: hp(1),
    textAlign: 'center',
    lineHeight: rf(19),
    paddingHorizontal: wp(2.7),
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: rs(14),
    padding: wp(6.4),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(2) },
    shadowOpacity: 0.08,
    shadowRadius: rs(6),
  },
  label: { fontSize: rf(13), fontWeight: '600', color: '#374151', marginBottom: hp(1.2), textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: rs(8),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(3.7),
    marginBottom: hp(2.2),
    fontSize: rf(22),
    fontWeight: '700',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },

  verifyBtn: {
    backgroundColor: '#0D2B6E',
    borderRadius: rs(8),
    paddingVertical: hp(1.8),
    alignItems: 'center',
    marginTop: hp(0.5),
  },
  verifyBtnDisabled: { backgroundColor: '#94A3B8' },
  verifyBtnText: { color: '#fff', fontSize: rf(15), fontWeight: '700' },

  resendRow: { alignItems: 'center', marginTop: hp(2.2) },
  timerText: { color: '#64748B', fontSize: rf(13) },
  resendText: { color: '#0D2B6E', fontSize: rf(13), fontWeight: '600', textDecorationLine: 'underline' },
});

export default OTPVerificationScreen;
