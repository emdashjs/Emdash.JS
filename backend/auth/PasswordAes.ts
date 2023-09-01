import {
  Base64,
  bcrypt as bcryptHash,
  bcryptVerify,
  Buffer,
  phc,
  PhcFormatObject,
  timingSafeEqual,
} from "../../deps.ts";
import { hash as argon2Hash } from "https://deno.land/x/argontwo@0.1.1/mod.ts";
import { APP_DATA } from "../constants.ts";

const randomLength = 16 as const;
const decoder = new TextDecoder();
const encoder = new TextEncoder();

abstract class BaseAes {
  cost: number;
  key: Promise<CryptoKey>;

  constructor(secret: string | Uint8Array, cost: number) {
    this.cost = cost;
    const bytes = this.digest(secret, { name: "SHA-256" });
    this.key = bytes.then((result) =>
      crypto.subtle.importKey(
        "raw",
        result,
        { name: "AES-CBC" },
        false,
        ["decrypt", "encrypt"],
      )
    );
  }

  protected bytes(data: string | Uint8Array): Uint8Array {
    return ArrayBuffer.isView(data) ? data : encoder.encode(data);
  }

  protected concat(a: Uint8Array, b: ArrayBuffer) {
    const result = new Uint8Array(a.byteLength + b.byteLength);
    result.set(a);
    result.set(new Uint8Array(b), a.byteLength);
    return result;
  }

  protected async decrypt(bytes: Uint8Array): Promise<ArrayBuffer> {
    const iv = bytes.slice(0, randomLength);
    const encrypted = bytes.slice(randomLength);
    return await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      await this.key,
      encrypted,
    );
  }

  protected async digest(
    secret: string | Uint8Array,
    { name = "SHA-512", salt }: {
      name?: `SHA-${256 | 512}`;
      salt?: Uint8Array;
    } = {},
  ): Promise<Uint8Array> {
    const bytes = salt
      ? this.concat(this.bytes(secret), salt.buffer)
      : this.bytes(secret);
    const shasum = await crypto.subtle.digest({ name }, bytes);
    return new Uint8Array(shasum);
  }

  protected async encrypt(hashed: string | Uint8Array): Promise<Uint8Array> {
    const iv = this.randomness();
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv },
      await this.key,
      this.bytes(hashed),
    );
    return this.concat(iv, encrypted);
  }

  protected randomness(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(randomLength));
  }

  abstract hash(password: string): Promise<string>;
  abstract verify(password: string, hash: string): Promise<boolean>;
}

/**
 * A bcrypt and AES256 pepper implementation.
 * See https://dropbox.tech/security/how-dropbox-securely-stores-your-passwords
 */
class BcryptAes extends BaseAes {
  static SECURITY = {
    MAX: 16,
    HIGH: 12,
    MID: 10,
    LOW: 8,
  } as const;

  constructor(secret: string | Uint8Array, cost?: number | SecurityLevel) {
    super(
      secret,
      Math.min(
        Math.max(
          typeof cost === "string"
            ? BcryptAes.SECURITY[cost] ?? BcryptAes.SECURITY.MID
            : cost ?? BcryptAes.SECURITY.MID,
          BcryptAes.SECURITY.LOW,
        ),
        BcryptAes.SECURITY.MAX,
      ),
    );
    Object.freeze(this);
  }

  async hash(password: string): Promise<string> {
    const digest = await this.digest(password);
    const salt = this.randomness();
    const hashed = await bcryptHash({
      password: digest,
      salt,
      costFactor: this.cost,
    });
    const encrypted = await this.encrypt(hashed);
    return Base64.encode(encrypted);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const bytes = Base64.decode(hash);
    const hashed = await this.decrypt(bytes);
    return await bcryptVerify({
      password: await this.digest(password),
      hash: decoder.decode(hashed),
    });
  }
}

/**
 * A PBKDF2 and AES256 pepper implementation.
 */
class Pbkdf2Aes extends BaseAes {
  static SECURITY = {
    MAX: 400000,
    HIGH: 200000,
    MID: 80000,
    LOW: 10000,
  } as const;

  keyLength = 512;

  constructor(secret: string | Uint8Array, cost?: number | SecurityLevel) {
    super(
      secret,
      Math.min(
        Math.max(
          typeof cost === "string"
            ? Pbkdf2Aes.SECURITY[cost] ?? Pbkdf2Aes.SECURITY.MID
            : cost ?? Pbkdf2Aes.SECURITY.MID,
          Pbkdf2Aes.SECURITY.LOW,
        ),
        Pbkdf2Aes.SECURITY.MAX,
      ),
    );
    Object.freeze(this);
  }

  async #hashResult(
    password: string,
    salt?: Uint8Array,
  ): Promise<PhcFormatObject> {
    salt = salt ?? this.randomness();
    const digest = await this.digest(password, { salt });
    const digestKey = await crypto.subtle.importKey(
      "raw",
      digest,
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"],
    );
    const hashedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: this.cost,
        hash: "SHA-512",
      },
      digestKey,
      this.keyLength,
    );
    return {
      id: "pbkdf2-sha512",
      version: 0,
      params: {
        prehash: "sha512",
        c: this.cost,
        dklen: this.keyLength,
      },
      salt: Buffer.from(salt),
      hash: Buffer.from(new Uint8Array(hashedBits)),
    };
  }

  async hash(password: string): Promise<string> {
    const result = await this.#hashResult(password);
    const formatted = phc.serialize(result);
    const encrypted = await this.encrypt(formatted);
    return Base64.encode(encrypted);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const bytes = Base64.decode(hash);
    const hashed = decoder.decode(await this.decrypt(bytes));
    const { hash: hash1, salt } = phc.deserialize(hashed);
    const { hash: hash2 } = await this.#hashResult(password, salt);
    return timingSafeEqual(hash1, hash2);
  }
}

/**
 * An Argon2id and AES256 pepper implementation.
 */
class Argon2Aes extends BaseAes {
  static SECURITY = {
    MAX: 47104,
    HIGH: 23552,
    MID: 12288,
    LOW: 768,
  } as const;

  time: number;

  constructor(secret: string | Uint8Array, cost?: number | SecurityLevel) {
    super(
      secret,
      Math.min(
        Math.max(
          typeof cost === "string"
            ? Argon2Aes.SECURITY[cost] ?? Argon2Aes.SECURITY.MID
            : cost ?? Argon2Aes.SECURITY.MID,
          Argon2Aes.SECURITY.LOW,
        ),
        Argon2Aes.SECURITY.MAX,
      ),
    );
    if (this.cost >= Argon2Aes.SECURITY.MAX) {
      this.time = 1;
    } else if (this.cost >= Argon2Aes.SECURITY.HIGH) {
      this.time = 2;
    } else if (this.cost >= Argon2Aes.SECURITY.MID) {
      this.time = 3;
    } else {
      this.time = 7;
    }
    Object.freeze(this);
  }

  async #hashResult(
    password: string,
    salt?: Uint8Array,
  ): Promise<PhcFormatObject> {
    salt = salt ?? this.randomness();
    const digest = await this.digest(password, { salt });
    const argon2id = 2 as const;
    const version19 = 1 as const;
    const parallelism = 1;
    const hash = argon2Hash(digest, salt, {
      variant: argon2id,
      version: version19,
      m: this.cost,
      t: this.time,
      p: parallelism,
    });
    return {
      id: "argon2id",
      version: 19,
      params: {
        prehash: "sha512",
        m: this.cost,
        t: this.time,
        p: parallelism,
      },
      salt: Buffer.from(salt),
      hash: Buffer.from(hash),
    };
  }

  async hash(password: string): Promise<string> {
    const result = await this.#hashResult(password);
    const formatted = phc.serialize(result);
    const encrypted = await this.encrypt(formatted);
    return Base64.encode(encrypted);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const bytes = Base64.decode(hash);
    const hashed = decoder.decode(await this.decrypt(bytes));
    const { hash: hash1, salt } = phc.deserialize(hashed);
    const { hash: hash2 } = await this.#hashResult(password, salt);
    return timingSafeEqual(hash1, hash2);
  }
}

export type SecurityLevel = "MAX" | "HIGH" | "MID" | "LOW";
export type PasswordAlgorithm = "argon2" | "bcrypt" | "pbkdf2";
export type PasswordAesOptions = {
  algorithm?: PasswordAlgorithm;
  level?: SecurityLevel;
};

export class PasswordAes {
  #base: BaseAes;

  constructor(
    { algorithm = "pbkdf2", level = "LOW" }: PasswordAesOptions = {},
  ) {
    const secret = APP_DATA.secret_key || APP_DATA.uuid;
    this.#base = algorithm === "argon2"
      ? new Argon2Aes(secret, level)
      : algorithm === "bcrypt"
      ? new BcryptAes(secret, level)
      : new Pbkdf2Aes(secret, level);
  }

  hash(password: string) {
    return this.#base.hash(password);
  }

  verify(password: string, hash: string) {
    return this.#base.verify(password, hash);
  }

  static instance: PasswordAes | undefined;

  static hash(password: string, options?: PasswordAesOptions) {
    PasswordAes.instance = PasswordAes.instance ?? new PasswordAes(options);
    return PasswordAes.instance.hash(password);
  }

  static verify(password: string, hash: string, options?: PasswordAesOptions) {
    PasswordAes.instance = PasswordAes.instance ?? new PasswordAes(options);
    return PasswordAes.instance.verify(password, hash);
  }
}
