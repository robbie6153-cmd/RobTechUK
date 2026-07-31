"use strict";

import {
  auth,
  db
} from "./template-firebase.js";

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  reload
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";


const usernameForm =
  document.getElementById(
    "usernameForm"
  );

const usernameInput =
  document.getElementById(
    "username"
  );

const usernameMessage =
  document.getElementById(
    "usernameMessage"
  );


let currentUser =
  null;


function showMessage(
  message
) {
  usernameMessage.textContent =
    message;
}


function cleanUsername(
  value
) {
  return value
    .trim()
    .toLowerCase();
}


function validateUsername(
  value
) {
  if (
    value.length < 3 ||
    value.length > 20
  ) {
    return "Your username must contain between 3 and 20 characters.";
  }

  if (
    !/^[a-zA-Z0-9]+$/.test(
      value
    )
  ) {
    return "Use letters and numbers only. Do not use spaces or symbols.";
  }

  return "";
}


async function checkExistingProfile(
  user
) {
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

  if (
    userSnapshot.exists() &&
    userSnapshot.data().username
  ) {
    window.location.replace(
      "template.html"
    );

    return true;
  }

  return false;
}


onAuthStateChanged(
  auth,
  async user => {
    if (!user) {
      window.location.replace(
        "template-login.html"
      );

      return;
    }

    try {
      await reload(
        user
      );

      currentUser =
        auth.currentUser;

      if (
        !currentUser.emailVerified
      ) {
        showMessage(
          "Verify your email address before choosing a username."
        );

        usernameInput.disabled =
          true;

        usernameForm
          .querySelector("button")
          .disabled =
          true;

        return;
      }

      const profileExists =
        await checkExistingProfile(
          currentUser
        );

      if (!profileExists) {
        usernameInput.focus();
      }
    } catch (error) {
      console.error(
        error
      );

      showMessage(
        "Your account could not be checked. Refresh the page and try again."
      );
    }
  }
);


usernameForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    if (!currentUser) {
      showMessage(
        "You must be logged in."
      );

      return;
    }

    const username =
      usernameInput.value
        .trim();

    const validationError =
      validateUsername(
        username
      );

    if (validationError) {
      showMessage(
        validationError
      );

      return;
    }

    const usernameLowercase =
      cleanUsername(
        username
      );

    const submitButton =
      usernameForm.querySelector(
        "button"
      );

    submitButton.disabled =
      true;

    showMessage(
      "Saving your username..."
    );

    try {
      const usernameReference =
        doc(
          db,
          "usernames",
          usernameLowercase
        );

      const userReference =
        doc(
          db,
          "users",
          currentUser.uid
        );

      await runTransaction(
        db,
        async transaction => {
          const usernameSnapshot =
            await transaction.get(
              usernameReference
            );

          const userSnapshot =
            await transaction.get(
              userReference
            );

          if (
            userSnapshot.exists() &&
            userSnapshot.data().username
          ) {
            throw new Error(
              "profile-already-exists"
            );
          }

          if (
            usernameSnapshot.exists()
          ) {
            throw new Error(
              "username-taken"
            );
          }

          transaction.set(
            usernameReference,
            {
              uid: currentUser.uid,
              username,
              usernameLowercase,
              createdAt:
                serverTimestamp()
            }
          );

          transaction.set(
            userReference,
            {
              uid: currentUser.uid,
              email:
                currentUser.email,
              username,
              usernameLowercase,
              role: "member",
              createdAt:
                serverTimestamp()
            }
          );
        }
      );

      localStorage.setItem(
        "templateUsername",
        username
      );

      showMessage(
        "Username saved. Taking you to the website..."
      );

      setTimeout(
        () => {
          window.location.replace(
            "template.html"
          );
        },
        700
      );
    } catch (error) {
      console.error(
        error
      );

      submitButton.disabled =
        false;

      if (
        error.message ===
        "username-taken"
      ) {
        showMessage(
          "That username has already been taken. Choose another one."
        );

        return;
      }

      if (
        error.message ===
        "profile-already-exists"
      ) {
        window.location.replace(
          "template.html"
        );

        return;
      }

      showMessage(
        "The username could not be saved. Please try again."
      );
    }
  }
);