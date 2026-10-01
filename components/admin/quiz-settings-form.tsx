"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Save } from "lucide-react";

import { updateQuizAction } from "@/lib/actions/admin-quizzes";
import { quizSchema, type QuizInput } from "@/lib/validation/quiz";
import { formResolver } from "@/lib/forms";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";

interface QuizSettingsFormProps {
  defaultValues: {
    id: string;
    locationId: string;
    title: string;
    description: string;
    completionPoints: number;
    displayOrder: number;
    status: QuizInput["status"];
  };
}

/** Title, framing copy and the points awarded for finishing the whole quiz. */
export function QuizSettingsForm({ defaultValues }: QuizSettingsFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<QuizInput>({
    resolver: formResolver<QuizInput>(quizSchema),
    defaultValues: {
      ...defaultValues,
      description: defaultValues.description,
    },
  });

  async function onSubmit(values: QuizInput) {
    setServerError(null);

    const result = await updateQuizAction({
      ...values,
      description: values.description || "",
    });

    if (!result.ok) {
      setServerError(result.message);
      toast.error("Could not save this quiz", result.message);
      return;
    }

    toast.success("Quiz saved");
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
      {serverError ? (
        <Alert variant="destructive">
          <Save aria-hidden="true" />
          <div>
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{serverError}</AlertDescription>
          </div>
        </Alert>
      ) : null}

      <Card className="flex flex-col gap-5 p-5">
        <h2 className="font-heading text-base font-semibold">Quiz settings</h2>

        <FormField
          id="quiz-title"
          label="Title"
          required
          error={form.formState.errors.title?.message}
        >
          <Input maxLength={120} {...form.register("title")} />
        </FormField>

        <FormField
          id="quiz-description"
          label="Introduction"
          error={form.formState.errors.description?.message}
          description="One friendly line shown above the first question."
        >
          <Textarea
            rows={2}
            maxLength={400}
            placeholder="Three quick questions about Butterfly Watch."
            {...form.register("description")}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="quiz-completion-points"
            label="Points for finishing"
            error={form.formState.errors.completionPoints?.message}
            description="Awarded once when the visitor completes the quiz."
          >
            <Input type="number" min={0} max={500} {...form.register("completionPoints")} />
          </FormField>

          <FormField
            id="quiz-order"
            label="Display order"
            error={form.formState.errors.displayOrder?.message}
            description="When a place has several quizzes, lower numbers come first."
          >
            <Input type="number" min={0} max={9999} {...form.register("displayOrder")} />
          </FormField>
        </div>

        <div>
          <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
            <Save aria-hidden="true" />
            Save settings
          </Button>
        </div>
      </Card>
    </form>
  );
}
