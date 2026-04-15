import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    writeBatch,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  semester: string;
  department: string;
}

interface Subject {
  id: string;
  name: string;
  department: string;
  semester: number;
  credits?: number;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { colors } = useTheme();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [userDepartment, setUserDepartment] = useState<string>("");
  
  // For HOD - semester filter
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  
  // For Teachers - their subjects
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  
  // Students
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceSelections, setAttendanceSelections] = useState<any>({});
  const [attendanceSummary, setAttendanceSummary] = useState<any>({});
  
  // UI state
  const [showAttendanceMarking, setShowAttendanceMarking] = useState(false);
  const [todayDate, setTodayDate] = useState("");

  // Fetch user role and info
  const fetchUserInfo = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const teacherRef = doc(db, "teachers", user.uid);
      const teacherSnap = await getDoc(teacherRef);
      
      if (teacherSnap.exists()) {
        const teacherData = teacherSnap.data();
        setUserRole(teacherData.role || "teacher");
        setUserDepartment(teacherData.department || "");
        
        // Check if user is class teacher
        const classTeacherQuery = query(
          collection(db, "classTeachers"),
          where("teacherId", "==", user.uid)
        );
        const classTeacherSnap = await getDocs(classTeacherQuery);
        if (!classTeacherSnap.empty) {
          if (userRole !== "hod") {
            setUserRole("class_teacher");
          }
        }
      }
      
      setTodayDate(new Date().toLocaleDateString());
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  }, [user, userRole]);

  // Fetch available semesters (for HOD)
  const fetchAvailableSemesters = useCallback(async () => {
    try {
      const studentsSnap = await getDocs(collection(db, "students"));
      const semesters = new Set<string>();
      studentsSnap.docs.forEach(doc => {
        const semester = doc.data().semester;
        if (semester) semesters.add(semester);
      });
      const semestersList = Array.from(semesters).sort();
      setAvailableSemesters(semestersList);
      if (semestersList.length > 0) {
        setSelectedSemester(semestersList[0]);
      }
    } catch (err) {
      console.error("Error fetching semesters:", err);
    }
  }, []);

  // Fetch subjects the teacher teaches
  const fetchMySubjects = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const teacherSubjectsQuery = query(
        collection(db, "teacherSubjects"),
        where("teacherId", "==", user.uid)
      );
      const teacherSubjectsSnap = await getDocs(teacherSubjectsQuery);
      
      const subjectsList: Subject[] = [];
      for (const tsDoc of teacherSubjectsSnap.docs) {
        const data = tsDoc.data();
        const subjectId = data.subjectId;
        const subjectDoc = await getDoc(doc(db, "subjects", subjectId));
        if (subjectDoc.exists()) {
          subjectsList.push({ id: subjectDoc.id, ...subjectDoc.data() } as Subject);
        }
      }
      
      setMySubjects(subjectsList);
      if (subjectsList.length > 0 && !selectedSubject) {
        setSelectedSubject(subjectsList[0]);
      }
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  }, [user?.uid, selectedSubject]);

  // Fetch students based on role
  const fetchStudents = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      let studentsList: Student[] = [];
      
      if (userRole === "hod") {
        // HOD - fetch students by selected semester
        if (selectedSemester) {
          const studentsQuery = query(
            collection(db, "students"),
            where("semester", "==", selectedSemester)
          );
          const studentsSnap = await getDocs(studentsQuery);
          studentsList = studentsSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.data().Name || "",
            rollNumber: doc.data().rollNumber || doc.data().rollNo || "",
            semester: doc.data().semester || "",
            department: doc.data().department || "",
          })) as Student[];
        }
      } else {
        // Teacher/Class Teacher - fetch students from their department
        const studentsQuery = query(
          collection(db, "students"),
          where("department", "==", userDepartment)
        );
        const studentsSnap = await getDocs(studentsQuery);
        studentsList = studentsSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.data().Name || "",
          rollNumber: doc.data().rollNumber || doc.data().rollNo || "",
          semester: doc.data().semester || "",
          department: doc.data().department || "",
        })) as Student[];
      }
      
      setStudents(studentsList);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  }, [userRole, selectedSemester, userDepartment, user?.uid]);

  // Fetch attendance summary
  const fetchAttendanceSummary = useCallback(async () => {
    if (!selectedSubject) return;
    
    try {
      const q = query(
        collection(db, "attendance"),
        where("subjectId", "==", selectedSubject.id)
      );
      const snap = await getDocs(q);
      const records = snap.docs.map((d) => d.data());
      
      const summary: any = {};
      students.forEach((student) => {
        const studentRecords = records.filter((r: any) => r.studentId === student.id);
        const present = studentRecords.filter((r: any) => r.status === "present").length;
        const total = studentRecords.length;
        summary[student.id] = { 
          present, 
          total, 
          percentage: total === 0 ? 0 : Math.round((present / total) * 100) 
        };
      });
      setAttendanceSummary(summary);
    } catch (err) {
      console.error("Error fetching summary:", err);
    }
  }, [selectedSubject, students]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchUserInfo();
      setLoading(false);
    };
    load();
  }, [fetchUserInfo]);

  useEffect(() => {
    if (userRole === "hod") {
      fetchAvailableSemesters();
    }
    fetchMySubjects();
  }, [userRole, fetchAvailableSemesters, fetchMySubjects]);

  useEffect(() => {
    if (userRole) {
      fetchStudents();
    }
  }, [fetchStudents, userRole, selectedSemester]);

  useEffect(() => {
    if (selectedSubject) {
      fetchAttendanceSummary();
    }
  }, [selectedSubject, fetchAttendanceSummary]);

  const markAttendance = (studentId: string, status: "present" | "absent") => {
    setAttendanceSelections((prev: any) => ({ ...prev, [studentId]: status }));
  };

  const submitAttendance = async () => {
    if (!selectedSubject) {
      Alert.alert("Error", "Select a subject first");
      return;
    }
    if (Object.keys(attendanceSelections).length === 0) {
      Alert.alert("Error", "Mark attendance for at least one student");
      return;
    }

    setSubmitting(true);
    const date = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString();

    try {
      const batch = writeBatch(db);
      const todayQuery = query(
        collection(db, "attendance"),
        where("subjectId", "==", selectedSubject.id),
        where("date", "==", date)
      );
      const todaySnap = await getDocs(todayQuery);
      const existing: any = {};
      todaySnap.forEach((docSnap) => {
        existing[docSnap.data().studentId] = docSnap.id;
      });

      for (const [studentId, status] of Object.entries(attendanceSelections)) {
        const student = students.find((s) => s.id === studentId);
        if (!student) continue;
        
        if (existing[studentId]) {
          batch.update(doc(db, "attendance", existing[studentId]), {
            status,
            markedBy: user?.uid,
            markedAt: timestamp,
          });
        } else {
          batch.set(doc(collection(db, "attendance")), {
            studentId,
            studentName: student.name,
            subjectId: selectedSubject.id,
            subjectName: selectedSubject.name,
            date,
            status,
            markedBy: user?.uid,
            markedAt: timestamp,
          });
        }
      }
      await batch.commit();
      Alert.alert("Success", `Attendance saved for ${Object.keys(attendanceSelections).length} students ✅`);
      setAttendanceSelections({});
      setShowAttendanceMarking(false);
      fetchAttendanceSummary();
    } catch (err) {
      console.error("Error:", err);
      Alert.alert("Error", "Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[styles.title, { color: colors.textDark }]}>Attendance Management</Text>
        
        {/* Role Badge */}
        <View style={[styles.roleBadge, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name={userRole === "hod" ? "shield-outline" : "school-outline"} size={16} color={colors.primary} />
          <Text style={[styles.roleText, { color: colors.primary }]}>
            {userRole === "hod" ? "HOD - View & Mark Attendance" : 
             userRole === "class_teacher" ? "Class Teacher" : "Teacher"} | {userDepartment}
          </Text>
        </View>

        {/* HOD Semester Selector */}
        {userRole === "hod" && (
          <View style={styles.semesterSection}>
            <Text style={[styles.sectionLabel, { color: colors.textDark }]}>Select Semester</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semesterScroll}>
              {availableSemesters.map(sem => (
                <TouchableOpacity
                  key={sem}
                  style={[
                    styles.semesterChip,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    selectedSemester === sem && styles.activeSemesterChip
                  ]}
                  onPress={() => setSelectedSemester(sem)}
                >
                  <Text style={[
                    styles.semesterChipText,
                    { color: colors.textDark },
                    selectedSemester === sem && styles.activeSemesterText
                  ]}>
                    Semester {sem}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Students Count */}
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textDark }]}>
                Total Students: {students.length}
              </Text>
            </View>
          </View>
        )}

        {/* My Subjects Section */}
        <View style={styles.subjectsSection}>
          <Text style={[styles.sectionLabel, { color: colors.textDark }]}>
            {userRole === "hod" ? "Subjects I Teach" : "My Subjects"}
          </Text>
          
          {mySubjects.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="book-outline" size={32} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                No subjects assigned yet
              </Text>
              <Text style={[styles.emptySubText, { color: colors.textLight }]}>
                Contact HOD to assign subjects
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectsScroll}>
              {mySubjects.map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.subjectCard,
                    { backgroundColor: colors.card },
                    selectedSubject?.id === subject.id && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => {
                    setSelectedSubject(subject);
                    setShowAttendanceMarking(false);
                    setAttendanceSelections({});
                  }}
                >
                  <Text style={[
                    styles.subjectName,
                    { color: selectedSubject?.id === subject.id ? "#fff" : colors.textDark }
                  ]}>
                    {subject.name}
                  </Text>
                  <Text style={[
                    styles.subjectMeta,
                    { color: selectedSubject?.id === subject.id ? "#fff" : colors.textLight }
                  ]}>
                    Sem {subject.semester} • {subject.credits} credits
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Mark Attendance Button */}
        {selectedSubject && mySubjects.length > 0 && (
          <TouchableOpacity 
            style={[styles.markButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAttendanceMarking(!showAttendanceMarking)}
          >
            <Ionicons name="checkbox-outline" size={24} color="#fff" />
            <Text style={styles.markButtonText}>
              {showAttendanceMarking ? "Hide Attendance Marking" : "Mark Attendance"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Attendance Marking Section */}
        {showAttendanceMarking && selectedSubject && (
          <View style={styles.markingSection}>
            <View style={styles.markingHeader}>
              <Text style={[styles.markingTitle, { color: colors.textDark }]}>
                Mark Attendance for {selectedSubject.name}
              </Text>
              <Text style={[styles.markingDate, { color: colors.textLight }]}>Date: {todayDate}</Text>
            </View>
            
            {students.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No students found</Text>
              </View>
            ) : (
              students.map((student) => {
                const isSelected = attendanceSelections[student.id];
                return (
                  <View key={student.id} style={[styles.studentRow, { backgroundColor: colors.card }]}>
                    <View style={styles.studentInfo}>
                      <Text style={[styles.studentName, { color: colors.textDark }]}>{student.name}</Text>
                      <Text style={[styles.studentDetail, { color: colors.textLight }]}>
                        Roll: {student.rollNumber} | Sem: {student.semester}
                      </Text>
                    </View>
                    <View style={styles.attendanceButtons}>
                      <TouchableOpacity
                        style={[styles.presentBtn, isSelected === "present" && styles.activePresentBtn]}
                        onPress={() => markAttendance(student.id, "present")}
                      >
                        <Text style={[styles.btnText, isSelected === "present" && styles.activeBtnText]}>P</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.absentBtn, isSelected === "absent" && styles.activeAbsentBtn]}
                        onPress={() => markAttendance(student.id, "absent")}
                      >
                        <Text style={[styles.btnText, isSelected === "absent" && styles.activeBtnText]}>A</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
            
            {Object.keys(attendanceSelections).length > 0 && (
              <TouchableOpacity style={styles.submitBtn} onPress={submitAttendance} disabled={submitting}>
                <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.submitGradient}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={20} color="#fff" />
                      <Text style={styles.submitText}>Submit Attendance ({Object.keys(attendanceSelections).length} students)</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Attendance Summary Section */}
        {selectedSubject && mySubjects.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={[styles.sectionLabel, { color: colors.textDark }]}>
              Attendance Summary - {selectedSubject.name}
            </Text>
            
            {students.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No data available</Text>
              </View>
            ) : (
              students.map((student) => {
                const summary = attendanceSummary[student.id] || { present: 0, total: 0, percentage: 0 };
                const percentColor = summary.percentage >= 75 ? "#4CAF50" : summary.percentage >= 60 ? "#FF9800" : "#F44336";
                
                return (
                  <View key={student.id} style={[styles.summaryRow, { backgroundColor: colors.card }]}>
                    <View style={styles.summaryInfo}>
                      <Text style={[styles.studentName, { color: colors.textDark }]}>{student.name}</Text>
                      <Text style={[styles.studentDetail, { color: colors.textLight }]}>
                        Roll: {student.rollNumber}
                      </Text>
                    </View>
                    <View style={styles.summaryStats}>
                      <Text style={[styles.summaryText, { color: colors.textDark }]}>
                        {summary.present}/{summary.total}
                      </Text>
                      <View style={[styles.percentageBadge, { backgroundColor: percentColor + "20" }]}>
                        <Text style={[styles.percentageText, { color: percentColor }]}>
                          {summary.percentage}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  
  roleBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15, gap: 6 },
  roleText: { fontSize: 12, fontWeight: "600" },
  
  semesterSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  semesterScroll: { flexDirection: "row" },
  semesterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  activeSemesterChip: { backgroundColor: "#7384bf", borderColor: "#7384bf" },
  semesterChipText: { fontSize: 14 },
  activeSemesterText: { color: "#fff" },
  
  infoCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, marginTop: 10, gap: 10 },
  infoText: { fontSize: 14, fontWeight: "500" },
  
  subjectsSection: { marginBottom: 20 },
  subjectsScroll: { flexDirection: "row" },
  subjectCard: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginRight: 10, minWidth: 120 },
  subjectName: { fontSize: 14, fontWeight: "600" },
  subjectMeta: { fontSize: 10, marginTop: 4 },
  
  markButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 12, gap: 8, marginBottom: 20 },
  markButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  
  markingSection: { marginBottom: 20 },
  markingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  markingTitle: { fontSize: 16, fontWeight: "600" },
  markingDate: { fontSize: 12 },
  
  studentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 8 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 14, fontWeight: "600" },
  studentDetail: { fontSize: 11, marginTop: 2 },
  
  attendanceButtons: { flexDirection: "row", gap: 8 },
  presentBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E8F5E9", justifyContent: "center", alignItems: "center" },
  absentBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFEBEE", justifyContent: "center", alignItems: "center" },
  activePresentBtn: { backgroundColor: "#4CAF50" },
  activeAbsentBtn: { backgroundColor: "#F44336" },
  btnText: { fontSize: 18, fontWeight: "bold", color: "#4CAF50" },
  activeBtnText: { color: "#fff" },
  
  submitBtn: { marginTop: 15, borderRadius: 10, overflow: "hidden" },
  submitGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  
  summarySection: { marginBottom: 30 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 8 },
  summaryInfo: { flex: 1 },
  summaryStats: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryText: { fontSize: 14 },
  percentageBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  percentageText: { fontSize: 12, fontWeight: "bold" },
  
  emptyCard: { padding: 30, borderRadius: 12, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, textAlign: "center" },
  emptySubText: { fontSize: 12, textAlign: "center" },
});