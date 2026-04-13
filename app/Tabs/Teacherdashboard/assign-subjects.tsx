import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

interface Subject {
  id: string;
  subjectId: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface TeacherSubject {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  department: string;
  semester: number;
  assignedBy: string;
  assignedAt: string;
}

export default function AssignSubjects() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [assignments, setAssignments] = useState<TeacherSubject[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [activeTab, setActiveTab] = useState<"subjects" | "assignments">("subjects");
  const [refreshing, setRefreshing] = useState(false);

  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [newSubject, setNewSubject] = useState({
    subjectId: "",
    name: "",
    semester: "",
    credits: "",
  });

  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);

  // ---------- Data fetching ----------
  const fetchSubjects = useCallback(async () => {
    if (!user?.department) return;
    setLoadingSubjects(true);
    try {
      const q = query(collection(db, "subjects"), where("department", "==", user.department));
      const snapshot = await getDocs(q);
      const subjectsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];
      subjectsList.sort((a, b) => a.semester - b.semester || a.subjectId.localeCompare(b.subjectId));
      setSubjects(subjectsList);
    } catch (error: any) {
      console.error("Fetch subjects error:", error);
      Alert.alert("Error", `Failed to load subjects: ${error.message}`);
    } finally {
      setLoadingSubjects(false);
    }
  }, [user?.department]);

  const fetchTeachers = useCallback(async () => {
    if (!user?.department) return;
    setLoadingTeachers(true);
    try {
      const q = query(collection(db, "teachers"), where("department", "==", user.department));
      const snapshot = await getDocs(q);
      const teachersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Teacher[];
      setTeachers(teachersList);
    } catch (error: any) {
      console.error("Fetch teachers error:", error);
      Alert.alert("Error", `Failed to load teachers: ${error.message}`);
    } finally {
      setLoadingTeachers(false);
    }
  }, [user?.department]);

  const fetchAssignments = useCallback(async () => {
    if (!user?.department) return;
    setLoadingAssignments(true);
    try {
      const q = query(collection(db, "teacherSubjects"), where("department", "==", user.department));
      const snapshot = await getDocs(q);
      const assignmentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeacherSubject[];
      setAssignments(assignmentsList);
    } catch (error: any) {
      console.error("Fetch assignments error:", error);
      Alert.alert("Error", `Failed to load assignments: ${error.message}`);
    } finally {
      setLoadingAssignments(false);
    }
  }, [user?.department]);

  const fetchAllData = useCallback(async () => {
    await Promise.all([fetchSubjects(), fetchTeachers(), fetchAssignments()]);
  }, [fetchSubjects, fetchTeachers, fetchAssignments]);

  // ---------- Effects ----------
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "hod")) {
      Alert.alert("Access Denied", "Only HOD can manage subjects and assignments.");
      router.back();
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.department) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData().finally(() => setRefreshing(false));
  }, [fetchAllData]);

  // ---------- Subject Management ----------
  const handleAddSubject = async () => {
    if (!newSubject.subjectId || !newSubject.name || !newSubject.semester || !newSubject.credits) {
      Alert.alert("Missing Fields", "Please fill all subject details.");
      return;
    }
    const semesterNum = parseInt(newSubject.semester);
    const creditsNum = parseInt(newSubject.credits);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      Alert.alert("Invalid Semester", "Semester must be between 1 and 8.");
      return;
    }
    if (isNaN(creditsNum) || creditsNum < 1) {
      Alert.alert("Invalid Credits", "Credits must be a positive number.");
      return;
    }

    try {
      const existing = subjects.find(
        (s) => s.subjectId === newSubject.subjectId && s.department === user?.department
      );
      if (existing) {
        Alert.alert("Duplicate", "Subject ID already exists in this department.");
        return;
      }

      await addDoc(collection(db, "subjects"), {
        subjectId: newSubject.subjectId,
        name: newSubject.name,
        department: user?.department,
        semester: semesterNum,
        credits: creditsNum,
      });
      Alert.alert("Success", "Subject added successfully.");
      setSubjectModalVisible(false);
      setNewSubject({ subjectId: "", name: "", semester: "", credits: "" });
      fetchSubjects();
    } catch (error: any) {
      console.error("Add subject error:", error);
      Alert.alert("Error", `Failed to add subject: ${error.message}`);
    }
  };

  const handleDeleteSubject = (subject: Subject) => {
    Alert.alert(
      "Delete Subject",
      `Are you sure you want to delete "${subject.name}"? This will also remove all teacher assignments for this subject.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const assignmentsQuery = query(
                collection(db, "teacherSubjects"),
                where("subjectId", "==", subject.id)
              );
              const assignmentsSnapshot = await getDocs(assignmentsQuery);
              for (const assignmentDoc of assignmentsSnapshot.docs) {
                await deleteDoc(doc(db, "teacherSubjects", assignmentDoc.id));
              }
              await deleteDoc(doc(db, "subjects", subject.id));
              Alert.alert("Deleted", "Subject and related assignments removed.");
              await fetchAllData();
            } catch (error: any) {
              console.error("Delete subject error:", error);
              Alert.alert("Delete Failed", `Error: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  // ---------- Assignment Management ----------
  const openAssignModal = (teacher: Teacher) => {
    const assignedSubjectIds = assignments
      .filter((a) => a.teacherId === teacher.id)
      .map((a) => a.subjectId);
    const available = subjects.filter((s) => !assignedSubjectIds.includes(s.id));
    setAvailableSubjects(available);
    setSelectedTeacher(teacher);
    setAssignModalVisible(true);
  };

  const handleAssignSubject = async (subject: Subject) => {
    if (!selectedTeacher) return;
    try {
      await addDoc(collection(db, "teacherSubjects"), {
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.name,
        subjectId: subject.id,
        subjectName: subject.name,
        department: user?.department,
        semester: subject.semester,
        assignedBy: user?.name || user?.email,
        assignedAt: new Date().toISOString(),
      });
      Alert.alert("Assigned", `${subject.name} assigned to ${selectedTeacher.name}`);
      setAssignModalVisible(false);
      setSelectedTeacher(null);
      await fetchAssignments();
    } catch (error: any) {
      console.error("Assign subject error:", error);
      Alert.alert("Error", `Failed to assign subject: ${error.message}`);
    }
  };

  const handleRemoveAssignment = async (assignment: TeacherSubject) => {
    Alert.alert(
      "Remove Assignment",
      `Remove "${assignment.subjectName}" from ${assignment.teacherName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "teacherSubjects", assignment.id));
              Alert.alert("Success", "Assignment removed.");
              await fetchAssignments();
            } catch (error: any) {
              console.error("Remove assignment error:", error);
              Alert.alert("Remove Failed", `Error: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  // ---------- Render Helpers ----------
  const renderSubjectItem = ({ item }: { item: Subject }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardContent}>
        <View style={styles.subjectHeader}>
          <Text style={[styles.subjectCode, { color: colors.primary }]}>{item.subjectId}</Text>
          <Text style={[styles.subjectName, { color: colors.textDark }]}>{item.name}</Text>
        </View>
        <View style={styles.subjectDetails}>
          <View style={[styles.detailChip, { backgroundColor: colors.background }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.textLight }]}>Sem {item.semester}</Text>
          </View>
          <View style={[styles.detailChip, { backgroundColor: colors.background }]}>
            <Ionicons name="star-outline" size={14} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.textLight }]}>{item.credits} credits</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDeleteSubject(item)} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  const renderTeacherItem = ({ item }: { item: Teacher }) => {
    const teacherAssignments = assignments.filter((a) => a.teacherId === item.id);
    return (
      <View style={[styles.teacherCard, { backgroundColor: colors.card }]}>
        <View style={styles.teacherHeader}>
          <View>
            <Text style={[styles.teacherName, { color: colors.textDark }]}>{item.name}</Text>
            <Text style={[styles.teacherEmail, { color: colors.textLight }]}>{item.email}</Text>
          </View>
          <TouchableOpacity
            style={[styles.assignButton, { backgroundColor: colors.background }]}
            onPress={() => openAssignModal(item)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
            <Text style={[styles.assignButtonText, { color: "#4CAF50" }]}>Assign</Text>
          </TouchableOpacity>
        </View>
        {teacherAssignments.length > 0 && (
          <View style={styles.assignedList}>
            <Text style={[styles.assignedTitle, { color: colors.textLight }]}>Assigned Subjects:</Text>
            {teacherAssignments.map((ass) => (
              <View key={ass.id} style={styles.assignedItem}>
                <Text style={[styles.assignedSubject, { color: colors.textDark }]}>
                  {ass.subjectName} (Sem {ass.semester})
                </Text>
                <TouchableOpacity
                  style={[styles.removeButton, { backgroundColor: "#ffebee" }]}
                  onPress={() => handleRemoveAssignment(ass)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📚 Subject & Assignment Manager</Text>
        </View>
        <Text style={styles.headerSubtitle}>Department: {user?.department}</Text>
      </LinearGradient>

      <View style={[styles.tabBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "subjects" && { backgroundColor: `${colors.primary}20` }]}
          onPress={() => setActiveTab("subjects")}
        >
          <Ionicons name="book-outline" size={20} color={activeTab === "subjects" ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, { color: activeTab === "subjects" ? colors.primary : colors.textLight }]}>Subjects</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "assignments" && { backgroundColor: `${colors.primary}20` }]}
          onPress={() => setActiveTab("assignments")}
        >
          <Ionicons name="people-outline" size={20} color={activeTab === "assignments" ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, { color: activeTab === "assignments" ? colors.primary : colors.textLight }]}>Assign to Teachers</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === "subjects" && (
          <>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: "#4CAF50" }]} onPress={() => setSubjectModalVisible(true)}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text style={styles.addButtonText}>Add New Subject</Text>
            </TouchableOpacity>
            {loadingSubjects ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : subjects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={64} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No subjects found</Text>
                <Text style={[styles.emptySubtext, { color: colors.textLight }]}>{'Tap "+ Add New Subject" to create one'}</Text>
              </View>
            ) : (
              <FlatList data={subjects} renderItem={renderSubjectItem} keyExtractor={(item) => item.id} scrollEnabled={false} contentContainerStyle={styles.listContainer} />
            )}
          </>
        )}
        {activeTab === "assignments" && (
          <>
            {loadingTeachers || loadingAssignments ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : teachers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No teachers in your department</Text>
              </View>
            ) : (
              <FlatList data={teachers} renderItem={renderTeacherItem} keyExtractor={(item) => item.id} scrollEnabled={false} contentContainerStyle={styles.listContainer} />
            )}
          </>
        )}
      </ScrollView>

      {/* Add Subject Modal */}
      <Modal visible={subjectModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Subject</Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Subject Code *</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textDark }]} placeholder="e.g., CS101" placeholderTextColor={colors.textLight} value={newSubject.subjectId} onChangeText={(text) => setNewSubject({ ...newSubject, subjectId: text })} />
              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Subject Name *</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textDark }]} placeholder="e.g., Data Structures" placeholderTextColor={colors.textLight} value={newSubject.name} onChangeText={(text) => setNewSubject({ ...newSubject, name: text })} />
              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Semester (1-8) *</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textDark }]} placeholder="e.g., 3" keyboardType="numeric" value={newSubject.semester} onChangeText={(text) => setNewSubject({ ...newSubject, semester: text })} />
              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Credits *</Text>
              <TextInput style={[styles.input, { borderColor: colors.border, color: colors.textDark }]} placeholder="e.g., 4" keyboardType="numeric" value={newSubject.credits} onChangeText={(text) => setNewSubject({ ...newSubject, credits: text })} />
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: "#4CAF50" }]} onPress={handleAddSubject}><Text style={styles.submitButtonText}>Create Subject</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Assign Subject Modal */}
      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Subject to {selectedTeacher?.name}</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody}>
              {availableSubjects.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#4CAF50" />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>All subjects assigned!</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textLight }]}>This teacher already has every subject.</Text>
                </View>
              ) : (
                availableSubjects.map((subject) => (
                  <TouchableOpacity key={subject.id} style={[styles.subjectOption, { borderBottomColor: colors.border }]} onPress={() => handleAssignSubject(subject)}>
                    <View>
                      <Text style={[styles.subjectOptionCode, { color: colors.primary }]}>{subject.subjectId}</Text>
                      <Text style={[styles.subjectOptionName, { color: colors.textDark }]}>{subject.name}</Text>
                      <Text style={[styles.subjectOptionMeta, { color: colors.textLight }]}>Sem {subject.semester} • {subject.credits} credits</Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={28} color="#4CAF50" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9 },
  tabBar: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 16, elevation: 2 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 20, gap: 6 },
  tabText: { fontSize: 14, fontWeight: "500" },
  content: { flex: 1, padding: 16 },
  addButton: { flexDirection: "row", paddingVertical: 12, borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 16 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  listContainer: { paddingBottom: 20 },
  card: { flexDirection: "row", borderRadius: 12, padding: 12, marginBottom: 10, alignItems: "center", justifyContent: "space-between", elevation: 2 },
  cardContent: { flex: 1 },
  subjectHeader: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 6 },
  subjectCode: { fontSize: 14, fontWeight: "bold" },
  subjectName: { fontSize: 16, fontWeight: "600" },
  subjectDetails: { flexDirection: "row", gap: 12 },
  detailChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  detailText: { fontSize: 12 },
  deleteButton: { padding: 8 },
  teacherCard: { borderRadius: 12, padding: 12, marginBottom: 12, elevation: 2 },
  teacherHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  teacherName: { fontSize: 16, fontWeight: "bold" },
  teacherEmail: { fontSize: 12 },
  assignButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  assignButtonText: { fontWeight: "600", fontSize: 12 },
  assignedList: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  assignedTitle: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  assignedItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  assignedSubject: { fontSize: 14 },
  removeButton: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  removeButtonText: { color: "#F44336", fontSize: 12, fontWeight: "600" },
  loader: { marginTop: 40 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 50 },
  emptyText: { fontSize: 16, marginTop: 10 },
  emptySubtext: { fontSize: 12, marginTop: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 20, width: "90%", maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalBody: { padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: "500", marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: "#fff" },
  submitButton: { paddingVertical: 12, borderRadius: 8, alignItems: "center", marginTop: 20, marginBottom: 10 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  subjectOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  subjectOptionCode: { fontSize: 14, fontWeight: "bold" },
  subjectOptionName: { fontSize: 16, fontWeight: "500" },
  subjectOptionMeta: { fontSize: 12, marginTop: 2 },
});