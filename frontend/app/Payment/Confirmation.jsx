"use client";
import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const ConfirmationSection = ({
  formData = {},
  onCheckboxChange,
  onSubmit,
  isSubmitting = false,
}) => {
  const [termsError, setTermsError] = useState(false);

  const { agreedToMarketing = false, agreedToTerms = false } = formData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    await onSubmit();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">Confirmation</CardTitle>
            <CardDescription>
              We are getting to the end. Just a few clicks and your rental is
              ready!
            </CardDescription>
          </div>
          <Badge variant="secondary">Step 4 of 4</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <FieldGroup className="flex flex-col gap-3">
            <label
              htmlFor="newsletter"
              className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50"
            >
              <Checkbox
                id="newsletter"
                checked={agreedToMarketing}
                onCheckedChange={(checked) =>
                  onCheckboxChange("agreedToMarketing", checked === true)
                }
                className="mt-0.5"
              />
              <span className="text-sm font-medium leading-relaxed">
                I agree with sending Marketing and newsletter emails. No spam,
                promised!
              </span>
            </label>

            <div>
              <label
                htmlFor="terms"
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/50",
                  termsError && "border-destructive"
                )}
              >
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => {
                    onCheckboxChange("agreedToTerms", checked === true);
                    if (checked === true) setTermsError(false);
                  }}
                  aria-invalid={termsError || undefined}
                  className="mt-0.5"
                />
                <span className="text-sm font-medium leading-relaxed">
                  I agree with our terms and conditions and privacy policy.
                </span>
              </label>
              {termsError && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  Please agree to the terms and conditions.
                </p>
              )}
            </div>
          </FieldGroup>

          <div>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Processing..." : "Rent now"}
            </Button>
          </div>
        </form>

        <div className="flex items-start gap-3 rounded-lg bg-muted p-4">
          <ShieldCheck
            aria-hidden="true"
            className="size-8 shrink-0 text-primary"
          />
          <div>
            <p className="text-sm font-semibold">All your data are safe</p>
            <p className="text-sm text-muted-foreground">
              We are using the most advanced security to provide you the best
              experience ever.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfirmationSection;
