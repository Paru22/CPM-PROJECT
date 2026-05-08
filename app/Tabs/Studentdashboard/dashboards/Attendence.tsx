import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../../config/firebaseConfig.native";
import { useTheme } from "../../../../context/ThemeContext";
import { Picker } from "@react-native-picker/picker";

interface AttendanceItem {
  id: string;
  date: string;
  subjectName: string;
  subjectCode: string;
  status: "Present" | "Absent";
}

export default function AttendancePage() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();
  const { colors } = useTheme();

  const studentId = String(params.studentId || params.boardRollNo || "");

  const [attendanceData, setAttendanceData] = useState<AttendanceItem[]>([]);
  const [filteredData, setFilteredData] = useState<AttendanceItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [loading, setLoading] = useState(true);

  const fetchAttendance = useCallback(async () => {
    if (!studentId) {
      Alert.alert("Error", "No student identifier found");
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching attendance for studentId:", studentId);

      const q = query(
        collection(db, "attendance"),
        where("studentId", "==", studentId)
      );

      const snapshot = await getDocs(q);
      console.log("Attendance docs found:", snapshot.size);

      const temp: AttendanceItem[] = [];
      const subjectSet = new Set<string>();

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.date || !data.subjectName) return;

        const status = String(data.status).toLowerCase();
        const subjectLabel = data.subjectName + " (" + (data.subjectCode || "") + ")";

        temp.push({
          id: docSnap.id,
          date: data.date,
          subjectName: data.subjectName,
          subjectCode: data.subjectCode || "",
          status: status === "present" ? "Present" : "Absent",
        });

        subjectSet.add(subjectLabel);
      });

      temp.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAttendanceData(temp);
      setFilteredData(temp);
      setSubjects(["All", ...Array.from(subjectSet)]);
    } catch (err) {
      const error = err as any;
      console.error("Error fetching attendance:", error);
      Alert.alert("Error", "Failed to fetch attendance: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    if (selectedSubject === "All") {
      setFilteredData(attendanceData);
    } else {
      setFilteredData(
        attendanceData.filter(
          (i) => i.subjectName + " (" + i.subjectCode + ")" === selectedSubject
        )
      );
    }
  }, [selectedSubject, attendanceData]);

  const total = filteredData.length;
  const present = filteredData.filter((i) => i.status === "Present").length;
  const absent = filteredData.filter((i) => i.status === "Absent").length;
  const percentage = total > 0 ? (present / total) * 100 : 0;

  const markedDates: any = {};
  filteredData.forEach((item) => {
    if (!item.date) return;
    markedDates[item.date] = {
      selected: true,
      selectedColor: item.status === "Present" ? "#4CAF50" : "#F44336",
    };
  });

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: colors.textDark }]}>My Attendance</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.textDark }]}>{total}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Total</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: "#4CAF50" }]}>{present}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Present</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: "#F44336" }]}>{absent}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Absent</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[
              styles.statValue,
              { color: percentage >= 75 ? "#4CAF50" : "#F44336" }
            ]}>
              {percentage.toFixed(1)}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Percent</Text>
          </View>
        </View>

        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: percentage + "%" as any,
                backgroundColor: percentage >= 75 ? "#4CAF50" : percentage >= 60 ? "#FF9800" : "#F44336",
              },
            ]}
          />
        </View>

        <View style={[styles.pickerBox, { borderColor: colors.border }]}>
          <Picker
            selectedValue={selectedSubject}
            onValueChange={(value) => setSelectedSubject(value)}
            style={{ color: colors.textDark }}
          >
            {subjects.map((sub) => (
              <Picker.Item key={sub} label={sub} value={sub} />
            ))}
          </Picker>
        </View>

        <Calendar
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.card,
            textSectionTitleColor: colors.textDark,
            dayTextColor: colors.textDark,
            todayTextColor: colors.primary,
          }}
        />

        <Text style={[styles.listTitle, { color: colors.textDark }]}>Attendance Records</Text>

        {filteredData.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>No attendance records found</Text>
          </View>
        ) : (
          filteredData.map((item) => (
            <View key={item.id} style={[styles.attendanceCard, { backgroundColor: colors.card }]}>
              <View style={styles.attendanceCardHeader}>
                <Text style={[styles.dateText, { color: colors.textDark }]}>
                  {new Date(item.date).toDateString()}
                </Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === "Present" ? "#E8F5E9" : "#FFEBEE" }
                ]}>
                  <Text style={{
                    color: item.status === "Present" ? "#4CAF50" : "#F44336",
                    fontWeight: "bold",
                    fontSize: 12,
                  }}>
                    {item.status}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subjectText, { color: colors.textLight }]}>
                {item.subjectName} ({item.subjectCode})
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 15, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 15 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 15 },
  statCard: {
    flex: 1, alignItems: "center", padding: 10, borderRadius: 12, elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: "bold" },
  statLabel: { fontSize: 10, marginTop: 2 },
  progressBar: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 15 },
  progressFill: { height: "100%", borderRadius: 4 },
  pickerBox: { borderWidth: 1, borderRadius: 10, marginBottom: 15, overflow: "hidden" },
  listTitle: { fontSize: 18, fontWeight: "bold", marginTop: 15, marginBottom: 10 },
  attendanceCard: {
    borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1,
  },
  attendanceCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
  },
  dateText: { fontSize: 14, fontWeight: "600" },
  statusBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  subjectText: { fontSize: 13 },
  emptyContainer: { padding: 30, borderRadius: 12, alignItems: "center" },
  emptyText: { fontSize: 14 },
  backBtn: {
    padding: 14, alignItems: "center", borderRadius: 12, marginTop: 20,
  },
});