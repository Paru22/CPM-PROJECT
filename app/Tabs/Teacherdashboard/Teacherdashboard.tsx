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
    Animated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

export default function TeacherDashboard() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [teacherData, setTeacherData] = useState<any>(null);
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const fetchData = useCallback(async () => {
    try {
      // Fetch teacher profile
      if (user?.uid) {
        const teacherRef = doc(db, "teachers", user.uid);
        const teacherSnap = await getDoc(teacherRef);
        if (teacherSnap.exists()) {
          setTeacherData(teacherSnap.data());
        }
      }

      // Fetch assigned subjects
      if (user?.uid) {
        const subjectsQuery = query(
          collection(db, "teacherSubjects"),
          where("teacherId", "==", user.uid)
        );
        const subjectsSnap = await getDocs(subjectsQuery);
        const subjectsList = subjectsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAssignedSubjects(subjectsList);
      }

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    } catch (error) {
      console.error("Error fetching teacher data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, fadeAnim, slideAnim]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/Login/teacherlogin");
          } catch {
            Alert.alert("Error", "Logout failed");
          }
        },
      },
    ]);
  };

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const getRoleDisplay = (): string => {
    if (user?.role === "hod") return "Head of Department";
    if (user?.teacherRoles?.some((r: any) => r.type === "class_teacher")) return "Class Teacher";
    return "Subject Teacher";
  };

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
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>Dashboard</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerBtn}>
            <Ionicons
              name={theme === "light" ? "moon-outline" : "sunny-outline"}
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo("/Tabs/ProfileSettings")} style={styles.headerBtn}>
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
        {/* Profile Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="person" size={50} color="#fff" />
          </View>
          <Text style={[styles.name, { color: colors.textDark }]}>
            {teacherData?.name || user?.name || "Teacher"}
          </Text>
          <View style={styles.roleBadge}>
            <Ionicons name="school-outline" size={14} color={colors.primary} />
            <Text style={[styles.roleText, { color: colors.primary }]}>{getRoleDisplay()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {user?.department || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {user?.email || "N/A"}
            </Text>
          </View>
          {teacherData?.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={16} color={colors.textLight} />
              <Text style={[styles.info, { color: colors.textLight }]}>{teacherData.phone}</Text>
            </View>
          )}
        </View>

        {/* Assigned Subjects */}
        {assignedSubjects.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>My Subjects</Text>
            {assignedSubjects.map((subject) => (
              <View key={subject.id} style={[styles.subjectItem, { backgroundColor: colors.background }]}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subjectName, { color: colors.textDark }]}>
                    {subject.subjectName}
                  </Text>
                  <Text style={[styles.subjectDetail, { color: colors.textLight }]}>
                    Code: {subject.subjectCode} | Semester: {subject.semester}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.grid}>
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
            onPress={() => navigateTo("/Tabs/Teacherdashboard/Students")}
          >
            <Ionicons name="people-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Students</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => navigateTo("/Tabs/Teacherdashboard/Marks")}
          >
            <Ionicons name="stats-chart-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Marks</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={[styles.logout, { backgroundColor: "#F44336" }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loading: { marginTop: 10, fontSize: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 15 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  headerRight: { flexDirection: "row", gap: 10 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  card: { padding: 20, borderRadius: 20, alignItems: "center", marginTop: 10, elevation: 2 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  name: { fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)", gap: 6, marginBottom: 10 },
  roleText: { fontSize: 12, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 },
  info: { fontSize: 14 },
  sectionCard: { padding: 16, borderRadius: 16, marginTop: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },
  subjectItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 8, gap: 10 },
  subjectName: { fontSize: 14, fontWeight: "600" },
  subjectDetail: { fontSize: 11, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 20 },
  btn: { width: "48%", padding: 20, borderRadius: 15, alignItems: "center", marginBottom: 15, elevation: 2 },
  btnText: { color: "#fff", marginTop: 8, fontWeight: "600", fontSize: 14 },
  logout: { flexDirection: "row", padding: 15, borderRadius: 25, alignItems: "center", justifyContent: "center", marginTop: 20, marginBottom: 20, gap: 8, elevation: 3 },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});