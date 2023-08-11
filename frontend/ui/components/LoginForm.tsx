/** @jsx h */
import { h } from "../../../deps.ts";

export function LoginForm({ landing = "/" }: { landing?: string }) {
  return (
    <form
      className="pure-form pure-form-stacked"
      action={`/api/login?landing=${landing}`}
      method="post"
    >
      <fieldset>
        <div className="pure-control-group">
          <label htmlFor="email">Email</label>
          <input
            required={true}
            placeholder="email@example.com"
            type="text"
            name="email"
          />
        </div>
        <div className="pure-control-group">
          <label htmlFor="password">Password</label>
          <input required={true} name="password" type="password" />
        </div>
        <div className="pure-controls">
          <button className="pure-button pure-button-primary" type="submit">
            Login
          </button>
        </div>
      </fieldset>
    </form>
  );
}
