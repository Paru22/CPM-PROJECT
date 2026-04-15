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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

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
  const { user } = useAuth();
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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const themeRotateAnim = useRef(new Animated.Value(0)).current;
  const statsScaleAnim = useRef(new Animated.Value(1)).current;
  const [showThemeTooltip, setShowThemeTooltip] = useState(false);

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

    const timer = setTimeout(() => {
      setShowThemeTooltip(true);
      setTimeout(() => setShowThemeTooltip(false), 3000);
    }, 1000);

    return () => clearTimeout(timer);
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

  // Force refresh function
  const forceRefreshData = async () => {
    console.log("Force refreshing data...");
    setRefreshing(true);
    await fetchTeacherDataDirect();
    await fetchClassTeacherData();
    setRefreshing(false);
  };

  // Direct fetch function
  const fetchTeacherDataDirect = async () => {
    if (!user?.uid) return;

    try {
      console.log("Directly fetching teacher data for UID:", user.uid);
      const teacherRef = doc(db, "teachers", user.uid);
      const teacherSnap = await getDoc(teacherRef);
      
      if (teacherSnap.exists()) {
        const teacherData = teacherSnap.data();
        console.log("Fetched teacher data:", teacherData);
        setTeacherInfo(teacherData);
      } else {
        console.log("No teacher document found!");
      }
    } catch (error) {
      console.error("Error fetching teacher data:", error);
    }
  };

  // Fetch class teacher data
  const fetchClassTeacherData = useCallback(async () => {
    if (!user?.uid) {
      console.log("No user UID available");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching class teacher data for UID:", user.uid);
      
      // First, fetch teacher info directly
      await fetchTeacherDataDirect();

      // Fetch class teacher assignment
      const classTeacherQuery = query(
        collection(db, "classTeachers"),
        where("teacherId", "==", user.uid)
      );
      const classTeacherSnap = await getDocs(classTeacherQuery);
      
      if (classTeacherSnap.empty) {
        console.log("No class teacher assignment found");
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
        where("teacherId", "==", user.uid)
      );
      const teacherSubjectSnap = await getDocs(teacherSubjectQuery);
      if (!teacherSubjectSnap.empty) {
        const subjectId = teacherSubjectSnap.docs[0].data().subjectId;
        const subjectDoc = await getDoc(doc(db, "subjects", subjectId));
        if (subjectDoc.exists()) {
          setAssignedSubject({ id: subjectDoc.id, ...subjectDoc.data() } as Subject);
        }
      }

      // Fetch students in the class
      const studentsQuery = query(
        collection(db, "students"),
        where("semester", "==", classData.semester),
        where("department", "==", classData.department)
      );
      const studentsSnap = await getDocs(studentsQuery);
      const studentsList = studentsSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().Name || "",
        rollNumber: doc.data().rollNumber || doc.data().rollNo || "",
        semester: doc.data().semester || "",
        department: doc.data().department || "",
        email: doc.data().email || "",
        phone: doc.data().phone || "",
      } as Student));
      setStudents(studentsList);

      // Fetch pending student requests
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
      console.error("Error fetching class teacher data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Set up real-time listener for teacher data
  useEffect(() => {
    if (!user?.uid) return;

    console.log("Setting up real-time listener for teacher:", user.uid);
    const teacherRef = doc(db, "teachers", user.uid);
    
    const unsubscribe = onSnapshot(teacherRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const updatedData = docSnapshot.data();
        console.log("Real-time update received:", updatedData);
        setTeacherInfo(updatedData);
      }
    }, (error) => {
      console.error("Snapshot listener error:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    fetchClassTeacherData();
  }, [fetchClassTeacherData]);

  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused - refreshing data");
      fetchClassTeacherData();
      return () => {};
    }, [fetchClassTeacherData])
  );

  const onRefresh = () => {
    console.log("Manual refresh triggered");
    setRefreshing(true);
    fetchClassTeacherData();
  };

  const approveRequest = async (request: StudentRequest) => {
    try {
      await updateDoc(doc(db, "studentRequests", request.id), {
        status: "approved",
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid,
      });
      Alert.alert("Approved", `Request from ${request.studentName} approved`);
      fetchClassTeacherData();
    } catch {
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
                rejectedBy: user?.uid,
              });
              Alert.alert("Rejected", "Request rejected");
              fetchClassTeacherData();
            } catch  {
              Alert.alert("Error", "Failed to reject request");
            }
          },
        },
      ]
    );
  };

  const totalStudents = students.length;

  const navigateToAttendance = () => {
    router.push("/Tabs/Teacherdashboard/Attendence");
  };

  const navigateToNotes = () => {
    router.push("/Tabs/Teacherdashboard/notes");
  };

  const navigateToProfileSettings = () => {
    router.push("/Tabs/ProfileSettings");
  };

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
                <Text style={styles.headerTitle}>Class Teacher Dashboard</Text>
                <Text style={styles.headerSubtitle}>{teacherInfo?.name || user?.name || "Teacher"}</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={forceRefreshData} style={styles.themeToggle}>
                  <Ionicons name="refresh-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleThemeToggle} style={styles.themeToggle}>
                  <Animated.View style={{ transform: [{ rotate: themeSpin }] }}>
                    <Ionicons name={theme === 'dark' ? "sunny-outline" : "moon-outline"} size={24} color="#fff" />
                  </Animated.View>
                </TouchableOpacity>
                <TouchableOpacity onPress={navigateToProfileSettings} style={styles.settingsButton}>
                  <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Teacher Profile Card with Updated Department */}
          <Animated.View style={[styles.profileCard, { backgroundColor: colors.card, elevation: 3 }]}>
            <View style={styles.profileHeader}>
              <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {teacherInfo?.name?.charAt(0) || teacherInfo?.displayName?.charAt(0) || "T"}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.textDark }]}>
                  {teacherInfo?.name || teacherInfo?.displayName || "Teacher Name"}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textLight }]}>
                  {teacherInfo?.email || user?.email}
                </Text>
                
                {/* Bio Section */}
                <View style={styles.bioContainer}>
                  <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
                  <Text style={[styles.bioText, { color: colors.textDark }]}>
                    {teacherInfo?.bio || "No bio added yet"}
                  </Text>
                </View>
                
                <View style={styles.roleBadge}>
                  <Ionicons name="briefcase-outline" size={12} color={colors.primary} />
                  <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                    Class Teacher
                  </Text>
                </View>
                
                {/* This shows the UPDATED teacher department from profile */}
                <View style={styles.detailBadge}>
                  <Ionicons name="business-outline" size={12} color={colors.primary} />
                  <Text style={[styles.detailText, { color: colors.textDark, fontWeight: '500' }]}>
                    Department: {teacherInfo?.department || "Not set"}
                  </Text>
                </View>
                
                {teacherInfo?.phone && (
                  <View style={styles.detailBadge}>
                    <Ionicons name="call-outline" size={12} color={colors.textLight} />
                    <Text style={[styles.detailText, { color: colors.textLight }]}>
                      {teacherInfo.phone}
                    </Text>
                  </View>
                )}

                {/* Show qualification if available */}
                {teacherInfo?.qualification && (
                  <View style={styles.detailBadge}>
                    <Ionicons name="school-outline" size={12} color={colors.textLight} />
                    <Text style={[styles.detailText, { color: colors.textLight }]}>
                      {teacherInfo.qualification}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Statistics Cards */}
          <TouchableOpacity onPress={animateStatCard} activeOpacity={0.9}>
            <Animated.View style={[styles.statsContainer, { transform: [{ scale: statsScaleAnim }] }]}>
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconBg, { backgroundColor: "#E8F0FE" }]}>
                  <Ionicons name="people-outline" size={24} color="#1976D2" />
                </View>
                <View>
                  <Text style={[styles.statValue, { color: colors.textDark }]}>{totalStudents}</Text>
                  <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Students</Text>
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Class Information Card - Shows the CLASS department (not teacher's personal dept) */}
          <View style={[styles.infoCard, { backgroundColor: colors.card, elevation: 2 }]}>
            <Text style={[styles.infoCardTitle, { color: colors.textDark }]}>Assigned Class Information</Text>
            <View style={styles.infoRow}>
              <Ionicons name="school-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textDark }]}>Semester: {classTeacherInfo?.semester}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="business-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textDark }]}>Class Department: {classTeacherInfo?.department}</Text>
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
              style={[styles.viewStudentsBtn]}
              onPress={() => setShowStudentsModal(true)}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={[colors.primary, colors.secondary]} 
                style={styles.viewStudentsGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="people-circle-outline" size={28} color="#fff" />
                <Text style={styles.viewStudentsText}>View All Students</Text>
                <Ionicons name="chevron-forward-outline" size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={navigateToAttendance}>
                <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.actionGradient}>
                  <Ionicons name="checkbox-outline" size={28} color="#fff" />
                  <Text style={styles.actionText}>Mark Attendance</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => setShowRequestsModal(true)}>
                <LinearGradient colors={["#9C27B0", "#7B1FA2"]} style={styles.actionGradient}>
                  <Ionicons name="notifications-outline" size={28} color="#fff" />
                  <Text style={styles.actionText}>Requests ({pendingRequests.length})</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={navigateToNotes}>
                <LinearGradient colors={["#FF9800", "#F57C00"]} style={styles.actionGradient}>
                  <Ionicons name="document-text-outline" size={28} color="#fff" />
                  <Text style={styles.actionText}>Add Note</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Keep your existing modals here - they remain the same */}
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
            
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <View style={[styles.studentModalItem, { borderBottomColor: colors.border }]}>
                  <View style={[styles.studentNumberContainer, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.studentNumber, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                  <View style={styles.studentModalInfo}>
                    <Text style={[styles.studentModalName, { color: colors.textDark }]}>{item.name}</Text>
                    <View style={styles.studentModalDetails}>
                      <View style={styles.detailChip}>
                        <Ionicons name="document-text-outline" size={12} color={colors.textLight} />
                        <Text style={[styles.studentModalDetail, { color: colors.textLight }]}>
                          Roll: {item.rollNumber}
                        </Text>
                      </View>
                      <View style={styles.detailChip}>
                        <Ionicons name="school-outline" size={12} color={colors.textLight} />
                        <Text style={[styles.studentModalDetail, { color: colors.textLight }]}>
                          Sem: {item.semester}
                        </Text>
                      </View>
                    </View>
                    {item.email && (
                      <View style={styles.detailChip}>
                        <Ionicons name="mail-outline" size={12} color={colors.textLight} />
                        <Text style={[styles.studentModalEmail, { color: colors.textLight }]}>{item.email}</Text>
                      </View>
                    )}
                    {item.phone && (
                      <View style={styles.detailChip}>
                        <Ionicons name="call-outline" size={12} color={colors.textLight} />
                        <Text style={[styles.studentModalPhone, { color: colors.textLight }]}>{item.phone}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color={colors.textLight} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>No students found</Text>
                  <Text style={[styles.emptySubText, { color: colors.textLight }]}>Try adjusting your search</Text>
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10 },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerActions: { flexDirection: "row", gap: 10 },
  themeToggle: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  settingsButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  themeTooltip: {
    position: 'absolute',
    top: 100,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  themeTooltipText: { fontSize: 12, fontWeight: '500' },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 2 },
  
  profileCard: { margin: 15, padding: 15, borderRadius: 15 },
  profileHeader: { flexDirection: "row", alignItems: "flex-start", gap: 15 },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  profileEmail: { fontSize: 12, marginBottom: 6 },
  bioContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    marginTop: 6,
    marginBottom: 6,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 8,
  },
  bioText: { fontSize: 13, flex: 1, lineHeight: 18 },
  roleBadge: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  roleBadgeText: { fontSize: 10, fontWeight: "600" },
  detailBadge: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 6 },
  detailText: { fontSize: 12 },
  
  statsContainer: { paddingHorizontal: 15, marginBottom: 15 },
  statCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 15, gap: 10, elevation: 2 },
  statIconBg: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "bold" },
  statLabel: { fontSize: 11, marginTop: 2 },
  
  infoCard: { marginHorizontal: 15, marginBottom: 15, padding: 15, borderRadius: 15 },
  infoCardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  infoText: { fontSize: 14, fontWeight: "500" },
  
  section: { marginHorizontal: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  
  viewStudentsBtn: { borderRadius: 15, overflow: "hidden", elevation: 3 },
  viewStudentsGradient: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  viewStudentsText: { fontSize: 18, fontWeight: "bold", color: "#fff", flex: 1, textAlign: "center" },
  
  actionGrid: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  actionCard: { flex: 1, borderRadius: 12, overflow: "hidden" },
  actionGradient: { padding: 12, alignItems: "center", gap: 6 },
  actionText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 20, width: "90%", maxHeight: "85%", overflow: "hidden" },
  modalHeaderGradient: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  
  searchContainer: { flexDirection: "row", alignItems: "center", margin: 15, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 6 },
  
  requestItem: { flexDirection: "row", justifyContent: "space-between", padding: 15, borderBottomWidth: 1 },
  requestInfo: { flex: 1 },
  requestTitle: { fontSize: 16, fontWeight: "bold" },
  requestMessage: { fontSize: 14, marginTop: 4 },
  requestStudent: { fontSize: 12, marginTop: 4 },
  requestActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  approveBtn: { backgroundColor: "#4CAF50", paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8 },
  approveText: { color: "#fff", fontWeight: "bold" },
  rejectBtn: { backgroundColor: "#F44336", paddingHorizontal: 15, paddingVertical: 6, borderRadius: 8 },
  rejectText: { color: "#fff", fontWeight: "bold" },
  
  studentModalItem: { flexDirection: "row", padding: 15, borderBottomWidth: 1, alignItems: "flex-start" },
  studentNumberContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12, marginTop: 2 },
  studentNumber: { fontSize: 14, fontWeight: "bold" },
  studentModalInfo: { flex: 1 },
  studentModalName: { fontSize: 16, fontWeight: "600", marginBottom: 6 },
  studentModalDetails: { flexDirection: "row", gap: 12, marginBottom: 4, flexWrap: "wrap" },
  detailChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  studentModalDetail: { fontSize: 12 },
  studentModalEmail: { fontSize: 11, marginTop: 2 },
  studentModalPhone: { fontSize: 11, marginTop: 2 },
  
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { textAlign: "center", padding: 20, fontSize: 16, marginTop: 10 },
  emptySubText: { fontSize: 12, marginTop: 5 },
});