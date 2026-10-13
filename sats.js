/* A few real satellites, where they are right now.
 *
 * Four objects in low Earth orbit, propagated in the tab with SGP4 (satellite.js) from public
 * orbital elements (CelesTrak). The Projects planet draws them around a small Earth, and the
 * command line answers "where's the ISS". It loads only when one of those asks for it.
 *
 * Elements are fetched once and kept for twelve hours, as CelesTrak asks; if the fetch fails the
 * snapshot below is used, which stays good to within a few kilometres for a week or two and is
 * still the right orbit, roughly in the right place, long after that.
 */
var Sats = (function () {
  "use strict";
  var LIB = "https://cdn.jsdelivr.net/npm/satellite.js@7.1.0/+esm",
      SOURCE = "https://celestrak.org/NORAD/elements/gp.php?FORMAT=TLE&CATNR=",
      KEEP = 12 * 3600 * 1000, KEY = "sats-tle";

  /* Catalog number, short name, and the elements as of 2026-10-13. */
  var LIST = [
    { id: 25544, name: "ISS", full: "the International Space Station",
      tle: ["1 25544U 98067A   26286.43465595  .00005946  00000+0  11657-3 0  9991",
            "2 25544  51.6321  74.9235 0006732 257.7935 102.2300 15.48850287590084"] },
    { id: 20580, name: "Hubble", full: "the Hubble Space Telescope",
      tle: ["1 20580U 90037B   26286.62243497  .00006667  00000+0  20260-3 0  9992",
            "2 20580  28.4737 350.3749 0001899  43.5848 316.4898 15.31930979806749"] },
    { id: 48274, name: "Tiangong", full: "China's Tiangong station",
      tle: ["1 48274U 21035A   26286.58038026  .00022176  00000+0  26300-3 0  9993",
            "2 48274  41.4695 322.9239 0000414  91.3605 268.7281 15.60678231311658"] },
    { id: 44714, name: "Starlink-1008", full: "Starlink-1008",
      tle: ["1 44714U 19074B   26286.10870623  .00049588  00000+0  46340-3 0  9995",
            "2 44714  53.1458 216.1536 0002958 116.4528 243.6792 15.66806882382616"] }
  ];

  var lib = null, loading = null;

  function stored() {
    try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); return s && Date.now() - s.at < KEEP ? s.tle : null; }
    catch (e) { return null; }
  }

  /* Fresh elements for every object, or nothing; a partial set would mix epochs for no gain. */
  function fetchFresh() {
    if (typeof fetch === "undefined") return Promise.resolve(null);
    return Promise.all(LIST.map(function (s) {
      return fetch(SOURCE + s.id).then(function (r) { return r.ok ? r.text() : ""; }).then(function (text) {
        var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); });
        var one = lines.filter(function (l) { return /^1 /.test(l); })[0], two = lines.filter(function (l) { return /^2 /.test(l); })[0];
        if (!one || !two) throw new Error("no elements for " + s.id);
        return [one, two];
      });
    })).then(function (tles) {
      try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), tle: tles })); } catch (e) {}
      return tles;
    }).catch(function () { return null; });
  }

  function load() {
    if (loading) return loading;
    loading = Promise.all([import(LIB), Promise.resolve(stored() || fetchFresh())]).then(function (got) {
      lib = got[0];
      var tles = got[1];
      LIST.forEach(function (s, i) { var t = (tles && tles[i]) || s.tle; s.rec = lib.twoline2satrec(t[0], t[1]); });
      return api;
    });
    loading.catch(function () { loading = null; });
    return loading;
  }

  /* Where each one is at `when`: Earth-centred inertial position (km), the point beneath it, its
     height and its speed. Anything SGP4 cannot place is left out rather than guessed. */
  function at(when) {
    if (!lib) return [];
    var date = when || new Date(), gmst = lib.gstime(date), out = [];
    LIST.forEach(function (s) {
      var pv = lib.propagate(s.rec, date);
      if (!pv || !pv.position || typeof pv.position !== "object") return;
      var g = lib.eciToGeodetic(pv.position, gmst), v = pv.velocity;
      out.push({ name: s.name, full: s.full, eci: pv.position, lat: lib.degreesLat(g.latitude),
        lon: lib.degreesLong(g.longitude), height: g.height, speed: Math.hypot(v.x, v.y, v.z) });
    });
    return out;
  }

  /* The closest two right now, straight-line distance in km. */
  function closest(list) {
    var best = null;
    for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
      var a = list[i].eci, b = list[j].eci, d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (!best || d < best.km) best = { a: list[i], b: list[j], km: d };
    }
    return best;
  }

  function place(lat, lon) {
    var ns = Math.abs(lat).toFixed(1) + "°" + (lat >= 0 ? "N" : "S"),
        ew = Math.abs(lon).toFixed(1) + "°" + (lon >= 0 ? "E" : "W");
    return ns + " " + ew;
  }

  var api = { load: load, at: at, closest: closest, place: place, list: LIST,
    ready: function () { return !!lib; } };
  return api;
})();
