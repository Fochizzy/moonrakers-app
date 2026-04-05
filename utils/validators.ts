// ==============================
// 🧠 Core Types
// ==============================

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message?: string };

export type Validator<T> = (input: unknown) => ValidationResult<T>;

// ==============================
// 🔒 Precompiled Patterns
// ==============================

const NAME_PATTERN = /^[a-zA-Z0-9 _-]+$/;
const NUMBER_PATTERN = /^[-+]?\d+(\.\d+)?$/;

// ==============================
// 🧰 Core Utilities
// ==============================

export function toTrimmedString(input: unknown): string {
  return typeof input === 'string' ? input.trim() : '';
}

export function normalize(input: unknown): string {
  return toTrimmedString(input).toLowerCase();
}

export function canonicalizeName(input: unknown): string {
  return normalize(input).replace(/\s+/g, ' ');
}

// ==============================
// 🧩 Validator Composition
// ==============================

export function pipeValidators<T>(
  ...validators: Validator<any>[]
): Validator<T> {
  return (input: unknown) => {
    let current: unknown = input;

    for (const validate of validators) {
      const result = validate(current);
      if (!result.ok) return result;
      current = result.value;
    }

    return { ok: true, value: current as T };
  };
}

// ==============================
// 👤 Player Name Validator
// ==============================

export type NameOptions = {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
};

export function createPlayerNameValidator(
  {
    minLength = 1,
    maxLength = 20,
    pattern = NAME_PATTERN,
  }: NameOptions = {}
): Validator<string> {
  return pipeValidators<string>(
    (input) => {
      const value = toTrimmedString(input);
      if (!value) {
        return { ok: false, code: 'EMPTY_NAME' };
      }
      return { ok: true, value };
    },
    (value) => {
      if (value.length < minLength || value.length > maxLength) {
        return { ok: false, code: 'INVALID_LENGTH' };
      }
      return { ok: true, value };
    },
    (value) => {
      if (!pattern.test(value)) {
        return { ok: false, code: 'INVALID_CHARACTERS' };
      }
      return { ok: true, value };
    },
    (value) => ({
      ok: true,
      value: canonicalizeName(value),
    })
  );
}

// ==============================
// 🔁 Unique Name Validator
// ==============================

export function createUniqueNameValidator(
  existing: readonly string[]
): Validator<string> {
  const set = new Set(existing.map(canonicalizeName));

  return (input) => {
    const name = canonicalizeName(input);

    if (!name) {
      return { ok: false, code: 'EMPTY_NAME' };
    }

    if (set.has(name)) {
      return { ok: false, code: 'DUPLICATE_NAME' };
    }

    return { ok: true, value: name };
  };
}

// ==============================
// 🔢 Score / Prestige Validator
// ==============================

export type ScoreOptions = {
  allowNegative?: boolean;
  allowFloat?: boolean;
  min?: number;
  max?: number;
};

export function createScoreValidator(
  {
    allowNegative = true,
    allowFloat = true,
    min,
    max,
  }: ScoreOptions = {}
): Validator<number> {
  return pipeValidators<number>(
    (input) => {
      const raw = toTrimmedString(input);
      if (!raw) {
        return { ok: false, code: 'EMPTY_SCORE' };
      }

      if (!NUMBER_PATTERN.test(raw)) {
        return { ok: false, code: 'INVALID_FORMAT' };
      }

      return { ok: true, value: Number(raw) };
    },
    (num) => {
      if (!Number.isFinite(num)) {
        return { ok: false, code: 'INVALID_NUMBER' };
      }
      return { ok: true, value: num };
    },
    (num) => {
      if (!allowNegative && num < 0) {
        return { ok: false, code: 'NEGATIVE_NOT_ALLOWED' };
      }
      return { ok: true, value: num };
    },
    (num) => {
      if (!allowFloat && !Number.isInteger(num)) {
        return { ok: false, code: 'FLOAT_NOT_ALLOWED' };
      }
      return { ok: true, value: num };
    },
    (num) => {
      if (min != null && num < min) {
        return { ok: false, code: 'BELOW_MIN' };
      }
      if (max != null && num > max) {
        return { ok: false, code: 'ABOVE_MAX' };
      }
      return { ok: true, value: num };
    }
  );
}

/**
 * Binary assist validator.
 * Assist presence is Yes/No only.
 */
export function validateAssistBinary(input: unknown): ValidationResult<0 | 1> {
  if (input === 0 || input === '0' || input === false || input === 'false') {
    return { ok: true, value: 0 };
  }

  if (input === 1 || input === '1' || input === true || input === 'true') {
    return { ok: true, value: 1 };
  }

  return { ok: false, code: 'ASSIST_MUST_BE_BINARY' };
}

/**
 * Assist prestige can be negative.
 */
export function validateAssistPrestige(
  input: unknown,
  options?: Omit<ScoreOptions, 'allowNegative'>
): ValidationResult<number> {
  return createScoreValidator({
    allowNegative: true,
    ...options,
  })(input);
}

export function validatePlayerName(
  input: unknown,
  existing: readonly string[] = []
): ValidationResult<string> {
  const validate = pipeValidators<string>(
    createPlayerNameValidator(),
    createUniqueNameValidator(existing)
  );

  return validate(input);
}

export function validateScore(
  input: unknown,
  options?: ScoreOptions
): ValidationResult<number> {
  return createScoreValidator(options)(input);
}
