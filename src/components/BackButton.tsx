"use client";

export default function BackButton() {
  function goBack() {
    const referrer = document.referrer;
    const sameOrigin = referrer.startsWith(window.location.origin);
    const current = window.location.href;
    if (sameOrigin && referrer && referrer !== current) {
      window.history.back();
      return;
    }
    window.location.replace("/home");
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="text-sm text-white/40 hover:text-white"
    >
      Back
    </button>
  );
}
