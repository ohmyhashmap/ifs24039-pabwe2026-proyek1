# Audit Lighthouse & Axe Core — SigapAsap

## Isi form audit

| Kolom                     | Nilai                                                                           |
| ------------------------- | ------------------------------------------------------------------------------- |
| Base URL                  | `https://ifs24039-pabwe2026-proyek1…` (URL deploy publik, tanpa trailing slash) |
| Path publik (min. 2)      | `/`, `/berita`, `/tentang`, `/statistik`, `/peta`                               |
| Login                     | `/auth/login` (field `Username` & `Password`)                                   |
| Path terproteksi (min. 4) | `/dashboard`, `/laporan-saya`, `/profil`, `/pengaturan`                         |

Akun uji coba: buat lewat `/auth/register` (atau seed di backend), lalu isi USERNAME & PASSWORD di form.

## Kontrak API backend (Express + SQLite)

Semua respons berformat `{ "success": boolean, "data": ..., "error": string }`.
Endpoint terproteksi memakai header `Authorization: Bearer <token>`; token tidak valid → HTTP 401.

| Method & path                | Body                               | `data`                                                                |
| ---------------------------- | ---------------------------------- | --------------------------------------------------------------------- |
| `POST /api/v1/auth/register` | `{ name, username, password }`     | `{ token, user: { id, username, name } }` (409 jika username dipakai) |
| `POST /api/v1/auth/login`    | `{ username, password }`           | `{ token, user }` (401 jika salah)                                    |
| `GET /api/v1/auth/me`        | –                                  | `user`                                                                |
| `PUT /api/v1/auth/profile`   | `{ name }`                         | `user` terbaru                                                        |
| `PUT /api/v1/auth/password`  | `{ currentPassword, newPassword }` | `{}` (400 jika password lama salah)                                   |
| `GET /api/v1/reports/mine`   | –                                  | `[{ id, severity, description, created_at }]` milik user              |
| `POST /api/v1/reports`       | body lama                          | jika ada Bearer token, simpan `user_id` agar muncul di “Laporan Saya” |

Simpan password dengan hash (mis. `bcrypt`) dan token berupa JWT (`jsonwebtoken`).

## Catatan routing

Aplikasi ini SPA dengan router manual (`src/App.svelte`). `vercel.json` sudah me-rewrite semua path ke
`index.html`, sehingga path seperti `/auth/login` dan `/dashboard` bisa dibuka langsung oleh auditor.
Halaman terproteksi dialihkan ke `/auth/login` bila belum login; `/auth/*` dialihkan ke `/dashboard` bila sudah login.
