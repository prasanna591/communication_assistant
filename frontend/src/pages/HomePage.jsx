import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";
function HomePage() {
  return (
    <>
      <nav className="navbar">
        <ul className="nav-links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/test-analysis">Test Analysis</Link>
          </li>
          <li>
            <Link to="/learn">Learn</Link>
          </li>
        </ul>
        <span className="auth-btn">
          <button className="sign-btn">
            <Link to="/signup">signup</Link>
          </button>
          <button className="login-btn">
            <Link to="/login">login</Link>
          </button>
        </span>
      </nav>
      <div className="homepage-container">
        <header className="hero-section">
          <h1 className="hero-headline">
            Face Your Interviews with AI-Powered Feedback
          </h1>
          <p className="hero-subheadline">
            Practice your interview skills, get instant analysis on your
            communication, body language, and confidence, and land your dream
            job.
          </p>
          <br></br>
          <br></br>
          <Link to="/test-analysis" className="cta-button">
            Start Your Analysis Now
          </Link>
        </header>

        <section className="features-section">
          <h2 className="features-title">How Our Analysis Helps You</h2>
          <div className="features-grid">
            <div className="feature-item">
              <h3>Comprehensive Feedback</h3>
              <p>
                Receive detailed scores on speech pace, filler words, facial
                expressions, and body posture.
              </p>
            </div>
            <div className="feature-item">
              <h3>Boost Confidence</h3>
              <p>
                Identify areas for improvement and practice until you feel
                prepared and confident for any interview.
              </p>
            </div>
            <div className="feature-item">
              <h3>AI-Driven Insights</h3>
              <p>
                Leverage cutting-edge AI to understand how you come across and
                make targeted improvements.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default HomePage;
