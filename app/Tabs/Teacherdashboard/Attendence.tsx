import {
    collection,
    doc,
    getDocs,
    query,
    where,
    writeBatch,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
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
  Name: string;
  rollNo: string;
  semester: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [attendanceSelections, setAttendanceSelections] = useState<any>({});
  const [attendanceSummary, setAttendanceSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(collection(db, "students"));
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[];
      setStudents(list);
    } catch (err) {
      console.error("fetchStudents error:", err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const snap = await getDocs(collection(db, "subjects"));
      const list = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];
      setSubjects(list);
      if (list.length > 0) setSelectedSubject(list[0]);
    } catch (err) {
      console.error("fetchSubjects error:", err);
    }
  };

  const fetchAttendanceSummary = useCallback(async () => {
    if (!selectedSubject) return;
    try {
      const q = query(
        collection(db, "attendance"),
        where("subjectId", "==", selectedSubject.id)
      );
      const snap = await getDocs(q);
      const records = snap.docs.map((d) => d.data());
      const summary: any = {};
      students.forEach((student) => {
        const studentRecords = records.filter((r: any) => r.studentId === student.id);
        const present = studentRecords.filter((r: any) => r.status === "present").length;
        const total = studentRecords.length;
        summary[student.id] = { present, total };
      });
      setAttendanceSummary(summary);
    } catch (err) {
      console.error("summary error:", err);
    }
  }, [selectedSubject, students]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchStudents();
      await fetchSubjects();
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    fetchAttendanceSummary();
  }, [fetchAttendanceSummary]);

  const markAttendance = (id: string, status: "present" | "absent") => {
    setAttendanceSelections((prev: any) => ({ ...prev, [id]: status }));
  };

  const submitAttendance = async () => {
    if (!user) {
      Alert.alert("User not logged in");
      return;
    }
    if (!selectedSubject) {
      Alert.alert("Select subject first");
      return;
    }
    if (Object.keys(attendanceSelections).length === 0) {
      Alert.alert("Mark attendance first");
      return;
    }

    setSubmitting(true);
    const date = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString();

    try {
      const batch = writeBatch(db);
      const todayQuery = query(
        collection(db, "attendance"),
        where("subjectId", "==", selectedSubject.id),
        where("date", "==", date)
      );
      const todaySnap = await getDocs(todayQuery);
      const existing: any = {};
      todaySnap.forEach((docSnap) => {
        existing[docSnap.data().studentId] = docSnap.id;
      });

      for (const [studentId, status] of Object.entries(attendanceSelections)) {
        const student = students.find((s) => s.id === studentId);
        if (!student) continue;
        if (existing[studentId]) {
          batch.update(doc(db, "attendance", existing[studentId]), {
            status,
            markedBy: user.uid,
            markedAt: timestamp,
          });
        } else {
          batch.set(doc(collection(db, "attendance")), {
            studentId,
            studentName: student.Name,
            subjectId: selectedSubject.id,
            subjectName: selectedSubject.name,
            date,
            status,
            markedBy: user.uid,
            markedAt: timestamp,
          });
        }
      }
      await batch.commit();
      Alert.alert("Attendance Saved ✅");
      setAttendanceSelections({});
      fetchAttendanceSummary();
    } catch (err) {
      console.error("Firebase Error:", err);
      Alert.alert("Error saving attendance");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textDark }]}>Attendance</Text>

      {/* Subjects horizontal list */}
      <FlatList
        horizontal
        data={subjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.subject,
              { backgroundColor: colors.card },
              selectedSubject?.id === item.id && { backgroundColor: colors.primary },
            ]}
            onPress={() => setSelectedSubject(item)}
          >
            <Text style={[styles.subjectText, { color: selectedSubject?.id === item.id ? "#fff" : colors.textDark }]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
      />

      {/* Students list */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const summary = attendanceSummary[item.id] || { present: 0, total: 0 };
          const percent = summary.total === 0 ? 0 : Math.round((summary.present / summary.total) * 100);
          return (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.name, { color: colors.textDark }]}>{item.Name}</Text>
              <Text style={{ color: colors.textLight }}>Roll: {item.rollNo}</Text>
              <Text style={{ color: colors.textLight }}>Attendance: {percent}%</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.present, attendanceSelections[item.id] === "present" && styles.selectedPresent]}
                  onPress={() => markAttendance(item.id, "present")}
                >
                  <Text style={styles.btnText}>Present</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.absent, attendanceSelections[item.id] === "absent" && styles.selectedAbsent]}
                  onPress={() => markAttendance(item.id, "absent")}
                >
                  <Text style={styles.btnText}>Absent</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.submit, { backgroundColor: colors.primary }]}
        onPress={submitAttendance}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  subject: { padding: 10, marginRight: 10, borderRadius: 10, marginBottom: 10 },
  subjectText: { fontWeight: "500" },
  card: { padding: 15, marginVertical: 5, borderRadius: 10, elevation: 2 },
  name: { fontSize: 16, fontWeight: "bold" },
  row: { flexDirection: "row", marginTop: 10 },
  present: { flex: 1, backgroundColor: "#4CAF50", padding: 10, marginRight: 5, borderRadius: 5, alignItems: "center" },
  absent: { flex: 1, backgroundColor: "#F44336", padding: 10, marginLeft: 5, borderRadius: 5, alignItems: "center" },
  selectedPresent: { backgroundColor: "#2E7D32" },
  selectedAbsent: { backgroundColor: "#C62828" },
  submit: { padding: 15, borderRadius: 10, alignItems: "center", marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});