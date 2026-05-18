import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
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
import { useTheme } from "../../context/ThemeContext";

const studentavatar = require("../../assets/images/studentavatar.jpg");

export default function StudentLoginScreen() {
  const [boardRollNo, setBoardRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!boardRollNo.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter Board Roll Number and Password");
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    const input: string = boardRollNo.trim();
    const pass: string = password.trim();

    try {
      // Search in students collection
      const allSnap: any = await getDocs(collection(db, "students"));
      
      let matchedStudent: any = null;
      let matchedDocId: string | null = null;
      
      allSnap.forEach((doc: any) => {
        const data: any = doc.data();
        
        // Try matching by boardRollNo field
        if (data.boardRollNo && String(data.boardRollNo) === input) {
          matchedStudent = data;
          matchedDocId = doc.id;
        }
        // Try matching by rollNo field
        if (!matchedStudent && data.rollNo && String(data.rollNo) === input) {
          matchedStudent = data;
          matchedDocId = doc.id;
        }
      });
      
      if (matchedStudent && matchedDocId) {
        // Check password
        if (matchedStudent.password !== pass) {
          Alert.alert("Error", "Incorrect Password!");
          setLoading(false);
          return;
        }

        // Check status
        if (matchedStudent.status === "approved") {
          const name = matchedStudent.Name || matchedStudent.name || "Student";
          Alert.alert(
            "Login Successful",
            "Welcome " + name + "!",
            [
              {
                text: "OK",
                onPress: () => {
                  // Pass boardRollNo to dashboard, not document ID
                  router.push(
                    "/Tabs/Studentdashboard/studentdashboard?boardRollNo=" + input as any
                  );
                }
              }
            ]
          );
        } else if (matchedStudent.status === "pending") {
          Alert.alert(
            "Pending Approval",
            "Your registration is pending approval by the class teacher."
          );
        } else if (matchedStudent.status === "rejected") {
          Alert.alert(
            "Registration Rejected",
            "Your registration was rejected. Please contact administration."
          );
        } else {
          // If no status field, treat as approved
          const name = matchedStudent.Name || matchedStudent.name || "Student";
          Alert.alert(
            "Login Successful",
            "Welcome " + name + "!",
            [
              {
                text: "OK",
                onPress: () => {
                  router.push(
                    "/Tabs/Studentdashboard/studentdashboard?boardRollNo=" + input as any
                  );
                }
              }
            ]
          );
        }
        setLoading(false);
        return;
      }

      // Search in studentRequests collection
      const allReqSnap: any = await getDocs(collection(db, "studentRequests"));
      let matchedReq: any = null;
      
      allReqSnap.forEach((doc: any) => {
        const data: any = doc.data();
        
        if (data.boardRollNo && String(data.boardRollNo) === input) {
          matchedReq = data;
        }
        if (!matchedReq && data.rollNo && String(data.rollNo) === input) {
          matchedReq = data;
        }
      });
      
      if (matchedReq) {
        if (matchedReq.password !== pass) {
          Alert.alert("Error", "Incorrect Password!");
          setLoading(false);
          return;
        }
        
        if (matchedReq.status === "pending") {
          Alert.alert(
            "Pending Approval",
            "Your registration request is pending approval by the class teacher."
          );
        } else if (matchedReq.status === "rejected") {
          Alert.alert(
            "Registration Rejected",
            "Your registration request was rejected. Please contact administration."
          );
        } else {
          Alert.alert(
            "Registration Status",
            "Your registration status is: " + (matchedReq.status || "unknown")
          );
        }
        setLoading(false);
        return;
      }

      // No student found
      Alert.alert(
        "Not Registered",
        "Board Roll Number not found!\n\n" +
        "Please check your Board Roll Number or register first."
      );
      
    } catch (err: any) {
      console.log("Login Error:", err);
      Alert.alert("Error", "Something went wrong! Please try again.");
    }
    
    setLoading(false);
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
            <Text style={styles.welcomeText}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtext}>Login to your student account</Text>
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
                style={[styles.input, { color: colors.textDark }]}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
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
            <TouchableOpacity onPress={handleLogin} disabled={loading}>
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
            >
              <Text style={[styles.registerBtnText, { color: colors.primary }]}>
                Register New Account
              </Text>
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.replace("/")}
              style={[styles.backBtn, { backgroundColor: colors.secondary }]}
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