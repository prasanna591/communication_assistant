import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css"; // Keep your existing CSS file

function HomePage() {
  return (
    <div className="home-page">
      {/* Main navigation bar */}
      <nav className="dashboard-navbar">
        <div className="nav-container">
          <Link to="/" className="logo">
            AI Communication Coach
          </Link>
          <ul className="nav-links">
            <li>
              <Link to="/dashboard" className="active">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/test-analysis">Performance Analysis</Link>
            </li>
            <li>
              <Link to="/learn">Learn & Improve</Link>
            </li>
          </ul>
          <div className="auth-buttons">
            <button className="logout-button">Logout</button>
          </div>
        </div>
      </nav>

      <div className="homepage-container">
        {/* Hero section */}
        <header className="hero-section">
          <div className="hero-content">
            <h1 className="hero-headline">
              Master Communication for Interviews, Presentations, and Beyond
            </h1>
            <p className="hero-subheadline">
              Unlock your full potential with AI-powered feedback on your
              speaking skills, body language, and overall confidence for both
              personal and professional growth.
            </p>
            <Link to="/test-analysis" className="cta-button">
              Start Your Journey
            </Link>
          </div>
        </header>

        {/* Features section */}
        <section className="features-section">
          <h2 className="features-title">Enhance Your Communication Skills</h2>
          <div className="features-grid">
            <div className="feature-item">
              <h3>Identify Key Improvement Areas</h3>
              <p>
                Get detailed analysis on your voice clarity, speaking pace,
                gestures, and eye contact, helping you focus on the most
                impactful areas.
              </p>
            </div>
            <div className="feature-item">
              <h3>Boost Confidence for Any Occasion</h3>
              <p>
                Practice in a safe, supportive environment, monitor your
                progress over time, and gain the confidence you need for
                interviews, presentations, and everyday conversations.
              </p>
            </div>
            <div className="feature-item">
              <h3>Leverage Data-Driven Insights</h3>
              <p>
                Our advanced AI technology offers objective feedback, giving you
                actionable recommendations to continuously improve your
                communication effectiveness.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HomePage;
