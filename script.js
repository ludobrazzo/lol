// Importa Firebase: serve per collegare il sito al progetto online.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configurazione Firebase: identifica il progetto usato per login e database.
const firebaseConfig = {
  apiKey: "AIzaSyDl9CCciK9P1od4ITzpskYsP5Sa5N7ukOE",
  authDomain: "wikischool-vero.firebaseapp.com",
  projectId: "wikischool-vero",
  storageBucket: "wikischool-vero.firebasestorage.app",
  messagingSenderId: "373765015160",
  appId: "1:373765015160:web:a709c39d0a3529cc04cf8d",
};

// Avvia Firebase e prepara autenticazione, database e login Google.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Dati Cloudinary: servono per caricare file e immagini esterne.
const CLOUD_NAME = "dkzbg6vyo";
const UPLOAD_PRESET = "unsigned_preset_123";

// Tiene in memoria l’utente attualmente collegato; null significa non loggato.
let currentUser = null;

// Collega le parti HTML ai comandi JavaScript.
const authBtn = document.getElementById("auth-btn");
const profileBtn = document.getElementById("profile-btn");
const modal = document.getElementById("auth-modal");
const profileModal = document.getElementById("profile-modal");
const deleteModal = document.getElementById("delete-modal");
const cancelDeleteBtn = document.getElementById("cancel-delete");
const confirmDeleteBtn = document.getElementById("confirm-delete");
let pendingDeleteId = null;

const warningMsg = document.getElementById("login-warning"); 
const formContainer = document.getElementById("upload-form-container"); 
const notificationWrapper = document.getElementById("notification-wrapper");
const notificationBtn = document.getElementById("notification-btn");
const notificationBadge = document.getElementById("notification-badge");
const notificationPanel = document.getElementById("notification-panel");
const notificationList = document.getElementById("notification-list");
const clearNotificationsBtn = document.getElementById("clear-notifications");
let unsubscribeNotifications = null;
let currentNotifications = [];
let readNotificationIds = new Set();

// --- GESTIONE ACCESSO E VISIBILITÀ ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    if (authBtn) {
      authBtn.innerText = "Ciao, " + (user.displayName || "Studente");
      authBtn.style.background = "#10b981"; 
    }
    if (profileBtn) profileBtn.style.display = "block";
    if (notificationWrapper) notificationWrapper.style.display = "block";
    startNotifications(user);
    
    if (warningMsg) warningMsg.style.display = "none";
    if (formContainer) formContainer.style.display = "block";
  } else {
    currentUser = null;
    if (authBtn) {
      authBtn.innerText = "Login";
      authBtn.style.background = "var(--primary)";
    }
    if (profileBtn) profileBtn.style.display = "none";
    if (notificationWrapper) notificationWrapper.style.display = "none";
    if (notificationPanel) notificationPanel.classList.remove("open");
    stopNotifications();
    
    if (warningMsg) warningMsg.style.display = "block";
    if (formContainer) formContainer.style.display = "none";
  }
});


// --- CAMPANELLA NOTIFICHE ---
// Crea il nome della chiave usata nel browser per ricordare le notifiche lette.
function getReadNotificationsKey(uid) {
  return `wikischool_read_notifications_${uid}`;
}

// Carica dal browser l’elenco delle notifiche già viste dall’utente.
function loadReadNotificationIds(uid) {
  try {
    readNotificationIds = new Set(JSON.parse(localStorage.getItem(getReadNotificationsKey(uid)) || "[]"));
  } catch (e) {
    readNotificationIds = new Set();
  }
}

// Salva nel browser quali notifiche sono state lette.
function saveReadNotificationIds(uid) {
  localStorage.setItem(getReadNotificationsKey(uid), JSON.stringify([...readNotificationIds]));
}

// Avvia l’ascolto in tempo reale dei like e dei commenti ricevuti sui propri appunti.
function startNotifications(user) {
  stopNotifications();
  loadReadNotificationIds(user.uid);

  const q = query(collection(db, "projects"), where("authorUid", "==", user.uid));
  unsubscribeNotifications = onSnapshot(q, (snap) => {
    const notifications = [];

    snap.forEach((docSnap) => {
      const project = docSnap.data();
      const title = project.title || "un tuo appunto";

      const likeDetails = Array.isArray(project.likeDetails) ? project.likeDetails : [];
      const likeDetailByUid = new Map(likeDetails.map((like) => [like.uid, like]));

      (project.likes || []).forEach((uid) => {
        if (uid === user.uid) return;
        const likeInfo = likeDetailByUid.get(uid) || {};
        const authorName = likeInfo.authorName || "Qualcuno";
        const likeDate = likeInfo.timestamp || project.createdAt || "";
        notifications.push({
          id: `like_${docSnap.id}_${uid}_${normalizeNotificationDate(likeDate) || "old"}`,
          type: "like",
          text: `${authorName} ha messo like a “${title}”.`,
          date: likeDate
        });
      });

      (project.comments || []).forEach((comment, index) => {
        if (comment.authorUid === user.uid) return;
        notifications.push({
          id: `comment_${docSnap.id}_${comment.authorUid || "anon"}_${normalizeNotificationDate(comment.timestamp) || index}`,
          type: "comment",
          text: `${comment.authorName || "Qualcuno"} ha commentato “${title}": ${comment.text || ""}`,
          date: comment.timestamp || project.createdAt || ""
        });
      });
      });
    });

    currentNotifications = notifications.sort((a, b) => normalizeNotificationDate(b.date) - normalizeNotificationDate(a.date));
    renderNotifications(user.uid);
  }, (err) => {
    console.error("Errore notifiche:", err);
  });
}

// Ferma l’ascolto delle notifiche quando l’utente esce o cambia pagina.
function stopNotifications() {
  if (unsubscribeNotifications) {
    unsubscribeNotifications();
    unsubscribeNotifications = null;
  }
  currentNotifications = [];
  readNotificationIds = new Set();
  renderNotifications();
}

// Disegna il pannello notifiche e aggiorna il numerino rosso della campanella.
function renderNotifications(uid = currentUser?.uid) {
  if (!notificationList || !notificationBadge) return;

  const unreadCount = currentNotifications.filter((n) => !readNotificationIds.has(n.id)).length;
  notificationBadge.innerText = unreadCount > 99 ? "99+" : String(unreadCount);
  notificationBadge.style.display = unreadCount > 0 ? "flex" : "none";

  if (currentNotifications.length === 0) {
    notificationList.innerHTML = `<p class="empty-notifications">Nessuna notifica.</p>`;
    return;
  }

  notificationList.innerHTML = currentNotifications.map((n) => {
    const isUnread = !readNotificationIds.has(n.id);
    const icon = n.type === "like" ? "♥" : "💬";
    const safeText = escapeHtml(n.text);
    const dateText = formatNotificationDate(n.date);
    return `
      <div class="notification-item ${isUnread ? "unread" : ""}">
        <span class="notification-icon">${icon}</span>
        <div>
          <p>${safeText}</p>
          ${dateText ? `<small>${dateText}</small>` : ""}
        </div>
      </div>
    `;
  }).join("");

  if (uid) saveReadNotificationIds(uid);
}

// Converte una data tecnica in una data leggibile.
function normalizeNotificationDate(value) {
  if (!value) return 0;
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatNotificationDate(value) {
  const time = normalizeNotificationDate(value);
  if (!time) return "";
  const date = new Date(time);
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Protegge il testo inserito dagli utenti evitando che venga interpretato come codice HTML.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (notificationBtn && notificationPanel) {
  notificationBtn.onclick = (e) => {
    e.stopPropagation();
    notificationPanel.classList.toggle("open");
  };
}

if (clearNotificationsBtn) {
  clearNotificationsBtn.onclick = () => {
    if (!currentUser) return;
    currentNotifications.forEach((n) => readNotificationIds.add(n.id));
    saveReadNotificationIds(currentUser.uid);
    renderNotifications(currentUser.uid);
  };
}

// Chiude il pannello notifiche quando si clicca fuori dalla campanella.
document.addEventListener("click", (e) => {
  if (!notificationWrapper || !notificationPanel) return;
  if (!notificationWrapper.contains(e.target)) notificationPanel.classList.remove("open");
});

// --- MOSTRA IL NOME DEL FILE SELEZIONATO ---
// Gestisce il campo file e mostra il nome del documento selezionato.
const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name-display");

if (fileInput && fileNameDisplay) {
  fileInput.addEventListener("change", function() {
    if (this.files && this.files.length > 0) {
      fileNameDisplay.innerText = "✅ File pronto: " + this.files[0].name;
    } else {
      fileNameDisplay.innerText = "";
    }
  });
}

// --- APERTURA/CHIUSURA MODALI ---
if (authBtn && modal) {
  authBtn.onclick = () => { if (!currentUser) modal.style.display = "flex"; };
}
// Pulsanti e finestre popup per login e profilo.
const closeModal = document.getElementById("close-auth") || document.getElementById("close-modal");
if (closeModal && modal) closeModal.onclick = () => (modal.style.display = "none");

if (profileBtn && profileModal) {
  profileBtn.onclick = () => { 
    profileModal.style.display = "flex"; 
    const pe = document.getElementById("profile-email");
    if(pe) pe.innerText = currentUser.email; 
    loadMyUploads(); 
  };
}
const closeProfile = document.getElementById("close-profile");
if (closeProfile && profileModal) closeProfile.onclick = () => (profileModal.style.display = "none");


// --- GESTIONE PROFILO ---
// Schede del profilo: caricamenti personali e preferiti.
const tabUploads = document.getElementById("tab-uploads");
const tabFavorites = document.getElementById("tab-favorites");

if (tabUploads && tabFavorites) {
  tabUploads.onclick = () => {
    tabUploads.className = "btn-primary";
    tabFavorites.className = "btn-secondary";
    loadMyUploads();
  };
  tabFavorites.onclick = () => {
    tabFavorites.className = "btn-primary";
    tabUploads.className = "btn-secondary";
    loadMyFavorites();
  };
}

// Carica dal database gli appunti pubblicati dall’utente nel suo profilo.
async function loadMyUploads() {
  const container = document.getElementById("profile-content");
  if(!container) return; 
  container.innerHTML = "<p style='grid-column: 1/-1;'>Caricamento in corso...</p>";
  const q = query(collection(db, "projects"), where("authorUid", "==", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  
  if (snap.empty) { container.innerHTML = "<p style='grid-column: 1/-1;'>Non hai ancora caricato appunti.</p>"; return; }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const imgSrc = data.thumbUrl || data.fileUrl || "https://via.placeholder.com/300x200?text=Anteprima";
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/300x200?text=Anteprima'" onclick="window.open('${data.fileUrl}', '_blank')" />
      <div class="card-content">
        <div class="card-title" onclick="window.open('${data.fileUrl}', '_blank')">${data.title}</div>
        <div class="card-meta">${data.category} - ${data.year}° Anno</div>
        <button class="delete-btn" data-id="${docSnap.id}">Elimina File</button>
      </div>
    `;
    container.appendChild(div);
  });

  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = (e) => {
      pendingDeleteId = e.target.getAttribute("data-id");
      if (deleteModal) deleteModal.style.display = "flex";
    };
  });
}

// Conferma eliminazione con una finestra personalizzata, più coerente con lo stile del sito.
if (cancelDeleteBtn && deleteModal) {
  cancelDeleteBtn.onclick = () => {
    pendingDeleteId = null;
    deleteModal.style.display = "none";
  };
}

if (confirmDeleteBtn && deleteModal) {
  confirmDeleteBtn.onclick = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteDoc(doc(db, "projects", pendingDeleteId));
      showToast("File eliminato con successo", "success");
      loadMyUploads();
    } catch (err) {
      showToast("Errore durante l'eliminazione", "error");
    } finally {
      pendingDeleteId = null;
      deleteModal.style.display = "none";
    }
  };
}

if (deleteModal) {
  deleteModal.addEventListener("click", (e) => {
    if (e.target === deleteModal) {
      pendingDeleteId = null;
      deleteModal.style.display = "none";
    }
  });
}

// Carica dal database gli appunti che l’utente ha aggiunto ai preferiti.
async function loadMyFavorites() {
  const container = document.getElementById("profile-content");
  if(!container) return;
  container.innerHTML = "<p style='grid-column: 1/-1;'>Caricamento preferiti...</p>";
  const q = query(collection(db, "projects"), where("favorites", "array-contains", currentUser.uid));
  const snap = await getDocs(q);
  container.innerHTML = "";
  if (snap.empty) { container.innerHTML = "<p style='grid-column: 1/-1;'>Non hai ancora salvato preferiti.</p>"; return; }

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const imgSrc = data.thumbUrl || data.fileUrl || "https://via.placeholder.com/300x200?text=Anteprima";
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <img src="${imgSrc}" onerror="this.src='https://via.placeholder.com/300x200?text=Anteprima'" onclick="window.open('${data.fileUrl}', '_blank')" />
      <div class="card-content">
        <div class="card-title" onclick="window.open('${data.fileUrl}', '_blank')">${data.title}</div>
        <div class="card-meta">di ${data.authorName}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Pulsante di uscita dall’account.
const logoutBtn = document.getElementById("logout-btn");
if(logoutBtn) {
  logoutBtn.onclick = () => { 
    signOut(auth).then(() => { 
        if(profileModal) profileModal.style.display = "none"; 
        showToast("Logout effettuato", "info");
    }); 
  };
}

// --- PUBBLICAZIONE IN BACKGROUND ---
// Pubblicazione: controlla i dati, carica eventuale file e salva l’appunto su Firestore.
const publishBtn = document.getElementById("publish-btn");
if (publishBtn) {
  publishBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // Impedisce il refresh del form
    
    if (!currentUser) return showToast("Devi fare il login prima di pubblicare.", "error");
    
    const tEl = document.getElementById("project-title");
    const yEl = document.getElementById("project-year");
    const sEl = document.getElementById("project-subject");
    const linkInput = document.getElementById("doc-link"); 

    const title = tEl ? tEl.value : "";
    const year = yEl ? yEl.value : "";
    const subject = sEl ? sEl.value : "";
    
    const file = (fileInput && fileInput.files.length > 0) ? fileInput.files[0] : null;
    const linkUrl = linkInput ? linkInput.value : "";

    if (!title || !year || !subject) return showToast("Per favore, compila tutti i campi!", "info");
    if (!file && !linkUrl) return showToast("Carica un file o inserisci un link valido!", "info");

    publishBtn.innerText = "Caricamento in corso... ⏳";
    publishBtn.disabled = true;

    try {
      let finalUrl = linkUrl;
      let finalThumb = "https://images.unsplash.com/photo-1563986768494-4dee2763ff0f?w=500"; 

      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message);

        finalUrl = data.secure_url;
        finalThumb = data.format === "pdf" ? finalUrl.replace(".pdf", ".jpg") : finalUrl;
      }

      await addDoc(collection(db, "projects"), {
        title: title,
        year: year,
        category: subject,
        fileUrl: finalUrl,
        thumbUrl: finalThumb,
        authorName: currentUser.displayName || "Studente",
        authorUid: currentUser.uid,
        likes: [], favorites: [], comments: [],
        createdAt: new Date().toISOString()
      });

   showToast("Appunto pubblicato con successo! 🎉", "success");
      
      // --- RESETTA I CAMPI DOPO IL CARICAMENTO ---
      if(tEl) tEl.value = "";        // Pulisce il Titolo
      if(linkInput) linkInput.value = ""; // Pulisce il Link
      if(fileInput) fileInput.value = ""; // Pulisce il File
      if(fileNameDisplay) fileNameDisplay.innerText = ""; // Rimuove la scritta del file pronto
      
      // AGGIUNGI QUESTE DUE RIGHE QUI:
      if(yEl) yEl.value = ""; // Resetta l'Anno selezionato
      if(sEl) sEl.value = ""; // Resetta la Materia selezionata
      
      publishBtn.innerText = "Pubblica Appunto";
      publishBtn.disabled = false;

    } catch (err) {
      console.error(err);
      showToast("Errore durante il salvataggio: " + err.message, "error");
      publishBtn.innerText = "Pubblica Appunto";
      publishBtn.disabled = false;
    }
  });
}

// --- LOGICA LOGIN ---
// Login con email e password.
const doLogin = document.getElementById("do-login");
if(doLogin) {
  doLogin.onclick = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById("login-email").value, document.getElementById("login-password").value)
      .then(() => { 
        if(modal) modal.style.display = "none"; 
        showToast("Accesso effettuato!", "success");
      }).catch((err) => showToast("Errore login: " + err.message, "error"));
  };
}
// Registrazione di un nuovo account con nome, email e password.
const doRegister = document.getElementById("do-register");
if(doRegister) {
  doRegister.onclick = (e) => {
    e.preventDefault();
    const n = document.getElementById("reg-name").value;
    createUserWithEmailAndPassword(auth, document.getElementById("reg-email").value, document.getElementById("reg-password").value)
      .then((res) => { 
        updateProfile(res.user, { displayName: n }); 
        if(modal) modal.style.display = "none"; 
        showToast("Account creato con successo!", "success");
      })
      .catch((err) => showToast("Errore registrazione: " + err.message, "error"));
  };
}
// Login rapido tramite account Google.
const googleLogin = document.getElementById("google-login");
if(googleLogin) {
  googleLogin.onclick = (e) => {
    e.preventDefault();
    signInWithPopup(auth, provider).then(() => { 
        if(modal) modal.style.display = "none"; 
        showToast("Accesso con Google effettuato!", "success");
    }).catch((err) => showToast(err.message, "error"));
  };
}

// Navigazione tra viste Login/Reg
// Cambia schermata tra accesso e registrazione dentro la stessa finestra.
const viewLogin = document.getElementById("auth-view-login");
const viewReg = document.getElementById("auth-view-register");
const goToReg = document.getElementById("go-to-reg");
const goToLogin = document.getElementById("go-to-login");

if(goToReg && viewLogin && viewReg) {
  goToReg.onclick = () => { viewLogin.style.display = "none"; viewReg.style.display = "block"; };
}
if(goToLogin && viewLogin && viewReg) {
  goToLogin.onclick = () => { viewLogin.style.display = "block"; viewReg.style.display = "none"; };
}

// PWA: registra il service worker per installare il sito come app e usare la cache.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.log(err));
  });
}

/**
 * Funzione Toast (esportata o interna)
 */
export // Mostra piccoli messaggi temporanei in basso, utili per conferme o errori.
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = '💡';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => { toast.remove(); }, 300);
  }, 3000);
}
