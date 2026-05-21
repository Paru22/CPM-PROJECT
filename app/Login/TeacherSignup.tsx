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
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { db, auth } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

const DEPARTMENTS = [
  "Civil Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Computer Engineering",
  "Automobile Engineering",
  "Architecture Assistantship",
  "Electronics & Communication Engineering",
];

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
    qualification: "",
    address: "",
    department: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Full name is required";
    if (!form.email.trim()) return "Email address is required";
    if (!form.email.includes("@")) return "Please enter a valid email address";
    if (!form.password) return "Password is required";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.phone.trim()) return "Phone number is required";
    if (form.phone.length < 10) return "Please enter a valid phone number";
    if (!form.department) return "Please select your Department";
    if (!form.qualification.trim()) return "Qualification is required";
    if (!form.address.trim()) return "Address is required";
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim().toLowerCase(),
        form.password
      );
      const teacherUid = userCredential.user.uid;

      await setDoc(doc(db, "teacherRequests", teacherUid), {
        uid: teacherUid,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department,
        phone: form.phone.trim(),
        qualification: form.qualification.trim(),
        address: form.address.trim(),
        role: "teacher",status: "pending",
        requestStatus: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Signup error:", err);
      let message = "Registration failed. Please try again.";
      
      if (err.code === "auth/email-already-in-use") {
        message = "This email is already registered. Please use a different email or login.";
      } else if (err.code === "auth/weak-password") {
        message = "Password is too weak. Please use at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email address. Please enter a valid email.";
      } else if (err.code === "auth/network-request-failed") {
        message = "Network error. Please check your internet connection.";
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} disabled={loading}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Teacher Registration</Text>
              <Text style={styles.headerSubtitle}>Join as a faculty member</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={[styles.infoBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textDark }]}>
                Your request will be sent to the <Text style={{ fontWeight: "bold" }}>Head of Department</Text> for approval.
              </Text>
            </View>

            {/* Personal Information */}
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Personal Information</Text>
            </View>

            <Text style={[styles.label, { color: colors.textDark }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textLight}
              value={form.name}
              onChangeText={(v) => updateField("name", v)}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.textDark }]}>Email Address *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              placeholder="example@gmail.com"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.email}
              onChangeText={(v) => updateField("email", v)}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.textDark }]}>Phone Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              placeholder="Enter 10-digit phone number"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              maxLength={10}
              value={form.phone}
              onChangeText={(v) => updateField("phone", v)}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.textDark }]}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              placeholder="Enter your full address"
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
              value={form.address}
              onChangeText={(v) => updateField("address", v)}
              editable={!loading}
            />

            {/* Professional Information */}
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Professional Information</Text>
            </View>

            <Text style={[styles.label, { color: colors.textDark }]}>Qualification *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              placeholder="e.g., M.Tech, Ph.D., B.Ed"
              placeholderTextColor={colors.textLight}
              value={form.qualification}
              onChangeText={(v) => updateField("qualification", v)}
              editable={!loading}
            />

            {/* ✅ DEPARTMENT DROPDOWN */}
            <Text style={[styles.label, { color: colors.textDark }]}>Department *</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Picker
                selectedValue={form.department}
                onValueChange={(v) => updateField("department", v)}
                dropdownIconColor={colors.textDark}
                enabled={!loading}
              >
                <Picker.Item label="-- Select Department --" value="" color={colors.textLight} />
                {DEPARTMENTS.map((dept) => (
                  <Picker.Item key={dept} label={dept} value={dept} color={colors.textDark} />
                ))}
              </Picker>
            </View>

            {/* Account Security */}
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Account Security</Text>
            </View>

            <Text style={[styles.label, { color: colors.textDark }]}>Password *</Text>
            <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textDark }]}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => updateField("password", v)}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textDark }]}>Confirm Password *</Text>
            <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textDark }]}
                placeholder="Re-enter password"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showConfirmPassword}
                value={form.confirmPassword}
                onChangeText={(v) => updateField("confirmPassword", v)}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && { opacity: 0.7 }]} 
              onPress={handleSubmit} 
              disabled={loading}
            >
              <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.gradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.submitContent}>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.submitText}>Submit Registration Request</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/Login/teacherlogin")} style={styles.loginLink} disabled={loading}>
              <Text style={[styles.loginText, { color: colors.primary }]}>Already have an account? Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal animationType="fade" transparent={true} visible={showSuccessModal} onRequestClose={closeSuccessModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.successModal, { backgroundColor: colors.card }]}>
            <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.successIcon}>
              <Ionicons name="checkmark" size={50} color="#fff" />
            </LinearGradient>
            <Text style={[styles.successTitle, { color: colors.textDark }]}>Request Submitted!</Text>
            <Text style={[styles.successMessage, { color: colors.textLight }]}>
              Your registration request has been forwarded to the HOD for approval.
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
  keyboardView: { flex: 1 },
  header: { padding: 20, paddingTop: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 5 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  content: { padding: 20 },
  card: { borderRadius: 20, padding: 20, elevation: 3 },
  infoBox: { flexDirection: "row", alignItems: "flex-start", padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 25, gap: 10 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 15, marginTop: 5 },
  sectionTitle: { fontSize: 17, fontWeight: "600" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 5 },
  input: { borderWidth: 1, borderRadius: 12, padding: 13, fontSize: 15, marginBottom: 15 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  pickerContainer: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 15 },
  passwordContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, marginBottom: 15 },
  passwordInput: { flex: 1, padding: 13, fontSize: 15 },
  eyeButton: { padding: 10 },
  submitButton: { marginTop: 25, borderRadius: 12, overflow: "hidden", elevation: 3 },
  gradient: { paddingVertical: 15, alignItems: "center" },
  submitContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loginLink: { marginTop: 20, alignItems: "center" },
  loginText: { fontSize: 15, fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  successModal: { width: "90%", borderRadius: 24, padding: 30, alignItems: "center", elevation: 5 },
  successIcon: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  successMessage: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  successButton: { width: "100%", borderRadius: 12, overflow: "hidden" },
  successGradient: { paddingVertical: 15, alignItems: "center" },
  successButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});