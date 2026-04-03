import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../config/firebaseConfig";
import { Calendar } from "react-native-calendars";

import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
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
      } catch (error) {
        Alert.alert("Error", "Failed to fetch attendance.");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [studentId]);

  // 📊 Data
  const totalClasses = attendanceData.length;
  const presentCount = attendanceData.filter(
    (i) => i.status === "Present"
  ).length;
  const absentCount = attendanceData.filter(
    (i) => i.status === "Absent"
  ).length;

  const percentage =
    totalClasses > 0 ? presentCount / totalClasses : 0;

  // 🎯 Animate progress
  useEffect(() => {
    progress.value = withTiming(percentage, { duration: 800 });
  }, [percentage]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  // 📅 Calendar
  const markedDates: any = {};
  attendanceData.forEach((item) => {
    markedDates[item.date] = {
      selected: true,
      selectedColor:
        item.status === "Present" ? "#4CAF50" : "#F44336",
    };
  });

  // ⏳ Loading
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fb" />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Animated.Text entering={FadeIn} style={styles.title}>
            📋 My Attendance
          </Animated.Text>

          {/* Summary */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: "#e3f2fd" }]}>
              <Text style={styles.summaryNumber}>{totalClasses}</Text>
              <Text>Total</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: "#d4edda" }]}>
              <Text style={styles.summaryNumber}>{presentCount}</Text>
              <Text>Present</Text>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: "#f8d7da" }]}>
              <Text style={styles.summaryNumber}>{absentCount}</Text>
              <Text>Absent</Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <Text style={styles.progressTitle}>📊 Attendance</Text>

            <View style={styles.progressBar}>
              <Animated.View
                style={[styles.progressFill, progressStyle]}
              />
            </View>

            <Text style={styles.percent}>
              {(percentage * 100).toFixed(2)}%
            </Text>
          </View>

          {/* Calendar */}
          <View style={styles.calendarBox}>
            <Calendar markedDates={markedDates} />
          </View>

          {/* List */}
          {attendanceData.map((item, index) => {
            const isPresent = item.status === "Present";

            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 80)}
                style={styles.card}
              >
                <View style={styles.row}>
                  <Text style={styles.date}>
                    📅 {new Date(item.date).toDateString()}
                  </Text>

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: isPresent
                          ? "#d4edda"
                          : "#f8d7da",
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

                <Text style={styles.subject}>📘 {item.subject}</Text>
              </Animated.View>
            );
          })}

          {/* Back */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>⬅ Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#f5f7fb",
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
  },

  summaryNumber: {
    fontSize: 20,
    fontWeight: "bold",
  },

  progressContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },

  progressTitle: { marginBottom: 10 },

  progressBar: {
    height: 10,
    backgroundColor: "#eee",
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
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  date: { color: "#555" },

  subject: { marginTop: 5, fontWeight: "600" },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },

  backButton: {
    backgroundColor: "#6c63ff",
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
