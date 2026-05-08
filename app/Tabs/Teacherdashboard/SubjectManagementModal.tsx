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
import React, { useEffect, useState, useCallback } from "react";
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
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

// Define interfaces for better TypeScript support
interface Subject {
  id: string;
  subjectCode: string;
  subjectName?: string;
  name?: string;
  semester: number;
  department: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Teacher {
  id: string;
  name?: string;
  Name?: string;
  department?: string;
  role?: string | string[];
  designation?: string;
}

interface TeacherSubject {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  semester: number;
  department: string;
  assignedAt: string;
}

export default function SubjectManagementModal({
  visible,
  onClose,
  department,
  onSubjectsUpdated,
}: {
  visible: boolean;
  onClose: () => void;
  department: string;
  onSubjectsUpdated?: () => void;
}) {
  const { colors, theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<TeacherSubject[]>([]);

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState("");

  const [selectedDeleteSubjectId, setSelectedDeleteSubjectId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedAssignSubjectId, setSelectedAssignSubjectId] = useState("");

  const [activeTab, setActiveTab] = useState<"add" | "delete" | "assign" | "view">("add");

  // ================= LOAD DATA =================
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Load subjects for this department
      const subSnap = await getDocs(
        query(collection(db, "subjects"), where("department", "==", department))
      );

      const subList: Subject[] = subSnap.docs.map((d) => ({
        id: d.id,
        subjectCode: d.id,
        ...d.data(),
      } as Subject));

      setSubjects(subList);

      // 2. Load teachers - Get all teachers and filter by department
      const teacherSnap = await getDocs(collection(db, "teachers"));
      const allTeachers: Teacher[] = teacherSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as Teacher));
      
      // Filter teachers by department (case insensitive)
      const filteredTeachers = allTeachers.filter(teacher => {
        const teacherDept = teacher.department?.toLowerCase().trim();
        const currentDept = department?.toLowerCase().trim();
        return teacherDept === currentDept;
      });
      
      setTeachers(filteredTeachers);

      // 3. Load subject assignments
      const assignSnap = await getDocs(
        query(collection(db, "teacherSubjects"), where("department", "==", department))
      );
      const assignments: TeacherSubject[] = assignSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as TeacherSubject));
      setAssignedSubjects(assignments);
    } catch (err) {
      const error = err as Error;
      console.log("Error loading data:", error);
      Alert.alert("Error loading data", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [department]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ================= ADD SUBJECT =================
  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !newSubjectSemester.trim()) {
      Alert.alert("Fill all fields");
      return;
    }

    const sem = parseInt(newSubjectSemester);
    if (isNaN(sem) || sem < 1 || sem > 8) {
      Alert.alert("Invalid Semester", "Semester must be between 1 and 8");
      return;
    }

    const deptPrefix = department.substring(0, 3).toUpperCase();
    const randomNum = String(Math.floor(Math.random() * 9000) + 1000);
    const subjectCode = deptPrefix + sem + randomNum;

    setLoading(true);

    try {
      await setDoc(doc(db, "subjects", subjectCode), {
        subjectName: newSubjectName.trim(),
        name: newSubjectName.trim(),
        subjectCode: subjectCode,
        semester: sem,
        department,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      Alert.alert("Success", `Subject added with code: ${subjectCode}`);

      setNewSubjectName("");
      setNewSubjectSemester("");
      loadData();
      if (onSubjectsUpdated) onSubjectsUpdated();

    } catch (err) {
      const error = err as Error;
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
              const error = err as Error;
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

    // Check if already assigned
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

      if (!teacher || !subject) {
        Alert.alert("Error", "Teacher or subject not found");
        return;
      }

      await addDoc(collection(db, "teacherSubjects"), {
        teacherId: selectedTeacherId,
        teacherName: teacher.name || teacher.Name || "Unknown",
        subjectId: subject.id,
        subjectName: subject.subjectName || subject.name || "",
        subjectCode: subject.subjectCode || subject.id,
        semester: subject.semester,
        department,
        assignedAt: new Date().toISOString(),
        assignedBy: "admin",
      });

      Alert.alert("Success", "Subject assigned to teacher");

      setSelectedTeacherId("");
      setSelectedAssignSubjectId("");
      loadData();
      if (onSubjectsUpdated) onSubjectsUpdated();

    } catch (err) {
      const error = err as Error;
      console.log(error);
      Alert.alert("Error", `Assign failed: ${error.message}`);
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
            const error = err as Error;
            console.log(error);
            Alert.alert("Error", "Failed to remove");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Helper to get teacher display name
  const getTeacherName = (teacher: Teacher) => {
    return teacher.name || teacher.Name || "Unnamed Teacher";
  };

  // Helper to get teacher role/designation
  const getTeacherRole = (teacher: Teacher) => {
    if (teacher.role) {
      if (Array.isArray(teacher.role)) {
        return teacher.role.join(", ");
      }
      return teacher.role;
    }
    return teacher.designation || "Teacher";
  };

  // Check if subject is assigned to selected teacher
  const isSubjectAssignedToTeacher = (subjectId: string) => {
    if (!selectedTeacherId) return false;
    return assignedSubjects.some(
      a => a.teacherId === selectedTeacherId && a.subjectId === subjectId
    );
  };

  // Get tab color based on active tab
  const getTabColor = (tabId: string) => {
    if (activeTab === tabId) {
      if (tabId === "delete") return "#F44336";
      return colors.primary;
    }
    return colors.border;
  };

  // ================= UI =================
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header with Gradient */}
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Subject Management</Text>
              <Text style={styles.headerSubtitle}>Department: {department}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={[styles.tabContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "add" && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab("add")}
            >
              <Ionicons name="add-circle-outline" size={20} color={activeTab === "add" ? colors.primary : colors.textLight} />
              <Text style={[styles.tabText, { color: activeTab === "add" ? colors.primary : colors.textLight }]}>Add</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "delete" && { borderBottomColor: "#F44336" }]}
              onPress={() => setActiveTab("delete")}
            >
              <Ionicons name="trash-outline" size={20} color={activeTab === "delete" ? "#F44336" : colors.textLight} />
              <Text style={[styles.tabText, { color: activeTab === "delete" ? "#F44336" : colors.textLight }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "assign" && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab("assign")}
            >
              <Ionicons name="link-outline" size={20} color={activeTab === "assign" ? colors.primary : colors.textLight} />
              <Text style={[styles.tabText, { color: activeTab === "assign" ? colors.primary : colors.textLight }]}>Assign</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === "view" && { borderBottomColor: colors.primary }]}
              onPress={() => setActiveTab("view")}
            >
              <Ionicons name="eye-outline" size={20} color={activeTab === "view" ? colors.primary : colors.textLight} />
              <Text style={[styles.tabText, { color: activeTab === "view" ? colors.primary : colors.textLight }]}>View</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading...</Text>
            </View>
          ) : (
            <>
              {/* ===== ADD SUBJECT TAB ===== */}
              {activeTab === "add" && (
                <View style={styles.section}>
                  <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                      <Ionicons name="add-circle-outline" size={20} color={colors.primary} /> Add New Subject
                    </Text>

                    <Text style={[styles.label, { color: colors.textLight }]}>Subject Name *</Text>
                    <TextInput
                      placeholder="e.g., Database Management Systems"
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      placeholderTextColor={colors.textLight}
                      value={newSubjectName}
                      onChangeText={setNewSubjectName}
                    />

                    <Text style={[styles.label, { color: colors.textLight }]}>Semester *</Text>
                    <TextInput
                      placeholder="Enter semester (1-8)"
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      placeholderTextColor={colors.textLight}
                      value={newSubjectSemester}
                      onChangeText={setNewSubjectSemester}
                      keyboardType="numeric"
                      maxLength={1}
                    />

                    <TouchableOpacity style={styles.addBtn} onPress={handleAddSubject} disabled={loading}>
                      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.gradientButton}>
                        <Ionicons name="add-circle-outline" size={20} color="#fff" />
                        <Text style={styles.btnText}>Add Subject</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ===== DELETE SUBJECT TAB ===== */}
              {activeTab === "delete" && (
                <View style={styles.section}>
                  <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                      <Ionicons name="trash-outline" size={20} color="#F44336" /> Delete Subject
                    </Text>

                    {subjects.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="document-outline" size={64} color={colors.textLight} />
                        <Text style={[styles.emptyText, { color: colors.textLight }]}>No subjects found</Text>
                      </View>
                    ) : (
                      subjects.map((s) => (
                        <TouchableOpacity
                          key={s.id}
                          onPress={() => setSelectedDeleteSubjectId(s.id)}
                          style={[
                            styles.subjectItem,
                            { backgroundColor: colors.background, borderColor: colors.border },
                            selectedDeleteSubjectId === s.id && styles.selectedDeleteItem,
                          ]}
                        >
                          <View style={styles.subjectItemContent}>
                            <View>
                              <Text style={[styles.subjectName, { color: colors.textDark }]}>{s.subjectName || s.name}</Text>
                              <Text style={[styles.subjectDetails, { color: colors.textLight }]}>Code: {s.subjectCode} | Sem: {s.semester}</Text>
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
                        <LinearGradient colors={["#F44336", "#D32F2F"]} style={styles.gradientButton}>
                          <Ionicons name="trash-outline" size={20} color="#fff" />
                          <Text style={styles.btnText}>Delete Selected Subject</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* ===== ASSIGN TAB ===== */}
              {activeTab === "assign" && (
                <View style={styles.section}>
                  <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                      <Ionicons name="link-outline" size={20} color={colors.primary} /> Assign Subject to Teacher
                    </Text>

                    <Text style={[styles.label, { color: colors.textLight }]}>Select Teacher</Text>
                    {teachers.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="person-outline" size={48} color={colors.textLight} />
                        <Text style={[styles.emptyText, { color: colors.textLight }]}>
                          No teachers found in {department} department
                        </Text>
                      </View>
                    ) : (
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {teachers.map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            onPress={() => setSelectedTeacherId(t.id)}
                            style={[
                              styles.selectorItem,
                              { backgroundColor: colors.background, borderColor: colors.border },
                              selectedTeacherId === t.id && styles.selectedItem,
                            ]}
                          >
                            <View style={styles.selectorItemContent}>
                              <View>
                                <Text style={[styles.selectorTitle, { color: colors.textDark }]}>{getTeacherName(t)}</Text>
                                <Text style={[styles.selectorSub, { color: colors.textLight }]}>
                                  Role: {getTeacherRole(t)} | Dept: {t.department || "N/A"}
                                </Text>
                              </View>
                              {selectedTeacherId === t.id && (
                                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}

                    <Text style={[styles.label, { color: colors.textLight, marginTop: 15 }]}>Select Subject</Text>
                    {subjects.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="book-outline" size={48} color={colors.textLight} />
                        <Text style={[styles.emptyText, { color: colors.textLight }]}>
                          No subjects available in {department} department
                        </Text>
                      </View>
                    ) : (
                      <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {subjects.map((s) => {
                          const isAssigned = isSubjectAssignedToTeacher(s.id);
                          
                          return (
                            <TouchableOpacity
                              key={s.id}
                              onPress={() => !isAssigned && setSelectedAssignSubjectId(s.id)}
                              disabled={isAssigned}
                              style={[
                                styles.selectorItem,
                                { backgroundColor: colors.background, borderColor: colors.border },
                                selectedAssignSubjectId === s.id && styles.selectedItem,
                                isAssigned && styles.disabledItem,
                              ]}
                            >
                              <View style={styles.selectorItemContent}>
                                <View>
                                  <Text style={[styles.selectorTitle, { color: colors.textDark }]}>{s.subjectName || s.name}</Text>
                                  <Text style={[styles.selectorSub, { color: colors.textLight }]}>
                                    Code: {s.subjectCode} | Sem: {s.semester}
                                  </Text>
                                </View>
                                {isAssigned ? (
                                  <Ionicons name="checkmark-done" size={24} color={colors.primary} />
                                ) : selectedAssignSubjectId === s.id ? (
                                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                ) : null}
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}

                    {selectedTeacherId && selectedAssignSubjectId && (
                      <TouchableOpacity style={styles.assignBtn} onPress={handleAssign} disabled={loading}>
                        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.gradientButton}>
                          <Ionicons name="link-outline" size={20} color="#fff" />
                          <Text style={styles.btnText}>Assign Subject to Teacher</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* ===== VIEW ASSIGNMENTS TAB ===== */}
              {activeTab === "view" && (
                <View style={styles.section}>
                  <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                      <Ionicons name="eye-outline" size={20} color={colors.primary} /> Current Assignments
                    </Text>

                    {assignedSubjects.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="link-outline" size={64} color={colors.textLight} />
                        <Text style={[styles.emptyText, { color: colors.textLight }]}>No assignments yet</Text>
                      </View>
                    ) : (
                      assignedSubjects.map((a) => (
                        <View
                          key={a.id}
                          style={[styles.assignmentItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                        >
                          <View style={styles.assignmentContent}>
                            <View>
                              <Text style={[styles.assignmentTitle, { color: colors.textDark }]}>{a.subjectName}</Text>
                              <Text style={[styles.assignmentDetails, { color: colors.textLight }]}>
                                Teacher: {a.teacherName} | Sem: {a.semester}
                              </Text>
                              <Text style={[styles.assignmentCode, { color: colors.textLight }]}>Code: {a.subjectCode}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleUnassign(a.id)} style={styles.unassignBtn}>
                              <Ionicons name="close-circle" size={28} color="#F44336" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ================= STYLES =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  backButton: {
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
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  section: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  addBtn: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  assignBtn: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  deleteBtn: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    gap: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  subjectItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  subjectItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subjectName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  subjectDetails: {
    fontSize: 12,
  },
  selectedDeleteItem: {
    borderColor: "#F44336",
    borderWidth: 2,
  },
  selectorItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  selectedItem: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  selectorItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  selectorSub: {
    fontSize: 12,
  },
  disabledItem: {
    opacity: 0.6,
  },
  assignmentItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  assignmentContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  assignmentDetails: {
    fontSize: 12,
    marginBottom: 2,
  },
  assignmentCode: {
    fontSize: 11,
  },
  unassignBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 12,
  },
});