import { useCallback, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { AppShell } from "./layout/AppShell";
import { PublicFeedView } from "./feed/PublicFeedView";
import { WorkspaceView } from "./feed/WorkspaceView";
import { PendingApprovalsPanel } from "./feed/PendingApprovalsPanel";
import { AddInternModal } from "./modals/AddInternModal";
import { UploadPhotoModal } from "./modals/UploadPhotoModal";
import { EditInternModal } from "./modals/EditInternModal";
import { EditPhotoModal } from "./modals/EditPhotoModal";
import { useToast } from "./ui/ToastProvider";

import { useApi } from "../hooks/useApi";
import { usePublicFeed } from "../hooks/usePublicFeed";
import { useWorkspace } from "../hooks/useWorkspace";

import { addIntern, deleteIntern, setVisibility, updateIntern } from "../api/interns";
import { getGalleryUploadUrl, getAvatarUploadUrl, uploadToS3, updatePhotoCaption } from "../api/gallery";

export function DashboardContent({ signOut, department, role }) {
  const toast = useToast();
  const api = useApi(signOut);
  const isVisitor = role === "VISITOR";
  const isLead = role === "LEAD";

  const publicFeed = usePublicFeed(api);
  const workspace = useWorkspace(api);

  const [showInternModal, setShowInternModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editingIntern, setEditingIntern] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const refetchAll = useCallback(() => {
    publicFeed.refetch();
    workspace.refetch();
  }, [publicFeed, workspace]);

  const handleToggleVisibility = async (item) => {
    const newVis = item.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    try {
      await api(setVisibility, { id: item.id, visibility: newVis });
      toast.success(newVis === "PUBLIC" ? "Published to the public feed" : "Made private");
      refetchAll();
    } catch (err) {
      toast.error(err.message || "Failed to update visibility");
    }
  };

  const handleDeleteItem = async (item) => {
    try {
      await api(deleteIntern, item.id);
      toast.success(item.type === "PHOTO" ? "Photo deleted" : "Profile deleted");
      refetchAll();
    } catch (err) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  const handleEditItem = (item) => {
    if (item.type === "PHOTO") {
      setEditingPhoto(item);
    } else {
      setEditingIntern(item);
    }
  };

  const handleAddIntern = async (form) => {
    setSubmitting(true);
    try {
      let avatarUrl;
      if (form.avatarFile) {
        const { uploadUrl, avatarUrl: finalUrl } = await api(getAvatarUploadUrl, {
          fileName: form.avatarFile.name,
          fileType: form.avatarFile.type,
        });
        await uploadToS3(uploadUrl, form.avatarFile);
        avatarUrl = finalUrl;
      }

      await api(addIntern, {
        name: form.name,
        field: form.role,
        school: form.institution,
        visibility: form.visibility,
        avatarUrl,
      });
      setShowInternModal(false);
      toast.success("Intern profile created");
      refetchAll();
    } catch (err) {
      toast.error(err.message || "Error creating profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateIntern = async (form) => {
    setSubmitting(true);
    try {
      let avatarUrl;
      if (form.avatarFile) {
        const { uploadUrl, avatarUrl: finalUrl } = await api(getAvatarUploadUrl, {
          fileName: form.avatarFile.name,
          fileType: form.avatarFile.type,
        });
        await uploadToS3(uploadUrl, form.avatarFile);
        avatarUrl = finalUrl;
      }

      await api(updateIntern, editingIntern.id, {
        name: form.name,
        field: form.role,
        school: form.institution,
        ...(avatarUrl ? { avatarUrl } : {}),
      });
      setEditingIntern(null);
      toast.success("Profile updated");
      refetchAll();
    } catch (err) {
      toast.error(err.message || "Error updating profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadPhoto = async (form) => {
    setSubmitting(true);
    try {
      const { uploadUrl } = await api(getGalleryUploadUrl, {
        fileName: form.file.name,
        fileType: form.file.type,
        caption: form.caption,
        visibility: form.visibility,
      });
      await uploadToS3(uploadUrl, form.file);
      setShowPhotoModal(false);
      toast.success("Photo uploaded");
      refetchAll();
    } catch (err) {
      toast.error(err.message || "Error uploading image");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePhoto = async (form) => {
    setSubmitting(true);
    try {
      await api(updatePhotoCaption, editingPhoto.id, form.caption);
      setEditingPhoto(null);
      toast.success("Caption updated");
      refetchAll();
    } catch (err) {
      toast.error(err.message || "Error updating caption");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell department={department} role={role} signOut={signOut}>
      <Routes>
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<PublicFeedView feed={publicFeed.feed} status={publicFeed.status} />} />
        <Route
          path="/workspace"
          element={
            isVisitor ? (
              <Navigate to="/feed" replace />
            ) : (
              <WorkspaceView
                department={department}
                role={role}
                items={workspace.items}
                status={workspace.status}
                onOpenAddIntern={() => setShowInternModal(true)}
                onOpenUploadPhoto={() => setShowPhotoModal(true)}
                onToggleVisibility={handleToggleVisibility}
                onDeleteItem={handleDeleteItem}
                onEditItem={handleEditItem}
              />
            )
          }
        />
        <Route
          path="/approvals"
          element={isLead ? <PendingApprovalsPanel api={api} /> : <Navigate to="/feed" replace />}
        />
      </Routes>

      {showInternModal && (
        <AddInternModal onClose={() => setShowInternModal(false)} onSubmit={handleAddIntern} submitting={submitting} />
      )}
      {showPhotoModal && (
        <UploadPhotoModal onClose={() => setShowPhotoModal(false)} onSubmit={handleUploadPhoto} submitting={submitting} />
      )}
      {editingIntern && (
        <EditInternModal
          item={editingIntern}
          onClose={() => setEditingIntern(null)}
          onSubmit={handleUpdateIntern}
          submitting={submitting}
        />
      )}
      {editingPhoto && (
        <EditPhotoModal
          item={editingPhoto}
          onClose={() => setEditingPhoto(null)}
          onSubmit={handleUpdatePhoto}
          submitting={submitting}
        />
      )}
    </AppShell>
  );
}
