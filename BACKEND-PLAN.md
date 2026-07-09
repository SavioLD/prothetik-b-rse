# Prothetik Börse – Backend-Plan (Briefing für das Entwicklungsteam)

Stand: Juni 2026 · Grundlage: Frontend-Prototyp in diesem Ordner

Dieses Dokument beschreibt, **was** das Backend leisten muss, **wie** es aufgebaut
werden soll und **in welcher Reihenfolge** gebaut wird. Es ist als Arbeitsgrundlage
für das Team gedacht – jede Phase hat ein klares Ergebnis ("Definition of Done").

---

## 1. Was das Backend können muss (fachlich)

Der Prototyp zeigt den kompletten Soll-Ablauf. Daraus ergeben sich sechs Kernfunktionen:

1. **Konten & Abos** – Praxen und Labore registrieren sich, schließen ein Abo ab
   und verwalten ihr Team (mehrere Benutzer pro Organisation).
2. **Anfragen & Matching** – Eine Praxis erstellt einen Suchauftrag mit Radius.
   Alle Labore im Umkreis werden benachrichtigt und können annehmen/ablehnen.
   Das erste annehmende Labor erhält den Zuschlag (konfigurierbar).
3. **Aufträge & Statusverlauf** – Aus einer angenommenen Anfrage wird ein Auftrag
   mit Statuskette (erstellt → angenommen → in Fertigung → versandt → abgeschlossen).
4. **Chat & Dokumente** – Pro Auftrag ein Echtzeit-Chat, Datei-Uploads
   (Fotos, PDFs, STL-Scans) und strukturierte digitale Formulare.
5. **Benachrichtigungen** – E-Mail + In-App (später Push), z. B. "Neue Anfrage
   im Umkreis", "Labor hat angenommen", "Neue Nachricht".
6. **Datenschutz & Nachvollziehbarkeit** – Pseudonymisierte Fallnummern,
   Verschlüsselung, Audit-Log, Löschkonzept. Das ist kein Add-on, sondern
   Grundanforderung (Gesundheitsumfeld!).

**Bewusst NICHT in Stufe 1:** Jobbörse, Bezahlabwicklung zwischen Praxis und Labor
(Rechnungen laufen weiterhin direkt zwischen den Parteien), Anbindung an
Praxisverwaltungssysteme (PVS). Das kommt in späteren Stufen.

---

## 2. Empfohlener Technik-Stack

| Baustein | Empfehlung | Begründung |
|---|---|---|
| Sprache/Framework | **TypeScript + NestJS** (Alternative: Python + FastAPI) | Strukturiert, gut testbar, großer Talentpool, ein Sprach-Ökosystem mit dem Frontend |
| Datenbank | **PostgreSQL 16 + PostGIS** | PostGIS löst die Umkreissuche nativ und präzise (`ST_DWithin`) |
| ORM/Migrations | Prisma oder TypeORM + dedizierte Migrationen | Nachvollziehbare Schema-Änderungen |
| Echtzeit-Chat | **WebSockets (Socket.IO)** über denselben Node-Prozess, Redis-Adapter für Skalierung | Ein Auftrag = ein Raum; einfach und bewährt |
| Queue/Jobs | **Redis + BullMQ** | E-Mail-Versand, Matching-Fanout, Erinnerungen an Liefertermine |
| Dateispeicher | **S3-kompatibler Object Storage in Deutschland** (z. B. Hetzner Object Storage, IONOS S3, OTC) | Verschlüsselt (SSE), Zugriff nur über kurzlebige signierte URLs |
| Auth | Eigene JWT-Implementierung (Access + Refresh) **oder** selbst gehostetes Keycloak/Ory | 2FA (TOTP) ist Pflicht-Feature, nicht optional |
| Abo/Zahlung | **Stripe Billing** (Praxis 20 €, Labor 15 €/Monat) | Subscriptions, SEPA-Lastschrift, Rechnungs-PDFs out of the box |
| E-Mail | Deutscher/europäischer Anbieter mit AVV (z. B. Mailjet EU, Brevo) | DSGVO |
| Hosting | **Deutsches Rechenzentrum** (Hetzner Cloud, IONOS, StackIT) · Docker + Docker Compose, später ggf. Kubernetes | Serverstandort DE ist Verkaufsargument und DSGVO-Anforderung |
| Monitoring | Sentry (selbst gehostet oder EU-Region) + Uptime-Check + strukturierte Logs (pino) | Fehler sehen, bevor Kunden anrufen |

> **Grundsatzentscheidung fürs Team:** Modularer Monolith statt Microservices.
> Ein Deployment, klar getrennte Module (auth, orgs, requests, orders, chat,
> documents, billing, notifications). Microservices lohnen sich erst ab deutlich
> größerem Team/Traffic.

---

## 3. Datenmodell (Kern-Entitäten)

```
Organization      – Praxis ODER Labor (type: PRACTICE | LAB)
                    Name, Adresse, Geo-Koordinaten (PostGIS Point),
                    Empfangs-Radius (nur Labor), Leistungskatalog (nur Labor)
User              – gehört zu genau einer Organization
                    E-Mail, Passwort-Hash (argon2), Rolle (OWNER | MEMBER), 2FA-Secret
Subscription      – 1:1 zur Organization, Stripe-Customer/Subscription-ID, Status
Request           – Suchauftrag der Praxis
                    Art (Krone, Brücke, … = Enum aus dem Frontend), Beschreibung,
                    Fallnummer (pseudonym!), Liefertermin, Priorität, Radius km,
                    Status: OPEN | MATCHED | EXPIRED | CANCELLED
RequestDispatch   – Zuordnung Request ↔ Labor im Umkreis
                    Status: PENDING | ACCEPTED | DECLINED | LOST
                    (Damit ist dokumentiert, wer wann angenommen/abgelehnt hat)
Order             – entsteht, wenn ein Labor annimmt (Request 1:1 Order)
                    Status: ACCEPTED | IN_PRODUCTION | TRY_IN | SHIPPED |
                    COMPLETED | DISPUTED · plus Statushistorie (OrderEvent)
Message           – Chat-Nachricht im Auftrag (Text oder Dokument-Referenz)
Document          – Datei-Metadaten (S3-Key, Größe, MIME, Virenscan-Status,
                    hochgeladen von), gehört zu Request oder Order
FormTemplate /    – digitale Auftragszettel: Template als JSON-Schema,
FormSubmission      ausgefüllte Version versioniert am Auftrag
Notification      – In-App-Benachrichtigungen (gelesen/ungelesen)
AuditLog          – wer hat wann was gesehen/geändert (Pflicht im Gesundheitsumfeld)
```

**Wichtige Regeln:**
- Im gesamten System existiert **kein Feld für Patientennamen oder Geburtsdatum**.
  Einzige Patientenreferenz ist die Fallnummer der Praxis. Das technisch zu
  erzwingen (Validierung, keine Freitextfelder für Patientendaten außer der
  Beschreibung mit Hinweistext) ist Teil des Datenschutzkonzepts.
- Jede Query ist **mandantengetrennt**: Eine Organization sieht ausschließlich
  eigene Requests/Orders bzw. solche, an denen sie beteiligt ist. Das gehört in
  eine zentrale Guard-Schicht, nicht in jeden einzelnen Endpoint.

---

## 4. API-Design (REST + WebSocket)

Basis: `https://api.prothetik-boerse.de/v1` · Auth: Bearer JWT · Alles JSON.

### Auth & Konto
```
POST   /auth/register            Organisation + erster User (E-Mail-Verifizierung)
POST   /auth/login               Login (+ 2FA-Challenge wenn aktiviert)
POST   /auth/refresh             Token erneuern
POST   /auth/2fa/enable|verify   TOTP einrichten
GET    /me                       eigenes Profil + Organization
PATCH  /organizations/:id        Profil, Adresse (→ Geocoding-Job), Radius (Labor)
POST   /organizations/:id/users  Teammitglied einladen
```

### Anfragen (Praxis)
```
POST   /requests                 Anfrage erstellen → löst Matching-Fanout aus
GET    /requests                 eigene Anfragen (Filter: Status)
GET    /requests/:id             Detail inkl. Dispatch-Status ("2 Labore prüfen")
DELETE /requests/:id             zurückziehen (nur solange OPEN)
GET    /labs/nearby?radius=30    Anzahl/Liste Labore im Umkreis (für den Slider!)
```

### Anfragen (Labor)
```
GET    /dispatches               eingehende Anfragen (PENDING)
POST   /dispatches/:id/accept    annehmen → erzeugt Order, andere Dispatches → LOST
POST   /dispatches/:id/decline   ablehnen (optional mit Grund)
```

### Aufträge, Chat, Dokumente
```
GET    /orders / /orders/:id     Liste + Detail (inkl. Statushistorie)
POST   /orders/:id/status        Statuswechsel (nur erlaubte Übergänge!)
GET    /orders/:id/messages      Chatverlauf (paginiert)
WS     /ws  (Socket.IO)          Räume: order:{id} · Events: message:new,
                                 order:status, dispatch:new, notification:new
POST   /documents/presign        signierte Upload-URL anfordern (Typ/Größe geprüft)
POST   /documents/:id/confirm    Upload bestätigen → Virenscan-Job
GET    /documents/:id/download   kurzlebige Download-URL (Zugriff wird auditiert)
POST   /orders/:id/forms         Formular ausfüllen/aktualisieren (versioniert)
```

### Abo & Admin
```
POST   /billing/checkout         Stripe-Checkout-Session (Plan: PRACTICE | LAB)
POST   /billing/webhook          Stripe-Webhooks (Abo aktiv/gekündigt/Zahlung fehlgeschlagen)
GET    /admin/*                  internes Admin: Organisationen freischalten,
                                 Kennzahlen, Support-Einblick (nur Metadaten, KEIN Chat-Inhalt)
```

### Matching-Logik (Herzstück, im Detail)
1. Praxis sendet `POST /requests` mit `radius_km`.
2. Backend sucht per PostGIS alle Labore mit aktivem Abo, deren Standort im
   Radius liegt **und** deren eigener Empfangs-Radius die Praxis einschließt
   (beidseitige Prüfung) **und** die die Leistungsart anbieten.
3. Für jedes Labor wird ein `RequestDispatch (PENDING)` angelegt; Queue-Job
   verschickt E-Mail + In-App + WebSocket-Event.
4. `accept` läuft in einer **DB-Transaktion mit Lock**: Nur der erste Accept
   gewinnt, alle anderen Dispatches kippen auf `LOST` und werden informiert.
5. Kein Accept innerhalb X Tagen (konfigurierbar, z. B. 5) → Request `EXPIRED`,
   Praxis bekommt Vorschlag, den Radius zu vergrößern.

---

## 5. Datenschutz & Sicherheit (nicht verhandelbar)

> **Verbindliche Detailvorgaben stehen im DATENSCHUTZ-KONZEPT.md** (gleicher
> Ordner) – inkl. Datenklassifikation, Freitext-Wächter, Lösch-/Anonymisierungs-
> Lebenszyklus und Beta-Checkliste. Dieses Kapitel ist die Kurzfassung.

**Technische Maßnahmen**
- TLS überall; HSTS; Security-Header (CSP, X-Frame-Options …)
- Passwörter: argon2id · 2FA per TOTP für alle Konten anbietbar, für
  Organisations-Owner verpflichtend
- Dokumente: serverseitige Verschlüsselung im Object Storage; Zugriff nur über
  signierte URLs mit kurzer Laufzeit (≤ 5 min); jeder Zugriff im AuditLog
- Virenscan (ClamAV) für jeden Upload, bevor die Gegenseite ihn sieht
- Rate-Limiting & Brute-Force-Schutz auf Auth-Endpoints
- Backups: täglich, verschlüsselt, in DE; Restore-Test vierteljährlich
- Keine Patientenklarnamen im System (siehe Datenmodell) – dadurch bleiben die
  Daten zwar personenbeziehbar (Fallnummer), aber maximal datensparsam

**Organisatorisch (mit Gründung/Anwalt klären, parallel zur Entwicklung!)**
- AV-Verträge mit allen Subdienstleistern (Hosting, E-Mail, Stripe)
- Datenschutz-Folgenabschätzung (DSFA) – bei Gesundheitsbezug empfohlen
- Verzeichnis von Verarbeitungstätigkeiten, Löschkonzept
  (z. B. Aufträge nach X Jahren anonymisieren, Konten 30 Tage nach Kündigung löschen)
- AGB + Plattform-Nutzungsvertrag, Muster-AVV für Praxen
  (die Praxis bleibt Verantwortlicher, die Plattform ist Auftragsverarbeiter)

---

## 6. Bauplan in Phasen (mit Definition of Done)

Reihenfolge ist so gewählt, dass nach jeder Phase etwas Vorzeigbares läuft.
Aufwände sind Richtwerte für 2 Backend-Entwickler.

### Phase 0 – Fundament (1–2 Wochen)
Repo `prothetik-boerse-api`, NestJS-Skeleton, Docker Compose (API + Postgres/PostGIS
+ Redis + MinIO lokal), CI-Pipeline (Lint, Tests, Build), Staging-Server in DE,
Migrations-Setup, Logging/Sentry, OpenAPI-Doku automatisch generiert.
**DoD:** `docker compose up` startet alles lokal; CI ist grün; Staging erreichbar.

### Phase 1 – Identität & Organisationen (2–3 Wochen)
Registrierung mit E-Mail-Verifizierung, Login, Refresh-Tokens, 2FA, Rollen,
Organisationsprofil mit Geocoding (Adresse → Koordinaten, z. B. via Nominatim/
Photon selbst gehostet), Team-Einladungen, AuditLog-Grundgerüst.
**DoD:** Praxis und Labor können sich registrieren und ihr Profil pflegen;
alle Auth-Flows mit Tests abgedeckt.

### Phase 2 – Anfragen & Matching (3–4 Wochen) ← Kern der Plattform
Request-CRUD, PostGIS-Umkreissuche, `/labs/nearby` (füttert den Radius-Slider im
Frontend), Dispatch-Fanout über Queue, Accept/Decline mit Transaktions-Lock,
Expiry-Job, E-Mail-Benachrichtigungen.
**DoD:** Kompletter Durchstich: Anfrage erstellen → Labor sieht sie → nimmt an →
Order existiert → Konkurrenz-Labore sind informiert. Lasttest Matching mit 1 000 Laboren.

### Phase 3 – Aufträge, Chat & Dokumente (3–4 Wochen)
Order-Statusmaschine mit erlaubten Übergängen + Historie, Socket.IO-Chat mit
Persistenz und Ungelesen-Zählern, Dokumenten-Upload (presigned URLs, Virenscan,
Audit), digitale Formulare (JSON-Schema-Templates, erste Vorlage: Auftragszettel
nach Vorbild des Frontends), Lieferterminerinnerungen.
**DoD:** Praxis und Labor wickeln einen Auftrag komplett digital ab – Chat,
Foto-Upload, Formular, Statuskette bis "abgeschlossen".

### Phase 4 – Abo & Abrechnung (2 Wochen)
Stripe Billing (zwei Pläne, SEPA + Karte), Webhook-Verarbeitung, Zugriffssperre
bei inaktivem Abo (Lesen ja, Neues erstellen nein), Rechnungs-Mails, Test-/
Trial-Phase (z. B. 30 Tage).
**DoD:** Ohne aktives Abo keine neuen Anfragen/Annahmen; Kündigungs- und
Mahn-Szenarien getestet (Stripe-Testclock).

### Phase 5 – Härtung & Beta (2–3 Wochen)
Pentest-Vorbereitung (OWASP-Check), Backup/Restore-Probe, DSGVO-Dokumente
finalisieren, Admin-Panel, Onboarding von 3–5 echten Praxen/Laboren als
geschlossene Beta, Feedback-Schleife.
**DoD:** Beta läuft mit echten Partnern; Incident-Runbook existiert;
Löschkonzept ist implementiert (nicht nur dokumentiert).

**Gesamt: ca. 3,5–4 Monate bis zur geschlossenen Beta** (2 Backend-Entwickler,
plus 1 Person, die parallel das Frontend vom Prototyp an die echte API anbindet).

### Spätere Stufen (nach der Beta)
- Push-Notifications + PWA/Mobile-App
- Bewertungen/Verlässlichkeits-Metriken für Labore
- Jobbörse (eigenes Modul, profitiert von Orgs/Auth/Geo aus Stufe 1)
- PVS-/Laborsoftware-Schnittstellen (VDDS, etc.)
- Versand-Tracking, XML/DICOM-Viewer für Scans

---

## 7. Team & Verantwortlichkeiten

| Rolle | Aufgaben |
|---|---|
| Backend-Dev 1 (Lead) | Architektur, Auth, Matching, Reviews |
| Backend-Dev 2 | Chat, Dokumente, Formulare, Billing |
| Frontend-Dev | Prototyp → echte App (Empfehlung: auf Vue/React + Vite heben), API-Anbindung |
| DevOps (kann Lead mitmachen) | Hosting, CI/CD, Backups, Monitoring |
| Extern/Gründung | Datenschutzbeauftragter o. Kanzlei: AVV, DSFA, AGB |

**Arbeitsweise:** 2-Wochen-Sprints entlang der Phasen · jede Funktion mit Tests
(Ziel ≥ 80 % auf Kernmodule Matching/Auth/Billing) · Code-Review verpflichtend ·
OpenAPI-Doku ist Vertrag zwischen Front- und Backend und wird zuerst geschrieben.

---

## 8. Erste konkrete Schritte (diese Woche)

1. Stack-Entscheidung im Team bestätigen (NestJS vs. FastAPI – beides okay,
   wichtig ist die PostGIS/Queue/S3-Architektur dahinter)
2. Hosting-Anbieter in DE auswählen und Staging-Server bestellen
3. Repo + Phase 0 starten
4. Parallel: Anwalt/DSB für AVV-Muster und DSFA beauftragen
5. OpenAPI-Spezifikation für Phase-1- und Phase-2-Endpoints ausformulieren
   (auf Basis von Abschnitt 4) und vom Frontend gegenlesen lassen
