import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db, auth } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

interface TeacherType {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  phone?: string;
}

interface StudentType {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  semester: string;
  department: string;
  phone?: string;
}

export default function HODDashboard() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  
  const [hodData, setHodData] = useState<any>(null);
  const [teachers, setTeachers] = useState<TeacherType[]>([]);
  const [students, setStudents] = useState<StudentType[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const fetchData = useCallback(async () => {
    try {
      const hodDepartment = user?.department;

      const hodId = auth.currentUser?.uid;
      if (hodId) {
        const hodRef = doc(db, "teachers", hodId);
        const hodSnap = await getDoc(hodRef);
        if (hodSnap.exists()) setHodData(hodSnap.data());
      }

      if (hodDepartment) {
        const teachersQuery = query(
          collection(db, "teachers"),
          where("department", "==", hodDepartment),
          where("requestStatus", "==", "approved")
        );
        const teachersSnap = await getDocs(teachersQuery);
        const teachersList: TeacherType[] = teachersSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as TeacherType));
        setTeachers(teachersList);

        const studentsQuery = query(
          collection(db, "students"),
          where("department", "==", hodDepartment),
          where("requestStatus", "==", "approved")
        );
        const studentsSnap = await getDocs(studentsQuery);
        const studentsList: StudentType[] = studentsSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as StudentType));
        setStudents(studentsList);

        const requestsQuery = query(
          collection(db, "teacherRequests"),
          where("department", "==", hodDepartment),
          where("requestStatus", "==", "pending")
        );
        const requestsSnap = await getDocs(requestsQuery);
        setPendingRequests(requestsSnap.size);
      }

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fadeAnim, slideAnim, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        }
      }
    ]);
  };

  const navigateTo = (screen: string) => router.push(screen as any);

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loading, { color: colors.textDark }]}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>HOD Dashboard</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Ionicons 
              name={theme === "light" ? "moon-outline" : "sunny-outline"} 
              size={22} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/Tabs/ProfileSettings")} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Profile Card - HOD's own image from settings */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Image
            source={
              hodData?.profileImage 
                ? { uri: hodData.profileImage } 
                : user?.photoURL 
                  ? { uri: user.photoURL }
                  : require("../../../assets/images/admin.jpg")
            }
            style={styles.image}
          />
          <Text style={[styles.name, { color: colors.textDark }]}>{hodData?.name || user?.name || "Head of Department"}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>HOD</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {user?.department || hodData?.department || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {user?.email || hodData?.email || "N/A"}
            </Text>
          </View>
          {hodData?.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={colors.textLight} />
              <Text style={[styles.info, { color: colors.textLight }]}>
                {hodData.phone}
              </Text>
            </View>
          )}
        </View>

        {/* Grid Buttons */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("/Tabs/Teacherdashboard/ManageTeachers")}
          >
            <Ionicons name="people-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Teachers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("/Tabs/Teacherdashboard/Students")}
          >
            <Ionicons name="school-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Students</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("/Tabs/Teacherdashboard/Attendence")}
          >
            <Ionicons name="calendar-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("/Tabs/Teacherdashboard/notes")}
          >
            <Ionicons name="document-text-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("/Tabs/Teacherdashboard/HODNotifications")}
          >
            <Ionicons name="notifications-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Requests</Text>
            {pendingRequests > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingRequests}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("/Tabs/Teacherdashboard/SubjectManagementModal")}
          >
            <Ionicons name="book-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Subjects</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{teachers.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Teachers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.success }]}>{students.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Students</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{pendingRequests}</Text>
            <Text style={[styles.statLabel, { color: colors.textLight }]}>Pending</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logout, { backgroundColor: "#F44336" }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 30 },
  loading: { marginTop: 10, fontSize: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, paddingHorizontal: 5 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  headerRight: { flexDirection: "row", gap: 12 },
  card: { padding: 20, borderRadius: 20, alignItems: "center", marginTop: 15, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  image: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  name: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 },
  info: { fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 20 },
  btn: { width: "48%", padding: 20, borderRadius: 15, alignItems: "center", marginBottom: 15, elevation: 2, position: "relative" },
  btnText: { color: "#fff", marginTop: 8, fontWeight: "600", fontSize: 14 },
  badge: { position: "absolute", top: 10, right: 10, backgroundColor: "#F44336", borderRadius: 12, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 10, marginBottom: 20 },
  statCard: { flex: 1, paddingVertical: 16, borderRadius: 15, alignItems: "center", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  statValue: { fontSize: 24, fontWeight: "bold", marginBottom: 4 },
  statLabel: { fontSize: 12 },
  logout: { flexDirection: "row", padding: 15, borderRadius: 25, alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 20, gap: 8, elevation: 3 },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});