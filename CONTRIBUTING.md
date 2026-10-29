# Panduan Kontribusi (Contributing Guide)

Terima kasih atas ketertarikan Anda untuk berkontribusi pada **CertifyFlow Enterprise**! 🎉 Proyek ini merupakan aplikasi open source yang berfokus pada privasi dan kemudahan pembuatan sertifikat massal 100% di sisi browser (*client-side*).

---

## 📋 Daftar Isi

1. [Kode Etik](#kode-etik)
2. [Cara Berkontribusi](#cara-berkontribusi)
   - [Melaporkan Bug](#melaporkan-bug)
   - [Mengajukan Fitur Baru](#mengajukan-fitur-baru)
   - [Mengirimkan Pull Request (PR)](#mengirimkan-pull-request-pr)
3. [Alur Pengembangan Lokal](#alur-pengembangan-lokal)
4. [Prinsip Arsitektur Proyek](#prinsip-arsitektur-proyek)
5. [Konvensi Kode](#konvensi-kode)

---

## 🤝 Kode Etik

Dengan berpartisipasi dalam proyek ini, Anda setuju untuk mematuhi [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). Harap selalu bersikap ramah, inklusif, dan saling menghormati.

---

## 🛠️ Cara Berkontribusi

### Melaporkan Bug
Jika Anda menemukan bug:
1. Periksa bagian [Issues](https://github.com/) apakah masalah serupa sudah pernah dilaporkan sebelumnya.
2. Buat Issue baru dengan memilih template **Bug Report**.
3. Jelaskan langkah-langkah reproduksi bug, hasil yang diharapkan (*expected result*), dan tangkapan layar jika ada.

### Mengajukan Fitur Baru
Punya ide menarik untuk CertifyFlow?
1. Buka Issue baru dengan memilih template **Feature Request**.
2. Jelaskan use-case, solusi yang diusulkan, serta bagaimana fitur tersebut bermanfaat bagi pengguna lain.

### Mengirimkan Pull Request (PR)
1. Fork repository ini ke akun GitHub Anda.
2. Buat branch baru dari `main`:
   ```bash
   git checkout -b fituro-anda-atau-perbaikan-bug
   ```
3. Lakukan perubahan kode dan pastikan aplikasi berjalan lancar:
   ```bash
   npm run lint
   npm run build
   ```
4. Commit perubahan dengan pesan commit yang jelas dan deskriptif:
   ```bash
   git commit -m "feat: tambahkan dukungan rotasi teks pada canvas"
   # atau
   git commit -m "fix: atasi template library tidak muncul di wizard"
   ```
5. Push branch ke repository fork Anda:
   ```bash
   git push origin fituro-anda-atau-perbaikan-bug
   ```
6. Buat **Pull Request** ke branch `main` di repository utama dan jelaskan perubahan yang Anda buat.

---

## 💻 Alur Pengembangan Lokal

Pastikan Anda telah menginstal **Node.js 18+** dan **npm**.

```bash
# 1. Clone repository
git clone https://github.com/USERNAME/certifyflow.git
cd certifyflow

# 2. Install dependencies
npm install

# 3. Jalankan server development
npm run dev

# 4. Buka di browser
# http://localhost:3000
```

---

## 🏛️ Prinsip Arsitektur Proyek

Harap perhatikan batasan teknis inti proyek ini:
* **100% Client-Side**: Aplikasi ini **tidak boleh** bergantung pada backend API atau database server eksternal untuk pemrosesan sertifikat. Semua proses rendering, parsing CSV, penyimpanan template (IndexedDB), dan pembuatan ZIP harus berjalan di browser pengguna demi menjaga privasi penuh pengguna.
* **Offline First**: Fitur utama harus tetap dapat berfungsi tanpa koneksi internet setelah bundle web dimuat.
* **Performa & Responsivitas**: Karena proses massal bisa mencapai ribuan sertifikat, utamakan efisiensi memori (misalnya pembersihan Blob URL dengan `URL.revokeObjectURL` dan penggunaan multi-threading Web Worker).

---

## 🎨 Konvensi Kode

- Gunakan **TypeScript** secara ketat untuk tipe data baru di `src/types/`.
- Gunakan nama komponen PascalCase (`WizardPage`, `PropPanel`).
- Gunakan nama fungsi dan variabel camelCase (`loadSavedTemplates`, `exportFmt`).
- Pastikan kode lulus linting (`npm run lint`).

