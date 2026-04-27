import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
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

const { width } = Dimensions.get("window");

type UserRole = "student" | "teacher" | "class_teacher" | "hod";

interface UserProfile {
  docId: string;
  collectionName: string;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  address: string;
  profileImage: string | null;
  dateOfBirth: string;
  rollNo?: string;
  semester?: string;
  department?: string;
  parentPhone?: string;
  boardRollNo?: string;
  qualification?: string;
  experience?: string;
  specialization?: string;
  designation?: string;
}

export default function ProfileSettings() {
  const router = useRouter();
  const params = useLocalSearchParams<any>();
  const { colors, theme, toggleTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    docId: "",
    collectionName: "",
    role: "student",
    name: "",
    email: "",
    phone: "",
    address: "",
    profileImage: null,
    dateOfBirth: "",
  });

  const storage = getStorage();

  const fetchUserProfile = useCallback(async () => {
    try {
      const identifier = params.boardRollNo || params.teacherId || params.userId;
      
      if (!identifier) {
        Alert.alert("Error", "No user identifier found");
        setLoading(false);
        return;
      }

      console.log("Fetching profile for:", identifier);

      // TRY 1: Search in students collection by boardRollNo
      const studentQuery = query(
        collection(db, "students"),
        where("boardRollNo", "==", identifier)
      );
      const studentSnap = await getDocs(studentQuery);
      
      if (!studentSnap.empty) {
        const docSnap = studentSnap.docs[0];
        const data = docSnap.data();
        
        setProfile({
          docId: docSnap.id,
          collectionName: "students",
          role: "student",
          name: data.name || data.Name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          profileImage: data.profileImage || null,
          dateOfBirth: data.dateOfBirth || "",
          rollNo: data.rollNo || "",
          semester: data.semester || "",
          department: data.department || "",
          parentPhone: data.parentPhone || "",
          boardRollNo: data.boardRollNo || identifier,
        });
        
        console.log("Found STUDENT profile, docId:", docSnap.id);
        setLoading(false);
        return;
      }

      // TRY 2: Search in teachers collection
      const teacherQuery = query(
        collection(db, "teachers"),
        where("boardRollNo", "==", identifier)
      );
      const teacherSnap = await getDocs(teacherQuery);
      
      if (!teacherSnap.empty) {
        const docSnap = teacherSnap.docs[0];
        const data = docSnap.data();
        
        setProfile({
          docId: docSnap.id,
          collectionName: "teachers",
          role: data.role || "teacher",
          name: data.name || data.Name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          profileImage: data.profileImage || null,
          dateOfBirth: data.dateOfBirth || "",
          department: data.department || "",
          qualification: data.qualification || "",
          experience: data.experience || "",
          specialization: data.specialization || "",
          designation: data.designation || "",
        });
        
        console.log("Found TEACHER profile, docId:", docSnap.id);
        setLoading(false);
        return;
      }

      // TRY 3: Direct document lookup in students by ID
      const studentDocRef = doc(db, "students", identifier);
      const studentDocSnap = await getDoc(studentDocRef);
      
      if (studentDocSnap.exists()) {
        const data = studentDocSnap.data();
        
        setProfile({
          docId: studentDocSnap.id,
          collectionName: "students",
          role: "student",
          name: data.name || data.Name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          profileImage: data.profileImage || null,
          dateOfBirth: data.dateOfBirth || "",
          rollNo: data.rollNo || "",
          semester: data.semester || "",
          department: data.department || "",
          parentPhone: data.parentPhone || "",
          boardRollNo: data.boardRollNo || identifier,
        });
        
        console.log("Found STUDENT profile by doc ID:", studentDocSnap.id);
        setLoading(false);
        return;
      }

      // TRY 4: Direct document lookup in teachers by ID
      const teacherDocRef = doc(db, "teachers", identifier);
      const teacherDocSnap = await getDoc(teacherDocRef);
      
      if (teacherDocSnap.exists()) {
        const data = teacherDocSnap.data();
        
        setProfile({
          docId: teacherDocSnap.id,
          collectionName: "teachers",
          role: data.role || "teacher",
          name: data.name || data.Name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          profileImage: data.profileImage || null,
          dateOfBirth: data.dateOfBirth || "",
          department: data.department || "",
          qualification: data.qualification || "",
          experience: data.experience || "",
          specialization: data.specialization || "",
          designation: data.designation || "",
        });
        
        console.log("Found TEACHER profile by doc ID:", teacherDocSnap.id);
        setLoading(false);
        return;
      }

      Alert.alert("Error", "User profile not found");
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [params.boardRollNo, params.teacherId, params.userId]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      uploadProfileImage(result.assets[0].uri);
    }
  };

 const uploadProfileImage = async (uri: string) => {
  if (!profile.docId || !profile.collectionName) {
    Alert.alert("Error", "User profile not loaded");
    return;
  }

  setUploadingPhoto(true);
  
  try {
    console.log("Starting upload...");
    console.log("URI:", uri);
    
    // Convert image to blob
    const response = await fetch(uri);
    const blob = await response.blob();
    console.log("Blob size:", blob.size);
    
    // Create file path
    const fileName = "profile_" + Date.now() + ".jpg";
    const storageRef = ref(storage, "profileImages/" + fileName);
    console.log("Storage path:", "profileImages/" + fileName);
    
    // Upload blob
    const uploadResult = await uploadBytes(storageRef, blob);
    console.log("Upload successful:", uploadResult);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log("Download URL:", downloadURL);
    
    // Update Firestore
    const userRef = doc(db, profile.collectionName, profile.docId);
    await updateDoc(userRef, {
      profileImage: downloadURL,
      updatedAt: new Date().toISOString()
    });
    
    // Update local state
    setProfile(prev => ({ ...prev, profileImage: downloadURL }));
    Alert.alert("Success", "Profile photo updated!");
    
  } catch (error: any) {
    console.error("Upload error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    if (error.code === "storage/unknown") {
      Alert.alert(
        "Storage Error",
        "Please check:\n" +
        "1. Firebase Storage is enabled\n" +
        "2. Storage rules allow uploads\n" +
        "3. Internet connection is stable"
      );
    } else {
      Alert.alert("Upload Failed", error.message || "Unknown error");
    }
  } finally {
    setUploadingPhoto(false);
  }
};

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    // ✅ Check if docId and collectionName exist
    if (!profile.docId) {
      Alert.alert("Error", "Cannot save: Document ID is missing. Please reload the page.");
      return;
    }

    if (!profile.collectionName) {
      Alert.alert("Error", "Cannot save: Collection name is missing. Please reload the page.");
      return;
    }

    console.log("Saving to:", profile.collectionName, "docId:", profile.docId);

    setSaving(true);
    try {
      // ✅ CORRECT: 2 segments - collection name + document ID
      const userRef = doc(db, profile.collectionName, profile.docId);
      
      const updateData: any = {
        name: profile.name.trim(),
        Name: profile.name.trim(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
        dateOfBirth: profile.dateOfBirth.trim(),
        updatedAt: new Date().toISOString(),
      };
      
      if (profile.role === "student") {
        updateData.rollNo = profile.rollNo?.trim() || "";
        updateData.semester = profile.semester?.trim() || "";
        updateData.department = profile.department?.trim() || "";
        updateData.parentPhone = profile.parentPhone?.trim() || "";
      } else {
        updateData.department = profile.department?.trim() || "";
        updateData.qualification = profile.qualification?.trim() || "";
        updateData.experience = profile.experience?.trim() || "";
        updateData.specialization = profile.specialization?.trim() || "";
        updateData.designation = profile.designation?.trim() || "";
      }
      
      await updateDoc(userRef, updateData);
      Alert.alert("Success", "Profile updated successfully");
      setEditMode(false);
      fetchUserProfile();
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const getRoleDisplayName = (): string => {
    switch (profile.role) {
      case "hod": return "Head of Department";
      case "class_teacher": return "Class Teacher";
      case "teacher": return "Teacher";
      case "student": return "Student";
      default: return "User";
    }
  };

  const getRoleIcon = (): any => {
    switch (profile.role) {
      case "hod": return "shield-checkmark-outline";
      case "class_teacher": return "briefcase-outline";
      case "teacher": return "school-outline";
      case "student": return "school-outline";
      default: return "person-outline";
    }
  };

  const isTeacher = profile.role !== "student";

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textDark }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <TouchableOpacity onPress={toggleTheme} style={styles.headerButton}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Photo */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            onPress={editMode ? pickImage : undefined} 
            disabled={!editMode}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
              {profile.profileImage ? (
                <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={50} color="#fff" />
              )}
              {editMode && (
                <View style={styles.cameraIconContainer}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          
          {uploadingPhoto && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.uploadingText, { color: colors.textLight }]}>Uploading...</Text>
            </View>
          )}
          
          {editMode && !uploadingPhoto && (
            <TouchableOpacity onPress={pickImage} style={styles.changePhotoBtn}>
              <Ionicons name="camera-outline" size={16} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
            </TouchableOpacity>
          )}
          
          <Text style={[styles.profileName, { color: colors.textDark }]}>
            {profile.name || "User"}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name={getRoleIcon()} size={14} color={colors.primary} />
            <Text style={[styles.roleText, { color: colors.primary }]}>{getRoleDisplayName()}</Text>
          </View>
          
          {!editMode && (
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => setEditMode(true)}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form */}
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          {editMode ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Full Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                  value={profile.name}
                  onChangeText={(v) => updateField("name", v)}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                  value={profile.phone}
                  onChangeText={(v) => updateField("phone", v)}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                  value={profile.address}
                  onChangeText={(v) => updateField("address", v)}
                  placeholder="Enter your address"
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Date of Birth</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                  value={profile.dateOfBirth}
                  onChangeText={(v) => updateField("dateOfBirth", v)}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              {/* Student Fields */}
              {!isTeacher && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Academic Information</Text>
                  
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Roll No</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={profile.rollNo || ""}
                        onChangeText={(v) => updateField("rollNo", v)}
                        placeholder="Roll number"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Semester</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={profile.semester || ""}
                        onChangeText={(v) => updateField("semester", v)}
                        placeholder="Semester"
                        placeholderTextColor={colors.textLight}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Department</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      value={profile.department || ""}
                      onChangeText={(v) => updateField("department", v)}
                      placeholder="e.g., Computer Engineering"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </>
              )}

              {/* Teacher Fields */}
              {isTeacher && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Professional Information</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Department</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      value={profile.department || ""}
                      onChangeText={(v) => updateField("department", v)}
                      placeholder="e.g., Computer Science"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Designation</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      value={profile.designation || ""}
                      onChangeText={(v) => updateField("designation", v)}
                      placeholder="e.g., Professor"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Experience (Years)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={profile.experience || ""}
                        onChangeText={(v) => updateField("experience", v)}
                        placeholder="Years"
                        placeholderTextColor={colors.textLight}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Specialization</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={profile.specialization || ""}
                        onChangeText={(v) => updateField("specialization", v)}
                        placeholder="e.g., AI, ML"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setEditMode(false);
                    fetchUserProfile();
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: colors.textDark }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            /* View Mode */
            <>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Personal Information</Text>
              
              <InfoRow icon="call-outline" label="Phone" value={profile.phone} colors={colors} />
              <InfoRow icon="home-outline" label="Address" value={profile.address} colors={colors} />
              <InfoRow icon="calendar-outline" label="Date of Birth" value={profile.dateOfBirth} colors={colors} />

              {!isTeacher ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Academic Details</Text>
                  <InfoRow icon="id-card-outline" label="Roll Number" value={profile.rollNo} colors={colors} />
                  <InfoRow icon="book-outline" label="Semester" value={profile.semester} colors={colors} />
                  <InfoRow icon="business-outline" label="Department" value={profile.department} colors={colors} />
                  <InfoRow icon="barcode-outline" label="Board Roll No" value={profile.boardRollNo} colors={colors} />
                </>
              ) : (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Professional Details</Text>
                  <InfoRow icon="business-outline" label="Department" value={profile.department} colors={colors} />
                  <InfoRow icon="briefcase-outline" label="Designation" value={profile.designation} colors={colors} />
                  <InfoRow icon="time-outline" label="Experience" value={profile.experience ? profile.experience + " years" : undefined} colors={colors} />
                  <InfoRow icon="bulb-outline" label="Specialization" value={profile.specialization} colors={colors} />
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Info Row Component
const InfoRow = ({ icon, label, value, colors }: any) => {
  if (!value) return null;
  
  return (
    <View style={infoStyles.infoSection}>
      <View style={infoStyles.infoRow}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <View style={infoStyles.infoTextContainer}>
          <Text style={[infoStyles.infoLabel, { color: colors.textLight }]}>{label}</Text>
          <Text style={[infoStyles.infoValue, { color: colors.textDark }]}>{value}</Text>
        </View>
      </View>
    </View>
  );
};

const infoStyles = StyleSheet.create({
  infoSection: { marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "500" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10 },
  scrollContent: { paddingBottom: 40 },
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  profileHeader: { alignItems: "center", paddingVertical: 25 },
  avatarContainer: { width: 110, height: 110, borderRadius: 55, justifyContent: "center", alignItems: "center", position: "relative" },
  avatarImage: { width: 110, height: 110, borderRadius: 55 },
  cameraIconContainer: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: "#4CAF50", borderRadius: 15, width: 32, height: 32,
    justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#fff",
  },
  uploadingContainer: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  uploadingText: { fontSize: 12 },
  changePhotoBtn: {
    flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6,
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: "#ddd",
  },
  changePhotoText: { fontSize: 13, fontWeight: "600" },
  profileName: { fontSize: 22, fontWeight: "bold", marginTop: 12 },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, gap: 6, marginTop: 8 },
  roleText: { fontSize: 12, fontWeight: "600" },
  editButton: { flexDirection: "row", alignItems: "center", marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, gap: 8 },
  editButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  formCard: { margin: 15, padding: 20, borderRadius: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, marginTop: 5 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});