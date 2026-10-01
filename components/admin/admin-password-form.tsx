"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { KeyRound, ShieldCheck } from "lucide-react";

import { changePassword } from "@/lib/auth-client";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validation/settings";
import { formResolver } from "@/lib/forms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";

/**
 * Change the signed-in admin's password.
 *
 * Better Auth verifies the current password, hashes the new one and (because
 * `revokeOtherSessions` is set) invalidates every other active session — which
 * is what you want on a shared garden laptop.
 */
export function AdminPasswordForm() {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: formResolver<ChangePasswordInput>(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setServerError(null);

    try {
      const result = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setServerError(
          result.error.status === 400
            ? "That current password is not correct."
            : "We could not change your password right now. Please try again.",
        );
        return;
      }

      toast.success("Password changed", "Other signed-in devices have been signed out.");
      form.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      setServerError("We could not change your password right now. Please try again.");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="font-heading text-base font-semibold">Your password</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Admin accounts are created with <span className="font-mono">npm run admin:create</span>. Change
        the password here after your first sign-in; every other device is signed out when you do.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4" noValidate>
        {serverError ? (
          <Alert variant="destructive">
            <KeyRound aria-hidden="true" />
            <div>
              <AlertTitle>Could not change password</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </div>
          </Alert>
        ) : null}

        <FormField
          id="current-password"
          label="Current password"
          required
          error={form.formState.errors.currentPassword?.message}
        >
          <Input
            type="password"
            autoComplete="current-password"
            {...form.register("currentPassword")}
          />
        </FormField>

        <FormField
          id="new-password"
          label="New password"
          required
          error={form.formState.errors.newPassword?.message}
          description="At least 12 characters, with upper and lower case letters and a number."
        >
          <Input type="password" autoComplete="new-password" {...form.register("newPassword")} />
        </FormField>

        <FormField
          id="confirm-password"
          label="Confirm new password"
          required
          error={form.formState.errors.confirmPassword?.message}
        >
          <Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        </FormField>

        <div className="flex items-center gap-3">
          <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
            <ShieldCheck aria-hidden="true" />
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}
