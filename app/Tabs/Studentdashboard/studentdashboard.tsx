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
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../../assets/images/colors";
import { db } from "../../../config/firebaseConfig";

const { width } = Dimensions.get("window");

interface Student {
  id?: string;
  Name: string;
  rollNo: string;
  phone: string;
  department: string;
  semester: string;
}

// ✅ STRICT ROUTE TYPES (FIXES ERROR)
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
          setStudentData({
            id: docSnap.id,
            ...(docSnap.data() as Student),
          });
        } else {
          Alert.alert("Error", "Student not found!");
        }
      } catch (error) {
        console.log(error);
        Alert.alert("Error", "Failed to load data");
      } finally {
        setLoading(false);

        // Animation
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
  }, [studentId]);

  // ✅ SAFE NAVIGATION FUNCTION (FINAL FIX)
  const goTo = (path: AppRoute) => {
    router.push({
      pathname: path,
      params: { studentId },
    });
  };

  // LOADING SCREEN
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // NO DATA
  if (!studentData) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>No Data Found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* PROFILE CARD */}
        <View style={styles.card}>
          <Image
            source={require("../../../assets/images/studentavatar.jpg")}
            style={styles.image}
          />

          <Text style={styles.name}>{studentData.Name}</Text>

          <Text style={styles.info}>🎓 {studentData.department}</Text>
          <Text style={styles.info}>📚 Semester: {studentData.semester}</Text>
          <Text style={styles.info}>📞 {studentData.phone}</Text>
          <Text style={styles.info}>🆔 {studentData.rollNo}</Text>
        </View>

        {/* GRID BUTTONS */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              goTo("/Tabs/Studentdashboard/dashboards/Attendence")
            }
          >
            <Text style={styles.icon}>📅</Text>
            <Text style={styles.btnText}>Attendance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              goTo("/Tabs/Studentdashboard/dashboards/Marks")
            }
          >
            <Text style={styles.icon}>📊</Text>
            <Text style={styles.btnText}>Marks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              goTo("/Tabs/Studentdashboard/dashboards/notes")
            }
          >
            <Text style={styles.icon}>📚</Text>
            <Text style={styles.btnText}>Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              goTo("/Tabs/Studentdashboard/dashboards/Helpsupport")
            }
          >
            <Text style={styles.icon}>📞</Text>
            <Text style={styles.btnText}>Help</Text>
          </TouchableOpacity>
        </View>

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logout}
          onPress={() => router.replace("/Login/studentlogin")}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// 🎨 STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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

  card: {
    backgroundColor: Colors.card,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: "red",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },
});