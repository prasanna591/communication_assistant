import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import TestAnalysis from "./pages/TestAnalysis";
import LearnCom from "./pages/learnCom";
import LevelDetails from "./pages/LevelDetails";
import Signup from "./components/Signup";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <Router>
      <div className="app-container">
        <div className="content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/test-analysis" element={<TestAnalysis />} />
            <Route path="/learn" element={<LearnCom />} />
            <Route path="/level/:levelId" element={<LevelDetails />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
