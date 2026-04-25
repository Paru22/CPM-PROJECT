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
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status?: string;
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
      let teachersList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Teacher[];
      teachersList = teachersList.filter(teacher => teacher.role !== "hod");
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
    if (!newSubject.subjectId || !newSubject.name || !newSubject.semester) {
      Alert.alert("Missing Fields", "Please fill all subject details.");
      return;
    }
    const semesterNum = parseInt(newSubject.semester);
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 6) {
      Alert.alert("Invalid Semester", "Semester must be between 1 and 6.");
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
      });
      Alert.alert("Success", "Subject added successfully.");
      setSubjectModalVisible(false);
      setNewSubject({ subjectId: "", name: "", semester: "" });
      fetchSubjects();
    } catch (error: any) {
      console.error("Add subject error:", error);
      Alert.alert("Error", `Failed to add subject: ${error.message}`);
    }
  };

  const handleDeleteSubject = (subject: Subject) => {
    Alert.alert(
      "Delete Subject",
      `Delete "${subject.name}"? This will also remove all teacher assignments.`,
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
              Alert.alert("Deleted", "Subject and assignments removed.");
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

  const isSubjectAlreadyAssigned = (subjectId: string): boolean => {
    return assignments.some((a) => a.subjectId === subjectId);
  };

  const handleAssignSubject = async (subject: Subject) => {
    if (!selectedTeacher) return;
    
    if (isSubjectAlreadyAssigned(subject.id)) {
      Alert.alert(
        "Subject Already Assigned",
        `"${subject.name}" is already assigned to another teacher.\n\nA subject can only be assigned to one teacher at a time.`,
        [{ text: "OK" }]
      );
      return;
    }
    
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
  const renderSubjectItem = ({ item }: { item: Subject }) => {
    const isAssigned = assignments.some((a) => a.subjectId === item.id);
    const assignedTo = assignments.find((a) => a.subjectId === item.id)?.teacherName;
    
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardContent}>
          <View style={styles.subjectHeader}>
            <Text style={[styles.subjectCode, { color: colors.primary }]}>{item.subjectId}</Text>
            <Text style={[styles.subjectName, { color: colors.textDark }]}>{item.name}</Text>
          </View>
          <View style={styles.detailChip}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.detailText, { color: colors.textLight }]}>Semester {item.semester}</Text>
          </View>
          {isAssigned && (
            <View style={styles.assignedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
              <Text style={styles.assignedBadgeText}>Assigned to {assignedTo}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => handleDeleteSubject(item)} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderTeacherItem = ({ item }: { item: Teacher }) => {
    const teacherAssignments = assignments.filter((a) => a.teacherId === item.id);
    return (
      <View style={[styles.teacherCard, { backgroundColor: colors.card }]}>
        <View style={styles.teacherHeader}>
          <View style={styles.teacherInfo}>
            <Text style={[styles.teacherName, { color: colors.textDark }]}>{item.name}</Text>
            <Text style={[styles.teacherEmail, { color: colors.textLight }]}>{item.email}</Text>
          </View>
          <TouchableOpacity
            style={[styles.assignButton, { backgroundColor: `${colors.primary}10` }]}
            onPress={() => openAssignModal(item)}
          >
            <Ionicons name="add-circle-outline" size={22} color="#4CAF50" />
            <Text style={[styles.assignButtonText, { color: "#4CAF50" }]}>Assign</Text>
          </TouchableOpacity>
        </View>
        {teacherAssignments.length > 0 && (
          <View style={styles.assignedList}>
            <Text style={[styles.assignedTitle, { color: colors.textLight }]}>Assigned Subjects:</Text>
            {teacherAssignments.map((ass) => (
              <View key={ass.id} style={styles.assignedItem}>
                <View style={styles.assignedSubjectInfo}>
                  <Text style={[styles.assignedSubject, { color: colors.textDark }]}>
                    {ass.subjectName}
                  </Text>
                  <Text style={[styles.assignedSemester, { color: colors.textLight }]}>
                    Sem {ass.semester}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
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
          <Text style={styles.headerTitle}>Subject Manager</Text>
        </View>
        <Text style={styles.headerSubtitle}>{user?.department} Department</Text>
      </LinearGradient>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "subjects" && styles.activeTab]}
          onPress={() => setActiveTab("subjects")}
        >
          <Ionicons name="book-outline" size={20} color={activeTab === "subjects" ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, { color: activeTab === "subjects" ? colors.primary : colors.textLight }]}>Subjects</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "assignments" && styles.activeTab]}
          onPress={() => setActiveTab("assignments")}
        >
          <Ionicons name="people-outline" size={20} color={activeTab === "assignments" ? colors.primary : colors.textLight} />
          <Text style={[styles.tabText, { color: activeTab === "assignments" ? colors.primary : colors.textLight }]}>Teachers</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {activeTab === "subjects" && (
          <>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: "#4CAF50" }]} onPress={() => setSubjectModalVisible(true)}>
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.addButtonText}>New Subject</Text>
            </TouchableOpacity>
            {loadingSubjects ? (
              <ActivityIndicator style={styles.loader} color={colors.primary} />
            ) : subjects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={64} color={colors.textLight} />
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No subjects found</Text>
                <Text style={[styles.emptySubtext, { color: colors.textLight }]}>Tap + to add your first subject</Text>
              </View>
            ) : (
              <FlatList data={subjects} renderItem={renderSubjectItem} keyExtractor={(item) => item.id} scrollEnabled={false} />
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
                <Text style={[styles.emptyText, { color: colors.textLight }]}>No teachers found</Text>
                <Text style={[styles.emptySubtext, { color: colors.textLight }]}>Add teachers to your department first</Text>
              </View>
            ) : (
              <FlatList data={teachers} renderItem={renderTeacherItem} keyExtractor={(item) => item.id} scrollEnabled={false} />
            )}
          </>
        )}
      </ScrollView>

      {/* Add Subject Modal - CREDITS REMOVED */}
      <Modal visible={subjectModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Subject</Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Subject Code</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} 
                placeholder="e.g., CS101" 
                placeholderTextColor={colors.textLight} 
                value={newSubject.subjectId} 
                onChangeText={(text) => setNewSubject({ ...newSubject, subjectId: text })} 
              />
              
              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Subject Name</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} 
                placeholder="e.g., Data Structures" 
                placeholderTextColor={colors.textLight} 
                value={newSubject.name} 
                onChangeText={(text) => setNewSubject({ ...newSubject, name: text })} 
              />
              
              <Text style={[styles.inputLabel, { color: colors.textDark }]}>Semester (1-6)</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} 
                placeholder="e.g., 3" 
                keyboardType="numeric" 
                value={newSubject.semester} 
                onChangeText={(text) => setNewSubject({ ...newSubject, semester: text })} 
              />
              
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: "#4CAF50" }]} onPress={handleAddSubject}>
                <Text style={styles.submitButtonText}>Create Subject</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Assign Subject Modal */}
      <Modal visible={assignModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign to {selectedTeacher?.name?.split(" ")[0]}</Text>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody}>
              {availableSubjects.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
                  <Text style={[styles.emptyText, { color: colors.textLight }]}>All subjects assigned!</Text>
                </View>
              ) : (
                availableSubjects.map((subject) => {
                  const isAlreadyAssigned = assignments.some((a) => a.subjectId === subject.id);
                  return (
                    <TouchableOpacity 
                      key={subject.id} 
                      style={[
                        styles.subjectOption, 
                        { borderBottomColor: colors.border },
                        isAlreadyAssigned && styles.disabledOption
                      ]} 
                      onPress={() => !isAlreadyAssigned && handleAssignSubject(subject)}
                      disabled={isAlreadyAssigned}
                    >
                      <View>
                        <Text style={[styles.subjectOptionCode, { color: colors.primary }]}>{subject.subjectId}</Text>
                        <Text style={[styles.subjectOptionName, { color: colors.textDark }]}>{subject.name}</Text>
                        <Text style={[styles.subjectOptionMeta, { color: colors.textLight }]}>Semester {subject.semester}</Text>
                      </View>
                      {isAlreadyAssigned ? (
                        <View style={styles.assignedChip}>
                          <Ionicons name="checkmark" size={16} color="#4CAF50" />
                          <Text style={styles.assignedChipText}>Assigned</Text>
                        </View>
                      ) : (
                        <Ionicons name="add-circle" size={28} color="#4CAF50" />
                      )}
                    </TouchableOpacity>
                  );
                })
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
  
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "#fff", opacity: 0.9 },
  
  tabBar: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 20, borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 24, gap: 8 },
  activeTab: { backgroundColor: "rgba(115,132,191,0.1)" },
  tabText: { fontSize: 14, fontWeight: "500" },
  
  content: { flex: 1, padding: 16 },
  
  addButton: { flexDirection: "row", paddingVertical: 12, borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 16 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  
  card: { flexDirection: "row", borderRadius: 16, padding: 14, marginBottom: 10, alignItems: "center", justifyContent: "space-between", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardContent: { flex: 1 },
  subjectHeader: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 6 },
  subjectCode: { fontSize: 13, fontWeight: "bold" },
  subjectName: { fontSize: 16, fontWeight: "600" },
  detailChip: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 12 },
  deleteButton: { padding: 8 },
  assignedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  assignedBadgeText: { fontSize: 10, color: "#4CAF50" },
  
  teacherCard: { borderRadius: 16, padding: 14, marginBottom: 12, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  teacherHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  teacherEmail: { fontSize: 12 },
  assignButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  assignButtonText: { fontWeight: "600", fontSize: 12 },
  
  assignedList: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E0E0E0" },
  assignedTitle: { fontSize: 11, fontWeight: "600", marginBottom: 8 },
  assignedItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  assignedSubjectInfo: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  assignedSubject: { fontSize: 13 },
  assignedSemester: { fontSize: 11 },
  removeButton: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, backgroundColor: "#FFEBEE" },
  removeButtonText: { color: "#F44336", fontSize: 11, fontWeight: "600" },
  
  loader: { marginTop: 40 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  emptySubtext: { fontSize: 12, marginTop: 6, opacity: 0.7 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 24, width: "90%", maxHeight: "80%", overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalBody: { padding: 16 },
  
  inputLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  submitButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 20, marginBottom: 10 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  
  subjectOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1 },
  disabledOption: { opacity: 0.6 },
  subjectOptionCode: { fontSize: 13, fontWeight: "bold" },
  subjectOptionName: { fontSize: 15, fontWeight: "500", marginTop: 2 },
  subjectOptionMeta: { fontSize: 11, marginTop: 2 },
  assignedChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5E9", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, gap: 4 },
  assignedChipText: { fontSize: 12, color: "#4CAF50", fontWeight: "500" },
});