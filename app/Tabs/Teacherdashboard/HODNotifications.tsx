import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, getAuth } from "firebase/auth";
import { collection, doc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

interface TeacherRequest {
  id: string;
  teacherId?: string;
  name: string;
  email: string;
  department: string;
  password: string;
  status: string;
}

const HODNotifications = () => {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "teacherRequests"));
      const pending = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        }))
        .filter((item) => item.status === "pending");
      setRequests(pending);
    } catch (error: any) {
      console.error("Fetch error:", error);
      Alert.alert("Error", "Failed to fetch requests: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveTeacher = async (teacher: TeacherRequest) => {
    if (approvingId === teacher.id) return;
    setApprovingId(teacher.id);

    try {
      console.log("Starting approval for:", teacher.email);
      const auth = getAuth();
      const signInMethods = await fetchSignInMethodsForEmail(auth, teacher.email);
      if (signInMethods.length > 0) {
        throw new Error(`Email ${teacher.email} is already registered. Use a different email.`);
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        teacher.email,
        teacher.password
      );
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "teachers", uid), {
        uid: uid,
        teacherId: teacher.id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        role: "teacher",
        createdAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "teacherRequests", teacher.id), {
        status: "approved",
        approvedAt: new Date().toISOString(),
        authUid: uid,
      });

      Alert.alert("Success", `✅ Teacher ${teacher.name} approved. They can now log in.`);
      fetchRequests();
    } catch (error: any) {
      console.error("Approval error details:", error);
      let errorMsg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = `Email ${teacher.email} is already in use.`;
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak. Use at least 6 characters.';
      } else if (error.code === 'permission-denied') {
        errorMsg = 'Firestore permission denied. Check security rules.';
      }
      Alert.alert("Approval Failed", errorMsg);
    } finally {
      setApprovingId(null);
    }
  };

  const rejectTeacher = async (id: string) => {
    Alert.alert(
      "Confirm Rejection",
      "Are you sure you want to reject this teacher request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "teacherRequests", id), {
                status: "rejected",
                rejectedAt: new Date().toISOString(),
              });
              Alert.alert("Success", "Teacher request rejected ❌");
              fetchRequests();
            } catch (error: any) {
              console.error(error);
              Alert.alert("Error", "Failed to reject: " + error.message);
            }
          },
        },
      ]
    );
  };

  const handleBack = () => router.back();

  const renderItem = ({ item }: { item: TeacherRequest }) => {
    const isApproving = approvingId === item.id;
    return (
      <LinearGradient
        colors={[colors.card, `${colors.background}`]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.name, { color: colors.textDark }]}>{item.name}</Text>
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={14} color={colors.textLight} />
              <Text style={[styles.email, { color: colors.textLight }]}>{item.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={14} color={colors.textLight} />
              <Text style={[styles.department, { color: colors.textLight }]}>Dept: {item.department}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.approveBtn, isApproving && styles.disabledBtn]}
            onPress={() => approveTeacher(item)}
            disabled={isApproving}
          >
            {isApproving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.btnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => rejectTeacher(item.id)}
            disabled={isApproving}
          >
            <Ionicons name="close-circle" size={20} color="white" />
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>🔔 Teacher Requests</Text>
            <Text style={styles.headerSubtitle}>
              Approve or reject new teacher applications
            </Text>
          </View>
          {/* Theme Toggle Button */}
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statsValue, { color: colors.primary }]}>{requests.length}</Text>
          <Text style={[styles.statsLabel, { color: colors.textLight }]}>Pending Requests</Text>
        </View>

        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-done-circle" size={64} color="#4CAF50" />
              <Text style={[styles.emptyText, { color: "#4CAF50" }]}>No pending requests</Text>
              <Text style={[styles.emptySubText, { color: colors.textLight }]}>
                All teacher requests have been processed
              </Text>
            </View>
          }
          refreshing={loading}
          onRefresh={fetchRequests}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  themeToggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#fff", opacity: 0.9, marginTop: 5 },
  content: { flex: 1, padding: 15 },
  statsCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
  },
  statsValue: { fontSize: 36, fontWeight: "bold" },
  statsLabel: { fontSize: 14, marginTop: 5 },
  listContainer: { paddingBottom: 20 },
  card: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
  },
  cardHeader: { flexDirection: "row", marginBottom: 12 },
  iconContainer: { marginRight: 12 },
  cardContent: { flex: 1 },
  name: { fontSize: 18, fontWeight: "bold", marginBottom: 6 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 4, gap: 6 },
  email: { fontSize: 13, flex: 1 },
  department: { fontSize: 13, flex: 1 },
  buttonRow: { flexDirection: "row", marginTop: 10, gap: 10 },
  approveBtn: { flex: 1, backgroundColor: "#4CAF50", paddingVertical: 10, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  rejectBtn: { flex: 1, backgroundColor: "#F44336", paddingVertical: 10, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  btnText: { color: "white", fontWeight: "600", fontSize: 14 },
  disabledBtn: { opacity: 0.6 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 18, fontWeight: "600", marginTop: 16 },
  emptySubText: { fontSize: 14, marginTop: 8, textAlign: "center" },
});

export default HODNotifications;