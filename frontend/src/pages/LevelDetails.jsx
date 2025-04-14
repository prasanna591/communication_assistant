import React from "react";
import { useParams, useLocation } from "react-router-dom";

import "./LevelDetails.css";

function LevelDetails() {
  const { levelId } = useParams();
  const location = useLocation();
  const levelData = location.state;

  if (!levelData) {
    return <div>No level data found.</div>;
  }

  return (
    <div className="level-details-container">
      <h1>
        Level {levelData.level}: {levelData.title}
      </h1>
      <div className="level-details-content">
        <div className="image-container">
          <img
            src={levelData.image}
            alt={levelData.alt}
            className="level-details-image"
          />
        </div>
        <div className="concepts-section">
          <h3>Key Concepts:</h3>
          <ul>
            {levelData.concepts.map((concept, index) => (
              <li key={index}>{concept}</li>
            ))}
          </ul>
        </div>

        <div className="resources-section">
          <h2>Learning Resources for Level {levelData.level}</h2>
          {levelData.videoUrl && (
            <div className="video-resource">
              <h3>Video Tutorial</h3>
              <div className="video-embed-container">
                <iframe
                  width="560"
                  height="315"
                  src={levelData.videoUrl}
                  title={`Level ${levelData.level} Video`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          )}

          {levelData.materials && levelData.materials.length > 0 && (
            <div className="material-resource">
              <h3>Supporting Materials</h3>
              <ul>
                {levelData.materials.map((material, index) => (
                  <li key={index}>
                    {material.url ? (
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {material.title}
                      </a>
                    ) : (
                      <p>
                        <strong>{material.title}:</strong> {material.content}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LevelDetails;
