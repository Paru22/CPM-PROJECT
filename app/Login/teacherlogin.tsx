import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db, auth } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

export default function TeacherLoginPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both Email and Password");
      return;
    }

    setLoading(true);
    try {
      console.log("=== LOGIN DEBUG ===");
      console.log("Raw email input:", email);
      console.log("Trimmed email:", email.trim());
      console.log("Password length:", password.length);
      
      // Try with trimmed email
      const loginEmail = email.trim().toLowerCase();
      console.log("Login email (lowercase):", loginEmail);
      
      // 1. Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
      const uid = userCredential.user.uid;
      
      console.log("✅ Login successful! UID:", uid);
      
      // 2. Fetch the user's role from Firestore using the Auth UID
      const teacherRef = doc(db, "teachers", uid);
      const teacherSnap = await getDoc(teacherRef);
      
      console.log("Checking teacher document at:", teacherRef.path);
      console.log("Document exists?", teacherSnap.exists());

      if (!teacherSnap.exists()) {
        // Check if there's a pending request
        const requestRef = doc(db, "teacherRequests", uid);
        const requestSnap = await getDoc(requestRef);
        
        if (requestSnap.exists()) {
          const requestData = requestSnap.data();
          console.log("Found pending request with status:", requestData.status);
          
          if (requestData.status === "pending") {
            Alert.alert(
              "Account Pending", 
              "Your account is waiting for HOD approval.\n\nPlease check back later."
            );
          } else if (requestData.status === "approved") {
            Alert.alert(
              "Error", 
              "Your account was approved but teacher profile is missing.\n\nPlease contact HOD."
            );
          } else {
            Alert.alert(
              "Login Failed", 
              "Teacher profile not found. Please contact the administrator."
            );
          }
        } else {
          console.log("No teacher document OR request found for UID:", uid);
          Alert.alert(
            "Login Failed", 
            "Teacher profile not found. Please contact the administrator."
          );
        }
        setLoading(false);
        return;
      }

      const data = teacherSnap.data();
      const role = (data.role || "").toLowerCase();
      console.log("Teacher role:", role);
      console.log("Teacher name:", data.name);

      // 3. Navigate based on role
      if (role === "hod") {
        console.log("Navigating to HOD Dashboard");
        router.replace("/Tabs/Teacherdashboard/HODdashboard");
      } else if (role === "teacher") {
        console.log("Navigating to Teacher Dashboard");
        router.replace("/Tabs/Teacherdashboard/Teacherdashboard");
      } else if (role === "class_teacher") {
        console.log("Navigating to Class Teacher Dashboard");
        router.replace("/Tabs/Teacherdashboard/ClassTeacherDashboard");
      } else {
        Alert.alert("Access Denied", `Role "${role}" is not authorized.`);
      }
    } catch (err: any) {
      console.error("❌ Login error details:", {
        code: err.code,
        message: err.message,
        fullError: err
      });
      
      let message = "Login failed. Please check your email and password.";
      if (err.code === "auth/invalid-credential") {
        message = "Invalid email or password. Please try again.\n\nMake sure you're using the exact email and password you signed up with.";
      } else if (err.code === "auth/user-not-found") {
        message = "No account found with this email.\n\nPlease sign up first.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password. Please try again.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Try again later.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please check your internet connection.";
      }
      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.circleTopLeft} />
        <LinearGradient colors={[colors.secondary, "#FFEED0"]} style={styles.circleBottomRight} />

        <View style={[styles.card, { backgroundColor: colors.card, boxShadow: "0px 2px 4px rgba(0,0,0,0.1)", elevation: 5 }]}>
          <Image
            source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
            style={styles.topImage}
          />

          <Text style={[styles.title, { color: colors.textDark }]}>Teacher Login</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.textDark, borderColor: colors.border }]}
            placeholder="Email Address"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <View style={{ position: "relative" }}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textDark, borderColor: colors.border }]}
              placeholder="Password"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={{ color: colors.secondary, fontWeight: "600" }}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push("/Login/forgotPassword")}>
            <Text style={[styles.link, { color: colors.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogin} disabled={loading}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.button}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>Login</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/Login/TeacherSignup")}>
            <Text style={[styles.signupLink, { color: colors.primary }]}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    borderRadius: 30,
    marginTop: 10,
  },
  text: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    paddingVertical: 14,
  },
  link: {
    textAlign: "right",
    marginBottom: 10,
  },
  signupLink: {
    textAlign: "center",
    marginTop: 15,
    fontWeight: "700",
  },
  topImage: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 10,
  },
  showBtn: {
    position: "absolute",
    right: 10,
    top: 15,
  },
  circleTopLeft: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.3,
  },
  circleBottomRight: {
    position: "absolute",
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
});