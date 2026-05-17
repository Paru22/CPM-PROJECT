import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc, collection, query, where, getDocs } from "firebase/firestore";
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

interface TeacherFormData {
  name: string;
  gmail: string;
  password: string;
  confirmPassword: string;
  phoneNo: string;
  address: string;
  qualification: string;
  department: string;
  hodName?: string;
}

export default function TeacherSignup() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [form, setForm] = useState<TeacherFormData>({
    name: "",
    gmail: "",
    password: "",
    confirmPassword: "",
    phoneNo: "",
    address: "",
    qualification: "",
    department: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: keyof TeacherFormData, value: string) => {
    setForm({ ...form, [field]: value });
  };

  const findHOD = async (department: string) => {
    try {
      const hodQuery = query(
        collection(db, "admins"),
        where("department", "==", department)
      );
      
      const snapshot = await getDocs(hodQuery);
      
      if (!snapshot.empty) {
        const hodDoc = snapshot.docs[0];
        const data = hodDoc.data();
        return {
          hodId: hodDoc.id,
          name: data.name || "HOD",
        };
      }
      
      const teacherHodQuery = query(
        collection(db, "teachers"),
        where("department", "==", department),
        where("role", "==", "hod")
      );
      
      const teacherSnapshot = await getDocs(teacherHodQuery);
      
      if (!teacherSnapshot.empty) {
        const hodDoc = teacherSnapshot.docs[0];
        const data = hodDoc.data();
        return {
          hodId: hodDoc.id,
          name: data.name || "HOD",
        };
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Full Name is required";
    if (!form.gmail.trim()) return "Gmail address is required";
    if (!form.gmail.includes("@gmail.com") && !form.gmail.includes("@")) {
      return "Please enter a valid email address";
    }
    if (!form.password) return "Password is required";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.phoneNo.trim()) return "Phone number is required";
    if (form.phoneNo.length < 10) return "Please enter a valid phone number";
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
      const existingRequestQuery = query(
        collection(db, "teacherRequests"),
        where("gmail", "==", form.gmail.trim().toLowerCase())
      );
      const existingRequestSnap = await getDocs(existingRequestQuery);

      if (!existingRequestSnap.empty) {
        Alert.alert(
          "Request Exists",
          "A registration request with this email is already pending approval."
        );
        setLoading(false);
        return;
      }

      const existingTeacherQuery = query(
        collection(db, "teachers"),
        where("gmail", "==", form.gmail.trim().toLowerCase())
      );
      const existingTeacherSnap = await getDocs(existingTeacherQuery);

      if (!existingTeacherSnap.empty) {
        Alert.alert(
          "Already Registered",
          "This email is already registered as a teacher. Please login instead."
        );
        setLoading(false);
        return;
      }

      const hod = await findHOD(form.department);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.gmail.trim().toLowerCase(),
        form.password
      );
      const teacherUid = userCredential.user.uid;

      const teacherData = {
        teacherId: teacherUid,
        name: form.name.trim(),
        gmail: form.gmail.trim().toLowerCase(),
        department: form.department,
        phoneNo: form.phoneNo.trim(),
        address: form.address.trim(),
        qualification: form.qualification.trim(),
        role: "teacher",
        requestStatus: "pending",
        hodId: hod?.hodId || null,
        hodName: hod?.name || null,
        firebaseUid: teacherUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "teacherRequests", teacherUid), teacherData);

      setForm(prev => ({ ...prev, hodName: hod?.name || "" }));
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
                HOD will assign your roles and subjects after verification.
              </Text>
            </View>

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

            <Text style={[styles.label, { color: colors.textDark }]}>Gmail Address *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              placeholder="example@gmail.com"
              placeholderTextColor={colors.textLight}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.gmail}
              onChangeText={(v) => updateField("gmail", v)}
              editable={!loading}
            />

            <Text style={[styles.label, { color: colors.textDark }]}>Phone Number *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              placeholder="Enter 10-digit phone number"
              placeholderTextColor={colors.textLight}
              keyboardType="phone-pad"
              maxLength={10}
              value={form.phoneNo}
              onChangeText={(v) => updateField("phoneNo", v)}
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

            <Text style={[styles.label, { color: colors.textDark }]}>Department *</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Picker
                selectedValue={form.department}
                onValueChange={(v) => updateField("department", v)}
                dropdownIconColor={colors.textDark}
                enabled={!loading}
              >
                <Picker.Item label="Select Department" value="" color={colors.textLight} />
                {DEPARTMENTS.map((dept) => (
                  <Picker.Item key={dept} label={dept} value={dept} color={colors.textDark} />
                ))}
              </Picker>
            </View>

            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Account Security</Text>
            </View>

            <Text style={[styles.label, { color: colors.textDark }]}>Password * (min 6 characters)</Text>
            <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textDark }]}
                placeholder="Enter password"
                placeholderTextColor={colors.textLight}
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={(v) => updateField("password", v)}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
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
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, loading && { opacity: 0.7 }]} 
              onPress={handleSubmit} 
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.gradient}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.loadingText}>Submitting Request...</Text>
                  </View>
                ) : (
                  <View style={styles.submitContent}>
                    <Ionicons name="send" size={18} color="#fff" />
                    <Text style={styles.submitText}>Submit Registration Request</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push("/Login/teacherlogin")} 
              style={styles.loginLink}
              disabled={loading}
            >
              <Text style={[styles.loginText, { color: colors.primary }]}>
                Already have an account? Login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={closeSuccessModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.successModal, { backgroundColor: colors.card }]}>
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={["#4CAF50", "#45a049"]}
                style={styles.successIconGradient}
              >
                <Ionicons name="checkmark" size={50} color="#fff" />
              </LinearGradient>
            </View>
            
            <Text style={[styles.successTitle, { color: colors.textDark }]}>
              Request Submitted Successfully!
            </Text>
            
            <Text style={[styles.successMessage, { color: colors.textDark }]}>
              Your registration request has been forwarded to the Head of Department
              {form.hodName ? ` (${form.hodName})` : ""} for approval.
            </Text>
            
            <View style={[styles.nextStepsBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <Text style={[styles.nextStepsTitle, { color: colors.primary }]}>What happens next?</Text>
              <View style={styles.stepItem}>
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={[styles.stepText, { color: colors.textDark }]}>
                  HOD will review your application
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                <Text style={[styles.stepText, { color: colors.textDark }]}>
                  HOD will assign your roles (Subject Teacher, Class Teacher, Lab Incharge)
                </Text>
              </View>
              <View style={styles.stepItem}>
                <Ionicons name="notifications-outline" size={16} color={colors.primary} />
                <Text style={[styles.stepText, { color: colors.textDark }]}>
                  You&apos;ll be notified once approved
                </Text>
              </View>
            </View>

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
  header: { 
    padding: 20, paddingTop: 20,
    borderBottomLeftRadius: 25, borderBottomRightRadius: 25,
    elevation: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8,
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  backButton: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", alignItems: "center" 
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 2 },
  content: { padding: 20 },
  card: { 
    borderRadius: 20, padding: 20,
    elevation: 3,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8,
  },
  infoBox: {
    flexDirection: "row", alignItems: "flex-start",
    padding: 15, borderRadius: 12, borderWidth: 1,
    marginBottom: 25, gap: 10,
  },
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
  loadingContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
  loadingText: { color: "#fff", fontSize: 15 },
  loginLink: { marginTop: 20, alignItems: "center" },
  loginText: { fontSize: 15, fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  successModal: { width: "90%", borderRadius: 24, padding: 30, alignItems: "center", elevation: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  successIconContainer: { marginBottom: 20 },
  successIconGradient: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center" },
  successTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 12, textAlign: "center" },
  successMessage: { fontSize: 15, textAlign: "center", marginBottom: 20, lineHeight: 22 },
  nextStepsBox: { width: "100%", padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 25 },
  nextStepsTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12 },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  stepText: { fontSize: 13, flex: 1, lineHeight: 18 },
  successButton: { width: "100%", borderRadius: 12, overflow: "hidden" },
  successGradient: { paddingVertical: 15, alignItems: "center" },
  successButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});