/** @jsx h */
import { h } from "../../../deps.ts";

export function FirstRun() {
  return (
    <section>
      <h1>Create First User</h1>
      <p>
        This application install is running for the first time and has no users.
        Please create your first user, which will have full admin access to this
        installation.
      </p>
      <form
        className="pure-form pure-form-stacked"
        action={`/api/user?landing=/user/profile`}
        method="post"
      >
        <fieldset>
          <div className="pure-control-group">
            <label htmlFor="firstName">First name</label>
            <input
              required={true}
              placeholder="Jean-Luc"
              type="text"
              name="firstName"
            />
          </div>
          <div className="pure-control-group">
            <label htmlFor="lastName">Last name</label>
            <input
              required={true}
              placeholder="Picard"
              type="text"
              name="lastName"
            />
          </div>
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
              Create
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
