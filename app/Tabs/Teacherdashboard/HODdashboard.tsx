import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
    ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";
import SubjectManagementModal from "../../Tabs/Teacherdashboard/SubjectManagementModal";

const { width } = Dimensions.get("window");

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
  const { colors, theme, toggleTheme } = useTheme();
  const [hodData, setHodData] = useState<any>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [classTeachers, setClassTeachers] = useState<ClassTeacherAssignment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const menuItemAnims = useRef<Animated.Value[]>([]).current;

  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
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

  const semesters = ["1", "2", "3", "4", "5", "6"];
  const roles = ["teacher", "class_teacher", "exam_coordinator", "lab_incharge"];

  const buttonWidth = (width - 48) / 3;

  useEffect(() => {
    for (let i = 0; i < 6; i++) {
      if (!menuItemAnims[i]) {
        menuItemAnims[i] = new Animated.Value(0);
      }
    }
  }, [menuItemAnims]);

  const startContentAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    menuItemAnims.forEach((anim, idx) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: idx * 100,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim, slideAnim, menuItemAnims]);

  const fetchData = useCallback(async () => {
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
      const teachersList = teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
      setTeachers(teachersList);

      const studentsSnap = await getDocs(collection(db, "students"));
      const studentsList = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);

      const requestsQuery = query(collection(db, "teacherRequests"), where("status", "==", "pending"));
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
      startContentAnimation();
    }
  }, [startContentAnimation]);

  const fetchNotifications = useCallback(async () => {
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
  }, []);

  const fetchNotes = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchData();
    fetchNotifications();
    fetchNotes();
  }, [fetchData, fetchNotifications, fetchNotes]);

  const onRefresh = () => {
    setRefreshing(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(40);
    menuItemAnims.forEach(anim => anim.setValue(0));
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
      onRefresh();
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
      await updateDoc(teacherRef, { role: newRole, updatedAt: new Date().toISOString() });
      Alert.alert("Success", `${selectedRoleTeacher.name} has been assigned as ${newRole.replace("_", " ").toUpperCase()}`);
      setShowRoleModal(false);
      setSelectedRoleTeacher(null);
      setNewRole("");
      onRefresh();
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

    const existingAssignment = classTeachers.find(ct => ct.semester === selectedSemester);
    if (existingAssignment) {
      Alert.alert("Already Assigned", `Semester ${selectedSemester} already has a class teacher: ${existingAssignment.teacherName}`);
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
      onRefresh();
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
      onRefresh();
    } catch (error) {
      console.error("Error adding note:", error);
      Alert.alert("Error", "Failed to add note");
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("teacherUser");
              await AsyncStorage.removeItem("userType");
              await auth.signOut();
              router.replace("/");
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout");
            }
          }
        }
      ]
    );
  };

  const navigateToManageTeachers = () => {
    router.push("/Tabs/Teacherdashboard/ManageTeachers");
  };

  const navigateToStudents = () => {
    router.push("/Tabs/Teacherdashboard/Students");
  };

  const navigateToNotifications = () => {
    router.push("/Tabs/Teacherdashboard/HODNotifications");
  };

  const navigateToNotes = () => {
    router.push("/Tabs/Teacherdashboard/notes");
  };

  const navigateToAttendance = () => {
    router.push("/Tabs/Teacherdashboard/Attendence");
  };

  const navigateToProfile = () => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      router.push({
        pathname: "/Tabs/ProfileSettings",
        params: { userId: userId }
      });
    } else {
      router.push("/Tabs/ProfileSettings");
    }
  };

  const menuItems = [
    {
      id: "1",
      title: "Notifications",
      icon: "notifications-outline",
      color: "#FF9800",
      description: `${pendingRequests} pending`,
      count: notifications.filter(n => !n.read).length,
      onPress: navigateToNotifications,
    },
    {
      id: "2",
      title: "Teachers",
      icon: "school-outline",
      color: "#4CAF50",
      description: `${teachers.length} teachers`,
      count: 0,
      onPress: navigateToManageTeachers,
    },
    {
      id: "3",
      title: "Subjects",
      icon: "book-outline",
      color: "#9C27B0",
      description: "Manage",
      count: 0,
      onPress: () => setSubjectModalVisible(true),
    },
    {
      id: "4",
      title: "Students",
      icon: "people-circle-outline",
      color: "#2196F3",
      description: `${students.length} students`,
      count: 0,
      onPress: navigateToStudents,
    },
    {
      id: "5",
      title: "Notes",
      icon: "document-text-outline",
      color: "#00BCD4",
      description: `${notes.length} notes`,
      count: 0,
      onPress: navigateToNotes,
    },
    {
      id: "6",
      title: "Attendance",
      icon: "calendar-outline",
      color: "#FF5722",
      description: "View",
      count: 0,
      onPress: navigateToAttendance,
    },
  ];

  const rows = [];
  for (let i = 0; i < menuItems.length; i += 3) {
    rows.push(menuItems.slice(i, i + 3));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
          {/* Profile Header */}
          <LinearGradient 
            colors={[colors.primary, colors.secondary]} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }} 
            style={styles.profileHeader}
          >
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={toggleTheme} style={styles.actionButton}>
                <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={navigateToProfile} style={styles.actionButton}>
                <Ionicons name="person-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.actionButton}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Initials Avatar - No Camera Button */}
            <View style={styles.initialsContainer}>
              <View style={[styles.initialsCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={styles.initialsText}>
                  {hodData?.name ? hodData.name.charAt(0).toUpperCase() : "H"}
                </Text>
              </View>
            </View>

            <Text style={styles.hodName}>{hodData?.name || "Head of Department"}</Text>
            
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
              <Text style={styles.roleBadgeText}>HOD</Text>
            </View>

            <View style={styles.contactInfoGrid}>
              {hodData?.email && (
                <View style={styles.contactChip}>
                  <Ionicons name="mail-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.contactChipText}>{hodData.email}</Text>
                </View>
              )}
              {hodData?.department && (
                <View style={styles.contactChip}>
                  <Ionicons name="business-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.contactChipText}>{hodData.department}</Text>
                </View>
              )}
              {hodData?.phone && (
                <View style={styles.contactChip}>
                  <Ionicons name="call-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.contactChipText}>{hodData.phone}</Text>
                </View>
              )}
            </View>

            {/* Edit Profile Button - This is where user should go to add/change photo */}
            <TouchableOpacity onPress={navigateToProfile} style={styles.editProfileButton}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="people-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.textDark }]}>{teachers.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Teachers</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="school-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.textDark }]}>{students.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Students</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconWrapper, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="alert-circle-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.textDark }]}>{pendingRequests}</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Requests</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Quick Actions</Text>
            
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.menuRow}>
                {row.map((item, colIndex) => {
                  const globalIndex = rowIndex * 3 + colIndex;
                  return (
                    <Animated.View
                      key={item.id}
                      style={[
                        styles.menuCardWrapper,
                        { width: buttonWidth },
                        {
                          opacity: menuItemAnims[globalIndex] || new Animated.Value(0),
                          transform: [{ translateY: (menuItemAnims[globalIndex] || new Animated.Value(0)).interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                        },
                      ]}
                    >
                      <TouchableOpacity 
                        style={[styles.menuCard, { backgroundColor: colors.card }]} 
                        onPress={item.onPress} 
                        activeOpacity={0.8}
                      >
                        <View style={[styles.menuIconWrapper, { backgroundColor: `${item.color}15` }]}>
                          <Ionicons name={item.icon as any} size={26} color={item.color} />
                        </View>
                        <Text style={[styles.menuCardTitle, { color: colors.textDark }]}>{item.title}</Text>
                        <Text style={[styles.menuCardDesc, { color: colors.textLight }]}>{item.description}</Text>
                        {(item.count ?? 0) > 0 && (
                          <View style={styles.menuBadge}>
                            <Text style={styles.menuBadgeText}>{item.count ?? 0}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
                {row.length < 3 && (
                  <>
                    {[...Array(3 - row.length)].map((_, i) => (
                      <View key={`empty-${i}`} style={[styles.menuCardWrapper, { width: buttonWidth }]} />
                    ))}
                  </>
                )}
              </View>
            ))}
          </View>

          {/* Recent Notifications */}
          {notifications.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Recent Notifications</Text>
              {notifications.slice(0, 3).map((notification) => (
                <TouchableOpacity key={notification.id} onPress={navigateToNotifications} activeOpacity={0.7}>
                  <View style={[styles.notificationItem, { backgroundColor: colors.card }]}>
                    <View style={[styles.notificationIcon, { backgroundColor: `${colors.primary}10` }]}>
                      <Ionicons name="notifications-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationTitle, { color: colors.textDark }]}>{notification.title}</Text>
                      <Text style={[styles.notificationMessage, { color: colors.textLight }]} numberOfLines={2}>{notification.message}</Text>
                      <Text style={[styles.notificationTime, { color: colors.textLight }]}>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recent Notes */}
          {notes.length > 0 && (
            <View style={[styles.sectionContainer, styles.lastSection]}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Recent Notes</Text>
              {notes.slice(0, 2).map((note) => (
                <TouchableOpacity key={note.id} onPress={navigateToNotes} activeOpacity={0.7}>
                  <View style={[styles.noteItem, { backgroundColor: colors.card }]}>
                    <View style={[styles.noteIcon, { backgroundColor: "#00BCD415" }]}>
                      <Ionicons name="document-text-outline" size={18} color="#00BCD4" />
                    </View>
                    <View style={styles.noteContent}>
                      <Text style={[styles.noteTitle, { color: colors.textDark }]}>{note.title}</Text>
                      <Text style={[styles.notePreview, { color: colors.textLight }]} numberOfLines={1}>{note.content}</Text>
                      <Text style={[styles.noteMeta, { color: colors.textLight }]}>
                        By {note.createdBy} • {new Date(note.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <SubjectManagementModal visible={subjectModalVisible} onClose={() => setSubjectModalVisible(false)} department={hodData?.department || ""} onSubjectsUpdated={() => {}} />

      {/* Add Note FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddNoteModal(true)} activeOpacity={0.8}>
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.fabGradient}>
          <Ionicons name="add-outline" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Assign Class Teacher Modal */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Class Teacher</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Teacher: {selectedTeacher?.name}</Text>
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Select Semester:</Text>
              <View style={styles.semesterGrid}>
                {semesters.map((sem) => {
                  const isAssigned = classTeachers.some(ct => ct.semester === sem);
                  return (
                    <TouchableOpacity 
                      key={sem} 
                      style={[
                        styles.semesterOption, 
                        { backgroundColor: colors.background },
                        selectedSemester === sem && styles.selectedSemester,
                        isAssigned && styles.disabledSemester
                      ]} 
                      onPress={() => !isAssigned && setSelectedSemester(sem)}
                      disabled={isAssigned}
                    >
                      <Text style={[
                        styles.semesterText, 
                        { color: colors.textLight },
                        selectedSemester === sem && styles.selectedSemesterText,
                        isAssigned && styles.disabledSemesterText
                      ]}>
                        Sem {sem} {isAssigned ? "(Taken)" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity 
                style={[styles.assignSubmitButton, { backgroundColor: colors.primary }]} 
                onPress={assignClassTeacher}
                disabled={!selectedSemester}
              >
                <Text style={styles.assignSubmitText}>Assign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Role Modal */}
      <Modal transparent visible={showRoleModal} onRequestClose={() => setShowRoleModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Teacher: {selectedRoleTeacher?.name}</Text>
              <Text style={[styles.modalLabel, { color: colors.textDark }]}>Select Role:</Text>
              <View style={styles.roleGrid}>
                {roles.map((role) => (
                  <TouchableOpacity 
                    key={role} 
                    style={[
                      styles.roleOption, 
                      { backgroundColor: colors.background },
                      newRole === role && styles.selectedRole
                    ]} 
                    onPress={() => setNewRole(role)}
                  >
                    <Text style={[
                      styles.roleText, 
                      { color: colors.textLight },
                      newRole === role && styles.selectedRoleText
                    ]}>
                      {role.replace("_", " ").toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[styles.assignSubmitButton, { backgroundColor: colors.primary }]} onPress={handleAssignRole}>
                <Text style={styles.assignSubmitText}>Assign Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Note Modal */}
      <Modal transparent visible={showAddNoteModal} onRequestClose={() => setShowAddNoteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TouchableOpacity onPress={() => setShowAddNoteModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={styles.modalBody}>
              <TextInput 
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} 
                placeholder="Note Title" 
                placeholderTextColor={colors.textLight} 
                value={noteTitle} 
                onChangeText={setNoteTitle} 
              />
              <TextInput 
                style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} 
                placeholder="Note Content" 
                placeholderTextColor={colors.textLight} 
                value={noteContent} 
                onChangeText={setNoteContent} 
                multiline 
                numberOfLines={5} 
              />
              <TouchableOpacity style={[styles.assignSubmitButton, { backgroundColor: colors.primary }]} onPress={handleAddNote}>
                <Text style={styles.assignSubmitText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal transparent visible={showDeleteConfirm} onRequestClose={() => setShowDeleteConfirm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModal, { backgroundColor: colors.card }]}>
            <Ionicons name="warning-outline" size={50} color="#F44336" />
            <Text style={[styles.confirmTitle, { color: colors.textDark }]}>Delete Teacher</Text>
            <Text style={[styles.confirmText, { color: colors.textLight }]}>Are you sure you want to delete {teacherToDelete?.name}? This action cannot be undone.</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmButton, styles.cancelButton, { backgroundColor: colors.background }]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={[styles.cancelButtonText, { color: colors.textDark }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmButton, styles.deleteConfirmButton]} onPress={handleDeleteTeacher}>
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
  container: { flex: 1 },
  
  profileHeader: {
    paddingTop: 20,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerActions: {
    position: "absolute",
    top: 16,
    right: 20,
    flexDirection: "row",
    gap: 12,
    zIndex: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  initialsContainer: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 16,
    position: "relative",
  },
  initialsCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  initialsText: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#fff",
  },
  hodName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 16,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#7384BF",
  },
  contactInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  contactChipText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.9)",
  },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    gap: 8,
  },
  editProfileButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: -24,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  
  sectionContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  lastSection: {
    marginBottom: 80,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  menuCardWrapper: {},
  menuCard: {
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  menuIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  menuCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
    textAlign: "center",
  },
  menuCardDesc: {
    fontSize: 10,
    textAlign: "center",
  },
  menuBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#F44336",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  menuBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
  },
  
  notificationItem: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: { flex: 1 },
  notificationTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  notificationMessage: { fontSize: 12, marginBottom: 4 },
  notificationTime: { fontSize: 10 },
  
  noteItem: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
  },
  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  noteContent: { flex: 1 },
  noteTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
  notePreview: { fontSize: 12, marginBottom: 4 },
  noteMeta: { fontSize: 10 },
  
  fab: { position: "absolute", bottom: 20, right: 20, elevation: 6 },
  fabGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { borderRadius: 24, width: "90%", maxHeight: "80%", overflow: "hidden" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  
  semesterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  semesterOption: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  selectedSemester: { backgroundColor: "#7384bf" },
  disabledSemester: { opacity: 0.5, backgroundColor: "#E8F5E9" },
  semesterText: { fontSize: 14 },
  selectedSemesterText: { color: "#fff", fontWeight: "bold" },
  disabledSemesterText: { color: "#4CAF50" },
  
  roleGrid: { gap: 10, marginBottom: 20 },
  roleOption: { paddingHorizontal: 15, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  selectedRole: { backgroundColor: "#7384bf" },
  roleText: { fontSize: 14 },
  selectedRoleText: { color: "#fff", fontWeight: "bold" },
  
  assignSubmitButton: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  assignSubmitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 14 },
  textArea: { height: 100, textAlignVertical: "top" },
  
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