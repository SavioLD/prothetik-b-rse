# Prothetik Börse – Datenschutz- & Anonymisierungskonzept

Stand: Juni 2026 · Verbindliche Vorgabe für das gesamte Team
(Ergänzt den BACKEND-PLAN.md, Abschnitt 5 – im Zweifel gilt dieses Dokument.)

**Leitsatz: Die Plattform funktioniert vollständig, ohne jemals zu wissen,
wer der Patient ist.** Jedes Feature wird vor der Umsetzung gegen diesen Satz
geprüft. Was ihn verletzt, wird nicht gebaut oder umgebaut.

---

## 1. Ehrliche Begriffsklärung (wichtig für Team UND Anwalt)

- **Anonym** = Personenbezug ist für niemanden mehr herstellbar.
- **Pseudonym** = Personenbezug nur mit Zusatzwissen herstellbar (z. B. Fallnummer,
  die nur die Praxis in ihrer Praxissoftware auflösen kann).

Die Plattform arbeitet **pseudonym** (die Praxis muss den Fall ja zuordnen können)
und wird **nach Auftragsabschluss schrittweise anonymisiert** (siehe Abschnitt 6).
Diese Unterscheidung sauber zu kommunizieren schützt vor Abmahnungen wegen
irreführender „Anonymität"-Versprechen.

---

## 2. Datenklassifikation – was die Plattform speichert und was NIE

### Verboten – diese Daten existieren im System nirgends:
- Patientenname, Initialen, Geburtsdatum, Adresse, Telefonnummer des Patienten
- Versichertennummer, Krankenkasse, Diagnosen über die zahntechnische
  Notwendigkeit hinaus
- Fotos, auf denen ein Patient identifizierbar ist (Gesicht, erkennbare Merkmale)
- Scans von Papier-Auftragszetteln, auf denen Patientendaten stehen

**Konsequenz im Code:** Es gibt schlicht keine Datenbankfelder dafür.
Was kein Feld hat, kann nicht geleakt, nicht angefragt und nicht beschlagnahmt
werden. Das ist die stärkste Schutzmaßnahme überhaupt.

### Pseudonym – einzige Patientenreferenz:
- **Fallnummer der Praxis** (z. B. `P-2026-0341`). Die Auflösung zur Person ist
  ausschließlich in der Praxissoftware der Praxis möglich. Die Plattform kennt
  die Zuordnung nicht und will sie nicht kennen.

### Fachlich notwendig (kein Patientenbezug):
- Art der Arbeit, Zahnnummer(n), Material, Farbton, Liefertermin, Priorität
- Intraoral-/Werkstückfotos und 3D-Scans **ohne** identifizierende Merkmale

### Personenbezogen, aber NICHT Patient (normale DSGVO-Pflichten):
- Nutzerkonten der Praxis-/Labor-Mitarbeiter (Name, E-Mail, Passwort-Hash)
- Organisationsdaten (Praxis-/Laboradresse, Abrechnungsdaten via Stripe)

---

## 3. Technische Schutzmaßnahmen im Produkt

### Eingabe-Ebene (verhindern statt heilen)
1. **Freitext-Wächter:** Beschreibungs- und Chatfelder prüfen clientseitig UND
   serverseitig auf Muster, die nach Patientendaten aussehen
   (Geburtsdatums-Formate, „Herr/Frau + Name"-Muster, Versichertennummern-Format).
   Bei Treffer: Warnung mit Erklärung, Absenden erst nach bewusster Korrektur.
   Kein stilles Speichern.
2. **UI-Hinweise an jeder Eingabestelle:** Beschreibung, Upload und Chat tragen
   den Hinweis „Keine Patientennamen – die Fallnummer genügt" (im Prototyp
   bereits umgesetzt).
3. **Upload-Pflichtbestätigung:** Vor dem ersten Upload bestätigt der Nutzer
   einmalig pro Sitzung, dass die Datei keine identifizierenden Daten enthält.
4. **EXIF-Stripping:** Alle Bild-Uploads werden serverseitig von Metadaten
   befreit (GPS-Position, Geräteinfo, Aufnahmezeit), bevor sie gespeichert werden.

### Speicher- & Übertragungs-Ebene
5. TLS 1.2+ überall, HSTS, moderne Cipher; interne Dienste ebenfalls verschlüsselt.
6. Dokumente: verschlüsselt im Object Storage (SSE, Schlüsselverwaltung getrennt
   vom Storage-Zugang); Datenbank-Volumes verschlüsselt; Backups verschlüsselt.
7. Zugriff auf Dokumente nur über signierte URLs ≤ 5 Minuten Laufzeit;
   jeder Abruf landet im Audit-Log (wer, wann, welche Datei, von welcher IP).
8. Serverstandort ausschließlich Deutschland, ISO-27001-zertifizierte
   Rechenzentren, keine Subdienstleister außerhalb der EU für Inhaltsdaten.

### Zugriffs-Ebene
9. **Strikte Mandantentrennung als zentrale Guard-Schicht:** Eine Organisation
   sieht nur Vorgänge, an denen sie beteiligt ist – durchgesetzt in einer
   Middleware, nicht in jedem Endpoint einzeln (ein vergessener Check darf
   nicht möglich sein). Dazu automatisierte Tests, die Fremdzugriff explizit
   durchprobieren.
10. **Support/Admin sieht keine Inhalte:** Das interne Admin-Panel zeigt
    Metadaten (Anzahl Aufträge, Abo-Status), aber niemals Chatverläufe,
    Dokumente oder Formulardaten. Für Support-Fälle gibt die betroffene
    Organisation explizit und zeitlich begrenzt frei (Vier-Augen-Prinzip).
11. 2FA verpflichtend für Organisations-Inhaber, empfohlen für alle;
    automatischer Logout, Gerätebindung der Refresh-Tokens.

---

## 4. Was wir bewusst NICHT bauen

- Kein Patientenstammdaten-Modul, auch nicht „optional" oder „später vielleicht" –
  das wäre der Moment, ab dem die Plattform ein Gesundheitsdaten-Archiv ist.
- Keine Volltext-Suche über Chatinhalte hinweg (Suchindex = zweite Datenkopie).
- Kein Auslesen von Dokumentinhalten für Features (OCR o. Ä.) ohne neue DSFA.
- Keine Tracking-/Analytics-Dienste von Drittanbietern im eingeloggten Bereich;
  Produktmetriken nur selbst gehostet und aggregiert (z. B. Matomo, ohne IPs).

---

## 5. Rollen nach DSGVO (Basis für die Verträge)

- **Praxis = Verantwortlicher** für die Fallnummer und alle Inhalte, die sie einstellt.
- **Labor = Verantwortlicher** für seine eigenen Inhalte / ggf. gemeinsame
  Verantwortlichkeit im Auftrag – genaue Ausgestaltung mit Kanzlei klären.
- **Plattform = Auftragsverarbeiter** (Art. 28 DSGVO):
  - Muster-AVV ist Teil des Onboardings – ohne akzeptierten AVV keine Freischaltung.
  - Subdienstleister-Liste öffentlich und versioniert (Hosting, E-Mail, Stripe).
  - TOM-Liste (technisch-organisatorische Maßnahmen) = Abschnitt 3 dieses Dokuments,
    von der Kanzlei in Vertragsform gegossen.
- **DSFA (Datenschutz-Folgenabschätzung)** vor dem Beta-Start durchführen –
  bei Gesundheitsbezug ist das die sichere Variante und im Streitfall Gold wert.
- Benennung eines **Datenschutzbeauftragten** (extern okay) vor dem ersten
  echten Kunden.

---

## 6. Löschen & Anonymisieren (Lebenszyklus jedes Auftrags)

| Zeitpunkt | Was passiert |
|---|---|
| Auftrag abgeschlossen | Dokumente bleiben 6 Monate für Rückfragen/Reklamation verfügbar (Frist konfigurierbar) |
| +6 Monate | **Dokumente und Chatinhalte werden gelöscht.** Auftrag wird anonymisiert: Fallnummer wird durch Zufallswert ersetzt, Beschreibung gelöscht. Übrig bleibt ein statistischer Datensatz (Art der Arbeit, Region, Dauer) für Plattform-Kennzahlen |
| Konto gekündigt | 30 Tage Export-Fenster für die Organisation, danach vollständige Löschung der Organisationsdaten; laufende gesetzliche Aufbewahrungspflichten (Rechnungen) bleiben getrennt davon bestehen |
| Backup-Rotation | Gelöschte Daten verschwinden spätestens nach 35 Tagen auch aus Backups (Rotationsfrist dokumentieren) |

Wichtig: Die Praxis wird vor Ablauf der 6 Monate per E-Mail erinnert, damit sie
benötigte Unterlagen in ihre eigene Dokumentation übernimmt (ihre
zahnärztliche Aufbewahrungspflicht liegt bei ihr, nicht bei der Plattform –
das gehört so in die AGB).

---

## 7. Wenn doch etwas passiert (Incident-Plan)

1. Jeder im Team meldet Verdacht sofort an den Lead (kein „erstmal beobachten").
2. Bewertung innerhalb von 24 h: Sind personenbezogene Daten betroffen?
3. Falls ja: **Meldung an die Aufsichtsbehörde innerhalb 72 h** (Art. 33 DSGVO),
   Information betroffener Organisationen, dokumentierter Ablauf.
4. Durch die Architektur (keine Patientenklarnamen) ist der Schaden selbst im
   Worst Case begrenzt – genau dafür bauen wir es so.
5. Runbook mit Kontaktdaten (Behörde, Kanzlei, Hoster) liegt fertig in der
   Team-Doku, bevor die Beta startet.

---

## 8. Checkliste vor dem Beta-Start (Blocker, kein „nice to have")

- [ ] Freitext-Wächter aktiv (Client + Server)
- [ ] EXIF-Stripping aktiv
- [ ] Mandantentrennungs-Tests grün (automatisierte Fremdzugriffs-Versuche)
- [ ] Audit-Log für jeden Dokumentenzugriff
- [ ] Lösch-/Anonymisierungs-Jobs implementiert und getestet (nicht nur dokumentiert)
- [ ] AVV-Muster + AGB von Kanzlei freigegeben
- [ ] DSFA durchgeführt und dokumentiert
- [ ] Datenschutzbeauftragter benannt
- [ ] Incident-Runbook im Team bekannt
- [ ] Subdienstleister-Liste mit AV-Verträgen vollständig
