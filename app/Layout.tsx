import { Stack } from "expo-router";
import { Platform } from "react-native";
import { AuthProvider } from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: true,
          gestureEnabled: true,
          gestureDirection: "horizontal",
          animation: Platform.select({
            ios: "slide_from_right",
            android: "slide_from_right",
          }),
          presentation: "card",
        }}
      >
        {/* 👇 IMPORTANT */}
        <Stack.Screen name="Tabs" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}