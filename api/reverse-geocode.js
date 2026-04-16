export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    // 🌍 Step 1: Reverse Geocode
    const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    const geoRes = await fetch(geoUrl, {
      headers: { "User-Agent": "vercel-app" }
    });

    const geoData = await geoRes.json();

    let address = geoData.display_name;

    // 🌐 Step 2: Detect Arabic
    const isArabic = /[\u0600-\u06FF]/.test(address);
    let translatedAddress = address;

    // 🌍 Step 3: Translate (if Arabic)
    if (isArabic) {
      const translateRes = await fetch("https://libretranslate.de/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: address,
          source: "ar",
          target: "en",
          format: "text"
        })
      });

      const translateData = await translateRes.json();
      translatedAddress = translateData.translatedText;
    }

    const addr = geoData.address || {};

    // 🧠 Step 4: Flatten response
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

      neighbourhood: addr.neighbourhood,
      suburb: addr.suburb,
      city: addr.city,
      state: addr.state,
      country: addr.country,
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
