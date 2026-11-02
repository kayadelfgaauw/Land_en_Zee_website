// Generated from config/url-redirects.json and the existing page paths.
// Used only by the custom 404 page on static hosting.
(function () {
    if (window.location.protocol === 'file:') return;
    var redirects = {
    "/bijeenkomsten": "/zakelijk",
    "/zalen": "/zakelijk",
    "/hotelkamers": "/hotel/",
    "/camping": "/kamperen",
    "/verhuur": "/accommodaties/",
    "/restaurant": "https://www.zeeuwsverlangen.nl/",
    "/hotel/standaardkamer": "/hotel/duinkamer",
    "/en/hotel/standard-room": "/en/hotel/dune-room",
    "/de/hotel/standardzimmer": "/de/hotel/duenenzimmer",
    "/en/kamperen": "/en/camping",
    "/en/contact-en-route": "/en/contact",
    "/en/impression": "/en/impressions",
    "/en/wifi": "/en/wifi-usage",
    "/de/hotel/standaard-deluxe": "/de/hotel/standard-deluxe"
};
    var paths = ["/", "/accommodaties/", "/accommodaties/ecolodge", "/accommodaties/vakantiewoning-6-persoons", "/boeken", "/contact-en-route", "/de/", "/de/buchen", "/de/camping", "/de/hotel/", "/de/hotel/duenenzimmer", "/de/hotel/hotelstudio-natur", "/de/hotel/hotelstudio-wasser", "/de/hotel/komfortzimmer", "/de/hotel/pannehofje", "/de/hotel/standard-deluxe", "/de/hotel/suite", "/de/impressionen", "/de/kontakt", "/de/nachhaltigkeit", "/de/rechtliches", "/de/stellenangebote", "/de/tagungen-und-feiern", "/de/ueber-land-und-meer", "/de/umgebung", "/de/unterkuenfte/", "/de/unterkuenfte/ecolodge", "/de/unterkuenfte/ferienhaus-6-personen", "/de/wlan-nutzung", "/duurzaamheid", "/en/", "/en/about-land-and-sea", "/en/accommodations/", "/en/accommodations/ecolodge", "/en/accommodations/holiday-home-6-persons", "/en/boeken", "/en/camping", "/en/contact", "/en/hotel/", "/en/hotel/comfort-room", "/en/hotel/dune-room", "/en/hotel/hotel-studio-nature", "/en/hotel/hotel-studio-water", "/en/hotel/pannehofje", "/en/hotel/standard-deluxe", "/en/hotel/suite", "/en/impressions", "/en/legal", "/en/meetings-and-events", "/en/surroundings", "/en/sustainability", "/en/vacancies", "/en/wifi-usage", "/heisessie-zeeland/", "/hotel/", "/hotel/comfortkamer", "/hotel/duinkamer", "/hotel/hotelstudio-natuur", "/hotel/hotelstudio-water", "/hotel/pannehofje", "/hotel/standaard-deluxe", "/hotel/suite", "/impressie", "/juridisch", "/kamperen", "/omgeving", "/over-land-en-zee", "/teamuitje-zeeland/", "/training-workshop-zeeland/", "/vacatures", "/vergaderen-met-overnachting-zeeland/", "/vergaderen-zeeland/", "/werkplek-zeeland/", "/wifi", "/zakelijk", "/zakelijke-lunch-diner-zeeland/"];
    var path = window.location.pathname;
    var segments = path.split('/').filter(Boolean);
    var languageSegments = segments.filter(function (part) { return part === 'en' || part === 'de'; });
    if (languageSegments.length > 1) {
        var first = segments[0] === 'en' || segments[0] === 'de' ? segments[0] : null;
        segments = segments.filter(function (part) { return part !== 'en' && part !== 'de'; });
        if (first) segments.unshift(first);
        path = '/' + segments.join('/');
    }
    path = path.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
    var target = redirects[path];
    if (!target && paths.indexOf(path) !== -1) target = path;
    if (!target && paths.indexOf(path + '/') !== -1) target = path + '/';
    if (!target) return;
    var destination = new URL(target, window.location.origin);
    destination.search = window.location.search;
    destination.hash = window.location.hash;
    if (destination.href !== window.location.href) window.location.replace(destination.href);
})();
