import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  setDoc,
  addDoc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../../config/firebaseConfig.native";

export default function SubjectManagementModal({
  visible,
  onClose,
  department,
  onSubjectsUpdated,
}: any) {

  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState("");

  const [selectedDeleteSubjectId, setSelectedDeleteSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedAssignSubjectId, setSelectedAssignSubjectId] = useState("");

  const [activeTab, setActiveTab] = useState<"add" | "delete" | "assign" | "view">("add");

  // ================= LOAD DATA =================
  const loadData = async () => {
    setLoading(true);
    try {
      const subSnap = await getDocs(
        query(collection(db, "subjects"), where("department", "==", department))
      );

      const subList = subSnap.docs.map((d) => ({
        id: d.id,
        subjectCode: d.id,
        ...d.data(),
      }));

      setSubjects(subList);

      const teacherSnap = await getDocs(
        query(collection(db, "teachers"), where("department", "==", department))
      );
      setTeachers(
        teacherSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );

      const assignSnap = await getDocs(
        query(collection(db, "teacherSubjects"), where("department", "==", department))
      );
      setAssignedSubjects(
        assignSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch (err) {
      const error = err as any;
      console.log(error);
      Alert.alert("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) loadData();
  }, [visible, department]);

  // ================= ADD SUBJECT =================
  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !newSubjectSemester.trim()) {
      Alert.alert("Fill all fields");
      return;
    }

    const sem = parseInt(newSubjectSemester);
    if (isNaN(sem) || sem < 1 || sem > 6) {
      Alert.alert("Invalid Semester", "Semester must be between 1 and 6");
      return;
    }

    const deptPrefix = department.substring(0, 3).toUpperCase();
    const randomNum = String(Math.floor(Math.random() * 9000) + 1000);
    const subjectCode = deptPrefix + sem + randomNum;

    setLoading(true);

    try {
      const existingDoc = await getDocs(
        query(collection(db, "subjects"), where("subjectCode", "==", subjectCode))
      );

      if (!existingDoc.empty) {
        const newCode = deptPrefix + sem + String(Math.floor(Math.random() * 9000) + 1000);
        await setDoc(doc(db, "subjects", newCode), {
          subjectName: newSubjectName.trim(),
          name: newSubjectName.trim(),
          subjectCode: newCode,
          semester: sem,
          department,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        Alert.alert("Success", "Subject added with code: " + newCode);
      } else {
        await setDoc(doc(db, "subjects", subjectCode), {
          subjectName: newSubjectName.trim(),
          name: newSubjectName.trim(),
          subjectCode: subjectCode,
          semester: sem,
          department,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        Alert.alert("Success", "Subject added with code: " + subjectCode);
      }

      setNewSubjectName("");
      setNewSubjectSemester("");
      loadData();
      if (onSubjectsUpdated) onSubjectsUpdated();

    } catch (err) {
      const error = err as any;
      console.log(error);
      Alert.alert("Error", "Failed to add subject");
    } finally {
      setLoading(false);
    }
  };

  // ================= DELETE SUBJECT =================
  const handleDeleteSubject = async () => {
    if (!selectedDeleteSubjectId) {
      Alert.alert("Error", "Select a subject to delete");
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "This will also remove all teacher assignments for this subject. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, "subjects", selectedDeleteSubjectId));

              const assignQuery = query(
                collection(db, "teacherSubjects"),
                where("subjectId", "==", selectedDeleteSubjectId)
              );
              const assignSnap = await getDocs(assignQuery);

              await Promise.all(
                assignSnap.docs.map((d) => deleteDoc(doc(db, "teacherSubjects", d.id)))
              );

              Alert.alert("Deleted", "Subject and all assignments removed");
              setSelectedDeleteSubjectId("");
              loadData();
              if (onSubjectsUpdated) onSubjectsUpdated();

            } catch (err) {
              const error = err as any;
              console.log(error);
              Alert.alert("Error", "Delete failed");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ================= ASSIGN SUBJECT TO TEACHER =================
  const handleAssign = async () => {
    if (!selectedTeacherId || !selectedAssignSubjectId) {
      Alert.alert("Error", "Select both teacher and subject");
      return;
    }

    const alreadyAssigned = assignedSubjects.find(
      (a) => a.teacherId === selectedTeacherId && a.subjectId === selectedAssignSubjectId
    );

    if (alreadyAssigned) {
      Alert.alert("Already Assigned", "This subject is already assigned to this teacher");
      return;
    }

    setLoading(true);

    try {
      const teacher = teachers.find((t) => t.id === selectedTeacherId);
      const subject = subjects.find((s) => s.id === selectedAssignSubjectId);

      await addDoc(collection(db, "teacherSubjects"), {
        teacherId: selectedTeacherId,
        teacherName: teacher?.name || teacher?.Name || "Unknown",
        subjectId: subject?.subjectCode || selectedAssignSubjectId,
        subjectName: subject?.subjectName || subject?.name || "",
        subjectCode: subject?.subjectCode || selectedAssignSubjectId,
        semester: subject?.semester || "",
        department,
        assignedAt: new Date().toISOString(),
      });

      Alert.alert("Success", "Subject assigned to teacher");

      setSelectedTeacherId("");
      setSelectedAssignSubjectId("");
      loadData();
      if (onSubjectsUpdated) onSubjectsUpdated();

    } catch (err) {
      const error = err as any;
      console.log(error);
      Alert.alert("Error", "Assign failed");
    } finally {
      setLoading(false);
    }
  };

  // ================= UNASSIGN SUBJECT =================
  const handleUnassign = async (assignmentId: string) => {
    Alert.alert("Remove Assignment", "Remove this teacher assignment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setLoading(true);
          try {
            await deleteDoc(doc(db, "teacherSubjects", assignmentId));
            Alert.alert("Removed", "Teacher assignment removed");
            loadData();
          } catch (err) {
            const error = err as any;
            console.log(error);
            Alert.alert("Error", "Failed to remove");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ================= UI =================
  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Subject Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <Text style={styles.departmentText}>Department: {department}</Text>

        {loading && (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginVertical: 10 }} />
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "add" && styles.activeTab]}
            onPress={() => setActiveTab("add")}
          >
            <Ionicons name="add-circle-outline" size={16} color={activeTab === "add" ? "#fff" : "#666"} />
            <Text style={[styles.tabText, activeTab === "add" && styles.activeTabText]}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "delete" && styles.activeTabDelete]}
            onPress={() => setActiveTab("delete")}
          >
            <Ionicons name="trash-outline" size={16} color={activeTab === "delete" ? "#fff" : "#666"} />
            <Text style={[styles.tabText, activeTab === "delete" && styles.activeTabText]}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "assign" && styles.activeTab]}
            onPress={() => setActiveTab("assign")}
          >
            <Ionicons name="link-outline" size={16} color={activeTab === "assign" ? "#fff" : "#666"} />
            <Text style={[styles.tabText, activeTab === "assign" && styles.activeTabText]}>Assign</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "view" && styles.activeTab]}
            onPress={() => setActiveTab("view")}
          >
            <Ionicons name="eye-outline" size={16} color={activeTab === "view" ? "#fff" : "#666"} />
            <Text style={[styles.tabText, activeTab === "view" && styles.activeTabText]}>View</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ===== ADD SUBJECT TAB ===== */}
          {activeTab === "add" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Add New Subject</Text>

              <Text style={styles.label}>Subject Name *</Text>
              <TextInput
                placeholder="e.g., Database Management Systems"
                style={styles.input}
                value={newSubjectName}
                onChangeText={setNewSubjectName}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Semester *</Text>
              <TextInput
                placeholder="Enter semester (1-6)"
                style={styles.input}
                value={newSubjectSemester}
                onChangeText={setNewSubjectSemester}
                keyboardType="numeric"
                maxLength={1}
                placeholderTextColor="#999"
              />

              <TouchableOpacity style={styles.addBtn} onPress={handleAddSubject} disabled={loading}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.btnText}>Add Subject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ===== DELETE SUBJECT TAB ===== */}
          {activeTab === "delete" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delete Subject</Text>

              {subjects.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="document-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>No subjects found</Text>
                </View>
              ) : (
                subjects.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSelectedDeleteSubjectId(s.id)}
                    style={[
                      styles.card,
                      selectedDeleteSubjectId === s.id && styles.selectedCardDelete,
                    ]}
                  >
                    <View style={styles.cardContent}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{s.subjectName || s.name}</Text>
                        <Text style={styles.cardSub}>Code: {s.subjectCode} | Sem: {s.semester}</Text>
                      </View>
                      {selectedDeleteSubjectId === s.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#F44336" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {selectedDeleteSubjectId && (
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSubject} disabled={loading}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Delete Selected Subject</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ===== ASSIGN TAB ===== */}
          {activeTab === "assign" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assign Subject to Teacher</Text>

              <Text style={styles.label}>Select Teacher</Text>
              {teachers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="person-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>No teachers in this department</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {teachers.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => setSelectedTeacherId(t.id)}
                      style={[
                        styles.card,
                        selectedTeacherId === t.id && styles.selectedCard,
                      ]}
                    >
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{t.name || t.Name}</Text>
                        <Text style={styles.cardSub}>{t.designation || t.role || ""}</Text>
                        {selectedTeacherId === t.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <Text style={[styles.label, { marginTop: 15 }]}>Select Subject</Text>
              {subjects.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="book-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>No subjects available</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {subjects.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedAssignSubjectId(s.id)}
                      style={[
                        styles.card,
                        selectedAssignSubjectId === s.id && styles.selectedCard,
                      ]}
                    >
                      <View style={styles.cardContent}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{s.subjectName || s.name}</Text>
                          <Text style={styles.cardSub}>Code: {s.subjectCode} | Sem: {s.semester}</Text>
                        </View>
                        {selectedAssignSubjectId === s.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {selectedTeacherId && selectedAssignSubjectId && (
                <TouchableOpacity style={styles.addBtn} onPress={handleAssign} disabled={loading}>
                  <Ionicons name="link-outline" size={20} color="#fff" />
                  <Text style={styles.btnText}>Assign Subject to Teacher</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ===== VIEW ASSIGNMENTS TAB ===== */}
          {activeTab === "view" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Assignments</Text>

              {assignedSubjects.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="link-outline" size={40} color="#ccc" />
                  <Text style={styles.emptyText}>No assignments yet</Text>
                </View>
              ) : (
                assignedSubjects.map((a) => (
                  <View key={a.id} style={styles.card}>
                    <View style={styles.cardContent}>
                      <View style={{ flex: 1 }}>  
                        <Text style={styles.cardTitle}>{a.subjectName}</Text>
                        <Text style={styles.cardSub}>Teacher: {a.teacherName}</Text>
                        <Text style={styles.cardSub}>Code: {a.subjectCode} | Sem: {a.semester}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleUnassign(a.id)}
                        style={styles.unassignBtn}
                      >
                        <Ionicons name="close-circle" size={24} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#333" },
  closeBtn: { padding: 5 },
  departmentText: {
    textAlign: "center",
    padding: 10,
    fontSize: 14,
    color: "#666",
    backgroundColor: "#fff",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    gap: 4,
  },
  activeTab: { backgroundColor: "#4CAF50" },
  activeTabDelete: { backgroundColor: "#F44336" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#666" },
  activeTabText: { color: "#fff" },
  content: { flex: 1, padding: 15 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 5, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#333",
  },
  addBtn: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    elevation: 2,
  },
  deleteBtn: {
    backgroundColor: "#F44336",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    elevation: 2,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginVertical: 4,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  selectedCard: {
    borderColor: "#4CAF50",
    backgroundColor: "#F1F8E9",
    borderWidth: 2,
  },
  selectedCardDelete: {
    borderColor: "#F44336",
    backgroundColor: "#FFF3F0",
    borderWidth: 2,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  cardSub: { fontSize: 12, color: "#777", marginTop: 2 },
  emptyBox: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderStyle: "dashed",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 8,
    fontStyle: "italic",
  },
  unassignBtn: {
    padding: 5,
    backgroundColor: "#FFF3F0",
    borderRadius: 20,
  },
});