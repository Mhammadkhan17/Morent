export type FieldPath =
  | "billingInfo.name"
  | "billingInfo.phone"
  | "billingInfo.address"
  | "billingInfo.city"
  | "rentalInfo.pickup.location"
  | "rentalInfo.pickup.date"
  | "rentalInfo.pickup.time"
  | "rentalInfo.dropoff.location"
  | "rentalInfo.dropoff.date"
  | "rentalInfo.dropoff.time";

export type FieldErrors = Partial<Record<FieldPath, string>>;

/** Visual order of fields — used to focus the first invalid one on submit. */
export const FIELD_ORDER: FieldPath[] = [
  "billingInfo.name",
  "billingInfo.phone",
  "billingInfo.address",
  "billingInfo.city",
  "rentalInfo.pickup.location",
  "rentalInfo.pickup.date",
  "rentalInfo.pickup.time",
  "rentalInfo.dropoff.location",
  "rentalInfo.dropoff.date",
  "rentalInfo.dropoff.time",
];

interface RentalPart {
  date: string;
  location: string;
  time: string;
}

export interface PaymentFormData {
  billingInfo: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  rentalInfo: {
    pickup: RentalPart;
    dropoff: RentalPart;
  };
  agreedToMarketing: boolean;
  agreedToTerms: boolean;
}

/** Field length caps — shared by the validators and the inputs' maxLength. */
export const LIMITS = {
  name: 80,
  phone: 25,
  address: 200,
  city: 80,
  promo: 32,
} as const;

const PHONE_ALLOWED_RE = /^\+?[\d\s()-]+$/;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

/** Today (local) as `yyyy-mm-dd`, for the date inputs' `min` attribute. */
export function todayISO(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function lengthError(
  value: string,
  label: string,
  emptyMessage: string,
  max: number
): string | null {
  if (!value) return emptyMessage;
  if (value.length > max) {
    return `Keep your ${label} to ${max} characters or fewer.`;
  }
  return null;
}

/** Digits drive the check, so "+49 (0) 170 123-4567" and "555 123 4567" both pass. */
function phoneError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Enter your phone number.";
  if (!PHONE_ALLOWED_RE.test(value)) {
    return "Use digits only — plus + ( ) - or spaces are fine.";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < PHONE_MIN_DIGITS) {
    return "Enter a valid phone number (at least 7 digits).";
  }
  if (digits.length > PHONE_MAX_DIGITS) {
    return "Phone numbers are at most 15 digits.";
  }
  return null;
}

/** Validate a single field; returns an error message or null when valid. */
export function validateField(
  path: FieldPath,
  data: PaymentFormData
): string | null {
  const { billingInfo, rentalInfo } = data;

  switch (path) {
    case "billingInfo.name": {
      const value = billingInfo.name.trim();
      if (value.length < 2) {
        return "Enter your name (at least 2 characters).";
      }
      if (value.length > LIMITS.name) {
        return `Keep your name to ${LIMITS.name} characters or fewer.`;
      }
      return null;
    }
    case "billingInfo.phone":
      return phoneError(billingInfo.phone);
    case "billingInfo.address":
      return lengthError(
        billingInfo.address.trim(),
        "address",
        "Enter your address.",
        LIMITS.address
      );
    case "billingInfo.city":
      return lengthError(
        billingInfo.city.trim(),
        "city",
        "Enter your town or city.",
        LIMITS.city
      );
    case "rentalInfo.pickup.location":
      return rentalInfo.pickup.location
        ? null
        : "Select a pickup location.";
    case "rentalInfo.pickup.date": {
      const value = rentalInfo.pickup.date;
      if (!value) return "Choose a pickup date.";
      if (value < todayISO()) return "Pickup date can't be in the past.";
      return null;
    }
    case "rentalInfo.pickup.time":
      return rentalInfo.pickup.time ? null : "Choose a pickup time.";
    case "rentalInfo.dropoff.location":
      return rentalInfo.dropoff.location
        ? null
        : "Select a drop-off location.";
    case "rentalInfo.dropoff.date": {
      const value = rentalInfo.dropoff.date;
      if (!value) return "Choose a drop-off date.";
      if (value < todayISO()) return "Drop-off date can't be in the past.";
      if (rentalInfo.pickup.date && value < rentalInfo.pickup.date) {
        return "Drop-off must be on or after pickup.";
      }
      return null;
    }
    case "rentalInfo.dropoff.time": {
      const value = rentalInfo.dropoff.time;
      if (!value) return "Choose a drop-off time.";
      const { pickup, dropoff } = rentalInfo;
      if (
        pickup.date &&
        dropoff.date &&
        pickup.date === dropoff.date &&
        pickup.time &&
        value <= pickup.time
      ) {
        return "Drop-off must be after pickup on the same day.";
      }
      return null;
    }
    default:
      return null;
  }
}

/** Validate every field in visual order. */
export function validateForm(data: PaymentFormData): FieldErrors {
  const errors: FieldErrors = {};
  for (const path of FIELD_ORDER) {
    const message = validateField(path, data);
    if (message) errors[path] = message;
  }
  return errors;
}

/** DOM id of the input/trigger for a field path (matches component ids). */
export function fieldElementId(path: FieldPath): string {
  if (path.startsWith("billingInfo.")) {
    return `billing-${path.slice("billingInfo.".length)}`;
  }
  const match = path.match(/^rentalInfo\.(pickup|dropoff)\.(.+)$/);
  return match ? `${match[1]}-${match[2]}` : path;
}
