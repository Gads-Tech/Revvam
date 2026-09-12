"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AuthLayout from "@/components/AuthLayout";
import FormInput from "@/components/FormInput";
import GlassButton from "@/components/GlassButton";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  /*
   * If the browser restores this page from
   * the back/forward cache, force a fresh
   * navigation so authentication state is current.
   */
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIdentifierError("");
    setPasswordError("");
    setServerError("");

    const cleanIdentifier = identifier.trim();

    let hasError = false;

    if (!cleanIdentifier) {
      setIdentifierError("Enter your username or email.");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Enter your password.");
      hasError = true;
    }

    if (hasError) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          identifier: cleanIdentifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setServerError(
          data.error || "Unable to log in. Please try again."
        );

        return;
      }

      /*
       * Use replace instead of push.
       *
       * This prevents the login page itself from
       * becoming another unnecessary history step.
       */
      router.replace("/home");
      router.refresh();
    } catch (error) {
      console.error("Login request failed:", error);

      setServerError(
        "Unable to connect to Revvam. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your Revvam journey."
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <FormInput
          label="Username or email"
          type="text"
          name="identifier"
          autoComplete="username"
          placeholder="Username or email"
          value={identifier}
          onChange={(event) =>
            setIdentifier(event.target.value)
          }
          error={identifierError}
          disabled={loading}
        />

        <div>
          <div className="relative">
            <FormInput
              label="Password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              error={passwordError}
              disabled={loading}
              className="pr-20"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              disabled={loading}
              className="
                absolute
                right-4
                top-[42px]
                text-xs
                font-medium
                text-white/35
                transition-colors
                duration-200
                hover:text-white/80
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                alert(
                  "Password recovery is coming soon."
                );
              }}
              className="
                text-xs
                text-white/35
                transition-colors
                duration-200
                hover:text-white/70
              "
            >
              Forgot password?
            </button>
          </div>
        </div>

        {serverError && (
          <div
            className="
              rounded-2xl
              border
              border-red-500/20
              bg-red-500/[0.06]
              px-4
              py-3
              text-sm
              leading-5
              text-red-300
            "
          >
            {serverError}
          </div>
        )}

        <GlassButton
          type="submit"
          variant="primary"
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span
                className="
                  h-4
                  w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-white/20
                  border-t-white
                "
              />

              Logging in...
            </span>
          ) : (
            "Log in"
          )}
        </GlassButton>

        <div className="flex items-center gap-4 py-1">
          <div className="h-px flex-1 bg-white/[0.07]" />

          <span
            className="
              text-[10px]
              uppercase
              tracking-[0.2em]
              text-white/20
            "
          >
            or
          </span>

          <div className="h-px flex-1 bg-white/[0.07]" />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            alert("Social login is coming soon.");
          }}
          className="
            flex
            h-14
            w-full
            items-center
            justify-center
            rounded-2xl
            border
            border-white/[0.10]
            bg-white/[0.025]
            text-sm
            font-medium
            text-white/60
            backdrop-blur-xl
            transition-all
            duration-300
            hover:border-white/[0.18]
            hover:bg-white/[0.06]
            hover:text-white
            active:scale-[0.99]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          Continue with Google
        </button>

        <p
          className="
            pt-2
            text-center
            text-sm
            text-white/35
          "
        >
          Don't have a Revvam account?{" "}
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="
              font-medium
              text-white/70
              transition-colors
              hover:text-white
            "
          >
            Sign up
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}