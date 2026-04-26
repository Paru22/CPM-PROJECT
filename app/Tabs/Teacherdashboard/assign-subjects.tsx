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
  writeBatch,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

// ============================================================
// CLEAN INTERFACES - No subjectId, No credits
// ============================================================
interface Subject {
  id: string;
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

const SEMESTERS = [1, 2, 3, 4, 5, 6];

export default function SubjectManagementModule() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();

  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [assignments, setAssignments] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"subjects" | "assignments">("subjects");
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectSemester, setSubjectSemester] = useState("");
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);

  // ============================================================
  // FETCH DATA
  // ============================================================
  const fetchSubjects = useCallback(async () => {
    if (!user?.department) return;
    setLoadingSubjects(true);
    try {
      const q = query(collection(db, "subjects"), where("department", "==", user.department));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Subject));
      list.sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name));
      setSubjects(list);
    } catch {
      Alert.alert("Error", "Failed to load subjects");
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
      // ALL teachers including HOD
      setTeachers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher)));
    } catch {
      Alert.alert("Error", "Failed to load teachers");
    } finally {
      setLoadingTeachers(false);
    }
  }, [user?.department]);

  const fetchAssignments = useCallback(async () => {
    if (!user?.department) return;
    try {
      const q = query(collection(db, "teacherSubjects"), where("department", "==", user.department));
      const snapshot = await getDocs(q);
      setAssignments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherSubject)));
    } catch {
      Alert.alert("Error", "Failed to load assignments");
    }
  }, [user?.department]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSubjects(), fetchTeachers(), fetchAssignments()]);
    setLoading(false);
  }, [fetchSubjects, fetchTeachers, fetchAssignments]);

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => {
    if (!authLoading && user?.role !== "hod") {
      Alert.alert("Access Denied", "Only HOD can manage this page.");
      router.back();
      return;
    }
    if (user?.department) fetchAllData();
  }, [user, authLoading, fetchAllData, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  }, [fetchAllData]);

  // ============================================================
  // HELPERS
  // ============================================================
  const getAssignedTeacher = (subjectId: string) =>
    assignments.find((a) => a.subjectId === subjectId);

  // ============================================================
  // ADD SUBJECT - ONLY Name + Semester
  // ============================================================
  const handleAddSubject = async () => {
    if (!subjectName.trim()) {
      Alert.alert("Required", "Please enter subject name.");
      return;
    }
    if (!subjectSemester) {
      Alert.alert("Required", "Please select a semester.");
      return;
    }

    const sem = parseInt(subjectSemester);
    if (!SEMESTERS.includes(sem)) {
      Alert.alert("Invalid", "Semester must be between 1 and 6.");
      return;
    }

    const duplicate = subjects.some(
      (s) => s.name.toLowerCase() === subjectName.trim().toLowerCase() && s.semester === sem
    );
    if (duplicate) {
      Alert.alert("Duplicate", "This subject already exists in this semester.");
      return;
    }

    try {
      await addDoc(collection(db, "subjects"), {
        name: subjectName.trim(),
        department: user?.department,
        semester: sem,
      });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSubjectModalVisible(false);
      setSubjectName("");
      setSubjectSemester("");
      await fetchSubjects();
      Alert.alert("Success", "Subject added successfully!");
    } catch {
      Alert.alert("Error", "Failed to add subject.");
    }
  };

  // ============================================================
  // DELETE SUBJECT
  // ============================================================
  const handleDeleteSubject = async (subject: Subject) => {
    const assigned = getAssignedTeacher(subject.id);
    const msg = assigned
      ? `"${subject.name}" is assigned to ${assigned.teacherName}. Delete anyway?`
      : `Delete "${subject.name}" permanently?`;

    Alert.alert("Delete Subject", msg, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const batch = writeBatch(db);
            if (assigned) batch.delete(doc(db, "teacherSubjects", assigned.id));
            batch.delete(doc(db, "subjects", subject.id));
            await batch.commit();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await fetchAllData();
            Alert.alert("Deleted", "Subject removed.");
          } catch {
            Alert.alert("Error", "Failed to delete.");
          }
        },
      },
    ]);
  };

  // ============================================================
  // ASSIGN SUBJECT
  // ============================================================
  const handleAssignSubject = async (subject: Subject) => {
    if (!selectedTeacher) return;

    const existing = getAssignedTeacher(subject.id);

    if (existing) {
      if (existing.teacherId === selectedTeacher.id) {
        Alert.alert("Already Assigned", "This subject is already assigned to this teacher.");
        return;
      }

      Alert.alert(
        "Reassign?",
        `"${subject.name}" is currently assigned to ${existing.teacherName}.\n\nReassign to ${selectedTeacher.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reassign",
            onPress: async () => {
              await deleteDoc(doc(db, "teacherSubjects", existing.id));
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
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setAssignModalVisible(false);
              setSelectedTeacher(null);
              await fetchAssignments();
              Alert.alert("Success", `${subject.name} reassigned to ${selectedTeacher.name}`);
            },
          },
        ]
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setAssignModalVisible(false);
      setSelectedTeacher(null);
      await fetchAssignments();
      Alert.alert("Success", `${subject.name} assigned to ${selectedTeacher.name}`);
    } catch {
      Alert.alert("Error", "Failed to assign subject.");
    }
  };

  // ============================================================
  // REMOVE ASSIGNMENT
  // ============================================================
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
            await deleteDoc(doc(db, "teacherSubjects", assignment.id));
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            await fetchAssignments();
            Alert.alert("Success", "Assignment removed.");
          },
        },
      ]
    );
  };

  // ============================================================
  // LOADING
  // ============================================================
  if (authLoading || loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900 justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-gray-400 dark:text-gray-500 mt-4">Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!user || user.role !== "hod") return null;

  // ============================================================
  // MAIN UI
  // ============================================================
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-900">
      {/* ===== HEADER ===== */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-5 pt-14 pb-6 rounded-b-3xl"
      >
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center mr-4"
            android_ripple={{ color: "#ffffff30", borderless: true }}
          >
            <Ionicons
              name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"}
              size={22}
              color="#fff"
            />
          </Pressable>
          <View className="flex-1">
            <Text className="text-xl font-bold text-white">Subject Manager</Text>
            <Text className="text-sm text-white/80 mt-0.5">{user.department} Department</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ===== TAB BAR ===== */}
      <View className="flex-row mx-4 -mt-6 bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-lg shadow-black/10 z-10">
        {(["subjects", "assignments"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab(tab);
            }}
            className={`flex-1 flex-row items-center justify-center py-3 rounded-xl gap-2 ${
              activeTab === tab ? "bg-blue-50 dark:bg-blue-900/30" : ""
            }`}
            android_ripple={{ color: `${colors.primary}10` }}
          >
            <Ionicons
              name={tab === "subjects" ? "book-outline" : "people-outline"}
              size={18}
              color={activeTab === tab ? colors.primary : "#9CA3AF"}
            />
            <Text
              className={`text-sm font-semibold ${
                activeTab === tab
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {tab === "subjects" ? "Subjects" : "Teachers"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ===== CONTENT ===== */}
      <ScrollView
        className="flex-1 px-4 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ===== SUBJECTS TAB ===== */}
        {activeTab === "subjects" && (
          <>
            <Pressable
              onPress={() => setSubjectModalVisible(true)}
              className="flex-row items-center justify-center bg-green-500 py-3.5 rounded-2xl mb-4 gap-2"
              android_ripple={{ color: "#ffffff20" }}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text className="text-white font-semibold text-base">Add New Subject</Text>
            </Pressable>

            {loadingSubjects ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
            ) : subjects.length === 0 ? (
              <View className="items-center py-20">
                <View className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-4">
                  <Ionicons name="book-outline" size={48} color={colors.primary} />
                </View>
                <Text className="text-gray-400 dark:text-gray-500 text-lg font-medium">
                  No Subjects Yet
                </Text>
                <Text className="text-gray-400 dark:text-gray-500 text-sm mt-2 text-center px-8">
                  Start by adding subjects for {user.department} department
                </Text>
              </View>
            ) : (
              subjects.map((item) => {
                const assigned = getAssignedTeacher(item.id);
                const isHod = assigned ? teachers.find(t => t.id === assigned.teacherId)?.role === "hod" : false;
                return (
                  <View
                    key={item.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 flex-row items-center shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                    <View className="flex-1">
                      {/* Only Name */}
                      <Text className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {item.name}
                      </Text>
                      <View className="flex-row items-center gap-2 flex-wrap">
                        {/* Only Semester */}
                        <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                          <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                          <Text className="text-xs text-blue-600 dark:text-blue-400 ml-1 font-medium">
                            Semester {item.semester}
                          </Text>
                        </View>
                        {/* Assigned Status */}
                        {assigned ? (
                          <View className="flex-row items-center bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                            <Ionicons name="person" size={12} color="#10B981" />
                            <Text className="text-xs text-green-600 dark:text-green-400 ml-1 font-medium">
                              {assigned.teacherName}{isHod ? " (HOD)" : ""}
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center bg-orange-50 dark:bg-orange-900/20 px-2.5 py-1 rounded-full">
                            <Ionicons name="alert-circle-outline" size={12} color="#F59E0B" />
                            <Text className="text-xs text-orange-600 dark:text-orange-400 ml-1 font-medium">
                              Unassigned
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteSubject(item)}
                      className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 items-center justify-center ml-3"
                      android_ripple={{ color: "#F4433620", borderless: true }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ===== TEACHERS TAB ===== */}
        {activeTab === "assignments" && (
          <>
            {loadingTeachers ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
            ) : teachers.length === 0 ? (
              <View className="items-center py-20">
                <View className="w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 items-center justify-center mb-4">
                  <Ionicons name="people-outline" size={48} color={colors.primary} />
                </View>
                <Text className="text-gray-400 dark:text-gray-500 text-lg font-medium">
                  No Teachers Found
                </Text>
              </View>
            ) : (
              teachers.map((item) => {
                const teacherAssignments = assignments.filter((a) => a.teacherId === item.id);
                const isHod = item.role === "hod";
                return (
                  <View
                    key={item.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-base font-bold text-gray-900 dark:text-gray-100">
                            {item.name}
                          </Text>
                          {isHod && (
                            <View className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">
                              <Text className="text-xs font-bold text-purple-600 dark:text-purple-400">
                                HOD
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.email}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setSelectedTeacher(item);
                          setAssignModalVisible(true);
                        }}
                        className="flex-row items-center bg-blue-500 px-4 py-2 rounded-full"
                        android_ripple={{ color: "#ffffff30" }}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text className="text-white text-xs font-semibold ml-1">Assign</Text>
                      </Pressable>
                    </View>

                    {teacherAssignments.length > 0 ? (
                      <View className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">
                          ASSIGNED SUBJECTS ({teacherAssignments.length})
                        </Text>
                        {teacherAssignments.map((ass) => (
                          <View
                            key={ass.id}
                            className="flex-row justify-between items-center py-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-xl px-3 mb-2"
                          >
                            <View className="flex-1">
                              <Text className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {ass.subjectName}
                              </Text>
                              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Semester {ass.semester}
                              </Text>
                            </View>
                            <Pressable
                              onPress={() => handleRemoveAssignment(ass)}
                              className="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20"
                              android_ripple={{ color: "#F4433620" }}
                            >
                              <Text className="text-xs font-semibold text-red-500">Remove</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Text className="text-xs text-gray-400 dark:text-gray-500 italic">
                          No subjects assigned yet
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
        <View className="h-8" />
      </ScrollView>

      {/* ============================================================ */}
      {/* ADD SUBJECT MODAL - ONLY 2 FIELDS: Name + Semester */}
      {/* ============================================================ */}
      <Modal
        visible={subjectModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSubjectModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setSubjectModalVisible(false)}
        >
          <Pressable
            className="bg-white dark:bg-slate-800 rounded-t-3xl max-h-[85%]"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </View>
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Add New Subject
              </Text>
              <Pressable
                onPress={() => setSubjectModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.textLight} />
              </Pressable>
            </View>

            <ScrollView className="px-5 pt-4 pb-8" showsVerticalScrollIndicator={false}>
              {/* SUBJECT NAME ONLY */}
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Subject Name *
              </Text>
              <TextInput
                className="border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-slate-700"
                placeholder="e.g., Data Structures & Algorithms"
                placeholderTextColor={colors.textLight}
                value={subjectName}
                onChangeText={setSubjectName}
                autoFocus
              />

              {/* SEMESTER SELECTOR ONLY */}
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 mt-6">
                Semester *
              </Text>
              <View className="flex-row flex-wrap gap-3">
                {SEMESTERS.map((sem) => (
                  <Pressable
                    key={sem}
                    onPress={() => setSubjectSemester(sem.toString())}
                    className={`w-[30%] py-3 rounded-xl border-2 ${
                      subjectSemester === sem.toString()
                        ? "bg-blue-500 border-blue-500"
                        : "border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700"
                    }`}
                    android_ripple={{
                      color: subjectSemester === sem.toString() ? "#ffffff30" : `${colors.primary}20`,
                    }}
                  >
                    <Text
                      className={`text-center text-sm font-bold ${
                        subjectSemester === sem.toString()
                          ? "text-white"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      Sem {sem}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* SUBMIT BUTTON */}
              <Pressable
                onPress={handleAddSubject}
                className={`py-4 rounded-2xl items-center mt-8 ${
                  !subjectName.trim() || !subjectSemester
                    ? "bg-gray-300 dark:bg-gray-600"
                    : "bg-green-500"
                }`}
                android_ripple={{ color: "#ffffff20" }}
                disabled={!subjectName.trim() || !subjectSemester}
              >
                <Text className="text-white font-bold text-base">Create Subject</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============================================================ */}
      {/* ASSIGN SUBJECT MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setAssignModalVisible(false);
          setSelectedTeacher(null);
        }}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => {
            setAssignModalVisible(false);
            setSelectedTeacher(null);
          }}
        >
          <Pressable
            className="bg-white dark:bg-slate-800 rounded-t-3xl max-h-[85%]"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center pt-3 pb-2">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </View>
            <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Assign Subject
                </Text>
                {selectedTeacher && (
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    to {selectedTeacher.name}
                    {selectedTeacher.role === "hod" ? " (HOD)" : ""}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={() => {
                  setAssignModalVisible(false);
                  setSelectedTeacher(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.textLight} />
              </Pressable>
            </View>

            <ScrollView className="px-5 pt-4 pb-8" showsVerticalScrollIndicator={false}>
              {subjects.length === 0 ? (
                <View className="items-center py-16">
                  <Ionicons name="book-outline" size={48} color={colors.textLight} />
                  <Text className="text-gray-400 dark:text-gray-500 mt-3 font-medium">
                    No Subjects Available
                  </Text>
                  <Text className="text-gray-400 dark:text-gray-500 text-sm mt-2 text-center">
                    Add subjects first from the Subjects tab
                  </Text>
                </View>
              ) : (
                subjects.map((subject) => {
                  const assigned = getAssignedTeacher(subject.id);
                  const otherTeacher = assigned && assigned.teacherId !== selectedTeacher?.id;
                  const sameTeacher = assigned && assigned.teacherId === selectedTeacher?.id;

                  return (
                    <Pressable
                      key={subject.id}
                      onPress={() => {
                        if (sameTeacher) {
                          Alert.alert("Already Assigned", "Already assigned to this teacher.");
                          return;
                        }
                        handleAssignSubject(subject);
                      }}
                      className={`flex-row items-center py-4 border-b border-gray-100 dark:border-gray-700 ${
                        otherTeacher ? "opacity-60" : ""
                      }`}
                      android_ripple={{ color: `${colors.primary}10` }}
                    >
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {subject.name}
                        </Text>
                        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Semester {subject.semester}
                        </Text>
                      </View>

                      {sameTeacher ? (
                        <View className="flex-row items-center bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                          <Text className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1">
                            Assigned
                          </Text>
                        </View>
                      ) : otherTeacher ? (
                        <View className="flex-row items-center bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-full">
                          <Ionicons name="person" size={14} color="#F59E0B" />
                          <Text className="text-xs font-medium text-orange-600 dark:text-orange-400 ml-1">
                            {assigned?.teacherName}
                            {teachers.find((t) => t.id === assigned?.teacherId)?.role === "hod"
                              ? " (HOD)"
                              : ""}
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-full">
                          <Ionicons name="add-circle" size={18} color="#10B981" />
                          <Text className="text-xs font-semibold text-green-600 dark:text-green-400 ml-1">
                            Assign
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}