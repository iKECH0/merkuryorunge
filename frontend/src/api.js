import axios from 'axios';

const API_URL = import.meta.env.PROD ? 'https://backend-kodivas-projects.vercel.app/api' : 'http://localhost:5000/api';

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
  const response = await axios.get(`${API_URL}/admin/stats`);
  return response.data;
};

export const downloadPlatformBackup = async () => {
  const response = await axios.get(`${API_URL}/admin/backup`);
  return response.data;
};

export const getDeletionRequests = async () => {
  const response = await axios.get(`${API_URL}/deletion-requests`);
  return response.data;
};

export const deleteDeletionRequest = async (id) => {
  const response = await axios.delete(`${API_URL}/deletion-requests/${id}`);
  return response.data;
};

export const approveTeacher = async (teacherId) => {
  const response = await axios.post(`${API_URL}/admin/approve-teacher`, { teacherId });
  return response.data;
};

export const deleteTeacher = async (teacherId) => {
  const response = await axios.delete(`${API_URL}/admin/teacher/${teacherId}`);
  return response.data;
};

export const updateStudent = async (studentId, className, schoolLevel, trackingDocumentKey, googleEmail, trackingDocumentUrl) => {
  const response = await axios.put(`${API_URL}/students/${studentId}`, { className, schoolLevel, trackingDocumentKey, googleEmail, trackingDocumentUrl });
  return response.data;
};

export const addTeacherByAdmin = async (fullName, username, password) => {
  const response = await axios.post(`${API_URL}/admin/add-teacher`, { fullName, username, password });
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
