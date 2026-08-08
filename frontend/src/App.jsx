import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherLogin from './pages/TeacherLogin';
import StudentLogin from './pages/StudentLogin';
import TeacherAuth from './pages/TeacherAuth';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Landing from './pages/Landing';
import Onboarding from './components/Onboarding';
import AccountDeletion from './pages/AccountDeletion';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const isAuth = localStorage.getItem('teacherId') !== null;
  return isAuth ? children : <Navigate to="/ogretmen" />;
};

const StudentRoute = ({ children }) => {
  const isStudent = localStorage.getItem('studentName') !== null;
  return isStudent ? children : <Navigate to="/ogrenci" />;
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
            <Route path="/hesap-silme" element={<AccountDeletion />} />
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
