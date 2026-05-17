// app/Login/teacherlogin.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import React, { useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../config/firebaseConfig.native";

export default function TeacherLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Check if teacher exists in Firestore teachers collection (approved)
      const teachersRef = collection(db, "teachers");
      const emailQuery = query(teachersRef, where("email", "==", email.trim()));
      const teacherSnapshot = await getDocs(emailQuery);
      
      if (teacherSnapshot.empty) {
        // Check if there's a pending request
        const requestsRef = collection(db, "teacherRequests");
        const requestQuery = query(
          requestsRef, 
          where("email", "==", email.trim()), 
          where("status", "==", "pending")
        );
        const requestSnapshot = await getDocs(requestQuery);
        
        if (!requestSnapshot.empty) {
          Alert.alert(
            "Pending Approval",
            "Your registration request is still pending approval from HOD. Please wait for approval before logging in."
          );
        } else {
          Alert.alert(
            "Access Denied",
            "No teacher account found. Please sign up first or contact the administration."
          );
        }
        setLoading(false);
        return;
      }
      
      const teacherData = teacherSnapshot.docs[0].data();
      
      // Check if teacher is active
      if (teacherData.isActive === false) {
        Alert.alert("Account Deactivated", "Your account has been deactivated. Please contact HOD.");
        setLoading(false);
        return;
      }
      
      // Step 2: Try Firebase Auth login
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
        const user = userCredential.user;
        
        // Save session
        await AsyncStorage.setItem("teacherUser", JSON.stringify({
          uid: user.uid,
          email: user.email,
          name: teacherData.name || "Teacher",
          role: teacherData.role || "teacher",
          department: teacherData.department || "",
        }));
        await AsyncStorage.setItem("userType", "teacher");
        
        // Navigate based on role
        const userRole = teacherData.role || "teacher";
        if (userRole === "hod") {
          router.replace("/Tabs/Teacherdashboard/HODdashboard");
        } else if (userRole === "class_teacher") {
          router.replace("/Tabs/Teacherdashboard/ClassTeacherDashboard");
        } else {
          router.replace("/Tabs/Teacherdashboard/ClassTeacherDashboard");
        }
        
      } catch (authError: any) {
        if (authError.code === 'auth/wrong-password') {
          Alert.alert("Error", "Incorrect password. Please try again.");
        } else if (authError.code === 'auth/user-not-found') {
          Alert.alert(
            "Account Not Found",
            "Your Firebase Auth account doesn't exist. This may happen if:\n\n" +
            "1. Your account was created before the new system\n" +
            "2. The Auth account wasn't created during approval\n\n" +
            "Please contact HOD to recreate your account or use 'Forgot Password'."
          );
        } else if (authError.code === 'auth/too-many-requests') {
          Alert.alert("Error", "Too many login attempts. Please try again later.");
        } else if (authError.code === 'auth/invalid-credential') {
          Alert.alert("Error", "Invalid email or password. Please try again.");
        } else {
          Alert.alert("Login Failed", authError.message || "An error occurred");
        }
      }
      
    } catch (error: any) {
      console.error("Login error:", error);
      Alert.alert("Login Failed", error.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }
    router.push("/Login/forgotPassword");
  };

  const navigateToSignUp = () => {
    router.push("/Login/TeacherSignup");
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoWrapper}>
              <LinearGradient colors={["#4A90E2", "#357ABD"]} style={styles.logoGradient}>
                <Ionicons name="school-outline" size={50} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>Teacher Portal</Text>
            <Text style={styles.appTagline}>Sign in to access your dashboard</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formSection}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={["#4A90E2", "#357ABD"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <Ionicons name="arrow-forward-outline" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity style={styles.signUpButton} onPress={navigateToSignUp} activeOpacity={0.8}>
              <Ionicons name="person-add-outline" size={20} color="#4A90E2" />
              <Text style={styles.signUpButtonText}>New Teacher? Register Here</Text>
            </TouchableOpacity>
            
            {/* Info Text */}
            <Text style={styles.infoText}>
              Note: New teacher registrations require HOD approval before you can log in.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scrollContainer: { flexGrow: 1, justifyContent: "center" },
  contentContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  circle1: { position: "absolute", top: -100, right: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: "#E8F0FE", opacity: 0.6 },
  circle2: { position: "absolute", bottom: -50, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: "#E8F0FE", opacity: 0.4 },
  logoSection: { alignItems: "center", marginBottom: 48 },
  logoWrapper: { marginBottom: 20, shadowColor: "#4A90E2", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  logoGradient: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center" },
  appName: { fontSize: 28, fontWeight: "bold", color: "#1F2937", marginBottom: 8 },
  appTagline: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  formSection: { marginBottom: 32 },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: "#E5E7EB", elevation: 2 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: "#1F2937" },
  eyeIcon: { padding: 8 },
  forgotPasswordContainer: { alignSelf: "flex-end", marginBottom: 24 },
  forgotPasswordText: { fontSize: 13, color: "#4A90E2", fontWeight: "500" },
  loginButton: { borderRadius: 12, overflow: "hidden", elevation: 5 },
  loginButtonDisabled: { opacity: 0.7 },
  loginGradient: { flexDirection: "row", paddingVertical: 14, justifyContent: "center", alignItems: "center", gap: 8 },
  loginButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  dividerText: { marginHorizontal: 16, fontSize: 12, color: "#9CA3AF" },
  signUpButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F3F4F6" },
  signUpButtonText: { fontSize: 14, fontWeight: "500", color: "#4A90E2" },
  infoText: { fontSize: 11, color: "#9CA3AF", textAlign: "center", marginTop: 12 },
});