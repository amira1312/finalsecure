import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function MapScreen() {
  const router = useRouter();
  const { childId, name } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState({
    latitude: 30.0444,
    longitude: 31.2357,
    address: "Connecting...",
  });

  // المرجع (Ref) لتخزين الـ Interval وإيقافه عند الخروج من الصفحة
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLocation = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await axios.get(`http://192.168.1.9:8000/api/parent/locations/show/${childId || 8}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const locData = response.data.data?.location; 
      
      if (locData) {
        setLocation({
          latitude: parseFloat(locData.latitude),
          longitude: parseFloat(locData.longitude),
          address: locData.address || "Location updated",
        });
      }
    } catch (error: any) {
      console.error("📍 Live Update Error:", error.message);
    }
  };

  useEffect(() => {
    // 1. جلب الموقع فوراً عند فتح الصفحة
    fetchLocation().then(() => setLoading(false));

    // 2. تفعيل التحديث التلقائي كل 15 ثانية
    intervalRef.current = setInterval(() => {
      fetchLocation();
    }, 15000); 

    // 3. تنظيف التايمر عند إغلاق الصفحة (لمنع تسريب الذاكرة)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [childId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live Tracking</Text>
        {/* زر تحديث يدوي إضافي */}
        <TouchableOpacity onPress={fetchLocation} style={{ marginLeft: 'auto' }}>
            <Text style={{ color: '#0288D1', fontWeight: 'bold' }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0288D1" />
          <Text style={{marginTop: 10}}>Tracking {name || 'Child'}...</Text>
        </View>
      ) : (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.005, // تصغير الـ Delta لزوم أدق
            longitudeDelta: 0.005,
          }}
        >
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title={name ? `${name} is here` : 'Child is here'}
            description={location.address}
            pinColor="blue"
          />
        </MapView>
      )}

      <View style={styles.detailCard}>
        <Text style={styles.childName}>{name || 'Child'}'s Location</Text>
        <Text style={styles.address}>📍 {location.address}</Text>
        <Text style={{fontSize: 10, color: '#999', marginTop: 5}}>Auto-updates every 15s</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingTop: 50, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#fff', paddingBottom: 15, elevation: 5, zIndex: 10 
  },
  backBtn: { fontSize: 18, color: '#0288D1', marginRight: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#01579B' },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  detailCard: { 
    position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#fff', 
    padding: 20, borderRadius: 25, elevation: 10, shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5
  },
  childName: { fontSize: 18, fontWeight: 'bold', color: '#0D47A1', marginBottom: 5 },
  address: { fontSize: 14, color: '#546E7A' }
});