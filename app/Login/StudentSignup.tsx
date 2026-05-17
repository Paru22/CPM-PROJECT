import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, query, where, getDocs} from "firebase/firestore";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { auth, db } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

// Your specified departments
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

interface StudentFormData {
  name: string;
  gmail: string;
  phoneNo: string;
  parentPhoneNo: string;
  department: string;
  semester: string;
  boardRollNo: string;
  classRollNo: string;
  password: string;
  confirmPassword: string;
}

export default function StudentSignup() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    gmail: "",
    phoneNo: "",
    parentPhoneNo: "",
    department: "",
    semester: "",
    boardRollNo: "",
    classRollNo: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Find class teacher of same department and semester
 const findClassTeacher = async (department: string, semester: string) => {
    try {
      const classTeacherQuery = query(
        collection(db, "classTeachers"),
        where("department", "==", department),
        where("semester", "==", semester)
      );
      
      const snapshot = await getDocs(classTeacherQuery);
      
      if (!snapshot.empty) {
        const classTeacherDoc = snapshot.docs[0];
        const data = classTeacherDoc.data();
        return {
          teacherId: data.teacherId,
          name: data.teacherName || "Class Teacher", // Use teacherName from document
        };
      }
      
      return null;
    } catch  {
      return null;
    }
  };
  const validateForm = (): string | null => {
    if (!formData.name.trim()) return "Full Name is required";
    if (!formData.gmail.trim()) return "Gmail is required";
    if (!formData.gmail.includes("@gmail.com")) return "Please enter a valid Gmail address";
    if (!formData.phoneNo.trim()) return "Phone Number is required";
    if (formData.phoneNo.length < 10) return "Please enter a valid phone number";
    if (!formData.department) return "Please select your Department";
    if (!formData.semester) return "Please select your Semester";
    if (!formData.boardRollNo.trim()) return "Board Roll Number is required";
    if (!formData.password) return "Password is required";
    if (formData.password.length < 6) return "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) return "Passwords do not match";
    return null;
  };

  const handleRegister = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert("Validation Error", validationError);
      return;
    }

    setLoading(true);

    try {
      // Check if boardRollNo already exists in students collection
      const existingStudentQuery = query(
        collection(db, "students"),
        where("boardRollNo", "==", formData.boardRollNo.trim())
      );
      const existingStudentSnap = await getDocs(existingStudentQuery);

      if (!existingStudentSnap.empty) {
        Alert.alert(
          "Already Registered",
          "A student with this Board Roll Number already exists and is approved."
        );
        setLoading(false);
        return;
      }

      // Check if already has a pending request
      const existingRequestQuery = query(
        collection(db, "studentRequests"),
        where("boardRollNo", "==", formData.boardRollNo.trim()),
        where("requestStatus", "==", "pending")
      );
      const existingRequestSnap = await getDocs(existingRequestQuery);

      if (!existingRequestSnap.empty) {
        Alert.alert(
          "Request Pending",
          "You already have a pending registration request. Please wait for approval."
        );
        setLoading(false);
        return;
      }

      // Check if email already used
      const emailQuery = query(
        collection(db, "students"),
        where("gmail", "==", formData.gmail.trim().toLowerCase())
      );
      const emailSnap = await getDocs(emailQuery);

      if (!emailSnap.empty) {
        Alert.alert("Error", "This Gmail is already registered with another account");
        setLoading(false);
        return;
      }

      // Find class teacher for auto-routing
      const classTeacher = await findClassTeacher(
        formData.department,
        formData.semester
      );

      // Create Firebase Auth account
      let firebaseUid: string | null = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.gmail.trim().toLowerCase(),
          formData.password
        );
        firebaseUid = userCredential.user.uid;
      } catch (authError: any) {
        if (authError.code === "auth/email-already-in-use") {
          Alert.alert("Error", "This email is already registered. Please use a different email.");
          setLoading(false);
          return;
        }
        throw authError;
      }

      // Prepare student data
      const studentData = {
        name: formData.name.trim(),
        gmail: formData.gmail.trim().toLowerCase(),
        phoneNo: formData.phoneNo.trim(),
        parentPhoneNo: formData.parentPhoneNo.trim(),
        department: formData.department,
        semester: formData.semester,
        boardRollNo: formData.boardRollNo.trim(),
        classRollNo: formData.classRollNo.trim(),
        password: formData.password, // Note: In production, hash this password
        requestStatus: "pending",
        classTeacherId: classTeacher?.teacherId || null,
        classTeacherName: classTeacher?.name || null,
        firebaseUid: firebaseUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to studentRequests collection
      await addDoc(collection(db, "studentRequests"), studentData);

      // Prepare notification message
      let message = "Your registration request has been submitted successfully.";
      
      if (classTeacher) {
        message += `\n\nYour request has been sent to your Class Teacher (${classTeacher.name || 'Assigned Teacher'}) for approval.`;
        message += "\n\nYou will be notified once approved.";
      } else {
        message += "\n\nNote: No Class Teacher is currently assigned for your department and semester.";
        message += "\nPlease contact your HOD for assistance.";
      }

      Alert.alert(
        "Registration Submitted ✓",
        message,
        [
          {
            text: "OK",
            onPress: () => router.replace("/Login/studentlogin")
          }
        ]
      );

    } catch (error: any) {
      console.error("Registration error:", error);
      
      let errorMessage = "Failed to submit registration. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <LinearGradient 
          colors={[colors.primary, colors.secondary]} 
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Student Registration</Text>
              <Text style={styles.headerSubtitle}>Join your college community</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.formContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Personal Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                Personal Information
              </Text>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder="Full Name *"
              placeholderTextColor={colors.textLight}
              value={formData.name}
              onChangeText={(v) => updateField("name", v)}
              editable={!loading}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder="Gmail Address * (example@gmail.com)"
              placeholderTextColor={colors.textLight}
              value={formData.gmail}
              onChangeText={(v) => updateField("gmail", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder="Phone Number *"
              placeholderTextColor={colors.textLight}
              value={formData.phoneNo}
              onChangeText={(v) => updateField("phoneNo", v)}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!loading}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder="Parent's Phone Number"
              placeholderTextColor={colors.textLight}
              value={formData.parentPhoneNo}
              onChangeText={(v) => updateField("parentPhoneNo", v)}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!loading}
            />
          </View>

          {/* Academic Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="school-outline" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                Academic Information
              </Text>
            </View>

            <Text style={[styles.label, { color: colors.textDark }]}>Department *</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Picker
                selectedValue={formData.department}
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

            <Text style={[styles.label, { color: colors.textDark }]}>Semester *</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Picker
                selectedValue={formData.semester}
                onValueChange={(v) => updateField("semester", v)}
                dropdownIconColor={colors.textDark}
                enabled={!loading}
              >
                <Picker.Item label="Select Semester" value="" color={colors.textLight} />
                {SEMESTERS.map((sem) => (
                  <Picker.Item key={sem} label={`Semester ${sem}`} value={sem} color={colors.textDark} />
                ))}
              </Picker>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder="Board Roll Number *"
              placeholderTextColor={colors.textLight}
              value={formData.boardRollNo}
              onChangeText={(v) => updateField("boardRollNo", v)}
              autoCapitalize="characters"
              editable={!loading}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]}
              placeholder="Class Roll Number"
              placeholderTextColor={colors.textLight}
              value={formData.classRollNo}
              onChangeText={(v) => updateField("classRollNo", v)}
              editable={!loading}
            />
          </View>

          {/* Account Security Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>
                Account Security
              </Text>
            </View>

            <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textDark }]}
                placeholder="Password * (min 6 characters)"
                placeholderTextColor={colors.textLight}
                value={formData.password}
                onChangeText={(v) => updateField("password", v)}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
            </View>

            <View style={[styles.passwordContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textDark }]}
                placeholder="Confirm Password *"
                placeholderTextColor={colors.textLight}
                value={formData.confirmPassword}
                onChangeText={(v) => updateField("confirmPassword", v)}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
            onPress={handleRegister} 
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient 
              colors={[colors.primary, colors.secondary]} 
              style={styles.submitGradient}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.loadingText}>Submitting...</Text>
                </View>
              ) : (
                <View style={styles.submitContent}>
                  <Ionicons name="paper-plane" size={20} color="#fff" />
                  <Text style={styles.submitText}>Submit Registration</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Info Note */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textLight} />
            <Text style={[styles.note, { color: colors.textLight }]}>
              Your registration will be sent to your Class Teacher for approval.
              You can login once approved.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  keyboardView: {
    flex: 1
  },
  header: { 
    padding: 20, 
    paddingTop: 20,
    borderBottomLeftRadius: 25, 
    borderBottomRightRadius: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 15 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: "#fff" 
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  formContainer: { 
    padding: 20 
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "bold",
  },
  label: { 
    fontSize: 14, 
    fontWeight: "600", 
    marginBottom: 8, 
    marginTop: 5 
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    paddingVertical: 13, 
    fontSize: 15, 
    marginBottom: 12 
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
  },
  eyeIcon: {
    padding: 10,
  },
  pickerContainer: { 
    borderRadius: 12, 
    borderWidth: 1, 
    overflow: "hidden", 
    marginBottom: 12 
  },
  submitBtn: { 
    marginTop: 30, 
    borderRadius: 15, 
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  submitGradient: { 
    padding: 16, 
    alignItems: "center" 
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: { 
    color: "#fff", 
    fontSize: 18, 
    fontWeight: "bold" 
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 5,
  },
  note: { 
    fontSize: 13, 
    textAlign: "left",
    fontStyle: "italic",
    flex: 1,
    lineHeight: 18,
  },
});