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
      <div className="pure-menu pure-menu-horizontal emdash-tab-row">
        <ul className="pure-menu-list">
          <li className="pure-menu-item emdash-tab" id="profile">
            <a href="#profile" className="pure-menu-link">Profile</a>
          </li>
          <li className="pure-menu-item emdash-tab" id="posts">
            <a href="#posts" className="pure-menu-link">Posts</a>
          </li>
          <li className="pure-menu-item emdash-tab" id="pages">
            <a href="#pages" className="pure-menu-link">Pages</a>
          </li>
          <li className="pure-menu-item emdash-tab" id="settings">
            <a href="#settings" className="pure-menu-link">Settings</a>
          </li>
        </ul>
      </div>
      <div className="show-me" id="posts">HELLO THERE</div>
      <div>
        <pre className="hljs language-json">
          <code>{JSON.stringify(props.user, null, 2)}</code>
        </pre>
      </div>
      <Css>
        {`
        .emdash-tab-row {
          border-bottom: 2px solid gray;
        }
        .emdash-tab {
          border-top: 4px solid gray;
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
        }
        .emdash-tab:target {
          background-color: #eee;
        }
        .show-me {
          display:none;
        }
        .show-me:target {
          display: block;
        }
      `}
      </Css>
    </section>
  );
}
