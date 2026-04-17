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

    // ✅ Normalize function (ARRAY → STRING)
    const normalize = (val) => {
      if (Array.isArray(val)) return val[0];
      return val;
    };

    // 🌐 Translation function (FORCED + NORMALIZED)
    const translateText = async (text) => {
      if (!text) return text;

      try {
        const response = await fetch(
          "https://deep-translate1.p.rapidapi.com/language/translate/v2",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-rapidapi-host": "deep-translate1.p.rapidapi.com",
              "x-rapidapi-key": process.env.RAPID_API_KEY
            },
            body: JSON.stringify({
              q: text,
              source: "ar",
              target: "en"
            })
          }
        );

        const data = await response.json();

        let translated = data?.data?.translations?.translatedText;

        return normalize(translated) || text;

      } catch (error) {
        console.log("Translation failed:", error.message);
        return text;
      }
    };

    // 🚀 Translate fields
    const address = normalize(await translateText(geoData.display_name));
    const neighbourhood = normalize(await translateText(addr.neighbourhood));
    const suburb = normalize(await translateText(addr.suburb));
    const city = normalize(await translateText(addr.city));
    const state = normalize(await translateText(addr.state));
    const country = normalize(await translateText(addr.country));

    // ✅ FINAL RESPONSE (NO ARRAYS)
    const response = {
      success: true,
      address,

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
      display_name: address,

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
