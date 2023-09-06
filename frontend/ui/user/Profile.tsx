/** @jsx h */
import { User } from "../../../backend/models/mod.ts";
import { h } from "../../../deps.ts";
import { Css } from "../../components/Css.tsx";

export type ProfileProps = {
  user: User;
};

export function Profile(props: ProfileProps) {
  return (
    <section>
      <div className="pure-menu pure-menu-horizontal profile-tabs">
        <a href="#" className="pure-menu-heading pure-menu-link">Profile</a>
        <ul className="pure-menu-list">
          <li className="pure-menu-item">
            <a href="#posts" className="pure-menu-link">Posts</a>
          </li>
          <li className="pure-menu-item">
            <a href="#pages" className="pure-menu-link">Pages</a>
          </li>
          <li className="pure-menu-item">
            <a href="#settings" className="pure-menu-link">Settings</a>
          </li>
        </ul>
      </div>
      <div>
        <pre className="hljs language-json">
          <code>{JSON.stringify(props.user, null, 2)}</code>
        </pre>
      </div>
      <Css>
        {`
        .profile-tabs {
          margin-bottom: 2px;
        }
      `}
      </Css>
    </section>
  );
}
