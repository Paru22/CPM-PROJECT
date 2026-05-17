import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState, useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
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

interface Student {
  id: string;
  name: string;
  boardRollNo: string;
  classRollNo: string;
  phoneNo: string;
  parentPhoneNo: string;
  gmail: string;
  department: string;
  semester: string;
  address?: string;
  attendance?: any;
}

interface StudentDetails extends Student {
  totalClasses?: number;
  presentClasses?: number;
  attendancePercentage?: number;
  monthlyAttendance?: { [key: string]: { present: number; total: number; percentage: number } };
}

export default function TeacherStudentList() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("All");
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [classTeacherInfo, setClassTeacherInfo] = useState<any>(null);
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);

  const isHOD = user?.role === "hod";

  // Define fetch functions before useCallback
  const filterBySemester = (data: Student[], semester: string) => {
    if (semester === "All") {
      setFilteredStudents(data);
    } else {
      setFilteredStudents(data.filter(s => s.semester === semester));
    }
  };

  const fetchAllDepartmentStudents = async (department: string) => {
    try {
      const q = query(
        collection(db, "students"),
        where("department", "==", department),
        where("requestStatus", "==", "approved"),
        orderBy("boardRollNo", "asc")
      );
      const querySnapshot = await getDocs(q);
      
      const studentList: Student[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          boardRollNo: data.boardRollNo || "",
          classRollNo: data.classRollNo || "",
          phoneNo: data.phoneNo || "",
          parentPhoneNo: data.parentPhoneNo || "",
          gmail: data.gmail || "",
          department: data.department || "",
          semester: data.semester || "",
          address: data.address || "",
        };
      });
      
      setStudents(studentList);
      filterBySemester(studentList, selectedSemester);
    } catch (error) {
      console.error("Error fetching students:", error);
      
      try {
        const q = query(
          collection(db, "students"),
          where("department", "==", department),
          where("requestStatus", "==", "approved")
        );
        const querySnapshot = await getDocs(q);
        
        const studentList: Student[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            boardRollNo: data.boardRollNo || "",
            classRollNo: data.classRollNo || "",
            phoneNo: data.phoneNo || "",
            parentPhoneNo: data.parentPhoneNo || "",
            gmail: data.gmail || "",
            department: data.department || "",
            semester: data.semester || "",
            address: data.address || "",
          };
        });
        
        studentList.sort((a, b) => a.boardRollNo.localeCompare(b.boardRollNo));
        setStudents(studentList);
        filterBySemester(studentList, selectedSemester);
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
        Alert.alert("Error", "Failed to load students");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsBySemester = async (department: string, semester: string) => {
    try {
      const q = query(
        collection(db, "students"),
        where("department", "==", department),
        where("semester", "==", semester),
        where("requestStatus", "==", "approved"),
        orderBy("boardRollNo", "asc")
      );
      const querySnapshot = await getDocs(q);
      
      const studentList: Student[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          boardRollNo: data.boardRollNo || "",
          classRollNo: data.classRollNo || "",
          phoneNo: data.phoneNo || "",
          parentPhoneNo: data.parentPhoneNo || "",
          gmail: data.gmail || "",
          department: data.department || "",
          semester: data.semester || "",
          address: data.address || "",
        };
      });
      
      setStudents(studentList);
      filterBySemester(studentList, selectedSemester);
    } catch (error) {
      console.error("Error fetching students:", error);
      
      try {
        const q = query(
          collection(db, "students"),
          where("department", "==", department),
          where("semester", "==", semester),
          where("requestStatus", "==", "approved")
        );
        const querySnapshot = await getDocs(q);
        
        const studentList: Student[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "",
            boardRollNo: data.boardRollNo || "",
            classRollNo: data.classRollNo || "",
            phoneNo: data.phoneNo || "",
            parentPhoneNo: data.parentPhoneNo || "",
            gmail: data.gmail || "",
            department: data.department || "",
            semester: data.semester || "",
            address: data.address || "",
          };
        });
        
        studentList.sort((a, b) => a.boardRollNo.localeCompare(b.boardRollNo));
        setStudents(studentList);
        filterBySemester(studentList, selectedSemester);
      } catch (fallbackErr) {
        console.error("Fallback error:", fallbackErr);
        Alert.alert("Error", "Failed to load students");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherInfo = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      const classTeacherQuery = query(
        collection(db, "classTeachers"),
        where("teacherId", "==", user.uid)
      );
      const classTeacherSnap = await getDocs(classTeacherQuery);
      
      if (!classTeacherSnap.empty) {
        const classData = classTeacherSnap.docs[0].data();
        setClassTeacherInfo({
          semester: classData.semester,
          department: classData.department,
        });
        setAvailableSemesters(["All", classData.semester.toString()]);
        await fetchStudentsBySemester(classData.department, classData.semester.toString());
      } else if (isHOD) {
        setAvailableSemesters(["All", "1", "2", "3", "4", "5", "6"]);
        await fetchAllDepartmentStudents(user.department);
      } else {
        Alert.alert("Access Denied", "No class assigned. Contact HOD.");
        setAvailableSemesters(["All"]);
        setStudents([]);
        setFilteredStudents([]);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching teacher info:", error);
      Alert.alert("Error", "Failed to load student data");
      setLoading(false);
    }
  }, [user]);

  const handleSemesterChange = (semester: string) => {
    setSelectedSemester(semester);
    filterBySemester(students, semester);
  };

  const fetchStudentDetails = async (student: Student) => {
    setAttendanceLoading(true);
    try {
      const studentRef = doc(db, "students", student.id);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const data = studentSnap.data();
        const attendance = data.attendance || {};
        
        const attendanceValues = Object.values(attendance);
        const totalClasses = attendanceValues.length;
        const presentClasses = attendanceValues.filter((v: any) => v === "present").length;
        const attendancePercentage = totalClasses === 0 ? 0 : Math.round((presentClasses / totalClasses) * 100);
        
        const monthlyAttendance: { [key: string]: { present: number; total: number; percentage: number } } = {};
        
        Object.entries(attendance).forEach(([date, status]: [string, any]) => {
          const month = date.substring(0, 7);
          if (!monthlyAttendance[month]) {
            monthlyAttendance[month] = { present: 0, total: 0, percentage: 0 };
          }
          monthlyAttendance[month].total++;
          if (status === "present") {
            monthlyAttendance[month].present++;
          }
          monthlyAttendance[month].percentage = Math.round(
            (monthlyAttendance[month].present / monthlyAttendance[month].total) * 100
          );
        });
        
        const detailedStudent: StudentDetails = {
          ...student,
          totalClasses,
          presentClasses,
          attendancePercentage,
          monthlyAttendance,
        };
        
        setSelectedStudent(detailedStudent);
        setModalVisible(true);
      }
    } catch (error) {
      console.error("Error fetching student details:", error);
      Alert.alert("Error", "Failed to load student details");
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherInfo();
  }, [fetchTeacherInfo]);

  const renderSemesterFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.semesterScroll}
      contentContainerStyle={styles.semesterContainer}
    >
      {availableSemesters.map((sem) => (
        <TouchableOpacity
          key={sem}
          style={[
            styles.semesterButton,
            { backgroundColor: colors.card, borderColor: colors.border },
            selectedSemester === sem && styles.selectedSemesterButton
          ]}
          onPress={() => handleSemesterChange(sem)}
        >
          <Text style={[
            styles.semesterButtonText,
            { color: colors.textLight },
            selectedSemester === sem && styles.selectedSemesterButtonText
          ]}>
            {sem === "All" ? "All Semesters" : `Semester ${sem}`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderStudent = ({ item, index }: { item: Student; index: number }) => (
    <TouchableOpacity
      style={[styles.studentCard, { backgroundColor: colors.card }]}
      onPress={() => fetchStudentDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardGradient}>
        <View style={styles.cardHeader}>
          <View style={[styles.serialContainer, { backgroundColor: colors.primary }]}>
            <Text style={styles.serialNumber}>{index + 1}</Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={[styles.studentName, { color: colors.textDark }]}>{item.name}</Text>
            <Text style={[styles.studentDetail, { color: colors.textLight }]}>
              Board Roll: {item.boardRollNo}
            </Text>
            <View style={styles.detailRow}>
              <Text style={[styles.studentDetail, { color: colors.textLight }]}>
                Sem: {item.semester}
              </Text>
              <Text style={[styles.detailSeparator, { color: colors.textLight }]}>•</Text>
              <Text style={[styles.studentDetail, { color: colors.textLight }]}>
                {item.department}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading Students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Students</Text>
            <Text style={styles.headerSubtitle}>
              {isHOD 
                ? `${user?.department || ""} - All Students`
                : classTeacherInfo 
                  ? `Semester ${classTeacherInfo.semester} - ${classTeacherInfo.department}`
                  : "View student records"}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {availableSemesters.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Filter by Semester</Text>
            {renderSemesterFilters()}
          </View>
        )}

        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statsValue, { color: colors.primary }]}>{filteredStudents.length}</Text>
          <Text style={[styles.statsLabel, { color: colors.textLight }]}>
            {selectedSemester === "All" ? "Total Students" : `Semester ${selectedSemester} Students`}
          </Text>
        </View>

        {filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>No students found</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStudents}
            renderItem={renderStudent}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Student Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {attendanceLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading details...</Text>
                </View>
              ) : selectedStudent && (
                <>
                  <View style={styles.infoSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Personal Information</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                      <InfoRow icon="person-outline" label="Full Name" value={selectedStudent.name} colors={colors} />
                      <InfoRow icon="call-outline" label="Phone" value={selectedStudent.phoneNo || "N/A"} colors={colors} />
                      <InfoRow icon="people-outline" label="Parent Phone" value={selectedStudent.parentPhoneNo || "N/A"} colors={colors} />
                      <InfoRow icon="mail-outline" label="Email" value={selectedStudent.gmail || "N/A"} colors={colors} />
                      <InfoRow icon="home-outline" label="Address" value={selectedStudent.address || "N/A"} colors={colors} />
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Academic Information</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                      <InfoRow icon="business-outline" label="Department" value={selectedStudent.department} colors={colors} />
                      <InfoRow icon="book-outline" label="Semester" value={selectedStudent.semester} colors={colors} />
                      <InfoRow icon="qr-code-outline" label="Board Roll No" value={selectedStudent.boardRollNo} colors={colors} />
                      <InfoRow icon="grid-outline" label="Class Roll No" value={selectedStudent.classRollNo || "N/A"} colors={colors} />
                    </View>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Attendance Overview</Text>
                    <View style={[styles.attendanceCard, { backgroundColor: colors.background }]}>
                      <View style={styles.attendanceStats}>
                        <View style={styles.attendanceStat}>
                          <Text style={[styles.attendanceStatValue, { color: colors.primary }]}>
                            {selectedStudent.totalClasses || 0}
                          </Text>
                          <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>Total</Text>
                        </View>
                        <View style={styles.attendanceStat}>
                          <Text style={[styles.attendanceStatValue, { color: "#4CAF50" }]}>
                            {selectedStudent.presentClasses || 0}
                          </Text>
                          <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>Present</Text>
                        </View>
                        <View style={styles.attendanceStat}>
                          <Text style={[
                            styles.attendanceStatValue,
                            { 
                              color: (selectedStudent.attendancePercentage || 0) >= 75 
                                ? "#4CAF50" 
                                : (selectedStudent.attendancePercentage || 0) >= 60 
                                  ? "#FF9800" 
                                  : "#F44336" 
                            }
                          ]}>
                            {selectedStudent.attendancePercentage || 0}%
                          </Text>
                          <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>Percentage</Text>
                        </View>
                      </View>
                      
                      {selectedStudent.monthlyAttendance && Object.keys(selectedStudent.monthlyAttendance).length > 0 && (
                        <View style={styles.monthlyAttendance}>
                          <Text style={[styles.monthlyTitle, { color: colors.textDark }]}>Monthly Breakdown</Text>
                          {Object.entries(selectedStudent.monthlyAttendance)
                            .sort((a, b) => b[0].localeCompare(a[0]))
                            .map(([month, data]) => (
                              <View key={month} style={styles.monthlyItem}>
                                <View style={styles.monthlyHeader}>
                                  <Text style={[styles.monthlyMonth, { color: colors.textLight }]}>{month}</Text>
                                  <Text style={[styles.monthlyPercent, { color: colors.textDark }]}>
                                    {data.present}/{data.total} ({data.percentage}%)
                                  </Text>
                                </View>
                                <View style={[styles.monthlyBar, { backgroundColor: colors.border }]}>
                                  <View style={[
                                    styles.monthlyFill,
                                    { 
                                      width: `${data.percentage}%`, 
                                      backgroundColor: data.percentage >= 75 
                                        ? "#4CAF50" 
                                        : data.percentage >= 60 
                                          ? "#FF9800" 
                                          : "#F44336" 
                                    }
                                  ]} />
                                </View>
                              </View>
                            ))}
                        </View>
                      )}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper component - NO export default
function InfoRow({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <Text style={[styles.infoLabel, { color: colors.textLight }]}>{label}:</Text>
      <Text style={[styles.infoValue, { color: colors.textDark }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 20, paddingBottom: 25, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  themeToggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#fff", opacity: 0.9, marginTop: 5 },
  content: { flex: 1, padding: 15 },
  filterSection: { marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  semesterScroll: { flexGrow: 0 },
  semesterContainer: { paddingVertical: 5 },
  semesterButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  selectedSemesterButton: { backgroundColor: "#7384bf", borderColor: "#7384bf" },
  semesterButtonText: { fontSize: 14 },
  selectedSemesterButtonText: { color: "#fff", fontWeight: "600" },
  statsCard: { borderRadius: 12, padding: 15, alignItems: "center", marginBottom: 15, elevation: 2 },
  statsValue: { fontSize: 28, fontWeight: "bold" },
  statsLabel: { fontSize: 12, marginTop: 5 },
  listContainer: { paddingBottom: 20 },
  studentCard: { marginBottom: 10, borderRadius: 12, elevation: 2 },
  cardGradient: { padding: 15 },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  serialContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
  serialNumber: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  studentDetail: { fontSize: 12 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailSeparator: { fontSize: 12, marginHorizontal: 2 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  emptyText: { fontSize: 16, marginTop: 10 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 50 },
  loadingText: { marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalBody: { padding: 20 },
  infoSection: { marginBottom: 20 },
  infoCard: { borderRadius: 12, padding: 15 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 },
  infoLabel: { fontSize: 14, fontWeight: "600", width: 100 },
  infoValue: { fontSize: 14, flex: 1 },
  attendanceCard: { borderRadius: 12, padding: 15 },
  attendanceStats: { flexDirection: "row", justifyContent: "space-around", marginBottom: 20 },
  attendanceStat: { alignItems: "center" },
  attendanceStatValue: { fontSize: 24, fontWeight: "bold" },
  attendanceStatLabel: { fontSize: 12, marginTop: 5 },
  monthlyAttendance: { marginTop: 15 },
  monthlyTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  monthlyItem: { marginBottom: 12 },
  monthlyHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  monthlyMonth: { fontSize: 12, fontWeight: "600" },
  monthlyBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 5 },
  monthlyFill: { height: "100%", borderRadius: 3 },
  monthlyPercent: { fontSize: 12 },
});