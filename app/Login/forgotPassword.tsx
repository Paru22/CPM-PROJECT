import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

export default function ForgotPassword() {
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setEmailSent(true);
    } catch (error: any) {
      console.error("Password reset error:", error);

      let message = "Failed to send reset email. Please try again.";

      if (error.code === "auth/user-not-found") {
        message = "No account found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many requests. Please try again later.";
      }

      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSubtitle}>
            Enter your email to receive a reset link
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {!emailSent ? (
              <>
                <View style={styles.iconContainer}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                    <Ionicons name="lock-closed-outline" size={40} color={colors.primary} />
                  </View>
                </View>

                <Text style={[styles.instructionText, { color: colors.textDark }]}>
                  Enter the email address associated with your account and {"we'll"} send you a
                  link to reset your password.
                </Text>

                <Text style={[styles.label, { color: colors.textDark }]}>Email Address</Text>
                <View
                  style={[
                    styles.inputContainer,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colors.primary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.textDark }]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.resetButton,
                    { backgroundColor: colors.primary },
                    loading && styles.disabledBtn,
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Ionicons name="send-outline" size={20} color="#fff" />
                      <Text style={styles.resetButtonText}>Send Reset Link</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.iconContainer}>
                  <View style={[styles.iconCircle, { backgroundColor: "#4CAF50" + "15" }]}>
                    <Ionicons name="checkmark-circle-outline" size={50} color="#4CAF50" />
                  </View>
                </View>

                <Text style={[styles.successTitle, { color: colors.textDark }]}>
                  Email Sent!
                </Text>
                <Text style={[styles.successMessage, { color: colors.textLight }]}>
                  We have sent a password reset link to{"\n"}
                  <Text style={{ fontWeight: "bold", color: colors.textDark }}>
                    {email}
                  </Text>
                </Text>
                <Text style={[styles.successSubMessage, { color: colors.textLight }]}>
                  Please check your inbox and follow the instructions to reset your password.
                  {"If you don't see the email, check your spam folder."}
                </Text>

                {/* ✅ Spam Warning Box */}
                <View style={[styles.spamWarning, { backgroundColor: "#FFF3E0", borderColor: "#FF9800" }]}>
                  <Ionicons name="warning-outline" size={18} color="#FF9800" />
                  <Text style={[styles.spamWarningText, { color: "#E65100" }]}>
                    {"The email may be in your spam/junk folder. Please check there if you don't see it in your inbox."}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.backToLoginBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.replace("/Login/teacherlogin")}
                >
                  <Ionicons name="arrow-back" size={20} color="#fff" />
                  <Text style={styles.backToLoginText}>Back to Login</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendLink}
                  onPress={() => {
                    setEmailSent(false);
                    handleResetPassword();
                  }}
                >
                  <Text style={[styles.resendText, { color: colors.primary }]}>
                    {"Didn't receive the email? Resend"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    padding: 20,
    paddingTop: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#fff", opacity: 0.9, marginTop: 5 },
  content: { flex: 1, padding: 20, justifyContent: "center" },
  card: {
    borderRadius: 20,
    padding: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: { alignItems: "center", marginBottom: 20 },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  instructionText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 25,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  resetButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
  },
  disabledBtn: { opacity: 0.7 },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  resetButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 10,
  },
  successSubMessage: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 15,
  },
  spamWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  spamWarningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  backToLoginBtn: {
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  backToLoginText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  resendLink: { alignItems: "center", marginTop: 15 },
  resendText: { fontSize: 14, fontWeight: "500" },
});