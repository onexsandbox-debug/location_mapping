export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { lat, lng } = req.body;

    // Validate input
    if (!lat || !lng) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    // OpenStreetMap Reverse Geocoding API
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "vercel-app"
      }
    });

    const data = await response.json();

    return res.status(200).json({
      success: true,
      address: data.display_name,
      raw: data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
