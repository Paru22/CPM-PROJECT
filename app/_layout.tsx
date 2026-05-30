import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import {
  Platform,
  ActivityIndicator,
  View,
} from "react-native";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentSegments = segments.map(String);
    const segmentPath = currentSegments.join("/");

    console.log("AuthGuard - Path:", segmentPath);
    console.log("AuthGuard - User:", user?.role || "No user");
    console.log("AuthGuard - Loading:", loading);

    // Public routes
    const isPublicRoute =
      segmentPath === "" ||
      segmentPath === "index" ||
      segmentPath === "Login/studentlogin" ||
      segmentPath === "Login/teacherlogin" ||
      segmentPath === "Login/StudentSignup" ||
      segmentPath === "Login/TeacherSignup" ||
      segmentPath === "Login/forgotPassword";

    if (isPublicRoute) {
      console.log("Public route, allowing access");
      return;
    }

    // Not logged in
    if (!user) {
      console.log("No user, redirecting to login");
      router.replace("/Login/studentlogin");
      return;
    }

    // Student protection
    const isTeacherRoute =
      currentSegments.includes("Teacherdashboard") ||
      currentSegments.includes("HODdashboard");

    if (user.role === "student" && isTeacherRoute) {
      router.replace("/Tabs/Studentdashboard/studentdashboard");
      return;
    }

    // Teacher protection
    const isStudentRoute =
      currentSegments.includes("Studentdashboard");

    if (
      (user.role === "teacher" || user.role === "hod") &&
      isStudentRoute
    ) {
      router.replace("/Tabs/Teacherdashboard/Teacherdashboard");
      return;
    }

    console.log("Route allowed for:", user.role);
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator
          size="large"
          color="#4A90D9"
        />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: true,
              gestureDirection: "horizontal",
              animation: Platform.select({
                ios: "slide_from_right",
                android: "slide_from_right",
                default: "slide_from_right",
              }),
              presentation: "card",
            }}
          >
            {/* Landing Screen */}
            <Stack.Screen name="index" />

            {/* Protected Area */}
            <Stack.Screen
              name="Tabs"
              options={{
                gestureEnabled: false,
              }}
            />
          </Stack>
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}