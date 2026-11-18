// script.js: logika aplikasi (urutan fitur: SPEC.md bagian 11).
const K = { films: "cinema.v1.films", showtimes: "cinema.v1.showtimes", bookings: "cinema.v1.bookings", seed: "cinema.v1.seed", deleted: "cinema.v1.deleted", theme: "cinema.v1.theme" };
const VIEWS = ["films", "showtimes", "seats", "checkout", "ticket", "history", "admin"];
const CAT = { regular: "Reguler", vip: "VIP", couple: "Couple" };
const STATUS = { available: "tersedia", selected: "dipilih", sold: "terjual", broken: "tidak tersedia" };
const ARROWS = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
const PAYMENTS = { transfer: "Transfer Bank", ewallet: "E-Wallet", card: "Kartu Kredit/Debit" };
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GENRES = ["Drama", "Thriller", "Petualangan", "Musikal", "Sci-Fi", "Komedi", "Horor", "Aksi"];
const RATINGS = ["SU", "13+", "17+", "21+"];
const POSTERS = ["#1f3a5f", "#5a1f2b", "#1f5a3a", "#5a4a1f", "#2e1f5a", "#5a2e1f"];
const RULES = {
  name: { label: "Nama lengkap", ok: (v) => v.length >= 3, msg: "Nama minimal 3 karakter." },
  phone: { label: "Nomor HP", ok: (v) => /^\+?\d{9,13}$/.test(v), msg: "Nomor HP harus 9-13 digit angka, boleh diawali +." },
  email: { label: "Email", ok: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: "Format email tidak valid." },
};
const state = { filmId: null, date: null, showtimeId: null, seats: [], bookingId: null, draft: { name: "", phone: "", email: "", method: "transfer" } };

// ---------- Helper ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, o = {}, kids = []) => {
  const n = document.createElement(tag);
  if (o.className) n.className = o.className;
  if (o.text !== undefined) n.textContent = o.text;
  Object.entries(o.attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
  Object.assign(n.dataset, o.dataset || {});
  n.append(...kids);
  return n;
};
const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const rupiah = (v) => `Rp ${v.toLocaleString("id-ID")}`;
const dateLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
const isPast = (t) => new Date(`${t.date}T${t.time}:00`) <= new Date();
const genresOf = (f) => [f.genre].flat();
const go = (view) => { location.hash = view; };

function read(key, fb) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fb : JSON.parse(raw);
  } catch (e) {
    console.warn(`Gagal membaca ${key}:`, e);
    return fb;
  }
}

function write(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch (e) {
    console.warn(`Gagal menyimpan ${key}:`, e);
    showToast("Data tidak bisa disimpan. Periksa pengaturan browser.", "error");
    return false;
  }
}

function showToast(msg, type = "success") {
  const t = el("div", { className: `toast toast-${type}`, text: msg, attrs: { role: type === "error" ? "alert" : "status" } });
  $("#toast-region").append(t);
  setTimeout(() => t.remove(), 3000);
}

const seedIfNeeded = () => { if (read(K.seed, null) !== "1") write(K.seed, "1"); };

// ---------- Data (seed dari data.js + tambahan di localStorage; seed yang dihapus dicatat di K.deleted) ----------
const hidden = (k) => read(K.deleted, {})[k] || [];
const getFilms = () => [...SEED_FILMS, ...read(K.films, [])].filter((f) => !hidden("films").includes(f.id));
const getShowtimes = () => [...SEED_SHOWTIMES, ...read(K.showtimes, [])].filter((t) => !hidden("showtimes").includes(t.id));
const getBookings = () => read(K.bookings, []);
const getStudio = (id) => SEED_STUDIOS.find((s) => s.id === id);
const activeFor = (sid) => getBookings().filter((b) => b.status === "active" && b.showtimeId === sid);
const soldSeats = (sid) => activeFor(sid).flatMap((b) => b.seats);
const hasBooking = (sid) => activeFor(sid).length > 0;

// ---------- F1: Film ----------
function fillGenres() {
  const sel = $("#film-genre");
  const genres = [...new Set(getFilms().flatMap(genresOf))].sort();
  const prev = sel.value;
  sel.replaceChildren(el("option", { text: "Semua genre", attrs: { value: "" } }), ...genres.map((g) => el("option", { text: g, attrs: { value: g } })));
  sel.value = prev;
  $("#genre-chips").replaceChildren(...["", ...genres].map((g) => el("button", {
    className: "chip", text: g || "Semua", attrs: { type: "button", "aria-pressed": String(g === prev) }, dataset: { genre: g },
  })));
}

function filmCard(f, has) {
  const poster = el("div", { className: "film-poster" });
  poster.style.setProperty("--poster-color", f.posterColor);
  if (f.poster) poster.style.backgroundImage = `url("${f.poster}")`;
  const btn = el("button", { className: "btn btn-primary", text: has ? "Pilih Jadwal" : "Belum tayang", attrs: { type: "button" }, dataset: { filmId: f.id } });
  btn.disabled = !has;
  return el("article", { className: "film-card" }, [poster, el("div", { className: "film-body" }, [
    el("h2", { text: f.title }),
    el("div", { className: "film-meta" }, [el("span", { text: genresOf(f).join(", ") }), el("span", { text: `${f.durationMin} menit` }), el("span", { text: f.rating })]),
    el("p", { className: "muted", text: f.synopsis }),
    btn,
  ])]);
}

function renderFilms() {
  const q = $("#film-search").value.trim().toLowerCase();
  const g = $("#film-genre").value;
  const sort = $("#film-sort").value;
  const withShow = new Set(getShowtimes().map((t) => t.filmId));
  const films = getFilms()
    .filter((f) => f.title.toLowerCase().includes(q) && (g === "" || genresOf(f).includes(g)))
    .sort((a, b) => (sort === "duration" ? a.durationMin - b.durationMin : a.title.localeCompare(b.title, "id")));
  $$("#genre-chips button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.genre === g)));
  $("#film-count").textContent = `${films.length} film ditemukan`;
  $("#film-list").replaceChildren(...(films.length
    ? films.map((f) => filmCard(f, withShow.has(f.id)))
    : [el("p", { className: "muted", text: "Tidak ada film yang cocok dengan pencarian." })]));
}

// ---------- F2: Jadwal ----------
function slotButton(t) {
  const st = getStudio(t.studioId);
  const past = isPast(t);
  const left = st.rows.length * st.cols - st.broken.length - soldSeats(t.id).length;
  const note = past ? "Sudah lewat" : left === 0 ? "Penuh" : `Sisa ${left} kursi`;
  const b = el("button", { className: "btn showtime-slot", attrs: { type: "button" }, dataset: { showtimeId: t.id } }, [el("strong", { text: t.time }), el("small", { className: "muted", text: note })]);
  b.disabled = past || left === 0;
  return b;
}

function renderShowtimes() {
  const film = getFilms().find((f) => f.id === state.filmId);
  if (!film) return go("films");
  const shows = getShowtimes().filter((t) => t.filmId === film.id);
  const dates = [...new Set(shows.map((t) => t.date))].sort();
  if (!dates.includes(state.date)) {
    const up = shows.find((t) => !isPast(t));
    state.date = up ? up.date : dates[0];
  }
  $("#showtimes-title").textContent = `Jadwal: ${film.title}`;
  const hero = $("#film-hero");
  hero.style.setProperty("--poster", film.poster ? `url("${film.poster}")` : "none");
  hero.replaceChildren(
    el("p", { className: "film-hero-meta", text: `${genresOf(film).join(", ")} • ${film.durationMin} menit • ${film.rating}` }),
    el("p", { text: film.synopsis }),
  );
  $("#date-chips").replaceChildren(...dates.map((d) => el("button", {
    className: "chip", text: dateLabel(d), attrs: { type: "button", "aria-pressed": String(d === state.date) }, dataset: { date: d },
  })));
  const today = shows.filter((t) => t.date === state.date).sort((a, b) => a.time.localeCompare(b.time));
  $("#showtime-list").replaceChildren(...[...new Set(today.map((t) => t.studioId))].map((id) => el("div", { className: "showtime-group" }, [
    el("h2", { text: getStudio(id).name }),
    el("div", { className: "showtime-slots" }, today.filter((t) => t.studioId === id).map(slotButton)),
  ])));
}

// ---------- F3: Denah kursi ----------
const parseSeat = (id) => {
  const row = id.replace(/\d+$/, "");
  return { row, col: Number(id.slice(row.length)) };
};
const cmpSeat = (a, b) => {
  const x = parseSeat(a);
  const y = parseSeat(b);
  return x.row.localeCompare(y.row) || x.col - y.col;
};
const catOf = (st, id) => {
  const { row } = parseSeat(id);
  return st.coupleRows.includes(row) ? "couple" : st.vipRows.includes(row) ? "vip" : "regular";
};
// Pasangan Couple: kolom 1-2, 3-4, 5-6, dst.
const partnerOf = (id) => {
  const { row, col } = parseSeat(id);
  return `${row}${col % 2 === 1 ? col + 1 : col - 1}`;
};
const groupOf = (st, id) => (catOf(st, id) === "couple" ? [id, partnerOf(id)] : [id]);
const statusOf = (st, id, sold) => {
  const ids = groupOf(st, id);
  if (ids.some((x) => st.broken.includes(x))) return "broken";
  if (ids.some((x) => sold.has(x))) return "sold";
  return state.seats.includes(id) ? "selected" : "available";
};

function ctxSeat() {
  const showtime = getShowtimes().find((t) => t.id === state.showtimeId);
  if (!showtime) return null;
  return { showtime, studio: getStudio(showtime.studioId), film: getFilms().find((f) => f.id === showtime.filmId) };
}

function selection(st) {
  const groups = { regular: [], vip: [], couple: [] };
  [...state.seats].sort(cmpSeat).forEach((id) => groups[catOf(st, id)].push(id));
  const prices = {
    regular: groups.regular.length * PRICES.regular,
    vip: groups.vip.length * PRICES.vip,
    couple: (groups.couple.length / 2) * PRICES.couple,
  };
  return { groups, prices, total: prices.regular + prices.vip + prices.couple };
}

const selectionItems = ({ groups, prices }) => Object.keys(groups)
  .filter((c) => groups[c].length)
  .map((c) => el("li", { text: `${CAT[c]}: ${groups[c].join(", ")} (${rupiah(prices[c])})` }));

function seatButton(st, row, col) {
  const id = `${row}${col}`;
  const cat = catOf(st, id);
  const b = el("button", { className: `seat is-${cat}`, attrs: { type: "button", tabindex: "-1" }, dataset: { seatId: id, rowIndex: String(st.rows.indexOf(row)), col: String(col) } });
  if (cat === "couple") b.classList.add(col % 2 === 1 ? "pair-start" : "pair-end");
  return b;
}

function updateSeat(b, st, sold) {
  const id = b.dataset.seatId;
  const status = statusOf(st, id, sold);
  const cat = catOf(st, id);
  b.classList.toggle("is-selected", status === "selected");
  b.classList.toggle("is-sold", status === "sold");
  b.classList.toggle("is-broken", status === "broken");
  b.textContent = status === "selected" ? "✓" : b.dataset.col;
  b.setAttribute("aria-label", `Kursi ${id}, ${CAT[cat]}${cat === "couple" ? ` (pasangan ${partnerOf(id)})` : ""}, ${STATUS[status]}`);
  b.setAttribute("aria-pressed", String(status === "selected"));
  if (status === "sold" || status === "broken") b.setAttribute("aria-disabled", "true");
  else b.removeAttribute("aria-disabled");
}

function renderSummary({ studio, film, showtime }) {
  const sel = selection(studio);
  $("#summary-info").textContent = `${film.title} | ${studio.name} | ${dateLabel(showtime.date)}, ${showtime.time}`;
  const items = selectionItems(sel);
  $("#summary-seats").replaceChildren(...(items.length ? items : [el("li", { className: "muted", text: "Belum ada kursi dipilih" })]));
  const total = $("#summary-total");
  total.textContent = rupiah(sel.total);
  total.classList.remove("bump");
  void total.offsetWidth; // restart animasi
  total.classList.add("bump");
  $("#seat-next").disabled = !state.seats.length;
}

function refreshSeatMap() {
  const c = ctxSeat();
  if (!c) return;
  const sold = new Set(soldSeats(c.showtime.id));
  $$("button.seat", $("#seat-map")).forEach((b) => updateSeat(b, c.studio, sold));
  renderSummary(c);
}

function renderSeatMap() {
  const c = ctxSeat();
  if (!c) return go(state.filmId ? "showtimes" : "films");
  if (isPast(c.showtime)) {
    showToast("Jadwal ini sudah lewat.", "error");
    return go("showtimes");
  }
  const st = c.studio;
  const cells = (make) => {
    const out = [];
    for (let col = 1; col <= st.cols; col += 1) {
      out.push(make(col));
      if (st.aisleAfter.includes(col) && col < st.cols) out.push(el("span", { className: "seat-gap", attrs: { "aria-hidden": "true" } }));
    }
    return out;
  };
  const header = el("div", { className: "seat-row", attrs: { "aria-hidden": "true" } }, [
    el("span", { className: "row-label" }),
    ...cells((col) => el("span", { className: "col-label", text: String(col) })),
  ]);
  const rows = st.rows.map((row) => el("div", { className: "seat-row", attrs: { role: "group", "aria-label": `Baris ${row}` } }, [
    el("span", { className: "row-label", text: row, attrs: { "aria-hidden": "true" } }),
    ...cells((col) => seatButton(st, row, col)),
  ]));
  const map = $("#seat-map");
  map.replaceChildren(header, ...rows);
  $("button.seat", map).tabIndex = 0;
  refreshSeatMap();
}

function toggleSeat(id) {
  const c = ctxSeat();
  if (!c) return;
  const st = c.studio;
  const status = statusOf(st, id, new Set(soldSeats(c.showtime.id)));
  if (status === "sold" || status === "broken") return;
  const ids = groupOf(st, id);
  if (status === "selected") state.seats = state.seats.filter((x) => !ids.includes(x));
  else if (state.seats.length + ids.length > MAX_SEATS_PER_BOOKING) return showToast(`Maksimal ${MAX_SEATS_PER_BOOKING} kursi per transaksi.`, "error");
  else state.seats.push(...ids);
  refreshSeatMap();
}

function onSeatKey(e) {
  const step = ARROWS[e.key];
  const cur = e.target.closest("button.seat");
  if (!step || !cur) return;
  e.preventDefault();
  $(`button.seat[data-row-index="${+cur.dataset.rowIndex + step[0]}"][data-col="${+cur.dataset.col + step[1]}"]`, $("#seat-map"))?.focus();
}

// ---------- F4: Checkout ----------
function validate(id) {
  const input = $(`#field-${id}`);
  const v = input.value.trim();
  const r = RULES[id];
  const msg = v === "" ? `${r.label} wajib diisi.` : r.ok(v) ? "" : r.msg;
  $(`#error-${id}`).textContent = msg;
  input.setAttribute("aria-invalid", String(msg !== ""));
  return msg === "";
}

function field(id, type, ac, mode) {
  const attrs = { id: `field-${id}`, name: id, type, autocomplete: ac, "aria-describedby": `error-${id}` };
  if (mode) attrs.inputmode = mode;
  const input = el("input", { attrs });
  input.value = state.draft[id];
  return el("div", { className: "field" }, [
    el("label", { text: RULES[id].label, attrs: { for: `field-${id}` } }),
    input,
    el("span", { className: "field-error", attrs: { id: `error-${id}` } }),
  ]);
}

const payOptions = () => el("fieldset", { className: "field-group" }, [
  el("legend", { text: "Metode pembayaran" }),
  ...Object.entries(PAYMENTS).map(([value, label]) => {
    const radio = el("input", { attrs: { type: "radio", name: "method", value } });
    radio.checked = state.draft.method === value;
    return el("label", { className: "pay-option" }, [radio, el("span", { text: label })]);
  }),
]);

function renderCheckout() {
  const c = ctxSeat();
  if (!c) return go(state.filmId ? "showtimes" : "films");
  if (!state.seats.length) return go("seats");
  const { studio: st, film, showtime } = c;
  const sel = selection(st);
  $("#checkout-summary").replaceChildren(
    el("h2", { text: film.title }),
    el("p", { className: "muted", text: `${st.name} | ${dateLabel(showtime.date)}, ${showtime.time}` }),
    el("ul", {}, selectionItems(sel)),
    el("p", {}, [document.createTextNode("Total: "), el("strong", { text: rupiah(sel.total) })]),
  );
  $("#checkout-form").replaceChildren(
    field("name", "text", "name"),
    field("phone", "tel", "tel", "tel"),
    field("email", "email", "email", "email"),
    payOptions(),
    el("button", { className: "btn btn-primary", text: "Bayar", attrs: { type: "submit", id: "pay-button" } }),
  );
}

function setPaying(on) {
  const b = $("#pay-button");
  b.disabled = on;
  b.textContent = on ? "Memproses pembayaran..." : "Bayar";
}

function newCode(bookings) {
  const used = new Set(bookings.map((b) => b.code));
  let code;
  do {
    code = `TIX-${Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("")}`;
  } while (used.has(code));
  return code;
}

function finalizeBooking(customer, method) {
  const c = ctxSeat();
  if (!c || !state.seats.length) return go("films");
  const { showtime, studio: st } = c;
  if (isPast(showtime)) {
    showToast("Jadwal ini sudah lewat.", "error");
    return go("showtimes");
  }
  const sold = new Set(soldSeats(showtime.id));
  const taken = state.seats.filter((id) => sold.has(id));
  if (taken.length) {
    state.seats = state.seats.filter((id) => !taken.includes(id));
    showToast(`Kursi ${taken.join(", ")} baru saja terjual. Pilih kursi lain.`, "error");
    return go("seats");
  }
  const bookings = getBookings();
  const seats = [...state.seats].sort(cmpSeat);
  const booking = {
    id: `b-${Date.now()}`, code: newCode(bookings), showtimeId: showtime.id, seats,
    categories: Object.fromEntries(seats.map((id) => [id, catOf(st, id)])),
    total: selection(st).total, paymentMethod: method, customer, status: "active", createdAt: new Date().toISOString(),
  };
  if (!write(K.bookings, [...bookings, booking])) return setPaying(false);
  state.bookingId = booking.id;
  state.seats = [];
  state.draft = { name: "", phone: "", email: "", method: "transfer" };
  showToast(`Pembayaran berhasil. Kode tiket: ${booking.code}`);
  go("ticket");
}

function onCheckoutSubmit(e) {
  e.preventDefault();
  const bad = Object.keys(RULES).filter((id) => !validate(id));
  if (bad.length) return $(`#field-${bad[0]}`).focus();
  const customer = Object.fromEntries(["name", "phone", "email"].map((k) => [k, $(`#field-${k}`).value.trim()]));
  const method = $("input[name='method']:checked", $("#checkout-form")).value;
  setPaying(true);
  setTimeout(() => finalizeBooking(customer, method), 1000);
}

// ---------- F5: Tiket ----------
function renderTicket() {
  const b = getBookings().find((x) => x.id === state.bookingId);
  if (!b) return go("history");
  const showtime = getShowtimes().find((t) => t.id === b.showtimeId);
  const film = showtime && getFilms().find((f) => f.id === showtime.filmId);
  const studio = showtime && getStudio(showtime.studioId);
  const cancelled = b.status === "cancelled";
  const rows = [
    ["Kode tiket", b.code],
    ["Studio", studio ? studio.name : "-"],
    ["Tanggal", showtime ? `${dateLabel(showtime.date)}, ${showtime.time}` : "-"],
    ["Kursi", b.seats.join(", ")],
    ["Nama", b.customer.name],
    ["Pembayaran", PAYMENTS[b.paymentMethod] || b.paymentMethod],
    ["Total", rupiah(b.total)],
  ];
  $("#ticket").replaceChildren(
    el("h2", { className: "ticket-title", text: film ? film.title : "Film tidak ditemukan" }),
    el("span", { className: cancelled ? "status-badge is-cancelled" : "status-badge", text: cancelled ? "DIBATALKAN" : "AKTIF" }),
    el("dl", { className: "ticket-details" }, rows.flatMap(([l, v]) => [el("dt", { text: l }), el("dd", { text: v })])),
    el("p", { className: "ticket-note muted", text: "Tunjukkan kode tiket saat masuk studio." }),
  );
  $("#ticket-print").disabled = cancelled;
}

// ---------- F6: Riwayat ----------
function historyItem(b) {
  const showtime = getShowtimes().find((t) => t.id === b.showtimeId);
  const film = showtime && getFilms().find((f) => f.id === showtime.filmId);
  const active = b.status === "active";
  const seatText = `Kursi ${b.seats.join(", ")}`;
  const act = (text, action, cls = "btn") => el("button", { className: cls, text, attrs: { type: "button" }, dataset: { action, bookingId: b.id } });
  const actions = [act("Lihat Tiket", "view")];
  if (active && showtime && !isPast(showtime)) actions.push(act("Batalkan", "cancel", "btn btn-danger"));
  if (!active) actions.push(act("Hapus", "delete", "btn btn-danger"));
  return el("article", { className: "history-item" }, [
    el("div", { className: "history-head" }, [
      el("strong", { text: b.code }),
      el("span", { className: active ? "status-badge" : "status-badge is-cancelled", text: active ? "AKTIF" : "DIBATALKAN" }),
    ]),
    el("p", { text: film ? film.title : "Film tidak ditemukan" }),
    el("p", { className: "muted", text: showtime ? `${dateLabel(showtime.date)}, ${showtime.time} | ${seatText}` : seatText }),
    el("p", { className: "muted", text: `${b.customer.name} | ${rupiah(b.total)}` }),
    el("div", { className: "history-actions" }, actions),
  ]);
}

function renderHistory() {
  const q = $("#history-search").value.trim().toLowerCase();
  const status = $("#history-status").value;
  const list = getBookings()
    .filter((b) => status === "all" || b.status === status)
    .filter((b) => b.code.toLowerCase().includes(q) || b.customer.name.toLowerCase().includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $("#history-list").replaceChildren(...(list.length ? list.map(historyItem) : [el("p", { className: "muted", text: "Belum ada pesanan yang cocok." })]));
}

// Dialog <dialog> sebagai pengganti alert() dan confirm().
function ask(message, label) {
  const dialog = $("#confirm-dialog");
  if (dialog.open) return Promise.resolve(false);
  $("#confirm-message").textContent = message;
  $("#confirm-ok").textContent = label;
  dialog.returnValue = "";
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "ok"), { once: true });
    dialog.showModal();
  });
}

async function cancelBooking(id) {
  const b = getBookings().find((x) => x.id === id);
  if (!b || b.status !== "active") return;
  const showtime = getShowtimes().find((t) => t.id === b.showtimeId);
  const blocked = () => {
    showToast("Pesanan tidak bisa dibatalkan karena jadwal sudah dimulai.", "error");
    renderHistory();
  };
  if (!showtime || isPast(showtime)) return blocked();
  if (!(await ask(`Batalkan pesanan ${b.code}? Kursi akan dilepas.`, "Ya, batalkan"))) return;
  if (isPast(showtime)) return blocked(); // jadwal bisa mulai selama dialog terbuka
  if (write(K.bookings, getBookings().map((x) => (x.id === id ? { ...x, status: "cancelled" } : x)))) {
    showToast(`Pesanan ${b.code} dibatalkan.`);
    renderHistory();
  }
}

async function deleteBooking(id) {
  const b = getBookings().find((x) => x.id === id);
  if (!b || b.status !== "cancelled") return;
  if (!(await ask(`Hapus tiket ${b.code} dari riwayat? Tindakan ini tidak bisa dibatalkan.`, "Ya, hapus"))) return;
  if (write(K.bookings, getBookings().filter((x) => x.id !== id))) {
    if (state.bookingId === id) state.bookingId = null;
    showToast(`Tiket ${b.code} dihapus.`);
    renderHistory();
  }
}

// ---------- F7: Admin ----------
const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const hasConflict = (sid, date, time) => getShowtimes().some((t) => t.studioId === sid && t.date === date && Math.abs(toMin(t.time) - toMin(time)) < MIN_SHOWTIME_GAP_MIN);
const opts = (pairs, placeholder) => [el("option", { text: placeholder, attrs: { value: "" } }), ...pairs.map(([v, l]) => el("option", { text: l, attrs: { value: v } }))];
const card = (title, ...kids) => el("section", { className: "admin-card" }, [el("h2", { text: title }), ...kids]);
const submitBtn = (text) => el("button", { className: "btn btn-primary", text, attrs: { type: "submit" } });
const delBtn = (action, id) => el("button", { className: "btn btn-danger", text: "Hapus", attrs: { type: "button" }, dataset: { action, id } });

function adminField(name, label, control) {
  control.name = name;
  control.id = `admin-${name}`;
  control.setAttribute("aria-describedby", `admin-error-${name}`);
  return el("div", { className: "field" }, [
    el("label", { text: label, attrs: { for: control.id } }),
    control,
    el("span", { className: "field-error", attrs: { id: `admin-error-${name}` } }),
  ]);
}

function table(headers, rows) {
  if (!rows.length) return el("p", { className: "muted", text: "Belum ada data." });
  return el("div", { className: "table-wrap" }, [el("table", { className: "admin-table" }, [
    el("thead", {}, [el("tr", {}, headers.map((text) => el("th", { text, attrs: { scope: "col" } })))]),
    el("tbody", {}, rows),
  ])]);
}

function renderAdmin() {
  const films = getFilms();
  const shows = getShowtimes();
  const bookings = getBookings();
  const select = $("[name='filmId']", $("#admin-showtime-form"));
  const prev = select.value;
  select.replaceChildren(...opts(films.map((f) => [f.id, f.title]), "Pilih film"));
  select.value = prev;

  $("#admin-film-table").replaceChildren(table(["Film", "Jadwal", "Booking aktif", "Pendapatan", "Aksi"], films.map((f) => {
    const ids = shows.filter((t) => t.filmId === f.id).map((t) => t.id);
    const active = bookings.filter((b) => b.status === "active" && ids.includes(b.showtimeId));
    return el("tr", {}, [
      el("td", { text: f.title }),
      el("td", { text: String(ids.length) }),
      el("td", { text: String(active.length) }),
      el("td", { text: rupiah(active.reduce((s, b) => s + b.total, 0)) }),
      el("td", {}, [delBtn("delete-film", f.id)]),
    ]);
  })));

  $("#admin-showtime-table").replaceChildren(table(["Film", "Studio", "Tayang", "Status", "Aksi"], [...shows]
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map((t) => {
      const film = films.find((f) => f.id === t.filmId);
      const studio = getStudio(t.studioId);
      return el("tr", {}, [
        el("td", { text: film ? film.title : "-" }),
        el("td", { text: studio ? studio.name : "-" }),
        el("td", { text: `${dateLabel(t.date)}, ${t.time}` }),
        el("td", { text: isPast(t) ? "Sudah lewat" : "Akan tayang" }),
        el("td", {}, [delBtn("delete-showtime", t.id)]),
      ]);
    })));
}

const readValues = (form) => Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));

function showErrors(form, errors) {
  $$("[name]", form).forEach((c) => {
    const msg = errors[c.name] || "";
    $(`#admin-error-${c.name}`, form).textContent = msg;
    c.setAttribute("aria-invalid", String(msg !== ""));
  });
  const first = Object.keys(errors)[0];
  if (first) $(`[name="${first}"]`, form).focus();
}

function validateFilm(v) {
  const e = {};
  if (v.title.length < 3) e.title = "Judul minimal 3 karakter.";
  else if (getFilms().some((f) => f.title.toLowerCase() === v.title.toLowerCase())) e.title = "Judul ini sudah ada.";
  if (!GENRES.includes(v.genre)) e.genre = "Pilih genre.";
  const d = Number(v.durationMin);
  if (!Number.isInteger(d) || d < 30 || d > 300) e.durationMin = "Durasi harus bilangan bulat 30-300 menit.";
  if (!RATINGS.includes(v.rating)) e.rating = "Pilih rating usia.";
  if (v.synopsis.length < 10) e.synopsis = "Sinopsis minimal 10 karakter.";
  else if (v.synopsis.length > 300) e.synopsis = "Sinopsis maksimal 300 karakter.";
  return e;
}

function validateShowtime(v) {
  const e = {};
  if (!getFilms().some((f) => f.id === v.filmId)) e.filmId = "Pilih film.";
  if (!getStudio(v.studioId)) e.studioId = "Pilih studio.";
  if (!v.date) e.date = "Pilih tanggal.";
  if (!v.time) e.time = "Pilih jam mulai.";
  if (Object.keys(e).length) return e;
  if (isPast({ date: v.date, time: v.time })) e.time = "Jadwal tidak boleh di masa lalu.";
  else if (hasConflict(v.studioId, v.date, v.time)) e.time = `Bentrok dengan jadwal lain. Jarak minimal ${MIN_SHOWTIME_GAP_MIN} menit di studio yang sama.`;
  return e;
}

function onFilmSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const v = readValues(form);
  const errors = validateFilm(v);
  showErrors(form, errors);
  if (Object.keys(errors).length) return;
  const films = read(K.films, []);
  const film = {
    id: `f-${Date.now()}`, title: v.title, genre: v.genre, durationMin: Number(v.durationMin),
    rating: v.rating, synopsis: v.synopsis, posterColor: POSTERS[films.length % POSTERS.length],
  };
  if (!write(K.films, [...films, film])) return;
  form.reset();
  showErrors(form, {});
  showToast(`Film "${film.title}" ditambahkan.`);
  renderAdmin();
}

function onShowtimeSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const v = readValues(form);
  const errors = validateShowtime(v);
  showErrors(form, errors);
  if (Object.keys(errors).length) return;
  const stored = read(K.showtimes, []);
  if (!write(K.showtimes, [...stored, { id: `t-${Date.now()}`, filmId: v.filmId, studioId: v.studioId, date: v.date, time: v.time }])) return;
  form.reset();
  showErrors(form, {});
  showToast("Jadwal ditambahkan.");
  renderAdmin();
}

// Menghapus item tambahan dan mencatat id-nya di daftar hidden (berlaku juga untuk seed).
function removeEntries(key, ids) {
  const deleted = { films: [], showtimes: [], ...read(K.deleted, {}) };
  deleted[key] = [...new Set([...deleted[key], ...ids])];
  const remaining = read(K[key], []).filter((x) => !ids.includes(x.id));
  return write(K[key], remaining) && write(K.deleted, deleted);
}

async function deleteFilm(id) {
  const film = getFilms().find((f) => f.id === id);
  if (!film) return;
  const showIds = getShowtimes().filter((t) => t.filmId === id).map((t) => t.id);
  if (showIds.some(hasBooking)) return showToast(`"${film.title}" punya booking aktif, tidak bisa dihapus.`, "error");
  if (!(await ask(`Hapus film "${film.title}" beserta ${showIds.length} jadwalnya?`, "Ya, hapus"))) return;
  if (removeEntries("showtimes", showIds) && removeEntries("films", [id])) {
    showToast(`Film "${film.title}" dihapus.`);
    renderAdmin();
  }
}

async function deleteShowtime(id) {
  if (!getShowtimes().some((t) => t.id === id)) return;
  if (hasBooking(id)) return showToast("Jadwal ini punya booking aktif, tidak bisa dihapus.", "error");
  if (!(await ask("Hapus jadwal ini?", "Ya, hapus"))) return;
  if (removeEntries("showtimes", [id])) {
    showToast("Jadwal dihapus.");
    renderAdmin();
  }
}

async function resetDemo() {
  if (!(await ask("Hapus semua data tambahan dan booking, lalu muat ulang data demo?", "Ya, reset"))) return;
  [K.films, K.showtimes, K.bookings, K.deleted, K.seed].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Gagal menghapus ${key}:`, e);
    }
  });
  seedIfNeeded();
  Object.assign(state, { filmId: null, date: null, showtimeId: null, seats: [], bookingId: null });
  showToast("Data demo dimuat ulang.");
  renderAdmin();
}

function initAdmin() {
  $("#admin-content").replaceChildren(
    card("Tambah Film", el("form", { className: "admin-form", attrs: { id: "admin-film-form", novalidate: "" } }, [
      adminField("title", "Judul film", el("input", { attrs: { type: "text", maxlength: "80" } })),
      adminField("genre", "Genre", el("select", {}, opts(GENRES.map((g) => [g, g]), "Pilih genre"))),
      adminField("durationMin", "Durasi (menit)", el("input", { attrs: { type: "number", min: "30", max: "300", step: "1", inputmode: "numeric" } })),
      adminField("rating", "Rating usia", el("select", {}, opts(RATINGS.map((r) => [r, r]), "Pilih rating"))),
      adminField("synopsis", "Sinopsis (10-300 karakter)", el("textarea", { attrs: { rows: "4", maxlength: "300" } })),
      submitBtn("Simpan Film"),
    ])),
    card("Tambah Jadwal", el("form", { className: "admin-form", attrs: { id: "admin-showtime-form", novalidate: "" } }, [
      adminField("filmId", "Film", el("select")),
      adminField("studioId", "Studio", el("select", {}, opts(SEED_STUDIOS.map((s) => [s.id, s.name]), "Pilih studio"))),
      adminField("date", "Tanggal", el("input", { attrs: { type: "date", min: isoDate() } })),
      adminField("time", "Jam mulai", el("input", { attrs: { type: "time" } })),
      submitBtn("Simpan Jadwal"),
    ])),
    card("Statistik Film", el("div", { attrs: { id: "admin-film-table" } })),
    card("Daftar Jadwal", el("div", { attrs: { id: "admin-showtime-table" } })),
    card("Data Demo",
      el("p", { className: "muted", text: "Menghapus semua data tambahan dan booking, lalu memuat ulang data seed." }),
      el("button", { className: "btn btn-danger", text: "Reset data demo", attrs: { type: "button" }, dataset: { action: "reset-demo" } })),
  );
}

// ---------- Tema terang/gelap ----------
const systemLight = window.matchMedia("(prefers-color-scheme: light)");
const effectiveTheme = () => document.documentElement.dataset.theme || (systemLight.matches ? "light" : "dark");
const updateThemeToggle = () => $("#theme-toggle").setAttribute("aria-checked", String(effectiveTheme() === "light"));

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(K.theme);
  } catch (e) {
    saved = null;
  }
  if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  updateThemeToggle();
  $("#theme-toggle").addEventListener("click", () => {
    const next = effectiveTheme() === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(K.theme, next);
    } catch (e) {
      console.warn("Gagal menyimpan tema:", e);
    }
    updateThemeToggle();
  });
  systemLight.addEventListener("change", updateThemeToggle); // ikut sistem jika belum ada pilihan manual
}

// ---------- Navigasi view ----------
const RENDER = { films: () => { fillGenres(); renderFilms(); }, showtimes: renderShowtimes, seats: renderSeatMap, checkout: renderCheckout, ticket: renderTicket, history: renderHistory, admin: renderAdmin };

function showView() {
  const hash = location.hash.replace("#", "") || "films";
  const target = VIEWS.includes(hash) ? hash : "films";
  VIEWS.forEach((id) => { $(`#view-${id}`).hidden = id !== target; });
  $$(".site-nav a").forEach((a) => (a.getAttribute("href") === `#${target}` ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  $(`#view-${target} .view-title`).focus();
  document.body.dataset.view = target;
  const idx = VIEWS.indexOf(target);
  $$(".steps li").forEach((li) => {
    const i = VIEWS.indexOf(li.dataset.v);
    li.classList.toggle("done", i < idx);
    li.classList.toggle("on", i === idx);
  });
  RENDER[target]();
}

// ---------- Inisialisasi ----------
const on = (sel, ev, fn) => $(sel).addEventListener(ev, fn);
const onDelegate = (sel, selector, fn) => on(sel, "click", (e) => {
  const t = e.target.closest(selector);
  if (t) fn(t);
});

function init() {
  seedIfNeeded();
  initAdmin();
  initTheme();

  ["#film-search", "#film-genre", "#film-sort"].forEach((sel) => on(sel, "input", renderFilms));
  onDelegate("#genre-chips", "button[data-genre]", (b) => {
    $("#film-genre").value = b.dataset.genre;
    renderFilms();
  });
  onDelegate("#film-list", "button[data-film-id]", (b) => {
    if (b.disabled) return;
    state.filmId = b.dataset.filmId;
    go("showtimes");
  });

  onDelegate("#date-chips", "button[data-date]", (b) => {
    state.date = b.dataset.date;
    renderShowtimes();
  });
  onDelegate("#showtime-list", "button[data-showtime-id]", (b) => {
    if (b.disabled) return;
    if (state.showtimeId !== b.dataset.showtimeId) state.seats = [];
    state.showtimeId = b.dataset.showtimeId;
    go("seats");
  });

  const map = $("#seat-map");
  onDelegate("#seat-map", "button.seat", (b) => toggleSeat(b.dataset.seatId));
  map.addEventListener("keydown", onSeatKey);
  // Roving tabindex: hanya satu kursi yang bisa difokus dengan Tab.
  map.addEventListener("focusin", (e) => {
    const b = e.target.closest("button.seat");
    if (!b) return;
    $$("button.seat[tabindex='0']", map).forEach((x) => { x.tabIndex = -1; });
    b.tabIndex = 0;
  });
  on("#seat-next", "click", () => { if (state.seats.length) go("checkout"); });

  const form = $("#checkout-form");
  form.addEventListener("submit", onCheckoutSubmit);
  form.addEventListener("focusout", (e) => { if (RULES[e.target.name]) validate(e.target.name); });
  form.addEventListener("input", (e) => {
    const { name, value } = e.target;
    if (!(name in state.draft)) return;
    state.draft[name] = value;
    if (RULES[name] && e.target.getAttribute("aria-invalid") === "true") validate(name);
  });

  ["#history-search", "#history-status"].forEach((sel) => on(sel, "input", renderHistory));
  onDelegate("#history-list", "button[data-action]", (b) => {
    const { action, bookingId } = b.dataset;
    if (action === "view") {
      state.bookingId = bookingId;
      go("ticket");
    } else if (action === "cancel") cancelBooking(bookingId);
    else deleteBooking(bookingId);
  });

  $("#admin-content").addEventListener("submit", (e) => {
    if (e.target.id === "admin-film-form") onFilmSubmit(e);
    if (e.target.id === "admin-showtime-form") onShowtimeSubmit(e);
  });
  onDelegate("#admin-content", "button[data-action]", (b) => {
    const { action, id } = b.dataset;
    if (action === "delete-film") deleteFilm(id);
    if (action === "delete-showtime") deleteShowtime(id);
    if (action === "reset-demo") resetDemo();
  });

  $$("[data-nav]").forEach((b) => b.addEventListener("click", () => go(b.dataset.nav)));
  on("#ticket-print", "click", () => window.print());
  $$(".view-title").forEach((h) => { h.tabIndex = -1; });

  window.addEventListener("hashchange", showView);
  showView();
}

document.addEventListener("DOMContentLoaded", init);
