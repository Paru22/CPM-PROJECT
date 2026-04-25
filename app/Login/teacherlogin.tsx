import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, { useState, useEffect, useCallback } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

export default function TeacherLoginPage() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  const isDarkMode = theme === "dark";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Back button handler with proper dependency
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.back();
        return true;
      }
    );
    return () => backHandler.remove();
  }, [router]); // Added router dependency

  // ✅ Persistent login check with useCallback
  const checkPersistentLogin = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem("teacherUser");
      if (userData) {
        const { uid, role, name } = JSON.parse(userData);
        console.log("Found persistent login for:", name);
        navigateByRole(role, uid);
      }
    } catch (error) {
      console.log("No persistent login found");
    }
  }, []); // Empty dependency because navigateByRole is defined inside component

  useEffect(() => {
    checkPersistentLogin();
  }, [checkPersistentLogin]); // Added checkPersistentLogin dependency

  const navigateByRole = (role: string, uid: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower === "hod") {
      router.replace("/Tabs/Teacherdashboard/HODdashboard");
    } else if (roleLower === "teacher") {
      router.replace("/Tabs/Teacherdashboard/Teacherdashboard");
    } else if (roleLower === "class_teacher") {
      router.replace("/Tabs/Teacherdashboard/ClassTeacherDashboard");
    } else {
      Alert.alert("Access Denied", `Role "${role}" is not authorized.`);
    }
  };

  const saveUserSession = async (uid: string, role: string, name: string, email: string) => {
    try {
      const userData = { uid, role, name, email, loginTime: Date.now() };
      await AsyncStorage.setItem("teacherUser", JSON.stringify(userData));
      await AsyncStorage.setItem("userType", "teacher");
      console.log("✅ User session saved");
    } catch (err) {
      console.error("Failed to save session:", err);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both Email and Password");
      return;
    }

    setLoading(true);
    try {
      const loginEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
      const uid = userCredential.user.uid;
      
      const teacherRef = doc(db, "teachers", uid);
      const teacherSnap = await getDoc(teacherRef);

      if (!teacherSnap.exists()) {
        const requestRef = doc(db, "teacherRequests", uid);
        const requestSnap = await getDoc(requestRef);
        
        if (requestSnap.exists()) {
          const requestData = requestSnap.data();
          if (requestData.status === "pending") {
            Alert.alert("Account Pending", "Your account is waiting for HOD approval.\n\nPlease check back later.");
          } else if (requestData.status === "approved") {
            Alert.alert("Error", "Your account was approved but teacher profile is missing.\n\nPlease contact HOD.");
          } else {
            Alert.alert("Login Failed", "Teacher profile not found. Please contact the administrator.");
          }
        } else {
          Alert.alert("Login Failed", "Teacher profile not found. Please contact the administrator.");
        }
        setLoading(false);
        return;
      }

      const data = teacherSnap.data();
      const role = (data.role || "").toLowerCase();
      
      // ✅ Save session for persistent login
      await saveUserSession(uid, role, data.name || "", loginEmail);
      
      navigateByRole(role, uid);
    } catch (err: any) {
      console.error("Login error:", err.code);
      
      let message = "Login failed. Please check your email and password.";
      if (err.code === "auth/invalid-credential") {
        message = "Invalid email or password. Please try again.";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* 🔙 HIGHLIGHTED Back Button - More Visible */}
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderWidth: 1,
            borderColor: colors.primary,
          }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            ← Back
          </Text>
        </TouchableOpacity>

        <LinearGradient 
          colors={[colors.primary, colors.secondary]} 
          style={styles.circleTopLeft} 
        />
        <LinearGradient 
          colors={[colors.secondary, isDarkMode ? "#1a1a2e" : "#FFEED0"]} 
          style={styles.circleBottomRight} 
        />

        <View style={[styles.card, { 
          backgroundColor: colors.card,
          shadowColor: isDarkMode ? "#000" : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 8,
          elevation: 5
        }]}>
          <Image
            source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
            style={styles.topImage}
          />

          <Text style={[styles.title, { color: colors.textDark }]}>
            Teacher Login
          </Text>

          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.background, 
              color: colors.textDark, 
              borderColor: colors.border 
            }]}
            placeholder="Email Address"
            placeholderTextColor={colors.textLight}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, { 
                backgroundColor: colors.background, 
                color: colors.textDark, 
                borderColor: colors.border 
              }]}
              placeholder="Password"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.showBtn} 
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={() => router.push("/Login/forgotPassword")}
            activeOpacity={0.7}
          >
            <Text style={[styles.link, { color: colors.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleLogin} 
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={[colors.primary, colors.secondary]} 
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.push("/Login/TeacherSignup")}
            activeOpacity={0.7}
          >
            <Text style={[styles.signupLink, { color: colors.primary }]}>
              Create New Account
            </Text>
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
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 8,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 70,
  },
  button: {
    borderRadius: 30,
    marginTop: 16,
    overflow: "hidden",
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    paddingVertical: 14,
  },
  link: {
    textAlign: "right",
    marginBottom: 8,
    fontWeight: "500",
  },
  signupLink: {
    textAlign: "center",
    marginTop: 20,
    fontWeight: "700",
  },
  topImage: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 16,
  },
  showBtn: {
    position: "absolute",
    right: 14,
    top: 14,
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