import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        headerShown: false,
      }}
    >
      {/* ✅ Teacher Dashboard - FIRST TAB */}
      <Tabs.Screen
        name="Teacherdashboard/Teacherdashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* ✅ HOD Dashboard */}
      <Tabs.Screen
        name="Teacherdashboard/HODdashboard"
        options={{
          title: "HOD",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* ✅ Class Teacher Dashboard */}
      <Tabs.Screen
        name="Teacherdashboard/ClassTeacherDashboard"
        options={{
          title: "Class",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* ✅ Manage Teachers */}
      <Tabs.Screen
        name="Teacherdashboard/ManageTeachers"
        options={{
          title: "Teachers",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* ✅ Students */}
      <Tabs.Screen
        name="Teacherdashboard/Students"
        options={{
          title: "Students",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* ✅ Profile Settings */}
      <Tabs.Screen
        name="ProfileSettings"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}