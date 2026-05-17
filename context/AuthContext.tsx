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

// Storage keys
const AUTH_USER_KEY = "@cpm_auth_user";
const AUTH_CREDENTIALS_KEY = "@cpm_auth_credentials";

// Enhanced user roles
export type UserRole = "student" | "teacher" | "hod";

export interface TeacherRole {
  type: "subject_teacher" | "class_teacher" | "lab_incharge";
  department?: string;
  semester?: string;
  subjectId?: string;
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
  requestStatus?: "pending" | "approved" | "rejected";
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
      console.error("Error saving user to storage:", error);
    }
  };

  const loadUserFromStorage = async (): Promise<AppUser | null> => {
    try {
      const userJson = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (userJson) {
        return JSON.parse(userJson) as AppUser;
      }
    } catch (error) {
      console.error("Error loading user from storage:", error);
    }
    return null;
  };

  const saveCredentials = async (type: "teacher" | "student", identifier: string, password: string) => {
    try {
      const credentials = { type, identifier, password };
      await AsyncStorage.setItem(AUTH_CREDENTIALS_KEY, JSON.stringify(credentials));
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

  // ==================== FETCH ROLES ====================
  
  const fetchTeacherRoles = async (teacherId: string): Promise<TeacherRole[]> => {
    try {
      const roles: TeacherRole[] = [];

      // Check class teacher assignments
      const classTeacherQuery = query(
        collection(db, "classTeachers"),
        where("teacherId", "==", teacherId)
      );
      const classTeacherSnapshot = await getDocs(classTeacherQuery);
      classTeacherSnapshot.forEach((doc) => {
        const data = doc.data();
        roles.push({
          type: "class_teacher",
          department: data.department,
          semester: data.semester,
        });
      });

      // Check subject teacher and lab incharge assignments
      const teacherSubjectsQuery = query(
        collection(db, "teacherSubjects"),
        where("teacherId", "==", teacherId)
      );
      const teacherSubjectsSnapshot = await getDocs(teacherSubjectsQuery);
      teacherSubjectsSnapshot.forEach((doc) => {
        const data = doc.data();
        roles.push({
          type: data.role || "subject_teacher",
          department: data.department,
          semester: data.semester,
          subjectId: data.subjectId,
          subjectName: data.subjectName,
        });
      });

      return roles;
    } catch (error) {
      console.error("Error fetching teacher roles:", error);
      return [];
    }
  };

  // ==================== FETCH USER DATA ====================
  
  const fetchUserData = useCallback(async (uid: string): Promise<AppUser | null> => {
    try {
      // Check students collection
      const studentDoc = await getDoc(doc(db, "students", uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        const appUser: AppUser = {
          uid: studentDoc.id,
          email: data.gmail || null,
          name: data.name || "",
          role: "student",
          department: data.department || "",
          semester: data.semester || "",
          boardRollNo: data.boardRollNo || "",
          classRollNo: data.classRollNo || "",
          phone: data.phoneNo || "",
          parentPhoneNo: data.parentPhoneNo || "",
          requestStatus: data.requestStatus || "pending",
          photoURL: null,
        };
        await saveUserToStorage(appUser);
        return appUser;
      }

      // Check teachers collection
      const teacherDoc = await getDoc(doc(db, "teachers", uid));
      if (teacherDoc.exists()) {
        const data = teacherDoc.data();
        
        // ✅ BLOCK DEACTIVATED TEACHERS
        if (data.isActive === false) {
          console.warn("Teacher account is deactivated:", uid);
          return null;
        }
        
        const teacherRoles = await fetchTeacherRoles(uid);
        
        // Check if HOD
        const isHOD = data.role === "hod" || 
          (Array.isArray(data.role) && data.role.includes("hod"));
        
        const appUser: AppUser = {
          uid: teacherDoc.id,
          email: data.gmail || data.email || null,
          name: data.name || "",
          role: isHOD ? "hod" : "teacher",
          department: data.department || "",
          phone: data.phoneNo || data.phone || "",
          address: data.address || "",
          qualification: data.qualification || "",
          teacherRoles: teacherRoles.length > 0 ? teacherRoles : undefined,
          requestStatus: data.requestStatus || "pending",
          photoURL: data.profileImage || null,
        };
        await saveUserToStorage(appUser);
        return appUser;
      }

      // Check admins collection for HOD
      const adminDoc = await getDoc(doc(db, "admins", uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        const appUser: AppUser = {
          uid: adminDoc.id,
          email: data.email || null,
          name: data.name || "",
          role: "hod",
          department: data.department || "",
          phone: data.phone || "",
          requestStatus: "approved",
          photoURL: null,
        };
        await saveUserToStorage(appUser);
        return appUser;
      }

      console.warn("No user document found for uid:", uid);
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Fallback to stored data
      return await loadUserFromStorage();
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser.uid);
      setUser(userData);
    } else {
      const storedUser = await loadUserFromStorage();
      setUser(storedUser);
    }
  }, [firebaseUser, fetchUserData]);

  // ==================== AUTH STATE LISTENER ====================
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // User is signed in - fetch fresh data
        const userData = await fetchUserData(fbUser.uid);
        if (userData) {
          setUser(userData);
        } else {
          // User data not found (possibly deactivated)
          await signOut(auth);
          await removeCredentials();
          setUser(null);
        }
      } else {
        // User is signed out - try auto login
        const storedUser = await loadUserFromStorage();
        if (storedUser) {
          setUser(storedUser);
          
          // Try auto-login with saved credentials
          try {
            const credentialsJson = await AsyncStorage.getItem(AUTH_CREDENTIALS_KEY);
            if (credentialsJson) {
              const credentials = JSON.parse(credentialsJson);
              
              if (credentials.type === "teacher") {
                await signInWithEmailAndPassword(auth, credentials.identifier, credentials.password);
              } else if (credentials.type === "student") {
                const studentsQuery = query(
                  collection(db, "students"),
                  where("boardRollNo", "==", credentials.identifier)
                );
                const studentSnapshot = await getDocs(studentsQuery);
                
                if (!studentSnapshot.empty) {
                  const studentDoc = studentSnapshot.docs[0];
                  const studentData = studentDoc.data();
                  if (studentData.gmail) {
                    await signInWithEmailAndPassword(auth, studentData.gmail, credentials.password);
                  }
                }
              }
            }
          } catch (autoLoginError) {
            console.log("Auto-login failed:", autoLoginError);
            setUser(null);
            await removeCredentials();
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserData]);

  // ==================== LOGIN FUNCTIONS ====================
  
  const login = useCallback(async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const userData = await fetchUserData(credential.user.uid);
      
      if (!userData) {
        await signOut(auth);
        
        // Check if account is deactivated
        const teacherDoc = await getDoc(doc(db, "teachers", credential.user.uid));
        if (teacherDoc.exists() && teacherDoc.data().isActive === false) {
          throw new Error("Your account has been deactivated. Please contact HOD.");
        }
        
        throw new Error("Account not found. Please contact administrator.");
      }
      
      if (userData.requestStatus === "pending") {
        await signOut(auth);
        throw new Error("Your account is pending approval. Please wait for HOD to approve.");
      }
      
      if (userData.requestStatus === "rejected") {
        await signOut(auth);
        throw new Error("Your account has been rejected. Please contact HOD.");
      }
      
      // Save credentials for persistent login
      await saveCredentials("teacher", email, password);
      
      setUser(userData);
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Login failed");
    }
  }, [fetchUserData]);

  const loginAsStudent = useCallback(async (boardRollNo: string, password: string) => {
    try {
      const studentsQuery = query(
        collection(db, "students"),
        where("boardRollNo", "==", boardRollNo)
      );
      const studentSnapshot = await getDocs(studentsQuery);
      
      if (studentSnapshot.empty) {
        throw new Error("No student found with this Board Roll Number");
      }
      
      const studentDoc = studentSnapshot.docs[0];
      const studentData = studentDoc.data();
      
      const studentEmail = studentData.gmail;
      if (!studentEmail) {
        throw new Error("Student email not found. Please contact class teacher.");
      }
      
      const credential = await signInWithEmailAndPassword(auth, studentEmail, password);
      
      if (credential.user.uid !== studentDoc.id) {
        await signOut(auth);
        throw new Error("Authentication mismatch. Please try again.");
      }
      
      const userData = await fetchUserData(studentDoc.id);
      
      if (!userData) {
        await signOut(auth);
        throw new Error("Student data not found.");
      }
      
      if (userData.requestStatus === "pending") {
        await signOut(auth);
        throw new Error("Your account is pending approval. Please wait for class teacher to approve.");
      }
      
      // Save credentials for persistent login
      await saveCredentials("student", boardRollNo, password);
      
      setUser(userData);
    } catch (error: any) {
      console.error("Student login error:", error);
      throw new Error(error.message || "Student login failed");
    }
  }, [fetchUserData]);

  const logout = useCallback(async () => {
    try {
      // Clear stored data first
      await removeCredentials();
      await signOut(auth);
      setUser(null);
      setFirebaseUser(null);
    } catch (error: any) {
      console.error("Logout error:", error);
      throw new Error("Logout failed");
    }
  }, []);

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