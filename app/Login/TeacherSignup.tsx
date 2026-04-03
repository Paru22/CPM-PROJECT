import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebaseConfig";
import { useRouter } from "expo-router";

export default function TeacherSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    department: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Full name is required";
    if (!form.email.trim()) return "Email is required";
    if (!form.password) return "Password is required";
    if (form.password.length < 6) return "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) return "Passwords do not match";
    if (!form.department.trim()) return "Department is required";
    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert("Error", error);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const teacherUid = userCredential.user.uid;

      // 2. Create teacher request document in Firestore
      await setDoc(doc(db, "teacherRequests", teacherUid), {
        teacherId: teacherUid,
        name: form.name,
        email: form.email,
        department: form.department,
        phone: form.phone || "",
        role: "teacher",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // Show success popup
      Alert.alert(
        "Request Sent",
        "Your request has been sent to the HOD. You will be notified once approved.",
        [
          {
            text: "OK",
            onPress: () => router.replace("../"), // redirect to login
          },
        ]
      );
    } catch (err: any) {
      console.error(err);
      let message = "Registration failed. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        message = "Email already in use. Please login or use another email.";
      }
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#7384bf", "#0c69ff"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teacher Registration</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., John Doe"
            value={form.name}
            onChangeText={(v) => handleChange("name", v)}
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="teacher@college.edu"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(v) => handleChange("email", v)}
          />

          <Text style={styles.label}>Department *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Computer Science"
            value={form.department}
            onChangeText={(v) => handleChange("department", v)}
          />

          <Text style={styles.label}>Password * (min 6 characters)</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••"
              secureTextEntry={!showPassword}
              value={form.password}
              onChangeText={(v) => handleChange("password", v)}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#7384bf" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password *</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="••••••"
              secureTextEntry={!showConfirmPassword}
              value={form.confirmPassword}
              onChangeText={(v) => handleChange("confirmPassword", v)}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#7384bf" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Phone Number (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(v) => handleChange("phone", v)}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <LinearGradient colors={["#4CAF50", "#45a049"]} style={styles.gradient}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Request</Text>}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("../Login/TeacherLogin")} style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { padding: 20, paddingTop: 40, flexDirection: "row", alignItems: "center" },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  content: { padding: 20 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 3 },
  label: { fontSize: 14, fontWeight: "600", marginTop: 12, marginBottom: 5, color: "#333" },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  submitButton: { marginTop: 25, borderRadius: 12, overflow: "hidden" },
  gradient: { paddingVertical: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loginLink: { marginTop: 15, alignItems: "center" },
  loginText: { color: "#7384bf", fontSize: 14, fontWeight: "500" },
});