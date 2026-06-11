import React, { createContext, useState, useEffect, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ReportCreationScreen from './src/screens/ReportCreationScreen';
import VariantMasterScreen from './src/screens/VariantMasterScreen';
import EmployeeMasterScreen from './src/screens/EmployeeMasterScreen';

const Stack = createStackNavigator();

// Create Auth Context
export const AuthContext = createContext();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [user, setUser] = useState(null);

  // Check storage on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      let token;
      let userData;
      try {
        token = await AsyncStorage.getItem('authToken');
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          userData = JSON.parse(userJson);
        }
      } catch (e) {
        console.error('Failed to load storage details', e);
      }
      if (token && userData) {
        setUserToken(token);
        setUser(userData);
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
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('user');
        setUserToken(null);
        setUser(null);
      } catch (e) {
        console.error('Sign out storage failed', e);
      }
    },
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userToken === null ? (
            // Auth flow
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            </>
          ) : (
            // App flow
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} />
              <Stack.Screen name="ReportCreation" component={ReportCreationScreen} />
              {user?.role === 'Admin' || user?.role === 'admin' ? (
                <>
                  <Stack.Screen name="VariantMaster" component={VariantMasterScreen} />
                  <Stack.Screen name="EmployeeMaster" component={EmployeeMasterScreen} />
                </>
              ) : null}
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
