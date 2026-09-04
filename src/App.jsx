import React, { useState, useEffect } from "react";
import { withAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth";
import { Globe, Lock, LogOut, UserPlus, Upload, Trash2, X, Eye, EyeOff } from "lucide-react";

// Paste your ApiEndpointUrl output from cdk deploy here
const API_URL = "https://56rud9cawg.execute-api.us-east-1.amazonaws.com/prod";

function App({ signOut, user }) {
  const [activeTab, setActiveTab] = useState("public-feed");
  const [publicFeed, setPublicFeed] = useState([]);
  const [deptWorkspace, setDeptWorkspace] = useState([]);
  const [userAttrs, setUserAttrs] = useState({ department: "General", role: "LEAD" });

  // Modals
  const [showInternModal, setShowInternModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Forms
  const [internForm, setInternForm] = useState({ name: "", role: "", institution: "", visibility: "PRIVATE" });
  const [photoForm, setPhotoForm] = useState({ caption: "", file: null, visibility: "PRIVATE" });
  const [submitting, setSubmitting] = useState(false);

  // Get Auth Token
  const getAuthToken = async () => {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  };

  // Fetch Cognito Attributes safely
  useEffect(() => {
    async function loadAttributes() {
      try {
        const attrs = await fetchUserAttributes();
        setUserAttrs({
          department: attrs["custom:department"] || "General",
          role: attrs["custom:role"] || "LEAD"
        });
      } catch (err) {
        console.error("Error loading user attributes:", err);
      }
    }
    loadAttributes();
  }, []);

  const fetchPublicFeed = async () => {
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/public-feed`, { headers });
      if (!res.ok) throw new Error("Failed to fetch public feed");
      const data = await res.json();
      setPublicFeed(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching public feed:", err);
    }
  };

  const fetchDeptWorkspace = async () => {
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/department/workspace`, { headers });
      if (!res.ok) throw new Error("Failed to fetch workspace");
      const data = await res.json();
      setDeptWorkspace(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching workspace:", err);
    }
  };

  useEffect(() => {
    fetchPublicFeed();
    fetchDeptWorkspace();
  }, []);

  // Handlers
  const handleToggleVisibility = async (item) => {
    const id = item.id || item.intern_id;
    const currentVis = item.visibility;
    const newVis = currentVis === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    const token = await getAuthToken();
    const res = await fetch(`${API_URL}/department/visibility`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id,
        type: item.type === "PHOTO" ? "IMAGE" : "INTERN_PROFILE",
        visibility: newVis
      })
    });
    if (!res.ok) {
      console.error("Failed to update visibility status");
      return;
    }
    fetchDeptWorkspace();
    fetchPublicFeed();
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    const token = await getAuthToken();
    if (item.type !== "PROFILE") return;
    const endpoint = `${API_URL}/department/interns/${item.id}`;
    const options = { method: "DELETE", headers: { Authorization: `Bearer ${token}` } };
    await fetch(endpoint, {
      ...options,
    });
    fetchDeptWorkspace();
    fetchPublicFeed();
  };

  const handleAddIntern = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = await getAuthToken();
      await fetch(`${API_URL}/department/interns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: internForm.name,
          field: internForm.role,
          school: internForm.institution
        })
      });
      setShowInternModal(false);
      setInternForm({ name: "", role: "", institution: "", visibility: "PRIVATE" });
      fetchDeptWorkspace();
      fetchPublicFeed();
    } catch (err) {
      alert("Error creating profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadPhoto = async (e) => {
    e.preventDefault();
    if (!photoForm.file) return alert("Select an image first");
    setSubmitting(true);

    try {
      const token = await getAuthToken();

      // 1. Get Presigned S3 URL
      const presignedRes = await fetch(`${API_URL}/department/gallery`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fileName: photoForm.file.name,
          fileType: photoForm.file.type,
          caption: photoForm.caption,
          visibility: photoForm.visibility
        })
      });

      const { uploadUrl } = await presignedRes.json();

      // 2. Direct S3 Upload
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": photoForm.file.type },
        body: photoForm.file
      });

      setShowPhotoModal(false);
      setPhotoForm({ caption: "", file: null, visibility: "PRIVATE" });
      fetchDeptWorkspace();
      fetchPublicFeed();
    } catch (err) {
      alert("Error uploading image");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">D</div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none">Digisol Portal</h1>
              <span className="text-xs text-slate-400 font-medium">{userAttrs.department}</span>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-400 px-3">General Space</p>
            <button
              onClick={() => setActiveTab("public-feed")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === "public-feed" ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Globe size={18} />
              <span>Public Feed</span>
            </button>

            <p className="text-[10px] font-bold uppercase text-slate-400 px-3 pt-4">Department Space</p>
            <button
              onClick={() => setActiveTab("dept-workspace")}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === "dept-workspace" ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Lock size={18} />
              <span>My Workspace</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <div className="px-2">
            <p className="text-xs text-slate-400">Department Role</p>
            <p className="text-sm font-bold text-slate-800">👑 {userAttrs.role}</p>
          </div>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-100">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === "public-feed" ? (
          <div>
            <h2 className="text-2xl font-bold mb-1">Public Gallery Feed</h2>
            <p className="text-sm text-slate-500 mb-6">Shared internship photos and profiles from all departments.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {publicFeed.map((item) => (
                <div key={item.id || item.intern_id} className="rounded-2xl border bg-white p-5 shadow-sm">
                  {item.type === "PHOTO" ? (
                    <div>
                      <img src={item.imageUrl} alt={item.caption} className="h-48 w-full object-cover rounded-xl" />
                      <p className="mt-2 text-xs font-semibold text-slate-600">{item.caption}</p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-bold text-slate-900">{item.name}</h3>
                      <p className="text-xs text-indigo-600">{item.field}</p>
                      <p className="text-xs text-slate-400 mt-2">{item.school}</p>
                    </div>
                  )}
                  <span className="mt-4 inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">
                    Dept: {item.department}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{userAttrs.department} Workspace</h2>
                <p className="text-sm text-slate-500">Manage internal profiles, S3 images, and visibility settings.</p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowPhotoModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800">
                  <Upload size={16} /> Upload Photo
                </button>
                <button onClick={() => setShowInternModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700">
                  <UserPlus size={16} /> Add Intern
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {deptWorkspace.map((item) => (
                <div key={item.id || item.intern_id} className="rounded-2xl border bg-white p-5 shadow-sm flex flex-col justify-between">
                  {item.type === "PHOTO" ? (
                    <div>
                      <img src={item.imageUrl} alt={item.caption} className="h-48 w-full object-cover rounded-xl" />
                      <p className="mt-2 text-xs font-semibold text-slate-600">{item.caption}</p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-bold text-slate-900">{item.name}</h3>
                      <p className="text-xs text-indigo-600">{item.field}</p>
                      <p className="text-xs text-slate-400 mt-2">{item.school}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t flex justify-between items-center">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.visibility === "PUBLIC" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {item.visibility}
                    </span>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggleVisibility(item)} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-semibold">
                        {item.visibility === "PUBLIC" ? <EyeOff size={14} /> : <Eye size={14} />}
                        {item.visibility === "PUBLIC" ? "Make Private" : "Publish"}
                      </button>
                      {item.type === "PROFILE" && (
                        <button onClick={() => handleDeleteItem(item)} className="p-1.5 text-slate-400 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Add Intern */}
      {showInternModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Add Department Intern</h3>
              <button onClick={() => setShowInternModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddIntern} className="mt-4 space-y-3">
              <input type="text" placeholder="Full Name" required value={internForm.name} onChange={e => setInternForm({...internForm, name: e.target.value})} className="w-full rounded-xl border p-2.5 text-sm outline-none" />
              <input type="text" placeholder="Role / Specialization" required value={internForm.role} onChange={e => setInternForm({...internForm, role: e.target.value})} className="w-full rounded-xl border p-2.5 text-sm outline-none" />
              <input type="text" placeholder="Institution" required value={internForm.institution} onChange={e => setInternForm({...internForm, institution: e.target.value})} className="w-full rounded-xl border p-2.5 text-sm outline-none" />
              <select value={internForm.visibility} onChange={e => setInternForm({...internForm, visibility: e.target.value})} className="w-full rounded-xl border p-2.5 text-sm outline-none">
                <option value="PRIVATE">Keep Private to Department</option>
                <option value="PUBLIC">Publish Directly to General Feed</option>
              </select>
              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-indigo-700">
                {submitting ? "Saving..." : "Create Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload Photo */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-900">Upload Department Photo</h3>
              <button onClick={() => setShowPhotoModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleUploadPhoto} className="mt-4 space-y-3">
              <input type="file" accept="image/*" required onChange={e => setPhotoForm({...photoForm, file: e.target.files[0]})} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700" />
              <input type="text" placeholder="Caption / Description" value={photoForm.caption} onChange={e => setPhotoForm({...photoForm, caption: e.target.value})} className="w-full rounded-xl border p-2.5 text-sm outline-none" />
              <select value={photoForm.visibility} onChange={e => setPhotoForm({...photoForm, visibility: e.target.value})} className="w-full rounded-xl border p-2.5 text-sm outline-none">
                <option value="PRIVATE">Keep Private to Department</option>
                <option value="PUBLIC">Publish Directly to General Feed</option>
              </select>
              <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-slate-800">
                {submitting ? "Uploading..." : "Upload Image"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuthenticator(App, {
  signUpAttributes: ["email"],
  formFields: {
    signUp: {
      "custom:department": {
        order: 1,
        placeholder: "Enter Department Name (e.g. SoftwareEngineering)",
        label: "Department Name",
        isRequired: true,
      },
      "custom:role": {
        order: 2,
        placeholder: "Role (LEAD or MEMBER)",
        label: "Role",
        isRequired: true,
      },
    },
  },
});