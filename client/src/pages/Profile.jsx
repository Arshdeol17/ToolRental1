import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>Loading...</div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "2rem auto", padding: "2rem", background: "white", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
      <h1>My Profile</h1>

      {message && (
        <div style={{ padding: "1rem", marginBottom: "1rem", background: "#d4edda", color: "#155724", border: "1px solid #c3e6cb", borderRadius: "4px" }}>
          {message}
        </div>
      )}

      {!isEditing ? (
        <div>
          <div style={{ marginTop: "1rem" }}>
            <p style={{ margin: "0.75rem 0", fontSize: "1.1rem" }}>
              <strong>Name:</strong> {user.name}
            </p>
            <p style={{ margin: "0.75rem 0", fontSize: "1.1rem" }}>
              <strong>Email:</strong> {user.email}
            </p>
            <p style={{ margin: "0.75rem 0", fontSize: "1.1rem" }}>
              <strong>Phone:</strong> {user.phone || "Not provided"}
            </p>
            <p style={{ margin: "0.75rem 0", fontSize: "1.1rem" }}>
              <strong>Address:</strong> {user.address || "Not provided"}
            </p>
            <p style={{ margin: "0.75rem 0", fontSize: "1.1rem" }}>
              <strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>

          <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
            <button onClick={() => setIsEditing(true)} style={{ padding: "0.75rem 1.5rem", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Edit Profile
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "0.75rem 1.5rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Delete Account
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleUpdate}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Name:</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #ddd", borderRadius: "4px" }} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Email:</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #ddd", borderRadius: "4px" }} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Phone:</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #ddd", borderRadius: "4px" }} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Address:</label>
            <textarea name="address" value={formData.address} onChange={handleChange} rows="3" style={{ width: "100%", padding: "0.75rem", border: "1px solid #ddd", borderRadius: "4px" }} />
          </div>

          <h3>Change Password (Optional)</h3>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>Current Password:</label>
            <input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #ddd", borderRadius: "4px" }} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>New Password:</label>
            <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} style={{ width: "100%", padding: "0.75rem", border: "1px solid #ddd", borderRadius: "4px" }} />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
            <button type="submit" style={{ padding: "0.75rem 1.5rem", background: "#007bff", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Save Changes
            </button>
            <button type="button" onClick={() => setIsEditing(false)} style={{ padding: "0.75rem 1.5rem", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {showDeleteConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: "2rem", borderRadius: "8px", maxWidth: "400px" }}>
            <h2 style={{ marginTop: 0, color: "#dc3545" }}>Delete Account</h2>
            <p>This action cannot be undone. Enter your password to confirm:</p>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Enter password" style={{ width: "100%", padding: "0.75rem", margin: "1rem 0", border: "1px solid #ddd", borderRadius: "4px" }} />
            <div style={{ display: "flex", gap: "1rem" }}>
              <button onClick={handleDelete} style={{ padding: "0.75rem 1.5rem", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                Delete Account
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setDeletePassword(""); }} style={{ padding: "0.75rem 1.5rem", background: "#6c757d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
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