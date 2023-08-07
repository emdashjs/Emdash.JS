/** @jsx h */
import { h } from "../../../deps.ts";

export function LoginForm({ landing = "/" }: { landing?: string }) {
  return (
    <form
      class="pure-form pure-form-stacked"
      action={`/api/login?landing=${landing}`}
      method="post"
    >
      <fieldset>
        <div class="pure-control-group">
          <label for="email">Email</label>
          <input
            required="true"
            placeholder="email@example.com"
            type="text"
            name="email"
          />
        </div>
        <div class="pure-control-group">
          <label for="password">Password</label>
          <input required="true" name="password" type="password" />
        </div>
        <div class="pure-controls">
          <button class="pure-button pure-button-primary" type="submit">
            Login
          </button>
        </div>
      </fieldset>
    </form>
  );
}
