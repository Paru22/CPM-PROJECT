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
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function TeacherLogin() {
  const router = useRouter();
  const { colors } = useTheme();
  const { login, user } = useAuth();
  
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
  }, []);

  // Redirect based on role after login
  useEffect(() => {
    if (user) {
      const dashboardPath = getDashboardPath(user);
      router.replace(dashboardPath);
    }
  }, [user]);

  const getDashboardPath = (userData: any): string => {
    // HOD - Head of Department
    if (userData.role === "hod") {
      return "/Tabs/Teacherdashboard/HODdashboard";
    }
    
    // Class Teacher - has classTeacherFor or class_teacher role
    if (userData.teacherRoles?.some((r: any) => r.type === "class_teacher") || 
        userData.classTeacherFor) {
      return "/Tabs/Teacherdashboard/ClassTeacherDashboard";
    }
    
    // Regular Teacher
    return "/Tabs/Teacherdashboard/Teacherdashboard";
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setLoading(true);
    
    try {
      await login(email.trim(), password.trim());
      // No need for Alert + manual redirect - the useEffect above handles it
    } catch (error: any) {
      console.error("Login Error:", error);
      Alert.alert("Login Failed", error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignUp = () => {
    router.push("/Login/TeacherSignup");
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.logoGradient}>
              <Ionicons name="school-outline" size={50} color="#fff" />
            </LinearGradient>
            <Text style={[styles.appName, { color: colors.textDark }]}>Teacher Portal</Text>
            <Text style={[styles.appTagline, { color: colors.textLight }]}>Sign in to access your dashboard</Text>
          </View>

          {/* Login Form */}
          <View style={[styles.formSection, { backgroundColor: colors.card }]}>
            {/* Email Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Email Address"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity 
              onPress={() => router.push("/Login/forgotPassword")} 
              style={styles.forgotPasswordContainer}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[colors.primary, colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginGradient}>
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
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textLight }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={[styles.signUpButton, { backgroundColor: colors.background, borderColor: colors.border }]} 
              onPress={navigateToSignUp} 
              activeOpacity={0.8}
            >
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              <Text style={[styles.signUpButtonText, { color: colors.primary }]}>New Teacher? Register Here</Text>
            </TouchableOpacity>
            
            {/* Info Text */}
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              New teacher registrations require HOD approval before you can log in.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: "center" },
  contentContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoGradient: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center", marginBottom: 20, elevation: 8 },
  appName: { fontSize: 28, fontWeight: "bold", marginBottom: 8 },
  appTagline: { fontSize: 14, textAlign: "center" },
  formSection: { padding: 24, borderRadius: 20, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
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
});