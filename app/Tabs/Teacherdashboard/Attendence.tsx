import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { db, auth } from "../../../config/firebaseConfig.native";
import { collection, getDocs, addDoc, query, where, doc, getDoc } from "firebase/firestore";
import { useTheme } from "../../../context/ThemeContext";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AttendanceScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [role, setRole] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSubjectCode, setSelectedSubjectCode] = useState("");
  const [selectedSubjectName, setSelectedSubjectName] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);

  const semesters = ["1", "2", "3", "4", "5", "6"];

  const fetchTeacherInfo = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const teacherDoc = await getDoc(doc(db, "teachers", user.uid));
      if (teacherDoc.exists()) {
        const teacherData = teacherDoc.data();
        setRole(teacherData.role || "teacher");
        setTeacherInfo(teacherData);
      }
    } catch (err) {
      const error = err as any;
      console.error("Error fetching teacher info:", error);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "students"));
      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        present: false,
      }));
      setStudents(list);
      setFilteredStudents(list);
    } catch (err) {
      const error = err as any;
      console.error("Error fetching students:", error);
    }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const teacherSubjectSnap = await getDocs(
        query(collection(db, "teacherSubjects"), where("teacherId", "==", user.uid))
      );
      if (!teacherSubjectSnap.empty) {
        const subjectList = teacherSubjectSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setSubjects(subjectList);
      } else {
        const subjectSnap = await getDocs(collection(db, "subjects"));
        const subjectList = subjectSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setSubjects(subjectList);
      }
    } catch (err) {
      const error = err as any;
      console.error("Error fetching subjects:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await fetchTeacherInfo();
    await fetchStudents();
    await fetchSubjects();
    setLoading(false);
  }, [fetchTeacherInfo, fetchStudents, fetchSubjects]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let filtered = [...students];

    if (role === "class_teacher") {
      if (teacherInfo?.assignedSemester) {
        filtered = filtered.filter((s) => String(s.semester) === String(teacherInfo.assignedSemester));
      }
      if (teacherInfo?.assignedDepartment) {
        filtered = filtered.filter((s) => s.department === teacherInfo.assignedDepartment);
      }
    }

    if (role === "hod" && selectedSemester) {
      filtered = filtered.filter((s) => String(s.semester) === selectedSemester);
    }

    setFilteredStudents(filtered);
  }, [students, selectedSemester, role, teacherInfo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    const subject = subjects.find((s) => s.id === subjectId || s.subjectId === subjectId);
    if (subject) {
      setSelectedSubjectCode(subject.subjectCode || "");
      setSelectedSubjectName(subject.subjectName || subject.name || "");
    }
  };

  const toggleAttendance = (id: string, value: boolean) => {
    setFilteredStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, present: value } : s))
    );
  };

  const saveAttendance = async () => {
    if (!selectedSubject) {
      Alert.alert("Error", "Please select a subject first");
      return;
    }
    if (filteredStudents.length === 0) {
      Alert.alert("Error", "No students to mark attendance for");
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "User not authenticated");
        setSaving(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      let savedCount = 0;

      for (const student of filteredStudents) {
        const status = student.present ? "present" : "absent";
        const studentName = student.name || student.Name || "Unknown";
        const studentBoardRollNo = student.boardRollNo || "";
        const studentRollNo = student.rollNo || "";

        await addDoc(collection(db, "attendance"), {
          studentId: studentBoardRollNo || studentRollNo || student.id,
          studentName: studentName,
          date: today,
          subjectCode: selectedSubjectCode,
          subjectName: selectedSubjectName,
          subjectId: selectedSubject,
          status: status,
          markedBy: user.uid,
          markedByName: teacherInfo?.name || "Teacher",
          markedAt: new Date().toISOString(),
          semester: student.semester || "",
          department: student.department || "",
        });
        savedCount++;
      }

      Alert.alert(
        "Success",
        "Attendance saved for " + savedCount + " students!",
        [{ text: "OK" }]
      );

      setFilteredStudents((prev) => prev.map((s) => ({ ...s, present: false })));
      setSelectedSubject("");
      setSelectedSubjectCode("");
      setSelectedSubjectName("");
    } catch (err) {
      const error = err as any;
      console.error("Save attendance error:", error);
      Alert.alert("Error", "Failed to save attendance: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    setFilteredStudents((prev) => prev.map((s) => ({ ...s, present: true })));
  };

  const markAllAbsent = () => {
    setFilteredStudents((prev) => prev.map((s) => ({ ...s, present: false })));
  };

  const getPresentCount = () => filteredStudents.filter((s) => s.present).length;
  const getAbsentCount = () => filteredStudents.filter((s) => !s.present).length;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Mark Attendance</Text>
              <Text style={styles.headerSubtitle}>
                {teacherInfo?.name || "Teacher"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="people-outline" size={20} color="#1976D2" />
            <Text style={[styles.statValue, { color: colors.textDark }]}>{filteredStudents.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
            <Text style={[styles.statValue, { color: "#4CAF50" }]}>{getPresentCount()}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Present</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="close-circle-outline" size={20} color="#F44336" />
            <Text style={[styles.statValue, { color: "#F44336" }]}>{getAbsentCount()}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Absent</Text>
          </View>
        </View>

        <View style={[styles.filterCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.filterTitle, { color: colors.textDark }]}>Filters</Text>

          {role === "hod" && (
            <>
              <Text style={[styles.label, { color: colors.textLight }]}>Semester</Text>
              <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Picker
                  selectedValue={selectedSemester}
                  onValueChange={setSelectedSemester}
                  dropdownIconColor={colors.textDark}
                >
                  <Picker.Item label="All Semesters" value="" />
                  {semesters.map((s) => (
                    <Picker.Item key={s} label={"Semester " + s} value={s} />
                  ))}
                </Picker>
              </View>
            </>
          )}

          <Text style={[styles.label, { color: colors.textLight }]}>Subject *</Text>
          <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Picker
              selectedValue={selectedSubject}
              onValueChange={handleSubjectSelect}
              dropdownIconColor={colors.textDark}
            >
              <Picker.Item label="Select Subject" value="" />
              {subjects.map((sub) => (
                <Picker.Item
                  key={sub.id}
                  label={(sub.subjectName || sub.name || "") + " (" + (sub.subjectCode || "") + ")"}
                  value={sub.id}
                />
              ))}
            </Picker>
          </View>

          {selectedSubject && filteredStudents.length > 0 && (
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickBtn} onPress={markAllPresent}>
                <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
                <Text style={{ color: "#4CAF50", fontSize: 12 }}>All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={markAllAbsent}>
                <Ionicons name="close" size={16} color="#F44336" />
                <Text style={{ color: "#F44336", fontSize: 12 }}>All Absent</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {selectedSubject ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
              Students ({filteredStudents.length})
            </Text>

            {filteredStudents.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
                <Ionicons name="people-outline" size={48} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No students found</Text>
              </View>
            ) : (
              filteredStudents.map((student, index) => (
                <View key={student.id} style={[styles.studentCard, { backgroundColor: colors.card }]}>
                  <View style={styles.studentInfo}>
                    <View style={[styles.studentNumber, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.studentNumberText, { color: colors.primary }]}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: colors.textDark }]}>
                        {student.name || student.Name || "Unknown"}
                      </Text>
                      <Text style={[styles.studentSub, { color: colors.textLight }]}>
                        Roll: {student.rollNo || "N/A"} | Sem: {student.semester}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[
                        styles.attendanceBtn,
                        student.present ? styles.presentActive : styles.presentInactive,
                      ]}
                      onPress={() => toggleAttendance(student.id, true)}
                    >
                      <Text style={[styles.attendanceBtnText, { color: student.present ? "#fff" : "#4CAF50" }]}>P</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.attendanceBtn,
                        !student.present ? styles.absentActive : styles.absentInactive,
                      ]}
                      onPress={() => toggleAttendance(student.id, false)}
                    >
                      <Text style={[styles.attendanceBtnText, { color: !student.present ? "#fff" : "#F44336" }]}>A</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, marginHorizontal: 15, marginTop: 20 }]}>
            <Ionicons name="book-outline" size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>Please select a subject first</Text>
          </View>
        )}

        {selectedSubject && filteredStudents.length > 0 && (
          <TouchableOpacity
            style={[styles.saveAttendanceBtn, saving && { opacity: 0.7 }]}
            onPress={saveAttendance}
            disabled={saving}
          >
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.saveGradient}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={22} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Attendance</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10 },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 2 },
  statsContainer: { flexDirection: "row", paddingHorizontal: 15, marginTop: 15, gap: 10 },
  statCard: {
    flex: 1, alignItems: "center", padding: 10, borderRadius: 12, gap: 2, elevation: 2,
  },
  statValue: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 10 },
  filterCard: { marginHorizontal: 15, marginTop: 15, padding: 15, borderRadius: 15, elevation: 2 },
  filterTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  label: { fontSize: 13, marginBottom: 4, marginTop: 8 },
  dropdown: { borderRadius: 10, overflow: "hidden", marginBottom: 8, borderWidth: 1 },
  quickActions: { flexDirection: "row", gap: 15, marginTop: 10, justifyContent: "center" },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8 },
  section: { marginHorizontal: 15, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  studentCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1,
  },
  studentInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  studentNumber: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: "center", alignItems: "center",
  },
  studentNumberText: { fontSize: 12, fontWeight: "bold" },
  studentName: { fontSize: 14, fontWeight: "600" },
  studentSub: { fontSize: 11, marginTop: 1 },
  btnRow: { flexDirection: "row", gap: 6 },
  attendanceBtn: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center", borderWidth: 2,
  },
  presentActive: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  presentInactive: { backgroundColor: "#E8F5E9", borderColor: "#C8E6C9" },
  absentActive: { backgroundColor: "#F44336", borderColor: "#F44336" },
  absentInactive: { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
  attendanceBtnText: { fontWeight: "bold", fontSize: 14 },
  emptyContainer: { alignItems: "center", padding: 30, borderRadius: 16 },
  emptyText: { fontSize: 14, marginTop: 8 },
  saveAttendanceBtn: { marginHorizontal: 20, marginTop: 25, borderRadius: 15, overflow: "hidden", elevation: 3 },
  saveGradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    padding: 16, gap: 10,
  },
  saveBtnText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
});