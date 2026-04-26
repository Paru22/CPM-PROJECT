import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

export default function StudentLoginScreen() {
  const [boardRollNo, setBoardRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dbInfo, setDbInfo] = useState("");

  const router = useRouter();
  const { colors } = useTheme();

  const checkDatabase = async () => {
    setLoading(true);
    let info = "=== FULL DATABASE DUMP ===\n\n";
    
    try {
      const studentsSnap: any = await getDocs(collection(db, "students"));
      info = info + "students collection: " + studentsSnap.size + " documents\n\n";
      
      studentsSnap.forEach((doc: any) => {
        const data: any = doc.data();
        info = info + "--- Document ---\n";
        info = info + "Document ID: " + doc.id + "\n";
        info = info + "ALL FIELDS:\n";
        
        Object.keys(data).forEach((key: string) => {
          info = info + "  " + key + ": " + JSON.stringify(data[key]) + "\n";
        });
        info = info + "\n";
      });
      
      const requestsSnap: any = await getDocs(collection(db, "studentRequests"));
      info = info + "\nstudentRequests collection: " + requestsSnap.size + " documents\n\n";
      
      requestsSnap.forEach((doc: any) => {
        const data: any = doc.data();
        info = info + "--- Request Document ---\n";
        info = info + "Document ID: " + doc.id + "\n";
        Object.keys(data).forEach((key: string) => {
          info = info + "  " + key + ": " + JSON.stringify(data[key]) + "\n";
        });
        info = info + "\n";
      });
      
    } catch (err: any) {
      info = "ERROR: " + err.message + "\n";
    }
    
    setDbInfo(info);
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!boardRollNo.trim() || !password.trim()) {
      Alert.alert("Error", "Enter both fields");
      return;
    }

    setLoading(true);
    const input: string = boardRollNo.trim();
    const pass: string = password.trim();

    try {
      // METHOD 1: Get ALL students and manually search
      const allSnap: any = await getDocs(collection(db, "students"));
      
      let matchedStudent: any = null;
      let matchedDocId: string | null = null;
      
      allSnap.forEach((doc: any) => {
        const data: any = doc.data();
        
        // Check ALL possible fields
        if (data.boardRollNo && String(data.boardRollNo) === input) {
          matchedStudent = data;
          matchedDocId = doc.id;
        }
        if (data.rollNo && String(data.rollNo) === input) {
          matchedStudent = data;
          matchedDocId = doc.id;
        }
        if (data.email && String(data.email).toLowerCase() === input.toLowerCase()) {
          matchedStudent = data;
          matchedDocId = doc.id;
        }
        if (data.Name && String(data.Name).toLowerCase() === input.toLowerCase()) {
          matchedStudent = data;
          matchedDocId = doc.id;
        }
        if (data.name && String(data.name).toLowerCase() === input.toLowerCase()) {
          matchedStudent = data;
          matchedDocId = doc.id;
        }
      });
      
      if (matchedStudent) {
        if (matchedStudent.password === pass) {
          const name = matchedStudent.Name || matchedStudent.name || "Student";
          Alert.alert(
            "SUCCESS",
            "Welcome " + name + "!",
            [
              {
                text: "OK",
                onPress: () => {
                  const path = "/Tabs/Studentdashboard/studentdashboard?boardRollNo=" + input;
                  router.push(path as any);
                }
              }
            ]
          );
          setLoading(false);
          return;
        } else {
          Alert.alert(
            "Wrong Password",
            "Stored password: " + matchedStudent.password + "\nEntered: " + pass
          );
          setLoading(false);
          return;
        }
      }

      // METHOD 2: Check studentRequests
      const allReqSnap: any = await getDocs(collection(db, "studentRequests"));
      let matchedReq: any = null;
      
      allReqSnap.forEach((doc: any) => {
        const data: any = doc.data();
        
        if (data.boardRollNo && String(data.boardRollNo) === input) {
          matchedReq = data;
        }
        if (!matchedReq && data.rollNo && String(data.rollNo) === input) {
          matchedReq = data;
        }
      });
      
      if (matchedReq) {
        if (matchedReq.password === pass) {
          Alert.alert(
            "Registration Status",
            "Your registration is " + (matchedReq.status || "pending")
          );
          setLoading(false);
          return;
        }
      }

      // NOTHING FOUND - Show database dump
      await checkDatabase();
      
      Alert.alert(
        "NO STUDENT FOUND",
        "Searched for: " + input + "\n\n" +
        "Check the database dump below to see what data exists."
      );
      
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
    
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Student Login</Text>
          <Text style={styles.headerSubtitle}>Diagnostic Version</Text>
        </LinearGradient>

        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.dbCheckBtn} onPress={checkDatabase} disabled={loading}>
            <Ionicons name="search" size={16} color="#2196F3" />
            <Text style={styles.dbCheckText}>1. Check Database First</Text>
          </TouchableOpacity>

          {dbInfo ? (
            <View style={styles.dbInfoBox}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                <Text style={styles.dbInfoText} selectable>{dbInfo}</Text>
              </ScrollView>
              <Text style={styles.dbInfoHint}>
                Look at the EXACT field names and values above
              </Text>
            </View>
          ) : (
            <Text style={styles.hint}>
              STEP 1: Click Check Database to see what data exists
            </Text>
          )}

          <Text style={[styles.label, { color: colors.textDark }]}>
            Enter Board Roll Number / Roll No / Name / Email
          </Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="id-card-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              placeholder="Try any identifier from database"
              placeholderTextColor={colors.textLight}
              value={boardRollNo}
              onChangeText={setBoardRollNo}
              autoCapitalize="none"
              style={[styles.input, { color: colors.textDark }]}
            />
          </View>

          <Text style={[styles.label, { color: colors.textDark }]}>Password</Text>
          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, { color: colors.textDark }]}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleLogin} disabled={loading}>
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>LOGIN</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.registerBtn, { borderColor: colors.primary }]}
          >
            <Text style={[styles.registerBtnText, { color: colors.primary }]}>
              Register New Account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: {
    padding: 40,
    paddingTop: 60,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#fff", marginTop: 5, opacity: 0.9 },
  formCard: {
    margin: 20,
    marginTop: -20,
    padding: 25,
    borderRadius: 20,
    elevation: 5,
  },
  dbCheckBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    marginBottom: 15,
    gap: 5,
    borderWidth: 1,
    borderColor: "#2196F3",
  },
  dbCheckText: { color: "#2196F3", fontSize: 16, fontWeight: "bold" },
  dbInfoBox: {
    padding: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 15,
    maxHeight: 300,
  },
  dbInfoText: {
    fontSize: 11,
    fontFamily: "monospace",
    lineHeight: 16,
    color: "#333",
  },
  dbInfoHint: {
    fontSize: 12,
    color: "#FF6F00",
    marginTop: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  hint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    backgroundColor: "#FFF9C4",
    padding: 10,
    borderRadius: 8,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 5 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16 },
  loginBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  registerBtn: {
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
  },
  registerBtnText: { fontSize: 16, fontWeight: "600" },
});