# Kebijakan Keamanan (Security Policy)

## Versi yang Didukung

Kami secara aktif memperbarui dan memelihara versi stabil terbaru dari **CertifyFlow Enterprise**.

| Versi | Didukung |
| ----- | -------- |
| 0.1.x | :white_check_mark: |

---

## 🔒 Desain Keamanan & Privasi CertifyFlow

CertifyFlow Enterprise dirancang dengan prinsip **Zero Server Architecture**:
- Semua data pemrosesan (nama penerima, ID sertifikat, gambar template, dan file CSV) **100% diproses di browser klien**.
- Tidak ada data yang dikirim atau disimpan di server eksternal, basis data cloud, atau layanan pihak ketiga.
- Penyimpanan lokal (seperti template tersimpan) menggunakan IndexedDB browser pengguna sendiri.

---

## 🛡️ Melaporkan Kerentanan Keamanan

Jika Anda menemukan potensi kerentanan keamanan (seperti XSS, injeksi CSV yang membahayakan file unduhan, atau kerentanan dependensi):

1. **Jangan publikasikan secara terbuka di GitHub Issues publik.**
2. Laporkan secara privat melalui fitur [GitHub Security Advisory](https://github.com/) pada repository ini, atau hubungi pemilik/maintainer repository secara langsung.
3. Sertakan deskripsi terperinci mengenai kerentanan, langkah-langkah eksploitasi (*proof of concept*), serta dampak yang ditimbulkan.

Kami menghargai kerja sama Anda dalam menjaga keamanan ekosistem open source ini.

