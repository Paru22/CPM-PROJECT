import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Linking,
  Alert,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../../config/firebaseConfig.native";
import { useTheme } from "../../../../context/ThemeContext";
import { useAuth } from "../../../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

interface FacultyItem {
  id: string;
  name: string;
  role: string;
  contact: string;
  email?: string;
  department?: string;
  qualification?: string;
}

export default function HelpSupportPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [facultyData, setFacultyData] = useState<FacultyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const fetchFacultyData = async () => {
    try {
      const studentDepartment = user?.department;
      
      if (!studentDepartment) {
        const teachersQuery = query(
          collection(db, "teachers"),
          where("requestStatus", "==", "approved")
        );
        const snapshot = await getDocs(teachersQuery);
        processTeacherData(snapshot.docs);
      } else {
        const teachersQuery = query(
          collection(db, "teachers"),
          where("department", "==", studentDepartment),
          where("requestStatus", "==", "approved")
        );
        const snapshot = await getDocs(teachersQuery);
        processTeacherData(snapshot.docs);
      }
    } catch  {
      console.error("Error fetching faculty:");
      setFacultyData([]);
    } finally {
      setLoading(false);
    }
  };

  const processTeacherData = (docs: any[]) => {
    const teachers: FacultyItem[] = docs
      .filter((doc: any) => {
        const data = doc.data();
        return data.phoneNo || data.phone;
      })
      .map((doc: any) => {
        const data = doc.data();
        
        let roleDisplay = "Teacher";
        if (data.role === "hod" || (Array.isArray(data.role) && data.role.includes("hod"))) {
          roleDisplay = "HOD";
        } else if (data.classTeacherFor) {
          roleDisplay = `Class Teacher (Sem ${data.classTeacherFor})`;
        } else if (Array.isArray(data.role)) {
          roleDisplay = data.role.map((r: string) => 
            r.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
          ).join(", ");
        }
        
        return {
          id: doc.id,
          name: data.name || "Unknown",
          role: roleDisplay,
          contact: data.phoneNo || data.phone || "",
          email: data.gmail || data.email || "",
          department: data.department || "",
          qualification: data.qualification || "",
        };
      })
      .sort((a, b) => {
        if (a.role.includes("HOD")) return -1;
        if (b.role.includes("HOD")) return 1;
        if (a.role.includes("Class Teacher")) return -1;
        if (b.role.includes("Class Teacher")) return 1;
        return a.name.localeCompare(b.name);
      });
    
    setFacultyData(teachers);
  };

  useEffect(() => {
    fetchFacultyData();
    
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const makeCall = async (number: string) => {
    const cleanNumber = (number || "").replace(/\s/g, "").replace("-", "");
    const url = `tel:${cleanNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "Calling not supported on this device");
      }
    } catch  {
      Alert.alert("Error", "Could not make call");
    }
  };

  const openWhatsApp = async (number: string) => {
    const cleanNumber = (number || "").replace(/\s/g, "").replace("-", "").replace("+", "");
    const url = `https://wa.me/${cleanNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "WhatsApp not installed");
      }
    } catch {
      Alert.alert("Error", "Could not open WhatsApp");
    }
  };

  const sendEmail = async (email: string) => {
    const url = `mailto:${email}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "Email not supported on this device");
      }
    } catch  {
      Alert.alert("Error", "Could not open email");
    }
  };

  const renderItem = ({ item }: { item: FacultyItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="person" size={24} color={colors.primary} />
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={[styles.name, { color: colors.textDark }]}>{item.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons 
              name={item.role.includes("HOD") ? "shield-checkmark" : "school"} 
              size={12} 
              color={colors.primary} 
            />
            <Text style={[styles.role, { color: colors.primary }]}>{item.role}</Text>
          </View>
        </View>
      </View>
      
      {item.qualification && (
        <Text style={[styles.qualification, { color: colors.textLight }]}>
          {item.qualification}
        </Text>
      )}
      
      <Text style={[styles.contact, { color: colors.textDark }]}>
        📞 {item.contact}
      </Text>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: "#4CAF50" }]} 
          onPress={() => makeCall(item.contact)}
        >
          <Ionicons name="call-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: "#25D366" }]} 
          onPress={() => openWhatsApp(item.contact)}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={styles.btnText}>WhatsApp</Text>
        </TouchableOpacity>
        
        {item.email && (
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: "#2196F3" }]} 
            onPress={() => sendEmail(item.email || "")}
          >
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Email</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textDark }]}>
            Loading faculty contacts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textDark }]}>Help & Support</Text>
        </View>
        
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          {facultyData.length > 0 
            ? `${facultyData.length} faculty member${facultyData.length > 1 ? 's' : ''} available` 
            : "No faculty contacts available"}
        </Text>

        {facultyData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              No faculty contacts available for your department
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              Please contact administration for assistance
            </Text>
          </View>
        ) : (
          <FlatList
            data={facultyData}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}

        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.secondary }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { flexDirection: "row", alignItems: "center", marginVertical: 15, gap: 10 },
  backIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 13, marginBottom: 15, textAlign: "center" },
  card: {
    padding: 16,
    borderRadius: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 45, height: 45, borderRadius: 23, justifyContent: "center", alignItems: "center", marginRight: 12 },
  cardHeaderText: { flex: 1 },
  name: { fontSize: 17, fontWeight: "bold" },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, gap: 4, marginTop: 3, alignSelf: "flex-start" },
  role: { fontSize: 11, fontWeight: "600" },
  qualification: { fontSize: 12, marginBottom: 6 },
  contact: { fontSize: 15, marginBottom: 10 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 16, marginTop: 12, textAlign: "center" },
  emptySubtext: { fontSize: 13, marginTop: 6, textAlign: "center" },
  backBtn: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    elevation: 5,
  },
  backText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});