# SigapAsap Frontend

Frontend SigapAsap adalah aplikasi Svelte SPA berbasis Vite. Halaman berada di
`src/pages`, aset publik yang disalin saat build berada di `public`, dan
`index.html` ada di root aplikasi.

## Menjalankan

```sh
bun install
bun run dev
```

Saat development, request `/api` diteruskan ke `http://localhost:8787`.
Salin `.env.example` ke `.env.local` lalu ubah `VITE_API_URL` sesuai URL backend
yang dipakai. Nilai ini digunakan saat aplikasi dijalankan atau dibuild.

## Validasi dan build

```sh
bun run check
bun run lint
bun run test:coverage
bun run build
bun run preview
```

Build static SPA dibuat ke `dist`.
