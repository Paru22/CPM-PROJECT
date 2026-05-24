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
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { Picker } from "@react-native-picker/picker";

const SEMESTERS = ["1", "2", "3", "4", "5", "6"];

export default function SubjectManagementModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { user } = useAuth();

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

  // ✅ Only HOD's department
  const hodDepartment = user?.department || "";

  const loadData = async () => {
    if (!hodDepartment) return;
    setLoading(true);
    try {
      const subSnap = await getDocs(query(collection(db, "subjects"), where("department", "==", hodDepartment)));
      setSubjects(subSnap.docs.map((d) => ({ id: d.id, subjectCode: d.id, ...d.data() })));

      const teacherSnap = await getDocs(query(collection(db, "teachers"), where("department", "==", hodDepartment), where("requestStatus", "==", "approved")));
      setTeachers(teacherSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const assignSnap = await getDocs(query(collection(db, "teacherSubjects"), where("department", "==", hodDepartment)));
      setAssignedSubjects(assignSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && hodDepartment) loadData();
  }, [visible, hodDepartment]);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !newSubjectSemester.trim()) {
      Alert.alert("Validation Error", "Please fill all fields");
      return;
    }
    const sem = parseInt(newSubjectSemester);
    if (isNaN(sem) || sem < 1 || sem > 6) {
      Alert.alert("Invalid Semester", "Semester must be between 1 and 6");
      return;
    }
    setLoading(true);
    try {
      const deptPrefix = hodDepartment.substring(0, 3).toUpperCase();
      const randomNum = String(Math.floor(Math.random() * 9000) + 1000);
      const subjectCode = `${deptPrefix}${sem}${randomNum}`;
      await setDoc(doc(db, "subjects", subjectCode), {
        subjectName: newSubjectName.trim(),
        name: newSubjectName.trim(),
        subjectCode,
        semester: sem,
        department: hodDepartment,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid,
      });
      Alert.alert("Success", `Subject added!\nCode: ${subjectCode}`);
      setNewSubjectName("");
      setNewSubjectSemester("");
      loadData();
    } catch {
      Alert.alert("Error", "Failed to add subject");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!selectedDeleteSubjectId) { Alert.alert("Error", "Select a subject to delete"); return; }
    const subjectToDelete = subjects.find((s) => s.id === selectedDeleteSubjectId);
    Alert.alert("Confirm Delete", `Delete "${subjectToDelete?.subjectName || subjectToDelete?.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setLoading(true);
        try {
          await deleteDoc(doc(db, "subjects", selectedDeleteSubjectId));
          const assignSnap = await getDocs(query(collection(db, "teacherSubjects"), where("subjectId", "==", selectedDeleteSubjectId)));
          await Promise.all(assignSnap.docs.map((d) => deleteDoc(doc(db, "teacherSubjects", d.id))));
          Alert.alert("Deleted", "Subject removed");
          setSelectedDeleteSubjectId("");
          loadData();
        } catch { Alert.alert("Error", "Delete failed"); } finally { setLoading(false); }
      }}
    ]);
  };

  const handleAssign = async () => {
    if (!selectedTeacherId || !selectedAssignSubjectId) { Alert.alert("Error", "Select both teacher and subject"); return; }
    setLoading(true);
    try {
      const teacher = teachers.find((t) => t.id === selectedTeacherId);
      const subject = subjects.find((s) => s.id === selectedAssignSubjectId);
      await addDoc(collection(db, "teacherSubjects"), {
        teacherId: selectedTeacherId,
        teacherName: teacher?.name || "Unknown",
        subjectId: subject?.subjectCode || selectedAssignSubjectId,
        subjectName: subject?.subjectName || subject?.name || "",
        subjectCode: subject?.subjectCode || selectedAssignSubjectId,
        semester: subject?.semester?.toString() || "",
        department: hodDepartment,
        role: "subject_teacher",
        assignedBy: user?.uid,
        assignedAt: new Date().toISOString(),
      });
      Alert.alert("Success", "Subject assigned to teacher");
      setSelectedTeacherId("");
      setSelectedAssignSubjectId("");
      loadData();
    } catch { Alert.alert("Error", "Failed to assign subject"); } finally { setLoading(false); }
  };

  const handleUnassign = async (assignmentId: string) => {
    Alert.alert("Remove Assignment", "Remove this assignment?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        setLoading(true);
        try { await deleteDoc(doc(db, "teacherSubjects", assignmentId)); Alert.alert("Removed", "Assignment removed"); loadData(); } catch { Alert.alert("Error", "Failed"); } finally { setLoading(false); }
      }}
    ]);
  };

  // ✅ Handle back button directly
  const handleBack = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Subject Management</Text>
              <Text style={styles.headerSubtitle}>{hodDepartment}</Text>
            </View>
          </View>
        </LinearGradient>

        {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 10 }} />}

        {/* Tabs */}
        <View style={[styles.tabRow, { backgroundColor: colors.card }]}>
          {[
            { id: "add", icon: "add-circle-outline" as const, label: "Add" },
            { id: "delete", icon: "trash-outline" as const, label: "Delete" },
            { id: "assign", icon: "link-outline" as const, label: "Assign" },
            { id: "view", icon: "eye-outline" as const, label: "View" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, { backgroundColor: isActive ? colors.primary : colors.background, borderColor: isActive ? colors.primary : colors.border }]}
                onPress={() => setActiveTab(tab.id as any)}
              >
                <Ionicons name={tab.icon} size={16} color={isActive ? "#fff" : colors.primary} />
                <Text style={[styles.tabText, { color: isActive ? "#fff" : colors.textDark }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* ADD TAB */}
          {activeTab === "add" && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="add-circle" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Add New Subject</Text>
              </View>
              <Text style={[styles.label, { color: colors.textDark }]}>Subject Name *</Text>
              <TextInput placeholder="e.g., Database Management Systems" style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} value={newSubjectName} onChangeText={setNewSubjectName} placeholderTextColor={colors.textLight} />
              <Text style={[styles.label, { color: colors.textDark }]}>Semester *</Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Picker selectedValue={newSubjectSemester} onValueChange={(v: string) => setNewSubjectSemester(v)} dropdownIconColor={colors.textDark}>
                  <Picker.Item label="-- Select Semester --" value="" color={colors.textLight} />
                  {SEMESTERS.map((sem) => <Picker.Item key={sem} label={`Semester ${sem}`} value={sem} color={colors.textDark} />)}
                </Picker>
              </View>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleAddSubject} disabled={loading}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Add Subject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DELETE TAB */}
          {activeTab === "delete" && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: "#F44336" + "15" }]}>
                  <Ionicons name="trash" size={22} color="#F44336" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Delete Subject</Text>
              </View>
              {subjects.length === 0 ? (
                <View style={styles.emptyBox}><Ionicons name="document-outline" size={48} color={colors.textLight} /><Text style={[styles.emptyText, { color: colors.textLight }]}>No subjects found</Text></View>
              ) : (
                subjects.map((s) => (
                  <TouchableOpacity key={s.id} onPress={() => setSelectedDeleteSubjectId(s.id)} style={[styles.card, { backgroundColor: colors.background, borderColor: selectedDeleteSubjectId === s.id ? "#F44336" : colors.border }, selectedDeleteSubjectId === s.id && { borderWidth: 2 }]}>
                    <View style={styles.cardContent}>
                      <View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.textDark }]}>{s.subjectName || s.name}</Text><Text style={[styles.cardSub, { color: colors.textLight }]}>Code: {s.subjectCode} | Sem: {s.semester}</Text></View>
                      {selectedDeleteSubjectId === s.id && <Ionicons name="checkmark-circle" size={22} color="#F44336" />}
                    </View>
                  </TouchableOpacity>
                ))
              )}
              {selectedDeleteSubjectId && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#F44336" }]} onPress={handleDeleteSubject} disabled={loading}>
                  <Ionicons name="trash-outline" size={20} color="#fff" /><Text style={styles.actionBtnText}>Delete Selected Subject</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ASSIGN TAB */}
          {activeTab === "assign" && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "15" }]}><Ionicons name="link" size={22} color={colors.primary} /></View>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Assign Subject to Teacher</Text>
              </View>
              <Text style={[styles.label, { color: colors.textDark }]}>Select Teacher</Text>
              {teachers.length === 0 ? (<View style={styles.emptyBox}><Ionicons name="person-outline" size={40} color={colors.textLight} /><Text style={[styles.emptyText, { color: colors.textLight }]}>No teachers</Text></View>) : (
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {teachers.map((t) => (
                    <TouchableOpacity key={t.id} onPress={() => setSelectedTeacherId(t.id)} style={[styles.card, { backgroundColor: colors.background, borderColor: selectedTeacherId === t.id ? "#4CAF50" : colors.border }, selectedTeacherId === t.id && { borderWidth: 2 }]}>
                      <View style={styles.cardContent}><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.textDark }]}>{t.name || "Unknown"}</Text><Text style={[styles.cardSub, { color: colors.textLight }]}>{t.qualification || t.department || ""}</Text></View>{selectedTeacherId === t.id && <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />}</View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <Text style={[styles.label, { color: colors.textDark, marginTop: 15 }]}>Select Subject</Text>
              {subjects.length === 0 ? (<View style={styles.emptyBox}><Ionicons name="book-outline" size={40} color={colors.textLight} /><Text style={[styles.emptyText, { color: colors.textLight }]}>No subjects</Text></View>) : (
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {subjects.map((s) => (
                    <TouchableOpacity key={s.id} onPress={() => setSelectedAssignSubjectId(s.id)} style={[styles.card, { backgroundColor: colors.background, borderColor: selectedAssignSubjectId === s.id ? "#4CAF50" : colors.border }, selectedAssignSubjectId === s.id && { borderWidth: 2 }]}>
                      <View style={styles.cardContent}><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.textDark }]}>{s.subjectName || s.name}</Text><Text style={[styles.cardSub, { color: colors.textLight }]}>Code: {s.subjectCode} | Sem: {s.semester}</Text></View>{selectedAssignSubjectId === s.id && <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />}</View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {selectedTeacherId && selectedAssignSubjectId && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleAssign} disabled={loading}>
                  <Ionicons name="link-outline" size={20} color="#fff" /><Text style={styles.actionBtnText}>Assign Subject to Teacher</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* VIEW TAB */}
          {activeTab === "view" && (
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.primary + "15" }]}><Ionicons name="eye" size={22} color={colors.primary} /></View>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Current Assignments</Text>
              </View>
              {assignedSubjects.length === 0 ? (<View style={styles.emptyBox}><Ionicons name="link-outline" size={48} color={colors.textLight} /><Text style={[styles.emptyText, { color: colors.textLight }]}>No assignments yet</Text></View>) : (
                assignedSubjects.map((a) => (
                  <View key={a.id} style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.cardContent}><View style={{ flex: 1 }}><Text style={[styles.cardTitle, { color: colors.textDark }]}>{a.subjectName}</Text><Text style={[styles.cardSub, { color: colors.textLight }]}>Teacher: {a.teacherName}</Text><Text style={[styles.cardSub, { color: colors.textLight }]}>Code: {a.subjectCode} | Sem: {a.semester}</Text></View><TouchableOpacity onPress={() => handleUnassign(a.id)} style={styles.unassignBtn}><Ionicons name="close-circle" size={22} color="#F44336" /></TouchableOpacity></View>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 20, paddingBottom: 20 },
  headerContent: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  tabRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: { flex: 1, flexDirection: "row", paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, gap: 5 },
  tabText: { fontSize: 12 },
  content: { flex: 1, padding: 15 },
  section: { marginBottom: 20, padding: 18, borderRadius: 16, elevation: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, marginBottom: 14, padding: 14, borderRadius: 12, fontSize: 15 },
  pickerContainer: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 14 },
  actionBtn: { padding: 15, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 12, elevation: 2 },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  card: { padding: 14, borderWidth: 1, marginVertical: 5, borderRadius: 12 },
  cardContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  cardSub: { fontSize: 12, marginTop: 1 },
  emptyBox: { alignItems: "center", padding: 40, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(0,0,0,0.1)" },
  emptyText: { textAlign: "center", marginTop: 10, fontSize: 14 },
  unassignBtn: { padding: 6, backgroundColor: "#FFF3F0", borderRadius: 20 },
});