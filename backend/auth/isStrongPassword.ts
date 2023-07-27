/* Code taken in part from
 * https://github.com/validatorjs/validator.js/blob/master/src/lib/isStrongPassword.js
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2018 Chris O'Hara <cohara87@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

export type ScoringOptions = typeof defaultScoring;
export type StrengthOptions = typeof defaultStrength;

export function scorePassword(
  password: string,
  options?: Partial<ScoringOptions>,
) {
  const analysis = analyzePassword(password);
  const scoringOptions = {
    ...options,
    ...defaultScoring,
  };
  let points = 0;
  points += analysis.uniqueChars * scoringOptions.pointsPerUnique;
  points += (analysis.length - analysis.uniqueChars) *
    scoringOptions.pointsPerRepeat;
  if (analysis.lowercaseCount > 0) {
    points += scoringOptions.pointsForContainingLower;
  }
  if (analysis.uppercaseCount > 0) {
    points += scoringOptions.pointsForContainingUpper;
  }
  if (analysis.numberCount > 0) {
    points += scoringOptions.pointsForContainingNumber;
  }
  if (analysis.symbolCount > 0) {
    points += scoringOptions.pointsForContainingSymbol;
  }
  return points;
}

export function isStrongPassword(
  password: string,
  options?: Partial<StrengthOptions>,
) {
  const analysis = analyzePassword(password);
  const merged = {
    ...options,
    ...defaultStrength,
  };
  return analysis.length >= merged.minLength &&
    analysis.lowercaseCount >= merged.minLowercase &&
    analysis.uppercaseCount >= merged.minUppercase &&
    analysis.numberCount >= merged.minNumbers &&
    analysis.symbolCount >= merged.minSymbols;
}

export function getScoringOptions(optionString?: string): ScoringOptions {
  return getOptions(defaultScoring, optionString);
}

export function getStrengthOptions(optionString?: string): StrengthOptions {
  return getOptions(defaultStrength, optionString);
}

type PasswordAnalysis = {
  length: number;
  uniqueChars: number;
  uppercaseCount: number;
  lowercaseCount: number;
  numberCount: number;
  symbolCount: number;
};

const upperCaseRegex = /^[A-Z]$/;
const lowerCaseRegex = /^[a-z]$/;
const numberRegex = /^[0-9]$/;
const symbolRegex = /^[-#!$@£%^&*()_+|~=`{}\[\]:";'<>?,.\/ ]$/;

const defaultStrength = {
  minLength: 8,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};
const defaultScoring = {
  pointsPerUnique: 1,
  pointsPerRepeat: 0.5,
  pointsForContainingLower: 10,
  pointsForContainingUpper: 10,
  pointsForContainingNumber: 10,
  pointsForContainingSymbol: 10,
};

/** Counts number of occurrences of each char in a string */
function countChars(str: string) {
  const result: Record<string, number> = {};
  Array.from(str).forEach((char) => {
    const curVal: number | undefined = result[char];
    if (curVal) {
      result[char] += 1;
    } else {
      result[char] = 1;
    }
  });
  return result;
}

/** Return information about a password */
function analyzePassword(password: string) {
  const charMap = countChars(password);
  const analysis: PasswordAnalysis = {
    length: password.length,
    uniqueChars: Object.keys(charMap).length,
    uppercaseCount: 0,
    lowercaseCount: 0,
    numberCount: 0,
    symbolCount: 0,
  };
  Object.keys(charMap).forEach((char) => {
    if (upperCaseRegex.test(char)) {
      analysis.uppercaseCount += charMap[char];
    } else if (lowerCaseRegex.test(char)) {
      analysis.lowercaseCount += charMap[char];
    } else if (numberRegex.test(char)) {
      analysis.numberCount += charMap[char];
    } else if (symbolRegex.test(char)) {
      analysis.symbolCount += charMap[char];
    }
  });
  return analysis;
}

function getOptions<T extends ScoringOptions | StrengthOptions>(
  optionDict: T,
  optionString?: string,
): T {
  optionString = optionString ?? "";
  const options: Partial<ScoringOptions> = {};
  for (const pair of optionString.split(";")) {
    const [keyRaw, valueRaw] = pair.trim().split(":");
    const key = keyRaw.trim() as keyof ScoringOptions;
    const value: string | undefined = valueRaw?.trim();
    if (value && key in optionDict) {
      const num = Number.parseInt(value, 10);
      if (!Number.isNaN(num)) {
        options[key] = num;
      }
    }
  }
  return Object.assign({}, optionDict, options);
}
