import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

interface Student {
  id: string;
  Name: string;
}

export default function TeacherMarksPage() {
  const router = useRouter();
  const params = useLocalSearchParams() as { teacherId?: string };
  const teacherId = (params?.teacherId as string) ?? "TCH001";
  const { colors, theme, toggleTheme } = useTheme();

  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [marksObtained, setMarksObtained] = useState<string>("");
  const [outOf, setOutOf] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsCollection = collection(db, "students");
        const snapshot = await getDocs(studentsCollection);

        const list: Student[] = snapshot.docs.map((d) => ({
          id: d.id,
          Name: d.data().Name ?? "Unknown",
        }));

        setStudents(list);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    const fetchTeacher = async () => {
      try {
        const teacherRef = doc(db, "teachers", teacherId);
        const snap = await getDoc(teacherRef);

        if (!snap.exists()) {
          Alert.alert("Error", "Teacher not found");
          return;
        }

        const data = snap.data();
        const subs = Object.keys(data)
          .filter((k) => k.toLowerCase().startsWith("subject"))
          .map((k) => data[k])
          .filter(Boolean);

        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0]);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Failed to load subjects");
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchTeacher();
  }, [teacherId]);

  const calculateGrade = (p: number) => {
    if (p >= 90) return "A+";
    if (p >= 80) return "A";
    if (p >= 70) return "B+";
    if (p >= 60) return "B";
    return "C";
  };

  const openModalForStudent = (student: Student) => {
    setSelectedStudent(student);
    setMarksObtained("");
    setOutOf("");
    if (subjects.length > 0) setSelectedSubject(subjects[0]);
    setModalVisible(true);
  };

  const handleUpdateMarks = async () => {
    if (!selectedStudent) return;

    const m = parseFloat(marksObtained);
    const o = parseFloat(outOf);

    if (isNaN(m) || isNaN(o) || o <= 0) {
      Alert.alert("Error", "Enter valid numbers");
      return;
    }

    if (m < 0 || m > o) {
      Alert.alert("Error", "Marks cannot exceed Out Of");
      return;
    }

    const percentage = +((m / o) * 100).toFixed(2);
    const grade = calculateGrade(percentage);

    setUpdating(true);

    try {
      const studentRef = doc(db, "students", selectedStudent.id);
      const fieldPath = `marks.${selectedSubject}`;

      await updateDoc(studentRef, {
        [fieldPath]: {
          marks: m,
          outOf: o,
          percentage,
          grade,
          updatedBy: teacherId,
          updatedAt: new Date().toISOString(),
        },
      });

      Alert.alert("Success", "Marks updated");
      setModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  const renderStudent = ({ item }: { item: Student }) => (
    <TouchableOpacity
      style={[styles.studentItem, { backgroundColor: colors.card }]}
      onPress={() => openModalForStudent(item)}
    >
      <Text style={[styles.studentText, { color: colors.textDark }]}>ID: {item.id}</Text>
      <Text style={[styles.studentText, { color: colors.textDark }]}>Name: {item.Name}</Text>
    </TouchableOpacity>
  );

  if (loadingStudents || loadingSubjects) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textDark }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Gradient, Back Button, Theme Toggle */}
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>📊 Update Student Marks</Text>
            <Text style={styles.headerSubtitle}>Enter marks and grades</Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              style={{ width: "100%" }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.textDark }]}>
                  {selectedStudent?.Name}
                </Text>

                <Text style={[styles.label, { color: colors.textDark }]}>Subject</Text>
                <View style={[styles.pickerWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <Picker
                    selectedValue={selectedSubject}
                    onValueChange={(v) => setSelectedSubject(v)}
                    dropdownIconColor={colors.primary}
                  >
                    {subjects.map((sub) => (
                      <Picker.Item key={sub} label={sub} value={sub} color={colors.textDark} />
                    ))}
                  </Picker>
                </View>

                <Text style={[styles.label, { color: colors.textDark }]}>Marks Obtained</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textDark }]}
                  placeholder="e.g. 80"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={marksObtained}
                  onChangeText={setMarksObtained}
                />

                <Text style={[styles.label, { color: colors.textDark }]}>Out Of</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.textDark }]}
                  placeholder="e.g. 100"
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={outOf}
                  onChangeText={setOutOf}
                />

                <View style={styles.calculationRow}>
                  <Text style={[styles.calcText, { color: colors.textDark }]}>
                    %
                    {marksObtained && outOf
                      ? (
                          (Number(marksObtained) / Number(outOf)) *
                          100
                        ).toFixed(2)
                      : "-"}
                  </Text>

                  <Text style={[styles.calcText, { color: colors.textDark }]}>
                    Grade:{" "}
                    {marksObtained && outOf
                      ? calculateGrade(
                          (Number(marksObtained) / Number(outOf)) * 100
                        )
                      : "-"}
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton, { backgroundColor: colors.secondary }]}
                    onPress={() => setModalVisible(false)}
                    disabled={updating}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.updateButton, { backgroundColor: colors.primary }]}
                    onPress={handleUpdateMarks}
                    disabled={updating}
                  >
                    <Text style={styles.buttonText}>
                      {updating ? "Saving..." : "Save Marks"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    marginTop: 2,
  },
  studentItem: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 4,
    boxShadow: "0px 2px 6px rgba(0,0,0,0.1)",
  },
  studentText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    padding: 20,
    borderRadius: 18,
    elevation: 5,
    boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  label: {
    marginTop: 14,
    fontWeight: "700",
    fontSize: 14,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    fontSize: 15,
  },
  pickerWrapper: {
    borderWidth: 1.5,
    borderRadius: 10,
    marginTop: 6,
    overflow: "hidden",
  },
  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingHorizontal: 4,
  },
  calcText: {
    fontWeight: "800",
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 6,
    elevation: 3,
  },
  cancelButton: {},
  updateButton: {},
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.4,
  },
});