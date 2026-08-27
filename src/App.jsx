import React, { useEffect, useMemo, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { withAuthenticator } from "@aws-amplify/ui-react";
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
  AlertCircle,
  Users,
  Building2,
  Activity,
  X,
  ChevronRight,
  ImagePlus,
  MoreVertical,
  ShieldCheck,
  LogOut,
} from "lucide-react";

// Replace with your real deployed API Gateway URL
const API_URL =
  "https://j6wwoje443.execute-api.us-east-1.amazonaws.com/prod";

function App({ signOut, user }) {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    field: "",
    school: "",
    imageUrl: "",
  });

  const authenticatedFetch = async (url, options = {}) => {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken?.toString();

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
      },
    });
  };

  // ─────────────────────────────────────────────
  // Toast
  // ─────────────────────────────────────────────

  const showToast = (message, type = "success") => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // ─────────────────────────────────────────────
  // Fetch interns
  // ─────────────────────────────────────────────

  useEffect(() => {
    fetchInterns();
  }, []);

  const fetchInterns = async () => {
    setLoading(true);

    try {
      const res = await authenticatedFetch(`${API_URL}/interns`);

      if (!res.ok) {
        throw new Error("Failed to fetch interns");
      }

      const data = await res.json();

      setInterns(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Image handling
  // ─────────────────────────────────────────────

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();

    const file = e.dataTransfer.files?.[0];

    if (!file || !file.type.startsWith("image/")) return;

    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImageToS3 = async () => {
    if (!selectedFile) {
      return formData.imageUrl;
    }

    try {
      const presignedRes = await authenticatedFetch(`${API_URL}/presigned-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: `${Date.now()}_${selectedFile.name}`,
          fileType: selectedFile.type,
        }),
      });

      if (!presignedRes.ok) {
        throw new Error("Failed to get presigned URL");
      }

      const { uploadUrl, imageUrl } = await presignedRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": selectedFile.type,
        },
        body: selectedFile,
      });

      if (!uploadRes.ok) {
        throw new Error("Direct S3 image upload failed");
      }

      return imageUrl;
    } catch (err) {
      showToast("Image upload failed", "error");
      return formData.imageUrl;
    }
  };

  // ─────────────────────────────────────────────
  // Form
  // ─────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast("Please enter the intern's name", "error");
      return;
    }

    if (!formData.field.trim()) {
      showToast("Please enter a specialization", "error");
      return;
    }

    if (!formData.school.trim()) {
      showToast("Please enter the institution", "error");
      return;
    }

    setLoading(true);

    try {
      const uploadedImageUrl = await uploadImageToS3();

      const payload = {
        ...formData,
        imageUrl: uploadedImageUrl,
      };

      if (editingId) {
        const res = await authenticatedFetch(`${API_URL}/interns/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Update failed");
        }

        showToast("Profile updated successfully");
      } else {
        const res = await authenticatedFetch(`${API_URL}/interns`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Creation failed");
        }

        showToast("New intern added successfully");
      }

      resetForm();
      setShowForm(false);
      await fetchInterns();
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
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setLoading(true);

    try {
      const res = await authenticatedFetch(`${API_URL}/interns/${deleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      showToast("Intern profile removed");
      setDeleteId(null);

      await fetchInterns();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      field: "",
      school: "",
      imageUrl: "",
    });

    setSelectedFile(null);
    setImagePreview("");
    setEditingId(null);
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  // ─────────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────────

  const filteredInterns = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return interns;

    return interns.filter((intern) => {
      return (
        intern.name?.toLowerCase().includes(query) ||
        intern.field?.toLowerCase().includes(query) ||
        intern.school?.toLowerCase().includes(query)
      );
    });
  }, [interns, searchQuery]);

  // ─────────────────────────────────────────────
  // Statistics
  // ─────────────────────────────────────────────

  const uniqueSchools = new Set(
    interns.map((intern) => intern.school).filter(Boolean)
  ).size;

  const uniqueFields = new Set(
    interns.map((intern) => intern.field).filter(Boolean)
  ).size;

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      {/* ─────────────────────────────────────────
          Toast
      ───────────────────────────────────────── */}

      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-[slideIn_.3s_ease-out]">
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl ${
              toast.type === "error"
                ? "border-red-200 bg-white text-red-600"
                : "border-emerald-200 bg-white text-emerald-600"
            }`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${
                toast.type === "error"
                  ? "bg-red-50"
                  : "bg-emerald-50"
              }`}
            >
              {toast.type === "error" ? (
                <AlertCircle size={19} />
              ) : (
                <CheckCircle2 size={19} />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold">
                {toast.type === "error" ? "Something went wrong" : "Success"}
              </p>
              <p className="text-xs text-slate-500">{toast.message}</p>
            </div>

            <button
              onClick={() => setToast(null)}
              className="ml-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          Navigation
      ───────────────────────────────────────── */}

      <aside className="fixed left-0 top-0 hidden h-screen w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center border-b border-slate-100 px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
                <Sparkles size={20} className="text-white" />
              </div>

              <div>
                <p className="text-base font-bold tracking-tight text-slate-900">
                  Digisol
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Engineering
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Workspace
            </p>

            <button className="flex w-full items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700">
              <Users size={18} />
              Intern Directory
            </button>

            <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
              <Activity size={18} />
              Activity
            </button>

            <button className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900">
              <Building2 size={18} />
              Institutions
            </button>
          </nav>

          {/* Bottom card */}
          <div className="p-4">
            <div className="rounded-2xl bg-slate-900 p-4 text-white">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck size={18} />
              </div>

              <p className="text-sm font-semibold">
                Internship Management
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-400">
                Keep your engineering talent directory organized and up to
                date.
              </p>
            </div>

            <button
              onClick={signOut}
              className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={17} />
              <span>Sign out</span>
              {user?.username && (
                <span className="ml-auto max-w-28 truncate text-xs text-slate-400">
                  {user.username}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────
          Main content
      ───────────────────────────────────────── */}

      <main className="lg:ml-64">
        {/* Mobile header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
              <Sparkles size={18} className="text-white" />
            </div>

            <span className="font-bold">Digisol</span>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white"
          >
            <UserPlus size={18} />
          </button>
        </div>

        <div className="mx-auto max-w-[1500px] px-5 py-8 md:px-8 lg:px-10 lg:py-10">
          {/* ─────────────────────────────────────
              Hero
          ───────────────────────────────────── */}

          <section className="mb-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                  <Sparkles size={14} />
                  Engineering Dashboard
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
                  Intern Directory
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500 md:text-base">
                  Manage your interns, track their specializations and keep
                  their profiles organized in one place.
                </p>
              </div>

              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="hidden items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700 lg:flex"
              >
                <UserPlus size={17} />
                Add Intern
              </button>
            </div>
          </section>

          {/* ─────────────────────────────────────
              Stats
          ───────────────────────────────────── */}

          <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<Users size={20} />}
              label="Total Interns"
              value={interns.length}
              description="Registered profiles"
              iconClass="bg-indigo-50 text-indigo-600"
            />

            <StatCard
              icon={<Briefcase size={20} />}
              label="Specializations"
              value={uniqueFields}
              description="Different fields"
              iconClass="bg-violet-50 text-violet-600"
            />

            <StatCard
              icon={<Building2 size={20} />}
              label="Institutions"
              value={uniqueSchools}
              description="Universities & schools"
              iconClass="bg-emerald-50 text-emerald-600"
            />
          </section>

          {/* ─────────────────────────────────────
              Directory toolbar
          ───────────────────────────────────── */}

          <section className="mb-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="relative flex-1 md:max-w-xl">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  placeholder="Search by name, specialization or institution..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
                />

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500 sm:block">
                  {filteredInterns.length}{" "}
                  {filteredInterns.length === 1 ? "profile" : "profiles"}
                </div>

                <button
                  onClick={fetchInterns}
                  disabled={loading}
                  className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 lg:hidden"
                >
                  <UserPlus size={16} />
                  Add
                </button>
              </div>
            </div>
          </section>

          {/* ─────────────────────────────────────
              Loading state
          ───────────────────────────────────── */}

          {loading && interns.length === 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <SkeletonCard key={item} />
              ))}
            </div>
          ) : filteredInterns.length === 0 ? (
            <EmptyState
              searchQuery={searchQuery}
              onAdd={() => {
                resetForm();
                setShowForm(true);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredInterns.map((intern) => (
                <InternCard
                  key={intern.intern_id}
                  intern={intern}
                  onEdit={() => handleEdit(intern)}
                  onDelete={() => setDeleteId(intern.intern_id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ─────────────────────────────────────────
          Form modal
      ───────────────────────────────────────── */}

      {showForm && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={closeForm}
          />

          <div className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur-xl">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-600">
                  {editingId ? "Edit profile" : "New profile"}
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {editingId
                    ? "Update intern profile"
                    : "Register an intern"}
                </h2>
              </div>

              <button
                onClick={closeForm}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Avatar */}
              <div className="mb-8 flex flex-col items-center">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="group relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-xl ring-1 ring-slate-200"
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <ImagePlus size={28} />
                      <span className="mt-1 text-[10px] font-semibold">
                        ADD PHOTO
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 opacity-0 transition group-hover:opacity-100">
                    <Upload size={22} className="text-white" />
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Click or drag an image here
                </p>
              </div>

              {/* Fields */}
              <div className="space-y-5">
                <FormField
                  label="Full Name"
                  required
                  icon={<Users size={17} />}
                >
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </FormField>

                <FormField
                  label="Specialization / Role"
                  required
                  icon={<Briefcase size={17} />}
                >
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineering"
                    value={formData.field}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        field: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </FormField>

                <FormField
                  label="Institution / University"
                  required
                  icon={<GraduationCap size={17} />}
                >
                  <input
                    type="text"
                    required
                    placeholder="e.g. University of Buea"
                    value={formData.school}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        school: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </FormField>
              </div>

              {/* Buttons */}
              <div className="mt-10 flex gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex flex-[1.5] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingId ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <UserPlus size={17} />
                      )}

                      {editingId ? "Save Changes" : "Create Profile"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          Delete modal
      ───────────────────────────────────────── */}

      {deleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>

            <h3 className="mt-5 text-xl font-bold text-slate-900">
              Delete this profile?
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This action will permanently remove the intern profile. This
              cannot be undone.
            </p>

            <div className="mt-7 flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "Deleting..." : "Delete Profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Small animation */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .form-input {
          width: 100%;
          height: 48px;
          border-radius: 12px;
          border: 1px solid rgb(226 232 240);
          background: rgb(248 250 252);
          padding: 0 14px;
          font-size: 14px;
          color: rgb(15 23 42);
          outline: none;
          transition: all 0.2s ease;
        }

        .form-input::placeholder {
          color: rgb(148 163 184);
        }

        .form-input:focus {
          border-color: rgb(129 140 248);
          background: white;
          box-shadow: 0 0 0 4px rgb(238 242 255);
        }
      `}</style>
    </div>
  );
}


// ─────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  description,
  iconClass,
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <ChevronRight
          size={17}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500"
        />
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <div className="mt-1 flex items-end gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </span>

          <span className="mb-1 text-xs text-slate-400">
            {description}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Form field
// ─────────────────────────────────────────────

function FormField({ label, icon, required, children }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        <span className="text-indigo-500">{icon}</span>
        {label}

        {required && (
          <span className="text-red-500">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// Intern card
// ─────────────────────────────────────────────

function InternCard({ intern, onEdit, onDelete }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/40">
      {/* Top accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={
                intern.imageUrl ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
              }
              alt={intern.name || "Intern"}
              className="h-16 w-16 rounded-2xl object-cover ring-4 ring-slate-50 transition group-hover:ring-indigo-50"
            />

            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-indigo-700">
              {intern.name || "Unnamed Intern"}
            </h3>

            <p className="mt-1 truncate text-xs font-medium text-indigo-600">
              {intern.field || "Engineering"}
            </p>
          </div>
        </div>

        <div className="relative flex gap-1">
          <button
            onClick={onEdit}
            title="Edit profile"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
          >
            <Edit3 size={16} />
          </button>

          <button
            onClick={onDelete}
            title="Delete profile"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="my-5 h-px bg-slate-100" />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            <GraduationCap size={16} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Institution
            </p>

            <p className="mt-0.5 truncate text-xs font-medium text-slate-700">
              {intern.school || "Not specified"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            <Briefcase size={16} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Specialization
            </p>

            <p className="mt-0.5 truncate text-xs font-medium text-slate-700">
              {intern.field || "Not specified"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          Active
        </span>

        <span className="font-mono text-[10px] text-slate-400">
          #{intern.intern_id?.slice(0, 8) || "N/A"}
        </span>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-slate-200" />

        <div className="flex-1">
          <div className="h-4 w-32 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
        </div>
      </div>

      <div className="my-5 h-px bg-slate-100" />

      <div className="space-y-4">
        <div className="h-9 rounded bg-slate-100" />
        <div className="h-9 rounded bg-slate-100" />
      </div>

      <div className="mt-5 h-7 rounded bg-slate-100" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────

function EmptyState({ searchQuery, onAdd }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-500">
        {searchQuery ? (
          <Search size={30} />
        ) : (
          <Users size={30} />
        )}
      </div>

      <h3 className="mt-6 text-lg font-bold text-slate-900">
        {searchQuery
          ? "No interns found"
          : "Your directory is empty"}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {searchQuery
          ? `We couldn't find any profiles matching "${searchQuery}". Try another search.`
          : "Start building your intern directory by adding your first profile."}
      </p>

      {!searchQuery && (
        <button
          onClick={onAdd}
          className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
        >
          <UserPlus size={17} />
          Add First Intern
        </button>
      )}
    </div>
  );
}

export default withAuthenticator(App);