export default async function handler(req, res) {
  // ✅ CORS
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

    // 🌍 STEP 1: Reverse Geocode (Force English first)
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`;

    const geoRes = await fetch(geoUrl, {
      headers: { "User-Agent": "vercel-app" }
    });

    const geoData = await geoRes.json();
    const addr = geoData.address || {};

    // 🔍 Detect Arabic
    const isArabic = (text) => /[\u0600-\u06FF]/.test(text);

    // 🌐 RapidAPI Translate Function
    const translateText = async (text) => {
      if (!text || !isArabic(text)) return text;

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

        return data?.data?.translations?.translatedText || text;

      } catch (error) {
        console.log("⚠️ Translation failed:", error.message);
        return text; // fallback
      }
    };

    // 🚀 Translate ALL fields (only if needed)
    const address = await translateText(geoData.display_name);
    const neighbourhood = await translateText(addr.neighbourhood);
    const suburb = await translateText(addr.suburb);
    const city = await translateText(addr.city);
    const state = await translateText(addr.state);
    const country = await translateText(addr.country);

    // ✅ Final Flattened Response
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
