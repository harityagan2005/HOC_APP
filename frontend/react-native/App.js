import React, { createContext, useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import LoginScreen              from './src/screens/LoginScreen';
import OTPVerificationScreen    from './src/screens/OTPVerificationScreen';
import DashboardScreen          from './src/screens/DashboardScreen';
import ReportCreationScreen     from './src/screens/ReportCreationScreen';
import ReportsListScreen        from './src/screens/ReportsListScreen';
import ReportDetailScreen       from './src/screens/ReportDetailScreen';
import ExecutiveDashboardScreen from './src/screens/ExecutiveDashboardScreen';
import VariantMasterScreen      from './src/screens/VariantMasterScreen';
import EmployeeMasterScreen     from './src/screens/EmployeeMasterScreen';

const Stack = createStackNavigator();
export const AuthContext = createContext();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser]           = useState(null);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token    = await AsyncStorage.getItem('authToken');
        const userJson = await AsyncStorage.getItem('user');
        if (token && userJson) {
          setUserToken(token);
          setUser(JSON.parse(userJson));
        }
      } catch (e) {
        console.error('Failed to load storage', e);
      }
      setIsLoading(false);
    };
    bootstrapAsync();
  }, []);

  const authContextValue = {
    userToken,
    user,
    signIn: async (token, userData) => {
      try {
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUserToken(token);
        setUser(userData);
      } catch (e) {
        console.error('Sign in storage failed', e);
      }
    },
    signOut: async () => {
      try {
        await AsyncStorage.multiRemove(['authToken', 'user']);
        setUserToken(null);
        setUser(null);
      } catch (e) {
        console.error('Sign out storage failed', e);
      }
    },
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0D2B6E" />
      </View>
    );
  }

  const isAdmin = user?.role === 'Admin' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={authContextValue}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userToken === null ? (
            <>
              <Stack.Screen name="Login"           component={LoginScreen} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="Dashboard"            component={DashboardScreen} />
              <Stack.Screen name="ReportCreation"       component={ReportCreationScreen} />
              <Stack.Screen name="ReportsList"          component={ReportsListScreen} />
              <Stack.Screen name="ReportDetail"         component={ReportDetailScreen} />
              {isAdmin && (
                <>
                  <Stack.Screen name="ExecutiveDashboard" component={ExecutiveDashboardScreen} />
                  <Stack.Screen name="VariantMaster"      component={VariantMasterScreen} />
                  <Stack.Screen name="EmployeeMaster"     component={EmployeeMasterScreen} />
                </>
              )}
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F8' },
});
