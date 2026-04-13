import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
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
import { useTheme } from "../../../context/ThemeContext";

const { height } = Dimensions.get("window");

interface Student {
  id: string;
  Name: string;
  rollNo: string;
  phone: string;
  department: string;
  semester: string;
  address?: string;
  parentPhone?: string;
  email?: string;
  classRollNo?: string;
  boardRollNo?: string;
  attendance?: any;
  dateOfBirth?: string;
  bloodGroup?: string;
}

interface StudentDetails extends Student {
  totalClasses?: number;
  presentClasses?: number;
  attendancePercentage?: number;
  monthlyAttendance?: { [key: string]: { present: number; total: number; percentage: number } };
}

export default function TeacherStudentList() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSemester, setSelectedSemester] = useState("All");
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const semesters = ["All", "1", "2", "3", "4", "5", "6"];

  // ✅ Fetch students from Firestore
  const fetchStudents = async () => {
    try {
      const q = query(collection(db, "students"), orderBy("rollNo", "asc"));
      const querySnapshot = await getDocs(q);

      const studentList: Student[] = querySnapshot.docs.map((doc) => {
        const data = doc.data() as Partial<Student>;
        return {
          id: doc.id,
          Name: data.Name ?? "",
          rollNo: data.rollNo ?? "",
          phone: data.phone ?? "",
          department: data.department ?? "",
          semester: data.semester ?? "",
          address: data.address ?? "",
          parentPhone: data.parentPhone ?? "",
          email: data.email ?? "",
          classRollNo: data.classRollNo ?? "",
          boardRollNo: data.boardRollNo ?? "",
          dateOfBirth: data.dateOfBirth ?? "",
          bloodGroup: data.bloodGroup ?? "",
        };
      });

      const sortedList = studentList.sort((a, b) => a.rollNo.localeCompare(b.rollNo));
      setStudents(sortedList);
      filterBySemester(sortedList, selectedSemester);
    } catch (error) {
      console.error("Error fetching students:", error);
      Alert.alert("Error", "Failed to load students from Firestore.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Filter by semester
  const filterBySemester = (data: Student[], semester: string) => {
    let filtered = data.filter((s) =>
      semester === "All" ? true : String(s.semester) === semester
    );
    setFilteredStudents(filtered);
  };

  // ✅ Handle semester change
  const handleSemesterChange = (semester: string) => {
    setSelectedSemester(semester);
    filterBySemester(students, semester);
  };

  // ✅ Fetch complete student details including attendance
  const fetchStudentDetails = async (student: Student) => {
    setAttendanceLoading(true);
    try {
      const studentRef = doc(db, "students", student.id);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        const data = studentSnap.data();
        const attendance = data.attendance || {};
        
        // Calculate overall attendance
        const attendanceValues = Object.values(attendance);
        const totalClasses = attendanceValues.length;
        const presentClasses = attendanceValues.filter((v) => v === "present").length;
        const attendancePercentage = totalClasses === 0 ? 0 : Math.round((presentClasses / totalClasses) * 100);
        
        // Calculate monthly attendance
        const monthlyAttendance: { [key: string]: { present: number; total: number; percentage: number } } = {};
        
        Object.entries(attendance).forEach(([date, status]) => {
          const month = date.substring(0, 7); // YYYY-MM format
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
          attendance,
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

  // ✅ Render semester filter buttons
  const renderSemesterFilters = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.semesterScroll}
      contentContainerStyle={styles.semesterContainer}
    >
      {semesters.map((sem) => (
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
            {sem === "All" ? "All" : `Sem ${sem}`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ✅ Render each student card
  const renderStudent = ({ item, index }: { item: Student; index: number }) => (
    <TouchableOpacity
      style={[styles.studentCard, { backgroundColor: colors.card }]}
      onPress={() => fetchStudentDetails(item)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[colors.card, `${colors.background}`]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.serialContainer}>
            <Text style={styles.serialNumber}>{index + 1}</Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={[styles.studentName, { color: colors.textDark }]}>{item.Name}</Text>
            <Text style={[styles.studentDetail, { color: colors.textLight }]}>Roll No: {item.rollNo}</Text>
            <Text style={[styles.studentDetail, { color: colors.textLight }]}>Semester: {item.semester}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  // ✅ Calculate semester stats
  const getSemesterStats = () => {
    const total = filteredStudents.length;
    return { total };
  };

  const stats = getSemesterStats();

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
            <Text style={styles.headerTitle}>Student Management</Text>
            <Text style={styles.headerSubtitle}>View and manage student records</Text>
          </View>
          {/* Theme Toggle Button */}
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Semester Filters */}
        <View style={styles.filterSection}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Filter by Semester</Text>
          {renderSemesterFilters()}
        </View>

        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statsValue, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={[styles.statsLabel, { color: colors.textLight }]}>Students in Selected Semester</Text>
        </View>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>No students found in this semester</Text>
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
                  {/* Personal Information */}
                  <View style={styles.infoSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Personal Information</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                      <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Full Name:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.Name}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Phone:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.phone || "N/A"}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="people-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Parent Phone:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.parentPhone || "N/A"}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="mail-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Email:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.email || "N/A"}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="home-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Address:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.address || "N/A"}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Academic Information */}
                  <View style={styles.infoSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Academic Information</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                      <View style={styles.infoRow}>
                        <Ionicons name="school-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Department:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.department}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="book-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Semester:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.semester}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Roll No:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.rollNo}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="grid-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Class Roll No:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.classRollNo || "N/A"}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="trophy-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Board Roll No:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.boardRollNo || "N/A"}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Attendance Information */}
                  <View style={styles.infoSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Attendance Overview</Text>
                    <View style={[styles.attendanceCard, { backgroundColor: colors.background }]}>
                      <View style={styles.attendanceStats}>
                        <View style={styles.attendanceStat}>
                          <Text style={[styles.attendanceStatValue, { color: colors.primary }]}>{selectedStudent.totalClasses || 0}</Text>
                          <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>Total Classes</Text>
                        </View>
                        <View style={styles.attendanceStat}>
                          <Text style={[styles.attendanceStatValue, { color: colors.primary }]}>{selectedStudent.presentClasses || 0}</Text>
                          <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>Present</Text>
                        </View>
                        <View style={styles.attendanceStat}>
                          <Text style={[
                            styles.attendanceStatValue,
                            (selectedStudent.attendancePercentage || 0) >= 75 ? styles.goodAttendance :
                            (selectedStudent.attendancePercentage || 0) >= 60 ? styles.warningAttendance :
                            styles.poorAttendance,
                            { color: (selectedStudent.attendancePercentage || 0) >= 75 ? "#4CAF50" : (selectedStudent.attendancePercentage || 0) >= 60 ? "#FF9800" : "#F44336" }
                          ]}>
                            {selectedStudent.attendancePercentage || 0}%
                          </Text>
                          <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>Percentage</Text>
                        </View>
                      </View>
                      
                      {/* Monthly Attendance */}
                      {selectedStudent.monthlyAttendance && Object.keys(selectedStudent.monthlyAttendance).length > 0 && (
                        <View style={styles.monthlyAttendance}>
                          <Text style={[styles.monthlyTitle, { color: colors.textDark }]}>Monthly Attendance</Text>
                          {Object.entries(selectedStudent.monthlyAttendance)
                            .sort((a, b) => b[0].localeCompare(a[0]))
                            .map(([month, data]) => (
                              <View key={month} style={styles.monthlyItem}>
                                <Text style={[styles.monthlyMonth, { color: colors.textLight }]}>{month}</Text>
                                <View style={[styles.monthlyBar, { backgroundColor: colors.border }]}>
                                  <View style={[
                                    styles.monthlyFill,
                                    { width: `${data.percentage}%`, backgroundColor: data.percentage >= 75 ? "#4CAF50" : data.percentage >= 60 ? "#FF9800" : "#F44336" }
                                  ]} />
                                </View>
                                <Text style={[styles.monthlyPercent, { color: colors.textLight }]}>{data.percentage}%</Text>
                                <Text style={[styles.monthlyDetails, { color: colors.textLight }]}>
                                  {data.present}/{data.total} days
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Additional Information */}
                  <View style={styles.infoSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Additional Information</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Date of Birth:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.dateOfBirth || "N/A"}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="water-outline" size={20} color={colors.primary} />
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Blood Group:</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedStudent.bloodGroup || "N/A"}</Text>
                      </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  filterSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  semesterScroll: {
    flexGrow: 0,
  },
  semesterContainer: {
    paddingVertical: 5,
  },
  semesterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    elevation: 2,
    borderWidth: 1,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
  },
  selectedSemesterButton: {
    backgroundColor: "#7384bf",
    borderColor: "#7384bf",
  },
  semesterButtonText: {
    fontSize: 14,
  },
  selectedSemesterButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  statsCard: {
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: "bold",
  },
  statsLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  listContainer: {
    paddingBottom: 20,
  },
  studentCard: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
  },
  cardGradient: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  serialContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7384bf",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  serialNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  studentDetail: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  modalBody: {
    padding: 20,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    borderRadius: 12,
    padding: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    width: 110,
  },
  infoValue: {
    fontSize: 14,
    flex: 1,
  },
  attendanceCard: {
    borderRadius: 12,
    padding: 15,
  },
  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  attendanceStat: {
    alignItems: "center",
  },
  attendanceStatValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  attendanceStatLabel: {
    fontSize: 12,
    marginTop: 5,
  },
  goodAttendance: {
    color: "#4CAF50",
  },
  warningAttendance: {
    color: "#FF9800",
  },
  poorAttendance: {
    color: "#F44336",
  },
  monthlyAttendance: {
    marginTop: 15,
  },
  monthlyTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  monthlyItem: {
    marginBottom: 12,
  },
  monthlyMonth: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 5,
  },
  monthlyBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 5,
  },
  monthlyFill: {
    height: "100%",
    borderRadius: 3,
  },
  monthlyPercent: {
    fontSize: 11,
    marginBottom: 2,
  },
  monthlyDetails: {
    fontSize: 10,
  },
});