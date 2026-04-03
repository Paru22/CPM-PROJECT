import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../../config/firebaseConfig";
import SubjectManagementModal from "../../Tabs/Teacherdashboard/SubjectManagementModal";

interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  phone?: string;
  subjects?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  semester: string;
  department: string;
  phone?: string;
  parentPhone?: string;
  address?: string;
  dateOfBirth?: string;
}

interface ClassTeacherAssignment {
  semester: string;
  teacherId: string;
  teacherName: string;
  department: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string;
  forRole: string;
}

export default function HODDashboard() {
  const router = useRouter();
  const [hodData, setHodData] = useState<any>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [classTeachers, setClassTeachers] = useState<ClassTeacherAssignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Subject Management Modal
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);

  // Other modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleTeacher, setSelectedRoleTeacher] = useState<Teacher | null>(null);
  const [newRole, setNewRole] = useState("");
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const semesters = ["1th", "2th", "3th", "4th", "5th", "6th"];
  const roles = ["teacher", "class_teacher", "exam_coordinator", "lab_incharge"];

  useEffect(() => {
    fetchData();
    fetchNotifications();
    fetchNotes();
  }, []);

  const fetchData = async () => {
    try {
      const hodId = auth.currentUser?.uid;
      if (hodId) {
        const hodRef = doc(db, "teachers", hodId);
        const hodSnap = await getDoc(hodRef);
        if (hodSnap.exists()) {
          setHodData(hodSnap.data());
        }
      }

      const teachersSnap = await getDocs(collection(db, "teachers"));
      const teachersList = teachersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
      setTeachers(teachersList);

      const studentsSnap = await getDocs(collection(db, "students"));
      const studentsList = studentsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);

      const requestsQuery = query(
        collection(db, "teacherRequests"),
        where("status", "==", "pending")
      );
      const requestsSnap = await getDocs(requestsQuery);
      setPendingRequests(requestsSnap.size);

      const classTeacherSnap = await getDocs(collection(db, "classTeachers"));
      const assignments = classTeacherSnap.docs.map(doc => ({
        semester: doc.id,
        ...doc.data()
      } as ClassTeacherAssignment));
      setClassTeachers(assignments);

    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setRefreshing(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const notificationsSnap = await getDocs(
        query(collection(db, "notifications"), where("forRole", "in", ["hod", "all"]))
      );
      const notificationsList = notificationsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      setNotifications(notificationsList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchNotes = async () => {
    try {
      const notesSnap = await getDocs(
        query(collection(db, "notes"), where("forRole", "in", ["hod", "all"]))
      );
      const notesList = notesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Note));
      setNotes(notesList.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchNotifications();
    fetchNotes();
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;

    try {
      await deleteDoc(doc(db, "teachers", teacherToDelete.id));
      
      for (const assignment of classTeachers) {
        if (assignment.teacherId === teacherToDelete.id) {
          await deleteDoc(doc(db, "classTeachers", assignment.semester));
        }
      }

      Alert.alert("Success", `Teacher ${teacherToDelete.name} has been deleted`);
      fetchData();
      setShowDeleteConfirm(false);
      setTeacherToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
      Alert.alert("Error", "Failed to delete teacher");
    }
  };

  const handleAssignRole = async () => {
    if (!selectedRoleTeacher || !newRole) {
      Alert.alert("Error", "Please select a role");
      return;
    }

    try {
      const teacherRef = doc(db, "teachers", selectedRoleTeacher.id);
      await updateDoc(teacherRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert("Success", `${selectedRoleTeacher.name} has been assigned as ${newRole}`);
      setShowRoleModal(false);
      setSelectedRoleTeacher(null);
      setNewRole("");
      fetchData();
    } catch (error) {
      console.error("Role assignment error:", error);
      Alert.alert("Error", "Failed to assign role");
    }
  };

  const assignClassTeacher = async () => {
    if (!selectedTeacher || !selectedSemester) {
      Alert.alert("Error", "Please select a teacher and semester");
      return;
    }

    try {
      await setDoc(doc(db, "classTeachers", selectedSemester), {
        semester: selectedSemester,
        teacherId: selectedTeacher.id,
        teacherName: selectedTeacher.name,
        department: selectedTeacher.department,
        assignedBy: "hod",
        assignedAt: new Date().toISOString(),
      });

      Alert.alert("Success", `${selectedTeacher.name} assigned as Class Teacher for Semester ${selectedSemester}`);
      setModalVisible(false);
      setSelectedTeacher(null);
      setSelectedSemester("");
      fetchData();
    } catch (error) {
      console.error("Assignment error:", error);
      Alert.alert("Error", "Failed to assign class teacher");
    }
  };

  const handleAddNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      const noteRef = doc(collection(db, "notes"));
      await setDoc(noteRef, {
        title: noteTitle,
        content: noteContent,
        createdAt: new Date().toISOString(),
        createdBy: hodData?.name || "HOD",
        forRole: "all",
      });

      Alert.alert("Success", "Note added successfully");
      setShowAddNoteModal(false);
      setNoteTitle("");
      setNoteContent("");
      fetchNotes();
    } catch (error) {
      console.error("Error adding note:", error);
      Alert.alert("Error", "Failed to add note");
    }
  };

  const navigateToManageTeachers = () => {
    router.push({
      pathname: "/Tabs/Teacherdashboard/ManageTeachers",
      params: { teachers: JSON.stringify(teachers), classTeachers: JSON.stringify(classTeachers) }
    });
  };

  const navigateToStudents = () => {
    router.push({
      pathname: "/Tabs/Teacherdashboard/Students",
      params: { students: JSON.stringify(students) }
    });
  };

  const navigateToNotifications = () => {
    router.push({
      pathname: "/Tabs/Teacherdashboard/HODNotifications",
      params: { 
        notifications: JSON.stringify(notifications),
        pendingRequests: pendingRequests.toString()
      }
    });
  };

  const navigateToNotes = () => {
    router.push({
      pathname: "/Tabs/Teacherdashboard/notes",
      params: { notes: JSON.stringify(notes) }
    });
  };

  const navigateToAttendance = () => {
    router.push("/Tabs/Teacherdashboard/Attendence");
  };

  const menuItems = [
    {
      id: "1",
      title: "Notifications",
      icon: "notifications-outline",
      color: "#FF9800",
      bgColor: "#FFF3E0",
      description: `${pendingRequests} pending requests`,
      count: notifications.filter(n => !n.read).length,
      onPress: navigateToNotifications,
    },
    {
      id: "2",
      title: "Teachers",
      icon: "school-outline",
      color: "#4CAF50",
      bgColor: "#E8F5E9",
      description: `${teachers.length} total teachers`,
      onPress: navigateToManageTeachers,
    },
    {
      id: "3",
      title: "Subjects",
      icon: "book-outline",
      color: "#9C27B0",
      bgColor: "#F3E5F5",
      description: "Add / Delete / Assign",
      onPress: () => setSubjectModalVisible(true),
    },
    {
      id: "4",
      title: "Students",
      icon: "people-circle-outline",
      color: "#9C27B0",
      bgColor: "#F3E5F5",
      description: `${students.length} total students`,
      onPress: navigateToStudents,
    },
    {
      id: "5",
      title: "Notes",
      icon: "document-text-outline",
      color: "#00BCD4",
      bgColor: "#E0F7FA",
      description: `${notes.length} notes`,
      onPress: navigateToNotes,
    },
    {
      id: "6",
      title: "Attendance",
      icon: "calendar-outline",
      color: "#FF5722",
      bgColor: "#FBE9E7",
      description: "View attendance",
      onPress: navigateToAttendance,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#7384bf"]} />
        }
      >
        {/* Profile Header */}
        <LinearGradient
          colors={["#7384bf", "#8b9ad5", "#a2afeb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileHeader}
        >
          <View style={styles.profileCard}>
            <View style={styles.profileImageWrapper}>
              <View style={styles.profileImageGlow} />
              <Image
                source={require("../../../assets/images/hod.png")}
                style={styles.profileImage}
                defaultSource={require("../../../assets/images/hod.png")}
              />
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
              </View>
            </View>

            <Text style={styles.hodName}>{hodData?.name || "Loading..."}</Text>
            <View style={styles.roleContainer}>
              <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
              <Text style={styles.roleTitle}>Head of Department</Text>
            </View>

            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.contactText}>{hodData?.email || "email@example.com"}</Text>
              </View>
              {hodData?.department && (
                <View style={styles.contactItem}>
                  <Ionicons name="business-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.contactText}>{hodData.department} Department</Text>
                </View>
              )}
              {hodData?.phone && (
                <View style={styles.contactItem}>
                  <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.contactText}>{hodData.phone}</Text>
                </View>
              )}
            </View>

            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#E8F0FE" }]}>
              <Ionicons name="people-outline" size={24} color="#1976D2" />
            </View>
            <View>
              <Text style={styles.statValue}>{teachers.length}</Text>
              <Text style={styles.statLabel}>Teachers</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="school-outline" size={24} color="#388E3C" />
            </View>
            <View>
              <Text style={styles.statValue}>{students.length}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: "#FFF3E0" }]}>
              <Ionicons name="alert-circle-outline" size={24} color="#F57C00" />
            </View>
            <View>
              <Text style={styles.statValue}>{pendingRequests}</Text>
              <Text style={styles.statLabel}>Requests</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <TouchableOpacity onPress={() => {}}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.menuCard, { backgroundColor: item.bgColor }]}
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={28} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
                {item.count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Notifications</Text>
              <TouchableOpacity onPress={navigateToNotifications}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {notifications.slice(0, 3).map((notification) => (
              <View key={notification.id} style={styles.notificationCard}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="notifications-outline" size={20} color="#7384bf" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Notes */}
        {notes.length > 0 && (
          <View style={[styles.sectionContainer, styles.lastSection]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Notes</Text>
              <TouchableOpacity onPress={navigateToNotes}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {notes.slice(0, 2).map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteIcon}>
                  <Ionicons name="document-text-outline" size={20} color="#00BCD4" />
                </View>
                <View style={styles.noteContent}>
                  <Text style={styles.noteTitle}>{note.title}</Text>
                  <Text style={styles.notePreview} numberOfLines={1}>
                    {note.content}
                  </Text>
                  <Text style={styles.noteMeta}>
                    By {note.createdBy} • {new Date(note.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddNoteModal(true)}
        activeOpacity={0.8}
      >
        <LinearGradient colors={["#7384bf", "#5a6ea8"]} style={styles.fabGradient}>
          <Ionicons name="add-outline" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Subject Management Modal */}
      <SubjectManagementModal
        visible={subjectModalVisible}
        onClose={() => setSubjectModalVisible(false)}
        department={hodData?.department || ""}
        onSubjectsUpdated={() => {
          // Optional: refresh any subject-dependent data
        }}
      />

      {/* Other Modals (unchanged) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Class Teacher</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Teacher: {selectedTeacher?.name}</Text>
              <Text style={styles.modalLabel}>Select Semester:</Text>
              <View style={styles.semesterGrid}>
                {semesters.map((sem) => (
                  <TouchableOpacity
                    key={sem}
                    style={[
                      styles.semesterOption,
                      selectedSemester === sem && styles.selectedSemester,
                    ]}
                    onPress={() => setSelectedSemester(sem)}
                  >
                    <Text style={[
                      styles.semesterText,
                      selectedSemester === sem && styles.selectedSemesterText,
                    ]}>
                      Sem {sem}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.assignSubmitButton}
                onPress={assignClassTeacher}
              >
                <Text style={styles.assignSubmitText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={showRoleModal}
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Teacher: {selectedRoleTeacher?.name}</Text>
              <Text style={styles.modalLabel}>Select Role:</Text>
              <View style={styles.roleGrid}>
                {roles.map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      newRole === role && styles.selectedRole,
                    ]}
                    onPress={() => setNewRole(role)}
                  >
                    <Text style={[
                      styles.roleText,
                      newRole === role && styles.selectedRoleText,
                    ]}>
                      {role.replace("_", " ").toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.assignSubmitButton}
                onPress={handleAssignRole}
              >
                <Text style={styles.assignSubmitText}>Assign Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={showAddNoteModal}
        onRequestClose={() => setShowAddNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TouchableOpacity onPress={() => setShowAddNoteModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Note Title"
                value={noteTitle}
                onChangeText={setNoteTitle}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Note Content"
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                numberOfLines={5}
              />
              <TouchableOpacity
                style={styles.assignSubmitButton}
                onPress={handleAddNote}
              >
                <Text style={styles.assignSubmitText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={showDeleteConfirm}
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Ionicons name="warning-outline" size={50} color="#F44336" />
            <Text style={styles.confirmTitle}>Delete Teacher</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete {teacherToDelete?.name}?
              This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  profileHeader: {
    paddingTop: 30,
    paddingBottom: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  profileCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  profileImageWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  profileImageGlow: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.3)",
    top: -5,
    left: -5,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#fff",
  },
  statusBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#fff",
  },
  hodName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    gap: 6,
  },
  roleTitle: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "500",
  },
  contactInfo: {
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  decorativeCircle1: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.05)",
    top: -50,
    right: -30,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: -30,
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a2e",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  lastSection: {
    marginBottom: 80,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
  },
  seeAllText: {
    fontSize: 13,
    color: "#7384bf",
    fontWeight: "500",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  menuCard: {
    width: (380 - 52) / 2, // fallback width, but we removed Dimensions
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: "#666",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#F44336",
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F2F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: "#999",
  },
  noteCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E0F7FA",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  noteMeta: {
    fontSize: 10,
    color: "#999",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1a1a2e",
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  semesterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  semesterOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  selectedSemester: {
    backgroundColor: "#7384bf",
  },
  semesterText: {
    fontSize: 14,
    color: "#666",
  },
  selectedSemesterText: {
    color: "#fff",
    fontWeight: "bold",
  },
  roleGrid: {
    gap: 10,
    marginBottom: 20,
  },
  roleOption: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  selectedRole: {
    backgroundColor: "#7384bf",
  },
  roleText: {
    fontSize: 14,
    color: "#666",
  },
  selectedRoleText: {
    color: "#fff",
    fontWeight: "bold",
  },
  assignSubmitButton: {
    backgroundColor: "#7384bf",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  assignSubmitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: "#F8F9FA",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  confirmModal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a2e",
    marginTop: 12,
  },
  confirmText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F5F5F5",
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