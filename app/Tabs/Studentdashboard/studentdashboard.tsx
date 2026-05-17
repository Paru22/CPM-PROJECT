import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";

export default function StudentDashboard() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "student") {
        router.replace("/Login/studentlogin");
        return;
      }
      
      setLoading(false);
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

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
              await logout();
              router.replace("/Login/studentlogin");
            } catch {
              console.error("Logout error:");
            }
          },
        },
      ]
    );
  };

  const goTo = (path: string) => {
    router.push(path as any);
  };

  const navigateToProfile = () => {
    router.push("/Tabs/ProfileSettings");
  };

  if (loading || authLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loading, { color: colors.textDark }]}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="sad-outline" size={64} color={colors.textLight} />
        <Text style={{ color: colors.textDark, fontSize: 18, marginTop: 10, marginBottom: 20 }}>
          No Student Data Found
        </Text>
        <TouchableOpacity
          style={[styles.goBackBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/Login/studentlogin")}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={{ color: "#fff", marginLeft: 8, fontWeight: "600" }}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="school" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>Dashboard</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Ionicons 
              name={theme === "light" ? "moon-outline" : "sunny-outline"} 
              size={22} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToProfile} style={styles.headerButton}>
            <Ionicons name="settings-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Image
            source={
              user.photoURL 
                ? { uri: user.photoURL } 
                : require("../../../assets/images/studentavatar.jpg")
            }
            style={styles.image}
          />
          <Text style={[styles.name, { color: colors.textDark }]}>
            {user.name || "Student"}
          </Text>
          <View style={styles.roleBadge}>
            <Ionicons name="school-outline" size={12} color={colors.primary} />
            <Text style={[styles.roleText, { color: colors.primary }]}>Student</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {user.department || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              Semester: {user.semester || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {user.phone || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {user.email || "N/A"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="barcode-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              Board Roll: {user.boardRollNo || "N/A"}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/Attendence")}
          >
            <Ionicons name="calendar-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/Marks")}
          >
            <Ionicons name="stats-chart-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Marks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/notes")}
          >
            <Ionicons name="document-text-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/Helpsupport")}
          >
            <Ionicons name="headset-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Help & Support</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/ResetPassword")}
          >
            <Ionicons name="lock-closed-outline" size={28} color="#fff" />
            <Text style={styles.btnText}>Reset Password</Text>
          </TouchableOpacity>
        </View>

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
  goBackBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, paddingHorizontal: 5 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  headerRight: { flexDirection: "row", gap: 12 },
  card: { padding: 20, borderRadius: 20, alignItems: "center", marginTop: 15, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4 },
  image: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
  name: { fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.05)", gap: 4, marginBottom: 10 },
  roleText: { fontSize: 11, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 5, gap: 8 },
  info: { fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 20 },
  btn: { width: "48%", padding: 20, borderRadius: 15, alignItems: "center", marginBottom: 15, elevation: 2 },
  btnText: { color: "#fff", marginTop: 8, fontWeight: "600", fontSize: 14 },
  logout: { flexDirection: "row", padding: 15, borderRadius: 25, alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 20, gap: 8, elevation: 3 },
  logoutText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});