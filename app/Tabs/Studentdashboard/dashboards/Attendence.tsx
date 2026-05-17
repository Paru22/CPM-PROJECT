import { useRouter } from "expo-router";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

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
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Picker } from "@react-native-picker/picker";

import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

import { db } from "../../../../config/firebaseConfig.native";

import { useTheme } from "../../../../context/ThemeContext";

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
  const [attendanceData, setAttendanceData] =
    useState<AttendanceItem[]>([]);

  const [filteredData, setFilteredData] =
    useState<AttendanceItem[]>([]);

  const [subjects, setSubjects] = useState<string[]>(
    []
  );

  const [selectedSubject, setSelectedSubject] =
    useState("All");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

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

          subjectName:
            data.subjectName || "Unknown Subject",

          subjectCode: data.subjectCode || "",

          lectureNo: data.lectureNo || 1,

          status: data.status || "absent",
        });

        subjectSet.add(data.subjectName);
      });

      // SORT BY DATE DESC
      temp.sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      );

      setAttendanceData(temp);

      setFilteredData(temp);

      setSubjects([
        "All",
        ...Array.from(subjectSet),
      ]);
    } catch (error) {
      console.log(error);

      Alert.alert(
        "Error",
        "Failed to fetch attendance"
      );
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
        attendanceData.filter(
          (item) =>
            item.subjectName === selectedSubject
        )
      );
    }
  }, [selectedSubject, attendanceData]);

  // ================= PERCENTAGE =================
  const totalClasses = filteredData.length;

  const presentClasses = filteredData.filter(
    (item) =>
      String(item.status).toLowerCase() ===
      "present"
  ).length;

  const absentClasses =
    totalClasses - presentClasses;

  const percentage =
    totalClasses > 0
      ? (
          (presentClasses / totalClasses) *
          100
        ).toFixed(1)
      : "0";

  // ================= LOADING =================
  if (loading) {
    return (
      <View
        style={[
          styles.loader,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  // ================= UI =================
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          {/* ================= TITLE ================= */}
          <Animated.Text
            entering={FadeIn}
            style={[
              styles.title,
              {
                color: colors.textDark,
              },
            ]}
          >
            📋 Attendance
          </Animated.Text>

          {/* ================= SUBJECT FILTER ================= */}
          <View
            style={[
              styles.pickerBox,
              {
                borderColor: colors.border,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Picker
              selectedValue={selectedSubject}
              onValueChange={(value) =>
                setSelectedSubject(value)
              }
              style={{
                color: colors.textDark,
              }}
            >
              {subjects.map((sub) => (
                <Picker.Item
                  key={sub}
                  label={sub}
                  value={sub}
                />
              ))}
            </Picker>
          </View>

          {/* ================= SUMMARY ================= */}
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.textDark,
              },
            ]}
          >
            📊 Attendance Summary
          </Text>

          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: colors.card,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 38,
                fontWeight: "bold",
                color:
                  Number(percentage) >= 75
                    ? "green"
                    : "red",
              }}
            >
              {percentage}%
            </Text>

            <View style={styles.summaryRow}>
              <Text
                style={{
                  color: "green",
                  fontWeight: "600",
                }}
              >
                ✅ Present: {presentClasses}
              </Text>

              <Text
                style={{
                  color: "red",
                  fontWeight: "600",
                }}
              >
                ❌ Absent: {absentClasses}
              </Text>
            </View>

            <Text
              style={{
                color: colors.textLight,
                marginTop: 10,
              }}
            >
              Total Classes: {totalClasses}
            </Text>
          </View>

          {/* ================= ATTENDANCE RECORDS ================= */}
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.textDark,
              },
            ]}
          >
            📚 Attendance Records
          </Text>

          {filteredData.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text
                style={{
                  color: colors.textLight,
                }}
              >
                No attendance records found
              </Text>
            </View>
          ) : (
            filteredData.map((item, index) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(
                  index * 50
                )}
                style={[
                  styles.attendanceCard,
                  {
                    backgroundColor: colors.card,
                  },
                ]}
              >
                {/* TOP ROW */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent:
                      "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    {/* SUBJECT */}
                    <Text
                      style={{
                        color: colors.textDark,
                        fontWeight: "bold",
                        fontSize: 17,
                      }}
                    >
                      📘 {item.subjectName}
                    </Text>

                    {/* LECTURE */}
                    <Text
                      style={{
                        color: colors.textLight,
                        marginTop: 6,
                      }}
                    >
                      🎓 Lecture No:{" "}
                      {item.lectureNo}
                    </Text>

                    {/* DATE */}
                    <Text
                      style={{
                        color: colors.textLight,
                        marginTop: 6,
                      }}
                    >
                      📅 {item.date}
                    </Text>
                  </View>

                  {/* STATUS */}
                  <View
                    style={[
                      styles.statusBox,
                      {
                        backgroundColor:
                          String(
                            item.status
                          ).toLowerCase() ===
                          "present"
                            ? "#d4edda"
                            : "#f8d7da",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontWeight: "bold",
                        color:
                          String(
                            item.status
                          ).toLowerCase() ===
                          "present"
                            ? "green"
                            : "red",
                      }}
                    >
                      {String(
                        item.status
                      ).toLowerCase() ===
                      "present"
                        ? "Present"
                        : "Absent"}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))
          )}

          {/* ================= BACK BUTTON ================= */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.backBtn,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },

  pickerBox: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },

  summaryCard: {
    padding: 22,
    borderRadius: 18,
    marginBottom: 25,
    alignItems: "center",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 12,
  },

  attendanceCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },

  statusBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  emptyBox: {
    alignItems: "center",
    marginVertical: 30,
  },

  backBtn: {
    padding: 15,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
  },
});