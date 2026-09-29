/**
 * Enterprise Password Security & Validation Utilities
 * Based on NIST SP 800-63B and PCI-DSS v4.0 Authentication Guidelines
 */

export interface PasswordCriterion {
  id: 'length' | 'uppercase' | 'lowercase' | 'number' | 'special' | 'noCommon';
  labelEn: string;
  labelTh: string;
  descriptionEn: string;
  descriptionTh: string;
  isMet: boolean;
  isRequired: boolean;
}

export type PasswordStrengthTier = 'very-weak' | 'weak' | 'fair' | 'strong' | 'very-strong';

export interface PasswordAnalysis {
  score: number; // 0 to 100
  tier: PasswordStrengthTier;
  tierLabelEn: string;
  tierLabelTh: string;
  colorClass: string;
  barColor: string;
  badgeBg: string;
  badgeText: string;
  entropyBits: number;
  estimatedCrackTimeEn: string;
  estimatedCrackTimeTh: string;
  criteria: PasswordCriterion[];
  isPolicyCompliant: boolean;
  suggestionsEn: string[];
  suggestionsTh: string[];
}

const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  '123456789',
  'qwerty',
  'admin',
  'welcome',
  'login',
  'pos1234',
  'prodx123',
  'prodx2026',
  'cashier123',
  'manager123',
]);

const SEQUENCES = [
  '123456',
  '234567',
  '345678',
  '456789',
  '567890',
  'qwerty',
  'asdfgh',
  'zxcvbn',
  'abcdef',
];

/**
 * Analyzes a given password in real-time against enterprise standards
 */
export function analyzePassword(password: string, userContext?: { email?: string; name?: string }): PasswordAnalysis {
  if (!password) {
    return {
      score: 0,
      tier: 'very-weak',
      tierLabelEn: 'Empty',
      tierLabelTh: 'ยังไม่ได้กรอก',
      colorClass: 'text-slate-400',
      barColor: 'bg-slate-200',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-600',
      entropyBits: 0,
      estimatedCrackTimeEn: 'Instant',
      estimatedCrackTimeTh: 'ทันที (< 1 วินาที)',
      criteria: getEmptyCriteria(),
      isPolicyCompliant: false,
      suggestionsEn: ['Enter a secure enterprise password with at least 8 characters.'],
      suggestionsTh: ['กรุณากรอกรหัสผ่านความปลอดภัยองค์กรอย่างน้อย 8 ตัวอักษร'],
    };
  }

  const length = password.length;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const lowerPass = password.toLowerCase();

  // Check for common patterns
  let isCommonOrSequential = COMMON_PASSWORDS.has(lowerPass);
  if (!isCommonOrSequential) {
    for (const seq of SEQUENCES) {
      if (lowerPass.includes(seq)) {
        isCommonOrSequential = true;
        break;
      }
    }
  }

  // Check for 3+ repeated characters (e.g. "aaaa" or "111")
  if (!isCommonOrSequential && /(.)\1{2,}/.test(password)) {
    isCommonOrSequential = true;
  }

  // Check if contains username or email prefix
  if (userContext?.email) {
    const emailPrefix = userContext.email.split('@')[0]?.toLowerCase();
    if (emailPrefix && emailPrefix.length >= 3 && lowerPass.includes(emailPrefix)) {
      isCommonOrSequential = true;
    }
  }
  if (userContext?.name) {
    const nameParts = userContext.name.toLowerCase().split(/\s+/);
    for (const part of nameParts) {
      if (part.length >= 3 && lowerPass.includes(part)) {
        isCommonOrSequential = true;
        break;
      }
    }
  }

  // Build criteria status
  const criteria: PasswordCriterion[] = [
    {
      id: 'length',
      labelEn: 'At least 8 characters',
      labelTh: 'ความยาวอย่างน้อย 8 ตัวอักษร',
      descriptionEn: 'Recommended: 12+ characters for maximum security',
      descriptionTh: 'แนะนำ: 12 ตัวอักษรขึ้นไปเพื่อความปลอดภัยระดับสูงสุด',
      isMet: length >= 8,
      isRequired: true,
    },
    {
      id: 'uppercase',
      labelEn: 'Uppercase letter (A-Z)',
      labelTh: 'อักษรพิมพ์ใหญ่ (A-Z)',
      descriptionEn: 'At least one capital letter',
      descriptionTh: 'มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว',
      isMet: hasUppercase,
      isRequired: true,
    },
    {
      id: 'lowercase',
      labelEn: 'Lowercase letter (a-z)',
      labelTh: 'อักษรพิมพ์เล็ก (a-z)',
      descriptionEn: 'At least one lowercase letter',
      descriptionTh: 'มีตัวพิมพ์เล็กอย่างน้อย 1 ตัว',
      isMet: hasLowercase,
      isRequired: true,
    },
    {
      id: 'number',
      labelEn: 'Numeric digit (0-9)',
      labelTh: 'ตัวเลขอย่างน้อย 1 ตัว (0-9)',
      descriptionEn: 'At least one number',
      descriptionTh: 'มีตัวเลขอย่างน้อย 1 ตัว',
      isMet: hasNumber,
      isRequired: true,
    },
    {
      id: 'special',
      labelEn: 'Special character (!@#$%)',
      labelTh: 'อักขระพิเศษ (!@#$%)',
      descriptionEn: 'Symbols like ! @ # $ % ^ & * ( ) _ +',
      descriptionTh: 'สัญลักษณ์ เช่น ! @ # $ % ^ & * ( ) _ +',
      isMet: hasSpecial,
      isRequired: true,
    },
    {
      id: 'noCommon',
      labelEn: 'No predictable patterns',
      labelTh: 'ไม่มีรูปแบบคาดเดาง่าย',
      descriptionEn: 'Avoid sequences, repeated chars, or personal names',
      descriptionTh: 'หลีกเลี่ยงลำดับตัวเลข ตัวอักษรซ้ำ หรือชื่อพนักงาน',
      isMet: !isCommonOrSequential,
      isRequired: true,
    },
  ];

  // Mathematical scoring calculation
  let rawScore = 0;

  // Length points (up to 35)
  if (length >= 8) rawScore += 15;
  if (length >= 10) rawScore += 8;
  if (length >= 12) rawScore += 7;
  if (length >= 16) rawScore += 5;

  // Diversity points (up to 40)
  if (hasLowercase) rawScore += 10;
  if (hasUppercase) rawScore += 10;
  if (hasNumber) rawScore += 10;
  if (hasSpecial) rawScore += 10;

  // Bonus points for variety (up to 25)
  const typesCount = [hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  if (typesCount >= 3) rawScore += 10;
  if (typesCount === 4) rawScore += 5;

  // Multiple numbers or symbols bonus
  const numberCount = (password.match(/[0-9]/g) || []).length;
  const specialCount = (password.match(/[^A-Za-z0-9]/g) || []).length;
  if (numberCount >= 2) rawScore += 5;
  if (specialCount >= 2) rawScore += 5;

  // Penalties
  if (isCommonOrSequential) rawScore -= 30;
  if (length < 8) rawScore = Math.min(rawScore, 24);

  const finalScore = Math.max(5, Math.min(100, rawScore));

  // Determine Tier
  let tier: PasswordStrengthTier = 'very-weak';
  let tierLabelEn = 'Very Weak';
  let tierLabelTh = 'ระดับต่ำมาก';
  let colorClass = 'text-rose-600';
  let barColor = 'bg-rose-500';
  let badgeBg = 'bg-rose-50 border-rose-200';
  let badgeText = 'text-rose-700';

  if (finalScore >= 88 && typesCount >= 4 && length >= 10 && !isCommonOrSequential) {
    tier = 'very-strong';
    tierLabelEn = 'Enterprise Grade';
    tierLabelTh = 'ระดับความปลอดภัยสูงสุด';
    colorClass = 'text-emerald-600';
    barColor = 'bg-emerald-500';
    badgeBg = 'bg-emerald-50 border-emerald-200';
    badgeText = 'text-emerald-700';
  } else if (finalScore >= 70 && typesCount >= 3 && length >= 8 && !isCommonOrSequential) {
    tier = 'strong';
    tierLabelEn = 'Strong';
    tierLabelTh = 'ปลอดภัยสูง';
    colorClass = 'text-indigo-600';
    barColor = 'bg-indigo-500';
    badgeBg = 'bg-indigo-50 border-indigo-200';
    badgeText = 'text-indigo-700';
  } else if (finalScore >= 45 && length >= 8) {
    tier = 'fair';
    tierLabelEn = 'Moderate';
    tierLabelTh = 'ปานกลาง';
    colorClass = 'text-amber-600';
    barColor = 'bg-amber-500';
    badgeBg = 'bg-amber-50 border-amber-200';
    badgeText = 'text-amber-700';
  } else if (finalScore >= 25) {
    tier = 'weak';
    tierLabelEn = 'Weak';
    tierLabelTh = 'ค่อนข้างอ่อน';
    colorClass = 'text-orange-600';
    barColor = 'bg-orange-500';
    badgeBg = 'bg-orange-50 border-orange-200';
    badgeText = 'text-orange-700';
  }

  // Calculate Shannon Entropy
  let poolSize = 0;
  if (hasLowercase) poolSize += 26;
  if (hasUppercase) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSpecial) poolSize += 33;
  if (poolSize === 0) poolSize = 10;

  const entropyBits = Math.round(length * Math.log2(poolSize));

  // Estimate crack time
  let estimatedCrackTimeEn = 'Instant (< 1 second)';
  let estimatedCrackTimeTh = 'ทันที (< 1 วินาที)';

  if (entropyBits >= 80) {
    estimatedCrackTimeEn = 'Millions of years';
    estimatedCrackTimeTh = 'หลายล้านปี (ถอดรหัสไม่ได้)';
  } else if (entropyBits >= 65) {
    estimatedCrackTimeEn = 'Thousands of years';
    estimatedCrackTimeTh = 'หลายพันปี';
  } else if (entropyBits >= 52) {
    estimatedCrackTimeEn = 'Decades to Centuries';
    estimatedCrackTimeTh = 'หลายสิบปี ถึง ศตวรรษ';
  } else if (entropyBits >= 40) {
    estimatedCrackTimeEn = 'Several days to months';
    estimatedCrackTimeTh = 'หลายวัน ถึง หลายเดือน';
  } else if (entropyBits >= 30) {
    estimatedCrackTimeEn = 'Few minutes to hours';
    estimatedCrackTimeTh = 'ไม่กี่นาที ถึง ชั่วโมง';
  }

  // Policy compliance: must satisfy all required criteria
  const isPolicyCompliant = criteria.every((c) => c.isMet);

  // Suggestions for user
  const suggestionsEn: string[] = [];
  const suggestionsTh: string[] = [];

  if (length < 8) {
    suggestionsEn.push(`Add ${8 - length} more character${8 - length > 1 ? 's' : ''} to meet policy.`);
    suggestionsTh.push(`เพิ่มความยาวอีก ${8 - length} ตัวอักษรเพื่อให้ผ่านนโยบาย`);
  } else if (length < 12) {
    suggestionsEn.push('Tip: Increasing length to 12+ characters significantly boosts protection.');
    suggestionsTh.push('ข้อแนะนำ: เพิ่มความยาวเป็น 12 ตัวอักษรขึ้นไปจะช่วยเพิ่มความปลอดภัยอย่างมาก');
  }

  if (!hasUppercase) {
    suggestionsEn.push('Include at least one uppercase letter (A-Z).');
    suggestionsTh.push('ใส่อักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)');
  }
  if (!hasSpecial) {
    suggestionsEn.push('Add a special character like !, @, #, or $.');
    suggestionsTh.push('ใส่อักขระพิเศษอย่างน้อย 1 ตัว เช่น !, @, #, หรือ $');
  }
  if (!hasNumber) {
    suggestionsEn.push('Add at least one numeric digit (0-9).');
    suggestionsTh.push('ใส่ตัวเลขอย่างน้อย 1 ตัว (0-9)');
  }
  if (isCommonOrSequential) {
    suggestionsEn.push('Avoid common words, sequential numbers, or repeated characters.');
    suggestionsTh.push('หลีกเลี่ยงคำที่พบบ่อย ลำดับตัวเลข หรือตัวอักษรซ้ำ');
  }

  return {
    score: finalScore,
    tier,
    tierLabelEn,
    tierLabelTh,
    colorClass,
    barColor,
    badgeBg,
    badgeText,
    entropyBits,
    estimatedCrackTimeEn,
    estimatedCrackTimeTh,
    criteria,
    isPolicyCompliant,
    suggestionsEn,
    suggestionsTh,
  };
}

function getEmptyCriteria(): PasswordCriterion[] {
  return [
    {
      id: 'length',
      labelEn: 'At least 8 characters',
      labelTh: 'ความยาวอย่างน้อย 8 ตัวอักษร',
      descriptionEn: 'Recommended: 12+ characters for maximum security',
      descriptionTh: 'แนะนำ: 12 ตัวอักษรขึ้นไปเพื่อความปลอดภัยระดับสูงสุด',
      isMet: false,
      isRequired: true,
    },
    {
      id: 'uppercase',
      labelEn: 'Uppercase letter (A-Z)',
      labelTh: 'อักษรพิมพ์ใหญ่ (A-Z)',
      descriptionEn: 'At least one capital letter',
      descriptionTh: 'มีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว',
      isMet: false,
      isRequired: true,
    },
    {
      id: 'lowercase',
      labelEn: 'Lowercase letter (a-z)',
      labelTh: 'อักษรพิมพ์เล็ก (a-z)',
      descriptionEn: 'At least one lowercase letter',
      descriptionTh: 'มีตัวพิมพ์เล็กอย่างน้อย 1 ตัว',
      isMet: false,
      isRequired: true,
    },
    {
      id: 'number',
      labelEn: 'Numeric digit (0-9)',
      labelTh: 'ตัวเลขอย่างน้อย 1 ตัว (0-9)',
      descriptionEn: 'At least one number',
      descriptionTh: 'มีตัวเลขอย่างน้อย 1 ตัว',
      isMet: false,
      isRequired: true,
    },
    {
      id: 'special',
      labelEn: 'Special character (!@#$%)',
      labelTh: 'อักขระพิเศษ (!@#$%)',
      descriptionEn: 'Symbols like ! @ # $ % ^ & * ( ) _ +',
      descriptionTh: 'สัญลักษณ์ เช่น ! @ # $ % ^ & * ( ) _ +',
      isMet: false,
      isRequired: true,
    },
    {
      id: 'noCommon',
      labelEn: 'No predictable patterns',
      labelTh: 'ไม่มีรูปแบบคาดเดาง่าย',
      descriptionEn: 'Avoid sequences, repeated chars, or personal names',
      descriptionTh: 'หลีกเลี่ยงลำดับตัวเลข ตัวอักษรซ้ำ หรือชื่อพนักงาน',
      isMet: true,
      isRequired: true,
    },
  ];
}
