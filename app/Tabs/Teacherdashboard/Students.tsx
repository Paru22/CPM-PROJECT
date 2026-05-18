import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { db } from "../../../config/firebaseConfig.native";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

const { height, width } = Dimensions.get("window");

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
}

interface StudentDetails extends Student {
  totalClasses?: number;
  presentClasses?: number;
  attendancePercentage?: number;
}

interface StudentCardProps {
  item: Student;
  index: number;
  colors: any;
  onPress: (student: Student) => void;
}

// ======================
// STUDENT CARD COMPONENT
// ======================

const StudentCard = ({
  item,
  index,
  colors,
  onPress,
}: StudentCardProps) => {
  const cardAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardAnim, scaleAnim, index]);

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [
          {
            translateY: cardAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [40, 0],
            }),
          },
          { scale: scaleAnim },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        style={[
          styles.studentCard,
          { backgroundColor: colors.card },
        ]}
        onPress={() => onPress(item)}
      >
        <LinearGradient
          colors={[`${colors.primary}08`, `${colors.secondary}04`]}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.serialContainer,
                { backgroundColor: colors.primary },
              ]}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.serialGradient}
              >
                <Text style={styles.serialNumber}>
                  {index + 1}
                </Text>
              </LinearGradient>
            </View>

            <View style={styles.studentInfo}>
              <Text
                style={[
                  styles.studentName,
                  { color: colors.textDark },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <View style={styles.detailRow}>
                <Ionicons
                  name="school-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.studentDetail,
                    { color: colors.textLight },
                  ]}
                >
                  Roll: {item.boardRollNo}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons
                  name="book-outline"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.studentDetail,
                    { color: colors.textLight },
                  ]}
                >
                  Semester {item.semester} • {item.department}
                </Text>
              </View>
            </View>

            <View style={[styles.chevronContainer, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary}
              />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ======================
// MAIN COMPONENT
// ======================

export default function TeacherStudentList() {
  const router = useRouter();

  const { user } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();

  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedSemester, setSelectedSemester] =
    useState("All");

  const [availableSemesters, setAvailableSemesters] =
    useState<string[]>(["All"]);

  const [selectedStudent, setSelectedStudent] =
    useState<StudentDetails | null>(null);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [attendanceLoading, setAttendanceLoading] =
    useState(false);

  // ANIMATION
  const fadeAnim = useRef(
    new Animated.Value(0)
  ).current;

  const modalAnim = useRef(
    new Animated.Value(height)
  ).current;

  const headerAnim = useRef(
    new Animated.Value(0)
  ).current;

  // ======================
  // PAGE ANIMATION
  // ======================

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(headerAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, headerAnim]);

  // ======================
  // MODAL ANIMATION
  // ======================

  useEffect(() => {
    if (modalVisible) {
      Animated.spring(modalAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 65,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible, modalAnim]);

  // ======================
  // FETCH ALL STUDENTS
  // ======================

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(
        collection(db, "students")
      );

      const studentList: Student[] = snapshot.docs.map(
        (docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,
            name: data.name || "",
            boardRollNo: data.boardRollNo || "",
            classRollNo: data.rollNo || "",
            phoneNo: data.phone || "",
            parentPhoneNo: data.parentPhone || "",
            gmail: data.email || "",
            department: data.department || "",
            semester:
              data.semester?.toString() || "",
            address: data.address || "",
          };
        }
      );

      // SORT BY SEMESTER
      studentList.sort((a, b) => {
        const semA = Number(a.semester);
        const semB = Number(b.semester);

        if (semA !== semB) {
          return semA - semB;
        }

        return a.name.localeCompare(b.name);
      });

      setStudents(studentList);

      // DYNAMIC SEMESTERS
      const semesters = [
        "All",
        ...new Set(
          studentList.map((s) => s.semester)
        ),
      ];

      semesters.sort((a, b) => {
        if (a === "All") return -1;
        return Number(a) - Number(b);
      });

      setAvailableSemesters(semesters);

      setFilteredStudents(studentList);
    } catch (error) {
      console.log(error);

      Alert.alert(
        "Error",
        "Failed to fetch students"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ======================
  // INITIAL LOAD
  // ======================

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // ======================
  // FILTER
  // ======================

  useEffect(() => {
    let filtered = [...students];

    // FILTER SEMESTER
    if (selectedSemester !== "All") {
      filtered = filtered.filter(
        (student) =>
          student.semester === selectedSemester
      );
    }

    // SEARCH FILTER
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((student) => {
        const query = searchQuery.toLowerCase();

        return (
          student.name
            .toLowerCase()
            .includes(query) ||
          student.boardRollNo
            .toLowerCase()
            .includes(query)
        );
      });
    }

    setFilteredStudents(filtered);
  }, [students, selectedSemester, searchQuery]);

  // ======================
  // STUDENT DETAILS
  // ======================

  const fetchStudentDetails = async (
    student: Student
  ) => {
    try {
      setAttendanceLoading(true);

      const studentRef = doc(
        db,
        "students",
        student.id
      );

      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        const data = studentSnap.data();

        const attendance =
          data.attendance || {};

        const attendanceValues =
          Object.values(attendance);

        const totalClasses =
          attendanceValues.length;

        const presentClasses =
          attendanceValues.filter(
            (v: any) => v === "present"
          ).length;

        const attendancePercentage =
          totalClasses === 0
            ? 0
            : Math.round(
                (presentClasses /
                  totalClasses) *
                  100
              );

        setSelectedStudent({
          ...student,
          totalClasses,
          presentClasses,
          attendancePercentage,
        });

        setModalVisible(true);
      }
    } catch (error) {
      console.log(error);

      Alert.alert(
        "Error",
        "Failed to fetch student details"
      );
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ======================
  // ATTENDANCE COLOR
  // ======================

  const getAttendanceColor = (
    percentage: number
  ) => {
    if (percentage >= 75) return "#4CAF50";
    if (percentage >= 60) return "#FF9800";
    return "#F44336";
  };

  const getAttendanceStatus = (percentage: number) => {
    if (percentage >= 75) return "Excellent";
    if (percentage >= 60) return "Good";
    return "Needs Improvement";
  };

  // ======================
  // LOADING
  // ======================

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <StatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <View style={styles.loadingContainer}>
          <Animated.View style={{ transform: [{ scale: fadeAnim }] }}>
            <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
              <ActivityIndicator
                size="large"
                color={colors.primary}
              />
              <Text
                style={[
                  styles.loadingText,
                  { color: colors.textDark },
                ]}
              >
                Loading Students...
              </Text>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ======================
  // MAIN UI
  // ======================

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {/* HEADER */}

      <LinearGradient
        colors={[
          colors.primary,
          colors.secondary,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View 
          style={[
            styles.headerContent,
            {
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>
              All Students
            </Text>

            <View style={styles.headerStats}>
              <Text style={styles.headerSubtitle}>
                Total: {filteredStudents.length}
              </Text>
              <View style={styles.headerDot} />
              <Text style={styles.headerSubtitle}>
                {availableSemesters.length - 1} Semesters
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.themeToggle}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                theme === "light"
                  ? "moon-outline"
                  : "sunny-outline"
              }
              size={22}
              color="#fff"
            />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      {/* CONTENT */}

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* SEARCH */}

        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor:
                colors.card,
              borderColor:
                colors.border,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textLight}
          />

          <TextInput
            style={[
              styles.searchInput,
              {
                color:
                  colors.textDark,
              },
            ]}
            placeholder="Search by name or roll number..."
            placeholderTextColor={
              colors.textLight
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />

          {searchQuery !== "" && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textLight}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* SEMESTER FILTER */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.semesterContainer
          }
        >
          {availableSemesters.map((sem, idx) => (
            <TouchableOpacity
              key={sem}
              onPress={() =>
                setSelectedSemester(sem)
              }
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={
                  selectedSemester === sem
                    ? [colors.primary, colors.secondary]
                    : [colors.card, colors.card]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.semesterButton,
                  {
                    borderWidth: selectedSemester === sem ? 0 : 1,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      selectedSemester === sem
                        ? "#fff"
                        : colors.textDark,
                    fontWeight: "600",
                    fontSize: 14,
                  }}
                >
                  {sem === "All"
                    ? "📚 All"
                    : `📖 Sem ${sem}`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* STATS CARD */}

        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <LinearGradient
            colors={[`${colors.primary}10`, `${colors.secondary}05`]}
            style={styles.statsCardGradient}
          >
            <View style={styles.statsCardContent}>
              <View>
                <Text style={[styles.statsLabel, { color: colors.textLight }]}>
                  Showing
                </Text>
                <Text style={[styles.statsValue, { color: colors.primary }]}>
                  {filteredStudents.length}
                </Text>
                <Text style={[styles.statsLabel, { color: colors.textLight }]}>
                  Students
                </Text>
              </View>
              <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />
              <View>
                <Text style={[styles.statsLabel, { color: colors.textLight }]}>
                  Filter
                </Text>
                <Text style={[styles.statsFilter, { color: colors.textDark }]}>
                  {selectedSemester === "All" ? "All Semesters" : `Semester ${selectedSemester}`}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* LIST */}

        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={
            false
          }
          renderItem={({ item, index }) => (
            <StudentCard
              item={item}
              index={index}
              colors={colors}
              onPress={fetchStudentDetails}
            />
          )}
          contentContainerStyle={{
            paddingBottom: 40,
            paddingTop: 8,
          }}
          ListEmptyComponent={
            <View
              style={styles.emptyContainer}
            >
              <View style={[styles.emptyIconContainer, { backgroundColor: `${colors.textLight}10` }]}>
                <Ionicons
                  name="school-outline"
                  size={60}
                  color={colors.textLight}
                />
              </View>
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      colors.textLight,
                  },
                ]}
              >
                No Students Found
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  {
                    color:
                      colors.textLight + "80",
                  },
                ]}
              >
                Try adjusting your search or filter
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* MODAL */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor:
                  colors.background,
                transform: [
                  {
                    translateY:
                      modalAnim,
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[
                colors.primary,
                colors.secondary,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalHeader}
            >
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="person-circle" size={28} color="#fff" />
                <Text
                  style={styles.modalTitle}
                >
                  Student Details
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setModalVisible(false)
                }
                style={styles.modalCloseButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {attendanceLoading ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator
                    size="large"
                    color={colors.primary}
                  />
                  <Text style={[styles.modalLoadingText, { color: colors.textLight }]}>
                    Loading details...
                  </Text>
                </View>
              ) : (
                selectedStudent && (
                  <>
                    {/* Profile Header */}
                    <View style={styles.profileHeader}>
                      <LinearGradient
                        colors={[colors.primary, colors.secondary]}
                        style={styles.profileAvatar}
                      >
                        <Ionicons name="person" size={40} color="#fff" />
                      </LinearGradient>
                      <Text style={[styles.profileName, { color: colors.textDark }]}>
                        {selectedStudent.name}
                      </Text>
                      <View
                        style={[
                          styles.attendanceBadge,
                          { backgroundColor: getAttendanceColor(selectedStudent.attendancePercentage || 0) + "20" }
                        ]}
                      >
                        <View
                          style={[
                            styles.attendanceDot,
                            { backgroundColor: getAttendanceColor(selectedStudent.attendancePercentage || 0) }
                          ]}
                        />
                        <Text
                          style={[
                            styles.attendanceBadgeText,
                            { color: getAttendanceColor(selectedStudent.attendancePercentage || 0) }
                          ]}
                        >
                          {getAttendanceStatus(selectedStudent.attendancePercentage || 0)}
                        </Text>
                      </View>
                    </View>

                    {/* Info Sections */}
                    <View style={styles.infoSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="business-outline" size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                          Academic Information
                        </Text>
                      </View>
                      <InfoRow
                        icon="school-outline"
                        label="Department"
                        value={selectedStudent.department}
                        colors={colors}
                      />
                      <InfoRow
                        icon="book-outline"
                        label="Semester"
                        value={selectedStudent.semester}
                        colors={colors}
                      />
                      <InfoRow
                        icon="qr-code-outline"
                        label="Board Roll No"
                        value={selectedStudent.boardRollNo}
                        colors={colors}
                      />
                      <InfoRow
                        icon="grid-outline"
                        label="Class Roll No"
                        value={selectedStudent.classRollNo}
                        colors={colors}
                      />
                    </View>

                    <View style={styles.infoSection}>
                      <View style={styles.sectionHeader}>
                        <Ionicons name="call-outline" size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                          Contact Information
                        </Text>
                      </View>
                      <InfoRow
                        icon="call-outline"
                        label="Phone"
                        value={selectedStudent.phoneNo}
                        colors={colors}
                      />
                      <InfoRow
                        icon="people-outline"
                        label="Parent Phone"
                        value={selectedStudent.parentPhoneNo}
                        colors={colors}
                      />
                      <InfoRow
                        icon="mail-outline"
                        label="Email"
                        value={selectedStudent.gmail}
                        colors={colors}
                      />
                    </View>

                    {/* Attendance Section */}
                    {(selectedStudent.totalClasses !== undefined && selectedStudent.presentClasses !== undefined) && (
                      <View style={styles.infoSection}>
                        <View style={styles.sectionHeader}>
                          <Ionicons name="stats-chart-outline" size={20} color={colors.primary} />
                          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                            Attendance Overview
                          </Text>
                        </View>
                        
                        <View style={styles.attendanceStatsContainer}>
                          <View style={styles.attendanceStatCard}>
                            <Text style={[styles.attendanceStatValue, { color: colors.textDark }]}>
                              {selectedStudent.totalClasses}
                            </Text>
                            <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>
                              Total Classes
                            </Text>
                          </View>
                          <View style={styles.attendanceStatCard}>
                            <Text style={[styles.attendanceStatValue, { color: colors.textDark }]}>
                              {selectedStudent.presentClasses}
                            </Text>
                            <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>
                              Present
                            </Text>
                          </View>
                          <View style={styles.attendanceStatCard}>
                            <Text 
                              style={[
                                styles.attendanceStatValue, 
                                { color: getAttendanceColor(selectedStudent.attendancePercentage || 0) }
                              ]}
                            >
                              {selectedStudent.attendancePercentage}%
                            </Text>
                            <Text style={[styles.attendanceStatLabel, { color: colors.textLight }]}>
                              Percentage
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarContainer}>
                          <View 
                            style={[
                              styles.progressBar,
                              { 
                                width: `${selectedStudent.attendancePercentage || 0}%`,
                                backgroundColor: getAttendanceColor(selectedStudent.attendancePercentage || 0)
                              }
                            ]} 
                          />
                        </View>
                      </View>
                    )}
                  </>
                )
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ======================
// INFO ROW
// ======================

function InfoRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: any;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconContainer, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text
          style={[
            styles.infoLabel,
            { color: colors.textLight },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.infoValue,
            { color: colors.textDark },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ======================
// STYLES
// ======================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  themeToggle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },

  headerStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  headerSubtitle: {
    color: "#fff",
    fontSize: 14,
    opacity: 0.9,
  },

  headerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
    marginHorizontal: 8,
    opacity: 0.7,
  },

  content: {
    flex: 1,
    padding: 16,
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 52,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },

  semesterContainer: {
    gap: 10,
    paddingBottom: 20,
  },

  semesterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    overflow: "hidden",
  },

  statsCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  statsCardGradient: {
    padding: 16,
  },

  statsCardContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  statsLabel: {
    fontSize: 12,
    marginBottom: 4,
  },

  statsValue: {
    fontSize: 32,
    fontWeight: "bold",
  },

  statsFilter: {
    fontSize: 16,
    fontWeight: "600",
  },

  statsDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },

  studentCard: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  cardGradient: {
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  serialContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    overflow: "hidden",
  },

  serialGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  serialNumber: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },

  studentInfo: {
    flex: 1,
  },

  studentName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },

  studentDetail: {
    fontSize: 12,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },

  chevronContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },

  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },

  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  emptyText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "600",
  },

  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },

  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    overflow: "hidden",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },

  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },

  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBody: {
    padding: 20,
  },

  modalLoadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },

  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
  },

  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },

  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },

  attendanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
  },

  attendanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  attendanceBadgeText: {
    fontWeight: "600",
    fontSize: 13,
  },

  infoSection: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },

  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },

  infoValue: {
    fontSize: 15,
    fontWeight: "600",
  },

  attendanceStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },

  attendanceStatCard: {
    alignItems: "center",
  },

  attendanceStatValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },

  attendanceStatLabel: {
    fontSize: 12,
  },

  progressBarContainer: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
});