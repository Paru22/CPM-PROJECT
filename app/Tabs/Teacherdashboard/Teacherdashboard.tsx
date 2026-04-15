import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

// Array of motivational quotes about teaching and students
const motivationalQuotes = [
  "✨ Teaching is the one profession that creates all other professions. ✨",
  "📚 Every student can learn, just not on the same day or in the same way. 📚",
  "🌟 A teacher's purpose is not to create students in their own image, but to develop students who can create their own image. 🌟",
  "💡 The art of teaching is the art of assisting discovery. 💡",
  "🎓 To teach is to touch a life forever. 🎓",
  "🌱 Plant seeds of knowledge, watch them grow into futures. 🌱",
  "🏆 Your students may forget what you said, but they will never forget how you made them feel. 🏆",
];

export default function Teacherdashboard() {
  const router = useRouter();
  const { teacherId } = useLocalSearchParams();
  const { colors, theme, toggleTheme } = useTheme();

  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [motivationalQuote, setMotivationalQuote] = useState("");

  // -------------------------
  // 🔥 Fetch Teacher Data
  // -------------------------
  useEffect(() => {
    const loadTeacher = async () => {
      try {
        if (!teacherId) {
          alert("Teacher ID missing");
          return;
        }

        const ref = doc(db, "teachers", teacherId.toString());
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();

          // Convert all subject fields dynamically
          const subjects = Object.keys(data)
            .filter((key) => key.startsWith("subject"))
            .map((key) => data[key]);

          setTeacherData({
            name: data.name,
            department: data.department,
            phone: data.phone,
            email: data.email,
            subjects,
          });
        } else {
          alert("Teacher not found!");
        }
      } catch (err) {
        console.log(err);
        alert("Error loading teacher data");
      } finally {
        setLoading(false);
      }
    };

    loadTeacher();

    // Pick a random motivational quote
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    setMotivationalQuote(motivationalQuotes[randomIndex]);
  }, [teacherId]);

  const handleLogout = () => router.replace("/Login/teacherlogin");

  const navigateToProfile = () => {
    router.push("/Tabs/ProfileSettings");
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textDark }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <Image
            source={{
              uri: `https://api.dicebear.com/6.x/initials/png?seed=${teacherData?.name || 'teacher'}&size=128`,
            }}
            style={styles.photo}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Teacher Dashboard</Text>
            <Text style={styles.headerName}>{teacherData?.name}</Text>
            <Text style={styles.headerDept}>
              {teacherData?.department} Department
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
              <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateToProfile} style={styles.iconButton}>
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* BODY */}
      <ScrollView contentContainerStyle={styles.body}>
        {/* 🌟 WELCOME + MOTIVATIONAL QUOTE */}
        <View style={[styles.welcomeCard, { backgroundColor: colors.card }]}>
          <View style={styles.welcomeHeader}>
            <Ionicons name="happy-outline" size={28} color={colors.primary} />
            <Text style={[styles.welcomeText, { color: colors.textDark }]}>
              Welcome, {teacherData?.name?.split(' ')[0] || 'Teacher'}!
            </Text>
          </View>
          <View style={[styles.quoteContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.secondary} />
            <Text style={[styles.quoteText, { color: colors.textDark }]}>{motivationalQuote}</Text>
          </View>
        </View>

        {/* ⭐ SUBJECTS FETCHED FROM FIRESTORE */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Subjects Taught</Text>

          {teacherData?.subjects?.length > 0 ? (
            teacherData.subjects.map((sub: string, index: number) => (
              <View key={index} style={[styles.subjectItem, { backgroundColor: colors.background }]}>
                <Ionicons name="book-outline" size={20} color={colors.secondary} />
                <Text style={[styles.subjectText, { color: colors.textDark }]}>{sub}</Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.textLight }}>No subjects found.</Text>
          )}
        </View>

        {/* BUTTONS GRID */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: "#DDE6FF" }]}
            onPress={() =>
              router.push(`/Tabs/Teacherdashboard/Attendence?teacherId=${teacherId}`)
            }
          >
            <Ionicons name="checkmark-done-outline" size={26} color={colors.secondary} />
            <Text style={[styles.gridText, { color: colors.textDark }]}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: "#FFEED0" }]}
            onPress={() =>
              router.push(`/Tabs/Teacherdashboard/Students?teacherId=${teacherId}`)
            }
          >
            <Ionicons name="people-outline" size={26} color="#F59E0B" />
            <Text style={[styles.gridText, { color: colors.textDark }]}>Students</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: "#E7FEEA" }]}
            onPress={() => router.push(`/Tabs/Teacherdashboard/notes?teacherId=${teacherId}`)}
          >
            <Ionicons name="document-text-outline" size={26} color="#10B981" />
            <Text style={[styles.gridText, { color: colors.textDark }]}>Add Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, { backgroundColor: "#FFE4E6" }]}
            onPress={() =>
              router.push(`/Tabs/Teacherdashboard/Marks?teacherId=${teacherId}`)
            }
          >
            <Ionicons name="bar-chart-outline" size={26} color="#EF4444" />
            <Text style={[styles.gridText, { color: colors.textDark }]}>Update Marks</Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.secondary }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingVertical: 35,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    boxShadow: "0px 4px 5px rgba(0,0,0,0.3)",
    elevation: 6,
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerTextContainer: { flex: 1 },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  headerName: { color: "#E0E0E0", fontSize: 18, marginTop: 2 },
  headerDept: { color: "#D3E0FF", fontSize: 14, marginTop: 2 },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "#e0e0e0",
  },
  body: { padding: 20, gap: 20 },
  welcomeCard: {
    borderRadius: 20,
    padding: 16,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
    elevation: 2,
    gap: 12,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "700",
  },
  quoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 16,
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: "italic",
  },
  card: {
    borderRadius: 25,
    padding: 20,
    boxShadow: "0px 4px 6px rgba(0,0,0,0.15)",
    elevation: 4,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  subjectItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    padding: 10,
    borderRadius: 15,
  },
  subjectText: { fontSize: 16, fontWeight: "500" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 15 },
  gridItem: {
    width: "47%",
    borderRadius: 25,
    alignItems: "center",
    paddingVertical: 28,
    boxShadow: "0px 4px 6px rgba(0,0,0,0.12)",
    elevation: 5,
  },
  gridText: { marginTop: 12, fontSize: 16, fontWeight: "600", textAlign: "center" },
  logoutButton: {
    paddingVertical: 18,
    borderRadius: 35,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    marginBottom: 30,
    boxShadow: "0px 4px 5px rgba(0,0,0,0.25)",
    elevation: 6,
  },
  logoutButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});