"use strict";


/* =========================
   FIREBASE
========================= */

import {
  auth,
  db
} from "./template-firebase.js?v=3";


import {
  onAuthStateChanged,
  signOut
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";


import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where
} from
  "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";


/* =========================
   PAGE ELEMENTS
========================= */

const navigationButtons =
  document.querySelectorAll(
    ".nav-button"
  );

const sectionLinkButtons =
  document.querySelectorAll(
    ".section-link-button"
  );

const contentSections =
  document.querySelectorAll(
    ".content-section"
  );


const currentYear =
  document.getElementById(
    "currentYear"
  );


const accountStatusText =
  document.getElementById(
    "accountStatusText"
  );

const adminPanelLink =
  document.getElementById(
    "adminPanelLink"
  );

const mainLogoutButton =
  document.getElementById(
    "mainLogoutButton"
  );

const memberLoginBox =
  document.getElementById(
    "memberLoginBox"
  );


const photoGallery =
  document.getElementById(
    "photoGallery"
  );

const photoGalleryLoading =
  document.getElementById(
    "photoGalleryLoading"
  );

const photoGalleryEmpty =
  document.getElementById(
    "photoGalleryEmpty"
  );

const photoGalleryError =
  document.getElementById(
    "photoGalleryError"
  );


const videoGallery =
  document.getElementById(
    "videoGallery"
  );

const videoGalleryLoading =
  document.getElementById(
    "videoGalleryLoading"
  );

const videoGalleryEmpty =
  document.getElementById(
    "videoGalleryEmpty"
  );

const videoGalleryError =
  document.getElementById(
    "videoGalleryError"
  );


const photoViewer =
  document.getElementById(
    "photoViewer"
  );

const closePhotoViewer =
  document.getElementById(
    "closePhotoViewer"
  );

const photoViewerImage =
  document.getElementById(
    "photoViewerImage"
  );

const photoViewerWatermark =
  document.getElementById(
    "photoViewerWatermark"
  );

const photoViewerAccess =
  document.getElementById(
    "photoViewerAccess"
  );

const photoViewerTitle =
  document.getElementById(
    "photoViewerTitle"
  );

const photoViewerDescription =
  document.getElementById(
    "photoViewerDescription"
  );

const merchandiseGallery =
  document.getElementById(
    "merchandiseGallery"
  );

const merchandiseLoading =
  document.getElementById(
    "merchandiseLoading"
  );

const merchandiseEmpty =
  document.getElementById(
    "merchandiseEmpty"
  );

const merchandiseError =
  document.getElementById(
    "merchandiseError"
  );
/* =========================
   CURRENT VIEWER
========================= */

let currentViewer = {
  user: null,
  username: "",
  isAdmin: false,
  isSubscriber: false
};


/* =========================
   BASIC HELPERS
========================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


function showElement(element) {

  element
    ?.classList
    .remove(
      "hidden"
    );

}


function hideElement(element) {

  element
    ?.classList
    .add(
      "hidden"
    );

}


/* =========================
   YEAR
========================= */

if (currentYear) {

  currentYear.textContent =
    new Date()
      .getFullYear();

}


/* =========================
   SECTION NAVIGATION
========================= */

function showSection(sectionId) {

  contentSections.forEach(
    (section) => {

      const isSelected =
        section.id ===
        sectionId;

      section.classList.toggle(
        "active-section",
        isSelected
      );

      section.classList.toggle(
        "hidden-section",
        !isSelected
      );

    }
  );


  navigationButtons.forEach(
    (button) => {

      button.classList.toggle(
        "active",
        button.dataset.section ===
          sectionId
      );

    }
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


navigationButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        showSection(
          button.dataset.section
        );

      }
    );

  }
);


sectionLinkButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        showSection(
          button.dataset.section
        );

      }
    );

  }
);


/* =========================
   USER PROFILE
========================= */

async function getUserProfile(user) {

  try {

    const userReference =
      doc(
        db,
        "users",
        user.uid
      );

    const userSnapshot =
      await getDoc(
        userReference
      );

    if (!userSnapshot.exists()) {

      return {
        username:
          user.email
            ?.split("@")[0] ||
          "Member",

        subscriptionActive:
          false
      };

    }

    const userData =
      userSnapshot.data();

    return {
      username:
        userData.username ||
        user.email
          ?.split("@")[0] ||
        "Member",

      subscriptionActive:
        userData.subscriptionActive ===
        true
    };

  } catch (error) {

    console.error(
      "Unable to load user profile:",
      error
    );

    return {
      username:
        user.email
          ?.split("@")[0] ||
        "Member",

      subscriptionActive:
        false
    };

  }

}


/* =========================
   ACCOUNT STATUS
========================= */

function showLoggedOutStatus() {

  currentViewer = {
    user: null,
    username: "",
    isAdmin: false,
    isSubscriber: false
  };

  if (accountStatusText) {

    accountStatusText.textContent =
      "Not logged in";

  }

  hideElement(
    adminPanelLink
  );

  hideElement(
    mainLogoutButton
  );

  showElement(
    memberLoginBox
  );

}


function showLoggedInStatus() {

  if (currentViewer.isAdmin) {

    accountStatusText.textContent =
      "Logged in as Admin";

    showElement(
      adminPanelLink
    );

  } else {

    accountStatusText.textContent =
      `Logged in as ${currentViewer.username}`;

    hideElement(
      adminPanelLink
    );

  }

  showElement(
    mainLogoutButton
  );

  hideElement(
    memberLoginBox
  );

}


/* =========================
   AUTHENTICATION
========================= */

onAuthStateChanged(
  auth,
  async (user) => {

  if (!user) {

  showLoggedOutStatus();

await Promise.all([
  loadPhotoGallery(),
  loadVideoGallery(),
  loadMerchandise()
]);

  return;

}

    try {

      const tokenResult =
        await user.getIdTokenResult();

      const profile =
        await getUserProfile(
          user
        );

      currentViewer = {
        user,

        username:
          profile.username,

        isAdmin:
          tokenResult.claims.admin ===
          true,

        isSubscriber:
          profile.subscriptionActive ===
          true
      };

     showLoggedInStatus();

await Promise.all([
  loadPhotoGallery(),
  loadVideoGallery(),
  loadMerchandise()
]);

    } catch (error) {

      console.error(
        "Unable to check login:",
        error
      );

      if (accountStatusText) {

        accountStatusText.textContent =
          "Unable to check login";

      }

await Promise.all([
  loadPhotoGallery(),
  loadVideoGallery(),
  loadMerchandise()
]);

    }

  }
);


/* =========================
   LOG OUT
========================= */

mainLogoutButton
  ?.addEventListener(
    "click",
    async () => {

      try {

        await signOut(
          auth
        );

        window.location.href =
          "template.html";

      } catch (error) {

        console.error(
          "Unable to log out:",
          error
        );

        alert(
          "Unable to log out. Please try again."
        );

      }

    }
  );


/* =========================
   PHOTO ACCESS
========================= */

function canViewPhoto(photo) {

  if (
    photo.access ===
    "free"
  ) {

    return true;

  }

  return (
    currentViewer.isAdmin ||
    currentViewer.isSubscriber
  );

}
function canViewVideo(video) {

  if (
    video.access ===
    "free"
  ) {

    return true;

  }

  return (
    currentViewer.isAdmin ||
    currentViewer.isSubscriber
  );

}

/* =========================
   LOAD PHOTO GALLERY
========================= */

async function loadPhotoGallery() {

  if (!photoGallery) {
    return;
  }

  photoGallery.innerHTML = "";

  showElement(
    photoGalleryLoading
  );

  hideElement(
    photoGalleryEmpty
  );

  hideElement(
    photoGalleryError
  );

  try {

    const photosQuery =
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

    const photosSnapshot =
      await getDocs(
        photosQuery
      );

    const photos = [];

    photosSnapshot.forEach(
      (documentSnapshot) => {

        const data =
          documentSnapshot.data();

        if (
          data.type !== "photo" ||
          data.active === false
        ) {
          return;
        }

        photos.push({
          id:
            documentSnapshot.id,

          ...data
        });

      }
    );

    hideElement(
      photoGalleryLoading
    );

    if (!photos.length) {

      showElement(
        photoGalleryEmpty
      );

      return;

    }

    renderPhotoGallery(
      photos
    );

  } catch (error) {

    console.error(
      "Unable to load photo gallery:",
      error
    );

    hideElement(
      photoGalleryLoading
    );

    showElement(
      photoGalleryError
    );

  }

}
 
/* =========================
   RENDER PHOTO GALLERY
========================= */

function renderPhotoGallery(photos) {

  if (!photoGallery) {
    return;
  }

  photoGallery.innerHTML =
    photos
      .map(
        (photo) => {

          const allowed =
            canViewPhoto(
              photo
            );

          const accessLabel =
            photo.access ===
            "subscription"
              ? "Subscribers Only"
              : "Free";

          if (!allowed) {

            return `
              <article
                class="gallery-photo-card locked-photo-card"
              >

                <div class="gallery-photo-locked">

                  <span class="gallery-lock-icon">
                    🔒
                  </span>

                  <strong>
                    Subscribers Only
                  </strong>

                  <p>
                    Log in with an active subscription
                    to view this photograph.
                  </p>

                </div>

                <div class="gallery-information">

                  <span class="photo-access-badge">
                    ${escapeHtml(accessLabel)}
                  </span>

                  <h3>
                    ${escapeHtml(photo.title || "Exclusive Photo")}
                  </h3>

                  <p>
                    ${escapeHtml(photo.description || "")}
                  </p>

                </div>

              </article>
            `;

          }

          return `
            <article class="gallery-photo-card">

              <button
                type="button"
                class="gallery-photo-button"
                data-photo-id="${escapeHtml(photo.id)}"
              >

                <div class="gallery-photo-image-wrap">

                  <img
                    src="${escapeHtml(photo.downloadURL || "")}"
                    alt="${escapeHtml(photo.title || "Gallery photo")}"
                    class="gallery-photo-image"
                    loading="lazy"
                  >

                  <span class="gallery-photo-watermark">
                    ${escapeHtml(currentViewer.username || "")}
                  </span>

                </div>

              </button>

              <div class="gallery-information">

                <span class="photo-access-badge">
                  ${escapeHtml(accessLabel)}
                </span>

                <h3>
                  ${escapeHtml(photo.title || "Gallery Photo")}
                </h3>

                <p>
                  ${escapeHtml(photo.description || "")}
                </p>

              </div>

            </article>
          `;

        }
      )
      .join("");

  const photoButtons =
    photoGallery.querySelectorAll(
      ".gallery-photo-button"
    );

  photoButtons.forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          const photo =
            photos.find(
              (item) =>
                item.id ===
                button.dataset.photoId
            );

          if (photo) {

            openPhotoViewer(
              photo
            );

          }

        }
      );

    }
  );

}
  

   

/* =========================
   LOAD VIDEO GALLERY
========================= */

async function loadVideoGallery() {

  if (!videoGallery) {
    return;
  }

  videoGallery.innerHTML = "";

  showElement(
    videoGalleryLoading
  );

  hideElement(
    videoGalleryEmpty
  );

  hideElement(
    videoGalleryError
  );

  try {

    const videosQuery =
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

    const videosSnapshot =
      await getDocs(
        videosQuery
      );

    const videos = [];

    videosSnapshot.forEach(
      (documentSnapshot) => {

        const data =
          documentSnapshot.data();

        if (
          data.type !== "video" ||
          data.active === false
        ) {
          return;
        }

        videos.push({
          id:
            documentSnapshot.id,

          ...data
        });

      }
    );

    hideElement(
      videoGalleryLoading
    );

    if (!videos.length) {

      showElement(
        videoGalleryEmpty
      );

      return;

    }

    renderVideoGallery(
      videos
    );

  } catch (error) {

    console.error(
      "Unable to load video gallery:",
      error
    );

    hideElement(
      videoGalleryLoading
    );

    showElement(
      videoGalleryError
    );

  }

}


/* =========================
   RENDER VIDEO GALLERY
========================= */

function renderVideoGallery(videos) {

  if (!videoGallery) {
    return;
  }

  videoGallery.innerHTML =
    videos
      .map(
        (video) => {

          const allowed =
            canViewVideo(
              video
            );

          const accessLabel =
            video.access ===
            "subscription"
              ? "Subscribers Only"
              : "Free";

          if (!allowed) {

            return `
              <article
                class="video-card locked-video-card"
              >

                <div class="video-locked">

                  <span class="gallery-lock-icon">
                    🔒
                  </span>

                  <strong>
                    Subscribers Only
                  </strong>

                  <p>
                    Log in with an active subscription
                    to watch this video.
                  </p>

                </div>

                <div class="gallery-information">

                  <span class="photo-access-badge">
                    ${escapeHtml(accessLabel)}
                  </span>

                  <h3>
                    ${escapeHtml(video.title || "Exclusive Video")}
                  </h3>

                  <p>
                    ${escapeHtml(video.description || "")}
                  </p>

                </div>

              </article>
            `;

          }

          return `
            <article class="video-card">

              <div class="gallery-video-wrap">

                <video
                  class="gallery-video-player"
                  controls
                  preload="metadata"
                  playsinline
                >
                  <source
                    src="${escapeHtml(video.downloadURL || "")}"
                    type="${escapeHtml(video.contentType || "video/mp4")}"
                  >

                  Your browser does not support video playback.

                </video>

                <span class="gallery-video-watermark">
                  ${escapeHtml(currentViewer.username || "")}
                </span>

              </div>

              <div class="gallery-information">

                <span class="photo-access-badge">
                  ${escapeHtml(accessLabel)}
                </span>

                <h3>
                  ${escapeHtml(video.title || "Gallery Video")}
                </h3>

                <p>
                  ${escapeHtml(video.description || "")}
                </p>

              </div>

            </article>
          `;

        }
      )
      .join("");

}
/* =========================
   PHOTO VIEWER
========================= */

function openPhotoViewer(photo) {

  if (
    !photoViewer ||
    !canViewPhoto(photo)
  ) {

    return;

  }

  photoViewerImage.src =
    photo.downloadURL || "";

  photoViewerImage.alt =
    photo.title ||
    "Gallery photo";

  photoViewerWatermark.textContent =
    currentViewer.username || "";

  photoViewerAccess.textContent =
    photo.access ===
    "subscription"
      ? "Subscribers Only"
      : "Free";

  photoViewerTitle.textContent =
    photo.title ||
    "Gallery Photo";

  photoViewerDescription.textContent =
    photo.description || "";

  showElement(
    photoViewer
  );

  photoViewer.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "viewer-open"
  );

}


function closeViewer() {

  if (!photoViewer) {
    return;
  }

  hideElement(
    photoViewer
  );

  photoViewer.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "viewer-open"
  );

  photoViewerImage.src =
    "";

}


closePhotoViewer
  ?.addEventListener(
    "click",
    closeViewer
  );


photoViewer
  ?.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        photoViewer
      ) {

        closeViewer();

      }

    }
  );


document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key ===
      "Escape"
    ) {

      closeViewer();

    }

  }
);
/* =========================
   LOAD MERCHANDISE
========================= */

async function loadMerchandise() {

  if (!merchandiseGallery) {
    return;
  }

  merchandiseGallery.innerHTML = "";

  showElement(
    merchandiseLoading
  );

  hideElement(
    merchandiseEmpty
  );

  hideElement(
    merchandiseError
  );

  try {

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

    const merchandiseSnapshot =
      await getDocs(
        merchandiseQuery
      );

    const merchandiseItems = [];

    merchandiseSnapshot.forEach(
      (documentSnapshot) => {

        const data =
          documentSnapshot.data();

        if (data.active === false) {
          return;
        }

        merchandiseItems.push({
          id:
            documentSnapshot.id,

          ...data
        });

      }
    );

    hideElement(
      merchandiseLoading
    );

    if (!merchandiseItems.length) {

      showElement(
        merchandiseEmpty
      );

      return;

    }

    renderMerchandise(
      merchandiseItems
    );

  } catch (error) {

    console.error(
      "Unable to load merchandise:",
      error
    );

    hideElement(
      merchandiseLoading
    );

    showElement(
      merchandiseError
    );

  }

}
/* =========================
   RENDER MERCHANDISE
========================= */

function renderMerchandise(items) {

  if (!merchandiseGallery) {
    return;
  }

  merchandiseGallery.innerHTML =
    items
      .map(
        (item) => {

          const rawPrice =
            Number(
              item.price
            );

          const priceText =
            Number.isFinite(rawPrice)
              ? `£${rawPrice.toFixed(2)}`
              : escapeHtml(
                  item.price || ""
                );

          const imageURL =
            item.downloadURL ||
            item.imageURL ||
            "";

          const purchaseURL =
            item.purchaseURL ||
            item.productURL ||
            item.checkoutURL ||
            "";

          return `
            <article class="merchandise-card">

              <div class="merchandise-image-wrap">

                <img
                  src="${escapeHtml(imageURL)}"
                  alt="${escapeHtml(item.title || "Merchandise item")}"
                  class="merchandise-image"
                  loading="lazy"
                >

              </div>

              <div class="merchandise-information">

                <h3>
                  ${escapeHtml(item.title || "Merchandise")}
                </h3>

                <p>
                  ${escapeHtml(item.description || "")}
                </p>

                ${
                  priceText
                    ? `
                      <strong class="merchandise-price">
                        ${priceText}
                      </strong>
                    `
                    : ""
                }

                ${
                  purchaseURL
                    ? `
                      <a
                        href="${escapeHtml(purchaseURL)}"
                        class="merchandise-buy-button"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Buy Now
                      </a>
                    `
                    : ""
                }

              </div>

            </article>
          `;

        }
      )
      .join("");

}