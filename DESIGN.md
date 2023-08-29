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

Emdash.js ships with support for internal authentication, third-party authentication, and time-based one-time password (TOTP) apps. OAuth is recommended over internal authentication, especially for serverless deployments where sufficient security may exceed limititions.

Third-party authentication supports any single provider exposed by [deno_kv_oauth](https://deno.land/x/deno_kv_oauth). Only one provider may be configured at a time. Enabling third-party authentication disabled internal authentication.

TOTP apps complement internal or third-party authentication as a second factor.

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

| Source      | Scheme                                                             |
|-------------|--------------------------------------------------------------------|
| CockroachDB | *Same as Postgres.*                                                |
| Deno KV     | `denokv://[<DEFAULT> or working directory relative path]`          |
| Git         | `git://[user@]host[:port]/path.git`                                |
| Postgres    | `postgres://[user:password@]host[:port][path]?sslmode=require`     |
| Markdown    | `markdown://[<DEFAULT> or working directory relative path]`        |

#### Deno KV

Deno KV is the default data source using `denokv://<DEFAULT>`. A connection may also be made to a path relative to the project like `denokv://mydatabase.db`. The `<DEFAULT>` symbol will open a KV database using Deno's built-in storage location. A working directory relative path will open a KV database at the provided path. When deploying to Deno Deploy, any Deno KV connection will fall back to `denokv://<DEFAULT>` due to platform limitations.

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

Plugins extend the functionality of the app. These run in a semi-sandboxed manner. Plugins may use the data source read and write their own records. A plugin may also read Content records, but cannot modify records they do not own. Plugins may provide arbitary Api, Feed, or Page routes, but cannot override either Built-in or Author providers.

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
