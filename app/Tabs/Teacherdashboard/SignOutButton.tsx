import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function SignOutButton() {
  const router = useRouter();
  const { logout } = useAuth(); // Use AuthContext logout
  const [loading, setLoading] = useState(false);

  const handleSignOut = () => {
  Alert.alert(
    "Confirm Logout",
    "Are you sure you want to logout?",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          setLoading(true);

          try {
            await logout();

          } catch (error) {
            console.error("Sign out error:", error);

            Alert.alert(
              "Error",
              "Failed to sign out. Please try again."
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]
  );
};
  return (
    <TouchableOpacity 
      style={[styles.button, loading && styles.buttonDisabled]} 
      onPress={handleSignOut}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.text}>Sign Out</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#ff4d4d",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    flexDirection: "row",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});