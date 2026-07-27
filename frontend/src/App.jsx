import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherLogin from './pages/TeacherLogin';
import StudentLogin from './pages/StudentLogin';
import TeacherAuth from './pages/TeacherAuth';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Landing from './pages/Landing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Onboarding from './components/Onboarding';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem('teacherId') !== null;
  return isAuth ? children : <Navigate to="/ogretmen" />;
};

const StudentRoute = ({ children }) => {
  const isStudent = localStorage.getItem('studentName') !== null;
  return isStudent ? children : <Navigate to="/ogrenci" />;
};

// Catches URL-encoded Turkish characters like %C4%B1 (ı) and redirects properly
const GizlilikRedirect = () => {
  const path = decodeURIComponent(window.location.pathname).toLowerCase();
  if (path.includes('gizlilik')) {
    return <PrivacyPolicy />;
  }
  return <Navigate to="/" />;
};

function App() {
  const [studentName, setStudentName] = useState(localStorage.getItem('studentName'));
  const [studentUsername, setStudentUsername] = useState(localStorage.getItem('studentUsername'));

  const handleStudentLogin = (fullName, username) => {
    localStorage.setItem('studentName', fullName);
    localStorage.setItem('studentUsername', username);
    setStudentName(fullName);
    setStudentUsername(username);
  };

  return (
    <Router>
      <div className="app-wrapper">
        <main className="container">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route 
              path="/ogrenci" 
              element={studentName ? <Navigate to="/" /> : <StudentLogin onLogin={handleStudentLogin} />} 
            />
            <Route 
              path="/dashboard"
              element={
                <StudentRoute>
                  <StudentDashboard studentName={studentName} />
                </StudentRoute>
              } 
            />
            <Route path="/teacher-login" element={<TeacherLogin />} />
            <Route path="/ogretmen" element={<TeacherAuth />} />
            <Route 
              path="/teacher" 
              element={
                <ProtectedRoute>
                  <TeacherDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/super-admin" element={<SuperAdminDashboard />} />
            <Route path="/gizlilikpolitikasi" element={<PrivacyPolicy />} />
            <Route path="/gizlilik-politikasi" element={<PrivacyPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<GizlilikRedirect />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
