"use strict";


/* =========================
   FIREBASE
========================= */

import {
  auth,
  db,
  storage
} from "./template-firebase.js?v=3";


import {
  onAuthStateChanged,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";


import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";


import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-storage.js";


/* =========================
   PAGE ELEMENTS
========================= */

const adminLoadingPanel =
  document.getElementById(
    "adminLoadingPanel"
  );

const adminDeniedPanel =
  document.getElementById(
    "adminDeniedPanel"
  );

const adminDashboard =
  document.getElementById(
    "adminDashboard"
  );

const adminEmail =
  document.getElementById(
    "adminEmail"
  );

const adminLogoutButton =
  document.getElementById(
    "adminLogoutButton"
  );


const photoUploadForm =
  document.getElementById(
    "photoUploadForm"
  );

const photoUploadMessage =
  document.getElementById(
    "photoUploadMessage"
  );


const videoUploadForm =
  document.getElementById(
    "videoUploadForm"
  );

const videoUploadMessage =
  document.getElementById(
    "videoUploadMessage"
  );


const merchandiseForm =
  document.getElementById(
    "merchandiseForm"
  );

const merchandiseMessage =
  document.getElementById(
    "merchandiseMessage"
  );


const adminContentList =
  document.getElementById(
    "adminContentList"
  );


/* =========================
   CONSTANTS
========================= */

const MAX_PHOTO_SIZE =
  15 * 1024 * 1024;

const MAX_VIDEO_SIZE =
  500 * 1024 * 1024;

const MAX_PRODUCT_IMAGE_SIZE =
  15 * 1024 * 1024;


/* =========================
   GENERAL HELPERS
========================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function makeSafeFileName(fileName) {

  const extension =
    fileName.includes(".")
      ? fileName
          .split(".")
          .pop()
          .toLowerCase()
      : "";

  const baseName =
    fileName
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const safeBaseName =
    baseName || "upload";

  const uniquePart =
    `${Date.now()}-${crypto.randomUUID()}`;

  return extension
    ? `${uniquePart}-${safeBaseName}.${extension}`
    : `${uniquePart}-${safeBaseName}`;

}


function showMessage(
  element,
  message,
  type = "normal"
) {

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.classList.remove(
    "success-message",
    "error-message"
  );

  if (type === "success") {

    element.classList.add(
      "success-message"
    );

  }

  if (type === "error") {

    element.classList.add(
      "error-message"
    );

  }

}


function setFormDisabled(
  form,
  disabled
) {

  if (!form) {
    return;
  }

  const controls =
    form.querySelectorAll(
      "input, textarea, select, button"
    );

  controls.forEach(
    (control) => {

      control.disabled =
        disabled;

    }
  );

}


function formatFileSize(bytes) {

  const number =
    Number(bytes || 0);

  if (number < 1024) {

    return `${number} B`;

  }

  if (number < 1024 * 1024) {

    return `${(
      number / 1024
    ).toFixed(1)} KB`;

  }

  if (
    number <
    1024 * 1024 * 1024
  ) {

    return `${(
      number /
      1024 /
      1024
    ).toFixed(1)} MB`;

  }

  return `${(
    number /
    1024 /
    1024 /
    1024
  ).toFixed(2)} GB`;

}


function formatPrice(price) {

  return new Intl
    .NumberFormat(
      "en-GB",
      {
        style: "currency",
        currency: "GBP"
      }
    )
    .format(
      Number(price || 0)
    );

}


function validateFile({
  file,
  allowedTypes,
  maximumSize,
  label
}) {

  if (!file) {

    throw new Error(
      `Please select a ${label}.`
    );

  }

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {

    throw new Error(
      `That ${label} file type is not supported.`
    );

  }

  if (
    file.size >
    maximumSize
  ) {

    throw new Error(
      `${label} must be smaller than ${formatFileSize(maximumSize)}.`
    );

  }

}


/* =========================
   STORAGE UPLOAD
========================= */

function uploadFileWithProgress({
  file,
  storageFolder,
  messageElement
}) {

  return new Promise(
    (
      resolve,
      reject
    ) => {

      const safeFileName =
        makeSafeFileName(
          file.name
        );

      const storagePath =
        `${storageFolder}/${safeFileName}`;

      const storageReference =
        ref(
          storage,
          storagePath
        );

      const metadata = {
        contentType:
          file.type
      };

      const uploadTask =
        uploadBytesResumable(
          storageReference,
          file,
          metadata
        );

      uploadTask.on(
        "state_changed",

        (snapshot) => {

          const progress =
            Math.round(
              (
                snapshot.bytesTransferred /
                snapshot.totalBytes
              ) * 100
            );

          showMessage(
            messageElement,
            `Uploading: ${progress}%`
          );

        },

     (error) => {

  console.error(
    "Firebase Storage upload error:",
    error
  );

  console.error(
    "Storage error code:",
    error.code
  );

  console.error(
    "Storage error message:",
    error.message
  );

  console.error(
    "Storage server response:",
    error.serverResponse
  );

  const detailedError =
    new Error(
      error.serverResponse ||
      error.message ||
      "Unknown Firebase Storage error."
    );

  detailedError.code =
    error.code;

  detailedError.serverResponse =
    error.serverResponse;

  reject(
    detailedError
  );

},

        async () => {

          try {

            const downloadURL =
              await getDownloadURL(
                uploadTask.snapshot.ref
              );

            resolve({
              downloadURL,
              storagePath,
              fileName:
                safeFileName
            });

          } catch (error) {

            reject(
              error
            );

          }

        }
      );

    }
  );

}


/* =========================
   ADMIN ACCESS
========================= */

function showDeniedPanel() {

  adminLoadingPanel
    ?.classList
    .add(
      "hidden"
    );

  adminDashboard
    ?.classList
    .add(
      "hidden"
    );

  adminDeniedPanel
    ?.classList
    .remove(
      "hidden"
    );

}


function showDashboard(user) {

  adminLoadingPanel
    ?.classList
    .add(
      "hidden"
    );

  adminDeniedPanel
    ?.classList
    .add(
      "hidden"
    );

  adminDashboard
    ?.classList
    .remove(
      "hidden"
    );

  if (adminEmail) {

    adminEmail.textContent =
      user.email ||
      "Administrator";

  }

}


onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      showDeniedPanel();
      return;

    }

    try {

      const tokenResult =
        await user
          .getIdTokenResult(
            true
          );

      const isAdmin =
        tokenResult
          .claims
          .admin === true;

      if (!isAdmin) {

        showDeniedPanel();
        return;

      }

      showDashboard(
        user
      );

      await loadAdminContent();

    } catch (error) {

      console.error(
        "Admin access check failed:",
        error
      );

      showDeniedPanel();

    }

  }
);


/* =========================
   LOG OUT
========================= */

adminLogoutButton
  ?.addEventListener(
    "click",
    async () => {

      try {

        await signOut(
          auth
        );

        window.location.href =
          "template-login.html";

      } catch (error) {

        console.error(
          "Logout failed:",
          error
        );

        alert(
          "Unable to log out. Please try again."
        );

      }

    }
  );


/* =========================
   PHOTO UPLOAD
========================= */

photoUploadForm
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const user =
        auth.currentUser;

      if (!user) {

        showMessage(
          photoUploadMessage,
          "You must be logged in.",
          "error"
        );

        return;

      }

      const title =
        document
          .getElementById(
            "photoTitle"
          )
          .value
          .trim();

      const description =
        document
          .getElementById(
            "photoDescription"
          )
          .value
          .trim();

      const access =
        document
          .getElementById(
            "photoAccess"
          )
          .value;

      const file =
        document
          .getElementById(
            "photoFile"
          )
          .files[0];

      let uploadedFile = null;

      try {

        validateFile({
          file,
          allowedTypes: [
            "image/jpeg",
            "image/png",
            "image/webp"
          ],
          maximumSize:
            MAX_PHOTO_SIZE,
          label:
            "photo"
        });

        setFormDisabled(
          photoUploadForm,
          true
        );

        showMessage(
          photoUploadMessage,
          "Preparing photo upload..."
        );

        uploadedFile =
          await uploadFileWithProgress({
            file,
            storageFolder:
              "creator-content/photos",
            messageElement:
              photoUploadMessage
          });

        await addDoc(
          collection(
            db,
            "creator_content"
          ),
          {
            type:
              "photo",

            title,

            description,

            access,

            downloadURL:
              uploadedFile.downloadURL,

            storagePath:
              uploadedFile.storagePath,

            originalFileName:
              file.name,

            storedFileName:
              uploadedFile.fileName,

            mimeType:
              file.type,

            fileSize:
              file.size,

            active:
              true,

            uploadedBy:
              user.uid,

            uploadedByEmail:
              user.email || "",

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          }
        );

        photoUploadForm.reset();

        showMessage(
          photoUploadMessage,
          "Photo uploaded successfully.",
          "success"
        );

        await loadAdminContent();

      } catch (error) {

        console.error(
          "Photo upload failed:",
          error
        );

        if (
          uploadedFile
            ?.storagePath
        ) {

          try {

            await deleteObject(
              ref(
                storage,
                uploadedFile.storagePath
              )
            );

          } catch (
            cleanupError
          ) {

            console.error(
              "Photo cleanup failed:",
              cleanupError
            );

          }

        }

      showMessage(
  photoUploadMessage,
  [
    error.code,
    error.serverResponse,
    error.message
  ]
    .filter(Boolean)
    .join(" — ") ||
  "The photo could not be uploaded.",
  "error"
);

      } finally {

        setFormDisabled(
          photoUploadForm,
          false
        );

      }

    }
  );


/* =========================
   VIDEO UPLOAD
========================= */

videoUploadForm
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const user =
        auth.currentUser;

      if (!user) {

        showMessage(
          videoUploadMessage,
          "You must be logged in.",
          "error"
        );

        return;

      }

      const title =
        document
          .getElementById(
            "videoTitle"
          )
          .value
          .trim();

      const description =
        document
          .getElementById(
            "videoDescription"
          )
          .value
          .trim();

      const access =
        document
          .getElementById(
            "videoAccess"
          )
          .value;

      const file =
        document
          .getElementById(
            "videoFile"
          )
          .files[0];

      let uploadedFile = null;

      try {

        validateFile({
          file,
          allowedTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm"
          ],
          maximumSize:
            MAX_VIDEO_SIZE,
          label:
            "video"
        });

        setFormDisabled(
          videoUploadForm,
          true
        );

        showMessage(
          videoUploadMessage,
          "Preparing video upload..."
        );

        uploadedFile =
          await uploadFileWithProgress({
            file,
            storageFolder:
              "creator-content/videos",
            messageElement:
              videoUploadMessage
          });

        await addDoc(
          collection(
            db,
            "creator_content"
          ),
          {
            type:
              "video",

            title,

            description,

            access,

            downloadURL:
              uploadedFile.downloadURL,

            storagePath:
              uploadedFile.storagePath,

            originalFileName:
              file.name,

            storedFileName:
              uploadedFile.fileName,

            mimeType:
              file.type,

            fileSize:
              file.size,

            active:
              true,

            uploadedBy:
              user.uid,

            uploadedByEmail:
              user.email || "",

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          }
        );

        videoUploadForm.reset();

        showMessage(
          videoUploadMessage,
          "Video uploaded successfully.",
          "success"
        );

        await loadAdminContent();

      } catch (error) {

        console.error(
          "Video upload failed:",
          error
        );

        if (
          uploadedFile
            ?.storagePath
        ) {

          try {

            await deleteObject(
              ref(
                storage,
                uploadedFile.storagePath
              )
            );

          } catch (
            cleanupError
          ) {

            console.error(
              "Video cleanup failed:",
              cleanupError
            );

          }

        }

        showMessage(
          videoUploadMessage,
          error.message ||
          "The video could not be uploaded.",
          "error"
        );

      } finally {

        setFormDisabled(
          videoUploadForm,
          false
        );

      }

    }
  );


/* =========================
   MERCHANDISE UPLOAD
========================= */

merchandiseForm
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const user =
        auth.currentUser;

      if (!user) {

        showMessage(
          merchandiseMessage,
          "You must be logged in.",
          "error"
        );

        return;

      }

      const name =
        document
          .getElementById(
            "merchandiseName"
          )
          .value
          .trim();

      const description =
        document
          .getElementById(
            "merchandiseDescription"
          )
          .value
          .trim();

      const price =
        Number(
          document
            .getElementById(
              "merchandisePrice"
            )
            .value
        );

      const stock =
        Number(
          document
            .getElementById(
              "merchandiseStock"
            )
            .value
        );

      const file =
        document
          .getElementById(
            "merchandiseImage"
          )
          .files[0];

      let uploadedFile = null;

      try {

        if (
          !Number.isFinite(price) ||
          price < 0
        ) {

          throw new Error(
            "Enter a valid product price."
          );

        }

        if (
          !Number.isInteger(stock) ||
          stock < 0
        ) {

          throw new Error(
            "Enter a valid stock quantity."
          );

        }

        validateFile({
          file,
          allowedTypes: [
            "image/jpeg",
            "image/png",
            "image/webp"
          ],
          maximumSize:
            MAX_PRODUCT_IMAGE_SIZE,
          label:
            "product image"
        });

        setFormDisabled(
          merchandiseForm,
          true
        );

        showMessage(
          merchandiseMessage,
          "Preparing product upload..."
        );

        uploadedFile =
          await uploadFileWithProgress({
            file,
            storageFolder:
              "merchandise/images",
            messageElement:
              merchandiseMessage
          });

        await addDoc(
          collection(
            db,
            "merchandise"
          ),
          {
            name,

            description,

            price,

            stock,

            imageURL:
              uploadedFile.downloadURL,

            storagePath:
              uploadedFile.storagePath,

            originalFileName:
              file.name,

            storedFileName:
              uploadedFile.fileName,

            mimeType:
              file.type,

            fileSize:
              file.size,

            active:
              true,

            createdBy:
              user.uid,

            createdByEmail:
              user.email || "",

            createdAt:
              serverTimestamp(),

            updatedAt:
              serverTimestamp()
          }
        );

        merchandiseForm.reset();

        showMessage(
          merchandiseMessage,
          "Merchandise added successfully.",
          "success"
        );

        await loadAdminContent();

      } catch (error) {

        console.error(
          "Merchandise upload failed:",
          error
        );

        if (
          uploadedFile
            ?.storagePath
        ) {

          try {

            await deleteObject(
              ref(
                storage,
                uploadedFile.storagePath
              )
            );

          } catch (
            cleanupError
          ) {

            console.error(
              "Product image cleanup failed:",
              cleanupError
            );

          }

        }

        showMessage(
          merchandiseMessage,
          error.message ||
          "The merchandise could not be added.",
          "error"
        );

      } finally {

        setFormDisabled(
          merchandiseForm,
          false
        );

      }

    }
  );


/* =========================
   LOAD EXISTING CONTENT
========================= */

async function loadAdminContent() {

  if (!adminContentList) {
    return;
  }

  adminContentList.innerHTML = `
    <p>Loading existing content...</p>
  `;

  try {

    const contentQuery =
      query(
        collection(
          db,
          "creator_content"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const merchandiseQuery =
      query(
        collection(
          db,
          "merchandise"
        ),
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const [
      contentSnapshot,
      merchandiseSnapshot
    ] =
      await Promise.all([
        getDocs(
          contentQuery
        ),
        getDocs(
          merchandiseQuery
        )
      ]);

    const items = [];

    contentSnapshot
      .forEach(
        (documentSnapshot) => {

          const data =
            documentSnapshot.data();

          items.push({
            id:
              documentSnapshot.id,

            collectionName:
              "creator_content",

            type:
              data.type || "content",

            title:
              data.title ||
              "Untitled content",

            access:
              data.access || "free",

            downloadURL:
              data.downloadURL || "",

            storagePath:
              data.storagePath || "",

            price:
              null,

            stock:
              null,

            createdAt:
              data.createdAt || null
          });

        }
      );

    merchandiseSnapshot
      .forEach(
        (documentSnapshot) => {

          const data =
            documentSnapshot.data();

          items.push({
            id:
              documentSnapshot.id,

            collectionName:
              "merchandise",

            type:
              "merchandise",

            title:
              data.name ||
              "Unnamed product",

            access:
              "shop",

            downloadURL:
              data.imageURL || "",

            storagePath:
              data.storagePath || "",

            price:
              data.price ?? 0,

            stock:
              data.stock ?? 0,

            createdAt:
              data.createdAt || null
          });

        }
      );

    items.sort(
      (
        firstItem,
        secondItem
      ) => {

        const firstTime =
          firstItem
            .createdAt
            ?.toMillis?.() || 0;

        const secondTime =
          secondItem
            .createdAt
            ?.toMillis?.() || 0;

        return (
          secondTime -
          firstTime
        );

      }
    );

    renderAdminContent(
      items
    );

  } catch (error) {

    console.error(
      "Unable to load content:",
      error
    );

    adminContentList.innerHTML = `
      <p>
        Unable to load the existing uploads.
      </p>
    `;

  }

}


/* =========================
   RENDER EXISTING CONTENT
========================= */

function renderAdminContent(items) {

  if (!adminContentList) {
    return;
  }

  if (!items.length) {

    adminContentList.innerHTML = `
      <p>
        No photos, videos or merchandise
        have been uploaded yet.
      </p>
    `;

    return;

  }

  adminContentList.innerHTML =
    items
      .map(
        (item) => {

          const mediaPreview =
            item.type === "video"
              ? `
                <video
                  class="admin-content-preview"
                  src="${escapeHtml(item.downloadURL)}"
                  muted
                  preload="metadata"
                ></video>
              `
              : `
                <img
                  class="admin-content-preview"
                  src="${escapeHtml(item.downloadURL)}"
                  alt="${escapeHtml(item.title)}"
                >
              `;

          const details =
            item.type ===
            "merchandise"
              ? `
                <span>
                  ${formatPrice(item.price)}
                </span>

                <span>
                  Stock: ${escapeHtml(item.stock)}
                </span>
              `
              : `
                <span>
                  ${escapeHtml(item.access)}
                </span>
              `;

          return `
            <article class="admin-content-item">

              ${mediaPreview}

              <div class="admin-content-details">

                <p class="admin-card-label">
                  ${escapeHtml(item.type)}
                </p>

                <h3>
                  ${escapeHtml(item.title)}
                </h3>

                <div class="admin-content-meta">
                  ${details}
                </div>

              </div>

              <button
                type="button"
                class="admin-delete-button"
                data-collection="${escapeHtml(item.collectionName)}"
                data-document-id="${escapeHtml(item.id)}"
                data-storage-path="${escapeHtml(item.storagePath)}"
              >
                Delete
              </button>

            </article>
          `;

        }
      )
      .join("");

}


/* =========================
   DELETE CONTENT
========================= */

adminContentList
  ?.addEventListener(
    "click",
    async (event) => {

      const deleteButton =
        event.target.closest(
          ".admin-delete-button"
        );

      if (!deleteButton) {
        return;
      }

      const collectionName =
        deleteButton.dataset
          .collection;

      const documentId =
        deleteButton.dataset
          .documentId;

      const storagePath =
        deleteButton.dataset
          .storagePath;

      const confirmed =
        window.confirm(
          "Delete this item permanently?"
        );

      if (!confirmed) {
        return;
      }

      deleteButton.disabled =
        true;

      deleteButton.textContent =
        "Deleting...";

      try {

        if (storagePath) {

          try {

            await deleteObject(
              ref(
                storage,
                storagePath
              )
            );

          } catch (storageError) {

            if (
              storageError.code !==
              "storage/object-not-found"
            ) {

              throw storageError;

            }

          }

        }

        await deleteDoc(
          doc(
            db,
            collectionName,
            documentId
          )
        );

        await loadAdminContent();

      } catch (error) {

        console.error(
          "Delete failed:",
          error
        );

        alert(
          "The item could not be deleted."
        );

        deleteButton.disabled =
          false;

        deleteButton.textContent =
          "Delete";

      }

    }
  );