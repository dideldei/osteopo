# DVO Osteoporose – MVP Threshold Classifier

Eine Web-Anwendung zur Berechnung des 3-Jahres-Frakturrisikos nach der DVO-Leitlinie 2023 mit evidenzbasierter Therapieempfehlung.

## 📋 Projektübersicht

Diese Anwendung unterstützt Ärzte bei der Risikobewertung von Osteoporose-Patienten und der Ableitung von Therapieempfehlungen basierend auf:

- **Alter und Geschlecht** des Patienten
- **BMD (Bone Mineral Density)** T-Score (optional)
- **Risikofaktoren** aus der DVO-Leitlinie 2023
- **Evidenzbasierte Substanz-Priorisierung** innerhalb der Therapieklassen

Die Anwendung berechnet automatisch:
- Das 3-Jahres-Frakturrisiko in Bändern (<3%, 3–<5%, 5–<10%, ≥10%)
- Die Therapieempfehlung basierend auf Risikoband und Triggern
- Eine evidenzbasierte Sortierung der medikamentösen Optionen

## ✨ Features

- **Risikofaktor-Auswahl**: Umfassende Auswahl von Risikofaktoren aus drei Gruppen (Sturzrisiko, RA/GC, Sonstige)
- **BMD (T-Score) Eingabe**: Unterstützung für Komma und Punkt als Dezimaltrennzeichen (mobile-optimiert)
- **Evidenzbasierte Substanz-Priorisierung**: Automatische Sortierung nach Evidenzlevel, Hüft- und Wirbelfrakturen-Wirksamkeit
- **Administration-Metadaten**: Anzeige von Applikationsweg, Frequenz, Setting und Zulassungshinweisen
- **Accessibility**: ARIA-Labels, Keyboard-Navigation, Screen-Reader-Unterstützung
- **Responsive Design**: Optimiert für Desktop und mobile Geräte

## 🛠 Technologie-Stack

- **SolidJS** ^1.8.0 - Reaktives Frontend-Framework
- **TypeScript** ^5.3.0 - Typsichere Entwicklung
- **Vite** ^5.0.0 - Moderne Build-Toolchain
- **GitHub Pages** - Hosting und automatisches Deployment

## 📦 Installation & Setup

### Voraussetzungen

- **Node.js** >= 20.x
- **pnpm** >= 8.x (empfohlen) oder npm

### Installation

```bash
# Repository klonen
git clone https://github.com/dideldei/osteopo.git
cd osteopo

# Dependencies installieren
pnpm install
```

## 🚀 Entwicklung

### Lokale Entwicklung starten

```bash
pnpm dev
```

Die Anwendung ist dann unter `http://localhost:5173` erreichbar.

### Verfügbare Scripts

```bash
# Entwicklungsserver starten
pnpm dev

# Production Build erstellen
pnpm build

# Production Build lokal testen
pnpm preview
```

## 📁 Projektstruktur

```
osteopo/
├── context/                    # Datenquellen (JSON, Pseudocode)
│   ├── DVO_Threshold_Tables_Bundle_v1.0.0.json
│   ├── DVO_RF_Katalog_Rohdaten_v0.5.json
│   ├── DVO_Medication_Evidence_Table_v1.0.0.json
│   ├── DVO_Substance_Administration_Metadata_v1.0.0.json
│   ├── DVO_Substance_Registry_v1.0.0.json
│   └── *.txt                   # Pseudocode-Dokumentation
├── src/
│   ├── components/             # SolidJS-Komponenten
│   │   ├── InputSection.tsx
│   │   ├── RiskFactorGroup.tsx
│   │   ├── MutualExclusionGroup.tsx
│   │   └── RiskFactorItem.tsx
│   ├── data/                   # Datenlogik und Business-Logic
│   │   ├── lookup.ts           # Threshold-Tabellen-Lookup
│   │   ├── rfCatalog.ts        # Risikofaktor-Katalog
│   │   ├── rfSelection.ts      # Top-2 RF Auswahl
│   │   ├── therapy.ts          # Therapie-Engine
│   │   ├── substanceRanking.ts # Evidenzbasierte Sortierung
│   │   ├── substanceMetadata.ts # Administration-Metadaten
│   │   ├── substanceRegistry.ts # Substance Registry (SSOT)
│   │   └── types.ts            # TypeScript-Typen
│   ├── utils/                  # Utility-Funktionen
│   │   ├── logger.ts           # Logging (dev-only)
│   │   └── rfHelpers.ts        # RF-Hilfsfunktionen
│   ├── App.tsx                 # Hauptkomponente
│   ├── index.tsx               # Entry Point
│   └── styles.css              # Styling
├── scripts/
│   └── validate-data-consistency.ts  # Datenvalidierung
├── dist/                       # Build-Output (gitignored)
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🏗 Architektur

### Datenfluss

1. **Eingaben**: Geschlecht, Alter, BMD (optional), Risikofaktoren
2. **Lookup**: Threshold-Tabellen basierend auf Alter, Geschlecht, BMD
3. **Risikofaktor-Bewertung**: Top-2 RF Auswahl, Multiplikator-Berechnung
4. **Schwellenwert-Prüfung**: Vergleich Multiplikator vs. erforderlicher Faktor
5. **Therapie-Engine**: Ableitung der Therapie-Strategie
6. **Substanz-Ranking**: Evidenzbasierte Sortierung innerhalb der Therapieklasse
7. **Ausgabe**: Risikoband, Empfehlung, Therapie-Strategie, Substanzen

### Single Source of Truth (SSOT)

- **Substance Registry** (`DVO_Substance_Registry_v1.0.0.json`): Master-Referenz für `substance_id`, `label_de`, `therapy_class`
- **Evidence Table**: Evidenz-Metadaten (referenziert Registry)
- **Administration Metadata**: Applikations-Metadaten (referenziert Registry)

### Komponenten-Hierarchie

```
App
├── InputSection
│   ├── Geschlecht (Radio)
│   ├── Alter (Number)
│   └── BMD (Text, mobile-optimiert)
├── RiskFactorSection
│   └── RiskFactorGroup (G1, G2, G3)
│       ├── MutualExclusionGroup
│       │   └── RiskFactorItem
│       └── RiskFactorItem (non-MEG)
└── ResultSection
    ├── Risikoband
    ├── Therapie-Strategie
    └── Substanz-Optionen (evidenzbasiert)
```

## 🔨 Build & Deployment

### Production Build

```bash
pnpm build
```

Der Build wird im `dist/` Verzeichnis erstellt.

### GitHub Pages Deployment

Die Anwendung wird automatisch über GitHub Actions deployed:

1. **Workflow**: `.github/workflows/deploy.yml`
2. **Trigger**: Push auf `main` Branch
3. **URL**: `https://dideldei.github.io/osteopo/`

Der Workflow:
- Installiert Dependencies
- Erstellt Production Build
- Deployed zu GitHub Pages

### Manuelles Deployment

Falls nötig, kann der `dist/` Inhalt auch manuell auf einen Webserver hochgeladen werden.

## 📊 Datenquellen

### DVO 2023 Leitlinie

Die Anwendung basiert auf:
- **Kurzfassung-Leitlinie DVO 2023 Version 2.2**
- **DVO Leitlinie Langfassung Version 2.1 (2023)**

### Daten-Dateien

- **Threshold Tables Bundle**: Schwellenwerte für 3%, 5%, 10% Frakturrisiko
- **RF-Katalog**: Alle Risikofaktoren mit RR-Werten und Gruppierung
- **Evidence Table**: Evidenzlevel und Wirksamkeit für Substanzen
- **Substance Registry**: Master-Referenz für alle Substanzen
- **Administration Metadata**: Applikationsweg, Frequenz, Zulassung

### Validierung

Ein Validierungsscript prüft die Konsistenz zwischen den Datenquellen:

```bash
# Script ausführen (Node.js)
node scripts/validate-data-consistency.ts
```

## 🧪 Entwicklungshinweise

### Code-Organisation

- **Komponenten**: Wiederverwendbare UI-Komponenten in `src/components/`
- **Data-Layer**: Business-Logic in `src/data/`
- **Utilities**: Helper-Funktionen in `src/utils/`
- **Types**: Zentrale TypeScript-Definitionen in `src/data/types.ts`

### Performance-Optimierungen

- RF Catalog wird einmalig gecacht (nicht bei jedem Memo neu geladen)
- Komponenten-Extraktion reduziert Code-Duplikation (~300 Zeilen)
- Build-Optimierung mit Code-Splitting (vendor chunks)

### Logging

Logging erfolgt nur in der Entwicklungsumgebung:

```typescript
import { logger } from './utils/logger';

logger.log('Message');    // Nur in dev
logger.error('Error');    // Nur in dev
logger.warn('Warning');   // Nur in dev
```

## 📝 Lizenz & Quellenangaben

Diese Anwendung basiert auf der **DVO-Leitlinie 2023** zur Diagnostik und Therapie der Osteoporose.

**Wichtiger Hinweis**: Diese Anwendung dient als Unterstützungstool für medizinische Entscheidungen. Sie ersetzt nicht die ärztliche Beurteilung und Verantwortung.

**Quellen**:
- DVO 2023 Leitlinie (Kurzfassung Version 2.2, Langfassung Version 2.1)
- Alle Datenquellen sind in den JSON-Dateien im `context/` Verzeichnis dokumentiert

## 🤝 Beitragen

Bei Fragen oder Anregungen bitte ein Issue erstellen oder einen Pull Request öffnen.

## 📞 Kontakt

Repository: https://github.com/dideldei/osteopo

---

**Version**: 1.0.0  
**Letzte Aktualisierung**: 2026-01-04

