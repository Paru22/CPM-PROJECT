import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

export default function StudentSignup() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [classRollNo, setClassRollNo] = useState("");
  const [boardRollNo, setBoardRollNo] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [phone, setPhone] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  };

  const handleRequest = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    if (!rollNo.trim()) {
      Alert.alert("Error", "Please enter your roll number");
      return;
    }

    if (!classRollNo.trim()) {
      Alert.alert("Error", "Please enter your class roll number");
      return;
    }

    if (!department) {
      Alert.alert("Error", "Please select your department");
      return;
    }

    if (!semester) {
      Alert.alert("Error", "Please select your semester");
      return;
    }

    if (!phone.trim()) {
      Alert.alert("Error", "Please enter your phone number");
      return;
    }

    if (!validatePhone(phone)) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }

    if (parentPhone && !validatePhone(parentPhone)) {
      Alert.alert("Error", "Please enter a valid 10-digit parent phone number");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter a password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      // Check if roll number already exists in requests
      const rollQuery = query(collection(db, "studentRequests"), where("rollNo", "==", rollNo.trim()));
      const rollSnapshot = await getDocs(rollQuery);
      
      if (!rollSnapshot.empty) {
        Alert.alert("Error", "A request with this roll number already exists");
        setLoading(false);
        return;
      }

      // Check if student already exists in approved students
      const studentQuery = query(collection(db, "students"), where("rollNo", "==", rollNo.trim()));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (!studentSnapshot.empty) {
        Alert.alert("Error", "A student account with this roll number already exists");
        setLoading(false);
        return;
      }

      // Also check boardRollNo uniqueness
      if (boardRollNo.trim()) {
        const boardQuery = query(collection(db, "studentRequests"), where("boardRollNo", "==", boardRollNo.trim().toUpperCase()));
        const boardSnapshot = await getDocs(boardQuery);
        
        if (!boardSnapshot.empty) {
          Alert.alert("Error", "A request with this Board Roll Number already exists");
          setLoading(false);
          return;
        }
        
        const boardStudentQuery = query(collection(db, "students"), where("boardRollNo", "==", boardRollNo.trim().toUpperCase()));
        const boardStudentSnapshot = await getDocs(boardStudentQuery);
        
        if (!boardStudentSnapshot.empty) {
          Alert.alert("Error", "A student with this Board Roll Number already exists");
          setLoading(false);
          return;
        }
      }

      // Create student request with FIELD NAMES MATCHING TEACHER'S EXPECTATIONS
      await addDoc(collection(db, "studentRequests"), {
        Name: name.trim(),                    // Capital N to match teacher's code
        name: name.trim(),                    // Lowercase for backward compatibility
        email: email.trim().toLowerCase(),
        rollNo: rollNo.trim(),
        classRollNo: classRollNo.trim(),
        boardRollNo: boardRollNo.trim().toUpperCase(),
        department,
        semester,
        phone: phone.trim(),
        parentPhone: parentPhone.trim() || "",
        address: address.trim() || "",
        password,
        role: "student",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert(
        "Request Sent Successfully!",
        "Your registration request has been submitted to your class teacher for approval. You will be notified once approved.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );

      // Reset form
      setName("");
      setEmail("");
      setRollNo("");
      setClassRollNo("");
      setBoardRollNo("");
      setDepartment("");
      setSemester("");
      setPhone("");
      setParentPhone("");
      setAddress("");
      setPassword("");
      setConfirmPassword("");
      
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
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
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Student Registration</Text>
            <Text style={styles.headerSubtitle}>Request account for class teacher approval</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          {/* Personal Information Section */}
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Personal Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Full Name *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Email Address *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Phone Number *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="call-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter 10-digit phone number"
                placeholderTextColor={colors.textLight}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>{"Parent's Phone Number"}</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="people-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter parent's phone number"
                placeholderTextColor={colors.textLight}
                value={parentPhone}
                onChangeText={setParentPhone}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Address</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="home-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea, { color: colors.textDark }]}
                placeholder="Enter your address"
                placeholderTextColor={colors.textLight}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>Academic Information</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>University Roll Number *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="qr-code-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter university roll number (e.g., STU001)"
                placeholderTextColor={colors.textLight}
                value={rollNo}
                onChangeText={setRollNo}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Class Roll Number *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="grid-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter class roll number (e.g., 01)"
                placeholderTextColor={colors.textLight}
                value={classRollNo}
                onChangeText={setClassRollNo}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Board Roll Number</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="trophy-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter board roll number"
                placeholderTextColor={colors.textLight}
                value={boardRollNo}
                onChangeText={setBoardRollNo}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Department *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="business-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Select department"
                placeholderTextColor={colors.textLight}
                value={department}
                onChangeText={setDepartment}
              />
            </View>
            <Text style={[styles.hintText, { color: colors.textLight }]}>Enter: Computer Engineering, IT, etc.</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Semester *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="book-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter semester (1-8)"
                placeholderTextColor={colors.textLight}
                value={semester}
                onChangeText={setSemester}
                keyboardType="numeric"
                maxLength={1}
              />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>Account Security</Text>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Password *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Create password (min. 6 characters)"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.textDark }]}>Confirm Password *</Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.infoBox, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              {"Your request will be reviewed by your class teacher. You'll receive approval notification once verified."}
            </Text>
          </View>

          <TouchableOpacity onPress={handleRequest} disabled={loading}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.submitButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={20} color="white" />
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.textLight }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/Login/studentlogin")}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>Login here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  eyeIcon: {
    padding: 8,
  },
  hintText: {
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  infoBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});