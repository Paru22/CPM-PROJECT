import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
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

interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  date: string;
  status: "present" | "absent";
  markedBy: string;
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
  const [assignedSubject, setAssignedSubject] = useState<Subject | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<{ [studentId: string]: { present: number; total: number; percentage: number } }>({});
  const [pendingRequests, setPendingRequests] = useState<StudentRequest[]>([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [attendanceSelections, setAttendanceSelections] = useState<{ [studentId: string]: "present" | "absent" }>({});

  // Fetch class teacher data
  const fetchClassTeacherData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const classTeacherQuery = query(
        collection(db, "classTeachers"),
        where("teacherId", "==", user.uid)
      );
      const classTeacherSnap = await getDocs(classTeacherQuery);
      if (classTeacherSnap.empty) {
        Alert.alert("Error", "No class assigned to you. Contact HOD.");
        return;
      }
      const classData = classTeacherSnap.docs[0].data();
      setClassTeacherInfo({
        semester: classData.semester,
        department: classData.department,
        assignedAt: classData.assignedAt,
      });

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

      const studentsQuery = query(
        collection(db, "students"),
        where("semester", "==", classData.semester),
        where("department", "==", classData.department)
      );
      const studentsSnap = await getDocs(studentsQuery);
      const studentsList = studentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Student));
      setStudents(studentsList);

      if (assignedSubject) {
        await fetchAttendanceSummary(studentsList, assignedSubject.id);
      }

      const requestsQuery = query(
        collection(db, "studentRequests"),
        where("status", "==", "pending"),
        where("forClass", "==", `${classData.semester}_${classData.department}`)
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
  }, [user, assignedSubject]);

  const fetchAttendanceSummary = async (studentsList: Student[], subjectId: string) => {
    const summary: { [studentId: string]: { present: number; total: number; percentage: number } } = {};
    for (const student of studentsList) {
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("studentId", "==", student.id),
        where("subjectId", "==", subjectId)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const records = attendanceSnap.docs.map(doc => doc.data() as AttendanceRecord);
      const present = records.filter(r => r.status === "present").length;
      const total = records.length;
      const percentage = total === 0 ? 0 : (present / total) * 100;
      summary[student.id] = { present, total, percentage };
    }
    setAttendanceSummary(summary);
  };

  useEffect(() => {
    fetchClassTeacherData();
  }, [fetchClassTeacherData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassTeacherData();
  };

  const markAttendance = (studentId: string, status: "present" | "absent") => {
    setAttendanceSelections(prev => ({ ...prev, [studentId]: status }));
  };

  const submitAttendance = async () => {
    if (!assignedSubject) {
      Alert.alert("Error", "No subject assigned");
      return;
    }
    if (Object.keys(attendanceSelections).length === 0) {
      Alert.alert("No Selection", "Please mark attendance for at least one student");
      return;
    }

    setMarkingAttendance(true);
    const date = new Date().toISOString().split("T")[0];
    try {
      for (const [studentId, status] of Object.entries(attendanceSelections)) {
        const student = students.find(s => s.id === studentId);
        if (!student) continue;

        const existingQuery = query(
          collection(db, "attendance"),
          where("studentId", "==", studentId),
          where("subjectId", "==", assignedSubject.id),
          where("date", "==", date)
        );
        const existingSnap = await getDocs(existingQuery);
        if (!existingSnap.empty) {
          const existingDoc = existingSnap.docs[0];
          await updateDoc(doc(db, "attendance", existingDoc.id), {
            status,
            markedBy: user?.uid,
            markedAt: new Date().toISOString(),
          });
        } else {
          await addDoc(collection(db, "attendance"), {
            studentId,
            studentName: student.name,
            subjectId: assignedSubject.id,
            subjectName: assignedSubject.name,
            date,
            status,
            markedBy: user?.uid,
            markedAt: new Date().toISOString(),
          });
        }
      }
      Alert.alert("Success", `Attendance marked for ${Object.keys(attendanceSelections).length} students`);
      setAttendanceSelections({});
      await fetchClassTeacherData();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to submit attendance");
    } finally {
      setMarkingAttendance(false);
    }
  };

  const viewStudentAttendance = async (student: Student) => {
    if (!assignedSubject) return;
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("studentId", "==", student.id),
      where("subjectId", "==", assignedSubject.id)
    );
    const attendanceSnap = await getDocs(attendanceQuery);
    const records = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    setAttendanceHistory(records.sort((a, b) => b.date.localeCompare(a.date)));
    setSelectedStudent(student);
    setShowAttendanceModal(true);
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
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Header */}
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Class Teacher Dashboard</Text>
              <Text style={styles.headerSubtitle}>{user?.name}</Text>
            </View>
            {/* Theme Toggle Button */}
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
              <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Class Teacher Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, elevation: 3 }]}>
          <View style={styles.infoRow}>
            <Ionicons name="school-outline" size={22} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textDark }]}>Class: Semester {classTeacherInfo?.semester}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={22} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textDark }]}>Department: {classTeacherInfo?.department}</Text>
          </View>
          {assignedSubject && (
            <View style={styles.infoRow}>
              <Ionicons name="book-outline" size={22} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textDark }]}>Assigned Subject: {assignedSubject.name}</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={() => setShowAttendanceModal(false)}>
              <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.actionGradient}>
                <Ionicons name="checkmark-circle" size={32} color="#fff" />
                <Text style={styles.actionText}>Mark Attendance</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/Tabs/Teacherdashboard/notes")}>
              <LinearGradient colors={["#FF9800", "#F57C00"]} style={styles.actionGradient}>
                <Ionicons name="document-text" size={32} color="#fff" />
                <Text style={styles.actionText}>Add Note</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard} onPress={() => setShowRequestsModal(true)}>
              <LinearGradient colors={["#9C27B0", "#7B1FA2"]} style={styles.actionGradient}>
                <Ionicons name="notifications" size={32} color="#fff" />
                <Text style={styles.actionText}>Requests ({pendingRequests.length})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mark Attendance Section (inline) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Mark Attendance for {assignedSubject?.name}</Text>
          <Text style={[styles.subtitle, { color: colors.textLight }]}>{"Today's Date: {new Date().toLocaleDateString()"}</Text>
          {students.map((student) => {
            const selected = attendanceSelections[student.id];
            return (
              <View key={student.id} style={[styles.studentRow, { backgroundColor: colors.card }]}>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.textDark }]}>{student.name}</Text>
                  <Text style={[styles.studentRoll, { color: colors.textLight }]}>Roll: {student.rollNumber}</Text>
                </View>
                <View style={styles.attendanceButtons}>
                  <TouchableOpacity
                    style={[styles.presentBtn, selected === "present" && styles.activeBtn]}
                    onPress={() => markAttendance(student.id, "present")}
                  >
                    <Text style={[styles.btnText, { color: selected === "present" ? "#fff" : "#4CAF50" }]}>Present</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.absentBtn, selected === "absent" && styles.activeBtn]}
                    onPress={() => markAttendance(student.id, "absent")}
                  >
                    <Text style={[styles.btnText, { color: selected === "absent" ? "#fff" : "#F44336" }]}>Absent</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {Object.keys(attendanceSelections).length > 0 && (
            <TouchableOpacity style={styles.submitBtn} onPress={submitAttendance} disabled={markingAttendance}>
              <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.submitGradient}>
                {markingAttendance ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Attendance</Text>}
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Attendance Summary Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Attendance Summary ({assignedSubject?.name})</Text>
          {students.map((student) => {
            const summary = attendanceSummary[student.id] || { present: 0, total: 0, percentage: 0 };
            return (
              <TouchableOpacity
                key={student.id}
                style={[styles.summaryRow, { backgroundColor: colors.card }]}
                onPress={() => viewStudentAttendance(student)}
              >
                <View style={styles.summaryInfo}>
                  <Text style={[styles.studentName, { color: colors.textDark }]}>{student.name}</Text>
                  <Text style={[styles.studentRoll, { color: colors.textLight }]}>{student.rollNumber}</Text>
                </View>
                <View style={styles.summaryStats}>
                  <Text style={[styles.summaryText, { color: colors.textDark }]}>{summary.present}/{summary.total}</Text>
                  <Text style={[styles.percentage, summary.percentage >= 75 ? styles.good : styles.poor, { color: summary.percentage >= 75 ? "#4CAF50" : "#F44336" }]}>
                    {Math.round(summary.percentage)}%
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Student Requests Modal */}
      <Modal visible={showRequestsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Student Requests</Text>
              <TouchableOpacity onPress={() => setShowRequestsModal(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
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

      {/* Attendance History Modal */}
      <Modal visible={showAttendanceModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Attendance History - {selectedStudent?.name}</Text>
              <TouchableOpacity onPress={() => setShowAttendanceModal(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={attendanceHistory}
              keyExtractor={(item) => item.id!}
              renderItem={({ item }) => (
                <View style={[styles.historyItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.historyDate, { color: colors.textDark }]}>{new Date(item.date).toLocaleDateString()}</Text>
                  <View style={[styles.historyStatus, { backgroundColor: item.status === "present" ? "#4CAF50" : "#F44336" }]}>
                    <Text style={styles.historyStatusText}>{item.status.toUpperCase()}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textLight }]}>No attendance records</Text>}
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
  themeToggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 2 },
  infoCard: { margin: 15, padding: 15, borderRadius: 15, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, fontWeight: "500" },
  section: { marginHorizontal: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  subtitle: { fontSize: 12, marginBottom: 10 },
  actionGrid: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  actionCard: { flex: 1, borderRadius: 12, overflow: "hidden" },
  actionGradient: { padding: 15, alignItems: "center", gap: 8 },
  actionText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  studentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 8, elevation: 1 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: "600" },
  studentRoll: { fontSize: 12 },
  attendanceButtons: { flexDirection: "row", gap: 8 },
  presentBtn: { backgroundColor: "#e8f5e9", paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  absentBtn: { backgroundColor: "#ffebee", paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  activeBtn: { backgroundColor: "#7384bf" },
  btnText: { fontSize: 12, fontWeight: "600" },
  submitBtn: { marginTop: 15, borderRadius: 10, overflow: "hidden" },
  submitGradient: { paddingVertical: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 8, elevation: 1 },
  summaryInfo: { flex: 1 },
  summaryStats: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryText: { fontSize: 14 },
  percentage: { fontSize: 14, fontWeight: "bold" },
  good: { color: "#4CAF50" },
  poor: { color: "#F44336" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 20, width: "90%", maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
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
  emptyText: { textAlign: "center", padding: 20 },
  historyItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  historyDate: { fontSize: 14 },
  historyStatus: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  historyStatusText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
});