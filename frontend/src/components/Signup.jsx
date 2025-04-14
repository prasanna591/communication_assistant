// SignupForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const response = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: "Account created successfully! Redirecting to login...",
          type: "success",
        });
        setFormData({ username: "", password: "", confirmPassword: "" });
        // Redirect to login page after successful signup
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setMessage({ text: data.message || "Signup failed", type: "error" });
      }
    } catch (error) {
      setMessage({
        text: "An error occurred during signup. Please try again.",
        type: "error",
      });
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Create an Account</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={errors.username ? "input-error" : ""}
            placeholder="Enter username"
            disabled={isLoading}
          />
          {errors.username && (
            <span className="error-message">{errors.username}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? "input-error" : ""}
            placeholder="Enter password"
            disabled={isLoading}
          />
          {errors.password && (
            <span className="error-message">{errors.password}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? "input-error" : ""}
            placeholder="Confirm password"
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <span className="error-message">{errors.confirmPassword}</span>
          )}
        </div>

        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="auth-redirect">
        Already have an account? <a href="/login">Log in</a>
      </div>
    </div>
  );
}

export default Signup;
