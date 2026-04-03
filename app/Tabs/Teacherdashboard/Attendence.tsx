import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
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
import { db } from "../../../config/firebaseConfig";
import { useAuth } from "../../../context/AuthContext";

// ... rest of your interfaces and component code (unchanged) ...
// (keep all the component logic exactly as you had it, only the imports above are corrected)
interface Student {
  id: string;
  Name: string;
  semester: string;
  rollNo: string;
  department?: string;
  email?: string;
}

interface Subject {
  id: string;
  subjectId: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
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
  markedAt: string;
}

const AttendancePage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Role detection
  const isHOD = user?.role === "hod";
  const isClassTeacher = user?.role === "class_teacher";
  const isTeacher = user?.role === "teacher";

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignedSubjectId, setAssignedSubjectId] = useState<string | null>(null);
  const [assignedClassSemester, setAssignedClassSemester] = useState<string | null>(null);

  // Mode: "mark", "view", "percentage"
  const [mode, setMode] = useState<"mark" | "view" | "percentage">("mark");

  // Semester filter (only for HOD or Class Teacher)
  const [selectedSemester, setSelectedSemester] = useState("All");
  const semesters = ["1th", "2th", "3th", "4th", "5th", "6th"];

  // Attendance marking state
  const [attendanceSelections, setAttendanceSelections] = useState<{ [studentId: string]: "present" | "absent" }>({});
  const [submitting, setSubmitting] = useState(false);

  // Attendance view modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);

  // Attendance summary (present/total per student for selected subject)
  const [attendanceSummary, setAttendanceSummary] = useState<{ [studentId: string]: { present: number; total: number } }>({});

  // --------------------------
  // Fetch assigned class for Class Teacher
  // --------------------------
  const fetchAssignedClass = useCallback(async () => {
    if (!isClassTeacher || !user?.uid) return null;
    try {
      const q = query(collection(db, "classTeachers"), where("teacherId", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setAssignedClassSemester(data.semester);
        return data.semester;
      }
    } catch (error) {
      console.error("Error fetching assigned class:", error);
    }
    return null;
  }, [isClassTeacher, user?.uid]);

  // --------------------------
  // Fetch subjects based on role
  // --------------------------
  const fetchSubjects = useCallback(async () => {
    if (!user) return [];
    try {
      if (isHOD) {
        // HOD sees all subjects in department
        const q = query(collection(db, "subjects"), where("department", "==", user.department));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...((d.data() ?? {}) as Record<string, unknown>) } as Subject));
      } else {
        // Teacher or Class Teacher: fetch assigned subjects from teacherSubjects
        const q = query(collection(db, "teacherSubjects"), where("teacherId", "==", user.uid));
        const snap = await getDocs(q);
        const subjectIds = snap.docs.map((d) => d.data().subjectId);
        if (subjectIds.length === 0) return [];
        // Store the first assigned subject ID (for Class Teacher marking restriction)
        if (isClassTeacher && subjectIds.length > 0) {
          setAssignedSubjectId(subjectIds[0]);
        }
        const subjectsSnap = await getDocs(collection(db, "subjects"));
        const allSubjects = subjectsSnap.docs.map((d) => ({ id: d.id, ...((d.data() ?? {}) as Record<string, unknown>) } as Subject));
        return allSubjects.filter((s) => subjectIds.includes(s.id));
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
      return [];
    }
  }, [user, isHOD, isClassTeacher]);

  // --------------------------
  // Fetch students
  // --------------------------
  const fetchStudents = useCallback(async () => {
    if (!user) return [];
    try {
      let studentsQuery;
      if (isHOD) {
        studentsQuery = query(collection(db, "students"), where("department", "==", user.department));
      } else if (isClassTeacher && assignedClassSemester) {
        // Class Teacher: only students of their assigned class (same semester & department)
        studentsQuery = query(
          collection(db, "students"),
          where("semester", "==", assignedClassSemester),
          where("department", "==", user.department)
        );
      } else {
        // Regular Teacher: all students in department (or all if HOD already handled)
        studentsQuery = collection(db, "students");
      }
      const snap = await getDocs(studentsQuery);
      return snap.docs.map((d) => ({ id: d.id, ...((d.data() ?? {}) as Record<string, unknown>) } as Student));
    } catch (error) {
      console.error("Error fetching students:", error);
      return [];
    }
  }, [user, isHOD, isClassTeacher, assignedClassSemester]);

  const fetchAttendanceForStudent = async (studentId: string, subjectId: string) => {
    try {
      const q = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId),
        where("subjectId", "==", subjectId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...((d.data() ?? {}) as Record<string, unknown>) } as AttendanceRecord));
    } catch (error) {
      console.error("Error fetching attendance for student:", error);
      return [];
    }
  };

  const fetchAttendanceSummary = useCallback(async () => {
    if (!selectedSubject) return;
    try {
      const summaries: { [studentId: string]: { present: number; total: number } } = {};
      for (const student of filteredStudents) {
        const records = await fetchAttendanceForStudent(student.id, selectedSubject.id);
        const present = records.filter((r) => r.status === "present").length;
        const total = records.length;
        summaries[student.id] = { present, total };
      }
      setAttendanceSummary(summaries);
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
    }
  }, [selectedSubject, filteredStudents]);

  const filterStudentsBySemester = (data: Student[], semester: string) => {
    const filtered = data.filter((s) => (semester === "All" ? true : String(s.semester) === semester));
    setFilteredStudents(filtered);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // For class teacher, first get assigned class
      if (isClassTeacher) {
        await fetchAssignedClass();
      }
      const [subjectsList, studentsList] = await Promise.all([fetchSubjects(), fetchStudents()]);
      setSubjects(subjectsList);
      setStudents(studentsList);
      if (subjectsList.length > 0 && !selectedSubject) {
        setSelectedSubject(subjectsList[0]);
      }
      // For HOD or Class Teacher, allow semester filter; for teacher, filter is fixed by class or all
      if (isHOD || isClassTeacher) {
        filterStudentsBySemester(studentsList, selectedSemester);
      } else {
        setFilteredStudents(studentsList);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchSubjects, fetchStudents, selectedSemester, selectedSubject, isHOD, isClassTeacher, fetchAssignedClass]);

  useEffect(() => {
    if (user && !authLoading) {
      loadData();
    }
  }, [user, authLoading, loadData]);

  // Fetch attendance summary when selected subject or filtered students change
  useEffect(() => {
    if (selectedSubject && filteredStudents.length > 0) {
      fetchAttendanceSummary();
    }
  }, [selectedSubject, filteredStudents, fetchAttendanceSummary]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSemesterChange = (semester: string) => {
    setSelectedSemester(semester);
    filterStudentsBySemester(students, semester);
  };

  // --------------------------
  // Check if user can mark attendance for the selected subject
  // --------------------------
  const canMarkAttendance = () => {
    if (!selectedSubject) return false;
    if (isHOD) {
      // HOD can only mark if the subject is assigned to them (via teacherSubjects)
      // Since HOD might not be assigned, we check if selectedSubject.id === assignedSubjectId
      // But we haven't stored assignedSubjectId for HOD. Let's fetch it or assume HOD can mark any subject?
      // According to requirement: HOD marks own subject. So HOD must have an entry in teacherSubjects.
      // We'll fetch assignedSubjectId for HOD similarly.
      return assignedSubjectId === selectedSubject.id;
    } else if (isClassTeacher) {
      // Class Teacher can only mark the single assigned subject
      return assignedSubjectId === selectedSubject.id;
    } else {
      // Regular Teacher: can mark any of their assigned subjects (already filtered in subject list)
      return true;
    }
  };

  // For HOD, we need to also fetch assigned subjects (teacherSubjects) to know which subject they can mark
  const fetchAssignedSubjectId = useCallback(async () => {
    if (!user?.uid) return null;
    try {
      const q = query(collection(db, "teacherSubjects"), where("teacherId", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const subjectId = snap.docs[0].data().subjectId;
        setAssignedSubjectId(subjectId);
        return subjectId;
      }
    } catch (error) {
      console.error("Error fetching assigned subject:", error);
    }
    return null;
  }, [user?.uid]);

 useEffect(() => {
  if (user && (isHOD || isClassTeacher)) {
    fetchAssignedSubjectId();
  }
}, [user, isHOD, isClassTeacher, fetchAssignedSubjectId]);

  // --------------------------
  // Attendance marking logic (same as before)
  // --------------------------
  const markAttendance = (studentId: string, status: "present" | "absent") => {
    if (!canMarkAttendance()) {
      Alert.alert("Access Denied", "You can only mark attendance for your assigned subject.");
      return;
    }
    setAttendanceSelections((prev) => ({ ...prev, [studentId]: status }));
  };

  const submitAttendance = async () => {
    if (!selectedSubject) {
      Alert.alert("No Subject", "Please select a subject first.");
      return;
    }
    if (!canMarkAttendance()) {
      Alert.alert("Access Denied", "You are not allowed to mark attendance for this subject.");
      return;
    }
    if (Object.keys(attendanceSelections).length === 0) {
      Alert.alert("No Selection", "Please mark attendance for at least one student.");
      return;
    }
    setSubmitting(true);
    const date = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString();

    try {
      const batch = writeBatch(db);
      for (const [studentId, status] of Object.entries(attendanceSelections)) {
        const student = students.find((s) => s.id === studentId);
        if (!student) continue;
        const existingQuery = query(
          collection(db, "attendance"),
          where("studentId", "==", studentId),
          where("subjectId", "==", selectedSubject.id),
          where("date", "==", date)
        );
        const existingSnap = await getDocs(existingQuery);
        if (!existingSnap.empty) {
          const existingDoc = existingSnap.docs[0];
          batch.update(doc(db, "attendance", existingDoc.id), {
            status,
            markedBy: user?.uid,
            markedAt: timestamp,
          });
        } else {
          const newRecord = {
            studentId,
            studentName: student.Name,
            subjectId: selectedSubject.id,
            subjectName: selectedSubject.name,
            date,
            status,
            markedBy: user?.uid || "unknown",
            markedAt: timestamp,
          };
          batch.set(doc(collection(db, "attendance")), newRecord);
        }
      }
      await batch.commit();
      Alert.alert("Success", `Attendance marked for ${Object.keys(attendanceSelections).length} students`);
      setAttendanceSelections({});
      await fetchAttendanceSummary();
    } catch (error) {
      console.error("Error submitting attendance:", error);
      Alert.alert("Error", "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------
  // View / Edit / Delete (same as before)
  // --------------------------
  const viewAttendanceHistory = async (student: Student) => {
    if (!selectedSubject) return;
    const records = await fetchAttendanceForStudent(student.id, selectedSubject.id);
    setAttendanceHistory(records.sort((a, b) => b.date.localeCompare(a.date)));
    setSelectedStudent(student);
    setModalVisible(true);
    setEditMode(false);
  };

  const editRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditMode(true);
  };

  const updateAttendanceRecord = async (newStatus: "present" | "absent") => {
    if (!editingRecord || !editingRecord.id) return;
    try {
      const recordRef = doc(db, "attendance", editingRecord.id);
      await updateDoc(recordRef, {
        status: newStatus,
        markedBy: user?.uid,
        markedAt: new Date().toISOString(),
      });
      Alert.alert("Success", "Attendance record updated");
      if (selectedStudent && selectedSubject) {
        const updatedRecords = await fetchAttendanceForStudent(selectedStudent.id, selectedSubject.id);
        setAttendanceHistory(updatedRecords.sort((a, b) => b.date.localeCompare(a.date)));
      }
      await fetchAttendanceSummary();
      setEditMode(false);
      setEditingRecord(null);
    } catch (error) {
      console.error("Error updating record:", error);
      Alert.alert("Error", "Failed to update record");
    }
  };

  const deleteAttendanceRecord = async (recordId: string) => {
    Alert.alert(
      "Delete Record",
      "Are you sure? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "attendance", recordId));
              Alert.alert("Deleted", "Record removed");
              if (selectedStudent && selectedSubject) {
                const updatedRecords = await fetchAttendanceForStudent(selectedStudent.id, selectedSubject.id);
                setAttendanceHistory(updatedRecords.sort((a, b) => b.date.localeCompare(a.date)));
              }
              await fetchAttendanceSummary();
              if (attendanceHistory.length === 1) setModalVisible(false);
            } catch (error) {
              console.error("Error deleting record:", error);
              Alert.alert("Error", "Failed to delete");
            }
          },
        },
      ]
    );
  };

  // Statistics
  const getSubjectStats = () => {
    if (!selectedSubject) return { totalStudents: 0, avgAttendance: 0, lowAttendanceCount: 0 };
    const total = filteredStudents.length;
    let totalPercentage = 0;
    let lowCount = 0;
    filteredStudents.forEach((student) => {
      const summary = attendanceSummary[student.id];
      if (summary) {
        const percentage = summary.total === 0 ? 0 : (summary.present / summary.total) * 100;
        totalPercentage += percentage;
        if (percentage < 75) lowCount++;
      }
    });
    const avg = total === 0 ? 0 : Math.round(totalPercentage / total);
    return { totalStudents: total, avgAttendance: avg, lowAttendanceCount: lowCount };
  };

  const stats = getSubjectStats();

  // Render student card (same as before)
  const renderStudentCard = ({ item }: { item: Student }) => {
    const summary = attendanceSummary[item.id] || { present: 0, total: 0 };
    const percentage = summary.total === 0 ? 0 : (summary.present / summary.total) * 100;
    const isMarked = attendanceSelections[item.id];
    const disableMarking = !canMarkAttendance();

    return (
      <LinearGradient colors={["#fff", "#f8f9fa"]} style={styles.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.cardHeader}>
          <View style={styles.studentInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{item.Name.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.studentName}>{item.Name}</Text>
              <Text style={styles.studentDetails}>
                Roll No: {item.rollNo} | Sem {item.semester}
              </Text>
            </View>
          </View>
          {mode !== "mark" && (
            <TouchableOpacity onPress={() => viewAttendanceHistory(item)} style={styles.historyButton}>
              <Ionicons name="time-outline" size={20} color="#7384bf" />
            </TouchableOpacity>
          )}
        </View>

        {mode === "view" && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(percentage)}%</Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary.present}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{summary.total}</Text>
              <Text style={styles.statLabel}>Total Classes</Text>
            </View>
          </View>
        )}

        {mode === "percentage" && (
          <View style={styles.percentageContainer}>
            <View style={styles.percentageBar}>
              <View
                style={[
                  styles.percentageFill,
                  {
                    width: `${percentage}%`,
                    backgroundColor: percentage >= 75 ? "#4CAF50" : percentage >= 60 ? "#FF9800" : "#F44336",
                  },
                ]}
              />
            </View>
            <View style={styles.percentageInfo}>
              <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
              <Text
                style={[
                  styles.attendanceStatus,
                  percentage >= 75 ? styles.good : percentage >= 60 ? styles.warning : styles.poor,
                ]}
              >
                {percentage >= 75 ? "Good" : percentage >= 60 ? "Average" : "Poor"}
              </Text>
            </View>
            {percentage < 75 && <Text style={styles.warningText}>⚠ Low attendance - needs improvement</Text>}
          </View>
        )}

        {mode === "mark" && (
          <View style={styles.markButtons}>
            <TouchableOpacity
              style={[styles.markButton, styles.presentButton, isMarked === "present" && styles.selectedButton, disableMarking && styles.disabledButton]}
              onPress={() => markAttendance(item.id, "present")}
              disabled={disableMarking}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.markButtonText}>Present</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.markButton, styles.absentButton, isMarked === "absent" && styles.selectedButton, disableMarking && styles.disabledButton]}
              onPress={() => markAttendance(item.id, "absent")}
              disabled={disableMarking}
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.markButtonText}>Absent</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    );
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7384bf" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (subjects.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={["#7384bf", "#0c69ff"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Attendance</Text>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No subjects available</Text>
          {isHOD && <Text style={styles.emptySubtext}>Please add subjects first in {"Assign Subjects"}</Text>}
          {(isTeacher || isClassTeacher) && <Text style={styles.emptySubtext}>No subjects assigned to you. Contact HOD.</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#7384bf", "#0c69ff"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>📊 Attendance Management</Text>
            <Text style={styles.headerSubtitle}>
              {isHOD ? "HOD View" : isClassTeacher ? "Class Teacher View" : "Teacher View"} • {selectedSubject?.name || "Select Subject"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Subject Selector */}
        <View style={styles.subjectSelector}>
          <Text style={styles.sectionTitle}>Select Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {subjects.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={[styles.subjectChip, selectedSubject?.id === sub.id && styles.selectedSubjectChip]}
                onPress={() => setSelectedSubject(sub)}
              >
                <Text style={[styles.subjectChipText, selectedSubject?.id === sub.id && styles.selectedSubjectChipText]}>
                  {sub.name} (Sem {sub.semester})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {selectedSubject && (
          <>
            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[styles.modeButton, mode === "mark" && styles.activeMode]}
                onPress={() => setMode("mark")}
              >
                <Ionicons name="create-outline" size={24} color={mode === "mark" ? "#fff" : "#7384bf"} />
                <Text style={[styles.modeText, mode === "mark" && styles.activeModeText]}>Mark</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === "view" && styles.activeMode]}
                onPress={() => setMode("view")}
              >
                <Ionicons name="eye-outline" size={24} color={mode === "view" ? "#fff" : "#7384bf"} />
                <Text style={[styles.modeText, mode === "view" && styles.activeModeText]}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === "percentage" && styles.activeMode]}
                onPress={() => setMode("percentage")}
              >
                <Ionicons name="stats-chart-outline" size={24} color={mode === "percentage" ? "#fff" : "#7384bf"} />
                <Text style={[styles.modeText, mode === "percentage" && styles.activeModeText]}>Percentage</Text>
              </TouchableOpacity>
            </View>

            {/* Semester filter - only for HOD and Class Teacher */}
            {(isHOD || isClassTeacher) && (
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Filter by Semester</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.semesterScroll}>
                  <TouchableOpacity
                    style={[styles.semesterButton, selectedSemester === "All" && styles.selectedSemester]}
                    onPress={() => handleSemesterChange("All")}
                  >
                    <Text style={[styles.semesterText, selectedSemester === "All" && styles.selectedSemesterText]}>All</Text>
                  </TouchableOpacity>
                  {semesters.map((sem) => (
                    <TouchableOpacity
                      key={sem}
                      style={[styles.semesterButton, selectedSemester === sem && styles.selectedSemester]}
                      onPress={() => handleSemesterChange(sem)}
                    >
                      <Text style={[styles.semesterText, selectedSemester === sem && styles.selectedSemesterText]}>
                        Sem {sem}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statCardValue}>{stats.totalStudents}</Text>
                <Text style={styles.statCardLabel}>Students</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statCardValue}>{stats.avgAttendance}%</Text>
                <Text style={styles.statCardLabel}>Avg Attendance</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statCardValue, { color: "#F44336" }]}>{stats.lowAttendanceCount}</Text>
                <Text style={styles.statCardLabel}>Below 75%</Text>
              </View>
            </View>

            {/* Show warning if Class Teacher tries to mark non-assigned subject */}
            {mode === "mark" && isClassTeacher && assignedSubjectId !== selectedSubject.id && (
              <View style={styles.warningContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF9800" />
                <Text style={styles.warningText}>You can only mark attendance for your assigned subject: {subjects.find(s => s.id === assignedSubjectId)?.name || "Unknown"}</Text>
              </View>
            )}
            {mode === "mark" && isHOD && assignedSubjectId !== selectedSubject.id && (
              <View style={styles.warningContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF9800" />
                <Text style={styles.warningText}>You can only mark attendance for subjects assigned to you. Contact admin if you need to mark this subject.</Text>
              </View>
            )}

            {filteredStudents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredStudents}
                renderItem={renderStudentCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContainer}
              />
            )}

            {mode === "mark" && Object.keys(attendanceSelections).length > 0 && canMarkAttendance() && (
              <TouchableOpacity style={styles.submitButton} onPress={submitAttendance} disabled={submitting}>
                <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.submitGradient}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={24} color="white" />
                      <Text style={styles.submitText}>Submit ({Object.keys(attendanceSelections).length})</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Attendance History Modal (unchanged) */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={["#7384bf", "#0c69ff"]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editMode ? "Edit Attendance" : "Attendance History"}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setEditMode(false);
                  setEditingRecord(null);
                }}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>
            {selectedStudent && (
              <View style={styles.modalBody}>
                <Text style={styles.modalStudentName}>{selectedStudent.Name}</Text>
                <Text style={styles.modalStudentDetails}>
                  Roll: {selectedStudent.rollNo} | Sem {selectedStudent.semester} | Subject: {selectedSubject?.name}
                </Text>
                {editMode && editingRecord ? (
                  <View>
                    <Text style={styles.editTitle}>Date: {editingRecord.date}</Text>
                    <View style={styles.editButtonsRow}>
                      <TouchableOpacity
                        style={[styles.editStatusButton, styles.presentButton]}
                        onPress={() => updateAttendanceRecord("present")}
                      >
                        <Ionicons name="checkmark-circle" size={24} color="white" />
                        <Text style={styles.editButtonText}>Present</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editStatusButton, styles.absentButton]}
                        onPress={() => updateAttendanceRecord("absent")}
                      >
                        <Ionicons name="close-circle" size={24} color="white" />
                        <Text style={styles.editButtonText}>Absent</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setEditMode(false)}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {attendanceHistory.length === 0 ? (
                      <Text style={styles.noHistoryText}>No attendance records found</Text>
                    ) : (
                      attendanceHistory.map((record) => (
                        <View key={record.id} style={styles.historyItem}>
                          <View style={styles.historyDate}>
                            <Ionicons name="calendar-outline" size={16} color="#666" />
                            <Text style={styles.historyDateText}>{record.date}</Text>
                          </View>
                          <View
                            style={[
                              styles.historyStatus,
                              { backgroundColor: record.status === "present" ? "#4CAF50" : "#F44336" },
                            ]}
                          >
                            <Text style={styles.historyStatusText}>{record.status.toUpperCase()}</Text>
                          </View>
                          <View style={styles.historyActions}>
                            <TouchableOpacity onPress={() => editRecord(record)} style={styles.actionButton}>
                              <Ionicons name="create-outline" size={20} color="#7384bf" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteAttendanceRecord(record.id!)} style={styles.actionButton}>
                              <Ionicons name="trash-outline" size={20} color="#F44336" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: "#7384bf" },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center" },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 5 },
  content: { flex: 1, padding: 15 },
  subjectSelector: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10, color: "#333" },
  subjectChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedSubjectChip: { backgroundColor: "#7384bf", borderColor: "#7384bf" },
  subjectChipText: { fontSize: 14, color: "#333" },
  selectedSubjectChipText: { color: "#fff", fontWeight: "600" },
  modeContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 5,
    marginBottom: 20,
    elevation: 3,
  },
  modeButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 12, gap: 8 },
  activeMode: { backgroundColor: "#7384bf" },
  modeText: { fontSize: 14, fontWeight: "600", color: "#7384bf" },
  activeModeText: { color: "#fff" },
  filterSection: { marginBottom: 20 },
  semesterScroll: { flexDirection: "row" },
  semesterButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", marginRight: 10, elevation: 2 },
  selectedSemester: { backgroundColor: "#7384bf" },
  semesterText: { fontSize: 14, color: "#666" },
  selectedSemesterText: { color: "#fff", fontWeight: "600" },
  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, gap: 10 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 15, alignItems: "center", elevation: 2 },
  statCardValue: { fontSize: 24, fontWeight: "bold", color: "#7384bf" },
  statCardLabel: { fontSize: 12, color: "#666", marginTop: 5 },
  listContainer: { paddingBottom: 100 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  studentInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#7384bf", justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  studentName: { fontSize: 16, fontWeight: "bold", color: "#333" },
  studentDetails: { fontSize: 12, color: "#666", marginTop: 2 },
  historyButton: { padding: 8 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#7384bf" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 2 },
  percentageContainer: { marginTop: 10 },
  percentageBar: { height: 8, backgroundColor: "#f0f0f0", borderRadius: 4, overflow: "hidden" },
  percentageFill: { height: "100%", borderRadius: 4 },
  percentageInfo: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  percentageText: { fontSize: 14, fontWeight: "600", color: "#333" },
  attendanceStatus: { fontSize: 12, fontWeight: "600" },
  good: { color: "#4CAF50" },
  warning: { color: "#FF9800" },
  poor: { color: "#F44336" },
  markButtons: { flexDirection: "row", gap: 10, marginTop: 10 },
  markButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 8, gap: 8 },
  presentButton: { backgroundColor: "#4CAF50" },
  absentButton: { backgroundColor: "#F44336" },
  selectedButton: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabledButton: { opacity: 0.5 },
  markButtonText: { color: "#fff", fontWeight: "600" },
  submitButton: { position: "absolute", bottom: 20, right: 20, left: 20, borderRadius: 25, overflow: "hidden", elevation: 5 },
  submitGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 8 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  emptyText: { fontSize: 16, color: "#999", marginTop: 10 },
  emptySubtext: { fontSize: 12, color: "#ccc", marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalBody: { padding: 20 },
  modalStudentName: { fontSize: 18, fontWeight: "bold", color: "#333", marginBottom: 5 },
  modalStudentDetails: { fontSize: 14, color: "#666", marginBottom: 20 },
  historyItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  historyDate: { flexDirection: "row", alignItems: "center", gap: 8, flex: 2 },
  historyDateText: { fontSize: 14, color: "#666" },
  historyStatus: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, flex: 1, alignItems: "center" },
  historyStatusText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  historyActions: { flexDirection: "row", gap: 12, flex: 1, justifyContent: "flex-end" },
  actionButton: { padding: 5 },
  editTitle: { fontSize: 16, fontWeight: "600", marginBottom: 20, textAlign: "center" },
  editButtonsRow: { flexDirection: "row", gap: 15, marginBottom: 15 },
  editStatusButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 10, gap: 8 },
  editButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  cancelButton: { paddingVertical: 12, borderRadius: 10, backgroundColor: "#e0e0e0", alignItems: "center" },
  cancelButtonText: { color: "#666", fontSize: 14, fontWeight: "600" },
  noHistoryText: { textAlign: "center", color: "#999", marginTop: 20 },
  warningContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF3E0", padding: 10, borderRadius: 8, marginBottom: 15, gap: 8 },
  warningText: { fontSize: 12, color: "#FF9800", flex: 1 },
});

export default AttendancePage;