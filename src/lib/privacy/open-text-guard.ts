// src/lib/privacy/open-text-guard.ts

/**
 * Shared Privacy & Data Governance Guard for Open Text Fields
 *
 * Implements automated detection and redaction of Sensitive Personal Information (SPI)
 * and Personally Identifiable Information (PII) according to GDPR (Art. 9),
 * Philippine Data Privacy Act (DPA), and theocratic territory governance guidelines (S-13).
 */

// ─── PII REGULAR EXPRESSIONS ──────────────────────────────────────────────────

// Matches Philippine mobile numbers, landlines, and international telephone numbers
export const PHONE_REGEX =
  /(?:\+?63\s*|0)?9\d{2}[-\s.]?\d{3}[-\s.]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b09\d{9}\b|\b\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;

// Matches email addresses
export const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi;

// Matches social media handles and messaging URLs
export const CONTACT_HANDLE_REGEX =
  /\b(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com|m\.me|instagram\.com|t\.me|wa\.me|viber:\/\/)\/[A-Za-z0-9_.-]+|\b@[A-Za-z0-9_.-]{3,30}\b/gi;

// Matches honorific titles with person names (e.g. "Mrs. Santos", "Dr. Ramos")
export const HONORIFIC_NAME_REGEX =
  /\b(?:Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Atty\.?|Engr\.?|Bro\.?|Brother|Sis\.?|Sister|Tatay|Nanay|Lolo|Lola|Kuya|Ate|Don|Doña)\s+[A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2}\b/g;

// Matches person names preceded by conversational / relationship prompts in notes
export const NAME_CONVERSATIONAL_REGEX =
  /\b(?:look\s+for|hanapin\s+si|hahanapin\s+si|tanungin\s+si|spoke\s+with|talked\s+to|kinausap\s+si|kausap\s+si|met\s+with|resident\s+named|occupant\s+named|owner\s+named|may-ari\s+si|tenant\s+named)\s+([A-Z][a-z'-]+(?:\s+[A-Z][a-z'-]+){0,2})\b/gi;

// Matches residential / family names (e.g. "Santos Residence", "Cruz Family", "In front of Santos Residence")
export const RESIDENCE_PATTERNS = [
  /\b(?:near|beside|across\s+from|across|in\s+front\s+of|behind|at|tapat\s+ng|tabi\s+ng)\s+(?:the\s+)?(?:(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Atty\.?|Engr\.?)\s+)?[a-zA-Z'-]+(?:\s+[a-zA-Z'-]+)?\s+(?:Residence|Family|House|Home)\b/gi,
  /\b(?:(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Atty\.?|Engr\.?)\s+)?[a-zA-Z'-]+(?:\s+[a-zA-Z'-]+)?\s+Residence\b/gi,
  /\bResidence\s+(?:of|ni)\s+(?:(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s+)?[a-zA-Z'-]+(?:\s+[a-zA-Z'-]+)?\b/gi,
  /\b(?:(?:Mr\.?|Mrs\.?|Ms\.?)\s+)?[a-zA-Z'-]+\s+Family\b/gi,
  /\bFamily\s+[a-zA-Z'-]+\b/gi,
  /\b(?:bahay|tahanan)\s+ni\s+[a-zA-Z'-]+(?:\s+[a-zA-Z'-]+)?\b/gi,
];

// ─── SPI (SENSITIVE PERSONAL INFORMATION) REGULAR EXPRESSIONS ─────────────────

// 1. Religious Affiliations, Clergy, Theocratic Classifications, Theological Stances
export const SPI_RELIGION_REGEX =
  /\b(?:Roman\s+)?Catholics?\b|\bKatoliko\b|\bBorn\s*-?\s*Again(?:\s+Christians?)?\b|\bIglesia\s+ni\s+Cristo\b|\bINC\b|\bBaptists?\b|\bMethodists?\b|\b(?:Seventh[\s-]Day\s*)?Adventists?\b|\bSabadista\b|\bSDA\b|\bMormons?\b|\bLatter[\s-]day\s+Saints\b|\bLDS\b|\bPentecostals?\b|\bCharismatics?\b|\bEvangelicals?\b|\bProtestants?\b|\bMuslims?\b|\bIslam\b|\bMoslems?\b|\bBuddhists?\b|\bBuddhism\b|\bHindus?\b|\bHinduism\b|\bJewish\b|\bJudaism\b|\bAtheists?\b|\bAtheism\b|\bAgnostics?\b|\bAng\s+Dating\s+Daan\b|\bMCGI\b|\bKOJC\b|\bQuiboloy\b|\bAglipayan?\b|\bIFI\b|\b(?:priests?|pari|pastors?|pastora|ministers?|ministro|imams?|nuns?|madre|deacons?|diakono|bishops?|obispo)\b|\b(?:former|ex)[\s-]jws?\b|\bdisfellowshipped\b|\btiwalag\b|\bunfellowshipped\b|\bapostates?\b|\binactive\s+(?:publisher|jw)\b|\b(?:trinity|trinidad|naniniwala\s+sa\s+trinidad)\b/gi;

// 2. Health, Medical Conditions, Disabilities, Vulnerabilities, Mental Health
export const SPI_HEALTH_REGEX =
  /\b(?:cancer|tumor|leukemia|chemotherapy|chemo)\b|\b(?:covid(?:-?19)?|coronavirus|tuberculosis|\bTB\b)\b|\b(?:strokes?|inatake\s+sa\s+puso|heart\s+attack|cardiac\s+arrest)\b|\b(?:bedridden|paralyzed|paralytic|nakahiga\s+na\s+lang)\b|\b(?:dialysis|kidney\s+failure|hypertension|diabetes|diabetic)\b|\b(?:blind|bulag|deaf|bingi|mute|pipi|wheelchair(?:-bound)?|amputee)\b|\b(?:dementia|alzheimer(?:'s)?|memory\s+loss|makakalimutin)\b|\b(?:depressed|depression|mental\s+illness|bipolar|schizophreni[ac]|autistic|autism|special\s+needs|down\s+syndrome|sira-?ulo|baliw|may\s+kapansanan)\b|\b(?:in\s+hospital|hospitalized|na-?ospital|confined(?:\s+in\s+hospital)?|critical\s+condition|terminal\s+illness|dying)\b/gi;

// 3. Political Opinions, Movements, Government Official Roles Attached to Resident
export const SPI_POLITICAL_REGEX =
  /\b(?:communists?|NPA|rebels?|activists?|terrorists?)\b|\b(?:DDS|Kakampink|BBM\s+loyalist|Marcos\s+loyalist|Dilawan|Liberal\s+Party)\b|\b(?:barangay\s+captain|kapitan|kagawad|chairman|mayors?|councilors?|konsehal|congressm[ae]n|governors?)\b/gi;

// 4. Sensitive Marital / Gender / Sexual / Criminal Disclosures
export const SPI_SENSITIVE_STATUS_REGEX =
  /\b(?:mistress|kabit|kerida|live-in(?:\s+partners?)?|divorced|separated|hiwalay)\b|\b(?:LGBTQ?\+?|gays?|lesbians?|homosexuals?|bisexuals?|transgenders?|trans|bakla|tomboy)\b|\b(?:ex-convicts?|ex-cons?|dating\s+preso|nakulong|galing\s+kulungan|drug\s+addicts?|adiks?|pushers?|shabu|marijuana|may\s+kaso)\b/gi;

// ─── HELPER FOR STATELESS REGEX TESTING ───────────────────────────────────────

function testRegex(pattern: RegExp, text: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(text);
}

// ─── LEGITIMATE PHYSICAL ACCESS KEYWORDS ──────────────────────────────────────

const PHYSICAL_ACCESS_KEYWORDS = new Set([
  'gate',
  'code',
  'door',
  'bell',
  'buzzer',
  'stairs',
  'stair',
  'step',
  'steps',
  'floor',
  'corner',
  'porch',
  'dog',
  'dogs',
  'doggy',
  'bark',
  'barks',
  'loose',
  'fence',
  'padlock',
  'lock',
  'locked',
  'key',
  'keys',
  'knock',
  'intercom',
  'callbox',
  'guard',
  'guards',
  'security',
  'purok',
  'street',
  'building',
  'compound',
  'driveway',
  'pathway',
  'rear',
  'front',
  'side',
  'back',
  'color',
  'left',
  'right',
  'caution',
  'slippery',
  'entrance',
  'exit',
  'bawal',
  'aso',
  'pinto',
  'hagdan',
  'tahol',
  'bakod',
  'grille',
  'grilles',
  'gatecode',
  'gatekeeper',
  'warning',
  'beware',
  'unit',
  'block',
  'lot',
  'bldg',
  'house',
]);

/**
 * Checks whether an open text string contains any legitimate physical access tokens.
 */
function hasPhysicalAccessContent(text: string): boolean {
  const stripped = text.replace(/\[REDACTED\s+[A-Z\s]+\]/gi, '');
  const tokens = stripped.toLowerCase().match(/[a-z]+/g) || [];
  return tokens.some((t) => PHYSICAL_ACCESS_KEYWORDS.has(t));
}

// ─── PUBLIC SANITIZATION API ──────────────────────────────────────────────────

/**
 * Strips family or resident names from street/address fields.
 * Example: "Santos Residence, Purok 3" -> "Purok 3".
 */
export function cleanStreetOrAddress(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  if (!text.trim()) return '';

  let cleaned = text;
  for (const pattern of RESIDENCE_PATTERNS) {
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, '');
  }

  // Also strip standalone honorific names (e.g. "c/o Mrs. Reyes")
  HONORIFIC_NAME_REGEX.lastIndex = 0;
  cleaned = cleaned.replace(HONORIFIC_NAME_REGEX, '');

  // Clean up dangling leading prepositions (e.g. "In front of, ", "Beside, ", "Near, ")
  cleaned = cleaned.replace(
    /^\s*(?:in\s+front\s+of|beside|near|across|behind|tapat\s+ng|tabi\s+ng)\s*[,/\\-]?\s*/gi,
    ''
  );

  // Clean up dangling delimiters like leading/trailing commas, slashes, dashes, extra spaces
  cleaned = cleaned
    .replace(/^\s*[,/\\-]\s*/g, '')
    .replace(/\s*[,/\\-]\s*$/g, '')
    .replace(/\s*[,/\\-]\s*[,/\\-]\s*/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Replaces phone numbers, emails, and contact handles in notes with [REDACTED] placeholders.
 */
export function redactPiiFromNotes(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  if (!text.trim()) return '';

  EMAIL_REGEX.lastIndex = 0;
  PHONE_REGEX.lastIndex = 0;
  CONTACT_HANDLE_REGEX.lastIndex = 0;

  let sanitized = text.replace(EMAIL_REGEX, '[REDACTED EMAIL]');
  sanitized = sanitized.replace(PHONE_REGEX, '[REDACTED PHONE]');
  sanitized = sanitized.replace(CONTACT_HANDLE_REGEX, '[REDACTED CONTACT]');
  return sanitized;
}

/**
 * Checks if notes contain phone numbers or email addresses.
 */
export function hasPiiInNotes(text: string | null | undefined): boolean {
  if (!text) return false;
  return (
    testRegex(EMAIL_REGEX, text) ||
    testRegex(PHONE_REGEX, text) ||
    testRegex(CONTACT_HANDLE_REGEX, text)
  );
}

/**
 * Fast boolean check: returns true if the text contains any SPI or PII violation.
 */
export function containsSpiOrPii(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;

  const t = text;
  if (testRegex(PHONE_REGEX, t)) return true;
  if (testRegex(EMAIL_REGEX, t)) return true;
  if (testRegex(CONTACT_HANDLE_REGEX, t)) return true;
  if (testRegex(SPI_RELIGION_REGEX, t)) return true;
  if (testRegex(SPI_HEALTH_REGEX, t)) return true;
  if (testRegex(SPI_POLITICAL_REGEX, t)) return true;
  if (testRegex(SPI_SENSITIVE_STATUS_REGEX, t)) return true;
  if (testRegex(HONORIFIC_NAME_REGEX, t)) return true;
  if (testRegex(NAME_CONVERSATIONAL_REGEX, t)) return true;

  for (const pattern of RESIDENCE_PATTERNS) {
    if (testRegex(pattern, t)) return true;
  }

  return false;
}

/**
 * Returns a list of detected violation categories for reporting or UI warnings.
 */
export function detectSpiAndPiiViolations(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];

  const violations: string[] = [];
  const t = text;

  if (testRegex(PHONE_REGEX, t)) violations.push('Phone number');
  if (testRegex(EMAIL_REGEX, t)) violations.push('Email address');
  if (testRegex(CONTACT_HANDLE_REGEX, t)) violations.push('Social media / messaging handle');
  if (testRegex(SPI_RELIGION_REGEX, t))
    violations.push('Religious affiliation / spiritual status (SPI)');
  if (testRegex(SPI_HEALTH_REGEX, t)) violations.push('Health or medical condition (SPI)');
  if (testRegex(SPI_POLITICAL_REGEX, t))
    violations.push('Political opinion / public official (SPI)');
  if (testRegex(SPI_SENSITIVE_STATUS_REGEX, t)) violations.push('Sensitive personal status (SPI)');
  if (testRegex(HONORIFIC_NAME_REGEX, t) || testRegex(NAME_CONVERSATIONAL_REGEX, t)) {
    violations.push('Resident personal name (PII)');
  }
  for (const pattern of RESIDENCE_PATTERNS) {
    if (testRegex(pattern, t)) {
      violations.push('Family or residence name (PII)');
      break;
    }
  }

  return violations;
}

/**
 * Comprehensive open text field sanitizer:
 * 1. Masks all contact information (phones, emails, social handles).
 * 2. Masks resident names and conversational references.
 * 3. Masks SPI (religion, health, politics, sensitive personal statuses).
 * 4. Collapses multiple consecutive redactions.
 * 5. If the note contains NO legitimate physical access details (e.g. was solely PII/SPI),
 *    returns an empty string so the field can be cleared cleanly.
 */
export function sanitizeOpenText(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  if (!text.trim()) return '';

  let sanitized = text;

  // Reset regex lastIndex counters
  EMAIL_REGEX.lastIndex = 0;
  PHONE_REGEX.lastIndex = 0;
  CONTACT_HANDLE_REGEX.lastIndex = 0;
  HONORIFIC_NAME_REGEX.lastIndex = 0;
  NAME_CONVERSATIONAL_REGEX.lastIndex = 0;
  SPI_RELIGION_REGEX.lastIndex = 0;
  SPI_HEALTH_REGEX.lastIndex = 0;
  SPI_POLITICAL_REGEX.lastIndex = 0;
  SPI_SENSITIVE_STATUS_REGEX.lastIndex = 0;

  // 1. Redact direct contact information
  sanitized = sanitized.replace(EMAIL_REGEX, '[REDACTED EMAIL]');
  sanitized = sanitized.replace(PHONE_REGEX, '[REDACTED PHONE]');
  sanitized = sanitized.replace(CONTACT_HANDLE_REGEX, '[REDACTED CONTACT]');

  // 2. Redact conversational name references (e.g. "Look for Juan" -> "Look for [REDACTED NAME]")
  sanitized = sanitized.replace(NAME_CONVERSATIONAL_REGEX, (match, name) => {
    return match.replace(name, '[REDACTED NAME]');
  });

  // 3. Redact honorific titles with names (e.g. "Mrs. Santos")
  sanitized = sanitized.replace(HONORIFIC_NAME_REGEX, '[REDACTED NAME]');

  // 4. Redact residence and family titles
  for (const pattern of RESIDENCE_PATTERNS) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, '[REDACTED PII]');
  }

  // 5. Redact SPI categories
  sanitized = sanitized.replace(SPI_RELIGION_REGEX, '[REDACTED SPI]');
  sanitized = sanitized.replace(SPI_HEALTH_REGEX, '[REDACTED SPI]');
  sanitized = sanitized.replace(SPI_POLITICAL_REGEX, '[REDACTED SPI]');
  sanitized = sanitized.replace(SPI_SENSITIVE_STATUS_REGEX, '[REDACTED SPI]');

  // 6. Clean up consecutive redaction tokens and redundant conjunctions
  sanitized = sanitized
    .replace(/(?:\[REDACTED\s+SPI\]\s*)+/gi, '[REDACTED SPI] ')
    .replace(/(?:\[REDACTED\s+NAME\]\s*)+/gi, '[REDACTED NAME] ')
    .replace(/(?:\[REDACTED\s+PII\]\s*)+/gi, '[REDACTED PII] ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 7. Physical access check:
  // If the note has no physical access content, it was entirely PII/SPI. Prune to empty string.
  if (!hasPhysicalAccessContent(sanitized)) {
    return '';
  }

  return sanitized;
}
