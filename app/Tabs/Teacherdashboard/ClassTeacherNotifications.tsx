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
import { collection, getDocs, doc, updateDoc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { db } from "../../../config/firebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";

interface StudentRequest {
  id: string;
  name: string;
  email: string;
  rollNo: string;
  classRollNo: string;
  boardRollNo: string;
  department: string;
  semester: string;
  phone: string;
  parentPhone: string;
  address: string;
  status: string;
  createdAt: string;
}

const ClassTeacherNotifications = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "studentRequests"));

      const pending = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        }))
        .filter((item) => item.status === "pending");

      setRequests(pending);
    } catch (error) {
      console.error("Error fetching requests:", error);
      Alert.alert("Error", "Failed to fetch student requests");
    } finally {
      setLoading(false);
    }
  };

  const approveStudent = async (student: StudentRequest) => {
    try {
      // Move to students collection
      await setDoc(doc(db, "students", student.id), {
        name: student.name,
        email: student.email,
        rollNo: student.rollNo,
        classRollNo: student.classRollNo,
        boardRollNo: student.boardRollNo,
        department: student.department,
        semester: student.semester,
        phone: student.phone,
        parentPhone: student.parentPhone,
        address: student.address,
        role: "student",
        attendance: {},
        marks: {},
        createdAt: new Date().toISOString(),
      });

      // Update request status
      await updateDoc(doc(db, "studentRequests", student.id), {
        status: "approved",
        approvedAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Student approved successfully ✅");
      fetchRequests();
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to approve student");
    }
  };

  const rejectStudent = async (id: string) => {
    Alert.alert(
      "Confirm Rejection",
      "Are you sure you want to reject this student request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "studentRequests", id), {
                status: "rejected",
                rejectedAt: new Date().toISOString(),
              });

              Alert.alert("Success", "Student request rejected ❌");
              fetchRequests();
            } catch (error) {
              console.log(error);
              Alert.alert("Error", "Failed to reject student");
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    router.back();
  };

  const renderItem = ({ item }: { item: StudentRequest }) => (
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
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="qr-code-outline" size={14} color="#666" />
            <Text style={styles.detailText}>Roll: {item.rollNo}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="grid-outline" size={14} color="#666" />
            <Text style={styles.detailText}>Class Roll: {item.classRollNo}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="business-outline" size={14} color="#666" />
            <Text style={styles.detailText}>Dept: {item.department}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="book-outline" size={14} color="#666" />
            <Text style={styles.detailText}>Semester: {item.semester}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color="#666" />
            <Text style={styles.detailText}>Phone: {item.phone}</Text>
          </View>
          {item.parentPhone && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={14} color="#666" />
              <Text style={styles.detailText}>Parent: {item.parentPhone}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.approveBtn}
          onPress={() => approveStudent(item)}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => rejectStudent(item.id)}
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
            <Text style={styles.headerTitle}>👨‍🎓 Student Requests</Text>
            <Text style={styles.headerSubtitle}>
              Approve or reject new student registrations
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsValue}>{requests.length}</Text>
          <Text style={styles.statsLabel}>Pending Student Requests</Text>
        </View>

        {/* Requests List */}
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
                All student requests have been processed
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
  detailText: {
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

export default ClassTeacherNotifications;