import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  increment,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../../config/firebaseConfig.native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../context/ThemeContext";

interface Student {
  id: string;
  name: string;
  semester?: string | number;
  department?: string;
  boardRollNo: string;
  email?: string;
  rollNo?: string;
  present: boolean;
}

interface Subject {
  id: string;
  name: string;
  subjectCode: string;
  subjectName?: string;
  semester?: number;
  department?: string;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [role, setRole] = useState("");
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  
  // Manual lecture number input
  const [lectureNoInput, setLectureNoInput] = useState("");
  const [showLectureInputModal, setShowLectureInputModal] = useState(false);
  const [lectureNo, setLectureNo] = useState<number | null>(null);

  const semesters = ["1", "2", "3", "4", "5", "6"];

  const fetchTeacherInfo = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const teacherDoc = await getDoc(doc(db, "teachers", user.uid));
      if (teacherDoc.exists()) {
        const data = teacherDoc.data();
        setRole(data.role || "teacher");
        setTeacherInfo(data);

        if (data.role === "class_teacher") {
          const ctQuery = query(
            collection(db, "classTeachers"),
            where("teacherId", "==", user.uid)
          );
          const ctSnap = await getDocs(ctQuery);
          if (!ctSnap.empty) {
            const ctData = ctSnap.docs[0].data();
            setSelectedSemester(ctData.semester?.toString() || "");
            setTeacherInfo((prev: any) => ({
              ...prev,
              assignedSemester: ctData.semester,
              assignedDepartment: ctData.department,
            }));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching teacher info:", err);
    }
  }, []);

  const fetchAssignedSubjects = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      let q;
      if (role === "hod") {
        q = query(collection(db, "subjects"));
      } else {
        q = query(
          collection(db, "teacherSubjects"),
          where("teacherId", "==", user.uid)
        );
      }

      const snap = await getDocs(q);
      const list: Subject[] = [];

      if (role === "hod") {
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Subject);
        });
      } else {
        for (const d of snap.docs) {
          const data = d.data();
          if (data.subjectId) {
            const subDoc = await getDoc(doc(db, "subjects", data.subjectId));
            if (subDoc.exists()) {
              list.push({ id: subDoc.id, ...subDoc.data() } as Subject);
            }
          }
        }
      }
      setAssignedSubjects(list);
    } catch (err) {
      console.error("Error fetching subjects:", err);
    }
  }, [role]);

  const fetchStudents = useCallback(async () => {
    if (!selectedSemester) {
      setStudents([]);
      return;
    }

    try {
      const snap = await getDocs(collection(db, "students"));
      const all = snap.docs.map(
        (d) =>
          ({
            id: d.id,
            ...d.data(),
            present: true,
          } as Student)
      );

      let filtered = all.filter(
        (s) => s.semester?.toString() === selectedSemester.toString()
      );

      if (role === "class_teacher" && teacherInfo?.assignedDepartment) {
        filtered = filtered.filter(
          (s) => s.department === teacherInfo.assignedDepartment
        );
      }

      setStudents(filtered);
    } catch (err) {
      console.error("Error fetching students:", err);
    }
  }, [selectedSemester, role, teacherInfo]);

  // Check if attendance already taken today for this subject
  const checkExistingAttendance = useCallback(async () => {
    if (!selectedSubject || !selectedSemester) return;

    try {
      const today = new Date().toISOString().split("T")[0];
      const tq = query(
        collection(db, "attendance"),
        where("subjectId", "==", selectedSubject.id),
        where("semester", "==", selectedSemester),
        where("date", "==", today)
      );
      const tsnap = await getDocs(tq);

      if (!tsnap.empty) {
        // Attendance already taken today
        const existingData = tsnap.docs[0].data();
        setLectureNo(existingData.lectureNo || null);
        setLectureNoInput(existingData.lectureNo?.toString() || "");

        // Load existing attendance status
        const absent = new Set<string>();
        tsnap.forEach((d) => {
          if (d.data().status === "absent") absent.add(d.data().studentId);
        });
        setStudents((prev) =>
          prev.map((s) => ({
            ...s,
            present: !absent.has(s.boardRollNo),
          }))
        );

        Alert.alert(
          "Attendance Already Taken",
          `Attendance for this subject was already taken today (Lecture #${existingData.lectureNo || "N/A"}). You can edit and re-save.`
        );
      } else {
        // No attendance today - reset lecture number
        setLectureNo(null);
        setLectureNoInput("");
      }
    } catch (err) {
      console.error("Error checking existing attendance:", err);
    }
  }, [selectedSubject, selectedSemester]);

  useEffect(() => {
    fetchTeacherInfo().then(() => setLoading(false));
  }, [fetchTeacherInfo]);

  useEffect(() => {
    if (teacherInfo) fetchAssignedSubjects();
  }, [teacherInfo, fetchAssignedSubjects]);

  useEffect(() => {
    if (selectedSemester) fetchStudents();
  }, [selectedSemester, fetchStudents]);

  useEffect(() => {
    if (selectedSubject && selectedSemester) {
      checkExistingAttendance();
    }
  }, [selectedSubject, selectedSemester, checkExistingAttendance]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStudents();
    if (selectedSubject) await checkExistingAttendance();
    setRefreshing(false);
  };

  const filteredStudents = useMemo(() => {
    let f = students;
    if (search) {
      f = f.filter(
        (s) =>
          s.name?.toLowerCase().includes(search.toLowerCase()) ||
          s.boardRollNo?.toLowerCase().includes(search.toLowerCase()) ||
          s.email?.toLowerCase().includes(search.toLowerCase())
      );
    }
    return f;
  }, [students, search]);

  const toggleAbsent = (boardRollNo: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.boardRollNo === boardRollNo ? { ...s, present: !s.present } : s
      )
    );
  };

  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, present: true })));
  };

  const markAllAbsent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, present: false })));
  };

  const presentCount = students.filter((s) => s.present).length;
  const absentCount = students.length - presentCount;

  // Open lecture number input modal
  const openLectureInputModal = () => {
    if (!lectureNoInput) {
      // Suggest next lecture number
      setLectureNoInput("");
    }
    setShowLectureInputModal(true);
  };

  // Confirm lecture number from modal
  const confirmLectureNo = () => {
    const num = parseInt(lectureNoInput.trim());
    if (isNaN(num) || num < 1) {
      Alert.alert("Error", "Please enter a valid positive lecture number");
      return;
    }
    setLectureNo(num);
    setShowLectureInputModal(false);
  };

  const saveAttendance = async () => {
    if (!selectedSemester || !selectedSubject || students.length === 0) {
      Alert.alert("Error", "Please select semester, subject and ensure students are loaded");
      return;
    }

    // Check if lecture number is set
    if (!lectureNo) {
      Alert.alert(
        "Lecture Number Required",
        "Please enter the lecture number before saving attendance.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Enter Lecture No", onPress: openLectureInputModal },
        ]
      );
      return;
    }

    // Confirmation
    Alert.alert(
      "Confirm Save",
      `Subject: ${selectedSubject.subjectName || selectedSubject.name}\nLecture #${lectureNo}\nDate: ${new Date().toLocaleDateString()}\nPresent: ${presentCount} | Absent: ${absentCount}\n\nSave attendance?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Save", onPress: proceedSave },
      ]
    );
  };

  const proceedSave = async () => {
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "Not authenticated");
        setSaving(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const batch = writeBatch(db);
      const col = collection(db, "attendance");

      for (const student of students) {
        const status = student.present ? "present" : "absent";
        const uniqueKey = `${student.boardRollNo}_${selectedSubject!.id}_${selectedSemester}_${today}`;

        const attendanceData = {
          studentId: student.boardRollNo,
          studentName: student.name || "Unknown",
          studentEmail: student.email || "",
          studentBoardRollNo: student.boardRollNo,
          studentRollNo: student.rollNo || "",
          date: today,
          timestamp: new Date().toISOString(),
          subjectId: selectedSubject!.id,
          subjectCode: selectedSubject!.subjectCode || "",
          subjectName: selectedSubject!.subjectName || selectedSubject!.name || "",
          semester: selectedSemester,
          department: student.department || teacherInfo?.assignedDepartment || "",
          status,
          markedBy: user.uid,
          markedByName: teacherInfo?.name || "Teacher",
          markedByRole: role,
          markedAt: new Date().toISOString(),
          lectureNo: lectureNo, // ✅ Manual lecture number
          uniqueKey,
          academicYear: new Date().getFullYear().toString(),
        };

        const eq = query(col, where("uniqueKey", "==", uniqueKey));
        const esnap = await getDocs(eq);

        if (!esnap.empty) {
          batch.update(doc(db, "attendance", esnap.docs[0].id), {
            status,
            lectureNo: lectureNo,
            markedAt: new Date().toISOString(),
            markedBy: user.uid,
            markedByName: teacherInfo?.name || "Teacher",
          });
        } else {
          batch.set(doc(col), attendanceData);
        }
      }

      if (selectedSubject!.id) {
        const tq = query(
          col,
          where("subjectId", "==", selectedSubject!.id),
          where("semester", "==", selectedSemester),
          where("date", "==", today)
        );
        const tsnap = await getDocs(tq);
        if (tsnap.empty) {
          batch.update(doc(db, "subjects", selectedSubject!.id), {
            totalLectures: increment(1),
            lastLectureDate: today,
            lastLectureNo: lectureNo,
          });
        }
      }

      await batch.commit();
      Alert.alert("Success", `Attendance saved!\nLecture #${lectureNo}\nPresent: ${presentCount}\nAbsent: ${absentCount}`);
      
      // Reset
      setSelectedSubject(null);
      setLectureNo(null);
      setLectureNoInput("");
    } catch (err: any) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors?.background || "#fff" }]}>
        <ActivityIndicator size="large" color={colors?.primary || "#2563EB"} />
        <Text style={[styles.loadingText, { color: colors?.textDark || "#333" }]}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors?.background || "#F3F4F6" }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors?.primary || "#2563EB"]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={[colors?.primary || "#2563EB", colors?.secondary || "#7C3AED"]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Mark Attendance</Text>
              <Text style={styles.headerSubtitle}>
                {teacherInfo?.name || "Teacher"} • {role?.replace("_", " ").toUpperCase()}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors?.card || "#fff" }]}>
            <Ionicons name="people-outline" size={20} color="#1976D2" />
            <Text style={[styles.statValue, { color: colors?.textDark || "#333" }]}>{students.length}</Text>
            <Text style={[styles.statLabel, { color: colors?.textLight || "#666" }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors?.card || "#fff" }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
            <Text style={[styles.statValue, { color: "#4CAF50" }]}>{presentCount}</Text>
            <Text style={[styles.statLabel, { color: colors?.textLight || "#666" }]}>Present</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors?.card || "#fff", borderWidth: 2, borderColor: absentCount > 0 ? "#F44336" : "transparent" }]}>
            <Ionicons name="close-circle-outline" size={20} color="#F44336" />
            <Text style={[styles.statValue, { color: "#F44336" }]}>{absentCount}</Text>
            <Text style={[styles.statLabel, { color: colors?.textLight || "#666" }]}>Absent</Text>
          </View>
        </View>

        {/* Filter Card */}
        <View style={[styles.filterCard, { backgroundColor: colors?.card || "#fff" }]}>
          <Text style={[styles.filterTitle, { color: colors?.textDark || "#333" }]}>Attendance Filters</Text>

          {/* Semester */}
          <Text style={[styles.label, { color: colors?.textLight || "#666" }]}>Semester *</Text>
          <View style={[styles.dropdown, { borderColor: colors?.border || "#ddd", backgroundColor: colors?.background || "#f9f9f9" }]}>
            <Picker
              selectedValue={selectedSemester}
              onValueChange={(v) => { setSelectedSemester(v); setSelectedSubject(null); setLectureNo(null); }}
              dropdownIconColor={colors?.textDark || "#333"}
              enabled={role !== "class_teacher"}
            >
              <Picker.Item label="Select Semester" value="" />
              {semesters.map((s) => <Picker.Item key={s} label={`Semester ${s}`} value={s} />)}
            </Picker>
          </View>

          {/* Subject */}
          <Text style={[styles.label, { color: colors?.textLight || "#666" }]}>Subject *</Text>
          <View style={[styles.dropdown, { borderColor: colors?.border || "#ddd", backgroundColor: colors?.background || "#f9f9f9" }]}>
            <Picker
              selectedValue={selectedSubject?.id || ""}
              onValueChange={(v) => {
                const sub = assignedSubjects.find((s) => s.id === v);
                setSelectedSubject(sub || null);
                setLectureNo(null);
                setLectureNoInput("");
              }}
              dropdownIconColor={colors?.textDark || "#333"}
              enabled={!!selectedSemester}
            >
              <Picker.Item label="Select Subject" value="" />
              {assignedSubjects.map((sub) => (
                <Picker.Item key={sub.id} label={`${sub.subjectCode || ""} - ${sub.subjectName || sub.name || ""}`} value={sub.id} />
              ))}
            </Picker>
          </View>

          {/* Lecture Number Input Section */}
          {selectedSubject && (
            <View style={[styles.lectureSection, { backgroundColor: colors?.primary + "10" || "#E3F2FD" }]}>
              <Text style={[styles.lectureSectionTitle, { color: colors?.textDark || "#333" }]}>
                📚 {selectedSubject.subjectCode} - {selectedSubject.subjectName || selectedSubject.name}
              </Text>
              
              <View style={styles.lectureInputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lectureLabel, { color: colors?.textDark || "#333" }]}>
                    Lecture Number *
                  </Text>
                  <View style={[styles.lectureInputContainer, { borderColor: colors?.border || "#ddd", backgroundColor: colors?.background || "#fff" }]}>
                    <Ionicons name="book-outline" size={18} color={colors?.primary || "#2563EB"} style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.lectureInput, { color: colors?.textDark || "#333" }]}
                      placeholder="Enter lecture number"
                      placeholderTextColor={colors?.textLight || "#999"}
                      value={lectureNoInput}
                      onChangeText={setLectureNoInput}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.setLectureBtn, { backgroundColor: colors?.primary || "#2563EB" }]}
                      onPress={confirmLectureNo}
                    >
                      <Text style={styles.setLectureBtnText}>Set</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {lectureNo && (
                <View style={[styles.lectureSetBadge, { backgroundColor: "#4CAF50" + "20" }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={[styles.lectureSetText, { color: "#4CAF50" }]}>
                    Lecture #{lectureNo} set for {new Date().toLocaleDateString()}
                  </Text>
                </View>
              )}

              {!lectureNo && (
                <View style={[styles.lectureWarning, { backgroundColor: "#FFF3E0" }]}>
                  <Ionicons name="warning-outline" size={16} color="#FF9800" />
                  <Text style={[styles.lectureWarningText, { color: "#E65100" }]}>
                    Please enter and set the lecture number before saving
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Quick Actions */}
          {selectedSubject && students.length > 0 && (
            <View style={styles.quickActions}>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#E8F5E9" }]} onPress={markAllPresent}>
                <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
                <Text style={{ color: "#4CAF50", fontSize: 12 }}>All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: "#FFEBEE" }]} onPress={markAllAbsent}>
                <Ionicons name="close" size={16} color="#F44336" />
                <Text style={{ color: "#F44336", fontSize: 12 }}>All Absent</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search */}
        {selectedSemester !== "" && (
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color={colors?.textLight || "#666"} style={styles.searchIcon} />
            <TextInput
              placeholder="Search by name, roll no, or email..."
              value={search}
              onChangeText={setSearch}
              style={[styles.searchInput, { backgroundColor: colors?.card || "#fff", color: colors?.textDark || "#333" }]}
              placeholderTextColor={colors?.textLight || "#999"}
            />
          </View>
        )}

        {/* Student List */}
        {selectedSubject && selectedSemester ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors?.textDark || "#333" }]}>
              Students ({filteredStudents.length}) - Semester {selectedSemester}
            </Text>

            {filteredStudents.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: colors?.card || "#fff" }]}>
                <Ionicons name="people-outline" size={48} color={colors?.textLight || "#999"} />
                <Text style={[styles.emptyText, { color: colors?.textLight || "#999" }]}>No students found</Text>
              </View>
            ) : (
              filteredStudents.map((student, index) => (
                <View key={student.boardRollNo || student.id} style={[styles.studentCard, { backgroundColor: colors?.card || "#fff" }, !student.present && styles.absentCard]}>
                  <View style={styles.studentInfo}>
                    <View style={[styles.studentNumber, { backgroundColor: student.present ? "#4CAF5020" : "#F4433620" }]}>
                      <Text style={[styles.studentNumberText, { color: student.present ? "#4CAF50" : "#F44336" }]}>
                        {student.present ? "P" : "A"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.studentName, { color: colors?.textDark || "#333" }]}>{student.name || "Unknown"}</Text>
                      <Text style={[styles.studentSub, { color: colors?.textLight || "#666" }]}>Roll: {student.boardRollNo || "N/A"}</Text>
                    </View>
                  </View>
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.attendanceBtn, student.present ? styles.presentActive : styles.absentInactive]}
                      onPress={() => { if (!student.present) toggleAbsent(student.boardRollNo); }}
                    >
                      <Text style={[styles.attendanceBtnText, { color: student.present ? "#fff" : "#4CAF50" }]}>P</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.attendanceBtn, !student.present ? styles.absentActive : styles.presentInactive]}
                      onPress={() => { if (student.present) toggleAbsent(student.boardRollNo); }}
                    >
                      <Text style={[styles.attendanceBtnText, { color: !student.present ? "#fff" : "#F44336" }]}>A</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          <View style={[styles.emptyContainer, { backgroundColor: colors?.card || "#fff", marginHorizontal: 15, marginTop: 20 }]}>
            <Ionicons name="book-outline" size={48} color={colors?.textLight || "#999"} />
            <Text style={[styles.emptyText, { color: colors?.textLight || "#999" }]}>
              {!selectedSemester ? "Please select a semester first" : "Please select a subject"}
            </Text>
          </View>
        )}

        {/* Save Button */}
        {selectedSubject && students.length > 0 && (
          <TouchableOpacity style={[styles.saveAttendanceBtn, saving && { opacity: 0.7 }]} onPress={saveAttendance} disabled={saving}>
            <LinearGradient colors={[colors?.primary || "#2563EB", colors?.secondary || "#7C3AED"]} style={styles.saveGradient}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={22} color="#fff" />
                  <Text style={styles.saveBtnText}>
                    {lectureNo ? `Save Attendance (Lecture #${lectureNo})` : "Save Attendance"}
                  </Text>
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
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 2 },
  statsContainer: { flexDirection: "row", paddingHorizontal: 15, marginTop: 15, gap: 10 },
  statCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, gap: 4, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 10 },
  filterCard: { marginHorizontal: 15, marginTop: 15, padding: 15, borderRadius: 15, elevation: 2 },
  filterTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  label: { fontSize: 13, marginBottom: 4, marginTop: 8 },
  dropdown: { borderRadius: 10, overflow: "hidden", marginBottom: 8, borderWidth: 1 },
  
  // Lecture Section
  lectureSection: { padding: 12, borderRadius: 10, marginTop: 10, marginBottom: 4 },
  lectureSectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  lectureInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  lectureLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  lectureInputContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10 },
  lectureInput: { flex: 1, paddingVertical: 10, fontSize: 15 },
  setLectureBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  setLectureBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  lectureSetBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, padding: 8, borderRadius: 8 },
  lectureSetText: { fontSize: 13, fontWeight: "600" },
  lectureWarning: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, padding: 8, borderRadius: 8 },
  lectureWarningText: { fontSize: 12, flex: 1 },
  
  quickActions: { flexDirection: "row", gap: 15, justifyContent: "center", marginTop: 10 },
  quickBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8, borderRadius: 8 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 15, marginTop: 15 },
  searchIcon: { position: "absolute", left: 12, zIndex: 1 },
  searchInput: { flex: 1, padding: 14, paddingLeft: 40, borderRadius: 12, fontSize: 14 },
  section: { marginHorizontal: 15, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  studentCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 12, padding: 12, marginBottom: 8, elevation: 1 },
  absentCard: { borderLeftWidth: 4, borderLeftColor: "#F44336" },
  studentInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  studentNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  studentNumberText: { fontSize: 12, fontWeight: "bold" },
  studentName: { fontSize: 14, fontWeight: "600" },
  studentSub: { fontSize: 11, marginTop: 1 },
  btnRow: { flexDirection: "row", gap: 6 },
  attendanceBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", borderWidth: 2 },
  presentActive: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  presentInactive: { backgroundColor: "#E8F5E9", borderColor: "#C8E6C9" },
  absentActive: { backgroundColor: "#F44336", borderColor: "#F44336" },
  absentInactive: { backgroundColor: "#FFEBEE", borderColor: "#FFCDD2" },
  attendanceBtnText: { fontWeight: "bold", fontSize: 16 },
  emptyContainer: { alignItems: "center", padding: 30, borderRadius: 16 },
  emptyText: { fontSize: 14, marginTop: 8 },
  saveAttendanceBtn: { marginHorizontal: 20, marginTop: 25, borderRadius: 15, overflow: "hidden", elevation: 3 },
  saveGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 16, gap: 10 },
  saveBtnText: { fontSize: 14, fontWeight: "bold", color: "#fff" },
});
