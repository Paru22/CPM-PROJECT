import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { doc, getDoc } from "firebase/firestore";
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
import { Ionicons } from "@expo/vector-icons";
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";

interface Student {
  id?: string;
  name: string;
  rollNo: string;
  phone: string;
  department: string;
  semester: string;
  email?: string;
}

type AppRoute =
  | "/Tabs/Studentdashboard/dashboards/Attendence"
  | "/Tabs/Studentdashboard/dashboards/Marks"
  | "/Tabs/Studentdashboard/dashboards/notes"
  | "/Tabs/Studentdashboard/dashboards/Helpsupport";

export default function StudentDashboard() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{
    studentId?: string;
  }>();
  const { colors, theme, toggleTheme } = useTheme();

  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) {
        Alert.alert("Error", "No student ID found!");
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "students", studentId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setStudentData({
            id: docSnap.id,
            name: data.name || data.Name || "",
            rollNo: data.rollNo || data.rollNumber || "",
            phone: data.phone || "",
            department: data.department || "",
            semester: data.semester || "",
            email: data.email || "",
          });
        } else {
          Alert.alert("Error", "Student not found!");
        }
      } catch (error) {
        console.log(error);
        Alert.alert("Error", "Failed to load data");
      } finally {
        setLoading(false);

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
      }
    };

    fetchStudentData();
  }, [studentId, fadeAnim, slideAnim]);

  const goTo = (path: AppRoute) => {
    router.push({
      pathname: path,
      params: { studentId },
    });
  };

  const navigateToProfile = () => {
    router.push("/Tabs/ProfileSettings");
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loading, { color: colors.textDark }]}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!studentData) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textDark }}>No Data Found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      {/* Header with Settings Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textDark }]}>Student Dashboard</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToProfile} style={styles.iconButton}>
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
        {/* PROFILE CARD */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Image
            source={require("../../../assets/images/studentavatar.jpg")}
            style={styles.image}
          />
          <Text style={[styles.name, { color: colors.textDark }]}>{studentData.name}</Text>
          <Text style={[styles.info, { color: colors.textLight }]}>🎓 {studentData.department}</Text>
          <Text style={[styles.info, { color: colors.textLight }]}>📚 Semester: {studentData.semester}</Text>
          <Text style={[styles.info, { color: colors.textLight }]}>📞 {studentData.phone}</Text>
          <Text style={[styles.info, { color: colors.textLight }]}>🆔 {studentData.rollNo}</Text>
          {studentData.email && (
            <Text style={[styles.info, { color: colors.textLight }]}>📧 {studentData.email}</Text>
          )}
        </View>

        {/* GRID BUTTONS */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/Attendence")}
          >
            <Text style={styles.icon}>📅</Text>
            <Text style={styles.btnText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/Marks")}
          >
            <Text style={styles.icon}>📊</Text>
            <Text style={styles.btnText}>Marks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/notes")}
          >
            <Text style={styles.icon}>📚</Text>
            <Text style={styles.btnText}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={() => goTo("/Tabs/Studentdashboard/dashboards/Helpsupport")}
          >
            <Text style={styles.icon}>📞</Text>
            <Text style={styles.btnText}>Help & Support</Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={[styles.logout, { backgroundColor: "#F44336" }]}
          onPress={() => router.replace("/Login/studentlogin")}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loading: {
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 15,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
  },
  info: {
    marginTop: 5,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  btn: {
    width: "48%",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 15,
  },
  icon: {
    fontSize: 22,
  },
  btnText: {
    color: "#fff",
    marginTop: 5,
    fontWeight: "600",
  },
  logout: {
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
});