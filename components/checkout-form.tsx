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
    const element = firstInvalid && formRef.current?.elements.namedItem(firstInvalid);
    if (element instanceof HTMLElement) element.focus();
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
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError && (
        <p ref={formErrorRef} role="alert" tabIndex={-1} className="rounded-md border border-red-800/30 bg-red-50 p-3 text-red-900">
          {formError}
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="font-serif text-xl font-semibold">Contact</legend>
        <Field name="email" label="Email" error={errors.email} hint="For the order confirmation.">
          {(props) => <input {...props} type="email" autoComplete="email" />}
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-serif text-xl font-semibold">Shipping address</legend>
        <p className="text-sm text-stone-600">United States only.</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
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

      <div>
        <div className="flex items-start gap-3">
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            value="yes"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? "acceptTerms-error" : undefined}
            className="mt-1 size-5 accent-orange-800"
          />
          <label htmlFor="acceptTerms">
            I accept the{" "}
            <Link href="/terms" target="_blank" className="font-medium underline underline-offset-2">
              terms of sale<span className="sr-only"> (opens in a new tab)</span>
            </Link>
            .
          </label>
        </div>
        {errors.acceptTerms && (
          <p id="acceptTerms-error" className="mt-1 text-sm text-red-800">
            {errors.acceptTerms}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-orange-800 px-5 py-3 font-medium text-white hover:bg-orange-900 disabled:opacity-60 sm:w-auto"
      >
        {submitting ? "Opening the payment page…" : "Continue to payment"}
      </button>
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
      <label htmlFor={name} className="block font-medium">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-stone-600">
          {hint}
        </p>
      )}
      {children({
        id: name,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: `mt-1 w-full rounded-md border bg-white px-3 py-2 ${error ? "border-red-800" : "border-stone-400"}`,
      })}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
