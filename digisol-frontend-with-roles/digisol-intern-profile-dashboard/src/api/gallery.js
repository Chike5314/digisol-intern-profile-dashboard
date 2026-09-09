import { apiRequest } from "./client";

export const getGalleryUploadUrl = ({ fileName, fileType, caption, visibility }, opts) =>
  apiRequest("/department/gallery", {
    method: "POST",
    body: { fileName, fileType, caption, visibility },
    ...opts,
  });

// New route — presigned S3 upload for an intern's avatar image.
// Two-step, same pattern as gallery upload: get a presigned URL + final avatarUrl,
// PUT the file straight to S3, then pass avatarUrl into addIntern().
export const getAvatarUploadUrl = ({ fileName, fileType }, opts) =>
  apiRequest("/department/avatar-upload-url", {
    method: "POST",
    body: { fileName, fileType },
    ...opts,
  });

export const uploadToS3 = async (uploadUrl, file) => {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload to storage failed");
};

export const updatePhotoCaption = (id, caption, opts) =>
  apiRequest(`/department/gallery/${id}`, { method: "PUT", body: { caption }, ...opts });
