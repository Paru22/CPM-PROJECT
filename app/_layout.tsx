import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import {
  Platform,
  ActivityIndicator,
  View,
} from "react-native";

import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

// ==================== AUTH GUARD ====================

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const currentSegments = segments.map(String);
    const segmentPath = currentSegments.join("/");
    const currentRoute = segments[0] || "";

    console.log("AuthGuard - Path:", segmentPath);
    console.log("AuthGuard - User:", user?.role || "No user");
    console.log("AuthGuard - Loading:", loading);

    // ==================== PUBLIC ROUTES ====================
    const isPublicRoute =
      segmentPath === "" ||
      segmentPath === "index" ||
      currentRoute === "Login" ||
      segmentPath === "Login/teacherlogin" ||
      segmentPath === "Login/studentlogin" ||
      segmentPath === "Login/TeacherSignup";

    if (isPublicRoute) {
      console.log("Public route, allowing access");
      return;
    }

    // ==================== NOT LOGGED IN ====================
    if (!user) {
      console.log("No user, redirecting to login");
      // Redirect to student login by default
      router.replace("/Login/studentlogin");
      return;
    }

    // ==================== STUDENT ROUTE PROTECTION ====================
    const isTeacherRoute =
      currentSegments.includes("Teacherdashboard") ||
      currentSegments.includes("HODdashboard");

    if (user.role === "student" && isTeacherRoute) {
      console.log("Student trying to access teacher route, redirecting");
      router.replace("/Tabs/Studentdashboard/studentdashboard");
      return;
    }

    // ==================== TEACHER ROUTE PROTECTION ====================
    const isStudentRoute = currentSegments.includes("Studentdashboard");

    if ((user.role === "teacher" || user.role === "hod") && isStudentRoute) {
      console.log("Teacher trying to access student route, redirecting");
      // Redirect to teacher dashboard
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
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return <>{children}</>;
}

// ==================== ROOT LAYOUT ====================

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
            {/* Home / Landing Screen */}
            <Stack.Screen name="index" />

            {/* Login Screens */}
            <Stack.Screen name="Login" />

            {/* Protected Tabs */}
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