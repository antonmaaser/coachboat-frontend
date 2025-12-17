# API Endpunkte (Übersicht als Tabelle)

| Bereich / Route | Methoden & Kernfunktion | Authentifizierung / Rollen | Hinweise |
| --- | --- | --- | --- |
| **/users** | **GET /** – Liste aller Nutzer (Admin) oder eigener Datensatz; **GET /:id** – Nutzer anzeigen; **POST /** – Nutzer anlegen; **PATCH /:id** – Nutzer aktualisieren; **DELETE /:id** – Nutzer löschen | JWT erforderlich; Rollen je Aktion: Liste/Details abhängig von Status, Anlegen/Löschen nur Admin, Update eigener Account oder Admin | `checkAuth(requiredStatus)` prüft Status (0–3). Löschen nur nach Deaktivierung. Aktivierungs-Mail beim Anlegen. Passwortänderung via `password` Feld möglich (Hashing). |
| **/events** | **GET /** – Event-Liste nach Jahr/Monat filterbar; **GET /:id** – Eventdetails; **POST /** – Event anlegen; **PATCH /:id** – Event aktualisieren; **DELETE /:id** – Event löschen | JWT erforderlich; Anlegen/Ändern/Löschen durch Ersteller oder Admin | Prüft Zeitfenster-Kollisionen je `resource`; füllt fehlende Resource mit erster sichtbarer. Konflikte führen zu 400/409. |
| **/resources** | **GET /** – Sichtbare Ressourcen; **GET /:id** – Details; **POST /** – Ressource anlegen; **PATCH /:id** – Ressource bearbeiten; **DELETE /:id** – Soft-Delete | JWT erforderlich; Schreiben nur Admin | Erwartet/erlaubt Felder `title`, `description`, `is-ready`, `category-id`; Löschen setzt `isHidden=true`. |
| **/resource-categories** | **GET /** – Kategorienliste; **POST /** – Kategorie anlegen; **PATCH /:id** – Kategorie aktualisieren; **DELETE /:id** – Kategorie löschen | JWT erforderlich; Schreiben nur Admin | Validiert `title`; 404 bei fehlender Kategorie. |
| **/todos** | **GET /** – Todos (optional `resource_id` Filter); **GET /:id** – einzelnes Todo; **POST /** – Todo anlegen; **PATCH /:id** – Todo aktualisieren; **DELETE /:id** – Todo löschen | JWT erforderlich mit Status ≥1; Schreiben/Ändern/Löschen durch Ersteller oder Admin | Felder u.a. `resource-id`, `title`, `description`, `status` (default 0), `created-by` aus JWT. |
| **/groups** | **GET /** – Gruppenliste; **POST /** – Gruppe anlegen; **GET /:id** – Details mit Sichtbarkeitsprüfung; **PATCH /:id** – Gruppe aktualisieren; **DELETE /:id** – Gruppe löschen; **POST /:id/users** – Mitglieder hinzufügen/rollen setzen; **DELETE /:id/users/:userId** – Nutzer entfernen | JWT erforderlich mit Status ≥1 global; Gruppen schreiben nur Admin, Sichtbarkeit `admin/none` nur für Admin | Sichtbarkeit `all/admin/none`; Löschvorgang räumt `user_groups` auf; Mitgliedsrollen `moderator/listener/none` (Upsert). |

## Allgemeine Sicherheit & Defaults
- JWT-Header `Authorization: Bearer <token>`; fehlender Token → 401, ungültiger Token → 403.
- Rollen/Status: 0=deactivated, 1=user, 2=mod, 3=admin.
- MySQL-Datenbank-Tabellen u.a. `users`, `events`, `resources`, `resource_categories`, `todos`, `groups`, `user_groups`.
