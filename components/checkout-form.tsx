"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { browserApi } from "@/lib/api/client";
import { checkoutDetailsSchema, type CheckoutDetails } from "@/lib/api/contract";
import { firstErrorPerField } from "@/lib/api/field-errors";
import { US_STATES } from "@/lib/us-states";
import { describeFailure } from "./fetch-failure";

type FieldName = keyof CheckoutDetails;
type FieldErrors = Partial<Record<FieldName, string>>;

// Visual order of the fields, so focus goes to the first problem the shopper would read.
const FIELD_ORDER: FieldName[] = ["email", "name", "line1", "line2", "city", "state", "postalCode", "acceptTerms"];

export function CheckoutForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // flushSync renders the messages before focus moves, so a screen reader hears the field together
  // with the error that aria-describedby now points to.
  function showFieldErrors(fieldErrors: FieldErrors) {
    flushSync(() => setErrors(fieldErrors));
    const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field]);
    const invalidControl = firstInvalid && formRef.current?.elements.namedItem(firstInvalid);
    if (invalidControl instanceof HTMLElement) invalidControl.focus();
  }

  function showFormError(message: string) {
    flushSync(() => setFormError(message));
    formErrorRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const candidate = {
      ...Object.fromEntries(FIELD_ORDER.map((field) => [field, form.get(field) ?? ""])),
      acceptTerms: form.get("acceptTerms") === "yes",
    };
    const checked = checkoutDetailsSchema.safeParse(candidate);
    if (!checked.success) {
      showFieldErrors(firstErrorPerField(checked.error));
      return;
    }

    showFieldErrors({});
    setSubmitting(true);
    const started = await browserApi.startPayment(checked.data);
    if (started.ok) {
      window.location.assign(started.data.payment.redirectUrl);
      return;
    }
    setSubmitting(false);
    if (started.failure.kind === "http" && started.failure.fields) {
      showFieldErrors(started.failure.fields);
      return;
    }
    showFormError(describeFailure(started.failure));
  }

  return (
    <form ref={formRef} onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-10">
      {formError && (
        <p ref={formErrorRef} role="alert" tabIndex={-1} className="rounded-xs border border-error bg-surface p-4 text-error">
          {formError}
        </p>
      )}

      <fieldset className="space-y-6">
        <legend className="mb-6 font-serif text-2xl">Contact</legend>
        <Field name="email" label="Email" error={errors.email} hint="For the order confirmation.">
          {(props) => <input {...props} type="email" autoComplete="email" />}
        </Field>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="mb-2 font-serif text-2xl">Shipping address</legend>
        <p className="text-ink-muted">United States only.</p>
        <Field name="name" label="Full name" error={errors.name}>
          {(props) => <input {...props} autoComplete="shipping name" />}
        </Field>
        <Field name="line1" label="Street address" error={errors.line1}>
          {(props) => <input {...props} autoComplete="shipping address-line1" />}
        </Field>
        <Field name="line2" label="Apartment, suite or unit (optional)" error={errors.line2}>
          {(props) => <input {...props} autoComplete="shipping address-line2" />}
        </Field>
        <Field name="city" label="City" error={errors.city}>
          {(props) => <input {...props} autoComplete="shipping address-level2" />}
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field name="state" label="State" error={errors.state}>
            {(props) => (
              <select {...props} autoComplete="shipping address-level1" defaultValue="">
                <option value="" disabled>
                  Choose a state
                </option>
                {US_STATES.map(([code, stateName]) => (
                  <option key={code} value={code}>
                    {stateName}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="postalCode" label="ZIP code" error={errors.postalCode}>
            {(props) => <input {...props} autoComplete="shipping postal-code" inputMode="numeric" />}
          </Field>
        </div>
      </fieldset>

      {/* The terms checkbox sits directly above the button that starts payment. */}
      <div className="space-y-6 border-t border-line pt-8">
        <div>
          <div className="flex items-start gap-4">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              value="yes"
              aria-invalid={errors.acceptTerms ? true : undefined}
              aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
              className="mt-0.5 size-5 shrink-0 accent-ink"
            />
            <label htmlFor="acceptTerms">
              I accept the{" "}
              <Link href="/terms" target="_blank" className="text-link">
                terms of sale<span className="sr-only"> (opens in a new tab)</span>
              </Link>
              .
            </label>
          </div>
          {errors.acceptTerms && (
            <p id="acceptTerms-error" className="mt-2 text-error">
              {errors.acceptTerms}
            </p>
          )}
        </div>

        <button type="submit" disabled={submitting} className="button-primary w-full">
          {submitting ? "Opening the payment page…" : "Continue to payment"}
        </button>
      </div>
    </form>
  );
}

interface ControlProps {
  id: string;
  name: string;
  "aria-invalid": true | undefined;
  "aria-describedby": string | undefined;
  className: string;
}

interface FieldProps {
  name: FieldName;
  label: string;
  error: string | undefined;
  hint?: string;
  children: (props: ControlProps) => ReactNode;
}

function Field({ name, label, error, hint, children }: FieldProps) {
  const hintId = `${name}-hint`;
  const errorId = `${name}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={name} className="block font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-ink-muted">
          {hint}
        </p>
      )}
      {children({
        id: name,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: `field mt-2 ${error ? "field-invalid" : ""}`,
      })}
      {error && (
        <p id={errorId} className="mt-2 text-error">
          {error}
        </p>
      )}
    </div>
  );
}
