import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../../../config/firebaseConfig.native";
import { useTheme } from "../../../../context/ThemeContext";

const { width, height } = Dimensions.get("window");

// ================= TYPES =================
interface AttendanceItem {
  id: string;
  date: string;
  subjectName: string;
  subjectCode: string;
  lectureNo: number;
  status: string;
}

interface Subject {
  id: string;
  subjectName: string;
  subjectCode?: string;
  [key: string]: any;
}

type SortOption = "newest" | "oldest";

export default function AttendancePage() {
  const router = useRouter();
  const { colors } = useTheme();

  // 🔥 TEMP STATIC STUDENT ID
  const studentId = "230810104011";

  // ================= STATES =================
  const [attendanceData, setAttendanceData] = useState<AttendanceItem[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date filter states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFilterModal, setDateFilterModal] = useState(false);
  
  // Subject dropdown modal
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);

  // ================= SORT FUNCTION =================
  const sortAttendanceData = (data: AttendanceItem[], sortBy: SortOption) => {
    const sorted = [...data];
    if (sortBy === "newest") {
      sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else {
      sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    return sorted;
  };

  // ================= FETCH SUBJECTS =================
  const fetchSubjects = async () => {
    try {
      const subjectsRef = collection(db, "subjects");
      const snapshot = await getDocs(subjectsRef);
      let subjectsList: Subject[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        subjectsList.push({
          id: doc.id,
          subjectName: data.subjectName || "Unknown Subject",
          subjectCode: data.subjectCode || "",
          ...data,
        });
      });
      
      // Sort subjects alphabetically
      subjectsList.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
      setSubjects(subjectsList);
      
      return subjectsList;
    } catch (error) {
      console.log("Error fetching subjects:", error);
      Alert.alert("Error", "Failed to fetch subjects list");
      return [];
    }
  };

  // ================= FETCH ATTENDANCE =================
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      
      // Fetch attendance records
      const q = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId)
      );
      const snapshot = await getDocs(q);
      let temp: AttendanceItem[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        temp.push({
          id: docSnap.id,
          date: data.date || "",
          subjectName: data.subjectName || "Unknown Subject",
          subjectCode: data.subjectCode || "",
          lectureNo: data.lectureNo || 1,
          status: data.status || "absent",
        });
      });

      // Sort by newest first initially
      temp.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAttendanceData(temp);
      setFilteredData(temp);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to fetch attendance");
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH ALL DATA =================
  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchSubjects(), fetchAttendance()]);
    setLoading(false);
  };

  // ================= INITIAL LOAD =================
  useEffect(() => {
    fetchAllData();
  }, []);

  // ================= REFRESH =================
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, []);

  // ================= FILTER, SORT, AND DATE FILTER =================
  useEffect(() => {
    let result = [...attendanceData];
    
    // Apply subject filter
    if (selectedSubject !== "All") {
      result = result.filter((item) => item.subjectName === selectedSubject);
    }
    
    // Apply date filter
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      result = result.filter((item) => item.date === dateString);
    }
    
    // Apply sorting
    result = sortAttendanceData(result, sortOption);
    
    setFilteredData(result);
  }, [selectedSubject, attendanceData, sortOption, selectedDate]);

  // ================= CLEAR DATE FILTER =================
  const clearDateFilter = () => {
    setSelectedDate(null);
    setDateFilterModal(false);
  };

  // ================= CLEAR ALL FILTERS =================
  const clearAllFilters = () => {
    setSelectedSubject("All");
    setSelectedDate(null);
    setSortOption("newest");
  };

  // ================= HANDLE DATE CHANGE =================
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setDateFilterModal(false);
    }
  };

  // ================= CALCULATIONS =================
  const totalClasses = filteredData.length;
  const presentClasses = filteredData.filter(
    (item) => String(item.status).toLowerCase() === "present"
  ).length;
  const absentClasses = totalClasses - presentClasses;
  const percentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
  const percentageColor = percentage >= 75 ? "#4CAF50" : percentage >= 50 ? "#FF9800" : "#F44336";

  // Get unique subjects from attendance data for filter options
  const attendanceSubjects = ["All", ...new Set(attendanceData.map(item => item.subjectName))];

  // ================= LOADING =================
  if (loading) {
    return (
      <LinearGradient
        colors={[colors.primary, colors.secondary || "#6B4EFF"]}
        style={styles.loader}
      >
        <Animated.View entering={ZoomIn}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loaderText}>Loading Attendance...</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  // ================= UI =================
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.secondary || "#6B4EFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView style={styles.headerSafeArea}>
          <Animated.View entering={FadeInDown} style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Attendance Overview</Text>
              <Text style={styles.headerSubtitle}>Track your academic progress</Text>
            </View>
            <TouchableOpacity onPress={clearAllFilters} style={styles.clearAllButton}>
              <Ionicons name="refresh-circle" size={28} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        style={styles.scrollView}
      >
        {/* Summary Cards */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.summaryContainer}>
          <LinearGradient
            colors={[percentageColor + "20", percentageColor + "10"]}
            style={[styles.mainCard, { borderLeftColor: percentageColor }]}
          >
            <View style={styles.percentageContainer}>
              <Text style={[styles.percentageText, { color: percentageColor }]}>
                {percentage.toFixed(1)}%
              </Text>
              <View
                style={[
                  styles.percentageCircle,
                  {
                    width: (percentage / 100) * 120,
                    backgroundColor: percentageColor + "40",
                  },
                ]}
              />
            </View>
            <Text style={styles.attendanceStatus}>
              {percentage >= 75
                ? "Excellent! 🎉"
                : percentage >= 50
                ? "Keep it up! 📚"
                : "Need Improvement ⚠️"}
            </Text>
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
              <Text style={[styles.statNumber, { color: colors.textDark }]}>{presentClasses}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Present</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name="close-circle" size={32} color="#F44336" />
              <Text style={[styles.statNumber, { color: colors.textDark }]}>{absentClasses}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Absent</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name="book" size={32} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.textDark }]}>{totalClasses}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Total</Text>
            </View>
          </View>
        </Animated.View>

        {/* Filter Section */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.filterSection}>
          {/* Subject Filter Dropdown */}
          <View style={styles.filterGroup}>
            <View style={styles.filterHeader}>
              <Ionicons name="book-outline" size={22} color={colors.primary} />
              <Text style={[styles.filterTitle, { color: colors.textDark }]}>Filter by Subject</Text>
              {subjects.length > 0 && (
                <Text style={[styles.subjectCount, { color: colors.textLight }]}>
                  ({subjects.length} subjects available)
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.dropdownButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowSubjectDropdown(true)}
            >
              <Text style={[styles.dropdownButtonText, { color: colors.textDark }]}>
                {selectedSubject}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Date Filter */}
          <View style={styles.filterGroup}>
            <View style={styles.filterHeader}>
              <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              <Text style={[styles.filterTitle, { color: colors.textDark }]}>Filter by Date</Text>
            </View>
            <View style={styles.dateFilterContainer}>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setDateFilterModal(true)}
              >
                <Ionicons name="calendar" size={20} color={colors.primary} />
                <Text style={[styles.dateButtonText, { color: colors.textDark }]}>
                  {selectedDate ? selectedDate.toLocaleDateString() : "Select Date"}
                </Text>
              </TouchableOpacity>
              {selectedDate && (
                <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: colors.card }]}
                  onPress={clearDateFilter}
                >
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterGroup}>
            <View style={styles.filterHeader}>
              <Ionicons name="swap-vertical" size={22} color={colors.primary} />
              <Text style={[styles.filterTitle, { color: colors.textDark }]}>Sort by Date</Text>
            </View>
            <View style={styles.sortButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  { backgroundColor: colors.card },
                  sortOption === "newest" && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSortOption("newest")}
              >
                <Ionicons 
                  name="arrow-down" 
                  size={18} 
                  color={sortOption === "newest" ? "#fff" : colors.textDark} 
                />
                <Text 
                  style={[
                    styles.sortButtonText, 
                    { color: sortOption === "newest" ? "#fff" : colors.textDark }
                  ]}
                >
                  Newest First
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  { backgroundColor: colors.card },
                  sortOption === "oldest" && { backgroundColor: colors.primary }
                ]}
                onPress={() => setSortOption("oldest")}
              >
                <Ionicons 
                  name="arrow-up" 
                  size={18} 
                  color={sortOption === "oldest" ? "#fff" : colors.textDark} 
                />
                <Text 
                  style={[
                    styles.sortButtonText, 
                    { color: sortOption === "oldest" ? "#fff" : colors.textDark }
                  ]}
                >
                  Oldest First
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Filters Display */}
          {(selectedSubject !== "All" || selectedDate) && (
            <View style={styles.activeFilters}>
              <Text style={[styles.activeFiltersTitle, { color: colors.textLight }]}>Active Filters:</Text>
              <View style={styles.filterChips}>
                {selectedSubject !== "All" && (
                  <View style={[styles.filterChip, { backgroundColor: colors.primary + "20" }]}>
                    <Ionicons name="book" size={14} color={colors.primary} />
                    <Text style={[styles.filterChipText, { color: colors.primary }]}>{selectedSubject}</Text>
                    <TouchableOpacity onPress={() => setSelectedSubject("All")}>
                      <Ionicons name="close-circle" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                {selectedDate && (
                  <View style={[styles.filterChip, { backgroundColor: colors.primary + "20" }]}>
                    <Ionicons name="calendar" size={14} color={colors.primary} />
                    <Text style={[styles.filterChipText, { color: colors.primary }]}>
                      {selectedDate.toLocaleDateString()}
                    </Text>
                    <TouchableOpacity onPress={clearDateFilter}>
                      <Ionicons name="close-circle" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Records Section */}
        <Animated.View entering={FadeInUp.delay(600)} style={styles.recordsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Records</Text>
            <Text style={[styles.recordCount, { color: colors.textLight }]}>{filteredData.length} entries</Text>
          </View>

          {filteredData.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="calendar-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No attendance records found</Text>
              {(selectedSubject !== "All" || selectedDate) && (
                <TouchableOpacity onPress={clearAllFilters} style={styles.resetButton}>
                  <Text style={[styles.resetButtonText, { color: colors.primary }]}>Clear all filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredData.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={SlideInRight.delay(index * 100)}
                style={[styles.recordCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.recordHeader}>
                  <View style={styles.subjectIcon}>
                    <Text style={styles.subjectInitial}>
                      {item.subjectName.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={[styles.subjectName, { color: colors.textDark }]}>
                      {item.subjectName}
                    </Text>
                    <Text style={[styles.lectureInfo, { color: colors.textLight }]}>
                      Lecture {item.lectureNo}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          String(item.status).toLowerCase() === "present"
                            ? "#4CAF50" + "20"
                            : "#F44336" + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        String(item.status).toLowerCase() === "present"
                          ? "checkmark"
                          : "close"
                      }
                      size={16}
                      color={
                        String(item.status).toLowerCase() === "present"
                          ? "#4CAF50"
                          : "#F44336"
                      }
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            String(item.status).toLowerCase() === "present"
                              ? "#4CAF50"
                              : "#F44336",
                        },
                      ]}
                    >
                      {String(item.status).toLowerCase() === "present"
                        ? "Present"
                        : "Absent"}
                    </Text>
                  </View>
                </View>
                <View style={styles.recordFooter}>
                  <Ionicons name="calendar" size={14} color={colors.textLight} />
                  <Text style={[styles.dateText, { color: colors.textLight }]}>
                    {new Date(item.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </Animated.View>
            ))
          )}
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Subject Dropdown Modal */}
      <Modal
        visible={showSubjectDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSubjectDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubjectDropdown(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Select Subject</Text>
              <TouchableOpacity onPress={() => setShowSubjectDropdown(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            
            {/* Search input for subjects */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textLight} />
              <Text style={[styles.searchText, { color: colors.textLight }]}>
                {subjects.length} subjects loaded from database
              </Text>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedSubject === "All" && { backgroundColor: colors.primary + "20" }
                ]}
                onPress={() => {
                  setSelectedSubject("All");
                  setShowSubjectDropdown(false);
                }}
              >
                <Text style={[styles.modalItemText, { color: colors.textDark }]}>All Subjects</Text>
                {selectedSubject === "All" && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={[
                    styles.modalItem,
                    selectedSubject === subject.subjectName && { backgroundColor: colors.primary + "20" }
                  ]}
                  onPress={() => {
                    setSelectedSubject(subject.subjectName);
                    setShowSubjectDropdown(false);
                  }}
                >
                  <View>
                    <Text style={[styles.modalItemText, { color: colors.textDark }]}>
                      {subject.subjectName}
                    </Text>
                    {subject.subjectCode && (
                      <Text style={[styles.modalItemSubtext, { color: colors.textLight }]}>
                        {subject.subjectCode}
                      </Text>
                    )}
                  </View>
                  {selectedSubject === subject.subjectName && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={dateFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDateFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDateFilterModal(false)}
        >
          <View style={[styles.datePickerModal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textDark }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setDateFilterModal(false)}>
                <Ionicons name="close" size={24} color={colors.textDark} />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              style={styles.datePicker}
              textColor={colors.textDark}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerSafeArea: {
    paddingTop: 50,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  clearAllButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    marginTop: -20,
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  mainCard: {
    borderRadius: 24,
    padding: 20,
    borderLeftWidth: 4,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  percentageContainer: {
    alignItems: "center",
    position: "relative",
  },
  percentageText: {
    fontSize: 48,
    fontWeight: "bold",
  },
  percentageCircle: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  attendanceStatus: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    textAlign: "center",
    marginTop: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  filterSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  subjectCount: {
    fontSize: 12,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  dropdownButtonText: {
    fontSize: 16,
  },
  dateFilterContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  dateButtonText: {
    fontSize: 16,
  },
  clearButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  clearButtonText: {
    color: "#F44336",
    fontSize: 14,
    fontWeight: "500",
  },
  sortButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  sortButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  activeFilters: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  activeFiltersTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  recordsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  recordCount: {
    fontSize: 12,
  },
  emptyState: {
    borderRadius: 16,
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  resetButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  recordCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6B4EFF20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  subjectInitial: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6B4EFF",
  },
  recordInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "600",
  },
  lectureInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  recordFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  dateText: {
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.7,
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  searchText: {
    fontSize: 14,
  },
  modalScroll: {
    maxHeight: height * 0.6,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalItemText: {
    fontSize: 16,
  },
  modalItemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  datePickerModal: {
    width: width * 0.9,
    borderRadius: 16,
    overflow: "hidden",
  },
  datePicker: {
    height: 200,
  },
});