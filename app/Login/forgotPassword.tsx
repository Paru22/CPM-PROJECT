import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
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
import { useAuth } from "../../context/AuthContext";

export default function ChangePassword() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPasswordStrength = (password: string): { label: string; color: string; width: string } => {
    if (!password) return { label: "", color: "#ddd", width: "0%" };
    if (password.length < 6) return { label: "Weak", color: "#F44336", width: "33%" };
    if (password.length < 8) return { label: "Fair", color: "#FF9800", width: "66%" };
    
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (score >= 3 && password.length >= 8) return { label: "Strong", color: "#4CAF50", width: "100%" };
    if (score >= 2) return { label: "Good", color: "#2196F3", width: "75%" };
    return { label: "Fair", color: "#FF9800", width: "50%" };
  };

  const strength = getPasswordStrength(newPassword);

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }

    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password");
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

    if (currentPassword === newPassword) {
      Alert.alert("Error", "New password must be different from current password");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !user?.email) {
      Alert.alert("Error", "You must be logged in to change password");
      return;
    }

    setLoading(true);

    try {
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Update password in Firebase Auth
      await updatePassword(currentUser, newPassword);

      Alert.alert(
        "Success",
        "Your password has been changed successfully.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error("Change password error:", error);
      
      let message = "Failed to change password. Please try again.";
      
      if (error.code === "auth/wrong-password") {
        message = "Current password is incorrect.";
      } else if (error.code === "auth/weak-password") {
        message = "Password is too weak. Please use at least 6 characters.";
      } else if (error.code === "auth/requires-recent-login") {
        message = "For security reasons, please log out and log in again before changing your password.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      }
      
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <Text style={styles.headerSubtitle}>Update your account password</Text>
        </LinearGradient>

        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            
            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "20" }]}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.textDark }]}>
                For security, please enter your current password to verify your identity.
              </Text>
            </View>

            {/* Current Password */}
            <Text style={[styles.label, { color: colors.textDark }]}>Current Password</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="lock-open-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter current password"
                placeholderTextColor={colors.textLight}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons 
                  name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text style={[styles.label, { color: colors.textDark }]}>New Password</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Enter new password"
                placeholderTextColor={colors.textLight}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons 
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                 <View style={[styles.strengthFill, { width: strength.width as any, backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            {/* Password Requirements */}
            <View style={styles.requirementsContainer}>
              <Text style={[styles.requirementsTitle, { color: colors.textLight }]}>Password must have:</Text>
              <RequirementItem 
                met={newPassword.length >= 6} 
                text="At least 6 characters" 
                colors={colors} 
              />
              <RequirementItem 
                met={/[A-Z]/.test(newPassword)} 
                text="At least one uppercase letter" 
                colors={colors} 
              />
              <RequirementItem 
                met={/[a-z]/.test(newPassword)} 
                text="At least one lowercase letter" 
                colors={colors} 
              />
              <RequirementItem 
                met={/\d/.test(newPassword)} 
                text="At least one number" 
                colors={colors} 
              />
            </View>

            {/* Confirm Password */}
            <Text style={[styles.label, { color: colors.textDark }]}>Confirm New Password</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textDark }]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.textLight} 
                />
              </TouchableOpacity>
            </View>

            {/* Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchContainer}>
                <Ionicons 
                  name={newPassword === confirmPassword ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={newPassword === confirmPassword ? "#4CAF50" : "#F44336"} 
                />
                <Text style={[
                  styles.matchText, 
                  { color: newPassword === confirmPassword ? "#4CAF50" : "#F44336" }
                ]}>
                  {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
                </Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }, loading && styles.disabledBtn]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Change Password</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Reusable Requirement Item
const RequirementItem = ({ met, text, colors }: { met: boolean; text: string; colors: any }) => (
  <View style={styles.requirementItem}>
    <Ionicons 
      name={met ? "checkmark-circle" : "ellipse-outline"} 
      size={14} 
      color={met ? "#4CAF50" : colors.textLight} 
    />
    <Text style={[styles.requirementText, { color: met ? "#4CAF50" : colors.textLight }]}>
      {text}
    </Text>
  </View>
);

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
  content: { flex: 1, padding: 20 },
  card: {
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 13, fontSize: 16 },
  strengthContainer: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 },
  strengthBar: { flex: 1, height: 4, backgroundColor: "#ddd", borderRadius: 2, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 2 },
  strengthText: { fontSize: 11, fontWeight: "600", width: 50, textAlign: "right" },
  requirementsContainer: { marginTop: 15, padding: 10 },
  requirementsTitle: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  requirementItem: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  requirementText: { fontSize: 12 },
  matchContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  matchText: { fontSize: 12 },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
    elevation: 2,
  },
  disabledBtn: { opacity: 0.7 },
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});