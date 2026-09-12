"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import AuthLayout from "@/components/AuthLayout";
import FormInput from "@/components/FormInput";
import GlassButton from "@/components/GlassButton";

type FormErrors = {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  terms?: string;
};

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [termsAccepted, setTermsAccepted] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const passwordStrength = useMemo(() => {
    let score = 0;

    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (!password) {
      return {
        score: 0,
        label: "",
      };
    }

    if (score <= 2) {
      return {
        score,
        label: "Weak",
      };
    }

    if (score === 3) {
      return {
        score,
        label: "Fair",
      };
    }

    if (score === 4) {
      return {
        score,
        label: "Strong",
      };
    }

    return {
      score,
      label: "Very strong",
    };
  }, [password]);

  function validate(): FormErrors {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Enter your name.";
    } else if (name.trim().length > 80) {
      newErrors.name = "Your name is too long.";
    }

    if (!username.trim()) {
      newErrors.username = "Choose a username.";
    } else if (
      !/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())
    ) {
      newErrors.username =
        "Use 3–20 letters, numbers or underscores.";
    }

    if (!email.trim()) {
      newErrors.email = "Enter your email address.";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      newErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Create a password.";
    } else if (password.length < 8) {
      newErrors.password =
        "Password must be at least 8 characters.";
    } else if (password.length > 128) {
      newErrors.password = "Password is too long.";
    }

    if (!termsAccepted) {
      newErrors.terms =
        "You must accept the terms to continue.";
    }

    return newErrors;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSubmitError("");
    setSuccessMessage("");

    const validationErrors = validate();

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSubmitError(
          data?.error ||
            "Something went wrong while creating your account."
        );

        return;
      }

      /*
       * Account creation succeeded.
       *
       * The next stage of Revvam will be the profile
       * selection flow:
       *
       * Driver / Car Enthusiast
       * Mechanic
       * Mechanic Shop
       * Dealership
       *
       * We are intentionally keeping that step separate
       * from account creation.
       */

      setSuccessMessage(
        "Your Revvam account has been created successfully."
      );

      /*
       * Give the user a short moment to see the success
       * message before moving to profile setup.
       */
      setTimeout(() => {
        window.location.href = "/profile/setup";
      }, 700);
    } catch (error) {
      console.error("Signup request failed:", error);

      setSubmitError(
        "Unable to connect to Revvam. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join the community built for people who live for cars."
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
      >
        {/* Full name */}
        <FormInput
          id="name"
          name="name"
          label="Full name"
          type="text"
          placeholder="Your name"
          autoComplete="name"
          value={name}
          disabled={isLoading}
          onChange={(event) => {
            setName(event.target.value);

            if (errors.name) {
              setErrors((current) => ({
                ...current,
                name: undefined,
              }));
            }

            setSubmitError("");
            setSuccessMessage("");
          }}
          error={errors.name}
        />

        {/* Username */}
        <FormInput
          id="username"
          name="username"
          label="Username"
          type="text"
          placeholder="@username"
          autoComplete="username"
          value={username}
          disabled={isLoading}
          onChange={(event) => {
            setUsername(
              event.target.value.replace(/\s/g, "")
            );

            if (errors.username) {
              setErrors((current) => ({
                ...current,
                username: undefined,
              }));
            }

            setSubmitError("");
            setSuccessMessage("");
          }}
          error={errors.username}
        />

        {/* Email */}
        <FormInput
          id="email"
          name="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          disabled={isLoading}
          onChange={(event) => {
            setEmail(event.target.value);

            if (errors.email) {
              setErrors((current) => ({
                ...current,
                email: undefined,
              }));
            }

            setSubmitError("");
            setSuccessMessage("");
          }}
          error={errors.email}
        />

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="
              mb-2
              block
              text-sm
              font-medium
              text-white/70
            "
          >
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a password"
              autoComplete="new-password"
              value={password}
              disabled={isLoading}
              onChange={(event) => {
                setPassword(event.target.value);

                if (errors.password) {
                  setErrors((current) => ({
                    ...current,
                    password: undefined,
                  }));
                }

                setSubmitError("");
                setSuccessMessage("");
              }}
              className={`
                h-14
                w-full
                rounded-2xl
                border
                ${
                  errors.password
                    ? "border-red-500/60"
                    : "border-white/[0.12]"
                }
                bg-white/[0.045]
                px-5
                pr-16
                text-base
                text-white
                outline-none
                placeholder:text-white/25
                backdrop-blur-xl
                transition-all
                duration-300
                hover:border-white/[0.20]
                focus:border-red-500/50
                focus:bg-white/[0.07]
                focus:ring-1
                focus:ring-red-500/30
                disabled:cursor-not-allowed
                disabled:opacity-50
              `}
            />

            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                setShowPassword((visible) => !visible)
              }
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-sm
                text-white/35
                transition
                hover:text-white/80
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {errors.password && (
            <p className="mt-2 text-xs text-red-400">
              {errors.password}
            </p>
          )}

          {/* Password strength */}
          {password && (
            <div className="mt-3">
              <div className="mb-2 flex justify-between">
                <span className="text-[11px] text-white/30">
                  Password strength
                </span>

                <span
                  className={`
                    text-[11px]
                    font-medium
                    ${
                      passwordStrength.score <= 2
                        ? "text-red-400"
                        : passwordStrength.score === 3
                        ? "text-yellow-400"
                        : "text-green-400"
                    }
                  `}
                >
                  {passwordStrength.label}
                </span>
              </div>

              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`
                      h-1
                      flex-1
                      rounded-full
                      transition-all
                      duration-300
                      ${
                        level <= passwordStrength.score
                          ? "bg-red-500"
                          : "bg-white/[0.08]"
                      }
                    `}
                  />
                ))}
              </div>

              <p className="mt-2 text-[11px] text-white/25">
                Use 8+ characters with uppercase,
                lowercase, numbers and symbols.
              </p>
            </div>
          )}
        </div>

        {/* Terms */}
        <div>
          <div className="flex items-start gap-3 pt-1">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={termsAccepted}
              disabled={isLoading}
              onChange={(event) => {
                setTermsAccepted(event.target.checked);

                if (
                  event.target.checked &&
                  errors.terms
                ) {
                  setErrors((current) => ({
                    ...current,
                    terms: undefined,
                  }));
                }

                setSubmitError("");
                setSuccessMessage("");
              }}
              className="
                mt-1
                h-4
                w-4
                shrink-0
                cursor-pointer
                rounded
                border-white/20
                bg-white/5
                accent-red-600
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            />

            <label
              htmlFor="terms"
              className="
                cursor-pointer
                text-xs
                leading-5
                text-white/45
              "
            >
              I agree to the{" "}
              <Link
                href="/terms"
                className="
                  text-white/75
                  transition
                  hover:text-white
                "
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="
                  text-white/75
                  transition
                  hover:text-white
                "
              >
                Privacy Policy
              </Link>
              .
            </label>
          </div>

          {errors.terms && (
            <p className="mt-2 text-xs text-red-400">
              {errors.terms}
            </p>
          )}
        </div>

        {/* Success */}
        {successMessage && (
          <div
            className="
              rounded-2xl
              border
              border-green-500/20
              bg-green-500/[0.06]
              px-4
              py-3
              text-sm
              leading-6
              text-green-300/90
            "
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </div>
        )}

        {/* Error */}
        {submitError && (
          <div
            className="
              rounded-2xl
              border
              border-red-500/20
              bg-red-500/[0.06]
              px-4
              py-3
              text-sm
              leading-6
              text-red-300/80
            "
            role="alert"
            aria-live="polite"
          >
            {submitError}
          </div>
        )}

        {/* Create account */}
        <GlassButton
          type="submit"
          variant="primary"
          disabled={isLoading}
          aria-busy={isLoading}
          className="
            flex
            w-full
            items-center
            justify-center
            py-4
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        >
          {isLoading ? (
            <>
              <span
                className="
                  mr-2
                  h-4
                  w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-white/30
                  border-t-white
                "
              />

              Creating account...
            </>
          ) : (
            <>
              Create account

              <span className="ml-2">
                →
              </span>
            </>
          )}
        </GlassButton>

        {/* Divider */}
        <div className="flex items-center gap-4 py-1">
          <div className="h-px flex-1 bg-white/[0.08]" />

          <span className="text-xs text-white/30">
            OR
          </span>

          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Google */}
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            alert(
              "Google authentication is coming soon."
            );
          }}
          className="
            flex
            h-14
            w-full
            items-center
            justify-center
            gap-3
            rounded-2xl
            border
            border-white/[0.12]
            bg-white/[0.045]
            text-sm
            font-medium
            text-white/80
            backdrop-blur-xl
            transition-all
            duration-300
            hover:border-white/[0.20]
            hover:bg-white/[0.08]
            hover:text-white
            active:scale-[0.98]
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          <span
            className="
              flex
              h-6
              w-6
              items-center
              justify-center
              rounded-full
              bg-white
              text-xs
              font-bold
              text-black
            "
          >
            G
          </span>

          Continue with Google
        </button>

        {/* Login */}
        <p
          className="
            pt-2
            text-center
            text-sm
            text-white/40
          "
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="
              font-medium
              text-white/80
              transition
              hover:text-white
            "
          >
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}