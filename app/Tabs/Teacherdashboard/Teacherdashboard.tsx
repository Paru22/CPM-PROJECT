import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

const { width } = Dimensions.get("window");

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  semester: string;
  department: string;
}

interface AssignedSubject {
  id: string;
  subjectName: string;
  semester: number;
}

export default function ClassTeacherDashboard() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classInfo, setClassInfo] = useState<{ semester: string; department: string } | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjects, setSubjects] = useState<AssignedSubject[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);

  const fetchStudents = useCallback(async (semester: string, department: string) => {
    try {
      const snapshot = await getDocs(collection(db, "students"));
      const filtered: Student[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.semester?.toString() === semester && data.department === department) {
          filtered.push({
            id: doc.id,
            name: data.name || "Unknown",
            rollNumber: data.rollNumber || "",
            semester: data.semester,
            department: data.department,
          });
        }
      });
      setStudents(filtered);
    } catch (error) {
      console.error("Fetch students error:", error);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        router.replace("/Login");
        return;
      }

      const ctQuery = query(collection(db, "classTeachers"), where("teacherId", "==", uid));
      const ctSnap = await getDocs(ctQuery);
      
      if (!ctSnap.empty) {
        const data = ctSnap.docs[0].data();
        setClassInfo({ semester: data.semester, department: data.department });
        await fetchStudents(data.semester, data.department);
      }
    } catch (error) {
      console.error("Load error:", error);
    }
  }, [router, fetchStudents]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsubscribeTeacher = onSnapshot(doc(db, "teachers", uid), (docSnap) => {
      if (docSnap.exists()) setTeacherInfo(docSnap.data());
    });

    const subjectsQuery = query(collection(db, "teacherSubjects"), where("teacherId", "==", uid));
    const unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
      const list: AssignedSubject[] = [];
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, subjectName: data.subjectName, semester: data.semester });
      });
      setSubjects(list);
      setLoading(false);
    });

    const requestsQuery = query(collection(db, "studentRequests"), where("status", "==", "pending"));
    const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => setPendingRequests(snapshot.size));

    return () => {
      unsubscribeTeacher();
      unsubscribeSubjects();
      unsubscribeRequests();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.multiRemove(["teacherUser", "userType"]);
          await auth.signOut();
          router.replace("/Login");
        },
      },
    ]);
  };

  const navigateToProfile = () => {
    const userId = auth.currentUser?.uid;
    router.push({
      pathname: "/Tabs/ProfileSettings",
      params: { userId: userId }
    } as any);
  };

  const goToScreen = (screenName: string) => {
    router.push(screenName as any);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textLight }}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <LinearGradient colors={[colors.primary, colors.secondary]} style={{ paddingTop: 20, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={toggleTheme} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
                <Ionicons name={theme === "dark" ? "sunny" : "moon"} size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={navigateToProfile} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
                <Ionicons name="settings-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ alignItems: "center" }}>
            {teacherInfo?.profileImage ? (
              <Image source={{ uri: teacherInfo.profileImage }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#fff" }} />
            ) : (
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 36, fontWeight: "bold", color: "#fff" }}>{teacherInfo?.name?.charAt(0) || "T"}</Text>
              </View>
            )}
            <Text style={{ fontSize: 22, fontWeight: "bold", color: "#fff", marginBottom: 6, marginTop: 8 }}>{teacherInfo?.name || "Teacher"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Ionicons name="school-outline" size={14} color="#fff" />
              <Text style={{ fontSize: 12, color: "#fff", marginLeft: 6 }}>Class Teacher</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ margin: 20, marginTop: -16, backgroundColor: colors.card, padding: 20, borderRadius: 20, elevation: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, gap: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="business-outline" size={22} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.textDark }}>Class Information</Text>
          </View>
          
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={{ fontSize: 16, color: colors.textDark }}>Semester {classInfo?.semester} - {classInfo?.department}</Text>
          </View>

          {subjects.length > 0 && (
            <View style={{ marginTop: 8, marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <Ionicons name="book-outline" size={18} color={colors.primary} />
                <Text style={{ fontSize: 14, fontWeight: "500", color: colors.textDark }}>Teaching Subjects:</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {subjects.map((sub) => (
                  <View key={sub.id} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.primary + "10" }}>
                    <Text style={{ fontSize: 13, color: colors.textDark }}>{sub.subjectName}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity onPress={() => setShowModal(true)} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary }}>{students.length}</Text>
              <Text style={{ fontSize: 12, color: colors.textLight }}>Total Students</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.textDark, marginBottom: 16 }}>Quick Actions</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 16, alignItems: "center", gap: 8 }}
              onPress={() => goToScreen("/Tabs/Teacherdashboard/Attendance")}
            >
              <Ionicons name="checkbox-outline" size={28} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600" }}>Attendance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.secondary, paddingVertical: 16, borderRadius: 16, alignItems: "center", gap: 8, position: "relative" }}
              onPress={() => goToScreen("/Tabs/Teacherdashboard/ClassTeacherNotifications")}
            >
              <Ionicons name="chatbubble-outline" size={28} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600" }}>Requests</Text>
              {pendingRequests > 0 && (
                <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: "#EF4444", borderRadius: 12, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 5 }}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>{pendingRequests}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, backgroundColor: colors.secondary, paddingVertical: 16, borderRadius: 16, alignItems: "center", gap: 8 }}
              onPress={() => goToScreen("/Tabs/Teacherdashboard/notes")}
            >
              <Ionicons name="document-text-outline" size={28} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600" }}>Notes</Text>
            </TouchableOpacity>
          </View>
        </View>

        {students.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.textDark }}>Recent Students</Text>
              <TouchableOpacity onPress={() => setShowModal(true)}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: colors.primary }}>See All</Text>
              </TouchableOpacity>
            </View>
            {students.slice(0, 3).map((student) => (
              <View key={student.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card, padding: 12, borderRadius: 14, marginBottom: 8, gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: colors.primary }}>{student.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: colors.textDark }}>{student.name}</Text>
                  <Text style={{ fontSize: 12, color: colors.textLight }}>Roll: {student.rollNumber}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 24, width: width - 32, maxHeight: "85%", overflow: "hidden" }}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>Students ({students.length})</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <View style={{ flexDirection: "row", alignItems: "center", margin: 14, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, gap: 8 }}>
              <Ionicons name="search-outline" size={18} color={colors.textLight} />
              <TextInput
                style={{ flex: 1, fontSize: 14, paddingVertical: 4, color: colors.textDark }}
                placeholder="Search..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <FlatList
              data={filteredStudents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "15", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontSize: 18, fontWeight: "600", color: colors.primary }}>{item.name.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "500", color: colors.textDark }}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: colors.textLight }}>Roll: {item.rollNumber}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={{ alignItems: "center", padding: 40 }}>
                  <Text style={{ color: colors.textLight }}>No students found</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}