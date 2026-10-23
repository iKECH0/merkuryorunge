import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const NATIVE_API_BASE_URL = 'https://www.merkuryorunge.com.tr';
const DEV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';

export const API_BASE_URL = import.meta.env.DEV
  ? DEV_API_BASE_URL
  : (Capacitor.isNativePlatform() ? NATIVE_API_BASE_URL : '');
export const API_URL = `${API_BASE_URL}/api`;

export const registerTeacher = async (fullName, username, password) => {
  const response = await axios.post(`${API_URL}/auth/teacher/register`, { fullName, username, password });
  return response.data;
};

export const loginTeacher = async (username, password) => {
  const response = await axios.post(`${API_URL}/auth/teacher/login`, { username, password });
  return response.data;
};

export const addStudentByTeacher = async (fullName, username, password, teacherId, schoolLevel, className, trackingDocumentKey, googleEmail, trackingDocumentUrl) => {
  const response = await axios.post(`${API_URL}/auth/teacher/add-student`, { fullName, username, password, teacherId, schoolLevel, className, trackingDocumentKey, googleEmail, trackingDocumentUrl });
  return response.data;
};

export const registerStudent = async (fullName, username, password, inviteCode, schoolLevel, className) => {
  const response = await axios.post(`${API_URL}/auth/register`, { fullName, username, password, inviteCode, schoolLevel, className });
  return response.data;
};

export const loginStudent = async (username, password) => {
  const response = await axios.post(`${API_URL}/auth/login`, { username, password });
  return response.data;
};

const billingHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('studentBillingToken') || ''}` });
const adminHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('superAdminToken') || ''}` });

export const loginAdmin = async (username, password) => {
  const response = await axios.post(`${API_URL}/auth/admin/login`, { username, password });
  return response.data;
};

export const getBillingStatus = async () => {
  const response = await axios.get(`${API_URL}/billing/status`, { headers: billingHeaders() });
  return response.data;
};

export const verifyBillingPurchase = async (purchaseToken) => {
  const response = await axios.post(`${API_URL}/billing/verify`, { purchaseToken }, { headers: billingHeaders() });
  return response.data;
};

export const submitLog = async (logData) => {
  const response = await axios.post(`${API_URL}/logs`, logData);
  return response.data;
};

export const getLogs = async (teacherId = null) => {
  const url = teacherId ? `${API_URL}/logs?teacher_id=${teacherId}` : `${API_URL}/logs`;
  const response = await axios.get(url);
  return response.data;
};

export const getStudentLogs = async (studentName) => {
  const response = await axios.get(`${API_URL}/logs/${encodeURIComponent(studentName)}`);
  return response.data;
};

export const getStudentInfo = async (studentName) => {
  try {
    const response = await axios.get(`${API_URL}/student-info/${encodeURIComponent(studentName)}`);
    return response.data;
  } catch (error) {
    return null;
  }
};

export const getStudentGoal = async (studentName) => {
  const response = await axios.get(`${API_URL}/goals/${encodeURIComponent(studentName)}`);
  return response.data;
};

export const setStudentGoal = async (studentName, targetQuestions) => {
  const response = await axios.post(`${API_URL}/goals`, { studentName, targetQuestions });
  return response.data;
};

export const getLeaderboard = async (studentUsername) => {
  const username = (studentUsername || '').trim();
  if (!username || username === 'null' || username === 'undefined') return { rank: null, total_points: 0 };
  const response = await axios.get(`${API_URL}/leaderboard`, { params: { username } });
  return response.data;
};

export const getDailyLeaderboard = async (studentUsername) => {
  const username = (studentUsername || '').trim();
  if (!username || username === 'null' || username === 'undefined') return { rank: null, total_points: 0 };
  const response = await axios.get(`${API_URL}/leaderboard/daily`, { params: { username } });
  return response.data;
};

export const getStats = async (teacherId = null) => {
  const url = teacherId ? `${API_URL}/stats?teacher_id=${teacherId}` : `${API_URL}/stats`;
  const response = await axios.get(url);
  return response.data;
};

export const getAdminStats = async () => {
  const response = await axios.get(`${API_URL}/admin/stats`, { headers: adminHeaders() });
  return response.data;
};

export const downloadPlatformBackup = async () => {
  const response = await axios.get(`${API_URL}/admin/backup`, { headers: adminHeaders() });
  return response.data;
};

export const getDeletionRequests = async () => {
  const response = await axios.get(`${API_URL}/deletion-requests`, { headers: adminHeaders() });
  return response.data;
};

export const deleteDeletionRequest = async (id) => {
  const response = await axios.delete(`${API_URL}/deletion-requests/${id}`, { headers: adminHeaders() });
  return response.data;
};

export const submitConsultingRequest = async (data) => (await axios.post(`${API_URL}/consulting-requests`, data)).data;
export const getConsultingRequests = async () => (await axios.get(`${API_URL}/consulting-requests`, { headers: adminHeaders() })).data;
export const updateConsultingRequestStatus = async (id, status) => (await axios.put(`${API_URL}/consulting-requests/${id}/status`, { status }, { headers: adminHeaders() })).data;
export const getAdminBillingStudents = async () => (await axios.get(`${API_URL}/admin/billing/students`, { headers: adminHeaders() })).data;
export const updateAdminBillingStudent = async (studentId, action) => (await axios.put(`${API_URL}/admin/billing/students/${studentId}`, { action }, { headers: adminHeaders() })).data;

export const approveTeacher = async (teacherId) => {
  const response = await axios.post(`${API_URL}/admin/approve-teacher`, { teacherId }, { headers: adminHeaders() });
  return response.data;
};

export const deleteTeacher = async (teacherId) => {
  const response = await axios.delete(`${API_URL}/admin/teacher/${teacherId}`, { headers: adminHeaders() });
  return response.data;
};

export const updateStudent = async (studentId, className, schoolLevel, trackingDocumentKey, googleEmail, trackingDocumentUrl) => {
  const response = await axios.put(`${API_URL}/students/${studentId}`, { className, schoolLevel, trackingDocumentKey, googleEmail, trackingDocumentUrl });
  return response.data;
};

export const refreshStudentDocumentAccess = async (studentId) => {
  const response = await axios.post(`${API_URL}/students/${studentId}/tracking-document/access`);
  return response.data;
};

export const regenerateStudentDocument = async (studentId) => {
  const response = await axios.post(`${API_URL}/students/${studentId}/tracking-document/regenerate`);
  return response.data;
};

export const addTeacherByAdmin = async (fullName, username, password) => {
  const response = await axios.post(`${API_URL}/admin/add-teacher`, { fullName, username, password }, { headers: adminHeaders() });
  return response.data;
};

export const getTopicProgress = async (studentName) => {
  const response = await axios.get(`${API_URL}/topics/progress/${encodeURIComponent(studentName)}`);
  return response.data;
};

export const markTopicComplete = async (studentName, topicId) => {
  const response = await axios.post(`${API_URL}/topics/progress`, { studentName, topicId });
  return response.data;
};

export const unmarkTopicComplete = async (studentName, topicId) => {
  const response = await axios.delete(`${API_URL}/topics/progress`, { data: { studentName, topicId } });
  return response.data;
};

export const getTeacherTopicProgress = async (teacherId) => {
  const response = await axios.get(`${API_URL}/topics/teacher/${teacherId}`);
  return response.data;
};

export const deleteStudentByTeacher = async (id) => {
  const response = await axios.delete(`${API_URL}/teacher/student/${id}`);
  return response.data;
};

export const changeTeacherPassword = async (teacherId, currentPassword, newPassword) => {
  const response = await axios.post(`${API_URL}/auth/teacher/change-password`, { teacherId, currentPassword, newPassword });
  return response.data;
};
