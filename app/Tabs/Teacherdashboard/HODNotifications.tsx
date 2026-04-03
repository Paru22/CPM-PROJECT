import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";

import { collection, getDocs, doc, updateDoc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "../../../config/firebaseConfig";

interface TeacherRequest {
  id: string;               // custom teacher ID (e.g., TCH001)
  teacherId?: string;       // same as id, stored in doc
  name: string;
  email: string;
  department: string;
  password: string;         // plain text from signup (for dev only)
  status: string;
  // other fields if needed
}

const HODNotifications = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<TeacherRequest[]>([]);
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      console.error("Error fetching requests:", error);
      Alert.alert("Error", "Failed to fetch teacher requests");
    } finally {
      setLoading(false);
    }
  };

  const approveTeacher = async (teacher: TeacherRequest) => {
    try {
      // 1. Create Firebase Authentication user
      const auth = getAuth();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        teacher.email,
        teacher.password   // password from teacher signup
      );
      const uid = userCredential.user.uid;

      // 2. Save teacher document in Firestore (use UID as document ID)
      await setDoc(doc(db, "teachers", uid), {
        uid: uid,
        teacherId: teacher.id,   // store original custom ID
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        role: "teacher",
        createdAt: new Date().toISOString(),
      });

      // 3. Update the request status (mark as approved)
      await updateDoc(doc(db, "teacherRequests", teacher.id), {
        status: "approved",
        approvedAt: new Date().toISOString(),
        authUid: uid,
      });

      Alert.alert("Success", `Teacher ${teacher.name} approved and can now log in ✅`);
      fetchRequests(); // refresh list
    } catch (error: any) {
      console.error("Approval error:", error);
      Alert.alert("Error", error.message || "Failed to approve teacher");
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
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to reject teacher");
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  const renderItem = ({ item }: { item: TeacherRequest }) => (
    <LinearGradient
      colors={['#fff', '#f8f9fa']}
      style={styles.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name="person-circle-outline" size={40} color="#7384bf" />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={14} color="#666" />
            <Text style={styles.email}>{item.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={14} color="#666" />
            <Text style={styles.department}>Dept: {item.department}</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => approveTeacher(item)}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => rejectTeacher(item.id)}
        >
          <Ionicons name="close-circle" size={20} color="white" />
          <Text style={styles.btnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#7384bf', '#0c69ff']} style={styles.header}>
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
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>{requests.length}</Text>
          <Text style={styles.statsLabel}>Pending Requests</Text>
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
              <Text style={styles.emptyText}>No pending requests</Text>
              <Text style={styles.emptySubText}>
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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#7384bf",
  },
  statsLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  email: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  department: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4CAF50",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});

export default HODNotifications;