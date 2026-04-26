// Create a new file: testDatabase.js (temporary test screen)
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebaseConfig.native";

export default function TestDatabase() {
  const [dbStatus, setDbStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Test 1: Check all collections
  const checkCollections = async () => {
    setLoading(true);
    let output = "=== DATABASE CHECK ===\n\n";
    
    try {
      // Check students collection
      const studentsSnap = await getDocs(collection(db, "students"));
      output += `📚 Students Collection: ${studentsSnap.size} documents\n`;
      studentsSnap.forEach((doc) => {
        output += `  - ID: ${doc.id}\n`;
        output += `    Data: ${JSON.stringify(doc.data())}\n\n`;
      });

      // Check studentRequests collection
      const requestsSnap = await getDocs(collection(db, "studentRequests"));
      output += `📝 Student Requests: ${requestsSnap.size} documents\n`;
      requestsSnap.forEach((doc) => {
        output += `  - ID: ${doc.id}\n`;
        output += `    Data: ${JSON.stringify(doc.data())}\n\n`;
      });

      // List ALL collections
      output += "\n📋 Checking common collection names...\n";
      const collections = ["students", "studentRequests", "teachers", "attendance", "marks"];
      for (const collName of collections) {
        const snap = await getDocs(collection(db, collName));
        output += `  ${collName}: ${snap.size} documents\n`;
      }

    } catch (error) {
      output += `❌ Error: ${error.message}\n`;
    }
    
    setDbStatus(output);
    setLoading(false);
  };

  // Test 2: Create test student directly
  const createTestStudent = async () => {
    setLoading(true);
    try {
      const testData = {
        boardRollNo: "TEST001",
        rollNo: "TEST001",
        classRollNo: "1",
        Name: "Test Student",
        name: "Test Student",
        email: "test@test.com",
        phone: "1234567890",
        parentPhone: "0987654321",
        address: "Test Address",
        department: "Computer Engineering",
        semester: "6",
        password: "123456",
        role: "student",
        status: "approved",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to students collection with boardRollNo as document ID
      await setDoc(doc(db, "students", "TEST001"), testData);
      
      Alert.alert(
        "Success!", 
        "Test student created!\n\nBoard Roll No: TEST001\nPassword: 123456\n\nNow try logging in with these credentials.",
        [
          { text: "OK", onPress: () => checkCollections() }
        ]
      );
    } catch (error) {
      Alert.alert("Error", `Failed to create test student: ${error.message}`);
    }
    setLoading(false);
  };

  // Test 3: Create test request
  const createTestRequest = async () => {
    setLoading(true);
    try {
      const testRequest = {
        boardRollNo: "REQ001",
        rollNo: "REQ001",
        classRollNo: "2",
        Name: "Test Request",
        name: "Test Request",
        email: "request@test.com",
        phone: "9876543210",
        department: "Computer Engineering",
        semester: "6",
        password: "123456",
        role: "student",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "studentRequests", "req_test_001"), testRequest);
      
      Alert.alert(
        "Success!", 
        "Test request created!\n\nBoard Roll No: REQ001\nPassword: 123456\nStatus: pending",
        [
          { text: "OK", onPress: () => checkCollections() }
        ]
      );
    } catch (error) {
      Alert.alert("Error", `Failed: ${error.message}`);
    }
    setLoading(false);
  };

  // Test 4: Delete all test data
  const cleanTestData = async () => {
    Alert.alert(
      "Confirm",
      "Delete test data?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            setLoading(true);
            try {
              await setDoc(doc(db, "students", "TEST001"), { deleted: true });
              await setDoc(doc(db, "studentRequests", "req_test_001"), { deleted: true });
              await checkCollections();
              Alert.alert("Done", "Test data marked. You may need to manually delete from Firebase console.");
            } catch (error) {
              Alert.alert("Error", error.message);
            }
            setLoading(false);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Database Test Tools</Text>
        
        {/* Buttons */}
        <TouchableOpacity style={styles.button} onPress={checkCollections} disabled={loading}>
          <Ionicons name="search" size={20} color="#fff" />
          <Text style={styles.buttonText}>Check Database</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: "#4CAF50" }]} onPress={createTestStudent} disabled={loading}>
          <Ionicons name="person-add" size={20} color="#fff" />
          <Text style={styles.buttonText}>Create Test Student (Approved)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: "#FF9800" }]} onPress={createTestRequest} disabled={loading}>
          <Ionicons name="time" size={20} color="#fff" />
          <Text style={styles.buttonText}>Create Test Request (Pending)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, { backgroundColor: "#f44336" }]} onPress={cleanTestData} disabled={loading}>
          <Ionicons name="trash" size={20} color="#fff" />
          <Text style={styles.buttonText}>Clean Test Data</Text>
        </TouchableOpacity>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7384bf" />
            <Text>Working...</Text>
          </View>
        )}

        {/* Database Status Display */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Database Status:</Text>
          <Text style={styles.statusText} selectable>
            {dbStatus || "Press 'Check Database' to see status"}
          </Text>
        </View>

        {/* Test Credentials */}
        <View style={styles.credentialsBox}>
          <Text style={styles.credTitle}>Test Credentials (After Creation):</Text>
          <Text style={styles.credText}>
            Approved Student:{'\n'}
            Board Roll No: TEST001{'\n'}
            Password: 123456{'\n\n'}
            Pending Request:{'\n'}
            Board Roll No: REQ001{'\n'}
            Password: 123456
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7384bf",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    gap: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  statusContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    minHeight: 200,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "monospace",
    lineHeight: 18,
  },
  credentialsBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  credTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1565C0",
  },
  credText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#1976D2",
  },
});