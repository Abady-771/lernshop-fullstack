# Lernshop – Full-Stack-Übungsprojekt

Ein kleiner Demoshop für eine Bewerbung um eine Ausbildung als Fachinformatiker/in für Anwendungsentwicklung. Die Oberfläche ist mit **React, Vite, React Router, Context API und MUI** gebaut. Die API nutzt **Node.js und Express**; für die Speicherung gibt es einen sofort nutzbaren Lernmodus im Arbeitsspeicher und einen optionalen **MongoDB/Mongoose**-Modus. Registrierung und Login verwenden **bcrypt** für Passwort-Hashes und **JWT** für die Sitzung.

## Lokal starten

Voraussetzung: Node.js 20.19+ oder 22.12+ und eine Internetverbindung für `npm install`. Unter Windows im Projektordner:

```powershell
npm install
npm run dev
```

Öffne `http://127.0.0.1:5173`. Der API-Server läuft auf `http://127.0.0.1:3001`. Ohne `MONGODB_URI` läuft der Lernmodus direkt; seine Testdaten werden beim Neustart zurückgesetzt.

`npm run dev` erstellt zunächst die aktuelle Oberfläche und startet dann beide Server. Nach Änderungen am React-Code den Befehl neu starten, damit die Oberfläche neu gebaut wird.

Für eine eigene MongoDB eine `.env` aus `.env.example` erstellen und `MONGODB_URI` sowie `JWT_SECRET` setzen. `.env` darf nicht veröffentlicht werden. Der MongoDB-Modus braucht eine erreichbare Datenbank und wurde hier mangels lokaler Datenbank nicht im Integrationstest ausgeführt.

## Was du ausprobieren kannst

1. Produkte nach Kategorien filtern und über den Produkttitel suchen.
2. Ein Konto registrieren; ein Passwort mit mindestens acht Zeichen wählen.
3. Produkte in den Warenkorb legen, Mengen ändern und Artikel entfernen.
4. Eine **Testbestellung** erstellen und sie unter „Bestellungen“ ansehen.

Es gibt **keine echte Bezahlung, Lieferung oder Lagerreservierung**. Die Demo ist nicht für echte Kundendaten oder einen öffentlichen Shop gedacht. Es gibt auch keine Produktverwaltung in der Oberfläche; die Beispieldaten stehen in `server/models.js`.

## Aufbau

| Bereich | Datei | Zweck |
|---|---|---|
| React-Oberfläche | `src/main.jsx` | Seiten, Navigation, Formulare, Context und API-Aufrufe |
| Gestaltung | `src/styles.css` | Responsives Layout und Produktkarten |
| API | `server/app.js` | Registrierung, Login, Produktliste, Warenkorb, Bestellungen |
| Datenmodelle | `server/models.js` | MongoDB-Schemas für User, Product, Cart, Order und Beispieldaten |
| Speicher | `server/store.js` | Lernmodus im Arbeitsspeicher und MongoDB-Anbindung |
| Start | `server/index.js` | Wahl des Speichers und Express-Server |

Die API besitzt `GET /api/products`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/cart`, `PUT /api/cart/items/:productId`, `DELETE /api/cart/items/:productId`, `POST /api/orders` und `GET /api/orders`. Geschützte Routen benötigen `Authorization: Bearer <JWT>`.

## Prüfen

```powershell
npm test
npm run build
```

Die Tests prüfen Registrierung, Login, ungültige Eingaben, Warenkorb und Testbestellung im sofort nutzbaren Lernmodus. MongoDB benötigt für einen Live-Test eine eigene Datenbankverbindung.

## Projektstatus

Die lokal ausgeführten Tests decken Registrierung, Login, Warenkorb und Demo-Bestellungen ab. Der optionale MongoDB-Modus braucht eine eigene Datenbankverbindung und wurde hier nicht im Integrationstest ausgeführt.
