import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import Colors from "../../assets/images/colors";  // ✅ FIXED
import { SafeAreaView } from "react-native-safe-area-context";
import studentavatar from "../../assets/images/studentavatar.jpg";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";

export default function StudentLoginScreen() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    if (!studentId || !password) {
      Alert.alert("Error", "Please enter Student ID and Password");
      return;
    }

    setLoading(true);

    try {
      const studentRef = doc(db, "students", studentId.trim());
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        Alert.alert("Error", "Student ID not found!");
        setLoading(false);
        return;
      }

      const studentData = studentSnap.data();

      if (studentData.password !== password.trim()) {
        Alert.alert("Error", "Incorrect Password!");
        setLoading(false);
        return;
      }

      Alert.alert("Login Successful", `Welcome ${studentData.Name}!`);

      router.push(
        `/Tabs/Studentdashboard/studentdashboard?studentId=${studentId.trim()}`
      );
    } catch (error) {
      console.log("Login Error:", error);
      Alert.alert("Error", "Something went wrong!");
    }

    setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.topSection}>
            <Image source={studentavatar} style={styles.avatar} />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.headerText}>
              Login with Student ID & Password
            </Text>

            <TextInput
              placeholder="Enter Student ID (e.g., STU001)"
              value={studentId}
              onChangeText={setStudentId}
              placeholderTextColor={Colors.textLight}
              style={styles.input}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={Colors.textLight}
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                secureTextEntry={!showPassword}
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color={Colors.textDark}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginBtn, loading && { opacity: 0.6 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginText}>
                {loading ? "Logging in..." : "LOG IN"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/")}
              style={[styles.loginBtn, { backgroundColor: Colors.secondary }]}
            >
              <Text style={styles.loginText}>Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topSection: {
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },

  avatar: { width: 270, height: 270, borderRadius: 150 },

  formCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 40,
    padding: 25,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },

  headerText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: Colors.textDark,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: Colors.textDark,
    marginBottom: 15,
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 15,
    paddingRight: 10,
  },

  eyeIcon: { paddingLeft: 10 },

  loginBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
