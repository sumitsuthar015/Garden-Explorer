"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Wiring the labelled control needs; spread onto the actual input element. */
export interface FormFieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
}

interface FormFieldProps {
  /** Stable id used to wire label / description / error via aria attributes. */
  id: string;
  label: string;
  description?: string;
  error?: string | string[];
  required?: boolean;
  className?: string;
  /**
   * The control itself, which receives the wiring automatically — or, when the
   * control sits inside a wrapper (e.g. next to a button), a function that
   * spreads the wiring onto the control.
   */
  children: React.ReactNode | ((control: FormFieldControlProps) => React.ReactNode);
}

/**
 * Accessible field wrapper.
 * Renders label, optional help text and validation errors, and connects them
 * to the control through `aria-describedby` / `aria-invalid` slots that the
 * child control inherits via its own `id`.
 */
export function FormField({
  id,
  label,
  description,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const errorText = Array.isArray(error) ? error[0] : error;
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = errorText ? `${id}-error` : undefined;
  const control: FormFieldControlProps = {
    id,
    "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": errorText ? true : undefined,
    "aria-required": required || undefined,
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {/* Visual cue only, kept outside the label so the field's name stays
            exactly `label`; the control's aria-required announces it. */}
        {required ? (
          <span className="text-sm leading-none text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </div>

      {typeof children === "function"
        ? children(control)
        : React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              ...control,
            })
          : children}

      {description ? (
        <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      {errorText ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
