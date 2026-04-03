import React from "react";
import { TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert(
      "Confirm",
      "Do you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: () => {
            // Redirect to login page
            router.replace("/Login/teacherlogin");
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleSignOut}>
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
    marginTop: 20,
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});