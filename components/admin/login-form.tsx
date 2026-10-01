"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { signIn } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validation/settings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

/**
 * Admin sign-in.
 *
 * Visitors never see this form and public sign-up does not exist: the auth
 * config sets `disableSignUp`, and accounts are only ever created by
 * `npm run admin:create`. Failure messages stay deliberately generic so the form
 * cannot be used to discover which staff emails exist.
 */
export function LoginForm({ redirectTo = "/admin" }: { redirectTo?: string }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: true,
      });

      if (result.error) {
        setServerError(
          result.error.status === 429
            ? "Too many attempts. Please wait a minute and try again."
            : "Those details did not match. Please check your email and password.",
        );
        return;
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setServerError("We could not sign you in right now. Please try again.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <LogIn aria-hidden="true" />
          <div>
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <FormField
        id="email"
        label="Email address"
        required
        error={form.formState.errors.email?.message}
      >
        <Input
          type="email"
          autoComplete="username"
          autoFocus
          placeholder="you@garden.org"
          {...form.register("email")}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        required
        error={form.formState.errors.password?.message}
      >
        {(control) => (
          <div className="relative">
            <Input
              {...control}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              className="pr-11"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        )}
      </FormField>

      <Button
        type="submit"
        size="lg"
        loading={form.formState.isSubmitting}
        loadingLabel="Signing in…"
      >
        <LogIn aria-hidden="true" />
        Sign in
      </Button>
    </form>
  );
}
