import axios from 'axios';
import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  // hostUri (e.g. "10.181.67.124:8081") is how Expo Go/dev-client reliably expose
  // the Metro LAN host; NativeModules.SourceCode.scriptURL is a private fallback.
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost;

  let host = hostUri?.split(':')?.[0];

  if (!host) {
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    const match = scriptURL?.match(/^[^:]+:\/\/([^:/]+)/);
    host = match?.[1];
  }

  host = host || '10.122.25.124';

  return `http://${host}:5000/api`;
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    }
    return Promise.reject(error);
  }
);

export default api;
