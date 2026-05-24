import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const AUTH_CREDENTIALS_KEY = "@cpm_auth_credentials";

const getDashboardPath = (userData: any): string => {
  console.log("Getting dashboard for role:", userData.role);
  
  if (userData.role === "hod") {
    return "/Tabs/Teacherdashboard/HODdashboard";
  }
  
  const teacherRoles = userData.teacherRoles || [];
  const isClassTeacher = teacherRoles.some((role: any) => role.type === "class_teacher");
  const isLabIncharge = teacherRoles.some((role: any) => role.type === "lab_incharge");
  
  if (isClassTeacher) {
    return "/Tabs/Teacherdashboard/ClassTeacherDashboard";
  }
  
  if (isLabIncharge) {
    return "/Tabs/Teacherdashboard/LabInchargeDashboard";
  }
  
  return "/Tabs/Teacherdashboard/Teacherdashboard";
};

export default function TeacherLogin() {
  const router = useRouter();
  const { colors } = useTheme();
  const { login, user, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    const clearStudentCredentials = async () => {
      try {
        const credJson = await AsyncStorage.getItem(AUTH_CREDENTIALS_KEY);
        if (credJson) {
          const cred = JSON.parse(credJson);
          if (cred.type === "student") {
            console.log("Clearing student credentials before teacher login");
            await AsyncStorage.removeItem(AUTH_CREDENTIALS_KEY);
          }
        }
      } catch (error) {
        console.error("Error clearing credentials:", error);
      }
    };
    
    clearStudentCredentials();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    setEmail("");
    setPassword("");
  }, []);

  useEffect(() => {
    if (user && !authLoading) {
      const dashboardPath = getDashboardPath(user);
      console.log("Redirecting teacher to:", dashboardPath);
      setTimeout(() => {
        router.replace(dashboardPath as any);
      }, 100);
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    
    try {
      await login(email.trim(), password.trim());
    } catch (error: any) {
      console.error("Login Error:", error);
      
      let message = error.message || "An error occurred";
      
      if (message.includes("deactivated")) {
        Alert.alert("Account Deactivated", "Your account has been deactivated. Please contact HOD.");
      } else if (message.includes("pending")) {
        Alert.alert("Pending Approval", "Your account is pending approval. Please wait for HOD to approve.");
      } else if (message.includes("rejected")) {
        Alert.alert("Rejected", "Your account has been rejected. Please contact HOD.");
      } else if (message.includes("user-not-found")) {
        Alert.alert("Login Failed", "No account found with this email. Please register first.");
      } else if (message.includes("wrong-password")) {
        Alert.alert("Login Failed", "Incorrect password. Please try again.");
      } else {
        Alert.alert("Login Failed", message);
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignUp = () => {
    router.push("/Login/TeacherSignup");
  };

  const goBack = () => {
    router.replace("/");
  };

  if (authLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View 
          style={[
            styles.contentContainer, 
            { 
              opacity: fadeAnim, 
              transform: [{ translateY: slideAnim }] 
            }
          ]}
        >
          <View style={styles.logoSection}>
            <LinearGradient 
              colors={[colors.primary, colors.secondary]} 
              style={styles.logoGradient}
            >
              <Ionicons name="school-outline" size={50} color="#fff" />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.textDark }]}>
              Teacher Portal
            </Text>
            <Text style={[styles.appTagline, { color: colors.textLight }]}>
              Sign in to access your dashboard
            </Text>
          </View>

          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            <View style={[
              styles.inputContainer, 
              { 
                backgroundColor: colors.background, 
                borderColor: colors.border 
              }
            ]}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color={colors.primary} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Email Address"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            <View style={[
              styles.inputContainer, 
              { 
                backgroundColor: colors.background, 
                borderColor: colors.border 
              }
            ]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={colors.primary} 
                style={styles.inputIcon} 
              />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)} 
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => router.push("/Login/forgotPassword")} 
              style={styles.forgotPasswordContainer}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={[colors.primary, colors.secondary]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 0 }} 
                style={styles.loginGradient}
              >
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

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textLight }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity 
              style={[
                styles.signUpButton, 
                { 
                  backgroundColor: colors.background, 
                  borderColor: colors.border 
                }
              ]} 
              onPress={navigateToSignUp} 
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              <Text style={[styles.signUpButtonText, { color: colors.primary }]}>
                New Teacher? Register Here
              </Text>
            </TouchableOpacity>
            
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              New teacher registrations require HOD approval before you can log in.
            </Text>

            {/* ✅ Back to Home Button */}
            <TouchableOpacity onPress={goBack} style={[styles.homeBtn, { backgroundColor: colors.secondary }]}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
              <Text style={styles.homeBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContainer: { flexGrow: 1, justifyContent: "center" },
  contentContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoGradient: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center", marginBottom: 20, elevation: 8 },
  appName: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  appTagline: { fontSize: 14, textAlign: "center" },
  formSection: { padding: 24, borderRadius: 20, elevation: 3 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 12, marginBottom: 16, paddingHorizontal: 16, borderWidth: 1 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15 },
  eyeIcon: { padding: 8 },
  forgotPasswordContainer: { alignSelf: "flex-end", marginBottom: 24 },
  forgotPasswordText: { fontSize: 13, fontWeight: "500" },
  loginButton: { borderRadius: 12, overflow: "hidden", elevation: 5 },
  loginButtonDisabled: { opacity: 0.7 },
  loginGradient: { flexDirection: "row", paddingVertical: 14, justifyContent: "center", alignItems: "center", gap: 8 },
  loginButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 16, fontSize: 12 },
  signUpButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  signUpButtonText: { fontSize: 14, fontWeight: "500" },
  infoText: { fontSize: 11, textAlign: "center", marginTop: 12 },
  homeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 15 },
  homeBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});