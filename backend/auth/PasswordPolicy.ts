import {
  isStrongPassword,
  scorePassword,
  StrengthOptions,
} from "./isStrongPassword.ts";

export class PasswordPolicy {
  definition: StrengthOptions;

  constructor(definition: StrengthOptions) {
    this.definition = {
      minLength: definition.minLength,
      minLowercase: definition.minLowercase,
      minNumbers: definition.minNumbers,
      minSymbols: definition.minSymbols,
      minUppercase: definition.minUppercase,
    };
  }

  describe() {
    const parts: string[] = [];
    if (this.definition.minLength > 0) {
      parts.push(`be at least ${this.definition.minLength} characters long`);
    }
    const hasLowercase = this.definition.minLowercase > 0;
    const hasUppercase = this.definition.minUppercase > 0;
    if (hasLowercase && hasUppercase) {
      parts.push(
        `contain at least ${this.definition.minLowercase} lowercase and ${this.definition.minUppercase} uppercase letters`,
      );
    } else if (hasLowercase) {
      parts.push(
        `contain at least ${this.definition.minLowercase} lowercase letters`,
      );
    } else if (hasUppercase) {
      parts.push(
        `contain at least ${this.definition.minUppercase} uppercase letters`,
      );
    }
    if (this.definition.minNumbers > 0) {
      parts.push(`use a minimum of ${this.definition.minNumbers} numbers`);
    }
    if (this.definition.minSymbols > 0) {
      parts.push(`have at least ${this.definition.minSymbols} symbols`);
    }
    const lastIndex = parts.length - 1;
    parts[lastIndex] = `and ${parts[lastIndex]}`;
    return `Password must ${parts.join("; ")}.`;
  }

  score(password: string) {
    return scorePassword(password);
  }

  validate(password: string) {
    return isStrongPassword(password, this.definition);
  }

  toJSON() {
    return {
      description: this.describe(),
      ...this.definition,
    };
  }
}
