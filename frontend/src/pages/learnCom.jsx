import React from "react";
import "./LearnCommunication.css"; // Import CSS for styling
import { useNavigate, Link } from "react-router-dom"; // Import useNavigate

function LearnCom() {
  const levels = [
    {
      level: 1,
      title: "The Foundations of Communication",
      image: "/assets/lvl1.png",
      alt: "Diagram showing basic communication loop",
      concepts: [
        "What is Communication? (Sharing ideas, information, feelings)",
        "Why is Effective Communication Crucial? (Personal, Professional)",
        "Types: Verbal (Words) vs. Non-Verbal (Body Language, Tone)",
        "Introduction to Active Listening: Hearing vs. Understanding",
        "Basic Posture Awareness: Standing/Sitting Tall",
      ],
      videoUrl: "https://youtu.be/2Lkb7OSRdGE?si=iWm-ppLvmpyqLW8H", // Example video URL
      materials: [
        { title: "Level 1 Guide (PDF)", url: "/assets/level1_guide.pdf" },
        {
          title: "Active Listening Tips",
          content: "Focus fully on the speaker...",
        },
      ],
    },
    {
      level: 2,
      title: "Mastering Verbal Essentials",
      image: "/assets/lvl2.png",
      alt: "Speech bubble and sound wave icons",
      concepts: [
        "Clarity and Conciseness: Getting to the point",
        "Choosing Positive and Professional Language",
        "Introduction to Vocal Variety: Varying Pace and Volume slightly",
        "Recognizing and Reducing Filler Words (um, uh, like)",
        "Asking Clear Questions",
      ],
      videoUrl: "https://youtu.be/2zvvQj9ezWg?si=3SGLHP_smt6-Cju9", // Example video URL
      materials: [
        {
          title: "Positive Language Examples (PDF)",
          url: "/assets/level2_examples.pdf",
        },
        {
          title: "Tips for Concise Communication",
          content: "Start with the main point...",
        },
      ],
    },
    {
      level: 3,
      title: "Decoding Body Language Basics",
      image: "/assets/public.jpg",
      alt: "Illustrations of facial expressions and hand gestures",
      concepts: [
        "The Power of Non-Verbal Cues (Often speaks louder than words)",
        "Understanding Common Facial Expressions (Happiness, Surprise, Concern)",
        "The Importance of Eye Contact (Building trust, showing engagement)",
        "Basic Hand Gestures: Open palms vs. Closed fists/arms",
        "Personal Space Awareness (Proxemics Intro)",
      ],
      videoUrl: "https://www.youtube.com/embed/jOW9GzWgRbQ", // Example video URL
      materials: [
        {
          title: "Body Language Cheat Sheet (PDF)",
          url: "/assets/level3_cheatsheet.pdf",
        },
        {
          title: "Understanding Facial Expressions",
          content: "A smile often indicates...",
        },
      ],
    },
    {
      level: 4,
      title: "Enhancing Your Vocal Delivery",
      image: "/assets/general.jpg",
      alt: "Graph showing vocal pitch variation",
      concepts: [
        "Tone of Voice: Matching your tone to your message (Enthusiasm, Seriousness)",
        "Pitch Variation: Avoiding monotone delivery",
        "Pacing: Using speed strategically (Slowing down for emphasis)",
        "The Power of the Pause: Using silence for impact",
        "Articulation and Enunciation: Speaking clearly",
      ],
      videoUrl: "https://www.youtube.com/embed/l1cq1GzXg4U", // Example video URL
      materials: [
        {
          title: "Vocal Delivery Exercises (PDF)",
          url: "/assets/level4_exercises.pdf",
        },
        {
          title: "Tips for Clear Articulation",
          content: "Speak at a moderate pace...",
        },
      ],
    },
    {
      level: 5,
      title: "Advanced Body Language & Confident Posture",
      image: "/assets/presentation.jpg",
      alt: "Illustration comparing slumped vs. confident posture",
      concepts: [
        "Projecting Confidence Through Posture (Shoulders back, spine aligned)",
        "Mirroring and Rapport Building (Subtle reflection of others)",
        "Understanding Micro-expressions (Fleeting, involuntary expressions)",
        "Purposeful Gestures: Using hands to illustrate points effectively",
        "Managing Nervous Habits (Fidgeting, tapping)",
      ],
      videoUrl: "https://www.youtube.com/embed/y6iPHFC-1_I", // Example video URL
      materials: [
        {
          title: "Building Confidence Through Body Language (PDF)",
          url: "/assets/level5_confidence.pdf",
        },
        {
          title: "Recognizing Micro-expressions",
          content: "Look for fleeting changes in facial expression...",
        },
      ],
    },
    {
      level: 6,
      title: "Integrated Communication Strategies",
      image: "/assets/symbol.jpg",
      alt: "Diverse group of people communicating effectively",
      concepts: [
        "Adapting Your Style: Tailoring communication to your audience",
        "Structuring Your Message: Using frameworks (e.g., STAR for interviews)",
        "Handling Difficult Conversations and Questions Gracefully",
        "Giving and Receiving Constructive Feedback",
        "Storytelling for Impact: Engaging your listeners",
        "Effective Virtual Communication Nuances (Camera presence, background)",
      ],
      videoUrl: "https://www.youtube.com/embed/yY75zZ9j9aw", // Example video URL
      materials: [
        {
          title: "Effective Communication Strategies Guide (PDF)",
          url: "/assets/level6_strategies.pdf",
        },
        {
          title: "Tips for Handling Difficult Conversations",
          content: "Stay calm and listen actively...",
        },
      ],
    },
  ];

  const navigate = useNavigate(); // Get the navigate function

  const handleCardClick = (levelData) => {
    navigate(`/level/${levelData.level}`, { state: levelData }); // Navigate to the level details page and pass data
  };

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
      </nav>
      <div className="learn-container">
        <h1>Learn and Improve Your Communication Skills</h1>
        <p className="learn-intro">
          Effective communication is key to success in all aspects of life.
          These levels will guide you from the fundamentals to more advanced
          strategies, covering verbal delivery, voice modulation, body language,
          and posture.
        </p>

        <div className="levels-wrapper">
          {levels.map((item) => (
            <div
              key={item.level}
              className="level-card"
              onClick={() => handleCardClick(item)} // Add onClick handler
              style={{ cursor: "pointer" }} // Optional: Add a pointer cursor for better UX
            >
              <h2>
                Level {item.level}: {item.title}
              </h2>
              <div className="image-container">
                <img
                  src={item.image}
                  alt={item.alt}
                  className="level-image"
                  loading="lazy" // Add lazy loading for images below the fold
                />
              </div>
              <div className="level-content">
                <h3>Key Concepts:</h3>
                <ul>
                  {item.concepts.map((concept, index) => (
                    <li key={index}>{concept}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default LearnCom; // Ensure correct export name
