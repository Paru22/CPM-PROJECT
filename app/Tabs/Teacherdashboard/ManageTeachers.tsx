import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, deleteDoc, doc, getDocs, updateDoc, query, where } from "firebase/firestore";
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
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string[];
  phone?: string;
  subjects?: string;
  joinDate?: string;
  qualification?: string;
  address?: string;
  labIncharge?: string;
  classTeacherFor?: string;
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

// Helper function to normalize role to array
const normalizeRole = (role: string | string[] | undefined): string[] => {
  if (!role) return [];
  if (Array.isArray(role)) return role;
  if (typeof role === 'string') return [role];
  return [];
};

const normalizeDepartment = (dept: string): string => {
  if (!dept) return "";
  const deptMap: { [key: string]: string } = {
    'cse': 'CSE',
    'computer science': 'CSE',
    'cs': 'CSE',
    'ece': 'ECE',
    'electronics': 'ECE',
    'mech': 'MECH',
    'mechanical': 'MECH',
    'civil': 'CIVIL',
    'eee': 'EEE',
    'it': 'IT',
  };
  const lowerDept = dept.toLowerCase().trim();
  return deptMap[lowerDept] || dept.toUpperCase();
};

const ManageTeachers = () => {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<TeacherSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All");

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedLab, setSelectedLab] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [viewTeacherModal, setViewTeacherModal] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  
  const roles = [
    { id: "teacher", name: "Teacher", icon: "school-outline" as const },
    { id: "class_teacher", name: "Class Teacher", icon: "briefcase-outline" as const },
    { id: "hod", name: "HoD", icon: "shield-checkmark-outline" as const },
    { id: "lab_incharge", name: "Lab Incharge", icon: "flask-outline" as const },
  ];

  const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];

  // Fetch subject assignments for teachers
  const fetchSubjectAssignments = useCallback(async () => {
    try {
      const q = query(collection(db, "teacherSubjects"));
      const snapshot = await getDocs(q);
      const assignmentsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeacherSubject[];
      setSubjectAssignments(assignmentsList);
    } catch (error) {
      console.error("Error fetching subject assignments:", error);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const teachersSnap = await getDocs(collection(db, "teachers"));
      const teachersList = teachersSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          role: normalizeRole(data.role),
          classTeacherFor: data.classTeacherFor || null
        } as Teacher;
      });
      
      setTeachers(teachersList);
      applyFilters(teachersList, searchQuery, selectedRole);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      Alert.alert("Error", "Failed to load teachers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedRole]);

  useEffect(() => {
    fetchTeachers();
    fetchSubjectAssignments();
  }, [fetchTeachers, fetchSubjectAssignments]);

  const applyFilters = (data: Teacher[], query: string, role: string) => {
    let filtered = [...data];
    
    if (query) {
      filtered = filtered.filter(teacher =>
        teacher.name?.toLowerCase().includes(query.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(query.toLowerCase()) ||
        teacher.department?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (role !== "All") {
      filtered = filtered.filter(teacher => teacher.role?.includes(role));
    }
    
    setFilteredTeachers(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(teachers, text, selectedRole);
  };

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
    applyFilters(teachers, searchQuery, role);
  };

  const handleAssignRoles = async () => {
    if (!selectedTeacher) return;

    // Validate Lab Incharge
    if (selectedRoles.includes("lab_incharge") && !selectedLab.trim()) {
      Alert.alert("Missing Info", "Please enter the lab name for Lab Incharge");
      return;
    }
    
    // Validate Class Teacher
    if (selectedRoles.includes("class_teacher") && !selectedSemester) {
      Alert.alert("Missing Info", "Please select a semester for Class Teacher");
      return;
    }

    try {
      const teacherRef = doc(db, "teachers", selectedTeacher.id);
      
      const updateData: any = {
        updatedAt: new Date().toISOString(),
        role: selectedRoles,
      };
      
      // Lab Incharge
      if (selectedRoles.includes("lab_incharge")) {
        updateData.labIncharge = selectedLab.trim();
      } else {
        updateData.labIncharge = null;
      }
      
      // Class Teacher
      if (selectedRoles.includes("class_teacher")) {
        const existingClassTeacher = teachers.find(t => 
          t.classTeacherFor === selectedSemester && t.id !== selectedTeacher.id
        );
        
        if (existingClassTeacher) {
          Alert.alert(
            "Already Assigned",
            `Semester ${selectedSemester} is already assigned to ${existingClassTeacher.name} as Class Teacher.`,
            [{ text: "OK" }]
          );
          return;
        }
        updateData.classTeacherFor = selectedSemester;
      } else {
        updateData.classTeacherFor = null;
      }
      
      await updateDoc(teacherRef, updateData);
      
      Alert.alert("Success", `Roles updated for ${selectedTeacher.name}`);
      setRoleModalVisible(false);
      setSelectedTeacher(null);
      setSelectedRoles([]);
      setSelectedLab("");
      setSelectedSemester("");
      fetchTeachers();
    } catch (error) {
      console.error("Role assignment error:", error);
      Alert.alert("Error", "Failed to assign roles");
    }
  };

  const handleRemoveClassTeacher = async (teacher: Teacher) => {
    if (!teacher.classTeacherFor) return;
    
    Alert.alert(
      "Remove Class Teacher",
      `Remove ${teacher.name} from Semester ${teacher.classTeacherFor}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const teacherRef = doc(db, "teachers", teacher.id);
              await updateDoc(teacherRef, { classTeacherFor: null });
              Alert.alert("Success", `Removed from Semester ${teacher.classTeacherFor}`);
              fetchTeachers();
            } catch (error) {
              console.error("Error removing class teacher:", error);
              Alert.alert("Error", "Failed to remove assignment");
            }
          }
        }
      ]
    );
  };

  const handleRemoveLabIncharge = async (teacher: Teacher) => {
    Alert.alert(
      "Remove Lab Incharge",
      `Remove ${teacher.name} from Lab Incharge?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const teacherRef = doc(db, "teachers", teacher.id);
              await updateDoc(teacherRef, { labIncharge: null });
              Alert.alert("Success", `Removed Lab Incharge from ${teacher.name}`);
              fetchTeachers();
            } catch (error) {
              console.error("Error removing lab incharge:", error);
              Alert.alert("Error", "Failed to remove lab incharge");
            }
          }
        }
      ]
    );
  };

  const handleRemoveSubject = async (subjectAssignment: TeacherSubject, teacherName: string) => {
    Alert.alert(
      "Remove Subject",
      `Remove "${subjectAssignment.subjectName}" from ${teacherName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "teacherSubjects", subjectAssignment.id));
              Alert.alert("Success", `Subject removed from ${teacherName}`);
              fetchSubjectAssignments();
            } catch (error) {
              console.error("Error removing subject:", error);
              Alert.alert("Error", "Failed to remove subject");
            }
          }
        }
      ]
    );
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;

    try {
      // Also delete all subject assignments for this teacher
      const teacherSubjects = subjectAssignments.filter(s => s.teacherId === teacherToDelete.id);
      for (const subject of teacherSubjects) {
        await deleteDoc(doc(db, "teacherSubjects", subject.id));
      }
      
      await deleteDoc(doc(db, "teachers", teacherToDelete.id));
      Alert.alert("Success", `Teacher ${teacherToDelete.name} has been deleted`);
      setDeleteConfirmVisible(false);
      setTeacherToDelete(null);
      fetchTeachers();
      fetchSubjectAssignments();
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete teacher");
    }
  };

  const getRoleIcon = (roleId: string): keyof typeof Ionicons.glyphMap => {
    const roleObj = roles.find(r => r.id === roleId);
    return roleObj?.icon || "person-outline";
  };

  const getRoleColor = (roleId: string) => {
    switch(roleId) {
      case "teacher": return "#4CAF50";
      case "class_teacher": return "#2196F3";
      case "hod": return "#F44336";
      case "lab_incharge": return "#9C27B0";
      default: return "#7384BF";
    }
  };

  const getRoleDisplayName = (roleId: string) => {
    const roleObj = roles.find(r => r.id === roleId);
    return roleObj?.name || roleId.replace("_", " ").toUpperCase();
  };

  const getTeacherSubjects = (teacherId: string) => {
    return subjectAssignments.filter(assignment => assignment.teacherId === teacherId);
  };

  const openRoleModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setSelectedRoles(teacher.role || []);
    setSelectedLab(teacher.labIncharge || "");
    setSelectedSemester(teacher.classTeacherFor || "");
    setRoleModalVisible(true);
  };

  const toggleRole = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      setSelectedRoles(selectedRoles.filter(r => r !== roleId));
      if (roleId === "lab_incharge") {
        setSelectedLab("");
      }
      if (roleId === "class_teacher") {
        setSelectedSemester("");
      }
    } else {
      setSelectedRoles([...selectedRoles, roleId]);
    }
  };

  const renderTeacherCard = ({ item }: { item: Teacher }) => {
    const normalizedDept = normalizeDepartment(item.department);
    const teacherRoles = item.role || [];
    const teacherSubjects = getTeacherSubjects(item.id);
    const hasTeacherRole = teacherRoles.includes("teacher");
    
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.teacherInfo}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{item.name?.charAt(0) || "T"}</Text>
            </View>
            <View style={styles.teacherDetails}>
              <Text style={[styles.teacherName, { color: colors.textDark }]}>{item.name}</Text>
              <Text style={[styles.teacherEmail, { color: colors.textLight }]}>{item.email}</Text>
              <View style={styles.badgeRow}>
                {teacherRoles.map((roleId) => (
                  <View key={roleId} style={[styles.roleBadge, { backgroundColor: getRoleColor(roleId) + "20" }]}>
                    <Ionicons name={getRoleIcon(roleId)} size={12} color={getRoleColor(roleId)} />
                    <Text style={[styles.roleText, { color: getRoleColor(roleId) }]}>
                      {getRoleDisplayName(roleId)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={() => {
                setViewingTeacher(item);
                setViewTeacherModal(true);
              }}
            >
              <Ionicons name="eye-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={() => openRoleModal(item)}
            >
              <Ionicons name="shield-outline" size={20} color="#2196F3" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.background }]}
              onPress={() => {
                setTeacherToDelete(item);
                setDeleteConfirmVisible(true);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.footerItem}>
            <Ionicons name="business-outline" size={14} color={colors.textLight} />
            <Text style={[styles.footerText, { color: colors.textLight }]}>{normalizedDept || "N/A"}</Text>
          </View>
          {item.phone && (
            <View style={styles.footerItem}>
              <Ionicons name="call-outline" size={14} color={colors.textLight} />
              <Text style={[styles.footerText, { color: colors.textLight }]}>{item.phone}</Text>
            </View>
          )}
        </View>
        
        {/* Assignment Details Section */}
        <View style={styles.assignmentSection}>
          {/* Teacher Role - Shows assigned subjects with remove button */}
          {hasTeacherRole && teacherSubjects.length > 0 && (
            <View style={[styles.assignmentCard, { backgroundColor: colors.background }]}>
              <View style={[styles.assignmentIcon, { backgroundColor: "#4CAF50" + "20" }]}>
                <Ionicons name="school-outline" size={18} color="#4CAF50" />
              </View>
              <View style={styles.assignmentContent}>
                <Text style={[styles.assignmentLabel, { color: colors.textLight }]}>Teaching Subjects</Text>
                <View style={styles.subjectsContainer}>
                  {teacherSubjects.map((subject) => (
                    <View key={subject.id} style={styles.subjectItem}>
                      <View style={styles.subjectTag}>
                        <Text style={[styles.subjectTagText, { color: colors.textDark }]}>
                          {subject.subjectName} (Sem {subject.semester})
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveSubject(subject, item.name)}>
                        <Ionicons name="close-circle" size={18} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
          
          {/* Teacher Role - No subjects assigned */}
          {hasTeacherRole && teacherSubjects.length === 0 && (
            <View style={[styles.assignmentCard, { backgroundColor: colors.background }]}>
              <View style={[styles.assignmentIcon, { backgroundColor: "#4CAF50" + "20" }]}>
                <Ionicons name="school-outline" size={18} color="#4CAF50" />
              </View>
              <View style={styles.assignmentContent}>
                <Text style={[styles.assignmentLabel, { color: colors.textLight }]}>Teaching Subjects</Text>
                <Text style={[styles.noSubjectsText, { color: colors.textLight }]}>No subjects assigned yet</Text>
              </View>
            </View>
          )}
          
          {/* Class Teacher Assignment with remove button */}
          {item.classTeacherFor && (
            <View style={[styles.assignmentCard, { backgroundColor: colors.background }]}>
              <View style={[styles.assignmentIcon, { backgroundColor: "#2196F3" + "20" }]}>
                <Ionicons name="briefcase-outline" size={18} color="#2196F3" />
              </View>
              <View style={styles.assignmentContent}>
                <Text style={[styles.assignmentLabel, { color: colors.textLight }]}>Class Teacher</Text>
                <Text style={[styles.assignmentValue, { color: colors.textDark }]}>Semester {item.classTeacherFor}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveClassTeacher(item)}>
                <Ionicons name="close-circle" size={22} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Lab Incharge Assignment with remove button */}
          {item.labIncharge && (
            <View style={[styles.assignmentCard, { backgroundColor: colors.background }]}>
              <View style={[styles.assignmentIcon, { backgroundColor: "#9C27B0" + "20" }]}>
                <Ionicons name="flask-outline" size={18} color="#9C27B0" />
              </View>
              <View style={styles.assignmentContent}>
                <Text style={[styles.assignmentLabel, { color: colors.textLight }]}>Lab Incharge</Text>
                <Text style={[styles.assignmentValue, { color: colors.textDark }]}>{item.labIncharge}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveLabIncharge(item)}>
                <Ionicons name="close-circle" size={22} color="#F44336" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading teachers...</Text>
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
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Manage Teachers</Text>
            <Text style={styles.headerSubtitle}>View and manage teacher roles</Text>
          </View>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            fetchTeachers();
            fetchSubjectAssignments();
          }} colors={[colors.primary]} />
        }
      >
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textDark }]}
            placeholder="Search by name, email or department..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Role Filters */}
        <View style={styles.filtersSection}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Filter by Role</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedRole === "All" && styles.activeFilterChip
              ]}
              onPress={() => handleRoleFilter("All")}
            >
              <Text style={[
                styles.filterChipText,
                { color: colors.textLight },
                selectedRole === "All" && styles.activeFilterText
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedRole === role.id && styles.activeFilterChip
                ]}
                onPress={() => handleRoleFilter(role.id)}
              >
                <Ionicons name={role.icon} size={14} color={selectedRole === role.id ? "#fff" : getRoleColor(role.id)} />
                <Text style={[
                  styles.filterChipText,
                  { color: colors.textLight },
                  selectedRole === role.id && styles.activeFilterText
                ]}>
                  {role.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Teachers List */}
        {filteredTeachers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>No teachers found</Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>Try adjusting your filters</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTeachers}
            renderItem={renderTeacherCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </ScrollView>

      {/* Assign Roles Modal - Same as before */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={roleModalVisible}
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Roles</Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Teacher: {selectedTeacher?.name}</Text>
              <Text style={[styles.modalSubLabel, { color: colors.textLight }]}>Select roles (can select multiple)</Text>
              
              <View style={styles.rolesGrid}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleCard,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedRoles.includes(role.id) && styles.selectedRoleCard
                    ]}
                    onPress={() => toggleRole(role.id)}
                  >
                    <View style={[styles.roleIconContainer, { backgroundColor: getRoleColor(role.id) + "20" }]}>
                      <Ionicons name={role.icon} size={24} color={getRoleColor(role.id)} />
                    </View>
                    <Text style={[styles.roleName, { color: colors.textDark }]}>{role.name}</Text>
                    {selectedRoles.includes(role.id) && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Lab Incharge - ONLY shows Lab Name input */}
              {selectedRoles.includes("lab_incharge") && (
                <View style={styles.specificField}>
                  <Text style={[styles.fieldLabel, { color: colors.textDark }]}>
                    Lab Name <Text style={{ color: "#F44336" }}>*</Text>
                  </Text>
                  <Text style={[styles.fieldHint, { color: colors.textLight }]}>
                    Enter the lab name ({' e.g., "Computer Lab 1", "Physics Lab"'})
                  </Text>
                  <TextInput
                    style={[styles.labInput, { 
                      backgroundColor: colors.background, 
                      borderColor: colors.border, 
                      color: colors.textDark 
                    }]}
                    placeholder="e.g., Computer Lab 1"
                    placeholderTextColor={colors.textLight}
                    value={selectedLab}
                    onChangeText={setSelectedLab}
                  />
                </View>
              )}
              
              {/* Class Teacher - ONLY shows Semester selection */}
              {selectedRoles.includes("class_teacher") && (
                <View style={styles.specificField}>
                  <Text style={[styles.fieldLabel, { color: colors.textDark }]}>
                    Select Semester <Text style={{ color: "#F44336" }}>*</Text>
                  </Text>
                  <Text style={[styles.fieldHint, { color: colors.textLight }]}>
                    {selectedTeacher?.classTeacherFor ? 
                      `Currently assigned to Semester ${selectedTeacher.classTeacherFor}. Selecting a new semester will replace this.` :
                      "Select a semester to assign as Class Teacher"}
                  </Text>
                  <View style={styles.semesterGrid}>
                    {semesters.map((sem) => {
                      const isTakenByOther = teachers.some(t => 
                        t.classTeacherFor === sem && t.id !== selectedTeacher?.id
                      );
                      const isCurrent = selectedTeacher?.classTeacherFor === sem;
                      
                      return (
                        <TouchableOpacity
                          key={sem}
                          style={[
                            styles.semesterOption,
                            { backgroundColor: colors.background, borderColor: colors.border },
                            selectedSemester === sem && styles.selectedSemesterOption,
                            (isTakenByOther && !isCurrent) && styles.disabledSemesterOption
                          ]}
                          onPress={() => !isTakenByOther && setSelectedSemester(sem)}
                          disabled={isTakenByOther && !isCurrent}
                        >
                          <Text style={[
                            styles.semesterOptionText,
                            { color: colors.textDark },
                            selectedSemester === sem && styles.selectedSemesterOptionText,
                            (isTakenByOther && !isCurrent) && styles.disabledSemesterOptionText
                          ]}>
                            Semester {sem}
                          </Text>
                          {isTakenByOther && !isCurrent && (
                            <Text style={styles.alreadyAssignedText}>Already Assigned</Text>
                          )}
                          {isCurrent && (
                            <Text style={styles.currentText}>Current</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
              
              <TouchableOpacity
                style={styles.assignButton}
                onPress={handleAssignRoles}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.assignGradient}
                >
                  <Ionicons name="save-outline" size={24} color="white" />
                  <Text style={styles.assignButtonText}>Save Roles</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Teacher Modal - Same as before */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewTeacherModal}
        onRequestClose={() => setViewTeacherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.viewModalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teacher Details</Text>
              <TouchableOpacity onPress={() => setViewTeacherModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>
            
            {viewingTeacher && (
              <ScrollView style={styles.viewModalBody}>
                <View style={styles.detailAvatarContainer}>
                  <View style={[styles.detailAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.detailAvatarText}>{viewingTeacher.name?.charAt(0) || "T"}</Text>
                  </View>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={[styles.detailName, { color: colors.textDark }]}>{viewingTeacher.name}</Text>
                  <View style={styles.detailRolesRow}>
                    {(viewingTeacher.role || []).map((roleId) => (
                      <View key={roleId} style={[styles.detailRoleBadge, { backgroundColor: getRoleColor(roleId) + "20" }]}>
                        <Ionicons name={getRoleIcon(roleId)} size={14} color={getRoleColor(roleId)} />
                        <Text style={[styles.detailRoleText, { color: getRoleColor(roleId) }]}>
                          {getRoleDisplayName(roleId)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <View style={styles.infoGrid}>
                  <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
                    <Ionicons name="mail-outline" size={20} color={colors.primary} />
                    <View>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Email</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{viewingTeacher.email}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
                    <Ionicons name="business-outline" size={20} color={colors.primary} />
                    <View>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Department</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{normalizeDepartment(viewingTeacher.department) || "N/A"}</Text>
                    </View>
                  </View>
                  
                  {viewingTeacher.phone && (
                    <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="call-outline" size={20} color={colors.primary} />
                      <View>
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Phone</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{viewingTeacher.phone}</Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Teacher Subjects */}
                  {viewingTeacher.role?.includes("teacher") && (
                    <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="book-outline" size={20} color={colors.primary} />
                      <View>
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Teaching Subjects</Text>
                        <View style={styles.detailSubjectsContainer}>
                          {getTeacherSubjects(viewingTeacher.id).map((subject) => (
                            <View key={subject.id} style={styles.detailSubjectTag}>
                              <Text style={[styles.detailSubjectText, { color: colors.textDark }]}>
                                {subject.subjectName} (Sem {subject.semester})
                              </Text>
                            </View>
                          ))}
                          {getTeacherSubjects(viewingTeacher.id).length === 0 && (
                            <Text style={[styles.infoValue, { color: colors.textLight }]}>No subjects assigned</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  )}
                  
                  {viewingTeacher.labIncharge && (
                    <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="flask-outline" size={20} color={colors.primary} />
                      <View>
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Lab Incharge</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{viewingTeacher.labIncharge}</Text>
                      </View>
                    </View>
                  )}
                  
                  {viewingTeacher.classTeacherFor && (
                    <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                      <View>
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Class Teacher For</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>
                          Semester {viewingTeacher.classTeacherFor}
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {viewingTeacher.qualification && (
                    <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
                      <Ionicons name="school-outline" size={20} color={colors.primary} />
                      <View>
                        <Text style={[styles.infoLabel, { color: colors.textLight }]}>Qualification</Text>
                        <Text style={[styles.infoValue, { color: colors.textDark }]}>{viewingTeacher.qualification}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent={true}
        visible={deleteConfirmVisible}
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.card }]}>
            <Ionicons name="warning-outline" size={50} color="#F44336" />
            <Text style={[styles.confirmTitle, { color: colors.textDark }]}>Delete Teacher</Text>
            <Text style={[styles.confirmText, { color: colors.textLight }]}>
              Are you sure you want to delete {teacherToDelete?.name}?
              This action cannot be undone and will remove all subject assignments.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton, { backgroundColor: colors.background }]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textDark }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={handleDeleteTeacher}
              >
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16 },
  
  header: { padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", alignItems: "center" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  themeToggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#fff", opacity: 0.9, marginTop: 5 },
  
  content: { flex: 1, padding: 16 },
  
  searchContainer: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  
  filtersSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  filterScroll: { flexDirection: "row", marginBottom: 10 },
  filterChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24, marginRight: 10, borderWidth: 1, gap: 6 },
  activeFilterChip: { backgroundColor: "#7384bf", borderColor: "#7384bf" },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  activeFilterText: { color: "#fff" },
  
  listContainer: { paddingBottom: 20 },
  
  card: { borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  teacherInfo: { flexDirection: "row", flex: 1 },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  teacherDetails: { flex: 1 },
  teacherName: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  teacherEmail: { fontSize: 12, marginBottom: 6 },
  badgeRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  roleText: { fontSize: 10, fontWeight: "600" },
  
  actionButtons: { flexDirection: "row", gap: 10 },
  iconButton: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  
  cardFooter: { flexDirection: "row", marginTop: 12, paddingTop: 12, borderTopWidth: 1, gap: 16 },
  footerItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { fontSize: 12 },
  
  assignmentSection: { marginTop: 12, gap: 8 },
  assignmentCard: { flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 12, gap: 12 },
  assignmentIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  assignmentContent: { flex: 1 },
  assignmentLabel: { fontSize: 10, marginBottom: 2, opacity: 0.7 },
  assignmentValue: { fontSize: 13, fontWeight: "600" },
  
  subjectsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  subjectItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  subjectTag: { backgroundColor: "rgba(76, 175, 80, 0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  subjectTagText: { fontSize: 11, fontWeight: "500" },
  noSubjectsText: { fontSize: 12, fontStyle: "italic", opacity: 0.6 },
  
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12 },
  emptySubtext: { fontSize: 12, marginTop: 6, opacity: 0.7 },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 24, width: "90%", maxHeight: "85%", overflow: "hidden" },
  viewModalContent: { maxHeight: "90%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalBody: { padding: 20 },
  viewModalBody: { padding: 20 },
  modalLabel: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  modalSubLabel: { fontSize: 12, marginBottom: 15, opacity: 0.7 },
  
  rolesGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  roleCard: { width: "48%", padding: 12, borderRadius: 12, borderWidth: 2, alignItems: "center", marginBottom: 10, position: "relative" },
  selectedRoleCard: { borderColor: "#4CAF50", borderWidth: 2 },
  roleIconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  roleName: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  checkmark: { position: "absolute", top: 5, right: 5 },
  
  specificField: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  fieldHint: { fontSize: 11, marginBottom: 10, fontStyle: "italic", opacity: 0.7 },
  
  labInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  
  semesterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  semesterOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: "center", minWidth: 100 },
  selectedSemesterOption: { backgroundColor: "#2196F3", borderColor: "#2196F3" },
  disabledSemesterOption: { opacity: 0.5 },
  semesterOptionText: { fontSize: 13 },
  selectedSemesterOptionText: { color: "#fff", fontWeight: "bold" },
  disabledSemesterOptionText: { color: "#4CAF50" },
  alreadyAssignedText: { fontSize: 9, color: "#F44336", marginTop: 3 },
  currentText: { fontSize: 9, color: "#4CAF50", marginTop: 3, fontWeight: "bold" },
  
  assignButton: { marginTop: 10, borderRadius: 12, overflow: "hidden" },
  assignGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 10 },
  assignButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  
  detailAvatarContainer: { alignItems: "center", marginBottom: 20 },
  detailAvatar: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  detailAvatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  detailSection: { alignItems: "center", marginBottom: 20 },
  detailName: { fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  detailRolesRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  detailRoleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, gap: 4 },
  detailRoleText: { fontSize: 11, fontWeight: "600" },
  
  infoGrid: { gap: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 11, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "500" },
  detailSubjectsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  detailSubjectTag: { backgroundColor: "rgba(76, 175, 80, 0.1)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  detailSubjectText: { fontSize: 12, fontWeight: "500" },
  
  confirmModal: { borderRadius: 24, padding: 24, width: "80%", alignItems: "center" },
  confirmTitle: { fontSize: 20, fontWeight: "bold", marginTop: 12 },
  confirmText: { fontSize: 14, textAlign: "center", marginTop: 12, marginBottom: 24 },
  confirmButtons: { flexDirection: "row", gap: 12, width: "100%" },
  confirmButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  cancelButton: {},
  cancelButtonText: { fontWeight: "600" },
  deleteConfirmButton: { backgroundColor: "#F44336" },
  deleteConfirmText: { color: "#fff", fontWeight: "600" },
});

export default ManageTeachers;