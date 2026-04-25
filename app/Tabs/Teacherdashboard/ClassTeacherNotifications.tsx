import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, doc, getDocs, setDoc, updateDoc, query, where } from "firebase/firestore";
import React, { useEffect, useState, useRef } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    RefreshControl,
    Animated,
    Modal,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

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
  password: string;
  status: string;
  createdAt: string;
}

const ClassTeacherNotifications = () => {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StudentRequest | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchRequests();
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, "studentRequests"), where("status", "==", "pending"));
      const snapshot = await getDocs(q);
      
      const pending = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      })) as StudentRequest[];
      
      setRequests(pending);
    } catch (error) {
      console.error("Error fetching requests:", error);
      Alert.alert("Error", "Failed to fetch student requests");
    } finally {
      setRefreshing(false);
    }
  };

  const approveStudent = async (student: StudentRequest) => {
    if (!student.boardRollNo) {
      Alert.alert("Error", "Student must have a Board Roll Number to approve");
      return;
    }

    try {
      const studentDocRef = doc(db, "students", student.boardRollNo);
      const existingStudent = await getDocs(query(collection(db, "students"), where("boardRollNo", "==", student.boardRollNo)));
      
      if (!existingStudent.empty) {
        Alert.alert("Error", "Student with this Board Roll Number already exists!");
        return;
      }

      await setDoc(studentDocRef, {
        boardRollNo: student.boardRollNo,
        name: student.name,
        email: student.email || "",
        rollNo: student.rollNo || "",
        classRollNo: student.classRollNo || "",
        department: student.department,
        semester: student.semester,
        phone: student.phone,
        parentPhone: student.parentPhone || "",
        address: student.address || "",
        password: student.password,
        status: "approved",
        role: "student",
        attendance: {},
        marks: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await updateDoc(doc(db, "studentRequests", student.id), {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: "class_teacher",
      });

      Alert.alert("Success", `Student ${student.name} has been approved successfully!`);
      fetchRequests();
    } catch (error) {
      console.log("Approval Error:", error);
      Alert.alert("Error", "Failed to approve student. Please try again.");
    }
  };

  const rejectStudent = async (student: StudentRequest) => {
    Alert.alert(
      "Confirm Rejection",
      `Are you sure you want to reject ${student.name}'s registration request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "studentRequests", student.id), {
                status: "rejected",
                rejectedAt: new Date().toISOString(),
                rejectedBy: "class_teacher",
              });
              Alert.alert("Success", `Student ${student.name} has been rejected`);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const viewDetails = (item: StudentRequest) => {
    setSelectedRequest(item);
    setDetailsModalVisible(true);
  };

  const renderItem = ({ item, index }: { item: StudentRequest; index: number }) => (
    <Animated.View 
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            })
          }]
        }
      ]}
    >
      <LinearGradient
        colors={[colors.card, colors.background]}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.indexNumber, { color: colors.primary }]}>{index + 1}</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textDark }]}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: "#FF9800" + "20" }]}>
                <View style={styles.statusDot} />
                <Text style={[styles.statusText, { color: "#FF9800" }]}>Pending</Text>
              </View>
            </View>
            
            <View style={styles.boardRollContainer}>
              <Ionicons name="qr-code" size={14} color={colors.primary} />
              <Text style={[styles.boardRollText, { color: colors.primary }]}>
                {item.boardRollNo}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={14} color={colors.textLight} />
              <Text style={[styles.detailText, { color: colors.textLight }]}>{item.department}</Text>
              <View style={styles.separator} />
              <Ionicons name="book-outline" size={14} color={colors.textLight} />
              <Text style={[styles.detailText, { color: colors.textLight }]}>Sem {item.semester}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={14} color={colors.textLight} />
              <Text style={[styles.detailText, { color: colors.textLight }]}>{item.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.viewBtn]}
            onPress={() => viewDetails(item)}
          >
            <Ionicons name="eye-outline" size={18} color={colors.primary} />
            <Text style={[styles.viewBtnText, { color: colors.primary }]}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => approveStudent(item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="white" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => rejectStudent(item)}
          >
            <Ionicons name="close-circle" size={18} color="white" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Student Requests</Text>
            <Text style={styles.headerSubtitle}>
              Manage new student registrations
            </Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="people-outline" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{requests.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Pending</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: "#4CAF50" + "20" }]}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Approved</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: "#F44336" + "20" }]}>
              <Ionicons name="close-circle" size={24} color="#F44336" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>0</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Rejected</Text>
            </View>
          </View>
        </View>

        {/* Requests List */}
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            requests.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={[styles.listHeaderText, { color: colors.textLight }]}>
                  {requests.length} request{requests.length !== 1 ? 's' : ''} waiting for approval
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={[colors.card, colors.background]}
                style={styles.emptyCard}
              >
                <Ionicons name="checkmark-done-circle" size={80} color="#4CAF50" />
                <Text style={[styles.emptyTitle, { color: colors.textDark }]}>All Caught Up!</Text>
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  No pending student registration requests
                </Text>
                <Text style={[styles.emptySubText, { color: colors.textLight }]}>
                  New requests will appear here when students register
                </Text>
              </LinearGradient>
            </Animated.View>
          }
        />
      </View>

      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Student Details</Text>
              <TouchableOpacity onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {selectedRequest && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>Personal Information</Text>
                    
                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="person-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Full Name</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.name}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Board Roll Number</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.boardRollNo}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="mail-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Email</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.email || "Not provided"}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="call-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Phone Number</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.phone}</Text>
                      </View>
                    </View>

                    {selectedRequest.parentPhone && (
                      <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                        <Ionicons name="people-outline" size={20} color={colors.primary} />
                        <View style={styles.detailItemContent}>
                          <Text style={[styles.detailLabel, { color: colors.textLight }]}>Parent Phone</Text>
                          <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.parentPhone}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>Academic Information</Text>
                    
                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="business-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Department</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.department}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="book-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Semester</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.semester}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Roll Number</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.rollNo || "N/A"}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="grid-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Class Roll Number</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.classRollNo || "N/A"}</Text>
                      </View>
                    </View>
                  </View>

                  {selectedRequest.address && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>Address</Text>
                      <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                        <Ionicons name="location-outline" size={20} color={colors.primary} />
                        <View style={styles.detailItemContent}>
                          <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.address}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalApproveBtn, { backgroundColor: "#4CAF50" }]}
                onPress={() => {
                  if (selectedRequest) approveStudent(selectedRequest);
                  setDetailsModalVisible(false);
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.modalBtnText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalRejectBtn, { backgroundColor: "#F44336" }]}
                onPress={() => {
                  if (selectedRequest) rejectStudent(selectedRequest);
                  setDetailsModalVisible(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={styles.modalBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 15,
    gap: 10,
    elevation: 2,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  listHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listHeaderText: {
    fontSize: 12,
  },
  listContainer: {
    paddingBottom: 20,
  },
  cardContainer: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  indexNumber: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cardContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF9800",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  boardRollContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  boardRollText: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  detailText: {
    fontSize: 12,
  },
  separator: {
    width: 1,
    height: 10,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  viewBtn: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  approveBtn: {
    backgroundColor: "#4CAF50",
  },
  approveBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  rejectBtn: {
    backgroundColor: "#F44336",
  },
  rejectBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyCard: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    width: "100%",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  emptySubText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 20,
    width: "90%",
    maxHeight: "85%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  detailItemContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 15,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalApproveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalRejectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  modalBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ClassTeacherNotifications;