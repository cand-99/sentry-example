![][image1]

Engineering \- Frontend Research & Development  
**Guideline Perlindungan Data Sensitif Menggunakan [Sentry.io](http://Sentry.io)**

Candra Herdiana  
candra@rollingglory.com

# **Index** {#index}

[**Index	1**](#index)

[**Overview	2**](#overview)

[**Objective	2**](#objective)

[**Scope & Context	2**](#scope-&-context)

[**Approach / Method	2**](#approach-/-method)

[**Findings & Results	2**](#findings-&-results)

[**References & Related Work	2**](#references-&-related-work)

[**Conclusion & Recommendation	2**](#conclusion-&-recommendation)

[**Change History	2**](#change-history)

# **Overview** {#overview}

Research ini merupakan lanjutan dari riset sebelumnya tentang penggunaan Sentry.io sebagai APM (Application Performance Monitoring) di project Next.js RGB. Cakupannya lebih spesifik ke aspek keamanan informasi — terutama bagaimana memastikan data sensitif pengguna tidak ikut terkirim ke platform Sentry yang merupakan layanan pihak ketiga (cloud-based).

Salah satu risiko yang kerap tidak disadari adalah bahwa data seperti email, password, token akses, atau informasi finansial bisa secara tidak sengaja terekam dan terkirim ke server Sentry ketika error terjadi. Dokumen ini merangkum guideline dan praktik yang perlu dijalankan oleh seluruh engineer di tim, agar penanganan data sensitif tetap sesuai standar keamanan informasi perusahaan (ISO 27001).

# **Objective** {#objective}

* Membuat guideline resmi tentang perlindungan data sensitif saat menggunakan Sentry sebagai logger.  
* Menjelaskan mekanisme dan fitur Sentry yang tersedia untuk melindungi data sensitif.  
* Mendokumentasikan apa yang wajib dilakukan dan wajib dihindari dalam implementasi Sentry agar selaras dengan standar keamanan informasi (ISO 27001).

# **Scope & Context** {#scope-&-context}

Research ini mencakup panduan perlindungan data sensitif khusus dalam konteks penggunaan Sentry.io sebagai error logger pada project berbasis JavaScript/Next.js. Guideline ini mengacu pada dokumentasi resmi Sentry dan standar keamanan informasi ISO 27001, dengan fokus pada:

* Konfigurasi SDK Sentry di sisi client maupun server.  
* Penggunaan fitur scrubbing dan filtering bawaan Sentry.  
* Pengaturan server-side scrubbing melalui Sentry Dashboard.  
* Praktik pengkodean yang aman dalam mengirimkan log error ke Sentry.

Research ini tidak mencakup perbandingan mendalam dengan tool logging lain, setup Sentry untuk platform non-JavaScript, maupun konfigurasi infrastruktur Sentry self-hosted.

# **Approach / Method** {#approach-/-method}

Research ini dilakukan dengan pendekatan studi dokumentasi dan praktik industri, mencakup:

* Studi dokumentasi resmi Sentry ([https://docs.sentry.io](https://docs.sentry.io)) khususnya pada bagian Data Management dan Security & Privacy.  
* Analisis fitur-fitur keamanan yang disediakan Sentry SDK untuk JavaScript/Next.js.  
* Referensi standar ISO 27001 terkait pengelolaan log dan perlindungan data.  
* Review kode dari riset sebelumnya (by Ipit) sebagai dasar konteks penggunaan.

# **Findings & Results** {#findings-&-results}

## Apa Itu Data Sensitif dalam Konteks Logging?

Sebelum masuk ke mekanisme perlindungannya, perlu ada kesamaan pemahaman tentang apa saja yang termasuk data sensitif dalam konteks Sentry sebagai logger — supaya tidak ada perbedaan asumsi antar engineer. Berikut kategori yang harus diperlakukan sebagai sensitif:

| Kategori | Contoh |
| ----- | ----- |
| PII (Personal Identifiable Info) | Nama lengkap, email, nomor telepon, alamat, tanggal lahir |
| Kredensial & Autentikasi | Password, token akses, API key, session ID, refresh token, cookie auth |
| Data Finansial | Nomor kartu kredit, nomor rekening, data transaksi, saldo |
| Data Lokasi | Koordinat GPS real-time, alamat rumah/kantor spesifik |
| Data Internal Sistem | Secret environment variable, kunci enkripsi, internal URL/endpoint sensitif |

*Source: [https://docs.guidewire.com/security/secure-coding-guidance/logging-sensitive-information-PII/](https://docs.guidewire.com/security/secure-coding-guidance/logging-sensitive-information-PII/)*

## Bagaimana Data Sensitif Bisa Bocor ke Sentry?

Sentry SDK secara default memang tidak mengirim PII. Namun ada beberapa jalur yang berpotensi menyebabkan data sensitif bocor tanpa disadari:

### 1\. Stack Locals (Variable Values di Stack Trace)

Beberapa SDK (Python, PHP, Node.js) secara otomatis menangkap nilai variabel lokal di dalam stack trace. Jika sebuah fungsi kebetulan memiliki variabel **`password`** atau **`token`** saat error terjadi, nilainya bisa ikut terkirim.

### 2\. Breadcrumbs dari Log Statement

SDK JavaScript dan Java secara otomatis menangkap log statement sebelumnya sebagai breadcrumb. Jika ada **`console.log`** yang mengandung data user, breadcrumb tersebut akan ikut terkirim ke Sentry.

Jangan pernah melakukan console.log atau logging apapun terhadap objek user secara utuh (raw user object), response dari API autentikasi, atau data yang mengandung kredensial \- karena breadcrumb Sentry akan menangkapnya secara otomatis.

### 3\. HTTP Context (Query String & Headers**)**

Sebagian besar SDK secara otomatis menambahkan query string dan HTTP header ke dalam context event. Jika aplikasi meneruskan token atau password melalui URL parameter — misalnya **`/login?token=abc123`** — data tersebut akan ikut terekam.

### 4\. Transaction Names dengan User ID

Transaction name juga bisa memuat data sensitif tanpa disadari. Misalnya URL **`/users/1234/details`** akan tercatat dengan ID user yang sebenarnya. Sentry SDK umumnya dapat memarameterisasi URL ini menjadi **`/users/:id/details`**, tapi hasilnya tidak selalu konsisten di semua kondisi.

### 5\. sendDefaultPii Diaktifkan

Opsi **`sendDefaultPii`** mengontrol apakah SDK secara otomatis menyertakan PII seperti IP address dan identitas user. Nilai default-nya adalah **`false`**, namun jika diubah ke **`true`**, Sentry akan mulai mengirim data tersebut secara otomatis.

## Mekanisme Perlindungan yang Tersedia di Sentry

Sentry menyediakan dua lapisan perlindungan: dari sisi kode (SDK) dan dari konfigurasi Dashboard. Keduanya perlu diterapkan bersamaan — SDK sebagai lapisan utama, Dashboard sebagai pengaman kedua apabila ada yang terlewat.

### Lapisan 1 — Perlindungan via Kode (SDK)

1. #### beforeSend: Filter Sebelum Dikirim

**`beforeSend`** adalah callback yang dijalankan tepat sebelum event error dikirim ke server Sentry. Ini lapisan paling kuat — data yang dihapus di sini tidak akan pernah sampai ke Sentry.

| // sentry.client.config.ts / sentry.server.config.ts Sentry.init({   dsn: process.env.NEXT\_PUBLIC\_SENTRY\_DSN,   beforeSend(event) {     // Hapus email user sebelum dikirim     if (event.user) {       delete event.user.email;       delete event.user.ip\_address;     }     // Hapus Authorization header     if (event.request?.headers) {       delete event.request.headers\['Authorization'\];       delete event.request.headers\['Cookie'\];     }     return event;   }, }); |
| :---- |

*Source: [https://docs.sentry.io/platforms/javascript/configuration/filtering/\#using-before-send](https://docs.sentry.io/platforms/javascript/configuration/filtering/#using-before-send)*

2. #### beforeBreadcrumb: Filter Breadcrumb Sensitif

**`beforeBreadcrumb`** digunakan untuk memfilter atau memodifikasi breadcrumb sebelum disimpan. Tujuannya untuk memastikan log statement yang mengandung PII tidak ikut masuk ke dalam breadcrumb.

| Sentry.init({   dsn: process.env.NEXT\_PUBLIC\_SENTRY\_DSN,   beforeBreadcrumb(breadcrumb) {     // Filter breadcrumb dari endpoint autentikasi     if (breadcrumb.data?.url?.includes('/api/auth')) {       return null; // null \= tidak disimpan     }     // Hapus message yang mengandung kata kunci sensitif     if (breadcrumb.message?.toLowerCase().includes('password')) {       return null;     }     return breadcrumb;   }, }); |
| :---- |

*Source: [https://docs.sentry.io/platforms/javascript/configuration/filtering/](https://docs.sentry.io/platforms/javascript/configuration/filtering/)*

3. #### denyUrls: Blokir Error dari URL Tertentu

**`denyUrls`** digunakan untuk mencegah pengiriman error yang berasal dari URL atau pola URL tertentu — misalnya dari third-party script seperti Google Analytics atau CDN eksternal yang bukan bagian dari kode tim.

| Sentry.init({   dsn: process.env.NEXT\_PUBLIC\_SENTRY\_DSN,   denyUrls: \[     // Abaikan error dari Google Tag Manager     /googletagmanager.com/i,     // Abaikan error dari CDN eksternal     /cdn.example.com/i,     // Abaikan error dari browser extensions     /extensions\\//i,     /^chrome:\\/\\//i,   \], }); |
| :---- |

#### 

#### 

4. #### Hashing Data untuk Korelasi Internal

Jika perlu mengkorelasikan event Sentry dengan data internal tanpa mengekspos data aslinya, bisa menggunakan teknik hashing. Dengan cara ini event tetap bisa di-trace per user, tanpa harus menyimpan data sensitifnya langsung di Sentry.

| // JANGAN: kirim data sensitif langsung Sentry.setTag("user\_email", "john@example.com"); //  LAKUKAN: hash dulu, baru kirim sebagai tag import { createHash } from 'crypto'; const emailHash \= createHash('sha256').update("john@example.com").digest('hex'); Sentry.setTag("user\_ref", emailHash.substring(0, 8)); // Untuk identitas user, cukup gunakan internal ID Sentry.setUser({ id: user.internalId }); |
| :---- |

**Lapisan 2 — Perlindungan via Sentry Dashboard**

**![][image2]***Source: Screenshot Security & Privacy dashboard Sentry*

Selain konfigurasi di level kode, Sentry juga menyediakan halaman pengaturan di Dashboard yang bisa diubah tanpa perlu deploy ulang. Perubahan yang dilakukan di sini langsung berlaku untuk semua event baru yang masuk.

#### Cara Mengakses: Settings \> Security & Privacy \> Data Scrubbing

Lokasi setting berbeda di level Organization dan Project:

* Organization level: Settings \> Security & Privacy  
* Project level: Settings \> \[Project Name\] \> Security & Privacy

#### 1\. Data Scrubber (Enable Server-Side Scrubbing)

Toggle utama untuk mengaktifkan scrubbing di sisi server. Jangan dinonaktifkan.

Cara setting: Settings \> Security & Privacy \> Data Scrubbing \> aktifkan toggle "Data Scrubber"

Saat aktif, Sentry akan otomatis melakukan scrub terhadap nilai yang terdeteksi sebagai data sensitif sebelum disimpan di server mereka.

#### 2\. Use Default Scrubbers

Mengaktifkan scrubber bawaan Sentry yang sudah mengenali pola-pola field sensitif umum. Pastikan toggle ini selalu ON (default: ON).

Cara setting: Settings \> Security & Privacy \> Data Scrubbing \> aktifkan toggle "Use Default Scrubbers"

Sentry secara default melakukan scrubbing untuk field-field berikut:

* password, passwd, secret  
* api\_key, apikey, auth, credentials, token, bearer  
* privatekey, private\_key, mysql\_pwd  
* Pola nomor kartu kredit (menggunakan regex basic)

#### 3\. Prevent Storing of IP Addresses

Mencegah Sentry menyimpan IP address user di setiap event. Perlu diaktifkan terutama untuk project yang menangani data dari user di region yang masuk cakupan GDPR atau regulasi privasi serupa.

Cara setting: Settings \> Security & Privacy \> Data Scrubbing \> aktifkan toggle "Prevent Storing of IP Addresses"

#### 4\. Additional Sensitive Fields

Untuk menambahkan field kustom yang perlu di-scrub namun belum tercakup di default scrubber. Gunakan ini untuk field-field spesifik yang ada di masing-masing project.

Cara setting: Settings \> Security & Privacy \> Data Scrubbing \> isi kolom "Additional Sensitive Fields"

Contoh field yang perlu ditambahkan:

| email phone national\_id account\_number refresh\_token access\_token |
| :---- |

#### 

#### 5\. Safe Fields

Kebalikan dari Additional Sensitive Fields — digunakan untuk mendaftarkan nama field yang tidak perlu di-scrub, meskipun namanya mirip dengan field sensitif.

Cara setting: Settings \> Security & Privacy \> Data Scrubbing \> isi kolom "Safe Fields"

Contoh penggunaan:

| business-email public-token support-id |
| :---- |

## Wajib Dilakukan & Wajib Dihindari

| WAJIB DILAKUKAN | WAJIB DIHINDARI |
| ----- | ----- |
| Aktifkan server-side data scrubbing dan jangan matikan (default ON) | Jangan log password, token, API key, atau kredensial dalam bentuk apapun |
| Implementasikan beforeSend untuk menghapus field sensitif sebelum event dikirim | Jangan aktifkan sendDefaultPii: true di environment production |
| Gunakan beforeBreadcrumb untuk memfilter log yang mengandung PII | Jangan sertakan raw user object atau response body autentikasi dalam error context |
| Gunakan internal ID atau hash, bukan data asli (email, nama, dll) untuk Sentry.setUser() | Jangan log query parameter URL yang mengandung token atau password |
| Tambahkan field kustom di Additional Sensitive Fields jika ada field non-standard | Jangan capture exception dari blok yang memproses data finansial tanpa scrubbing |
| Pastikan sendDefaultPii \= false di semua environment production | Jangan gunakan console.log terhadap data sensitif \- breadcrumb Sentry akan menangkapnya |
| Simpan DSN di environment variable, bukan hardcode di kode | jangan hardcode DSN Sentry di source code yang bisa diakses publik |
| Lakukan code review khusus privacy saat ada PR yang menyentuh konfigurasi Sentry | Jangan beri akses dashboard Sentry ke pihak luar tanpa review keamanan |
| Batasi akses dashboard Sentry menggunakan RBAC \- hanya engineer & security team |  |
| Lakukan audit berkala terhadap event yang masuk ke Sentry untuk memastikan tidak ada data sensitif |  |
| Aktifkan "Prevent Storing of IP Addresses" di Sentry Dashboard untuk project production |  |

## Bukti Data Leak di Sentry Dashboard

Berikut screenshot dari Sentry Dashboard yang membuktikan bahwa data sensitif bisa bocor ke Sentry jika tidak ada konfigurasi perlindungan yang memadai. Screenshot diambil dari demo project menggunakan SDK Sentry untuk Next.js.

### 1. PII Leak via setUser()

Data email, username, dan IP address terkirim ke Sentry melalui Sentry.setUser().

<!-- Placeholder screenshot: setUser PII visible di Sentry issue detail -->
*Screenshot menyusul*

### 2. PII Leak via setTag()

Email dan nomor telepon terkirim sebagai tags di Sentry event.

<!-- Placeholder screenshot: tags PII visible di Sentry issue detail -->
*Screenshot menyusul*

### 3. Password di Breadcrumb

console.log yang berisi password tertangkap oleh Sentry breadcrumb.

<!-- Placeholder screenshot: breadcrumb menampilkan password di Sentry -->
*Screenshot menyusul*

### 4. Data Sensitif di Extra Context

Password, API token, dan nomor kartu kredit terkirim melalui captureException extra.

<!-- Placeholder screenshot: extra context menampilkan credentials di Sentry -->
*Screenshot menyusul*

### 5. Data Leak dari Login API (Server-side)

Password dan token terkirim dari server-side API route.

<!-- Placeholder screenshot: server-side login API data leak di Sentry -->
*Screenshot menyusul*

### 6. Data Leak dari User Profile API (Server-side)

PII dan data finansial user terkirim dari server-side API route.

<!-- Placeholder screenshot: server-side user API data leak di Sentry -->
*Screenshot menyusul*

### 7. Data Leak dari Payment API (Server-side)

Nomor kartu kredit, CVV, dan nomor rekening terkirim dari server-side payment route.

<!-- Placeholder screenshot: server-side payment API data leak di Sentry -->
*Screenshot menyusul*

# **References & Related Work** {#references-&-related-work}

Berikut referensi yang digunakan dalam penyusunan guideline ini:

- Link repository : 

Sentry Official Documentation

* Sentry Official Docs \- Scrubbing Sensitive Data: [https://docs.sentry.io/security-legal-pii/scrubbing/](https://docs.sentry.io/security-legal-pii/scrubbing/)  
* Sentry \- Filtering Events (beforeSend, beforeBreadcrumb, denyUrls): [https://docs.sentry.io/platforms/javascript/configuration/filtering/](https://docs.sentry.io/platforms/javascript/configuration/filtering/)

ISO 27001 & Security Standards

* ISO 27001 Control 8.15 Logging — Iseo Blue: [https://iseoblue.com/post/iso-27001-control-8-15-logging/](https://iseoblue.com/post/iso-27001-control-8-15-logging/)

PII & Data Privacy

* PII Leakage Prevention — Hoop.dev: [https://hoop.dev/blog/pii-leakage-prevention-how-to-stop-sensitive-data-from-escaping-your-systems](https://hoop.dev/blog/pii-leakage-prevention-how-to-stop-sensitive-data-from-escaping-your-systems)  
* GDPR Compliant Logging — Databunker: [https://databunker.org/use-case/gdpr-compliant-logging/](https://databunker.org/use-case/gdpr-compliant-logging/)

Riset Terkait

* Research sebelumnya[: Error Tracking APM with Sentry.io \- Fitria Wahyuni](https://docs.google.com/document/d/1_CRhOLBOffjGcP8I0UeTa3mXpjSh-WfOURd_YsHSl8E/edit?tab=t.0)

# **Conclusion & Recommendation** {#conclusion-&-recommendation}

Sentry.io pada dasarnya aman digunakan di production, asalkan konfigurasi perlindungan data sensitifnya diterapkan sejak awal. Secara default Sentry memang sudah tidak mengirim PII, namun hal itu saja tidak cukup tanpa konfigurasi tambahan dari sisi engineer.

Perlindungan data sensitif di Sentry perlu dilakukan di **dua lapisan**:

1. **Lapisan SDK (beforeSend, beforeBreadcrumb)** — memastikan data sensitif tidak pernah keluar dari environment aplikasi.  
2. **Lapisan Dashboard (Data Scrubber, Advanced Rules)** — pengaman di sisi server, yang bisa dikonfigurasi tanpa deploy ulang.

Keduanya saling melengkapi dan tidak bisa saling menggantikan.

Rekomendasi untuk langkah selanjutnya:

* Masukkan konfigurasi **`beforeSend`** dan **`beforeBreadcrumb`** ke dalam template/boilerplate Sentry standar tim.  
* Pastikan Data Scrubber, Use Default Scrubbers, Prevent Storing of IP Addresses, dan Additional Sensitive Fields selalu dikonfigurasi setiap kali project Sentry baru dibuat.  
* Lakukan audit berkala terhadap event yang masuk di Sentry dashboard untuk memvalidasi bahwa tidak ada data sensitif yang bocor.

# **Change History** {#change-history}

Juni 2026: Inisiasi dokumen \- guideline perlindungan data sensitif menggunakan Sentry  


[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPMAAABDCAYAAABJPDNKAAAREUlEQVR4Xu2dBbAcRRCGg7u7VnAr3N0KCO7uBHcJwR1CcAmuhbsXEKxwd3d3d5ehvgm9Ndc7O7tn7x7v9VfVlZdbvb35Z3p6emb7OMMwegR99AeGYfw/MTEbRg+ho2L+559/vFXh77//rryvYfRGOiLmv/76y5144olutNFGc3369HFHHHGE3qWG9dZbz+833njjuYcfflhvNgzDdUjMv/32m1tyySW9QLF5551X71KD7IftsMMOerNhGK5DYoYHHnjATTfddG622WZzTzzxhN6c8eOPP2ZCnnPOOd3vv/+udzEMw3VQzHDOOee4Cy64QH+c8emnn7rDDjssE/P333+vdzEM4z86JuZ3333XLbfccl6k888/v97snn/+eTf88MPXuNh//vmn3s0wjP/omJhvueWWGqF+8cUX/vNffvnFXXzxxW6cccap2W5iNow0HREz0ezDDz+8RqgDBgzw/eGBAwe68ccfPydkjOMMw4jTETE/++yzOaFiY489du6z0BhrNgwjTkfEvMcee+SEWsVi4HoPHTrUHX/88e7rr7/Wmw2j1xBXSJt57LHHfPLHXXfd5U455RR36KGHujXWWMNNP/30OQGXiRm3XLbPM8887rnnntO7GEavIK6QLgb3+ZNPPvFC3G+//dzUU0+dEzJGYOyMM85wgwcPdjvuuKNbdtll3VRTTZVtX2aZZdwHH3ygT28YvYJuIeYQhI3rTFKJFvMII4zgh6uw4YYbzn9G9tgss8ziJpxwQnfnnXfq0xlGr6GtYv7pp5/c66+/7ltTotf9+/d3G2ywgc+15t8tt9zSu9hDhgxxr7zyivvhhx/0KdzPP//sVllllZywxcgQMwyjTWL+448/3CGHHOJWXXVVt9BCC7mRRhopJ0Ld4pI4stJKK7lHH33UjzWHfPTRR27QoEG54zDDMIbRMjWQ9HHllVfmxNaMke5JX1p47bXX3JRTTum3TT755L7lNwxjGC0R87fffuv69euXE2MrbOGFF3ZfffVVdq3333/fLbLIIu7SSy+1cWfDCGhKzJdffrmPJo844og5EbbSCHZNNtlkfuokkAlmQjaMWhoWM6mXWnTtNhY0MAwjTkNiJiDVaBZXo8YqI5999pm+FcMw/qNuMX/33Xdu9NFHz4mtzHDHDzzwQN+6luVgayPwZet/GUaausV8wAEH5MSWMlpUsrLo58oCfhNNNFFuv5gxDfLMM8/Ut+B5/PHHbUqkYQTUJeaqLSpJISR7FFEm5r59+3o3XkM//aqrrnJLLbVUtq9hGMOorIZ33nknS6FM2YUXXuiX+0mREjPJI7feemt0rS8W8yNtM9z/hRde0LsZRq+kkpgR1tFHH50Tnra555670pBRSsyMKcfO8cwzz0SHwLbddtukF9AIVBAPPfRQjTHL680339S7FkIXgIkjdEuIFXz44Yel/f633347u57OgiuCYCT783zIvKuCXCOWPguM5bOdVFx9z+QUsO2RRx5xX375Zc02DeWG7tD+++/v13J76aWXWtY14tzMumNizlFHHeU9thSsH3fvvff6e6/6nEJuuukmr4HjjjvOn6csjZjY0lNPPZUrR2Q4phbZSP3+7733XradZbc0lcS800475USkjQUHqqLFPOaYY7onn3wyV3AEfS1t6667rj6kKVZeeeXcNUJjumYRPPBYpSN22mmn+R86BuuHjzzyyH6/qrO/rr76ar//oosuWiouQe4FbysGiyzKPtNMM03NNio1Pieecf/999dsE6iUtthii9x3F+M7NgrlZIkllsidM7QYrCkn26s+J0Q/44wz5s4vtvTSS/v7iUGDwJRcfYwYk4XCZChhn332yfa57777ss9p4OTzooor/s0DqJ0Rm76Z0Ji1VA9azMxpTsH59TVDG2WUUfQhTSFiRiC77rqr23nnnf2kkJlmmil5vW+++aZmyI6+/7HHHuuOPPJIN9ZYY/nP+O7nn39+tHXojmLGPv/882xbmZhZIGK77bbzz4j9pp12Wt+a0XoSDOUzPLhGIddf7guxsCgFk3VWXHFF/9n222+vD/E0Ima8HTmG6bVcZ99993VzzTWX/4xuJ4KOIWLmOXBvlCFs4403zs4ZW5kWr2ixxRbz28l+FPDs5LhY2YFSMaeGoZgggZsTcwlS0O8dddRR/ZzkKuCWnHrqqbnrh8bwVasQMZ9wwgl6U7ZiaExstNhs400dsQJz0UUXZfcb+yG7m5jluyLcG264wW8rEzNzzOX8RW58o1DQ5dxFBbqIesVMl0D2P+igg/Rm77bLdho8jYiZ53TJJZfUbFtggQX8cZtsskm0dcaFl/gU933bbbf5vykbuPtFlIo55TJS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>

[image2]: <data:image/png;base64,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>