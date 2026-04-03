import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, getDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { db } from "../../config/firebaseConfig";

const Colors = {
  primary: "#7384bf",
  secondary: "#0c69ff",
};

export default function TeacherLoginPage() {
  const router = useRouter();

  const [teacherId, setTeacherId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!teacherId || !password) {
      Alert.alert("Error", "Please enter both Teacher ID and Password");
      return;
    }

    setLoading(true);
    try {
      const trimmedId = teacherId.trim();
      const ref = doc(db, "teachers", trimmedId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        Alert.alert("Login Failed", "Invalid Teacher ID. No account found with this ID.");
        setLoading(false);
        return;
      }

      const data = snap.data();
      
      if (data.password !== password) {
        Alert.alert("Login Failed", "Invalid Password. Please try again.");
        setLoading(false);
        return;
      }

      const role = (data.role || data.Role || "").toLowerCase();
      
      if (role === "hod") {
        router.replace("/Tabs/Teacherdashboard/HODdashboard");
      } else if (role === "teacher") {
        router.replace("/Tabs/Teacherdashboard/Teacherdashboard");
      } else if (role === "class_teacher") {
        router.replace("/Tabs/Teacherdashboard/ClassTeacherDashboard");
      } else {
        Alert.alert("Access Denied", `Role "${role}" is not authorized.`);
      }
    } catch (err: any) {
      Alert.alert("Login Failed", "An error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient colors={["#7384bf", "#0c69ff"]} style={styles.circleTopLeft} />
        <LinearGradient colors={["#4770ed", "#FFEED0"]} style={styles.circleBottomRight} />

        <View style={styles.card}>
          <Image
            source={{ uri: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }}
            style={styles.topImage}
          />

          <Text style={styles.title}>Teacher Login</Text>

          <TextInput
            style={styles.input}
            placeholder="Teacher ID"
            value={teacherId}
            onChangeText={setTeacherId}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View style={{ position: "relative" }}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.showBtn} onPress={() => setShowPassword(!showPassword)}>
              <Text style={{ color: Colors.secondary, fontWeight: "600" }}>
                {showPassword ? "Hide" : "Show"}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push("/Login/forgotPassword")}>
            <Text style={styles.link}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogin} disabled={loading}>
            <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.button}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>Login</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/Login/TeacherSignup")}>
            <Text style={styles.signupLink}>Create New Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#eef3ff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 14,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    borderRadius: 30,
    marginTop: 10,
  },
  text: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    paddingVertical: 14,
  },
  link: {
    textAlign: "right",
    color: "#3b82f6",
    marginBottom: 10,
  },
  signupLink: {
    textAlign: "center",
    marginTop: 15,
    color: "#6366f1",
    fontWeight: "700",
  },
  topImage: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginBottom: 10,
  },
  showBtn: {
    position: "absolute",
    right: 10,
    top: 15,
  },
  circleTopLeft: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.3,
  },
  circleBottomRight: {
    position: "absolute",
    bottom: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
});