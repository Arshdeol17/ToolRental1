import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

function Profile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    currentPassword: "",
    newPassword: "",
  });
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch("http://localhost:5000/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setUser(data);
      setFormData({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        currentPassword: "",
        newPassword: "",
      });
    } catch (error) {
      console.error("Error:", error);
      navigate("/login");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }

      setMessage("Profile updated successfully!");
      setUser(data.user);
      setIsEditing(false);
      setFormData({ ...formData, currentPassword: "", newPassword: "" });
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/profile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete account");
      }

      localStorage.removeItem("token");
      alert("Account deleted successfully");
      navigate("/register");
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="profile-container">
      <h1>My Profile</h1>

      {message && <div className="message">{message}</div>}

      {!isEditing ? (
        <div className="profile-view">
          <div className="profile-info">
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Phone:</strong> {user.phone || "Not provided"}</p>
            <p><strong>Address:</strong> {user.address || "Not provided"}</p>
            <p><strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
          </div>

          <div className="profile-actions">
            <button onClick={() => setIsEditing(true)} className="btn-edit">
              Edit Profile
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-delete"
            >
              Delete Account
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="profile-form">
          <div className="form-group">
            <label>Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Address:</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows="3"
            />
          </div>

          <h3>Change Password (Optional)</h3>

          <div className="form-group">
            <label>Current Password:</label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>New Password:</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save">
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Delete Account</h2>
            <p>This action cannot be undone. Enter your password to confirm:</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter password"
              className="delete-input"
            />
            <div className="modal-actions">
              <button onClick={handleDelete} className="btn-confirm-delete">
                Delete Account
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword("");
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;