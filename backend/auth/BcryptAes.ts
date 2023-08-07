import { Base64, bcrypt, bcryptVerify } from "../../deps.ts";
/**
 * A bcrypt and AES256 pepper implementation.
 * See https://dropbox.tech/security/how-dropbox-securely-stores-your-passwords
 */
export class BcryptAes {
  #decoder = new TextDecoder();
  #encoder = new TextEncoder();
  #randomLength = 16;
  #cost: number;
  #key: Promise<CryptoKey>;

  constructor(secret: string | Uint8Array, cost?: number) {
    this.#cost = Math.max(cost ?? 10, 10);
    const bytes = typeof secret === "string"
      ? this.#encoder.encode(secret).slice(0, 32)
      : secret.slice(0, 32);
    this.#key = crypto.subtle.importKey(
      "raw",
      bytes,
      { name: "AES-CBC" },
      false,
      ["decrypt", "encrypt"],
    );
    Object.freeze(this);
  }

  async #digest(password: string) {
    const bytes = this.#encoder.encode(password);
    const shasum = await crypto.subtle.digest({ name: "SHA-512" }, bytes);
    return new Uint8Array(shasum);
  }

  async hash(password: string): Promise<string> {
    const digest = await this.#digest(password);
    const salt = crypto.getRandomValues(new Uint8Array(this.#randomLength));
    const hashed = await bcrypt({
      password: digest,
      salt,
      costFactor: this.#cost,
    });
    const iv = crypto.getRandomValues(new Uint8Array(this.#randomLength));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-CBC", iv },
      await this.#key,
      this.#encoder.encode(hashed),
    );
    const result = new Uint8Array(this.#randomLength + encrypted.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encrypted), this.#randomLength);
    return Base64.encode(result);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const bytes = Base64.decode(hash);
    const iv = bytes.slice(0, this.#randomLength);
    const encrypted = bytes.slice(this.#randomLength);
    const hashed = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      await this.#key,
      encrypted,
    );
    return await bcryptVerify({
      password: await this.#digest(password),
      hash: this.#decoder.decode(hashed),
    });
  }
}
