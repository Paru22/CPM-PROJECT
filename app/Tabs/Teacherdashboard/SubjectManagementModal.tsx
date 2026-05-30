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
  BackHandler,
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
import { Picker } from "@react-native-picker/picker";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

const SEMESTERS = ["1", "2", "3", "4", "5", "6"];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SubjectManagementModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const hodDepartment = user?.department || "";

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

  // ================= BACK BUTTON =================
  useEffect(() => {
    const backAction = () => {
      if (visible) { onClose(); return true; }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => subscription.remove();
  }, [visible]);

  // ================= LOAD DATA =================
  const loadData = async () => {
    if (!hodDepartment) return;
    setLoading(true);
    try {
      const subjectSnap = await getDocs(query(collection(db, "subjects"), where("department", "==", hodDepartment)));
      setSubjects(subjectSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const teacherSnap = await getDocs(query(collection(db, "teachers"), where("department", "==", hodDepartment), where("status", "==", "approved")));
      setTeachers(teacherSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const assignSnap = await getDocs(query(collection(db, "teacherSubjects"), where("department", "==", hodDepartment)));
      setAssignedSubjects(assignSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch { Alert.alert("Error", "Failed to load data"); } finally { setLoading(false); }
  };

  useEffect(() => { if (visible) loadData(); }, [visible]);

  // ================= ADD =================
  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !newSubjectSemester) { Alert.alert("Fill all fields"); return; }
    setLoading(true);
    try {
      const sem = Number(newSubjectSemester);
      const deptPrefix = hodDepartment.replace(/\s+/g, "").substring(0, 3).toUpperCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const subjectCode = `${deptPrefix}${sem}${randomNum}`;

      await setDoc(doc(db, "subjects", subjectCode), {
        name: newSubjectName.trim(), subjectName: newSubjectName.trim(), subjectCode,
        semester: sem, department: hodDepartment, status: "active",
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        createdBy: user?.uid || "", createdByEmail: user?.email || "",
      });
      Alert.alert("Success", `Subject Added!\nCode: ${subjectCode}`);
      setNewSubjectName(""); setNewSubjectSemester(""); await loadData();
    } catch { Alert.alert("Error", "Failed"); } finally { setLoading(false); }
  };

  // ================= DELETE =================
  const handleDeleteSubject = async () => {
    if (!selectedDeleteSubjectId) { Alert.alert("Select subject"); return; }
    Alert.alert("Delete", "Delete permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setLoading(true);
        try {
          await deleteDoc(doc(db, "subjects", selectedDeleteSubjectId));
          const snap = await getDocs(query(collection(db, "teacherSubjects"), where("subjectId", "==", selectedDeleteSubjectId)));
          await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, "teacherSubjects", d.id))));
          Alert.alert("Deleted"); setSelectedDeleteSubjectId(""); await loadData();
        } catch { Alert.alert("Error"); } finally { setLoading(false); }
      }}
    ]);
  };

  // ================= ASSIGN =================
  const handleAssign = async () => {
    if (!selectedTeacherId || !selectedAssignSubjectId) { Alert.alert("Select both"); return; }
    setLoading(true);
    try {
      const teacher = teachers.find((t) => t.id === selectedTeacherId);
      const subject = subjects.find((s) => s.id === selectedAssignSubjectId);
      if (!teacher || !subject) { Alert.alert("Not found"); return; }
      const already = assignedSubjects.find((a) => a.teacherId === selectedTeacherId && a.subjectId === subject.id);
      if (already) { Alert.alert("Already assigned"); return; }

      await addDoc(collection(db, "teacherSubjects"), {
        teacherId: teacher.id, teacherName: teacher.name || "",
        subjectId: subject.id, subjectCode: subject.subjectCode, subjectName: subject.subjectName,
        semester: subject.semester, department: hodDepartment, role: "subject_teacher",
        assignedAt: new Date().toISOString(), assignedBy: user?.uid || "",
      });
      Alert.alert("Success", "Subject assigned!");
      setSelectedTeacherId(""); setSelectedAssignSubjectId(""); await loadData();
    } catch { Alert.alert("Error"); } finally { setLoading(false); }
  };

  // ================= UNASSIGN =================
  const handleUnassign = async (id: string) => {
    Alert.alert("Remove", "Remove assignment?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        setLoading(true);
        try { await deleteDoc(doc(db, "teacherSubjects", id)); Alert.alert("Removed"); await loadData(); } catch { Alert.alert("Error"); } finally { setLoading(false); }
      }}
    ]);
  };

  // ================= UI =================
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* HEADER */}
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Subject Management</Text>
              <Text style={styles.headerSub}>{hodDepartment}</Text>
            </View>
          </View>
        </LinearGradient>

        {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 10 }} />}

        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
            <Text style={[styles.statNum, { color: colors.textDark }]}>{subjects.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Subjects</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
            <Text style={[styles.statNum, { color: colors.textDark }]}>{teachers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Teachers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="link-outline" size={20} color={colors.primary} />
            <Text style={[styles.statNum, { color: colors.textDark }]}>{assignedSubjects.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Assigned</Text>
          </View>
        </View>

        {/* TABS */}
        <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
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
                onPress={() => setActiveTab(tab.id as any)}
                style={[styles.tab, { backgroundColor: isActive ? colors.primary : colors.background, borderColor: isActive ? colors.primary : colors.border }]}
              >
                <Ionicons name={tab.icon} size={18} color={isActive ? "#fff" : colors.primary} />
                <Text style={[styles.tabText, { color: isActive ? "#fff" : colors.textDark }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CONTENT */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {/* ADD */}
          {activeTab === "add" && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHead}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Add New Subject</Text>
              </View>
              <TextInput placeholder="Subject Name *" value={newSubjectName} onChangeText={setNewSubjectName} style={[styles.input, { borderColor: colors.border, color: colors.textDark, backgroundColor: colors.background }]} placeholderTextColor={colors.textLight} />
              <View style={[styles.pickerWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Picker selectedValue={newSubjectSemester} onValueChange={(v) => setNewSubjectSemester(v)} dropdownIconColor={colors.textDark}>
                  <Picker.Item label="-- Select Semester --" value="" />
                  {SEMESTERS.map((s) => <Picker.Item key={s} label={`Semester ${s}`} value={s} />)}
                </Picker>
              </View>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleAddSubject}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.actionText}>Add Subject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DELETE */}
          {activeTab === "delete" && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHead}>
                <View style={[styles.iconCircle, { backgroundColor: "#F44336" + "15" }]}>
                  <Ionicons name="trash" size={24} color="#F44336" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Delete Subject</Text>
              </View>
              {subjects.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="document-outline" size={48} color={colors.textLight} />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>No subjects found</Text>
                </View>
              ) : (
                subjects.map((s) => (
                  <TouchableOpacity key={s.id} onPress={() => setSelectedDeleteSubjectId(s.id)} style={[styles.subjectCard, { backgroundColor: colors.background, borderColor: selectedDeleteSubjectId === s.id ? "#F44336" : colors.border }, selectedDeleteSubjectId === s.id && { borderWidth: 2 }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.textDark }]}>{s.subjectName}</Text>
                        <Text style={[styles.cardSub, { color: colors.textLight }]}>Code: {s.subjectCode} | Sem: {s.semester}</Text>
                      </View>
                      {selectedDeleteSubjectId === s.id && <Ionicons name="checkmark-circle" size={24} color="#F44336" />}
                    </View>
                  </TouchableOpacity>
                ))
              )}
              {selectedDeleteSubjectId && (
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDeleteSubject}>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.actionText}>Delete Subject</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ASSIGN */}
          {activeTab === "assign" && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHead}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="link" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Assign Subject</Text>
              </View>
              <Text style={[styles.label, { color: colors.textDark }]}>Select Teacher</Text>
              {teachers.length === 0 ? (
                <View style={styles.emptyBox}><Ionicons name="person-outline" size={40} color={colors.textLight} /><Text style={[styles.emptyText, { color: colors.textLight }]}>No teachers</Text></View>
              ) : (
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {teachers.map((t) => (
                    <TouchableOpacity key={t.id} onPress={() => setSelectedTeacherId(t.id)} style={[styles.subjectCard, { backgroundColor: colors.background, borderColor: selectedTeacherId === t.id ? "#4CAF50" : colors.border }, selectedTeacherId === t.id && { borderWidth: 2 }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={[styles.cardTitle, { color: colors.textDark }]}>{t.name}</Text>
                        {selectedTeacherId === t.id && <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <Text style={[styles.label, { color: colors.textDark, marginTop: 15 }]}>Select Subject</Text>
              {subjects.length === 0 ? (
                <View style={styles.emptyBox}><Ionicons name="book-outline" size={40} color={colors.textLight} /><Text style={[styles.emptyText, { color: colors.textLight }]}>No subjects</Text></View>
              ) : (
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {subjects.map((s) => (
                    <TouchableOpacity key={s.id} onPress={() => setSelectedAssignSubjectId(s.id)} style={[styles.subjectCard, { backgroundColor: colors.background, borderColor: selectedAssignSubjectId === s.id ? "#4CAF50" : colors.border }, selectedAssignSubjectId === s.id && { borderWidth: 2 }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardTitle, { color: colors.textDark }]}>{s.subjectName}</Text>
                          <Text style={[styles.cardSub, { color: colors.textLight }]}>Code: {s.subjectCode} | Sem: {s.semester}</Text>
                        </View>
                        {selectedAssignSubjectId === s.id && <Ionicons name="checkmark-circle" size={22} color="#4CAF50" />}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {selectedTeacherId && selectedAssignSubjectId && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={handleAssign}>
                  <Ionicons name="link-outline" size={20} color="#fff" />
                  <Text style={styles.actionText}>Assign Subject</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* VIEW */}
          {activeTab === "view" && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.sectionHead}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="eye" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Current Assignments</Text>
              </View>
              {assignedSubjects.length === 0 ? (
                <View style={styles.emptyBox}><Ionicons name="link-outline" size={48} color={colors.textLight} /><Text style={[styles.emptyText, { color: colors.textLight }]}>No assignments yet</Text></View>
              ) : (
                assignedSubjects.map((a) => (
                  <View key={a.id} style={[styles.subjectCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.textDark }]}>{a.subjectName}</Text>
                        <Text style={[styles.cardSub, { color: colors.textLight }]}>Teacher: {a.teacherName}</Text>
                        <Text style={[styles.cardSub, { color: colors.textLight }]}>Code: {a.subjectCode} | Sem: {a.semester}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleUnassign(a.id)} style={styles.removeBtn}>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSub: { color: "rgba(255,255,255,0.8)", marginTop: 44, fontSize: 13 },
  statsRow: { flexDirection: "row", paddingHorizontal: 15, marginTop: 15, gap: 10 },
  statCard: { flex: 10, paddingVertical: 14, borderRadius: 14, alignItems: "center", elevation: 2 },
  statNum: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  statLabel: { fontSize: 11, marginTop: 2 },
  tabContainer: { flexDirection: "row", marginHorizontal: 15, marginTop: 15, borderRadius: 14, padding: 8, gap: 6 },
  tab: { flex: 1, flexDirection: "row", borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 5 },
  tabText: { fontSize: 12, fontWeight: "600" },
  card: { borderRadius: 18, padding: 18, marginBottom: 20 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  iconCircle: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 15 },
  pickerWrapper: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 14 },
  actionBtn: { flexDirection: "row", justifyContent: "center", alignItems: "center", padding: 15, borderRadius: 14, gap: 8, marginTop: 15 },
  deleteBtn: { backgroundColor: "#F44336" },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  subjectCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  cardSub: { fontSize: 12, marginTop: 1 },
  emptyBox: { alignItems: "center", padding: 40, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(0,0,0,0.1)" },
  emptyText: { textAlign: "center", marginTop: 10, fontSize: 14 },
  removeBtn: { padding: 5 },
});