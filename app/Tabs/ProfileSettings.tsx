import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const { width } = Dimensions.get("window");

export default function ProfileSettings() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [, setUserData] = useState<any>(null); // Fixed: removed unused variable warning
  const [userRole, setUserRole] = useState<string>("");
  const [editMode, setEditMode] = useState(false);
  const [collectionName, setCollectionName] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  // Common fields for all users
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  
  // Teacher specific fields
  const [department, setDepartment] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [specialization, setSpecialization] = useState("");
  
  // Student specific fields
  const [rollNumber, setRollNumber] = useState("");
  const [semester, setSemester] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [admissionYear, setAdmissionYear] = useState("");

  const storage = getStorage();

  // Fetch user profile data
  const fetchUserProfile = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      console.log("Fetching profile for UID:", user.uid);
      
      // Check in teachers collection first
      let userDoc = await getDoc(doc(db, "teachers", user.uid));
      let role = "teacher";
      let collection = "teachers";
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        role = data.role || "teacher";
        collection = "teachers";
        setUserData(data);
        
        // Common fields
        setName(data.name || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setAddress(data.address || "");
        setBio(data.bio || "");
        setDateOfBirth(data.dateOfBirth || "");
        setEmergencyContact(data.emergencyContact || "");
        setProfileImage(data.profileImage || null);
        
        // Teacher specific fields
        setDepartment(data.department || "");
        setQualification(data.qualification || "");
        setExperience(data.experience || "");
        setSpecialization(data.specialization || "");
        
        // Reset student fields
        setRollNumber("");
        setSemester("");
        setParentPhone("");
        setAdmissionYear("");
        
      } else {
        // Check in students collection
        userDoc = await getDoc(doc(db, "students", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          role = "student";
          collection = "students";
          setUserData(data);
          
          // Common fields
          setName(data.name || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
          setBio(data.bio || "");
          setDateOfBirth(data.dateOfBirth || "");
          setEmergencyContact(data.emergencyContact || "");
          setProfileImage(data.profileImage || null);
          
          // Student specific fields
          setRollNumber(data.rollNumber || data.rollNo || "");
          setSemester(data.semester || "");
          setParentPhone(data.parentPhone || "");
          setAdmissionYear(data.admissionYear || "");
          
          // Reset teacher fields
          setDepartment("");
          setQualification("");
          setExperience("");
          setSpecialization("");
        } else {
          Alert.alert("Error", "User profile not found");
        }
      }
      
      setUserRole(role);
      setCollectionName(collection);
    } catch (error) {
      console.error("Error fetching profile:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Needed", "Please grant camera roll permissions to upload a photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      uploadProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `profileImages/${user?.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore with image URL
      const userRef = doc(db, collectionName, user!.uid);
      await updateDoc(userRef, { profileImage: downloadURL });
      setProfileImage(downloadURL);
      Alert.alert("Success", "Profile photo updated successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, collectionName, user!.uid);
      
      const updateData: any = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        bio: bio.trim(),
        dateOfBirth: dateOfBirth.trim(),
        emergencyContact: emergencyContact.trim(),
        updatedAt: new Date().toISOString(),
      };
      
      if (userRole === "student") {
        updateData.rollNumber = rollNumber.trim();
        updateData.semester = semester.trim();
        updateData.parentPhone = parentPhone.trim();
        updateData.admissionYear = admissionYear.trim();
        updateData.department = department.trim();
      } else {
        updateData.department = department.trim();
        updateData.qualification = qualification.trim();
        updateData.experience = experience.trim();
        updateData.specialization = specialization.trim();
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

  const getRoleDisplayName = () => {
    switch (userRole) {
      case "hod": return "Head of Department";
      case "class_teacher": return "Class Teacher";
      case "teacher": return "Teacher";
      case "student": return "Student";
      default: return "User";
    }
  };

  const getRoleIcon = () => {
    switch (userRole) {
      case "hod": return "shield-checkmark-outline";
      case "class_teacher": return "briefcase-outline";
      case "teacher": return "school-outline";
      case "student": return "person-outline";
      default: return "person-circle-outline";
    }
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile Settings</Text>
          <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header with Photo Upload */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={editMode ? pickImage : undefined} disabled={!editMode} activeOpacity={0.7}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{name.charAt(0) || "U"}</Text>
              )}
              {editMode && (
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          {uploadingPhoto && (
            <ActivityIndicator style={styles.uploadingIndicator} color={colors.primary} />
          )}
          <Text style={[styles.profileName, { color: colors.textDark }]}>{name || "Not set"}</Text>
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

        {/* Profile Form */}
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          {editMode ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Full Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textLight}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark, opacity: 0.7 }]}
                  value={email}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor={colors.textLight}
                />
                <Text style={[styles.hintText, { color: colors.textLight }]}>Email cannot be changed</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Phone Number *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter your address"
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textDark }]}>Bio / About</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us about yourself"
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textDark }]}>Date of Birth</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                    value={dateOfBirth}
                    onChangeText={setDateOfBirth}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={[styles.label, { color: colors.textDark }]}>Emergency Contact</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                    value={emergencyContact}
                    onChangeText={setEmergencyContact}
                    placeholder="Emergency number"
                    placeholderTextColor={colors.textLight}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Teacher Specific Fields */}
              {userRole !== "student" && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Professional Information</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Department *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      value={department}
                      onChangeText={setDepartment}
                      placeholder="e.g., Computer Science"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Qualification</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      value={qualification}
                      onChangeText={setQualification}
                      placeholder="e.g., M.Tech, Ph.D"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Experience (Years)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={experience}
                        onChangeText={setExperience}
                        placeholder="Years"
                        placeholderTextColor={colors.textLight}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Specialization</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={specialization}
                        onChangeText={setSpecialization}
                        placeholder="e.g., AI"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Student Specific Fields */}
              {userRole === "student" && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Academic Information</Text>
                  
                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Roll Number *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={rollNumber}
                        onChangeText={setRollNumber}
                        placeholder="Roll number"
                        placeholderTextColor={colors.textLight}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Semester *</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={semester}
                        onChangeText={setSemester}
                        placeholder="Semester"
                        placeholderTextColor={colors.textLight}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textDark }]}>Department *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                      value={department}
                      onChangeText={setDepartment}
                      placeholder="e.g., Computer Science"
                      placeholderTextColor={colors.textLight}
                    />
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>{"Parent's Phone"}</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={parentPhone}
                        onChangeText={setParentPhone}
                        placeholder="Parent's contact"
                        placeholderTextColor={colors.textLight}
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                      <Text style={[styles.label, { color: colors.textDark }]}>Admission Year</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                        value={admissionYear}
                        onChangeText={setAdmissionYear}
                        placeholder="e.g., 2024"
                        placeholderTextColor={colors.textLight}
                        keyboardType="numeric"
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
            // View Mode - Display all information
            <>
              <View style={styles.infoSection}>
                <Text style={[styles.infoLabel, { color: colors.textLight }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.textDark }]}>{email || "Not set"}</Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={[styles.infoLabel, { color: colors.textLight }]}>Phone</Text>
                <Text style={[styles.infoValue, { color: colors.textDark }]}>{phone || "Not set"}</Text>
              </View>

              <View style={styles.infoSection}>
                <Text style={[styles.infoLabel, { color: colors.textLight }]}>Address</Text>
                <Text style={[styles.infoValue, { color: colors.textDark }]}>{address || "Not set"}</Text>
              </View>

              {bio && (
                <View style={styles.infoSection}>
                  <Text style={[styles.infoLabel, { color: colors.textLight }]}>About Me</Text>
                  <Text style={[styles.infoValue, { color: colors.textDark }]}>{bio}</Text>
                </View>
              )}

              {(dateOfBirth || emergencyContact) && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Personal Details</Text>
                  
                  {dateOfBirth && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Date of Birth</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{dateOfBirth}</Text>
                    </View>
                  )}
                  
                  {emergencyContact && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Emergency Contact</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{emergencyContact}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Teacher View Mode */}
              {userRole !== "student" && (department || qualification || experience || specialization) && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Professional Details</Text>
                  
                  {department && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Department</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{department}</Text>
                    </View>
                  )}
                  
                  {qualification && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Qualification</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{qualification}</Text>
                    </View>
                  )}
                  
                  {experience && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Experience</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{experience} years</Text>
                    </View>
                  )}
                  
                  {specialization && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Specialization</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{specialization}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Student View Mode */}
              {userRole === "student" && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.textDark, marginTop: 10 }]}>Academic Details</Text>
                  
                  {rollNumber && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Roll Number</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{rollNumber}</Text>
                    </View>
                  )}
                  
                  {semester && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Semester</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{semester}</Text>
                    </View>
                  )}
                  
                  {department && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Department</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{department}</Text>
                    </View>
                  )}
                  
                  {parentPhone && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>{"Parent's Phone"}</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{parentPhone}</Text>
                    </View>
                  )}
                  
                  {admissionYear && (
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoLabel, { color: colors.textLight }]}>Admission Year</Text>
                      <Text style={[styles.infoValue, { color: colors.textDark }]}>{admissionYear}</Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10 },
  scrollContent: { paddingBottom: 40 },
  
  header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  themeToggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  
  profileHeader: { alignItems: "center", paddingVertical: 30 },
  avatarContainer: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 15,
    position: "relative",
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { color: "#fff", fontSize: 40, fontWeight: "bold" },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4CAF50",
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  uploadingIndicator: { position: "absolute", bottom: 20, right: width / 2 - 50 },
  profileName: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  roleText: { fontSize: 12, fontWeight: "600" },
  editButton: { flexDirection: "row", alignItems: "center", marginTop: 15, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 25, gap: 8 },
  editButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  
  formCard: { margin: 15, padding: 20, borderRadius: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, marginTop: 5 },
  
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  hintText: { fontSize: 11, marginTop: 4 },
  
  row: { flexDirection: "row", gap: 10 },
  
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelButtonText: { fontSize: 16, fontWeight: "600" },
  saveButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  
  infoSection: { marginBottom: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  infoLabel: { fontSize: 12, marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: "500" },
});