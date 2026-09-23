<p align="center">
  <img width="128" alt="logo" src="docs/icon/exam-toolbox-beta-icon.png">
</p>

# exam-toolbox

An internal web application for higher-education staff to author exam templates, preview rendered PDFs, and mass-generate personalised exam PDFs for printing.

It is still very much a work in progress and we do not recommend deploying it yet.

## Features

- **Exam builder** – create and manage bilingual (DE/EN by default) exam definitions in a browser UI
- **Task pool** – reusable question bank with tagging and search
- **PDF preview** – render a single exam to PDF without leaving the editor
- **File uploads** – attach images for picture-based tasks
- **Mass generation** – upload an Excel participant list and generate per-student exam PDFs in parallel, with a downloadable ZIP artifact and an attendance CSV
- **Email notification** – notifies the requester when a bulk job finishes
- **QR codes** – embeds a front-page exam QR code (encoding course, semester, date, language, page count, points, and a random code) and per-page QR codes with a pre-generated cache
- **Exam codes** – generates and validates exam codes with a checksum algorithm
- **Access control** – all routes protected by JWT session tokens. Authenticates directly against LDAP; only members of a specific configured group may log in, with granular roles for `teachers` and `admins`.

## Setup

> [!WARNING]
> Do not make the application publicly accessible. Even though it does include authentication mechanisms and we aim to follow coding good practices, the nature of the data it handles makes it an inappropriate risk to expose to the public internet. Only use it in internal networks!

Will be documented once the project is in a usable state.

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for further information.
