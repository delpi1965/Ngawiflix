// data.js: data demo (dimuat sebelum script.js). Semua judul dan sinopsis fiktif.
const SEED_FILMS = [
  { id: "f-001", title: "Paku Ambalanak", genre: "Horor", durationMin: 118, rating: "15+", synopsis: "Sebuah paku tua ditemukan di rumah warisan keluarga Raka. Setiap malam paku itu berpindah tempat, dan satu per satu penghuni rumah mulai lupa siapa diri mereka.", posterColor: "#1f3a5f", poster: "assets/Paku%20Ambalanak.png" },
  { id: "f-002", title: "Pengabdi Amba 2", genre: "Horor", durationMin: 104, rating: "15+", synopsis: "Tiga tahun setelah tragedi di desa Ambarwangi, Laras kembali ke rumah masa kecilnya untuk menjual tanah. Bisikan dari sumur tua di belakang rumah membuatnya enggan pergi.", posterColor: "#5a1f2b", poster: "assets/Pengabdi%20Amba%202.png" },
  { id: "f-003", title: "Ambacong", genre: ["Horor", "Komedi"], durationMin: 96, rating: "13+", synopsis: "Di sebuah kampung kecil, pocong bernama Ujang tidak bisa beristirahat karena selalu terlepas dari kain kafannya. Ia pun meminta bantuan tukang ojek yang penakut untuk mencari kafan yang hilang.", posterColor: "#1f5a3a", poster: "assets/ambacong.png" },
  { id: "f-004", title: "Pabrik Muwani", genre: "Horor", durationMin: 126, rating: "18+", synopsis: "Pabrik tekstil Muwani tutup mendadak tiga puluh tahun lalu. Ketika sekelompok mahasiswa menyelidiki gudangnya, mesin-mesin tua mulai berputar sendiri.", posterColor: "#5a4a1f", poster: "assets/pabrik%20muwani.png" },
  { id: "f-005", title: "Ambalangkung", genre: "Horor", durationMin: 135, rating: "13+", synopsis: "Boneka kayu yang dibawa dari Bali membuat anak-anak di kompleks Melati menghilang satu per satu. Dina harus memecahkan asal-usul boneka itu sebelum malam ketiga.", posterColor: "#2e1f5a", poster: "assets/ambalangkung.png" },
  { id: "f-006", title: "Imut Adalah Maut", genre: "Drama", durationMin: 92, rating: "SU", synopsis: "Nadia dan Sinta, sahabat sejak SD, membuka usaha kue bersama. Persaingan kecil di antara mereka berubah menjadi rahasia besar yang mengancam persahabatan itu.", posterColor: "#5a2e1f", poster: "assets/imut%20adalah%20maut.png" },
];

const SEED_STUDIOS = [
  { id: "s-1", name: "Studio 1", rows: ["A", "B", "C", "D", "E", "F", "G", "H"], cols: 12, aisleAfter: [4, 8], vipRows: ["E", "F", "G"], coupleRows: ["H"], broken: ["D5"] },
  { id: "s-2", name: "Studio 2 (Premium)", rows: ["A", "B", "C", "D", "E", "F"], cols: 10, aisleAfter: [2, 8], vipRows: ["C", "D", "E", "F"], coupleRows: ["F"], broken: [] },
];

// Tanggal demo dihitung dari hari ini agar jadwal selalu di masa depan.
const relativeDate = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const SEED_SHOWTIMES = [
  { id: "t-001", filmId: "f-001", studioId: "s-1", date: relativeDate(1), time: "13:00" },
  { id: "t-002", filmId: "f-001", studioId: "s-1", date: relativeDate(1), time: "19:30" },
  { id: "t-003", filmId: "f-002", studioId: "s-2", date: relativeDate(1), time: "16:00" },
  { id: "t-004", filmId: "f-003", studioId: "s-1", date: relativeDate(2), time: "10:00" },
  { id: "t-005", filmId: "f-004", studioId: "s-2", date: relativeDate(2), time: "18:00" },
  { id: "t-006", filmId: "f-005", studioId: "s-1", date: relativeDate(2), time: "21:00" },
  { id: "t-007", filmId: "f-006", studioId: "s-2", date: relativeDate(3), time: "15:00" },
];

const PRICES = { regular: 45000, vip: 65000, couple: 90000 }; // couple: per pasangan
const MAX_SEATS_PER_BOOKING = 6;
const MIN_SHOWTIME_GAP_MIN = 150;
