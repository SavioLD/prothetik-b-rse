# Prothetik Börse – Frontend-Prototyp

Klickbarer Frontend-Prototyp der Plattform **Prothetik Börse**: Vermittlung und
Koordination von Prothetik-Aufträgen zwischen Zahnarztpraxen und Dentallaboren.

## Seiten

| Datei | Inhalt |
|---|---|
| `index.html` | Landingpage (Produkt, Ablauf, Abo-Preise, Datenschutz) |
| `login.html` | Anmeldung mit Rollenwahl (Praxis / Labor) |
| `dashboard.html` | Praxis-Dashboard: Statistiken, offene Anfragen, laufende Aufträge |
| `anfrage-neu.html` | Neue Anfrage: Art der Arbeit, Beschreibung, Upload, Umkreis-Karte mit Radius-Slider |
| `techniker.html` | Labor-Ansicht: eingehende Anfragen annehmen/ablehnen |
| `auftrag.html` | Auftragsdetail: Chat, Statusverlauf, Dokumente & Formulare |

## Ansehen

Einfach `index.html` im Browser öffnen – oder lokal serven:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Beim Login wechselt die Rollenwahl zwischen Praxis-Sicht (`dashboard.html`)
und Labor-Sicht (`techniker.html`).

## Technik & Datenschutz

- Reines HTML/CSS/JS, keine Build-Tools nötig.
- Schriften (Inter) und Karten-Bibliothek (Leaflet 1.9.4) sind **lokal
  eingebunden** – keine Google-Fonts- oder CDN-Aufrufe (DSGVO-freundlich).
- Kartenkacheln kommen von CARTO/OpenStreetMap (nur auf `anfrage-neu.html`).
- Alle Daten sind Demo-Daten; es findet keine Übertragung statt.
- Patientendaten erscheinen im Konzept nur pseudonymisiert (Fall-Nummern).

## Geplante Ausbaustufen

1. **Stufe 1 (dieser Prototyp):** Auftragsvermittlung, Umkreissuche, Chat, Formulare
2. **Stufe 2:** Jobbörse für Praxen und Labore (in der Navigation bereits als „Bald" angedeutet)
