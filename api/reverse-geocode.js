export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    // 🌍 Reverse Geocode
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "vercel-app" } }
    );

    const geoData = await geoRes.json();
    const addr = geoData.address || {};

    // 🔍 Detect Arabic
    const isArabic = (text) => /[\u0600-\u06FF]/.test(text);

    // 🌐 Generic Translate Function (SAFE)
    const translateText = async (text) => {
      if (!text || !isArabic(text)) return text;

      try {
        const res = await fetch("https://libretranslate.de/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: "ar",
            target: "en",
            format: "text"
          })
        });

        const raw = await res.text();

        try {
          const parsed = JSON.parse(raw);
          return parsed.translatedText || text;
        } catch {
          return text;
        }
      } catch {
        return text;
      }
    };

    // 🚀 Translate ALL fields
    const translatedAddress = await translateText(geoData.display_name);

    const neighbourhood = await translateText(addr.neighbourhood);
    const suburb = await translateText(addr.suburb);
    const city = await translateText(addr.city);
    const state = await translateText(addr.state);
    const country = await translateText(addr.country);

    // ✅ Final Flattened Response
    const response = {
      success: true,
      address: translatedAddress,

      place_id: geoData.place_id,
      licence: geoData.licence,
      osm_type: geoData.osm_type,
      osm_id: geoData.osm_id,
      lat: geoData.lat,
      lon: geoData.lon,
      category: geoData.class,
      type: geoData.type,
      place_rank: geoData.place_rank,
      importance: geoData.importance,
      addresstype: geoData.addresstype,
      name: geoData.name,
      display_name: translatedAddress,

      neighbourhood,
      suburb,
      city,
      state,
      country,
      country_code: addr.country_code,
      iso_code: addr["ISO3166-2-lvl4"],

      boundingbox: geoData.boundingbox
    };

    return res.status(200).json(response);

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
