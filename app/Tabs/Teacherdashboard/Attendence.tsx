import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { db, auth } from "../../../config/firebaseConfig.native";
import { collection, getDocs } from "firebase/firestore";
import { useTheme } from "../../../context/ThemeContext";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AttendanceScreen() {
  const router = useRouter();
  const { colors, theme } = useTheme();

  const [role, setRole] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);

  const semesters = ["1", "2", "3", "4", "5", "6"];

  // Fetch role and data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await fetchRole();
    await fetchStudents();
    await fetchSubjects();
    setLoading(false);
  };

  const fetchRole = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const snap = await getDocs(collection(db, "teachers"));
    const current = snap.docs.find((d) => d.id === user.uid);

    if (current) {
      const teacherData = current.data();
      setRole(teacherData.role);
      setTeacherInfo(teacherData);
    }
  };

  const fetchStudents = async () => {
    const snap = await getDocs(collection(db, "students"));
    const list = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      present: false,
    }));
    setStudents(list);
  };

  const fetchSubjects = async () => {
    // Fetch from Firestore or use mock data
    const mockSubjects = ["Mathematics", "Database Management", "Operating Systems", "Computer Networks"];
    setSubjects(mockSubjects);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    setRefreshing(false);
  };

  const toggleAttendance = (id: string, value: boolean) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, present: value } : s))
    );
  };

  const saveAttendance = () => {
    // Save attendance logic here
    alert("Attendance saved successfully!");
  };

  const getPresentCount = () => {
    return students.filter(s => s.present).length;
  };

  const getAbsentCount = () => {
    return students.filter(s => !s.present).length;
  };

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
              <Text style={styles.headerTitle}>Mark Attendance</Text>
              <Text style={styles.headerSubtitle}>{teacherInfo?.name || "Teacher"}</Text>
            </View>
            <TouchableOpacity onPress={saveAttendance} style={styles.saveButton}>
              <Ionicons name="save-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: "#E8F0FE" }]}>
              <Ionicons name="people-outline" size={24} color="#1976D2" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{students.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total Students</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{getPresentCount()}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Present</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="close-circle-outline" size={24} color="#F44336" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.textDark }]}>{getAbsentCount()}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Absent</Text>
            </View>
          </View>
        </View>

        {/* Filter Section */}
        {(role === "hod" || role === "class_teacher") && (
          <View style={[styles.filterCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.filterTitle, { color: colors.textDark }]}>
              <Ionicons name="filter-outline" size={18} color={colors.primary} /> Filters
            </Text>

            {role === "hod" && (
              <>
                <Text style={[styles.label, { color: colors.textLight }]}>Semester</Text>
                <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Picker
                    selectedValue={selectedSemester}
                    onValueChange={setSelectedSemester}
                    dropdownIconColor={colors.textDark}
                  >
                    <Picker.Item label="Select Semester" value="" />
                    {semesters.map((s) => (
                      <Picker.Item key={s} label={`Semester ${s}`} value={s} />
                    ))}
                  </Picker>
                </View>
              </>
            )}

            <Text style={[styles.label, { color: colors.textLight }]}>Subject</Text>
            <View style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Picker
                selectedValue={selectedSubject}
                onValueChange={setSelectedSubject}
                dropdownIconColor={colors.textDark}
              >
                <Picker.Item label="Select Subject" value="" />
                {subjects.map((sub) => (
                  <Picker.Item key={sub} label={sub} value={sub} />
                ))}
              </Picker>
            </View>
          </View>
        )}

        {/* Subject Selector for Teachers */}
        {role === "teacher" && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
              <Ionicons name="book-outline" size={18} color={colors.primary} /> Your Subjects
            </Text>
            <View style={styles.subjectGrid}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[
                    styles.subjectChip,
                    { backgroundColor: colors.card },
                    selectedSubject === sub && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setSelectedSubject(sub)}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      { color: selectedSubject === sub ? "#fff" : colors.textDark }
                    ]}
                  >
                    {sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Students List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
            <Ionicons name="people-outline" size={18} color={colors.primary} /> Students List
          </Text>

          {students.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
              <Ionicons name="people-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No students found</Text>
            </View>
          ) : (
            students.map((student, index) => (
              <View
                key={student.id}
                style={[styles.studentCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.studentInfo}>
                  <View style={[styles.studentNumber, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.studentNumberText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                  <View>
                    <Text style={[styles.studentName, { color: colors.textDark }]}>
                      {student.name || student.Name || "Unknown"}
                    </Text>
                    <Text style={[styles.studentSub, { color: colors.textLight }]}>
                      Roll No: {student.rollNumber || student.rollNo || "N/A"}
                    </Text>
                    {student.department && (
                      <Text style={[styles.studentSub, { color: colors.textLight }]}>
                        {student.department} - Sem {student.semester}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={[
                      styles.btn,
                      styles.presentBtn,
                      student.present && styles.presentBtnActive,
                    ]}
                    onPress={() => toggleAttendance(student.id, true)}
                  >
                    <Text style={styles.btnText}>P</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.btn,
                      styles.absentBtn,
                      !student.present && styles.absentBtnActive,
                    ]}
                    onPress={() => toggleAttendance(student.id, false)}
                  >
                    <Text style={styles.btnText}>A</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Save Button Bottom */}
        {students.length > 0 && (
          <TouchableOpacity style={styles.saveAttendanceBtn} onPress={saveAttendance}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.saveGradient}>
              <Ionicons name="save-outline" size={24} color="#fff" />
              <Text style={styles.saveBtnText}>Save Attendance</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
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
    gap: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    marginTop: 15,
    gap: 10,
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
    borderRadius: 14,
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
  filterCard: {
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
    marginTop: 8,
  },
  dropdown: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
  },
  section: {
    marginHorizontal: 15,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  subjectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  subjectChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 1,
  },
  subjectChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  studentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  studentNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  studentNumberText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  studentName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  studentSub: {
    fontSize: 12,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  btn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  presentBtn: {
    backgroundColor: "#E8F5E9",
    borderColor: "#C8E6C9",
  },
  presentBtnActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  absentBtn: {
    backgroundColor: "#FFEBEE",
    borderColor: "#FFCDD2",
  },
  absentBtnActive: {
    backgroundColor: "#F44336",
    borderColor: "#F44336",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    borderRadius: 16,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    fontSize: 16,
    marginTop: 10,
  },
  saveAttendanceBtn: {
    margin: 20,
    borderRadius: 15,
    overflow: "hidden",
    elevation: 3,
  },
  saveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 10,
  },
  saveBtnText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
});