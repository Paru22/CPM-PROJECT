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

export default function ClassTeacherNotifications() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StudentRequest | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchRequests();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

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

  const approvedCount = 0;
  const rejectedCount = 0;
  const pendingCount = requests.length;

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
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.indexNumber, { color: colors.primary }]}>{index + 1}</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textDark }]} numberOfLines={1}>{item.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: colors.primary + "20" }]}>
                <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.statusText, { color: colors.primary }]}>Pending</Text>
              </View>
            </View>
            
            <View style={styles.boardRollContainer}>
              <Ionicons name="qr-code" size={14} color={colors.primary} />
              <Text style={[styles.boardRollText, { color: colors.primary }]} numberOfLines={1}>
                Board Roll: {item.boardRollNo}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Ionicons name="business-outline" size={14} color={colors.textLight} />
              <Text style={[styles.detailText, { color: colors.textLight }]} numberOfLines={1}>{item.department}</Text>
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
              <Ionicons name="book-outline" size={14} color={colors.textLight} />
              <Text style={[styles.detailText, { color: colors.textLight }]} numberOfLines={1}>Semester {item.semester}</Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={14} color={colors.textLight} />
              <Text style={[styles.detailText, { color: colors.textLight }]} numberOfLines={1}>{item.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.viewBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => viewDetails(item)}
          >
            <Ionicons name="eye-outline" size={16} color={colors.primary} />
            <Text style={[styles.viewBtnText, { color: colors.primary }]}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.secondary }]}
            onPress={() => approveStudent(item)}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => rejectStudent(item)}
          >
            <Ionicons name="close-circle" size={16} color="#fff" />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
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
            <Text style={styles.headerTitle}>Student Registration Requests</Text>
            <Text style={styles.headerSubtitle}>
              Review and manage new student registrations
            </Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Pending</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: colors.secondary + "20" }]}>
              <Ionicons name="checkmark-circle" size={24} color={colors.secondary} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{approvedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Approved</Text>
            </View>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: "#EF4444" + "20" }]}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{rejectedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Rejected</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          }
          ListHeaderComponent={
            requests.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={[styles.listHeaderText, { color: colors.textLight }]}>
                  {requests.length} registration request{requests.length !== 1 ? 's' : ''} waiting for your approval
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Ionicons name="checkmark-done-circle" size={80} color={colors.secondary} />
                <Text style={[styles.emptyTitle, { color: colors.textDark }]}>All Caught Up!</Text>
                <Text style={[styles.emptyText, { color: colors.textLight }]}>
                  No pending student registration requests
                </Text>
                <Text style={[styles.emptySubText, { color: colors.textLight }]}>
                  New requests will appear here when students register
                </Text>
              </View>
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

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedRequest && (
                <>
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>📋 Personal Information</Text>
                    
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
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Email Address</Text>
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
                          <Text style={[styles.detailLabel, { color: colors.textLight }]}>Parent/Guardian Phone</Text>
                          <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.parentPhone}</Text>
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>🎓 Academic Information</Text>
                    
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
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Current Semester</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>Semester {selectedRequest.semester}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>University Roll Number</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.rollNo || "Not assigned yet"}</Text>
                      </View>
                    </View>

                    <View style={[styles.detailItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="grid-outline" size={20} color={colors.primary} />
                      <View style={styles.detailItemContent}>
                        <Text style={[styles.detailLabel, { color: colors.textLight }]}>Class Roll Number</Text>
                        <Text style={[styles.detailValue, { color: colors.textDark }]}>{selectedRequest.classRollNo || "Not assigned yet"}</Text>
                      </View>
                    </View>
                  </View>

                  {selectedRequest.address && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailSectionTitle, { color: colors.primary }]}>📍 Address</Text>
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

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalApproveBtn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  if (selectedRequest) approveStudent(selectedRequest);
                  setDetailsModalVisible(false);
                }}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.modalBtnText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalRejectBtn, { backgroundColor: "#EF4444" }]}
                onPress={() => {
                  if (selectedRequest) rejectStudent(selectedRequest);
                  setDetailsModalVisible(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.modalBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
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
    fontSize: 22,
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
    padding: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginHorizontal: 4,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 10,
    flexShrink: 1,
  },
  listHeader: {
    marginBottom: 8,
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
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
    gap: 8,
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
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
    fontWeight: "500",
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
    flexWrap: "wrap",
  },
  detailText: {
    fontSize: 12,
  },
  separator: {
    width: 1,
    height: 10,
    marginHorizontal: 4,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  viewBtn: {
    borderWidth: 1,
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  approveBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
  },
  rejectBtnText: {
    color: "#fff",
    fontSize: 12,
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
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
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
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});