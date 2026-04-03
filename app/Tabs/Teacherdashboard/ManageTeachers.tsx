import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { db } from "../../../config/firebaseConfig";

interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  phone?: string;
  subjects?: string;
  joinDate?: string;
  qualification?: string;
  address?: string;
}

interface ClassTeacherAssignment {
  semester: string;
  teacherId: string;
  teacherName: string;
  department: string;
}

const ManageTeachers = () => {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedRole, setSelectedRole] = useState("All");

  // Modal states
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [newRole, setNewRole] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [viewTeacherModal, setViewTeacherModal] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [classTeachers, setClassTeachers] = useState<ClassTeacherAssignment[]>([]);
  
  // Departments for filter
  const [departments, setDepartments] = useState<string[]>(["All"]);
  
  // Roles for assignment
  const roles = [
    { id: "teacher", name: "Teacher", icon: "school-outline" as const, color: "#4CAF50" },
    { id: "class_teacher", name: "Class Teacher", icon: "briefcase-outline" as const, color: "#2196F3" },
    { id: "exam_coordinator", name: "Exam Coordinator", icon: "document-text-outline" as const, color: "#FF9800" },
    { id: "lab_incharge", name: "Lab Incharge", icon: "flask-outline" as const, color: "#9C27B0" },
    { id: "hod", name: "HOD", icon: "person-outline" as const, color: "#F44336" },
  ];

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const teachersSnap = await getDocs(collection(db, "teachers"));
      const teachersList = teachersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Teacher));
      
      setTeachers(teachersList);
      applyFilters(teachersList, searchQuery, selectedDepartment, selectedRole);
      
      // Extract unique departments for filter
      const uniqueDepts = ["All", ...new Set(teachersList.map(t => t.department).filter(Boolean))];
      setDepartments(uniqueDepts);
    } catch (error) {
      console.error("Error fetching teachers:", error);
      Alert.alert("Error", "Failed to load teachers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedDepartment, selectedRole]);

  const fetchClassTeachers = useCallback(async () => {
    try {
      const classTeacherSnap = await getDocs(collection(db, "classTeachers"));
      const assignments = classTeacherSnap.docs.map(doc => ({
        semester: doc.id,
        ...doc.data()
      } as ClassTeacherAssignment));
      setClassTeachers(assignments);
    } catch (error) {
      console.error("Error fetching class teachers:", error);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
    fetchClassTeachers();
  }, [fetchTeachers, fetchClassTeachers]);

  const applyFilters = (data: Teacher[], query: string, department: string, role: string) => {
    let filtered = [...data];
    
    // Search filter
    if (query) {
      filtered = filtered.filter(teacher =>
        teacher.name?.toLowerCase().includes(query.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(query.toLowerCase()) ||
        teacher.department?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    // Department filter
    if (department !== "All") {
      filtered = filtered.filter(teacher => teacher.department === department);
    }
    
    // Role filter
    if (role !== "All") {
      filtered = filtered.filter(teacher => teacher.role === role);
    }
    
    setFilteredTeachers(filtered);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(teachers, text, selectedDepartment, selectedRole);
  };

  const handleDepartmentFilter = (department: string) => {
    setSelectedDepartment(department);
    applyFilters(teachers, searchQuery, department, selectedRole);
  };

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
    applyFilters(teachers, searchQuery, selectedDepartment, role);
  };

  const handleAssignRole = async () => {
    if (!selectedTeacher || !newRole) {
      Alert.alert("Error", "Please select a role");
      return;
    }

    try {
      const teacherRef = doc(db, "teachers", selectedTeacher.id);
      await updateDoc(teacherRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });

      // If assigning as class teacher, also update class teachers collection
      if (newRole === "class_teacher") {
        // Check if already assigned as class teacher for any semester
        const existingAssignment = classTeachers.find(ct => ct.teacherId === selectedTeacher.id);
        if (existingAssignment) {
          Alert.alert(
            "Already Assigned",
            `${selectedTeacher.name} is already assigned as Class Teacher for Semester ${existingAssignment.semester}. Do you want to reassign?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Reassign",
                onPress: () => {
                  setRoleModalVisible(false);
                  // Open class teacher assignment modal
                  Alert.alert("Reassign Class Teacher", "Please use the Class Teachers section to reassign");
                }
              }
            ]
          );
        }
      }

      Alert.alert("Success", `${selectedTeacher.name} has been assigned as ${newRole.replace("_", " ").toUpperCase()}`);
      setRoleModalVisible(false);
      setSelectedTeacher(null);
      setNewRole("");
      fetchTeachers();
    } catch (error) {
      console.error("Role assignment error:", error);
      Alert.alert("Error", "Failed to assign role");
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;

    try {
      // Check if teacher is assigned as class teacher
      const isClassTeacher = classTeachers.some(ct => ct.teacherId === teacherToDelete.id);
      
      if (isClassTeacher) {
        Alert.alert(
          "Warning",
          `${teacherToDelete.name} is currently assigned as a Class Teacher. Deleting will remove all assignments. Continue?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await performDelete();
              }
            }
          ]
        );
      } else {
        await performDelete();
      }
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete teacher");
    }
  };

  const performDelete = async () => {
    if (!teacherToDelete) return;
    
    try {
      // Delete teacher from teachers collection
      await deleteDoc(doc(db, "teachers", teacherToDelete.id));
      
      // Remove from class teacher assignments if assigned
      const assignmentsToDelete = classTeachers.filter(ct => ct.teacherId === teacherToDelete.id);
      for (const assignment of assignmentsToDelete) {
        await deleteDoc(doc(db, "classTeachers", assignment.semester));
      }

      Alert.alert("Success", `Teacher ${teacherToDelete.name} has been deleted`);
      setDeleteConfirmVisible(false);
      setTeacherToDelete(null);
      fetchTeachers();
      fetchClassTeachers();
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete teacher");
    }
  };

  const getRoleIcon = (role: string): keyof typeof Ionicons.glyphMap => {
    const roleObj = roles.find(r => r.id === role);
    return roleObj?.icon || "person-outline";
  };

  const getRoleColor = (role: string) => {
    const roleObj = roles.find(r => r.id === role);
    return roleObj?.color || "#7384bf";
  };

  const getRoleDisplayName = (role: string) => {
    const roleObj = roles.find(r => r.id === role);
    return roleObj?.name || role.replace("_", " ").toUpperCase();
  };

  const getSemesterForTeacher = (teacherId: string) => {
    const assignment = classTeachers.find(ct => ct.teacherId === teacherId);
    return assignment ? `Semester ${assignment.semester}` : null;
  };

  const renderTeacherCard = ({ item }: { item: Teacher }) => {
    const assignedSemester = getSemesterForTeacher(item.id);
    const roleColor = getRoleColor(item.role);
    
    return (
      <LinearGradient
        colors={['#fff', '#f8f9fa']}
        style={styles.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.teacherInfo}>
            <View style={[styles.avatarContainer, { backgroundColor: roleColor }]}>
              <Text style={styles.avatarText}>{item.name?.charAt(0) || "T"}</Text>
            </View>
            <View style={styles.teacherDetails}>
              <Text style={styles.teacherName}>{item.name}</Text>
              <Text style={styles.teacherEmail}>{item.email}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: roleColor + "20" }]}>
                  <Ionicons name={getRoleIcon(item.role)} size={12} color={roleColor} />
                  <Text style={[styles.roleText, { color: roleColor }]}>
                    {getRoleDisplayName(item.role)}
                  </Text>
                </View>
                {assignedSemester && (
                  <View style={styles.semesterBadge}>
                    <Ionicons name="calendar-outline" size={12} color="#2196F3" />
                    <Text style={styles.semesterText}>{assignedSemester}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setViewingTeacher(item);
                setViewTeacherModal(true);
              }}
            >
              <Ionicons name="eye-outline" size={22} color="#7384bf" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setSelectedTeacher(item);
                setNewRole(item.role);
                setRoleModalVisible(true);
              }}
            >
              <Ionicons name="shield-outline" size={22} color="#2196F3" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                setTeacherToDelete(item);
                setDeleteConfirmVisible(true);
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="business-outline" size={14} color="#666" />
            <Text style={styles.footerText}>{item.department || "N/A"}</Text>
          </View>
          {item.phone && (
            <View style={styles.footerItem}>
              <Ionicons name="call-outline" size={14} color="#666" />
              <Text style={styles.footerText}>{item.phone}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    );
  };

  const getStatistics = () => {
    const total = teachers.length;
    const byRole = roles.map(role => ({
      ...role,
      count: teachers.filter(t => t.role === role.id).length
    }));
    const departmentsCount = new Set(teachers.map(t => t.department)).size;
    
    return { total, byRole, departmentsCount };
  };

  const stats = getStatistics();

  const handleBack = () => {
    router.back();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7384bf" />
        <Text style={styles.loadingText}>Loading teachers...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#7384bf', '#0c69ff']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>👥 Manage Teachers</Text>
            <Text style={styles.headerSubtitle}>View, assign roles, and manage teachers</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchTeachers} />
        }
      >
        {/* Statistics Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Teachers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.departmentsCount}</Text>
            <Text style={styles.statLabel}>Departments</Text>
          </View>
          {stats.byRole.map(role => (
            role.count > 0 && (
              <View key={role.id} style={[styles.statCard, { backgroundColor: role.color + "10" }]}>
                <Text style={[styles.statValue, { color: role.color }]}>{role.count}</Text>
                <Text style={styles.statLabel}>{role.name}</Text>
              </View>
            )
          ))}
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email or department..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>Filters</Text>
          
          {/* Department Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept}
                style={[
                  styles.filterChip,
                  selectedDepartment === dept && styles.activeFilterChip
                ]}
                onPress={() => handleDepartmentFilter(dept)}
              >
                <Text style={[
                  styles.filterChipText,
                  selectedDepartment === dept && styles.activeFilterText
                ]}>
                  {dept}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Role Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedRole === "All" && styles.activeFilterChip
              ]}
              onPress={() => handleRoleFilter("All")}
            >
              <Text style={[
                styles.filterChipText,
                selectedRole === "All" && styles.activeFilterText
              ]}>
                All Roles
              </Text>
            </TouchableOpacity>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.filterChip,
                  selectedRole === role.id && styles.activeFilterChip
                ]}
                onPress={() => handleRoleFilter(role.id)}
              >
                <Ionicons name={role.icon} size={14} color={selectedRole === role.id ? "#fff" : role.color} />
                <Text style={[
                  styles.filterChipText,
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
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No teachers found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
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

      {/* Assign Role Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={roleModalVisible}
        onRequestClose={() => setRoleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#7384bf', '#0c69ff']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Role</Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Teacher: {selectedTeacher?.name}</Text>
              <Text style={styles.modalLabel}>Current Role: {getRoleDisplayName(selectedTeacher?.role || "teacher")}</Text>
              <Text style={styles.modalLabel}>Select New Role:</Text>
              
              <View style={styles.rolesGrid}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role.id}
                    style={[
                      styles.roleCard,
                      newRole === role.id && styles.selectedRoleCard,
                      { borderColor: role.color }
                    ]}
                    onPress={() => setNewRole(role.id)}
                  >
                    <View style={[styles.roleIconContainer, { backgroundColor: role.color + "20" }]}>
                      <Ionicons name={role.icon} size={24} color={role.color} />
                    </View>
                    <Text style={styles.roleName}>{role.name}</Text>
                    {newRole === role.id && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={styles.assignButton}
                onPress={handleAssignRole}
              >
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.assignGradient}
                >
                  <Ionicons name="checkmark-done-circle" size={24} color="white" />
                  <Text style={styles.assignButtonText}>Assign Role</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Teacher Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={viewTeacherModal}
        onRequestClose={() => setViewTeacherModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.viewModalContent]}>
            <LinearGradient colors={['#7384bf', '#0c69ff']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teacher Details</Text>
              <TouchableOpacity onPress={() => setViewTeacherModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>
            
            {viewingTeacher && (
              <ScrollView style={styles.viewModalBody}>
                <View style={styles.detailAvatarContainer}>
                  <View style={[styles.detailAvatar, { backgroundColor: getRoleColor(viewingTeacher.role) }]}>
                    <Text style={styles.detailAvatarText}>{viewingTeacher.name?.charAt(0) || "T"}</Text>
                  </View>
                </View>
                
                <View style={styles.detailSection}>
                  <Text style={styles.detailName}>{viewingTeacher.name}</Text>
                  <View style={[styles.detailRoleBadge, { backgroundColor: getRoleColor(viewingTeacher.role) + "20" }]}>
                    <Ionicons name={getRoleIcon(viewingTeacher.role)} size={16} color={getRoleColor(viewingTeacher.role)} />
                    <Text style={[styles.detailRoleText, { color: getRoleColor(viewingTeacher.role) }]}>
                      {getRoleDisplayName(viewingTeacher.role)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Ionicons name="mail-outline" size={20} color="#7384bf" />
                    <View>
                      <Text style={styles.infoLabel}>Email</Text>
                      <Text style={styles.infoValue}>{viewingTeacher.email}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Ionicons name="business-outline" size={20} color="#7384bf" />
                    <View>
                      <Text style={styles.infoLabel}>Department</Text>
                      <Text style={styles.infoValue}>{viewingTeacher.department || "N/A"}</Text>
                    </View>
                  </View>
                  
                  {viewingTeacher.phone && (
                    <View style={styles.infoItem}>
                      <Ionicons name="call-outline" size={20} color="#7384bf" />
                      <View>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>{viewingTeacher.phone}</Text>
                      </View>
                    </View>
                  )}
                  
                  {viewingTeacher.subjects && (
                    <View style={styles.infoItem}>
                      <Ionicons name="book-outline" size={20} color="#7384bf" />
                      <View>
                        <Text style={styles.infoLabel}>Subjects</Text>
                        <Text style={styles.infoValue}>{viewingTeacher.subjects}</Text>
                      </View>
                    </View>
                  )}
                  
                  {viewingTeacher.qualification && (
                    <View style={styles.infoItem}>
                      <Ionicons name="school-outline" size={20} color="#7384bf" />
                      <View>
                        <Text style={styles.infoLabel}>Qualification</Text>
                        <Text style={styles.infoValue}>{viewingTeacher.qualification}</Text>
                      </View>
                    </View>
                  )}
                  
                  {viewingTeacher.joinDate && (
                    <View style={styles.infoItem}>
                      <Ionicons name="calendar-outline" size={20} color="#7384bf" />
                      <View>
                        <Text style={styles.infoLabel}>Join Date</Text>
                        <Text style={styles.infoValue}>{viewingTeacher.joinDate}</Text>
                      </View>
                    </View>
                  )}
                </View>
                
                {getSemesterForTeacher(viewingTeacher.id) && (
                  <View style={styles.classTeacherInfo}>
                    <Ionicons name="briefcase-outline" size={20} color="#2196F3" />
                    <Text style={styles.classTeacherInfoText}>
                      Currently assigned as Class Teacher for {getSemesterForTeacher(viewingTeacher.id)}
                    </Text>
                  </View>
                )}
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
          <View style={styles.confirmModal}>
            <Ionicons name="warning-outline" size={50} color="#F44336" />
            <Text style={styles.confirmTitle}>Delete Teacher</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete {teacherToDelete?.name}?
              This action cannot be undone and will remove all associated data.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#7384bf",
  },
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
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.9,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#7384bf",
  },
  statLabel: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#333",
  },
  filtersSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  filterScroll: {
    flexDirection: "row",
    marginBottom: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 4,
  },
  activeFilterChip: {
    backgroundColor: "#7384bf",
    borderColor: "#7384bf",
  },
  filterChipText: {
    fontSize: 12,
    color: "#666",
  },
  activeFilterText: {
    color: "#fff",
  },
  listContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  teacherInfo: {
    flexDirection: "row",
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  teacherDetails: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  teacherEmail: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
  },
  semesterBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    gap: 4,
  },
  semesterText: {
    fontSize: 10,
    color: "#2196F3",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    padding: 6,
  },
  cardFooter: {
    flexDirection: "row",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 16,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    maxHeight: "80%",
  },
  viewModalContent: {
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  modalBody: {
    padding: 20,
  },
  viewModalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  rolesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 15,
  },
  roleCard: {
    width: "48%",
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: "#fff",
    alignItems: "center",
    marginBottom: 10,
    position: "relative",
  },
  selectedRoleCard: {
    backgroundColor: "#f0f0f0",
    borderWidth: 2,
  },
  roleIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  roleName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 5,
    right: 5,
  },
  assignButton: {
    marginTop: 15,
    borderRadius: 12,
    overflow: "hidden",
  },
  assignGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  assignButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  detailAvatarContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  detailAvatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  detailSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  detailName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  detailRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  detailRoleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: 11,
    color: "#999",
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  classTeacherInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    gap: 8,
  },
  classTeacherInfoText: {
    flex: 1,
    fontSize: 12,
    color: "#2196F3",
  },
  confirmModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 10,
  },
  confirmText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  deleteConfirmButton: {
    backgroundColor: "#F44336",
  },
  deleteConfirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default ManageTeachers;