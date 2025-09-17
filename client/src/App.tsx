import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Report from './pages/Report';
import Task from './pages/Task';

const App: React.FC = () => {
  return (
    <>
      <CssBaseline /> {/* ✅ Resets margin, padding, font smoothing, etc */}
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/report" element={<Report />} />
          <Route path="/task" element={<Task />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;
