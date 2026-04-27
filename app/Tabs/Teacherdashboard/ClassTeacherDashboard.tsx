import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
} from "firebase/firestore";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    LogBox,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

// Ignore specific warnings
LogBox.ignoreLogs(['@firebase/firestore']);

interface Subject {
  id: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
}

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  semester: string;
  department: string;
  email?: string;
  phone?: string;
}

interface StudentRequest {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: any;
}

export default function ClassTeacherDashboard() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
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
  const [debugInfo, setDebugInfo] = useState<string>("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const themeRotateAnim = useRef(new Animated.Value(0)).current;
  const statsScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleThemeToggle = () => {
    Animated.sequence([
      Animated.timing(themeRotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(themeRotateAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
    toggleTheme();
  };

  const themeSpin = themeRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const animateStatCard = () => {
    Animated.sequence([
      Animated.timing(statsScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(statsScaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle Logout
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
              await AsyncStorage.removeItem("teacherUser");
              await AsyncStorage.removeItem("userType");
              await auth.signOut();
              router.replace("/");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout");
            }
          }
        }
      ]
    );
  };

  // Navigation functions
  const navigateToAttendance = () => {
    router.push("/Tabs/Teacherdashboard/Attendence");
  };

  const navigateToNotes = () => {
    router.push("/Tabs/Teacherdashboard/notes");
  };

  const navigateToProfileSettings = () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      router.push({
        pathname: "/Tabs/ProfileSettings",
        params: { userId: userId }
      });
    } else {
      router.push("/Tabs/ProfileSettings");
    }
  };

  const navigateToStudentRequests = () => {
    router.push("/Tabs/Teacherdashboard/ClassTeacherNotifications");
  };

  // Direct fetch function for teacher data
  const fetchTeacherDataDirect = async () => {
    if (!auth.currentUser?.uid) return;

    try {
      const teacherRef = doc(db, "teachers", auth.currentUser.uid);
      const teacherSnap = await getDoc(teacherRef);
      
      if (teacherSnap.exists()) {
        const teacherData = teacherSnap.data();
        setTeacherInfo(teacherData);
      }
    } catch (error) {
      console.error("Error fetching teacher data:", error);
    }
  };

  // Fetch students function
  const fetchStudents = async (semester: string, department: string) => {
    try {
      let studentsList: Student[] = [];
      let debugMessages: string[] = [];
      
      debugMessages.push(`Searching for Sem: ${semester}, Dept: ${department}`);
      
      const allStudentsRef = collection(db, "students");
      const allStudentsSnap = await getDocs(allStudentsRef);
      
      debugMessages.push(`Total students in DB: ${allStudentsSnap.size}`);
      
      allStudentsSnap.docs.forEach(doc => {
        const data = doc.data();
        const studentSemester = data.semester?.toString() || data.Semester?.toString() || "";
        const studentDepartment = data.department?.toString() || data.Department?.toString() || data.dept?.toString() || "";
        const targetSemester = semester.toString();
        const targetDepartment = department.toString();
        
        if (studentSemester === targetSemester && studentDepartment === targetDepartment) {
          studentsList.push({
            id: doc.id,
            name: data.name || data.Name || data.fullName || data.studentName || "Unknown",
            rollNumber: data.rollNumber || data.rollNo || data.rollNum || "",
            semester: studentSemester,
            department: studentDepartment,
            email: data.email || data.Email || "",
            phone: data.phone || data.Phone || "",
          } as Student);
        }
      });
      
      setDebugInfo(debugMessages.join("\n"));
      setStudents(studentsList);
      return studentsList;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching students:", errorMessage);
      setDebugInfo(`Error: ${errorMessage}`);
      return [];
    }
  };

  // Fetch class teacher data
  const fetchClassTeacherData = useCallback(async () => {
    if (!auth.currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      await fetchTeacherDataDirect();

      const classTeacherQuery = query(
        collection(db, "classTeachers"),
        where("teacherId", "==", auth.currentUser.uid)
      );
      const classTeacherSnap = await getDocs(classTeacherQuery);
      
      if (classTeacherSnap.empty) {
        Alert.alert("Error", "No class assigned to you. Contact HOD.");
        setLoading(false);
        return;
      }
      
      const classData = classTeacherSnap.docs[0].data();
      
      setClassTeacherInfo({
        semester: classData.semester,
        department: classData.department,
        assignedAt: classData.assignedAt,
      });

      // Fetch assigned subject
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

      await fetchStudents(classData.semester, classData.department);

      const requestsQuery = query(
        collection(db, "studentRequests"),
        where("status", "==", "pending")
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requestsList = requestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StudentRequest));
      setPendingRequests(requestsList);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching class teacher data:", errorMessage);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Set up real-time listener for teacher data
  useEffect(() => {
    if (!auth.currentUser?.uid) return;

    const teacherRef = doc(db, "teachers", auth.currentUser.uid);
    
    const unsubscribe = onSnapshot(teacherRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setTeacherInfo(docSnapshot.data());
      }
    }, (error) => {
      console.error("Snapshot listener error:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchClassTeacherData();
  }, [fetchClassTeacherData]);

  useFocusEffect(
    useCallback(() => {
      fetchClassTeacherData();
      return () => {};
    }, [fetchClassTeacherData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassTeacherData();
  };

  const approveRequest = async (request: StudentRequest) => {
    try {
      await updateDoc(doc(db, "studentRequests", request.id), {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: auth.currentUser?.uid,
      });
      Alert.alert("Approved", `Request from ${request.studentName} approved`);
      fetchClassTeacherData();
    } catch (error) {
      Alert.alert("Error", "Failed to approve request");
    }
  };

  const rejectRequest = async (request: StudentRequest) => {
    Alert.alert(
      "Reject Request",
      `Reject request from ${request.studentName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "studentRequests", request.id), {
                status: "rejected",
                rejectedAt: new Date().toISOString(),
                rejectedBy: auth.currentUser?.uid,
              });
              Alert.alert("Rejected", "Request rejected");
              fetchClassTeacherData();
            } catch (error) {
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Class Teacher</Text>
                <Text style={styles.headerSubtitle}>{teacherInfo?.name || "Teacher"}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleThemeToggle} style={styles.iconButton}>
                  <Animated.View style={{ transform: [{ rotate: themeSpin }] }}>
                    <Ionicons name={theme === 'dark' ? "sunny-outline" : "moon-outline"} size={22} color="#fff" />
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity onPress={navigateToProfileSettings} style={styles.iconButton}>
                  <Ionicons name="settings-outline" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
                  <Ionicons name="log-out-outline" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Teacher Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card, elevation: 2 }]}>
            <View style={styles.profileHeader}>
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {teacherInfo?.name?.charAt(0) || "T"}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.textDark }]}>
                  {teacherInfo?.name || "Teacher Name"}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textLight }]}>
                  {teacherInfo?.email || auth.currentUser?.email}
                </Text>
                
                <View style={styles.bioContainer}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                  <Text style={[styles.bioText, { color: colors.textDark }]}>
                    {teacherInfo?.bio || "No bio added yet"}
                  </Text>
                </View>
                
                <View style={styles.roleBadge}>
                  <Ionicons name="briefcase-outline" size={12} color={colors.primary} />
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>Class Teacher</Text>
                </View>
                
                <View style={styles.detailBadge}>
                  <Ionicons name="business-outline" size={12} color={colors.primary} />
                  <Text style={[styles.detailText, { color: colors.textDark }]}>
                    Department: {teacherInfo?.department || "Not set"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Statistics Card */}
          <TouchableOpacity onPress={animateStatCard} activeOpacity={0.9}>
            <Animated.View style={[styles.statsContainer, { transform: [{ scale: statsScaleAnim }] }]}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconBg, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="people-outline" size={28} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.statValue, { color: colors.textDark }]}>{totalStudents}</Text>
                  <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Students</Text>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Class Information Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, elevation: 2 }]}>
            <Text style={[styles.infoCardTitle, { color: colors.textDark }]}>Class Information</Text>
            <View style={styles.infoRow}>
              <Ionicons name="school-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textDark }]}>Semester: {classTeacherInfo?.semester}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textDark }]}>Department: {classTeacherInfo?.department}</Text>
            </View>
            {assignedSubject && (
              <View style={styles.infoRow}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.textDark }]}>Subject: {assignedSubject.name}</Text>
              </View>
            )}
          </View>

          {/* View Students Button */}
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.viewStudentsBtn}
              onPress={() => setShowStudentsModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={[colors.primary, colors.secondary]} 
                style={styles.viewStudentsGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="people-circle-outline" size={24} color="#fff" />
                <Text style={styles.viewStudentsText}>View All Students ({totalStudents})</Text>
                <Ionicons name="chevron-forward-outline" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Actions - Compact Buttons */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={navigateToAttendance} activeOpacity={0.8}>
                <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.actionGradient}>
                  <Ionicons name="checkbox-outline" size={24} color="#fff" />
                  <Text style={styles.actionText}>Attendance</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={navigateToStudentRequests} activeOpacity={0.8}>
                <LinearGradient colors={["#9C27B0", "#7B1FA2"]} style={styles.actionGradient}>
                  <Ionicons name="notifications-outline" size={24} color="#fff" />
                  <Text style={styles.actionText}>Requests</Text>
                  {pendingRequests.length > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{pendingRequests.length}</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={navigateToNotes} activeOpacity={0.8}>
                <LinearGradient colors={["#FF9800", "#F57C00"]} style={styles.actionGradient}>
                  <Ionicons name="document-text-outline" size={24} color="#fff" />
                  <Text style={styles.actionText}>Notes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Student Requests Modal */}
      <Modal visible={showRequestsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeaderGradient}>
              <Text style={styles.modalTitle}>Student Requests</Text>
              <TouchableOpacity onPress={() => setShowRequestsModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.requestItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.requestInfo}>
                    <Text style={[styles.requestTitle, { color: colors.textDark }]}>{item.title}</Text>
                    <Text style={[styles.requestMessage, { color: colors.textLight }]}>{item.message}</Text>
                    <Text style={[styles.requestStudent, { color: colors.textLight }]}>From: {item.studentName}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => approveRequest(item)}>
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => rejectRequest(item)}>
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textLight }]}>No pending requests</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* View All Students Modal */}
      <Modal visible={showStudentsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeaderGradient}>
              <Text style={styles.modalTitle}>All Students ({totalStudents})</Text>
              <TouchableOpacity onPress={() => setShowStudentsModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={20} color={colors.textLight} />
              <TextInput
                style={[styles.searchInput, { color: colors.textDark }]}
                placeholder="Search by name or roll number..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== "" && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>
            
            {totalStudents === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textDark }]}>No Students Found</Text>
                <TouchableOpacity 
                  style={[styles.refreshStudentsBtn, { backgroundColor: colors.primary }]}
                  onPress={fetchClassTeacherData}
                >
                  <Text style={styles.refreshStudentsText}>Refresh Data</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                  <View style={[styles.studentModalItem, { borderBottomColor: colors.border }]}>
                    <View style={[styles.studentNumberContainer, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.studentNumber, { color: colors.primary }]}>{index + 1}</Text>
                    </View>
                    <View style={styles.studentModalInfo}>
                      <Text style={[styles.studentModalName, { color: colors.textDark }]}>{item.name}</Text>
                      <View style={styles.studentModalDetails}>
                        <View style={styles.detailChip}>
                          <Ionicons name="document-text-outline" size={12} color={colors.textLight} />
                          <Text style={[styles.studentModalDetail, { color: colors.textLight }]}>
                            Roll: {item.rollNumber || "N/A"}
                          </Text>
                        </View>
                        <View style={styles.detailChip}>
                          <Ionicons name="school-outline" size={12} color={colors.textLight} />
                          <Text style={[styles.studentModalDetail, { color: colors.textLight }]}>
                            Sem: {item.semester}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={64} color={colors.textLight} />
                    <Text style={[styles.emptyText, { color: colors.textLight }]}>No matching students</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10 },
  
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 2 },
  
  profileCard: { margin: 15, padding: 15, borderRadius: 16 },
  profileHeader: { flexDirection: "row", alignItems: "flex-start", gap: 15 },
  avatarContainer: { width: 55, height: 55, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  profileEmail: { fontSize: 12, marginBottom: 6 },
  bioContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    marginTop: 4,
    marginBottom: 6,
    padding: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  bioText: { fontSize: 12, flex: 1, lineHeight: 16 },
  roleBadge: { flexDirection: "row", alignItems: "center", marginTop: 2, gap: 4 },
  roleBadgeText: { fontSize: 10, fontWeight: "600" },
  detailBadge: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
  detailText: { fontSize: 12 },
  
  statsContainer: { paddingHorizontal: 15, marginBottom: 15 },
  statCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, gap: 12 },
  statIconBg: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 11, marginTop: 2 },
  
  infoCard: { marginHorizontal: 15, marginBottom: 15, padding: 15, borderRadius: 16 },
  infoCardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  infoText: { fontSize: 14, fontWeight: "500" },
  
  section: { marginHorizontal: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  
  viewStudentsBtn: { borderRadius: 14, overflow: "hidden", elevation: 2 },
  viewStudentsGradient: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  viewStudentsText: { fontSize: 16, fontWeight: "bold", color: "#fff", flex: 1, textAlign: "center" },
  
  actionGrid: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  actionCard: { flex: 1, borderRadius: 12, overflow: "hidden" },
  actionGradient: { padding: 12, alignItems: "center", gap: 6, position: "relative" },
  actionText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  badgeContainer: { 
    position: "absolute", 
    top: 4, 
    right: 4, 
    backgroundColor: "#FF4444", 
    borderRadius: 10, 
    minWidth: 18, 
    height: 18, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: 4 
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 24, width: "90%", maxHeight: "85%", overflow: "hidden" },
  modalHeaderGradient: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  
  searchContainer: { flexDirection: "row", alignItems: "center", margin: 15, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 6 },
  
  requestItem: { flexDirection: "row", justifyContent: "space-between", padding: 15, borderBottomWidth: 1 },
  requestInfo: { flex: 1 },
  requestTitle: { fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  requestMessage: { fontSize: 13, marginTop: 2 },
  requestStudent: { fontSize: 11, marginTop: 4 },
  requestActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  approveBtn: { backgroundColor: "#4CAF50", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  approveText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  rejectBtn: { backgroundColor: "#F44336", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  rejectText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  
  studentModalItem: { flexDirection: "row", padding: 15, borderBottomWidth: 1, alignItems: "flex-start" },
  studentNumberContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 12, marginTop: 2 },
  studentNumber: { fontSize: 14, fontWeight: "bold" },
  studentModalInfo: { flex: 1 },
  studentModalName: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  studentModalDetails: { flexDirection: "row", gap: 12, marginBottom: 2, flexWrap: "wrap" },
  detailChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  studentModalDetail: { fontSize: 11 },
  
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  emptyText: { textAlign: "center", padding: 20, fontSize: 16, marginTop: 10 },
  refreshStudentsBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  refreshStudentsText: { color: "#fff", fontWeight: "bold" },
});