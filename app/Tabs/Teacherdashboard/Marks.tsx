import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter , useLocalSearchParams  } from "expo-router";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { Picker } from "@react-native-picker/picker";
import { db } from "../../../config/firebaseConfig";
import  Colors  from "../../../assets/images/colors";

interface Student {
  id: string;
  Name: string;
}

export default function TeacherMarksPage() {
  const router = useRouter();
  const params = useLocalSearchParams() as { teacherId?: string };
  const teacherId = (params?.teacherId as string) ?? "TCH001";

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
      style={styles.studentItem}
      onPress={() => openModalForStudent(item)}
    >
      <Text style={styles.studentText}>ID: {item.id}</Text>
      <Text style={styles.studentText}>Name: {item.Name}</Text>
    </TouchableOpacity>
  );

  if (loadingStudents || loadingSubjects) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Update Student Marks</Text>

      <FlatList
        data={students}
        renderItem={renderStudent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              style={{ width: "100%" }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>
                  {selectedStudent?.Name}
                </Text>

                <Text style={styles.label}>Subject</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedSubject}
                    onValueChange={(v) => setSelectedSubject(v)}
                  >
                    {subjects.map((sub) => (
                      <Picker.Item key={sub} label={sub} value={sub} />
                    ))}
                  </Picker>
                </View>

                <Text style={styles.label}>Marks Obtained</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 80"
                  keyboardType="numeric"
                  value={marksObtained}
                  onChangeText={setMarksObtained}
                />

                <Text style={styles.label}>Out Of</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 100"
                  keyboardType="numeric"
                  value={outOf}
                  onChangeText={setOutOf}
                />

                <View style={styles.calculationRow}>
                  <Text style={styles.calcText}>
                    %
                    {marksObtained && outOf
                      ? (
                          (Number(marksObtained) / Number(outOf)) *
                          100
                        ).toFixed(2)
                      : "-"}
                  </Text>

                  <Text style={styles.calcText}>
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
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                    disabled={updating}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.updateButton]}
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
  container: { 
    flex: 1, 
    backgroundColor: Colors.background, 
    padding: 16 
  },

  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textDark,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.5,
  },

  studentItem: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  studentText: { 
    fontSize: 16, 
    fontWeight: "600",
    color: Colors.textDark,
    marginBottom: 3,
  },

  backButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
  },

  backButtonText: {
    color: Colors.card,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
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
    backgroundColor: Colors.card,
    padding: 20,
    borderRadius: 18,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
    color: Colors.textDark,
  },

  label: { 
    marginTop: 14, 
    fontWeight: "700", 
    color: Colors.textDark,
    fontSize: 14,
  },

  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    fontSize: 15,
    backgroundColor: "#f9faff",
  },

  pickerWrapper: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: 6,
    overflow: "hidden",
    backgroundColor: "#f9faff",
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
    color: Colors.textDark,
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

  cancelButton: { 
    backgroundColor: Colors.secondary 
  },

  updateButton: { 
    backgroundColor: Colors.primary 
  },

  buttonText: { 
    color: Colors.card, 
    fontWeight: "800", 
    fontSize: 15,
    letterSpacing: 0.4,
  },
});
