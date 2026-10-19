import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task } from '../types/task';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const tasksPath = 'tasks';
    const q = query(
      collection(db, tasksPath),
      where('ownerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasksData: Task[] = [];
        snapshot.forEach((doc) => {
          tasksData.push({ id: doc.id, ...doc.data() } as Task);
        });
        setTasks(tasksData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.LIST, tasksPath);
        } catch (wrappedErr) {
          setError((wrappedErr as Error).message);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const addTask = async (title: string, description?: string) => {
    if (!auth.currentUser) throw new Error('Not authenticated');

    const tasksPath = 'tasks';
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();

    const newTask: Omit<Task, 'id'> = {
      ownerId: auth.currentUser.uid,
      title,
      description: description || '',
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, tasksPath, taskId), { id: taskId, ...newTask });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${tasksPath}/${taskId}`);
    }
  };

  const updateTaskStatus = async (taskId: string, completed: boolean) => {
    const tasksPath = 'tasks';
    try {
      await updateDoc(doc(db, tasksPath, taskId), {
        completed,
        updatedAt: Date.now(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${tasksPath}/${taskId}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    const tasksPath = 'tasks';
    try {
      await deleteDoc(doc(db, tasksPath, taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${tasksPath}/${taskId}`);
    }
  };

  return { tasks, loading, error, addTask, updateTaskStatus, deleteTask };
}
