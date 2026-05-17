import React from "react";
import { TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../../config/firebaseConfig.native";
import { Ionicons } from "@expo/vector-icons";

export default function SignOutButton() {
  const router = useRouter();

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
            try {
              // Sign out from Firebase Auth
              await signOut(auth);
              
              // Redirect to login page
              router.replace("/Login/teacherlogin");
            } catch (error) {
              console.error("Sign out error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleSignOut}>
      <Ionicons name="log-out-outline" size={20} color="#fff" />
      <Text style={styles.text}>Sign Out</Text>
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
  text: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});