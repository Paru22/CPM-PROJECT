import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    onSnapshot,
    setDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db, auth } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

interface Subject {
  id: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
  subjectCode?: string;
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  semester: string;
  department: string;
  email?: string;
  phone?: string;
  gmail?: string;
  boardRollNo?: string;
  classRollNo?: string;
  phoneNo?: string;
  parentPhoneNo?: string;
}

interface StudentRequest {
  id: string;
  name: string;
  gmail: string;
  department: string;
  semester: string;
  boardRollNo: string;
  classRollNo?: string;
  phoneNo?: string;
  parentPhoneNo?: string;
  requestStatus: string;
  createdAt: any;
}

export default function ClassTeacherDashboard() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classTeacherInfo, setClassTeacherInfo] = useState<any>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [assignedSubject, setAssignedSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingRequests, setPendingRequests] = useState<StudentRequest[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Navigation functions - FIXED
  const navigateToAttendance = () => {
    router.push("/Tabs/Teacherdashboard/Attendence");
  };

  const navigateToNotes = () => {
    router.push("/Tabs/Teacherdashboard/notes");
  };

  const navigateToProfileSettings = () => {
    router.push("/Tabs/ProfileSettings");
  };

  const navigateToStudentRequests = () => {
    router.push("/Tabs/Teacherdashboard/ClassTeacherNotifications");
  };

  const navigateToStudents = () => {
    router.push("/Tabs/Teacherdashboard/Students");
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await auth.signOut();
              router.replace("/");
            } catch (err) {
              console.error("Logout error:", err);
            }
          }
        }
      ]
    );
  };

  // Fetch students using proper query
  const fetchStudents = async (semester: string, department: string) => {
    try {
      const studentsQuery = query(
        collection(db, "students"),
        where("department", "==", department),
        where("semester", "==", semester),
        where("requestStatus", "==", "approved")
      );
      
      const studentsSnap = await getDocs(studentsQuery);
      
      const studentsList: Student[] = studentsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "Unknown",
          rollNumber: data.boardRollNo || data.classRollNo || "",
          semester: data.semester || semester,
          department: data.department || department,
          email: data.gmail || data.email || "",
          phone: data.phoneNo || data.phone || "",
          gmail: data.gmail || "",
          boardRollNo: data.boardRollNo || "",
          classRollNo: data.classRollNo || "",
          phoneNo: data.phoneNo || "",
          parentPhoneNo: data.parentPhoneNo || "",
        } as Student;
      });
      
      setStudents(studentsList);
      return studentsList;
      
    } catch (err) {
      console.error("Error fetching students:", err);
      
      // Fallback: If index not ready, fetch all and filter
      try {
        const allStudentsSnap = await getDocs(collection(db, "students"));
        const studentsList: Student[] = [];
        
        allStudentsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (
            data.department === department && 
            data.semester === semester &&
            data.requestStatus === "approved"
          ) {
            studentsList.push({
              id: doc.id,
              name: data.name || "Unknown",
              rollNumber: data.boardRollNo || "",
              semester: data.semester || semester,
              department: data.department || department,
              email: data.gmail || "",
              phone: data.phoneNo || "",
            } as Student);
          }
        });
        
        setStudents(studentsList);
        return studentsList;
      } catch (fallbackErr) {
        console.error("Fallback fetch error:", fallbackErr);
        return [];
      }
    }
  };

  // Fetch pending student requests
  const fetchPendingRequests = async (semester: string, department: string) => {
    try {
      const requestsQuery = query(
        collection(db, "studentRequests"),
        where("department", "==", department),
        where("semester", "==", semester),
        where("requestStatus", "==", "pending")
      );
      
      const requestsSnap = await getDocs(requestsQuery);
      const requestsList: StudentRequest[] = requestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudentRequest));
      
      setPendingRequests(requestsList);
    } catch (err) {
      console.error("Error fetching requests:", err);
      
      // Fallback: Fetch all and filter
      try {
        const allRequestsSnap = await getDocs(collection(db, "studentRequests"));
        const requestsList: StudentRequest[] = [];
        
        allRequestsSnap.docs.forEach(doc => {
          const data = doc.data();
          if (
            data.department === department && 
            data.semester === semester &&
            data.requestStatus === "pending"
          ) {
            requestsList.push({
              id: doc.id,
              ...data
            } as StudentRequest);
          }
        });
        
        setPendingRequests(requestsList);
      } catch (fallbackErr) {
        console.error("Fallback fetch error:", fallbackErr);
      }
    }
  };

  const fetchClassTeacherData = useCallback(async () => {
    if (!auth.currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      // Get teacher info
      const teacherRef = doc(db, "teachers", auth.currentUser.uid);
      const teacherSnap = await getDoc(teacherRef);
      if (teacherSnap.exists()) {
        setTeacherInfo(teacherSnap.data());
      }

      // Get class teacher assignment
      const classTeacherQuery = query(
        collection(db, "classTeachers"),
        where("teacherId", "==", auth.currentUser.uid)
      );
      const classTeacherSnap = await getDocs(classTeacherQuery);
      
      if (classTeacherSnap.empty) {
        Alert.alert("Not Assigned", "You are not assigned as a Class Teacher. Contact HOD.");
        setLoading(false);
        return;
      }
      
      const classData = classTeacherSnap.docs[0].data();
      const ctSemester = classData.semester;
      const ctDepartment = classData.department;
      
      setClassTeacherInfo({
        semester: ctSemester,
        department: ctDepartment,
        assignedAt: classData.assignedAt,
      });

      // Get assigned subject
      const teacherSubjectQuery = query(
        collection(db, "teacherSubjects"),
        where("teacherId", "==", auth.currentUser.uid)
      );
      const teacherSubjectSnap = await getDocs(teacherSubjectQuery);
      if (!teacherSubjectSnap.empty) {
        const subjectId = teacherSubjectSnap.docs[0].data().subjectId;
        const subjectDoc = await getDoc(doc(db, "subjects", subjectId));
        if (subjectDoc.exists()) {
          setAssignedSubject({ id: subjectDoc.id, ...subjectDoc.data() } as Subject);
        }
      }

      // Fetch students and requests in parallel
      await Promise.all([
        fetchStudents(ctSemester, ctDepartment),
        fetchPendingRequests(ctSemester, ctDepartment)
      ]);

    } catch (err) {
      console.error("Error fetching class teacher data:", err);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    const teacherRef = doc(db, "teachers", auth.currentUser.uid);
    const unsubscribe = onSnapshot(teacherRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setTeacherInfo(docSnapshot.data());
      }
    }, (err) => {
      console.error("Snapshot listener error:", err);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchClassTeacherData();
  }, [fetchClassTeacherData]);

  useFocusEffect(
    useCallback(() => {
      fetchClassTeacherData();
    }, [fetchClassTeacherData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassTeacherData();
  };

  // Approve student
  const approveRequest = async (request: StudentRequest) => {
    try {
      const studentData = {
        name: request.name,
        gmail: request.gmail,
        department: request.department,
        semester: request.semester,
        boardRollNo: request.boardRollNo,
        classRollNo: request.classRollNo || "",
        phoneNo: request.phoneNo || "",
        parentPhoneNo: request.parentPhoneNo || "",
        requestStatus: "approved",
        approvedBy: auth.currentUser?.uid,
        approvedByClassTeacher: auth.currentUser?.uid,
        approvedAt: new Date().toISOString(),
        createdAt: request.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "students", request.id), studentData);
      await updateDoc(doc(db, "studentRequests", request.id), {
        requestStatus: "approved",
        approvedBy: auth.currentUser?.uid,
        approvedAt: new Date().toISOString(),
      });

      Alert.alert("Approved", `${request.name} has been approved and added to students.`);
      fetchClassTeacherData();
    } catch (err) {
      console.error("Approve error:", err);
      Alert.alert("Error", "Failed to approve student. Please try again.");
    }
  };

  // Reject student request
  const rejectRequest = async (request: StudentRequest) => {
    Alert.alert(
      "Reject Request",
      `Are you sure you want to reject ${request.name}'s registration?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "studentRequests", request.id), {
                requestStatus: "rejected",
                rejectedBy: auth.currentUser?.uid,
                rejectedAt: new Date().toISOString(),
              });
              Alert.alert("Rejected", `${request.name}'s registration has been rejected.`);
              fetchClassTeacherData();
            } catch (err) {
              console.error("Reject error:", err);
              Alert.alert("Error", "Failed to reject request");
            }
          },
        },
      ]
    );
  };

  const totalStudents = students.length;
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loading, { color: colors.textDark }]}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>Class Teacher Dashboard</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Ionicons 
              name={theme === "light" ? "moon-outline" : "sunny-outline"} 
              size={22} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToProfileSettings} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Image
            source={
              teacherInfo?.profileImage 
                ? { uri: teacherInfo.profileImage } 
                : user?.photoURL 
                  ? { uri: user.photoURL }
                  : require("../../../assets/images/admin.jpg")
            }
            style={styles.image}
          />
          <Text style={[styles.name, { color: colors.textDark }]}>
            {teacherInfo?.name || user?.name || "Class Teacher"}
          </Text>
          <View style={styles.infoRow}>
            <Ionicons name="school-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>Class Teacher</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {classTeacherInfo?.department || user?.department || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              Semester: {classTeacherInfo?.semester || "N/A"}
            </Text>
          </View>
          {assignedSubject && (
            <View style={styles.infoRow}>
              <Ionicons name="library-outline" size={16} color={colors.textLight} />
              <Text style={[styles.info, { color: colors.textLight }]}>
                Subject: {assignedSubject.name}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {teacherInfo?.gmail || teacherInfo?.email || auth.currentUser?.email || "N/A"}
            </Text>
          </View>
          {teacherInfo?.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={colors.textLight} />
              <Text style={[styles.info, { color: colors.textLight }]}>
                {teacherInfo.phone}
              </Text>
            </View>
          )}
        </View>

        {/* Grid Buttons - FIXED NAVIGATION */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={navigateToAttendance}
          >
            <Ionicons name="calendar-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={navigateToStudentRequests}
          >
            <Ionicons name="notifications-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Requests</Text>
            {pendingRequests.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={navigateToNotes}
          >
            <Ionicons name="document-text-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={navigateToStudents}
          >
            <Ionicons name="people-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Students</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalStudents}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Students</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: "#FF9800" }]}>{pendingRequests.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Requests</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: "#4CAF50" }]}>{assignedSubject ? 1 : 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Subjects</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logout, { backgroundColor: "#F44336" }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.ScrollView>

      {/* Student Requests Modal */}
      <Modal visible={showRequestsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Student Requests</Text>
              <TouchableOpacity onPress={() => setShowRequestsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <View style={[styles.requestItem, { backgroundColor: colors.background }]}>
                  <View style={styles.requestHeader}>
                    <Ionicons name="person-circle-outline" size={40} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.requestTitle, { color: colors.textDark }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.requestStudent, { color: colors.textLight }]}>
                        Roll: {item.boardRollNo} | Sem: {item.semester}
                      </Text>
                      <Text style={[styles.requestStudent, { color: colors.textLight }]}>
                        {item.gmail} | {item.phoneNo || "No phone"}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#FFF3E0' }]}>
                      <Text style={{ color: '#E65100', fontSize: 11, fontWeight: '600' }}>Pending</Text>
                    </View>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: "#4CAF50" }]} 
                      onPress={() => approveRequest(item)}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: "#F44336" }]} 
                      onPress={() => rejectRequest(item)}
                    >
                      <Ionicons name="close-circle" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={48} color={colors.textLight} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>No pending requests for your class</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* View All Students Modal */}
      <Modal visible={showStudentsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textDark }]}>All Students</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>{totalStudents} students</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStudentsModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="search-outline" size={18} color={colors.textLight} />
              <TextInput
                style={[styles.searchInput, { color: colors.textDark }]}
                placeholder="Search by name or roll number..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== "" && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
            
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item, index }) => (
                <View style={[styles.studentItem, { backgroundColor: colors.background }]}>
                  <View style={[styles.studentIndex, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.studentIndexText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.studentName, { color: colors.textDark }]}>{item.name}</Text>
                    <View style={styles.studentDetails}>
                      <Text style={[styles.detailText, { color: colors.textLight }]}>
                        Roll: {item.rollNumber || "N/A"}
                      </Text>
                      <Text style={[styles.detailText, { color: colors.textLight }]}>
                        Sem: {item.semester}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={colors.textLight} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>No students found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },
  loading: { marginTop: 10, fontSize: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, paddingHorizontal: 5 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  headerRight: { flexDirection: "row", gap: 12 },
  card: { padding: 20, borderRadius: 20, alignItems: "center", marginTop: 15, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  image: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  name: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 },
  info: { fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 20 },
  btn: { width: "48%", padding: 20, borderRadius: 15, alignItems: "center", marginBottom: 15, elevation: 2, position: "relative" },
  btnText: { color: "#fff", marginTop: 8, fontWeight: "600", fontSize: 14 },
  badge: { position: "absolute", top: 10, right: 10, backgroundColor: "#F44336", borderRadius: 12, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 10, marginBottom: 20 },
  statCard: { flex: 1, paddingVertical: 16, borderRadius: 15, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  statValue: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  statLabel: { fontSize: 12 },
  logout: { flexDirection: "row", padding: 15, borderRadius: 25, alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 20, gap: 8, elevation: 3 },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, maxHeight: "80%", overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.1)" },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  modalSubtitle: { fontSize: 12, marginTop: 2 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  modalList: { padding: 15, paddingBottom: 30 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 15, marginVertical: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  requestItem: { borderRadius: 15, padding: 15, marginBottom: 10 },
  requestHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  requestTitle: { fontSize: 15, fontWeight: "bold" },
  requestStudent: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  requestActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  studentItem: { flexDirection: "row", alignItems: "center", padding: 15, borderRadius: 15, marginBottom: 8, gap: 12 },
  studentIndex: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  studentIndexText: { fontSize: 14, fontWeight: "bold" },
  studentName: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  studentDetails: { flexDirection: "row", gap: 16 },
  detailText: { fontSize: 11 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { textAlign: "center", fontSize: 16, marginTop: 10 },
});