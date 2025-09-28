import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Task from './pages/Task';
import Quiz from './pages/Quiz';
import Profile from './pages/Profile';

const App: React.FC = () => {
  return (
    <>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report" element={<Report />} />
          <Route path="/task" element={<Task />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
