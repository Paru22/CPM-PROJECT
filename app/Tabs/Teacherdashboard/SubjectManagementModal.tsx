import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
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
  subjectCode?: string;
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
  semester?: number;
  assignedAt?: string;
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
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectSemester, setNewSubjectSemester] = useState('');
  const [newSubjectCredits, setNewSubjectCredits] = useState('');

  // Delete subject
  const [selectedDeleteSubjectId, setSelectedDeleteSubjectId] = useState('');

  // Assign subject
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedAssignSubjectId, setSelectedAssignSubjectId] = useState('');
  
  // Search filter for teachers
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      console.log('=== LOADING DATA FOR SUBJECT MANAGEMENT ===');
      console.log('Department for subjects:', department);

      // Load subjects for this department only
      let subjectsQuery;
      if (department && department.trim() !== '') {
        subjectsQuery = query(collection(db, 'subjects'), where('department', '==', department));
      } else {
        subjectsQuery = collection(db, 'subjects');
      }
      const subjectsSnap = await getDocs(subjectsQuery);
      const subjectsList = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      setSubjects(subjectsList);
      console.log(`✅ Loaded ${subjectsList.length} subjects`);

      // Load ALL teachers (no department filter)
      const teachersSnap = await getDocs(collection(db, 'teachers'));
      let teachersList = teachersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Teacher));
      
      // Filter out HOD from teachers list
      teachersList = teachersList.filter(teacher => teacher.role !== 'hod');
      setTeachers(teachersList);
      console.log(`✅ Loaded ${teachersList.length} teachers from all departments (excluding HOD)`);

      // Load existing assignments
      const assignSnap = await getDocs(collection(db, 'teacherSubjects'));
      const assignmentsList: Assignment[] = [];
      
      for (const docSnap of assignSnap.docs) {
        const data = docSnap.data();
        const teacher = teachersList.find(t => t.uid === data.teacherId);
        const subject = subjectsList.find(s => s.id === data.subjectId);
        
        assignmentsList.push({
          id: docSnap.id,
          teacherId: data.teacherId,
          teacherName: teacher?.name || 'Unknown Teacher',
          subjectId: data.subjectId,
          subjectName: subject?.name || 'Unknown Subject',
          semester: subject?.semester,
          assignedAt: data.assignedAt,
        });
      }
      setAssignments(assignmentsList);
      console.log(`✅ Loaded ${assignmentsList.length} assignments`);

    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Check console for details.');
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, loadData]);

  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !newSubjectCode.trim() || !newSubjectSemester || !newSubjectCredits) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    
    const semesterNum = parseInt(newSubjectSemester);
    const creditsNum = parseInt(newSubjectCredits);
    
    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 6) {
      Alert.alert('Error', 'Semester must be between 1 and 6');
      return;
    }
    
    if (isNaN(creditsNum) || creditsNum < 1) {
      Alert.alert('Error', 'Credits must be a positive number');
      return;
    }
    
    setLoading(true);
    try {
      // Check if subject with same code already exists
      const existingQuery = query(
        collection(db, 'subjects'), 
        where('subjectCode', '==', newSubjectCode.trim().toUpperCase()),
        where('department', '==', department)
      );
      const existingSnap = await getDocs(existingQuery);
      
      if (!existingSnap.empty) {
        Alert.alert('Error', 'Subject with this code already exists in your department');
        setLoading(false);
        return;
      }
      
      await addDoc(collection(db, 'subjects'), {
        name: newSubjectName.trim(),
        subjectCode: newSubjectCode.trim().toUpperCase(),
        department: department,
        semester: semesterNum,
        credits: creditsNum,
        createdAt: new Date().toISOString(),
      });
      
      Alert.alert('Success', 'Subject added successfully');
      setNewSubjectName('');
      setNewSubjectCode('');
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
              // Delete the subject
              await deleteDoc(doc(db, 'subjects', selectedDeleteSubjectId));
              
              // Delete all assignments related to this subject
              const assignQuery = query(
                collection(db, 'teacherSubjects'), 
                where('subjectId', '==', selectedDeleteSubjectId)
              );
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
      const teacher = teachers.find(t => t.uid === selectedTeacherId);
      const subject = subjects.find(s => s.id === selectedAssignSubjectId);
      
      console.log('Assigning subject:', {
        teacherId: selectedTeacherId,
        teacherName: teacher?.name,
        teacherDepartment: teacher?.department,
        subjectId: selectedAssignSubjectId,
        subjectName: subject?.name,
        subjectDepartment: subject?.department,
        semester: subject?.semester
      });
      
      await addDoc(collection(db, 'teacherSubjects'), {
        teacherId: selectedTeacherId,
        teacherName: teacher?.name || '',
        teacherDepartment: teacher?.department || '',
        subjectId: selectedAssignSubjectId,
        subjectName: subject?.name || '',
        subjectDepartment: subject?.department || '',
        semester: subject?.semester || 0,
        department: department,
        assignedBy: 'HOD',
        assignedAt: new Date().toISOString(),
      });
      
      Alert.alert('Success', `Subject "${subject?.name}" assigned to ${teacher?.name} (${teacher?.department})`);
      setSelectedTeacherId('');
      setSelectedAssignSubjectId('');
      await loadData();
      onSubjectsUpdated();
    } catch (error) {
      console.error('Assignment error:', error);
      Alert.alert('Error', 'Failed to assign subject: ' + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, teacherName: string, subjectName: string) => {
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

  // Filter teachers by search query
  const filteredTeachers = teachers.filter(teacher =>
    teacher.name?.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
    teacher.department?.toLowerCase().includes(teacherSearchQuery.toLowerCase())
  );

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
          <TouchableOpacity
            style={[styles.tab, activeTab === 'add' && styles.activeTab]}
            onPress={() => setActiveTab('add')}
          >
            <Ionicons name="add-circle-outline" size={20} color={activeTab === 'add' ? '#fff' : '#7384bf'} />
            <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>Add</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'delete' && styles.activeTab]}
            onPress={() => setActiveTab('delete')}
          >
            <Ionicons name="trash-outline" size={20} color={activeTab === 'delete' ? '#fff' : '#7384bf'} />
            <Text style={[styles.tabText, activeTab === 'delete' && styles.activeTabText]}>Delete</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'assign' && styles.activeTab]}
            onPress={() => setActiveTab('assign')}
          >
            <Ionicons name="person-add-outline" size={20} color={activeTab === 'assign' ? '#fff' : '#7384bf'} />
            <Text style={[styles.tabText, activeTab === 'assign' && styles.activeTabText]}>Assign</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'assignments' && styles.activeTab]}
            onPress={() => setActiveTab('assignments')}
          >
            <Ionicons name="list-outline" size={20} color={activeTab === 'assignments' ? '#fff' : '#7384bf'} />
            <Text style={[styles.tabText, activeTab === 'assignments' && styles.activeTabText]}>List</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading && <ActivityIndicator size="large" color="#7384bf" style={styles.loader} />}

          {/* Add Subject Tab */}
          {activeTab === 'add' && (
            <View>
              <Text style={styles.label}>Subject Name *</Text>
              <TextInput 
                style={styles.input} 
                value={newSubjectName} 
                onChangeText={setNewSubjectName} 
                placeholder="e.g., Mathematics" 
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Subject Code *</Text>
              <TextInput 
                style={styles.input} 
                value={newSubjectCode} 
                onChangeText={setNewSubjectCode} 
                placeholder="e.g., CS101" 
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />

              <Text style={styles.label}>Semester (1-8) *</Text>
              <TextInput 
                style={styles.input} 
                value={newSubjectSemester} 
                onChangeText={setNewSubjectSemester} 
                placeholder="e.g., 3" 
                placeholderTextColor="#999"
                keyboardType="numeric" 
              />

              <Text style={styles.label}>Credits *</Text>
              <TextInput 
                style={styles.input} 
                value={newSubjectCredits} 
                onChangeText={setNewSubjectCredits} 
                placeholder="e.g., 4" 
                placeholderTextColor="#999"
                keyboardType="numeric" 
              />

              <TouchableOpacity style={styles.actionButton} onPress={handleAddSubject}>
                <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.gradientButton}>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Add Subject</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Delete Subject Tab */}
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
                    <View>
                      <Text style={styles.optionText}>{sub.name}</Text>
                      <Text style={styles.optionSubText}>Code: {sub.subjectCode} | Sem {sub.semester}</Text>
                    </View>
                    {selectedDeleteSubjectId === sub.id && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteSubject}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Delete Subject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Assign Subject Tab */}
          {activeTab === 'assign' && (
            <View>
              <Text style={styles.label}>Search Teacher</Text>
              <TextInput 
                style={styles.input} 
                value={teacherSearchQuery} 
                onChangeText={setTeacherSearchQuery} 
                placeholder="Search by name or department..." 
                placeholderTextColor="#999"
              />
              
              <Text style={styles.label}>Select Teacher</Text>
              {filteredTeachers.length === 0 ? (
                <Text style={styles.emptyText}>No teachers found. Make sure teachers exist in Firestore.</Text>
              ) : (
                filteredTeachers.map(teacher => (
                  <TouchableOpacity
                    key={teacher.uid}
                    style={[styles.optionItem, selectedTeacherId === teacher.uid && styles.selectedOption]}
                    onPress={() => {
                      setSelectedTeacherId(teacher.uid);
                      setSelectedAssignSubjectId('');
                    }}
                  >
                    <View>
                      <Text style={styles.optionText}>{teacher.name}</Text>
                      <Text style={styles.optionSubText}>{teacher.department || 'No department'} • {teacher.role || 'Teacher'}</Text>
                    </View>
                    {selectedTeacherId === teacher.uid && <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />}
                  </TouchableOpacity>
                ))
              )}

              {selectedTeacherId && filteredTeachers.length > 0 && (
                <>
                  <Text style={styles.label}>Select Subject to Assign</Text>
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
                          <View>
                            <Text style={[styles.optionText, alreadyAssigned && styles.assignedText]}>
                              {sub.name} ({sub.subjectCode})
                            </Text>
                            <Text style={styles.optionSubText}>Semester {sub.semester} • {sub.credits} credits</Text>
                          </View>
                          {alreadyAssigned ? (
                            <Ionicons name="checkmark-done-circle" size={24} color="#4CAF50" />
                          ) : selectedAssignSubjectId === sub.id ? (
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              )}

              {filteredTeachers.length > 0 && !selectedTeacherId && (
                <Text style={styles.hintText}>👆 Please select a teacher first</Text>
              )}

              {selectedTeacherId && selectedAssignSubjectId && (
                <TouchableOpacity style={styles.actionButton} onPress={handleAssignSubject}>
                  <LinearGradient colors={['#7384bf', '#0c69ff']} style={styles.gradientButton}>
                    <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Confirm Assignment</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* View Assignments Tab */}
          {activeTab === 'assignments' && (
            <View>
              <Text style={styles.label}>Current Teacher-Subject Assignments</Text>
              {assignments.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="school-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No assignments found</Text>
                  <Text style={styles.emptySubText}>{'Go to "Assign" tab to assign subjects to teachers'}</Text>
                </View>
              ) : (
                assignments.map(assign => (
                  <View key={assign.id} style={styles.assignmentCard}>
                    <View style={styles.assignmentIcon}>
                      <Ionicons name="person-outline" size={24} color="#7384bf" />
                    </View>
                    <View style={styles.assignmentInfo}>
                      <Text style={styles.assignmentTeacher}>{assign.teacherName}</Text>
                      <Text style={styles.assignmentSubject}>{assign.subjectName}</Text>
                      <Text style={styles.assignmentMeta}>Semester {assign.semester}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveAssignment(assign.id, assign.teacherName || '', assign.subjectName || '')}
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
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginTop: 15, borderRadius: 12, overflow: 'hidden', elevation: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6, backgroundColor: '#fff' },
  activeTab: { backgroundColor: '#7384bf' },
  tabText: { fontWeight: '600', color: '#333', fontSize: 14 },
  activeTabText: { color: '#fff' },
  content: { padding: 20 },
  loader: { marginTop: 40 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 15, marginBottom: 8, color: '#333' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#ddd', marginBottom: 10, fontSize: 16 },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  selectedOption: { borderColor: '#4CAF50', backgroundColor: '#f0fff0' },
  assignedOption: { backgroundColor: '#f5f5f5', opacity: 0.7 },
  assignedText: { color: '#999', textDecorationLine: 'line-through' },
  optionText: { fontSize: 16, fontWeight: '500', color: '#333' },
  optionSubText: { fontSize: 12, color: '#666', marginTop: 2 },
  hintText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20, padding: 10 },
  actionButton: { marginTop: 25, borderRadius: 12, overflow: 'hidden' },
  deleteButton: { backgroundColor: '#F44336', padding: 14, alignItems: 'center', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  gradientButton: { padding: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20 },
  emptySubText: { fontSize: 12, color: '#bbb', textAlign: 'center', marginTop: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  assignmentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e0e0e0', elevation: 1 },
  assignmentIcon: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  assignmentInfo: { flex: 1 },
  assignmentTeacher: { fontSize: 16, fontWeight: '600', color: '#333' },
  assignmentSubject: { fontSize: 14, color: '#666', marginTop: 2 },
  assignmentMeta: { fontSize: 12, color: '#999', marginTop: 2 },
  deleteAssignmentIcon: { padding: 8 },
});

export default SubjectManagementModal;