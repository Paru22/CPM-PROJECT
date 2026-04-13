import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../../config/firebaseConfig.native";
import { useTheme } from "../../../../context/ThemeContext"; // adjust path

import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

interface AttendanceItem {
  id: string;
  date: string;
  subject: string;
  status: "Present" | "Absent";
}

export default function AttendancePage() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams();
  const { colors } = useTheme();

  const [attendanceData, setAttendanceData] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const progress = useSharedValue(0);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!studentId) {
        Alert.alert("Error", "No student ID provided.");
        setLoading(false);
        return;
      }

      try {
        const studentDocRef = doc(db, "students", studentId as string);
        const studentDocSnap = await getDoc(studentDocRef);

        if (studentDocSnap.exists()) {
          const data = studentDocSnap.data();
          const attendanceMap = data.attendance || {};

          const dataArray: AttendanceItem[] = Object.entries(
            attendanceMap
          ).map(([date, status], index) => {
            const normalized = String(status).trim().toLowerCase();

            return {
              id: `${studentId}-${index}`,
              date,
              subject: "General",
              status: normalized === "present" ? "Present" : "Absent",
            };
          });

          setAttendanceData(dataArray);
        }
      } catch {
  Alert.alert("Error", "Failed to fetch attendance.");
}finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [studentId]);

  // Data
  const totalClasses = attendanceData.length;
  const presentCount = attendanceData.filter(
    (i) => i.status === "Present"
  ).length;
  const absentCount = attendanceData.filter(
    (i) => i.status === "Absent"
  ).length;

  const percentage =
    totalClasses > 0 ? presentCount / totalClasses : 0;

  // Animate progress
  useEffect(() => {
    progress.value = withTiming(percentage, { duration: 800 });
  }, [percentage, progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  // Calendar marked dates
  const markedDates: any = {};
  attendanceData.forEach((item) => {
    markedDates[item.date] = {
      selected: true,
      selectedColor:
        item.status === "Present" ? "#4CAF50" : "#F44336",
    };
  });

  // Loading
  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textDark }}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.background === "#C7D8E9" ? "dark-content" : "light-content"} backgroundColor={colors.background} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Animated.Text entering={FadeIn} style={[styles.title, { color: colors.textDark }]}>
            📋 My Attendance
          </Animated.Text>

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.summaryNumber, { color: colors.textDark }]}>{totalClasses}</Text>
              <Text style={{ color: colors.textLight }}>Total</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.summaryNumber, { color: colors.textDark }]}>{presentCount}</Text>
              <Text style={{ color: colors.textLight }}>Present</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.summaryNumber, { color: colors.textDark }]}>{absentCount}</Text>
              <Text style={{ color: colors.textLight }}>Absent</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.progressTitle, { color: colors.textDark }]}>📊 Attendance</Text>

            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>

            <Text style={[styles.percent, { color: colors.textDark }]}>
              {(percentage * 100).toFixed(2)}%
            </Text>
          </View>

          {/* Calendar */}
          <View style={[styles.calendarBox, { backgroundColor: colors.card }]}>
            <Calendar
              markedDates={markedDates}
              theme={{
                calendarBackground: colors.card,
                textSectionTitleColor: colors.textDark,
                dayTextColor: colors.textDark,
                todayTextColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: "#fff",
                monthTextColor: colors.textDark,
                arrowColor: colors.primary,
              }}
            />
          </View>

          {/* Attendance List */}
          {attendanceData.map((item, index) => {
            const isPresent = item.status === "Present";

            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 80)}
                style={[styles.card, { backgroundColor: colors.card }]}
              >
                <View style={styles.row}>
                  <Text style={[styles.date, { color: colors.textLight }]}>
                    📅 {new Date(item.date).toDateString()}
                  </Text>

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: isPresent ? "#d4edda" : "#f8d7da",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isPresent ? "green" : "red",
                        fontWeight: "bold",
                      }}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.subject, { color: colors.textDark }]}>📘 {item.subject}</Text>
              </Animated.View>
            );
          })}

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>⬅ Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Styles – no deprecated shadow* or textShadow* props
const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  summaryCard: {
    flex: 1,
    margin: 5,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    // no shadow* props – using elevation only for Android, no deprecation warnings
    elevation: 2,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: "bold",
  },
  progressContainer: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  progressTitle: {
    marginBottom: 10,
  },
  progressBar: {
    height: 10,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
  },
  percent: {
    textAlign: "center",
    marginTop: 8,
    fontWeight: "bold",
  },
  calendarBox: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    elevation: 2,
  },
  card: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  date: {
    // no textShadow
  },
  subject: {
    marginTop: 5,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  backButton: {
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },
  backText: {
    color: "#fff",
    fontWeight: "bold",
  },
});