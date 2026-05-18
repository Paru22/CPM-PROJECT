import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebaseConfig.native";

export { auth };

// ==================== CONSTANTS ====================

const AUTH_USER_KEY = "@cpm_auth_user";
const AUTH_CREDENTIALS_KEY = "@cpm_auth_credentials";

// ==================== TYPES ====================

export type UserRole = "student" | "teacher" | "hod";

export interface TeacherRole {
  type: "subject_teacher" | "class_teacher" | "lab_incharge";
  department?: string;
  semester?: string;
  subjectCode?: string;
  subjectName?: string;
}

export interface AppUser {
  uid: string;
  email: string | null;
  name: string;
  role: UserRole;
  department: string;
  semester?: string;
  boardRollNo?: string;
  classRollNo?: string;
  phone?: string;
  parentPhoneNo?: string;
  address?: string;
  qualification?: string;
  photoURL?: string | null;
  teacherRoles?: TeacherRole[];
  status?: "pending" | "approved" | "rejected";
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsStudent: (boardRollNo: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// ==================== PROVIDER ====================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // ==================== STORAGE HELPERS ====================

  const saveUserToStorage = async (appUser: AppUser) => {
    try {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(appUser));
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const loadUserFromStorage = async (): Promise<AppUser | null> => {
    try {
      const json = await AsyncStorage.getItem(AUTH_USER_KEY);
      return json ? JSON.parse(json) as AppUser : null;
    } catch (error) {
      console.error("Error loading user:", error);
      return null;
    }
  };

  const saveCredentials = async (type: "teacher" | "student", identifier: string, password: string) => {
    try {
      await AsyncStorage.setItem(AUTH_CREDENTIALS_KEY, JSON.stringify({ type, identifier, password }));
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  const removeCredentials = async () => {
    try {
      await AsyncStorage.multiRemove([AUTH_USER_KEY, AUTH_CREDENTIALS_KEY]);
    } catch (error) {
      console.error("Error removing credentials:", error);
    }
  };

  // ==================== TEACHER ROLE FETCHING ====================

  const fetchTeacherRoles = async (teacherId: string): Promise<TeacherRole[]> => {
    const roles: TeacherRole[] = [];
    try {
      // Class teacher assignments
      const ctSnap = await getDocs(
        query(collection(db, "classTeachers"), where("teacherId", "==", teacherId))
      );
      ctSnap.forEach((d) => {
        const data = d.data();
        roles.push({ type: "class_teacher", department: data.department, semester: data.semester });
      });

      // Subject teacher assignments
      const tsSnap = await getDocs(
        query(collection(db, "teacherSubjects"), where("teacherId", "==", teacherId))
      );
      tsSnap.forEach((d) => {
        const data = d.data();
        roles.push({
          type: data.role || "subject_teacher",
          department: data.department,
          semester: data.semester,
          subjectCode: data.subjectCode,
          subjectName: data.subjectName,
        });
      });
    } catch (error) {
      console.error("Error fetching teacher roles:", error);
    }
    return roles;
  };

  // ==================== FETCH USER DATA ====================

  const fetchUserData = useCallback(async (uid: string): Promise<AppUser | null> => {
    try {
      // ---- STUDENT ----
      const studentDoc = await getDoc(doc(db, "students", uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        const appUser: AppUser = {
          uid: studentDoc.id,
          email: data.email || null,
          name: data.name || "",
          role: "student",
          department: data.department || "",
          semester: data.semester || "",
          boardRollNo: data.boardRollNo || "",
          classRollNo: data.classRollNo || data.rollNo || "",
          phone: data.phone || "",
          parentPhoneNo: data.parentPhone || "",
          address: data.address || "",
          status: data.status || "approved",
          photoURL: data.profileImage || null,
        };
        await saveUserToStorage(appUser);
        return appUser;
      }

      // ---- TEACHER / HOD ----
      const teacherDoc = await getDoc(doc(db, "teachers", uid));
      if (teacherDoc.exists()) {
        const data = teacherDoc.data();

        // Block deactivated teachers
        if (data.isActive === false) {
          console.warn("Deactivated teacher:", uid);
          return null;
        }

        const teacherRoles = await fetchTeacherRoles(uid);
        const isHOD = data.role === "hod" || (Array.isArray(data.role) && data.role.includes("hod"));

        const appUser: AppUser = {
          uid: teacherDoc.id,
          email: data.email || null,
          name: data.name || "",
          role: isHOD ? "hod" : "teacher",
          department: data.department || "",
          phone: data.phone || "",
          address: data.address || "",
          qualification: data.qualification || "",
          teacherRoles: teacherRoles.length > 0 ? teacherRoles : undefined,
          status: data.status || "approved",
          photoURL: data.profileImage || null,
        };
        await saveUserToStorage(appUser);
        return appUser;
      }

      console.warn("No user document for uid:", uid);
      return null;
    } catch (error) {
      console.error("Error fetching user:", error);
      return await loadUserFromStorage();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser.uid);
      setUser(userData);
    } else {
      setUser(await loadUserFromStorage());
    }
  }, [firebaseUser, fetchUserData]);

  // ==================== AUTO-LOGIN HELPER ====================

  const tryAutoLogin = async () => {
    try {
      const credJson = await AsyncStorage.getItem(AUTH_CREDENTIALS_KEY);
      if (!credJson) return;

      const cred = JSON.parse(credJson);

      if (cred.type === "teacher") {
        // Teacher: Use Firebase Auth
        await signInWithEmailAndPassword(auth, cred.identifier, cred.password);
      } else if (cred.type === "student") {
        // Student: Query Firestore, compare password, NO Firebase Auth
        const snap = await getDocs(
          query(collection(db, "students"), where("boardRollNo", "==", cred.identifier))
        );
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data();
          if (data.password === cred.password && data.status === "approved") {
            const userData = await fetchUserData(doc.id);
            if (userData) {
              setUser(userData);
              return; // Success - don't clear credentials
            }
          }
        }
        // Student auto-login failed
        await removeCredentials();
        setUser(null);
      }
    } catch (error) {
      console.log("Auto-login failed:", error);
      await removeCredentials();
      setUser(null);
    }
  };

  // ==================== AUTH STATE LISTENER ====================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("Auth state:", fbUser?.uid || "signed out");
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Firebase user exists (teacher/HOD)
        const userData = await fetchUserData(fbUser.uid);
        if (userData) {
          setUser(userData);
        } else {
          await signOut(auth);
          await removeCredentials();
          setUser(null);
        }
      } else {
        // No Firebase user - try student auto-login from AsyncStorage
        await tryAutoLogin();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserData]);

  // ==================== TEACHER/HOD LOGIN (Firebase Auth) ====================

  const login = useCallback(async (email: string, password: string) => {
    // Authenticate with Firebase
    const credential = await signInWithEmailAndPassword(auth, email, password);

    // Fetch user data from Firestore
    const userData = await fetchUserData(credential.user.uid);

    if (!userData) {
      await signOut(auth);
      throw new Error("Account not found. Contact administrator.");
    }

    if (userData.status === "pending") {
      await signOut(auth);
      throw new Error("Your account is pending approval.");
    }

    if (userData.status === "rejected") {
      await signOut(auth);
      throw new Error("Your account has been rejected.");
    }

    // Save credentials for persistent login
    await saveCredentials("teacher", email, password);
    setUser(userData);
  }, [fetchUserData]);

  // ==================== STUDENT LOGIN (Firestore Only - NO Firebase Auth) ====================

  const loginAsStudent = useCallback(async (boardRollNo: string, password: string) => {
    // 1. Find student in Firestore
    const snap = await getDocs(
      query(collection(db, "students"), where("boardRollNo", "==", boardRollNo))
    );

    if (snap.empty) {
      throw new Error("No student found with this Board Roll Number.");
    }

    const studentDoc = snap.docs[0];
    const studentData = studentDoc.data();

    // 2. Verify password (stored in Firestore)
    if (studentData.password !== password) {
      throw new Error("Invalid password. Please try again.");
    }

    // 3. Check status
    const status = studentData.status || "approved";
    if (status === "pending") {
      throw new Error("Your account is pending approval.");
    }
    if (status === "rejected") {
      throw new Error("Your account has been rejected.");
    }

    // 4. Build AppUser object
    const userData: AppUser = {
      uid: studentDoc.id,
      email: studentData.email || null,
      name: studentData.name || "",
      role: "student",
      department: studentData.department || "",
      semester: studentData.semester || "",
      boardRollNo: studentData.boardRollNo || boardRollNo,
      classRollNo: studentData.classRollNo || "",
      phone: studentData.phone || "",
      parentPhoneNo: studentData.parentPhone || "",
      address: studentData.address || "",
      status: studentData.status || "approved",
      photoURL: studentData.profileImage || null,
    };

    // 5. Save to AsyncStorage for persistent login
    await saveUserToStorage(userData);
    await saveCredentials("student", boardRollNo, password);

    // 6. Set user in context
    setUser(userData);
  }, [fetchUserData]);

  // ==================== LOGOUT ====================

  const logout = useCallback(async () => {
    await removeCredentials();
    // Only sign out Firebase if there's a Firebase user (teacher/HOD)
    if (auth.currentUser) {
      await signOut(auth);
    }
    setUser(null);
    setFirebaseUser(null);
  }, []);

  // ==================== CONTEXT VALUE ====================

  const value: AuthContextType = {
    user,
    firebaseUser,
    loading,
    login,
    loginAsStudent,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};