import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import "./Dashboard.css";

import {
  Trophy,
  BookOpen,
  Zap,
  Users,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Loader2,
  TrendingUp,
} from "lucide-react"; // Assuming lucide-react is still desired for icons

// Mock data (remains the same)
const mockUserData = {
  name: "Prasanna",
  level: 10,
  progress: 25, // Percentage
  facialExpressionScore: 85,
  bodyLanguageScore: 78,
  speechQualityScore: 65,
  pacingScore: 70,
  badges: [
    {
      name: "First Steps",
      description: "Completed initial assessment",
      date: "2024-07-20",
    },
    {
      name: "Rising Star",
      description: "Reached Level 10",
      date: "2024-07-15",
    },
  ],
  recommendedCourses: [
    {
      id: "101",
      title: "Mastering Facial Expressions",
      description: "Learn to convey emotions effectively.",
    },
    {
      id: "102",
      title: "Effective Body Language",
      description: "Improve your non-verbal communication.",
    },
  ],
  completedCourses: [
    {
      id: "001",
      title: "Introduction to Communication Skills",
      date: "2024-07-10",
    },
  ],
  assessmentHistory: [
    {
      date: "2024-07-20",
      facialExpression: 80,
      bodyLanguage: 75,
      speechQuality: 90,
      pacing: 85,
    },
    {
      date: "2024-07-15",
      facialExpression: 85,
      bodyLanguage: 78,
      speechQuality: 92,
      pacing: 88,
    },
  ],
  communityMembers: 125,
  messages: 32,
};

// Animation variants (remains the same)
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Add state for dark mode preference if needed
  // const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setUserData(mockUserData);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="center-screen">
        <Loader2 className="loading-icon" />
        <span className="sr-only">Loading dashboard data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-screen error-message">
        <AlertTriangle />
        Error: {error}
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="center-screen no-data-message">No data available.</div>
    );
  }

  const getLevelTitle = (level) => {
    if (level < 10) return "Beginner";
    if (level < 20) return "Novice";
    if (level < 30) return "Intermediate";
    if (level < 40) return "Advanced";
    if (level < 50) return "Expert";
    if (level < 60) return "Master";
    if (level < 70) return "Grand Master";
    if (level < 80) return "Legend";
    if (level < 90) return "Mythic";
    return "Transcendent";
  };

  const overallScore =
    (userData.facialExpressionScore +
      userData.bodyLanguageScore +
      userData.speechQualityScore +
      userData.pacingScore) /
    4;

  const containerClass = "dashboard-container";

  return (
    <div className={containerClass}>
      <h1 className="dashboard-title">Welcome, {userData.name}!</h1>

      <div className="dashboard-grid">
        {/* Level and Progress Card */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
          {/* Add 'dark' class conditionally */}
          <div className="dashboard-card card-progress">
            <div className="card-header">
              <div className="card-title">
                <Trophy className="icon-yellow" />
                Your Progress
              </div>
              <div className="card-description">
                Level: {userData.level} ({getLevelTitle(userData.level)})
              </div>
            </div>
            <div className="card-content">
              {/* Custom Progress Bar */}
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${userData.progress}%` }}
                ></div>
              </div>
              <p className="progress-text">
                {userData.progress}% to Level {userData.level + 1}
              </p>
              <div>
                <button className="button button-yellow">
                  <Zap />
                  <Link to="/test-analysis">Boost Your Progress</Link>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overall Score Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          <div className="dashboard-card card-score">
            <div className="card-header">
              <div className="card-title">
                <TrendingUp className="icon-green" />
                Overall Score
              </div>
              <div className="card-description">Your Communication Skills</div>
            </div>
            <div className="card-content">
              <div className="score-value">{overallScore.toFixed(2)} / 100</div>
              <div className="score-grid">
                <div>Facial Expression: {userData.facialExpressionScore}</div>
                <div>Body Language: {userData.bodyLanguageScore}</div>
                <div>Speech Quality: {userData.speechQualityScore}</div>
                <div>Pacing: {userData.pacingScore}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recommended Course Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <div className="dashboard-card card-recommended">
            <div className="card-header">
              <div className="card-title">
                <BookOpen className="icon-red" />
                Recommended Course
              </div>
              <div className="card-description">Based on your progress</div>
            </div>
            <div className="card-content">
              {userData.recommendedCourses.length > 0 ? (
                <>
                  <h3 className="course-title">
                    {userData.recommendedCourses[0].title}
                  </h3>
                  <p className="course-description">
                    {userData.recommendedCourses[0].description}
                  </p>
                  <button className="button button-red">
                    <BookOpen />
                    <Link to="/learn">Enroll Now</Link>
                  </button>
                </>
              ) : (
                <p className="no-recommendation-text">
                  No courses recommended at this time.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Community Stats Card */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="md-col-span-2"
        >
          <div className="dashboard-card card-community">
            <div className="card-header">
              <div className="card-title">
                <Users className="icon-blue" />
                Community Stats
              </div>
              <div className="card-description">
                Connect with other learners
              </div>
            </div>
            <div className="card-content">
              <div className="community-grid">
                <div>
                  <div className="community-stat-value">
                    {userData.communityMembers}
                  </div>
                  <p className="community-stat-label">Members</p>
                </div>
                <div>
                  <div className="community-stat-value">
                    {userData.messages}
                  </div>
                  <p className="community-stat-label">Messages</p>
                </div>
                <div className="community-button-container">
                  <button className="button button-blue">
                    <MessageCircle />
                    Go to Community Forum
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Badges Card */}
        <motion.div variants={cardVariants} initial="hidden" animate="visible">
          <div className="dashboard-card card-badges">
            <div className="card-header">
              <div className="card-title">
                <Trophy className="icon-yellow" />
                Your Badges
              </div>
              <div className="card-description">Achievements</div>
            </div>
            {/* Use different content padding for this card */}
            <div className="card-content-badges">
              <div className="badges-list">
                {userData.badges.length > 0 ? (
                  userData.badges.map((badge, index) => (
                    <div key={index} className="badge-item">
                      <CheckCircle />
                      <div>
                        <div className="badge-name">{badge.name}</div>
                        <div className="badge-description">
                          {badge.description}
                        </div>
                        <div className="badge-date">Achieved: {badge.date}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-badges-text">No badges earned yet.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
