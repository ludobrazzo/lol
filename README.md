# WikiSchool

WikiSchool è una piattaforma web pensata per caricare, organizzare, consultare e condividere appunti scolastici.  
Il sito permette agli utenti registrati di pubblicare materiali, interagire con gli appunti degli altri utenti, ricevere notifiche e usare un chatbot AI integrato come supporto allo studio.

## Funzionalità principali

### Autenticazione utente

- Login con Firebase Authentication.
- Visualizzazione del nome dell’utente quando è loggato.
- Pulsante per accedere al profilo personale.
- Pulsante di logout posizionato nella parte alta del profilo.
- Funzionalità riservate solo agli utenti autenticati.

### Caricamento appunti

Gli utenti loggati possono pubblicare appunti inserendo:

- titolo dell’appunto;
- anno scolastico;
- materia;
- file caricato dal dispositivo;
- oppure link esterno, ad esempio Canva, Google Drive o altre risorse.

Formati supportati indicati nel sito:

- PDF;
- DOCX;
- JPG;
- PNG.

Se l’utente non è loggato, il sito mostra un avviso e impedisce il caricamento.

### Archivio appunti

La pagina archivio permette di consultare gli appunti caricati dagli utenti.

Sono presenti:

- visualizzazione degli appunti disponibili;
- filtri e ricerca;
- schede appunto con informazioni principali;
- apertura dei materiali caricati o collegati;
- interazioni con like, commenti e preferiti.

### Like agli appunti

Gli utenti loggati possono mettere “Mi piace” agli appunti.

Se un utente non loggato prova a mettere like, compare un toast che avvisa che è necessario effettuare il login.

### Preferiti

Gli utenti loggati possono salvare gli appunti nei preferiti.

Se un utente non loggato prova ad aggiungere un appunto ai preferiti, compare un toast che richiede il login.

### Commenti

Gli utenti possono commentare gli appunti.

Le notifiche vengono generate quando un appunto riceve un commento.

### Profilo personale

Nel profilo l’utente può vedere e gestire i propri appunti caricati.

Funzionalità presenti:

- elenco dei file/appunti pubblicati;
- gestione dei propri contenuti;
- eliminazione dei file caricati;
- pulsante logout in alto.

### Eliminazione appunti

È stata rimossa la conferma standard del browser.

Al suo posto è presente una finestra di conferma personalizzata, più coerente con lo stile grafico del sito.

### Notifiche

Il sito include una campanella notifiche visibile quando l’utente è loggato.

Le notifiche segnalano attività sugli appunti, per esempio:

- nuovi commenti;
- interazioni ricevute.

Funzionalità del pannello notifiche:

- badge con numero di notifiche non lette;
- elenco delle notifiche;
- data e ora dell’attività;
- pulsante “Segna come lette”;
- chiusura cliccando fuori dal pannello;
- pannello adattato anche per schermi piccoli.

### Toast di avviso

Il sito usa piccoli messaggi toast per comunicare azioni o errori senza interrompere l’utente.

Esempi:

- richiesta di login per mettere like;
- richiesta di login per aggiungere ai preferiti;
- avvisi collegati ad azioni dell’utente.

I toast sono posizionati sopra la bolla del chatbot.

### Chatbot AI WikiBot

Il sito include WikiBot, un assistente AI integrato.

Il chatbot è presente sia nella pagina principale sia nell’archivio.

Funzionalità del chatbot:

- apertura e chiusura tramite pulsante flottante;
- chiusura cliccando fuori dalla finestra;
- invio di messaggi testuali;
- supporto a messaggi lunghi;
- supporto a immagini/foto allegate;
- memoria della conversazione durante la sessione;
- risposta formattata con supporto a markdown;
- supporto a formule matematiche tramite MathJax;
- gestione migliorata di formule e codice lunghi;
- scroll dell’intera area chat invece dello scroll sui singoli messaggi.

### Firebase AI Logic

Il chatbot usa Firebase AI Logic per collegarsi al modello Gemini senza inserire direttamente nel frontend la Gemini API key classica.

Il progetto mantiene visibile solo la configurazione Firebase necessaria al funzionamento del sito.

Il modello usato è:

```text
gemini-2.5-flash
```

### Formattazione risposte chatbot

Le risposte del bot sono state migliorate per rendere meglio:

- grassetto;
- corsivo;
- titoli;
- liste puntate;
- liste numerate;
- codice;
- formule matematiche;
- testi lunghi.

Le formule e i blocchi troppo lunghi vengono gestiti senza far uscire il contenuto dal riquadro.

### Layout responsive

Il sito è adattato per funzionare su:

- computer;
- tablet;
- smartphone.

Sono presenti correzioni specifiche per:

- barra superiore;
- pannello notifiche;
- chatbot;
- moduli di caricamento;
- pulsanti;
- area profilo.

### Service Worker e manifest

Il progetto include:

- `manifest.json`;
- `sw.js`.

Questi file servono per migliorare il comportamento del sito come web app installabile o progressiva, dove supportato dal browser.

## Struttura dei file

```text
WIKISCHOOL-main/
├── index.html
├── archivio.html
├── styles.css
├── script.js
├── script_archivio.js
├── manifest.json
├── sw.js
├── package.json
├── README.md
└── icons/
```

### `index.html`

Pagina principale del sito.

Contiene:

- navbar;
- area caricamento appunti;
- profilo utente;
- pannello notifiche;
- chatbot WikiBot.

### `archivio.html`

Pagina dedicata alla consultazione degli appunti.

Contiene:

- archivio appunti;
- ricerca e filtri;
- interazioni con appunti;
- chatbot WikiBot.

### `styles.css`

File principale dello stile grafico.

Gestisce:

- layout generale;
- navbar;
- card;
- upload;
- archivio;
- notifiche;
- toast;
- profilo;
- chatbot;
- responsive design.

### `script.js`

File JavaScript della pagina principale.

Gestisce:

- Firebase;
- login/logout;
- caricamento appunti;
- profilo;
- notifiche;
- eliminazione appunti;
- chatbot nella dashboard.

### `script_archivio.js`

File JavaScript della pagina archivio.

Gestisce:

- caricamento e visualizzazione appunti;
- ricerca e filtri;
- like;
- preferiti;
- commenti;
- chatbot nella pagina archivio.

### `manifest.json`

File di configurazione della web app.

Contiene informazioni come:

- nome dell’app;
- icone;
- colori;
- impostazioni di avvio.

### `sw.js`

Service Worker del sito.

Serve per funzioni legate alla web app e alla gestione base della cache, se supportata.

## Tecnologie usate

- HTML
- CSS
- JavaScript
- Firebase
- Firebase Authentication
- Firebase Firestore
- Firebase Storage / gestione file esterni
- Firebase AI Logic
- Gemini
- MathJax
- PDF.js
- Cloudinary Upload Widget
