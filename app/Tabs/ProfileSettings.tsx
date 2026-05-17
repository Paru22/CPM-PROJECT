import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import { useAuth } from "../../context/AuthContext";
import { Picker } from "@react-native-picker/picker";

const DEPARTMENTS = [
  "Civil Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Computer Engineering",
  "Automobile Engineering",
  "Architecture Assistantship",
  "Electronics & Communication Engineering",
];

const SEMESTERS = ["1", "2", "3", "4", "5", "6"];

interface ProfileData {
  name: string;
  gmail: string;
  phoneNo: string;
  address: string;
  department: string;
  semester?: string;
  boardRollNo?: string;
  classRollNo?: string;
  parentPhoneNo?: string;
  qualification?: string;
  profileImage?: string;
}

export default function ProfileSettings() {
  const router = useRouter();
  const { colors, theme, toggleTheme } = useTheme();
  const { user, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    gmail: "",
    phoneNo: "",
    address: "",
    department: "",
  });

  const isTeacher = user?.role === "teacher" || user?.role === "hod";
  const isStudent = user?.role === "student";
  const storage = getStorage();

  const fetchProfile = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const collectionName = isStudent ? "students" : "teachers";
      const userRef = doc(db, collectionName, user.uid);
      const userSnap = await (await import("firebase/firestore")).getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        setProfile({
          name: data.name || user.name || "",
          gmail: data.gmail || user.email || "",
          phoneNo: data.phoneNo || data.phone || "",
          address: data.address || "",
          department: data.department || user.department || "",
          semester: data.semester || user.semester || "",
          boardRollNo: data.boardRollNo || user.boardRollNo || "",
          classRollNo: data.classRollNo || user.classRollNo || "",
          parentPhoneNo: data.parentPhoneNo || user.parentPhoneNo || "",
          qualification: data.qualification || user.qualification || "",
          profileImage: data.profileImage || user.photoURL || undefined,
        });
      } else {
        // Use data from AuthContext
        setProfile({
          name: user.name || "",
          gmail: user.email || "",
          phoneNo: user.phone || "",
          address: user.address || "",
          department: user.department || "",
          semester: user.semester || "",
          boardRollNo: user.boardRollNo || "",
          classRollNo: user.classRollNo || "",
          parentPhoneNo: user.parentPhoneNo || "",
          qualification: user.qualification || "",
          profileImage: user.photoURL || undefined,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Fallback to AuthContext data
      setProfile({
        name: user.name || "",
        gmail: user.email || "",
        phoneNo: user.phone || "",
        address: user.address || "",
        department: user.department || "",
        semester: user.semester || "",
        boardRollNo: user.boardRollNo || "",
        qualification: user.qualification || "",
        profileImage: user.photoURL || undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [user, isStudent]);
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setUploadingPhoto(true);
    
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const fileName = `profile_${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `profileImages/${fileName}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      const collectionName = isStudent ? "students" : "teachers";
      const userRef = doc(db, collectionName, user.uid);
      await updateDoc(userRef, {
        profileImage: downloadURL,
        updatedAt: new Date().toISOString()
      });
      
      setProfile(prev => ({ ...prev, profileImage: downloadURL }));
      Alert.alert("Success", "Profile photo updated!");
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", error.message || "Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setSaving(true);
    try {
      const collectionName = isStudent ? "students" : "teachers";
      const userRef = doc(db, collectionName, user.uid);
      
      const updateData: any = {
        name: profile.name.trim(),
        phoneNo: profile.phoneNo.trim(),
        address: profile.address.trim(),
        department: profile.department,
        updatedAt: new Date().toISOString(),
      };
      
      if (isStudent) {
        updateData.semester = profile.semester || "";
        updateData.boardRollNo = profile.boardRollNo || "";
        updateData.classRollNo = profile.classRollNo || "";
        updateData.parentPhoneNo = profile.parentPhoneNo || "";
      } else {
        updateData.qualification = profile.qualification || "";
      }
      
      await updateDoc(userRef, updateData);
      await refreshUser(); // Refresh AuthContext data
      
      Alert.alert("Success", "Profile updated successfully");
      setEditMode(false);
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to update profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const getRoleDisplayName = (): string => {
    if (user?.role === "hod") return "Head of Department";
    if (user?.role === "teacher") return "Teacher";
    if (user?.role === "student") return "Student";
    return "User";
  };

  const getRoleIcon = (): any => {
    if (user?.role === "hod") return "shield-checkmark-outline";
    if (user?.role === "teacher") return "school-outline";
    if (user?.role === "student") return "school-outline";
    return "person-outline";
  };

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
        {/* Profile Photo Section */}
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
            {profile.name || user?.name || "User"}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textLight }]}>
            {profile.gmail || user?.email || ""}
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

        {/* Form Card */}
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          {editMode ? (
            <>
              {/* Personal Information */}
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Personal Information</Text>
              
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
                  value={profile.phoneNo}
                  onChangeText={(v) => updateField("phoneNo", v)}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                  maxLength={10}
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
                <Text style={[styles.label, { color: colors.textDark }]}>Department</Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Picker
                    selectedValue={profile.department}
                    onValueChange={(value: string) => updateField("department", value)}
                    dropdownIconColor={colors.textDark}
                  >
                    <Picker.Item label="Select Department" value="" color={colors.textLight} />
                    {DEPARTMENTS.map((dept) => (
                      <Picker.Item key={dept} label={dept} value={dept} color={colors.textDark} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Student Fields */}
              {isStudent && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Academic Information</Text>
                  
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Board Roll No</Text>
                      <TextInput
  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textLight }]}
  value={profile.boardRollNo || ""}
  editable={false}
/>
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Class Roll No</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={profile.classRollNo || ""}
                        onChangeText={(v) => updateField("classRollNo", v)}
                        placeholder="Class roll"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Semester</Text>
                    <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Picker
                        selectedValue={profile.semester}
                        onValueChange={(value: string) => updateField("semester", value)}
                        dropdownIconColor={colors.textDark}
                      >
                        <Picker.Item label="Select Semester" value="" color={colors.textLight} />
                        {SEMESTERS.map((sem) => (
                          <Picker.Item key={sem} label={`Semester ${sem}`} value={sem} color={colors.textDark} />
                        ))}
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Parent Phone</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      value={profile.parentPhoneNo || ""}
                      onChangeText={(v) => updateField("parentPhoneNo", v)}
                      placeholder="Parent's phone number"
                      placeholderTextColor={colors.textLight}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </>
              )}

              {/* Teacher Fields */}
              {isTeacher && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Professional Information</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Qualification</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      value={profile.qualification || ""}
                      onChangeText={(v) => updateField("qualification", v)}
                      placeholder="e.g., M.Tech, Ph.D."
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </>
              )}

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setEditMode(false);
                    fetchProfile();
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
              
              <InfoRow icon="mail-outline" label="Email" value={profile.gmail || user?.email} colors={colors} />
              <InfoRow icon="call-outline" label="Phone" value={profile.phoneNo || user?.phone} colors={colors} />
              <InfoRow icon="home-outline" label="Address" value={profile.address || user?.address} colors={colors} />
              <InfoRow icon="business-outline" label="Department" value={profile.department || user?.department} colors={colors} />

              {isStudent && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Academic Details</Text>
                  <InfoRow icon="barcode-outline" label="Board Roll No" value={profile.boardRollNo || user?.boardRollNo} colors={colors} />
                  <InfoRow icon="grid-outline" label="Class Roll No" value={profile.classRollNo || user?.classRollNo} colors={colors} />
                  <InfoRow icon="book-outline" label="Semester" value={profile.semester || user?.semester} colors={colors} />
                  <InfoRow icon="people-outline" label="Parent Phone" value={profile.parentPhoneNo || user?.parentPhoneNo} colors={colors} />
                </>
              )}

              {isTeacher && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Professional Details</Text>
                  <InfoRow icon="school-outline" label="Qualification" value={profile.qualification || user?.qualification} colors={colors} />
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
  header: { padding: 20, paddingTop: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
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
  profileEmail: { fontSize: 14, marginTop: 2, marginBottom: 4 },
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
  pickerContainer: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 5 },
  row: { flexDirection: "row", gap: 10 },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});