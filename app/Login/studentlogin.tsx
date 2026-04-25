import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, query, where, getDocs, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    Alert,
    Image,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

const studentavatar = require("../../assets/images/studentavatar.jpg");

export default function StudentLoginScreen() {
  const [boardRollNo, setBoardRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration Modal
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [registerData, setRegisterData] = useState({
    boardRollNo: "",
    name: "",
    email: "",
    rollNo: "",
    classRollNo: "",
    department: "",
    semester: "",
    phone: "",
    parentPhone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const router = useRouter();
  const { colors } = useTheme();

  // Check if student is approved before login
  const handleLogin = async () => {
    if (!boardRollNo || !password) {
      Alert.alert("Error", "Please enter Board Roll Number and Password");
      return;
    }

    setLoading(true);

    try {
      // First check if student exists in students collection (approved students)
      const studentRef = doc(db, "students", boardRollNo.trim());
      const studentSnap = await getDoc(studentRef);

      if (studentSnap.exists()) {
        const studentData = studentSnap.data();
        
        if (studentData.password !== password.trim()) {
          Alert.alert("Error", "Incorrect Password!");
          setLoading(false);
          return;
        }

        if (studentData.status === "approved") {
          Alert.alert("Login Successful", `Welcome ${studentData.name}!`);
          router.push(`/Tabs/Studentdashboard/studentdashboard?boardRollNo=${boardRollNo.trim()}`);
        } else if (studentData.status === "pending") {
          Alert.alert("Pending Approval", "Your registration is pending approval by the class teacher.");
        } else if (studentData.status === "rejected") {
          Alert.alert("Registration Rejected", "Your registration was rejected. Please contact administration.");
        }
      } else {
        // Check if there's a pending request
        const requestsRef = collection(db, "studentRequests");
        const q = query(requestsRef, where("boardRollNo", "==", boardRollNo.trim()));
        const requestSnap = await getDocs(q);
        
        if (!requestSnap.empty) {
          const requestData = requestSnap.docs[0].data();
          if (requestData.status === "pending") {
            Alert.alert(
              "Pending Approval", 
              "Your registration request is pending approval by the class teacher.\n\nYou will receive access once approved."
            );
          } else if (requestData.status === "rejected") {
            Alert.alert(
              "Registration Rejected", 
              "Your registration request was rejected. Please contact the administration for assistance."
            );
          }
        } else {
          Alert.alert(
            "Not Registered", 
            "Board Roll Number not found! Please register first using your unique Board Roll Number."
          );
        }
      }
    } catch (error) {
      console.log("Login Error:", error);
      Alert.alert("Error", "Something went wrong!");
    }

    setLoading(false);
  };

  // Register new student (sends request to class teacher)
  const handleRegister = async () => {
    // Validation
    if (!registerData.boardRollNo) {
      Alert.alert("Error", "Board Roll Number is required (unique identifier)");
      return;
    }
    if (!registerData.name) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }
    if (!registerData.department) {
      Alert.alert("Error", "Please enter your department");
      return;
    }
    if (!registerData.semester) {
      Alert.alert("Error", "Please enter your semester");
      return;
    }
    if (!registerData.phone) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }
    if (!registerData.password) {
      Alert.alert("Error", "Please enter a password");
      return;
    }
    if (registerData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    setRegisterLoading(true);

    try {
      // Check if board roll number already exists in approved students
      const studentRef = doc(db, "students", registerData.boardRollNo.trim());
      const existingStudent = await getDoc(studentRef);
      
      if (existingStudent.exists()) {
        Alert.alert("Error", "Board Roll Number already exists! Please login.");
        setRegisterLoading(false);
        return;
      }

      // Check if there's already a pending request
      const requestsRef = collection(db, "studentRequests");
      const q = query(requestsRef, where("boardRollNo", "==", registerData.boardRollNo.trim()));
      const existingRequest = await getDocs(q);
      
      if (!existingRequest.empty) {
        const requestData = existingRequest.docs[0].data();
        if (requestData.status === "pending") {
          Alert.alert("Pending", "You already have a pending request. Please wait for approval.");
        } else if (requestData.status === "rejected") {
          Alert.alert("Rejected", "Your previous request was rejected. Please contact administration.");
        }
        setRegisterLoading(false);
        return;
      }

      // Create new registration request
      const requestId = `req_${Date.now()}_${registerData.boardRollNo}`;
      await setDoc(doc(db, "studentRequests", requestId), {
        boardRollNo: registerData.boardRollNo.trim(),
        name: registerData.name.trim(),
        email: registerData.email.trim() || "",
        rollNo: registerData.rollNo.trim() || "",
        classRollNo: registerData.classRollNo.trim() || "",
        department: registerData.department.trim(),
        semester: registerData.semester.trim(),
        phone: registerData.phone.trim(),
        parentPhone: registerData.parentPhone.trim() || "",
        address: registerData.address.trim() || "",
        password: registerData.password.trim(),
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        "Registration Submitted", 
        "Your registration request has been sent to the class teacher for approval.\n\nYou will be able to login once approved."
      );
      
      setRegisterModalVisible(false);
      resetRegisterForm();
    } catch (error) {
      console.error("Registration Error:", error);
      Alert.alert("Error", "Failed to submit registration. Please try again.");
    }

    setRegisterLoading(false);
  };

  const resetRegisterForm = () => {
    setRegisterData({
      boardRollNo: "",
      name: "",
      email: "",
      rollNo: "",
      classRollNo: "",
      department: "",
      semester: "",
      phone: "",
      parentPhone: "",
      address: "",
      password: "",
      confirmPassword: "",
    });
  };

  const updateRegisterField = (field: string, value: string) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Pressable 
      style={[styles.container, { backgroundColor: colors.background }]}
      onPress={Keyboard.dismiss}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.topSection, { backgroundColor: colors.primary }]}>
            <Image source={studentavatar} style={styles.avatar} />
          </View>

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.card,
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.25)",
              },
            ]}
          >
            <Text style={[styles.headerText, { color: colors.textDark }]}>
              Student Login
            </Text>

            <Text style={[styles.label, { color: colors.textLight }]}>
              Board Roll Number (Unique ID)
            </Text>
            <TextInput
              placeholder="e.g., 2024CS001"
              placeholderTextColor={colors.textLight}
              value={boardRollNo}
              onChangeText={setBoardRollNo}
              autoCapitalize="characters"
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.textDark,
                  backgroundColor: colors.background,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.textLight }]}>
              Password
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                style={[
                  styles.input,
                  { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: "transparent" },
                ]}
                secureTextEntry={!showPassword}
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color={colors.textDark}
                />
              </Pressable>
            </View>

            {/* Forgot Password Button */}
            <Pressable
              onPress={() => router.push("/Login/forgotPassword")}
              style={styles.forgotPasswordBtn}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.loginBtn,
                { backgroundColor: colors.primary },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginText}>
                {loading ? "Logging in..." : "LOG IN"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setRegisterModalVisible(true)}
              style={[
                styles.createAccountBtn,
                { borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.createAccountText, { color: colors.primary }]}>
                Register New Account
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.replace("/")}
              style={[
                styles.loginBtn,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Text style={styles.loginText}>Back</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Registration Modal */}
      <Modal
        visible={registerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRegisterModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setRegisterModalVisible(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: colors.card }]}
            onPress={() => {}}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textDark }]}>
                  Student Registration
                </Text>
                <Pressable onPress={() => setRegisterModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textDark} />
                </Pressable>
              </View>

              <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>
                Please fill all required fields (*)
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.primary }]}>Board Roll Number *</Text>
              <TextInput
                placeholder="Unique Board Roll Number (e.g., 2024CS001)"
                placeholderTextColor={colors.textLight}
                value={registerData.boardRollNo}
                onChangeText={(v) => updateRegisterField("boardRollNo", v)}
                autoCapitalize="characters"
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.primary }]}>Full Name *</Text>
              <TextInput
                placeholder="Your full name"
                placeholderTextColor={colors.textLight}
                value={registerData.name}
                onChangeText={(v) => updateRegisterField("name", v)}
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Email (Optional)</Text>
              <TextInput
                placeholder="your@email.com"
                placeholderTextColor={colors.textLight}
                value={registerData.email}
                onChangeText={(v) => updateRegisterField("email", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Roll Number (Optional)</Text>
              <TextInput
                placeholder="Class roll number"
                placeholderTextColor={colors.textLight}
                value={registerData.rollNo}
                onChangeText={(v) => updateRegisterField("rollNo", v)}
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Class Roll Number (Optional)</Text>
              <TextInput
                placeholder="Class roll number"
                placeholderTextColor={colors.textLight}
                value={registerData.classRollNo}
                onChangeText={(v) => updateRegisterField("classRollNo", v)}
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.primary }]}>Department *</Text>
              <TextInput
                placeholder="e.g., Computer Science, Mathematics"
                placeholderTextColor={colors.textLight}
                value={registerData.department}
                onChangeText={(v) => updateRegisterField("department", v)}
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.primary }]}>Semester *</Text>
              <TextInput
                placeholder="e.g., 1, 2, 3, 4, 5, 6, 7, 8"
                placeholderTextColor={colors.textLight}
                value={registerData.semester}
                onChangeText={(v) => updateRegisterField("semester", v)}
                keyboardType="numeric"
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.primary }]}>Phone Number *</Text>
              <TextInput
                placeholder="Your mobile number"
                placeholderTextColor={colors.textLight}
                value={registerData.phone}
                onChangeText={(v) => updateRegisterField("phone", v)}
                keyboardType="phone-pad"
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Parent Phone Number</Text>
              <TextInput
                placeholder="Parent/Guardian mobile number"
                placeholderTextColor={colors.textLight}
                value={registerData.parentPhone}
                onChangeText={(v) => updateRegisterField("parentPhone", v)}
                keyboardType="phone-pad"
                style={[
                  styles.modalInput,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.textLight }]}>Address</Text>
              <TextInput
                placeholder="Your address"
                placeholderTextColor={colors.textLight}
                value={registerData.address}
                onChangeText={(v) => updateRegisterField("address", v)}
                multiline
                numberOfLines={3}
                style={[
                  styles.modalInput,
                  styles.textArea,
                  {
                    borderColor: colors.border,
                    color: colors.textDark,
                    backgroundColor: colors.background,
                  },
                ]}
              />

              <Text style={[styles.fieldLabel, { color: colors.primary }]}>Password *</Text>
              <View style={[styles.modalPasswordContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  placeholder="Min 6 characters"
                  placeholderTextColor={colors.textLight}
                  value={registerData.password}
                  onChangeText={(v) => updateRegisterField("password", v)}
                  style={[styles.modalInput, { flex: 1, borderWidth: 0 }]}
                  secureTextEntry={!showRegisterPassword}
                />
                <Pressable onPress={() => setShowRegisterPassword(!showRegisterPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showRegisterPassword ? "eye-off" : "eye"} size={20} color={colors.textDark} />
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.primary }]}>Confirm Password *</Text>
              <View style={[styles.modalPasswordContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textLight}
                  value={registerData.confirmPassword}
                  onChangeText={(v) => updateRegisterField("confirmPassword", v)}
                  style={[styles.modalInput, { flex: 1, borderWidth: 0 }]}
                  secureTextEntry={!showRegisterConfirmPassword}
                />
                <Pressable onPress={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showRegisterConfirmPassword ? "eye-off" : "eye"} size={20} color={colors.textDark} />
                </Pressable>
              </View>

              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleRegister}
                disabled={registerLoading}
              >
                <Text style={styles.modalButtonText}>
                  {registerLoading ? "Submitting..." : "Submit Registration"}
                </Text>
              </Pressable>

              <Text style={[styles.noteText, { color: colors.textLight }]}>
                ⚠️ Note: Your Board Roll Number will be your unique login ID. Keep it safe!
                Registration requires class teacher approval.
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topSection: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  avatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: -30,
    borderRadius: 40,
    padding: 25,
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.25)",
  },
  headerText: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
    marginLeft: 5,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
    marginLeft: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    paddingRight: 10,
  },
  eyeIcon: {
    paddingLeft: 10,
  },
  forgotPasswordBtn: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  loginBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  createAccountBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    width: "90%",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 15,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalPasswordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    paddingRight: 10,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 15,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  noteText: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },
});