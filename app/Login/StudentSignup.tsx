import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { addDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from "expo-linear-gradient";

export default function StudentSignup() {
  const router = useRouter();
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

  // Department options - kept for future use if we want to add dropdown
  // const semesters = ["1", "2", "3", "4", "5", "6", "7", "8"];
  // const departments = [
  //   "Computer Engineering",
  //   "Information Technology",
  //   "Electronics Engineering",
  //   "Mechanical Engineering",
  //   "Civil Engineering",
  //   "Electrical Engineering",
  // ];

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
      // Check if roll number already exists
      const rollQuery = query(collection(db, "studentRequests"), where("rollNo", "==", rollNo));
      const rollSnapshot = await getDocs(rollQuery);
      
      if (!rollSnapshot.empty) {
        Alert.alert("Error", "A request with this roll number already exists");
        setLoading(false);
        return;
      }

      // Check if student already exists
      const studentQuery = query(collection(db, "students"), where("rollNo", "==", rollNo));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (!studentSnapshot.empty) {
        Alert.alert("Error", "A student account with this roll number already exists");
        setLoading(false);
        return;
      }

      // Create student request
      await addDoc(collection(db, "studentRequests"), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        rollNo: rollNo.trim(),
        classRollNo: classRollNo.trim(),
        boardRollNo: boardRollNo.trim(),
        department,
        semester,
        phone: phone.trim(),
        parentPhone: parentPhone.trim() || "",
        address: address.trim() || "",
        password, // In production, this should be hashed
        role: "student",
        status: "pending",
        createdAt: new Date().toISOString(),
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
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#7384bf', '#0c69ff']} style={styles.header}>
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
        <View style={styles.formCard}>
          {/* Personal Information Section */}
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Parent Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{"Parent's Phone Number"}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="people-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter parent's phone number"
                value={parentPhone}
                onChangeText={setParentPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Address Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="home-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your address"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Academic Information Section */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Academic Information</Text>

          {/* Roll Number Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>University Roll Number *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="qr-code-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter university roll number (e.g., STU001)"
                value={rollNo}
                onChangeText={setRollNo}
                autoCapitalize="characters"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Class Roll Number Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Class Roll Number *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="grid-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter class roll number (e.g., 01)"
                value={classRollNo}
                onChangeText={setClassRollNo}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Board Roll Number Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Board Roll Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="trophy-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter board roll number"
                value={boardRollNo}
                onChangeText={setBoardRollNo}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Department Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Department *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Select department"
                value={department}
                onChangeText={setDepartment}
                placeholderTextColor="#999"
              />
            </View>
            <Text style={styles.hintText}>Enter: Computer Engineering, IT, etc.</Text>
          </View>

          {/* Semester Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Semester *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="book-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter semester (1-8)"
                value={semester}
                onChangeText={setSemester}
                keyboardType="numeric"
                maxLength={1}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Password Section */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Account Security</Text>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Create password (min. 6 characters)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#7384bf" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#7384bf" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#7384bf" />
            <Text style={styles.infoText}>
              Your request will be reviewed by your class teacher. You&apos;ll receive approval notification once verified.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity onPress={handleRequest} disabled={loading}>
            <LinearGradient
              colors={['#7384bf', '#0c69ff']}
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

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/Login/studentlogin")}>
              <Text style={styles.loginLink}>Login here</Text>
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
    backgroundColor: "#f5f5f5",
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
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#7384bf",
    marginBottom: 15,
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
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
    color: "#999",
    marginTop: 5,
    marginLeft: 5,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#f0f7ff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#7384bf",
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
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    color: "#7384bf",
    fontWeight: "600",
  },
});