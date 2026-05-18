import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
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
import { db } from "../../../config/firebaseConfig.native";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";

interface Student {
  id?: string;
  name: string;
  rollNo: string;
  phone: string;
  department: string;
  semester: string;
  email?: string;
  boardRollNo?: string;
  profileImage?: string;
}

export default function StudentDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [studentData, setStudentData] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const fetchStudentData = async () => {
      // First try to get data from Auth context
      if (user && user.role === "student") {
        setStudentData({
          id: user.uid,
          name: user.name,
          rollNo: user.classRollNo || "",
          phone: user.phone || "",
          department: user.department,
          semester: user.semester || "",
          email: user.email || "",
          boardRollNo: user.boardRollNo || "",
          profileImage: user.photoURL || undefined,
        });
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
        return;
      }

      // Fallback to params if Auth context doesn't have data
      const boardRollNo = params.boardRollNo;
      
      console.log("boardRollNo received:", boardRollNo);

      if (!boardRollNo) {
        Alert.alert("Error", "No Board Roll Number found!");
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, "students"),
          where("boardRollNo", "==", boardRollNo)
        );
        const querySnap: any = await getDocs(q);
        
        console.log("Query result size:", querySnap.size);

        if (!querySnap.empty) {
          const doc = querySnap.docs[0];
          const data = doc.data();
          
          console.log("Student data found:", data);
          
          setStudentData({
            id: doc.id,
            name: data.name || data.Name || "Unknown",
            rollNo: data.rollNo || "",
            phone: data.phone || "",
            department: data.department || "",
            semester: data.semester || "",
            email: data.email || "",
            boardRollNo: data.boardRollNo || boardRollNo,
            profileImage: data.profileImage || null,
          });
        } else {
          console.log("Trying case-insensitive search...");
          const allSnap: any = await getDocs(collection(db, "students"));
          let foundData: any = null;
          
          allSnap.forEach((doc: any) => {
            const data = doc.data();
            if (data.boardRollNo && 
                String(data.boardRollNo).toLowerCase() === String(boardRollNo).toLowerCase()) {
              foundData = { ...data, id: doc.id };
            }
          });
          
          if (foundData) {
            console.log("Student found via case-insensitive search:", foundData);
            setStudentData({
              id: foundData.id,
              name: foundData.name || foundData.Name || "Unknown",
              rollNo: foundData.rollNo || "",
              phone: foundData.phone || "",
              department: foundData.department || "",
              semester: foundData.semester || "",
              email: foundData.email || "",
              boardRollNo: foundData.boardRollNo || boardRollNo,
              profileImage: foundData.profileImage || null,
            });
          } else {
            console.log("Student not found");
            Alert.alert(
              "Student Not Found",
              "No student found with Board Roll Number: " + boardRollNo
            );
          }
        }
      } catch (error: any) {
        console.log("Error fetching student:", error);
        Alert.alert("Error", "Failed to load student data: " + error.message);
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
  }, [params.boardRollNo, user]);

  const goTo = (path: any) => {
    router.push({
      pathname: path,
      params: { 
        studentId: studentData?.id,
        boardRollNo: studentData?.boardRollNo 
      },
    });
  };

  const navigateToProfile = () => {
    router.push("/Tabs/ProfileSettings");
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
              await logout();
              router.replace("/Login/studentlogin");
            } catch (error) {
              Alert.alert("Error", "Failed to logout");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loading, { color: colors.textDark }]}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (!studentData) {
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
          <Text style={{ color: "#fff", marginLeft: 8, fontWeight: "600" }}>Go Back to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      {/* Header - Removed Back Button, Only Logout in Header */}
      <View style={styles.header}>
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
          <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={22} color={colors.error} />
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
        {/* Profile Card - Image removed, will be added via ProfileSettings */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '15' }]}>
            {studentData.profileImage ? (
              <Image source={{ uri: studentData.profileImage }} style={styles.avatar} />
            ) : (
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {studentData.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={[styles.name, { color: colors.textDark }]}>{studentData.name}</Text>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {studentData.department}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="book-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              Semester: {studentData.semester}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              {studentData.phone}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="id-card-outline" size={16} color={colors.textLight} />
            <Text style={[styles.info, { color: colors.textLight }]}>
              Roll No: {studentData.rollNo}
            </Text>
          </View>
          {studentData.email ? (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={16} color={colors.textLight} />
              <Text style={[styles.info, { color: colors.textLight }]}>
                {studentData.email}
              </Text>
            </View>
          ) : null}
          {studentData.boardRollNo ? (
            <View style={styles.infoRow}>
              <Ionicons name="barcode-outline" size={16} color={colors.textLight} />
              <Text style={[styles.info, { color: colors.textLight }]}>
                Board Roll: {studentData.boardRollNo}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Grid Buttons */}
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
        </View>
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
    paddingHorizontal: 30,
  },
  loading: {
    marginTop: 10,
    fontSize: 16,
  },
  goBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 5,
  },
  headerButton: {
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
  card: {
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: "bold",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 8,
  },
  info: {
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  btn: {
    width: "48%",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  btnText: {
    color: "#fff",
    marginTop: 8,
    fontWeight: "600",
    fontSize: 14,
  },
});