import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
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

const SEMESTERS = ["1", "2", "3", "4", "5", "6"];

export default function StudentRegister() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    parentPhone: "",
    address: "",
    department: "",
    semester: "",
    boardRollNo: "",
    classRollNo: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Password strength checker
  const getPasswordStrength = (password: string): { label: string; color: string; width: number } => {
    if (!password) return { label: "", color: "#ddd", width: 0 };
    if (password.length < 6) return { label: "Weak", color: "#F44336", width: 25 };
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score === 4 && password.length >= 8) return { label: "Strong", color: "#4CAF50", width: 100 };
    if (score >= 3 && password.length >= 6) return { label: "Good", color: "#2196F3", width: 70 };
    if (score >= 2) return { label: "Fair", color: "#FF9800", width: 45 };
    return { label: "Weak", color: "#F44336", width: 25 };
  };

  const strength = getPasswordStrength(formData.password);

  // Password validation
  const validatePassword = (): string | null => {
    const pwd = formData.password;
    if (!pwd) return "Password is required";
    if (pwd.length < 6) return "Password must be at least 6 characters";
    if (pwd.length > 20) return "Password must be less than 20 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
    if (!/\d/.test(pwd)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character";
    return null;
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.department || !formData.semester || !formData.boardRollNo || !formData.password) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (!formData.email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    const passwordError = validatePassword();
    if (passwordError) {
      Alert.alert("Weak Password", passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const existingQuery = query(
        collection(db, "studentRequests"),
        where("boardRollNo", "==", formData.boardRollNo)
      );
      const existingSnap = await getDocs(existingQuery);
      if (!existingSnap.empty) {
        Alert.alert("Error", "A registration request with this Board Roll Number already exists");
        setLoading(false);
        return;
      }

      const approvedQuery = query(
        collection(db, "students"),
        where("boardRollNo", "==", formData.boardRollNo)
      );
      const approvedSnap = await getDocs(approvedQuery);
      if (!approvedSnap.empty) {
        Alert.alert("Error", "Student with this Board Roll Number already exists");
        setLoading(false);
        return;
      }

      try {
        await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      } catch (authError: any) {
        if (authError.code === "auth/email-already-in-use") {
          Alert.alert("Error", "This email is already registered. Please use a different email.");
          setLoading(false);
          return;
        }
        throw authError;
      }

      await addDoc(collection(db, "studentRequests"), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        parentPhone: formData.parentPhone.trim(),
        address: formData.address.trim(),
        department: formData.department,
        semester: formData.semester,
        boardRollNo: formData.boardRollNo.trim(),
        classRollNo: formData.classRollNo.trim(),
        password: formData.password,
        requestStatus: "pending",
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        "Registration Submitted",
        "Your registration request has been submitted. Please wait for approval from your class teacher.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Failed to submit registration: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Registration</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Personal Information</Text>

        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Full Name *" placeholderTextColor={colors.textLight} value={formData.name} onChangeText={(v) => updateField("name", v)} />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Email *" placeholderTextColor={colors.textLight} value={formData.email} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Phone Number *" placeholderTextColor={colors.textLight} value={formData.phone} onChangeText={(v) => updateField("phone", v)} keyboardType="phone-pad" maxLength={10} />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Parent Phone" placeholderTextColor={colors.textLight} value={formData.parentPhone} onChangeText={(v) => updateField("parentPhone", v)} keyboardType="phone-pad" maxLength={10} />
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Address" placeholderTextColor={colors.textLight} value={formData.address} onChangeText={(v) => updateField("address", v)} multiline numberOfLines={3} />

        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Academic Information</Text>

        <Text style={[styles.label, { color: colors.textLight }]}>Department *</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker selectedValue={formData.department} onValueChange={(v) => updateField("department", v)} dropdownIconColor={colors.textDark}>
            <Picker.Item label="-- Select Department --" value="" color={colors.textLight} />
            {DEPARTMENTS.map((d) => <Picker.Item key={d} label={d} value={d} color={colors.textDark} />)}
          </Picker>
        </View>

        <Text style={[styles.label, { color: colors.textLight }]}>Semester *</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker selectedValue={formData.semester} onValueChange={(v) => updateField("semester", v)} dropdownIconColor={colors.textDark}>
            <Picker.Item label="-- Select Semester --" value="" color={colors.textLight} />
            {SEMESTERS.map((s) => <Picker.Item key={s} label={`Semester ${s}`} value={s} color={colors.textDark} />)}
          </Picker>
        </View>

        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Board Roll Number *" placeholderTextColor={colors.textLight} value={formData.boardRollNo} onChangeText={(v) => updateField("boardRollNo", v)} autoCapitalize="characters" />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Class Roll Number" placeholderTextColor={colors.textLight} value={formData.classRollNo} onChangeText={(v) => updateField("classRollNo", v)} />

        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Account Security</Text>

        <View style={[styles.passwordContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput style={[styles.passwordInput, { color: colors.textDark }]} placeholder="Password *" placeholderTextColor={colors.textLight} value={formData.password} onChangeText={(v) => updateField("password", v)} secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {formData.password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBar}>
              <View style={[styles.strengthFill, { width: `${strength.width}%`, backgroundColor: strength.color }]} />
            </View>
            <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
          </View>
        )}

        <View style={styles.requirementsContainer}>
          <Text style={[styles.requirementsTitle, { color: colors.textLight }]}>Password must contain:</Text>
          <RequirementItem met={formData.password.length >= 6} text="At least 6 characters" colors={colors} />
          <RequirementItem met={/[A-Z]/.test(formData.password)} text="At least one uppercase letter (A-Z)" colors={colors} />
          <RequirementItem met={/[a-z]/.test(formData.password)} text="At least one lowercase letter (a-z)" colors={colors} />
          <RequirementItem met={/\d/.test(formData.password)} text="At least one number (0-9)" colors={colors} />
          <RequirementItem met={/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)} text="At least one special character (!@#$%^&*)" colors={colors} />
        </View>

        <View style={[styles.passwordContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput style={[styles.passwordInput, { color: colors.textDark }]} placeholder="Confirm Password *" placeholderTextColor={colors.textLight} value={formData.confirmPassword} onChangeText={(v) => updateField("confirmPassword", v)} secureTextEntry={!showConfirmPassword} />
          <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {formData.confirmPassword.length > 0 && (
          <View style={styles.matchContainer}>
            <Ionicons name={formData.password === formData.confirmPassword ? "checkmark-circle" : "close-circle"} size={16} color={formData.password === formData.confirmPassword ? "#4CAF50" : "#F44336"} />
            <Text style={[styles.matchText, { color: formData.password === formData.confirmPassword ? "#4CAF50" : "#F44336" }]}>
              {formData.password === formData.confirmPassword ? "Passwords match" : "Passwords do not match"}
            </Text>
          </View>
        )}

        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
          <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.submitGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Registration</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.textLight }]}>Note: Your registration requires approval from your class teacher before you can log in.</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const RequirementItem = ({ met, text, colors }: { met: boolean; text: string; colors: any }) => (
  <View style={styles.requirementItem}>
    <Ionicons name={met ? "checkmark-circle" : "ellipse-outline"} size={14} color={met ? "#4CAF50" : colors.textLight} />
    <Text style={[styles.requirementText, { color: met ? "#4CAF50" : colors.textLight }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  formContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 20, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  pickerContainer: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  passwordContainer: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, marginBottom: 12 },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  strengthContainer: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 10 },
  strengthBar: { flex: 1, height: 4, backgroundColor: "#ddd", borderRadius: 2, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 2 },
  strengthText: { fontSize: 11, fontWeight: "600", width: 50, textAlign: "right" },
  requirementsContainer: { marginBottom: 12, padding: 10 },
  requirementsTitle: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  requirementItem: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  requirementText: { fontSize: 12 },
  matchContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  matchText: { fontSize: 12 },
  submitBtn: { marginTop: 25, borderRadius: 15, overflow: "hidden" },
  submitGradient: { padding: 16, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  note: { fontSize: 12, textAlign: "center", marginTop: 15, fontStyle: "italic" },
});