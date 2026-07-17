const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const PHONE_KEYS = /(^|_)(phone|mobile|contact)(_number)?$/i;
const AADHAAR_KEYS = /(^|_)(aadhaar|aadhar)(_number)?$/i;
const PINCODE_KEYS = /(^|_)(pin|pincode|pin_code|postal_code|zip_code)$/i;
const EMAIL_KEYS = /(^|_)email$/i;
const PASSWORD_KEYS = /(^|_)(password|new_password)$/i;
const PAN_KEYS = /(^|_)(pan|pan_number)$/i;
const IFSC_KEYS = /(^|_)(ifsc|ifsc_code)$/i;
const DATE_KEYS = /(^|_)(date|dob|date_of_birth)$/i;
const NON_NEGATIVE_KEYS = /(^|_)(amount|fee|fees|salary|price|cost|distance_km|capacity|marks|total_marks|passing_marks|rent|fine|discount|quantity|seats|paid|balance|income|expense)$/i;
const POSITIVE_KEYS = /(^|_)(payment_amount|amount_paid|capacity|quantity|total_marks|max_marks)$/i;
const PERCENT_KEYS = /(^|_)(percentage|percent|attendance_pct|discount_percentage)$/i;
const ID_KEYS = /(^|_)(id|user_id|student_id|teacher_id|class_id|route_id|vehicle_id|room_id|book_id)$/i;
const URL_KEYS = /(^|_)(url|link)$/i;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isRealDate(value) {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1900 &&
    year <= 2100 &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function readableField(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function validateScalar(key, rawValue, errors) {
  if (!hasValue(rawValue)) return rawValue;

  const normalizedKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
  let value =
    typeof rawValue === "string" && !PASSWORD_KEYS.test(normalizedKey)
      ? rawValue.trim()
      : rawValue;
  const label = readableField(key);

  if (PHONE_KEYS.test(normalizedKey)) {
    value = String(value).replace(/\D/g, "");
    if (!/^\d{10}$/.test(value)) errors.push(`${label} must be exactly 10 digits.`);
  } else if (AADHAAR_KEYS.test(normalizedKey)) {
    value = String(value).replace(/\D/g, "");
    if (!/^\d{12}$/.test(value)) errors.push(`${label} must be exactly 12 digits.`);
  } else if (PINCODE_KEYS.test(normalizedKey)) {
    value = String(value).replace(/\D/g, "");
    if (!/^\d{6}$/.test(value)) errors.push(`${label} must be exactly 6 digits.`);
  } else if (EMAIL_KEYS.test(normalizedKey) && !EMAIL_PATTERN.test(String(value))) {
    errors.push(`${label} is not a valid email address.`);
  } else if (PASSWORD_KEYS.test(normalizedKey)) {
    if (String(value).length < 6) errors.push(`${label} must contain at least 6 characters.`);
    if (String(value).length > 128) errors.push(`${label} cannot exceed 128 characters.`);
  } else if (PAN_KEYS.test(normalizedKey)) {
    value = String(value).toUpperCase();
    if (!PAN_PATTERN.test(value)) errors.push(`${label} must be a valid PAN number.`);
  } else if (IFSC_KEYS.test(normalizedKey)) {
    value = String(value).toUpperCase();
    if (!IFSC_PATTERN.test(value)) errors.push(`${label} must be a valid IFSC code.`);
  } else if (DATE_KEYS.test(normalizedKey)) {
    const dateValue = String(value).slice(0, 10);
    if (!isRealDate(dateValue)) errors.push(`${label} must be a valid date with a 4-digit year.`);
    value = dateValue;
  } else if (PERCENT_KEYS.test(normalizedKey)) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100) {
      errors.push(`${label} must be between 0 and 100.`);
    }
  } else if (NON_NEGATIVE_KEYS.test(normalizedKey) || POSITIVE_KEYS.test(normalizedKey)) {
    const number = Number(value);
    const minimum = POSITIVE_KEYS.test(normalizedKey) ? Number.EPSILON : 0;
    if (!Number.isFinite(number) || number < minimum) {
      errors.push(`${label} must be ${minimum ? "greater than zero" : "zero or greater"}.`);
    }
  } else if (ID_KEYS.test(normalizedKey) && typeof value !== "string") {
    if (!Number.isInteger(value) || value <= 0) errors.push(`${label} must be a positive integer.`);
  } else if (URL_KEYS.test(normalizedKey) && !String(value).startsWith("/")) {
    try {
      const url = new URL(String(value));
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
    } catch {
      errors.push(`${label} must be a valid HTTP or HTTPS URL.`);
    }
  }

  if (typeof value === "string") {
    const limit = /description|content|address|notes?|reason/i.test(normalizedKey) ? 5000 : 500;
    if (value.length > limit) errors.push(`${label} cannot exceed ${limit} characters.`);
  }

  return value;
}

function validateObject(payload, errors) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  for (const [key, rawValue] of Object.entries(payload)) {
    if (Array.isArray(rawValue)) {
      payload[key] = rawValue.map((item) =>
        item && typeof item === "object" ? validateObject(item, errors) : item,
      );
    } else if (rawValue && typeof rawValue === "object") {
      payload[key] = validateObject(rawValue, errors);
    } else {
      payload[key] = validateScalar(key, rawValue, errors);
    }
  }

  const datePairs = [
    ["from_date", "to_date"],
    ["start_date", "end_date"],
    ["issue_date", "expiry_date"],
  ];
  for (const [startKey, endKey] of datePairs) {
    if (hasValue(payload[startKey]) && hasValue(payload[endKey]) && payload[startKey] > payload[endKey]) {
      errors.push(`${readableField(endKey)} cannot be earlier than ${readableField(startKey)}.`);
    }
  }

  const dob = payload.date_of_birth || payload.dob;
  if (hasValue(dob) && isRealDate(String(dob)) && String(dob) > new Date().toISOString().slice(0, 10)) {
    errors.push("Date Of Birth cannot be in the future.");
  }

  return payload;
}

function validatePayload(payload) {
  const errors = [];
  validateObject(payload, errors);
  return { valid: errors.length === 0, errors };
}

function requestValidation(req, res, next) {
  if (!["POST", "PUT", "PATCH"].includes(req.method) || !req.body) return next();
  const result = validatePayload(req.body);
  if (!result.valid) {
    return res.status(400).json({ message: result.errors[0], errors: result.errors });
  }
  next();
}

module.exports = { requestValidation, validatePayload };
