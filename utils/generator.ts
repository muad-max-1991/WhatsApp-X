import { GeneratedContact, GenerationOptions, GenerationConfig } from '../types';

/**
 * Validates the pattern input.
 * Strictly enforces 10 slots.
 */
export const validatePattern = (pattern: string, options?: GenerationOptions): string | null => {
  if (!pattern) {
    return "يرجى إدخال نمط الرقم.";
  }

  // Check strict length of 10
  if (pattern.length !== 10) {
    return `طول النمط غير صحيح (${pattern.length}/10). يجب أن يتكون من 10 خانات بالضبط.`;
  }

  const invalidChars = pattern.match(/[^0-9_]/g);
  if (invalidChars) {
    const uniqueInvalid = Array.from(new Set(invalidChars)).join(' ');
    return `النمط يحتوي على رموز غير مسموحة: [ ${uniqueInvalid} ]. يرجى استخدام الأرقام والرمز (_) فقط.`;
  }

  if (!pattern.includes('_')) {
    return "لا توجد خانات مجهولة للتوليد. يرجى استخدام الرمز (_) لتحديد الخانات المتغيرة.";
  }

  return null;
};

/**
 * Generates unique phone numbers based on the pattern.
 * Refined logic ensures even distribution and adheres to repetition density rules.
 * @param excludeSet - A Set of phone numbers to exclude (prevent duplicates from existing list)
 */
export const generatePhoneNumbers = (
  config: GenerationConfig,
  options?: GenerationOptions,
  excludeSet?: Set<string>
): GeneratedContact[] => {
  const { pattern, count, contactNamePrefix } = config;
  const results: GeneratedContact[] = [];
  
  // Start with the excludeSet if provided, otherwise empty
  const generatedSet = new Set<string>(excludeSet || []);
  const initialSize = generatedSet.size;
  
  // Identify missing indices
  const missingIndices: number[] = [];
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '_') {
      missingIndices.push(i);
    }
  }

  const numUnknowns = missingIndices.length;
  
  // Calculate possibilities limit to avoid infinite loops
  const maxPossibilities = Math.pow(10, numUnknowns);
  const remainingPossibilities = maxPossibilities - (excludeSet?.size || 0);
  // Cap the target count to what is mathematically possible
  const targetCount = Math.min(count, Math.max(0, remainingPossibilities));

  // --- Constraint Configuration ---
  const density = options?.repetitionDensity ?? 0.3;
  
  let maxDigitFreq: number;
  let allowAdjacentDuplicates = false;
  let allowSequences = false;

  // Determine strictness based on density slider
  if (density <= 0.4) {
    // Strict Mode (0.0 - 0.4)
    // Limit same digit to approx 1/3 of the slots (e.g. for 8 slots, max 3 repeats)
    // Ensure strict ceiling to allow at least 2 for very short patterns
    maxDigitFreq = Math.max(2, Math.ceil(numUnknowns * 0.35)); 
    allowAdjacentDuplicates = false; // No '11', '55'
    allowSequences = false; // No '123', '321'
  } else if (density <= 0.7) {
    // Balanced Mode (0.5 - 0.7)
    maxDigitFreq = Math.max(2, Math.ceil(numUnknowns * 0.6));
    allowAdjacentDuplicates = density > 0.55; 
    allowSequences = density > 0.55;
  } else {
    // Loose Mode (0.8 - 1.0)
    maxDigitFreq = numUnknowns;
    allowAdjacentDuplicates = true;
    allowSequences = true;
  }

  let attempts = 0;
  // Dynamic attempt limit: larger patterns need fewer retries per slot but global collision checks might need more
  const maxAttempts = targetCount * 200 + 5000; 

  while (results.length < targetCount && attempts < maxAttempts) {
    attempts++;
    
    const candidateDigits: string[] = [];
    const digitCounts: Record<string, number> = {};
    let isCandidateStructureValid = true;

    // Generate digits slot by slot with local backtracking checks
    for (let k = 0; k < numUnknowns; k++) {
      let foundValidDigitForSlot = false;
      
      // Try up to 20 times to find a valid digit for this specific slot
      // to satisfy local constraints (adjacency, sequence, frequency)
      for (let retry = 0; retry < 20; retry++) {
        const d = Math.floor(Math.random() * 10).toString();
        
        // 1. Frequency Check
        if ((digitCounts[d] || 0) >= maxDigitFreq) {
          continue;
        }

        // 2. Adjacent Check (Previous generated digit)
        if (!allowAdjacentDuplicates && k > 0) {
          if (d === candidateDigits[k - 1]) {
            continue;
          }
        }

        // 3. Sequence Check (Look at previous 2 digits)
        if (!allowSequences && k > 1) {
          const d1 = parseInt(candidateDigits[k - 2]);
          const d2 = parseInt(candidateDigits[k - 1]);
          const dCurrent = parseInt(d);
          
          // Ascending (e.g., 1, 2 -> 3)
          if (d2 === d1 + 1 && dCurrent === d2 + 1) continue;
          // Descending (e.g., 3, 2 -> 1)
          if (d2 === d1 - 1 && dCurrent === d2 - 1) continue;
        }

        // If we get here, the digit is valid locally
        candidateDigits.push(d);
        digitCounts[d] = (digitCounts[d] || 0) + 1;
        foundValidDigitForSlot = true;
        break;
      }

      if (!foundValidDigitForSlot) {
        // Could not find a valid digit for this slot after retries.
        // Abandon this entire number attempt and start fresh.
        isCandidateStructureValid = false;
        break;
      }
    }

    if (!isCandidateStructureValid) continue;

    // Construct the full number string
    const finalNumberArr = pattern.split('');
    missingIndices.forEach((patternIndex, generatedIndex) => {
      finalNumberArr[patternIndex] = candidateDigits[generatedIndex];
    });
    const numberStr = finalNumberArr.join('');

    // Global Uniqueness Check (against both new results and excluded set)
    if (!generatedSet.has(numberStr)) {
      generatedSet.add(numberStr);
      
      results.push({
        id: (initialSize + results.length + 1).toString(), // Temporary ID
        number: numberStr,
        name: contactNamePrefix,
        isSaved: false
      });
    }
  }

  // Sort results for display (Ascending order)
  results.sort((a, b) => a.number.localeCompare(b.number));

  return results;
};