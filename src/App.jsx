import React, { useState, useEffect } from "react";
import { 
  UserPlus, 
  Trash2, 
  Edit3, 
  Upload, 
  Briefcase, 
  GraduationCap, 
  Search, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

// Replace with your real deployed API Gateway URL (no trailing slash)
const API_URL = "https://j6wwoje443.execute-api.us-east-1.amazonaws.com/prod/";

export default function App() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    field: "",
    school: "",
    imageUrl: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/interns`);
      if (!res.ok) throw new Error("Failed to fetch interns");
      const data = await res.json();
      setInterns(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImageToS3 = async () => {
    if (!selectedFile) return formData.imageUrl;

    try {
      const presignedRes = await fetch(`${API_URL}/presigned-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: `${Date.now()}_${selectedFile.name}`,
          fileType: selectedFile.type,
        }),
      });

      if (!presignedRes.ok) throw new Error("Failed to get presigned URL");
      const { uploadUrl, imageUrl } = await presignedRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadRes.ok) throw new Error("Direct S3 image upload failed");
      return imageUrl;
    } catch (err) {
      showToast("Image upload failed", "error");
      return formData.imageUrl;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const uploadedImageUrl = await uploadImageToS3();
      const payload = { ...formData, imageUrl: uploadedImageUrl };

      if (editingId) {
        const res = await fetch(`${API_URL}/interns/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Update failed");
        showToast("Profile updated successfully!");
      } else {
        const res = await fetch(`${API_URL}/interns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Creation failed");
        showToast("New intern profile created!");
      }

      resetForm();
      fetchInterns();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (intern) => {
    setEditingId(intern.intern_id);
    setFormData({
      name: intern.name || "",
      field: intern.field || "",
      school: intern.school || "",
      imageUrl: intern.imageUrl || "",
    });
    setImagePreview(intern.imageUrl || "");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this profile?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/interns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Intern profile removed");
      fetchInterns();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", field: "", school: "", imageUrl: "" });
    setSelectedFile(null);
    setImagePreview("");
    setEditingId(null);
  };

  const filteredInterns = interns.filter((i) =>
    i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.field?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.school?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all animate-bounce ${
          toast.type === "error" 
            ? "bg-red-500/10 border-red-500/30 text-red-400" 
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        }`}>
          {toast.type === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 border-b border-slate-800/80 pb-8">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold tracking-wider uppercase mb-1">
            <Sparkles size={16} /> Digisol Engineering Dashboard
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            Intern Directory
          </h1>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by name, role, or school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          <button
            onClick={fetchInterns}
            disabled={loading}
            className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-100 hover:border-slate-700 transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Main Grid: Form + Card Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Panel (4 cols) */}
        <section className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl sticky top-8">
          <h2 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
            <UserPlus size={20} className="text-indigo-400" />
            {editingId ? "Update Profile" : "Register New Intern"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Specialization / Role
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Cloud Architecture"
                value={formData.field}
                onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Institution / University
              </label>
              <input
                type="text"
                required
                placeholder="e.g. University of Buea"
                value={formData.school}
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Profile Avatar Upload Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Profile Avatar
              </label>
              <div className="flex items-center gap-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-12 h-12 rounded-lg object-cover ring-2 ring-indigo-500/50"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-800/60 flex items-center justify-center text-slate-500">
                    <Upload size={20} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
              >
                {loading && <RefreshCw size={16} className="animate-spin" />}
                {editingId ? "Save Changes" : "Create Intern"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Display Grid (8 cols) */}
        <section className="lg:col-span-8">
          {filteredInterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-800/50 rounded-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 mb-4">
                <Briefcase size={28} />
              </div>
              <h3 className="text-lg font-semibold text-slate-300 mb-1">No Interns Found</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                {searchQuery ? "No profile matches your search query." : "Start by registering your first intern profile using the form."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredInterns.map((intern) => (
                <article
                  key={intern.intern_id}
                  className="group bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-5 shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <img
                        src={intern.imageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                        alt={intern.name}
                        className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-800 group-hover:ring-indigo-500/50 transition-all"
                      />
                      <div className="flex items-center gap-1 bg-slate-950/60 border border-slate-800/80 rounded-lg p-1">
                        <button
                          onClick={() => handleEdit(intern)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 rounded-md transition-all"
                          title="Edit Profile"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(intern.intern_id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 rounded-md transition-all"
                          title="Delete Profile"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {intern.name}
                    </h3>

                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium">
                        <Briefcase size={14} className="shrink-0" />
                        <span className="truncate">{intern.field || "Engineering"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <GraduationCap size={14} className="shrink-0 text-slate-500" />
                        <span className="truncate">{intern.school || "University"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>ID: {intern.intern_id ? `${intern.intern_id.slice(0, 8)}...` : "N/A"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans font-medium">
                      Active
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}