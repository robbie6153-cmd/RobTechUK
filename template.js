"use strict";


/* =========================
   PAGE ELEMENTS
========================= */

const navButtons =
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

const playButtons =
  document.querySelectorAll(
    ".play-button"
  );


/* =========================
   SECTION NAVIGATION
========================= */

function showSection(sectionId) {

  contentSections.forEach(section => {

    const isSelected =
      section.id === sectionId;

    section.classList.toggle(
      "hidden-section",
      !isSelected
    );

    section.classList.toggle(
      "active-section",
      isSelected
    );

  });


  navButtons.forEach(button => {

    const isSelected =
      button.dataset.section === sectionId;

    button.classList.toggle(
      "active",
      isSelected
    );

  });


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================
   NAVIGATION BUTTONS
========================= */

navButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const sectionId =
        button.dataset.section;

      if (!sectionId) {
        return;
      }

      showSection(sectionId);

    }
  );

});


/* =========================
   HOME PAGE LINK BUTTONS
========================= */

sectionLinkButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      const sectionId =
        button.dataset.section;

      if (!sectionId) {
        return;
      }

      showSection(sectionId);

    }
  );

});


/* =========================
   VIDEO PLACEHOLDER BUTTONS
========================= */

playButtons.forEach(button => {

  button.addEventListener(
    "click",
    () => {

      alert(
        "This is currently a video placeholder. Uploaded videos will be connected later."
      );

    }
  );

});


/* =========================
   COPYRIGHT YEAR
========================= */

if (currentYear) {

  currentYear.textContent =
    new Date().getFullYear();

}


/* =========================
   INITIAL PAGE
========================= */

showSection(
  "homeSection"
);