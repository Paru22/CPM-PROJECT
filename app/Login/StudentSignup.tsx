// app/Login/studentregister.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { db } from "../../config/firebaseConfig.native";
import { useTheme } from "../../context/ThemeContext";

export default function StudentRegister() {
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    parentPhone: "",
    address: "",
    department: "",
    semester: "",
    boardRollNo: "",
    rollNo: "",
    classRollNo: "",
    password: "",
    confirmPassword: "",
  });

  const departments = ["Computer Science", "Electrical Engineering", "Mechanical Engineering", "Civil Engineering", "Electronics"];
  const semesters = ["1", "2", "3", "4", "5", "6"];

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.department || !formData.semester || !formData.boardRollNo || !formData.password) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Check if boardRollNo already exists
      const existingQuery = query(
        collection(db, "studentRequests"),
        where("boardRollNo", "==", formData.boardRollNo)
      );
      const existingSnap = await getDocs(existingQuery);

      if (!existingSnap.empty) {
        Alert.alert("Error", "A registration request with this Board Roll Number already exists");
        setLoading(false);
        return;
      }

      // Check if already approved
      const approvedQuery = query(
        collection(db, "students"),
        where("boardRollNo", "==", formData.boardRollNo)
      );
      const approvedSnap = await getDocs(approvedQuery);

      if (!approvedSnap.empty) {
        Alert.alert("Error", "Student with this Board Roll Number already exists");
        setLoading(false);
        return;
      }

      // Create registration request
      await addDoc(collection(db, "studentRequests"), {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        parentPhone: formData.parentPhone,
        address: formData.address,
        department: formData.department,
        semester: formData.semester,
        boardRollNo: formData.boardRollNo,
        rollNo: formData.rollNo,
        classRollNo: formData.classRollNo,
        password: formData.password,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      Alert.alert(
        "Registration Submitted",
        "Your registration request has been submitted. Please wait for approval from your class teacher.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Failed to submit registration: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student Registration</Text>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Personal Information</Text>

        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Full Name *" placeholderTextColor={colors.textLight} value={formData.name} onChangeText={(v) => updateField("name", v)} />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Email *" placeholderTextColor={colors.textLight} value={formData.email} onChangeText={(v) => updateField("email", v)} keyboardType="email-address" />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Phone Number *" placeholderTextColor={colors.textLight} value={formData.phone} onChangeText={(v) => updateField("phone", v)} keyboardType="phone-pad" />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Parent Phone" placeholderTextColor={colors.textLight} value={formData.parentPhone} onChangeText={(v) => updateField("parentPhone", v)} keyboardType="phone-pad" />
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Address" placeholderTextColor={colors.textLight} value={formData.address} onChangeText={(v) => updateField("address", v)} multiline numberOfLines={3} />

        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Academic Information</Text>

        <Text style={[styles.label, { color: colors.textLight }]}>Department *</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker selectedValue={formData.department} onValueChange={(v) => updateField("department", v)} dropdownIconColor={colors.textDark}>
            <Picker.Item label="Select Department" value="" />
            {departments.map((d) => <Picker.Item key={d} label={d} value={d} />)}
          </Picker>
        </View>

        <Text style={[styles.label, { color: colors.textLight }]}>Semester *</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Picker selectedValue={formData.semester} onValueChange={(v) => updateField("semester", v)} dropdownIconColor={colors.textDark}>
            <Picker.Item label="Select Semester" value="" />
            {semesters.map((s) => <Picker.Item key={s} label={`Semester ${s}`} value={s} />)}
          </Picker>
        </View>

        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Board Roll Number *" placeholderTextColor={colors.textLight} value={formData.boardRollNo} onChangeText={(v) => updateField("boardRollNo", v)} />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="University Roll Number" placeholderTextColor={colors.textLight} value={formData.rollNo} onChangeText={(v) => updateField("rollNo", v)} />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Class Roll Number" placeholderTextColor={colors.textLight} value={formData.classRollNo} onChangeText={(v) => updateField("classRollNo", v)} />

        <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Account Security</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Password *" placeholderTextColor={colors.textLight} value={formData.password} onChangeText={(v) => updateField("password", v)} secureTextEntry />
        <TextInput style={[styles.input, { backgroundColor: colors.card, color: colors.textDark, borderColor: colors.border }]} placeholder="Confirm Password *" placeholderTextColor={colors.textLight} value={formData.confirmPassword} onChangeText={(v) => updateField("confirmPassword", v)} secureTextEntry />

        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
          <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.submitGradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Registration</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.textLight }]}>Note: Your registration requires approval from your class teacher before you can log in.</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  formContainer: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 20, marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  pickerContainer: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  submitBtn: { marginTop: 25, borderRadius: 15, overflow: "hidden" },
  submitGradient: { padding: 16, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  note: { fontSize: 12, textAlign: "center", marginTop: 15, fontStyle: "italic" },
});
