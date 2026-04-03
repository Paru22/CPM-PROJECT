import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebaseConfig";
import { useRouter } from "expo-router";

const ForgotPassword = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      
      setEmailSent(true);
      Alert.alert(
        "Password Reset Email Sent",
        `We've sent a password reset link to ${email}. Please check your inbox and follow the instructions to reset your password.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      let errorMessage = "Failed to send reset email. Please try again.";
      switch (error.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with this email address.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many requests. Please try again later.";
          break;
        default:
          errorMessage = error.message || "Failed to send reset email.";
      }
      
      Alert.alert("Password Reset Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#7384bf", "#0c69ff"]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forgot Password</Text>
        <Text style={styles.headerSubtitle}>
          Enter your email to receive a password reset link
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="lock-open-outline" size={80} color="#7384bf" />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#7384bf" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your registered email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading && !emailSent}
              />
              {email !== "" && (
                <TouchableOpacity onPress={() => setEmail("")}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.helpText}>
              We&apos;ll send a password reset link to this email address. The link will expire in 1 hour.
            </Text>

            <TouchableOpacity
              style={[styles.resetButton, (loading || emailSent) && styles.disabledButton]}
              onPress={handleResetPassword}
              disabled={loading || emailSent}
            >
              <LinearGradient
                colors={["#7384bf", "#0c69ff"]}
                style={styles.resetGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={24} color="#fff" />
                    <Text style={styles.resetButtonText}>Send Reset Link</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {emailSent && (
              <View style={styles.successContainer}>
                <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
                <Text style={styles.successText}>
                  Reset link sent successfully!
                </Text>
                <Text style={styles.successSubtext}>
                  Please check your email and follow the instructions to reset your password.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.backToLogin}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color="#7384bf" />
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 30,
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 16,
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
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 16,
  },
  resetButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
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
  disabledButton: {
    opacity: 0.6,
  },
  successContainer: {
    alignItems: "center",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  successText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: 10,
  },
  successSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 5,
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

export default ForgotPassword;