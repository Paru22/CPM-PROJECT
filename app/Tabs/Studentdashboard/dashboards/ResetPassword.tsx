import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import React, { useState } from "react";
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
import { db } from "../../../../config/firebaseConfig.native";
import { useTheme } from "../../../../context/ThemeContext";

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const rollNo = params.rollNo as string;
  const storedCode = params.resetCode as string;
  const { colors } = useTheme();

  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!resetCode) {
      Alert.alert("Error", "Please enter the reset code");
      return;
    }

    if (resetCode !== storedCode) {
      Alert.alert("Error", "Invalid reset code");
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

    setLoading(true);

    try {
      const studentRef = doc(db, "students", rollNo);
      await updateDoc(studentRef, {
        password: newPassword,
      });

      Alert.alert(
        "Success",
        "Password reset successfully! Please login with your new password.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/Login/studentlogin"),
          },
        ]
      );
    } catch (_error) {
      console.error("Reset password error:", _error);
      Alert.alert("Error", "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reset Password</Text>
        <Text style={styles.headerSubtitle}>Enter the code sent to your email</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.textDark }]}>Reset Code</Text>
          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textDark }]}
              placeholder="Enter 6-digit reset code"
              placeholderTextColor={colors.textLight}
              value={resetCode}
              onChangeText={setResetCode}
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

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
            />
            <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
              <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: colors.textDark }]}>Confirm Password</Text>
          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textDark }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.primary }, loading && styles.disabledBtn]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    elevation: 5, // Android shadow (kept, not deprecated)
    // boxShadow applied inline
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 15,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  resetButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});