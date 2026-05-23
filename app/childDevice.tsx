import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ParentPairingScreen() {
  const router = useRouter();
  const { childId: paramChildId, childName } = useLocalSearchParams(); 
  
  const [childId, setChildId] = useState(paramChildId);
  const [pairingCode, setPairingCode] = useState('--- ---'); 
  const [timeLeft, setTimeLeft] = useState(600);
  const [loading, setLoading] = useState(true);

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const recoverChildId = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get('http://192.168.1.9:8000/api/parent/childs', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (response.data && response.data.length > 0) {
        setChildId(response.data[response.data.length - 1].id);
      }
    } catch (e) {
      console.log("Error recovering childId");
    }
  };

  const fetchPairingDetails = async (isManualRefresh = false) => {
    const currentId = childId || paramChildId;
    if (!currentId) return;

    try {
      if (isManualRefresh) setLoading(true);

      const token = await AsyncStorage.getItem('userToken');
      
      // نعتمد فقط على المسار الموحد في ChildController
      const response = await axios.get(`http://192.168.1.9:8000/api/parent/childs/show-pairing/${currentId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });

      // التحقق من حالة الربط
      if (response.data.is_paired === true) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        Alert.alert("Success 🎉", "Device connected successfully!");
        router.replace({ pathname: '/childProfile', params: { id: currentId } });
        return;
      }

      // عرض الكود
      if (response.data.code) {
        const rawCode = response.data.code.toString();
        setPairingCode(`${rawCode.slice(0, 3)}-${rawCode.slice(3, 6)}`);
      }

    } catch (error) {
      console.log("Pairing fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!childId) await recoverChildId();
      
      // بدء الـ Polling
      fetchPairingDetails(true);
      pollingIntervalRef.current = setInterval(() => fetchPairingDetails(false), 5000);
    };

    init();

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [childId]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60) < 10 ? '0' : ''}${s % 60}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#0277BD" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Add {childName || "Child"}'s Device</Text>
        </View>

        <View style={styles.pairingBox}>
          <Text style={styles.pairingLabel}>Your pairing code</Text>
          {loading ? <ActivityIndicator size="large" color="#01579B" /> : 
            <Text style={styles.codeText}>{pairingCode}</Text>}
          <Text style={styles.timerText}>{timeLeft > 0 ? `Expires after ${formatTime(timeLeft)}` : "Code Expired"}</Text>
          <TouchableOpacity onPress={() => fetchPairingDetails(true)}><Text style={styles.resendText}>Refresh Code</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F2FD' },
  scrollContent: { padding: 20, alignItems: 'center' },
  header: { flexDirection: 'row', width: '100%', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#01579B', marginLeft: 15 },
  pairingBox: { backgroundColor: '#BBDEFB', width: '90%', padding: 30, borderRadius: 25, alignItems: 'center' },
  pairingLabel: { color: '#0288D1', marginBottom: 10 },
  codeText: { fontSize: 40, fontWeight: 'bold', color: '#01579B', letterSpacing: 5 },
  timerText: { color: '#FFB300', marginTop: 15, fontWeight: 'bold' },
  resendText: { color: '#0288D1', marginTop: 20, textDecorationLine: 'underline' }
});