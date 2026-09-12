"use client";

import {
  InputHTMLAttributes,
  forwardRef,
} from "react";

interface FormInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        <label
          htmlFor={props.id}
          className="
            mb-2
            block
            text-sm
            font-medium
            text-white/70
          "
        >
          {label}
        </label>

        <input
          ref={ref}
          {...props}
          className={`
            h-14
            w-full
            rounded-2xl
            border
            ${
              error
                ? "border-red-500/60"
                : "border-white/[0.12]"
            }
            bg-white/[0.045]
            px-5
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
            ${className}
          `}
        />

        {error && (
          <p className="mt-2 text-xs text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;