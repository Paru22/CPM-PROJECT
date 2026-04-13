import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
    Alert,
    Image,
    Keyboard,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import studentavatar from "../../assets/images/studentavatar.jpg";
import { db } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

export default function StudentLoginScreen() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { colors } = useTheme();

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
    } catch (_error) {
      console.log("Login Error:", _error);
      Alert.alert("Error", "Something went wrong!");
    }

    setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.topSection, { backgroundColor: colors.primary }]}>
            <Image source={studentavatar} style={styles.avatar} />
          </View>

          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.card,
                boxShadow: "0px 4px 12px rgba(0,0,0,0.25)",
              },
            ]}
          >
            <Text style={[styles.headerText, { color: colors.textDark }]}>
              Login with Student ID & Password
            </Text>

            <TextInput
              placeholder="Enter Student ID (e.g., STU001)"
              placeholderTextColor={colors.textLight}
              value={studentId}
              onChangeText={setStudentId}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.textDark,
                },
              ]}
            />

            <View
              style={[
                styles.passwordContainer,
                {
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                style={[
                  styles.input,
                  { flex: 1, marginBottom: 0, borderWidth: 0 },
                ]}
                secureTextEntry={!showPassword}
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={24}
                  color={colors.textDark}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
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
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/")}
              style={[
                styles.loginBtn,
                { backgroundColor: colors.secondary },
              ]}
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
  container: {
    flex: 1,
  },
  topSection: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  avatar: {
    width: 270,
    height: 270,
    borderRadius: 150,
  },
  formCard: {
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 40,
    padding: 25,
    elevation: 12, // Android shadow (kept)
  },
  headerText: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
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
  loginBtn: {
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