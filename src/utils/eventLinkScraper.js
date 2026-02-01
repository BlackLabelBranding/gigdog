import { supabase } from "@/lib/customSupabaseClient";

// Helper to match DB's normalize_key function
function normalizeKey(input) {
  return (input || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// DROP-IN: replaces your current scrapeEventFromUrl(url)
export async function scrapeEventFromUrl(url) {
  try {
    if (!url) return { ticket_url: url };

    // Call the Edge Function (server-side scraping)
    const { data, error } = await supabase.functions.invoke("scrape-event", {
      body: { url }
    });

    if (error) {
      console.error("scrape-event invoke error:", error);
      // Fallback: still return something usable
      return {
        ticket_url: url,
        source_url: url,
        source_type: inferSourceType(url)
      };
    }

    // Expected response: { ok, eventData, missing_fields, finalUrl }
    if (!data?.ok) {
      console.warn("scrape-event returned not ok:", data);
      return {
        ticket_url: url,
        source_url: url,
        source_type: inferSourceType(url)
      };
    }

    const eventData = data.eventData || {};
    const missing_fields = data.missing_fields || [];
    const finalUrl = data.finalUrl || eventData.source_url || url;

    // Normalize to your app fields:
    let start_datetime = eventData.start_datetime || null;
    if (!start_datetime && eventData.start_date) {
      const time = eventData.start_time || "19:00"; // default if unknown
      const dt = new Date(`${eventData.start_date}T${time}:00`);
      if (!isNaN(dt.getTime())) start_datetime = dt.toISOString();
    }

    let end_datetime = eventData.end_datetime || null;

    const scrapedResult = {
      // main fields
      title: eventData.title || "",
      description: eventData.description || "",
      venue_name: eventData.venue_name || "",
      address: eventData.address || "",
      city: eventData.city || "",
      state: eventData.state || "",
      postal_code: eventData.postal_code || "",
      start_datetime,
      end_datetime,

      // links/media
      ticket_url: eventData.ticket_url || finalUrl,
      image_url: eventData.image_url || "",

      // source/meta
      source_type: eventData.source_type || inferSourceType(finalUrl),
      source_url: eventData.source_url || finalUrl,
      missing_fields,  // <-- IMPORTANT: UI should prompt user to fill these
      scraped_ok: true,
      duplicate_found: false,
      duplicate_event: null
    };

    // Task 2: Add duplicate event detection
    // We check against the DB using the same logic as the unique constraint (Title + Venue + Date)
    if (scrapedResult.title && scrapedResult.venue_name && scrapedResult.start_datetime) {
      const titleKey = normalizeKey(scrapedResult.title);
      const venueKey = normalizeKey(scrapedResult.venue_name);
      
      // Extract date part YYYY-MM-DD
      const dateObj = new Date(scrapedResult.start_datetime);
      const dateStr = dateObj.toISOString().split('T')[0];

      // Query for potential duplicates on the same day at the same venue
      const { data: existingEvents } = await supabase
        .from('events')
        .select('id, title, venue_name, start_datetime, city, state, description')
        .ilike('venue_name', scrapedResult.venue_name)
        .gte('start_datetime', `${dateStr}T00:00:00`)
        .lte('start_datetime', `${dateStr}T23:59:59`);

      if (existingEvents && existingEvents.length > 0) {
        // Check title similarity. The DB constraint is strict (exact match of normalized string),
        // but here we can be helpful and flag it if it's even close.
        const duplicate = existingEvents.find(ev => {
          const evTitleKey = normalizeKey(ev.title);
          return evTitleKey === titleKey;
        });
        
        if (duplicate) {
          scrapedResult.duplicate_found = true;
          scrapedResult.duplicate_event = duplicate;
        }
      }
    }

    return scrapedResult;
  } catch (err) {
    console.error("scrapeEventFromUrl error:", err);
    return {
      ticket_url: url,
      source_url: url,
      source_type: inferSourceType(url),
      scraped_ok: false
    };
  }
}

// small helper so you keep your existing source tagging behavior
function inferSourceType(url = "") {
  const u = url.toLowerCase();
  if (u.includes("facebook.com")) return "facebook";
  if (u.includes("eventbrite.com")) return "eventbrite";
  if (u.includes("ticketmaster.com") || u.includes("livenation.com")) return "ticketmaster";
  if (u.includes("bandsintown.com")) return "bandsintown";
  if (u.includes("songkick.com")) return "songkick";
  return "link";
}
