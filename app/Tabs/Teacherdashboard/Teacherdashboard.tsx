import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig";

const Colors = {
  primary: "#7384bfff",
  secondary: "#0c69ffff",
  background: "#f0f4f8",
  card: "#ffffff",
  textDark: "#181b20ff",
  textLight: "#6B7280",
  border: "#c0e213ff",
};

export default function Teacherdashboard() {
  const router = useRouter();
  const { teacherId } = useLocalSearchParams(); // EX: teacherId="TCH001"

  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------
  // 🔥 Fetch Teacher Data
  // -------------------------
  useEffect(() => {
    const loadTeacher = async () => {
      try {
        if (!teacherId) {
          alert("Teacher ID missing");
          return;
        }

        const ref = doc(db, "teachers", teacherId.toString());
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          // Convert all subject fields dynamically
          const subjects = Object.keys(data)
            .filter((key) => key.startsWith("subject"))
            .map((key) => data[key]);

          setTeacherData({
            name: data.name,
            department: data.Department,
            phone: data.phone,
            subjects,
          });
        } else {
          alert("Teacher not found!");
        }
      } catch (err) {
        console.log(err);
        alert("Error loading teacher data");
      } finally {
        setLoading(false);
      }
    };

    loadTeacher();
  }, [teacherId]);

  const handleLogout = () => router.replace("/Login/teacherlogin");

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={{
              uri: `https://api.dicebear.com/6.x/initials/png?seed=${teacherData?.name || 'teacher'}&size=128`,
            }}
            style={styles.photo}
          />
          <View>
            <Text style={styles.headerTitle}>Teacher Dashboard</Text>
            <Text style={styles.headerName}>{teacherData?.name}</Text>
            <Text style={styles.headerDept}>
              {teacherData?.department} Department
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* BODY */}
      <ScrollView contentContainerStyle={styles.body}>
        {/* ⭐ SUBJECTS FETCHED FROM FIRESTORE */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Subjects Taught</Text>

          {teacherData?.subjects?.length > 0 ? (
            teacherData.subjects.map((sub: string, index: number) => (
              <View key={index} style={styles.subjectItem}>
                <Ionicons name="book-outline" size={20} color={Colors.secondary} />
                <Text style={styles.subjectText}>{sub}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: Colors.textLight }}>No subjects found.</Text>
          )}
        </View>

        {/* BUTTONS GRID */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: "#DDE6FF" }]}
            onPress={() =>
              router.push(`/Tabs/Teacherdashboard/Attendence?teacherId=${teacherId}`)
            }
          >
            <Ionicons name="checkmark-done-outline" size={26} color={Colors.secondary} />
            <Text style={styles.gridText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: "#FFEED0" }]}
            onPress={() =>
              router.push(`/Tabs/Teacherdashboard/Students?teacherId=${teacherId}`)
            }
          >
            <Ionicons name="people-outline" size={26} color="#F59E0B" />
            <Text style={styles.gridText}>Students</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: "#E7FEEA" }]}
            onPress={() => router.push(`/Tabs/Teacherdashboard/notes?teacherId=${teacherId}`)}
          >
            <Ionicons name="document-text-outline" size={26} color="#10B981" />
            <Text style={styles.gridText}>Add Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: "#FFE4E6" }]}
            onPress={() =>
              router.push(`/Tabs/Teacherdashboard/Marks?teacherId=${teacherId}`)
            }
          >
            <Ionicons name="bar-chart-outline" size={26} color="#EF4444" />
            <Text style={styles.gridText}>Update Marks</Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  center: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  header: {
    paddingVertical: 35,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  headerName: { color: "#E0E0E0", fontSize: 18, marginTop: 2 },
  headerDept: { color: "#D3E0FF", fontSize: 14, marginTop: 2 },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#e0e0e0",
  },
  body: { padding: 20, gap: 20 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 25,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: Colors.textDark, marginBottom: 12 },
  subjectItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    marginBottom: 10, 
    backgroundColor: "#f7f9fc",
    padding: 10,
    borderRadius: 15,
  },
  subjectText: { fontSize: 16, color: Colors.textDark, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 15 },
  gridItem: {
    width: "47%",
    borderRadius: 25,
    alignItems: "center",
    paddingVertical: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  gridText: { marginTop: 12, fontSize: 16, fontWeight: "600", color: Colors.textDark, textAlign: "center" },
  logoutButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 18,
    borderRadius: 35,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  logoutButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
