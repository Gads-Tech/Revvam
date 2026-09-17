"use client";

export default function BackButton() {
  function goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/home";
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="text-sm text-white/40 hover:text-white"
    >
      ← Back
    </button>
  );
}
