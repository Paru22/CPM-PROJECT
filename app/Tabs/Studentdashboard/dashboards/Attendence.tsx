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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  ZoomIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
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

export default function AttendancePage() {
  const router = useRouter();
  const { colors } = useTheme();

  // 🔥 TEMP STATIC STUDENT ID
  const studentId = "230810104011";

  // ================= STATES =================
  const [attendanceData, setAttendanceData] = useState<AttendanceItem[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ================= FETCH ATTENDANCE =================
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId)
      );
      const snapshot = await getDocs(q);
      let temp: AttendanceItem[] = [];
      let subjectSet = new Set<string>();

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
        subjectSet.add(data.subjectName);
      });

      temp.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setAttendanceData(temp);
      setFilteredData(temp);
      setSubjects(["All", ...Array.from(subjectSet)]);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to fetch attendance");
    } finally {
      setLoading(false);
    }
  };

  // ================= INITIAL LOAD =================
  useEffect(() => {
    fetchAttendance();
  }, []);

  // ================= REFRESH =================
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAttendance();
    setRefreshing(false);
  }, []);

  // ================= FILTER =================
  useEffect(() => {
    if (selectedSubject === "All") {
      setFilteredData(attendanceData);
    } else {
      setFilteredData(
        attendanceData.filter((item) => item.subjectName === selectedSubject)
      );
    }
  }, [selectedSubject, attendanceData]);

  // ================= CALCULATIONS =================
  const totalClasses = filteredData.length;
  const presentClasses = filteredData.filter(
    (item) => String(item.status).toLowerCase() === "present"
  ).length;
  const absentClasses = totalClasses - presentClasses;
  const percentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;
  const percentageColor = percentage >= 75 ? "#4CAF50" : percentage >= 50 ? "#FF9800" : "#F44336";

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
            <View style={styles.placeholderIcon} />
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
          <View style={styles.filterHeader}>
            <Ionicons name="filter" size={22} color={colors.primary} />
            <Text style={[styles.filterTitle, { color: colors.textDark }]}>Filter by Subject</Text>
          </View>
          <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Picker
              selectedValue={selectedSubject}
              onValueChange={(value) => setSelectedSubject(value)}
              dropdownIconColor={colors.primary}
              style={[styles.picker, { color: colors.textDark }]}
            >
              {subjects.map((sub) => (
                <Picker.Item key={sub} label={sub} value={sub} />
              ))}
            </Picker>
          </View>
        </Animated.View>

        {/* Records Section */}
        <Animated.View entering={FadeInUp.delay(600)} style={styles.recordsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Recent Records</Text>
            <Text style={[styles.recordCount, { color: colors.textLight }]}>{filteredData.length} entries</Text>
          </View>

          {filteredData.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Ionicons name="calendar-outline" size={64} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textLight }]}>No attendance records found</Text>
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
  placeholderIcon: {
    width: 40,
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
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    height: 50,
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
});