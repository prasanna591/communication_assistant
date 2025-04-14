import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
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
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
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
      const response = await fetch("http://localhost:5000/api/auth/login", {
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
        // Store token in localStorage or use a better state management solution
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("isLoggedIn", "true");

        setMessage({
          text: "Login successful! Redirecting...",
          type: "success",
        });
        // Redirect to dashboard
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        setMessage({
          text: data.message || "Invalid username or password",
          type: "error",
        });
      }
    } catch (error) {
      setMessage({
        text: "An error occurred during login. Please try again.",
        type: "error",
      });
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Log In</h2>

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

        <div className="form-option">
          <label>
            <input type="checkbox" name="remember" />
            Remember me
          </label>
          <a href="/forgot-password" className="forgot-password">
            Forgot password?
          </a>
        </div>

        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? "Logging In..." : "Log In"}
        </button>
      </form>

      {message.text && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}

      <div className="auth-redirect">
        Don't have an account? <a href="/signup">Sign up</a>
      </div>
    </div>
  );
}

export default Login;
