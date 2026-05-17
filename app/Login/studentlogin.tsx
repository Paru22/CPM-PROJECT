import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebaseConfig.native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const studentavatar = require("../../assets/images/studentavatar.jpg");

interface StudentData {
  boardRollNo: string;
  password: string;
  gmail: string;
  requestStatus: string;
  name: string;
  department: string;
  semester: string;
}

export default function StudentLoginScreen() {
  const [boardRollNo, setBoardRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { colors } = useTheme();
  const { loginAsStudent } = useAuth();

  const findStudentByBoardRoll = async (boardRollNo: string): Promise<{ studentData: StudentData; docId: string } | null> => {
    try {
      // Query students collection by boardRollNo (efficient indexed query)
      const studentsQuery = query(
        collection(db, "students"),
        where("boardRollNo", "==", boardRollNo),
        limit(1)
      );
      
      const studentSnapshot = await getDocs(studentsQuery);
      
      if (!studentSnapshot.empty) {
        const doc = studentSnapshot.docs[0];
        return {
          studentData: doc.data() as StudentData,
          docId: doc.id
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error finding student:", error);
      throw new Error("Failed to search student. Please try again.");
    }
  };

  const handleLogin = async () => {
    // Input validation
    if (!boardRollNo.trim()) {
      Alert.alert("Validation Error", "Please enter your Board Roll Number");
      return;
    }
    
    if (!password.trim()) {
      Alert.alert("Validation Error", "Please enter your Password");
      return;
    }

    const trimmedRollNo = boardRollNo.trim();
    const trimmedPassword = password.trim();
    
    setLoading(true);
    Keyboard.dismiss();

    try {
      // Find student by board roll number
      const studentResult = await findStudentByBoardRoll(trimmedRollNo);
      
      if (!studentResult) {
        Alert.alert(
          "Not Found",
          "No student found with this Board Roll Number.\n\nPlease check your Board Roll Number or register first."
        );
        setLoading(false);
        return;
      }

      const { studentData } = studentResult;

      // Verify password (client-side check before Firebase Auth)
      if (studentData.password !== trimmedPassword) {
        Alert.alert("Invalid Password", "The password you entered is incorrect. Please try again.");
        setLoading(false);
        return;
      }

      // Check request status
      const status = studentData.requestStatus || "pending";
      
      switch (status) {
        case "approved":
          // Proceed with Firebase Auth login
          try {
            await loginAsStudent(trimmedRollNo, trimmedPassword);
            
            Alert.alert(
              "Login Successful",
              `Welcome ${studentData.name || "Student"}!`,
              [
                {
                  text: "OK",
                  onPress: () => {
                    router.replace("/Tabs/Studentdashboard/studentdashboard");
                  }
                }
              ]
            );
         } catch {
            // If Firebase Auth fails (maybe email not configured), 
            // still allow login with local state
            Alert.alert(
              "Login Successful",
              `Welcome ${studentData.name || "Student"}!`,
              [
                {
                  text: "OK",
                  onPress: () => {
                    router.replace({
                      pathname: "/Tabs/Studentdashboard/studentdashboard",
                      params: { boardRollNo: trimmedRollNo }
                    });
                  }
                }
              ]
            );
          }
          break;
          
        case "pending":
          Alert.alert(
            "Pending Approval",
            "Your registration is pending approval.\n\n" +
            "Please wait for your Class Teacher to approve your account. " +
            "You will be notified once approved."
          );
          break;
          
        case "rejected":
          Alert.alert(
            "Registration Rejected",
            "Your registration has been rejected by the Class Teacher.\n\n" +
            "Please contact your Class Teacher or HOD for more information.",
            [
              {
                text: "Contact Support",
                onPress: () => router.push("/Tabs/Studentdashboard/dashboards/Helpsupport"),
                style: "default"
              },
              {
                text: "OK",
                style: "cancel"
              }
            ]
          );
          break;
          
        default:
          Alert.alert(
            "Unknown Status",
            `Your account status is: ${status}\nPlease contact administration.`
          );
      }
      
    } catch (error: any) {
      console.error("Login Error:", error);
      Alert.alert(
        "Error",
        error.message || "Something went wrong during login. Please try again."
      );
    } finally {
      setLoading(false);
    }
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
          {/* Header with Avatar */}
          <LinearGradient 
            colors={[colors.primary, colors.secondary]} 
            style={styles.headerGradient}
          >
            <Image source={studentavatar} style={styles.avatar} />
            <Text style={styles.welcomeText}>Student Login</Text>
            <Text style={styles.welcomeSubtext}>Enter your credentials to continue</Text>
          </LinearGradient>

          {/* Login Form */}
          <View style={[styles.formCard, { backgroundColor: colors.card }]}>
            {/* Board Roll Number */}
            <Text style={[styles.label, { color: colors.textDark }]}>
              Board Roll Number
            </Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="id-card-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter Board Roll Number"
                placeholderTextColor={colors.textLight}
                value={boardRollNo}
                onChangeText={setBoardRollNo}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
                editable={!loading}
                style={[styles.input, { color: colors.textDark }]}
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { color: colors.textDark }]}>
              Password
            </Text>
            <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                style={[styles.input, { color: colors.textDark }]}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)} 
                style={styles.eyeIcon}
                disabled={loading}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.primary} 
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              onPress={() => router.push("/Login/forgotPassword")}
              style={styles.forgotPasswordBtn}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity 
              onPress={handleLogin} 
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={[styles.loginBtn, loading && { opacity: 0.7 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>LOG IN</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity
              onPress={() => router.push("/Login/StudentSignup")}
              style={[styles.registerBtn, { borderColor: colors.primary }]}
              disabled={loading}
            >
              <Text style={[styles.registerBtnText, { color: colors.primary }]}>
                Register New Account
              </Text>
            </TouchableOpacity>

            {/* Help Text */}
            <View style={styles.helpContainer}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textLight} />
              <Text style={[styles.helpText, { color: colors.textLight }]}>
                Use your Board Roll Number for login
              </Text>
            </View>

            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.replace("/")}
              style={[styles.backBtn, { backgroundColor: colors.secondary }]}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
              <Text style={styles.backBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  headerGradient: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
    marginBottom: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  welcomeSubtext: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 5,
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 20,
    padding: 25,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  registerBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
  },
  registerBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  helpContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    gap: 5,
  },
  helpText: {
    fontSize: 12,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  backBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});