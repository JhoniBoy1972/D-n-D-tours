// public/js/auth.js
import { auth, db } from "./firebase-config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// DOM
const modeLogin = document.getElementById("mode-login");
const modeSignup = document.getElementById("mode-signup");
const signupExtra = document.getElementById("signup-extra");
const submitBtn = document.getElementById("auth-submit");
const googleBtn = document.getElementById("auth-google");
const msgEl = document.getElementById("auth-message");
const emailInput = document.getElementById("auth-email");
const passInput = document.getElementById("auth-password");
const nameInput = document.getElementById("auth-name");
const phoneInput = document.getElementById("auth-phone");
const countryInput = document.getElementById("auth-country");
const showPassBtn = document.getElementById("toggle-pass");

let signupMode = false;

// helpers
function setMsg(text, kind = "info") {
  msgEl.textContent = text;
  if (kind === "error") {
    msgEl.classList.remove("text-emerald-600");
    msgEl.classList.add("text-red-500");
  } else {
    msgEl.classList.remove("text-red-500");
    msgEl.classList.add("text-emerald-600");
  }
}

function validateEmail(email) {
  // simple email check
  return /\S+@\S+\.\S+/.test(email);
}

function validatePassword(password) {
  // require at least 6 chars and must contain letters and digits
  return password.length >= 6 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

// Mode toggles
modeLogin.onclick = () => {
  signupMode = false;
  signupExtra.classList.add("hidden");
  modeLogin.classList.add("bg-emerald-600", "text-white");
  modeSignup.classList.remove("bg-emerald-600", "text-white");
  modeSignup.classList.add("bg-emerald-100", "text-emerald-800");
  submitBtn.textContent = "Continue";
  setMsg("");
};

modeSignup.onclick = () => {
  signupMode = true;
  signupExtra.classList.remove("hidden");
  modeSignup.classList.add("bg-emerald-600", "text-white");
  modeLogin.classList.remove("bg-emerald-600", "text-white");
  modeLogin.classList.add("bg-emerald-100", "text-emerald-800");
  submitBtn.textContent = "Create account";
  setMsg("");
};

// Password visibility toggle (button exists in HTML that we add)
if (showPassBtn) {
  showPassBtn.onclick = () => {
    if (passInput.type === "password") {
      passInput.type = "text";
      showPassBtn.textContent = "Hide";
    } else {
      passInput.type = "password";
      showPassBtn.textContent = "Show";
    }
  };
}

// Process submit
submitBtn.onclick = async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passInput.value;
  setMsg("Processing...", "info");
  submitBtn.disabled = true;

  if (!validateEmail(email)) {
    setMsg("Please enter a valid email.", "error");
    submitBtn.disabled = false;
    return;
  }
  if (!validatePassword(password)) {
    setMsg("Password must be 6+ chars and include letters and numbers.", "error");
    submitBtn.disabled = false;
    return;
  }

  try {
    if (signupMode) {
      const fullName = (nameInput?.value || "").trim();
      const phone = (phoneInput?.value || "").trim();
      const country = (countryInput?.value || "").trim();

      // create account
      const userCred = await createUserWithEmailAndPassword(auth, email, password);

      // set display name
      if (fullName) {
        await updateProfile(userCred.user, { displayName: fullName });
      }

      // save basic profile to Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        name: fullName || null,
        phone: phone || null,
        country: country || null,
        email,
        createdAt: new Date().toISOString()
      });

      // success UI: show animated success then redirect
      showSuccessAndRedirect("Account created! Redirecting to your dashboard...", "sucess.html");

    } else {
      // login
      await signInWithEmailAndPassword(auth, email, password);
      showSuccessAndRedirect("Welcome back! Redirecting to your dashboard...", "sucess.html");
    }
  } catch (err) {
    console.error("Auth error:", err);
    // show friendly messages for common issues
    let msg = err?.message || "Something went wrong";
    if (err?.code) {
      if (err.code === "auth/email-already-in-use") msg = "That email is already in use.";
      if (err.code === "auth/invalid-email") msg = "Invalid email address.";
      if (err.code === "auth/wrong-password") msg = "Wrong password.";
      if (err.code === "auth/weak-password") msg = "Password is too weak.";
    }
    setMsg(msg, "error");
    submitBtn.disabled = false;
  }
};

async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    // optionally create user doc if not present
    const u = result.user;
    try {
      await setDoc(doc(db, "users", u.uid), {
        name: u.displayName || null,
        email: u.email || null,
        photoURL: u.photoURL || null,
        provider: "google",
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not write user doc:", e);
    }
    showSuccessAndRedirect("Signed in with Google — redirecting...", "sucess.html");
  } catch (err) {
    console.error("Google sign-in error:", err);
    setMsg(err?.message || "Google sign-in failed", "error");
    submitBtn.disabled = false;
  }
}

if (googleBtn) googleBtn.onclick = (e) => { e.preventDefault(); googleSignIn(); };

// show success UI animation then redirect
function showSuccessAndRedirect(message, url) {
  setMsg(message, "info");
  // small confetti-ish (very small) — CSS class added briefly
  document.body.classList.add("auth-success");
  setTimeout(() => {
    // show a friendly keeper message for 900ms, then redirect
    window.location.href = url;
  }, 900);
}

// small UX: remove message when user types
[emailInput, passInput, nameInput, phoneInput, countryInput].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", () => {
    msgEl.textContent = "";
  });
});
