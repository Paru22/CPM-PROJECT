import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../config/firebaseConfig.native";

const ResetPassword = () => {
  const router = useRouter();
  const { oobCode } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [email, setEmail] = useState("");

  const verifyCode = useCallback(async () => {
    try {
      if (oobCode) {
        const userEmail = await verifyPasswordResetCode(auth, oobCode as string);
        setEmail(userEmail);
        setLoading(false);
      } else {
        Alert.alert("Error", "Invalid reset link");
        router.back();
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      Alert.alert("Error", "This reset link is invalid or has expired");
      router.back();
    }
  }, [oobCode, router]);

  useEffect(() => {
    verifyCode();
  }, [verifyCode]);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setResetting(true);
    try {
      await confirmPasswordReset(auth, oobCode as string, newPassword);
      Alert.alert(
        "Success",
        "Password reset successfully! You can now login with your new password.",
        [
          {
            text: "Go to Login",
            onPress: () => router.push("/Login/teacherlogin"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error resetting password:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to reset password. Please try again."
      );
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7384bf" />
        <Text style={styles.loadingText}>Verifying reset link...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#7384bf", "#0c69ff"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <Text style={styles.headerSubtitle}>
          Create a new password for {email}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.formContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed-outline" size={60} color="#7384bf" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#7384bf" />
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#7384bf" />
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetPassword}
            disabled={resetting}
          >
            <LinearGradient colors={["#7384bf", "#0c69ff"]} style={styles.resetGradient}>
              {resetting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.resetButtonText}>Reset Password</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backToLogin} onPress={() => router.push("/Login/teacherlogin")}>
            <Ionicons name="arrow-back" size={20} color="#7384bf" />
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#7384bf",
  },
  header: {
    padding: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 3,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  resetButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
    marginBottom: 15,
  },
  resetGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  backToLoginText: {
    fontSize: 14,
    color: "#7384bf",
    fontWeight: "500",
  },
});

export default ResetPassword;