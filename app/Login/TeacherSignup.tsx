import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db, auth } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

export default function TeacherSignup() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    department: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const validateForm = () => {
    if (!form.name.trim()) return "❌ Full name is required";
    if (!form.email.trim()) return "❌ Email address is required";
    if (!form.password) return "❌ Password is required";
    if (form.password.length < 6) return "❌ Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "❌ Passwords do not match";
    if (!form.department.trim()) return "❌ Department is required";
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }

    setLoading(true);
    try {
      console.log("Step 1: Creating Firebase Auth account for:", form.email);
      
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const teacherUid = userCredential.user.uid;
      console.log("Step 2: Auth user created with UID:", teacherUid);

      console.log("Step 3: Creating teacher request in Firestore...");
      
      // 2. Write pending request (NO password stored)
      await setDoc(doc(db, "teacherRequests", teacherUid), {
        teacherId: teacherUid,
        name: form.name,
        email: form.email,
        department: form.department,
        phone: form.phone || "",
        role: "teacher",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      console.log("Step 4: Teacher request created successfully!");
      
      // Show custom success modal
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Signup error:", err);
      let message = "⚠️ Registration failed. Please check your network and try again.";
      
      if (err.code === "auth/email-already-in-use") {
        message = "❌ This email is already registered.\n\nPlease use a different email or log in to your existing account.";
      } else if (err.code === "auth/weak-password") {
        message = "❌ Password is too weak. Please use at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        message = "❌ Invalid email address. Please enter a valid email.";
      } else if (err.code === "auth/network-request-failed") {
        message = "🌐 Network error. Please check your internet connection and try again.";
      } else if (err.code === "permission-denied") {
        message = "🔒 Firestore permission denied. Check your security rules.";
      }
      
      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    router.replace("/Login/teacherlogin");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teacher Registration</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[
          styles.card,
          {
            backgroundColor: colors.card,
            boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
            elevation: 3,
          }
        ]}>
          {/* 📢 PROMPT: Info box explaining the process */}
          <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary }]}>
            <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textDark }]}>
              Your registration request will be sent to the <Text style={{ fontWeight: "bold" }}>Head of Department</Text> for approval. 
              You will receive a notification once your account is activated.
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.textDark }]}>Full Name *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textDark,
              }
            ]}
            placeholder="e.g., John Doe"
            placeholderTextColor={colors.textLight}
            value={form.name}
            onChangeText={(v) => handleChange("name", v)}
          />

          <Text style={[styles.label, { color: colors.textDark }]}>Email *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textDark,
              }
            ]}
            placeholder="teacher@college.edu"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => handleChange("email", v)}
          />

          <Text style={[styles.label, { color: colors.textDark }]}>Department *</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textDark,
              }
            ]}
            placeholder="e.g., Computer Science"
            placeholderTextColor={colors.textLight}
            value={form.department}
            onChangeText={(v) => handleChange("department", v)}
          />

          <Text style={[styles.label, { color: colors.textDark }]}>Password * (min 6 characters)</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }
              ]}
              placeholder="••••••"
              placeholderTextColor={colors.textLight}
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(v) => handleChange("password", v)}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.textDark }]}>Confirm Password *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }
              ]}
              placeholder="••••••"
              placeholderTextColor={colors.textLight}
              secureTextEntry={!showConfirmPassword}
              value={form.confirmPassword}
              onChangeText={(v) => handleChange("confirmPassword", v)}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.textDark }]}>Phone Number (optional)</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.textDark,
              }
            ]}
            placeholder="+91 9876543210"
            placeholderTextColor={colors.textLight}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(v) => handleChange("phone", v)}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.gradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Request</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/Login/teacherlogin")} style={styles.loginLink}>
            <Text style={[styles.loginText, { color: colors.primary }]}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ✅ Custom Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.successModal, { backgroundColor: colors.card }]}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={70} color="#4CAF50" />
            </View>
            <Text style={[styles.successTitle, { color: colors.textDark }]}>✅ Request Sent!</Text>
            <Text style={[styles.successMessage, { color: colors.textLight }]}>
              Your registration request has been successfully forwarded to the Head of Department.
            </Text>
            <Text style={[styles.successSubMessage, { color: colors.textLight }]}>
              You will be notified once your account is approved. You can now log in.
            </Text>
            <TouchableOpacity style={styles.successButton} onPress={closeSuccessModal}>
              <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.successGradient}>
                <Text style={styles.successButtonText}>Go to Login</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 40, flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  content: { padding: 20 },
  card: { borderRadius: 20, padding: 20 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  submitButton: { marginTop: 25, borderRadius: 12, overflow: "hidden" },
  gradient: { paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loginLink: { marginTop: 15, alignItems: "center" },
  loginText: { fontSize: 14, fontWeight: "500" },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModal: {
    width: "85%",
    borderRadius: 28,
    padding: 24,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  successSubMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  successButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  successGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  successButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});