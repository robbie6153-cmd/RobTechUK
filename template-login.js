"use strict";

import {
  auth
} from "./template-firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";


const loginForm =
  document.getElementById(
    "loginForm"
  );

const loginEmail =
  document.getElementById(
    "loginEmail"
  );

const loginPassword =
  document.getElementById(
    "loginPassword"
  );

const createAccountButton =
  document.getElementById(
    "createAccountButton"
  );

const forgotPasswordButton =
  document.getElementById(
    "forgotPasswordButton"
  );

const logoutButton =
  document.getElementById(
    "logoutButton"
  );

const loginMessage =
  document.getElementById(
    "loginMessage"
  );


function showMessage(
  message
) {
  loginMessage.textContent =
    message;
}


function getDetails() {
  const email =
    loginEmail.value
      .trim();

  const password =
    loginPassword.value;

  if (!email) {
    throw new Error(
      "Enter your email address."
    );
  }

  if (!password) {
    throw new Error(
      "Enter your password."
    );
  }

  return {
    email,
    password
  };
}


function friendlyError(
  error
) {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "An account already exists with this email address.";

    case "auth/invalid-email":
      return "Enter a valid email address.";

    case "auth/weak-password":
      return "Your password must be at least 6 characters.";

    case "auth/invalid-credential":
      return "The email address or password was not accepted.";

    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again.";

    default:
      return "Something went wrong. Please try again.";
  }
}


loginForm.addEventListener(
  "submit",
  async event => {
    event.preventDefault();

    try {
      showMessage(
        "Logging in..."
      );

      const {
        email,
        password
      } =
        getDetails();

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user =
        userCredential.user;

    if (!user.emailVerified) {
  showMessage(
    "You are logged in, but your email address has not yet been verified."
  );

  return;
}

showMessage(
  "Login successful. Taking you back to the website..."
);

setTimeout(
  () => {
    window.location.href =
      "template.html";
  },
  800
);
    } catch (error) {
      console.error(
        error
      );

      showMessage(
        friendlyError(
          error
        )
      );
    }
  }
);


createAccountButton.addEventListener(
  "click",
  async () => {
    try {
      showMessage(
        "Creating your account..."
      );

      const {
        email,
        password
      } =
        getDetails();

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await sendEmailVerification(
        userCredential.user
      );

      showMessage(
        "Account created. Check your email and click the verification link."
      );
    } catch (error) {
      console.error(
        error
      );

      showMessage(
        friendlyError(
          error
        )
      );
    }
  }
);


forgotPasswordButton.addEventListener(
  "click",
  async () => {
    try {
      const email =
        loginEmail.value
          .trim();

      if (!email) {
        showMessage(
          "Enter your email address first."
        );

        return;
      }

      await sendPasswordResetEmail(
        auth,
        email
      );

      showMessage(
        "Password reset email sent. Check your inbox."
      );
    } catch (error) {
      console.error(
        error
      );

      showMessage(
        friendlyError(
          error
        )
      );
    }
  }
);
resendVerificationButton.addEventListener(
  "click",
  async () => {
    try {
      const user =
        auth.currentUser;

      if (!user) {
        showMessage(
          "You must be logged in first."
        );

        return;
      }

      if (user.emailVerified) {
        showMessage(
          "Your email address is already verified."
        );

        return;
      }

      await sendEmailVerification(
        user
      );

      showMessage(
        "A new verification email has been sent. Check your inbox and spam folder."
      );
    } catch (error) {
      console.error(
        error
      );

      if (
        error.code ===
        "auth/too-many-requests"
      ) {
        showMessage(
          "Too many verification emails have been requested. Wait a few minutes and try again."
        );

        return;
      }

      showMessage(
        "The verification email could not be sent. Please try again."
      );
    }
  }
);
logoutButton.addEventListener(
  "click",
  async () => {
    try {
      await signOut(
        auth
      );

      showMessage(
        "You have logged out."
      );
    } catch (error) {
      console.error(
        error
      );

      showMessage(
        "Could not log out. Please try again."
      );
    }
  }
);

const resendVerificationButton =
  document.getElementById(
    "resendVerificationButton"
  );
onAuthStateChanged(
  auth,
  user => {
    if (user) {
      loginForm.classList.add(
        "hidden"
      );

      createAccountButton.classList.add(
        "hidden"
      );

      forgotPasswordButton.classList.add(
        "hidden"
      );

      logoutButton.classList.remove(
        "hidden"
      );

    if (user.emailVerified) {

  resendVerificationButton.classList.add(
    "hidden"
  );

  showMessage(
    `Logged in as ${user.email}`
  );

} else {

  resendVerificationButton.classList.remove(
    "hidden"
  );

  showMessage(
    `Logged in as ${user.email}, but email verification is still required.`
  );

}

      return;
    }

    loginForm.classList.remove(
      "hidden"
    );

    createAccountButton.classList.remove(
      "hidden"
    );

    forgotPasswordButton.classList.remove(
      "hidden"
    );

    logoutButton.classList.add(
      "hidden"
    );
  }
);
resendVerificationButton.classList.add(
  "hidden"
);