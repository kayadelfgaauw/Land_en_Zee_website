# Mobiel en toegankelijkheid — 28 oktober 2026

## Aangepast

- De 77 pagina's met de gedeelde navigatie laden `css/accessibility.css` en
  `js/dialogs.js`. Ze hebben een toetsenbordlink naar de hoofdinhoud en een
  benoemd menu met `aria-controls`, `aria-expanded` en een niet-interactieve
  gesloten toestand.
- Menu en boekingspopup verplaatsen de focus bij openen, houden Tab en
  Shift+Tab binnen het venster en herstellen focus bij sluiten. Escape sluit
  het actieve venster. De achtergrond is tijdelijk `inert`; de oorspronkelijke
  toestand en scrollinstelling worden hersteld. Een automatisch getoonde
  boekingspopup onderbreekt geen geopend menu of invoer in een veld.
- Op kleine schermen kan de menulijst scrollen binnen de ruimte onder de
  sluitknop. De chatknoppen bedekken het menu of de zakelijke aanvraagsectie
  niet meer. Aanraakdoelen en focusranden zijn verbeterd.
- Zakelijke formulieren tonen gekoppelde Nederlandse veldmeldingen en
  `aria-invalid`. Bestaande beschrijvingen blijven behouden. Na correctie
  verdwijnt de foutstatus. Bevestiging en verzendfout krijgen focus; status
  tijdens verzending staat buiten de als bezig gemarkeerde verzendknop.
- Hoofdknoppen hebben beter tekstcontrast, ook de zandkleurige knop. De
  veldranden en foutstatus hebben een duidelijkere kleur. De mobiele header
  gebruikt de beschikbare breedte zonder overlap tussen logo en actieknop.
- Een voorkeur voor minder beweging schakelt Lenis en overgangsanimaties uit.
  De homepagevideo start dan niet automatisch. Er is een knop om de
  achtergrondvideo te stoppen en opnieuw te starten; stoppen herlaadt de
  speler niet op de achtergrond. De decoratieve video is geen tabstop.
- Kaart- en video-frames hebben een naam. Decoratieve vlagafbeeldingen zijn
  verborgen voor hulptechnologie; de taal-link behoudt zijn eigen naam.

## Uitgevoerde controles

- De automatische projectcontrole bevat 14 tests, waaronder de bestaande
  URL-/publicatiecontroles en vier controles op de toegankelijke HTML-structuur.
- Chrome: zakelijke overzichtspagina, zeven aanbodpagina's, de drie
  taalvarianten van de homepage, contact en hoteloverzicht op 1440, 768, 375 en
  320 CSS-pixels breed. Gecontroleerd op horizontaal overlopen en menubediening.
- Tab, Shift+Tab en Escape, focusherstel, de skip-link en de boekingspopup.
  Ook een laag liggend scherm van 320 × 256 pixels gecontroleerd.
- Alle acht zakelijke pagina's met tekst op 200% bij 375 pixels breed.
- Native veldvalidatie, correctie van fouten, arrangementkeuze, dynamische
  retreatvelden, mislukte verzending en succesvolle verzending. De serverantwoorden
  waren gesimuleerd; er zijn geen echte aanvragen verstuurd.
- Gemeten tekstcontrast van de hoofdknoppen in normale toestand: circa 7,28:1
  (header), 10,20:1 (primaire knop), 6,23:1 (zandkleurige knop) en 6,45:1
  (WhatsApp). Het kleurpaar voor de hoverstatus van de zandkleurige knop is
  eveneens gecontroleerd. Dit is geen complete automatische contrastscan van
  alle bestaande pagina-inhoud.
- Mobiele screenshots van menu, menu in een laag scherm en formulierfouten
  visueel bekeken.

## Grenzen van deze controle

Dit is een praktische controle en herstelronde, geen formele WCAG-certificering.
Er is niet handmatig getest met VoiceOver/NVDA of echte mobiele apparaten.
In de browsercontrole waren externe scripts en embeds geblokkeerd; de interne
bediening van chat, kaart en videospeler van derden valt buiten deze test.
Die onderdelen en de echte ontvangst van aanvragen moeten op de gepubliceerde
site aanvullend worden gecontroleerd. Er is niets gepubliceerd.

De gebruikte uitgangspunten staan beschreven bij W3C:
[modale vensters](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
[aanraakdoelen](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
en [tekstcontrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
