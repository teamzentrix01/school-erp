"use client";

import { useEffect } from "react";

const TODAY = new Date().toISOString().slice(0, 10);
const AADHAAR_PATTERN = /aadhaar|aadhar/i;
const PINCODE_PATTERN = /pin\s*code|pincode|postal|zip/i;
const PAST_DATE_PATTERN = /date of birth|dob|attendance date|payment date|joining date|join date|service date/i;
const SUPPORTED_INPUT_TYPES = new Set([
  "date",
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url",
]);

function getSemanticText(input) {
  const directLabel = Array.from(input.labels || [])
    .map((label) => label.textContent)
    .join(" ");
  const nearbyLabel = input.closest("label")?.textContent ||
    input.parentElement?.querySelector(":scope > label")?.textContent || "";

  return [
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute("aria-label"),
    directLabel,
    nearbyLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function setNativeValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  );
  descriptor?.set?.call(input, value);
}

function textLimit(semantic) {
  if (/email/i.test(semantic)) return 254;
  if (/password/i.test(semantic)) return 128;
  if (/address|description|content|message|notes?|reason/i.test(semantic)) return 2000;
  if (/title|subject/i.test(semantic)) return 200;
  if (/name/i.test(semantic)) return 100;
  return 500;
}

function isLookupInput(input) {
  return input.type === "search" || /search|filter/i.test(input.placeholder || "");
}

function isPhoneField(semantic) {
  if (/contact\s*(person|name)|person\s*contact/i.test(semantic)) return false;
  return /phone|mobile|contact\s*(number|no\b)|guardian contact|parent contact|emergency contact/i.test(
    semantic,
  );
}

function configureInput(input) {
  if (
    !(input instanceof window.HTMLInputElement) ||
    input.readOnly ||
    input.disabled ||
    !SUPPORTED_INPUT_TYPES.has(input.type)
  )
    return;
  const semantic = getSemanticText(input);
  const lookup = isLookupInput(input);

  if (!lookup && AADHAAR_PATTERN.test(semantic)) {
    input.inputMode = "numeric";
    input.maxLength = 12;
    input.pattern = "[0-9]{12}";
    input.autocomplete = "off";
  } else if (!lookup && isPhoneField(semantic)) {
    input.inputMode = "numeric";
    input.maxLength = 10;
    input.pattern = "[0-9]{10}";
  } else if (PINCODE_PATTERN.test(semantic)) {
    input.inputMode = "numeric";
    input.maxLength = 6;
    input.pattern = "[0-9]{6}";
  } else if (input.type === "email") {
    input.maxLength = 254;
  } else if (["text", "search", "password", "url"].includes(input.type)) {
    if (!input.maxLength || input.maxLength < 0) input.maxLength = textLimit(semantic);
  }

  if (input.type === "date") {
    input.min ||= "1900-01-01";
    input.max ||= PAST_DATE_PATTERN.test(semantic) ? TODAY : "2100-12-31";
  }

  if (input.type === "number") {
    if (!input.hasAttribute("min")) input.min = "0";
    if (/percentage|percent/i.test(semantic) && !input.hasAttribute("max")) input.max = "100";
    input.step ||= /amount|fee|salary|price|cost|distance|percentage/i.test(semantic)
      ? "0.01"
      : "1";
  }
}

function sanitizeInput(input) {
  if (
    !(input instanceof window.HTMLInputElement) ||
    input.readOnly ||
    input.disabled ||
    !SUPPORTED_INPUT_TYPES.has(input.type)
  )
    return;
  const semantic = getSemanticText(input);
  const lookup = isLookupInput(input);
  let nextValue = input.value;
  let message = "";

  if (!lookup && AADHAAR_PATTERN.test(semantic)) {
    nextValue = nextValue.replace(/\D/g, "").slice(0, 12);
    if (nextValue && nextValue.length !== 12) message = "Aadhaar number must be exactly 12 digits.";
  } else if (!lookup && isPhoneField(semantic)) {
    nextValue = nextValue.replace(/\D/g, "").slice(0, 10);
    if (nextValue && nextValue.length !== 10) message = "Mobile number must be exactly 10 digits.";
  } else if (PINCODE_PATTERN.test(semantic)) {
    nextValue = nextValue.replace(/\D/g, "").slice(0, 6);
    if (nextValue && nextValue.length !== 6) message = "PIN code must be exactly 6 digits.";
  }

  if (nextValue !== input.value) setNativeValue(input, nextValue);

  if (input.type === "date" && input.value) {
    const year = Number(input.value.slice(0, 4));
    if (year < 1900 || year > 2100) message = "Enter a valid date with a 4-digit year.";
    if (input.max && input.value > input.max) message = "This date cannot be in the future.";
    if (input.min && input.value < input.min) message = `Date cannot be earlier than ${input.min}.`;
  }

  input.setCustomValidity(message);
}

export default function ProjectInputValidation() {
  useEffect(() => {
    const configureAll = (root = document) => {
      if (root instanceof window.HTMLInputElement) configureInput(root);
      root.querySelectorAll?.("input").forEach(configureInput);
    };

    const handleInput = (event) => {
      configureInput(event.target);
      sanitizeInput(event.target);
    };

    const handleBlur = (event) => sanitizeInput(event.target);
    const handleSubmit = (event) => {
      configureAll(event.target);
      event.target.querySelectorAll("input").forEach(sanitizeInput);
      if (!event.target.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        event.target.reportValidity();
      }
    };

    configureAll();
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(configureAll));
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("input", handleInput, true);
    document.addEventListener("blur", handleBlur, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("blur", handleBlur, true);
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}
