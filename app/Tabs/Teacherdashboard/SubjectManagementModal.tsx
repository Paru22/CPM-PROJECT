import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../../config/firebaseConfig.native';

interface Subject {
  id: string;
  name: string;
  department: string;
  semester: number;
  credits: number;
}

interface Teacher {
  uid: string;
  name: string;
  email?: string;
  department: string;
  role?: string;
}

interface Assignment {
  id: string;
  teacherId: string;
  teacherName?: string;
  subjectId: string;
  subjectName?: string;
}

interface SubjectManagementModalProps {
  visible: boolean;
  onClose: () => void;
  department: string;
  onSubjectsUpdated: () => void;
}

const SubjectManagementModal: React.FC<SubjectManagementModalProps> = ({
  visible,
  onClose,
  department,
  onSubjectsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'add' | 'delete' | 'assign' | 'assignments'>('add');
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Add subject form
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectSemester, setNewSubjectSemester] = useState('');
  const [newSubjectCredits, setNewSubjectCredits] = useState('');

  // Delete subject
  const [selectedDeleteSubjectId, setSelectedDeleteSubjectId] = useState('');

  // Assign subject
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedAssignSubjectId, setSelectedAssignSubjectId] = useState('');

  // ✅ Wrap loadData in useCallback to prevent recreation on every render
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading data for department:', department);

      // Subjects in this department (if department provided, else all)
      let subjectsQuery;
      if (department && department.trim() !== '') {
        subjectsQuery = query(collection(db, 'subjects'), where('department', '==', department));
      } else {
        subjectsQuery = collection(db, 'subjects');
      }
      const subjectsSnap = await getDocs(subjectsQuery);
      const subjectsList = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      setSubjects(subjectsList);
      console.log(`Loaded ${subjectsList.length} subjects`);

      // Teachers: try to filter by department, but fallback to all if none found
      let teachersQuery;
      if (department && department.trim() !== '') {
        teachersQuery = query(collection(db, 'teachers'), where('department', '==', department));
      } else {
        teachersQuery = collection(db, 'teachers');
      }
      const teachersSnap = await getDocs(teachersQuery);
      let teachersList = teachersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Teacher));
      
      // If no teachers found with department filter, try loading all teachers (fallback)
      if (teachersList.length === 0 && department) {
        console.log('No teachers found with department filter, loading all teachers...');
        const allTeachersSnap = await getDocs(collection(db, 'teachers'));
        teachersList = allTeachersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Teacher));
        Alert.alert('Info', `No teachers found in ${department} department. Showing all teachers.`);
      }
      setTeachers(teachersList);
      console.log(`Loaded ${teachersList.length} teachers`);

      // Existing teacher-subject assignments (with names for display)
      const assignSnap = await getDocs(collection(db, 'teacherSubjects'));
      const assignmentsList: Assignment[] = [];
      for (const docSnap of assignSnap.docs) {
        const data = docSnap.data();
        const teacher = teachersList.find(t => t.uid === data.teacherId);
        const subject = subjectsList.find(s => s.id === data.subjectId);
        assignmentsList.push({
          id: docSnap.id,
          teacherId: data.teacherId,
          teacherName: teacher?.name || data.teacherId,
          subjectId: data.subjectId,
          subjectName: subject?.name || data.subjectId,
        });
      }
      setAssignments(assignmentsList);
      console.log(`Loaded ${assignmentsList.length} assignments`);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Check console for details.');
    } finally {
      setLoading(false);
    }
  }, [department]); // ✅ dependency: department

  // ✅ useEffect now correctly depends on loadData (stable reference)
  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !newSubjectSemester || !newSubjectCredits) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'subjects'), {
        name: newSubjectName.trim(),
        department: department || 'Unknown',
        semester: parseInt(newSubjectSemester),
        credits: parseInt(newSubjectCredits),
        subjectId: `${department}_${newSubjectName.trim()}_${Date.now()}`,
      });
      Alert.alert('Success', 'Subject added');
      setNewSubjectName('');
      setNewSubjectSemester('');
      setNewSubjectCredits('');
      await loadData();
      onSubjectsUpdated();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to add subject');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!selectedDeleteSubjectId) {
      Alert.alert('Select a subject', 'Please choose a subject to delete');
      return;
    }
    Alert.alert(
      'Confirm Delete',
      'Deleting a subject will also remove all teacher assignments. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'subjects', selectedDeleteSubjectId));
              const assignQuery = query(collection(db, 'teacherSubjects'), where('subjectId', '==', selectedDeleteSubjectId));
              const assignSnap = await getDocs(assignQuery);
              const deletePromises = assignSnap.docs.map(d => deleteDoc(doc(db, 'teacherSubjects', d.id)));
              await Promise.all(deletePromises);
              Alert.alert('Deleted', 'Subject and assignments removed');
              setSelectedDeleteSubjectId('');
              await loadData();
              onSubjectsUpdated();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete subject');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAssignSubject = async () => {
    if (!selectedTeacherId || !selectedAssignSubjectId) {
      Alert.alert('Error', 'Select both teacher and subject');
      return;
    }
    const already = assignments.some(a => a.teacherId === selectedTeacherId && a.subjectId === selectedAssignSubjectId);
    if (already) {
      Alert.alert('Already Assigned', 'This subject is already assigned to the teacher');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'teacherSubjects'), {
        teacherId: selectedTeacherId,
        subjectId: selectedAssignSubjectId,
        assignedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Subject assigned to teacher');
      setSelectedTeacherId('');
      setSelectedAssignSubjectId('');
      await loadData();
      onSubjectsUpdated();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to assign subject');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string, teacherName: string, subjectName: string) => {
    Alert.alert(
      'Remove Assignment',
      `Remove "${subjectName}" from ${teacherName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'teacherSubjects', assignmentId));
              Alert.alert('Success', 'Assignment removed');
              await loadData();
              onSubjectsUpdated();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to remove assignment');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const isSubjectAssignedToTeacher = (subjectId: string) => {
    if (!selectedTeacherId) return false;
    return assignments.some(a => a.teacherId === selectedTeacherId && a.subjectId === subjectId);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.modalContainer}>
        <LinearGradient colors={['#7384bf', '#0c69ff']} style={styles.header}>
          <Text style={styles.headerTitle}>Subject Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.tabContainer}>
          {['add', 'delete', 'assign', 'assignments'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'assignments' ? 'Assignments' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.content}>
          {loading && <ActivityIndicator size="large" color="#7384bf" style={styles.loader} />}

          {activeTab === 'add' && (
            <View>
              <Text style={styles.label}>Subject Name</Text>
              <TextInput style={styles.input} value={newSubjectName} onChangeText={setNewSubjectName} placeholder="e.g., Mathematics" />

              <Text style={styles.label}>Semester (1-8)</Text>
              <TextInput style={styles.input} value={newSubjectSemester} onChangeText={setNewSubjectSemester} placeholder="e.g., 3" keyboardType="numeric" />

              <Text style={styles.label}>Credits</Text>
              <TextInput style={styles.input} value={newSubjectCredits} onChangeText={setNewSubjectCredits} placeholder="e.g., 3" keyboardType="numeric" />

              <TouchableOpacity style={styles.actionButton} onPress={handleAddSubject}>
                <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.gradientButton}>
                  <Text style={styles.buttonText}>➕ Add Subject</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'delete' && (
            <View>
              <Text style={styles.label}>Select Subject to Delete</Text>
              {subjects.length === 0 ? (
                <Text style={styles.emptyText}>No subjects available.</Text>
              ) : (
                subjects.map(sub => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.optionItem, selectedDeleteSubjectId === sub.id && styles.selectedOption]}
                    onPress={() => setSelectedDeleteSubjectId(sub.id)}
                  >
                    <Text style={styles.optionText}>{sub.name} (Sem {sub.semester})</Text>
                    {selectedDeleteSubjectId === sub.id && <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />}
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteSubject}>
                <Text style={styles.buttonText}>🗑 Delete Subject</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'assign' && (
            <View>
              <Text style={styles.label}>Select Teacher</Text>
              {teachers.length === 0 ? (
                <Text style={styles.emptyText}>No teachers found. Make sure teachers exist in Firestore.</Text>
              ) : (
                teachers.map(teacher => (
                  <TouchableOpacity
                    key={teacher.uid}
                    style={[styles.optionItem, selectedTeacherId === teacher.uid && styles.selectedOption]}
                    onPress={() => {
                      setSelectedTeacherId(teacher.uid);
                      setSelectedAssignSubjectId('');
                    }}
                  >
                    <Text style={styles.optionText}>{teacher.name} ({teacher.department || 'No dept'})</Text>
                  </TouchableOpacity>
                ))
              )}

              {selectedTeacherId && teachers.length > 0 && (
                <>
                  <Text style={styles.label}>Select Subject</Text>
                  {subjects.length === 0 ? (
                    <Text style={styles.emptyText}>No subjects available. Add subjects first.</Text>
                  ) : (
                    subjects.map(sub => {
                      const alreadyAssigned = isSubjectAssignedToTeacher(sub.id);
                      return (
                        <TouchableOpacity
                          key={sub.id}
                          style={[
                            styles.optionItem,
                            selectedAssignSubjectId === sub.id && styles.selectedOption,
                            alreadyAssigned && styles.assignedOption,
                          ]}
                          onPress={() => !alreadyAssigned && setSelectedAssignSubjectId(sub.id)}
                          disabled={alreadyAssigned}
                        >
                          <Text style={[styles.optionText, alreadyAssigned && styles.assignedText]}>
                            {sub.name} (Sem {sub.semester})
                            {alreadyAssigned && ' ✓ Already assigned'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              )}

              {teachers.length > 0 && !selectedTeacherId && (
                <Text style={styles.hintText}>Please select a teacher first</Text>
              )}

              <TouchableOpacity style={styles.actionButton} onPress={handleAssignSubject}>
                <LinearGradient colors={['#7384bf', '#0c69ff']} style={styles.gradientButton}>
                  <Text style={styles.buttonText}>📌 Assign Subject</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'assignments' && (
            <View>
              <Text style={styles.label}>Current Teacher-Subject Assignments</Text>
              {assignments.length === 0 ? (
                <Text style={styles.emptyText}>No assignments found.</Text>
              ) : (
                assignments.map(assign => (
                  <View key={assign.id} style={styles.assignmentCard}>
                    <Ionicons name="person-outline" size={20} color="#7384bf" />
                    <View style={styles.assignmentInfo}>
                      <Text style={styles.assignmentTeacher}>{assign.teacherName}</Text>
                      <Text style={styles.assignmentSubject}>{assign.subjectName}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteAssignment(assign.id, assign.teacherName || '', assign.subjectName || '')}
                      style={styles.deleteAssignmentIcon}
                    >
                      <Ionicons name="trash-outline" size={22} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  closeButton: { padding: 5 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginTop: 15, borderRadius: 10, overflow: 'hidden' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  activeTab: { backgroundColor: '#7384bf' },
  tabText: { fontWeight: '600', color: '#333' },
  activeTabText: { color: '#fff' },
  content: { padding: 20 },
  loader: { marginTop: 20 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 5, color: '#333' },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  selectedOption: { borderColor: '#4CAF50', backgroundColor: '#f0fff0' },
  assignedOption: { backgroundColor: '#f5f5f5', opacity: 0.6 },
  assignedText: { color: '#999', textDecorationLine: 'line-through' },
  optionText: { fontSize: 16 },
  hintText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20 },
  actionButton: { marginTop: 20, borderRadius: 10, overflow: 'hidden' },
  deleteButton: { backgroundColor: '#F44336', padding: 14, alignItems: 'center', borderRadius: 10 },
  gradientButton: { padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20 },
  assignmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0', gap: 12 },
  assignmentInfo: { flex: 1 },
  assignmentTeacher: { fontSize: 16, fontWeight: '600', color: '#333' },
  assignmentSubject: { fontSize: 14, color: '#666', marginTop: 2 },
  deleteAssignmentIcon: { padding: 6 },
});

export default SubjectManagementModal;