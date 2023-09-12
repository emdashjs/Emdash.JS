# Emdash.js

Emdash.js is an extensible modern blog app, based on modern JavaScript technologies for web and server. It can be as simple as reading Markdown files from disk or as rich as a live content writing and editing platform.

We were tired of the complexity and mental load of blogging software like Wordpress, static site rendering tools, and the lock-in of commercial blogging platforms. Emdash.js is bold, beautiful, straightforward, and liberating from the start.

## Design

The app is serverless on such platforms which support Deno out of the box. It may also be deployed as a Deno process in a container or server. All data is stored as NoSQL collections using a primary key and optional secondary key. A plugin system permits other code to be ran dynamically to make visual changes and add content or features.

A data source may be a supported database or read-only disk. These sources are adapted to a NoSQL-like interface. This is regardless of the data source, including SQL sources or static Markdown files.

Authentication is provided out of the box to secure content when deployed as a live platform. Read-only data sources disable authentication, protected content like post editing and admin dashboard, and all plugins except themes.

## Architecture

### Routes

Routes are handled in order of precendence. Authors may provide arbitrary Page routes, but cannot override Built-in providers.

| Priority | Name   | Route                 | Provider             |
|:--------:|--------|-----------------------|----------------------|
|     1    | Home   | `/`                   | **Built-in**         |
|     1    | Post   | `/post/{slug(.+)}`    | **Built-in**         |
|     1    | User   | `/user/{route(.+)}`   | **Built-in**         |
|     2    | Api    | `/api/{route(.+)}`    | **Built-in, Plugin** |
|     2    | Feed   | `/feed/{route(.+)}`   | **Built-in, Plugin** |
|     3    | Page   | `/{route(.+)}`        | **Author**           |
|     4    | Plugin | `/{route(.+)}`        | **Plugin**           |

### Authentication

Emdash.js ships with support for internal authentication, third-party authentication, and time-based one-time password (TOTP) apps. Third-party is recommended over internal authentication, especially for serverless deployments where sufficient security may exceed sign-in execution time limititions.

Third-party authentication supports most well-known providers with [deno_kv_oauth](https://deno.land/x/deno_kv_oauth). Only one provider may be configured at a time, though this may change in the future. Enabling third-party authentication disables internal authentication.

TOTP apps complement internal or third-party authentication as a second factor.

#### Recommended Providers

These providers are recommended as well-known providers which the Emdash.js team prefers.

- **Auth0**
- **Dropbox**
- **Gitlab**
- **Okta**

These are recommended for their easy setup.

- Discord
- Github
- Google
- Patreon

#### Known Issues with Providers

Only the email address of the user is required from third-parties to correctly associate Emdash.js users with their sign-in details. Most providers make email addresses available, and support user authentication features. However, not all providers do this and some have known issues.

- **Auth0** and **Okta** are special cases where a domain must be provided.
- [Notion](https://www.notion.so) does not provide access to user emails during third-party authentication; as a result, their service may not be used for authentication with Emdash.js at this time.
- The website formerly known as **Twitter** is *technically* supported, but entirely untested. APIs at this service are changing rapidly and it is not recommended as an authentication provider. It may break at any time, if it even works at all.
- Care has been taken to not expose Emdash.js internals to **Facebook**. However, this provider should be considered *untrusted* if user privacy is a priority.

### Data

Data is stored in NoSQL collections as documents, with a primary key and an optional secondary key. Data sources should be flexible instead of strict, especially as read/write sources. Data sources must handle arbitrary properties in documents and all JSON data types including null. Such documents are the base primitive `DataRecord`; all other primitives derive from this.

| Name         | Inherits     | Description                                                  |
|:------------:|:------------:|--------------------------------------------------------------|
| `DataRecord` | None         | Base primitive for adapting data sources.                    |
| `AppData`    | `DataRecord` | App settings from data source, environment, and config file. |
| `Author`     | `User`       | User information for authors.                                |
| `Content`    | `DataRecord` | Base primitive for all content.                              |
| `Identity`   | `DataRecord` | Identity information for authentication and authorization.   |
| `Image`      | `Uint8Array` | Raw image data for serving images from a data source.        |
| `Page`       | `Content`    | Page content, route, and metadata.                           |
| `Post`       | `Content`    | Post content, route, and metadata.                           |
| `Reader`     | `User`       | User information for readers.                                |
| `User`       | `DataRecord` | Base primitive for all user types.                           |

#### Supported Data Sources

The app supports a limited number of data sources to balance flexibility with maintenance. These are configured using connection string schemes. The connection string should be kept private; an environment variable is suitable in most cases. Custom CA certificates are not supported.

| Source      | Scheme                                                               |
|-------------|----------------------------------------------------------------------|
| CockroachDB | *Same as Postgres.*                                                  |
| Deno KV     | `denokv://[:default:, :memory:, or working directory relative path]` |
| Git         | `git://[user@]host[:port]/path.git`                                  |
| Postgres    | `postgres://[user:password@]host[:port][path]?sslmode=require`       |
| Markdown    | `markdown://[:default: or working directory relative path]`          |

#### Deno KV

Deno KV is the default data source using `denokv://:default:`. A connection may also be made to a path relative to the project like `denokv://mydatabase.db`. The `:default:` symbol will open a KV database using Deno's built-in storage location. A working directory relative path will open a KV database at the provided path. When deploying to Deno Deploy, any Deno KV connection will fall back to `denokv://:default:` due to platform limitations.

#### CockroachDB and Postgres

The Postgres wire porotocol is supported by CockroachDB, and the internal Postgres adapter uses the SQL subset which CockroachDB supports. A secure connection to Postgres with no user might be `postgres://myserver.co.uk?ssl=required`.

The adapter is implemented using [Deno Drivers Postgres](https://deno.land/x/postgres). Each collection maps to a table by name. Keys are stored in columns as text with a reasonably high size limit. Documents are stored as type `JSONB`.

#### Git

A Git data source is a combination of Git using SSH and Deno KV for storing private data that does not belong in a repository. A connection string for a Github repository might look like `git://git@github.com/myuser/myproject.git`.

Git data should be organized like the Markdown adapter if there's pre-existing markdown files. Additionally, an `Images` directory will be dynamically created for uploaded images.

Records like `User`, `Identity`, and `AppData` will all be stored in Deno KV. This special case allows for plugins to work as expected and for authors to log in and create/edit posts in Git directly from the blog.

#### Markdown

Markdown is a read-only data source. Using this adapter disables all live functionality except themes. Connecting to a markdown folder named `./assets/myfiles` in the root of your project would look like `markdown://assets/myfiles`.

The adapter expects a directory structure with a `Posts` folder and optionally a `Pages` folder. These folder names are case-sensitive. You may place markdown files in these folders or in deeply nested subfolders. Only files ending with extension `.md` will be cached and their file names used as the Page or Post slug.

On startup, the app will recursively traverse these folders and cache paths to markdown files. These paths with be used as the route for any markdown in `Pages`. For `Posts`, the path will be ignored. When the adapter is called to get a Page or Post, any Frontmatter yaml will be parsed and act as metadata.

Supported frontmatter for all markdown include `title`, `subtitle`, `description`, `author`, `created_date`, and `modified_date`. Frontmatter for `Pages` additionally supports `path` to override the route inferred from the folder hierarchy; and `redirect` to add a `304 Redirect` to or from a route.

### Plugins

Plugins extend the functionality of the app. These run in a sandboxed manner. Plugins may use the data source to read and write their own records. A plugin may also read Content and User records, but cannot modify records they do not own. Plugins may provide arbitary Api, Feed, or Page routes, but cannot override either Built-in or Author providers.

| Type        | Capabilities                                                            |
|:-----------:|-------------------------------------------------------------------------|
| **Content** | Provide routes; render html, json, rss, and xml; access data source.    |
| **Theme**   | Provide css, images, and text; render sanitized header and footer html. |
| **Widget**  | Provide Api routes; render html and json; access data source.           |

#### Shipped Plugins

The Emdash.js team intends to ship a few plugins with the app. These plgins may serve both as an example and give some added value to app users.

| Name                 | Type    | Status | Description                                                          |
|----------------------|:-------:|--------|----------------------------------------------------------------------|
| **Commento**         | Widget  | TODO   | Adds comments to Posts from [Commento](https://commento.io).         |
| **Disqus**           | Widget  | TODO   | Adds comments to Posts from [Disqus](https://disqus.com).            |
| **Emerald City**     | Theme   | TODO   | A great and powerful green theme.                                    |
| **Emdash Bright**    | Theme   | TODO   | A beautiful, default theme.                                          |
| **Full-text Search** | Widget  | TODO   | Site search built on OramaSearch.                                    |
| **Module Publisher** | Content | TODO   | Publish code modules from raw uploads, Github, Gitlab, and Codeberg. |

#### Security Risks

There are inherent risks with any plugin system. Plugins can execute code both in backend and frontend contexts; and modify the look and feel of the app. Only use trusted plugins; such as those provided by the Emdash.js team, audited projects, a well-known developer, or written for your deployment.

#### Plugin Trust Model

Plugins are categorized by their level of risk to the end user. These categories are **Trusted**, **Privileged**, and **Unprivileged**. Additionally, all plugins must advertise their **PluginName**, **PluginId**, **PluginKind**, **Version**, **Assets**, and **Capabilities** in their manifest and at runtime; these are used to determine what data and methods are passed to the plugin as well as to provide users with a consent model for plugins. Plugins may optionally include a **PluginHash** in their manifest; such a hash is required for privileged plugins.

Unprivileged plugins are any plugin written by third parties. By default, third-party plugins are initialized and run in a sandbox to secure users against malicious code. Including a PluginHash and requesting review may result in a plugin becoming categorized as privileged. No unprivileged plugin may be trusted.

Privileged plugins are written by third-parties and Emdash.js contributors. These plugins are **well-known and manually reviewed** by the Emdash.js team. Well-known is subjective and meant to communicate that a human being maintaining Emdash.js decided to trust the author of a plugin. This definition of "well-known" will change as a community builds around this project. Privileged plugins **must** include a PluginHash in their manifest. Such plugins are also eligible for a user of Emdash.js to mark as trusted.

Trusted plugins are executed in the same context as Emdash.js for performance. Plugins written by the Emdash.js team and shipped by default with Emdash.js are also trusted by default and cannot be untrusted by users. Privileged plugins may be manually elevated to trusted by an Emdash.js user. Relying on trusted plugins improves cold-start times, especially in resource-constrained edge hosting like Deno Deploy.

**Plugin Manifest Properties**

- **PluginName**; *required*; a string value, conforming to JavaScript variable naming limitations.
- **PluginId**; *required*; the v4 globally unique ID of this plugin, which should not change between versions.
- **PluginKind**; *required*; the kind of plugin, one of `Content`, `Theme`, or `Widget`.
- **Version**; *required*; the version of the plugin, preferably using semantic versioning.
- **Assets**; *required*; a string array of static assets (relative to the plugin import url) which will be served.
- **Capabilities**; *required*; a string array of defined capabilities which the plugin needs from Emdash.js at runtime.
- **Description**; *optional*; a free-form description of the plugin intended for humans.
- **PluginHash**; *optional*; required for privileged and trusted plugins, this hash is computed from deterministic values that can be confirmed at runtime.

The plugin hash is computed by first concatenating the required manifest values and the import url of the plugin. The code, concatenated values, and all assets (except the manifest) are then packed into a container, similar to how a module for NPM is packed. The container is then SHA-512 hashed and the resulting hash should be added to the manifest. The container is then discarded. The code, manifest, and assets should all be served from the same hosting url. This makes it easy to author a plugin as a Deno, Github, Codeberg, or other module.

**Capabilities**

A plugin that attempts to access a capability of Emdash.js that it did not advertise will silently fail and cause Emdash.js to store details of the attempt which a user can review later. Any front-end issues should be isolated by Emdash.js to the plugin and allow the rest of Emdash.js to continue working normally.

| Name           | Description                                                  |
|----------------|--------------------------------------------------------------|
| `Api/${root}`  | Provides an api at a given root.                             |
| `Content`      | Read-only access to content records.                         |
| `Feed/${root}` | Provides an RSS feed at a given root.                        |
| `Page/${root}` | Provides page routes at a given root.                        |
| `Style`        | Provides either `link rel="stylesheet"` or `style` tags.     |
| `Script`       | Provides script tags.                                        |
| `User`         | Read-only access to user objects.                            |
